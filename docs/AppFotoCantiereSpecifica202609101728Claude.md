# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 3 dell'11/09/2026.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia **foto e video**, non legge nulla del contenuto. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> **Rev. 3 — riallineata al collaudo del ricevente** (`docs/FotoCantiereBriefingRicevente.md`, 10/09/2026 sera): raccolta e flow esistono e sono collaudati, `DataScatto` viaggia come 12 cifre, i campi numerici vogliono un numero vero, le foto portano `idDispositivo` e `progressivo`, il caricamento a blocchi resta fermo. **Dove questo documento e il briefing divergessero ancora, fa fede il briefing:** lì c'è ciò che è stato misurato sul tenant.
>
> ⚠️ **Due punti restano aperti e non li ho inventati:** la cartella di destinazione su `L:` dove il runbook del venerdì deposita le foto, per commessa (§6), e l'apertura della sessione di caricamento a blocchi, che il tenant oggi rifiuta (§4-bis).

## 1. A cosa serve

Chi è in cantiere fotografa e manda in ufficio. Due usi diversi, che finora viaggiavano insieme su WhatsApp e si distinguevano solo dal contesto della conversazione:

| Categoria | Codice | A cosa serve |
|---|---|---|
| Avanzamento lavori | `AVANZAMENTO` | Dire a che punto è una lavorazione. Si guarda, si commenta, non si archivia. |
| Da archiviare sul server | `ARCHIVIO` | Documentazione che deve finire nella cartella di commessa su `L:`. |

**La categoria si sceglie prima di scattare**, come il cantiere: non è un'etichetta messa dopo, perché decide **come l'immagine viene preparata** (§3).

## 2. Le schermate

Una sola schermata di lavoro, con la stessa impostazione di Bolle:

1. **Tipo di foto** (obbligatorio) — le due categorie sopra. Sotto, una riga che dice cosa comporta la scelta: *«Compressa per partire veloce anche con poca rete»* oppure *«Inviata a risoluzione originale: pesa di più e con poca rete parte più lentamente»*.
2. **Cantiere** (obbligatorio) — stessa anagrafica del modulo Bolle, che vive in `core/cantieri.js`: **un solo elenco per tutta l'app**, perché due elenchi separati potrebbero divergere e una commessa presente in un modulo e assente nell'altro è un dato sbagliato che arriva a destinazione senza far rumore.
3. **Scatta foto** — apre la **fotocamera dentro l'app** (`core/fotocamera.js`, la stessa del modulo Bolle): si scatta più volte di fila senza uscire, con rullino e contatore, poi *Fine*. Accanto restano **Usa la fotocamera del telefono** e **Scegli dalla galleria** (multi-foto). Anteprime rimovibili, ognuna con categoria e peso reale del file che partirà.
   Qui gli scatti di una sessione **non** vengono raggruppati: ogni foto è una foto. Il gesto però è identico a quello delle bolle, così chi usa l'app impara una sola cosa.
4. **Nota** (facoltativa, max 255 caratteri) — vale per tutte le foto di quell'invio. Si svuota dopo l'invio, perché la nota successiva è un'altra cosa.
5. **Invia** — resta disabilitato finché non c'è almeno una foto e un cantiere.
6. **Coda invii** con gli stati e i contatori del giorno, come in Bolle. Ogni riga porta il **numero progressivo** (`n. 47`), che si legge a voce quando l'ufficio segnala un buco nella sequenza. Gli stati usano le classi del design system della shell: quelle sbagliate — e per un giorno lo sono state — fanno uscire «Inviata» senza colore, cioè senza conferma visiva che la foto sia arrivata.

Nelle impostazioni del modulo c'è **Configura un altro telefono**: genera un QR che porta indirizzo e codice su un altro dispositivo senza digitare nulla. Il link è **solo di questo modulo** — le bolle hanno una destinazione propria e un link proprio. Serve prima di distribuire l'app agli operai: l'URL del trigger è lungo e firmato, e sulle bolle una copia manuale è già costata un'ora di diagnosi per una lettera cambiata nel nome di un parametro e un carattere perso dalla firma.

