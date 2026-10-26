# App LL Italia 0.40.0 — fasi del passaggio a fasi e attività: specifica delle modifiche

> **26/10/2026 ore 14:07, rev. 2 · Cowork, progetto FotoCantiere, per Francesco Lando · destinataria: la sessione di Claude Code del repository `LL-Italia`.**
> - **Rispetto alla rev. 1 delle 12:50**, su indicazione di Francesco Lando del 26/10/2026 alle 14:00: tolto il punto sull'ultima fase scelta, perché dalla 0.37.9 l'app non la ricorda; corretto l'elenco delle commesse del collaudo 15, perché TN1 è nel menù dalla 0.39.0; **allineamento di tutta l'app e dei suoi documenti di riferimento** al passaggio a fasi e attività (§3.4–§3.6); impronta delle etichette delle fasi (§3.1); «Rimanda» invariato (§5); aggiunte le sezioni dati in ingresso, tabella dei casi, fuori perimetro, ordine di lavoro con i due arresti e ritorno.
> - **Partenza:** `main` a `9f6eee4` (0.39.0, merge della PR #71 del 14/10/2026), riletto da Cowork sul repository il 26/10/2026 alle 14:07. Se `main` è andato avanti, è un primo arresto (§6).
> - **Fonte delle regole:** due master, che non sono nel repository. (a) Il **master delle fasi e attività del gruppo** (`FasiAttivita.json`, versione `2026-10-24.3`): da qui vengono elenco ed etichette delle fasi. (b) Il **master dell'anagrafica** del progetto FotoCantiere, versione `202610261235`: da qui vengono i livelli, e il suo dato è al §8 con l'impronta. Le regole che servono all'app sono riportate al §1. **Se questa specifica e il JSON del §8 divergono, vale il JSON.** Questo documento, il `CLAUDE.md` e il codice bastano per lavorare.
> - **Decisioni:** passaggio a fasi e attività del gruppo del 24/10/2026 e scelte di Francesco Lando del 26/10/2026 — nell'app entrano **tutte le 29 fasi di cantiere** del master; `FognaturaBianca` e `FognaturaNera` col **piano obbligatorio**; le foto già archiviate restano dove sono; **«Rimanda» non si modifica**.
> - **Copia depurata:** niente percorsi del server, identificativi o dati di clienti; i master restano nel progetto FotoCantiere e fra gli standard del gruppo.

## 1. Le regole, dai master

1. **Tre livelli, uno solo nell'app.** Ogni costo del gruppo si articola in **Fase → Attività → Lavorazione**. L'app registra **solo la fase** — più, nel modulo Foto, i livelli dell'archivio (piano, unità, prospetto, lotto) —: l'attività e la lavorazione le decide chi codifica la fattura, e per i materiali l'attività la porta il codice articolo. Attività e lavorazioni **non entrano nell'app**.
2. **Le fasi sono le 29 fasi di cantiere del master**, in ordine alfabetico sull'etichetta, con la grafia del master (`Impianto Antincendio` con la maiuscola interna). Viaggia il codice, PascalCase senza spazi; a video si legge l'etichetta. `Lotto1`–`Lotto3` restano solo su SNU e BRU, al posto della fase. `gen` e `tec` (spese generali, commessa `UFF`) non entrano nell'app.
3. **Escono** `Interrato` e `ImpiantiDiReteCondominiali`; **entrano** `AcquistoTerreno`, `FognaturaBianca`, `FognaturaNera` e `SpeseTecniche`. Nel menù della fase (moduli Foto e Bolle) le voci passano da 27 a **29** su MNG, SNZ2.2, TN1 e sulle commesse senza anagrafica, e da 26 a **29** su MAR.
4. **L'interrato non è più una fase:** si legge dal piano, su tutte le fasi. **Cade il filtro di `Interrato`** e nessuna fase si nasconde più per commessa. Per chi scatta valgono le regole di attribuzione del gruppo: **la fase si decide dall'oggetto, non da chi lavora**; box, basculanti, cantine, pavimenti e finiture dell'interrato in `Finitura parti comuni interne` col piano interrato; impianti di box, cantine e autorimessa in `Impianto elettrico parti comuni`; cemento armato in `Strutture`; scavo e reinterro in `Scavi`; scarichi e collettori in PEAD in `Fognatura nera` o `Fognatura bianca`, a qualunque piano, interrato compreso.
5. **Livelli delle fasi nuove:** `FognaturaBianca` e `FognaturaNera` piano obbligatorio — `<Fase>\<Piano>\`, come la vecchia `ImpiantiDiReteCondominiali`, e a TN1 con il lotto della regola 7 sui piani che stanno in una palazzina —; `AcquistoTerreno` e `SpeseTecniche` nessun livello, `<Fase>\<AAAAMM>\`. Sulle 29 fasi: **10 vogliono il piano, 4 l'unità, 1 il prospetto, 14 nessun livello**.
6. **Niente è retroattivo.** Un elemento già in coda con `Interrato` o `ImpiantiDiReteCondominiali` parte com'è, col suo codice, senza blocco e senza riscrittura; a valle lo tratta il ricevente, fuori da questo lavoro. Le foto già archiviate restano dove sono.
7. **La regola della voce unica resta** (un livello obbligatorio con una sola voce possibile non si chiede: lo sceglie l'app e lo mostra col perché). Con questa anagrafica **non ha più casi reali**: si prova su una commessa sintetica.

## 2. Dati in ingresso

- **`main` a `9f6eee4`:** app 0.39.0; `core/fasi.js` con 27 fasi; blocco `ANAGRAFICA` alla versione `202610101049`, impronta `df5dd3f6…`, 7208 byte, 30 voci in `livelliPerFase`; menù con 8 commesse, di cui 4 edifici con anagrafica (MAR, MNG, SNZ2.2, TN1); suite di 23 collaudi, **645 controlli** (ritorno del 13/10/2026).
- **JSON del §8:** versione `202610261235`, impronta `ecb2c273fa623b24291ba792530d12359e1c4ae0c0f996c2e980a31729a12ec4`, 7319 byte in forma canonica (chiavi ordinate, nessuno spazio, UTF-8). Rispetto al blocco di oggi cambiano **solo** `versione` e `livelliPerFase` (escono 2 voci, ne entrano 4: 32 voci). Qualunque altra differenza è un arresto.
- **Etichette delle 29 fasi** dal master delle fasi `2026-10-24.3` (fasi con ambito «cantiere» e in uso, nell'ordine del master): impronta SHA-256 dell'array JSON delle etichette, senza spazi, UTF-8 — **`682df6edbc092d8caf2dcf7e2e0ca68c13a5a57bc4e5404a39db8b68edb0dc1d`**, 555 byte. In JavaScript: SHA-256 di `JSON.stringify(FASI.map(f => f.etichetta))`.
- **Dove compaiono oggi `Interrato` e `ImpiantiDiReteCondominiali`**, fuori da `Documentazione/` (rilevato da Cowork su `9f6eee4`; elenco indicativo, si ricontrolla con una ricerca): `core/fasi.js`; `core/anagrafica.js` — filtro della fase in `vociSelettoreFase`, filtro dei piani sotto quota in `pianiPerFase`, `haInterrati`, frase della voce unica per `Interrato`, commenti —; `collaudi/12-fase-e-barra.js`, `15-livelli.js`, `20-fase-senza-memoria.js`, `23-palazzina-parti-comuni.js`, `collaudi/LEGGIMI.md`; `README.md`; `docs/AppFotoCantiereSpecifica….md`; `docs/AppBolleSpecificaFunzionale….md` (solo note di revisione); come stringa d'esempio di percorso relativo in `collaudi/riservatezza.js` e `collaudi/22-riservatezza.js`.
- **Comportamento di oggi da tenere presente:** la fase non si ricorda e non si preseleziona dalla 0.37.9 (collaudo 20); nel modulo Foto il menù della fase parte da «— scegli la fase —», nelle bolle da «— nessuna fase —»; le bolle non chiedono livelli; il riquadro «Rimanda» parte dai valori della foto già inviata.

## 3. Modifiche

### 3.1 `core/fasi.js`

L'elenco diventa questo, codice ed etichetta, in quest'ordine:
`AcquistoTerreno` Acquisto terreno · `Bonifica` Bonifica · `Cantiere` Cantiere · `Consolidamento` Consolidamento · `Demolizione` Demolizione · `Extra` Extra · `FinituraAlloggi` Finitura alloggi · `FinituraFacciata` Finitura facciata · `FinituraPartiComuniInterne` Finitura parti comuni interne · `FognaturaBianca` Fognatura bianca · `FognaturaNera` Fognatura nera · `Impermeabilizzazioni` Impermeabilizzazioni · `ImpiantoAntincendio` Impianto Antincendio · `ImpiantoAscensore` Impianto ascensore · `ImpiantoElettricoAlloggi` Impianto elettrico alloggi · `ImpiantoElettricoPartiComuni` Impianto elettrico parti comuni · `ImpiantoFotovoltaico` Impianto fotovoltaico · `ImpiantoIdrosanitario` Impianto idrosanitario · `ImpiantoSEFCC` Impianto SEFCC · `ImpiantoTermicoAlloggi` Impianto termico alloggi · `ImpiantoTermicoCondominiale` Impianto termico condominiale · `Marketing` Marketing · `Murature` Murature · `Ponteggio` Ponteggio · `Scavi` Scavi · `SistemazioneEsterna` Sistemazione esterna · `SpeseTecniche` Spese tecniche · `Strutture` Strutture · `Urbanizzazioni` Urbanizzazioni.

Il commento di testa dice: da dove viene l'elenco (passaggio a fasi e attività del 24/10/2026, master delle fasi `2026-10-24.3`, fasi di cantiere); il modello Fase → Attività → Lavorazione e il fatto che l'app registra solo la fase (§1.1); la storia delle due voci tolte (`Interrato`: l'interrato si legge dal piano; `ImpiantiDiReteCondominiali`: sciolta in `FognaturaNera` e `FognaturaBianca`); che l'elenco **non si ritocca a mano** e cambia solo con una consegna da Cowork, controllata dall'impronta delle etichette. Escono le frasi superate: «ventisette voci», «Impianto SEFCC» in rosso «finché non decide lui», la coincidenza di «Sistemazione esterna» con un'attività (dal 20/09/2026 è solo fase, e nel master non c'è un'attività con quel nome). `etichettaFase` continua a restituire il codice per un codice che non c'è più.

### 3.2 `core/anagrafica.js`

Il blocco `ANAGRAFICA` si **rigenera per intero** dal JSON del §8, mai voce per voce. Si tolgono le **tre regole speciali di `Interrato`**: il filtro della fase per le commesse senza interrati (`vociSelettoreFase`), il filtro dei piani sotto quota (`pianiPerFase`) e la frase della voce unica dedicata a `Interrato` — resta quella generica, «è l'unico piano di questa commessa: lo sceglie l'app». Il codice che serviva solo a queste regole si toglie; i commenti che le descrivono si aggiornano.

### 3.3 Versione

**0.40.0**: `VERSIONE_CODICE` in `core/versione.js` e `VERSIONE` in `sw.js`, **insieme**.

### 3.4 Collaudi

- **12:** `QUANTE_FASI` = 29, col commento della storia del conteggio aggiornato. Nuovi `VERSIONE_MASTER_FASI` = `2026-10-24.3` e `IMPRONTA_ETICHETTE_FASI` = l'impronta del §2: il collaudo la ricalcola da `core/fasi.js` e diventa rosso se un'etichetta o l'ordine cambiano.
- **Ordine:** il controllo «in ordine alfabetico» (oggi nel 15, sui codici) si fa **sulle etichette**, cioè sulla stringa che si legge a video, confronto italiano senza distinzione di maiuscole e accenti.
- **15:** `VERSIONE_MASTER` = `202610261235`, `IMPRONTA_MASTER` = l'impronta del §2; i numeri del §4. Escono i controlli del filtro di `Interrato` («per Interrato solo i piani sotto quota», «il filtro di Interrato esclude il Tetto», SNZ2.2 · `Interrato` · `P-1`) e diventano: **MAR e MNG mostrano le stesse 29 fasi**; MRS, senza anagrafica, ne mostra 29 e non `Interrato`. **La voce unica del piano si prova con una commessa sintetica** (un solo piano per una fase a piano obbligatorio), come il caso 33 del collaudo 23 per il lotto: menù nascosto, valore e perché a video, valore nel payload, valore che non si porta dietro cambiando fase.
- **20:** dove si sceglie `Interrato` si sceglie `Strutture` (serve una fase diversa da `Cantiere`, la fase in memoria del telefono di prova). Il commento sul caso del 05/10 resta come storia, con una riga che dice che `Interrato` non è più una fase.
- **23:** caso 3 e caso 28 come nella tabella del §4.
- **Casi nuovi** della tabella del §4, nel collaudo che li ospita meglio.
- **`collaudi/LEGGIMI.md`** allineato.

### 3.5 Documenti di riferimento

- **`README.md`:** sezione dei livelli (conteggi 10 / 4 / 1 / 14, niente filtri di `Interrato`, voce unica oggi senza casi reali), riga di `core/fasi.js` («29 voci…»), elenco dei filtri (oggi «I due filtri su `Interrato`»), e le regole del §1.4 per chi scatta.
- **`docs/AppFotoCantiereSpecifica….md`:** **rev. 23** in testa (passaggio a fasi e attività, 0.40.0, anagrafica `202610261235`). Si allineano le parti che descrivono le **regole correnti**: modello Fase → Attività → Lavorazione e fase sola nell'app (§1.1), elenco chiuso e sua fonte, tabella codici ed etichette, filtro sulle fasi e sui piani, conteggi dei livelli, voce unica, dove vive l'elenco, tabella dei percorsi. Le **note delle revisioni passate e i resoconti dei collaudi delle versioni precedenti restano come sono**: sono storia.
- **`docs/AppBolleSpecificaFunzionale….md`:** **revisione 10** in testa: elenco delle fasi a 29, dal master del gruppo; la bolla porta solo la fase, facoltativa; l'attività la porta il codice articolo o la decide chi codifica la fattura. Il contratto non cambia.
- **`CLAUDE.md`, parte del progetto** (non l'estratto delle regole di condotta), in un **commit dedicato**: la descrizione di `core/fasi.js` diventa «elenco chiuso delle fasi di cantiere (`FASI` con codice ed etichetta, `etichettaFase`), copia del master delle fasi del gruppo controllata dall'impronta delle etichette: non si inventa, non si amplia e non si ritocca a mano; cambia solo con una consegna da Cowork». Esce `opzioniFase`, che in `core/fasi.js` non c'è.
- **`docs/INDICE.md`:** solo se un documento cambia nome (non previsto).

### 3.6 Contratto

Invariato: il campo `fase` porta il codice, come oggi; nessun campo nuovo, nessun campo tolto.

## 4. Collaudo

Previsione scritta prima (questa sezione); ogni controllo nuovo **visto fallire** su un guasto messo apposta, poi verde.

### 4.1 Tabella dei casi

| # | Modulo · ingresso | Esito atteso |
|---|---|---|
| 1 | Foto · MNG · menù della fase | «— scegli la fase —» e 29 voci, in ordine alfabetico; né `Interrato` né `ImpiantiDiReteCondominiali` |
| 2 | Foto · MAR · menù della fase | le stesse 29 voci di MNG (oggi 26) |
| 3 | Foto · MRS (senza anagrafica) · menù della fase | 29 voci, `Interrato` assente |
| 4 | Foto · SNU · menù | «Lotto» con `Lotto1`–`Lotto3`, nessuna fase (invariato) |
| 5 | Foto · MNG · `FognaturaNera` | menù del piano con i 12 piani di MNG, Invia spento finché non si sceglie; `P-1` → `fase` `FognaturaNera`, `piano` `P-1`, `unita`, `prospetto`, `scala` nulli → `FognaturaNera\P-1\` |
| 6 | Foto · TN1 · `FognaturaBianca` · `P1` | chiede il lotto; lotto `4` → `piano` `P1`, `scala` `"4"` → `FognaturaBianca\S4\P1\` |
| 7 | Foto · MNG · `SpeseTecniche` | nessun livello chiesto; Invia acceso con la sola fase → payload senza livelli → `SpeseTecniche\<AAAAMM>\` |
| 8 | Foto · MNG · `AcquistoTerreno` | come il caso 7 |
| 9 | Foto · SNZ2.2 · `FinituraPartiComuniInterne` | menù del piano con i 15 piani, `P-1` compreso, nessuna voce unica; `P-1` → `FinituraPartiComuniInterne\P-1\` |
| 10 | Foto · TN1 · `FinituraPartiComuniInterne` · `P-1` scelto dall'operatore (caso 3 del collaudo 23, percorso atteso n. 3 del master, uguale per lo script e per l'app) | `FinituraPartiComuniInterne\P-1\`; piano comune, il lotto non si chiede (era TN1 · `Interrato`, `P-1` scelto dall'app) |
| 11 | Foto · TN1 · selettore (caso 28 del collaudo 23) | etichetta «Fase di lavoro», 29 fasi, nessun `Lotto1`–`Lotto3`, `Interrato` assente |
| 12 | Coda Foto · elemento salvato prima dell'aggiornamento con `fase` `Interrato`, `piano` `P-1` | parte senza blocco; payload `fase` `"Interrato"`, `piano` `"P-1"`; a video si legge il codice `Interrato`; nessun errore in console |
| 13 | Coda Bolle · elemento salvato prima dell'aggiornamento con `fase` `ImpiantiDiReteCondominiali` | parte com'è, col suo codice |
| 14 | Foto · «Rimanda» su una foto inviata con `fase` `Interrato` | il menù della fase parte da «— scegli la fase —», il pulsante è spento con «Scegli la fase per rimandarla.»; scelta una fase, «Rimanda corretta»; nessun errore in console. **Solo verifica**: comportamento accettato, nessuna modifica (§5) |
| 15 | Bolle · MNG · menù della fase | «— nessuna fase —» e 29 fasi; con `FognaturaNera` nessun livello chiesto, la bolla parte con `fase` `FognaturaNera` |
| 16 | Commessa sintetica con un solo piano · fase a piano obbligatorio (collaudo 15) | menù del piano nascosto, valore e perché a video, valore nel payload; cambiando fase il valore non si porta dietro |
| 17 | Foto e Bolle · dopo un invio (collaudo 20, con `Strutture`) | la fase riparte dal segnaposto: nessuna preselezione (non regressione) |

### 4.2 Numeri attesi

- **Collaudo 12:** 29 fasi; `VERSIONE_MASTER_FASI` `2026-10-24.3`; impronta delle etichette `682df6ed…` (§2).
- **Collaudo 15:** versione `202610261235` e impronta `ecb2c273…`; **32 voci** in `livelliPerFase` (29 fasi e 3 lotti); commesse del conteggio, ricavate dal menù e dall'anagrafica: **MAR, MNG, SNZ2.2, TN1**; **60 combinazioni** (15 per commessa: 10 piano, 4 unità, 1 prospetto); **nessuna voce unica** (erano 2, `SNZ2.2 · Interrato · P-1` e `TN1 · Interrato · P-1`); **nessun livello senza voci** (era `MAR · Interrato · piano`); piani MAR 4, MNG 12, SNZ2.2 15, TN1 6 e unità 15, 16, 51, 64, invariati.
- **Fasi per livello:** 10 piano, 4 unità, 1 prospetto, 14 nessuno.
- **Suite:** 23 collaudi verdi; il numero dei controlli si dichiara e lo scarto da 645 si spiega (controlli tolti, aggiunti, cambiati).
- **Controllo di riservatezza** verde.
- **Guasti messi apposta, almeno cinque, visti rossi:** un'etichetta cambiata in `core/fasi.js` (12); una voce cambiata nel blocco `ANAGRAFICA` (15); il filtro di `Interrato` rimesso (15, MAR diverso da MNG); `sw.js` non allineato a `core/versione.js` (02); una fase dell'elenco senza riga in `livelliPerFase` (15, coerenza).

## 5. Fuori perimetro

- **«Rimanda»:** nessuna modifica. Decisione di Francesco Lando del 26/10/2026: gli operatori non rimandano foto delle fasi tolte. Si verifica soltanto il caso 14.
- **Contratto** col flow e col ricevente: invariato (§3.6).
- **Modulo Bolle:** oltre al menù della fase e alla sua documentazione, niente.
- **Attività e lavorazioni:** non entrano nell'app.
- **`Documentazione/`:** specifiche e ritorni precedenti restano come sono.
- **Storia nei documenti di `docs/`:** note delle revisioni passate e resoconti dei collaudi precedenti restano come sono.
- **Esempi `Interrato\P-1\`** in `collaudi/riservatezza.js` e `collaudi/22-riservatezza.js`: restano; sono stringhe di prova di un percorso relativo, non fasi.
- **Estratto delle regole di condotta** nel `CLAUDE.md`: non si tocca in questo lavoro.
- **Commesse, operatori, anagrafica dei piani e delle unità, regole 7 e 8** (lotto e parti comuni): invariati, salvo quanto viene dal JSON del §8.

## 6. Ordine di lavoro e punti di arresto

1. **Lettura** di questa specifica, del `CLAUDE.md` e del codice. Se `main` non è a `9f6eee4`, si elencano i commit in più e i file che toccano. Confronto del JSON del §8 col blocco `ANAGRAFICA` di oggi, campo per campo, e delle etichette del §3.1 con l'impronta del §2.
2. **Primo arresto, prima di modificare:** una differenza oltre quelle del §2, una differenza fra questa specifica e il codice, o un caso che la specifica non copre → **domanda a Francesco**, senza decidere da soli. Se non ce ne sono, lo si dice in una riga e si procede.
3. **Ramo di lavoro.** Primo commit: questa specifica in `Documentazione/`, invariata.
4. Modifiche dei §3.1–§3.3; collaudi del §3.4 coi guasti messi apposta; documenti del §3.5, col `CLAUDE.md` in un commit dedicato.
5. Suite completa e controllo di riservatezza.
6. **Secondo arresto, prima del rilascio:** l'unione su `main` pubblica l'app. Si apre la **PR su `main` col ritorno del §7 e non si unisce**; a Francesco si danno il collegamento alla PR, i commit, i numeri del collaudo, i guasti visti rossi, le impronte e gli ingressi che cambiano comportamento. **Unisce Francesco**, dopo il riscontro di Cowork sul ramo.
7. Dopo l'unione, fuori dalla sessione: Cowork confronta l'impronta del repository con quella del master e avvisa il magazzino; Francesco verifica sul telefono la pagina Informazioni (0.40.0, anagrafica `202610261235`).

## 7. Ritorno

`Documentazione/RitornoCowork[AAAAMMGGHHMM]Claude.md`, **nella stessa PR**, fatto di soli dati:
- commit e file modificati, con l'esito del primo arresto (differenze trovate e risposte di Francesco, oppure «nessuna»);
- numeri del §4.2, con lo scarto da quelli attesi spiegato, e i guasti visti rossi;
- impronta del blocco `ANAGRAFICA` e impronta delle etichette, ricalcolate sul ramo;
- **ingressi che cambiano comportamento** rispetto a `9f6eee4`. Attesi: menù della fase da 27 a 29 voci (MAR da 26 a 29); SNZ2.2 e TN1 non scelgono più il `P-1` da sole; `FognaturaBianca` e `FognaturaNera` chiedono il piano; gli elementi in coda con fasi tolte partono col codice vecchio; «Rimanda» su una foto con fase tolta chiede una fase nuova. Più quelli trovati durante il lavoro;
- punti aperti, compresi i casi trovati fuori da questa specifica.

Commit e impronta in esercizio e prima esecuzione non ci sono ancora: li riscontra Cowork dopo l'unione.

## 8. JSON dell'anagrafica (versione `202610261235`)

```json
{
 "versione": "202610261235",
 "prospettiStandard": [
  "Nord",
  "Sud",
  "Est",
  "Ovest"
 ],
 "livelliPerFase": {
  "AcquistoTerreno": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Bonifica": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Cantiere": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Consolidamento": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Demolizione": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Extra": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "FinituraAlloggi": {
   "piano": "D",
   "unita": "O",
   "prospetto": "-"
  },
  "FinituraFacciata": {
   "piano": "-",
   "unita": "-",
   "prospetto": "O"
  },
  "FinituraPartiComuniInterne": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "FognaturaBianca": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "FognaturaNera": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "Impermeabilizzazioni": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoAntincendio": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoAscensore": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoElettricoAlloggi": {
   "piano": "D",
   "unita": "O",
   "prospetto": "-"
  },
  "ImpiantoElettricoPartiComuni": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoFotovoltaico": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoIdrosanitario": {
   "piano": "D",
   "unita": "O",
   "prospetto": "-"
  },
  "ImpiantoSEFCC": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "ImpiantoTermicoAlloggi": {
   "piano": "D",
   "unita": "O",
   "prospetto": "-"
  },
  "ImpiantoTermicoCondominiale": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "Marketing": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Murature": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "Ponteggio": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Scavi": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "SistemazioneEsterna": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "SpeseTecniche": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Strutture": {
   "piano": "O",
   "unita": "-",
   "prospetto": "-"
  },
  "Urbanizzazioni": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Lotto1": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Lotto2": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  },
  "Lotto3": {
   "piano": "-",
   "unita": "-",
   "prospetto": "-"
  }
 },
 "partiComuni": {
  "codice": "PartiComuni",
  "etichetta": "Parti comuni",
  "fasi": [
   "ImpiantoIdrosanitario"
  ],
  "fasiGemelle": {
   "FinituraAlloggi": "FinituraPartiComuniInterne",
   "ImpiantoElettricoAlloggi": "ImpiantoElettricoPartiComuni",
   "ImpiantoTermicoAlloggi": "ImpiantoTermicoCondominiale"
  }
 },
 "commesse": {
  "MAR": {
   "tipo": "edificio",
   "piani": [
    {
     "codice": "P0",
     "etichetta": "Piano terra",
     "ordine": 0
    },
    {
     "codice": "P1",
     "etichetta": "Piano primo",
     "ordine": 1
    },
    {
     "codice": "P2",
     "etichetta": "Piano secondo",
     "ordine": 2
    },
    {
     "codice": "Tetto",
     "etichetta": "Tetto",
     "ordine": 3
    }
   ],
   "unita": {
    "P0": [
     "0.01",
     "0.02",
     "0.03",
     "0.04",
     "0.05"
    ],
    "P1": [
     "1.01",
     "1.02",
     "1.03",
     "1.04",
     "1.05",
     "1.06"
    ],
    "P2": [
     "2.01",
     "2.02",
     "2.03",
     "2.04"
    ],
    "Tetto": []
   },
   "scale": [
    {
     "codice": "1",
     "piani": [
      "P0",
      "P1",
      "P2"
     ],
     "unita": [
      "0.01",
      "0.02",
      "1.01",
      "1.02",
      "2.01"
     ]
    },
    {
     "codice": "2",
     "piani": [
      "P0",
      "P1",
      "P2"
     ],
     "unita": [
      "0.03",
      "0.04",
      "1.03",
      "1.04",
      "2.02",
      "2.03"
     ]
    },
    {
     "codice": "3",
     "piani": [
      "P0",
      "P1",
      "P2"
     ],
     "unita": [
      "0.05",
      "1.05",
      "1.06",
      "2.04"
     ]
    }
   ],
   "etichetteUnita": {},
   "prospetti": [
    "Nord",
    "Sud",
    "Est",
    "Ovest"
   ]
  },
  "MNG": {
   "tipo": "edificio",
   "piani": [
    {
     "codice": "P-2",
     "etichetta": "Secondo piano interrato",
     "ordine": -2
    },
    {
     "codice": "P-1",
     "etichetta": "Primo piano interrato",
     "ordine": -1
    },
    {
     "codice": "P0",
     "etichetta": "Piano terra",
     "ordine": 0
    },
    {
     "codice": "P1",
     "etichetta": "Piano primo",
     "ordine": 1
    },
    {
     "codice": "P2",
     "etichetta": "Piano secondo",
     "ordine": 2
    },
    {
     "codice": "P3",
     "etichetta": "Piano terzo",
     "ordine": 3
    },
    {
     "codice": "P4",
     "etichetta": "Piano quarto",
     "ordine": 4
    },
    {
     "codice": "P5",
     "etichetta": "Piano quinto",
     "ordine": 5
    },
    {
     "codice": "P6",
     "etichetta": "Piano sesto",
     "ordine": 6
    },
    {
     "codice": "P7",
     "etichetta": "Piano settimo",
     "ordine": 7
    },
    {
     "codice": "P8",
     "etichetta": "Piano ottavo",
     "ordine": 8
    },
    {
     "codice": "Tetto",
     "etichetta": "Tetto",
     "ordine": 9
    }
   ],
   "unita": {
    "P-2": [],
    "P-1": [],
    "P0": [
     "0A"
    ],
    "P1": [
     "1A",
     "1B"
    ],
    "P2": [
     "2A",
     "2B"
    ],
    "P3": [
     "3A",
     "3B"
    ],
    "P4": [
     "4A",
     "4B"
    ],
    "P5": [
     "5A",
     "5B"
    ],
    "P6": [
     "6A",
     "6B"
    ],
    "P7": [
     "7A",
     "7B"
    ],
    "P8": [
     "8B"
    ],
    "Tetto": []
   },
   "etichetteUnita": {
    "0A": "Trilocale con giardino esterno",
    "8B": "Attico (superficie di quadrilocale più cinquelocali)",
    "1A": "Quadrilocale",
    "1B": "Cinquelocali",
    "2A": "Quadrilocale",
    "2B": "Cinquelocali",
    "3A": "Quadrilocale",
    "3B": "Cinquelocali",
    "4A": "Quadrilocale",
    "4B": "Cinquelocali",
    "5A": "Quadrilocale",
    "5B": "Cinquelocali",
    "6A": "Quadrilocale",
    "6B": "Cinquelocali",
    "7A": "Quadrilocale",
    "7B": "Cinquelocali"
   },
   "prospetti": [
    "Nord",
    "Sud",
    "Est",
    "Ovest"
   ]
  },
  "SNZ2.2": {
   "tipo": "edificio",
   "piani": [
    {
     "codice": "P-1",
     "etichetta": "Primo piano interrato",
     "ordine": -1
    },
    {
     "codice": "P0",
     "etichetta": "Piano terra",
     "ordine": 0
    },
    {
     "codice": "P1",
     "etichetta": "Piano primo",
     "ordine": 1
    },
    {
     "codice": "P2",
     "etichetta": "Piano secondo",
     "ordine": 2
    },
    {
     "codice": "P3",
     "etichetta": "Piano terzo",
     "ordine": 3
    },
    {
     "codice": "P4",
     "etichetta": "Piano quarto",
     "ordine": 4
    },
    {
     "codice": "P5",
     "etichetta": "Piano quinto",
     "ordine": 5
    },
    {
     "codice": "P6",
     "etichetta": "Piano sesto",
     "ordine": 6
    },
    {
     "codice": "P7",
     "etichetta": "Piano settimo",
     "ordine": 7
    },
    {
     "codice": "P8",
     "etichetta": "Piano ottavo",
     "ordine": 8
    },
    {
     "codice": "P9",
     "etichetta": "Piano nono",
     "ordine": 9
    },
    {
     "codice": "P10",
     "etichetta": "Piano decimo",
     "ordine": 10
    },
    {
     "codice": "P11",
     "etichetta": "Piano undicesimo",
     "ordine": 11
    },
    {
     "codice": "P12",
     "etichetta": "Piano dodicesimo",
     "ordine": 12
    },
    {
     "codice": "Tetto",
     "etichetta": "Tetto",
     "ordine": 13
    }
   ],
   "unita": {
    "P-1": [],
    "P0": [
     "0A",
     "0B",
     "0C"
    ],
    "P1": [
     "1A",
     "1B",
     "1C",
     "1D"
    ],
    "P2": [
     "2A",
     "2B",
     "2C",
     "2D"
    ],
    "P3": [
     "3A",
     "3B",
     "3C",
     "3D"
    ],
    "P4": [
     "4A",
     "4B",
     "4C",
     "4D"
    ],
    "P5": [
     "5A",
     "5B",
     "5C",
     "5D"
    ],
    "P6": [
     "6A",
     "6B",
     "6C",
     "6D"
    ],
    "P7": [
     "7A",
     "7B",
     "7C",
     "7D"
    ],
    "P8": [
     "8A",
     "8B",
     "8C",
     "8D"
    ],
    "P9": [
     "9A",
     "9B",
     "9C",
     "9D"
    ],
    "P10": [
     "10A",
     "10B",
     "10C",
     "10D"
    ],
    "P11": [
     "11A",
     "11B",
     "11C",
     "11D"
    ],
    "P12": [
     "12A",
     "12B",
     "12C",
     "12D"
    ],
    "Tetto": []
   },
   "etichetteUnita": {},
   "prospetti": [
    "Nord",
    "Sud",
    "Est",
    "Ovest"
   ]
  },
  "TN1": {
   "tipo": "edificio",
   "corpiDistinti": true,
   "piani": [
    {
     "codice": "P-1",
     "etichetta": "Primo piano interrato",
     "ordine": -1
    },
    {
     "codice": "P0",
     "etichetta": "Piano terra",
     "ordine": 0
    },
    {
     "codice": "P1",
     "etichetta": "Piano primo",
     "ordine": 1
    },
    {
     "codice": "P2",
     "etichetta": "Piano secondo",
     "ordine": 2
    },
    {
     "codice": "P3",
     "etichetta": "Piano terzo",
     "ordine": 3
    },
    {
     "codice": "Tetto",
     "etichetta": "Tetto",
     "ordine": 4
    }
   ],
   "unita": {
    "P-1": [],
    "P0": [
     "401",
     "402",
     "403",
     "404",
     "501",
     "502",
     "503",
     "504",
     "601",
     "602",
     "603",
     "604",
     "701",
     "702",
     "703",
     "704"
    ],
    "P1": [
     "411",
     "412",
     "413",
     "414",
     "511",
     "512",
     "513",
     "514",
     "611",
     "612",
     "613",
     "614",
     "711",
     "712",
     "713",
     "714"
    ],
    "P2": [
     "421",
     "422",
     "423",
     "424",
     "521",
     "522",
     "523",
     "524",
     "621",
     "622",
     "623",
     "624",
     "721",
     "722",
     "723",
     "724"
    ],
    "P3": [
     "431",
     "432",
     "433",
     "434",
     "531",
     "532",
     "533",
     "534",
     "631",
     "632",
     "633",
     "634",
     "731",
     "732",
     "733",
     "734"
    ],
    "Tetto": []
   },
   "scale": [
    {
     "codice": "4",
     "piani": [
      "P0",
      "P1",
      "P2",
      "P3",
      "Tetto"
     ],
     "unita": [
      "401",
      "402",
      "403",
      "404",
      "411",
      "412",
      "413",
      "414",
      "421",
      "422",
      "423",
      "424",
      "431",
      "432",
      "433",
      "434"
     ]
    },
    {
     "codice": "5",
     "piani": [
      "P0",
      "P1",
      "P2",
      "P3",
      "Tetto"
     ],
     "unita": [
      "501",
      "502",
      "503",
      "504",
      "511",
      "512",
      "513",
      "514",
      "521",
      "522",
      "523",
      "524",
      "531",
      "532",
      "533",
      "534"
     ]
    },
    {
     "codice": "6",
     "piani": [
      "P0",
      "P1",
      "P2",
      "P3",
      "Tetto"
     ],
     "unita": [
      "601",
      "602",
      "603",
      "604",
      "611",
      "612",
      "613",
      "614",
      "621",
      "622",
      "623",
      "624",
      "631",
      "632",
      "633",
      "634"
     ]
    },
    {
     "codice": "7",
     "piani": [
      "P0",
      "P1",
      "P2",
      "P3",
      "Tetto"
     ],
     "unita": [
      "701",
      "702",
      "703",
      "704",
      "711",
      "712",
      "713",
      "714",
      "721",
      "722",
      "723",
      "724",
      "731",
      "732",
      "733",
      "734"
     ]
    }
   ],
   "etichetteUnita": {},
   "prospetti": [
    "Nord",
    "Sud",
    "Est",
    "Ovest"
   ]
  },
  "SNU": {
   "tipo": "urbanizzazione",
   "lotti": [
    "Lotto1",
    "Lotto2",
    "Lotto3"
   ]
  },
  "BRU": {
   "tipo": "urbanizzazione",
   "lotti": [
    "Lotto1",
    "Lotto2",
    "Lotto3"
   ]
  }
 }
}
```
