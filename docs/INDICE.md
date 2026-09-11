# Indice dei documenti — App LL Italia

> **Nome stabile, senza data: questo file non cambia mai nome.** Esiste perché gli altri documenti, per la convenzione di gruppo, portano il suffisso `AAAAMMGGHHMM` e cambiano nome a ogni revisione — e chi li legge da fuori (Cowork, che raggiunge il repo via GitHub Pages) perde l'indirizzo a ogni giro. Qui ci sono i nomi **completi** dei documenti correnti: si parte da questa pagina e si arriva al file giusto.
>
> **È un puntatore, non una copia.** Non riassume e non duplica il contenuto dei documenti: se lo facesse diventerebbe una versione parallela destinata a divergere, che è esattamente il problema che deve risolvere. Una riga per documento, per sapere quale aprire.
>
> **Va aggiornato ogni volta che un documento di `docs/` cambia nome**, cioè a ogni revisione che applica la convenzione data-ora. Un indice che punta a un file che non esiste più è peggio di nessun indice: manda un `404` a chi si fidava.

Indirizzo da cui leggerli: `https://francescolando9-hue.github.io/LL-Italia/docs/<nome del file>` — oppure direttamente nel repo, cartella `docs/`.

## Modulo Bolle

| Documento | Cosa contiene |
|---|---|
| `AppBolleSpecificaFunzionale202609011935Claude.md` | **Specifica funzionale, rev. 2 — prevale su tutto** per il modulo Bolle: contratto di invio (token nel corpo, `dataInvio`, `202 Accepted` senza corpo, `api-version=2024-10-01`), campi `progressivo` e `idDispositivo`. |
| `AppBolleFlowRicezione202609031937Claude.md` | Rev. 7. Il flow `BolleInArrivoRicevitore` e la raccolta `BolleInArrivo`: struttura delle azioni, colonne, procedure di modifica, esiti dei collaudi. Vale come **modello per gli altri flow** del gruppo. |
| `AppBolleContinuitaRunbook202609031100Claude.md` | Rev. 8. Documento unico e **autosufficiente** per il lavoro a valle, dalla raccolta in poi: controllo di continuità, buchi nella sequenza, eccezioni. È quello da caricare in Cowork per riprendere il tratto magazzino. |
| `AppBolleLeggibilita202609031500Claude.md` | Metodo e taratura del controllo di leggibilità delle foto: perché avvisa senza bloccare, e su quali misure sono state fissate le soglie. |

## Modulo Foto cantiere

| Documento | Cosa contiene |
|---|---|
| `AppFotoCantiereSpecifica202609101728Claude.md` | Rev. 3. Specifica del modulo: categorie, video, contratto di invio (`dataScatto`, campi numerici, `idDispositivo` e `progressivo`), stato del caricamento a blocchi, requisiti del flow, punti aperti. |
| `FotoCantiereBriefingRicevente.md` | Stato **reale** di raccolta e flow, misurato sul tenant nel collaudo del 10/09/2026. **Dove diverge dalla specifica qui sopra, fa fede questo:** contiene ciò che è stato misurato, non ciò che era previsto. Nome stabile per la stessa ragione di questo indice. |

## Fuori da `docs/`

| File | Cosa contiene |
|---|---|
| `README.md` (radice) | Cosa fa l'app oggi, come si prova da telefono, struttura del repo, decisioni di prodotto. |
| `CLAUDE.md` (radice) | Regole di lavoro sul repo: architettura shell + moduli, stack vincolato, principi non negoziabili, gerarchia delle fonti di verità. |
