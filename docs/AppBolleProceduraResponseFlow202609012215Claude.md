# App LL Italia — Procedura: le tre Response nel flow bolle

> Rende la conferma dell'app una garanzia di salvataggio. Stato al 01/09/2026: il flow `BolleInArrivoRicevitore` non ha azioni Response, quindi Power Automate risponde **202 Accepted all'arrivo della richiesta**, prima di eseguire il flow — l'app registra l'accettazione, non il salvataggio. Verificato dal vivo: con token errato il flow scartava la foto e l'app mostrava «Inviata».

## Struttura finale

```
manual
├─ Condition token
│    ramo True (token errato) → Response 401 → Terminate Failed
├─ CercaDuplicati
├─ Condition duplicato
│    ramo True (già arrivata)  → Response 200 → Terminate Succeeded
├─ Create file
├─ Update file properties
└─ Response 200                ← l'unica raggiunta a file scritto
```

**Regola:** quando esiste una Response, **ogni** via d'uscita deve averne una. Un ramo che esce senza rispondere non restituisce nulla all'app, che segna Errore e riprova senza fine.

## L'azione

Sempre la stessa: **Response**, categoria *Request*. Tre campi:

| Campo | Valore |
|---|---|
| Status Code | `401` nel ramo del token, `200` negli altri due |
| Headers | chiave `Access-Control-Allow-Origin`, valore `*` |
| Body | vuoto — all'app basta il numero di stato |

L'header è obbligatorio: la Response sostituisce quella automatica che oggi fa passare il CORS. Senza, il file arriva in raccolta ma il browser non lascia leggere la risposta all'app.

## Le tre, con le accortezze

1. **Token errato — 401.** Nel ramo True della Condition del token, **sopra** la Terminate già presente: la Response deve precederla, altrimenti il flow si chiude senza rispondere. La Terminate resta su **Failed**, così i tentativi col token sbagliato restano rossi in cronologia.
2. **Bolla già arrivata — 200.** Nel ramo True della Condition del duplicato, prima della Terminate Succeeded. È un successo, non un errore: rispondere con un errore rimetterebbe in coda la stessa foto a ogni tentativo.
3. **Bolla salvata — 200.** Ultima azione del flow, sotto `Update file properties`, fuori da ogni ramo. Raggiunta solo a file scritto e proprietà aggiornate: è questa che rende vero il verde dell'app.

## Verifica

Una sola foto dal telefono, subito dopo il salvataggio del flow:

| Cosa si vede | Cosa significa |
|---|---|
| Foto in raccolta, app verde | Fatto: «Inviata» ora vale «salvata» |
| Foto in raccolta, app in Errore | Header CORS mancante o errato in una delle tre Response; la foto resta in coda, nessuna perdita |
| App in Errore, esecuzione verde ma nessun file | Un ramo esce senza Response |

Poi il duplicato: cronologia → esecuzione riuscita → **Resubmit** → deve restare un solo file, esecuzione verde.

Il criterio che decide resta il confronto **sui numeri**: scattate nell'app contro file atterrati in raccolta.

## Esiti del collaudo del 03/09/2026

- **Response**: le tre azioni funzionano. Con token errato l'app riceve `401` e la foto **non** risulta inviata: la conferma dell'app è diventata reale (prima, col 202 automatico, mostrava «Inviata» pur essendo scartata).
- **Nome file**: corretto — `BollaMAR202609030917FrancescoLandod5e1.jpg`, ora reale del dispositivo, senza secondi, con le 4 cifre dell'`idClient`.
- **Ora sfasata di 7 ore — risolto cambiando tipo di colonna.** Il flow invia il valore corretto (input di `Update file properties`: `2026-09-03T09:17:25+02:00`) ma SharePoint archivia `00:17:25Z`. Escluse per verifica diretta entrambe le cause plausibili: il **fuso del sito** (*Impostazioni internazionali*) e il **fuso del profilo personale** erano già su `(UTC+01:00) … Roma`. La conversione avviene comunque dentro SharePoint.
  **Decisione (03/09/2026):** invece di continuare a cercarne la causa, si toglie a SharePoint la possibilità di interpretare il dato — la colonna `DataInvio` passa da *Data e ora* a **Riga di testo singola** e il flow vi scrive `triggerBody()?['dataInvio']` verbatim. Immune a fusi di account, ambiente e connessione. Si perde il filtro per data nelle viste SharePoint (non usato: il calendario è nell'app, il runbook legge il valore programmaticamente); l'ordinamento cronologico regge perché in ISO 8601 l'ordine alfabetico coincide con quello temporale.
- **Deduplica non scattata**: al Resubmit il flow è passato dal ramo False e ha rieseguito `Create file`. Il file unico in raccolta **non** era merito della deduplica: essendo il nome identico (stesso `dataInvio`, stesso `idClient`), SharePoint ha sovrascritto l'esistente. Causa attesa: il confronto `empty(...)` **is equal to** `false` non combacia, perché `false` digitato a mano è testo e non il booleano. **Correzione:** confronto numerico — sinistra `length(outputs('CercaDuplicati')?['body/value'])`, operatore **is greater than**, destra `0`.
- **Verifica corretta della deduplica:** non contare i file (l'omonimia li sovrascrive e maschera il difetto), ma guardare il run: `Create file` deve risultare **skipped** e `Response 1` con `Terminate 1` verdi.
- **`Response` skipped su Resubmit**: comportamento normale, non un difetto — il chiamante HTTP originale non esiste più.
