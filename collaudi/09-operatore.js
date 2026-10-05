// Il nome dell'operatore si sceglie da un elenco chiuso. Scritto a mano, la
// stessa persona diventa «Paolo Sanzarello», «Paolo», «Sanzarello» e ogni
// refuso possibile: in raccolta sembrano cinque persone, e qualunque conteggio
// per operatore smette di valere.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Operatore: elenco chiuso, niente refusi',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);

    registro.titolo('Prima apertura: si sceglie, non si scrive');
    // Nessun autore salvato: l'app deve mandare al benvenuto.
    await pagina.goto(app.indirizzo + '/index.html');
    await pagina.evaluate(dati => {
      localStorage.clear();
      localStorage.setItem('llitalia.bolle', JSON.stringify(dati.bolle));
      // Anche il modulo Foto, perché il nome dell'operatore è della shell e si
      // prova sui DUE moduli: senza endpoint la foto resterebbe in coda e il
      // controllo misurerebbe la configurazione invece del nome.
      localStorage.setItem('llitalia.foto', JSON.stringify(dati.foto));
    }, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20, ultimaFase: 'Bonifica' },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20, ultimaFase: 'Bonifica' },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#autore', { timeout: 20000 });

    const tipo = await pagina.$eval('#autore', e => e.tagName.toLowerCase());
    registro.controlla('il campo è un menù a tendina, non testo libero', tipo === 'select', tipo);

    const elenco = await pagina.$$eval('#autore option', o => o.map(e => ({ v: e.value, t: e.textContent.trim() })));
    const nomi = elenco.filter(o => o.v).map(o => o.t);
    registro.dice('nomi selezionabili', nomi);
    // Il menu si confronta con l'elenco della SHELL, non con una copia scritta
    // qui: è l'unico modo di accorgersi se quello che si sceglie col pollice
    // smette di essere quello che `core/operatori.js` dichiara. Il numero resta
    // scritto a mano apposta: un nome che sparisce per sbaglio non si vede
    // confrontando due cose che cambiano insieme, e questo controllo diventa
    // rosso finché qualcuno non legge l'elenco e aggiorna il numero.
    const elencoShell = await pagina.evaluate(async () => {
      const m = await import('./core/operatori.js');
      return m.OPERATORI;
    });
    registro.dice('elenco in core/operatori.js', elencoShell);
    registro.controlla('ci sono i tredici nomi concordati', nomi.length === 13, `trovati ${nomi.length}`);
    registro.controlla('il menu è esattamente l\'elenco della shell, nello stesso ordine',
      nomi.join('|') === elencoShell.join('|'),
      'un nome presente in un posto e assente nell\'altro è il problema che quel file esiste per eliminare');
    registro.controlla('nell\'ordine dato, non alfabetico',
      nomi[0] === 'Paolo Sanzarello' && nomi.join('|') !== [...nomi].sort().join('|'),
      'chi usa l\'app tutti i giorni sta in cima e trova il proprio nome senza leggere l\'elenco');
    registro.controlla('e ci sono i quattro aggiunti il 05/10/2026',
      ['Alessio Ferrara', 'Giovanni Lippolis', 'Domenico Caminiti', 'Maurizio Lando']
        .every(nome => nomi.includes(nome)),
      nomi.slice(9).join(' · '));

    const primo = elenco[0];
    registro.controlla('parte da un segnaposto, non da un nome',
      primo.v === '' && /scegli/i.test(primo.t), primo.t);
    registro.controlla('il segnaposto non è selezionabile come nome',
      await pagina.$eval('#autore option:first-child', e => e.disabled),
      'altrimenti basta non guardare per firmare a nome di Paolo');

    // Senza scelta non si va avanti.
    await pagina.click('#modulo-benvenuto button[type="submit"]');
    registro.controlla('senza scegliere non si prosegue',
      (await pagina.evaluate(() => localStorage.getItem('llitalia.app'))) === null,
      'nessun autore salvato');

    registro.titolo('Scelto un nome, l\'invio lo porta con sé');
    await pagina.selectOption('#autore', 'Rosario Incarbone');
    await pagina.click('#modulo-benvenuto button[type="submit"]');
    // Dopo il benvenuto si atterra in home, non su un modulo: le tessere sono
    // due, e l'app non sceglie per l'operatore.
    await pagina.waitForSelector('.tessera, .tessera-titolo', { timeout: 20000 });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere', { timeout: 20000 });
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await pagina.click('#invia');
    await aiuto.attendi(pagina,
      () => document.querySelector('#bolle-contatori .bolle-chip:nth-child(2) .valore').textContent === '1',
      'bolla inviata', 60000);
    registro.dice('operatore arrivato al flow (bolle)', flow.stato.ricevuti[0].operatore);
    registro.controlla('è esattamente il nome dell\'elenco',
      flow.stato.ricevuti[0].operatore === 'Rosario Incarbone');

    // **Lo stesso elenco serve i due moduli.** Il nome è un'impostazione della
    // shell, non del modulo, e qui si dimostra fino in fondo: un nome aggiunto
    // il 05/10/2026 si sceglie una volta e arriva uguale nel payload delle
    // bolle e in quello delle foto. Senza questo controllo, «c'è anche nelle
    // foto» resterebbe una deduzione dalla struttura del codice.
    const nuovo = 'Maurizio Lando';
    await pagina.goto(app.indirizzo + '/index.html#/impostazioni');
    await pagina.waitForSelector('#autore', { timeout: 20000 });
    const nelleImpostazioni = await pagina.$$eval('#autore option',
      o => o.map(e => e.textContent.trim()));
    registro.controlla('il nome nuovo si può scegliere dalle impostazioni',
      nelleImpostazioni.includes(nuovo), nelleImpostazioni.join(' · '));
    await pagina.selectOption('#autore', nuovo);
    await pagina.click('#modulo-impostazioni button[type="submit"]');
    const primaFoto = flow.stato.ricevuti.length;
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa', { timeout: 20000 });
    await pagina.selectOption('#commessa', 'MAR');
    await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('MAR|'),
      'menù della fase pronto', 10000);
    await pagina.selectOption('#fase', 'Cantiere');
    await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1,
      'anteprima', 60000);
    await pagina.click('#invia');
    const fine = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaFoto && Date.now() < fine) {
      await new Promise(r => setTimeout(r, 300));
    }
    const foto = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('operatore arrivato al flow (foto cantiere)', foto.operatore);
    registro.controlla('un nome aggiunto arriva anche dal modulo Foto',
      foto.operatore === nuovo && 'tipo' in foto,
      `${foto.operatore} · tipo ${foto.tipo}`);

    registro.titolo('Telefono aggiornato da una versione col campo libero');
    const casi = [
      ['Paolo Sanzarello', 'Paolo Sanzarello', 'grafia esatta: si tiene'],
      ['paolo  sanzarello', 'Paolo Sanzarello', 'maiuscole e spazi doppi: si riporta alla grafia ufficiale'],
      ['P. Sanzarello', '', 'abbreviato: NON si indovina, si richiede la scelta'],
      ['Mario Rossi', '', 'nome non in elenco: si richiede la scelta'],
      ['', '', 'vuoto: si richiede la scelta'],
    ];
    for (const [salvato, atteso, perche] of casi) {
      const letto = await pagina.evaluate(async nome => {
        localStorage.setItem('llitalia.app', JSON.stringify({ autore: nome }));
        const m = await import('./core/impostazioni.js');
        return m.impostazioniApp.autore;
      }, salvato);
      registro.controlla(`«${salvato}» → ${atteso ? `«${atteso}»` : 'nessun operatore'}`,
        letto === atteso, perche);
    }

    registro.titolo('Un nome non riconosciuto riporta al benvenuto');
    await pagina.evaluate(() => localStorage.setItem('llitalia.app', JSON.stringify({ autore: 'P. Sanzarello' })));
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    // Ricarica vera: se la pagina è GIÀ su `#/foto` un `goto` allo stesso
    // indirizzo non ridisegna, la guardia sul nome non gira, e il collaudo
    // leggerebbe la pagina di prima credendo di leggere quella di adesso.
    await pagina.reload();
    await pagina.waitForSelector('#autore, #commessa', { timeout: 20000 });
    const dove = await pagina.evaluate(() => location.hash);
    registro.controlla('l\'app chiede di scegliere invece di mandare un nome sbagliato',
      dove.includes('benvenuto'), dove);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
