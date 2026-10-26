# Ritorno a Cowork — `CLAUDE.md` all'estratto v3.1 e otto commesse nei documenti

> 26/10/2026 ore 19:56 · dalla sessione Claude Code locale (Windows) del repository dell'app, per il progetto **FotoCantiere**. Questo file è un messaggio, non una fonte: riscontralo sul codice, sui commit e sui registri prima di registrarlo. Sono soli dati, quelli che la specifica chiede. Il repository è pubblico: qui non ci sono percorsi del server né dati veri. Specifica ricevuta: `Documentazione/FotoCantiereSpecificaAppEstrattoECommesse202610261632Claude.md`. **La PR non è unita: unisce Francesco, dopo il tuo riscontro.**

## 1. Commit, file modificati, primo arresto

- **Punto di partenza:** `main` a `4ff05f6` (unione della PR 72), albero `26c0ce9846c0d41e0b05e751feb0eb3a8455ec9b`: quello indicato dalla specifica.
- **Misura dell'ambiente su `main`, prima di ogni modifica:** suite **22 collaudi verdi su 23**, **677 controlli: 676 ✓, 1 ✗**. Il rosso era nel 22-riservatezza, «l'hook esiste ed è eseguibile». `node collaudi/pubblicato.js`: `0.40.0` in `sw.js` e in `core/versione.js`, sul sito e nel repo, 4 controlli su 4. Anagrafica `202610261235` nel repo e sul sito: `pubblicato.js` non la controlla, quindi l'ho letta a parte, dal `core/anagrafica.js` servito, con `cache: no-store` (§7, punto 1). Il rosso è stato riportato a Francesco prima di andare avanti, e la sua correzione è al §6.
- **Commit del lavoro**, ramo `claude/estratto-commesse-foto`:

  | Commit | Cosa |
  |---|---|
  | `eb6da26` | collaudo 22: il modo dell'hook si legge dall'indice di git. **Fuori specifica, deciso da Francesco** (§6) |
  | `4bc4681` | la specifica, invariata, in `Documentazione/`: SHA-256 `cc59e5c0369c2fb5ee7b39384d854e93e26329e7da38b37d2127cc1d8eaa02aa`, uguale nell'originale, nella copia e nel blob |
  | `05de16e` | `CLAUDE.md`, commit dedicato |
  | `d902a67` | i tre punti dei documenti |

  Più il commit di questo file.
- **File modificati rispetto a `4ff05f6`** (7 prima di questo file): `CLAUDE.md`, `README.md`, `docs/AppFotoCantiereSpecifica202609141630Claude.md`, `docs/AppBolleSpecificaFunzionale202609011935Claude.md`, la specifica (nuova), `collaudi/22-riservatezza.js`, `collaudi/LEGGIMI.md`. `docs/INDICE.md` non cambia: nessun documento di `docs/` cambia nome.
- **Esito del primo arresto: niente da chiedere.** L'albero è giusto. Il testo del §6 e l'estratto v2.36 nel blob del `CLAUDE.md` differiscono solo per **12 righe aggiunte**, le righe 13–24 del §6: la sezione «Agenti e attività programmate», fra «Passaggio di consegne fra ambienti» e «Riservatezza nei repository». Nessun «sette» corrente fuori dal §1 chiede una modifica (elenco al §7, punto 2), e non c'è nessun caso che la specifica non copra. Due rilievi, registrati senza fermarsi: il primo è al §2 (CRLF su disco), il secondo al §3, caso 4 (README, riga 363).

## 2. Impronta del testo dell'estratto nel `CLAUDE.md`

- **Nel blob del commit `05de16e`**, dalla riga `## Passaggio di consegne fra ambienti` alla fine: **14832 byte**, 0 CR, un solo a capo finale, SHA-256 **`a3e947d543fb574bfd567780c4644542ea8ca72360a630c74a5298d738dc9735`**. È uguale all'atteso.
- **Su disco, su questo PC:** `core.autocrlf=true` e nessun `.gitattributes`. L'indice ha a capo LF, la copia di lavoro CRLF. Il file è stato tolto e ripreso con `git checkout`. Lo stesso testo su disco misura 14919 byte con 87 CR, e l'impronta è `4a5299d6d1d38897f245210901d0d700f737f9f337a01b3dc36451ba1fa969b8`. Senza i CR torna a 14832 byte e `a3e947d5…9735`. L'impronta di riferimento è quella del blob (§7, punto 3).