Se si cambia categoria quando ci sono già foto in attesa, l'app **avvisa** che quelle partono col tipo con cui sono state preparate, non con quello scelto adesso. Cambiare l'etichetta a posteriori sarebbe una bugia: il file è già stato compresso, o non lo è stato.

## 3. Preparazione delle immagini

| Categoria | Trattamento |
|---|---|
| `AVANZAMENTO` | JPEG, lato lungo 2500 px, qualità 0,85 — come le bolle. Leggera, parte anche con poca rete. |
| `ARCHIVIO` | **Risoluzione originale** (deciso il 10/09/2026). Se il file è già JPEG si spediscono **i byte originali, senza ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine senza alcun vantaggio. Se il telefono produce HEIC o PNG si converte in JPEG a piena risoluzione (qualità 0,95), perché il nome del file in raccolta è `.jpg` e byte HEIC dentro un `.jpg` sarebbero un file che non si apre. |

**Misure sul flow vero** (collaudo del ricevente, 10/09/2026 sera, telefono reale) — sostituiscono le stime di laboratorio:

| Caso | Peso del file | Corpo della richiesta |
|---|---|---|
| `AVANZAMENTO` (2500 px, q. 0,85) | 1,49 MB | ~2,0 MB |
| `ARCHIVIO` da fotocamera in-app | 3,76 MB | ~5,0 MB |
| `ARCHIVIO` da fotocamera nativa, byte originali | **4,39 MB** | **~5,9 MB** |

**L'ipotesi «foto d'archivio da 12 MB, corpo da 16 MB» non si è verificata**, e il codice conferma il perché: per l'archivio, se il file è già JPEG l'app spedisce i byte originali senza ricodificarli, e un telefono non produce JPEG da 12 MB. Quindi **per le foto il ramo in una richiesta basta**, con margine largo dentro la finestra di 120 secondi del trigger.

Il caricamento a blocchi serve ai **video**, che non si comprimono e arrivano al tetto dei 20 MB: 26,7 MB di corpo, circa 107 secondi a 2 Mbit/s. Se il flow rifiuta un corpo, l'app lo dice con un messaggio dedicato (`413` → «foto troppo grande per il flow») e **la foto resta in coda**, non si perde.

## 3-bis. Video (aggiunto il 10/09/2026)

Si può inviare anche un video, non solo foto.

- **Si registra con la fotocamera di sistema**, non dentro l'app: il pulsante è *Registra un video*. Registrare in-app significherebbe `MediaRecorder`, che produce formati diversi fra Android e iPhone e non usa l'encoder hardware del telefono. Il video di sistema è migliore, consuma meno batteria e si apre su qualunque PC dell'ufficio. Per le foto la fotocamera interna serve a non uscire fra uno scatto e l'altro; un video si registra uno per volta, quindi quel problema non c'è.
- **Il video non viene compresso.** Transcodificare in un browser non è realistico: parte come l'ha prodotto il telefono, **in qualunque categoria** — la distinzione compressa/originale vale solo per le foto.
- **Il peso è l'unico vero vincolo.** Nelle impostazioni del modulo c'è un **tetto in MB** (predefinito 20). Un file che lo supera **non entra in coda** e l'app lo dice subito — *«Un file da 373,4 MB supera il limite di 20 MB e non è stato aggiunto: registra un video più corto»* — invece di accodarlo e farlo ritentare a vuoto per sempre. Il valore giusto lo dice il collaudo sul flow vero.
- **Anteprima e durata** si ricavano da un fotogramma del filmato, mezzo secondo dentro. Se il browser non decodifica il formato, l'anteprima è un'icona e la durata resta 0: l'invio non dipende dalla riuscita di una miniatura.
- Foto e video **possono stare nello stesso invio**: il pulsante dice *Invia 1 foto e 1 video*.

