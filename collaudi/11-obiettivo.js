// La fotocamera in-app: quale obiettivo apre, e dove stanno i comandi.
//
// Due richieste dal cantiere del 14/09/2026. La prima: scattando dall'app il
// telefono apriva l'ultra-grandangolare, che inquadra tutto il foglio ma
// distorce — perché l'app chiedeva solo «una posteriore» e il browser
// sceglieva lui. La seconda: Fine era enorme e lo scatto in basso a sinistra.
//
// Il Chromium del collaudo ha UNA fotocamera finta senza un nome parlante:
// la scelta della lente si prova quindi sulla funzione pura, con gli elenchi
// di nomi che i telefoni veri dichiarano, e sul telefono vero. Qui si prova
// che con una fotocamera sola l'app apre come prima e dice cosa ha visto.
const { nuovoTelefono, configura } = require('./aiuto');

// Elenchi come li dichiara `enumerateDevices` dopo il permesso. Android
// Chrome numera e dice il verso; iPhone nomina la lente per esteso. Le
// grafie italiane di iPhone sono esemplificative, non misurate: il collaudo
// sul telefono vero è quello che conta, e la pagina Informazioni le mostra.
const TELEFONI = [
  ['Samsung, Chrome — il browser apre la 2 (ultra-grandangolare)',
    ['camera2 1, facing front', 'camera2 2, facing back', 'camera2 0, facing back', 'camera2 3, facing back'],
    'camera2 0, facing back'],
  ['Pixel, Chrome — una posteriore sola',
    ['camera2 0, facing back', 'camera2 1, facing front'],
    'camera2 0, facing back'],
  ['iPhone, Safari in inglese',
    ['Front Camera', 'Back Camera', 'Back Ultra Wide Camera', 'Back Telephoto Camera', 'Back Dual Wide Camera', 'Back Triple Camera'],
    'Back Camera'],
  ['iPhone, Safari in italiano (grafie esemplificative)',
    ['Fotocamera anteriore', 'Fotocamera posteriore', 'Fotocamera ultra-grandangolare posteriore', 'Teleobiettivo posteriore'],
    'Fotocamera posteriore'],
  ['Telefono con sole lenti dichiarate grandangolari: si prende la prima, non si resta a mani vuote',
    ['camera2 1, facing front', 'camera2 2, facing back wide', 'camera2 3, facing back ultra'],
    'camera2 2, facing back wide'],
];

const SENZA_SCELTA = [
  ['PC con webcam: nessun nome dice il verso', ['Integrated Webcam']],
  ['prima del permesso: etichette vuote', ['', '']],
  ['solo la frontale ha un nome', ['camera2 1, facing front']],
];

