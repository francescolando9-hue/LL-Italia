// Un JPEG si riconosce dai BYTE, non dal `type` che il selettore dichiara —
// e un JPEG non si ricodifica mai.
//
// Il difetto, dalla 0.37.0 alla 0.37.2: `preparaImmagine` decideva «è già un
// JPEG» da `file.type`, mentre la lettura dell'ora dello scatto lo decideva
// dai byte. Due punti, due fonti, due risposte diverse sullo stesso file. Su
// Android il `type` lo scrive il selettore del sistema, e su file passati per
// un gestore di file, scaricati, o arrivati da un'app che non lo dichiara
// vale `''` o `application/octet-stream`: quei file venivano **ricodificati
// in silenzio** — la decodifica riesce, quindi nessun errore da nessuna parte
// — e in archivio finivano byte diversi da quelli che il telefono ha
// scattato, mentre l'ora arrivava giusta perché quella guardava i byte.
//
// Non è un difetto che si vede: la foto si apre, la data è giusta, il peso è
// plausibile. Si vede solo confrontando le impronte, che è quello che fa
// questo collaudo.
//
// Il caso scelto è quello che può fallire: **gli stessi byte** mandati tre
// volte con tre `type` diversi. Se il confronto si facesse su tre file
// diversi, o su un file col `type` giusto, funzionamento e guasto darebbero
// lo stesso risultato.
const fs = require('fs');
const crypto = require('crypto');
const { nuovoTelefono, configura, materiale } = require('./aiuto');

// I `type` che si vedono davvero in cantiere al posto di `image/jpeg`.
const TIPI_STORTI = [
  ['', 'nessun tipo dichiarato'],
  ['image/jpg', 'tipo scritto a mano, non esiste'],
  ['application/octet-stream', 'tipo generico del gestore di file'],
];

const impronta = byte => crypto.createHash('sha256').update(byte).digest('hex').slice(0, 16);

