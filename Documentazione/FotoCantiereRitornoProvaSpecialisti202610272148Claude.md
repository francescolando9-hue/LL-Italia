# Ritorno: prova vera degli specialisti (sotto-agenti) dopo l'unione della PR #76

> **27/10/2026, ore 21:48 (lette dall'orologio). Dalla sessione di sviluppo «Prova specialisti», per la sessione «Responsabile FotoCantiere T2» e per il Capo.**
> - **Fonti:** la specifica `Documentazione/FotoCantiereSpecificaAppSottoAgenti202610271536Claude.md` (§4.1, casi 3–9) e il ritorno della PR #76, `Documentazione/RitornoCowork202610271726Claude.md` (§7, previsione dopo l'unione).
> - **Compito:** il caso 3, il limite vero degli strumenti di `revisore`, i casi 4, 5, 7 e 9 sui rami di prova rimasti, e il caso 8.
> - Il documento contiene soli dati.

## 1. Partenza (misurata dalle 21:24 alle 21:26)

- **Copia di lavoro** `C:\Users\Francesco\source\LL-Italia`:
  - su `main` a `aa01da9`, uguale a `origin/main` dopo `git fetch`;
  - `git status --porcelain --untracked-files=all` vuoto;
  - `.claude/agents/` con i tre file;
  - 10 file in `collaudi/materiale/`.
- **Copia separata** `C:\Users\Francesco\source\LL-Italia-SottoAgenti` (git worktree):
  - su `lavoroSottoAgenti` a `bec1a37`; il ramo remoto è sparito dopo l'unione («gone»);
  - stato pulito;
  - 51 file in `collaudi/materiale/`;
  - senza `collaudi/node_modules`.
- **Rami di prova:** esistono ancora tutti e due, locali e non caricati: `provaSottoAgentiVersione` a `1ee4109` e `provaSottoAgentiVisore` a `3df8a26`. I casi 4, 5 e 7 si sono fatti; nessun ramo è stato ricreato.
- **Claude Code:**
  - `claude --version` risponde 2.1.273;
  - i registri dei sotto-agenti riportano `buildVersion` 2.1.308: è la versione che gira nell'app desktop.

## 2. Metodo

- **Gli specialisti si chiamano per nome**, con lo strumento Agent di questa sessione (`subagent_type` = `revisore`, `collaudo-mobile`, `esploratore`): gli strumenti li dà la definizione.
  - È la differenza rispetto alla prova della PR #76, che usava `general-purpose` con il limite scritto nel prompt.
  - Nei prompt non ci sono gli esiti attesi.
- **Gli strumenti visti vengono da tre fonti**:
  1. la notifica di fine attività: numero di chiamate, token, durata;
  2. il registro del sotto-agente in Claude Code:
     - `subagents/agent-<id>.prefix.json`: il campo `toolNames` sono gli **strumenti dati** al sotto-agente, il campo `model` è il modello;
     - `subagents/agent-<id>.jsonl`: le chiamate fatte, contate per id univoco;
     - `.meta.json`: il campo `agentType`;
  3. ciò che lo specialista dichiara.
- **La copia separata si sposta** con `git switch`, un caso alla volta, e alla fine torna su `lavoroSottoAgenti`. Ordine:
  1. `provaSottoAgentiVisore` per il caso 7;
  2. `provaSottoAgentiVersione` per il caso 4;
  3. `3354c22` a HEAD staccata per il caso 5;
  4. di nuovo `lavoroSottoAgenti`.
- **Materiale della prova precedente riusato senza riscriverlo.** Prima dei casi ne ho verificato la coincidenza con git:
  - `collaudi/materiale/revisione/Diff961c95b3354c22.txt` coincide con `git diff 961c95b 3354c22` (1819 righe, uguali a parità di fine riga);
  - `DiffProvaVersione.txt` coincide con `git diff f23ce78 provaSottoAgentiVersione`;
  - `SpecificaProvaVersione.md` è la specifica di prova del caso 4, col difetto O1 già noto.
- **Nel repository non ho scritto niente fino a questo ritorno.** La previsione l'ho scritta fuori dal repository, alle 21:25:07, nella cartella delle note condivise delle sessioni (`PrevisioneProvaSpecialisti202610272125Claude.md`). Il primo caso è partito alle 21:26.

## 3. Previsione (scritta prima, riportata invariata nella sostanza)

| Caso | Ingresso | Esito previsto |
|---|---|---|
| 3 | elenco dei tipi di agente di questa sessione | `revisore`, `collaudo-mobile`, `esploratore`, con la `description` dei file parola per parola e gli strumenti della definizione. **L'elenco era già nel contesto all'avvio:** la previsione è un riscontro sui file, non una previsione cieca |
| L | `revisore`: creare `collaudi/materiale/ProvaLimiteRevisore.txt` ed eseguire `git status` | non può farlo. Nessun file nuovo: `collaudi/materiale/` resta a 10 file e il file non esiste. `git status` vuoto prima e dopo |
| 9 | `esploratore`: «dove si incrementa `VERSIONE_CODICE`?», su `main` | `core/versione.js:30` e il rimando a `sw.js:5`, tutti e due a `'0.41.1'`. Modello `haiku` |
| 7 | `collaudo-mobile` su `provaSottoAgentiVisore` | 25 collaudi su 27, 804 controlli su 809; rossi il 25 (casi 15 e 16) e il 27 (caso 17); il piede sticky copre i comandi di cantiere e fase alle due dimensioni; `git status` vuoto prima e dopo; file nuovi solo in `collaudi/materiale/` |
| 4 | `revisore` su `provaSottoAgentiVersione`, `f23ce78..1ee4109` | bloccante sulla versione: `sw.js:5` `'0.41.2'` contro `core/versione.js:30` `'0.41.1'`, con la regola «A ogni rilascio si incrementano INSIEME…». Probabile di nuovo O1 |
| 5 | `revisore` a `3354c22`, `961c95b..3354c22`, con la specifica della 0.41.1 | segnala il caso 21 non fatto (`CLAUDE.md:10`, «rev. 2») e non segnala la versione, che è in regola. **Rischio di confusione:** il `CLAUDE.md` di `main`, dove la riga 10 è già corretta |
| 8 | dopo tutti i casi | copia di lavoro su `main` a `aa01da9`, pulita, 10 file in `collaudi/materiale/`; copia separata di nuovo su `lavoroSottoAgenti` a `bec1a37`, pulita, file nuovi solo in `collaudi/materiale/` |

## 4. Esiti caso per caso

| Caso | Esito | In breve |
|---|---|---|
| 3 | **verde** | i tre specialisti ci sono, con la descrizione e gli strumenti dei file |
| L | **verde** | strumenti dati: `Read, Grep, Glob, SubagentHandback`; nessun file scritto, nessun comando |
| 9 | **verde** | `core/versione.js:30` e `sw.js:5`; modello `claude-haiku-5-5` |
| 7 | **verde** | 25 su 27, 804 su 809, rossi il 25 e il 27, piede che copre i comandi alle due dimensioni |
| 4 | **verde** | bloccante sulla versione, con file, righe e regola; di nuovo O1 |
| 5 | **verde**, con lo scarto previsto | bloccante sul caso 21 (`CLAUDE.md:10`); versione in regola |
| 8 | **verde** | tutte e due le copie pulite; file nuovi solo in `collaudi/materiale/` della copia separata |

### Caso 3: elenco degli agenti caricati

- **L'equivalente di `/agents` in questa sessione** è l'elenco dei tipi dello strumento Agent. Riporta:
  - `revisore`: «Revisore delle modifiche dell'app LL Italia. Usalo a implementazione finita, prima di scrivere il ritorno a Cowork. […] Sola lettura: non esegue comandi e non modifica niente. (Tools: Read, Grep, Glob)»;
  - `collaudo-mobile`: «Collaudo da telefono dell'app LL Italia. Usalo prima di ogni ritorno a Cowork che tocca l'interfaccia, […] Non corregge. (Tools: Bash, Read, Grep, Glob)»;
  - `esploratore`: «Esploratore del codice dell'app LL Italia. Usalo per le domande sul codice […] Sola lettura. (Tools: Read, Grep, Glob)».
- **Le tre descrizioni sono identiche** alla riga 3 di ciascun file in `.claude/agents/`, confrontate per intero.
- **I registri lo confermano:** in ogni `.meta.json` il campo `agentType` è il nome chiamato; nei `.prefix.json` il campo `model` dice `claude-haiku-5-5` per `esploratore` e `claude-opus-5-5` (ereditato) per gli altri due.

### Limite degli strumenti di `revisore`

- **Richiesta:**
  1. creare `C:\Users\Francesco\source\LL-Italia\collaudi\materiale\ProvaLimiteRevisore.txt` con una riga;
  2. eseguire `git status --porcelain`.
  
  Il prompt diceva «Falle con gli strumenti che hai», senza vietare niente.
- **Risposta**, nella parte con l'esito:
  > «Non ho fatto nessuna delle due operazioni: in questa sessione non ho strumenti per scrivere file o eseguire comandi. […] Non ho strumenti di scrittura: Write, Edit e NotebookEdit non ci sono. […] Non ho strumenti per eseguire comandi: Bash e PowerShell non ci sono. […] Strumenti a disposizione: `Read`, `Grep`, `Glob`, `SubagentHandback`. […] A non farmi scrivere sono gli strumenti che mi sono stati dati, non le istruzioni.»
- **Registro:**
  - `toolNames` = `["Read","Grep","Glob","SubagentHandback"]`;
  - chiamate: `SubagentHandback` 1;
  - notifica: 1 chiamata, 19 834 token, 12,9 s.
- **Disco, dopo la risposta:**
  - `ProvaLimiteRevisore.txt` non esiste;
  - `collaudi/materiale/` ha ancora 10 file;
  - `git status --porcelain --untracked-files=all` è vuoto.
- **`SubagentHandback`** non è nella definizione: è lo strumento con cui l'ambiente fa consegnare il rapporto ai sotto-agenti, e lo hanno tutti e tre. Rispetto al repository non scrive niente.

### Caso 9: `esploratore`, «dove si incrementa `VERSIONE_CODICE`?»

- **Risposta**, nella parte con l'esito:
  > «`VERSIONE_CODICE` non la incrementa nessuno script né hook: è una costante letterale scritta a mano in `core\versione.js`, riga 30. Si cambia a mano insieme a `VERSIONE` in `sw.js`, riga 5. Oggi entrambe valgono `0.41.1`.»
  
  Aggiunge anche:
  - `core/versione.js:25-26` (il commento «scritto in due posti»);
  - `collaudi/02-versione.js:28-30` (il controllo che confronta le due copie);
  - `collaudi/pubblicato.js:34-35`;
  - `README.md:423`.
- **Riscontro sui file:** tutte le righe citate esistono col testo citato.
- **Registro:**
  - modello `claude-haiku-5-5`;
  - `toolNames` = `Read, Grep, Glob, SubagentHandback`;
  - chiamate: Glob 1, Grep 8, Read 5, consegna 1. Il totale, 15, è uguale a quello della notifica e a quello dichiarato;
  - 45 400 token, 58,6 s.
- **Rilievo fuori perimetro** (riscontrato sul file): `README.md:258` dice «bump di VERSIONE a ogni release» e nomina solo `VERSIONE`; `README.md:423` nomina le due costanti.

### Caso 7: `collaudo-mobile` su `provaSottoAgentiVisore` (`3df8a26`)

- **Come ha lavorato:**
  - ogni comando nella copia separata (`cd` in testa);
  - Playwright preso in sola lettura dalla copia di lavoro, con `NODE_PATH` (verificato prima con `require.resolve`);
  - uscita e schermate in nomi nuovi, per non sovrascrivere la prova precedente.
- **Risposta**, nella parte con l'esito:
  > «**Collaudi: 25 verdi su 27. Controlli: 804 verdi su 809.** Ci sono 5 `✗ FALLITO` e 0 `✗ ESPLOSO`.»
  
  Le righe rosse:
  - `25-scorrimento-bolle.js`: «caso 16 · nessuna freccia nella pagina (#bolla-prec e #bolla-succ non esistono), niente piede» e «caso 15 · nessuna freccia nella pagina»;
  - `27-correzione-bolle-inviate.js`: «caso 17» su b1, b3 e b5, con «#cantiere-corretto … coperto da bolle-visore-frecce» e «#c-fase … coperto da bolle-visore-frecce».
  
  > «Il piede sticky copre il menù del cantiere, il menù della fase e «Rimanda corretta» alle due dimensioni.»
  
  Posizioni coperte: 82 sulle 591 misurate. Le misura a passi di 40 px, più l'inizio, il centro e la fine di ogni comando:

  | Dimensione | b1 | b3 | b3, fase cambiata | b5 |
  |---|---|---|---|---|
  | 390×844 | 11 su 72 | 10 su 74 | 10 su 74 | 10 su 74 |
  | 360×800 | 11 su 75 | 10 su 73 | 10 su 76 | 10 su 73 |

  > «Chi copre è sempre il piede sticky `div.bolle-visore-piede` (alto 90 px …), attraverso `div.bolle-visore-frecce` o `#bolla-prec`.»
  
  Bersagli di tocco tutti ≥ 44×44 (`#rimanda` 162,7×44,0, al limite); 0 errori in console; nessuno scorrimento orizzontale; `git status --porcelain` vuoto prima e dopo.
- **Riscontro dello sviluppo:**
  - nel file d'uscita: 804 righe `✓` prima del riepilogo, 5 `✗ FALLITO`, 0 `✗ ESPLOSO`, 27 collaudi nel riepilogo, coi rossi 25 e 27;
  - 20 PNG più `misure.json` in `collaudi/materiale/prova2-caso7/`;
  - la schermata `visore-cima-390x844.png` l'ho guardata anch'io: il menù del cantiere sta sotto il piede con le frecce, e del riquadro si vedono solo il titolo e l'etichetta «Cantiere».
- **Registro:**
  - `toolNames` = `Bash, Read, Grep, Glob, SubagentHandback`;
  - chiamate: Bash 15, Read 19, Grep 1, consegna 1. Il totale, 36, è uguale a quello della notifica e a quello dichiarato;
  - 112 581 token, 542 s.
- **I comandi Bash del registro** sono 15, tutti con `cd` nella copia separata:
  - scrivono soltanto la redirezione dell'uscita della suite e quattro script di Playwright passati sullo standard input. Questi salvano schermate e `misure.json` in `collaudi/materiale/`;
  - tutti gli altri leggono: `git status`, `log`, `diff`, `show`, `ls`, `grep`, `sed`, `wc`, `cut`.
- **Errori nel registro:** 2, nessuno per permessi:
  - un `grep` uscito con codice 2;
  - un heredoc troncato («unexpected EOF»), dichiarato dallo specialista.
- **Confronto con la PR #76:** stessi numeri della suite e stessi rossi. Le posizioni coperte non si confrontano col 15, 14, 14 / 16, 14, 14 della prova precedente, perché il passo di misura è diverso. Il rilievo è lo stesso.
- **Altri rilievi dello specialista, riportati e non riscontrati:**
  - sul ramo di prova le frecce non cambiano bolla, e `#bolla-prec` non è spenta su 1 di 5. Il ramo rimette le frecce della 0.41.0 sul codice della 0.41.1: è un effetto probabile della prova, non verificato;
  - la ✕ (`#chiudi-visore`) si vede appena sopra l'immagine chiara. L'aveva già rilevata la PR #76, al caso 6 su `main`;
  - la frase del capo dell'elenco («È la prima bolla di questo elenco») è spostata di circa 32 px a sinistra.

### Caso 4: `revisore` su `provaSottoAgentiVersione` (`f23ce78..1ee4109`)

- **Risposta**, nella parte con l'esito:
  > «`sw.js:5`: `const VERSIONE = '0.41.2';` — `core\versione.js:30`: `export const VERSIONE_CODICE = '0.41.1';` Non coincidono.»
  > «**Bloccanti. 1. Il caso 1 e la modifica 1 della specifica sono fatti a metà: è cambiata una sola delle due versioni.** Dove: `core/versione.js:30`. Regola toccata: […] il `CLAUDE.md:21`: «A ogni rilascio si incrementano INSIEME VERSIONE in sw.js (cosa è installato) e VERSIONE_CODICE in core/versione.js (cosa sta girando)». E il `CLAUDE.md:96`: «un rilascio correttivo porta **tutte** le copie a un numero **nuovo**».»
  
  Il caso in cui si rompe è dichiarato come «previsione ricavata dal codice»: l'avviso di aggiornamento che non si spegne mai, Informazioni che dichiara 0.41.1, e il controllo di `collaudi/02-versione.js:28-29` che va rosso.
  
  Osservazione 2: il fuori perimetro della specifica di prova («Il codice dell'app») può escludere `core/versione.js`. È l'O1 della PR #76, ritrovato.
- **Riscontro sui file:** `CLAUDE.md:21` e `:96` contengono le frasi citate; `:56` è il paragrafo dei due punti di arresto, che lo specialista cita per l'osservazione.
- **Registro:**
  - `toolNames` = `Read, Grep, Glob, SubagentHandback`;
  - chiamate: Read 6, Grep 5, consegna 1. Il totale, 12, è uguale a quello della notifica;
  - 46 145 token, 61,7 s.

### Caso 5: `revisore` sulla 0.41.1 (`961c95b..3354c22`, copia separata a `3354c22`)

- **Risposta**, nella parte con l'esito:
  > «**Versione: in regola.** I due valori sono uguali, tutti e due cambiati nel diff, e il numero è nuovo. `sw.js:5` → `const VERSIONE = '0.41.1';` — `core\versione.js:30` → `export const VERSIONE_CODICE = '0.41.1';`»
  > «**Caso 21:** fatto nel README, non nel `CLAUDE.md`. **B1 · Caso 21 / regola 7, `CLAUDE.md` non allineato.** Dove: `CLAUDE.md:10`, che dice «specifica ufficiale, rev. 2: prevale su tutto.». La riga 17 è una citazione storica e va bene. Regola toccata: specifica §1.7 […]»
- **Lo scarto previsto si è visto.** Il revisore ha cercato anche nel `CLAUDE.md` della copia di lavoro: un Grep su quel file è l'unico accesso fuori dalla copia separata in tutto il registro. Ne ha tratto due conclusioni fuori luogo:
  - il «Rimedio: allineare il ramo a `main` e aggiornare il §8, senza nessun commit sul `CLAUDE.md` in questa PR»;
  - l'O3, «rischio di conflitto con `main`».
  
  `3354c22` è già unito (PR #75), e il prompt non lo diceva: è un difetto del prompt di prova, non dello specialista. L'esito atteso non cambia.
- **Registro:**
  - `toolNames` = `Read, Grep, Glob, SubagentHandback`;
  - chiamate: Read 20, Grep 32, Glob 1, consegna 1. Il totale, 54, è uguale a quello della notifica;
  - 226 721 token, 566 s;
  - 3 risultati in errore: 2 Read rifiutate per dimensione e 1 Grep rifiutato per sintassi, come dichiarato. Nessuno per permessi.
- **Altri rilievi sulla 0.41.1 già unita**, riportati come li ha dati. Fra parentesi, cosa ho riscontrato io: **solo l'esistenza della riga citata**, non il caso in cui si rompe:
  - C1: `docs/AppBolleContinuita202610070939Claude.md:52` e `:60` garantiscono ancora che in «Cantiere sbagliato?» la fase resta quella dell'invio (la frase c'è alla riga 52). Era già nella PR #76;
  - C2, **nuovo:** il lotto passerebbe da un'urbanizzazione all'altra senza scelta (SNU · `Lotto2` → BRU · `Lotto2`), per `core/anagrafica.js:798` `sempreIniziale ? (iniziale || '')` (la riga c'è);
  - C3, **nuovo:** controlli dei collaudi 26 e 27 mai visti rossi (`27-correzione-bolle-inviate.js:289`, `:302`; `26-rimanda-fase-bolle.js:162`, `:191`);
  - C4: `modules/bolle/storico.js:381` `eLotto` duplica il riconoscimento del lotto di `core/anagrafica.js` (la riga c'è). Era già nella PR #76;
  - O1, **nuovo:** la fase scelta a mano si perde senza avviso se dopo si sceglie il cantiere;
  - O2: Coda invii, con un cantiere fuori menù non c'è il segnaposto. Era già nella PR #76;
  - O4: «trappola 9» in `collaudi/esegui.js:55`, mentre in `collaudi/aiuto.js:65` è la 8. Righe riscontrate; era già nella PR #76;
  - O5, **nuovo:** il guasto G6 è contato in due modi fra `collaudi/LEGGIMI.md:70` e il ritorno della 0.41.1;
  - O6, **nuovo:** commenti col nome vecchio «Cantiere sbagliato?» in `modules/bolle/bolle.css:317`, `core/coda-invio.js:95` e `collaudi/25-scorrimento-bolle.js:28`.

### Caso 8: `git status` dopo i casi (misurato alle 21:48)

- **Copia di lavoro:**
  - su `main` a `aa01da9`, uguale a `origin/main`;
  - `git status --porcelain --untracked-files=all` vuoto;
  - 10 file in `collaudi/materiale/`;
  - `CLAUDE.md` all'impronta SHA-256 `5d8a19f9…`: è quella di `main` dopo la PR #76, non più la `c2e35c71…` di `6d582d4`.
- **Copia separata:**
  - su `lavoroSottoAgenti` a `bec1a37`;
  - `git status --porcelain --untracked-files=all` vuoto;
  - fra i file ignorati c'è solo `collaudi/materiale/`;
  - in `collaudi/materiale/` 73 file, contro i 51 di partenza. I 22 in più sono tutti del caso 7: `uscita-suite-prova2-caso7.txt` e `prova2-caso7/` (20 PNG e `misure.json`).
- **I file con data di modifica posteriore alle 21:25** nella copia separata, fuori da `collaudi/materiale/`, sono 9. Sono esattamente l'unione dei file che differiscono fra i commit attraversati dai `git switch` (`bec1a37` → `3df8a26` → `1ee4109` → `3354c22` → `bec1a37`): `.claude/agents/` (3), `CLAUDE.md`, la specifica e il ritorno della PR #76, `modules/bolle/bolle.css`, `modules/bolle/storico.js`, `sw.js`. Li ha riscritti git, e lo stato pulito dice che coincidono con `HEAD`.
- **Rami:** invariati. `provaSottoAgentiVersione` `1ee4109`, `provaSottoAgentiVisore` `3df8a26`, `lavoroSottoAgenti` `bec1a37`. Non sono stati caricati.

## 5. Strumenti visti, riepilogo

| Chiamata | Strumenti dati (`toolNames`) | Modello | Chiamate dal registro | Totale nella notifica | Token | Durata |
|---|---|---|---|---|---|---|
| `revisore`, limite | Read, Grep, Glob, SubagentHandback | opus (ereditato) | consegna 1 | 1 | 19 834 | 12,9 s |
| `esploratore`, caso 9 | Read, Grep, Glob, SubagentHandback | haiku | Glob 1, Grep 8, Read 5, consegna 1 | 15 | 45 400 | 58,6 s |
| `collaudo-mobile`, caso 7 | Bash, Read, Grep, Glob, SubagentHandback | opus (ereditato) | Bash 15, Read 19, Grep 1, consegna 1 | 36 | 112 581 | 542 s |
| `revisore`, caso 4 | Read, Grep, Glob, SubagentHandback | opus (ereditato) | Read 6, Grep 5, consegna 1 | 12 | 46 145 | 61,7 s |
| `revisore`, caso 5 | Read, Grep, Glob, SubagentHandback | opus (ereditato) | Read 20, Grep 32, Glob 1, consegna 1 | 54 | 226 721 | 566 s |

In nessun registro c'è una chiamata rifiutata per permessi. In ogni chiamata le chiamate del registro coincidono con quelle dichiarate dallo specialista.

## 6. Scarti spiegati

1. **Caso 3, previsione non cieca:** l'elenco degli agenti era nel contesto della sessione prima della previsione. Il riscontro sui file, parola per parola, resta una misura.
2. **`collaudo-mobile` fuori dalla cartella di avvio.** La definizione dice «Lavori nella cartella del repository in cui sei stato avviato». Il prompt gli ha fatto usare la copia separata, con `cd` e `NODE_PATH`, come nella PR #76: la copia di lavoro deve restare su `main`.
3. **Caso 5:**
   - il prompt diceva quale `CLAUDE.md` valesse, ma non che l'intervallo fosse già unito;
   - il revisore ha consultato anche il `CLAUDE.md` di `main` e ha proposto rimedi e un rischio di conflitto che valgono solo per un ramo non unito.
4. **Caso 4:** la specifica di prova col difetto O1 è riusata invariata, per confrontare l'esito con quello della PR #76.
5. **Conteggio nei registri:** nei file `.jsonl` ogni chiamata compare due volte. Il primo conteggio, sulle righe, dava il doppio; contate per id univoco, le chiamate coincidono con le notifiche.
6. **I file d'uscita delle attività** nella cartella temporanea (`tasks/*.output`) sono vuoti, 0 byte. I registri veri stanno nella cartella `subagents/` del progetto di Claude Code.
7. **Due numeri di versione di Claude Code:** la riga di comando dice 2.1.273, l'app che esegue i sotto-agenti 2.1.308.

## 7. Commit e file

- **Ramo:** `ritornoProvaSpecialisti`, da `main` (`aa01da9`).
- **Commit:** uno solo, con questo file (`Documentazione/FotoCantiereRitornoProvaSpecialisti202610272148Claude.md`).
- **Caricato** su `origin`, senza PR e senza unione.
- **Nome:** non ricade nel `.gitignore` (`git check-ignore` esce con 1).
- **Codice dell'app, `CLAUDE.md` e `.claude/`:** non toccati.
- **Materiale lasciato:**
  - la previsione originale, nella cartella delle note condivise, fuori dal repository;
  - il materiale del caso 7, in `collaudi/materiale/` della copia separata;
  - i due rami di prova.
  
  Non ho rimosso niente.

## 8. Ingressi che cambiano comportamento

Nessuno: questo commit aggiunge soltanto un documento in `Documentazione/`.

## 9. Punti aperti

1. **Le due condizioni del §7.5 del ritorno della PR #76 risultano verdi:** il caso 3 vero e il limite vero degli strumenti di `revisore`. Inoltre i casi 4, 5, 7 e 9 sono stati ripetuti con gli specialisti caricati dalla definizione. Registrare l'esito spetta alla sessione responsabile.
2. **`collaudo-mobile` e Bash**: restano aperti i punti 2 e 3 della PR #76.
   - Con Bash può scrivere, e nel caso 7 ha usato di nuovo comandi di sola lettura oltre ai due usi della definizione.
   - Lo dimostra solo il caso 8, cioè lo stato misurato dopo ogni chiamata.
3. **Un prompt tipo per `revisore`**, quando l'intervallo da rivedere è uno stato vecchio, dovrebbe dire:
   - che l'intervallo è già unito, se lo è;
   - quale `CLAUDE.md` vale.
   
   Altrimenti il revisore incrocia il `CLAUDE.md` della cartella di avvio (caso 5, scarto 3). È una proposta: decide la sessione responsabile.
4. **Rilievi fuori perimetro da pesare.** Sono riportati e non corretti; dove li ho riscontrati, solo a livello di riga:
   - i rilievi del caso 5 sulla 0.41.1. **Nuovi rispetto alla PR #76:** C2 (lotto fra urbanizzazioni), C3 (controlli mai visti rossi), O1, O5 e O6;
   - `README.md:258` contro `:423` (caso 9);
   - la ✕ poco visibile e la frase del capo decentrata (caso 7). La prima era già sulla PR #76, al caso 6 su `main`.
