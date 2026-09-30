// I byte di un file: una lettura sola, subito, e con i tentativi.
//
// **Il caso, misurato il 30/09/2026.** Sul Galaxy S21+ di Paolo due foto
// scattate alle 11:26 con la fotocamera del telefono sono state rifiutate
// dall'app alle 11:31, e le stesse foto sono partite senza un intoppo alle
// 19:25, con l'EXIF completo e i byte originali. Il file è sempre stato a
// posto: a fallire era la **lettura**. Il browser diceva
// `NotReadableError — The requested file could not be read, typically due to
// permission problems that have occurred after a reference to a file was
// acquired`, e alle 19:20, sullo stesso file, la stessa causa era uscita a
// video come «Formato immagine non supportato da questo dispositivo».
//
// Perché succede: su Android il `File` che arriva dal selettore non è un file
// su disco ma un riferimento a un contenuto (`content://`) tenuto in vita da
// un'altra applicazione. Quel riferimento può decadere, e decade **fra una
// lettura e l'altra**. Fino alla 0.37.3 lo stesso `File` veniva riletto da
// capo quattro o cinque volte in momenti diversi — l'EXIF, la firma, la
// preparazione, l'anteprima, la copia in IndexedDB — e bastava che una di
// quelle letture cadesse nel momento sbagliato.
//
// Due rimedi, e servono entrambi:
//
//  1. **Una lettura sola, subito.** Appena una foto viene scelta se ne
//     leggono i byte e si tiene quella copia. Un `Blob` costruito su un
//     `ArrayBuffer` sta nella memoria del browser e non dipende più da
//     nessun'altra applicazione: le letture successive non possono fallire.
//  2. **Ritentare.** Il riferimento decaduto a volte torna leggibile dopo
//     poco, ed è quello che il caso di Paolo dimostra: mezzogiorno no, sera
//     sì. Tre tentativi ravvicinati costano niente e risolvono il caso in cui
//     l'indisponibilità è di un istante.
//
// Il video NON passa da qui: si legge a blocchi al momento dell'invio, perché
// tenere in memoria un filmato da 200 MB è il modo di far chiudere la pagina
// al sistema.

// Attese fra un tentativo e l'altro, in millisecondi. Tre tentativi dopo il
// primo: se dopo tre secondi e mezzo il file non si legge, non è un istante
// di indisponibilità ed è meglio dirlo che continuare a girare a vuoto.
const ATTESE = [500, 1500, 3000];

// Sovrascrivibile dal dispositivo, come il tetto degli invii: serve ai
// collaudi, che non possono aspettare cinque secondi per ogni prova, e al
// supporto su un telefono che si comporta male.
export function atteseRilettura() {
  try {
    const scritto = localStorage.getItem('llitalia.atteseRilettura');
    if (!scritto) return ATTESE;
    const pezzi = String(scritto).split(',').map(n => Number(n.trim())).filter(n => Number.isFinite(n) && n >= 0);
    return pezzi.length > 0 ? pezzi : ATTESE;
  } catch {
    return ATTESE;
  }
}

// Vero quando l'errore dice «non ho potuto leggere i byte», e non «i byte non
// mi piacciono». È la distinzione che il 30/09 non si faceva: un file
// illeggibile usciva a video come un file di formato sbagliato, e l'operatore
// andava a cercare un originale che aveva già in mano.
//
// I nomi che contano sono quelli del `DOMException` del browser. Il confronto
// sul testo serve ai casi in cui il nome non arriva — qualche browser lo
// perde passando per `FileReader` — e non sostituisce il nome: lo integra.
const NOMI = ['NotReadableError', 'NotFoundError', 'SecurityError', 'AbortError'];

export function eLetturaNegata(errore) {
  if (!errore) return false;
  if (NOMI.includes(errore.name)) return true;
  const testo = String(errore.message || '');
  return /could not be read|permission problems|file could not be found|not be located/i.test(testo);
}

// I byte del file, con i tentativi. Se non ci riesce solleva l'ultimo errore
// del browser, arricchito con quanti tentativi sono stati fatti e in quanto
// tempo: è quello che poi si legge a video, e senza i numeri non si distingue
// «non ci ha nemmeno provato» da «ci ha provato quattro volte in cinque
// secondi».
export async function byteDiFile(file) {
  const attese = atteseRilettura();
  const avvio = Date.now();
  let ultimo = null;
  for (let tentativo = 0; tentativo <= attese.length; tentativo += 1) {
    if (tentativo > 0) await new Promise(r => setTimeout(r, attese[tentativo - 1]));
    try {
      return await unaLettura(file);
    } catch (errore) {
      ultimo = errore;
      // Un errore che non è di lettura non si ritenta: ritentare quattro volte
      // un file che il browser non sa aprire è solo tempo tolto all'operatore.
      if (!eLetturaNegata(errore)) break;
    }
  }
  const tentativi = eLetturaNegata(ultimo) ? attese.length + 1 : 1;
  const errore = new Error(String((ultimo && ultimo.message) || 'file non leggibile'));
  errore.name = (ultimo && ultimo.name) || 'NotReadableError';
  errore.tentativi = tentativi;
  errore.secondi = (Date.now() - avvio) / 1000;
  errore.originale = ultimo;
  throw errore;
}

function unaLettura(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  // `FileReader` per i browser che non hanno `Blob.arrayBuffer`. L'errore di
  // `FileReader` è un `DOMException` con lo stesso nome, quindi la
  // classificazione qui sopra vale anche per questa strada.
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(lettore.result);
    lettore.onerror = () => rifiuta(lettore.error || new Error('file non leggibile'));
    lettore.readAsArrayBuffer(file);
  });
}

// Lo stesso file, con i byte in memoria. Nome, tipo e `lastModified` si
// conservano: `lastModified` è la data di ripiego di una foto senza EXIF, e
// perderla qui vorrebbe dire far atterrare in archivio l'ora dell'invio.
export async function fileInMemoria(file) {
  const byte = await byteDiFile(file);
  return new File([byte], file.name || 'foto.jpg', {
    type: file.type || '',
    lastModified: Number(file.lastModified) || Date.now(),
  });
}

// La riga tecnica per la diagnosi a video: quanti tentativi, in quanto tempo,
// e cosa ha detto il browser.
export function descriviLettura(errore) {
  const tentativi = Number(errore && errore.tentativi) || 1;
  const secondi = Number(errore && errore.secondi) || 0;
  const quanti = `${tentativi} ${tentativi === 1 ? 'lettura tentata' : 'letture tentate'} in ${secondi.toFixed(1)} s`;
  const nome = (errore && errore.name) || 'errore';
  const messaggio = String((errore && errore.message) || '').slice(0, 160);
  return `${quanti} · ${nome}${messaggio ? `: ${messaggio}` : ''}`;
}
