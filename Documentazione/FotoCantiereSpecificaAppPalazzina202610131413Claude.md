# App LL Italia 0.39.0 — palazzina e parti comuni nel modulo Foto, TN1 nel menù: specifica delle modifiche

> **13/10/2026 ore 14:13, rev. 2 · Cowork, progetto FotoCantiere, per Francesco Lando · destinataria: la sessione cloud di Claude Code dell'app.** Rispetto alla rev. 1 del 12/10, per decisioni di Francesco Lando del 13/10/2026: a video il livello della palazzina si chiama «Lotto» (§1, §3.3, §4) e l'elenco delle commesse del collaudo 15 si ricava (§3.2); caso 28 in più. Repository `LL-Italia`, ramo `main`, punto di partenza il commit **`53fb1af`** (app 0.38.1, anagrafica `202610092114`). **Fonte delle regole:** il master dell'anagrafica del progetto FotoCantiere (`FotoCantiereAnagraficaFasiPianiUnita….md`, rev. 18), che non è nel repository: le regole che servono all'app sono riportate al §1, il dato è al §6 con la sua impronta. **Se questa specifica e il dato del §6 divergono, vale il dato.** Questo documento, insieme al codice, basta per lavorare. **Copia depurata:** niente percorsi del server, identificativi o dati di clienti; il master resta nel progetto FotoCantiere.

## 1. Le regole, dal master

**Regola 7 — la palazzina, nelle commesse a corpi distinti.** Vale solo dove la commessa ha `corpiDistinti: true`: oggi solo TN1, palazzine `4`–`7`, ognuna col suo `Tetto`. MAR ha tre scale ma è un edificio solo: niente palazzina.
- La palazzina **segue il piano e il prospetto**: si chiede quando la fase pretende il piano e il piano scelto sta in almeno una scala, oppure quando la fase pretende il prospetto. Nelle fasi per unità **si ricava dall'unità**, come il piano.
- **Un piano che non sta in nessuna scala è comune** (il `P-1` di TN1) e non chiede la palazzina.
- **Si sceglie prima il piano, poi la palazzina**, fra le scale che contengono quel piano. Per la facciata si sceglie la palazzina, poi il prospetto.
- **Il menù delle unità si raggruppa per palazzina e piano.**
- **A video il livello si chiama «Lotto»** (decisione di Francesco Lando del 13/10/2026): a TN1 «lotto» è il nome del corpo di fabbrica. **Non è il lotto delle urbanizzazioni** (SNU, BRU), che è una fase (`Lotto2`) e sta nel selettore della fase: questo è un selettore a sé, solo nelle commesse a corpi distinti, e il suo valore va nel campo `scala`, mai in `fase`. In questa specifica «palazzina» è il nome della regola, «Lotto» il testo che legge l'operatore.
- Nel payload viaggia il **codice della scala** (`"4"`), nel campo `scala`; il prefisso `S` lo aggiunge il ricevente nel percorso.
- `livelliPerFase` non cambia.

**Regola 8 — parti comuni nelle fasi per unità.** Nelle fasi elencate in `partiComuni.fasi` (oggi solo `ImpiantoIdrosanitario`) il menù delle unità ha una voce in più, **«Parti comuni»** (`partiComuni.etichetta`), codice **`PartiComuni`** (`partiComuni.codice`), **in fondo all'elenco**, come i valori speciali.
- Scegliendola, **il piano lo sceglie l'operatore**, fra **tutti i piani della commessa**, interrati e `Tetto` compresi; nelle commesse a corpi distinti vale poi la regola 7, quindi la palazzina segue il piano.
- Nel payload: `unita` = `PartiComuni`, `piano` = il piano scelto.
- **Nelle altre tre fasi per unità la voce non c'è**: sono le chiavi di `partiComuni.fasiGemelle`, e sotto il loro menù delle unità l'app scrive «Per le parti comuni usa la fase …» con l'etichetta della fase gemella.
- `PartiComuni` non è il codice di nessuna unità.

**Regole che restano, e valgono anche per la palazzina** (dal codice di oggi):
- **il livello obbligatorio lo impone l'app**: l'invio si blocca finché manca, e il messaggio dice quale manca;
- **nessuna preselezione** con due o più voci; **con una voce sola la sceglie l'app**, la mostra col perché e non se la porta dietro quando cambia il contesto;
- **`null` dove il livello non si applica, mai stringa vuota**;
- quando un menù si ricostruisce, il valore scelto dall'operatore resta solo se è ancora fra le voci, come per gli altri livelli.

