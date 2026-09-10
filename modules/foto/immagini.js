// Preparazione delle immagini del modulo Foto.
// Due trattamenti, secondo la categoria scelta:
//  - Avanzamento: compressa come le bolle (2500 px, 0,85), leggera e veloce;
//  - Archivio: risoluzione originale, perché la foto va sul server come
//    l'ha scattata il telefono.
//
// Nota sull'Archivio: se il file è già JPEG si spediscono i byte originali,
// senza ricodificarli — ricomprimere "a qualità massima" degraderebbe
// l'immagine senza alcun vantaggio. Se invece il telefono produce HEIC o PNG
// si converte in JPEG a piena risoluzione: il nome del file in raccolta è
// .jpg, e byte HEIC dentro un .jpg sarebbero un file che non si apre.

const LATO_AVANZAMENTO = 2500;
const QUALITA_AVANZAMENTO = 0.85;
const QUALITA_CONVERSIONE = 0.95;

export async function preparaImmagine(file, originale) {
  if (!originale) return ridimensiona(file, LATO_AVANZAMENTO, QUALITA_AVANZAMENTO);
  if (file.type === 'image/jpeg') return file;
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
async function decodifica(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Fallback per browser senza createImageBitmap o senza supporto al formato.
  }
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
