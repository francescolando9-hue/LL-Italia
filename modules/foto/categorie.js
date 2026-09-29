// Il tipo di foto: uno solo, dal 29/09/2026.
//
// **La scelta Avanzamento / Archivio non esiste più** (deciso da Francesco):
// tutto quello che si manda da questa app va in archivio, e per le urgenze si
// usa WhatsApp. Erano due categorie con due trattamenti — l'avanzamento
// compresso a 2500 px per partire con poca rete, l'archivio a risoluzione
// originale — e la distinzione ha smesso di servire.
//
// **IL CAMPO `tipo` RESTA NEL PAYLOAD, sempre valorizzato.** È il punto da non
// sbagliare, ed è il motivo per cui questo file non è stato cancellato:
//
//   - il flow compone il NOME DEL FILE da `tipo`;
//   - lo script archiviatore prende solo gli elementi con `Tipo = ARCHIVIO`.
//
// Un invio senza `tipo`, o con `tipo` vuoto, atterrerebbe in raccolta e
// resterebbe lì per sempre: nessun errore, nessun avviso, e nessuno che se ne
// accorga finché qualcuno non va a cercare una foto che credeva archiviata.
// Si è tolta la scelta, non il campo — e l'invio ha un ripiego su questo
// valore (`modules/foto/invio.js`) proprio perché quella colonna non può
// essere vuota.
export const TIPO_ARCHIVIO = 'ARCHIVIO';

// A video, per i record accodati PRIMA della 0.37.0. In coda può esserci
// ancora una foto di tipo `AVANZAMENTO`: quella non verrà archiviata dallo
// script a valle, quindi va riconosciuta a colpo d'occhio invece di
// confondersi con le altre. Per `ARCHIVIO`, che ormai è la norma, non si
// scrive niente: un'etichetta uguale su ogni riga non distingue nulla.
const ETICHETTE = {
  ARCHIVIO: '',
  AVANZAMENTO: 'Avanzamento',
};

export function etichettaCategoria(codice) {
  const nota = Object.prototype.hasOwnProperty.call(ETICHETTE, codice);
  return nota ? ETICHETTE[codice] : String(codice || '');
}
