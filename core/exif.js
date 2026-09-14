// L'ora dello scatto, letta dalla foto.
//
// PERCHÉ ESISTE. Fino alla 0.28.0 il campo `dataScatto` che l'app manda al
// flow era l'ora in cui la foto entrava in coda, cioè **l'ora dell'invio**.
// Misurato in produzione il 14/09/2026: due foto d'archivio scattate alle
// 08:31:39 e alle 08:31:42 sono atterrate in raccolta con `DataScatto`
// 202609140915 tutt'e due — l'ora in cui l'operatore ha premuto Invia. Per una
// foto scattata la mattina e mandata la sera lo scarto è di ore, e in raccolta
// non resta traccia del fatto che il numero sia sbagliato: si legge come
// un'ora di scatto, e per l'archivio di commessa l'ora dello scatto è il dato.
//
// COSA FA. Legge il tag EXIF `DateTimeOriginal` (0x9003) dal file **originale**
// — prima di qualunque ricodifica, perché la compressione dell'avanzamento
// (2500 px, qualità 0,85) passa per un canvas e il canvas l'EXIF lo butta via.
// Se c'è anche `OffsetTimeOriginal` (0x9011) il fuso è quello; altrimenti le
// cifre si leggono come ora **locale del dispositivo**, mai come UTC: l'EXIF
// non ha un fuso implicito, e leggerlo come UTC sposterebbe ogni foto italiana
// di due ore indietro. Con l'ora locale il caso peggiore è che la foto arrivi
// da un altro fuso; leggendola come UTC sbaglierebbero tutte.
//
// NIENTE LIBRERIA. Lo stack è vincolato (vanilla, nessuna dipendenza a
// runtime) e qui non serve: bastano i primi 128 KB del file e una scansione
// dei marcatori JPEG fino all'APP1. Non si decodifica l'immagine, non si tocca
// il contenuto, non si riscrive niente.
//
// COSA NON FA, di proposito:
//  - non legge `DateTime` (0x0132), che è l'ora dell'ULTIMA MODIFICA del file:
//    su una foto ritagliata o ri-salvata è l'ora del ritaglio, e finirebbe in
//    raccolta come ora di scatto senza che nessuno possa accorgersene;
//  - non legge `lastModified` del file, che per una foto copiata o scaricata è
//    l'ora della copia;
//  - non legge l'EXIF dentro HEIC/HEIF, che non è in un APP1 ma in una scatola
//    del contenitore ISO-BMFF: lì servirebbe un parser vero.
// In tutti e tre i casi il dato *sembrerebbe* un'ora di scatto. Meglio dire
// «stimata» che dire un'ora precisa e sbagliata.

import { timestampDispositivo, timestampConOffset } from './orario.js';

// L'EXIF sta all'inizio del file, subito dopo il marcatore di apertura: 128 KB
// sono abbondanti anche con una miniatura EXIF grande, e leggere solo la testa
// evita di tirare in memoria un file da 12 MB per sei byte di data.
const TESTA = 131072;

const TAG_DATA_ORIGINALE = 0x9003;
const TAG_OFFSET_ORIGINALE = 0x9011;
const TAG_PUNTATORE_EXIF = 0x8769;

// Sotto il 2010 non è una foto di cantiere: è l'orologio del telefono partito
// da zero (1970, 2001, 2008 a seconda del sistema). Sopra l'oggi + un giorno è
// un orologio avanti. In entrambi i casi il numero è peggio di niente, perché
// in raccolta si legge come una data buona.
const ANNO_MINIMO = 2010;
const TOLLERANZA_FUTURO = 24 * 60 * 60 * 1000;

// Risultato: `{ dataScatto, pezzi, offsetMinuti }` se l'ora dello scatto è
// stata letta davvero; `null` in ogni altro caso — chi chiama ripiega, e lo
// dichiara. `motivo` dice perché, e serve alle diagnosi, non all'operatore.
export async function dataScattoDaFoto(file) {
  try {
    const testa = await primiByte(file, TESTA);
    if (!testa) return esito(null, 'file non leggibile');
    const vista = new DataView(testa);
    const inizioTiff = trovaExif(vista);
    if (inizioTiff < 0) return esito(null, 'nessun blocco EXIF nel file');
    const tag = leggiTag(vista, inizioTiff);
    if (!tag.dataOriginale) return esito(null, 'EXIF presente ma senza DateTimeOriginal');
    return interpreta(tag.dataOriginale, tag.offsetOriginale);
  } catch (errore) {
    // Un file corrotto o troncato non deve poter impedire l'invio di una foto:
    // si ripiega sull'ora di accodamento e si dichiara stimata.
    return esito(null, `lettura EXIF non riuscita: ${errore.message}`);
  }
}

