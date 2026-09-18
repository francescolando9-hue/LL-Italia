// L'ora dello scatto deve essere l'ora dello SCATTO, non quella dell'invio.
//
// Il difetto misurato in produzione il 14/09/2026: due foto d'archivio di
// SNZ2.2 scattate alle 08:31:39 e alle 08:31:42 sono atterrate in raccolta con
// `DataScatto` 202609140915 tutt'e due — l'ora in cui l'operatore ha premuto
// Invia. Per l'archivio di commessa l'ora dello scatto è il dato, e un'ora
// sbagliata non fa rumore: si legge come buona.
//
// Il fuso del telefono è fissato a Europe/Rome, altrimenti le attese
// cambierebbero a seconda di dove gira il collaudo — e la macchina che lo
// esegue di solito sta a UTC.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const FUSO = 'Europe/Rome';

module.exports = {
  nome: 'Ora dello scatto: EXIF, non ora dell’invio',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser, { timezoneId: FUSO });
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');

    const manda = async (tipo, file) => {
      const prima = flow.stato.ricevuti.length;
      await pagina.selectOption('#categoria', tipo);
      await pagina.selectOption('#commessa', 'SNZ2.2');
      await pagina.setInputFiles('#input-galleria', [materiale(file)]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await pagina.click('#invia');
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 300));
      }
      return flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    };

    // Dalla 0.36.0 una foto di galleria senza ora dello scatto NON entra in
    // coda da sola: compare un avviso, e si decide. Questo aiutante fa la
    // strada lunga — avviso, «Aggiungi comunque», invio — perché è quella che
    // l'operatore fa davvero.
    const mandaComunque = async (tipo, file) => {
      const prima = flow.stato.ricevuti.length;
      await pagina.selectOption('#categoria', tipo);
      await pagina.selectOption('#commessa', 'SNZ2.2');
      await pagina.setInputFiles('#input-galleria', [materiale(file)]);
      await pagina.waitForSelector('#senza-data-comunque', { timeout: 60000 });
      await pagina.click('#senza-data-comunque');
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await pagina.click('#invia');
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 300));
      }
      return flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    };

    // Data di oggi come la vede il telefono del collaudo: serve a riconoscere
    // un ripiego, che per definizione porta l'ora di adesso.
    const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: FUSO });

    registro.titolo('Archivio: l’ora viene dall’EXIF, col fuso scritto nella foto');
    const archivio = await manda('ARCHIVIO', 'scatto-exif.jpg');
    registro.dice('dataScatto ricevuta dal flow', archivio.dataScatto);
    registro.dice('ora dell’invio (oggi)', oggi);
    registro.controlla('è l’ora dello scatto, al secondo',
      archivio.dataScatto === '2026-09-14T08:31:39+02:00',
      'DateTimeOriginal 2026:09:14 08:31:39 con OffsetTimeOriginal +02:00');
    registro.controlla('e NON è l’ora dell’invio',
      Math.abs(new Date(archivio.dataScatto).getTime() - Date.now()) > 60000,
      `l’invio è appena avvenuto, lo scatto no: sono ${Math.round(Math.abs(new Date(archivio.dataScatto).getTime() - Date.now()) / 60000)} minuti di distanza`);
    registro.controlla('dichiarata misurata, non stimata', archivio.scattoStimato === 'NO', archivio.scattoStimato);

    registro.titolo('Avanzamento: l’EXIF si legge PRIMA di ricomprimere');
    // È il caso che conta davvero: la compressione dell'avanzamento passa per
    // un canvas, e dal canvas l'EXIF non esce. Se l'ora si leggesse dopo, non
    // si leggerebbe affatto — e il difetto tornerebbe solo su una categoria.
    const avanzamento = await manda('AVANZAMENTO', 'scatto-exif-mm.jpg');
    const byte = Buffer.from(avanzamento.contenutoBase64, 'base64');
    const portaExif = byte.includes(Buffer.from('Exif', 'ascii'));
    registro.dice('dataScatto ricevuta dal flow', avanzamento.dataScatto);
    registro.dice('i byte inviati contengono EXIF?', portaExif ? 'sì' : 'no');
    registro.controlla('i byte ricompressi hanno perso l’EXIF', !portaExif,
      'è la prova che la lettura non può avvenire dopo la preparazione');
    registro.controlla('ma l’ora dello scatto è arrivata lo stesso',
      avanzamento.dataScatto === '2026-01-15T09:00:00+01:00',
      'ordine dei byte MM (iPhone) e nessun tag del fuso: si legge come ora locale');
    registro.controlla('il fuso è quello del giorno dello scatto, non di oggi',
      String(avanzamento.dataScatto).endsWith('+01:00'),
      'a gennaio in Italia è +01:00: applicare il fuso di oggi (+02:00) sposterebbe di un’ora');
    registro.controlla('dichiarata misurata', avanzamento.scattoStimato === 'NO', avanzamento.scattoStimato);

    registro.titolo('Copia ridotta senza EXIF: si ferma e si chiede, non si stima in silenzio');
    // Il caso vero del 17/09/2026. `copia-whatsapp.jpg` ha lato lungo 1600 px,
    // nessun EXIF, e la data del FILE messa a un mese prima di proposito:
    // serve a distinguere il ripiego giusto (data del file) da quello
    // sbagliato (ora dell'invio), che con un file di oggi darebbero lo stesso
    // risultato — e una prova così non proverebbe niente.
    await pagina.selectOption('#categoria', 'ARCHIVIO');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await pagina.setInputFiles('#input-galleria', [materiale('copia-whatsapp.jpg')]);
    await pagina.waitForSelector('#senza-data-comunque', { timeout: 60000 });
    const avviso = await pagina.$eval('#avviso-senza-data', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso a video', avviso);
    registro.controlla('l’avviso dice che la data di scatto manca', /data di scatto/i.test(avviso));
    registro.controlla('e indica dove sta l’originale', /Fotocamera/.test(avviso),
      'la via d’uscita giusta è l’album Fotocamera, e va detta prima dell’altra');
    registro.controlla('la foto NON è ancora in coda',
      (await pagina.$$('.foto-anteprima')).length === 0,
      'accodarla in silenzio, stimando, è esattamente il difetto del 17/09');
    registro.controlla('e Invia resta spento',
      await pagina.$eval('#invia', e => e.disabled));

    const primaCopia = flow.stato.ricevuti.length;
    await pagina.click('#senza-data-comunque');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await pagina.selectOption('#fase', 'Bonifica');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    const fineCopia = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaCopia && Date.now() < fineCopia) {
      await new Promise(r => setTimeout(r, 300));
    }
    const copia = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('dataScatto ricevuta dal flow', copia.dataScatto);
    registro.controlla('mandata comunque, porta la data del FILE',
      String(copia.dataScatto).startsWith('2026-08-20'), copia.dataScatto);
    registro.controlla('e NON l’ora dell’invio',
      !String(copia.dataScatto).startsWith(oggi),
      'è il punto: scatto ad agosto e invio a settembre finivano nella cartella di settembre');
    registro.controlla('dichiarata stimata', copia.scattoStimato === 'SI',
      'la data del file è un ripiego ragionevole, non una misura');

    registro.titolo('EXIF presente ma assurdo: vale come assente');
    const assurda = await mandaComunque('ARCHIVIO', 'scatto-exif-assurda.jpg');
    registro.dice('EXIF 1970:01:01 → dataScatto', assurda.dataScatto);
    registro.controlla('una data assurda non viene mandata',
      !String(assurda.dataScatto).startsWith('1970'), assurda.dataScatto);
    registro.controlla('ed è dichiarata stimata', assurda.scattoStimato === 'SI',
      'l’orologio mai impostato del telefono non è un’ora di scatto');

    registro.titolo('Scatto fatto dentro l’app: l’ora è quella del momento');
    const prima = flow.stato.ricevuti.length;
    await pagina.selectOption('#categoria', 'ARCHIVIO');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await pagina.click('#apri-fotocamera');
    await pagina.waitForSelector('.fotocamera-scatta:not([disabled])', { timeout: 30000 });
    const istante = Date.now();
    await pagina.click('.fotocamera-scatta');
    await pagina.waitForSelector('.fotocamera-fine:not([disabled])', { timeout: 30000 });
    await pagina.click('.fotocamera-fine');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await pagina.click('#invia');
    const fine = Date.now() + 90000;
    while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
      await new Promise(r => setTimeout(r, 300));
    }
    const interna = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('dataScatto della foto scattata in-app', interna.dataScatto);
    registro.controlla('è l’ora dello scatto, non serve l’EXIF',
      Math.abs(new Date(interna.dataScatto).getTime() - istante) < 120000,
      'il fotogramma esce da un canvas e di EXIF non ne ha: l’ora si sa perché è adesso');
    registro.controlla('ed è misurata, non stimata', interna.scattoStimato === 'NO', interna.scattoStimato);

    registro.titolo('Il campo viaggia sempre, in una forma sola');
    const tutte = flow.stato.ricevuti;
    registro.controlla('ogni invio porta dataScatto in ISO con fuso',
      tutte.every(r => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(String(r.dataScatto))),
      'la forma non cambia: è il flow a compattarla a 12 cifre');
    registro.controlla('e scattoStimato vale sempre SI o NO',
      tutte.every(r => r.scattoStimato === 'SI' || r.scattoStimato === 'NO'),
      'testo, non booleano: le colonne Sì/No sono quelle che il connettore riscrive');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
