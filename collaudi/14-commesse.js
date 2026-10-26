// Le commesse selezionabili: sette dal 16/09/2026, erano tre; otto con la
// 0.39.0, che porta TN1 nei menù.
//
// Due cose da provare, e nessuna delle due si vede «a occhio».
//
// 1. L'ORDINE del menù. Deve essere alfabetico di codice, e non deve
//    dipendere dall'ordine in cui le commesse sono scritte in
//    `core/cantieri.js`: chi ne aggiunge una domani la scrive dove capita, e
//    il menù deve restare in ordine da sé. Qui si legge il file servito
//    dall'app e si confronta l'ordine sorgente con quello a video: se
//    coincidessero, il collaudo non saprebbe distinguere un `sort()` che
//    funziona da un elenco ordinato a mano — e sarebbe una prova che non
//    prova niente.
//
// 2. Che nel payload viaggi il CODICE e non l'etichetta. È la stessa prova
//    che sulle fasi ha distinto il funzionamento dal guasto: a video
//    l'operatore legge «BRU - urbanizzazioni via Bardonecchia», in colonna
//    deve arrivare `BRU`, senza spazi e senza il resto, perché il lato
//    ricevente ne deriva la cartella.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const ATTESE = [
  ['BRU', 'BRU - urbanizzazioni via Bardonecchia'],
  ['MAR', 'MAR - Caselle Torinese'],
  ['MNG', 'MNG - via Monginevro 181'],
  ['MRS', 'MRS - via Marsigli 11-13-15'],
  ['SNU', 'SNU - urbanizzazioni Settimo Torinese'],
  ['SNZ2.1', 'SNZ2.1 - via Eva Mameli Calvino 7'],
  ['SNZ2.2', 'SNZ2.2 - Settimo Torinese'],
  ['TN1', 'TN1 - San Maurizio Canavese'],
];