function esito(dati, motivo) {
  return dati ? { ...dati, motivo: '' } : { dataScatto: '', motivo };
}

function primiByte(file, quanti) {
  const fetta = typeof file.slice === 'function' ? file.slice(0, quanti) : file;
  if (typeof fetta.arrayBuffer === 'function') return fetta.arrayBuffer();
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(lettore.result);
    lettore.onerror = () => rifiuta(new Error('file non leggibile'));
    lettore.readAsArrayBuffer(fetta);
  });
}

// Scansione dei marcatori JPEG fino all'APP1 che porta l'EXIF. L'APP1 non è
// per forza il primo segmento: quasi tutte le fotocamere scrivono prima un
// APP0 (JFIF), e cercare l'EXIF solo in testa lo mancherebbe.
// Restituisce l'offset del **TIFF header**, che è l'origine di tutti gli
// offset interni all'EXIF.
function trovaExif(vista) {
  if (vista.byteLength < 4 || vista.getUint16(0) !== 0xFFD8) return -1;
  let posizione = 2;
  while (posizione + 4 <= vista.byteLength) {
    if (vista.getUint8(posizione) !== 0xFF) return -1;
    const marcatore = vista.getUint8(posizione + 1);
    // Riempimento: alcuni encoder mettono FF di troppo prima di un marcatore.
    if (marcatore === 0xFF) { posizione += 1; continue; }
    // SOS o EOI: da qui in poi ci sono i pixel, i metadati sono finiti.
    if (marcatore === 0xDA || marcatore === 0xD9) return -1;
    const lunghezza = vista.getUint16(posizione + 2);
    if (lunghezza < 2) return -1;
    if (marcatore === 0xE1 && posizione + 10 <= vista.byteLength && firmaExif(vista, posizione + 4)) {
      return posizione + 10;
    }
    posizione += 2 + lunghezza;
  }
  return -1;
}

// «Exif\0\0»: un APP1 può anche portare XMP, che comincia con un URL.
function firmaExif(vista, dove) {
  return vista.getUint8(dove) === 0x45 && vista.getUint8(dove + 1) === 0x78
    && vista.getUint8(dove + 2) === 0x69 && vista.getUint8(dove + 3) === 0x66
    && vista.getUint8(dove + 4) === 0x00 && vista.getUint8(dove + 5) === 0x00;
}

// Il TIFF header dice l'ordine dei byte — «II» piccolo in testa (Android),
// «MM» grande in testa (iPhone) — e dove comincia la prima IFD.
function leggiTag(vista, inizioTiff) {
  if (inizioTiff + 8 > vista.byteLength) return {};
  const ordine = vista.getUint16(inizioTiff);
  if (ordine !== 0x4949 && ordine !== 0x4D4D) return {};
  const piccoloInTesta = ordine === 0x4949;
  if (vista.getUint16(inizioTiff + 2, piccoloInTesta) !== 42) return {};

  const trovati = {};
  const ifd0 = vista.getUint32(inizioTiff + 4, piccoloInTesta);
  // I tag della data stanno nella sotto-IFD Exif; qualche produttore li scrive
  // anche nella IFD0, e leggerle entrambe non costa niente.
  raccogli(vista, inizioTiff, ifd0, piccoloInTesta, trovati);
  if (trovati.puntatoreExif) {
    raccogli(vista, inizioTiff, trovati.puntatoreExif, piccoloInTesta, trovati);
  }
  return trovati;
}