## 3. Collaudo del §3

| # | Ingresso | Esito misurato | |
|---|---|---|---|
| 1 | `CLAUDE.md`, da `## Passaggio di consegne fra ambienti` alla fine | 14832 byte, SHA-256 `a3e947d5…9735` (§2) | ✓ |
| 2 | intestazione e sezioni | intestazione `# Regole di condotta (estratto dalla skill organizzativa ll-italia v3.1 del 23/10/2026)`; **8** sezioni `##` nell'ordine del §6; parte del progetto (8686 byte, fino all'intestazione esclusa) identica byte per byte a quella di `4bc4681`; riga d'introduzione identica | ✓ |
| 3 | `git diff 4bc4681 05de16e -- CLAUDE.md` | 13 inserzioni, 1 cancellazione: la riga dell'intestazione, più le 12 righe della sezione «Agenti e attività programmate» | ✓ |
| 4 | parti correnti di `README.md` e delle due specifiche | «otto» una volta in ciascuno dei tre punti del §1; nessun «sette» come numero corrente delle commesse. Restano due «sette» riferiti alle commesse in parti correnti, tutti e due come storia dentro una frase che dice otto: README, riga 363 («**Otto commesse**, in ordine alfabetico di codice: sette dal 16/09/2026 (erano tre) e **TN1 dalla 0.39.0**», già così su `main`, non toccata), e la voce Cantiere della specifica Foto («(erano sette dal 16/09/2026)», testo chiesto dalla specifica) | ✓ |
| 5 | parti storiche | `git diff` dei tre documenti: 3 righe cambiate in tutto, una per file. Invariate le note di revisione con le sette commesse (Bolle rev. 4 e rev. 8; Foto rev. 10) e il resoconto del rilascio 0.38.0 nella specifica Foto («`core/cantieri.js` ha sette voci», «sette voci nei due moduli») | ✓ |
| 6 | file dell'app | `core/`, `modules/`, `sw.js`, `index.html` invariati; `0.40.0` in `sw.js` e `core/versione.js`. In `collaudi/` cambiano `22-riservatezza.js` e `LEGGIMI.md`, per la modifica fuori specifica del §6: rispetto al caso come scritto è l'**unica differenza** | ✓ con la differenza del §6 |

**Guasto messo apposta:** in una copia del testo del §6 si è cambiato un carattere («mestiere» → «mestieri», un byte, stessa lunghezza di 14832 byte). L'impronta diventa `bf6da1740ddcd4351cea080069a5631125f6c95c06cc70fc8ceca5298b238e8d`, diversa da quella del caso 1. Lo strumento di misura usato per i casi 1 e 2, passato sulla copia guasta del `CLAUDE.md`, risponde «DIVERSO dall'atteso».

**Il testo nuovo dei tre punti:**
- `README.md`, «Il cantiere non si ricorda e non si preseleziona»: «…e ha **otto voci dalla 0.39.0**.»
- Specifica Foto, §2, voce Cantiere: «**Otto commesse dalla 0.39.0** — `BRU`, `MAR`, `MNG`, `MRS`, `SNU`, `SNZ2.1`, `SNZ2.2`, `TN1` — in ordine alfabetico di codice (erano sette dal 16/09/2026).»
- Specifica Bolle, esempio del payload: `// solo il codice; otto commesse dalla 0.39.0`.

La data della 0.39.0, il 13/10/2026, è riscontrata sul commit `811be14`. Nel testo non l'ho scritta, come nell'esempio della specifica per la voce Cantiere.

## 4. Numeri della suite e controllo di riservatezza

- **Suite intera su `d902a67`: 23 collaudi verdi, 677 controlli: 677 ✓, 0 ✗.** È lo stesso numero di `33d462b`: il controllo dell'hook è stato riscritto, non aggiunto.
- **Riservatezza:** `node collaudi/riservatezza.js` ha letto 94 file e non ha niente da segnalare. L'hook prima del commit è girato su ognuno dei quattro commit, con 2, 1, 1 e 3 file in stage, sempre senza niente da segnalare.
- **Distribuzione:** nessuna. La PR non è unita, quindi non ci sono commit né impronta in esercizio e non c'è una prima esecuzione.