## 4. Contratto di invio

POST JSON al **proprio** flow — diverso da quello delle bolle — un file per richiesta, `api-version=2024-10-01` obbligatoria (l'app corregge il parametro da sola, lasciando intatta la firma `sig=`).

```
{ "token": "…",
  "tipo": "AVANZAMENTO",              // oppure ARCHIVIO
  "commessa": "MAR",                  // solo il codice
  "operatore": "Paolo Sanzarello",
  "nota": "Getto solaio piano 3 completato",   // può essere vuota
  "genere": "foto",                   // oppure "video"
  "estensione": "jpg",                // jpg | mp4 | mov | webm | 3gp…
  "mimeType": "image/jpeg",
  "durataSecondi": 0,                 // NUMERO, non stringa. 0 per le foto
  "idClient": "f15f1935-…",           // GUID del file, per la deduplica
  "idDispositivo": "3f2a9c10-…",      // GUID dell'installazione, stabile
  "progressivo": 47,                  // NUMERO, sequenza per dispositivo
  "dataScatto": "2026-09-10T17:28:04+02:00",   // ora reale del telefono
  "versioneApp": "0.23.0",
  "nomeFile": "…",                    // IGNORATO dal backend: lo compone il flow
  "contenutoBase64": "…" }
```

**Attenzione, il campo si chiama `dataScatto`** — non `dataInvio` come nelle bolle. Nelle bolle il nome del campo e quello della colonna divergono per un incidente storico; qui nascono uguali. **Non dare per scontata la simmetria fra i due contratti.**

### 4.1 `dataScatto`: l'app manda ISO, in colonna vanno 12 cifre

L'app manda `dataScatto` in **ISO 8601 con fuso** (`2026-09-10T21:47:21+02:00`), e continua a farlo: è l'ora reale del telefono, con l'informazione di fuso, ed è il dato giusto da trasmettere.

**Quel valore però non va scritto verbatim in colonna.** La colonna è di tipo testo, come previsto, e **non basta**: il connettore SharePoint riconosce qualunque valore che *somigli* a una data e lo riscrive prima di consegnarlo. Misurato sul tenant il 10/09/2026: `2026-09-10T21:47:21+02:00` è atterrato come `09/10/2026 12:47:21` — **nove ore di scarto**, con un mese e un giorno invertiti per soprammercato.

Il rimedio, verificato, è **compattare nel flow a 12 cifre `AAAAMMGGHHMM`**, che non somigliano a una data e quindi nessuno reinterpreta. È lo stesso rimedio adottato sulle bolle il 03/09. Il riscontro si fa incrociando con la colonna `Created`, che SharePoint scrive senza passare dal connettore.

### 4.2 I campi numerici vogliono un numero, o un null vero

`progressivo` e `durataSecondi` sono **numeri JSON**, non stringhe: l'app li manda così, e dove il dato non c'è manda `null`, **mai** stringa vuota.

Il motivo è costato venti foto: mappati per interpolazione, quei campi arrivano al connettore come `""` quando l'app non li manda, la scrittura delle colonne falla con *«required to be of type Number/double»* e **il file atterra in raccolta senza colonne**. Il file c'è, il flow è verde, e il runbook non sa di chi sia quella foto. Lato flow la mappatura è stata corretta; lato app il contratto è questo.

### 4.3 `idDispositivo` e `progressivo`: a cosa servono

Senza una sequenza per dispositivo **non esiste un controllo di continuità**: non si può dimostrare che nessuna foto si è persa fra telefono e raccolta, si può solo sperarlo. È lo stesso meccanismo delle bolle, che ogni sera dice «zero buchi».

- `progressivo` è **per dispositivo e per modulo**: parte da 1 alla prima installazione, non si azzera mai, e si assegna **quando la foto entra in coda** con Invia — non allo scatto, altrimenti una bozza scartata lascerebbe un buco che si leggerebbe come «una foto non è arrivata». La sequenza delle foto è **indipendente** da quella delle bolle: le raccolte sono due e ognuna si controlla per conto suo. Non confrontarle.
- `idDispositivo` è l'identità dell'**installazione**, la stessa per tutti i moduli: vive nella shell (`core/dispositivo.js`) e i due moduli la leggono da lì. Un telefono che usava già le bolle **conserva l'identificativo che aveva** — se ne generasse uno nuovo, in raccolta apparirebbero due dispositivi dove ce n'è uno, e la sequenza delle bolle già inviate risulterebbe interrotta.
- **Il raggruppamento si fa su `IdDispositivo`, mai su `Operatore`**: l'operatore è testo libero, si spezza a ogni grafia diversa del nome e fonde due telefoni della stessa persona.
- Una reinstallazione riparte da 1 con un identificativo nuovo: il numero va sempre letto **insieme** a `idDispositivo`.

## 4-bis. Caricamento a blocchi — scritto nell'app, FERMO in attesa del presupposto

> **Stato all'11/09/2026: spento, e va lasciato spento.** Il codice nell'app c'è ed è collaudato in locale; quello che manca è il presupposto lato tenant. Non si riparte dal client: si riparte dalla prova descritta in fondo a questa sezione.

Il contratto qui sopra manda il file **dentro** il JSON, in base64: comodo, ma il base64 aggiunge un terzo al peso e un video da 60 MB diventa un corpo da 80 MB. Un corpo così il flow lo rifiuta, e su una rete di cantiere non arriva comunque: basta un buco di rete al 90% e si ricomincia da zero.

Per questo l'app sa anche fare il **caricamento a blocchi**, in tre passaggi verso lo stesso endpoint del flow, che smista sul campo `azione`. È **spento per default** (impostazione *Caricamento a blocchi per i file grandi*) e si accende solo quando il flow sa rispondere; sotto il primo limite in MB resta l'invio in una richiesta, perché due giri di rete in più su una foto da 500 KB sono solo tempo perso.

**Passo 1 — `azione: "preparaCaricamento"`.** POST con **tutti i metadati e senza il contenuto**, più `byte` (il peso esatto del file). Il flow apre una sessione di caricamento e risponde:

```
{ "urlCaricamento": "https://…", "dimensioneBlocco": 10485760 }
```

`urlCaricamento` è l'indirizzo dove mettere i byte: una **sessione di upload di Microsoft Graph** (`createUploadSession`), che accetta `PUT` a blocchi **senza autenticazione** — l'indirizzo contiene già il permesso, e vale poche ore. `dimensioneBlocco` è facoltativa: se manca, l'app usa 10 MB. In ogni caso l'app **arrotonda a multipli di 320 KiB**, come Graph richiede: un blocco di taglia diversa viene rifiutato a metà caricamento, e sarebbe un difetto che si scopre solo sui file grandi.

Se il flow risponde `{"modo":"inline"}`, oppure non risponde JSON, l'app **non perde il file**: lo lascia in coda in Errore con il messaggio *«Il flow non offre il caricamento a blocchi: spegni le due fasi o riduci il peso»*. Un flow non ancora pronto non deve far sparire un video.

**Passo 2 — i byte.** L'app manda i blocchi in `PUT` diretti a `urlCaricamento`, con l'header `Content-Range: bytes <da>-<a>/<totale>`. Attende `202` sui blocchi intermedi e `200`/`201` sull'ultimo. Se un blocco fallisce, al tentativo successivo l'app **interroga la sessione con un `GET`** e riprende da `nextExpectedRanges`: non si fida del proprio conteggio, perché l'ultimo blocco può essere partito e non arrivato. Se il server non riconosce più la sessione (scaduta, cancellata), si ricomincia dal passo 1. **Questo passo non passa dal flow**: nessun consumo di azioni, nessun limite di taglia del corpo.

**Passo 3 — `azione: "completaCaricamento"`.** POST con gli stessi metadati del passo 1. Serve perché i byte, da soli, arrivano **senza colonne**: il file c'è ma il runbook non sa di chi è. Se questo passo fallisce, l'app ritenta **solo questo**, non ricarica i byte.

Le tre impostazioni del modulo, tutte a video: l'interruttore, il *peso massimo col caricamento a blocchi* (predefinito 200 MB — qui il vincolo non è più la taglia della richiesta ma il tempo di caricamento in cantiere) e la *taglia dei blocchi* (predefinita 10 MB: più piccoli ripartono meglio dopo un buco di rete, più grandi sono un po' più veloci).