**Perché la versione è esattamente 0.39.0.** Il ricevente alza l'anomalia «livello mancante» per la palazzina e per il piano delle parti comuni solo se `VersioneApp` è **0.39.0 o superiore**: sotto, la foto va nella cartella del mese senza allarme. Un rilascio con queste modifiche e un numero più basso spegnerebbe il controllo.

## 2. Dati in ingresso

- **Repository al `53fb1af`:** `VERSIONE_CODICE` e `sw.js` a `0.38.1`; blocco `ANAGRAFICA` di `core/anagrafica.js` alla versione `202610092114`, impronta `3829c27bb9959f592815583a7173706674cd4f4535de66ff15d8391a0ebdd7fa`, con TN1 in anagrafica e fuori dal menù; `core/cantieri.js` a sette commesse; collaudo 14 a sette commesse; collaudo 15 con `VERSIONE_MASTER` e `IMPRONTA_MASTER` della `202610092114` e il controllo che TN1 **non** sia nel menù.
- **Dato nuovo, §6:** versione **`202610101049`**, impronta **`df5dd3f6ecb6075ee74d70b7efd2de30be70f2d471b05617a725d680141495a8`**, forma canonica di **7208 byte** (chiavi ordinate, nessuno spazio, UTF-8). Rispetto alla `202610092114` le **sole differenze** sono quattro:
  1. `versione`;
  2. `commesse.TN1.corpiDistinti` = `true`, chiave nuova;
  3. `commesse.TN1.prospetti` da `[]` a `["Nord","Sud","Est","Ovest"]`;
  4. blocco nuovo `partiComuni`: `codice` `PartiComuni`, `etichetta` «Parti comuni», `fasi` `["ImpiantoIdrosanitario"]`, `fasiGemelle` con `FinituraAlloggi` → `FinituraPartiComuniInterne`, `ImpiantoElettricoAlloggi` → `ImpiantoElettricoPartiComuni`, `ImpiantoTermicoAlloggi` → `ImpiantoTermicoCondominiale`.
- **TN1 nel dato:** piani `P-1`, `P0`, `P1`, `P2`, `P3`, `Tetto`; scale `4`, `5`, `6`, `7`, ognuna con `P0`–`P3`, `Tetto` e 16 unità; il `P-1` in nessuna scala; 64 unità.
- **Il ricevente è pronto:** la raccolta ha la colonna `Scala` (testo), il flow legge il campo `scala` del payload, lo script archiviatore applica le regole 7 e 8 dal 10/10/2026. Il contratto col flow cambia solo per il campo nuovo.

## 3. Modifiche

### 3.1 Il dato
- Blocco `ANAGRAFICA` **rigenerato per intero** dal JSON del §6, mai voce per voce; commento in testa al file aggiornato (master `202610101049`: corpi distinti, prospetti di TN1, parti comuni).
- Collaudo 15: `VERSIONE_MASTER` = `202610101049`, `IMPRONTA_MASTER` = l'impronta del §2.

### 3.2 TN1 nel menù
- `core/cantieri.js`: voce `{ codice: 'TN1', etichetta: 'TN1 - San Maurizio Canavese' }`. Otto commesse, per foto **e** bolle; nel menù, dal `sort()` di oggi, nell'ordine BRU, MAR, MNG, MRS, SNU, SNZ2.1, SNZ2.2, TN1.
- Collaudo 14: otto commesse, quell'ordine, quelle etichette; nel payload il codice `TN1`.
- Collaudo 15 (decisione di Francesco Lando del 13/10/2026): il controllo «TN1 non è nel menù» si rovescia. L'elenco delle commesse su cui si contano le voci uniche, oggi scritto a mano (`['MAR', 'MNG', 'SNZ2.2']`), **si ricava**: sono le commesse di `core/cantieri.js` che nell'anagrafica hanno `tipo: 'edificio'`. Oggi dà MAR, MNG, SNZ2.2 e TN1; una commessa nuova entra nel conteggio da sola. Il controllo «una sola combinazione su 45» diventa «due su 60» (§4).