function raccogli(vista, inizioTiff, offsetIfd, piccoloInTesta, trovati) {
  const inizio = inizioTiff + offsetIfd;
  if (offsetIfd <= 0 || inizio + 2 > vista.byteLength) return;
  const quante = vista.getUint16(inizio, piccoloInTesta);
  // Una IFD con migliaia di voci è un file corrotto, non una foto: meglio
  // fermarsi che scorrere spazzatura.
  if (quante > 512) return;
  for (let i = 0; i < quante; i += 1) {
    const voce = inizio + 2 + i * 12;
    if (voce + 12 > vista.byteLength) return;
    const tag = vista.getUint16(voce, piccoloInTesta);
    if (tag === TAG_PUNTATORE_EXIF) {
      trovati.puntatoreExif = vista.getUint32(voce + 8, piccoloInTesta);
    } else if (tag === TAG_DATA_ORIGINALE && !trovati.dataOriginale) {
      trovati.dataOriginale = leggiAscii(vista, inizioTiff, voce, piccoloInTesta);
    } else if (tag === TAG_OFFSET_ORIGINALE && !trovati.offsetOriginale) {
      trovati.offsetOriginale = leggiAscii(vista, inizioTiff, voce, piccoloInTesta);
    }
  }
}

// Valore ASCII di una voce: se sta in quattro byte è scritto lì dentro,
// altrimenti i quattro byte sono l'offset dove trovarlo, contato dall'inizio
// del TIFF header e non dall'inizio del file.
function leggiAscii(vista, inizioTiff, voce, piccoloInTesta) {
  const tipo = vista.getUint16(voce + 2, piccoloInTesta);
  if (tipo !== 2) return '';
  const quanti = vista.getUint32(voce + 4, piccoloInTesta);
  if (quanti === 0 || quanti > 64) return '';
  const dove = quanti <= 4 ? voce + 8 : inizioTiff + vista.getUint32(voce + 8, piccoloInTesta);
  if (dove < 0 || dove + quanti > vista.byteLength) return '';
  let testo = '';
  for (let i = 0; i < quanti; i += 1) {
    const byte = vista.getUint8(dove + i);
    if (byte === 0) break;
    testo += String.fromCharCode(byte);
  }
  return testo.trim();
}

// «2026:09:14 08:31:39» → la stringa che viaggia verso il flow.
function interpreta(dataOriginale, offsetOriginale) {
  const pezzi = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(dataOriginale);
  // Alcune fotocamere scrivono il tag pieno di spazi o di zeri quando la data
  // non è impostata: è un tag presente e vuoto, non un'ora.
  if (!pezzi) return esito(null, `DateTimeOriginal illeggibile: «${dataOriginale}»`);
  const [anno, mese, giorno, ore, minuti, secondi] = pezzi.slice(1).map(Number);
  const scomposta = { anno, mese, giorno, ore, minuti, secondi };

  const offsetMinuti = leggiOffset(offsetOriginale);
  // Senza offset le cifre sono ora locale del dispositivo: si costruisce la
  // data con i componenti locali, così il fuso applicato è quello in vigore
  // **quel giorno** — a fine ottobre l'ora legale cade, e usare l'offset di
  // oggi sposterebbe di un'ora le foto di ieri.
  const locale = new Date(anno, mese - 1, giorno, ore, minuti, secondi);
  if (locale.getFullYear() !== anno || locale.getMonth() !== mese - 1 || locale.getDate() !== giorno) {
    return esito(null, `DateTimeOriginal non è una data: «${dataOriginale}»`);
  }
  const istante = offsetMinuti === null
    ? locale.getTime()
    : Date.UTC(anno, mese - 1, giorno, ore, minuti, secondi) - offsetMinuti * 60000;
  if (anno < ANNO_MINIMO) return esito(null, `data assurda: anno ${anno}`);
  if (istante > Date.now() + TOLLERANZA_FUTURO) return esito(null, `data nel futuro: ${dataOriginale}`);

  return esito({
    dataScatto: offsetMinuti === null
      ? timestampDispositivo(locale)
      : timestampConOffset(scomposta, offsetMinuti),
    conOffsetProprio: offsetMinuti !== null,
  }, '');
}

function leggiOffset(testo) {
  const pezzi = /^([+-])(\d{2}):?(\d{2})$/.exec(String(testo || '').trim());
  if (!pezzi) return null;
  const minuti = Number(pezzi[2]) * 60 + Number(pezzi[3]);
  if (minuti > 14 * 60) return null;
  return pezzi[1] === '-' ? -minuti : minuti;
}
