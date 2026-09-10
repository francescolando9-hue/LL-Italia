# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 2 del 10/09/2026 ore 18:05.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia **foto e video**, non legge nulla del contenuto. Rev. 2: etichette delle categorie semplificate e invio dei video. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> ⚠️ **Un punto resta aperto e non l'ho inventato:** la cartella di destinazione su `L:` dove il runbook del venerdì deposita le foto, per commessa. Va indicata da Francesco — vedi §6.

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
6. **Coda invii** con gli stati e i contatori del giorno, come in Bolle.

Se si cambia categoria quando ci sono già foto in attesa, l'app **avvisa** che quelle partono col tipo con cui sono state preparate, non con quello scelto adesso. Cambiare l'etichetta a posteriori sarebbe una bugia: il file è già stato compresso, o non lo è stato.

## 3. Preparazione delle immagini

| Categoria | Trattamento |
|---|---|
| `AVANZAMENTO` | JPEG, lato lungo 2500 px, qualità 0,85 — come le bolle. Leggera, parte anche con poca rete. |
| `ARCHIVIO` | **Risoluzione originale** (deciso il 10/09/2026). Se il file è già JPEG si spediscono **i byte originali, senza ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine senza alcun vantaggio. Se il telefono produce HEIC o PNG si converte in JPEG a piena risoluzione (qualità 0,95), perché il nome del file in raccolta è `.jpg` e byte HEIC dentro un `.jpg` sarebbero un file che non si apre. |

**Misure reali** (collaudo del 10/09/2026, foto 4032 × 3024):

| Caso | Sul telefono | Inviato | Corpo della richiesta |
|---|---|---|---|
| Avanzamento | 1,30 MB | 0,47 MB | 0,63 MB |
| Archivio | 1,30 MB | 1,30 MB (**byte identici**) | 1,74 MB |
| Archivio, caso peggiore | 11,95 MB | 11,95 MB | **15,93 MB** |

⚠️ **Il caso peggiore va provato sul flow vero prima di prometterlo in cantiere.** Il base64 dentro JSON aggiunge un terzo al peso: una foto da 12 MB diventa un corpo da 16 MB. In laboratorio, contro un endpoint finto in locale, l'invio è durato 2,7 secondi — un dato che **non dice nulla** su un telefono in cantiere con poca rete, né su cosa faccia il flow reale con un corpo di quella taglia. Se il flow rifiuta, l'app lo dice con un messaggio dedicato (`413` → «foto troppo grande per il flow») e **la foto resta in coda**, non si perde.

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
  "durataSecondi": 0,                 // solo per i video, 0 se sconosciuta
  "idClient": "f15f1935-…",           // GUID del file, per la deduplica
  "dataScatto": "2026-09-10T17:28:04+02:00",   // ora reale del telefono
  "versioneApp": "0.19.0",
  "nomeFile": "…",                    // IGNORATO dal backend: lo compone il flow
  "contenutoBase64": "…" }
