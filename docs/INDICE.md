# Indice dei documenti — App LL Italia

> **Nome stabile, senza data: questo file non cambia mai nome.** Esiste perché gli altri documenti, per la convenzione di gruppo, portano il suffisso `AAAAMMGGHHMM` e cambiano nome a ogni revisione — e chi li legge da fuori (Cowork, che raggiunge il repo via GitHub Pages) perde l'indirizzo a ogni giro. Qui ci sono i nomi **completi** dei documenti correnti: si parte da questa pagina e si arriva al file giusto.
>
> **È un puntatore, non una copia.** Non riassume e non duplica il contenuto dei documenti: se lo facesse diventerebbe una versione parallela destinata a divergere, che è esattamente il problema che deve risolvere. Una riga per documento, per sapere quale aprire.
>
> **Va aggiornato quando un documento di `docs/` cambia nome** — cioè quando nasce, sparisce o cambia natura. Un indice che punta a un file che non esiste più è peggio di nessun indice: manda un `404` a chi si fidava.
>
> **I nomi qui dentro non cambiano a ogni revisione.** In un repository la storia la tiene git: la data nel nome è quella di **creazione**, quella dell'ultima modifica la dà `git log`, e la revisione corrente si legge in testa al documento. È lo standard di gruppo per i documenti versionati (skill `ll-italia` §9, confermato da Francesco il 14/09/2026) e vale al posto del «modello B» dei file su `L:`, che rinomina a ogni giro perché lì una cronologia non c'è. Conseguenza pratica: gli indirizzi qui sotto restano validi, e questo indice si tocca di rado.

Indirizzo da cui leggerli: `https://francescolando9-hue.github.io/LL-Italia/docs/<nome del file>` — oppure direttamente nel repo, cartella `docs/`.

## Modulo Bolle

| Documento | Cosa contiene |
|---|---|
| `AppBolleSpecificaFunzionale202609011935Claude.md` | **Specifica funzionale, rev. 6 — prevale su tutto** per il modulo Bolle: contratto di invio (token nel corpo, `dataInvio`, `202 Accepted` senza corpo, `api-version=2024-10-01`), campi `progressivo`, `idDispositivo` e **`fase`** (dalla 0.31.0: **colonna `Fase` da aggiungere** in `BolleInArrivo`), il **lotto al posto della fase** per SNU e BRU, **«Rimanda»** su ogni bolla inviata. La rev. 6 **ritira** i tre livelli `piano` / `unita` / `prospetto` dal contratto delle bolle: `BolleInArrivo` non ha quelle colonne, e mandare campi che vengono scartati è peggio che non mandarli. |
| `AppBolleFlowRicezione202609031937Claude.md` | Rev. 7. Il flow `BolleInArrivoRicevitore` e la raccolta `BolleInArrivo`: struttura delle azioni, colonne, procedure di modifica, esiti dei collaudi. Vale come **modello per gli altri flow** del gruppo. |
| `AppBolleContinuitaRunbook202609031100Claude.md` | Rev. 8. Documento unico e **autosufficiente** per il lavoro a valle, dalla raccolta in poi: controllo di continuità, buchi nella sequenza, eccezioni. È quello da caricare in Cowork per riprendere il tratto magazzino. |
| `AppBolleLeggibilita202609031500Claude.md` | Metodo e taratura del controllo di leggibilità delle foto: perché avvisa senza bloccare, e su quali misure sono state fissate le soglie. |

## Modulo Foto cantiere

| Documento | Cosa contiene |
|---|---|
| `AppFotoCantiereSpecifica202609141630Claude.md` | **Rev. 11.** Specifica del modulo: categorie, video, contratto di invio (`dataScatto` = ora dello scatto letta dall'EXIF con l'avviso sulle copie ridotte, `scattoStimato`, **`fase`** da elenco chiuso — codice senza spazi = nome della cartella — obbligatoria per le foto da archiviare, e i tre **livelli `piano` / `unita` / `prospetto`** con la regola fase per fase, §4.5) — **27 fasi dal 18/09/2026**, con `SistemazioneEsterna` — **«Rimanda»** nei suoi due casi, esiti dei collaudi del 10 e del 14/09 e dei rilasci 0.29.0 e 0.36.0, stato del caricamento a blocchi, requisiti del flow — fra cui le **colonne `ScattoStimato`, `Fase`, `Piano`, `Unita` e `Prospetto` da aggiungere** in raccolta — e lo smistamento del venerdì, §6, dove **il livello sostituisce la cartella del mese**. Sostituisce `AppFotoCantiereSpecifica202609101728Claude.md`, rinominato il 14/09 e da allora stabile: le revisioni si scrivono dentro il documento. |
| `FotoCantiereBriefingRicevente.md` | Stato **reale** di raccolta e flow, misurato sul tenant nel collaudo del 10/09/2026. **Dove diverge dalla specifica qui sopra, fa fede questo:** contiene ciò che è stato misurato, non ciò che era previsto. Nome stabile per la stessa ragione di questo indice. |

## Non in questo repo

| Documento | Dove sta |
|---|---|
| `AppFotoCantiereRunbookVenerdi….md` | **Su `L:`, accanto al file di conoscenza di progetto.** È il lavoro a valle del modulo Foto: come le foto d'archivio passano ogni venerdì dalla raccolta alle cartelle di commessa sul server. Si esegue in **Cowork** e nomina percorsi del server interno, quindi non sta in un repo pubblicato su GitHub Pages. |

## Fuori da `docs/`

| File | Cosa contiene |
|---|---|
| `README.md` (radice) | Cosa fa l'app oggi, come si prova da telefono, struttura del repo, decisioni di prodotto. |
| `CLAUDE.md` (radice) | Regole di lavoro sul repo: architettura shell + moduli, stack vincolato, principi non negoziabili, gerarchia delle fonti di verità. |
