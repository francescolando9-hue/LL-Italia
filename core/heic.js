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
// Un errore dice il caso: libreria non scaricata (offline e mai scaricata),
// libreria scaricata ma che non parte, file che il telefono non lascia leggere,
// decodifica fallita (file danneggiato o variante non supportata), immagine
// troppo grande per la memoria. La frase per l'operatore sta in `core/errori.js`.

import { fraseHeic } from './errori.js';

const PERCORSO_LIBRERIA = './vendor/libheif/libheif-bundle.mjs';
// Oltre questo il canvas RGBA (4 byte a pixel) rischia di non entrare in memoria
// su un telefono di fascia bassa: 64 milioni di pixel sono 256 MB.
const PIXEL_MASSIMI = 64_000_000;

export const MOTIVI_HEIC = ['libreria', 'avvio', 'lettura', 'decodifica', 'troppo-grande'];

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

// Scaricare la libreria e farla partire sono due guasti diversi, con due frasi:
// il primo si risolve con la rete, il secondo no (WebAssembly che non si compila o
// non trova memoria: riprovare dà lo stesso esito).
async function libreria() {
  if (!caricamento) {
    caricamento = (async () => {
      let modulo;
      try {
        modulo = await import(PERCORSO_LIBRERIA);
      } catch (errore) {
        throw new ErroreHeic('libreria', errore && errore.message);
      }
      try {
        return await modulo.default();
      } catch (errore) {
        throw new ErroreHeic('avvio', errore && errore.message);
      }
    })().catch(errore => {
      caricamento = null; // un secondo tentativo, con la rete tornata, deve poter riuscire
      throw errore;
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
//
// **Memoria WebAssembly.** Non si libera da sola e non si restringe mai: ogni
// oggetto di libheif si rilascia appena finito, comunque vada, o a ogni foto la
// memoria cresce fino a far fallire le successive. Si rilasciano le immagini
// (`free()`) e poi il contesto (`heif_context_free`): la libreria lo libera solo
// alla decodifica successiva dello stesso decodificatore, e qui ne nasce uno per
// foto, quindi l'ultimo resterebbe vivo per sempre.
//
// **I pixel si chiedono a libheif direttamente, non con `display()`.** La `display`
// della libreria lavora dentro un `setTimeout` senza `try`: un errore là dentro
// (memoria che manca, WebAssembly che si ferma) non arriva mai alla funzione di
// ritorno, e chi aspetta aspetta per sempre. Qui l'errore si prende e diventa un
// errore di tipo «decodifica».
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
  const decodificatore = new lib.HeifDecoder();
  let immagini = [];
  const libera = () => {
    immagini.forEach(i => { try { i.free(); } catch { /* già libera */ } });
    try {
      if (decodificatore.decoder) lib.heif_context_free(decodificatore.decoder);
    } catch { /* già libero */ }
    decodificatore.decoder = null;
  };
  try {
    try {
      immagini = decodificatore.decode(byte) || [];
    } catch (errore) {
      throw new ErroreHeic('decodifica', errore && errore.message);
    }
    if (immagini.length === 0) throw new ErroreHeic('decodifica', 'nessuna immagine nel file');
    const immagine = immagini[0];
    const larghezza = immagine.get_width();
    const altezza = immagine.get_height();
    if (!(larghezza > 0 && altezza > 0)) throw new ErroreHeic('decodifica', 'dimensioni nulle');
    if (larghezza * altezza > PIXEL_MASSIMI) throw new ErroreHeic('troppo-grande', `${larghezza}×${altezza}`);

    // La memoria per la tela può mancare: lo si dice col suo nome, non con un
    // TypeError del browser (`getContext` restituisce `null`) o un RangeError.
    let canvas;
    let contesto;
    let pixel;
    try {
      canvas = document.createElement('canvas');
      canvas.width = larghezza;
      canvas.height = altezza;
      contesto = canvas.getContext('2d');
      if (!contesto) throw new Error('canvas non disponibile');
      pixel = contesto.createImageData(larghezza, altezza);
    } catch (errore) {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      throw new ErroreHeic('troppo-grande', `${larghezza}×${altezza}: ${errore && errore.message}`);
    }

    let risultato;
    try {
      risultato = await lib.heif_js_decode_image2(
        immagine.handle, lib.heif_colorspace.heif_colorspace_RGB, lib.heif_chroma.heif_chroma_interleaved_RGBA);
    } catch (errore) {
      canvas.width = 0; canvas.height = 0;
      throw new ErroreHeic('decodifica', errore && errore.message);
    }
    if (!risultato || risultato.code) {
      canvas.width = 0; canvas.height = 0;
      throw new ErroreHeic('decodifica', 'la libreria non ha prodotto i pixel');
    }
    try {
      let copiato = false;
      for (const canale of risultato.channels) {
        if (canale.id !== lib.heif_channel.heif_channel_interleaved) continue;
        if (canale.stride === canale.width * 4) {
          pixel.data.set(canale.data);
        } else {
          for (let riga = 0; riga < canale.height; riga++) {
            pixel.data.set(canale.data.subarray(riga * canale.stride, riga * canale.stride + canale.width * 4), riga * canale.width * 4);
          }
        }
        copiato = true;
      }
      if (!copiato) throw new Error('nessun canale di pixel');
      contesto.putImageData(pixel, 0, 0);
    } catch (errore) {
      canvas.width = 0; canvas.height = 0;
      throw new ErroreHeic(errore instanceof RangeError ? 'troppo-grande' : 'decodifica', errore && errore.message);
    } finally {
      try { lib.heif_image_release(risultato.image); } catch { /* già rilasciata */ }
    }
    return canvas;
  } finally {
    libera();
  }
}
