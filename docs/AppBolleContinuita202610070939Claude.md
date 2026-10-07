# App Bolle — Continuità: cosa arriva dall'app, e con quali garanzie

> **Rev. 1 del 07/10/2026.** Nasce dal documento di continuità precedente (rev. 9 del 06/10; la sua storia è in git) ridotto al **solo lato app**, per decisione di Francesco del 07/10/2026: cosa manda l'app, come lo manda, e cosa a valle si può dare per certo. Allineato all'app **0.38.0** e alla prova sul telefono del 07/10.
>
> **Cosa NON c'è qui, di proposito.** Lo stato della raccolta `BolleInArrivo`, del flow di ricezione e del lavoro a valle — interventi su SharePoint, marcatura del lavorato, scarti, eccezioni di continuità, regole del runbook del magazzino — sta nella **conoscenza del progetto AutomazioneMagazzinoCantiere** (Cowork), che fa fede. Copiarlo qui creerebbe una seconda verità destinata a divergere. Come è stato costruito il flow lo dice `docs/AppBolleFlowRicezione….md`.
>
> Non contiene segreti né percorsi del server: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.

---

## 1. L'app e il giro dell'operatore

**App "LL Italia" — PWA installata sui telefoni.** Repo pubblico `francescolando9-hue/LL-Italia`, pubblicata su GitHub Pages. Vanilla JS, nessun framework, nessun account M365 richiesto agli operai. È un contenitore a moduli: **Bolle** e **Foto cantiere**, con flow e raccolte separati — questo documento riguarda solo le bolle. Il modulo Bolle è **capture-only**: raccoglie e invia foto, non legge nulla del contenuto.

**Il giro: quattro tocchi.** Fotografa la bolla, apre il menù del cantiere, sceglie il cantiere, preme Invia. **Cantiere e fase si scelgono a ogni invio** e niente si ricorda sul telefono: dopo Invia il cantiere torna a «— scegli il cantiere —» (dalla 0.38.0) e la fase a «— nessuna fase —» (dalla 0.37.9); senza cantiere Invia resta spento. La fase è facoltativa, e **una scelta vale per un invio**: se l'invio porta più bolle insieme (scelta multipla dalla galleria, o una serie di scatti), tutte prendono la stessa fase. Se la bolla è su più fogli, dopo la prima foto si tocca «Aggiungi pagina a questa bolla» e si scatta il foglio successivo: le pagine partono numerate nell'ordine di scatto.

**La foto si prepara una volta sola, quando entra nell'app.** È compressa in JPEG (lato lungo 2500 px, qualità 0,85: la leggibilità prevale sul peso) e messa in coda su IndexedDB **prima** di qualunque tentativo di rete. Da lì in poi i byte non cambiano più: il primo invio, i nuovi tentativi, «Rimanda» e «Cantiere sbagliato?» mandano tutti lo **stesso file** (§3). Se il telefono è senza campo o l'app viene chiusa la foto non si perde, e una foto esce dalla coda **solo** alla conferma del server.

## 2. Cosa manda l'app

POST JSON all'endpoint del flow, **un file per richiesta**, `Content-Type: application/json`, `api-version=2024-10-01` obbligatoria nell'URL.

| Campo | Contenuto |
|---|---|
| `token` | token statico condiviso col flow |
| `commessa` | **solo il codice**: `BRU` \| `MAR` \| `MNG` \| `MRS` \| `SNU` \| `SNZ2.1` \| `SNZ2.2` (a video l'operatore vede l'etichetta estesa) |
| `fase` | codice della fase di lavoro senza spazi (`FinituraAlloggi`), dall'elenco chiuso di gruppo; per le urbanizzazioni `SNU` e `BRU` è il **lotto** (`Lotto2`). **Sempre presente, vuoto** se nessuno l'ha scelta: è il valore di partenza di ogni invio |
| `operatore` | nome e cognome, **da elenco chiuso** dal 14/09/2026: si sceglie, non si scrive |
| `idClient` | GUID dell'invio: la sua identità stabile, la chiave della deduplica del flow |
| `idDispositivo` | GUID dell'installazione: il titolare della sequenza |
| `progressivo` | intero, sequenza di quel dispositivo |
| `idBolla` | GUID della **bolla**: uguale per tutte le sue pagine |
| `pagina` / `pagine` | numero della pagina e quante pagine compongono la bolla |
| `dataInvio` | ISO 8601 con fuso, **ora reale del telefono** (`2026-09-03T09:17:25+02:00`): l'istante in cui la foto **entra nell'app** — lo scatto, con la fotocamera interna; l'aggiunta, per una foto presa dalla galleria. Non è l'ora dell'invio. In raccolta finisce nella colonna `DataScatto` |
| `versioneApp` | versione dell'app che sta girando su quel telefono |
| `nomeFile` | **ignorato dal backend**: il nome lo compone il flow |
| `contenutoBase64` | il JPEG in base64 |