module.exports = {
  nome: 'Commesse: otto, in ordine alfabetico, e nel payload il codice',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });

    const leggiMenu = async selettore => pagina.$$eval(`${selettore} option`,
      o => o.filter(e => e.value).map(e => ({ codice: e.value, etichetta: e.textContent.trim() })));

    registro.titolo('Bolle: le otto commesse, con codice ed etichetta');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    const inBolle = await leggiMenu('#cantiere');
    registro.dice('commesse a video', inBolle.map(c => c.codice).join(' · '));
    registro.controlla('sono otto', inBolle.length === 8, String(inBolle.length));
    registro.controlla('sono quelle concordate, codice ed etichetta',
      inBolle.every((c, i) => c.codice === ATTESE[i][0] && c.etichetta === ATTESE[i][1]),
      inBolle.map((c, i) => c.codice === ATTESE[i][0] && c.etichetta === ATTESE[i][1] ? '' : `${c.codice} = «${c.etichetta}»`).filter(Boolean).join(' · ') || 'tutte');
    registro.controlla('le sette di prima non sono cambiate',
      ATTESE.filter(a => a[0] !== 'TN1').every(([codice]) => {
        const voce = inBolle.find(c => c.codice === codice);
        return voce && voce.etichetta === ATTESE.find(a => a[0] === codice)[1];
      }));
    registro.controlla('ogni etichetta comincia col proprio codice',
      inBolle.every(c => c.etichetta.startsWith(`${c.codice} - `)),
      'a video serve il codice più il posto: l’operatore riconosce il cantiere dall’indirizzo');

    registro.titolo('L’ordine è alfabetico, e non è quello del file');
    const aVideo = inBolle.map(c => c.codice);
    const ordinato = [...aVideo].sort((a, b) => a.localeCompare(b, 'it'));
    registro.controlla('il menù è in ordine alfabetico di codice',
      aVideo.join(',') === ordinato.join(','), aVideo.join(' '));
    // L'ordine sorgente si legge dal file così come l'app lo serve.
    const nelFile = await pagina.evaluate(async () => {
      const testo = await (await fetch('./core/cantieri.js')).text();
      return [...testo.matchAll(/codice: '([^']+)'/g)].map(m => m[1]);
    });
    registro.dice('ordine nel file', nelFile.join(' '));
    registro.controlla('l’elenco nel file contiene le stesse otto',
      [...nelFile].sort().join(',') === [...aVideo].sort().join(','));
    registro.controlla('e NON è già in ordine: a ordinarlo è il codice, non la mano',
      nelFile.join(',') !== ordinato.join(','),
      'se il file fosse già ordinato questa prova non distinguerebbe un sort() che funziona da uno che non c’è');

    registro.titolo('Foto cantiere: lo stesso elenco, una sola verità');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    const inFoto = await leggiMenu('#commessa');
    registro.controlla('identico a quello delle bolle',
      JSON.stringify(inFoto) === JSON.stringify(inBolle),
      'due elenchi separati sarebbero due verità destinate a divergere');

    registro.titolo('Nel payload arriva il codice, non l’etichetta');
    // La prova sul caso che può fallire: una commessa NUOVA, e col punto nel
    // codice, che è la forma più facile da rompere lungo la strada.
    await pagina.selectOption('#commessa', 'BRU');
    // BRU è un'urbanizzazione: dalla 0.36.0 al posto delle fasi mostra i
    // LOTTI, e il lotto viaggia nello stesso campo `fase`.
    await pagina.selectOption('#fase', 'Lotto2');
    await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const fine = Date.now() + 60000;
    while (flow.stato.ricevuti.length < 1 && Date.now() < fine) await new Promise(r => setTimeout(r, 300));
    const foto = flow.stato.ricevuti[0];
    registro.dice('payload della foto', `commessa: ${JSON.stringify(foto.commessa)} · fase: ${JSON.stringify(foto.fase)}`);
    registro.controlla('la commessa è il codice esatto', foto.commessa === 'BRU',
      'in colonna deve arrivare BRU, non «BRU - urbanizzazioni via Bardonecchia»');
    registro.controlla('senza spazi e senza l’etichetta',
      !/\s/.test(foto.commessa) && !foto.commessa.includes('-'));
    registro.controlla('e il lotto viaggia nel campo fase, col suo codice', foto.fase === 'Lotto2',
      'per un\u2019urbanizzazione il lotto prende il posto della fase: a valle è sempre la cartella sotto la commessa');

    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.selectOption('#cantiere', 'SNZ2.1');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const fine2 = Date.now() + 60000;
    while (flow.stato.ricevuti.length < 2 && Date.now() < fine2) await new Promise(r => setTimeout(r, 300));
    const bolla = flow.stato.ricevuti[1];
    registro.dice('payload della bolla', `commessa: ${JSON.stringify(bolla.commessa)}`);
    registro.controlla('il codice col punto arriva intero', bolla.commessa === 'SNZ2.1',
      'il punto è il carattere che si perde più facilmente in una normalizzazione');
    registro.controlla('nessun campo nuovo nel contratto',
      !('cartella' in bolla) && !('etichettaCommessa' in bolla),
      'il lato ricevente deriva la cartella dal codice con una regola: non serve mandargliela');

    registro.titolo('A video resta l’etichetta, anche in coda');
    const inCoda = await pagina.$$eval('#lista-coda .bolle-voce .riga',
      e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    registro.dice('riga della coda', inCoda[0]);
    registro.controlla('la coda mostra l’etichetta estesa',
      /SNZ2\.1 - via Eva Mameli Calvino 7/.test(inCoda[0]), inCoda[0]);

    // TN1, la commessa nuova: nel payload deve arrivare il codice, in foto e in
    // bolle. I payload si cercano per CONTENUTO e non per posizione (trappola 6
    // di aiuto.js). `Cantiere` è una fase che non pretende livelli: qui si
    // prova la commessa, i livelli di TN1 hanno il loro collaudo.
    registro.titolo('TN1: nel payload il codice, in foto e in bolle');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await pagina.selectOption('#commessa', 'TN1');
    await aiuto.attendiMarcatore(pagina, m => m.startsWith('TN1|'),
      'menù della fase rifatto per TN1');
    await pagina.selectOption('#fase', 'Cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const fine3 = Date.now() + 60000;
    while (!flow.stato.ricevuti.some(r => r.commessa === 'TN1' && 'tipo' in r) && Date.now() < fine3) {
      await new Promise(r => setTimeout(r, 300));
    }
    const fotoTN1 = flow.stato.ricevuti.find(r => r.commessa === 'TN1' && 'tipo' in r) || {};
    registro.dice('payload della foto', `commessa: ${JSON.stringify(fotoTN1.commessa)} · fase: ${JSON.stringify(fotoTN1.fase)}`);
    registro.controlla('la foto di TN1 porta il codice TN1', fotoTN1.commessa === 'TN1',
      'in colonna deve arrivare TN1, non «TN1 - San Maurizio Canavese»');

    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.selectOption('#cantiere', 'TN1');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const fine4 = Date.now() + 60000;
    while (!flow.stato.ricevuti.some(r => r.commessa === 'TN1' && !('tipo' in r)) && Date.now() < fine4) {
      await new Promise(r => setTimeout(r, 300));
    }
    const bollaTN1 = flow.stato.ricevuti.find(r => r.commessa === 'TN1' && !('tipo' in r)) || {};
    registro.dice('payload della bolla', `commessa: ${JSON.stringify(bollaTN1.commessa)}`);
    registro.controlla('la bolla di TN1 porta il codice TN1', bollaTN1.commessa === 'TN1');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