### 3.3 Palazzina (regola 7), modulo Foto — a video «Lotto»
- Selettore nuovo con etichetta **«Lotto»**, solo nelle commesse con `corpiDistinti: true`:
  - **fasi per piano:** dopo il piano, se il piano scelto sta in almeno una scala; voci = le scale che contengono quel piano, nell'ordine del dato;
  - **fase per prospetto:** prima del prospetto; voci = tutte le scale;
  - **fasi per unità:** non compare; la scala si ricava dall'unità (la scala il cui elenco `unita` la contiene).
- A video le voci si leggono «Lotto 4», «Lotto 5», «Lotto 6», «Lotto 7»; nel payload va il solo codice, `"4"`.
- Menù delle unità nelle commesse a corpi distinti: gruppi per palazzina e piano, nell'ordine del dato (es. «Lotto 4 · Piano terra»). Nelle altre commesse i gruppi restano per piano.
- La palazzina entra nella validazione all'invio (il messaggio dice «il lotto», insieme agli altri livelli mancanti), nella regola della voce unica e nella ricostruzione dei menù al cambio di commessa, fase o piano, come gli altri livelli.
- Gli `id` seguono il contratto di oggi, anche col prefisso del riquadro «Rimanda».

### 3.4 Parti comuni (regola 8), modulo Foto
- Nelle fasi di `partiComuni.fasi` (oggi `ImpiantoIdrosanitario`), voce «Parti comuni» **dopo l'ultimo gruppo** del menù delle unità, fuori dai gruppi.
- Scelta la voce, compare il menù del piano con **tutti** i piani della commessa, senza filtri; poi, nelle commesse a corpi distinti, la palazzina secondo la 3.3. Tornando a un'unità, il menù del piano sparisce, e piano e palazzina si ricavano di nuovo dall'unità.
- Nelle tre fasi di `partiComuni.fasiGemelle`, sotto il menù delle unità: «Per le parti comuni usa la fase Finitura parti comuni interne.», e così per le altre due, con l'etichetta da `core/fasi.js`.

### 3.5 Payload del modulo Foto
- Campo nuovo **`scala`**: il codice della palazzina come testo, oppure `null`. **Mai stringa vuota.** Presente in ogni invio di foto e video, come `piano`, `unita` e `prospetto`.
- Il modulo Bolle **non cambia**: niente livelli e niente `scala` nel suo payload; cambia solo il menù delle commesse.
- I documenti del repository che descrivono il contratto col flow portano il campo `scala`.

### 3.6 Riquadro «Rimanda»
Mostra e controlla gli stessi selettori del modulo Foto, palazzina e «Parti comuni» comprese, con i valori del record come punto di partenza.

### 3.7 Versione
`VERSIONE_CODICE` e `sw.js` a **`0.39.0`**, insieme. Pagina Informazioni: app 0.39.0, anagrafica `202610101049`.

## 4. Collaudo

1. **Previsione scritta prima:** la tabella e i numeri qui sotto.
2. **Rosso:** il collaudo si vede fallire con almeno quattro guasti messi apposta: una voce del blocco `ANAGRAFICA` ritoccata (impronta); il lotto non chiesto su TN1 · `Strutture` · `P1`; `scala: ''` nel payload; «Parti comuni» comparsa in `FinituraAlloggi`.
3. **Verde** su tutti i collaudi.

**Casi, lato app.** Ingresso = scelte dell'operatore; esito = i quattro campi del payload nell'ordine `piano`, `unita`, `prospetto`, `scala`, oppure il blocco dell'invio. I casi 1–18 hanno la numerazione del master, la stessa del collaudo dello script, che dallo stesso payload ricava il percorso.

