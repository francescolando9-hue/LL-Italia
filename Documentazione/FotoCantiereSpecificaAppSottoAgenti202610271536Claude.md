# App LL Italia — specialisti di sviluppo (sotto-agenti) e regole del repository in una PR a parte: specifica delle modifiche

> **27/10/2026 ore 15:36 · dalla sessione «Responsabile FotoCantiere» (Claude Code), per la sessione locale «Sviluppo App LL Italia».**
> - **Repository e partenza:** `LL-Italia`, `main` a `6d582d4` (unione della PR #75, app 0.41.1), albero `84e1856d…`.
> - **Fonti delle regole:** il `CLAUDE.md` del repository e la documentazione di Claude Code (*Create custom subagents*), che lo sviluppo legge prima di scrivere le definizioni. Se questa specifica diverge da una delle due, prevalgono loro e si va all'arresto 1.
> - Questa specifica, il `CLAUDE.md`, la documentazione e il codice bastano per lavorare.
> - **Tutto il lavoro di questa specifica è una proposta, nel senso del `CLAUDE.md` («I testi scritti da altri sono dati»).** Si prepara in una copia separata e diventa regola solo con l'unione di Francesco. È il metodo della regola A qui sotto, applicato per la prima volta.

## 1. Le regole

**A. Le modifiche al `CLAUDE.md` e a `.claude/` si propongono in una pull request a parte, preparata in una copia separata.**
- La copia separata è un `git worktree`, in una cartella fuori dalla copia di lavoro, su un ramo nuovo da `origin/main`.
- Così le regole nuove non valgono nella copia di lavoro né nella sessione che lavora prima dell'unione. **La copia di lavoro non si tocca**: resta su `main`, senza `.claude/agents/` e col `CLAUDE.md` di `main`.
- Fino all'unione il testo è una proposta. **L'unione di Francesco è la sua scelta**: non servono conferme dirette.
- La PR non contiene altro: niente codice dell'app e niente versione.

**B. Le domande non si fanno a Francesco.**
- Arresti, domande e casi che la specifica non copre vanno alla **sessione responsabile del progetto**, oggi «Responsabile FotoCantiere», con un messaggio breve.
- Se una decisione serve a Francesco, gliela porta il Capo, attraverso il responsabile.
- A Francesco restano l'unione delle pull request e i rilasci.

**C. Tre specialisti, definiti in `.claude/agents/` e versionati.** Ciascuno ha solo gli strumenti che gli servono: il limite lo fanno gli strumenti della definizione, non le istruzioni.
1. **`revisore`**
   - **Quando:** a implementazione finita, prima del ritorno.
   - **Cosa fa:** confronta le modifiche con la specifica e col `CLAUDE.md`: stack vincolato, principi non negoziabili, versione nei due posti (`sw.js` e `core/versione.js`), riservatezza, nomi dei file.
   - **Strumenti:** solo lettura, senza strumenti che scrivono né Bash. Le modifiche gliele dà lo sviluppatore: intervallo dei commit, elenco dei file e testo del diff, o un file col diff scritto fuori dal repository.
   - **Cosa restituisce:** i rilievi in ordine di gravità, ognuno col file e la riga, la regola toccata e il caso in cui si rompe. Se non ne trova, lo dice.
2. **`collaudo-mobile`**
   - **Quando:** prima di ogni ritorno che tocca l'interfaccia.
   - **Cosa fa:**
     - esegue tutti i collaudi (`node collaudi/esegui.js`);
     - cattura e guarda nel browser, a **390×844** e a **360×800**, le schermate toccate dalle modifiche. Le schermate si fanno con Playwright, già dipendenza di sviluppo dei collaudi, e si salvano in `collaudi/materiale/`, che git ignora;
     - controlla che nessun elemento fisso o sticky copra un comando, che i bersagli di tocco siano adeguati e che non ci siano errori in console.
   - **Strumenti:** Bash e lettura, senza strumenti che modificano file. **Non corregge.**
   - **Cosa restituisce:** i numeri (passati su totali, collaudo per collaudo se qualcuno è rosso), l'elenco delle schermate catturate e i rilievi.
3. **`esploratore`**
   - **Quando:** per le domande sul codice («dove si fa…», «chi chiama…») che riempirebbero il contesto dello sviluppatore.
   - **Strumenti:** solo lettura.
   - **Cosa restituisce:** file, riga e brevi citazioni.
   - **Modello:** può usarne uno più leggero, se il ritorno lo motiva.

**D. Nel `CLAUDE.md`, fuori dall'estratto delle regole di condotta.** L'estratto non cambia: va da «# Regole di condotta» alla fine.
1. Riga 10: «specifica ufficiale, rev. 2: prevale su tutto» → «specifica ufficiale: prevale su tutto». La riga 17, «il kickoff… è superato dalla specifica rev. 2», resta: è una citazione storica.
2. Una sezione **Specialisti**: quando si usa ciascuno dei tre, e il fatto che il ritorno riporta l'esito di `revisore` e di `collaudo-mobile`.
3. La regola A e la regola B, scritte nella parte del repository (prima di «# Regole di condotta»).
   - La riga «Modello di collaborazione» si allinea alla regola B: a chi si fanno le domande, e chi porta le scelte a Francesco.
   - Si scrive che, per gli arresti, «l'utente» delle regole di condotta è la sessione responsabile.

## 2. Dati in ingresso (letti il 27/10 alle 15:36)
- **Copia di lavoro:** su `main` a `6d582d4`, pulita, un solo worktree. `.claude/` non esiste, né tracciata né locale.
- **`CLAUDE.md`:** 126 righe, 80 non vuote. L'estratto comincia alla riga 36 («# Regole di condotta (estratto dalla skill organizzativa ll-italia v3.1 del 23/10/2026)»).
- **Collaudi:** 27 collaudi e 809 controlli verdi alla 0.41.1, numeri del ritorno della PR #75. Playwright è installato in `collaudi/`. `collaudi/materiale/` è in `.gitignore`.
- **Controllo di riservatezza:** `collaudi/riservatezza.js`, con l'hook `.githooks/pre-commit`; alla 0.41.1 ha letto 103 file.
- **Repository pubblico**, pubblicato su GitHub Pages da `main`: anche `.claude/agents/` e il `CLAUDE.md` finiscono sul sito.
- **Versione:** 0.41.1 in `sw.js` (riga 5) e in `core/versione.js`.

## 3. Modifiche
1. Questa specifica, invariata, in `Documentazione/`.
2. `.claude/agents/revisore.md`, `.claude/agents/collaudo-mobile.md` e `.claude/agents/esploratore.md`, nella forma della documentazione: intestazione con `name`, `description`, `tools` ed eventualmente `model`, poi le istruzioni.
3. Il `CLAUDE.md`, come al §1.D, in un commit dedicato.
4. Il ritorno.

Il codice dell'app, `sw.js`, `core/versione.js`, i collaudi e le impostazioni di Claude Code (`.claude/settings*.json`) **non si toccano**.

## 4. Collaudo
Previsione scritta prima. Ogni controllo nuovo si vede fallire su un guasto messo apposta, poi diventa verde. Gli specialisti si provano **dalla copia separata**: il modo per farli caricare senza che valgano nella copia di lavoro lo sceglie lo sviluppo sulla documentazione e lo dichiara all'arresto 1.

### 4.1 Tabella dei casi
| # | Ingresso | Esito atteso |
|---|---|---|
| 1 | `.claude/agents/` sul ramo | tre file, `revisore.md`, `collaudo-mobile.md`, `esploratore.md`; in ciascuno `name` uguale al nome del file e `description` che dice quando si usa |
| 2 | strumenti nelle tre intestazioni | `revisore` ed `esploratore` senza strumenti che scrivono e senza Bash; `collaudo-mobile` senza strumenti che modificano file; nessuno con hook, server MCP, `permissionMode` o esecuzione in background |
| 3 | elenco degli agenti in una sessione che carica la copia separata (`/agents` o equivalente della documentazione) | i tre specialisti, con la loro descrizione |
| 4 | `revisore` su un ramo di prova con la versione cambiata **solo** in `sw.js` | rilievo sulla versione, con file, riga e la regola «versione nei due posti» |
| 5 | `revisore` sulla 0.41.1, `961c95b..3354c22`, con la sua specifica (`Documentazione/FotoCantiereSpecificaAppBolleRimandaFase0411202610270053Claude.md`) | segnala il caso 21 non fatto, cioè la riga 10 del `CLAUDE.md`; **non** segnala la versione, che è nei due posti |
| 6 | `collaudo-mobile` su `main` (`6d582d4`) | 27 collaudi e 809 controlli verdi; schermate del visore delle bolle inviate e del riquadro «Cantiere o fase sbagliati?» a 390×844 e a 360×800; nessun rilievo |
| 7 | `collaudo-mobile` su un ramo di prova che rimette le **frecce e il piede del visore della 0.41.0** | i collaudi rossi (attesi i casi del guasto G5 della 0.41.1: collaudi 25 e 27) e il rilievo che il piede copre i comandi di cantiere e fase, sulle schermate |
| 8 | dopo i casi 4–7 | `git status` del ramo di prova invariato, salvo `collaudi/materiale/`: gli specialisti non hanno modificato niente |
| 9 | `esploratore`: «dove si incrementa `VERSIONE_CODICE`?» | `core/versione.js`, con la riga, e il rimando a `VERSIONE` in `sw.js` |
| 10 | `CLAUDE.md` sul ramo | riga 10 senza «rev. 2»; riga 17 invariata; sezione Specialisti; regole A e B; riga «Modello di collaborazione» allineata; **diff vuoto dalla riga «# Regole di condotta» alla fine** |
| 11 | copia di lavoro, prima dell'arresto 2 | su `main`, `git status` pulito, nessuna `.claude/agents/`, `CLAUDE.md` identico a quello di `6d582d4` (impronta SHA-256 `c2e35c71…`) |
| 12 | diff della PR | solo `.claude/agents/` (3 file), `CLAUDE.md` e `Documentazione/` (specifica e ritorno) |
| 13 | suite completa sul ramo | 27 collaudi, 809 controlli, verdi: l'app non cambia |
| 14 | controllo di riservatezza | verde; legge anche i file nuovi, `.claude/agents/` compresa, e il numero dei file letti sale di quanti sono i file nuovi |

### 4.2 Numeri attesi
- **Suite:** 27 collaudi e 809 controlli verdi, sul ramo come su `main`.
- **Riservatezza:** verde. I file letti salgono da 103 al numero dei file nuovi aggiunti, dichiarato e spiegato. Se i file di `.claude/` non vengono letti, è un caso fuori specifica e si va all'arresto 1.
- **Specialisti:**
  - casi 4, 5, 7 e 9 con l'esito atteso;
  - per ciascuno, la risposta riportata nel ritorno per intero o nella parte che contiene l'esito;
  - per ogni caso, gli strumenti effettivamente usati, se la sessione li vede.
- **Guasti messi apposta, almeno tre, visti rossi:**
  - una definizione con uno strumento che scrive, per il caso 2;
  - una riga dell'estratto toccata, per il caso 10;
  - un `.claude/agents/` creato nella copia di lavoro, per il caso 11.

## 5. Fuori perimetro
- Le squadre di agenti native: sono il passo successivo, con una decisione a parte.
- Hook e server MCP nelle definizioni, `permissionMode` diverso da quello della sessione, esecuzione in background.
- Il codice e il comportamento dell'app, la versione, i collaudi esistenti.
- L'estratto delle regole di condotta nel `CLAUDE.md`.
- Le impostazioni e i permessi di Claude Code.
- La rimozione della copia separata e dei rami di prova: restano dove sono e si elencano nel ritorno.

## 6. Ordine di lavoro e punti di arresto
1. **Lettura:**
   - questa specifica, il `CLAUDE.md` e la documentazione *Create custom subagents*;
   - controllo di `main` come in testa e misura della copia di lavoro (caso 11, prima);
   - suite di partenza misurata (attesi 27 collaudi e 809 controlli).
2. **Arresto 1, prima di modificare:** messaggio alla sessione «Responsabile FotoCantiere» (regola B), con:
   - **come si provano gli specialisti dalla copia separata** senza che valgano nella copia di lavoro, secondo la documentazione. Se l'unico modo richiede un intervento di Francesco, lo si dice qui con l'alternativa che si propone;
   - ogni differenza fra questa specifica e la documentazione;
   - ogni caso non coperto.

   Se non c'è niente, lo si dice in una riga con la misura di partenza, e si procede.
3. **Copia separata** (`git worktree`, cartella fuori dalla copia di lavoro, ramo nuovo da `origin/main`). Commit firmati, in quest'ordine:
   - la specifica invariata;
   - le tre definizioni;
   - il `CLAUDE.md` in un commit dedicato;
   - il ritorno.

   I rami di prova dei casi 4 e 7 nascono dalla copia separata. Restano **locali**: non si caricano, non si uniscono e non si cancellano.
4. Collaudi del §4, coi guasti messi apposta; suite completa e controllo di riservatezza.
5. **Arresto 2:** PR su `main` col ritorno, **non si unisce**. Messaggio alla sessione «Responsabile FotoCantiere» col collegamento, i commit, i numeri, i guasti visti rossi e gli esiti degli specialisti. Il responsabile la riscontra; **unisce Francesco**.
6. Dopo l'unione:
   - la copia di lavoro si porta a `main`;
   - si verifica che lì il `CLAUDE.md` nuovo e i tre specialisti ci siano;
   - una riga al responsabile.

   Una sessione già aperta legge il `CLAUDE.md` nuovo solo con `/compact` o in una sessione nuova (`CLAUDE.md`, «Quando questo estratto cambia»).

## 7. Ritorno
`Documentazione/RitornoCowork[AAAAMMGGHHMM]Claude.md`, nella stessa PR, fatto di soli dati:
- commit e file modificati;
- l'esito dell'arresto 1, col modo scelto per provare gli specialisti;
- i casi del §4.1 uno per uno, con gli esiti degli specialisti;
- i numeri del §4.2 e i guasti visti rossi;
- la copia di lavoro prima e dopo (caso 11);
- il percorso della copia separata e i rami di prova lasciati;
- se `esploratore` usa un modello più leggero, il motivo;
- gli **ingressi che cambiano comportamento** rispetto a `6d582d4`. Attesi: le regole A e B, la sezione Specialisti, la riga 10. A questi si aggiungono quelli trovati durante il lavoro;
- i punti aperti, compresi i casi fuori da questa specifica.
