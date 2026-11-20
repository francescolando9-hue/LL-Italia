// Il modulo Segnalazioni (dalla 0.43.0): apertura, passaggio, chiusura,
// riapertura, «Tocca a te» in cima all'app, e il contratto con le due
// funzioni (Azure Functions, decisione di Francesco del 20/11/2026).
//
// Il flow finto qui risponde con le REGOLE VERE delle funzioni
// (funzioni/src/regole.js) su un archivio in memoria: guardia sui doppioni,
// chi apre, chi riapre, «già chiusa», «troppe foto», «segnalazione
// sconosciuta». Senza un server che ricorda, un collaudo di questo modulo
// proverebbe solo che le richieste partono, e il modulo è il primo che LEGGE:
// quello che legge deve essere quello che si è scritto. E con le regole vere,
// app e server si provano insieme.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { nuovoTelefono, materiale } = require('./aiuto');

// Almeno 16 caratteri: le regole rifiutano un codice più corto.
const TOKEN = 'LLI-SEGN-collaudo-0430';

const CAMPI_ATTESI = [
  'token', 'azione', 'idClient', 'idSegnalazione', 'operatore', 'passaA', 'testo',
  'commessa', 'ambito', 'piano', 'unita', 'parteComune', 'dataIntervento',
  'idDispositivo', 'versioneApp', 'foto',
];

// Il server: le REGOLE VERE delle funzioni (funzioni/src/regole.js) su un
// archivio in memoria (funzioni/src/memoria.js). Fino al 20/11/2026 pomeriggio
// qui c'era una copia delle regole scritta a mano per il collaudo: due copie
// della stessa regola divergono, e la copia rimasta indietro è quella che dice
// verde.
async function serverVero() {
  const base = path.join(__dirname, '..', 'funzioni', 'src');
  const regole = await import(pathToFileURL(path.join(base, 'regole.js')).href);
  const { creaMemoria } = await import(pathToFileURL(path.join(base, 'memoria.js')).href);
  const archivio = creaMemoria();
  const s = {
    regole,
    archivio,
    interventi: archivio.interventi,
    forza: null,
    letture: 0,
    segnalazione: idSegnalazione => [...archivio.segnalazioni.values()].find(x => x.IdSegnalazione === idSegnalazione),
  };
  s.risposte = (dati, _n, url) => {
    if (url.startsWith('/segnalazioni-elenco')) {
      s.letture += 1;
      return regole.leggi(dati, archivio, { token: TOKEN });
    }
    if (s.forza) { const f = s.forza; s.forza = null; return f; }
    return regole.riceviPasso(dati, archivio, { token: TOKEN });
  };  return s;
}

async function telefono(browser, app, flow, autore, { conDettatura = 'finta' } = {}) {
  const t = await nuovoTelefono(browser);
  if (conDettatura === 'finta') {
    await t.contesto.addInitScript(() => {
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            const risultato = [{ transcript: 'perde il sifone sotto il lavello' }];
            risultato.isFinal = true;
            if (this.onresult) this.onresult({ results: [risultato] });
          }, 50);
        }
        stop() { if (this.onend) this.onend(); }
      };
    });
  } else {
    await t.contesto.addInitScript(() => {
      Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
    });
  }
  await t.pagina.goto(app.indirizzo + '/index.html');
  await t.pagina.evaluate(({ autore: nome, segn }) => {
    localStorage.setItem('llitalia.app', JSON.stringify({ autore: nome }));
    if (segn) localStorage.setItem('llitalia.segnalazioni', JSON.stringify(segn));
  }, {
    autore,
    segn: { endpoint: flow.endpoint('segnalazioni-ricevitore'), endpointElenco: flow.endpoint('segnalazioni-elenco'), token: TOKEN },
  });
  return t;
}

