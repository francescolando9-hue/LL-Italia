// Compressione client-side delle foto: JPEG, lato lungo max ~2500 px, qualità ~0,85.
// La leggibilità della bolla per l'OCR del runbook prevale sul peso (da specifica).

const LATO_MAX = 2500;
const QUALITA = 0.85;
// Miniatura conservata nello storico: deve bastare a riconoscere la bolla
// (fornitore, intestazione), non a leggerne le righe — per quello c'è la
// raccolta. Pesa 60-90 KB contro i 400-600 KB dell'originale.
const LATO_MINIATURA = 800;
const QUALITA_MINIATURA = 0.72;
// Analisi di leggibilità su un ridotto fisso: la misura deve dare lo stesso
// risultato su telefoni con fotocamere diverse, quindi si normalizza la scala.
const LATO_ANALISI = 640;

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

// --- Leggibilità dello scatto ------------------------------------------------
// Una bolla mossa o al buio si scopre in ufficio la sera, quando il foglio non
// c'è più. Misurarla in cantiere costa cinque secondi e salva la bolla.
// Non legge il contenuto (l'app resta capture-only): misura solo il contrasto
// locale (varianza del laplaciano) e la luminosità media.

// Soglie calibrate su bolle di prova con sfocatura ed esposizione crescenti
// (valori misurati in docs/AppBolleLeggibilita….md). Tarate per NON allarmare
// su una foto buona: un avviso che scatta sempre viene ignorato sempre.
const NITIDEZZA_SCARSA = 50;
const NITIDEZZA_DUBBIA = 200;
const LUMINOSITA_MINIMA = 60;
// La carta bianca è legittimamente chiara: la sovraesposizione non si misura
// sulla media ma sulla quota di pixel bruciati, dove il testo è perduto.
const BRUCIATI_MASSIMI = 0.25;

export async function valutaLeggibilita(file) {
  let dati;
  try {
    dati = await misura(file);
  } catch {
    // Se l'analisi non è possibile non si ostacola l'invio: meglio una bolla
    // non verificata che una bolla non spedita.
    return { esito: 'ok', motivo: '', dati: null };
  }
  if (dati.luminosita < LUMINOSITA_MINIMA) {
    return { esito: 'scarsa', motivo: 'troppo scura', dati };
  }
  if (dati.bruciati > BRUCIATI_MASSIMI) {
    return { esito: 'scarsa', motivo: 'riflesso o controluce', dati };
  }
  if (dati.nitidezza < NITIDEZZA_SCARSA) {
    return { esito: 'scarsa', motivo: 'sfocata o mossa', dati };
  }
  if (dati.nitidezza < NITIDEZZA_DUBBIA) {
    return { esito: 'dubbia', motivo: 'poco nitida', dati };
  }
  return { esito: 'ok', motivo: '', dati };
}

async function misura(file) {
  const canvas = await disegnaSuCanvas(file, LATO_ANALISI);
  const contesto = canvas.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = contesto.getImageData(0, 0, canvas.width, canvas.height);
  const grigi = new Float32Array(width * height);
  let sommaLuce = 0;
  let bruciati = 0;
  for (let i = 0; i < width * height; i += 1) {
    const luce = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    grigi[i] = luce;
    sommaLuce += luce;
    if (luce > 250) bruciati += 1;
  }
  // Varianza del laplaciano: alta dove ci sono bordi netti (testo a fuoco),
  // bassa su un'immagine mossa, dove ogni bordo è spalmato sui vicini.
  let somma = 0;
  let sommaQuadrati = 0;
  let punti = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap = 4 * grigi[i] - grigi[i - 1] - grigi[i + 1] - grigi[i - width] - grigi[i + width];
      somma += lap;
      sommaQuadrati += lap * lap;
      punti += 1;
    }
  }
  const media = somma / punti;
  return {
    nitidezza: Math.round(sommaQuadrati / punti - media * media),
    luminosita: Math.round(sommaLuce / (width * height)),
    bruciati: Number((bruciati / (width * height)).toFixed(3)),
    larghezza: width,
    altezza: height,
  };
}

async function disegnaSuCanvas(file, latoMax) {
  const sorgente = await decodifica(file);
  const larghezza = sorgente.naturalWidth || sorgente.width;
  const altezza = sorgente.naturalHeight || sorgente.height;
  const scala = Math.min(1, latoMax / Math.max(larghezza, altezza));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(larghezza * scala));
  canvas.height = Math.max(1, Math.round(altezza * scala));
  canvas.getContext('2d').drawImage(sorgente, 0, 0, canvas.width, canvas.height);
  if (typeof sorgente.close === 'function') sorgente.close();
  return canvas;
}
