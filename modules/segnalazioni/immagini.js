// Le foto di una segnalazione: ricodificate in JPEG, lato lungo al massimo
// 1600 px. Non sono foto d'archivio (quelle le manda il modulo Foto, coi byte
// originali): servono a far capire il problema a chi deve intervenire, e tre
// originali da 12 MP in una richiesta sola starebbero male su una linea di
// cantiere.
//
// Un file che il telefono non sa disegnare — l'HEIC su Chrome per Android — si
// decodifica sul telefono con libheif (`core/heic.js`, dalla 0.45.0) e parte
// come JPEG, come ogni altra foto di questo modulo: a differenza del modulo
// Foto, il server salva l'allegato come JPEG, e un HEIC con quel nome sarebbe un
// allegato che non si apre. Se la decodifica non riesce si dice cosa fare
// invece di accodare una cosa che arriva rotta.

import { eHeic } from '../../core/exif.js';
import { decodificaHeic } from '../../core/heic.js';

const LATO_MASSIMO = 1600;
const QUALITA = 0.8;

export async function preparaFoto(file) {
  let immagine;
  try {
    immagine = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (await eHeic(file)) {
      immagine = await decodificaHeic(file); // l'errore porta già la sua frase
    } else {
      throw new Error('Questa foto non si può leggere su questo telefono: scattala con «Scatta foto».');
    }
  }
  const scala = Math.min(1, LATO_MASSIMO / Math.max(immagine.width, immagine.height));
  const larghezza = Math.max(1, Math.round(immagine.width * scala));
  const altezza = Math.max(1, Math.round(immagine.height * scala));
  const tela = document.createElement('canvas');
  tela.width = larghezza;
  tela.height = altezza;
  tela.getContext('2d').drawImage(immagine, 0, 0, larghezza, altezza);
  if (typeof immagine.close === 'function') immagine.close();
  const blob = await new Promise(risolvi => tela.toBlob(risolvi, 'image/jpeg', QUALITA));
  if (!blob) throw new Error('Foto non preparata: riprova.');
  return blob;
}