## 5. Ingressi che cambiano comportamento rispetto a `main`

- **Nell'app: nessuno.** Nessun file servito dal service worker cambia, la versione resta `0.40.0` e non c'è distribuzione.
- **Nei collaudi:** il controllo dell'hook, ora «l'hook esiste ed è eseguibile nell'indice di git», legge il modo con `git ls-files -s .githooks/pre-commit` e attende `100755`. Su Windows passa da rosso a verde. In una cartella che non è un clone git dà rosso con la sua frase. La funzione `modoDellHook` è esportata dal modulo del collaudo 22.

## 6. Modifiche fuori specifica, decise da Francesco

- **`eb6da26`, collaudo 22 — decisione di Francesco del 26/10/2026, dopo la misura iniziale del §1.**
  - **La causa del rosso:** su Windows il file system non ha il bit di esecuzione, e Node riporta `100666` per qualunque file (misurato su `.githooks/pre-commit` e su `sw.js`), mentre nell'indice l'hook è `100755`. Il vecchio controllo leggeva il disco, quindi era rosso anche con l'hook a posto. L'hook funzionava: nella stessa esecuzione la sezione del repository usa e getta l'aveva visto bloccare UNC, L: e partita IVA, con 8 controlli verdi su 8.
  - **Il controllo nuovo** legge il modo dall'indice di git e ha una frase per ogni caso: git che non si può eseguire; cartella che non è un clone git; `.git` presente ma illeggibile; cartella dentro un altro repository; hook assente dalla copia di lavoro; hook su disco ma non nell'indice; git che non legge l'indice; modo diverso da `100755`.
  - **Visto rosso prima di renderlo verde, su copie usa e getta poi tolte.** Su un clone senza modifiche è verde («modo 100755 nell'indice di git», 0 falliti). Sullo stesso clone dopo `git update-index --chmod=-x .githooks/pre-commit` dà 1 fallito: «nell'indice di git l'hook ha modo 100644, atteso 100755: chi clona su Linux o macOS riceve un hook che git non esegue». Su una copia senza `.git` risponde «la cartella non è un clone git: il modo dell'hook si legge dall'indice di git, e qui l'indice non c'è (fatal: not a git repository …)». Lì il collaudo intero si ferma prima, sullo scanner (`git ls-files`), e per questo la funzione è esportata e provata da sola.
  - **Suite dopo la correzione:** 23 collaudi verdi, 677 controlli, tutti ✓, uguale alla previsione di Francesco. Il LEGGIMI dei collaudi, alla riga del 22, lo descrive.

## 7. Punti aperti

1. **`collaudi/pubblicato.js` non controlla l'anagrafica.** Confronta solo `sw.js` e `core/versione.js` fra repo e sito. La versione dell'anagrafica (`versione` in `core/anagrafica.js`) si legge a parte. Non l'ho toccato, per decisione di Francesco.
2. **«Sette» trovati fuori dal §1, nessuno da cambiare:**
   - `README.md`, riga 363: frase corrente che dice già «Otto commesse», con «sette dal 16/09/2026 (erano tre)» come storia;
   - specifica Bolle, nota della revisione 8 in testa («l'elenco ha sette voci»), e specifica Foto, nota della rev. 10 in testa («Rev. 9 — sette commesse selezionabili»): note di revisione, cioè storia;
   - `collaudi/14-commesse.js`, riga 55, «le sette di prima non sono cambiate»: è il controllo sulle sette commesse precedenti a TN1, corretto, ed è fuori perimetro;
   - `Documentazione/`: la specifica Palazzina del 13/10 e i ritorni del 10/10 e del 26/10 ore 15:51, fuori perimetro.

   Gli altri «sette» del repository non riguardano le commesse: giorni, «Sette Response», revisioni.
3. **Impronte «a capo LF» misurate da un PC Windows.** Senza `.gitattributes`, con `core.autocrlf=true` la copia di lavoro ha CRLF e l'impronta del file su disco non è quella dichiarata (§2): si misura sul blob (`git show <commit>:<file>`). Candidata a regola di gruppo da segnalare alla skill: «un'impronta dichiarata con a capo LF si misura sul contenuto registrato nel repository, non sul file su disco». In alternativa, una scelta di Francesco: un `.gitattributes` con `eol=lf` per i file di testo. Non l'ho fatto: è fuori perimetro.