### Perché è fermo, e da dove si riparte

Prima del CORS c'è un gradino più basso: **la sessione di caricamento va creata, e oggi non si riesce.** Verificato dal browser autenticato la sera del 10/09/2026:

| Prova | Esito |
|---|---|
| `_api/v2.0/drives` sul sito | **200** — elenca i drive, `FotoCantiere` compreso: la superficie compatibile Graph esiste sul tenant ed è indirizzabile |
| `_api/v2.0/drives/{driveId}/root:/…:/createUploadSession` | **403 accessDenied** — in lettura passa, in scrittura no |

Non è una condanna: il connettore SharePoint di Power Automate autentica in un altro modo. Ma **il primo passo non è codice dell'app**, è un flow di prova da due azioni:

1. trigger HTTP;
2. **`Send an HTTP request to SharePoint`** — non l'azione HTTP generica — verso `createUploadSession`.

Se torna `200` con `uploadUrl` si sanno due cose insieme: la sessione si crea, **e** si crea senza registrazione su Entra, perché quell'azione riusa la connessione che il flow ha già. Solo allora ha senso provare il `PUT` **cross-origin** dall'origine dell'app (GitHub Pages), e solo dopo quello ha senso accendere l'interruttore su un dispositivo. Se torna `403`, serve la registrazione applicativa su Entra con `Sites.Selected` — che è già un punto aperto del progetto magazzino e sbloccherebbe anche l'identità propria del runbook.

