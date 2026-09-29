// Il modulo Foto cantiere: ogni foto va in archivio, e il contratto di invio è
// quello che il flow si aspetta. Un campo che cambia nome o tipo senza che
// nessuno se ne accorga è il modo più facile di far atterrare le foto in
// raccolta senza dati.
//
// Dal 29/09/2026 la scelta Avanzamento / Archivio non c'è più. Quello che
// resta da provare — ed è il punto delicato della modifica — è che il CAMPO
// `tipo` continui a viaggiare sempre valorizzato: a valle ci stanno appese due
// cose, il flow compone il nome del file da lì e lo script archiviatore prende
// solo gli elementi con `Tipo = ARCHIVIO`. Un `tipo` vuoto non darebbe nessun
// errore: la foto atterrerebbe in raccolta e ci resterebbe per sempre.
const fs = require('fs');
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const CAMPI_ATTESI = [
  'token', 'tipo', 'commessa', 'fase', 'operatore', 'nota', 'genere', 'estensione', 'mimeType',
  'durataSecondi', 'idClient', 'idDispositivo', 'progressivo', 'dataScatto', 'scattoStimato',
  // Dalla 0.36.0: i tre livelli dell'archivio. Viaggiano SEMPRE, anche
  // quando la fase non li prevede — in quel caso valgono `null`, che in
  // raccolta è «non si applica», mentre una stringa vuota somiglia a un dato.
  'piano', 'unita', 'prospetto',
  'versioneApp', 'nomeFile', 'contenutoBase64',
];

module.exports = {
  nome: 'Foto cantiere: tutto in archivio, e contratto di invio',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      foto: { endpoint: flow.endpoint('foto'), token: 'LLI-FOTO', conservaUltime: 10, limiteMB: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');

    registro.titolo('Niente più da scegliere sul tipo di foto');
    registro.controlla('il menù della categoria non esiste più',
      (await pagina.$$('#categoria')).length === 0,
      'non nascosto: assente. Dal 29/09/2026 tutto quello che parte dall’app va in archivio');
    registro.controlla('e non ne resta traccia negli aiuti a video',
      (await pagina.$$('#aiuto-categoria, #avviso-categoria')).length === 0);

    const originale = fs.statSync(materiale('foto-cantiere.jpg')).size;
    const manda = async nota => {
      const prima = flow.stato.ricevuti.length;
      await pagina.selectOption('#commessa', 'MAR');
      // `Cantiere` non pretende livelli: è il percorso veloce per una foto
      // generica, e qui serve a provare l'invio senza trascinarsi dentro la
      // regola dei livelli, che ha il suo collaudo.
      await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('MAR|'),
        'menù della fase pronto', 10000);
      await pagina.selectOption('#fase', 'Cantiere');
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

    registro.titolo('Ogni foto parte a risoluzione originale');
    const conNota = await manda('Getto solaio piano 3 completato');
    const byteConNota = Buffer.from(conNota.contenutoBase64, 'base64').length;
    registro.dice('sul telefono', `${(originale / 1048576).toFixed(2)} MB`);
    registro.dice('inviato', `${(byteConNota / 1048576).toFixed(2)} MB`);
    registro.controlla('partono i byte originali, senza ricodifica', byteConNota === originale,
      'la compressione a 2500 px serviva all’avanzamento, che non esiste più');
    registro.controlla('la nota arriva', conNota.nota === 'Getto solaio piano 3 completato');
    registro.controlla('la nota si svuota dopo l\'invio',
      (await pagina.$eval('#nota', e => e.value)) === '');

    registro.titolo('Il campo `tipo` resta, e non è mai vuoto');
    const archivio = await manda('');
    registro.dice('tipo ricevuto', JSON.stringify(archivio.tipo));
    registro.controlla('vale ARCHIVIO', archivio.tipo === 'ARCHIVIO');
    registro.controlla('e non è vuoto su nessuno degli invii',
      flow.stato.ricevuti.every(r => r.tipo === 'ARCHIVIO'),
      'il flow compone il nome del file da qui e lo script archiviatore prende solo Tipo = ARCHIVIO: un campo vuoto lascerebbe la foto in raccolta per sempre, senza nessun errore');
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
