// Versione dell'app, letta dal nome della cache che il service worker ha
// davvero attiva: non è scritta due volte, quindi non può divergere dal codice.
// La usano la pagina Informazioni (per il supporto) e ogni invio del modulo
// Bolle (per sapere in raccolta con quale versione è stata mandata una bolla).

const PREFISSO = 'llitalia-';
let inMemoria = null;

export async function versioneApp() {
  if (inMemoria !== null) return inMemoria;
  if (!('caches' in window)) return '';
  try {
    const nomi = await caches.keys();
    const cache = nomi.find(nome => nome.startsWith(PREFISSO));
    // Vuoto, non un messaggio: il valore finisce anche in una colonna della
    // raccolta, dove una frase al posto di un numero sporca il dato.
    const trovata = cache ? cache.replace(PREFISSO, '') : '';
    // Si memorizza solo un valore vero: alla primissima apertura il service
    // worker non ha ancora scritto la cache, e ricordare quel vuoto lo
    // renderebbe definitivo per tutta la sessione.
    if (trovata) inMemoria = trovata;
    return trovata;
  } catch {
    return '';
  }
}