L'app considera la bolla consegnata a **qualunque risposta 2xx**: solo allora esce dalla coda e diventa «Inviata».

## 3. Cosa a valle si può dare per certo, e cosa no

- **La commessa è certa: la sceglie qualcuno a ogni invio.** Fino alla 0.37.9 l'app riproponeva l'ultimo cantiere usato, e una bolla poteva partire col cantiere dell'invio prima senza che nessuno lo guardasse; dalla 0.38.0 non succede più. Stesso discorso per l'operatore, da elenco chiuso.
- **La fase è un'indicazione dell'operatore, non un dato certo.** Arriva solo se qualcuno l'ha scelta per quell'invio; vuota vuol dire che nessuno l'ha scelta. Una sola scelta vale per tutte le bolle dello stesso invio. Deciso da Francesco il 06/10/2026: **le regole di attribuzione del runbook prevalgono sulla fase dell'app.**
- **`idClient` identifica l'invio, ed è stabile fra un tentativo e l'altro.** Un elemento che il telefono rimanda — perché la risposta non è arrivata, o con «Rimanda la stessa» — riparte con lo **stesso `idClient` e lo stesso progressivo**. Il flow riconosce un `idClient` già visto e non scrive niente: **la deduplica funziona**, provata il 07/10/2026 (il dettaglio nel documento del flow). Un reinvio non crea doppioni.
- **`idDispositivo` + `progressivo` rendono misurabile il tratto telefono → raccolta.** Il progressivo si assegna quando la bolla entra in coda (non allo scatto: una foto scartata dalle anteprime non consuma un numero), cresce di 1 per ogni pagina, **non si azzera mai** — nemmeno azzerando i contatori del giorno — e non si riusa fra un tentativo e l'altro. Quindi dal lato app **non esistono buchi legittimi**: un numero mancante è una pagina entrata in coda e mai arrivata, oppure arrivata e tolta dalla raccolta. Tre avvertenze:
  - **si raggruppa per `idDispositivo`, mai per operatore**: il nome è della persona, non del telefono, e due telefoni della stessa persona fonderebbero due sequenze;
  - un telefono **reinstallato riparte da 1** con un `idDispositivo` nuovo: evento atteso, riconoscibile proprio perché l'identificativo cambia;
  - l'identificativo del telefono si legge sull'app, in *Impostazioni app → Questo dispositivo*.
- **Una bolla può essere su più pagine.** Una bolla di tre fogli sono **tre invii**, legati da `idBolla` e ordinati da `pagina`; `pagine` dice quante devono essere. Si ricompone **raggruppando per `idBolla` e ordinando per `pagina`**, mai per orario di arrivo o per nome del file; anche una bolla di una pagina ha il suo `idBolla`, con `pagina` 1 e `pagine` 1. **I conti si fanno in pagine, non in bolle**: l'app conta pagine, e ogni pagina consuma un progressivo.
- **«Rimanda la stessa»** (dalla 0.36.0, niente modificato): stesso `idClient`, stesso progressivo, stesso file. In raccolta non cambia niente, e l'app non lo conta fra le «inviate oggi».
- **«Rimanda corretta» e «Cantiere sbagliato?» creano una bolla NUOVA con la stessa foto.** `idClient` e progressivo **nuovi**, file **identico byte per byte** — l'app non ricodifica: manda la foto conservata così com'era —, stessa `idBolla`, `pagina` e `pagine` dell'originale, così la correzione non spezza una bolla di più pagine. In «Cantiere sbagliato?» la fase resta quella dell'invio originale: si corregge il cantiere, non l'attribuzione. **La bolla già mandata resta in raccolta e va annullata dall'ufficio**: il telefono non può sapere se è già stata lavorata, e l'app lo dice nella conferma. Provato il 07/10/2026: la bolla corretta è arrivata come elemento nuovo, con lo stesso file dell'originale (stessa impronta SHA-256).
  - **Dove questa garanzia NON vale.** Le correzioni si possono fare solo finché la foto originale è ancora sul telefono (le ultime N inviate, impostazione del modulo). Se l'operatore, invece di correggere, **rimanda la bolla scegliendola di nuovo dalla galleria**, quella foto ripassa dalla compressione: è un invio nuovo e i byte possono non essere gli stessi. L'app avvisa che la foto è identica a una già mandata — lo riconosce dall'impronta del file originale — ma non lo impedisce.
