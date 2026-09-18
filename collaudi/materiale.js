// Genera le foto e i file di prova dei collaudi, in `collaudi/materiale/`.
//
// Perché generati e non committati: sono megabyte di roba che nel repo non
// servono a nessuno, e un repo pubblico non deve portarsi dietro immagini di
// cantiere. Qui si fabbricano al volo, con dimensioni ripetibili.
//
// Si eseguono una volta sola: se i file ci sono già non li rifà. Per rifarli
// da capo, cancella la cartella `collaudi/materiale/`.
//
//   node collaudi/materiale.js
const fs = require('fs');
const path = require('path');
const { apriBrowser, MATERIALE } = require('./aiuto');
const { conExif } = require('./exif-finto');

// Un JPEG di larghezza e peso governabili: il rumore impedisce al compressore
// di fare miracoli, ed è quello che rende credibile una foto da 12 MB.
async function generaJpeg(pagina, { larghezza, altezza, qualita, rumore, testo }) {
  return pagina.evaluate(async ({ larghezza, altezza, qualita, rumore, testo }) => {
    const tela = document.createElement('canvas');
    tela.width = larghezza; tela.height = altezza;
    const ctx = tela.getContext('2d');
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, larghezza, altezza);
    if (rumore > 0) {
      const immagine = ctx.getImageData(0, 0, larghezza, altezza);
      const dati = immagine.data;
      for (let i = 0; i < dati.length; i += 4) {
        const scarto = (Math.random() - 0.5) * rumore;
        dati[i] = Math.max(0, Math.min(255, dati[i] + scarto));
        dati[i + 1] = Math.max(0, Math.min(255, dati[i + 1] + scarto));
        dati[i + 2] = Math.max(0, Math.min(255, dati[i + 2] + scarto));
      }
      ctx.putImageData(immagine, 0, 0);
    }
    // Qualche riga di testo: le bolle sono fogli scritti, e il controllo di
    // leggibilità misura proprio il contrasto dei bordi.
    ctx.fillStyle = '#1a1a1a';
    const corpo = Math.max(18, Math.round(altezza / 28));
    ctx.font = `bold ${corpo}px sans-serif`;
    ctx.fillText(testo, Math.round(larghezza * 0.06), Math.round(altezza * 0.12));
    ctx.font = `${corpo}px sans-serif`;
    for (let riga = 1; riga <= 8; riga += 1) {
      ctx.fillText(
        `Riga ${riga} — articolo ${1000 + riga} — quantita ${riga * 3} — prezzo ${riga * 12},00`,
        Math.round(larghezza * 0.06),
        Math.round(altezza * (0.12 + riga * 0.07)),
      );
    }
    const url = tela.toDataURL('image/jpeg', qualita);
    return url.split(',')[1];
  }, { larghezza, altezza, qualita, rumore, testo });
}

// Alza la qualità finché il file non raggiunge il peso voluto: serve a
// riprodurre il «caso peggiore» senza andare a tentativi a mano.
async function generaFinoA(pagina, base, byteMinimi) {
  let qualita = base.qualita;
  let dati = await generaJpeg(pagina, { ...base, qualita });
  while (Buffer.from(dati, 'base64').length < byteMinimi && qualita < 1) {
    qualita = Math.min(1, qualita + 0.02);
    dati = await generaJpeg(pagina, { ...base, qualita });
  }
  return Buffer.from(dati, 'base64');
}

const mb = n => `${(n / 1048576).toFixed(2)} MB`;