Se il `PUT` cross-origin non fosse accettato, la strada resta la stessa e cambia solo il destinatario dei blocchi: un secondo flow con trigger HTTP che riceve un blocco per volta, più lento e con più azioni consumate.

⚠️ **Dettaglio d'integrazione, da non dimenticare quando si costruirà lo `Switch` su `azione`:** la validazione del payload oggi pretende `contenutoBase64` non vuoto, e i rami `preparaCaricamento` e `completaCaricamento` arrivano **senza contenuto**. La validazione va spostata **dentro il ramo predefinito**, altrimenti i due rami nuovi si prendono un `400` dalla porta accanto — un errore che si presenta come «il caricamento a blocchi non funziona» e sta invece tre azioni prima.

## 5. Cosa esiste lato server — costruito e collaudato il 10/09/2026

Flow e raccolta sono **nuovi e dedicati**, non quelli delle bolle: così una modifica al flow delle foto non può rompere la catena delle bolle, già in esercizio.

**Raccolta `FotoCantiere`** sul sito Cantieri LL, 12 colonne, versioni limitate a 3, tre viste ad ambito ricorsivo (`Ultime foto`, `Archivio da scaricare`, `Avanzamento`):

| Colonna | Tipo | Origine nel payload |
|---|---|---|
| `Tipo` | Riga di testo singola, **indicizzata** | `tipo` |
| `Commessa` | Riga di testo singola | `commessa` |
| `Operatore` | Riga di testo singola | `operatore` |
| `Nota` | Più righe di testo | `nota` |
| `DataScatto` | **Riga di testo singola** | `dataScatto`, **compattato a 12 cifre dal flow** — vedi §4.1 |
| `IdClient` | Riga di testo singola, **indicizzata** | `idClient` |
| `IdDispositivo` | Riga di testo singola | `idDispositivo` |
| `Progressivo` | Numero, 0 decimali | `progressivo` — vedi §4.2 |
| `VersioneApp` | Riga di testo singola | `versioneApp` |
| `Genere` | Riga di testo singola, **indicizzata** | `genere` |
| `DurataSecondi` | Numero, 0 decimali | `durataSecondi` — vedi §4.2 |
| `DataScarico` | — | scritta dal runbook del venerdì, non dall'app |