module.exports = {
  nome: 'Fotocamera in-app: obiettivo principale e comandi al posto giusto',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');

    registro.titolo('La scelta della lente, sui nomi che i telefoni dichiarano');
    const scegli = etichette => pagina.evaluate(async nomi => {
      const m = await import('./core/fotocamera.js');
      const dispositivi = nomi.map((label, i) => ({ kind: 'videoinput', deviceId: `id${i}`, label }));
      const esito = m.scegliObiettivo(dispositivi);
      return { scelto: esito.scelto ? esito.scelto.label : null, motivo: esito.motivo };
    }, etichette);
    for (const [caso, etichette, attesa] of TELEFONI) {
      const esito = await scegli(etichette);
      registro.controlla(`${caso} → «${attesa}»`, esito.scelto === attesa, `${esito.scelto} — ${esito.motivo}`);
    }
    for (const [caso, etichette] of SENZA_SCELTA) {
      const esito = await scegli(etichette);
      registro.controlla(`${caso} → si lascia fare al browser`, esito.scelto === null, esito.motivo);
    }
    registro.controlla('la scelta non guarda mai la frontale',
      (await scegli(['camera2 1, facing front', 'camera2 0, facing back'])).scelto === 'camera2 0, facing back');

    registro.titolo('Con una fotocamera sola l’app apre come prima, e dice cosa ha visto');
    await pagina.selectOption('#categoria', 'ARCHIVIO');
    await pagina.selectOption('#commessa', 'MAR');
    await pagina.click('#apri-fotocamera');
    await pagina.waitForSelector('.fotocamera-scatta:not([disabled])', { timeout: 30000 });
    const diagnostica = await pagina.evaluate(() => JSON.parse(localStorage.getItem('llitalia.fotocamera')));
    registro.dice('diagnostica salvata', diagnostica);
    registro.controlla('l’app ha registrato le fotocamere viste',
      diagnostica && Array.isArray(diagnostica.rilevate) && diagnostica.rilevate.length >= 1);
    registro.controlla('e quale sta usando', Boolean(diagnostica && diagnostica.inUso));
    registro.controlla('con un nome che non dice il verso, la scelta resta al browser',
      /browser/.test(String(diagnostica && diagnostica.esito)), diagnostica && diagnostica.esito);

    registro.titolo('I comandi: scatto al centro, Fine alla sua sinistra, niente a destra');
    const misure = await pagina.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const scatta = r('.fotocamera-scatta');
      const fine = r('.fotocamera-fine');
      const comandi = r('.fotocamera-comandi');
      const destra = document.querySelector('.fotocamera-spazio');
      return {
        larghezzaSchermo: window.innerWidth,
        centroScatto: scatta.left + scatta.width / 2,
        sinistraScatto: scatta.left,
        destraFine: fine.right,
        larghezzaFine: fine.width,
        larghezzaComandi: comandi.width,
        aDestra: destra ? destra.textContent.trim() : null,
        ordine: [...document.querySelectorAll('.fotocamera-comandi > *')].map(e => e.className.split(' ').pop()),
      };
    });
    registro.dice('misure', misure);
    registro.controlla('lo scatto sta al centro dello schermo (±8 px)',
      Math.abs(misure.centroScatto - misure.larghezzaSchermo / 2) <= 8,
      `centro scatto ${Math.round(misure.centroScatto)}, centro schermo ${misure.larghezzaSchermo / 2}`);
    registro.controlla('Fine sta tutto a sinistra dello scatto', misure.destraFine <= misure.sinistraScatto);
    // Prima Fine occupava tutto quello che lo scatto lasciava libero (~290 px
    // su 390): ora sta nella sola colonna di sinistra.
    registro.controlla('Fine non è più gigantesco: meno di metà della barra',
      misure.larghezzaFine < misure.larghezzaComandi / 2,
      `${Math.round(misure.larghezzaFine)} px su ${Math.round(misure.larghezzaComandi)}`);
    registro.controlla('a destra dello scatto non c’è niente', misure.aDestra === '' && misure.ordine[2] === 'fotocamera-spazio');
    registro.controlla('ordine nel documento: Fine, scatto, spazio',
      misure.ordine.join(',') === 'fotocamera-fine,fotocamera-scatta,fotocamera-spazio', misure.ordine.join(','));

    // E si scatta ancora: la disposizione nuova non deve aver rotto il gesto.
    await pagina.click('.fotocamera-scatta');
    await pagina.waitForSelector('.fotocamera-fine:not([disabled])', { timeout: 30000 });
    const testoFine = await pagina.$eval('.fotocamera-fine', e => e.textContent.trim());
    registro.controlla('Fine dice quante foto porta con sé', /1 foto/.test(testoFine), testoFine);
    await pagina.click('.fotocamera-fine');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 60000);
    registro.controlla('la foto scattata è in attesa di invio', true);

    registro.titolo('Informazioni dice quale fotocamera è stata aperta');
    await pagina.goto(app.indirizzo + '/index.html#/informazioni');
    const riga = await aiuto.attendi(pagina, () => {
      const dt = [...document.querySelectorAll('dt')].find(e => /Fotocamera in-app/.test(e.textContent));
      return dt && dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : false;
    }, 'riga della fotocamera', 20000);
    registro.dice('Informazioni → Fotocamera in-app', riga);
    registro.controlla('mostra il nome della fotocamera in uso', riga.includes(diagnostica.inUso));
    registro.controlla('e le fotocamere rilevate', /Rilevate:/.test(riga));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