(async () => {
  fs.mkdirSync(MATERIALE, { recursive: true });
  const atteso = [
    'bolla.jpg', 'bolla2.jpg', 'foto-cantiere.jpg', 'foto-pesante.jpg', 'video-finto.mp4',
    'scatto-exif.jpg', 'scatto-exif-mm.jpg', 'scatto-exif-assurda.jpg', 'copia-whatsapp.jpg',
  ];
  if (atteso.every(n => fs.existsSync(path.join(MATERIALE, n)))) {
    console.log('Materiale già presente in', MATERIALE);
    for (const nome of atteso) {
      console.log('  ', nome, mb(fs.statSync(path.join(MATERIALE, nome)).size));
    }
    return;
  }

  // Si rifà solo quello che manca: rigenerare da capo la foto da 11 MB per
  // aggiungere un file da 300 KB è tempo buttato a ogni collaudo nuovo.
  const serve = nome => !fs.existsSync(path.join(MATERIALE, nome));

  const browser = await apriBrowser();
  const pagina = await (await browser.newContext()).newPage();
  await pagina.goto('about:blank');

  const files = [
    ['bolla.jpg', { larghezza: 1600, altezza: 2133, qualita: 0.8, rumore: 10, testo: 'BOLLA DI CONSEGNA 1' }],
    ['bolla2.jpg', { larghezza: 1600, altezza: 2133, qualita: 0.8, rumore: 10, testo: 'BOLLA DI CONSEGNA 2' }],
    // Come una foto di telefono: 4032 x 3024.
    // **Con l'EXIF**, dalla 0.36.0: è la foto «normale» di quasi tutti i
    // collaudi, e una foto che arriva da un telefono vero l'ora dello scatto
    // ce l'ha. Senza, l'app la fermerebbe con l'avviso delle copie ridotte —
    // giustamente — e ogni collaudo che aggiunge una foto dalla galleria
    // misurerebbe quell'avviso invece della cosa che vuole provare.
    ['foto-cantiere.jpg', { larghezza: 4032, altezza: 3024, qualita: 0.85, rumore: 40, testo: 'CANTIERE MAR' },
      { data: '2026:09:12 10:22:05', offset: '+02:00' }],
  ];
  for (const [nome, opzioni, exif] of files) {
    if (!serve(nome)) continue;
    let dati = Buffer.from(await generaJpeg(pagina, opzioni), 'base64');
    if (exif) dati = conExif(dati, exif);
    fs.writeFileSync(path.join(MATERIALE, nome), dati);
    console.log('  scritto', nome, mb(dati.length), exif ? `(DateTimeOriginal ${exif.data})` : '');
  }

  // Il caso peggiore dichiarato nel README: una foto d'archivio pesante.
  if (serve('foto-pesante.jpg')) {
    const pesante = await generaFinoA(
      pagina,
      { larghezza: 4032, altezza: 3024, qualita: 0.92, rumore: 120, testo: 'CANTIERE MAR — ARCHIVIO' },
      11 * 1048576,
    );
    const conOra = conExif(pesante, { data: '2026:09:12 10:24:40', offset: '+02:00' });
    fs.writeFileSync(path.join(MATERIALE, 'foto-pesante.jpg'), conOra);
    console.log('  scritto foto-pesante.jpg', mb(conOra.length), '(DateTimeOriginal 2026:09:12 10:24:40)');
  }

  // Foto con l'ora dello scatto scritta dentro, come le fa un telefono.
  // Servono a provare che `dataScatto` è l'ora dello scatto e non quella
  // dell'invio: senza EXIF nel materiale, il collaudo non potrebbe distinguere
  // le due cose, che è esattamente l'errore costato il difetto del 14/09/2026.
  // Le date NON sono di comodo: 08:31:39 e 08:31:42 sono quelle delle due foto
  // di SNZ2.2 atterrate in raccolta con l'ora dell'invio.
  const conData = [
    // Ordine II (gran parte degli Android) e fuso scritto dentro: l'app deve
    // usare QUELLO, non il fuso del telefono che sta inviando.
    ['scatto-exif.jpg', { data: '2026:09:14 08:31:39', offset: '+02:00' }],
    // Ordine MM (iPhone) e nessun tag del fuso: si legge come ora locale del
    // dispositivo. Data d'inverno di proposito — in Italia quel giorno l'offset
    // è +01:00, e chi applicasse il fuso di oggi sbaglierebbe di un'ora.
    ['scatto-exif-mm.jpg', { data: '2026:01:15 09:00:00', grandeInTesta: true }],
    // Orologio mai impostato: il tag c'è ma la data non vale niente, e mandarla
    // sarebbe peggio che dichiararla stimata.
    ['scatto-exif-assurda.jpg', { data: '1970:01:01 00:00:00' }],
  ];
  if (conData.some(([nome]) => serve(nome))) {
    const base = Buffer.from(await generaJpeg(pagina, {
      larghezza: 1600, altezza: 1200, qualita: 0.85, rumore: 30, testo: 'CANTIERE SNZ2.2 — ARCHIVIO',
    }), 'base64');
    for (const [nome, exif] of conData) {
      if (!serve(nome)) continue;
      const dati = conExif(base, exif);
      fs.writeFileSync(path.join(MATERIALE, nome), dati);
      console.log('  scritto', nome, mb(dati.length), `(DateTimeOriginal ${exif.data}${exif.offset ? ' ' + exif.offset : ', senza fuso'})`);
    }
  }

  // La copia ridotta SENZA EXIF: il caso vero del 17/09/2026. Cinque foto
  // scelte dalla galleria erano copie fatte da Google Foto dopo «Libera
  // spazio», o da WhatsApp: lato lungo 1600 px e nessun EXIF. L'app ha stimato
  // `DataScatto` = ora dell'invio e in archivio sono finite con un'ora falsa.
  //
  // **La data del FILE si mette indietro di proposito, a un mese prima.** È
  // l'unico modo di provare la regola sul caso che può fallire: se l'app
  // ripiegasse sull'ora dell'invio invece che su `lastModified`, la foto
  // finirebbe nella cartella del mese sbagliato — e con una data di file di
  // oggi il collaudo non saprebbe distinguere le due cose. Con la data
  // indietro, sì.
  if (serve('copia-whatsapp.jpg')) {
    const copia = Buffer.from(await generaJpeg(pagina, {
      larghezza: 1600, altezza: 1200, qualita: 0.7, rumore: 20, testo: 'COPIA RIDOTTA — SENZA EXIF',
    }), 'base64');
    const dove = path.join(MATERIALE, 'copia-whatsapp.jpg');
    fs.writeFileSync(dove, copia);
    const dataFile = new Date('2026-08-20T10:15:00+02:00');
    fs.utimesSync(dove, dataFile, dataFile);
    console.log('  scritto copia-whatsapp.jpg', mb(copia.length), '(senza EXIF, data del file 2026-08-20)');
  }

  // Un «video» che serve solo per il controllo del peso: l'app rifiuta i file
  // oltre il limite PRIMA di provare a decodificarli, quindi non serve che sia
  // un filmato vero. Dove serve davvero un filmato si prova sul telefono, e il
  // collaudo lo dichiara invece di fingere.
  if (serve('video-finto.mp4')) {
    const finto = Buffer.alloc(25 * 1048576);
    finto.write('ftypisom', 4, 'ascii');
    for (let i = 0; i < finto.length; i += 4096) finto[i] = i % 251;
    fs.writeFileSync(path.join(MATERIALE, 'video-finto.mp4'), finto);
    console.log('  scritto video-finto.mp4', mb(finto.length), '(non decodificabile, serve solo al limite di peso)');
  }

  await browser.close();
  console.log('Materiale pronto in', MATERIALE);
})().catch(e => { console.error('FALLITO:', e.message); process.exit(1); });