`DataScatto` di tipo **testo** e non *Data e ora*: è la stessa decisione presa per le bolle il 03/09. Da sola però non basta — il connettore riscrive comunque ciò che somiglia a una data, ed è per questo che il flow compatta a 12 cifre (§4.1).

**Flow `FotoCantiereRicevitore`**, ramo *invio in una richiesta* (nessuna `azione` nel payload): token → validazione del payload → guardia duplicati su `IdClient` → `Create file` (trasferimento a blocchi verso SharePoint) → `Update file properties` → Response. Cartelle `AAAA/AAAAMM` calcolate su `dataScatto`, **non** sull'orologio del flow.

**Sette Response**, tutte con `Access-Control-Allow-Origin: *` e `Content-Type: application/json`: `401` token, `400` payload incompleto, `200 gia_presente`, `200` ok, e tre `500` distinti su creazione file, scrittura colonne e lettura duplicati. **Nessuna via d'uscita muta:** un ramo che esce senza rispondere fa arrivare all'app un `502`, che significa esattamente «il flow è terminato senza rispondere».

**Collaudo sui numeri:** tre foto vere (una `AVANZAMENTO`, due `ARCHIVIO`), tre file in raccolta, tutte le colonne compilate, cartelle `2026/202609` create dal flow, ora di scatto coincidente con `Created`. Quadratura 3 su 3.

**Quando si aggiungerà il caricamento a blocchi** (§4-bis), lo stesso flow si articola su tre rami, uno `Switch` sul campo `azione` subito dopo il controllo del token:

| `azione` | Cosa fa il ramo | Response |
|---|---|---|
| *assente* | come oggi: `Create file` con `contenutoBase64` decodificato, poi `Update file properties` | `200` |
| `preparaCaricamento` | `HTTP` verso Graph, `POST …/createUploadSession` sul percorso del file da creare | `200` con `{"urlCaricamento": <uploadUrl della risposta>, "dimensioneBlocco": 10485760}` |
| `completaCaricamento` | ritrova il file appena caricato (per nome) e fa `Update file properties` con le colonne | `200` |

Il ramo `preparaCaricamento` **deve calcolare il nome del file e la cartella esattamente come fa il ramo di oggi**, altrimenti il passo 3 non ritrova il file da aggiornare. Conviene metterli in due variabili usate da entrambi i rami, non ripetere l'espressione.

Un flow che non ha questi rami non fa danni: risponde qualcosa che non è JSON, e l'app lascia il file in coda con un errore che si legge. Ma finché i rami non ci sono — e finché non è risolto il `403` sulla creazione della sessione, §4-bis — l'interruttore nelle impostazioni va lasciato **spento**.

Nome file suggerito, coerente con la nomenclatura di gruppo:
`Foto[Commessa][Tipo][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg` per le foto,
`Video[…].[estensione]` per i video.

Il campo `nomeFile` mandato dall'app è **ignorato**: il nome lo compone il flow, con prefisso da `genere` (`Foto…`/`Video…`) ed estensione da `estensione` (ripiego `jpg`). Così è stato costruito, e va bene: il flow è l'unico che sa dove sta mettendo il file.

⚠️ **L'estensione va presa dal campo `estensione` del payload, non fissata a `.jpg`.** Un video salvato come `.jpg` non si apre: è l'errore più facile da fare qui, e non dà nessun segnale — il file arriva, il flow è verde, e il problema si scopre in ufficio quando qualcuno prova ad aprirlo. Espressione: `triggerBody()?['estensione']`.

## 6. Il runbook del venerdì — punto aperto

Una volta a settimana, il venerdì, le foto di categoria `ARCHIVIO` vanno scaricate dalla raccolta e depositate **nella cartella di commessa su `L:`**.

