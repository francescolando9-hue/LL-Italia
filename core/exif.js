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

// Risultato: `{ dataScatto, conOffsetProprio }` se l'ora dello scatto è stata
// letta davvero; `dataScatto: ''` in ogni altro caso — chi chiama ripiega, e lo
// dichiara.
//
// `motivo` dice QUALE dei nove casi è, e `dettaglio` cosa si è visto nel
// file. Dalla 0.37.2 arrivano **all'operatore**, non solo alle diagnosi: fino
// alla 0.37.1 i casi uscivano a video con una frase sola — «non ha la
// data di scatto, probabilmente è una copia ridotta» — e su tre foto di
// Paolo, scattate col telefono e scelte dalla galleria, quella frase non
// distingueva «non c'è nessun EXIF» da «l'EXIF c'è ma senza la data» da «la
// data c'è e non è plausibile». Tre cause diverse, tre correzioni diverse, e
// uno screenshot che non rispondeva a nessuna delle tre.
export async function dataScattoDaFoto(file) {
  const visti = [];
  try {
    const testa = await primiByte(file, TESTA);
    if (!testa) return esito(null, 'file non leggibile', '');
    const vista = new DataView(testa);
    // Non è nemmeno un JPEG: HEIC, PNG, un file rinominato. Caso a sé, e va
    // detto a sé: «nel file non ci sono i dati della fotocamera» a chi ha
    // mandato un HEIC è falso — i dati ci sono, è l'app che da quel formato
    // non li legge. Due cause diverse, due cose diverse da fare.
    if (!eJpegDaiByte(vista)) {
      return esito(null, 'non è un JPEG', `primi byte ${primiDue(vista)} · ${letti(vista)}`);
    }
    const inizioTiff = trovaExif(vista, visti);
    if (inizioTiff < 0) return esito(null, 'nessun blocco EXIF nel file', descrivi(vista, visti));
    const tag = leggiTag(vista, inizioTiff);
    if (!tag.dataOriginale) {
      return esito(null, 'EXIF presente ma senza DateTimeOriginal', descrivi(vista, visti));
    }
    return interpreta(tag.dataOriginale, tag.offsetOriginale);
  } catch (errore) {
    // Un file corrotto o troncato non deve poter impedire l'invio di una foto:
    // si ripiega sull'ora di accodamento e si dichiara stimata.
    return esito(null, `lettura EXIF non riuscita: ${errore.message}`, '');
  }
}

// --- La firma di un JPEG ----------------------------------------------------
//
// **Un JPEG si riconosce dai BYTE, non dal `type` del file.** Dalla 0.37.3 lo
// decidono qui tutti e due i punti che se lo chiedono — la lettura dell'ora
// (sotto) e la preparazione dell'immagine (`modules/foto/immagini.js`) — e per
// questo la funzione sta nella shell e non in un modulo.
//
// Perché non il `type`: quello che arriva nel `File` lo scrive il selettore del
// sistema operativo, e su Android capita `''` o `application/octet-stream` su
// file che sono JPEG perfetti (file passati per un gestore di file, scaricati,
// o arrivati da un'app che non dichiara il tipo). Finché i due punti
// rispondevano a fonti diverse, un file così veniva **ricodificato** dalla
// preparazione — senza nessun errore, perché la decodifica riesce — mentre
// l'ora si leggeva regolarmente: byte diversi dall'originale in archivio, cioè
// la promessa che l'archivio non deve rompere.
//
// Tre byte, non due: `FF D8` è il SOI, e il terzo `FF` è l'inizio del marcatore
// che segue — che in un JPEG c'è sempre. Due soli byte capitano anche in testa
// a dati che JPEG non sono.
const FIRMA = [0xFF, 0xD8, 0xFF];

export function eJpegDaiByte(vista) {
  if (!vista || vista.byteLength < FIRMA.length) return false;
  return FIRMA.every((byte, i) => vista.getUint8(i) === byte);
}

// Lo stesso controllo partendo dal file: legge i primi byte e basta.
// Restituisce `false` — non solleva — su un file che non si riesce a leggere:
// chi chiama tratterà quel file come «da convertire», e la conversione dirà di
// suo se non è possibile.
export async function eJpeg(file) {
  try {
    const testa = await primiByte(file, FIRMA.length);
    return eJpegDaiByte(testa ? new DataView(testa) : null);
  } catch {
    return false;
  }
}

function esito(dati, motivo, dettaglio = '') {
  return dati ? { ...dati, motivo: '', dettaglio: '' } : { dataScatto: '', motivo, dettaglio };
}

// Cosa si è visto nel file, in una riga. Sono i fatti che decidono la causa e
// che da uno screenshot non si possono indovinare: se è un JPEG, quanti byte
// si sono letti, e **quali segmenti** c'erano prima di arrendersi. Se fra i
// segmenti manca `APP1/Exif` il blocco non c'è; se c'è ma la data no, il
// problema è dentro l'EXIF; se non è nemmeno un JPEG, il resto non conta.
function descrivi(vista, visti) {
  const jpeg = eJpegDaiByte(vista);
  const testa = jpeg ? 'JPEG sì' : `non è un JPEG (primi byte ${primiDue(vista)})`;
  const segmenti = visti.length > 0 ? `segmenti ${visti.join(' ')}` : 'nessun segmento leggibile';
  return `${testa} · ${letti(vista)} · ${segmenti}`;
}

