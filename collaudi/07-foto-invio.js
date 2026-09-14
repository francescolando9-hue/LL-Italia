// Il modulo Foto cantiere: le due categorie decidono come l'immagine viene
// preparata, e il contratto di invio è quello che il flow si aspetta. Un campo
// che cambia nome o tipo senza che nessuno se ne accorga è il modo più facile
// di far atterrare le foto in raccolta senza dati.
const fs = require('fs');
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const CAMPI_ATTESI = [
  'token', 'tipo', 'commessa', 'operatore', 'nota', 'genere', 'estensione', 'mimeType',
  'durataSecondi', 'idClient', 'idDispositivo', 'progressivo', 'dataScatto', 'versioneApp',
  'nomeFile', 'contenutoBase64',
];

module.exports = {
  nome: 'Foto cantiere: categorie e contratto di invio',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#categoria');

    registro.titolo('La categoria si sceglie prima di scattare');
    const categorie = await pagina.$$eval('#categoria option', o => o.map(e => e.textContent.trim()));
    registro.dice('categorie a video', categorie);
    registro.controlla('sono le due concordate',
      categorie.includes('Avanzamento lavori') && categorie.includes('Da archiviare sul server'));
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    const avviso = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('#avviso-foto');
      return e && e.textContent.trim() ? e.textContent.replace(/\s+/g, ' ').trim() : false;
    }, 'avviso categoria mancante', 30000);
    registro.dice('senza categoria', avviso);
    registro.controlla('senza categoria non accoda nulla',
      (await pagina.$$eval('.foto-anteprima', e => e.length)) === 0,
      'la categoria decide come la foto viene preparata: sceglierla dopo sarebbe una bugia');

    const originale = fs.statSync(materiale('foto-cantiere.jpg')).size;
    const manda = async (tipo, nota) => {
      const prima = flow.stato.ricevuti.length;
      await pagina.selectOption('#categoria', tipo);
      await pagina.selectOption('#commessa', 'MAR');
      await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      if (nota) await pagina.fill('#nota', nota);
      await pagina.click('#invia');
      // Si aspetta che il flow abbia davvero ricevuto: i contatori a video
      // cambiano un attimo prima, e leggerli non dimostra che il payload sia
      // arrivato.
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 300));
      }
      return flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    };

    registro.titolo('Avanzamento: compressa per partire anche con poca rete');
    const avanzamento = await manda('AVANZAMENTO', 'Getto solaio piano 3 completato');
    const byteAvanzamento = Buffer.from(avanzamento.contenutoBase64, 'base64').length;
    registro.dice('sul telefono', `${(originale / 1048576).toFixed(2)} MB`);
    registro.dice('inviato', `${(byteAvanzamento / 1048576).toFixed(2)} MB`);
    registro.controlla('l\'avanzamento viaggia compresso', byteAvanzamento < originale / 2);
    registro.controlla('la nota arriva', avanzamento.nota === 'Getto solaio piano 3 completato');
    registro.controlla('il tipo arriva', avanzamento.tipo === 'AVANZAMENTO');
    registro.controlla('la nota si svuota dopo l\'invio',
      (await pagina.$eval('#nota', e => e.value)) === '');

    registro.titolo('Archivio: byte originali, senza ricodifica');
    const archivio = await manda('ARCHIVIO', '');
    const byteArchivio = Buffer.from(archivio.contenutoBase64, 'base64').length;
    registro.dice('inviato', `${(byteArchivio / 1048576).toFixed(2)} MB`);
    registro.controlla('per l\'archivio partono i byte originali', byteArchivio === originale,
      'ricomprimere «a qualità massima» degraderebbe l\'immagine senza alcun vantaggio');
    registro.controlla('la nota vuota resta vuota, non diventa altro', archivio.nota === '');

    registro.titolo('Il contratto di invio');
    registro.dice('campi', Object.keys(archivio));
    registro.controlla('ci sono tutti i campi attesi',
      CAMPI_ATTESI.every(c => c in archivio),
      CAMPI_ATTESI.filter(c => !(c in archivio)).join(', ') || 'nessuno mancante');
    registro.controlla('nessun campo in più non dichiarato',
      Object.keys(archivio).every(c => CAMPI_ATTESI.includes(c)),
      Object.keys(archivio).filter(c => !CAMPI_ATTESI.includes(c)).join(', ') || 'nessuno');
    registro.controlla('progressivo e durataSecondi sono numeri',
      typeof archivio.progressivo === 'number' && typeof archivio.durataSecondi === 'number',
      'una stringa vuota fa fallire la scrittura delle colonne e il file atterra senza dati');
    registro.controlla('idDispositivo è un GUID',
      /^[0-9a-f-]{36}$/i.test(String(archivio.idDispositivo)), archivio.idDispositivo);
    registro.controlla('dataScatto è ISO con fuso',
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(String(archivio.dataScatto)),
      `${archivio.dataScatto} — è il flow che la compatta a 12 cifre, l'app manda ISO`);
    registro.controlla('la sequenza delle foto è partita da 1',
      flow.stato.ricevuti.map(r => r.progressivo).join(',') === '1,2');

    registro.titolo('Il limite di peso');
    const finto = materiale('video-finto.mp4');
    await pagina.setInputFiles('#input-video', [finto]);
    const rifiuto = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('#avviso-foto .avviso-attenzione');
      return e ? e.textContent.replace(/\s+/g, ' ').trim() : false;
    }, 'avviso di peso eccessivo', 60000);
    registro.dice('messaggio', rifiuto);
    registro.controlla('un file oltre il limite non entra in coda',
      (await pagina.$$eval('.foto-anteprima', e => e.length)) === 0,
      'accodarlo significherebbe farlo ritentare a vuoto per sempre');
    registro.controlla('e il flow non ha ricevuto altro', flow.stato.ricevuti.length === 2);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
