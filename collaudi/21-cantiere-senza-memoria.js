// Il cantiere non si ricorda e non si preseleziona: si sceglie a ogni invio.
// E nelle foto, quando cambia la fase, ripartono i livelli.
//
// Decisione di Francesco del 06/10/2026, dopo la 0.37.9 che aveva fatto lo
// stesso con la fase. Il cantiere è il dato più pesante della bolla: il
// runbook del magazzino lo prende per certo, senza controlli. E nella stessa
// sessione si mandano bolle di cantieri diversi — il 05/10 SNZ2.2, poi
// SNZ2.1, poi di nuovo SNZ2.2; il 23/09 MNG e subito dopo SNZ2.2 — quindi un
// cantiere rimasto dall'invio prima porterebbe la bolla sulla commessa
// sbagliata senza che nessuno se ne accorga. Il giro delle bolle passa da tre
// a quattro tocchi: un tocco in più per invio, non per bolla.
//
// I meccanismi che preselezionavano il cantiere erano gli stessi tre della
// fase, più uno suo:
//
//  1. la MEMORIA: `ultimoCantiere` (bolle) e `ultimaCommessa` (foto), scritte
//     a ogni invio e rilette all'apertura;
//  2. il MENÙ che non tornava dopo Invia;
//  3. il SEGNAPOSTO che spariva: con un cantiere in memoria il menù non aveva
//     proprio la voce «— scegli il cantiere —», e tornare a «nessuno» era
//     impossibile;
//  4. la CORREZIONE dallo storico («Cantiere sbagliato?»), che apriva un menù
//     senza segnaposto col primo degli altri cantieri già selezionato.
//
// Il caso è scelto perché possa fallire: in memoria c'è un cantiere (`BRU`)
// diverso da tutti quelli che si scelgono durante la prova.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Cantiere senza memoria; nelle foto i livelli ripartono al cambio di fase',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 30, ultimoCantiere: 'BRU' },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 30, limiteMB: 20, ultimaCommessa: 'BRU' },
    });

    const statoMenu = id => pagina.$eval(id, e => ({
      valore: e.value,
      testo: e.options[e.selectedIndex] ? e.options[e.selectedIndex].textContent.trim() : '',
      segnaposto: [...e.options].some(o => o.value === '' && /scegli il cantiere/.test(o.textContent)),
      voci: [...e.options].filter(o => o.value).length,
    }));
    const inMemoria = (chiave, campo) => pagina.evaluate(({ k, c }) => {
      const dati = JSON.parse(localStorage.getItem(k) || '{}');
      return dati[c] === undefined ? '(assente)' : dati[c];
    }, { k: chiave, c: campo });
    // Il menù della fase è pronto per quella commessa (trappola 4ter).
    const attendiMenu = commessa => aiuto.attendi(pagina, c => {
      const menu = document.querySelector('#fase');
      return Boolean(menu && menu.dataset.livelli !== undefined && menu.dataset.livelli.startsWith(`${c}|`)
        && menu.querySelectorAll('option').length > 1);
    }, `menù della fase pronto per «${commessa}»`, 10000, commessa);
    const attendiLivelli = (commessa, fase) => aiuto.attendi(pagina, v => {
      const menu = document.querySelector('#fase');
      return Boolean(menu && menu.dataset.livelli === v);
    }, `livelli pronti per ${commessa}|${fase}`, 10000, `${commessa}|${fase}`);
    const attendiInviate = (quante, descrizione) => aiuto.attendi(pagina,
      n => document.querySelectorAll('#lista-coda .badge-inviata').length >= n,
      descrizione, 90000, quante);
    const ultimo = () => flow.stato.ricevuti[flow.stato.ricevuti.length - 1];

    // ===================================================================
    registro.titolo('Bolle: all’apertura il cantiere NON è quello in memoria');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    registro.dice('in memoria sul telefono', await inMemoria('llitalia.bolle', 'ultimoCantiere'));
    let stato = await statoMenu('#cantiere');
    registro.dice('a video', `«${stato.testo}» (valore ${JSON.stringify(stato.valore)})`);
    registro.controlla('si parte da «— scegli il cantiere —»',
      stato.valore === '' && /scegli il cantiere/.test(stato.testo),
      'la memoria riproponeva «BRU»: il cantiere è il dato che il magazzino prende per certo');
    registro.controlla('e il segnaposto è fra le voci',
      stato.segnaposto,
      'con un cantiere in memoria il menù non l’aveva nemmeno: tornare a «nessuno» era impossibile');
    registro.controlla('il cantiere ha sempre più di una voce: nessun caso a voce unica',
      stato.voci === 7, `${stato.voci} voci — lo stesso elenco per ogni operatore e per i due moduli`);

    registro.titolo('Bolle: due bolle di fila di due cantieri diversi');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    registro.controlla('con la bolla pronta e nessun cantiere, Invia è spento',
      await pagina.$eval('#invia', e => e.disabled));
    await pagina.selectOption('#cantiere', 'MNG');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiInviate(1, 'prima bolla inviata');
    registro.controlla('la prima parte su MNG', ultimo().commessa === 'MNG', ultimo().commessa);
    stato = await statoMenu('#cantiere');
    registro.controlla('subito dopo Invia il cantiere è tornato a «— scegli il cantiere —»',
      stato.valore === '', `«${stato.testo}»`);
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.waitForTimeout(300);
    registro.controlla('la seconda bolla NON può partire col cantiere della prima: Invia è spento',
      await pagina.$eval('#invia', e => e.disabled),
      'è il caso del 23/09: MNG e subito dopo SNZ2.2');
    await pagina.selectOption('#cantiere', 'SNZ2.2');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiInviate(2, 'seconda bolla inviata');
    registro.controlla('la seconda parte su SNZ2.2', ultimo().commessa === 'SNZ2.2', ultimo().commessa);
    registro.controlla('e la memoria non si scrive più',
      (await inMemoria('llitalia.bolle', 'ultimoCantiere')) === 'BRU',
      'il valore vecchio può restare, purché nessuno lo legga e nessuno lo aggiorni');

    registro.titolo('Bolle: la fase scelta PRIMA del cantiere non si perde');
    // L'ordine sulla pagina è cantiere e poi fase, ma col cantiere che parte
    // vuoto capita di toccare prima la fase. Scegliere il cantiere la prima
    // volta completa il contesto, non lo cambia: la fase resta. Cambiare
    // cantiere DOPO, invece, la fa ripartire (0.37.9).
    await pagina.selectOption('#fase', 'Strutture');
    await pagina.selectOption('#cantiere', 'MAR');
    await attendiMenu('MAR');
    registro.controlla('scelta Strutture e poi MAR, la fase è ancora Strutture',
      (await pagina.$eval('#fase', e => e.value)) === 'Strutture',
      'perderla in silenzio farebbe partire la bolla senza fase');
    await pagina.selectOption('#cantiere', 'MNG');
    await attendiMenu('MNG');
    registro.controlla('ma passando poi da MAR a MNG la fase riparte',
      (await pagina.$eval('#fase', e => e.value)) === '');

    registro.titolo('Bolle: dopo una ricarica, ancora «— scegli il cantiere —»');
    await pagina.reload();
    await pagina.waitForSelector('#cantiere');
    registro.controlla('dopo la ricarica il cantiere è da scegliere', (await statoMenu('#cantiere')).valore === '');

    registro.titolo('Bolle, storico: «Cantiere sbagliato?» parte da «scegli»');
    await pagina.goto(app.indirizzo + '/index.html#/bolle/storico');
    await pagina.waitForSelector('.bolle-riga', { timeout: 20000 });
    await pagina.click('.bolle-riga');
    await pagina.waitForSelector('#cantiere-corretto', { timeout: 20000 });
    stato = await statoMenu('#cantiere-corretto');
    registro.dice('menù della correzione', `«${stato.testo}» · ${stato.voci} voci`);
    registro.controlla('il menù della correzione parte da «— scegli il cantiere —»',
      stato.valore === '' && stato.segnaposto,
      'prima partiva dal primo degli altri cantieri: «Rimanda» lo mandava lì senza che nessuno l’avesse scelto');
    registro.controlla('e «Rimanda» è spento finché non si sceglie',
      await pagina.$eval('#rimanda', e => e.disabled));
    const altro = await pagina.$eval('#cantiere-corretto', e => [...e.options].find(o => o.value).value);
    await pagina.selectOption('#cantiere-corretto', altro);
    registro.controlla('scelto un cantiere, «Rimanda» si accende',
      !(await pagina.$eval('#rimanda', e => e.disabled)));

    // ===================================================================
    registro.titolo('Foto: all’apertura il cantiere NON è quello in memoria');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    registro.dice('in memoria sul telefono', await inMemoria('llitalia.foto', 'ultimaCommessa'));
    stato = await statoMenu('#commessa');
    registro.controlla('si parte da «— scegli il cantiere —»',
      stato.valore === '' && /scegli il cantiere/.test(stato.testo) && stato.segnaposto, `«${stato.testo}»`);
    registro.controlla('anche qui sette voci: nessun caso a voce unica', stato.voci === 7, String(stato.voci));

    registro.titolo('Foto: al cambio di fase ripartono i livelli, anche nello stesso invio');
    await pagina.selectOption('#commessa', 'MAR');
    await attendiMenu('MAR');
    await pagina.selectOption('#fase', 'Strutture');
    await attendiLivelli('MAR', 'Strutture');
    await pagina.selectOption('#piano', 'P1');
    await pagina.selectOption('#fase', 'Murature');
    await attendiLivelli('MAR', 'Murature');
    registro.controlla('piano P1 con Strutture, poi Murature: il piano riparte',
      (await pagina.$eval('#piano', e => e.value)) === '',
      'Murature chiede il piano anche lei, e P1 c’è: un menù che se lo portasse dietro lo terrebbe');
    await pagina.selectOption('#commessa', 'MNG');
    await attendiMenu('MNG');
    await pagina.selectOption('#fase', 'FinituraAlloggi');
    await attendiLivelli('MNG', 'FinituraAlloggi');
    await pagina.selectOption('#unita', '1A');
    await pagina.selectOption('#fase', 'ImpiantoElettricoAlloggi');
    await attendiLivelli('MNG', 'ImpiantoElettricoAlloggi');
    registro.controlla('unità 1A con FinituraAlloggi, poi ImpiantoElettricoAlloggi: l’unità riparte',
      (await pagina.$eval('#unita', e => e.value)) === '',
      'le due fasi chiedono tutte e due l’unità: prima il menù non veniva nemmeno rifatto');

    registro.titolo('Foto: dopo un invio il cantiere riparte');
    await pagina.selectOption('#unita', '2B');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiInviate(1, 'foto inviata');
    const foto = flow.stato.ricevuti.filter(r => 'tipo' in r).slice(-1)[0];
    registro.controlla('la foto parte con quello che si è scelto',
      foto.commessa === 'MNG' && foto.fase === 'ImpiantoElettricoAlloggi' && foto.unita === '2B' && foto.piano === 'P2',
      `${foto.commessa} · ${foto.fase} · ${foto.unita} · ${foto.piano}`);
    stato = await statoMenu('#commessa');
    registro.controlla('subito dopo Invia il cantiere è tornato a «— scegli il cantiere —»',
      stato.valore === '', `«${stato.testo}»`);
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    // Si sceglie PRIMA la fase: senza, Invia resterebbe spento comunque
    // (0.37.9), e il controllo passerebbe anche col cantiere rimasto — cioè
    // non proverebbe niente. Con la fase scelta, l'unica cosa che può tenere
    // spento Invia è il cantiere.
    await pagina.selectOption('#fase', 'Bonifica');
    await pagina.waitForTimeout(300);
    registro.controlla('la foto dopo, con la fase scelta, non parte senza cantiere',
      await pagina.$eval('#invia', e => e.disabled),
      'il cantiere dell’invio prima non è una scelta per questo');
    registro.controlla('e la memoria non si scrive più',
      (await inMemoria('llitalia.foto', 'ultimaCommessa')) === 'BRU');
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    registro.controlla('dopo la ricarica il cantiere è da scegliere', (await statoMenu('#commessa')).valore === '');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
