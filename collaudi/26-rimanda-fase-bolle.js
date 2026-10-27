// «Rimanda questa bolla» (Coda invii): la fase di una bolla non si perde in
// silenzio (dalla 0.41.1, specifica del 27/10/2026, regola 1).
//
// Il difetto: una bolla inviata con una fase che il menù non offre più — tolta
// dal master (`Interrato`), esclusa dalle app (`Marketing`), o che il cantiere
// scelto non prevede (`Strutture` su SNU, dove ci sono i lotti) — apriva il
// riquadro con il menù su «— nessuna fase —» e il pulsante ACCESO su «Rimanda
// corretta»: un tocco e la bolla ripartiva con `fase: ""`, senza che nessuno
// avesse deciso di togliergliela. Ora il pulsante resta spento finché non si
// sceglie una voce, e una frase dice il caso.
//
// I record si scrivono direttamente nel database del telefono come bolle già
// inviate, con la foto ancora sul telefono: l'app quelle fasi non le offre
// più, e non c'è altro modo di far nascere il caso.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Bolle, «Rimanda questa bolla»: la fase non si perde in silenzio',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');

    // ------------------------------------------------------------- strumenti
    const b64 = require('fs').readFileSync(materiale('bolla.jpg')).toString('base64');
    let progressivo = 600;
    // Una bolla già inviata, con la foto ancora sul telefono: è quella per cui
    // la Coda invii mostra «Rimanda».
    const iniettaInviata = async (cantiere, fase) => {
      progressivo += 1;
      const id = await pagina.evaluate(async ({ b64, cantiere, fase, progressivo }) => {
        const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
        const db = await new Promise((ok, ko) => { const r = indexedDB.open('llitalia-bolle'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
        if (!db.objectStoreNames.contains('foto')) throw new Error('database delle bolle senza archivio foto');
        const id = crypto.randomUUID();
        const adesso = Date.now();
        await new Promise((ok, ko) => {
          const tx = db.transaction('foto', 'readwrite');
          tx.objectStore('foto').put({
            id, stato: 'inviata', foto: blob, cantiere, fase, autore: 'Paolo Sanzarello', miniatura: blob,
            impronta: '', qualita: 'ok', motivoQualita: '', nome: `${id}.jpg`,
            timestampDispositivo: '2026-10-26T10:00:00+01:00', creatoIl: adesso - 120000, accodatoIl: adesso - 110000,
            tentativi: 0, ultimoErrore: '', inviatoIl: adesso - 100000, idServer: null, progressivo,
            idBolla: id, pagina: 1, pagine: 1,
          });
          tx.oncomplete = ok;
          tx.onerror = () => ko(tx.error);
        });
        db.close();
        return id;
      }, { b64, cantiere, fase, progressivo });
      await pagina.reload();
      await pagina.waitForSelector(`.bolle-rimanda[data-id="${id}"]`, { timeout: 20000 });
      return id;
    };
    const apriRimanda = async (id, cantiere) => {
      await pagina.click(`.bolle-rimanda[data-id="${id}"]`);
      await pagina.waitForSelector('#r-manda');
      await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${cantiere}|`), `riquadro di ${cantiere} pronto`,
        { prefisso: 'r-' });
    };
    const statoRiquadro = () => pagina.evaluate(() => {
      const menu = document.querySelector('#r-fase');
      const pulsante = document.querySelector('#r-manda');
      return {
        cantiere: document.querySelector('#r-cantiere').value,
        fase: menu.value,
        voce: menu.options[menu.selectedIndex] ? menu.options[menu.selectedIndex].textContent.trim() : '',
        pulsante: pulsante.textContent.trim(),
        spento: pulsante.disabled,
        frase: document.querySelector('#r-spiegazione').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    // La richiesta nuova al flow dopo `prima`, se arriva entro `limite`.
    const nuovaRichiesta = async (prima, limite = 8000) => {
      const fine = Date.now() + limite;
      while (flow.stato.ricevuti.length <= prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      return flow.stato.ricevuti[prima] || null;
    };
    const fraseAttesa = (inizio, fine) =>
      `${inizio} non è fra ${inizio.startsWith('Il lotto') ? 'quelli' : 'quelle'} che si possono scegliere per questo cantiere: ${fine} per rimandarla.`;
    // Prima di ricaricare (`iniettaInviata`), niente in coda né in invio: una
    // ricarica con un invio a metà lo fa ripartire da solo (trappola 6).
    const attendiNienteInViaggio = descrizione => aiuto.attendi(pagina,
      () => document.querySelectorAll('#lista-coda .badge-coda, #lista-coda .badge-invio').length === 0,
      descrizione, 60000);
    const scegli = async (selettore, valore, marcatore) => {
      await pagina.selectOption(selettore, valore);
      await aiuto.attendiMarcatore(pagina, m => m === marcatore, `riquadro su ${marcatore}`, { prefisso: 'r-' });
    };
    // Cambiando il cantiere si aspetta il marcatore del cantiere nuovo; la
    // fase che ne esce la controllano i casi (un'attesa sulla fase giusta, con
    // un guasto, fermerebbe il collaudo invece di farlo diventare rosso).
    const scegliCantiere = async codice => {
      await pagina.selectOption('#r-cantiere', codice);
      await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${codice}|`), `riquadro su ${codice}`, { prefisso: 'r-' });
    };

    // ================================================================ caso 1
    registro.titolo('Caso 1 · bolla MAR inviata con fase «Interrato» (tolta dal master)');
    const id1 = await iniettaInviata('MAR', 'Interrato');
    await apriRimanda(id1, 'MAR');
    const s1 = await statoRiquadro();
    registro.dice('riquadro appena aperto', s1);
    registro.controlla('caso 1 · il menù della fase sta su «— nessuna fase —»',
      s1.fase === '' && s1.voce === '— nessuna fase —', `«${s1.voce}»`);
    registro.controlla('caso 1 · il pulsante è spento', s1.spento === true, `${s1.pulsante} · ${s1.spento ? 'spento' : 'acceso'}`);
    const frase1 = fraseAttesa('La fase «Interrato»', 'scegli la fase');
    registro.controlla('caso 1 · sotto il pulsante la frase del caso, con «Interrato»', s1.frase === frase1, `«${s1.frase}»`);
    // Il difetto, riprodotto: se il pulsante è acceso lo si preme, e si guarda
    // cosa parte. Sul codice della 0.41.0 parte la bolla con `fase: ""`.
    const prima1 = flow.stato.ricevuti.length;
    if (!s1.spento) await pagina.click('#r-manda');
    const partita1 = s1.spento ? null : await nuovaRichiesta(prima1);
    if (partita1) registro.dice('premuto il pulsante acceso, è partito', `commessa ${partita1.commessa} · fase ${JSON.stringify(partita1.fase)}`);
    registro.controlla('caso 1 · nessuna bolla parte con la fase tolta in silenzio',
      partita1 === null, partita1 ? `partita con fase ${JSON.stringify(partita1.fase)}` : 'niente partito');

    // ================================================================ caso 2
    registro.titolo('Caso 2 · la stessa bolla, scelta una fase del menù');
    if (partita1) await attendiNienteInViaggio('bolla partita per il difetto, dichiarata Inviata');
    if (!(await pagina.$('#r-manda'))) await apriRimanda(id1, 'MAR');
    await scegli('#r-fase', 'FinituraPartiComuniInterne', 'MAR|FinituraPartiComuniInterne');
    const s2 = await statoRiquadro();
    registro.dice('dopo la scelta', s2);
    registro.controlla('caso 2 · il pulsante dice «Rimanda corretta» ed è acceso',
      s2.pulsante === 'Rimanda corretta' && s2.spento === false, `${s2.pulsante} · ${s2.spento ? 'spento' : 'acceso'}`);
    registro.controlla('caso 2 · la frase del caso non c’è più', !/non è fra quelle/.test(s2.frase), `«${s2.frase}»`);
    const prima2 = flow.stato.ricevuti.length;
    await pagina.click('#r-manda');
    const partita2 = await nuovaRichiesta(prima2, 30000);
    registro.dice('partita', partita2 && `idClient ${partita2.idClient} · commessa ${partita2.commessa} · fase ${JSON.stringify(partita2.fase)}`);
    registro.controlla('caso 2 · parte su MAR con fase FinituraPartiComuniInterne e un identificativo nuovo',
      Boolean(partita2) && partita2.commessa === 'MAR' && partita2.fase === 'FinituraPartiComuniInterne'
        && partita2.idClient !== id1, partita2 ? `${partita2.commessa} · ${partita2.fase}` : 'niente partito');
    await attendiNienteInViaggio('bolla del caso 2 dichiarata Inviata');

    // ================================================================ caso 3
    registro.titolo('Caso 3 · bolla con fase «Marketing» (esclusa dalle app)');
    const id3 = await iniettaInviata('MAR', 'Marketing');
    await apriRimanda(id3, 'MAR');
    const s3 = await statoRiquadro();
    registro.dice('riquadro appena aperto', s3);
    registro.controlla('caso 3 · menù su «— nessuna fase —», pulsante spento',
      s3.fase === '' && s3.voce === '— nessuna fase —' && s3.spento === true, `«${s3.voce}» · ${s3.spento ? 'spento' : 'acceso'}`);
    registro.controlla('caso 3 · la frase del caso, con «Marketing»',
      s3.frase === fraseAttesa('La fase «Marketing»', 'scegli la fase'), `«${s3.frase}»`);

    // ================================================================ caso 4
    registro.titolo('Caso 4 · bolla MAR con fase «Strutture», niente cambiato');
    const id4 = await iniettaInviata('MAR', 'Strutture');
    await apriRimanda(id4, 'MAR');
    const s4 = await statoRiquadro();
    registro.dice('riquadro appena aperto', s4);
    registro.controlla('caso 4 · il menù parte da «Strutture», «Rimanda la stessa» acceso',
      s4.fase === 'Strutture' && s4.pulsante === 'Rimanda la stessa' && s4.spento === false,
      `${s4.fase} · ${s4.pulsante} · ${s4.spento ? 'spento' : 'acceso'}`);
    registro.controlla('caso 4 · e dice che l’identificativo è lo stesso, come oggi', /Stesso identificativo/.test(s4.frase), `«${s4.frase}»`);

    // ================================================================ caso 5
    registro.titolo('Caso 5 · la stessa bolla, cantiere cambiato in SNU (lotti)');
    await scegliCantiere('SNU');
    const s5 = await statoRiquadro();
    registro.dice('dopo il cambio di cantiere', s5);
    registro.controlla('caso 5 · il menù sta sul segnaposto («— nessun lotto —» su SNU) e il pulsante è spento',
      s5.fase === '' && s5.voce === '— nessun lotto —' && s5.spento === true, `«${s5.voce}» · ${s5.spento ? 'spento' : 'acceso'}`);
    registro.controlla('caso 5 · la frase dice «Strutture» e chiede il lotto',
      s5.frase === fraseAttesa('La fase «Strutture»', 'scegli il lotto'), `«${s5.frase}»`);
    await scegli('#r-fase', 'Lotto1', 'SNU|Lotto1');
    const s5b = await statoRiquadro();
    registro.controlla('caso 5 · scelto «Lotto 1» il pulsante si accende su «Rimanda corretta»',
      s5b.pulsante === 'Rimanda corretta' && s5b.spento === false, `${s5b.pulsante} · ${s5b.spento ? 'spento' : 'acceso'}`);
    const prima5 = flow.stato.ricevuti.length;
    await pagina.click('#r-manda');
    const partita5 = await nuovaRichiesta(prima5, 30000);
    registro.controlla('caso 5 · parte su SNU con Lotto1 e un identificativo nuovo',
      Boolean(partita5) && partita5.commessa === 'SNU' && partita5.fase === 'Lotto1' && partita5.idClient !== id4,
      partita5 ? `${partita5.commessa} · ${partita5.fase}` : 'niente partito');
    await attendiNienteInViaggio('bolla del caso 5 dichiarata Inviata');

    // ================================================================ caso 6
    registro.titolo('Caso 6 · bolla senza fase');
    const id6 = await iniettaInviata('MAR', '');
    await apriRimanda(id6, 'MAR');
    const s6 = await statoRiquadro();
    registro.dice('riquadro appena aperto', s6);
    registro.controlla('caso 6 · «— nessuna fase —» e «Rimanda la stessa» acceso, come oggi',
      s6.fase === '' && s6.voce === '— nessuna fase —' && s6.pulsante === 'Rimanda la stessa' && s6.spento === false,
      `«${s6.voce}» · ${s6.pulsante} · ${s6.spento ? 'spento' : 'acceso'}`);

    // ======================================== D1: cambio di cantiere, fase offerta
    // Decisione del 27/10/2026 sull'arresto 1 (strada A): al cambio di
    // cantiere il menù torna alla fase della bolla se il cantiere nuovo la
    // offre. Fino alla 0.41.0 ripartiva dal segnaposto e la bolla partiva con
    // `fase: ""` — la stessa perdita della regola 1, che la tabella non copriva.
    registro.titolo('D1 · bolla MAR «Strutture», cantiere cambiato in MNG');
    const idA = await iniettaInviata('MAR', 'Strutture');
    await apriRimanda(idA, 'MAR');
    await scegliCantiere('MNG');
    const sA = await statoRiquadro();
    registro.dice('dopo il cambio di cantiere', sA);
    registro.controlla('D1 · la fase resta «Strutture», «Rimanda corretta» acceso',
      sA.fase === 'Strutture' && sA.pulsante === 'Rimanda corretta' && sA.spento === false,
      `${sA.fase || '(vuota)'} · ${sA.pulsante} · ${sA.spento ? 'spento' : 'acceso'}`);
    const primaA = flow.stato.ricevuti.length;
    await pagina.click('#r-manda');
    const partitaA = await nuovaRichiesta(primaA, 30000);
    registro.controlla('D1 · parte su MNG con fase Strutture',
      Boolean(partitaA) && partitaA.commessa === 'MNG' && partitaA.fase === 'Strutture' && partitaA.idClient !== idA,
      partitaA ? `${partitaA.commessa} · ${JSON.stringify(partitaA.fase)}` : 'niente partito');
    await attendiNienteInViaggio('bolla D1 dichiarata Inviata');

    registro.titolo('D1 · fase scelta a mano (Murature), poi cambio di cantiere');
    const idB = await iniettaInviata('MAR', 'Strutture');
    await apriRimanda(idB, 'MAR');
    await scegli('#r-fase', 'Murature', 'MAR|Murature');
    await scegliCantiere('MNG');
    const sB = await statoRiquadro();
    registro.dice('dopo il cambio di cantiere', sB);
    registro.controlla('D1 · la scelta a mano non si porta dietro: si torna a «Strutture», la fase della bolla',
      sB.fase === 'Strutture', sB.fase || '(vuota)');

    // ============================================ i casi e le loro frasi
    // Il caso lo decide `faseDaRivedere`, la frase `fraseFaseDaRivedere`: le
    // quattro combinazioni (fase o lotto della bolla, menù di fasi o di lotti)
    // danno quattro frasi diverse, ognuna con l'etichetta e la scelta giusta;
    // dove la fase si può scegliere il caso non c'è.
    registro.titolo('I casi della regola 1 e le loro frasi');
    const frasi = await pagina.evaluate(async () => {
      const { faseDaRivedere } = await import('./core/anagrafica.js');
      const { fraseFaseDaRivedere } = await import('./core/errori.js');
      const casi = [['MAR', 'Interrato'], ['SNU', 'Strutture'], ['MAR', 'Lotto1'], ['SNU', 'Lotto9']];
      const nessuno = [['MAR', 'Strutture'], ['MAR', ''], ['SNU', 'Lotto1'], ['MRS', 'Murature'], ['MNG', 'ImpiantoSEFCC']];
      return {
        frasi: casi.map(([c, f]) => { const caso = faseDaRivedere(c, f); return caso ? fraseFaseDaRivedere(caso) : null; }),
        nessuno: nessuno.map(([c, f]) => faseDaRivedere(c, f)),
      };
    });
    registro.dice('frasi', frasi.frasi);
    const attese = [
      fraseAttesa('La fase «Interrato»', 'scegli la fase'),
      fraseAttesa('La fase «Strutture»', 'scegli il lotto'),
      fraseAttesa('Il lotto «Lotto 1»', 'scegli la fase'),
      fraseAttesa('Il lotto «Lotto 9»', 'scegli il lotto'),
    ];
    registro.controlla('fase tolta su un edificio, fase su un’urbanizzazione, lotto su un edificio, lotto su un’urbanizzazione: ognuno la sua frase',
      frasi.frasi.every((f, i) => f === attese[i]) && new Set(frasi.frasi).size === 4, frasi.frasi.join(' | '));
    registro.controlla('dove la fase c’è fra le voci (o non c’è nessuna fase) il caso non scatta',
      frasi.nessuno.every(c => c === null), JSON.stringify(frasi.nessuno));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
