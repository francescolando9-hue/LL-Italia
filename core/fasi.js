// Le fasi di lavoro del gruppo: elenco chiuso, uguale per tutti i moduli.
//
// Il lavoro è diviso in fasi → attività → lavorazioni; qui si sceglie il
// livello delle **fasi**, che è quello a cui una bolla di consegna o una foto
// di cantiere si attribuisce sul momento, senza dover conoscere il
// cronoprogramma. Elenco dato da Francesco il 14/09/2026. «CMC 128» c'era ed
// è stata tolta lo stesso giorno su sua decisione (è un codice di commessa,
// non una fase); «Impianto SEFCC» era in rosso nell'elenco d'origine e resta
// finché non decide lui — togliere una voce è un rigo, aggiungerla dopo che
// le bolle sono già partite senza è un buco.
//
// CODICE ed ETICHETTA, come per i cantieri (core/cantieri.js) e le categorie
// delle foto. **Viaggia il codice**, senza spazi e in PascalCase; a video si
// legge l'etichetta, con gli spazi al posto giusto. Deciso il 15/09/2026,
// quando si è deciso che sul server le foto d'archivio si smistano in una
// cartella per fase (`…\[Fase]\[AAAAMM]\`): le cartelle non possono avere
// spazi, e se il valore in colonna fosse «Finitura alloggi» mentre la
// cartella si chiama «FinituraAlloggi» servirebbe una tabella di conversione
// — una seconda verità che il giorno che si aggiunge una fase si disallinea
// in silenzio. Col codice il nome della cartella È il valore della colonna,
// e non c'è niente da tenere allineato.
//
// Quando è obbligatoria (facoltativa il 14/09, poi ristretta il 15/09, tutte
// e due decisioni di Francesco): **obbligatoria solo nel modulo Foto e solo
// per la categoria ARCHIVIO**, perché quelle foto vanno sul server nella
// cartella della fase e una foto senza fase non saprebbe dove andare.
// Facoltativa per l'avanzamento lavori, che resta in raccolta e non si
// smista, e per le bolle: meglio una bolla senza fase che una bolla ferma
// perché l'operatore non sa quale.
//
// La regola sta nei moduli, non qui: questo file dice quali sono le fasi, non
// chi deve indicarle. «— nessuna fase —» resta quindi una voce selezionabile
// in tutti i casi, e dov'è obbligatoria è l'invio a fermarsi spiegando —
// un elenco con due comportamenti diversi sarebbero due elenchi.
//
// Perché un elenco e non un campo libero: vale lo stesso ragionamento degli
// operatori (core/operatori.js). «Murature», «murature», «Muratura» e
// «Murat.» in raccolta sono quattro fasi, e nessun conteggio per fase regge.
//
// Ordine alfabetico, non per frequenza: sono ventisette voci, e in un elenco
// lungo si cerca per lettera, non per abitudine.
//
// `Sistemazione esterna` aggiunta il 18/09/2026 su decisione di Francesco.
// «Sistemazione esterna» è anche il nome di un'attività in contabilità: la
// coincidenza è nota e accettata, e si governa a valle qualificando il dominio
// in una colonna — non rinominando quello che l'operatore legge in cantiere.
export const FASI = [
  { codice: 'Bonifica', etichetta: 'Bonifica' },
  { codice: 'Cantiere', etichetta: 'Cantiere' },
  { codice: 'Consolidamento', etichetta: 'Consolidamento' },
  { codice: 'Demolizione', etichetta: 'Demolizione' },
  { codice: 'Extra', etichetta: 'Extra' },
  { codice: 'FinituraAlloggi', etichetta: 'Finitura alloggi' },
  { codice: 'FinituraFacciata', etichetta: 'Finitura facciata' },
  { codice: 'FinituraPartiComuniInterne', etichetta: 'Finitura parti comuni interne' },
  { codice: 'Impermeabilizzazioni', etichetta: 'Impermeabilizzazioni' },
  { codice: 'ImpiantiDiReteCondominiali', etichetta: 'Impianti di rete condominiali' },
  { codice: 'ImpiantoAntincendio', etichetta: 'Impianto Antincendio' },
  { codice: 'ImpiantoAscensore', etichetta: 'Impianto ascensore' },
  { codice: 'ImpiantoElettricoAlloggi', etichetta: 'Impianto elettrico alloggi' },
  { codice: 'ImpiantoElettricoPartiComuni', etichetta: 'Impianto elettrico parti comuni' },
  { codice: 'ImpiantoFotovoltaico', etichetta: 'Impianto fotovoltaico' },
  { codice: 'ImpiantoIdrosanitario', etichetta: 'Impianto idrosanitario' },
  { codice: 'ImpiantoSEFCC', etichetta: 'Impianto SEFCC' },
  { codice: 'ImpiantoTermicoAlloggi', etichetta: 'Impianto termico alloggi' },
  { codice: 'ImpiantoTermicoCondominiale', etichetta: 'Impianto termico condominiale' },
  { codice: 'Interrato', etichetta: 'Interrato' },
  { codice: 'Marketing', etichetta: 'Marketing' },
  { codice: 'Murature', etichetta: 'Murature' },
  { codice: 'Ponteggio', etichetta: 'Ponteggio' },
  { codice: 'Scavi', etichetta: 'Scavi' },
  { codice: 'SistemazioneEsterna', etichetta: 'Sistemazione esterna' },
  { codice: 'Strutture', etichetta: 'Strutture' },
  { codice: 'Urbanizzazioni', etichetta: 'Urbanizzazioni' },
];

export function faseValida(codice) {
  return FASI.some(f => f.codice === String(codice || '').trim());
}

// A video si legge l'etichetta; se arriva un codice che non c'è — una fase
// tolta dall'elenco, una bolla vecchia — si mostra il codice così com'è
// invece di far sparire il dato.
export function etichettaFase(codice) {
  const trovata = FASI.find(f => f.codice === codice);
  return trovata ? trovata.etichetta : (codice || '');
}

// Le opzioni del menù a tendina NON si costruiscono qui: le costruisce
// `core/anagrafica.js` (`opzioniFaseOLotto`), perché dalla 0.36.0 dipendono
// dalla commessa — un'urbanizzazione mostra i lotti al posto delle fasi, e una
// commessa senza piani interrati non mostra `Interrato`. Questo file resta
// quello che era: l'elenco chiuso, e niente di più.
