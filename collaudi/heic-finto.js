// Costruisce un HEIC finto, byte per byte, per i collaudi della 0.42.0.
//
// Serve perché il Chromium dei collaudi un HEIC non lo sa produrre, e perché
// committare nel repo una foto vera di cantiere non si fa. L'app l'immagine
// HEIC non la decodifica mai — ne legge solo la data e ne spedisce i byte — e
// quindi al posto dell'immagine HEVC basta un riempitivo: quello che si prova
// è il CONTENITORE (ISO-BMFF, ISO/IEC 14496-12 e 23008-12), cioè la strada che
// porta dal file al blocco Exif.
//
// Come per `exif-finto.js`, è anche un secondo paio d'occhi sul formato: qui i
// box si SCRIVONO seguendo la norma, in `core/exif.js` si LEGGONO con codice
// scritto a parte. Il blocco Exif dentro è quello di `exif-finto.js`, senza
// l'intestazione APP1 del JPEG, preceduto dai 4 byte di scostamento che l'HEIF
// mette davanti all'intestazione TIFF.
//
// Struttura prodotta (quella di un telefono Samsung o di un iPhone):
//   ftyp | meta( hdlr pitm iinf(infe hvc1, infe Exif) iloc ) | mdat( immagine, [riempitivo], Exif )

const { bloccoExif } = require('./exif-finto');

function u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; }

function box(tipo, ...corpi) {
  const corpo = Buffer.concat(corpi);
  const testa = Buffer.alloc(8);
  testa.writeUInt32BE(8 + corpo.length, 0);
  testa.write(tipo, 4, 'ascii');
  return Buffer.concat([testa, corpo]);
}

// «Full box»: versione (1 byte) e flag (3 byte) prima del contenuto.
function fullBox(tipo, versione, flag, ...corpi) {
  return box(tipo, u32(((versione & 0xFF) << 24) | (flag & 0xFFFFFF)), ...corpi);
}

function ftyp(maggiore, compatibili) {
  return box('ftyp', Buffer.from(maggiore, 'ascii'), u32(0),
    ...compatibili.map(c => Buffer.from(c, 'ascii')));
}

function hdlr() {
  return fullBox('hdlr', 0, 0, u32(0), Buffer.from('pict', 'ascii'),
    u32(0), u32(0), u32(0), Buffer.from([0]));
}

function infe(id, tipo) {
  // Versione 2: id a 16 bit, indice di protezione, tipo dell'elemento, nome.
  return fullBox('infe', 2, 0, u16(id), u16(0), Buffer.from(tipo, 'ascii'), Buffer.from([0]));
}

// `elementi`: [{ id, offset, lunghezza }]. Versione 0 o 1; con la 1 c'è il
// metodo di costruzione e si può usare una base: gli offset scritti sono
// allora relativi a `base`.
function iloc(elementi, { versione = 0, base = 0 } = {}) {
  const dimBase = versione === 1 ? 4 : 0;
  const parti = [Buffer.from([(4 << 4) | 4, (dimBase << 4) | 0]), u16(elementi.length)];
  for (const e of elementi) {
    parti.push(u16(e.id));
    if (versione === 1) parti.push(u16(0)); // riservato + construction_method 0
    parti.push(u16(0)); // data_reference_index
    if (dimBase) parti.push(u32(base));
    parti.push(u16(1), u32(e.offset - (dimBase ? base : 0)), u32(e.lunghezza));
  }
  return fullBox('iloc', versione, 0, ...parti);
}

// Opzioni:
//   data, offset, grandeInTesta  → il blocco Exif (come `exif-finto.js`)
//   maggiore, compatibili        → i brand di `ftyp`
//   riempitivo                   → byte di `mdat` fra l'immagine e l'Exif (H3)
//   senzaExif                    → nessuna voce Exif in `iinf` (H4)
//   exifOltre                    → `iloc` punta oltre la fine del file (H5)
//   troncaMeta                   → il file finisce a metà di `meta` (H6)
//   versioneIloc                 → 0 o 1
function heicFinto({
  data = '2026:11:17 11:03:03', offset = '', grandeInTesta = false,
  maggiore = 'heic', compatibili = ['mif1', 'heic'],
  riempitivo = 0, senzaExif = false, exifOltre = false, troncaMeta = false, versioneIloc = 1,
} = {}) {
  const immagine = Buffer.alloc(4000, 0x5A); // al posto dei dati HEVC
  const exif = Buffer.concat([u32(6), bloccoExif({ data, offset, grandeInTesta }).subarray(4)]);
  const vuoto = Buffer.alloc(riempitivo, 0x00);

  const testa = ftyp(maggiore, compatibili);
  // Due passate: la lunghezza di `meta` non dipende dagli offset, quindi la
  // prima serve a sapere dove comincia `mdat`.
  const componiMeta = (posImmagine, posExif) => {
    const voci = [infe(1, 'hvc1')];
    const elementi = [{ id: 1, offset: posImmagine, lunghezza: immagine.length }];
    if (!senzaExif) {
      voci.push(infe(2, 'Exif'));
      elementi.push({ id: 2, offset: posExif, lunghezza: exif.length });
    }
    return fullBox('meta', 0, 0,
      hdlr(),
      fullBox('pitm', 0, 0, u16(1)),
      fullBox('iinf', 0, 0, u16(voci.length), ...voci),
      iloc(elementi, { versione: versioneIloc, base: posImmagine }));
  };
  const lungMeta = componiMeta(0, 0).length;
  const inizioDati = testa.length + lungMeta + 8;
  const posImmagine = inizioDati;
  const posExif = inizioDati + immagine.length + vuoto.length;
  const mdat = box('mdat', immagine, vuoto, senzaExif ? Buffer.alloc(0) : exif);
  const totale = testa.length + lungMeta + mdat.length;
  const meta = componiMeta(posImmagine, exifOltre ? totale + 1000 : posExif);
  const file = Buffer.concat([testa, meta, mdat]);
  if (troncaMeta) return file.subarray(0, testa.length + Math.floor(lungMeta / 2));
  return file;
}

module.exports = { heicFinto };