| # | Commessa · fase | Ingresso | Esito atteso |
|:--:|---|---|---|
| 1 | TN1 · `Strutture` | piano `P1`, lotto `4` | `P1`, `null`, `null`, `"4"` |
| 2 | TN1 · `Impermeabilizzazioni` | piano `Tetto`, lotto `5` | `Tetto`, `null`, `null`, `"5"` |
| 3 | TN1 · `Interrato` | nessuna scelta | `P-1` scelto dall'app e mostrato col perché; `P-1`, `null`, `null`, `null`; nessun selettore «Lotto» |
| 4 | TN1 · `Strutture` | piano `P-1` | `P-1`, `null`, `null`, `null`; nessun selettore «Lotto» |
| 5 | TN1 · `FinituraFacciata` | lotto `6`, prospetto `Nord` | `null`, `null`, `Nord`, `"6"` |
| 6 | TN1 · `FinituraAlloggi` | unità `431` | `P3`, `431`, `null`, `"4"`; nessun selettore «Lotto»; l'unità sta nel gruppo «Lotto 4 · Piano terzo» |
| 7 | TN1 · `Cantiere` | — | `null`, `null`, `null`, `null` |
| 8 | MAR · `Strutture` | piano `P1` | `P1`, `null`, `null`, `null`; nessun selettore «Lotto» |
| 9 | MAR · `FinituraAlloggi` | unità `1.03` | `P1`, `1.03`, `null`, `null`; gruppi per piano, come oggi |
| 10 | TN1 · `Strutture` | piano `P1`, lotto non scelto | invio bloccato, il messaggio nomina il lotto |
| 11 | TN1 · `Strutture` | piano `P1` | il menù «Lotto» offre «Lotto 4»…«Lotto 7» (valori `4`–`7`), nessuno preselezionato: un lotto fuori anagrafica non si può mandare |
| 12 | TN1 · `FinituraAlloggi` | unità `431` | `scala` vale sempre `"4"`: un lotto diverso da quello dell'unità non si può mandare |
| 13 | MAR · `ImpiantoIdrosanitario` | «Parti comuni», piano `P0` | `P0`, `PartiComuni`, `null`, `null` |
| 14 | SNZ2.2 · `ImpiantoIdrosanitario` | «Parti comuni», piano `P-1` | `P-1`, `PartiComuni`, `null`, `null`; il menù del piano ha i 15 piani della commessa |
| 15 | TN1 · `ImpiantoIdrosanitario` | «Parti comuni», piano `P2`, lotto `5` | `P2`, `PartiComuni`, `null`, `"5"` |
| 16 | TN1 · `ImpiantoIdrosanitario` | «Parti comuni», piano `P-1` | `P-1`, `PartiComuni`, `null`, `null`; nessun selettore «Lotto» |
| 17 | MNG · `ImpiantoIdrosanitario` | «Parti comuni», piano non scelto | invio bloccato, il messaggio nomina il piano |
| 18 | MAR · `FinituraAlloggi` | — | nel menù delle unità «Parti comuni» non c'è; sotto il menù «Per le parti comuni usa la fase Finitura parti comuni interne.» |
| 19 | MNG · `Strutture` | piano `P5` | `P5`, `null`, `null`, `null` (non regressione) |
| 20 | SNZ2.2 · `FinituraAlloggi` | unità `1A` | `P1`, `1A`, `null`, `null` (non regressione) |
| 21 | MAR · `FinituraFacciata` | prospetto `Nord` | `null`, `null`, `Nord`, `null` (non regressione) |
| 22 | SNU · `Lotto2` | — | fase `Lotto2`; `null`, `null`, `null`, `null` (non regressione) |
| 23 | TN1 · `Strutture`, video | piano `P1`, lotto `4` | come il caso 1, con genere video |
| 24 | TN1 · `Strutture` | piano `P1`, lotto `4`, poi piano `P-1` | il selettore «Lotto» sparisce; `P-1`, `null`, `null`, `null` |
| 25 | TN1 · `ImpiantoIdrosanitario` | «Parti comuni», piano `P2`, lotto `5`, poi unità `431` | menù del piano nascosto; `P3`, `431`, `null`, `"4"` |
| 26 | TN1, poi MAR | TN1 · `Strutture` · `P1` · lotto `4`; poi commessa MAR, fase `Strutture`, piano `P1` | nessun selettore «Lotto»; `P1`, `null`, `null`, `null` |
| 27 | Bolle · TN1 | commessa TN1, una fase | TN1 c'è nel menù delle bolle; nel payload la commessa `TN1`, nessun livello e nessun campo `scala`, come oggi |
| 28 | TN1 · selettore della fase | — | etichetta «Fase di lavoro»; voci = le 27 fasi, `Interrato` compreso; nessun `Lotto1`–`Lotto3`: TN1 è un edificio, non un'urbanizzazione |

