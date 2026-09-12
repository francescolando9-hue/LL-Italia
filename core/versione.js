// Versione dell'app, in due letture che servono a cose diverse.
//
// **Quella che conta è `VERSIONE_CODICE`: la versione del codice che sta
// GIRANDO in questa pagina.** Finisce nel payload di ogni invio e nella pagina
// Informazioni, ed è l'unica che può essere usata per dire «su questo telefono
// la correzione c'è».
//
// Perché non si legge più dal nome della cache del service worker, come faceva
// prima questo file. Il service worker fa `skipWaiting()` e `clients.claim()`:
// appena una versione nuova è scaricata diventa quella attiva e **cancella la
// cache vecchia**, ma la pagina già aperta continua a eseguire i moduli
// JavaScript che aveva caricato — il browser non li ricarica da solo. Restava
// così una finestra, lunga quanto l'app resta aperta, in cui:
//
//   - la cache in giro era una sola, `llitalia-<nuova>`;
//   - il codice in esecuzione era ancora quello vecchio;
//   - e questo file rispondeva «nuova».
//
// Una versione che dichiara una correzione non presente è peggio di nessuna
// versione: fa dire «l'ho aggiornata e non funziona» quando il telefono non ha
// mai eseguito il codice nuovo, e stampa il numero sbagliato nella colonna
// `VersioneApp` della raccolta — cioè proprio nel dato che esiste per sapere
// con quale versione è stata mandata una foto.
//
// Il numero è quindi scritto in due posti, qui e in `sw.js`, e vanno cambiati
// insieme a ogni rilascio. Non è una duplicazione da evitare: è il confronto
// fra due osservazioni indipendenti — cosa sta girando e cosa è installato — e
// quando **non** coincidono l'app lo sa e lo dice, invece di tacere.

export const VERSIONE_CODICE = '0.26.0';

const PREFISSO = 'llitalia-';

// La versione del codice in esecuzione: quella da mandare al server e da
// mostrare all'operatore.
export async function versioneApp() {
  return VERSIONE_CODICE;
}

// La versione **installata** dal service worker, letta dal nome della cache.
// Può essere più avanti di quella in esecuzione: significa che il pacchetto
// nuovo è già sceso e aspetta solo che la pagina venga ricaricata.
export async function versioneInstallata() {
  if (!('caches' in window)) return '';
  try {
    const nomi = (await caches.keys()).filter(nome => nome.startsWith(PREFISSO));
    if (nomi.length === 0) return '';
    // La più alta, non la prima: durante un aggiornamento le cache coesistono
    // per qualche istante e l'ordine di `keys()` è quello di creazione.
    return nomi
      .map(nome => nome.replace(PREFISSO, ''))
      .sort(confrontaVersioni)
      .pop();
  } catch {
    return '';
  }
}

// Vero quando il pacchetto installato è diverso da quello in esecuzione: basta
// ricaricare per allinearli. Alla primissima apertura la cache non c'è ancora
// e non è un aggiornamento in attesa, è un'installazione in corso.
export async function aggiornamentoPronto() {
  const installata = await versioneInstallata();
  return Boolean(installata) && installata !== VERSIONE_CODICE;
}

function confrontaVersioni(a, b) {
  const pezziA = String(a).split('.').map(Number);
  const pezziB = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pezziA.length, pezziB.length); i += 1) {
    const differenza = (pezziA[i] || 0) - (pezziB[i] || 0);
    if (differenza !== 0) return differenza;
  }
  return 0;
}
