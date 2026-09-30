// Preparazione delle immagini del modulo Foto: un trattamento solo, dal
// 29/09/2026.
//
// **Risoluzione originale, sempre.** La compressione a 2500 px serviva alla
// categoria «Avanzamento», che non esiste più: tutto quello che parte da qui
// va in archivio, e una foto d'archivio va sul server come l'ha scattata il
// telefono.
//
// Se il file è già JPEG si spediscono **i byte originali, senza
// ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine
// senza alcun vantaggio. Se invece il telefono produce HEIC o PNG si converte
// in JPEG a piena risoluzione — il nome del file in raccolta è `.jpg`, e byte
// HEIC dentro un `.jpg` sarebbero un file che non si apre.
//
// **«Già JPEG» si decide dai BYTE, dalla 0.37.3** (`eJpeg`, in `core/exif.js`).
// Prima si guardava `file.type`, e il `type` lo scrive il selettore del
// sistema: su Android arriva `''` o `application/octet-stream` su file che sono
// JPEG perfetti. Quei file venivano **ricodificati in silenzio** — la
// decodifica riesce, nessun errore da nessuna parte — e in archivio finivano
// byte diversi dall'originale, mentre l'ora dello scatto si leggeva
// regolarmente perché quella guardava i byte. Due punti, due fonti, due
// risposte diverse sullo stesso file: ora la fonte è una sola.

import { eJpeg } from '../../core/exif.js';
import { eLetturaNegata } from '../../core/byte.js';

const QUALITA_CONVERSIONE = 0.95;

export async function preparaImmagine(file) {
  if (await eJpeg(file)) return file;
  return ridimensiona(file, Infinity, QUALITA_CONVERSIONE);
}

async function ridimensiona(file, latoMax, qualita) {
  const sorgente = await decodifica(file);
  const larghezza = sorgente.naturalWidth || sorgente.width;
  const altezza = sorgente.naturalHeight || sorgente.height;
  const scala = Math.min(1, latoMax / Math.max(larghezza, altezza));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(larghezza * scala));
  canvas.height = Math.max(1, Math.round(altezza * scala));
  canvas.getContext('2d').drawImage(sorgente, 0, 0, canvas.width, canvas.height);
  if (typeof sorgente.close === 'function') sorgente.close();
  return new Promise((risolvi, rifiuta) => {
    canvas.toBlob(
      blob => blob ? risolvi(blob) : rifiuta(new Error('Conversione in JPEG non riuscita')),
      'image/jpeg',
      qualita
    );
  });
}

// Decodifica via canvas: copre anche i formati che il browser sa leggere ma
// non produrre (es. HEIC su Safari).
//
// **«Non supportato» solo se è vero il formato.** Se la decodifica fallisce
// perché i byte non si sono potuti leggere, il caso è la lettura e l'errore
// esce com'è, perché chi chiama lo riconosca (`eLetturaNegata`). Il 30/09/2026
// una foto perfettamente valida è uscita a video come «Formato immagine non
// supportato da questo dispositivo»: era un `NotReadableError`, e quella
// frase ha mandato l'operatore a cercare un originale che aveva già in mano.
async function decodifica(file) {
  let primo = null;
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (errore) {
    // Fallback per browser senza createImageBitmap o senza supporto al formato.
    primo = errore;
  }
  if (eLetturaNegata(primo)) throw primo;
  const url = URL.createObjectURL(file);
  try {
    const immagine = new Image();
    await new Promise((risolvi, rifiuta) => {
      immagine.onload = risolvi;
      immagine.onerror = () => rifiuta(new Error('Formato immagine non supportato da questo dispositivo'));
      immagine.src = url;
    });
    return immagine;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Anteprima leggera: non si mostra a video un file da 8 MB.
export function creaAnteprima(file) {
  return ridimensiona(file, 800, 0.7);
}
