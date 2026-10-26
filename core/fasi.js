// Le fasi di lavoro del gruppo: elenco chiuso, uguale per tutti i moduli.
//
// **Da dove viene.** Dal 24/10/2026 il gruppo articola ogni costo in tre
// livelli — **Fase → Attività → Lavorazione** — e l'elenco delle fasi è quello
// del master delle fasi e attività del gruppo, versione `2026-10-24.3`: le fasi
// con ambito «cantiere», quelle in uso. **L'app registra solo la fase**: più,
// nel modulo Foto, i livelli dell'archivio (piano, unità, prospetto, lotto, in
// `core/anagrafica.js`). L'attività e la lavorazione le decide chi codifica la
// fattura, e per i materiali l'attività la porta il codice articolo: non
// entrano nell'app. `gen` e `tec` (spese generali, commessa `UFF`) non sono
// fasi di cantiere e non sono qui. `Lotto1`–`Lotto3` non sono fasi: sono i
// lotti di SNU e BRU, e prendono il posto della fase solo su quelle commesse.
//
// **Due voci sono uscite col passaggio, quattro sono entrate.**
// - `Interrato` non è più una fase: l'interrato si legge dal **piano**, su
//   tutte le fasi. Chi scatta decide la fase dall'oggetto, non da chi lavora:
//   box, cantine, basculanti, pavimenti e finiture dell'interrato sono `Finitura
//   parti comuni interne` col piano interrato; gli impianti di box, cantine e
//   autorimessa `Impianto elettrico parti comuni`; il cemento armato resta
//   `Strutture`; scavo e reinterro `Scavi`.
// - `ImpiantiDiReteCondominiali` è sciolta in `FognaturaNera` e
//   `FognaturaBianca`: scarichi e collettori in PEAD vanno in una delle due, a
//   qualunque piano, interrato compreso.
// - Entrano `AcquistoTerreno`, `FognaturaBianca`, `FognaturaNera`, `SpeseTecniche`.
//
// **Le app non offrono tre fasi** (dalla 0.41.0, decisione di Francesco del
// 26/10/2026): `AcquistoTerreno`, `Marketing` e `SpeseTecniche` sono fasi della
// contabilità — su quelle non arrivano mai bolle né foto di cantiere. **La
// lista resta una sola**: `FASI` qui sotto resta la copia delle 29 fasi del
// master, controllata dall'impronta delle etichette, e `FASI_ESCLUSE_DALLE_APP`
// dichiara in una riga quali le app non mostrano. Il menù della fase è `FASI`
// meno le escluse (`vociSelettoreFase` in `core/anagrafica.js`): 26 voci, con
// o senza cantiere scelto, su ogni edificio e sulle commesse senza anagrafica;
// i lotti di SNU e BRU non cambiano. `etichettaFase` continua a dare
// l'etichetta anche delle escluse, per gli elementi già in coda, e le loro
// righe in `livelliPerFase` restano: il dato dell'anagrafica non cambia.
//
// **Niente è retroattivo.** Un elemento già in coda con una fase tolta parte
// com'è, col suo codice: l'elenco non lo blocca e non lo riscrive, e a video si
// legge il codice (vedi `etichettaFase`). Le foto già archiviate restano dove sono.
// Vale anche per le tre fasi escluse dalle app: quello che è in coda parte com'è.
//
// **L'elenco non si ritocca a mano.** È la copia di un master che vive fuori da
// questo repository e cambia solo con una consegna da Cowork: il collaudo
// `12-fase-e-barra.js` ricalcola l'impronta SHA-256 delle etichette, nell'ordine
// dell'elenco, e la confronta con quella del master della versione dichiarata.
// Una voce aggiunta, tolta, rinominata o spostata fa diventare rosso il
// collaudo. Chi aggiunge una fase tocca anche `core/anagrafica.js` (cosa
// pretende): un secondo collaudo verifica che i due elenchi combacino.
//
// CODICE ed ETICHETTA, come per i cantieri (core/cantieri.js) e le categorie
// delle foto. **Viaggia il codice**, senza spazi e in PascalCase; a video si
// legge l'etichetta, con gli spazi al posto giusto e con la grafia del master
// (`Impianto Antincendio` ha la maiuscola interna, ed è così). Deciso il
// 15/09/2026, quando si è deciso che sul server le foto d'archivio si smistano
// in una cartella per fase (`…\[Fase]\[AAAAMM]\`): le cartelle non possono avere
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
// Ordine alfabetico **sull'etichetta**, cioè sulla stringa che si legge a
// video — confronto italiano, senza distinzione di maiuscole e accenti —, non
// per frequenza e non per codice: sono ventinove voci, e in un elenco lungo si
// cerca per lettera, non per abitudine. Chi aggiunge una voce non decide dove
// metterla.
export const FASI = [
  { codice: 'AcquistoTerreno', etichetta: 'Acquisto terreno' },
  { codice: 'Bonifica', etichetta: 'Bonifica' },
  { codice: 'Cantiere', etichetta: 'Cantiere' },
  { codice: 'Consolidamento', etichetta: 'Consolidamento' },
  { codice: 'Demolizione', etichetta: 'Demolizione' },
  { codice: 'Extra', etichetta: 'Extra' },
  { codice: 'FinituraAlloggi', etichetta: 'Finitura alloggi' },
  { codice: 'FinituraFacciata', etichetta: 'Finitura facciata' },
  { codice: 'FinituraPartiComuniInterne', etichetta: 'Finitura parti comuni interne' },
  { codice: 'FognaturaBianca', etichetta: 'Fognatura bianca' },
  { codice: 'FognaturaNera', etichetta: 'Fognatura nera' },
  { codice: 'Impermeabilizzazioni', etichetta: 'Impermeabilizzazioni' },
  { codice: 'ImpiantoAntincendio', etichetta: 'Impianto Antincendio' },
  { codice: 'ImpiantoAscensore', etichetta: 'Impianto ascensore' },
  { codice: 'ImpiantoElettricoAlloggi', etichetta: 'Impianto elettrico alloggi' },
  { codice: 'ImpiantoElettricoPartiComuni', etichetta: 'Impianto elettrico parti comuni' },
  { codice: 'ImpiantoFotovoltaico', etichetta: 'Impianto fotovoltaico' },
  { codice: 'ImpiantoIdrosanitario', etichetta: 'Impianto idrosanitario' },
  { codice: 'ImpiantoSEFCC', etichetta: 'Impianto SEFCC' },
  { codice: 'ImpiantoTermicoAlloggi', etichetta: 'Impianto termico alloggi' },
  { codice: 'ImpiantoTermicoCondominiale', etichetta: 'Impianto termico condominiale' },
  { codice: 'Marketing', etichetta: 'Marketing' },
  { codice: 'Murature', etichetta: 'Murature' },
  { codice: 'Ponteggio', etichetta: 'Ponteggio' },
  { codice: 'Scavi', etichetta: 'Scavi' },
  { codice: 'SistemazioneEsterna', etichetta: 'Sistemazione esterna' },
  { codice: 'SpeseTecniche', etichetta: 'Spese tecniche' },
  { codice: 'Strutture', etichetta: 'Strutture' },
  { codice: 'Urbanizzazioni', etichetta: 'Urbanizzazioni' },
];

// Fasi della contabilità che le app non offrono: decisione di Francesco del 26/10/2026 (vedi in testa).
export const FASI_ESCLUSE_DALLE_APP = ['AcquistoTerreno', 'Marketing', 'SpeseTecniche'];

export function faseValida(codice) {
  return FASI.some(f => f.codice === String(codice || '').trim());
}

// A video si legge l'etichetta; se arriva un codice che non c'è — una fase
// tolta dall'elenco (`Interrato`, `ImpiantiDiReteCondominiali`), una bolla o
// una foto accodate prima dell'aggiornamento — si mostra il codice così com'è
// invece di far sparire il dato.
export function etichettaFase(codice) {
  const trovata = FASI.find(f => f.codice === codice);
  return trovata ? trovata.etichetta : (codice || '');
}

// Le opzioni del menù a tendina NON si costruiscono qui: le costruisce
// `core/anagrafica.js` (`opzioniFaseOLotto`), perché dipendono dalla commessa —
// un'urbanizzazione mostra i lotti al posto delle fasi, un edificio le mostra
// tutte. Questo file resta quello che era: l'elenco chiuso, e niente di più.
