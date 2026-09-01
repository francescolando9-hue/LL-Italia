# App LL Italia — Guida al flow di ricezione bolle (Power Automate)

> Costruisce il ricevente dell'app: raccolta SharePoint **BolleInArrivo** (passo 0) e flow Power Automate con trigger HTTP che valida, deduplica e salva le foto con i metadata. Contratto allineato all'app rev. 2 (`modules/bolle/invio.js`, README). Tempo stimato: 30–40 minuti. Interfaccia Power Automate in inglese (standard di gruppo).

## Prerequisiti

- Accesso al sito SharePoint del gruppo **Cantieri LL** con permessi di creazione raccolte.
- ⚠️ **Licenza Power Automate Premium per il proprietario del flow**: il trigger "When an HTTP request is received" è un trigger premium ([riferimento](https://manueltgomes.com/reference/power-automate-trigger-reference/when-an-http-request-is-received-trigger/), [Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/http-connectors/4-http-request)). **Da verificare nel tenant prima di iniziare**: se la licenza manca, fermarsi e decidere (acquisto per un utente di servizio, oppure Logic App su Azure).
- Una **chiave di accesso**: genera una stringa casuale di almeno 40 caratteri (generatore di password) e conservala — andrà nelle impostazioni dell'app. Nota: l'URL del trigger contiene già una propria firma (`sig=`); la chiave è un secondo livello di difesa.

**Regola d'oro per tutta la guida:** rinomina ogni azione **subito dopo averla aggiunta** con il nome indicato tra virgolette (menu ⋯ → *Rename*). Le espressioni da incollare fanno riferimento a quei nomi: con nomi diversi non funzionano.

## Passo 0 — Raccolta BolleInArrivo

1. Apri il sito **Cantieri LL** → ingranaggio → **Site contents** → **New** → **Document library**. Nome: `BolleInArrivo` (senza spazi). Descrizione: "Foto bolle di consegna in arrivo dall'app LL Italia".
2. Nella raccolta, **+ Add column** e crea queste 4 colonne (nomi esatti, senza spazi — il nome interno deve restare pulito per i filtri del flow):
   - `Commessa` — *Single line of text*
   - `Autore` — *Single line of text*
   - `DataInvio` — *Date and time*, con **Include time: Yes**
   - `IdClient` — *Single line of text*
3. Indicizza IdClient (serve alla deduplica quando la raccolta cresce): ingranaggio → **Library settings** → **More library settings** → **Indexed columns** → **Create a new index** → colonna `IdClient`.
4. Non creare cartelle: le crea il flow (`AAAA/AAAAMM`).

## Passo 1 — Flow e trigger

1. Vai su [make.powerautomate.com](https://make.powerautomate.com), ambiente predefinito → **My flows** → **+ New flow** → **Instant cloud flow** → nome `RicezioneBolleApp` → scegli **When an HTTP request is received** → Create.
2. Nel trigger: **Who can trigger the flow?** = **Anyone** (gli operatori non hanno account M365). **Method** (in *Advanced options*): **POST**. Non inserire lo schema JSON qui: il corpo arriva come testo (vincolo CORS, vedi nota in fondo) e lo interpretiamo al passo 2.

## Passo 2 — Lettura del corpo ("Dati")

Aggiungi l'azione **Parse JSON**, rinominala `Dati`:
- **Content** → *Expression*: `string(triggerBody())`
- **Schema** — incolla:

```json
{
  "type": "object",
  "properties": {
    "chiave": { "type": "string" },
    "id": { "type": "string" },
    "cantiere": { "type": "string" },
    "autore": { "type": "string" },
    "timestampDispositivo": { "type": "string" },
    "foto": {
      "type": "object",
      "properties": {
        "nome": { "type": "string" },
        "tipo": { "type": "string" },
        "base64": { "type": "string" }
      }
    }
  }
}
```

## Passo 3 — Controllo chiave

Aggiungi **Condition**, rinominala `ControlloChiave`:
- Riga: *Expression* `body('Dati')?['chiave']` — **is equal to** — la tua chiave (incollata come testo).
- Ramo **False**: azione **Response** rinominata `Risposta401` → Status Code `401`, Headers: `Access-Control-Allow-Origin` = `*`, Body: `{"errore":"chiave non valida"}`; poi azione **Terminate** → Status **Succeeded**.
- Ramo **True**: vuoto (il flow prosegue sotto la Condition).

## Passo 4 — Validazione dei dati

Aggiungi **Condition**, rinominala `ValidazioneDati`, con **AND** su queste righe (per ognuna: sinistra = *Expression*, operatore **is equal to**, destra = `true`):

```
not(empty(body('Dati')?['id']))
not(empty(body('Dati')?['cantiere']))
not(empty(body('Dati')?['autore']))
equals(body('Dati')?['foto']?['tipo'], 'image/jpeg')
greater(length(coalesce(body('Dati')?['foto']?['base64'], '')), 0)
less(length(coalesce(body('Dati')?['foto']?['base64'], '')), 8000000)
```

(L'ultimo limite ≈ 6 MB di file: le foto dell'app pesano 50–500 KB, il tetto blocca upload anomali.)
- Ramo **False**: **Response** `Risposta400` → Status `400`, Header `Access-Control-Allow-Origin` = `*`, Body `{"errore":"dati non validi"}` + **Terminate** (Succeeded).

## Passo 5 — Deduplica su id client

1. Azione SharePoint **Get files (properties only)**, rinominata `CercaDuplicati`: **Site Address** = sito Cantieri LL (dal menu), **Library Name** = `BolleInArrivo`, in *Advanced options* **Filter Query**:
   `IdClient eq '@{body('Dati')?['id']}'` — e **Top Count** = `1`.
2. **Condition** rinominata `GiaRicevuta`: *Expression* `greater(length(outputs('CercaDuplicati')?['body/value']), 0)` **is equal to** `true`.
   - Ramo **True**: **Response** `RispostaDuplicato` → Status `200`, Headers `Access-Control-Allow-Origin` = `*` e `Content-Type` = `application/json`, Body:
     `{"id":"@{first(outputs('CercaDuplicati')?['body/value'])?['ID']}"}` + **Terminate** (Succeeded).
   
   Così un doppio invio dello stesso scatto (retry dell'app) riceve lo **stesso id** e non crea doppioni: è l'idempotenza prevista dalla specifica.

## Passo 6 — Cartelle, salvataggio, metadata

Le date vengono dal timestamp del dispositivo (formato `2026-09-01T16:41:07+02:00`), estratte per posizione — nessuna conversione di fuso.

1. **Compose** rinominata `Anno` → *Inputs*: `substring(body('Dati')?['timestampDispositivo'],0,4)`
2. **Compose** rinominata `AnnoMese` → `concat(substring(body('Dati')?['timestampDispositivo'],0,4),substring(body('Dati')?['timestampDispositivo'],5,2))`
3. **Compose** rinominata `TsCompatto` →
   `concat(substring(body('Dati')?['timestampDispositivo'],0,4),substring(body('Dati')?['timestampDispositivo'],5,2),substring(body('Dati')?['timestampDispositivo'],8,2),substring(body('Dati')?['timestampDispositivo'],11,2),substring(body('Dati')?['timestampDispositivo'],14,2),substring(body('Dati')?['timestampDispositivo'],17,2))`
4. Azione SharePoint **Create new folder** rinominata `CreaCartella`: **List or Library** = `BolleInArrivo`, **Folder Path**: `@{outputs('Anno')}/@{outputs('AnnoMese')}` — crea l'intero percorso mancante ([riferimento](https://manueltgomes.com/microsoft/create-new-folder-action/)). L'azione SharePoint *Create file* da sola **non** crea le cartelle ([riferimento](https://manueltgomes.com/microsoft/power-platform/powerautomate/power-automate-action-reference/sharepoint-create-file-action/)); se il passo successivo desse errori *NotFound* sporadici, inserire qui un **Delay** di 2 secondi.
5. Azione SharePoint **Create file** rinominata `CreaFile`:
   - **Folder Path**: `/BolleInArrivo/@{outputs('Anno')}/@{outputs('AnnoMese')}`
   - **File Name**: `Bolla@{body('Dati')?['cantiere']}@{outputs('TsCompatto')}@{replace(body('Dati')?['autore'],' ','')}@{substring(body('Dati')?['id'],0,4)}.jpg`
   - **File Content** → *Expression*: `base64ToBinary(body('Dati')?['foto']?['base64'])`
6. Azione SharePoint **Update file properties** rinominata `AggiornaMetadata`: **Library Name** = `BolleInArrivo`, **Id** = *ItemId* (dynamic content di `CreaFile`), poi `Commessa` = *cantiere*, `Autore` = *autore*, `DataInvio` = *timestampDispositivo*, `IdClient` = *id* (dynamic content di `Dati`).

## Passo 7 — Risposta all'app

Azione **Response** rinominata `Risposta200`:
- Status Code `200`
- Headers: `Access-Control-Allow-Origin` = `*` e `Content-Type` = `application/json`
- Body: `{"id":"@{outputs('CreaFile')?['body/ItemId']}"}`

**Salva il flow.** Riapri il trigger: ora mostra **HTTP POST URL** — copialo per intero (contiene la firma `sig=`).

## Passo 8 — Configurazione dell'app

Su **ogni dispositivo**: apri l'app → modulo Bolle → *Impostazioni del modulo Bolle* → incolla **Endpoint** (l'HTTP POST URL) e **Chiave**, spegni **Modalità mock**, Salva.

## Passo 9 — Collaudo sui numeri (mai sull'esito formale)

1. Invia 3 foto di prova (di cui 1 in modalità aereo, poi riattiva la rete).
2. Confronta: contatore app (scattate/inviate) **=** file nella raccolta `BolleInArrivo/AAAA/AAAAMM` **=** metadata compilati (Commessa, Autore, DataInvio, IdClient). Ogni scarto è un difetto da spiegare.
3. **Test idempotenza**: in Power Automate → run history del flow → apri un run riuscito → **Resubmit** → verifica che NON compaia un secondo file e che la risposta porti lo stesso id.
4. **Verifica CORS**: se le foto **atterrano** nella raccolta ma l'app resta su **Errore**, il gestore non sta facendo passare l'header `Access-Control-Allow-Origin` della Response: fermarsi e segnalare — serve il piano B (proxy davanti al flow, es. Azure Function o API Management; decisione da prendere insieme).

## Perché il contratto è fatto così (nota CORS)

Il trigger HTTP di Power Automate **non gestisce il preflight CORS** dei browser ([riferimento](https://manueltgomes.com/reference/power-automate-trigger-reference/when-an-http-request-is-received-trigger/)): una POST con `Content-Type: application/json` o header custom verrebbe bloccata dal browser prima di partire. L'app invia quindi una **richiesta semplice** (`Content-Type: text/plain`, chiave nel corpo), che parte senza preflight; per permettere al browser di **leggere la risposta** (e quindi confermare l'invio), ogni azione Response del flow include l'header `Access-Control-Allow-Origin: *`.

## ⚠️ Punti da confermare (Francesco)

| # | Punto | Stato |
|---|---|---|
| 1 | **Licenza Premium** disponibile nel tenant per il proprietario del flow (trigger HTTP = premium) | da verificare prima di iniziare |
| 2 | **Pass-through dell'header CORS** nella Response del flow: verificabile solo al collaudo (passo 9.4) | da verificare al collaudo |
| 3 | Nome file: `[n]` della specifica interpretato come **prime 4 cifre dell'id client** (anticollisione) | [PROVVISORIO] da ratificare |
| 4 | `DataInvio` = **timestamp del dispositivo** (scatto/invio dall'app), non l'ora di arrivo sul server | da ratificare |
| 5 | Cartelle `AAAA/AAAAMM` calcolate sulla **data del dispositivo** | da ratificare |
| 6 | Elenco autori libero o vincolato (punto aperto della specifica) | rinviato |