**Numeri attesi:**
- 28 casi verdi su 28;
- menù delle commesse: 8 voci, in foto e in bolle;
- TN1: 6 piani; 64 unità in 16 gruppi (4 lotti × 4 piani); 4 lotti offerti per ciascuno di `P0`, `P1`, `P2`, `P3` e `Tetto`, nessuna per `P-1`; in `ImpiantoIdrosanitario` 65 voci nel menù delle unità (64 più «Parti comuni»);
- voce unica, sulle commesse edificio del menù (MAR, MNG, SNZ2.2, TN1): **60 combinazioni** di commessa, fase e livello obbligatorio, **2 a voce unica** (SNZ2.2 · `Interrato` · `P-1` e TN1 · `Interrato` · `P-1`), **1 senza voci** (MAR · `Interrato`, fase non mostrata); lotto: **0 casi** a voce unica con questo dato;
- `PartiComuni` non è il codice di nessuna unità, in nessuna commessa;
- `scala` mai uguale a `''` in tutti i payload del collaudo;
- **ingressi che cambiano comportamento rispetto a `53fb1af`, e solo questi:** TN1 nei due menù delle commesse; le fasi per piano e per prospetto di TN1 (selettore «Lotto»); le fasi per unità di TN1 (`scala` ricavata, gruppi per lotto); `ImpiantoIdrosanitario` di tutte le commesse edificio («Parti comuni»); le tre fasi gemelle (riga sotto il menù delle unità); il campo `scala` in ogni payload di foto e video, `null` fuori da TN1.

## 5. Fuori perimetro

- Il ricevente: raccolta, flow e script sono già fatti.
- `core/fasi.js`, `livelliPerFase`, il selettore della fase e del lotto.
- Il modulo Bolle, salvo il menù delle commesse.
- Le scale di MAR: nessun uso nell'app, perché MAR non ha corpi distinti.
- Il blocco `ANAGRAFICA` a mano, anche per un'etichetta.
- Rilasci intermedi: nessuna parte di queste modifiche esce con un numero diverso da 0.39.0.
- Dati veri nel repository: il controllo di riservatezza blocca.

## 6. Il dato

Forma canonica del master, versione `202610101049`. Lo SHA-256 della riga qui sotto, così com'è, è `df5dd3f6ecb6075ee74d70b7efd2de30be70f2d471b05617a725d680141495a8` (7208 byte).