async function attendiServer(condizione, descrizione, limite = 60000) {
  const fine = Date.now() + limite;
  while (Date.now() < fine) {
    if (condizione()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Attesa scaduta (${descrizione})`);
}

module.exports = {
  nome: 'Segnalazioni: apre, passa, chiude, riapre; «Tocca a te» in cima all’app',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const server = await serverVero();
    flow.stato.risposte = server.risposte;
    const telefoni = [];
    const errori = [];

    try {
      registro.titolo('Configurazione col codice: i due indirizzi viaggiano insieme');
      const nuovo = await nuovoTelefono(browser);
      telefoni.push(nuovo);
      await nuovo.pagina.goto(app.indirizzo + '/index.html');
      await nuovo.pagina.evaluate(() => localStorage.setItem('llitalia.app', JSON.stringify({ autore: 'Enzo Santovito' })));
      const b64 = t => Buffer.from(t, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const ric = flow.endpoint('segnalazioni-ricevitore');
      const ele = flow.endpoint('segnalazioni-elenco');
      await nuovo.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni/configura?e=${b64(ric)}&t=${b64(TOKEN)}`);
      await nuovo.pagina.waitForSelector('h2');
      registro.controlla('un link senza l’indirizzo dell’elenco si rifiuta',
        (await nuovo.pagina.textContent('h2')).includes('non valida'),
        'configurerebbe un telefono che manda e non vede niente');
      await nuovo.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni/configura?e=${b64(ric)}&t=${b64(TOKEN)}&l=${b64(ele)}`);
      await nuovo.pagina.waitForSelector('#applica');
      await nuovo.pagina.click('#applica');
      const salvate = await nuovo.pagina.evaluate(() => JSON.parse(localStorage.getItem('llitalia.segnalazioni')));
      registro.controlla('col link completo si salvano invio, elenco e codice',
        salvate.endpoint.includes('segnalazioni-ricevitore') && salvate.endpointElenco.includes('segnalazioni-elenco') && salvate.token === TOKEN);
      registro.controlla('e la versione API si corregge su tutti e due',
        /api-version=2024-10-01/.test(salvate.endpoint) && /api-version=2024-10-01/.test(salvate.endpointElenco));
      await nuovo.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni/condividi`);
      await aiuto.attendi(nuovo.pagina, () => Boolean(document.querySelector('#qr svg') || document.querySelector('#qr .avviso')), 'codice da condividere');
      registro.controlla('e da qui si può configurare un altro telefono', (await nuovo.pagina.$$('#qr svg')).length === 1);

      registro.titolo('Home senza niente che tocchi a te: identica a prima');
      await nuovo.pagina.goto(`${app.indirizzo}/index.html#/home`);
      await nuovo.pagina.waitForSelector('.griglia-moduli');
      // La banda si disegna solo dopo la lettura dell'elenco: si aspetta che
      // il server l'abbia servita, poi si guarda che non ci sia.
      await attendiServer(() => server.letture >= 1, 'elenco letto dalla home');
      await nuovo.pagina.waitForTimeout(500);
      registro.controlla('nessuna banda «Tocca a te»', (await nuovo.pagina.$$('#tocca-a-te')).length === 0);
      registro.controlla('la tessera Segnalazioni c’è', (await nuovo.pagina.$$('a.tessera[href="#/segnalazioni"]')).length === 1);
      errori.push(...nuovo.errori);

      registro.titolo('Paolo apre una segnalazione sul 7B di MNG, con una foto, e la passa a Enzo');
      const paolo = await telefono(browser, app, flow, 'Paolo Sanzarello');
      telefoni.push(paolo);
      const p = paolo.pagina;
      await p.goto(`${app.indirizzo}/index.html#/segnalazioni/nuova`);
      await p.waitForSelector('#commessa');
      await p.selectOption('#commessa', 'MNG');
      await p.check('input[name="ambito"][value="Alloggio"]');
      await p.waitForSelector('#unita');
      await p.selectOption('#unita', '7B');
      await p.click('#detta');
      await aiuto.attendi(p, () => document.querySelector('#testo').value.length > 0, 'testo dettato');
      const dettato = await p.$eval('#testo', e => e.value);
      registro.controlla('«Detta» scrive nel campo, e il testo si può correggere', dettato === 'perde il sifone sotto il lavello', dettato);
      await p.fill('#testo', `${dettato}, sentiti gli idraulici`);
      await p.setInputFiles('#galleria', [materiale('foto-cantiere.jpg')]);
      await aiuto.attendi(p, () => document.querySelectorAll('#anteprime img').length === 1, 'anteprima della foto', 60000);
      await p.selectOption('#passa-a', 'Enzo Santovito');
      const prima = server.interventi.length;
      await p.click('#invia-segnalazione');
      await attendiServer(() => server.interventi.length === prima + 1, 'apertura arrivata');
      const apertura = flow.stato.ricevuti.find(r => r && r.azione === 'apertura');
      registro.dice('campi', Object.keys(apertura));
      registro.controlla('ci sono tutti i campi del contratto', CAMPI_ATTESI.every(c => c in apertura),
        CAMPI_ATTESI.filter(c => !(c in apertura)).join(', ') || 'nessuno mancante');
      registro.controlla('e nessuno in più', Object.keys(apertura).every(c => CAMPI_ATTESI.includes(c)),
        Object.keys(apertura).filter(c => !CAMPI_ATTESI.includes(c)).join(', ') || 'nessuno');
      registro.controlla('luogo dall’anagrafica: alloggio 7B, piano P7',
        apertura.commessa === 'MNG' && apertura.ambito === 'Alloggio' && apertura.unita === '7B' && apertura.piano === 'P7',
        JSON.stringify({ c: apertura.commessa, a: apertura.ambito, u: apertura.unita, p: apertura.piano }));
      registro.controlla('nessuna fase né attività nel payload: le propone il giro delle 20', !('fase' in apertura) && !('attivita' in apertura));
      registro.controlla('dataIntervento è ISO con fuso (il flow ne prende 19 caratteri)',
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(apertura.dataIntervento), apertura.dataIntervento);
      const foto = apertura.foto[0];
      const jpeg = Buffer.from(foto.contenutoBase64, 'base64');
      registro.controlla('una foto, JPEG, col nome fisso «idClient-1»',
        apertura.foto.length === 1 && jpeg[0] === 0xFF && jpeg[1] === 0xD8 && foto.nome === `${apertura.idClient.slice(0, 8)}-1`, foto.nome);
      registro.controlla('ridotta (lato lungo 1600 px): più leggera dell’originale',
        jpeg.length < fs.statSync(materiale('foto-cantiere.jpg')).size, `${jpeg.length} byte`);
      registro.controlla('passaA = Enzo, operatore = Paolo', apertura.passaA === 'Enzo Santovito' && apertura.operatore === 'Paolo Sanzarello');
      const idSegnalazione = apertura.idSegnalazione;
      registro.controlla('sul server tocca a Enzo', server.segnalazione(idSegnalazione).ToccaA === 'Enzo Santovito');

      registro.titolo('Enzo apre l’app: la trova in cima, senza scorrere');
      const enzo = await telefono(browser, app, flow, 'Enzo Santovito');
      telefoni.push(enzo);
      const e = enzo.pagina;
      await e.goto(`${app.indirizzo}/index.html#/home`);
      await e.waitForSelector('#tocca-a-te', { timeout: 30000 });
      const banda = await e.$eval('#tocca-a-te', x => x.innerText.replace(/\s+/g, ' '));
      registro.dice('banda', banda);
      registro.controlla('«Tocca a te 1», con cantiere e alloggio', /Tocca a te 1/.test(banda) && /MNG · alloggio 7B/.test(banda));
      const sopra = await e.evaluate(() => document.querySelector('#tocca-a-te').getBoundingClientRect().top
        < document.querySelector('.griglia-moduli').getBoundingClientRect().top);
      registro.controlla('sta sopra le tessere dei moduli', sopra);
      const visibile = await e.evaluate(() => document.querySelector('#tocca-a-te').getBoundingClientRect().top < window.innerHeight);
      registro.controlla('e si vede appena aperta l’app', visibile);

      registro.titolo('Enzo fa la sua parte e la passa a Rosario');
      await e.click('#tocca-a-te a.segn-riga');
      await e.waitForSelector('#segn-azioni');
      await aiuto.attendi(e, () => /Apertura/.test(document.querySelector('#segn-storia').innerText), 'storia letta dal server');
      registro.controlla('la storia mostra l’apertura di Paolo', /Apertura[\s\S]*Paolo Sanzarello/.test(await e.innerText('#segn-storia')));
      await e.fill('#a-testo', 'Collegamenti elettrici a posto, deve vedere l’idraulico');
      await e.selectOption('#a-passa', 'Rosario Incarbone');
      const primaE = server.interventi.length;
      await e.click('#passa');
      // Dopo «Passa» l'app torna da sola all'elenco: si aspetta che ci sia
      // arrivata e l'abbia disegnato, altrimenti il ritorno arriva DOPO la
      // navigazione del collaudo e la sovrascrive.
      await e.waitForFunction(() => location.hash === '#/segnalazioni');
      await e.waitForSelector('#aggiorna', { timeout: 15000 });
      await e.goto(`${app.indirizzo}/index.html#/home`);
      try {
        await e.waitForSelector('.griglia-moduli', { timeout: 15000 });
      } catch (errore) {
        registro.dice('DIAGNOSI url', e.url());
        registro.dice('DIAGNOSI vista', (await e.evaluate(() => document.body.innerText)).slice(0, 400));
        registro.dice('DIAGNOSI errori', enzo.errori.join(' | ').slice(0, 600));
        throw errore;
      }
      await e.waitForTimeout(300);
      registro.controlla('dalla home di Enzo sparisce subito, anche prima che il server risponda',
        (await e.$$('#tocca-a-te')).length === 0);
      await attendiServer(() => server.interventi.length === primaE + 1, 'passaggio arrivato');
      const passaggio = server.interventi[server.interventi.length - 1];
      registro.controlla('al server arriva un passaggio a Rosario, sulla stessa segnalazione',
        passaggio.Azione === 'passaggio' && passaggio.PassaA === 'Rosario Incarbone' && passaggio.IdSegnalazione === idSegnalazione);
      registro.controlla('Enzo, che è fra i cinque, vede «Nuova segnalazione»',
        await (async () => { await e.goto(`${app.indirizzo}/index.html#/segnalazioni`); await e.waitForSelector('#aggiorna'); return (await e.$$('#nuova')).length === 1; })());

      registro.titolo('Rosario chiude; non può riaprire');
      const rosario = await telefono(browser, app, flow, 'Rosario Incarbone');
      telefoni.push(rosario);
      const r = rosario.pagina;
      await r.goto(`${app.indirizzo}/index.html#/segnalazioni/scheda?id=${idSegnalazione}`);
      await r.waitForSelector('#segn-azioni, h2');
      if ((await r.$$('#segn-azioni')).length === 0) {
        // L'elenco non era ancora sul telefono: si legge dalla tessera, poi si torna.
        await r.goto(`${app.indirizzo}/index.html#/segnalazioni`);
        await aiuto.attendi(r, () => /aggiornato/.test(document.querySelector('#segn-lettura').innerText), 'elenco letto');
        await r.goto(`${app.indirizzo}/index.html#/segnalazioni/scheda?id=${idSegnalazione}`);
      }
      await r.waitForSelector('#segn-azioni');
      await r.fill('#a-testo', 'Sifone sostituito');
      const primaR = server.interventi.length;
      await r.click('#chiudi');
      await attendiServer(() => server.interventi.length === primaR + 1, 'chiusura arrivata');
      registro.controlla('sul server è chiusa, chiusa da Rosario, e non tocca più a nessuno',
        server.segnalazione(idSegnalazione).Stato === 'Chiusa'
        && server.segnalazione(idSegnalazione).ChiusaDa === 'Rosario Incarbone'
        && !server.segnalazione(idSegnalazione).ToccaA);
      await r.goto(`${app.indirizzo}/index.html#/segnalazioni`);
      await aiuto.attendi(r, () => /aggiornato/.test(document.querySelector('#segn-lettura').innerText), 'elenco riletto');
      await r.goto(`${app.indirizzo}/index.html#/segnalazioni/scheda?id=${idSegnalazione}`);
      await r.waitForSelector('#segn-stato');
      registro.controlla('Rosario la vede chiusa e senza «Riapri»',
        /Chiusa/.test(await r.innerText('#segn-stato')) && (await r.$$('#segn-riapri')).length === 0);

      registro.titolo('Paolo la riapre e la ripassa a Rosario');
      await p.goto(`${app.indirizzo}/index.html#/segnalazioni`);
      await aiuto.attendi(p, () => /aggiornato/.test(document.querySelector('#segn-lettura').innerText), 'elenco di Paolo');
      await p.goto(`${app.indirizzo}/index.html#/segnalazioni/scheda?id=${idSegnalazione}`);
      await p.waitForSelector('#segn-riapri');
      await p.click('#riapri');
      registro.controlla('senza un perché non si riapre', !(await p.$eval('#errore-riapri', x => x.classList.contains('nascosto'))));
      await p.fill('#r-testo', 'Il cliente dice che perde ancora');
      await p.selectOption('#r-passa', 'Rosario Incarbone');
      const primaP = server.interventi.length;
      await p.click('#riapri');
      await attendiServer(() => server.interventi.length === primaP + 1, 'riapertura arrivata');
      registro.controlla('sul server è di nuovo aperta, e tocca a Rosario',
        server.segnalazione(idSegnalazione).Stato === 'Aperta' && server.segnalazione(idSegnalazione).ToccaA === 'Rosario Incarbone');

      registro.titolo('Chi non è fra gli otto non apre');
      const giovanni = await telefono(browser, app, flow, 'Giovanni Lippolis');
      telefoni.push(giovanni);
      await giovanni.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni`);
      await giovanni.pagina.waitForSelector('#aggiorna');
      registro.controlla('nessun «Nuova segnalazione» per Giovanni', (await giovanni.pagina.$$('#nuova')).length === 0);
      await giovanni.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni/nuova`);
      await giovanni.pagina.waitForSelector('h2');
      registro.controlla('e la pagina dice chi le apre',
        /le aprono Paolo, Domenico, Rosario, Enzo, Andrea, Florin, Roberto e Francesco/i.test(await giovanni.pagina.innerText('body')));

      // Correzione di Francesco del 20/11/2026 (0.43.1): «No le segnalazioni
      // devo poterle aprire anche io» e «Aggiungi anche Florin e Roberto
      // Borinschi a quelli che possono aprire segnalazioni». Fino alla 0.43.0
      // niente pulsante per loro, e il server avrebbe risposto 403.
      registro.titolo('Florin e Roberto: il pulsante c’è');
      for (const nome of ['Florin Zaharia', 'Roberto Borinschi']) {
        const t = await telefono(browser, app, flow, nome);
        telefoni.push(t);
        await t.pagina.goto(`${app.indirizzo}/index.html#/segnalazioni`);
        await t.pagina.waitForSelector('#aggiorna');
        registro.controlla(`«Nuova segnalazione» c’è per ${nome}`, (await t.pagina.$$('#nuova')).length === 1);
      }

      registro.titolo('Francesco apre: il pulsante c’è e il server accetta');
      const francesco = await telefono(browser, app, flow, 'Francesco Lando');
      telefoni.push(francesco);
      const f = francesco.pagina;
      await f.goto(`${app.indirizzo}/index.html#/segnalazioni`);
      await f.waitForSelector('#aggiorna');
      registro.controlla('«Nuova segnalazione» c’è per Francesco', (await f.$$('#nuova')).length === 1);
      await f.click('#nuova');
      await f.waitForSelector('#commessa');
      await f.selectOption('#commessa', 'MNG');
      await f.check('input[name="ambito"][value="Alloggio"]');
      await f.waitForSelector('#unita');
      await f.selectOption('#unita', '7B');
      await f.fill('#testo', 'Maniglia della porta finestra da registrare');
      const primaF = server.interventi.length;
      await f.click('#invia-segnalazione');
      await attendiServer(() => server.interventi.length === primaF + 1, 'apertura di Francesco arrivata');
      const aperturaF = server.interventi[server.interventi.length - 1];
      registro.controlla('sul server c’è l’apertura di Francesco, e la tiene lui',
        aperturaF.Azione === 'apertura' && aperturaF.Operatore === 'Francesco Lando'
        && server.segnalazione(aperturaF.IdSegnalazione).ToccaA === 'Francesco Lando',
        JSON.stringify({ a: aperturaF.Azione, o: aperturaF.Operatore }));
      registro.controlla('nessun rifiuto in coda', (await f.$$('#segn-rifiutati')).length === 0);
      // Chi apre e chi riapre stanno scritti in due posti: nell'app, per non
      // mostrare un pulsante che porta a un rifiuto, e nelle funzioni, dove
      // sono la regola. Una correzione fatta in un posto solo deve dare rosso.
      const nellApp = await f.evaluate(async () => {
        const m = await import('./modules/segnalazioni/impostazioni.js');
        return { aprono: m.POSSONO_APRIRE, coordinano: m.COORDINANO };
      });
      registro.controlla('app e funzioni hanno lo stesso elenco di chi apre e di chi riapre',
        JSON.stringify(nellApp.aprono) === JSON.stringify(server.regole.POSSONO_APRIRE)
        && JSON.stringify(nellApp.coordinano) === JSON.stringify(server.regole.COORDINANO),
        JSON.stringify(nellApp.aprono));

      registro.titolo('Al massimo 3 foto; senza «Detta» resta la tastiera');
      const domenico = await telefono(browser, app, flow, 'Domenico Caminiti', { conDettatura: 'assente' });
      telefoni.push(domenico);
      const d = domenico.pagina;
      await d.goto(`${app.indirizzo}/index.html#/segnalazioni/nuova`);
      await d.waitForSelector('#commessa');
      registro.controlla('senza riconoscimento vocale il pulsante sparisce e lo si dice',
        await d.$eval('#detta', x => x.classList.contains('nascosto'))
        && /microfono della tastiera/.test(await d.innerText('#avviso-detta')));
      const quattro = Array(4).fill(materiale('foto-cantiere.jpg'));
      await d.setInputFiles('#galleria', quattro);
      await aiuto.attendi(d, () => !document.querySelector('#avviso-foto').classList.contains('nascosto'), 'avviso della quarta foto', 90000);
      registro.controlla('entrano 3 foto, la quarta no, e lo dice',
        (await d.$$eval('#anteprime img', x => x.length)) === 3 && /Al massimo 3 foto/.test(await d.innerText('#avviso-foto')));

      registro.titolo('Parte comune su TN1, e senza rete resta in coda');
      await d.selectOption('#commessa', 'TN1');
      await d.check('input[name="ambito"][value="Parte comune"]');
      await d.waitForSelector('#piano');
      await d.selectOption('#scala', '4');
      await d.selectOption('#piano', 'P0');
      await d.fill('#testo', 'Portone della scala che non si chiude');
      await d.click('.segn-togli');
      await d.click('.segn-togli');
      await d.click('.segn-togli');
      await flow.sospendi();
      const primaD = server.interventi.length;
      await d.click('#invia-segnalazione');
      await d.waitForSelector('#segn-coda');
      registro.controlla('senza rete la segnalazione resta «Da inviare»', /Apertura/.test(await d.innerText('#segn-coda')));
      await flow.riprendi();
      await attendiServer(() => server.interventi.length === primaD + 1, 'apertura partita al ritorno della rete', 90000);
      const comune = server.interventi[server.interventi.length - 1];
      const segComune = server.segnalazione(comune.IdSegnalazione);
      registro.controlla('arriva con «Lotto 4 · Piano terra», piano P0, nessuna unità, nessuna foto',
        segComune.Ambito === 'Parte comune' && segComune.ParteComune === 'Lotto 4 · Piano terra'
        && segComune.Piano === 'P0' && segComune.Unita === '' && comune.NumeroFoto === 0,
        JSON.stringify({ a: segComune.Ambito, pc: segComune.ParteComune, p: segComune.Piano, u: segComune.Unita }));
      registro.controlla('chi apre senza scegliere un nome la tiene lui', segComune.ToccaA === 'Domenico Caminiti');

      registro.titolo('Un rifiuto definitivo non si ritenta all’infinito');
      server.forza = { stato: 409, corpo: { esito: 'gia_chiusa' } };
      await d.goto(`${app.indirizzo}/index.html#/segnalazioni`);
      await aiuto.attendi(d, () => /aggiornato/.test(document.querySelector('#segn-lettura').innerText), 'elenco di Domenico');
      await d.goto(`${app.indirizzo}/index.html#/segnalazioni/scheda?id=${comune.IdSegnalazione}`);
      await d.waitForSelector('#segn-azioni');
      await d.click('#chiudi');
      await d.waitForSelector('#segn-rifiutati', { timeout: 60000 });
      registro.controlla('il passo va fra i «Non registrati», con la frase giusta, e non in errore',
        /era già stata chiusa/.test(await d.innerText('#segn-rifiutati')) && (await d.$$('#segn-coda .badge-errore')).length === 0);
      await d.click('[data-togli]');
      await d.waitForTimeout(300);
      registro.controlla('«Ho capito, togli» lo toglie', (await d.$$('#segn-rifiutati')).length === 0);

      registro.titolo('Pagina Informazioni');
      await p.goto(`${app.indirizzo}/index.html#/informazioni`);
      try {
        // innerText restituisce le etichette in maiuscolo, come le disegna il CSS.
        await aiuto.attendi(p, () => /Segnalazioni/.test(document.body.innerText) && /Elenco letto/i.test(document.body.innerText), 'numeri del modulo', 20000);
      } catch (errore) {
        registro.dice('DIAGNOSI url', p.url());
        registro.dice('DIAGNOSI vista', (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 900));
        throw errore;
      }
      const informazioni = await p.innerText('body');
      registro.controlla('il modulo dichiara i suoi numeri', /Segnalazioni che toccano a te/i.test(informazioni));
      registro.controlla('e la riga di oggi parla di passi, non di foto scattate',
        /passi fatti/i.test(informazioni), informazioni.match(/OGGI[^\n]*\n?[^\n]*passi[^\n]*/i)?.[0] || '');

      for (const t of telefoni.slice(1)) errori.push(...t.errori);
      registro.controllaConsole(errori, ['Failed to load resource', 'ERR_CONNECTION_REFUSED']);
    } finally {
      for (const t of telefoni) await t.contesto.close().catch(() => {});
    }
  },
};
