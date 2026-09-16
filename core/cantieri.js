// Anagrafica dei cantieri attivi, condivisa da tutti i moduli.
// Sta nella shell e non in un modulo perché due elenchi separati potrebbero
// divergere, e una commessa presente in un modulo e assente nell'altro è un
// dato sbagliato che arriva a destinazione senza far rumore.
// A video l'etichetta estesa, nel payload SOLO il codice commessa: l'elenco è
// in codice, non modificabile dal dispositivo, perché un codice errato
// arriverebbe a destinazione come commessa inesistente.
//
// Sette commesse dal 16/09/2026, erano tre. L'elenco lo dà Francesco: non si
// aggiunge né si corregge una commessa di propria iniziativa.
//
// **L'ordine del menù non dipende dall'ordine di questo elenco.** È il
// `sort()` qui sotto a metterlo in ordine alfabetico di codice, una volta al
// caricamento del modulo: chi aggiunge una commessa domani la scrive dove
// capita e il menù resta in ordine, senza doversene ricordare. Ordinare a
// mano l'elenco avrebbe funzionato finché qualcuno non si distrae — e
// l'elenco è quello che si scorre col pollice in cantiere, dove una voce
// fuori posto si cerca due volte.
export const CANTIERI = [
  { codice: 'MAR', etichetta: 'MAR - Caselle Torinese' },
  { codice: 'SNZ2.2', etichetta: 'SNZ2.2 - Settimo Torinese' },
  { codice: 'MNG', etichetta: 'MNG - via Monginevro 181' },
  { codice: 'BRU', etichetta: 'BRU - urbanizzazioni via Bardonecchia' },
  { codice: 'MRS', etichetta: 'MRS - via Marsigli 11-13-15' },
  { codice: 'SNU', etichetta: 'SNU - urbanizzazioni Settimo Torinese' },
  { codice: 'SNZ2.1', etichetta: 'SNZ2.1 - via Eva Mameli Calvino 7' },
].sort((a, b) => a.codice.localeCompare(b.codice, 'it'));

export function etichettaCantiere(codice) {
  const trovato = CANTIERI.find(c => c.codice === codice);
  return trovato ? trovato.etichetta : codice;
}

export function codiceValido(codice) {
  return CANTIERI.some(c => c.codice === codice);
}
