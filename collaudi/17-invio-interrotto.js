// Un invio interrotto deve tornare inviabile.
//
// Il caso vero, 29/09/2026: sul telefono di Francesco l'elemento n. 56 era
// fermo su «Invio in corso» da sette giorni, attraverso chiusure dell'app e
// aggiornamenti, e al ricevente non era mai arrivato — segnalato ogni giorno
// come buco di continuità. Non aveva né «Riprova» né «Rimanda», perché quelli
// si accendono su «errore» e su «inviata», e il motore non lo riprendeva mai,
// perché il filtro degli invii guarda «in_coda» e «errore».
//
// Il principio: **«in corso» è vero solo finché vive la pagina che ha avviato
// la richiesta.** Uno stato «in corso» ereditato da una sessione precedente è
// per definizione interrotto.
//
// Due casi distinti, e servono tutti e due:
//   1. FRA SESSIONI — l'app è stata chiusa mentre inviava. Al riavvio
//      l'elemento riparte da solo.
//   2. DENTRO LA STESSA SESSIONE — la richiesta è partita e non risponde più.
//      Deve finire in errore, non restare appesa: finché resta appesa il
//      motore, che lavora un elemento per volta, non va avanti.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Invio interrotto: torna inviabile, non resta appeso',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    flow.stato.deduplica = true;
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 20, limiteMB: 20 },
    });

    const attendiRicevuti = async quanti => {
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length < quanti && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 200));
      }
    };
    // `aiuto.attendi` valuta il predicato DENTRO la pagina, quindi non può
    // vedere `stati()`, che legge da Node. Le attese su questa lettura hanno
    // il loro giro.
    const attendiStati = async (condizione, cosa, limite = 40000) => {
      const fine = Date.now() + limite;
      while (Date.now() < fine) {
        if (condizione(await stati())) return true;
        await new Promise(r => setTimeout(r, 250));
      }
      throw new Error(`Attesa scaduta (${cosa})`);
    };

    const stati = () => pagina.evaluate(() => new Promise((risolvi, rifiuta) => {
      const richiesta = indexedDB.open('llitalia-foto');
      richiesta.onsuccess = () => {
        const db = richiesta.result;
        const lettura = db.transaction('foto', 'readonly').objectStore('foto').getAll();
        lettura.onsuccess = () => risolvi(lettura.result.map(r => ({
          id: r.id, stato: r.stato, ripreso: Boolean(r.ripreso), errore: r.ultimoErrore || '',
        })));
        lettura.onerror = () => rifiuta(lettura.error);
      };
      richiesta.onerror = () => rifiuta(richiesta.error);
    }));

    registro.titolo('Caso 1 — l’app è stata chiusa mentre inviava');
    // Si ricostruisce lo stato del n. 56: un elemento in coda che viene messo
    // a mano su «invio» e poi abbandonato, come se la pagina fosse morta lì.
    // Si passa da IndexedDB e non dall'interfaccia perché quello stato, da
    // fuori, non si sa produrre: è esattamente il punto.
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('SNZ2.2|'),
      'menù pronto', 10000);
    await pagina.selectOption('#fase', 'Impermeabilizzazioni');
    await pagina.selectOption('#piano', 'P-1');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    // Il flow tace: l'elemento parte, entra in «invio» e ci resta.
    flow.stato.nonRispondere = true;
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(1);
    await attendiStati(elenco => elenco.some(r => r.stato === 'invio'), 'elemento su «invio»', 30000);
    const primaDelRiavvio = await stati();
    registro.dice('stato prima del riavvio', JSON.stringify(primaDelRiavvio));
    registro.controlla('l’elemento è rimasto su «invio»',
      primaDelRiavvio.length === 1 && primaDelRiavvio[0].stato === 'invio',
      'è lo stato in cui il n. 56 è rimasto sette giorni');

    // La sessione muore qui. Il flow torna a rispondere, come un server che
    // non era davvero rotto: il problema era la richiesta persa, non lui.
    flow.stato.nonRispondere = false;
    flow.stato.ricevuti.length = 0;
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    await attendiRicevuti(1);
    const dopoIlRiavvio = await stati();
    registro.dice('stato dopo il riavvio', JSON.stringify(dopoIlRiavvio.map(r => r.stato)));
    registro.controlla('al riavvio non è più su «invio»',
      dopoIlRiavvio.every(r => r.stato !== 'invio'),
      'uno stato «in corso» ereditato da una sessione chiusa è per definizione interrotto');
    registro.controlla('ed è ripartito da solo, senza che nessuno prema niente',
      flow.stato.ricevuti.length >= 1,
      'aspettare che qualcuno si accorga di un elemento fermo è il modo in cui si perde');
    await aiuto.attendi(pagina, () => /Inviata/.test(document.querySelector('#lista-coda').textContent),
      'arrivata', 60000);
    registro.controlla('e arriva a destinazione',
      (await stati()).some(r => r.stato === 'inviata'));
    const ripreso = flow.stato.ricevuti[0];
    registro.dice('payload ripartito', `fase: ${ripreso.fase} · piano: ${ripreso.piano} · tipo: ${ripreso.tipo}`);
    registro.controlla('col suo contenuto intatto',
      ripreso.fase === 'Impermeabilizzazioni' && ripreso.piano === 'P-1' && ripreso.tipo === 'ARCHIVIO',
      'riprendere non deve rifare il record: fase, livelli e ora dello scatto sono della foto');
    registro.controlla('e l’app dice che era stato interrotto',
      /interrotto/i.test(await pagina.$eval('#lista-coda', e => e.textContent)),
      'un elemento che riparte da solo senza dirlo sembra partito due volte');

    registro.titolo('Caso 2 — la richiesta non risponde più, dentro la stessa sessione');
    // Il tetto vero è otto minuti, e non si prova aspettando otto minuti: si
    // accorcia da localStorage, che è la stessa leva che ha il supporto su un
    // telefono che si comporta male.
    await pagina.evaluate(() => localStorage.setItem('llitalia.scadenzaInvioMs', '3000'));
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    flow.stato.nonRispondere = true;
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('SNZ2.2|'),
      'menù pronto', 10000);
    await pagina.selectOption('#fase', 'Cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif-mm.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    const partenza = Date.now();
    await pagina.click('#invia');
    await attendiStati(elenco => elenco.some(r => r.stato === 'errore'), 'passa in errore');
    const quantoCiHaMesso = Date.now() - partenza;
    const inErrore = (await stati()).find(r => r.stato === 'errore');
    registro.dice('tempo prima di arrendersi', `${(quantoCiHaMesso / 1000).toFixed(1)} s (tetto 3 s)`);
    registro.dice('messaggio', inErrore.errore);
    registro.controlla('una richiesta che non risponde finisce in ERRORE, non resta appesa',
      Boolean(inErrore),
      'finché resta appesa il motore lavora un elemento per volta e non va avanti');
    registro.controlla('e il messaggio dice che è scaduta, non che manca la rete',
      /interrott|non ha risposto|nessuna risposta dopo/i.test(inErrore.errore), inErrore.errore);
    registro.controlla('l’operatore ha di nuovo «Riprova»',
      (await pagina.$$('.foto-riprova')).length >= 1,
      'in errore il pulsante c’è: era la mancanza di uno stato d’errore a togliere ogni via d’uscita');

    // Il flow torna a rispondere e il retry chiude il giro: l'elemento non è
    // rimasto indietro.
    flow.stato.nonRispondere = false;
    const primaDelRetry = flow.stato.ricevuti.length;
    await pagina.click('.foto-riprova');
    await attendiRicevuti(primaDelRetry + 1);
    await attendiStati(elenco => elenco.every(r => r.stato === 'inviata'), 'tutte inviate', 60000);
    const finale = await stati();
    registro.dice('stati finali', finale.map(r => r.stato).join(' · '));
    registro.controlla('nessun elemento resta su «invio»',
      finale.every(r => r.stato !== 'invio'), finale.map(r => r.stato).join(' '));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