```

**Attenzione, il campo si chiama `dataScatto`** — non `dataInvio` come nelle bolle. Nelle bolle il nome del campo e quello della colonna divergono per un incidente storico; qui nascono uguali. **Non dare per scontata la simmetria fra i due contratti.**

## 4-bis. Caricamento a blocchi, per i file che non stanno in una richiesta (aggiunto il 10/09/2026)

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

⚠️ **Punto da collaudare sul flow vero, non verificabile qui:** che l'indirizzo restituito da `createUploadSession` accetti un `PUT` **cross-origin** dall'origine dell'app (GitHub Pages). L'endpoint di Graph per le sessioni di upload risponde ai preflight, ma va provato: se non lo accettasse, la strada resta la stessa e cambia solo il destinatario dei blocchi — un secondo flow con trigger HTTP che riceve un blocco per volta, più lento e con più azioni consumate. Da provare **prima** di costruire tutto il resto.

## 5. Cosa serve costruire (in capo a Francesco)

Un flow e una raccolta **nuovi e dedicati**, non quelli delle bolle: così una modifica al flow delle foto non può rompere la catena delle bolle, già in esercizio e collaudata.

**Raccolta SharePoint** (nome da decidere, es. `FotoCantiere`), con queste colonne:

| Colonna | Tipo | Origine nel payload |
|---|---|---|
| `Tipo` | Riga di testo singola (o Scelta con i due valori) | `tipo` |
| `Commessa` | Riga di testo singola | `commessa` |
| `Operatore` | Riga di testo singola | `operatore` |
| `Nota` | Più righe di testo | `nota` |
| `DataScatto` | **Riga di testo singola** | `dataScatto`, verbatim |
| `IdClient` | Riga di testo singola, indicizzata | `idClient` |
| `Genere` | Riga di testo singola (o Scelta: foto \| video) | `genere` |
| `DurataSecondi` | Numero, 0 decimali — facoltativa | `durataSecondi` |
| `VersioneApp` | Riga di testo singola — facoltativa | `versioneApp` |

`DataScatto` di tipo **testo** e non *Data e ora*: è la stessa decisione presa per le bolle il 03/09, dopo che SharePoint archiviava un valore sfasato di 7 ore pur essendo corretti sia il fuso del sito sia quello del profilo. Togliere a SharePoint la possibilità di interpretare il dato è l'unico rimedio che ha tenuto.

**Flow**, con la stessa struttura di quello delle bolle (dettaglio in `docs/AppBolleFlowRicezione….md`, che vale come modello):

- controllo del token, con `Response 401` e Terminate nel ramo del token errato;
- `Create file` in cartelle `AAAA/AAAAMM` calcolate su `dataScatto`, **non** sull'orologio del flow;
- `Update file properties` con le colonne sopra;
- `Response 200` finale, **con l'header `Access-Control-Allow-Origin: *` su tutte le Response**: senza, il file arriva ma il browser non lascia leggere la risposta all'app, che segna Errore e ritenta all'infinito;
- **ogni via d'uscita deve avere una Response.** Un ramo che esce senza rispondere fa arrivare all'app un `502`, che significa esattamente «il flow è terminato senza rispondere».

**Se si vuole il caricamento a blocchi** (§4-bis), lo stesso flow si articola su tre rami, uno `Switch` sul campo `azione` subito dopo il controllo del token:

| `azione` | Cosa fa il ramo | Response |
|---|---|---|
| *assente* | come oggi: `Create file` con `contenutoBase64` decodificato, poi `Update file properties` | `200` |
| `preparaCaricamento` | `HTTP` verso Graph, `POST …/createUploadSession` sul percorso del file da creare | `200` con `{"urlCaricamento": <uploadUrl della risposta>, "dimensioneBlocco": 10485760}` |
| `completaCaricamento` | ritrova il file appena caricato (per nome) e fa `Update file properties` con le colonne | `200` |

Il ramo `preparaCaricamento` **deve calcolare il nome del file e la cartella esattamente come fa il ramo di oggi**, altrimenti il passo 3 non ritrova il file da aggiornare. Conviene metterli in due variabili usate da entrambi i rami, non ripetere l'espressione.

Un flow che non ha questi rami non fa danni: risponde qualcosa che non è JSON, e l'app lascia il file in coda con un errore che si legge. Ma finché i rami non ci sono, l'interruttore nelle impostazioni va lasciato **spento**.

Nome file suggerito, coerente con la nomenclatura di gruppo:
`Foto[Commessa][Tipo][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg` per le foto,
`Video[…].[estensione]` per i video.

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
- **Coda più semplice di quella delle bolle**, di proposito: niente storico permanente, niente miniature conservate, **niente progressivo**. Il progressivo esiste per le bolle perché una bolla di consegna persa è un documento perso, e il controllo di continuità serve a scoprirlo; una foto di cantiere non arrivata si riscatta. Se in esercizio servisse anche qui, si aggiunge con lo stesso schema.
- **Conserva ultime N = 10** per default, contro le 20 delle bolle: le foto d'archivio non sono compresse e pesano.
- **Codice condiviso nella shell:** anagrafica cantieri (`core/cantieri.js`), normalizzazione dell'endpoint (`core/endpoint.js`), versione dell'app (`core/versione.js`). Spostati lì proprio in occasione di questo modulo: erano dentro Bolle, e copiarli avrebbe creato due verità destinate a divergere.
- **Compressione e anteprime duplicate** invece che condivise: il codice immagini di Bolle contiene anche il controllo di leggibilità, che è specifico delle bolle (misura se un testo è leggibile). Estrarlo avrebbe voluto dire rimaneggiare un file del modulo in produzione. Cinquanta righe duplicate sono un prezzo accettabile; da riunire quando entrambi i moduli saranno stabili.
- **Nessun controllo di leggibilità** in questo modulo: una foto di cantiere non è un foglio da leggere, e un avviso che scatta a caso viene ignorato sempre.
