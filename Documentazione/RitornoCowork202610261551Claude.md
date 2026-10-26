# Ritorno a Cowork — app LL Italia 0.40.0: le 29 fasi del passaggio a fasi e attività

> 26/10/2026 ore 15:51 · dalla sessione Claude Code cloud del repository dell'app, per il progetto **FotoCantiere**. Questo file è un messaggio, non una fonte: riscontralo sul codice, sui commit e sui registri prima di registrarlo. Sono soli dati, quelli che la specifica chiede. Il repository è pubblico: qui non ci sono percorsi del server né dati veri. Specifica ricevuta: `Documentazione/FotoCantiereSpecificaAppFasiPassaggio202610261407Claude.md`, rev. 2. **La PR non è unita: unisce Francesco, dopo il tuo riscontro.**

## 1. Commit, file modificati, primo arresto

- **Punto di partenza:** `main` a `9f6eee4` (0.39.0, unione della PR 71), quello indicato dalla specifica: nessun commit in più da elencare.
- **Commit del lavoro**, ramo `claude/friendly-feynman-9d89na`:

  | Commit | Cosa |
  |---|---|
  | `3c86723` | la specifica, invariata, in `Documentazione/` |
  | `0e4f4f0` | `core/fasi.js` a 29 voci; blocco `ANAGRAFICA` rigenerato dal JSON del §8; tolte le tre regole speciali di `Interrato` |
  | `424ac3f` | «Rimanda»: la fase fra le cose mancanti (una riga, vedi sotto) |
  | `d1751fb` | versione `0.40.0` in `sw.js` e `core/versione.js`, insieme |
  | `fc7fef7` | collaudo 12 |
  | `dc0a9ac` | collaudo 15 |
  | `03fecbd` | collaudi 20 e 23 |
  | `b23042d` | collaudo 16 |
  | `f74ecfc` | README e LEGGIMI dei collaudi |
  | `9d0fcb2` | specifica Foto rev. 23 e specifica Bolle rev. 10 |
  | `e1914f5` | `CLAUDE.md` (solo la riga di `core/fasi.js`; l'estratto delle regole di condotta non è toccato), commit dedicato |

  Più il commit di questo file.
- **File modificati rispetto a `9f6eee4`** (16 prima di questo file): `core/fasi.js`, `core/anagrafica.js`, `core/versione.js`, `sw.js`, `modules/foto/index.js`, `collaudi/12-fase-e-barra.js`, `15-livelli.js`, `16-rimanda.js`, `20-fase-senza-memoria.js`, `23-palazzina-parti-comuni.js`, `collaudi/LEGGIMI.md`, `README.md`, `docs/AppFotoCantiereSpecifica….md`, `docs/AppBolleSpecificaFunzionale….md`, `CLAUDE.md`, la specifica. `docs/INDICE.md` non cambia: nessun documento cambia nome.
- **Esito del primo arresto: una differenza fra specifica e codice, risolta da Francesco.** Il caso 14 (§4.1) prevedeva, per «Rimanda» su una foto inviata con `Interrato`, il pulsante spento con «Scegli la fase per rimandarla.», e il §5 «nessuna modifica». Sul codice di `9f6eee4` non era così: il menù partiva da «— scegli la fase —», ma «Rimanda corretta» restava **accesa** e rimandava la foto con `fase` vuota, perché `lettureRimando` non nominava la fase fra le cose mancanti (visto anche sul guasto H6, sotto). Francesco ha scelto di aggiungere la fase alle cose mancanti: **una riga** in `modules/foto/index.js`, e basta. Nessun'altra differenza oltre quelle del §2. L'impronta del JSON del §8 e quella delle etichette del §3.1 coincidono con le dichiarate. Nel dato, la riga `8B` di `etichetteUnita` di MNG torna in seconda posizione (il JSON del §8 conserva l'ordine originale; il blocco della 0.39.0 la aveva in fondo): nessun valore cambia, e l'impronta è sulla forma canonica.

## 2. Numeri del collaudo

- **Suite intera sul ramo (`e1914f5`): 23 collaudi, 677 controlli ✓, 0 ✗.** Il dato di partenza era 645: **+32**. Per collaudo: 12 da 37 a 48 (+11), 15 da 91 a 99 (+8), 16 da 27 a 36 (+9), 23 da 129 a 133 (+4), tutti gli altri invariati (20 resta a 23).
  - **12:** tolti «ci sono le 27 fasi» e «in ordine alfabetico»; aggiunti 29 fasi, fasi tolte assenti, quattro nuove presenti, ordine sull'etichetta, copia esatta del master (impronta), 29 voci su MNG, MAR e MRS, e Bolle: «— nessuna fase —» + 29 fasi e `FognaturaNera` senza livelli.
  - **15:** tolti 17 controlli (27 fasi, i due filtri di `Interrato`, SNZ2.2 · `Interrato`, due voci uniche e una senza voci, MRS a 27); aggiunti 25 (ordine sull'etichetta, 32 voci, 10/4/1/14, 60 combinazioni senza voci uniche né mancanti, MAR = MNG a 29, prova sintetica della voce unica del piano, `FognaturaNera`, `FinituraPartiComuniInterne`, `SpeseTecniche`, `AcquistoTerreno`, MRS a 29).
  - **16:** +9, tutti nuovi (casi 12, 13, 14).
  - **23:** caso 3 e caso 28 riscritti; nuovo caso **34**; il riepilogo passa da «33 su 33» a «34 su 34».
  - **20:** dove sceglieva `Interrato` sceglie `Strutture`; stesso numero di controlli.
- **Casi del §4.1 → collaudo:** 1, 2, 3, 15 → 12; 4 → 15 (invariato); 5, 7, 8, 9, 16 → 15; 6 → 23 (caso 34); 10 → 23 (caso 3); 11 → 23 (caso 28); 12, 13, 14 → 16; 17 → 20 (i controlli di «fase e livelli tornano allo stato di partenza», già esistenti, ora sulla fase `Strutture`).
- **Numeri attesi del §4.2, tutti misurati dall'app:**
  - collaudo 12: 29 fasi; `VERSIONE_MASTER_FASI` `2026-10-24.3`; impronta delle etichette `682df6edbc092d8caf2dcf7e2e0ca68c13a5a57bc4e5404a39db8b68edb0dc1d`;
  - collaudo 15: versione `202610261235`, impronta `ecb2c273fa623b24291ba792530d12359e1c4ae0c0f996c2e980a31729a12ec4`; 32 voci in `livelliPerFase`; commesse del conteggio MAR, MNG, SNZ2.2, TN1 (ricavate dal menù e dall'anagrafica); 60 combinazioni; 0 a voce unica; 0 senza voci; piani 4, 12, 15, 6; unità 15, 16, 51, 64;
  - fasi per livello: 10 piano, 4 unità, 1 prospetto, 14 nessuno.
- **Controllo di riservatezza:** `node collaudi/riservatezza.js` su 92 file del repository, niente da segnalare; l'hook `.githooks/pre-commit` ha letto ogni commit. **Il controllo su GitHub (sulla testa della PR) non è ancora misurato:** parte con la PR.
- **Impronte ricalcolate sul ramo**, da Node sui file e non dal browser: blocco `ANAGRAFICA` versione `202610261235`, SHA-256 `ecb2c273fa623b24291ba792530d12359e1c4ae0c0f996c2e980a31729a12ec4`, 7319 byte; etichette delle 29 fasi, SHA-256 `682df6edbc092d8caf2dcf7e2e0ca68c13a5a57bc4e5404a39db8b68edb0dc1d`, 555 byte. `sw.js` e `core/versione.js` sono entrambi a `0.40.0`.
- **Guasti messi apposta, visti rossi**, su copie del commit `e1914f5` e mai sul repository; la copia senza guasti, sui collaudi 02, 12, 15, 16, 20, 23, era verde (0 falliti). Il numero conta i controlli falliti e quelli esplosi:

  | Guasto | Controlli rossi |
  |---|---|
  | H1 un'etichetta cambiata in `core/fasi.js` («Impianto antincendio») | 1 nel 12 (impronta delle etichette) |
  | H2 una voce cambiata nel blocco `ANAGRAFICA` | 1 nel 15 (impronta) |
  | H3 filtro per commessa rimesso: MAR perde una fase | 2: 1 nel 12 e 1 nel 15 (MAR 28 voci, MNG 29) |
  | H4 `sw.js` a `0.40.1`, non allineato a `core/versione.js` | 2 nel 02 |
  | H5 una fase (`Ponteggio`) senza riga in `livelliPerFase` | 3 nel 15: coerenza, impronta, e un'esplosione del conteggio |
  | H6 «Rimanda» senza la fase fra le cose mancanti | 1 nel 16 (caso 14: il pulsante resta acceso) |
  | H7 un codice di fase che non c'è più si legge come vuoto | 2 nel 16 (casi 12 e 13) |
  | H8b voce unica del piano spenta nella vista | 3 nel 15 (menù che resta, niente «P0 — Piano terra», niente valore) |
  | H9 il piano messo dall'app si porta dietro al cambio di fase | 2 nel 15 (prova sintetica) |
  | H10 due fasi scambiate di posto | 4: 3 nel 12 e 1 nel 15 |
  | H11 `Interrato` rimessa fra le fasi | 14: 9 nel 12, 3 nel 15, 2 nel 23 (caso 28 e riepilogo dei casi) |

  **Un guasto non visto, e perché.** H8, la stessa voce unica spenta ma in `risolvi` (`vocePiano = null`), è rimasto **verde**: la vista imposta da sola il valore unico e nasconde il menù, quindi il payload non cambia e il numero delle voci uniche resta 0 comunque. Non è un buco del collaudo ma un guasto messo dove non si vede; rifatto nella vista (H8b) è rosso. Il ramo `risolvi` per il piano unico è quindi ridondante con la vista per tutto ciò che il collaudo osserva.

## 3. Ingressi che cambiano comportamento rispetto a `9f6eee4`

Quelli attesi dal §7, tutti verificati dai collaudi:

- menù della fase da 27 a 29 voci su MNG, SNZ2.2, TN1 e sulle commesse senza anagrafica, da 26 a 29 su MAR, in foto e in bolle;
- SNZ2.2 e TN1 non scelgono più il `P-1` da sole (erano le due voci uniche, in `Interrato`): con `FinituraPartiComuniInterne` il piano si sceglie fra tutti;
- `FognaturaBianca` e `FognaturaNera` chiedono il piano (su TN1 anche il lotto, sui piani che stanno in una palazzina); `AcquistoTerreno` e `SpeseTecniche` non chiedono niente;
- gli elementi in coda con fasi tolte partono col codice vecchio (casi 12 e 13, sul payload e a video);
- «Rimanda» su una foto con fase tolta chiede una fase nuova: pulsante spento con «Scegli la fase per rimandarla.», poi «Rimanda corretta» con `idClient` nuovo.

Trovati durante il lavoro: **nessun altro**. Il contratto col flow non cambia (`fase` porta il codice, nessun campo nuovo o tolto).

## 4. Punti aperti

1. **Da eseguire dopo l'unione: la lettura del sito pubblicato.** `node collaudi/pubblicato.js` da una macchina che raggiunge il sito. Da questa sessione non riesce: ho provato adesso e risponde «fetch failed», quindi non è misurata né la versione né l'impronta in esercizio. Sul telefono, dopo un ricarico: pagina Informazioni con versione `0.40.0` e anagrafica `202610261235`.
2. **Difetto preesistente, non toccato:** una riga video nella coda del modulo Foto fa sbordare la pagina in orizzontale e sposta fuori schermo la barra «Invia» (ritorno del 13/10/2026, punto 2). Il collaudo 23 lo aggira ripartendo da una coda vuota; in 16 e 15 non compare perché non si mandano video.
3. **Testo fuori perimetro che dice ancora sette commesse:** specifica Foto §2 («Sette commesse dal 16/09/2026 — …») e README, paragrafo del cantiere senza memoria («ha sette voci»). Con TN1 le commesse sono otto dalla 0.39.0. Non è nel perimetro e non l'ho toccato.
4. **Non verificato:** il telefono vero (solo emulazione Playwright). I record dei casi 12, 13 e 14 sono scritti a mano nel database, nella forma che il codice di `9f6eee4` lascia, e non vengono da un telefono aggiornato davvero. Il ricevente: come tratta in raccolta `Interrato` e `ImpiantiDiReteCondominiali` per le righe di prima, e gli script a valle per i percorsi di `FognaturaBianca`, `FognaturaNera`, `AcquistoTerreno`, `SpeseTecniche` e `FinituraPartiComuniInterne` col piano interrato, non sono nel repository.
5. **`Rimanda` è stato modificato** (una riga) nonostante il §5: per scelta di Francesco, vedi il primo arresto. Se il master vuole la sola verifica, la riga si toglie e il caso 14 diventa «Rimanda corretta resta accesa»: il guasto H6 mostra esattamente quel comportamento.