```json
{"commesse":{"BRU":{"lotti":["Lotto1","Lotto2","Lotto3"],"tipo":"urbanizzazione"},"MAR":{"etichetteUnita":{},"piani":[{"codice":"P0","etichetta":"Piano terra","ordine":0},{"codice":"P1","etichetta":"Piano primo","ordine":1},{"codice":"P2","etichetta":"Piano secondo","ordine":2},{"codice":"Tetto","etichetta":"Tetto","ordine":3}],"prospetti":["Nord","Sud","Est","Ovest"],"scale":[{"codice":"1","piani":["P0","P1","P2"],"unita":["0.01","0.02","1.01","1.02","2.01"]},{"codice":"2","piani":["P0","P1","P2"],"unita":["0.03","0.04","1.03","1.04","2.02","2.03"]},{"codice":"3","piani":["P0","P1","P2"],"unita":["0.05","1.05","1.06","2.04"]}],"tipo":"edificio","unita":{"P0":["0.01","0.02","0.03","0.04","0.05"],"P1":["1.01","1.02","1.03","1.04","1.05","1.06"],"P2":["2.01","2.02","2.03","2.04"],"Tetto":[]}},"MNG":{"etichetteUnita":{"0A":"Trilocale con giardino esterno","1A":"Quadrilocale","1B":"Cinquelocali","2A":"Quadrilocale","2B":"Cinquelocali","3A":"Quadrilocale","3B":"Cinquelocali","4A":"Quadrilocale","4B":"Cinquelocali","5A":"Quadrilocale","5B":"Cinquelocali","6A":"Quadrilocale","6B":"Cinquelocali","7A":"Quadrilocale","7B":"Cinquelocali","8B":"Attico (superficie di quadrilocale più cinquelocali)"},"piani":[{"codice":"P-2","etichetta":"Secondo piano interrato","ordine":-2},{"codice":"P-1","etichetta":"Primo piano interrato","ordine":-1},{"codice":"P0","etichetta":"Piano terra","ordine":0},{"codice":"P1","etichetta":"Piano primo","ordine":1},{"codice":"P2","etichetta":"Piano secondo","ordine":2},{"codice":"P3","etichetta":"Piano terzo","ordine":3},{"codice":"P4","etichetta":"Piano quarto","ordine":4},{"codice":"P5","etichetta":"Piano quinto","ordine":5},{"codice":"P6","etichetta":"Piano sesto","ordine":6},{"codice":"P7","etichetta":"Piano settimo","ordine":7},{"codice":"P8","etichetta":"Piano ottavo","ordine":8},{"codice":"Tetto","etichetta":"Tetto","ordine":9}],"prospetti":["Nord","Sud","Est","Ovest"],"tipo":"edificio","unita":{"P-1":[],"P-2":[],"P0":["0A"],"P1":["1A","1B"],"P2":["2A","2B"],"P3":["3A","3B"],"P4":["4A","4B"],"P5":["5A","5B"],"P6":["6A","6B"],"P7":["7A","7B"],"P8":["8B"],"Tetto":[]}},"SNU":{"lotti":["Lotto1","Lotto2","Lotto3"],"tipo":"urbanizzazione"},"SNZ2.2":{"etichetteUnita":{},"piani":[{"codice":"P-1","etichetta":"Primo piano interrato","ordine":-1},{"codice":"P0","etichetta":"Piano terra","ordine":0},{"codice":"P1","etichetta":"Piano primo","ordine":1},{"codice":"P2","etichetta":"Piano secondo","ordine":2},{"codice":"P3","etichetta":"Piano terzo","ordine":3},{"codice":"P4","etichetta":"Piano quarto","ordine":4},{"codice":"P5","etichetta":"Piano quinto","ordine":5},{"codice":"P6","etichetta":"Piano sesto","ordine":6},{"codice":"P7","etichetta":"Piano settimo","ordine":7},{"codice":"P8","etichetta":"Piano ottavo","ordine":8},{"codice":"P9","etichetta":"Piano nono","ordine":9},{"codice":"P10","etichetta":"Piano decimo","ordine":10},{"codice":"P11","etichetta":"Piano undicesimo","ordine":11},{"codice":"P12","etichetta":"Piano dodicesimo","ordine":12},{"codice":"Tetto","etichetta":"Tetto","ordine":13}],"prospetti":["Nord","Sud","Est","Ovest"],"tipo":"edificio","unita":{"P-1":[],"P0":["0A","0B","0C"],"P1":["1A","1B","1C","1D"],"P10":["10A","10B","10C","10D"],"P11":["11A","11B","11C","11D"],"P12":["12A","12B","12C","12D"],"P2":["2A","2B","2C","2D"],"P3":["3A","3B","3C","3D"],"P4":["4A","4B","4C","4D"],"P5":["5A","5B","5C","5D"],"P6":["6A","6B","6C","6D"],"P7":["7A","7B","7C","7D"],"P8":["8A","8B","8C","8D"],"P9":["9A","9B","9C","9D"],"Tetto":[]}},"TN1":{"corpiDistinti":true,"etichetteUnita":{},"piani":[{"codice":"P-1","etichetta":"Primo piano interrato","ordine":-1},{"codice":"P0","etichetta":"Piano terra","ordine":0},{"codice":"P1","etichetta":"Piano primo","ordine":1},{"codice":"P2","etichetta":"Piano secondo","ordine":2},{"codice":"P3","etichetta":"Piano terzo","ordine":3},{"codice":"Tetto","etichetta":"Tetto","ordine":4}],"prospetti":["Nord","Sud","Est","Ovest"],"scale":[{"codice":"4","piani":["P0","P1","P2","P3","Tetto"],"unita":["401","402","403","404","411","412","413","414","421","422","423","424","431","432","433","434"]},{"codice":"5","piani":["P0","P1","P2","P3","Tetto"],"unita":["501","502","503","504","511","512","513","514","521","522","523","524","531","532","533","534"]},{"codice":"6","piani":["P0","P1","P2","P3","Tetto"],"unita":["601","602","603","604","611","612","613","614","621","622","623","624","631","632","633","634"]},{"codice":"7","piani":["P0","P1","P2","P3","Tetto"],"unita":["701","702","703","704","711","712","713","714","721","722","723","724","731","732","733","734"]}],"tipo":"edificio","unita":{"P-1":[],"P0":["401","402","403","404","501","502","503","504","601","602","603","604","701","702","703","704"],"P1":["411","412","413","414","511","512","513","514","611","612","613","614","711","712","713","714"],"P2":["421","422","423","424","521","522","523","524","621","622","623","624","721","722","723","724"],"P3":["431","432","433","434","531","532","533","534","631","632","633","634","731","732","733","734"],"Tetto":[]}}},"livelliPerFase":{"Bonifica":{"piano":"-","prospetto":"-","unita":"-"},"Cantiere":{"piano":"-","prospetto":"-","unita":"-"},"Consolidamento":{"piano":"-","prospetto":"-","unita":"-"},"Demolizione":{"piano":"-","prospetto":"-","unita":"-"},"Extra":{"piano":"-","prospetto":"-","unita":"-"},"FinituraAlloggi":{"piano":"D","prospetto":"-","unita":"O"},"FinituraFacciata":{"piano":"-","prospetto":"O","unita":"-"},"FinituraPartiComuniInterne":{"piano":"O","prospetto":"-","unita":"-"},"Impermeabilizzazioni":{"piano":"O","prospetto":"-","unita":"-"},"ImpiantiDiReteCondominiali":{"piano":"O","prospetto":"-","unita":"-"},"ImpiantoAntincendio":{"piano":"O","prospetto":"-","unita":"-"},"ImpiantoAscensore":{"piano":"-","prospetto":"-","unita":"-"},"ImpiantoElettricoAlloggi":{"piano":"D","prospetto":"-","unita":"O"},"ImpiantoElettricoPartiComuni":{"piano":"O","prospetto":"-","unita":"-"},"ImpiantoFotovoltaico":{"piano":"-","prospetto":"-","unita":"-"},"ImpiantoIdrosanitario":{"piano":"D","prospetto":"-","unita":"O"},"ImpiantoSEFCC":{"piano":"O","prospetto":"-","unita":"-"},"ImpiantoTermicoAlloggi":{"piano":"D","prospetto":"-","unita":"O"},"ImpiantoTermicoCondominiale":{"piano":"O","prospetto":"-","unita":"-"},"Interrato":{"piano":"O","prospetto":"-","unita":"-"},"Lotto1":{"piano":"-","prospetto":"-","unita":"-"},"Lotto2":{"piano":"-","prospetto":"-","unita":"-"},"Lotto3":{"piano":"-","prospetto":"-","unita":"-"},"Marketing":{"piano":"-","prospetto":"-","unita":"-"},"Murature":{"piano":"O","prospetto":"-","unita":"-"},"Ponteggio":{"piano":"-","prospetto":"-","unita":"-"},"Scavi":{"piano":"-","prospetto":"-","unita":"-"},"SistemazioneEsterna":{"piano":"-","prospetto":"-","unita":"-"},"Strutture":{"piano":"O","prospetto":"-","unita":"-"},"Urbanizzazioni":{"piano":"-","prospetto":"-","unita":"-"}},"partiComuni":{"codice":"PartiComuni","etichetta":"Parti comuni","fasi":["ImpiantoIdrosanitario"],"fasiGemelle":{"FinituraAlloggi":"FinituraPartiComuniInterne","ImpiantoElettricoAlloggi":"ImpiantoElettricoPartiComuni","ImpiantoTermicoAlloggi":"ImpiantoTermicoCondominiale"}},"prospettiStandard":["Nord","Sud","Est","Ovest"],"versione":"202610101049"}
```

