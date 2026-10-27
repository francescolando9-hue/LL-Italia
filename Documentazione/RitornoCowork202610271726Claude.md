# Ritorno a Cowork — specialisti di sviluppo (sotto-agenti) e regole del repository

> **27/10/2026 · dalla sessione di sviluppo del repository `LL-Italia`, per la sessione responsabile del progetto FotoCantiere.**
> Specifica: `Documentazione/FotoCantiereSpecificaAppSottoAgenti202610271536Claude.md`. Partenza: `main` a `6d582d4` (0.41.1), albero `84e1856d…`. Soli dati.

## 1. Commit e file

Ramo `lavoroSottoAgenti`, da `origin/main` (`6d582d4`), nella copia separata. Commit firmati SSH (la firma c'è in tutti; la verifica locale dice `N` perché manca `gpg.ssh.allowedSignersFile`, come per i commit della 0.41.1).

| Commit | Contenuto | File |
|---|---|---|
| `c1fc5d0` | specifica copiata invariata (SHA-256 uguale alla sorgente, `9628fd43…`) | `Documentazione/FotoCantiereSpecificaAppSottoAgenti202610271536Claude.md` |
| `a002c39` | le tre definizioni | `.claude/agents/revisore.md`, `.claude/agents/collaudo-mobile.md`, `.claude/agents/esploratore.md` |
| `ab148c1` | `collaudo-mobile`: uscita della suite in un file di `collaudi/materiale/`, script brevi (heredoc oltre circa 8000 caratteri troncato, misurato nel caso 6) | `.claude/agents/collaudo-mobile.md` |
| `f23ce78` | `CLAUDE.md`, commit dedicato | `CLAUDE.md` |
| *(questo)* | il ritorno | `Documentazione/RitornoCowork202610271726Claude.md` |

`ab148c1` è nato dopo il caso 6: il caso 7 è stato provato con le istruzioni nuove, i casi 4, 5, 6 e 9 con quelle di `a002c39`. Il codice dell'app, `sw.js`, `core/versione.js`, i collaudi e `.claude/settings*.json` non sono toccati.

## 2. Arresto 1 e metodo di prova

- **Arresto 1 (27/10):** proposto `claude -p` con cartella di lavoro nella copia separata; accolto con limiti (D1–D3, N1–N4). **Correzione di un mio dato:** all'arresto 1 ho scritto che il campo `agents` dello stream era «provato». Il messaggio iniziale c'era, ma quell'esecuzione era uscita con codice 1: la CLI non è autenticata. Rimisurato dallo sviluppo dopo il messaggio della sessione responsabile: `claude -p "ok" --output-format stream-json --verbose --max-turns 1 --model haiku` → `is_error=true`, «Not logged in · Please run /login», uscita 1. Nessun processo `claude -p` ha lavorato.
- **Metodo applicato (decisione della sessione responsabile dopo la misura):**
  - casi 1 e 2: controllo statico delle intestazioni, fuori dal repository;
  - casi 4–9: sotto-agente generico (`general-purpose`) di questa sessione, con nel prompt il corpo della definizione per intero, l'elenco dei suoi `tools` e l'ordine di usare solo quelli, e il compito del caso. **In queste prove il limite degli strumenti non lo fa la definizione**: lo fanno le istruzioni del prompt. Gli strumenti usati sono quelli dichiarati dal sotto-agente nella risposta; da qui si vedono solo il numero totale di chiamate e i token. `esploratore` provato con `model: haiku`, come nella definizione;
  - per `collaudo-mobile`, comandi dalla copia separata (`cd` nel prompt) e Playwright dalla copia di lavoro con `NODE_PATH`, in sola lettura;
  - caso 3 e limite vero degli strumenti: dopo l'unione (§7).
- Claude Code 2.1.273.

## 3. Casi del §4.1

| # | Esito | Dati |
|---|---|---|
| 1 | verde | tre file con i nomi giusti; `name` = nome del file; `description` con «Usalo …» |
| 2 | verde | `revisore` ed `esploratore`: `Read, Grep, Glob`; `collaudo-mobile`: `Bash, Read, Grep, Glob`; nessuno con `hooks`, `mcpServers`, `permissionMode`, `background`; solo `name`, `description`, `tools`, `model` |
| 3 | spostato dopo l'unione | previsione al §7 |
| 4 | come atteso | `revisore` sul ramo di prova `provaSottoAgentiVersione` (`1ee4109`, `VERSIONE` 0.41.2 solo in `sw.js`): bloccante B1 «La versione è cambiata in un posto solo», `core/versione.js:30` `'0.41.1'` contro `sw.js:5` `'0.41.2'`, regole `CLAUDE.md` «A ogni rilascio si incrementano INSIEME VERSIONE in sw.js … e VERSIONE_CODICE in core/versione.js» e «un rilascio correttivo porta tutte le copie a un numero nuovo». Strumenti dichiarati: Read 7, Grep 3 |
| 5 | come atteso | `revisore` su `961c95b..3354c22` con la specifica della 0.41.1 (copia separata a `a002c39`, `CLAUDE.md` ancora di `6d582d4`): bloccante 1 «`CLAUDE.md:10` … dice ancora "specifica ufficiale, rev. 2" — caso 21 della specifica (regola 7)»; «Versione nei due posti: in regola. `sw.js:5` … `core/versione.js:30` …». Strumenti dichiarati: Read 19, Grep 25, Glob 1 |
| 6 | verde, con rilievi visivi | `collaudo-mobile` sul ramo di lavoro (app identica a `6d582d4`, vedi N2 al §4): 27 collaudi e 809 controlli verdi; 25 schermate del visore e del riquadro «Cantiere o fase sbagliati?» a 390×844 e 360×800; comandi mai coperti, bersagli ≥ 44×44, 0 errori in console, niente scorrimento orizzontale. **Rilievi** (non attesi dalla specifica, su `main` si riportano e non si correggono): a 360×800 la voce «BRU - urbanizzazioni via Bardonecchia» del menù del cantiere è tagliata sotto la freccia (vista anche dallo sviluppo sulla schermata), a 390×844 la tocca; la ✕ fissa si distingue appena sopra l'immagine chiara della bolla. Strumenti dichiarati: Bash 14, Read 34, Grep 4 |
| 7 | come atteso | `collaudo-mobile` sul ramo di prova `provaSottoAgentiVisore` (`3df8a26`, piede sticky e frecce della 0.41.0): 25 collaudi su 27, 804 controlli su 809; rossi il 25 (casi 15 e 16, «nessuna freccia nella pagina») e il 27 (caso 17 su b1, b3, b5, «coperto da bolle-visore-frecce»). Rilievo: «Il piede sticky con le frecce copre i comandi del riquadro … Appena si apre la bolla, il menù del cantiere sta interamente sotto il piede», con le misure (390×844: 15, 14, 14 posizioni coperte; 360×800: 16, 14, 14) e 10 schermate. Strumenti dichiarati: Bash 13, Read 13 |
| 8 | verde | `git status --porcelain --untracked-files=all` vuoto prima e dopo i casi 4, 5, 6, 7 e 9, sui due rami di prova e sul ramo di lavoro; il materiale sta solo in `collaudi/materiale/` |
| 9 | come atteso | `esploratore`: «`core/versione.js:30` `export const VERSIONE_CODICE = '0.41.1';` … Nello stesso passo si incrementa `VERSIONE` in `sw.js` riga 5». Righe riscontrate sui file. Strumenti dichiarati: Grep 3, Glob 2, Read 7 |
| 10 | verde | 11 controlli su 11: riga 10 senza «rev. 2»; riga 17 invariata; righe 1–33 cambiate solo alla 10; sezioni «Domande e arresti», «Modifiche alle regole del repository», «Specialisti»; «Modello di collaborazione» allineata; nessun nome di sessione; **diff vuoto da «# Regole di condotta» alla fine** (92 righe prima e dopo) |
| 11 | verde, prima e dopo | copia di lavoro su `main`, `git status` pulito, nessuna `.claude/agents/`, `CLAUDE.md` all'impronta `c2e35c71…` — §5 |
| 12 | verde | 6 file: `.claude/agents/` (3), `CLAUDE.md`, `Documentazione/` (la specifica e questo ritorno); niente `sw.js`, `core/`, `modules/`, `collaudi/`. Misurato con `git diff --name-only origin/main...HEAD` più il ritorno non ancora committato |
| 13 | verde | `node collaudi/esegui.js` sul ramo di lavoro a `f23ce78`: 27 collaudi e 809 controlli verdi, 0 rossi, uscita 0 |
| 14 | verde | 109 file letti (104 + 5 nuovi: specifica, tre definizioni, ritorno), «niente da segnalare»; il controllo legge `git ls-files --cached --others --exclude-standard`, quindi anche `.claude/agents/`. L'hook ha letto e passato ogni commit |

## 4. Numeri del §4.2 e guasti visti rossi

- **Suite:** 27 collaudi e 809 controlli verdi su `main` (partenza, misurata dallo sviluppo), sul ramo di lavoro al caso 6 (dal sotto-agente, riscontrata sul file d'uscita) e al caso 13 (dallo sviluppo).
- **Riservatezza:** verde, **109** file letti (104 + 5 nuovi). **Correzione della specifica:** la base non è 103 ma **104** file letti: a `6d582d4` ci sono 108 file tracciati, 4 dei quali immagini; il 104° è `Documentazione/RitornoCowork202610271159Claude.md`, aggiunto in `3354c22` dopo la misura scritta in quel ritorno (riscontro anche della sessione responsabile). Con i 5 file nuovi se ne attendono 109.
- **N2:** il caso 6 è sul ramo di lavoro: `git diff 6d582d4 HEAD -- . ':(exclude).claude' ':(exclude)CLAUDE.md' ':(exclude)Documentazione'` → 0 righe.
- **Controllo statico (casi 1, 2, 10, 11, 12):** `node VerificaSottoAgenti.js agenti|claudemd|copia|pr <cartella>`, fuori dal repository (copia nella cartella delle note condivise delle sessioni, `VerificaSottoAgenti.js`, SHA-256 `82dcd0e3…`). Esiti: casi 1 e 2 29 su 29; caso 10 11 su 11; caso 11 4 su 4.
- **Guasti messi apposta, visti rossi e poi tolti** (ripristino con `git restore`, poi di nuovo verde):

| Caso | Guasto | Rosso |
|---|---|---|
| 2 | `Write` nei `tools` del revisore | 2 controlli (strumento che modifica file; strumento in più) |
| 2 | `Bash` nei `tools` e `permissionMode: acceptEdits` nell'esploratore | 4 controlli |
| 2 | `mcp__github__get_file` nei `tools` del revisore | 2 controlli (MCP; strumento in più) |
| 2 | `tools` tolto all'esploratore (eredita tutto) | 1 controllo |
| 1 | `name: collaudo` in `collaudo-mobile.md` | 1 controllo |
| 10 | uno spazio in più in una riga dell'estratto («**Collaudo sui numeri…**») | «diff vuoto dalla riga «# Regole di condotta» alla fine» |
| 10 | «rev. 2» rimesso alla riga 10 | «riga 10 senza «rev. 2»» |
| 11 | `.claude/agents/` vuota creata nella copia di lavoro | «nessuna .claude/agents/» (e `git status` restava pulito: una cartella vuota git non la vede); tolta **spostandola** nella scratchpad della sessione, non cancellandola |

- **Specialisti:** casi 4, 5, 7 e 9 con l'esito atteso (§3). Il caso 6 ha rilievi visivi che la specifica non prevedeva.

## 5. Copia di lavoro (caso 11)

`C:\Users\Francesco\source\LL-Italia`, prima (misura di partenza) e dopo (prima dell'arresto 2), stessi valori: su `main` a `6d582d4`, `git status --porcelain --untracked-files=all` vuoto, nessuna `.claude/`, `CLAUDE.md` SHA-256 `c2e35c7168ec00ebc074d5dd7ae65e9db3753b912cb640202872d7450036e252`. Unica lettura dalla copia di lavoro durante le prove: `collaudi/node_modules` via `NODE_PATH`.

## 6. Copia separata e rami di prova lasciati

- Copia separata: `C:\Users\Francesco\source\LL-Italia-SottoAgenti` (`git worktree`), ramo `lavoroSottoAgenti`. Materiale non versionato in `collaudi/materiale/`: `revisione/` (diff e specifica di prova), `schermate-caso6/`, `schermate-caso7/`, `uscita-suite-caso6.txt`, `uscita-suite-caso7.txt`, `uscita-suite-caso13.txt`.
- Rami di prova **locali**, non caricati: `provaSottoAgentiVersione` (`1ee4109`, caso 4), `provaSottoAgentiVisore` (`3df8a26`, caso 7).
- Nella scratchpad di questa sessione: la cartella del guasto del caso 11 (`GuastoCaso11\.claude\agents`, vuota).
- Nessuno è stato rimosso (§5 della specifica).

## 7. Dopo l'unione: previsione (scritta prima)

1. La copia di lavoro si porta a `main` (`git pull`), e lì ci sono il `CLAUDE.md` nuovo e `.claude/agents/` coi tre file.
2. **Questa sessione non vedrà gli agenti nuovi**: la documentazione dice che serve una sessione nuova quando si crea il primo file in una cartella `agents` che non esisteva all'avvio. Il controllo lo fa la prima sessione nuova, come primo atto.
3. **Caso 3 vero:** in una sessione nuova nella copia di lavoro su `main`, fra i tipi di agente dello strumento Agent compaiono `revisore`, `collaudo-mobile` ed `esploratore`, con le descrizioni dei file.
4. **Limite vero degli strumenti:** chiesto a `revisore` di creare un file in `collaudi/materiale/`, non lo crea (non ha strumenti che scrivono né Bash) e lo dice; `git status` invariato e nessun file nuovo in `collaudi/materiale/`.
5. Finché 3 e 4 non sono verdi gli specialisti non si usano per lavoro vero; se uno è rosso, arresto alla sessione responsabile.

## 8. `esploratore` su un modello più leggero

`model: haiku`: fa solo ricerche e letture, dove la velocità e il costo contano più del ragionamento. Caso 9: risposta giusta e completa (riga di `core/versione.js` e rimando a `sw.js:5`), 118 829 token, 81 secondi. Se un caso futuro sbaglia, si torna a `inherit`.

## 9. Ingressi che cambiano comportamento rispetto a `6d582d4`

1. **Regola A** (`CLAUDE.md`, «Modifiche alle regole del repository»): `CLAUDE.md` e `.claude/` solo con una PR a parte, preparata in un `git worktree` fuori dalla copia di lavoro; la PR non contiene altro.
2. **Regola B** (`CLAUDE.md`, «Domande e arresti», e «Modello di collaborazione»): domande e arresti alla sessione responsabile, non a Francesco; per gli arresti «l'utente» delle regole di condotta è la sessione responsabile.
3. **Sezione Specialisti**: quando si usa ciascuno; il ritorno riporta l'esito di `revisore` e, se tocca l'interfaccia, di `collaudo-mobile`.
4. **Riga 10**: «specifica ufficiale: prevale su tutto», senza numero di revisione (chiude il caso 21 della 0.41.1, lasciato aperto nel suo ritorno).
5. Trovati durante il lavoro:
   - in una sessione nuova Claude può **delegare da sé** ai tre agenti, perché la documentazione dice che sceglie in base alla `description`;
   - `collaudo-mobile` scrive in `collaudi/materiale/` (schermate e uscita della suite): cartella ignorata, `git status` non cambia;
   - `esploratore` gira su un modello diverso da quello della sessione.

## 10. Punti aperti

1. **CLI di Claude Code non autenticata sul PC (2.1.273, 27/10 16:54): niente prove degli specialisti in un processo separato.**
2. **`collaudo-mobile` e Bash (D2):** con Bash l'agente può scrivere. La documentazione dice che una voce con specificatore in `disallowedTools` (es. `Bash(git push *)`) toglie l'intero strumento, e che per bloccare solo alcuni comandi servono regole `permissions.deny` nelle impostazioni; per un controllo più fine porta l'esempio di un hook `PreToolUse` nella definizione. Passi possibili, **non fatti** (fuori perimetro): `permissions.deny` o un hook. Oggi il riscontro è il caso 8 (`git status` dopo ogni chiamata).
3. **Bash di `collaudo-mobile` oltre i due usi della definizione:** nei casi 6 e 7 il sotto-agente ha usato anche comandi di sola lettura (`ls`, `grep`, `sed`, `tail`, `wc`, `git log/diff/branch`, un ciclo `until … sleep`) e ha lanciato la suite in background. Nessuna modifica. In una sessione vera questi comandi possono chiedere permessi: o si allarga la definizione a «leggere l'uscita», o si restringe. Da decidere.
4. **Prove con sotto-agente generico:** il limite degli strumenti non è stato provato dalla definizione; gli strumenti usati sono dichiarati dai sotto-agenti. Lo prova il §7, punto 4.
5. **Rilievi degli specialisti fuori perimetro**, riportati come li hanno dati e non corretti:
   - `revisore` (caso 5) sulla 0.41.1 già unita, **non riscontrati dallo sviluppo**: frase della regola 1 sopra il pulsante nella Coda invii (`modules/bolle/index.js:586-588`) e sotto in Bolle inviate; `docs/AppBolleContinuita202610070939Claude.md:52` e `:60` dicono che in «Cantiere sbagliato?» la fase resta quella dell'invio, mentre dalla 0.41.1 si può cambiare; `eLotto` in `modules/bolle/storico.js:381` duplica il riconoscimento del lotto di `core/anagrafica.js`; D1–D4 della 0.41.1 scritte come «decisione di Francesco» nei documenti; `collaudi/esegui.js:55` rimanda alla «trappola 9», che in `aiuto.js` è la 8; Coda invii con cantiere non più nel menù: `#r-cantiere` senza segnaposto (previsione dal codice).
   - `esploratore` (caso 9), **riscontrati sul file**: `README.md:423` dice di incrementare la versione «a ogni modifica dei file dell'app», `CLAUDE.md:21` «a ogni rilascio»; `README.md:281` descrive `core/versione.js` come «letta dalla cache attiva del service worker», non più vero.
   - `collaudo-mobile` (caso 6), su `main`: voce «BRU - urbanizzazioni via Bardonecchia» tagliata nel menù a 360×800; ✕ poco visibile sull'immagine chiara.
6. **Specifica di prova del caso 4** (non versionata): metteva «il codice dell'app» fuori perimetro in contrasto con la modifica 1; il revisore l'ha segnalato (O1). Difetto della prova, non dell'agente.
7. **File del diff per il revisore:** messo in `collaudi/materiale/revisione/` (ignorata) e non fuori dalla cartella del repository, perché il primo metodo (`claude -p`) non poteva leggere fuori dalla cartella di lavoro senza `--add-dir`.
8. Il ramo `lavoroSottoAgenti` era nato col tracciamento di `origin/main`; si carica come `origin/lavoroSottoAgenti`.
