// L'HEIC in Bolle e Segnalazioni si decodifica sul telefono (dalla 0.45.0).
//
// Prima, in questi due moduli, una foto HEIC su Chrome per Android si fermava
// con un messaggio («non si può leggere su questo telefono»): il modulo Foto
// manda l'originale, ma Bolle e Segnalazioni mandano un JPEG, e per farlo il
// telefono deve disegnare la foto. Ora lo fa `core/heic.js` con libheif
// (WebAssembly, `core/vendor/libheif/`), caricata solo alla prima foto HEIC che
// il browser non sa disegnare da sé. Il modulo Foto non cambia (collaudo 28).
//
// Cosa si può provare QUI, e cosa no:
//  - Questo Chromium non decodifica l'HEIC, come Chrome su Android: è proprio
//    il caso del telefono, quindi la strada «createImageBitmap fallisce → libheif»
//    si percorre per davvero.
//  - Un HEIC valido da decodificare serve un flusso HEVC vero, e nel repo una
//    foto di cantiere non si committa: `heic-finto.js` ha il contenitore giusto
//    e un riempitivo al posto dei pixel, quindi libheif lo legge e dice «non
//    riesco» — che è il caso «file rovinato», e prova che libreria, caricamento
//    e frase arrivano fino all'operatore.
//  - Il caso felice (HEIC vero → JPEG a valle) si prova se la variabile
//    `COLLAUDO_HEIC_VERO` indica un file HEIC vero di un telefono: non parte
//    senza, e il collaudo lo dichiara «non eseguito» invece di farlo passare.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { nuovoTelefono, configura, materiale } = require('./aiuto');
const { heicFinto } = require('./heic-finto');

const RADICE = path.join(__dirname, '..');
const BUNDLE = path.join(RADICE, 'core', 'vendor', 'libheif', 'libheif-bundle.mjs');
const sha = byte => crypto.createHash('sha256').update(byte).digest('hex');

