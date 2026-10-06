// La fase non si ricorda e non si preseleziona: si sceglie a ogni invio.
//
// **Il caso, misurato il 06/10/2026 sulla raccolta delle bolle.** Il 05/10,
// fra le 16:31 e le 16:37, dallo stesso telefono con la 0.37.6, sono partite
// 38 bolle consecutive di calcestruzzo — il pavimento dell'autorimessa, fase
// giusta `Interrato` — tutte con la fase `FinituraPartiComuniInterne`.
// Quaranta righe di magazzino corrette a mano.
//
// Il meccanismo era doppio, e il collaudo li prova separatamente perché
// toglierne uno solo non basta:
//
//  1. la MEMORIA sul telefono: `ultimaFase` in `llitalia.bolle` e in
//     `llitalia.foto`, scritta a ogni invio e riletta all'apertura del modulo;
//  2. il MENÙ che non torna indietro: dopo Invia la pagina non si ricarica,
//     il menù resta com'era, e la bolla dopo parte con la fase di quella
//     prima — senza che nessuno l'abbia guardata. Anche al cambio di
//     commessa la fase si portava dietro, se esisteva nell'elenco nuovo.
//
// Decisione di Francesco del 06/10/2026: **nessuna fase preselezionata**, in
// tutti e due i moduli. Nelle bolle resta facoltativa e si parte da
// «— nessuna fase —»: il vuoto è un'informazione. Nelle foto resta
// obbligatoria e si parte da «— scegli la fase —», con Invia spento.
//
// Una scelta vale per UN invio, anche se quell'invio porta più foto: è la
// decisione, e il collaudo lo prova invece di darlo per scontato.
//
// Il caso è scelto perché possa fallire: sul telefono c'è già una fase
// vecchia in memoria (`Cantiere`, come la bolla del 30/09 dello stesso
// telefono), DIVERSA da quella che si sceglie durante la prova. Così
// «riletta dalla memoria» e «rimasta nel menù» danno valori diversi, e il
// collaudo sa dire quale dei due meccanismi ha fallito.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Fase senza memoria: si sceglie a ogni invio, nei due moduli',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    // Un telefono che arriva da una versione con la memoria: `ultimaFase`
    // c'è già, e vale `Cantiere` in tutti e due i moduli. E l'ultimo
    // cantiere è MAR, che si ripropone (quello sì, per decisione): il modulo
    // si apre GIÀ su MAR, come su un telefono vero.
    //
    // Non è un dettaglio. La prima stesura sceglieva il cantiere dopo
    // l'apertura, e il cambio di commessa cancellava la fase in memoria prima
    // che il collaudo la guardasse: rimettendo apposta la lettura della
    // memoria, il controllo «all'apertura» restava verde. Un controllo che
    // non può fallire non prova niente — trovato il 06/10/2026 proprio
    // guastando il codice per vederlo diventare rosso.
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 30, ultimaFase: 'Cantiere', ultimoCantiere: 'MAR' },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 30, limiteMB: 20, ultimaFase: 'Cantiere', ultimaCommessa: 'MAR' },
    });

    const statoFase = () => pagina.$eval('#fase', e => ({
      valore: e.value,
      testo: e.options[e.selectedIndex] ? e.options[e.selectedIndex].textContent.trim() : '',
    }));
    const inMemoria = chiave => pagina.evaluate(k => {
      const dati = JSON.parse(localStorage.getItem(k) || '{}');
      return dati.ultimaFase === undefined ? '(assente)' : dati.ultimaFase;
    }, chiave);
    const attendiMenu = async (commessa = '') => aiuto.attendi(pagina, c => {
      const menu = document.querySelector('#fase');
      return Boolean(menu && menu.dataset.livelli !== undefined && menu.dataset.livelli.startsWith(`${c}|`)
        && menu.querySelectorAll('option').length > 1);
    }, `menù della fase pronto per «${commessa}»`, 10000, commessa);
    // Si aspetta «Inviata» e non l'arrivo al flow (trappola 6 di aiuto.js):
    // questo collaudo ricarica la pagina dopo gli invii.
    const attendiInviate = (quante, descrizione) => aiuto.attendi(pagina,
      n => document.querySelectorAll('#lista-coda .badge-inviata').length >= n,
      descrizione, 90000, quante);
    const ultimi = n => flow.stato.ricevuti.slice(-n);

    // ===================================================================
    registro.titolo('Bolle: all’apertura la fase NON è quella in memoria');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await attendiMenu('MAR');
    registro.controlla('il modulo si apre già sull’ultimo cantiere, MAR',
      (await pagina.$eval('#cantiere', e => e.value)) === 'MAR',
      'senza questo la prova sotto non potrebbe fallire');
    registro.dice('in memoria sul telefono', await inMemoria('llitalia.bolle'));
    let stato = await statoFase();
    registro.dice('a video', `«${stato.testo}» (valore ${JSON.stringify(stato.valore)})`);
    registro.controlla('si parte da «— nessuna fase —», non dalla fase in memoria',
      stato.valore === '' && /nessuna fase/.test(stato.testo),
      'la memoria rileggeva «Cantiere»: è il primo dei due meccanismi delle 38 bolle');

    registro.titolo('Bolle: dopo un invio il menù torna allo stato di partenza');
    await pagina.selectOption('#fase', 'ImpiantoAscensore');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.click('#invia');
    await attendiInviate(1, 'prima bolla inviata');
    registro.controlla('la bolla parte con la fase scelta', ultimi(1)[0].fase === 'ImpiantoAscensore',
      ultimi(1)[0].fase);
    stato = await statoFase();
    registro.dice('subito dopo Invia, a video', `«${stato.testo}»`);
    registro.controlla('subito dopo Invia la fase è tornata a «— nessuna fase —»',
      stato.valore === '',
      'è il secondo meccanismo: il menù restava com’era e la bolla dopo partiva con la stessa fase');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.click('#invia');
    await attendiInviate(2, 'seconda bolla inviata');
    registro.controlla('la bolla dopo, senza toccare il menù, parte SENZA fase',
      ultimi(1)[0].fase === '',
      `${JSON.stringify(ultimi(1)[0].fase)} — il vuoto è un’informazione: dice che nessuno l’ha scelta`);
    registro.controlla('e la memoria non si scrive più',
      (await inMemoria('llitalia.bolle')) === 'Cantiere',
      'il valore vecchio può restare, purché nessuno lo legga e nessuno lo aggiorni');

    registro.titolo('Bolle: al cambio di cantiere la fase riparte');
    await pagina.selectOption('#fase', 'Strutture');
    await pagina.selectOption('#cantiere', 'MNG');
    await attendiMenu('MNG');
    registro.controlla('scelta Strutture su MAR, passando a MNG la fase torna vuota',
      (await statoFase()).valore === '',
      'Strutture esiste anche su MNG: un menù che si portasse dietro il valore lo terrebbe');

    registro.titolo('Bolle: dopo una ricarica la fase riparte, anche se l’ultima ne aveva una');
    await pagina.selectOption('#fase', 'ImpiantoAscensore');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.click('#invia');
    await attendiInviate(3, 'terza bolla inviata');
    await pagina.reload();
    await pagina.waitForSelector('#cantiere');
    await pagina.selectOption('#cantiere', 'MNG');
    await attendiMenu('MNG');
    registro.controlla('dopo la ricarica: «— nessuna fase —»', (await statoFase()).valore === '');

    registro.titolo('Bolle: più foto in un invio solo — una scelta, per quell’invio');
    // Quello che fa il telefono con una scelta multipla dalla galleria, o con
    // una serie di scatti della fotocamera interna: tutte le foto entrano
    // insieme e partono col primo Invia. Ognuna è una bolla a sé (`idBolla`
    // diversi), e la fase scelta vale per tutte quelle dell'invio.
    await pagina.selectOption('#fase', 'Interrato');
    await pagina.setInputFiles('#input-galleria',
      [materiale('bolla.jpg'), materiale('bolla2.jpg'), materiale('foto-cantiere.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 3, 'tre anteprime', 90000);
    // Un'immagine già mandata chiede conferma (doppione): `nuovoTelefono`
    // accetta i dialog, quindi passano tutte e tre.
    await pagina.click('#invia');
    await attendiInviate(6, 'tre bolle inviate');
    const tre = ultimi(3);
    registro.dice('le tre bolle dello stesso invio', tre.map(r => `${r.fase} · bolla ${String(r.idBolla).slice(0, 8)} · pagina ${r.pagina}/${r.pagine}`));
    registro.controlla('tutte e tre con la fase scelta per quell’invio',
      tre.every(r => r.fase === 'Interrato'));
    registro.controlla('e sono tre bolle, non una di tre pagine',
      new Set(tre.map(r => r.idBolla)).size === 3 && tre.every(r => r.pagine === 1));
    registro.controlla('finito l’invio, la fase riparte', (await statoFase()).valore === '');

    // ===================================================================
    registro.titolo('Foto: all’apertura si parte da «scegli», non dalla memoria');
    // La commessa ricordata, a questo punto, è quella dell'ultimo invio di
    // foto: nessuno ancora, quindi la MAR della configurazione.
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await attendiMenu('MAR');
    registro.controlla('il modulo si apre già sull’ultima commessa, MAR',
      (await pagina.$eval('#commessa', e => e.value)) === 'MAR',
      'senza questo la prova sotto non potrebbe fallire');
    registro.dice('in memoria sul telefono', await inMemoria('llitalia.foto'));
    stato = await statoFase();
    registro.dice('a video', `«${stato.testo}» (valore ${JSON.stringify(stato.valore)})`);
    registro.controlla('si parte da «— scegli la fase —»',
      stato.valore === '' && /scegli la fase/.test(stato.testo),
      'qui la fase è obbligatoria: «nessuna fase» suggerirebbe una scelta che non esiste');

    registro.titolo('Foto: dopo un invio fase e livelli tornano allo stato di partenza');
    // `Strutture` col piano: prova anche i livelli, che senza fase non si
    // chiedono e quindi ripartono con lei.
    await pagina.selectOption('#fase', 'Strutture');
    await attendiMenu('MAR');
    await pagina.selectOption('#piano', 'P1');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiInviate(1, 'prima foto inviata');
    const primaFoto = flow.stato.ricevuti.filter(r => 'tipo' in r).slice(-1)[0];
    registro.controlla('la foto parte con fase e piano scelti',
      primaFoto.fase === 'Strutture' && primaFoto.piano === 'P1', `${primaFoto.fase} · ${primaFoto.piano}`);
    stato = await statoFase();
    registro.controlla('subito dopo Invia: «— scegli la fase —»',
      stato.valore === '' && /scegli la fase/.test(stato.testo), `«${stato.testo}»`);
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await pagina.waitForTimeout(300);
    registro.controlla('una foto nuova senza fase: Invia resta spento',
      await pagina.$eval('#invia', e => e.disabled),
      'la foto non parte senza fase: aspetta che l’operatore scelga');
    await pagina.selectOption('#fase', 'Strutture');
    await attendiMenu('MAR');
    registro.controlla('rimessa Strutture, il piano riparte dal segnaposto e non da P1',
      (await pagina.$eval('#piano', e => e.value)) === '',
      'il piano dell’invio prima non è una scelta per questo');
    registro.controlla('e la memoria non si scrive più',
      (await inMemoria('llitalia.foto')) === 'Cantiere');

    registro.titolo('Foto: al cambio di commessa, e dopo una ricarica, la fase riparte');
    await pagina.selectOption('#commessa', 'MNG');
    await attendiMenu('MNG');
    registro.controlla('scelta Strutture su MAR, passando a MNG la fase torna a «scegli»',
      (await statoFase()).valore === '');
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    await pagina.selectOption('#commessa', 'MAR');
    await attendiMenu('MAR');
    registro.controlla('dopo la ricarica: «— scegli la fase —»', (await statoFase()).valore === '');

    registro.titolo('Urbanizzazioni: «scegli il lotto» nelle foto, «nessun lotto» nelle bolle');
    await pagina.selectOption('#commessa', 'SNU');
    await attendiMenu('SNU');
    stato = await statoFase();
    registro.controlla('foto, SNU: «— scegli il lotto —»', /scegli il lotto/.test(stato.testo), `«${stato.testo}»`);
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.selectOption('#cantiere', 'SNU');
    await attendiMenu('SNU');
    stato = await statoFase();
    registro.controlla('bolle, SNU: «— nessun lotto —»', /nessun lotto/.test(stato.testo), `«${stato.testo}»`);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
