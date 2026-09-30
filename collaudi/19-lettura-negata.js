// Il telefono che non lascia leggere una foto.
//
// **Il caso, misurato il 30/09/2026.** Sul Galaxy S21+ di Paolo due foto
// scattate alle 11:26 con la fotocamera del telefono sono state rifiutate
// dall'app alle 11:31, e le stesse due foto sono partite senza un intoppo
// alle 19:25, con l'EXIF completo, `ScattoStimato` `NO` e i byte originali.
// Il file è sempre stato a posto: a fallire era la **lettura**. Il browser
// diceva `NotReadableError`, e alle 19:20 la stessa causa era uscita a video
// come «Formato immagine non supportato da questo dispositivo».
//
// Il guasto si inietta sostituendo `Blob.prototype.arrayBuffer` con una
// versione che rifiuta le prime N chiamate con lo stesso `DOMException` del
// browser. È l'unico modo di provarlo: un file su disco, in un container, si
// legge sempre — e un collaudo in cui funzionamento e guasto danno lo stesso
// risultato non prova niente.
const fs = require('fs');
const crypto = require('crypto');
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const impronta = byte => crypto.createHash('sha256').update(byte).digest('hex').slice(0, 16);

// Il messaggio è quello vero, parola per parola: serve a provare che la
// classificazione riconosce quello che il browser dice davvero, non una
// stringa comoda scritta per il collaudo.
const MESSAGGIO = 'The requested file could not be read, typically due to '
  + 'permission problems that have occurred after a reference to a file was acquired.';

