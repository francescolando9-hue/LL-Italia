// Compressione client-side delle foto: JPEG, lato lungo max ~2500 px, qualità ~0,85.
// La leggibilità della bolla per l'OCR del runbook prevale sul peso (da specifica).

const LATO_MAX = 2500;
const QUALITA = 0.85;
// Miniatura conservata nello storico: deve bastare a riconoscere la bolla
// (fornitore, intestazione), non a leggerne le righe — per quello c'è la
// raccolta. Pesa 60-90 KB contro i 400-600 KB dell'originale.
const LATO_MINIATURA = 800;
const QUALITA_MINIATURA = 0.72;

export function comprimiInJpeg(file) {
  return ridimensiona(file, LATO_MAX, QUALITA);
}

export function creaMiniatura(file) {
  return ridimensiona(file, LATO_MINIATURA, QUALITA_MINIATURA);
}

// Impronta del file ORIGINALE, non del compresso: due scelte dello stesso file
// dalla galleria hanno gli stessi byte, quindi la stessa impronta, sempre.
export async function impronta(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
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

// Decodifica via canvas: copre anche i formati che il browser sa leggere ma non
// inviare (es. HEIC su Safari). Se il dispositivo non decodifica il formato,
// l'errore arriva all'utente e la foto non viene accodata.
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
