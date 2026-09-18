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
      await aiuto.attendi(pagina, cod =>
        document.querySelector('#fase').dataset.livelli.startsWith(`${cod}|`),
        `menù rifatto per ${codice}`, 10000, codice);
    };

    // Scegliere la FASE e aspettare che i menù dei livelli si siano rifatti:
    // il marcatore `data-livelli` dice per quale coppia commessa/fase sono
    // costruiti, e finché non combacia si stanno leggendo quelli di prima.
    const scegliFase = async codice => {
      await pagina.selectOption('#fase', codice);
      await aiuto.attendi(pagina, cod =>
        document.querySelector('#fase').dataset.livelli.endsWith(`|${cod}`),
        `livelli rifatti per ${codice}`, 10000, codice);
    };

    registro.titolo('Foto: una da archiviare, inviata');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');
    await pagina.selectOption('#categoria', 'ARCHIVIO');
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

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