function letti(vista) {
  return `letti ${Math.round(vista.byteLength / 1024)} KiB`;
}

function primiDue(vista) {
  if (vista.byteLength < 2) return 'file troppo corto';
  const esa = n => n.toString(16).toUpperCase().padStart(2, '0');
  return `${esa(vista.getUint8(0))} ${esa(vista.getUint8(1))}`;
}

// Il nome di un marcatore, per la riga di diagnosi. Solo quelli che si
// incontrano davvero in testa a una foto: gli altri escono come numero.
function nomeMarcatore(marcatore, exif) {
  if (marcatore === 0xE0) return 'APP0';
  if (marcatore === 0xE1) return exif ? 'APP1/Exif' : 'APP1/XMP';
  if (marcatore >= 0xE2 && marcatore <= 0xEF) return `APP${marcatore - 0xE0}`;
  if (marcatore === 0xDB) return 'DQT';
  if (marcatore === 0xC0 || marcatore === 0xC2) return 'SOF';
  if (marcatore === 0xC4) return 'DHT';
  if (marcatore === 0xFE) return 'COM';
  return `FF${marcatore.toString(16).toUpperCase().padStart(2, '0')}`;
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
// `visti` — facoltativo — raccoglie i segmenti incontrati, col loro peso: è la
// riga che serve a capire, da uno screenshot, perché la data non si è letta.
function trovaExif(vista, visti = null) {
  if (!eJpegDaiByte(vista) || vista.byteLength < 4) return -1;
  let posizione = 2;
  while (posizione + 4 <= vista.byteLength) {
    if (vista.getUint8(posizione) !== 0xFF) return -1;
    const marcatore = vista.getUint8(posizione + 1);
    // Riempimento: alcuni encoder mettono FF di troppo prima di un marcatore.
    if (marcatore === 0xFF) { posizione += 1; continue; }
    // SOS o EOI: da qui in poi ci sono i pixel, i metadati sono finiti.
    if (marcatore === 0xDA || marcatore === 0xD9) {
      if (visti) visti.push(marcatore === 0xDA ? 'SOS' : 'EOI');
      return -1;
    }
    const lunghezza = vista.getUint16(posizione + 2);
    if (lunghezza < 2) return -1;
    const exif = marcatore === 0xE1 && posizione + 10 <= vista.byteLength
      && firmaExif(vista, posizione + 4);
    if (visti) visti.push(`${nomeMarcatore(marcatore, exif)}(${lunghezza})`);
    if (exif) return posizione + 10;
    posizione += 2 + lunghezza;
  }
  // Finito il buffer senza trovarlo: i 128 KiB non sono bastati, ed è un caso
  // diverso da «il segmento non c'è». `visti` lo mostra.
  if (visti) visti.push('…buffer finito');
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

// Il motivo detto all'operatore. I nove casi interni sono precisi ma scritti
// per chi legge il codice: «DateTimeOriginal» in cantiere non vuol dire
// niente. Qui c'è la stessa informazione in italiano, e a video si mostrano
// entrambe — la frase per chi deve decidere cosa fare, il motivo tecnico
// perché uno screenshot arrivi in ufficio già diagnostico.
//
// La corrispondenza si fa sul PREFISSO: quattro dei nove motivi portano in
// coda il valore che hanno letto, e quel valore serve.
export function spiegazioneMotivo(motivo) {
  const testo = String(motivo || '');
  if (testo.startsWith('file non leggibile')) {
    return 'il telefono non è riuscito a leggere il file';
  }
  if (testo.startsWith('non è un JPEG')) {
    return 'il file non è una foto JPEG: da questo formato l’app non legge l’ora dello scatto';
  }
  if (testo.startsWith('nessun blocco EXIF')) {
    return 'nel file non ci sono i dati della fotocamera';
  }
  if (testo.startsWith('EXIF presente ma senza')) {
    return 'i dati della fotocamera ci sono, ma senza l’ora dello scatto';
  }
  if (testo.startsWith('DateTimeOriginal illeggibile')) {
    return 'l’ora dello scatto è scritta in un modo che non si riesce a leggere';
  }
  if (testo.startsWith('DateTimeOriginal non è una data')) {
    return 'l’ora dello scatto non è una data valida';
  }
  if (testo.startsWith('data assurda')) {
    return 'l’ora dello scatto è di prima del 2010: l’orologio del telefono non era impostato';
  }
  if (testo.startsWith('data nel futuro')) {
    return 'l’ora dello scatto è nel futuro: l’orologio del telefono è avanti';
  }
  if (testo.startsWith('lettura EXIF non riuscita')) {
    return 'la lettura dei dati della fotocamera si è interrotta';
  }
  return 'l’ora dello scatto non si è potuta leggere';
}
