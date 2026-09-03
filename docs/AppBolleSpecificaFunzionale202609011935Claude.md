# App LL Italia — Specifica funzionale upload bolle (rev. 2, capture-only)

> **Revisione 2 del 01/09/2026 ore 19:35** — allinea la specifica al **flow di ricezione realmente costruito e collaudato**, che prevale: il token viaggia **nel corpo** (non nell'header) e i campi si chiamano `token`, `commessa`, `operatore`, `idClient`, `dataInvio`, `nomeFile`, `contenutoBase64`; la risposta è **202 Accepted senza corpo**; l'URL richiede `api-version=2024-10-01`. Discrepanza rispetto alla rev. 1 ratificata da Francesco il 01/09/2026. La rev. 1 resta nella storia del repo (commit precedenti). **Aggiornata il 03/09/2026** con i campi `progressivo` e `idDispositivo` (paragrafo dedicato).

> Bozza per lo sviluppo con **Claude Code** (repo GitHub dedicato). Decisione e alternative scartate: `RelazioneDecisioneAppLLItaliaTrasportoBolle….md` in `L:\123\Claude\Relazioni\`. Perimetro: **solo raccolta e invio**; nessun riconoscimento bolle in-app.

## Utenti e piattaforma
- Utenti: chi ritira/scarica materiale in cantiere (squadre in appalto, Paolo, Francesco). Nessun account M365 richiesto.
- Piattaforma: **PWA vanilla JS** su GitHub Pages (stack del repo `archiviowhatsapp`: Service Worker, IndexedDB), installabile con "Aggiungi a schermata Home", funzionante su Android e iOS/Safari.

## Schermate
1. **Home / Carica bolle**: picker **Cantiere** (obbligatorio, lista configurabile — al lancio: MAR; poi le altre commesse), pulsante fotocamera/galleria multi-foto, anteprime con rimozione, pulsante **Invia**.
2. **Coda invii**: elenco invii con stato In coda / Inviato / Fallito (ritenta automaticamente alla connessione; retry manuale). Contatore del giorno: foto scattate / inviate — è il numero per il collaudo.
3. **Bolle inviate** (aggiunta il 01/09/2026): **calendario del mese** con i giorni che hanno bolle e il relativo conteggio, selezione del singolo giorno o del mese intero, elenco raggruppato per giorno e **apertura della bolla a schermo intero**; filtro per cantiere e totale con dettaglio per commessa. Registro locale del dispositivo: dati dell'invio più una **miniatura a 800 px** (~70 KB) conservata per le ultime 300 bolle, che sopravvive alla potatura degli originali (ultime N, default 20). Oltre le 300 la riga resta senza immagine. Non è la vista condivisa della raccolta e non segue il cambio di dispositivo — se servirà, va aggiunto un endpoint di lettura.
4. **Rilevamento della foto identica** (aggiunto il 01/09/2026): all'aggiunta si calcola l'impronta SHA-256 del **file originale**; se coincide con una foto già in coda o già inviata, l'app avvisa indicando quando e su quale commessa, e chiede conferma — avvisa, non blocca. Copre il caso dello stesso file scelto due volte dalla galleria; **non** copre due scatti distinti della stessa bolla, che restano due invii legittimi (servirebbe l'OCR, fuori perimetro).
4. **Impostazioni** (prima apertura): nome e cognome operatore, memorizzato sul dispositivo e allegato a ogni invio; più il riquadro **Questo dispositivo**, che mostra l'`idDispositivo` in sola lettura con pulsante per copiarlo, così l'operatore può dirlo a voce per un riscontro dall'ufficio. **Campo libero** (deciso il 01/09/2026): nessun elenco vincolato di operatori — da rivedere se in raccolta comparissero grafie diverse della stessa persona.

## Pipeline di invio
- Compressione client-side: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità della bolla per l'OCR del runbook prevale sul peso); HEIC gestito via canvas.
- Coda offline in IndexedDB; invio al ripristino della rete; nessuna perdita se l'app viene chiusa.
- **Contratto in vigore (rev. 2):** POST JSON all'endpoint, **un file per richiesta**, token statico **nel corpo**:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",            // solo il codice: MAR | SNZ2.2 | MNG
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",     // GUID della bolla, per la deduplica
  "idDispositivo": "9b2c…",     // GUID dell'installazione (vedi sotto)
  "progressivo": 137,           // intero: sequenza del dispositivo (vedi sotto)
  "dataInvio": "2026-09-01T17:27:53+02:00",
  "nomeFile": "…",              // IGNORATO dal backend: il nome lo compone il flow
  "contenutoBase64": "…" }
```

- `api-version=2024-10-01` è obbligatoria: l'URL mostrato dal designer di Power Automate riporta `api-version=1` e viene rifiutato con 400. L'app corregge il parametro da sola, lasciando intatta la firma `sig=`.
- L'URL contiene una firma di accesso: non entra mai nel repo pubblico (impostazioni sul dispositivo, oppure `core/configurazione.js` escluso da git in sviluppo locale).
- Il base64 dentro JSON regge senza problemi file da 155 KB: collaudato.

## Progressivo e identità del dispositivo (aggiunti il 03/09/2026)
Due campi obbligatori nel payload: `progressivo` (intero) e `idDispositivo` (stringa GUID). Servono a **rendere misurabile il tratto telefono → raccolta**, che prima non era verificabile in alcun modo: raggruppando le bolle per dispositivo, un numero mancante nella sequenza significa una foto scattata e mai arrivata.

- **Dove vive:** contatore in IndexedDB (store `contatore`, DB versione 4), parte da 1 alla prima installazione, non si azzera mai, sopravvive agli aggiornamenti dell'app.
- **Quando si assegna:** **all'accodamento**, cioè alla pressione di *Invia* — non allo scatto e non al tentativo di invio. Una foto scartata dalle anteprime non brucia un numero (altrimenti si aprirebbero buchi finti, indistinguibili da una bolla persa) e i retry riusano lo stesso numero, come `idClient`: il numero è dell'immagine, non della richiesta. Vale anche offline: assegnato prima di qualunque rete.
- **Chi è il titolare della sequenza:** `idDispositivo`, GUID generato alla prima apertura e salvato in IndexedDB accanto al contatore. Identifica **l'installazione**, non la persona: non cambia se l'operatore corregge il proprio nome, e due telefoni della stessa persona restano due sequenze distinte. Riparte solo con una reinstallazione, insieme al contatore, così la coppia resta coerente. Mostrato in *Impostazioni app → Questo dispositivo*, in sola lettura, con pulsante per copiarlo.
- **Come si legge:** si raggruppa per **`idDispositivo`**, mai per `operatore` — che è testo libero: una grafia diversa del nome spezzerebbe la sequenza, due telefoni della stessa persona ne fonderebbero due. Un telefono reinstallato riparte da 1 con un identificativo nuovo: evento atteso e riconoscibile.
- **A video:** accanto a ogni bolla in *Coda invii* e nello storico, così l'operatore può dirlo a voce; il numero raggiunto è in *Informazioni sull'app*.
- **Lato flow (in capo a Francesco):** servono in `BolleInArrivo` una colonna `Progressivo` (numero, 0 decimali) e una `IdDispositivo` (testo), entrambe mappate in *Update file properties*; senza, i campi arrivano ma non vengono conservati e il controllo non è possibile.

## Ricezione (flow Power Automate) — costruita e collaudata
- Validazioni: token, tipo file (jpeg), dimensione massima, campi obbligatori.
- Salvataggio in raccolta SharePoint **BolleInArrivo** (sito Cantieri LL); il **nome del file lo compone il flow** (il campo `nomeFile` inviato dall'app è ignorato).
- **Nome file (deciso il 01/09/2026):** `Bolla[Commessa][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg` — es. `BollaSNZ2.2202609011946FrancescoLando8f3a.jpg`. Niente secondi, come da nomenclatura di gruppo; le 4 cifre dell'`idClient` sostituiscono il progressivo `[n]` ed evitano che due bolle inviate nello stesso minuto si sovrascrivano (accaduto nel collaudo del 01/09: due invii alle 17:46:57 e 17:46:58). **Le cifre di data e ora vanno prese dal campo `dataInvio`**, non dall'orologio del flow: altrimenti il nome porta l'ora di arrivo invece di quella della consegna — divergenza rilevante per le foto accodate offline e inviate ore dopo.
- **Colonne `Progressivo` (numero) e `IdDispositivo` (testo):** da aggiungere in raccolta e mappare in *Update file properties* per conservare i campi omonimi del payload (vedi sopra).
- **Colonna `DataScatto`: di tipo testo** (deciso il 03/09/2026), non *Data e ora*: il flow vi scrive il campo `dataInvio` del payload, verbatim. I due nomi divergono — colonna `DataScatto`, campo `dataInvio` — ed è voluto: fa fede il nome della colonna. Toglie a SharePoint la possibilità di reinterpretare il valore, che arrivava indietro di 7 ore pur essendo corretti sia il fuso del sito sia quello del profilo personale.
- **Risposta: stato HTTP senza corpo** — `200` dalle tre azioni *Response* del flow (prima del 03/09 era il `202 Accepted` automatico). È lo stato a fare da conferma: solo alla sua ricezione la foto esce dalla coda dell'app, che accetta qualunque 2xx.
- **Deduplica su `idClient`: controllo inerte** (attivata il 01/09/2026, chiusa così il 03/09/2026). Prima del salvataggio il flow cerca in raccolta un file con lo stesso `IdClient` (*Get files (properties only)*, Filter Query su `IdClient`, Top Count 1), ma la Condition valuta sempre falso e il ramo del duplicato non viene mai eseguito; causa non determinata. **Non è un blocco:** il nome del file è deterministico, quindi un reinvio sovrascrive l'esistente e non genera doppioni in raccolta. Conseguenza: non contare i file per stimare i doppioni, l'omonimia li maschera.
- **Token:** sostituito il valore di collaudo con un token riservato il 01/09/2026. Vive nel flow e nelle impostazioni dei dispositivi, mai nel repo. Un token errato fa terminare il flow con stato Failed, visibile in cronologia.

## Cosa significa «Inviata» nell'app — risolto il 03/09/2026
Senza un'azione *Response* esplicita, Power Automate risponde **202 Accepted all'arrivo della richiesta**, prima di eseguire il flow: l'app registrava l'**accettazione**, non il **salvataggio**, e un token errato o un fallimento del salvataggio non retroagivano sullo stato mostrato.
**Risolto il 03/09/2026** aggiungendo tre azioni *Response* al flow — una per ogni via d'uscita (token errato 401, duplicato 200, salvataggio riuscito 200) — con l'header `Access-Control-Allow-Origin: *`, che soddisfa anche il preflight CORS del browser. Verificato dal telefono: con token errato l'app riceve `401` e la foto **non** risulta inviata, resta in coda e ritenta. Da quel momento «Inviata» equivale a «salvata».
Il collaudo resta comunque **sui numeri** — scattate nell'app contro file atterrati in raccolta — e la cronologia del flow è il luogo dove i fallimenti sono visibili. Procedura ed esiti: `docs/AppBolleFlowRicezione….md`.

## Sicurezza
- Il token nell'app pubblicata è un segreto debole: difese reali nel flow (validazioni, throttling, dimensioni). Rischio residuo accettato: upload spuri in ingresso; nessun dato in uscita dall'endpoint.

## Collaudo (sui numeri, mai sull'esito formale)
- Giornaliero in training: contatore app (scattate/inviate) vs file in raccolta vs foto lavorate dal runbook. Ogni scarto è un difetto da spiegare.
- **Continuità della sequenza:** per ogni `IdDispositivo` i `Progressivo` in raccolta devono essere consecutivi. Un buco è una bolla scattata e mai arrivata, e va spiegato uno per uno; una ripartenza da 1 è invece attesa dopo una reinstallazione.

## Fuori perimetro (rinviato)
OCR/riconoscimento in-app; login M365; notifiche push; altri moduli LL Italia (SAL squadre, presenze). L'architettura non li preclude.

## Integrazione col runbook
Al passaggio in produzione il runbook legge dalla raccolta BolleInArrivo (metadata inclusi: la Commessa arriva certa dalla fonte) invece che da `Bolle\` su `L:`; tutto il resto invariato.
