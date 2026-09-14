// Scrive un blocco EXIF dentro un JPEG, per il materiale dei collaudi.
//
// Serve perché le foto di prova le genera un canvas, e dal canvas l'EXIF non
// esce: senza questo, l'unico modo di provare la lettura dell'ora di scatto
// sarebbe committare nel repo una foto vera di cantiere.
//
// È anche un secondo paio d'occhi sul formato. Qui i byte si SCRIVONO seguendo
// la specifica EXIF; in `core/exif.js` si LEGGONO con codice indipendente,
// scritto a parte. Se il collaudo passa, le due letture del formato coincidono
// — cosa che un lettore provato contro sé stesso non dimostrerebbe.
//
// Struttura prodotta (la stessa di una fotocamera):
//   FFE1 <lunghezza> "Exif\0\0" | TIFF header | IFD0 | Exif SubIFD | stringhe
// Gli offset dentro l'EXIF si contano dall'inizio del TIFF header, non del file.

const FIRMA = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // «Exif» e due zeri
const TAG_PUNTATORE_EXIF = 0x8769;
const TAG_DATA_ORIGINALE = 0x9003;
const TAG_OFFSET_ORIGINALE = 0x9011;
const TIPO_ASCII = 2;
const TIPO_LONG = 4;

// `data` nella forma EXIF «AAAA:MM:GG HH:MM:SS»; `offset` come «+02:00», e se
// è vuoto il tag non viene scritto affatto — è il caso di molti telefoni, e il
// lettore deve saperci fare. `grandeInTesta` scrive in ordine MM (iPhone)
// invece che II (gran parte degli Android).
function bloccoExif({ data, offset = '', grandeInTesta = false }) {
  const voci = [{ tag: TAG_DATA_ORIGINALE, testo: data }];
  if (offset) voci.push({ tag: TAG_OFFSET_ORIGINALE, testo: offset });

  // TIFF header 8 byte; IFD0 con una sola voce (il puntatore) 2 + 12 + 4.
  const inizioSubIfd = 8 + 18;
  let cursore = inizioSubIfd + 2 + voci.length * 12 + 4;
  const stringhe = [];
  for (const voce of voci) {
    const byte = Buffer.concat([Buffer.from(voce.testo, 'ascii'), Buffer.from([0])]);
    voce.offset = cursore;
    voce.quanti = byte.length;
    stringhe.push(byte);
    cursore += byte.length;
  }

  const tiff = Buffer.alloc(cursore);
  const u16 = (dove, valore) => (grandeInTesta ? tiff.writeUInt16BE(valore, dove) : tiff.writeUInt16LE(valore, dove));
  const u32 = (dove, valore) => (grandeInTesta ? tiff.writeUInt32BE(valore, dove) : tiff.writeUInt32LE(valore, dove));

  tiff.write(grandeInTesta ? 'MM' : 'II', 0, 'ascii');
  u16(2, 42);            // il numero magico che conferma l'ordine dei byte
  u32(4, 8);             // la IFD0 comincia subito dopo l'header
  u16(8, 1);             // una voce sola nella IFD0
  u16(10, TAG_PUNTATORE_EXIF); u16(12, TIPO_LONG); u32(14, 1); u32(18, inizioSubIfd);
  u32(22, 0);            // nessuna IFD1 (niente miniatura)
  u16(inizioSubIfd, voci.length);
  voci.forEach((voce, i) => {
    const dove = inizioSubIfd + 2 + i * 12;
    u16(dove, voce.tag); u16(dove + 2, TIPO_ASCII); u32(dove + 4, voce.quanti); u32(dove + 8, voce.offset);
  });
  u32(inizioSubIfd + 2 + voci.length * 12, 0);
  stringhe.forEach((byte, i) => byte.copy(tiff, voci[i].offset));

  const corpo = Buffer.concat([Buffer.from(FIRMA), tiff]);
  const testa = Buffer.alloc(4);
  testa.writeUInt16BE(0xFFE1, 0);
  testa.writeUInt16BE(corpo.length + 2, 2); // la lunghezza comprende sé stessa
  return Buffer.concat([testa, corpo]);
}

// Inserisce l'APP1 subito dopo il SOI, dov'è in una foto di telefono.
function conExif(jpeg, opzioni) {
  if (jpeg.readUInt16BE(0) !== 0xFFD8) throw new Error('non è un JPEG: manca il marcatore di apertura');
  return Buffer.concat([jpeg.subarray(0, 2), bloccoExif(opzioni), jpeg.subarray(2)]);
}

module.exports = { bloccoExif, conExif };