## 7. Ordine di lavoro e punti di arresto

1. Lettura di questa specifica, del `CLAUDE.md` e del codice; confronto del §6 col blocco di oggi, campo per campo. **Una differenza oltre le quattro del §2, una differenza fra questa specifica e il codice, o un caso non coperto: arresto e domanda a Francesco, prima di modificare.**
2. §3.1 e §3.2; poi §3.3–3.6; per ultima la §3.7.
3. §4: previsione, rosso, verde. Commit piccoli, messaggi in italiano all'imperativo, su un ramo con la sua PR.
4. **Arresto prima del rilascio.** L'unione su `main` pubblica l'app: prima, a Francesco, PR e commit, collaudi e controlli verdi, guasti visti rossi, impronta del blocco `ANAGRAFICA`, ingressi che cambiano comportamento rispetto a `53fb1af`.
5. **Solo dopo il via di Francesco:** unione su `main`, poi `node collaudi/pubblicato.js` sul sito in linea.
6. **Ritorno a Cowork:** file `Documentazione/RitornoCowork[AAAAMMGGHHMM]Claude.md` nel repository, committato; prima del commit verificare che il nome non ricada nel `.gitignore`. Contenuto, solo dati: commit e file modificati; numeri del collaudo; ingressi che cambiano comportamento rispetto a `53fb1af`; commit su `main` e impronta del blocco in esercizio; esito di `pubblicato.js`; punti aperti.