**Manca il dato e non lo invento:** quale cartella, per ciascuna commessa. Serve il percorso esatto (probabilmente sotto la cartella d'ambito della commessa, ma va confermato) e la regola per le sottocartelle — per data, per mese, per lavorazione.

Da decidere insieme al percorso, perché cambia il runbook:

1. **Cosa si scarica:** solo `ARCHIVIO`, o anche `AVANZAMENTO`? E i **video** insieme alle foto, o in una sottocartella a parte? Un video da decine di MB nella cartella di commessa è una scelta da fare consapevolmente. L'uso descritto dice solo Archivio: le foto di avanzamento servono a capirsi sul momento e non hanno valore documentale.
2. **Come si marca il lavorato.** È lo stesso problema già affrontato per le bolle: senza uno stato in raccolta, il venerdì successivo il runbook o riscarica tutto o rischia di saltare qualcosa. Coerente con la scelta fatta per le bolle, la strada è una colonna `Stato` che il runbook aggiorna, non lo spostamento dei file.
3. **Cosa fa con `Nota` e `Operatore`**: finiscono nel nome del file, in un file di testo accanto, o si perdono? Se la nota ha valore, va deciso adesso.
4. **Collaudo sui numeri**, mai sull'esito formale: foto di categoria Archivio presenti in raccolta contro file depositati su `L:`. Ogni scarto è un difetto da spiegare.

## 7. Scelte di costruzione, e perché

- **Database separato** (`llitalia-foto`) da quello delle bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
- **Coda più semplice di quella delle bolle**, di proposito: niente storico permanente, niente miniature conservate. **Il progressivo invece c'è**, dall'11/09/2026 — e prima non c'era, per una scelta motivata così: «una bolla persa è un documento perso, una foto di cantiere non arrivata si riscatta». Il ragionamento era sbagliato in un punto: **riscattare una foto richiede di sapere che manca**, e a dirlo è solo un buco nella sequenza. Senza progressivo non esiste un controllo di continuità; esiste solo la speranza che tutto sia arrivato. Sequenza propria del modulo, che parte da 1 e non va confrontata con quella delle bolle.
- **Identità del dispositivo nella shell** (`core/dispositivo.js`): è l'identità del telefono, non di un modulo, e i due moduli la leggono da lì. Prima viveva nel database delle bolle, ed è da lì che viene **ereditata** sui telefoni già in uso: rigenerarla avrebbe fatto apparire in raccolta due dispositivi dove ce n'è uno, spezzando la sequenza delle bolle già inviate.
- **Conserva ultime N = 10** per default, contro le 20 delle bolle: le foto d'archivio non sono compresse e pesano.
- **Codice condiviso nella shell:** anagrafica cantieri (`core/cantieri.js`), normalizzazione dell'endpoint (`core/endpoint.js`), versione dell'app (`core/versione.js`), identità del dispositivo (`core/dispositivo.js`), configurazione via link (`core/configurazione-link.js`). Spostati lì in occasione di questo modulo: erano dentro Bolle, e copiarli avrebbe creato due verità destinate a divergere. Della configurazione via link cambiano solo i testi e le impostazioni di destinazione: il meccanismo — link nell'hash, QR, applicazione sul telefono che riceve — è uno solo, e la copia rimasta indietro sarebbe quella che perde un carattere della firma senza dirlo.
- **Compressione e anteprime duplicate** invece che condivise: il codice immagini di Bolle contiene anche il controllo di leggibilità, che è specifico delle bolle (misura se un testo è leggibile). Estrarlo avrebbe voluto dire rimaneggiare un file del modulo in produzione. Cinquanta righe duplicate sono un prezzo accettabile; da riunire quando entrambi i moduli saranno stabili.
- **Nessun controllo di leggibilità** in questo modulo: una foto di cantiere non è un foglio da leggere, e un avviso che scatta a caso viene ignorato sempre.
