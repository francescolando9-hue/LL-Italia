// Una foto HEIC scelta dalla galleria parte COM'È, con l'ora dello scatto
// letta dal file (dalla 0.42.0).
//
// Il caso vero, 17/11/2026: cinque foto HEIC di un Samsung, scelte dalla
// galleria, rifiutate con «Formato immagine non supportato da questo
// dispositivo». Fino alla 0.41.1 l'app trattava l'HEIC come «non è un JPEG»:
// ora stimata, poi conversione in JPEG passando per un canvas — e Chrome su
// Android l'HEIC non lo decodifica, quindi la conversione falliva. Decisione
// di Francesco del 18/11/2026: l'app deve accettare l'HEIC. Regola della
// categoria `ARCHIVIO`: byte originali, nessuna ricodifica.
//
// Il materiale è costruito byte per byte (`heic-finto.js`): questo Chromium un
// HEIC non lo sa produrre né disegnare, ed è proprio l'ambiente del telefono
// di Rosario — l'anteprima NON si disegna, e la foto deve entrare lo stesso.
//
// I casi sono quelli della specifica `FotoCantiereSpecificaAppHeic…`, §3:
// H1 H2 H3 H4 H5 H6 H7 H8 H11 H12. H9 è il resto della suite, H10 il guasto
// messo apposta sul collaudo 10.
const crypto = require('crypto');
const { nuovoTelefono, configura } = require('./aiuto');
const { heicFinto } = require('./heic-finto');

const impronta = byte => crypto.createHash('sha256').update(byte).digest('hex').slice(0, 16);
// Novembre, ora solare: senza `OffsetTimeOriginal` le cifre si leggono come ora
// locale del telefono, e a Roma il 17/11 è +01:00.
const DATA_ATTESA = '2026-11-17T11:03:03+01:00';