- **Se il flow scrive la bolla e poi non risponde bene**, l'app non lo sa: per lei l'invio non è riuscito. Con una risposta non 2xx la bolla va su **«Errore»** con il motivo (per esempio `Errore del server: 502 — il flow è terminato senza rispondere: guarda la cronologia del flow`) e i pulsanti «Riprova» e «Riprova tutti»; senza risposta va su «Errore» con `Invio interrotto: nessuna risposta dopo 8 minuti` o `nessuna risposta dall'endpoint (rete assente o CORS)`. **In tutti i casi ritenta da sola**: dopo 5 secondi, poi 10, 20 e così via fino a un tentativo ogni 5 minuti finché l'app è aperta, e di nuovo a ogni apertura, al ritorno della rete e a ogni Invia. Un elemento rimasto su «Invio in corso» quando l'app si è chiusa riparte da solo alla riapertura. Ogni tentativo usa lo **stesso `idClient` e lo stesso progressivo**: la deduplica del flow risponde senza scrivere niente, la bolla diventa «Inviata» e fra le «inviate oggi» conta **una volta sola**, perché un tentativo fallito non si conta. La frase «Era già in raccolta» compare solo se la risposta del flow contiene `gia_presente`.

## 4. Cose che l'app già fa, e che a valle non vanno duplicate

- **Avviso di scarsa leggibilità allo scatto:** l'app misura nitidezza (varianza del laplaciano) e pixel bruciati e avvisa se la foto è mossa, scura o in controluce. **Avvisa, non blocca** — la regola che nessuna bolla si perda prevale — quindi possono comunque arrivare bolle illeggibili.
- **Riconoscimento del file identico:** se dalla galleria viene aggiunto lo stesso file già inviato, l'app lo riconosce dall'impronta SHA-256 del file originale e chiede conferma. Copre il doppio invio dello stesso file, **non** due scatti distinti della stessa bolla.
- **Storico locale sul telefono:** calendario del mese, bolle inviate con miniatura, «Rimanda» e «Cantiere sbagliato?» finché la foto è ancora sul dispositivo — il menù del cantiere giusto parte da «— scegli il cantiere —» e Rimanda resta spento finché non si sceglie. È il registro di quel telefono, **non** la vista condivisa della raccolta: non usarlo come fonte di verità a valle.

## 5. Vincoli e principi

- **Collaudo sui numeri, mai sull'esito formale**: un'esecuzione riuscita non è un risultato corretto. Ogni scarto tra i conteggi è un difetto da spiegare.
- **Nessuna bolla si perde**: in dubbio, meglio rimandare che saltare — rimandare è sicuro, perché il flow riconosce un `idClient` già visto.
- **L'app è capture-only e resta tale**: OCR, attribuzione e riconciliazione stanno a valle, nel runbook.
- **Il contratto non cambia per collegare una correzione all'originale**: lo stesso file basta a riconoscerla.
- Standard di gruppo (nomenclatura, convenzioni, regole contabili) nella skill organizzativa `ll-italia`.

---

*Approfondimenti nel repo dell'app: `docs/INDICE.md` (i nomi completi dei documenti), `README.md`, `docs/AppBolleSpecificaFunzionale….md` (prevale su tutto per il modulo Bolle), `docs/AppBolleFlowRicezione….md` (come è costruito il flow, procedure campo per campo, esiti dei collaudi).*
