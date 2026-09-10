# App LL Italia — Flow di ricezione bolle: struttura, procedure, collaudi

> **Rev. 6 del 10/09/2026 ore 17:35.** Riferimento corrente per il flow `BolleInArrivoRicevitore` (Power Automate) e per la raccolta `BolleInArrivo` (sito Cantieri LL). Sostituisce la guida di costruzione del 01/09, che documentava un contratto poi superato. Interfaccia Power Automate in inglese (standard di gruppo). Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.

## 1. Struttura del flow

```
manual (trigger HTTP, POST, "Anyone")
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

## 2. La raccolta `BolleInArrivo`

- **Cartelle** `AAAA/AAAAMM`, calcolate sul campo `dataInvio` del payload — **non** sull'orologio del flow: per una foto accodata offline e inviata ore dopo la differenza è reale.
- **Nome file:** `Bolla[Commessa][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg` — es. `BollaMAR202609030917FrancescoLandod5e1.jpg`. Niente secondi (nomenclatura di gruppo); le 4 cifre dell'`idClient` evitano che due bolle inviate nello stesso minuto si sovrascrivano (accaduto nel collaudo del 01/09: due invii alle 17:46:57 e 17:46:58). Le cifre di data e ora vanno prese da `dataInvio`, per lo stesso motivo delle cartelle.
- **Colonne**, tutte compilate da *Update file properties*:

| Colonna | Tipo | Origine nel payload |
|---|---|---|
| `Commessa` | Riga di testo singola | `commessa` |
| `Operatore` | Riga di testo singola | `operatore` |
| `DataScatto` | **Riga di testo singola** (v. §5) | `dataInvio`, verbatim |
| `IdClient` | Riga di testo singola, **indicizzata** | `idClient` |
| `IdDispositivo` | Riga di testo singola | `idDispositivo` (v. §4) |
| `Progressivo` | Numero, 0 decimali | `progressivo` (v. §4) |
| `IdBolla` | Riga di testo singola | `idBolla` (v. §6) |
| `Pagina` | Numero, 0 decimali | `pagina` (v. §6) |
| `Pagine` | Numero, 0 decimali | `pagine` (v. §6) |
| `VersioneApp` | Riga di testo singola — **facoltativa** | `versioneApp` |

`VersioneApp` è l'unica colonna facoltativa: porta la versione dell'app che ha mandato la bolla (es. `0.15.0`) e serve alla diagnosi — una bolla senza `Progressivo` viene da una versione precedente, non è un difetto — e a vedere quali telefoni sono rimasti indietro con l'aggiornamento. Se non la si crea, il campo arriva e viene ignorato: nessun effetto sul flow. Mappatura: `triggerBody()?['versioneApp']`.

**Nome file e pagine.** Il nome lo compone il flow, e con le bolle su più pagine due pagine della stessa bolla — stesso minuto, stesso operatore, stessa commessa — si distinguono solo per le 4 cifre dell'`idClient`: non si sovrascrivono, ma non si leggono come pagine 1, 2, 3. **Raccomandazione:** aggiungere al nome, quando `pagine` è maggiore di 1, un suffisso `Pag[N]di[M]` — es. `BollaMAR202609101508PaoloSanzarelloPag2di3.jpg`. Non è obbligatorio, perché la regola resta leggere le colonne e non il nome, ma rende la raccolta consultabile a occhio.

**Attenzione al nome della colonna della data:** in raccolta si chiama `DataScatto`, il campo nel payload si chiama `dataInvio`. Sono la stessa cosa — l'istante dello scatto sul telefono — e la mappatura è `triggerBody()?['dataInvio']` sulla colonna `DataScatto`. Divergenza segnalata da Cowork il 03/09/2026 e allineata qui: **fa fede il nome della colonna**.

## 3. Le tre Response

Rendono la conferma dell'app una garanzia di salvataggio. Senza azioni *Response* esplicite, Power Automate risponde **202 Accepted all'arrivo della richiesta**, prima di eseguire il flow: l'app registrava l'accettazione, non il salvataggio — verificato dal vivo il 01/09, con token errato il flow scartava la foto e l'app mostrava «Inviata».

L'azione è sempre la stessa: **Response**, categoria *Request*. Tre campi:

| Campo | Valore |
|---|---|
| Status Code | `401` nel ramo del token, `200` negli altri due |
| Headers | chiave `Access-Control-Allow-Origin`, valore `*` |
| Body | vuoto — all'app basta il numero di stato |

L'header è obbligatorio: la Response sostituisce quella automatica che faceva passare il CORS. Senza, il file arriva in raccolta ma il browser non lascia leggere la risposta all'app, che segna Errore e ritenta all'infinito.

Le tre, con le accortezze:

1. **Token errato — 401.** Nel ramo True della Condition del token, **sopra** la Terminate già presente: la Response deve precederla, altrimenti il flow si chiude senza rispondere. La Terminate resta su **Failed**, così i tentativi col token sbagliato restano rossi in cronologia.
2. **Bolla già arrivata — 200.** Nel ramo True della Condition del duplicato, prima della Terminate Succeeded. È un successo, non un errore: rispondere con un errore rimetterebbe in coda la stessa foto a ogni tentativo.
3. **Bolla salvata — 200.** Ultima azione del flow, sotto `Update file properties`, fuori da ogni ramo. Raggiunta solo a file scritto e proprietà aggiornate: è questa che rende vero il verde dell'app.

## 4. `Progressivo` e `IdDispositivo` (aggiunti il 03/09/2026)

L'app manda un intero che ogni telefono incrementa di 1 a ogni bolla accodata (dal n. 1 della prima installazione), più il GUID dell'installazione che ne è il titolare. Servono al controllo di continuità: raggruppando le bolle per dispositivo e leggendo la sequenza, **un numero mancante è una foto scattata e mai arrivata in raccolta**. Finché le colonne non esistono, i campi arrivano nel corpo della richiesta e vengono buttati.

### Il progressivo

**La colonna** — raccolta → *Aggiungi colonna*:

| Campo | Valore |
|---|---|
| Tipo | **Numero** |
| Nome | `Progressivo` |
| Numero di decimali | `0` |
| Valore predefinito | *lasciare vuoto* |
| Obbligatoria | No |

Vuota, non zero: una bolla senza numero è una bolla arrivata da una versione precedente dell'app, e va distinta da una che porta il numero 0 — che non esiste, la sequenza parte da 1.

**La mappatura** — azione *Update file properties* → campo `Progressivo`:

```
triggerBody()?['progressivo']
```

Nient'altro: nessuna conversione, nessun `int()`. L'app manda già un intero JSON.

### L'identità del dispositivo

Il progressivo da solo non basta: è una sequenza **per dispositivo**, ma nella catena non c'era nulla che identificasse il dispositivo. Raggrupparla per `Operatore` — campo di testo libero — la spezza a ogni grafia diversa del nome e ne fonde due se la stessa persona usa due telefoni: il controllo di continuità diventa inaffidabile proprio dove serve.

L'app genera quindi alla prima apertura un **GUID di installazione**, salvato in IndexedDB accanto al contatore, e lo manda in ogni invio come `idDispositivo`. Non cambia se l'operatore corregge il proprio nome; riparte solo con una reinstallazione, e in quel caso riparte anche il contatore da 1, così la coppia resta coerente. L'operatore lo legge in *Impostazioni app → Questo dispositivo*, in sola lettura, con un pulsante per copiarlo.

| Campo | Valore |
|---|---|
| Tipo | **Riga di testo singola** |
| Nome | `IdDispositivo` |
| Mappatura | `triggerBody()?['idDispositivo']` in *Update file properties* |

### Come leggerli, a valle

**Si raggruppa per `IdDispositivo`, non per `Operatore`**, e dentro ogni gruppo si legge la sequenza dei `Progressivo`. Un telefono reinstallato riparte da 1 con un `IdDispositivo` nuovo: evento atteso, e riconoscibile proprio perché l'identificativo cambia. Il numero si assegna all'accodamento, non cambia tra un retry e l'altro, e una foto scartata dalle anteprime non ne consuma uno: **non esistono buchi legittimi**.

## 5. Esiti dei collaudi del 03/09/2026

- **Response**: le tre azioni funzionano. Con token errato l'app riceve `401` e la foto **non** risulta inviata. La conferma dell'app è diventata reale.
- **Nome file**: corretto — `BollaMAR202609030917FrancescoLandod5e1.jpg`, ora reale del dispositivo, senza secondi, con le 4 cifre dell'`idClient`.
- **Ora sfasata di 7 ore — risolto cambiando tipo di colonna.** Il flow inviava il valore corretto (input di `Update file properties`: `2026-09-03T09:17:25+02:00`) ma SharePoint archiviava `00:17:25Z`. Escluse per verifica diretta entrambe le cause plausibili: il **fuso del sito** (*Impostazioni internazionali*) e il **fuso del profilo personale** erano già su `(UTC+01:00) … Roma`. La conversione avveniva comunque dentro SharePoint.
  **Decisione:** invece di cercarne ancora la causa, si toglie a SharePoint la possibilità di interpretare il dato — la colonna della data (`DataScatto`) è di tipo **Riga di testo singola** e non *Data e ora* e il flow vi scrive `triggerBody()?['dataInvio']` verbatim. Immune a fusi di account, ambiente e connessione. Si perde il filtro per data nelle viste SharePoint (non usato: il calendario è nell'app, il runbook legge il valore programmaticamente); l'ordinamento cronologico regge perché in ISO 8601 l'ordine alfabetico coincide con quello temporale.
- **Deduplica: controllo inerte, lasciato in essere.** Al Resubmit il flow passava dal ramo False e rieseguiva `Create file`. Il file unico in raccolta non era merito della deduplica: essendo il nome identico (stesso `dataInvio`, stesso `idClient`), SharePoint sovrascriveva l'esistente. Corretto il confronto da `empty(...)` **is equal to** `false` (dove `false` digitato a mano è testo, non booleano) a confronto numerico — sinistra `length(outputs('CercaDuplicati')?['body/value'])`, operatore **is greater than**, destra `0` — la Condition continua a valutare falso e la causa non è stata determinata. **Non è un blocco:** il nome del file è deterministico, quindi un reinvio sovrascrive e non genera doppioni. Il controllo serviva solo a evitare l'upload inutile e le versioni sul file. Da riprendere solo se in raccolta comparissero doppioni reali.
- **Verifica corretta della deduplica:** non contare i file (l'omonimia li sovrascrive e maschera il difetto), ma guardare il run: `Create file` deve risultare **skipped** e la Response del duplicato con la sua Terminate verdi.
- **`Response` skipped su Resubmit**: comportamento normale, non un difetto — il chiamante HTTP originale non esiste più.

## 6. Verifica, sui numeri

Il criterio che decide è sempre il confronto **scattate nell'app contro file atterrati in raccolta**, mai l'esito formale del run.

**Dopo una modifica alle Response** — una sola foto dal telefono:

| Cosa si vede | Cosa significa |
|---|---|
| Foto in raccolta, app verde | Fatto: «Inviata» vale «salvata» |
| Foto in raccolta, app in Errore | Header CORS mancante o errato in una delle tre Response; la foto resta in coda, nessuna perdita |
| App in Errore, esecuzione verde ma nessun file | Un ramo esce senza Response |
| App in Errore con **502** | Il flow è **terminato senza eseguire nessuna Response**: un'azione prima della Response è fallita, oppure il ramo percorso non ne ha una. Il run è **rosso** in cronologia e la prima azione rossa dice la causa |
| App in Errore con **504** | Il flow non ha risposto in tempo |

**Il 502 non è un problema di rete né dell'app.** Se l'app riceve un numero di stato, la risposta è arrivata ed è stata letta: CORS e firma funzionano. Un 502 significa che la richiesta è entrata nel flow e il flow è finito senza rispondere — quindi **la foto non è stata salvata**, resta in coda sul telefono in stato Errore e riparte da sola quando il flow torna a funzionare. Dove guardare, in ordine: Power Automate → il flow → **cronologia** → l'ultimo run rosso → **la prima azione rossa**. Le cause più frequenti sono in `Update file properties`: una colonna mappata che in raccolta non esiste, o il cui nome interno è diverso da quello mostrato.

**Dopo l'aggiunta del progressivo** — tre foto di fila dallo stesso telefono, senza scartarne nessuna dalle anteprime:

| Cosa si vede | Cosa significa |
|---|---|
| Tre numeri consecutivi (es. 12, 13, 14), stesso `IdDispositivo` | Fatto |
| Colonna `Progressivo` o `IdDispositivo` vuota su tutte | Mappatura assente in *Update file properties* |
| Numeri non consecutivi a parità di `IdDispositivo` | **Una bolla non è arrivata**: è il difetto che i campi servono a scoprire — da spiegare, non da ignorare |

Il numero mostrato dall'app accanto a ogni bolla (in *Coda invii* e nello storico) è lo stesso che arriva in raccolta: l'operatore può leggerlo a voce per un riscontro immediato dall'ufficio.

## 6. Bolla su più pagine (aggiunto il 10/09/2026)

Una bolla di consegna può essere su più fogli. L'operatore, quando ha in attesa almeno due foto, accende l'interruttore **«Sono le pagine di una sola bolla»**: le foto partono numerate nell'ordine di scatto.

**Il contratto non cambia: resta un file per richiesta.** Una bolla di tre pagine sono tre invii, ognuno col suo `idClient` e col suo `progressivo`. Li lega:

| Campo | Colonna | Tipo | Contenuto |
|---|---|---|---|
| `idBolla` | `IdBolla` | Riga di testo singola | GUID **uguale per tutte le pagine** della stessa bolla |
| `pagina` | `Pagina` | Numero, 0 decimali | da 1 in avanti, nell'ordine di scatto |
| `pagine` | `Pagine` | Numero, 0 decimali | quante pagine compongono la bolla |

Mappature in *Update file properties*: `triggerBody()?['idBolla']`, `triggerBody()?['pagina']`, `triggerBody()?['pagine']`.

**Come si legge a valle:** si raggruppa per `IdBolla` e si ordina per `Pagina`; il gruppo è completo quando le righe sono tante quante dice `Pagine`. Anche una bolla di una pagina sola ha il suo `IdBolla`, con `Pagina` 1 e `Pagine` 1: **la regola è una sola, senza casi particolari da ricordare.**

**Il controllo di continuità non cambia.** Il progressivo resta per pagina: una pagina scattata e mai arrivata è un buco nella sequenza come qualunque altra foto. Attenzione a non confondere i due conteggi — **il collaudo si fa in pagine, non in bolle**: tre pagine di una bolla sono tre righe in raccolta e tre progressivi consumati.

**Un gruppo incompleto è un difetto da spiegare:** `Pagine` = 3 con due sole righe presenti significa che una pagina non è arrivata, e il buco corrispondente si trova nella sequenza dei progressivi di quel dispositivo.

**Verifica, sui numeri:** una bolla di tre pagine dal telefono → in raccolta tre righe con lo **stesso** `IdBolla`, `Pagina` 1, 2, 3, `Pagine` 3 su tutte, e tre progressivi consecutivi. Colonne vuote su tutte = mappature assenti. `IdBolla` diverso su ogni riga = l'interruttore non era acceso, e le pagine sono state mandate come bolle separate.
