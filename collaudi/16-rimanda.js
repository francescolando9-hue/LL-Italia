// «Rimanda» su ogni elemento inviato, foto e bolle.
//
// Prima esisteva solo per le bolle, solo dallo storico, e solo per correggere
// il cantiere. Dal 18/09/2026 c'è sempre, per qualunque motivo — foto venuta
// male, dato sbagliato, o il dubbio che non sia arrivata — e distingue due
// casi che in raccolta sono due cose diverse:
//
//  - SENZA modifiche: STESSO idClient. Il flow riconosce il duplicato,
//    risponde `gia_presente` e non crea un secondo file. L'app lo dice.
//  - CON modifiche: idClient NUOVO e progressivo NUOVO, perché in raccolta
//    deve comparire una riga diversa.
//
// La prova sta nel contare i file DISTINTI, non le richieste: un rimando senza
// modifiche fa una richiesta in più e zero file in più, e sono proprio i due
// numeri che devono restare separati. Il flow finto qui fa la guardia sui
// duplicati come quello vero (`flow.stato.deduplica`), altrimenti si
// misurerebbe un comportamento che in produzione non c'è.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const distinti = ricevuti => new Set(ricevuti.map(r => r.idClient)).size;

module.exports = {
  nome: 'Rimanda: stesso idClient senza modifiche, nuovo con le correzioni',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    flow.stato.deduplica = true;
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 20, limiteMB: 20 },
    });

    const attendiRicevuti = async quanti => {
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length < quanti && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 200));
      }
      if (flow.stato.ricevuti.length < quanti) throw new Error(`arrivati ${flow.stato.ricevuti.length} invii su ${quanti}`);
    };
    const ultimo = () => flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    const scegliCommessa = async (selettore, codice) => {
      await pagina.selectOption(selettore, codice);
      await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${codice}|`),
        `menù rifatto per ${codice}`);
    };

    // Scegliere la FASE e aspettare che i menù dei livelli si siano rifatti:
    // il marcatore `data-livelli` dice per quale coppia commessa/fase sono
    // costruiti, e finché non combacia si stanno leggendo quelli di prima.
    const scegliFase = async codice => {
      await pagina.selectOption('#fase', codice);
      await aiuto.attendiMarcatore(pagina, m => m.endsWith(`|${codice}`),
        `livelli rifatti per ${codice}`);
    };

    registro.titolo('Foto: una da archiviare, inviata');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await scegliCommessa('#commessa', 'MNG');
    await scegliFase('FinituraAlloggi');
    await pagina.selectOption('#unita', '1A');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(1);
    const prima = ultimo();
    registro.dice('primo invio', `idClient ${prima.idClient} · n. ${prima.progressivo} · unita ${prima.unita} · piano ${prima.piano}`);
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
    registro.controlla('sotto l’inviata compare Rimanda',
      (await pagina.$$('.foto-rimanda')).length === 1,
      'prima c’era solo per le bolle, solo dallo storico e solo per il cantiere');

    registro.titolo('Rimanda SENZA modifiche: stesso idClient, nessun doppione');
    const inviateAllInizio = await pagina.$eval('#foto-contatori',
      e => Number(e.querySelectorAll('.foto-chip')[1].querySelector('.valore').textContent));
    await pagina.click('.foto-rimanda');
    await pagina.waitForSelector('#r-manda');
    registro.controlla('il pulsante dice che rimanda LA STESSA',
      (await pagina.$eval('#r-manda', e => e.textContent.trim())) === 'Rimanda la stessa');
    const spiegazione = await pagina.$eval('#r-spiegazione', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('spiegazione a video', spiegazione);
    registro.controlla('e spiega che l’identificativo è lo stesso', /stesso identificativo/i.test(spiegazione));
    registro.controlla('il riquadro ripropone i livelli dell’invio',
      (await pagina.$eval('#r-fase', e => e.value)) === 'FinituraAlloggi'
      && (await pagina.$eval('#r-unita', e => e.value)) === '1A',
      'si corregge partendo da quello che era, non da un foglio bianco');
    await pagina.click('#r-manda');
    await attendiRicevuti(2);
    const rimandata = ultimo();
    registro.dice('secondo invio', `idClient ${rimandata.idClient} · n. ${rimandata.progressivo}`);
    registro.controlla('l’idClient è lo stesso', rimandata.idClient === prima.idClient,
      'è quello che permette al flow di riconoscere il duplicato');
    registro.controlla('e anche il progressivo', rimandata.progressivo === prima.progressivo,
      'un numero nuovo lascerebbe un buco nella sequenza, che si legge come una foto persa');
    registro.controlla('richieste 2, ma file distinti 1',
      flow.stato.ricevuti.length === 2 && distinti(flow.stato.ricevuti) === 1,
      `${flow.stato.ricevuti.length} richieste, ${distinti(flow.stato.ricevuti)} distinti`);
    registro.controlla('il flow ha risposto gia_presente', flow.stato.giaPresenti === 1,
      String(flow.stato.giaPresenti));
    await aiuto.attendi(pagina, () => /gi[àa] in raccolta/i.test(document.querySelector('#lista-coda').textContent),
      'nota «era già in raccolta»', 20000);
    registro.controlla('e l’app lo dice all’operatore',
      /gi[àa] in raccolta/i.test(await pagina.$eval('#lista-coda', e => e.textContent)),
      'chi ha premuto Rimanda senza correggere niente ha premuto proprio per sapere questo');
    const inviateDopo = await pagina.$eval('#foto-contatori',
      e => Number(e.querySelectorAll('.foto-chip')[1].querySelector('.valore').textContent));
    registro.dice('«inviate oggi» prima e dopo', `${inviateAllInizio} → ${inviateDopo}`);
    registro.controlla('il contatore delle inviate non si gonfia', inviateDopo === inviateAllInizio,
      'quel numero serve a essere confrontato coi file atterrati: un rimando non ne aggiunge nessuno');

    registro.titolo('Rimanda CON modifiche, sullo stesso cantiere: idClient nuovo');
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
    await pagina.click('.foto-rimanda');
    await pagina.waitForSelector('#r-manda');
    // Si cambia SOLO l'unità: stesso cantiere, stessa fase. È il caso che
    // prima non esisteva — «Rimanda» c'era solo per correggere il cantiere.
    await pagina.selectOption('#r-unita', '2B');
    await aiuto.attendi(pagina, () => document.querySelector('#r-manda').textContent.trim() === 'Rimanda corretta',
      'il pulsante cambia da sé', 10000);
    registro.controlla('il pulsante cambia in «Rimanda corretta»',
      (await pagina.$eval('#r-manda', e => e.textContent.trim())) === 'Rimanda corretta',
      'le due strade sono scritte sul pulsante: sono due cose diverse in raccolta');
    const avvertenza = await pagina.$eval('#r-spiegazione', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('spiegazione a video', avvertenza);
    registro.controlla('e avverte che quella di prima resta da annullare',
      /annullata/i.test(avvertenza));
    await pagina.click('#r-manda');
    await attendiRicevuti(3);
    const corretta = ultimo();
    registro.dice('terzo invio', `idClient ${corretta.idClient} · n. ${corretta.progressivo} · unita ${corretta.unita} · piano ${corretta.piano}`);
    registro.controlla('l’idClient è nuovo', corretta.idClient !== prima.idClient,
      'in raccolta deve comparire una riga diversa, non sovrascrivere quella di prima');
    registro.controlla('il progressivo è nuovo', corretta.progressivo === prima.progressivo + 1);
    registro.controlla('porta l’unità corretta', corretta.unita === '2B');
    registro.controlla('e il piano ricavato dalla nuova unità', corretta.piano === 'P2',
      'correggere l’unità senza ricalcolare il piano archivierebbe al piano sbagliato');
    registro.controlla('la commessa non è cambiata', corretta.commessa === 'MNG',
      'si rimanda anche sullo stesso cantiere: è il punto della modifica');
    registro.controlla('l’ora dello scatto resta quella della FOTO',
      corretta.dataScatto === prima.dataScatto && corretta.scattoStimato === prima.scattoStimato,
      'rimandare una foto non la riscatta');
    registro.controlla('file distinti ora 2', distinti(flow.stato.ricevuti) === 2,
      String(distinti(flow.stato.ricevuti)));

    registro.titolo('Bolle: lo stesso, e la bolla di più pagine non si spezza');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await scegliCommessa('#cantiere', 'MAR');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(4);
    const bolla = ultimo();
    registro.dice('bolla inviata', `idClient ${bolla.idClient} · n. ${bolla.progressivo} · idBolla ${bolla.idBolla}`);
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.bolle-rimanda')), 'pulsante Rimanda', 20000);
    registro.controlla('anche le bolle inviate hanno Rimanda',
      (await pagina.$$('.bolle-rimanda')).length === 1);

    await pagina.click('.bolle-rimanda');
    await pagina.waitForSelector('#r-manda');
    registro.controlla('senza modifiche dice «Rimanda la stessa»',
      (await pagina.$eval('#r-manda', e => e.textContent.trim())) === 'Rimanda la stessa');
    await pagina.click('#r-manda');
    await attendiRicevuti(5);
    registro.controlla('stesso idClient, e il flow risponde gia_presente',
      ultimo().idClient === bolla.idClient && flow.stato.giaPresenti === 2,
      `${ultimo().idClient === bolla.idClient ? 'stesso id' : 'id diverso'}, ${flow.stato.giaPresenti} gia_presente`);

    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.bolle-rimanda')), 'pulsante Rimanda', 20000);
    await pagina.click('.bolle-rimanda');
    await pagina.waitForSelector('#r-cantiere');
    await pagina.selectOption('#r-cantiere', 'SNZ2.2');
    await aiuto.attendi(pagina, () => document.querySelector('#r-manda').textContent.trim() === 'Rimanda corretta',
      'il pulsante cambia da sé', 10000);
    await pagina.click('#r-manda');
    await attendiRicevuti(6);
    const bollaCorretta = ultimo();
    registro.dice('bolla rimandata', `idClient ${bollaCorretta.idClient} · cantiere ${bollaCorretta.commessa} · idBolla ${bollaCorretta.idBolla} · pag. ${bollaCorretta.pagina}/${bollaCorretta.pagine}`);
    registro.controlla('idClient nuovo e cantiere corretto',
      bollaCorretta.idClient !== bolla.idClient && bollaCorretta.commessa === 'SNZ2.2');
    registro.controlla('l’idBolla resta quello dell’originale',
      bollaCorretta.idBolla === bolla.idBolla,
      'una pagina corretta resta la stessa pagina della stessa bolla: altrimenti la correzione spezza in due una bolla di più pagine');
    registro.controlla('e resta la stessa pagina',
      bollaCorretta.pagina === bolla.pagina && bollaCorretta.pagine === bolla.pagine);

    registro.titolo('I conti alla fine');
    registro.dice('richieste al flow', String(flow.stato.ricevuti.length));
    registro.dice('file distinti', String(distinti(flow.stato.ricevuti)));
    registro.dice('risposte gia_presente', String(flow.stato.giaPresenti));
    registro.controlla('6 richieste, 4 file distinti, 2 gia_presente',
      flow.stato.ricevuti.length === 6 && distinti(flow.stato.ricevuti) === 4 && flow.stato.giaPresenti === 2,
      'due rimandi senza modifiche non hanno aggiunto niente in raccolta, e due con modifiche sì');

    // ===================================================================
    // Elementi di prima dell'aggiornamento 0.40.0, con una fase che nell'elenco
    // non c'è più (specifica del 26/10/2026, casi 12, 13 e 14). `Interrato` e
    // `ImpiantiDiReteCondominiali` sono usciti dall'elenco, e niente è
    // retroattivo: quello che era già nel telefono parte com'è, col suo
    // codice. Il collaudo non può farli nascere dall'app, che quelle fasi non
    // le offre più: scrive i record direttamente nel database del telefono,
    // nella forma che l'app di prima lasciava, e poi ricarica la pagina — è
    // quello che succede a un telefono quando l'app si aggiorna.
    registro.titolo('Elementi di prima dell’aggiornamento: le fasi tolte partono col loro codice');
    const base64 = require('fs').readFileSync(materiale('scatto-exif.jpg')).toString('base64');
    const azzeraDb = async nome => {
      // Il database si cancella dalla pagina; con l'app che lo tiene aperto la
      // cancellazione resta in attesa, e il ricarico che segue chiude le
      // connessioni (come in `23-palazzina-parti-comuni.js`).
      await pagina.evaluate(n => new Promise(risolvi => {
        const richiesta = indexedDB.deleteDatabase(n);
        richiesta.onsuccess = richiesta.onerror = richiesta.onblocked = () => risolvi();
      }), nome);
      await pagina.reload();
    };
    const iniettaRecord = (db, versione, record) => pagina.evaluate(async ({ b64, db, versione, record }) => {
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
      const aperto = await new Promise((ok, ko) => {
        const r = indexedDB.open(db, versione);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      // Se il database non esiste ancora, `open` lo crea vuoto e l'app non lo
      // riempirebbe più: meglio fermarsi che lasciare un telefono rotto.
      if (!aperto.objectStoreNames.contains('foto')) throw new Error(`database ${db} senza archivio foto`);
      const completo = { id: crypto.randomUUID(), foto: blob, byte: blob.size, ...record };
      if ('anteprima' in record) completo.anteprima = blob;
      await new Promise((ok, ko) => {
        const tx = aperto.transaction('foto', 'readwrite');
        tx.objectStore('foto').put(completo);
        tx.oncomplete = ok;
        tx.onerror = () => ko(tx.error);
      });
      aperto.close();
      return completo.id;
    }, { b64: base64, db, versione, record });
    const ora = Date.now();

    // --- Caso 12: Foto in coda con `Interrato` e piano `P-1`.
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await azzeraDb('llitalia-foto');
    await pagina.waitForSelector('#commessa');
    await pagina.waitForTimeout(500);
    const prima12 = flow.stato.ricevuti.length;
    await iniettaRecord('llitalia-foto', 2, {
      stato: 'in_coda', tipo: 'ARCHIVIO', genere: 'foto', estensione: 'jpg', mime: 'image/jpeg', durata: 0,
      commessa: 'MNG', fase: 'Interrato', piano: 'P-1', unita: null, prospetto: null, scala: null,
      autore: 'Paolo Sanzarello', nota: '', anteprima: true, nome: 'prima.jpg',
      dataScatto: '2026-10-20T10:00:00+02:00', scattoStimato: 'NO',
      timestampDispositivo: '2026-10-20T10:00:00+02:00', creatoIl: ora - 1000, tentativi: 0, ultimoErrore: '',
      inviatoIl: null, progressivo: 1, urlCaricamento: '', byteInviati: 0, byteCaricati: false,
    });
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    await attendiRicevuti(prima12 + 1);
    const vecchiaFoto = ultimo();
    registro.dice('foto in coda con Interrato: payload', `fase ${JSON.stringify(vecchiaFoto.fase)} · piano ${JSON.stringify(vecchiaFoto.piano)} · commessa ${JSON.stringify(vecchiaFoto.commessa)}`);
    registro.controlla('caso 12 · parte senza blocco, col suo codice: fase «Interrato», piano «P-1»',
      vecchiaFoto.fase === 'Interrato' && vecchiaFoto.piano === 'P-1' && vecchiaFoto.commessa === 'MNG',
      'l’elenco non blocca né riscrive quello che era già in coda');
    await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda .badge-inviata').length === 1,
      'la foto risulta inviata', 30000);
    registro.controlla('e risulta inviata, non in errore',
      (await pagina.$$('#lista-coda .badge-errore')).length === 0
        && (await pagina.$$('#lista-coda .badge-inviata')).length === 1);
    const rigaFoto = await pagina.$eval('#lista-coda', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('riga in coda', rigaFoto);
    registro.controlla('a video si legge il codice, «Interrato», invece di far sparire il dato',
      /Interrato/.test(rigaFoto), 'etichettaFase restituisce il codice per un codice che non c’è più');

    // --- Caso 14: «Rimanda» su una foto inviata con `Interrato`. Le foto
    // delle fasi tolte non si rimandano com'erano: il menù parte da «— scegli
    // la fase —» e senza una fase nuova il pulsante resta spento. Fino alla
    // 0.39.0 restava spento senza dire perché, perché la fase non era fra le
    // cose mancanti che l'app nomina; per decisione di Francesco del
    // 26/10/2026 ora lo dice («Scegli la fase per rimandarla.»).
    registro.titolo('«Rimanda» su una foto inviata con una fase che non c’è più');
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'Rimanda', 20000);
    await pagina.click('.foto-rimanda');
    await pagina.waitForSelector('#r-manda');
    const statoRimanda = () => pagina.evaluate(() => {
      const menu = document.querySelector('#r-fase');
      return {
        valore: menu.value,
        testo: menu.options[menu.selectedIndex].textContent.trim(),
        pulsante: document.querySelector('#r-manda').textContent.trim(),
        spento: document.querySelector('#r-manda').disabled,
        spiegazione: document.querySelector('#r-spiegazione').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    const aperto = await statoRimanda();
    registro.dice('Rimanda appena aperto', JSON.stringify(aperto));
    registro.controlla('caso 14 · il menù della fase parte da «— scegli la fase —»: la fase tolta non è fra le voci',
      aperto.valore === '' && /scegli la fase/.test(aperto.testo), `«${aperto.testo}»`);
    registro.controlla('e il pulsante è spento con «Scegli la fase per rimandarla.»',
      aperto.spento === true && /Scegli la fase per rimandarla\./.test(aperto.spiegazione),
      `${aperto.pulsante} · ${aperto.spiegazione}`);
    const prima14 = flow.stato.ricevuti.length;
    await pagina.selectOption('#r-fase', 'Cantiere');
    await aiuto.attendi(pagina, () => document.querySelector('#r-manda').textContent.trim() === 'Rimanda corretta',
      'il pulsante cambia da sé', 10000);
    registro.controlla('scelta una fase, il pulsante dice «Rimanda corretta» e si accende',
      (await statoRimanda()).spento === false);
    await pagina.click('#r-manda');
    await attendiRicevuti(prima14 + 1);
    const corretta14 = ultimo();
    registro.dice('foto rimandata', `idClient ${corretta14.idClient} · fase ${JSON.stringify(corretta14.fase)} · piano ${JSON.stringify(corretta14.piano)}`);
    registro.controlla('parte con la fase nuova e un idClient nuovo',
      corretta14.fase === 'Cantiere' && corretta14.idClient !== vecchiaFoto.idClient,
      'in raccolta deve comparire una riga diversa, non sovrascrivere quella di prima');

    // --- Caso 13: Bolla in coda con `ImpiantiDiReteCondominiali`.
    registro.titolo('Bolle: un elemento in coda con la fase sciolta parte com’è');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.waitForTimeout(500);
    const prima13 = flow.stato.ricevuti.length;
    await iniettaRecord('llitalia-bolle', 4, {
      stato: 'in_coda', cantiere: 'MNG', autore: 'Paolo Sanzarello', miniatura: null, impronta: '',
      qualita: 'ok', motivoQualita: '', nome: 'bolla-prima.jpg', fase: 'ImpiantiDiReteCondominiali',
      timestampDispositivo: '2026-10-20T10:00:00+02:00', creatoIl: ora - 500, tentativi: 0, ultimoErrore: '',
      inviatoIl: null, idServer: null, progressivo: 100, idBolla: '00000000-0000-4000-8000-000000000013',
      pagina: 1, pagine: 1,
    });
    await pagina.reload();
    await pagina.waitForSelector('#cantiere');
    await attendiRicevuti(prima13 + 1);
    const vecchiaBolla = ultimo();
    registro.dice('bolla in coda con ImpiantiDiReteCondominiali: payload', `fase ${JSON.stringify(vecchiaBolla.fase)} · commessa ${JSON.stringify(vecchiaBolla.commessa)}`);
    registro.controlla('caso 13 · parte com’è, col suo codice',
      vecchiaBolla.fase === 'ImpiantiDiReteCondominiali' && vecchiaBolla.commessa === 'MNG'
        && vecchiaBolla.idBolla === '00000000-0000-4000-8000-000000000013',
      'la fase sciolta non blocca la bolla: meglio una bolla col codice vecchio che una bolla ferma');
    await aiuto.attendi(pagina, () => /ImpiantiDiReteCondominiali/.test(document.querySelector('#lista-coda').textContent),
      'la riga mostra il codice', 20000);
    registro.controlla('e a video si legge il codice',
      /ImpiantiDiReteCondominiali/.test(await pagina.$eval('#lista-coda', e => e.textContent)));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