module.exports = {
  nome: 'Lettura negata dal telefono: si ritenta, e si dice il caso giusto',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    // Le attese fra i tentativi si accorciano: la regola è 0,5 s / 1,5 s / 3 s,
    // e un collaudo che le aspettasse davvero costerebbe cinque secondi a
    // prova. Quello che si prova è il NUMERO dei tentativi, non la durata.
    await pagina.evaluate(() => localStorage.setItem('llitalia.atteseRilettura', '20,20,20'));
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');

    const scegli = async () => {
      await pagina.selectOption('#commessa', 'MAR');
      await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('MAR|'),
        'menù della fase pronto', 10000);
      await pagina.selectOption('#fase', 'Cantiere');
    };

    // Rifiuta le prossime `quanti` letture di un Blob, e conta quante gliene
    // sono state chieste in tutto.
    const guasta = quanti => pagina.evaluate(n => {
      window.__guasti = n;
      window.__letture = 0;
      if (!window.__arrayBufferVero) window.__arrayBufferVero = Blob.prototype.arrayBuffer;
      Blob.prototype.arrayBuffer = function () {
        window.__letture += 1;
        if (window.__guasti > 0) {
          window.__guasti -= 1;
          return Promise.reject(new DOMException(
            'The requested file could not be read, typically due to permission problems '
            + 'that have occurred after a reference to a file was acquired.', 'NotReadableError'));
        }
        return window.__arrayBufferVero.apply(this, arguments);
      };
    }, quanti);
    const letture = () => pagina.evaluate(() => window.__letture);
    const risana = () => pagina.evaluate(() => { window.__guasti = 0; });

    const percorso = materiale('scatto-exif.jpg');
    const byteOriginali = fs.readFileSync(percorso);
    registro.dice('file di partenza', `${byteOriginali.length} byte · impronta ${impronta(byteOriginali)}`);
    registro.dice('messaggio del browser iniettato', MESSAGGIO);

    registro.titolo('Fallisce la prima lettura, riesce la seconda: la foto passa e non se ne accorge nessuno');
    await scegli();
    await guasta(1);
    await pagina.setInputFiles('#input-galleria', [percorso]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1,
      'anteprima', 60000);
    registro.dice('letture chieste al browser', await letture());
    registro.controlla('la foto è in coda nonostante la prima lettura negata',
      (await pagina.$$('.foto-anteprima')).length === 1,
      'il riferimento decaduto torna leggibile dopo poco: ritentare è quello che risolve il caso di Paolo');
    registro.controlla('e non compare nessun avviso di messa da parte',
      (await pagina.$eval('#avviso-senza-data', e => e.textContent.trim())) === '',
      'un guasto risolto da sé non si racconta: l’operatore non ha niente da decidere');
    const prima = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fine = Date.now() + 90000;
    while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
      await new Promise(r => setTimeout(r, 300));
    }
    const arrivata = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    const byte = Buffer.from(arrivata.contenutoBase64, 'base64');
    registro.dice('arrivati', `${byte.length} byte · impronta ${impronta(byte)}`);
    registro.controlla('i byte sono identici all’originale',
      impronta(byte) === impronta(byteOriginali),
      'la copia in memoria è una copia, non una ricodifica');
    registro.controlla('e la data è quella letta dall’EXIF',
      arrivata.dataScatto === '2026-09-14T08:31:39+02:00', arrivata.dataScatto);
    registro.controlla('dichiarata misurata', arrivata.scattoStimato === 'NO', arrivata.scattoStimato);

    registro.titolo('Non si legge mai: l’avviso è quello del caso, e «Aggiungi comunque» NON c’è');
    // `puliscine` svuota anche le impostazioni: senza rimetterle il modulo
    // non ha endpoint e la pagina non disegna nemmeno il cantiere (trappola 4).
    await aiuto.puliscine(pagina, ['llitalia-foto']);
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.evaluate(() => localStorage.setItem('llitalia.atteseRilettura', '20,20,20'));
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    await scegli();
    await guasta(999);
    await pagina.setInputFiles('#input-galleria', [percorso]);
    await pagina.waitForSelector('#lettura-riprova', { timeout: 60000 });
    const avviso = await pagina.$eval('#avviso-senza-data', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso a video', avviso);
    registro.dice('letture tentate', await letture());
    registro.controlla('la foto NON è in coda',
      (await pagina.$$('.foto-anteprima')).length === 0);
    registro.controlla('in testa c’è la frase di QUESTO caso',
      /non ha lasciato leggere questa foto/.test(avviso),
      'la frase in testa è quella del caso, non una comune a tutti');
    registro.controlla('e dice che la foto è a posto',
      /La foto è a posto/.test(avviso) && /riprova a sceglierla/.test(avviso),
      'il 30/09 l’operatore è stato mandato a cercare un originale che aveva già in mano');
    registro.controlla('NON dice che manca la data di scatto',
      !/non ha la data di scatto/.test(avviso),
      'era falso: la data c’era, dentro il file, e non si è potuta leggere');
    registro.controlla('e non parla di copie ridotte né di cercare l’originale',
      !/copia ridotta/.test(avviso) && !/album Fotocamera/.test(avviso));
    registro.controlla('c’è il pulsante «Riprova»',
      (await pagina.$$('#lettura-riprova')).length === 1);
    registro.controlla('e NON c’è «Aggiungi comunque»',
      (await pagina.$$('#senza-data-comunque')).length === 0,
      'la manderebbe con un’ora stimata mentre quella vera sta nel file');
    registro.controlla('la riga di diagnosi dice nome, peso e tipo del file',
      /scatto-exif\.jpg/.test(avviso) && /image\/jpeg/.test(avviso) && /KB/.test(avviso));
    registro.controlla('quanti tentativi sono stati fatti, e in quanto tempo',
      /4 letture tentate in \d+[.,]\d s/.test(avviso),
      'senza i numeri non si distingue «non ci ha provato» da «ci ha provato quattro volte»');
    registro.controlla('e cosa ha detto il browser, parola per parola',
      /NotReadableError/.test(avviso) && /could not be read/.test(avviso),
      'è quello che fa arrivare in ufficio uno screenshot già diagnostico');

    registro.titolo('«Riprova» quando il telefono torna a collaborare');
    await risana();
    await pagina.click('#lettura-riprova');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1,
      'anteprima dopo Riprova', 60000);
    registro.controlla('la foto entra in coda',
      (await pagina.$$('.foto-anteprima')).length === 1);
    registro.controlla('e l’avviso sparisce',
      (await pagina.$eval('#avviso-senza-data', e => e.textContent.trim())) === '');
    const primaRiprova = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fineRiprova = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaRiprova && Date.now() < fineRiprova) {
      await new Promise(r => setTimeout(r, 300));
    }
    const dopo = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.controlla('con la sua ora vera, misurata',
      dopo.dataScatto === '2026-09-14T08:31:39+02:00' && dopo.scattoStimato === 'NO',
      `${dopo.dataScatto} · ${dopo.scattoStimato}`);
    registro.controlla('e coi byte originali',
      impronta(Buffer.from(dopo.contenutoBase64, 'base64')) === impronta(byteOriginali));

    // Il patch si toglie: resta in questa pagina, che viene chiusa, ma un
    // collaudo che sporca l'ambiente è un collaudo che fa fallire il prossimo.
    await pagina.evaluate(() => {
      if (window.__arrayBufferVero) Blob.prototype.arrayBuffer = window.__arrayBufferVero;
    });
    registro.controllaConsole(errori, ['NotReadableError', 'could not be read']);
    await contesto.close();
  },
};