module.exports = {
  nome: 'HEIC in Bolle e Segnalazioni: decodifica sul telefono, caricata solo se serve',

  async esegui({ browser, app, flow, registro, aiuto }) {
    // --- La libreria è quella dichiarata ----------------------------------
    registro.titolo('La libreria servita è quella scritta nel LEGGIMI');
    const leggimi = fs.readFileSync(path.join(path.dirname(BUNDLE), 'LEGGIMI.md'), 'utf8');
    const dichiarata = (leggimi.match(/libheif-bundle\.mjs`[^`]*?SHA-256 `([0-9a-f]{64})`/) || [])[1] || '';
    const effettiva = sha(fs.readFileSync(BUNDLE));
    registro.dice('impronta', `${effettiva.slice(0, 16)}… · ${fs.statSync(BUNDLE).size} byte`);
    registro.controlla('l’impronta del file è quella del LEGGIMI', Boolean(dichiarata) && dichiarata === effettiva,
      `LEGGIMI ${dichiarata.slice(0, 16)}… · file ${effettiva.slice(0, 16)}…`);

    // --- Una frase per ogni caso -------------------------------------------
    const { contesto, pagina, errori } = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');

    registro.titolo('Ogni caso ha la sua frase, e le frasi sono diverse');
    const frasi = await pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      const e = await import('./core/errori.js');
      return { motivi: h.MOTIVI_HEIC, frasi: h.MOTIVI_HEIC.map(m => e.fraseHeic(m)), chiavi: Object.keys(e.FRASI_HEIC) };
    });
    registro.dice('motivi', frasi.motivi);
    frasi.frasi.forEach((f, i) => registro.dice(frasi.motivi[i], f));
    registro.controlla('i motivi sono libreria, avvio, lettura, decodifica, troppo-grande',
      frasi.motivi.join(',') === 'libreria,avvio,lettura,decodifica,troppo-grande', frasi.motivi.join(','));
    registro.controlla('a ogni motivo corrisponde una frase scritta apposta',
      frasi.motivi.every(m => frasi.chiavi.includes(m)) && frasi.chiavi.length === frasi.motivi.length,
      `motivi ${frasi.motivi.length} · frasi ${frasi.chiavi.length}`,
      'un caso nuovo senza la sua frase deve far fallire questo collaudo, non finire nella frase generica');
    registro.controlla('e sono tutte diverse', new Set(frasi.frasi).size === frasi.motivi.length);
    registro.controlla('ognuna dice cosa fare (scattare con «Scatta foto» o riprovare con la rete)',
      frasi.frasi.every(f => /Scatta foto|riprova/.test(f)));

    // --- Senza un HEIC la libreria non si carica ----------------------------
    registro.titolo('Una bolla JPEG non scarica né esegue la libreria');
    const richieste = [];
    pagina.on('request', r => { if (r.url().includes('libheif')) richieste.push(r.url()); });
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima della bolla JPEG', 60000);
    registro.controlla('nessuna richiesta di libheif', richieste.length === 0, richieste.join(' '));
    registro.controlla('e la libreria non è in pagina', await pagina.evaluate(async () => !(await import('./core/heic.js')).libreriaCaricata()));

    // --- Bolle: un HEIC che il browser non disegna --------------------------
    registro.titolo('Bolle: un HEIC illeggibile si dice, con la sua frase, e non entra in coda');
    const finto = heicFinto();
    const bozzeJpeg = await pagina.$$eval('.bolle-anteprima', e => e.length);
    await pagina.setInputFiles('#input-galleria', [{ name: '20261124_090000.heic', mimeType: 'image/heic', buffer: finto }]);
    await aiuto.attendi(pagina, () => /Foto non aggiunte/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'messaggio di foto non aggiunta', 60000);
    const avvisoBolle = await pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('messaggio', avvisoBolle);
    registro.controlla('la libreria è stata chiesta (una volta)', richieste.length >= 1, String(richieste.length));
    registro.controlla('e adesso è in pagina', await pagina.evaluate(async () => (await import('./core/heic.js')).libreriaCaricata()));
    registro.controlla('il messaggio è la frase «decodifica» di questo caso',
      avvisoBolle.includes('Questa foto HEIC non si riesce ad aprire'), avvisoBolle);
    registro.controlla('col motivo tecnico fra parentesi', /\(decodifica(: [^)]+)?\)/.test(avvisoBolle), avvisoBolle);
    registro.controlla('non dice «non si può leggere» e non dà la colpa a una causa che non si sa',
      !/non si può leggere|forse/.test(avvisoBolle));
    registro.controlla('la foto non è entrata fra le bozze',
      (await pagina.$$eval('.bolle-anteprima', e => e.length)) === bozzeJpeg, `${bozzeJpeg} prima`);
    registro.controlla('e il flow non ha ricevuto niente', flow.stato.ricevuti.length === 0, String(flow.stato.ricevuti.length));
    errori.length = 0; // gli errori attesi sono quelli del messaggio a video, non della console

    // --- Il file che il telefono non lascia leggere non è «rovinato» -------------
    registro.titolo('Lettura negata: la frase della lettura, non quella della decodifica');
    const negata = await pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      const falso = { arrayBuffer: () => Promise.reject(Object.assign(new Error('The requested file could not be read'), { name: 'NotReadableError' })) };
      try { await h.decodificaHeic(falso); return { riuscita: true }; } catch (e) { return { riuscita: false, motivo: e.motivo, messaggio: e.message }; }
    });
    registro.dice('esito', negata);
    registro.controlla('il motivo è «lettura» e la frase non parla di file rovinato',
      negata.motivo === 'lettura' && !/rovinato/.test(negata.messaggio) && /non lascia leggere/.test(negata.messaggio), negata.messaggio);

    // --- Segnalazioni: lo stesso HEIC ---------------------------------------
    registro.titolo('Segnalazioni: la stessa frase, nel suo avviso');
    await pagina.evaluate(ep => {
      localStorage.setItem('llitalia.segnalazioni', JSON.stringify(ep));
      localStorage.setItem('llitalia.app', JSON.stringify({ autore: 'Paolo Sanzarello' }));
    }, {
      endpoint: flow.endpoint('segnalazioni-ricevitore'), endpointElenco: flow.endpoint('segnalazioni-elenco'), token: 'PROVA',
    });
    await pagina.goto(app.indirizzo + '/index.html#/segnalazioni/nuova');
    await pagina.waitForSelector('#commessa');
    await pagina.waitForSelector('#galleria', { state: 'attached' });
    await pagina.setInputFiles('#galleria', [{ name: '20261124_090001.heic', mimeType: 'image/heic', buffer: finto }]);
    await aiuto.attendi(pagina, () => {
      const a = document.querySelector('#avviso-foto');
      return a && !a.classList.contains('nascosto') && a.textContent.length > 0;
    }, 'avviso della segnalazione', 60000);
    const avvisoSegn = await pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso', avvisoSegn);
    registro.controlla('è la stessa frase, scritta una volta sola in core/errori.js',
      avvisoSegn.includes('Questa foto HEIC non si riesce ad aprire'), avvisoSegn);
    registro.controlla('e nessuna anteprima è comparsa', (await pagina.$$('#anteprime img')).length === 0);
    // Un file che non è né un'immagine leggibile né un HEIC resta col messaggio di prima.
    await pagina.setInputFiles('#galleria', [{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('non sono una foto') }]);
    await aiuto.attendi(pagina, () => /non si può leggere/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'avviso per un file che non è una foto', 30000);
    const avvisoAltro = await pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso', avvisoAltro);
    registro.controlla('un file non-HEIC illeggibile non parla di HEIC',
      !/HEIC/.test(avvisoAltro), avvisoAltro);
    await contesto.close();

    // --- Libreria non raggiungibile -------------------------------------------
    registro.titolo('Libreria non scaricabile (rete assente, mai installata): la frase «libreria»');
    const senza = await nuovoTelefono(browser, { serviceWorkers: 'block' });
    await configura(senza.pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await senza.contesto.route('**/libheif-bundle.mjs*', r => r.abort());
    await senza.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await senza.pagina.waitForSelector('#cantiere');
    await senza.pagina.setInputFiles('#input-galleria', [{ name: '20261124_090002.heic', mimeType: 'image/heic', buffer: finto }]);
    await aiuto.attendi(senza.pagina, () => /Foto non aggiunte/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'messaggio di foto non aggiunta', 60000);
    const avvisoSenza = await senza.pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('messaggio', avvisoSenza);
    registro.controlla('la frase è quella della libreria, che dice di riprovare con la rete',
      avvisoSenza.includes('serve scaricare un programma') && /\(libreria/.test(avvisoSenza), avvisoSenza);
    registro.controlla('non quella della decodifica', !avvisoSenza.includes('non si riesce ad aprire'));
    registro.controlla('la libreria non risulta caricata: un secondo tentativo, con la rete, deve poter riuscire',
      await senza.pagina.evaluate(async () => !(await import('./core/heic.js')).libreriaCaricata()));
    await senza.contesto.unroute('**/libheif-bundle.mjs*');
    await senza.pagina.setInputFiles('#input-galleria', [{ name: '20261124_090003.heic', mimeType: 'image/heic', buffer: heicFinto({ data: '2026:11:24 09:00:03' }) }]);
    await aiuto.attendi(senza.pagina, () => /non si riesce ad aprire/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'con la rete tornata il secondo tentativo scarica la libreria e arriva alla decodifica', 60000);
    await senza.contesto.close();

    // --- Offline con la libreria già in cache -----------------------------------
    registro.titolo('Installazione: la libreria NON si scarica; alla prima foto HEIC sì, e resta in una cache sua');
    const inst = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(inst.pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await aiuto.attendiInstallazione(inst.pagina);
    const leggiCache = () => inst.pagina.evaluate(async () => {
      const nomi = (await caches.keys()).filter(n => n.startsWith('libreria-heic-'));
      const chiavi = [];
      for (const n of nomi) chiavi.push(...(await (await caches.open(n)).keys()).map(r => new URL(r.url).pathname));
      return { nomi, chiavi };
    });
    const prima = await leggiCache();
    registro.dice('cache della libreria a installazione finita', prima);
    registro.controlla('installata l’app, il decodificatore non è stato scaricato (2 MB che pochi userebbero)',
      prima.chiavi.length === 0, JSON.stringify(prima));
    await inst.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await inst.pagina.waitForSelector('#cantiere');
    await inst.pagina.setInputFiles('#input-galleria', [{ name: '20261124_090005.heic', mimeType: 'image/heic', buffer: finto }]);
    await aiuto.attendi(inst.pagina, () => /Foto non aggiunte/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'messaggio alla prima foto HEIC', 60000);
    await aiuto.attendi(inst.pagina, async () => {
      const nome = (await caches.keys()).find(n => n.startsWith('libreria-heic-'));
      return Boolean(nome) && (await (await caches.open(nome)).keys()).length > 0;
    }, 'libreria entrata nella cache dopo la prima foto HEIC', 30000);
    const dopo = await leggiCache();
    registro.dice('cache della libreria dopo la prima foto HEIC', dopo);
    registro.controlla('una cache sua, con dentro il decodificatore',
      dopo.nomi.length === 1 && dopo.chiavi.some(c => c.endsWith('/core/vendor/libheif/libheif-bundle.mjs')), JSON.stringify(dopo));
    registro.controlla('la sua versione sta nel nome (non cambia a ogni rilascio dell’app)',
      /^libreria-heic-\d+\.\d+\.\d+$/.test(dopo.nomi[0] || ''), dopo.nomi[0]);
    registro.titolo('Senza rete, dopo averla scaricata una volta, la libreria c’è lo stesso');
    await app.chiudi();
    await flow.sospendi();
    await inst.contesto.setOffline(true);
    await inst.pagina.setInputFiles('#input-galleria', [{ name: '20261124_090004.heic', mimeType: 'image/heic', buffer: finto }]);
    await aiuto.attendi(inst.pagina, () => /Foto non aggiunte/.test((document.querySelector('#avviso-foto') || {}).textContent || ''),
      'messaggio di foto non aggiunta, senza rete', 60000);
    const avvisoOffline = await inst.pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('messaggio', avvisoOffline);
    registro.controlla('senza rete il decodificatore si carica dalla cache: il caso è «decodifica», non «libreria»',
      avvisoOffline.includes('non si riesce ad aprire') && !avvisoOffline.includes('serve scaricare'), avvisoOffline);
    await inst.contesto.setOffline(false);
    await app.riavvia();
    await flow.riprendi();
    await inst.contesto.close();

    // --- Il caso felice, se c'è un HEIC vero ----------------------------------
    registro.titolo('HEIC vero → JPEG a valle (solo con COLLAUDO_HEIC_VERO)');
    const percorsoVero = process.env.COLLAUDO_HEIC_VERO;
    if (!percorsoVero || !fs.existsSync(percorsoVero)) {
      registro.dice('non eseguito', 'COLLAUDO_HEIC_VERO non indica un file: nel repo non c’è un HEIC vero (foto di cantiere)');
    } else {
      const vero = fs.readFileSync(percorsoVero);
      const t = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
      await configura(t.pagina, app.indirizzo, {
        bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      });
      await t.pagina.goto(app.indirizzo + '/index.html#/bolle');
      await t.pagina.waitForSelector('#cantiere');
      const prima = flow.stato.ricevuti.length;
      await t.pagina.setInputFiles('#input-galleria', [{ name: 'vero.heic', mimeType: 'image/heic', buffer: vero }]);
      await aiuto.attendi(t.pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 120000);
      await t.pagina.selectOption('#cantiere', 'MAR');
      await t.pagina.click('#invia');
      const fine = Date.now() + 120000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      const arrivata = flow.stato.ricevuti[prima];
      const byte = arrivata ? Buffer.from(arrivata.contenutoBase64, 'base64') : Buffer.alloc(0);
      const dim = await t.pagina.evaluate(async b64 => {
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const i = await createImageBitmap(new Blob([bin], { type: 'image/jpeg' }));
        return { l: i.width, a: i.height };
      }, byte.toString('base64'));
      registro.dice('arrivata', `${byte.length} byte · JPEG ${dim.l}×${dim.a} · ${arrivata && arrivata.estensione}`);
      registro.controlla('a valle arriva un JPEG vero', byte[0] === 0xFF && byte[1] === 0xD8 && byte[2] === 0xFF, byte.subarray(0, 4).toString('hex'));
      registro.controlla('col lato lungo ridotto a 2500', Math.max(dim.l, dim.a) === 2500, `${dim.l}×${dim.a}`);
      registro.controlla('e il peso di un JPEG da bolla, non quello dell’HEIC', byte.length > 10000 && byte.length < vero.length * 4, `${byte.length} contro ${vero.length}`);
      registro.controllaConsole(t.errori);
      await t.contesto.close();
    }

    registro.controllaConsole(errori);
  },
};
