// Decodifica HEIC sul telefono, per i moduli che mandano un JPEG (Bolle e
// Segnalazioni). Dalla 0.45.0.
//
// Chrome per Android un HEIC non lo disegna: `createImageBitmap` lo rifiuta, e
// fino alla 0.44.0 la bolla o la segnalazione con una foto HEIC si fermava con un
// messaggio. Qui l'HEIC si trasforma in pixel con libheif (WebAssembly, in
// `core/vendor/libheif/`, versione e impronta nel suo LEGGIMI) e il chiamante lo
// ridisegna e lo ricodifica in JPEG come ha sempre fatto: a valle viaggia solo il
// JPEG. **Il modulo Foto non passa di qui:** manda l'originale, come dalla 0.42.0.
//
// **Si carica solo quando serve.** Il decodificatore pesa circa 2 MB: un
// `import()` dinamico lo porta in pagina alla prima foto HEIC che il browser non
// sa disegnare da sé (Safari sì, e lì non si arriva mai). Chi scatta con la
// fotocamera dell'app o con JPEG non lo scarica né lo esegue. Il service worker lo
// tiene in una cache sua, che non cambia a ogni rilascio dell'app: offline il
// decodificatore c'è se è stato scaricato una volta (`sw.js`).
//
// Un errore dice il caso: libreria non caricata (offline e mai scaricata),
// decodifica fallita (file danneggiato o variante non supportata), immagine
// troppo grande per la memoria. La frase per l'operatore sta in `core/errori.js`.

import { fraseHeic } from './errori.js';

const PERCORSO_LIBRERIA = './vendor/libheif/libheif-bundle.mjs';
// Oltre questo il canvas RGBA (4 byte a pixel) rischia di non entrare in memoria
// su un telefono di fascia bassa: 64 milioni di pixel sono 256 MB.
const PIXEL_MASSIMI = 64_000_000;

export const MOTIVI_HEIC = ['libreria', 'lettura', 'decodifica', 'troppo-grande'];

// Il messaggio è la frase per l'operatore (`core/errori.js`) e, fra parentesi,
// il motivo tecnico: i moduli lo mostrano com'è.
export class ErroreHeic extends Error {
  constructor(motivo, dettaglio = '') {
    super(`${fraseHeic(motivo)} (${motivo}${dettaglio ? `: ${dettaglio}` : ''})`);
    this.name = 'ErroreHeic';
    this.motivo = motivo;
  }
}

let caricamento = null;

async function libreria() {
  if (!caricamento) {
    caricamento = import(PERCORSO_LIBRERIA).then(modulo => modulo.default()).catch(errore => {
      caricamento = null; // un secondo tentativo, con la rete tornata, deve poter riuscire
      throw new ErroreHeic('libreria', errore && errore.message);
    });
  }
  return caricamento;
}

// Vero se la libreria è già in pagina: i collaudi lo usano per dimostrare che
// non si carica senza un HEIC.
export function libreriaCaricata() {
  return caricamento !== null;
}

// Decodifica il primo (principale) oggetto immagine dell'HEIC e lo restituisce
// su un canvas, che `drawImage` sa disegnare come un'immagine qualunque. Rotazione
// e specchio dell'HEIF li applica libheif: il canvas esce già dritto.
export async function decodificaHeic(file) {
  const lib = await libreria();
  // La lettura del file è un caso a sé: un file che il telefono non lascia leggere
  // (`NotReadableError`) non è «rovinato», e la frase non deve dirlo.
  let byte;
  try {
    byte = new Uint8Array(await file.arrayBuffer());
  } catch (errore) {
    throw new ErroreHeic('lettura', errore && (errore.name || errore.message));
  }
  let immagini = [];
  try {
    const decodificatore = new lib.HeifDecoder();
    immagini = decodificatore.decode(byte) || [];
  } catch (errore) {
    throw new ErroreHeic('decodifica', errore && errore.message);
  }
  // Gli oggetti della libreria vivono nella memoria WebAssembly, che non si
  // libera da sola: ognuno si rilascia con `free()` appena finito, comunque vada.
  const libera = () => immagini.forEach(i => { try { i.free(); } catch { /* già libera */ } });
  try {
    if (immagini.length === 0) throw new ErroreHeic('decodifica', 'nessuna immagine nel file');
    const immagine = immagini[0];
    const larghezza = immagine.get_width();
    const altezza = immagine.get_height();
    if (!(larghezza > 0 && altezza > 0)) throw new ErroreHeic('decodifica', 'dimensioni nulle');
    if (larghezza * altezza > PIXEL_MASSIMI) throw new ErroreHeic('troppo-grande', `${larghezza}×${altezza}`);

    const canvas = document.createElement('canvas');
    canvas.width = larghezza;
    canvas.height = altezza;
    const contesto = canvas.getContext('2d');
    const pixel = contesto.createImageData(larghezza, altezza);
    const riempito = await new Promise(risolvi => {
      try {
        immagine.display(pixel, risolvi);
      } catch {
        risolvi(null);
      }
    });
    if (!riempito) throw new ErroreHeic('decodifica', 'la libreria non ha prodotto i pixel');
    contesto.putImageData(riempito, 0, 0);
    return canvas;
  } finally {
    libera();
  }
}