module.exports = {
  nome: 'HEIC dalla galleria: byte originali e ora dello scatto',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');

    const scegli = async () => {
      await pagina.selectOption('#commessa', 'MAR');
      await aiuto.attendiMarcatore(pagina, m => m.startsWith('MAR|'), 'menù della fase pronto');
      await pagina.selectOption('#fase', 'Cantiere');
    };

    // Il payload si cerca per CONTENUTO fra le richieste arrivate dopo
    // `prima`, con un `idClient` mai visto (trappola 6 di aiuto.js).
    const nuovoDopo = async (prima, descrizione) => {
      const visti = new Set(flow.stato.ricevuti.slice(0, prima).map(r => r && r.idClient));
      const cerca = () => flow.stato.ricevuti.slice(prima).find(r => r && 'tipo' in r && !visti.has(r.idClient));
      const fine = Date.now() + 90000;
      while (!cerca() && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      if (!cerca()) throw new Error(`${descrizione}: nessuna richiesta nuova in 90 secondi`);
      return cerca();
    };

    const aggiungi = async (byte, nome, tipo) => {
      await scegli();
      await pagina.setInputFiles('#input-galleria', [{ name: nome, mimeType: tipo, buffer: byte }]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1
        || Boolean(document.querySelector('#senza-data-comunque')), 'anteprima o avviso', 90000);
    };

    const manda = async (byte, nome, tipo, descrizione) => {
      const prima = flow.stato.ricevuti.length;
      await aggiungi(byte, nome, tipo);
      const fermata = await pagina.$('#senza-data-comunque');
      registro.controlla(`${descrizione}: entra in coda senza avvisi`, !fermata,
        fermata ? (await pagina.$eval('#avviso-senza-data', e => e.textContent.replace(/\s+/g, ' ').trim())) : '');
      if (fermata) return null;
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
      return nuovoDopo(prima, descrizione);
    };

    const controllaArrivo = (arrivata, byte, estensione, mime) => {
      const arrivati = Buffer.from(arrivata.contenutoBase64, 'base64');
      registro.dice('arrivati', `${arrivati.length} byte · impronta ${impronta(arrivati)} · ${arrivata.estensione} · ${arrivata.mimeType} · ${arrivata.dataScatto} · stimato ${arrivata.scattoStimato}`);
      registro.controlla('i byte sono identici all’originale',
        impronta(arrivati) === impronta(byte) && arrivati.length === byte.length,
        'in archivio va il file del telefono: nessuna ricodifica');
      registro.controlla('l’ora dello scatto è quella dentro il file',
        arrivata.dataScatto === DATA_ATTESA, `${arrivata.dataScatto} — attesa ${DATA_ATTESA}`);
      registro.controlla('dichiarata misurata', arrivata.scattoStimato === 'NO', arrivata.scattoStimato);
      registro.controlla(`estensione ${estensione}`, arrivata.estensione === estensione, arrivata.estensione);
      registro.controlla(`MIME ${mime}`, arrivata.mimeType === mime, arrivata.mimeType);
      registro.controlla('è una foto, non un video', arrivata.genere === 'foto', arrivata.genere);
      registro.controlla(`il nome di comodo finisce in .${estensione}`,
        String(arrivata.nomeFile).endsWith(`.${estensione}`), arrivata.nomeFile);
    };

    // --- H1 e H11 ---------------------------------------------------------
    registro.titolo('H1 · HEIC Samsung (brand heic), Exif subito dopo meta — e H11, il riquadro');
    const h1 = heicFinto();
    registro.dice('file di partenza', `${h1.length} byte · impronta ${impronta(h1)}`);
    const primaH1 = flow.stato.ricevuti.length;
    await aggiungi(h1, '20261117_110303.heic', 'image/heic');
    const riquadro = await pagina.evaluate(() => {
      const a = document.querySelector('.foto-anteprima');
      return a ? {
        heic: Boolean(a.querySelector('.foto-heic')),
        immagini: a.querySelectorAll('img').length,
        testo: a.textContent.replace(/\s+/g, ' ').trim(),
      } : null;
    });
    registro.dice('anteprima a video', riquadro);
    registro.controlla('nessun avviso: la foto è in coda',
      riquadro !== null && !(await pagina.$('#senza-data-comunque')));
    registro.controlla('H11 · al posto dell’immagine c’è il riquadro HEIC',
      riquadro && riquadro.heic && riquadro.immagini === 0,
      'questo Chromium l’HEIC non lo disegna, come Chrome su Android: un <img> sarebbe un’immagine rotta');
    registro.controlla('col nome del file', riquadro && riquadro.testo.includes('20261117_110303.heic'));
    registro.controlla('e con l’ora letta', riquadro && riquadro.testo.includes('17/11/2026 11:03:03'));
    registro.controlla('e col peso', riquadro && /\d+(,\d+)? (KB|MB|byte)/.test(riquadro.testo), riquadro && riquadro.testo);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const arrivataH1 = await nuovoDopo(primaH1, 'H1');
    controllaArrivo(arrivataH1, h1, 'heic', 'image/heic');
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
    registro.controlla('anche nella coda, inviata, la miniatura è il riquadro',
      await pagina.$$eval('#lista-coda .foto-voce', v => v.length === 1
        && Boolean(v[0].querySelector('.foto-miniatura.foto-heic')) && !v[0].querySelector('img')));
    const rigaCoda = await pagina.$eval('#lista-coda .foto-voce', v => v.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('riga in coda', rigaCoda);
    registro.controlla('e la riga dice nome e ora dello scatto',
      rigaCoda.includes('20261117_110303.heic') && rigaCoda.includes('scatto 17/11/2026 11:03:03'),
      'la miniatura dice solo «HEIC»: due HEIC inviati si distinguono da qui');

    // --- H12 ----------------------------------------------------------------
    registro.titolo('H12 · «Rimanda corretta» di un HEIC inviato');
    const primaH12 = flow.stato.ricevuti.length;
    await pagina.click('.foto-rimanda');
    await pagina.waitForSelector('#r-manda');
    await pagina.selectOption('#r-fase', 'Extra');
    await aiuto.attendi(pagina, () => {
      const p = document.querySelector('#r-manda');
      return p.textContent.trim() === 'Rimanda corretta' && !p.disabled;
    }, '«Rimanda corretta» acceso', 10000);
    await pagina.click('#r-manda');
    const arrivataH12 = await nuovoDopo(primaH12, 'H12');
    registro.controlla('è un invio nuovo', arrivataH12.idClient !== arrivataH1.idClient);
    registro.controlla('con la fase corretta', arrivataH12.fase === 'Extra', arrivataH12.fase);
    controllaArrivo(arrivataH12, h1, 'heic', 'image/heic');

    // --- H2 -----------------------------------------------------------------
    registro.titolo('H2 · brand maggiore mif1, compatibile heic');
    const h2 = heicFinto({ maggiore: 'mif1', compatibili: ['mif1', 'heic'], versioneIloc: 0 });
    const arrivataH2 = await manda(h2, '20261117_110326.heic', 'image/heic', 'H2');
    if (arrivataH2) controllaArrivo(arrivataH2, h2, 'heic', 'image/heic');

    // --- H8 -----------------------------------------------------------------
    registro.titolo('H8 · HEIC col nome e il tipo di un JPEG: decidono i byte');
    const arrivataH8 = await manda(h1, 'IMG_0001.jpg', 'image/jpeg', 'H8');
    if (arrivataH8) controllaArrivo(arrivataH8, h1, 'heic', 'image/heic');

    registro.titolo('H8 · HEIF: un .heif senza tipo dichiarato resta .heif');
    const arrivataHeif = await manda(h1, 'scatto.heif', '', 'H8 heif');
    if (arrivataHeif) controllaArrivo(arrivataHeif, h1, 'heif', 'image/heif');

    // --- H4 -----------------------------------------------------------------
    registro.titolo('H4 · HEIC senza blocco Exif: si ferma e lo dice');
    const h4 = heicFinto({ senzaExif: true });
    const primaH4 = flow.stato.ricevuti.length;
    await aggiungi(h4, 'modificata.heic', 'image/heic');
    const fermataH4 = Boolean(await pagina.$('#senza-data-comunque'));
    registro.controlla('non entra in coda: avviso di data mancante', fermataH4,
      'un’ora stimata in silenzio è il difetto del 17/09/2026');
    if (fermataH4) {
      const avviso = await pagina.$eval('#avviso-senza-data', e => e.textContent.replace(/\s+/g, ' ').trim());
      const righe = await pagina.$$eval('.foto-perche li', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
      registro.dice('avviso', avviso);
      righe.forEach(r => registro.dice('riga', r));
      registro.controlla('la frase in testa è quella dell’HEIC',
        /foto HEIC l’app non è riuscita a leggere l’ora/.test(avviso),
        'non «copia ridotta»: un HEIC integro con l’Exif dove l’app non lo cerca è l’originale');
      registro.controlla('e non dice «quasi certamente una copia ridotta»', !/copia ridotta/.test(avviso));
      registro.controlla('la riga dice il caso preciso', righe.some(r => /HEIC senza blocco Exif/.test(r)));
      registro.controlla('e non dice «non è una foto JPEG»', righe.every(r => !/non è una foto JPEG/.test(r)),
        'l’HEIC adesso si legge: quella frase sarebbe falsa');
      registro.controlla('al flow non è ancora partito niente', flow.stato.ricevuti.length === primaH4);

      // «Aggiungi comunque»: la foto parte coi SUOI byte, `.heic`, con l'ora
      // dichiarata stimata — non convertita, che su Chrome fallirebbe.
      registro.titolo('H4 · …mandata comunque: byte originali, .heic, ora stimata');
      await pagina.click('#senza-data-comunque');
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
      const arrivataH4 = await nuovoDopo(primaH4, 'H4 comunque');
      const byteH4 = Buffer.from(arrivataH4.contenutoBase64, 'base64');
      registro.dice('arrivati', `${byteH4.length} byte · ${arrivataH4.estensione} · ${arrivataH4.mimeType} · ${arrivataH4.dataScatto} · stimato ${arrivataH4.scattoStimato}`);
      registro.controlla('i byte sono identici all’originale', impronta(byteH4) === impronta(h4));
      registro.controlla('estensione heic e MIME image/heic',
        arrivataH4.estensione === 'heic' && arrivataH4.mimeType === 'image/heic');
      registro.controlla('l’ora è dichiarata stimata', arrivataH4.scattoStimato === 'SI', arrivataH4.scattoStimato);
    } else {
      registro.controlla('e al flow non è partito niente', flow.stato.ricevuti.length === primaH4);
    }

    // --- H3, H5, H6, H7: la lettura, direttamente ------------------------------
    // Si chiama `dataScattoDaFoto` con un file che CONTA i byte che gli vengono
    // chiesti: è l'unico modo di dimostrare che l'Exif in fondo a un file da
    // 2 MB si legge senza leggere il file intero.
    const leggi = (byte, nome = 'prova.heic') => pagina.evaluate(async ({ b64, nome }) => {
      const m = await import('./core/exif.js');
      const f = await import('./modules/foto/index.js');
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new File([bin], nome);
      let letti = 0;
      const conta = {
        name: nome, size: blob.size, type: '',
        slice(a, b) { const fetta = blob.slice(a, b); letti += fetta.size; return fetta; },
      };
      const esito = await m.dataScattoDaFoto(conta);
      return {
        ...esito, letti, size: blob.size,
        heic: m.eHeicDaiByte(new DataView(bin.buffer)),
        gruppo: esito.motivo ? f.gruppoDiMotivo(esito.motivo) : '',
        frase: esito.motivo ? m.spiegazioneMotivo(esito.motivo) : '',
      };
    }, { b64: byte.toString('base64'), nome });

    registro.titolo('H3 · Exif in fondo, dopo 2 MB di mdat');
    const h3 = await leggi(heicFinto({ riempitivo: 2 * 1048576 }));
    registro.dice('esito', { dataScatto: h3.dataScatto, motivo: h3.motivo, letti: h3.letti, size: h3.size });
    registro.controlla('l’ora si legge', h3.dataScatto === DATA_ATTESA, h3.dataScatto);
    registro.controlla('leggendo meno di 200 KiB su più di 2 MB',
      h3.size > 2 * 1048576 && h3.letti < 200 * 1024, `letti ${h3.letti} byte su ${h3.size}`);

    registro.titolo('H5 · iloc che punta oltre la fine del file');
    const h5 = await leggi(heicFinto({ exifOltre: true }));
    registro.dice('esito', h5);
    registro.controlla('caso «Exif dell’HEIC fuori dal file»', /^Exif dell’HEIC fuori dal file/.test(h5.motivo), h5.motivo);
    registro.controlla('coi fatti misurati', /\d/.test(h5.dettaglio), h5.dettaglio);
    registro.controlla('nessuna data', h5.dataScatto === '');

    registro.titolo('H6 · meta troncato');
    const h6 = await leggi(heicFinto({ troncaMeta: true }));
    registro.dice('esito', h6);
    registro.controlla('caso «struttura HEIC non leggibile»', /^struttura HEIC non leggibile/.test(h6.motivo), h6.motivo);
    registro.controlla('col box', /meta/.test(h6.dettaglio), h6.dettaglio);
    registro.controlla('nessuna data', h6.dataScatto === '');

    registro.titolo('H7 · ftyp con brand avif: trattamento di prima');
    const h7 = await leggi(heicFinto({ maggiore: 'avif', compatibili: ['avif', 'mif1', 'miaf'] }), 'prova.avif');
    registro.dice('esito', h7);
    registro.controlla('non è riconosciuto come HEIC', h7.heic === false,
      'mif1 da solo è il brand generico dell’HEIF, e lo porta anche l’AVIF');
    registro.controlla('esito di prima: «non è un JPEG», gruppo formato',
      /^non è un JPEG/.test(h7.motivo) && h7.gruppo === 'formato', `${h7.motivo} → ${h7.gruppo}`);

    registro.titolo('I casi nuovi sono mandabili, e ognuno ha la sua frase');
    const h4d = await leggi(heicFinto({ senzaExif: true }));
    const nuovi = [h4d, h5, h6];
    nuovi.forEach(v => registro.dice(v.motivo, `${v.gruppo} · ${v.frase}`));
    registro.controlla('finiscono nel gruppo «heic», mandabile e con frasi sue', nuovi.every(v => v.gruppo === 'heic'),
      nuovi.map(v => v.gruppo).join(' '));
    registro.controlla('con tre frasi diverse', new Set(nuovi.map(v => v.frase)).size === 3);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
