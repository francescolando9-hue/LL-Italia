# Indice dei documenti — App LL Italia

> **Nome stabile, senza data: questo file non cambia mai nome.** Esiste perché gli altri documenti, per la convenzione di gruppo, portano il suffisso `AAAAMMGGHHMM` e cambiano nome a ogni revisione — e chi li legge da fuori (Cowork, che raggiunge il repo via GitHub Pages) perde l'indirizzo a ogni giro. Qui ci sono i nomi **completi** dei documenti correnti: si parte da questa pagina e si arriva al file giusto.
>
> **È un puntatore, non una copia.** Non riassume e non duplica il contenuto dei documenti: se lo facesse diventerebbe una versione parallela destinata a divergere, che è esattamente il problema che deve risolvere. Una riga per documento, per sapere quale aprire.
>
> **Va aggiornato quando un documento di `docs/` cambia nome** — cioè quando nasce, sparisce o cambia natura. Un indice che punta a un file che non esiste più è peggio di nessun indice: manda un `404` a chi si fidava.
>
> **Qui non si scrivono numeri di revisione né stati** (dal 06/10/2026): erano già rimasti indietro di due e di sette revisioni. La revisione corrente si legge in testa a ogni documento.
>
> **I nomi qui dentro non cambiano a ogni revisione.** In un repository la storia la tiene git: la data nel nome è quella di **creazione**, quella dell'ultima modifica la dà `git log`, e la revisione corrente si legge in testa al documento. È lo standard di gruppo per i documenti versionati (skill `ll-italia` §9, confermato da Francesco il 14/09/2026) e vale al posto del «modello B» dei file su `L:`, che rinomina a ogni giro perché lì una cronologia non c'è. Conseguenza pratica: gli indirizzi qui sotto restano validi, e questo indice si tocca di rado.

Indirizzo da cui leggerli: `https://francescolando9-hue.github.io/LL-Italia/docs/<nome del file>` — oppure direttamente nel repo, cartella `docs/`.

## Modulo Bolle

| Documento | Cosa contiene |
|---|---|
| `AppBolleSpecificaFunzionale202609011935Claude.md` | **Specifica funzionale — prevale su tutto** per il modulo Bolle: schermate, giro dell'operatore, contratto di invio, progressivo e identità del dispositivo, bolla su più pagine, «Rimanda». Le decisioni recenti stanno nelle revisioni in testa (fra cui: livelli fuori dal contratto delle bolle, fase e cantiere che non si preselezionano). |
| `AppBolleFlowRicezione202609031937Claude.md` | Il flow `BolleInArrivoRicevitore` e la raccolta `BolleInArrivo`: struttura delle azioni, colonne, procedure di modifica, esiti dei collaudi. Vale come **modello per gli altri flow** del gruppo. |
| `AppBolleContinuita202610070939Claude.md` | Documento unico e **autosufficiente** per il lavoro a valle, dalla raccolta in poi: cosa arriva certo dall'app e cosa no, controllo di continuità, buchi nella sequenza, eccezioni. È quello da caricare in Cowork per riprendere il tratto magazzino. |
| `AppBolleLeggibilita202609031500Claude.md` | Metodo e taratura del controllo di leggibilità delle foto: perché avvisa senza bloccare, e su quali misure sono state fissate le soglie. |

## Modulo Foto cantiere

| Documento | Cosa contiene |
|---|---|
| `AppFotoCantiereSpecifica202609141630Claude.md` | Specifica del modulo Foto cantiere. In testa, §0, i **punti chiusi** con la data del riscontro: non si riaprono senza leggerli. Poi schermate, preparazione di foto e video, contratto di invio (`dataScatto`, `fase`, i livelli `piano` / `unita` / `prospetto`, §4.5), «Rimanda», invii interrotti, i requisiti del flow, gli esiti dei collaudi e dei rilasci (§5) e lo smistamento del venerdì (§6). Sostituisce `AppFotoCantiereSpecifica202609101728Claude.md`, rinominato il 14/09 e da allora stabile. |
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