module.exports = {
  nome: 'JPEG riconosciuto dai byte: mai ricodificato',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');

    const scegli = async () => {
      await pagina.selectOption('#commessa', 'MAR');
      await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('MAR|'),
        'menù della fase pronto', 10000);
      await pagina.selectOption('#fase', 'Cantiere');
    };

    // Il file di partenza ha un EXIF vero: serve a provare, nello stesso
    // invio, che la data continua a leggersi anche col `type` storto — cioè
    // che i due punti guardano la stessa cosa.
    const percorso = materiale('scatto-exif.jpg');
    const byteOriginali = fs.readFileSync(percorso);
    const improntaOriginale = impronta(byteOriginali);
    registro.dice('file di partenza', `${byteOriginali.length} byte · impronta ${improntaOriginale}`);

    const manda = async (tipo, nome) => {
      const prima = flow.stato.ricevuti.length;
      await scegli();
      // `setInputFiles` con un buffer: è l'unico modo di controllare il `type`
      // che il `File` porta, che è esattamente la variabile in prova.
      await pagina.setInputFiles('#input-galleria',
        [{ name: nome, mimeType: tipo, buffer: byteOriginali }]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1,
        'anteprima', 90000);
      await pagina.click('#invia');
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 300));
      }
      return flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    };

    for (const [tipo, perche] of TIPI_STORTI) {
      registro.titolo(`type «${tipo || '(vuoto)'}» — ${perche}`);
      const arrivata = await manda(tipo, 'IMG_2026.jpg');
      const byte = Buffer.from(arrivata.contenutoBase64, 'base64');
      registro.dice('arrivati', `${byte.length} byte · impronta ${impronta(byte)}`);
      registro.controlla('i byte sono identici all’originale',
        impronta(byte) === improntaOriginale && byte.length === byteOriginali.length,
        'un JPEG non si ricodifica: in archivio vanno i byte del telefono');
      registro.controlla('e la data dello scatto si legge comunque',
        arrivata.dataScatto === '2026-09-14T08:31:39+02:00', arrivata.dataScatto);
      registro.controlla('dichiarata misurata', arrivata.scattoStimato === 'NO', arrivata.scattoStimato);
      registro.controlla('il MIME dichiarato è image/jpeg',
        arrivata.mimeType === 'image/jpeg',
        `${arrivata.mimeType} — il file in raccolta si chiama .jpg: dichiarare octet-stream sarebbe dichiarare il falso`);
    }

    // L'altra metà della regola: quello che JPEG **non è** deve continuare a
    // passare dalla conversione. Una firma letta troppo largamente
    // manderebbe in raccolta byte PNG dentro un file `.jpg`, che non si apre.
    registro.titolo('Un PNG vero continua a convertirsi');
    const bytePng = fs.readFileSync(materiale('schermata.png'));
    registro.dice('PNG di partenza', `${bytePng.length} byte · impronta ${impronta(bytePng)}`);
    const primaPng = flow.stato.ricevuti.length;
    await scegli();
    await pagina.setInputFiles('#input-galleria', [materiale('schermata.png')]);
    // Un PNG non ha l'EXIF: si ferma con l'avviso, ed è giusto. Qui si manda
    // comunque, perché la cosa in prova sono i byte.
    await pagina.waitForSelector('#senza-data-comunque', { timeout: 60000 });
    registro.controlla('l’avviso dice che il file non è un JPEG',
      /non è una foto JPEG/.test(await pagina.$eval('#avviso-senza-data', e => e.textContent)),
      'dalla 0.37.2 è un caso a sé, e la 0.37.3 non lo cambia');
    await pagina.click('#senza-data-comunque');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1,
      'anteprima', 90000);
    await pagina.click('#invia');
    const finePng = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaPng && Date.now() < finePng) {
      await new Promise(r => setTimeout(r, 300));
    }
    const png = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    const byteArrivati = Buffer.from(png.contenutoBase64, 'base64');
    registro.dice('arrivati', `${byteArrivati.length} byte · impronta ${impronta(byteArrivati)}`);
    registro.controlla('i byte NON sono quelli del PNG',
      impronta(byteArrivati) !== impronta(bytePng),
      'byte PNG dentro un .jpg sarebbero un file che non si apre');
    registro.controlla('e quello che parte è un JPEG',
      byteArrivati[0] === 0xFF && byteArrivati[1] === 0xD8 && byteArrivati[2] === 0xFF,
      `primi byte ${[...byteArrivati.slice(0, 3)].map(b => b.toString(16)).join(' ')}`);
    registro.controlla('il MIME dichiarato è image/jpeg', png.mimeType === 'image/jpeg', png.mimeType);

    // La firma sta in un posto solo, e i due punti che se la chiedono la
    // chiedono a quello: se qualcuno ne riscrivesse una copia, questo
    // controllo non se ne accorgerebbe — ma si accorge se la firma smette di
    // essere quella giusta.
    registro.titolo('La firma è una sola, in `core/exif.js`');
    const firma = await pagina.evaluate(async () => {
      const m = await import('./core/exif.js');
      const prova = byte => m.eJpegDaiByte(new DataView(new Uint8Array(byte).buffer));
      return {
        jpeg: prova([0xFF, 0xD8, 0xFF, 0xE0]),
        jpegExif: prova([0xFF, 0xD8, 0xFF, 0xE1]),
        soloSoi: prova([0xFF, 0xD8]),
        png: prova([0x89, 0x50, 0x4E, 0x47]),
        heic: prova([0x00, 0x00, 0x00, 0x18]),
        vuoto: prova([]),
      };
    });
    registro.dice('esiti della firma', firma);
    registro.controlla('riconosce un JPEG JFIF e un JPEG con EXIF',
      firma.jpeg === true && firma.jpegExif === true);
    registro.controlla('non basta il SOI da solo', firma.soloSoi === false,
      'tre byte, non due: FF D8 capita anche in testa a dati che JPEG non sono');
    registro.controlla('PNG e HEIC non passano',
      firma.png === false && firma.heic === false);
    registro.controlla('e un file vuoto non passa', firma.vuoto === false);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
