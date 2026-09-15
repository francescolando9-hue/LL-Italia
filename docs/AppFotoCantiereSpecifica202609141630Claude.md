# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 8 del 15/09/2026, sera.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia **foto e video**, non legge nulla del contenuto. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> **Rev. 8 — la fase viaggia come CODICE senza spazi** (§4.4): in colonna e nel nome della cartella sul server c'è `FinituraAlloggi`, a video l'operatore legge «Finitura alloggi». Dalla **0.34.0**. Rev. 7 — la fase è OBBLIGATORIA per la categoria `ARCHIVIO` (§4.4), dalla **0.33.0**: quelle foto sul server vanno nella **cartella della fase** (§6), e senza fase non saprebbero dove andare. Per l'`AVANZAMENTO` resta facoltativa. Rev. 6 — campo `fase` (§4, §4.4): la fase di lavoro a cui la foto si attribuisce, da elenco chiuso di gruppo; **serve una colonna `Fase` in raccolta** (§5). Dalla **0.31.0**. Rev. 5 — `dataScatto` è finalmente l'ora dello scatto (§4.1): fino alla 0.28.0 era l'ora dell'invio, misurato in produzione il 14/09. Dalla **0.29.0** l'app legge l'ora dall'EXIF della foto originale e, quando non ci riesce, lo **dichiara** con il campo nuovo `scattoStimato`. **Serve una colonna nuova in raccolta** (§5). Rev. 4 — esiti del collaudo del 14/09 (§5), marcatore dello scarico deciso e percorsi di destinazione non più «mancanti» (§6). Rev. 3 — riallineata al collaudo del ricevente (`docs/FotoCantiereBriefingRicevente.md`, 10/09/2026 sera): raccolta e flow esistono e sono collaudati, `DataScatto` viaggia come 12 cifre, i campi numerici vogliono un numero vero, le foto portano `idDispositivo` e `progressivo`, il caricamento a blocchi resta fermo. **Dove questo documento e il briefing divergessero ancora, fa fede il briefing:** lì c'è ciò che è stato misurato sul tenant.
>
> ⚠️ **Due punti aperti:** l'apertura della sessione di caricamento a blocchi, che il tenant oggi rifiuta (§4-bis); e l'ora di ripresa dei **video**, che non sta nell'EXIF e per ora resta stimata (§4.1). La destinazione del runbook del venerdì **non è** fra i punti aperti: i percorsi esistono, sono verificati e registrati fuori da questo repo (§6).

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
   **Fase di lavoro** — elenco chiuso di gruppo in `core/fasi.js` più «nessuna fase», lo stesso delle bolle, ultima scelta preselezionata. **Obbligatoria se fra le foto in attesa ce n'è almeno una `ARCHIVIO`**, facoltativa altrimenti (§4.4).
3. **Scatta foto** — apre la **fotocamera dentro l'app** (`core/fotocamera.js`, la stessa del modulo Bolle): si scatta più volte di fila senza uscire, con rullino e contatore, poi *Fine*. Accanto restano **Usa la fotocamera del telefono** e **Scegli dalla galleria** (multi-foto). Anteprime rimovibili, ognuna con categoria e peso reale del file che partirà.
   Qui gli scatti di una sessione **non** vengono raggruppati: ogni foto è una foto. Il gesto però è identico a quello delle bolle, così chi usa l'app impara una sola cosa.
4. **Nota** (facoltativa, max 255 caratteri) — vale per tutte le foto di quell'invio. Si svuota dopo l'invio, perché la nota successiva è un'altra cosa.
5. **Invia** — resta disabilitato finché non c'è almeno una foto e un cantiere, e finché manca la fase se fra le foto in attesa ce n'è una da archiviare. L'avviso accanto al pulsante dice cosa manca e perché.
6. **Coda invii** con gli stati e i contatori del giorno, come in Bolle. Ogni riga porta il **numero progressivo** (`n. 47`), che si legge a voce quando l'ufficio segnala un buco nella sequenza. Gli stati usano le classi del design system della shell: quelle sbagliate — e per un giorno lo sono state — fanno uscire «Inviata» senza colore, cioè senza conferma visiva che la foto sia arrivata.

Nelle impostazioni del modulo c'è **Configura un altro telefono**: genera un QR che porta indirizzo e codice su un altro dispositivo senza digitare nulla. Il link è **solo di questo modulo** — le bolle hanno una destinazione propria e un link proprio. Serve prima di distribuire l'app agli operai: l'URL del trigger è lungo e firmato, e sulle bolle una copia manuale è già costata un'ora di diagnosi per una lettera cambiata nel nome di un parametro e un carattere perso dalla firma.

Se si cambia categoria quando ci sono già foto in attesa, l'app **avvisa** che quelle partono col tipo con cui sono state preparate, non con quello scelto adesso. Cambiare l'etichetta a posteriori sarebbe una bugia: il file è già stato compresso, o non lo è stato.

## 3. Preparazione delle immagini

| Categoria | Trattamento |
|---|---|
| `AVANZAMENTO` | JPEG, lato lungo 2500 px, qualità 0,85 — come le bolle. Leggera, parte anche con poca rete. |
| `ARCHIVIO` | **Risoluzione originale** (deciso il 10/09/2026). Se il file è già JPEG si spediscono **i byte originali, senza ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine senza alcun vantaggio. Se il telefono produce HEIC o PNG si converte in JPEG a piena risoluzione (qualità 0,95), perché il nome del file in raccolta è `.jpg` e byte HEIC dentro un `.jpg` sarebbero un file che non si apre. |

**Ricodificare butta via l'EXIF.** Il passaggio per il canvas — che avviene sempre per l'`AVANZAMENTO`, e per l'`ARCHIVIO` solo quando il file non è già JPEG — produce un JPEG pulito, **senza i metadati dell'originale**. È la ragione per cui l'ora dello scatto si legge **prima** della preparazione (§4.1), ed è anche la ragione per cui una foto d'archivio già JPEG arriva in raccolta con il suo EXIF intatto mentre una d'avanzamento no: sono due trattamenti diversi, non un'incoerenza.

**Misure sul flow vero** (collaudo del ricevente, 10/09/2026 sera, telefono reale) — sostituiscono le stime di laboratorio:

| Caso | Peso del file | Corpo della richiesta |
|---|---|---|
| `AVANZAMENTO` (2500 px, q. 0,85) | 1,49 MB | ~2,0 MB |
| `ARCHIVIO` da fotocamera in-app | 3,76 MB | ~5,0 MB |
| `ARCHIVIO` da fotocamera nativa, byte originali | **4,39 MB** | **~5,9 MB** |
| `ARCHIVIO`, il più grande arrivato finora (14/09) | **6,17 MB** | **~8,2 MB**, accettato in una sola richiesta |

**L'ipotesi «foto d'archivio da 12 MB, corpo da 16 MB» non si è verificata**, e il codice conferma il perché: per l'archivio, se il file è già JPEG l'app spedisce i byte originali senza ricodificarli, e un telefono non produce JPEG da 12 MB. Quindi **per le foto il ramo in una richiesta basta**, con margine largo dentro la finestra di 120 secondi del trigger. Il collaudo del 14/09 ha alzato il tetto conosciuto da 4,39 a 6,17 MB — sempre accettato in una richiesta sola — senza cambiare la conclusione.

⚠️ Il tetto **conosciuto** non è il tetto **vero**: nessuno ha ancora cercato il punto in cui il flow smette di accettare. La prova di taglia a scaglioni è fra quelle che restano da fare (§5), e va fatta **prima** che qualcuno mandi un video, non dopo.

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
  "fase": "FinituraAlloggi",          // CODICE della fase, senza spazi, vedi §4.4
  "operatore": "Paolo Sanzarello",
  "nota": "Getto solaio piano 3 completato",   // può essere vuota
  "genere": "foto",                   // oppure "video"
  "estensione": "jpg",                // jpg | mp4 | mov | webm | 3gp…
  "mimeType": "image/jpeg",
  "durataSecondi": 0,                 // NUMERO, non stringa. 0 per le foto
  "idClient": "f15f1935-…",           // GUID del file, per la deduplica
  "idDispositivo": "3f2a9c10-…",      // GUID dell'installazione, stabile
  "progressivo": 47,                  // NUMERO, sequenza per dispositivo
  "dataScatto": "2026-09-14T08:31:39+02:00",   // ora dello SCATTO, non dell'invio
  "scattoStimato": "NO",              // "SI" = è un ripiego, vedi §4.1
  "versioneApp": "0.29.0",
  "nomeFile": "…",                    // IGNORATO dal backend: lo compone il flow
  "contenutoBase64": "…" }
```

**Attenzione, il campo si chiama `dataScatto`** — non `dataInvio` come nelle bolle. Nelle bolle il nome del campo e quello della colonna divergono per un incidente storico; qui nascono uguali. **Non dare per scontata la simmetria fra i due contratti.**

### 4.1 `dataScatto`: quando la foto è stata FATTA

#### Il difetto, misurato in produzione il 14/09/2026

Fino alla **0.28.0** `dataScatto` non era l'ora dello scatto: era **l'ora dell'invio**. L'app scriveva l'orologio del momento in cui la foto entrava in coda, e lo mandava sotto quel nome.

La prova: due foto `ARCHIVIO` della commessa SNZ2.2 sono in raccolta con `DataScatto` **202609140915 tutt'e due**, mentre l'EXIF dei file originali dice `DateTimeOriginal` **2026:09:14 08:31:39** e **08:31:42**. Tre secondi di distanza diventati zero, e **quarantaquattro minuti** di scarto dal vero.

Perché è grave: per l'archivio di commessa **l'ora dello scatto è il dato**, ed è il criterio con cui il flow sceglie le cartelle `AAAA/AAAAMM`. Una foto fatta il 30 del mese e mandata il 1º del mese dopo finiva nella cartella sbagliata. E soprattutto **non faceva rumore**: in colonna si legge un'ora plausibile, e nessuno ha modo di accorgersi che è l'ora sbagliata.

#### Da dove viene l'ora, dalla 0.29.0

| Come arriva la foto | Ora usata | `scattoStimato` |
|---|---|---|
| Scelta dalla galleria, o scattata con la fotocamera **di sistema** | `DateTimeOriginal` (tag EXIF `0x9003`) letto dal file **originale** | `NO` |
| Scattata con la fotocamera **dentro l'app** | l'orologio del telefono **all'istante dello scatto** (il file nasce lì: nessun EXIF da leggere, e nessuno da cercare) | `NO` |
| Foto senza EXIF, senza quel tag, o con una data assurda | l'ora di accodamento — il comportamento di prima | `SI` |
| **Video** | l'ora di accodamento — punto aperto, vedi sotto | `SI` |

**La lettura avviene PRIMA di qualunque ricodifica.** Non è un dettaglio di ordine: la preparazione dell'`AVANZAMENTO` (2500 px, qualità 0,85) passa per un canvas, e dal canvas l'EXIF non esce. Leggerlo dopo vorrebbe dire non leggerlo mai — e il difetto sarebbe tornato su una categoria sola, che è il modo più efficace di non accorgersene.

**Niente libreria EXIF**: lo stack è vincolato e qui non serve. Si leggono i primi 128 KB del file e si scandiscono i marcatori JPEG fino all'APP1 (`core/exif.js`, ~150 righe). Il contenuto della foto non viene toccato.

#### Il fuso

Se la foto porta anche `OffsetTimeOriginal` (tag `0x9011`), **il fuso è quello**: è il fuso in cui la foto è stata scattata, e vince su quello del telefono che sta inviando.

Se non c'è — e su molti telefoni non c'è — le cifre si leggono come **ora locale del dispositivo**, con il fuso in vigore **quel giorno** (a gennaio in Italia `+01:00`, a settembre `+02:00`: applicare il fuso di oggi a una foto di sei mesi fa sposterebbe di un'ora). **Non si interpretano mai come UTC:** l'EXIF non ha un fuso implicito, e leggerlo come UTC sposterebbe indietro di due ore ogni foto italiana. Nel caso peggiore, con l'ora locale, sbaglia solo una foto arrivata da un altro fuso; leggendo UTC sbaglierebbero tutte.

#### `scattoStimato`: `SI` / `NO`

Campo **nuovo**, testo, sempre presente. Vale `NO` quando l'ora è stata misurata e `SI` quando è un ripiego, cioè quando in `dataScatto` c'è l'ora di accodamento perché quella dello scatto non si è potuta sapere.

Serve a **non dover distinguere a mano una misura da un'approssimazione**: senza, in colonna ci sarebbero due dati diversi con lo stesso aspetto, ed è esattamente la condizione che ha reso invisibile il difetto per due settimane. È testo `SI`/`NO` e **non una colonna Sì/No**: le colonne booleane sono fra quelle che il connettore riscrive più volentieri, e qui il rischio non vale il risparmio.

Una data è considerata assurda — e quindi scartata a favore del ripiego — se l'anno è **precedente al 2010** (orologio del telefono mai impostato: 1970, 2001, 2008 a seconda del sistema) o se cade **più di un giorno nel futuro** (orologio avanti).

#### Cosa NON si legge, e perché

- **`DateTime` (tag `0x0132`)**: è l'ora dell'**ultima modifica** del file. Su una foto ritagliata o ri-salvata è l'ora del ritaglio, e finirebbe in colonna come ora di scatto senza che nessuno possa accorgersene.
- **`lastModified` del file**: per una foto copiata o scaricata è l'ora della copia.
- **EXIF dentro HEIC/HEIF**: non sta in un APP1 ma in una scatola del contenitore ISO-BMFF, e servirebbe un parser vero. Un iPhone che manda HEIC ricade quindi nel ripiego.

In tutti e tre i casi il valore *sembrerebbe* un'ora di scatto. **Meglio dichiarare «stimata» che affermare un'ora precisa e sbagliata.** Se in futuro si decidesse di usarli, vanno usati con `scattoStimato` = `SI`, mai come misura.

#### Video: punto aperto, dichiarato

L'ora di ripresa di un video non sta nell'EXIF ma nel contenitore (`mvhd` del box `moov`), e **fra MP4 e MOV non è scritta con le stesse convenzioni di fuso** — c'è chi la scrive in UTC e chi in ora locale, senza dirlo. In più su alcuni registratori quel box sta in fondo al file, e leggerlo vorrebbe dire scorrere decine di megabyte.

Finché non è letta davvero, **i video partono con l'ora di accodamento e `scattoStimato` = `SI`**. È una scelta esplicita, non una dimenticanza: per un video registrato e mandato nella stessa giornata lo scarto è di minuti, e il campo dice che è una stima.

#### La forma non cambia: l'app manda ISO, in colonna vanno 12 cifre

L'app manda `dataScatto` in **ISO 8601 con fuso** (`2026-09-14T08:31:39+02:00`), e continua a farlo: cambia **quale** ora è, non **come** è scritta. Il flow non va toccato per questo.

**Quel valore però non va scritto verbatim in colonna.** La colonna è di tipo testo, come previsto, e **non basta**: il connettore SharePoint riconosce qualunque valore che *somigli* a una data e lo riscrive prima di consegnarlo. Misurato sul tenant il 10/09/2026: `2026-09-10T21:47:21+02:00` è atterrato come `09/10/2026 12:47:21` — **nove ore di scarto**, con un mese e un giorno invertiti per soprammercato.

Il rimedio, verificato, è **compattare nel flow a 12 cifre `AAAAMMGGHHMM`**, che non somigliano a una data e quindi nessuno reinterpreta. È lo stesso rimedio adottato sulle bolle il 03/09.

> ⚠️ **Il riscontro con `Created` cambia di significato, dalla 0.29.0.** Finché `dataScatto` era l'ora dell'invio, `DataScatto` e `Created` **dovevano** coincidere, e la loro coincidenza è stata usata come prova che la compattazione a 12 cifre funzionava (collaudo del 14/09, §5). Ora coincidono solo per le foto scattate e mandate subito: per una foto scelta dalla galleria **è normale che `DataScatto` sia molto più indietro di `Created`**, ed è il segno che la correzione funziona, non che qualcosa si è rotto. Per verificare la compattazione serve d'ora in poi una foto **scattata sul momento** — lì le due colonne tornano a coincidere.

### 4.2 I campi numerici vogliono un numero, o un null vero

`progressivo` e `durataSecondi` sono **numeri JSON**, non stringhe: l'app li manda così, e dove il dato non c'è manda `null`, **mai** stringa vuota.

Il motivo è costato venti foto: mappati per interpolazione, quei campi arrivano al connettore come `""` quando l'app non li manda, la scrittura delle colonne falla con *«required to be of type Number/double»* e **il file atterra in raccolta senza colonne**. Il file c'è, il flow è verde, e il runbook non sa di chi sia quella foto. Lato flow la mappatura è stata corretta; lato app il contratto è questo.

### 4.3 `idDispositivo` e `progressivo`: a cosa servono

Senza una sequenza per dispositivo **non esiste un controllo di continuità**: non si può dimostrare che nessuna foto si è persa fra telefono e raccolta, si può solo sperarlo. È lo stesso meccanismo delle bolle, che ogni sera dice «zero buchi».

- `progressivo` è **per dispositivo e per modulo**: parte da 1 alla prima installazione, non si azzera mai, e si assegna **quando la foto entra in coda** con Invia — non allo scatto, altrimenti una bozza scartata lascerebbe un buco che si leggerebbe come «una foto non è arrivata». La sequenza delle foto è **indipendente** da quella delle bolle: le raccolte sono due e ognuna si controlla per conto suo. Non confrontarle.
- `idDispositivo` è l'identità dell'**installazione**, la stessa per tutti i moduli: vive nella shell (`core/dispositivo.js`) e i due moduli la leggono da lì. Un telefono che usava già le bolle **conserva l'identificativo che aveva** — se ne generasse uno nuovo, in raccolta apparirebbero due dispositivi dove ce n'è uno, e la sequenza delle bolle già inviate risulterebbe interrotta.
- **Il raggruppamento si fa su `IdDispositivo`, mai su `Operatore`**: l'operatore è testo libero, si spezza a ogni grafia diversa del nome e fonde due telefoni della stessa persona.
- Una reinstallazione riparte da 1 con un identificativo nuovo: il numero va sempre letto **insieme** a `idDispositivo`.

### 4.4 `fase`: a quale fase di lavoro appartiene la foto

Campo **nuovo dalla 0.31.0**, testo, **sempre presente**.

**Obbligatoria per la categoria `ARCHIVIO`, dalla 0.33.0** (deciso da Francesco il 15/09/2026): quelle foto vanno sul server nella **cartella della fase** (§6), e una foto senza fase non saprebbe dove andare. Facoltativa per l'`AVANZAMENTO`, che resta in raccolta e non si smista, e nel modulo Bolle.

Regola esatta, perché un invio può contenere foto accodate con categorie diverse: **se fra le foto in attesa ce n'è almeno una `ARCHIVIO`, la fase serve** — vale per tutte le foto di quell'invio. Invia resta spento e l'avviso nella barra dice *«Scegli la fase per inviare. Le foto da archiviare si ordinano per fase sul server»*; scegliendo `ARCHIVIO` l'app lo dice già sotto il campo, prima di scattare.

Il campo arriva **vuoto** quando la fase non è stata indicata (avanzamento, o bolle) e per le foto accodate prima della 0.31.0. **Dalla 0.33.0 nessuna foto `ARCHIVIO` può più partire senza fase:** è la garanzia su cui si regge lo smistamento per cartella del runbook. È la **fase di lavoro** a cui la foto si attribuisce: il gruppo divide il lavoro in fasi → attività → lavorazioni, e si sceglie il livello delle fasi perché è quello che chi è in cantiere sa dire sul momento, senza guardare il cronoprogramma.

**Elenco chiuso**, lo stesso per Bolle e Foto, nella shell (`core/fasi.js`), dato da Francesco il 14/09/2026, in ordine alfabetico. **Non si scrive a mano**: «Murature», «murature» e «Muratura» in colonna sarebbero tre fasi.

**Codice ed etichetta (dalla 0.34.0).** Come per i cantieri e per le categorie, viaggia il **codice** — senza spazi, PascalCase — mentre a video l'operatore legge l'**etichetta**. Il motivo è lo smistamento sul server (§6): le cartelle non hanno spazi nel nome, e **il codice È il nome della cartella**, senza tabelle di conversione fra colonna e cartella da tenere allineate. Le 26 fasi, `codice` = `etichetta` dove coincidono:

| Codice (in colonna e cartella) | Etichetta (a video) |
|---|---|
| `Bonifica` · `Cantiere` · `Consolidamento` · `Demolizione` · `Extra` · `Impermeabilizzazioni` · `Interrato` · `Marketing` · `Murature` · `Ponteggio` · `Scavi` · `Strutture` · `Urbanizzazioni` | identiche al codice |
| `FinituraAlloggi` | Finitura alloggi |
| `FinituraFacciata` | Finitura facciata |
| `FinituraPartiComuniInterne` | Finitura parti comuni interne |
| `ImpiantiDiReteCondominiali` | Impianti di rete condominiali |
| `ImpiantoAntincendio` | Impianto Antincendio |
| `ImpiantoAscensore` | Impianto ascensore |
| `ImpiantoElettricoAlloggi` | Impianto elettrico alloggi |
| `ImpiantoElettricoPartiComuni` | Impianto elettrico parti comuni |
| `ImpiantoFotovoltaico` | Impianto fotovoltaico |
| `ImpiantoIdrosanitario` | Impianto idrosanitario |
| `ImpiantoSEFCC` | Impianto SEFCC |
| `ImpiantoTermicoAlloggi` | Impianto termico alloggi |
| `ImpiantoTermicoCondominiale` | Impianto termico condominiale | `CMC 128` era nell'elenco d'origine ed è stata **tolta** lo stesso giorno su decisione di Francesco (codice di commessa, non fase); `Impianto SEFCC` era in rosso nell'elenco d'origine e resta finché non decide lui.

**Nell'app** è un menù a tendina accanto al cantiere, **facoltativo**: la prima voce è «— nessuna fase —», sempre selezionabile, e con quella si invia lo stesso. L'ultima scelta si ripropone al prossimo invio, «nessuna» compresa, come il cantiere: non aggiunge tocchi al giro. Vale per tutte le foto di uno stesso invio, come commessa e nota.

**Lato raccolta serve la colonna `Fase`** (riga di testo singola), mappata sul campo omonimo. Finché non c'è, il flow ignora il campo e le foto atterrano lo stesso: il rilascio è indipendente. Vuota = fase non indicata (solo `AVANZAMENTO`, dalla 0.33.0), oppure foto di una versione precedente alla 0.31.0.

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
| `Fase` | Riga di testo singola | `fase` — **DA AGGIUNGERE**, vedi §4.4. Contiene il **codice** senza spazi (`FinituraAlloggi`), che è anche il nome della cartella sul server. Sempre valorizzata sulle `ARCHIVIO` dalla 0.33.0 |
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
| `ScattoStimato` | Riga di testo singola | `scattoStimato` — **DA AGGIUNGERE**, vedi sotto |

**Colonna da aggiungere, con la 0.29.0: `ScattoStimato`** (riga di testo singola), mappata sul campo omonimo del payload. Finché non c'è, il flow **ignora** il campo — che è il motivo per cui l'app può essere rilasciata subito e senza coordinamento: le foto continuano ad atterrare, con l'ora giusta, e si perde solo l'indicazione se quell'ora sia misurata o stimata. Valori attesi: `SI` e `NO`, nient'altro. Una vista con filtro `ScattoStimato = SI` dice al volo quali foto hanno un'ora approssimativa.

`DataScatto` di tipo **testo** e non *Data e ora*: è la stessa decisione presa per le bolle il 03/09. Da sola però non basta — il connettore riscrive comunque ciò che somiglia a una data, ed è per questo che il flow compatta a 12 cifre (§4.1).

**Flow `FotoCantiereRicevitore`**, ramo *invio in una richiesta* (nessuna `azione` nel payload): token → validazione del payload → guardia duplicati su `IdClient` → `Create file` (trasferimento a blocchi verso SharePoint) → `Update file properties` → Response. Cartelle `AAAA/AAAAMM` calcolate su `dataScatto`, **non** sull'orologio del flow.

**Sette Response**, tutte con `Access-Control-Allow-Origin: *` e `Content-Type: application/json`: `401` token, `400` payload incompleto, `200 gia_presente`, `200` ok, e tre `500` distinti su creazione file, scrittura colonne e lettura duplicati. **Nessuna via d'uscita muta:** un ramo che esce senza rispondere fa arrivare all'app un `502`, che significa esattamente «il flow è terminato senza rispondere».

**Collaudo del 10/09/2026, sui numeri:** tre foto vere (una `AVANZAMENTO`, due `ARCHIVIO`), tre file in raccolta, tutte le colonne compilate, cartelle `2026/202609` create dal flow, ora di scatto coincidente con `Created`. Quadratura 3 su 3.

### Collaudo del 14/09/2026 — prima verifica della continuità

Due foto `ARCHIVIO` mandate dall'app **0.27.0**, stesso dispositivo:

| Cosa | Esito |
|---|---|
| `Progressivo` | **1 e 2, consecutivi**; `IdDispositivo` valorizzato su entrambe |
| `DataScatto` `202609140915` contro `Created` `07:15:11Z` | **coincidono** (07:15 UTC = 09:15 italiane): la correzione a 12 cifre tiene |
| File più grande arrivato finora | **6,17 MB**, circa **8,2 MB** di corpo, **accettato in una sola richiesta** |

> **Quella riga sul `Created` andava letta al contrario.** `DataScatto` e `Created` coincidevano **al minuto** perché erano la stessa ora: quella dell'invio. Confrontate con l'EXIF dei file originali — `08:31:39` e `08:31:42` — le due foto risultavano scattate 44 minuti prima, e in raccolta erano diventate la stessa ora. Il controllo dimostrava la compattazione a 12 cifre, che era ciò che si stava provando, e nello stesso numero c'era il difetto di §4.1. **Una coincidenza perfetta fra due dati che nascono da fonti diverse è un fatto da spiegare, non da archiviare.**

**È il primo controllo di continuità sulle foto, ed è pulito.** Prima di questa versione le colonne c'erano ma restavano vuote, quindi la sequenza non esisteva: da qui in poi un numero mancante significa una foto scattata e mai arrivata.

Il dato sul peso corregge in meglio la stima del 10/09, quando il file più grande misurato era 4,39 MB: **l'archivio a risoluzione originale ha più margine di quanto si pensasse** nell'invio in una sola richiesta. Non cambia la conclusione — il caricamento a blocchi serve ai video, non alle foto — ma alza il tetto conosciuto.

**Restano da provare**, e finché non sono provati non si dichiarano funzionanti:

- **token errato → 401**;
- **payload senza `dataScatto` → 400**, e **mai un 502**: un 502 significherebbe un ramo che esce senza Response;
- **stessa foto mandata due volte → 200 `gia_presente`**, con **un solo file** in raccolta (la guardia sui duplicati);
- **prova di taglia a scaglioni**, per sapere dove il flow smette di accettare — **prima che qualcuno mandi un video**, non dopo.

### Rilascio 0.29.0 — l'ora dello scatto

Provato in locale con i collaudi automatici del repo (`node collaudi/esegui.js`, collaudo `10-ora-scatto.js`), su foto costruite con un EXIF vero e riletto da una libreria indipendente:

| Caso | Atteso | Esito |
|---|---|---|
| EXIF `2026:09:14 08:31:39` con `OffsetTimeOriginal +02:00`, categoria `ARCHIVIO` | `dataScatto` = `2026-09-14T08:31:39+02:00`, `scattoStimato` `NO` | ✓ |
| EXIF `2026:01:15 09:00:00` senza fuso, ordine byte `MM`, categoria `AVANZAMENTO` | `2026-01-15T09:00:00+01:00` (fuso del **giorno dello scatto**), `NO` | ✓ |
| La stessa foto, byte effettivamente inviati | **senza EXIF** (ricompressa) e ora **comunque corretta**: la lettura avviene prima | ✓ |
| Foto senza EXIF | ora di accodamento, `scattoStimato` `SI` | ✓ |
| EXIF `1970:01:01 00:00:00` | ora di accodamento, `SI` | ✓ |
| Scatto con la fotocamera dentro l'app | ora dell'istante dello scatto, `NO` | ✓ |

**Cosa questo NON dimostra:** la prova è su foto costruite, non su foto vere di un telefono vero. Sul campo restano da verificare **un iPhone** (che scrive l'ordine `MM` e spesso HEIC: in HEIC l'ora resta stimata) e **un Android** con l'ora regolata a mano. Il modo di verificarlo è quello solito: mandare una foto vecchia dalla galleria e confrontare `DataScatto` in raccolta con l'ora che il telefono mostra nella galleria — **non** con `Created`.

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

## 6. Il runbook del venerdì

Una volta a settimana, il venerdì, le foto di categoria `ARCHIVIO` vanno scaricate dalla raccolta e depositate nella **cartella di commessa sul server**. La procedura completa — passo per passo, con la quadratura e i casi ricorrenti — sta nel runbook `AppFotoCantiereRunbookVenerdi….md`, che **non è in questo repo**: vive su `L:` accanto al file di conoscenza di progetto, perché nomina percorsi del server interno. Si esegue in **Cowork**: `L:` è raggiungibile solo dalla rete di sede e nessun connettore cloud ci arriva, quindi Power Automate qui non c'entra.

**I percorsi di destinazione esistono e sono registrati.** Sono stati verificati sul server il 10/09/2026 e stanno, insieme alla regola sulle sottocartelle, nel **file di conoscenza di progetto su `L:`**. **Non si scrivono qui**: questo repo è pubblicato integralmente su GitHub Pages, e quelli sono percorsi del server interno. Chi esegue il runbook li ha già a disposizione; chi legge da fuori non deve averli.

Quello che vale la pena dire qui, perché riguarda il contratto e non il server:

- **le foto si smistano per FASE, e sotto per mese** (deciso il 15/09/2026): `[cartella foto della commessa]\[CodiceFase]\[AAAAMM]\`, dove il codice è quello in colonna `Fase` — senza spazi, e identico: **niente conversioni** (§4.4). È il motivo per cui la fase è obbligatoria sull'`ARCHIVIO` (§4.4): senza, una foto non saprebbe in quale cartella andare. La struttura precedente era `AAAA\AAAAMM`; le decisioni ancora aperte — quante sottocartelle creare e quando, il nome esatto delle cartelle, dove finiscono le foto già scaricate e i video — sono in capo a Francesco e vanno chiuse **prima** di creare qualunque cartella;
- le sottocartelle si calcolano su **`DataScatto`, non sulla data di scarico**. Una foto di fine settembre scaricata a ottobre appartiene a settembre: altrimenti le cartelle sul server smettono di corrispondere a quelle in SharePoint, e la quadratura del mese non funziona più. **Dalla 0.29.0 quel criterio è finalmente affidabile:** fino alla 0.28.0 `DataScatto` era l'ora dell'invio (§4.1), quindi una foto fatta il 30 e mandata il 1º finiva nel mese sbagliato — sia nelle cartelle del flow sia in quelle del runbook. Le foto entrate in raccolta **prima** della 0.29.0 restano archiviate con la data dell'invio: non si correggono a posteriori, ma vale la pena saperlo quando una foto sembra nel mese sbagliato;
- i **video** vanno in una sottocartella a parte, per non appesantire la cartella delle foto e i backup;
- si scarica **solo `ARCHIVIO`**. L'avanzamento serve a capirsi sul momento, non ha valore documentale e resta in raccolta.

### Il marcatore dello scarico: `DataScarico`, e nient'altro

**Deciso il 14/09/2026: si usa la colonna `DataScarico` (testo), non una colonna `Stato`.** La rev. 3 di questo documento proponeva uno `Stato` per analogia con le bolle: la proposta è ritirata.

Tre motivi:

1. **`DataScarico` esiste già**, insieme alla vista `Archivio da scaricare` che filtra sul suo essere vuota. Vuota = da scaricare; valorizzata = scaricata il… Costruire un secondo marcatore su qualcosa che funziona significa solo darsi due verità da tenere allineate;
2. **dice anche QUANDO**, cosa che uno stato non direbbe;
3. **il ciclo delle foto ha due soli esiti.** Nelle bolle `Stato` ha cinque valori perché lì la lavorazione ne ha davvero cinque; qui una foto è scaricata o non lo è. Copiare il meccanismo delle bolle avrebbe portato la complessità senza il problema che la giustifica.

⚠️ **Conseguenza da non perdere:** il runbook deve trovare **un solo marcatore**. Se un domani comparisse anche uno `Stato`, chi esegue non saprebbe quale guardare — ed è il tipo di ambiguità che si scopre quando una foto viene scaricata due volte, o mai.

### Cosa resta aperto

- **Quando si potano le foto dalla raccolta.** Oggi non si cancella niente: la raccolta è la copia di riferimento. Quando lo spazio diventerà un problema servirà una regola esplicita (per esempio: si cancellano le foto con `DataScarico` più vecchia di N mesi, mai quelle senza). Non è urgente, ma non è improvvisabile.
- **Le foto di `AVANZAMENTO`** restano in raccolta per sempre e nessuno le pota: vale lo stesso ragionamento.

## 7. Scelte di costruzione, e perché

- **Database separato** (`llitalia-foto`) da quello delle bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
- **Coda più semplice di quella delle bolle**, di proposito: niente storico permanente, niente miniature conservate. **Il progressivo invece c'è**, dall'11/09/2026 — e prima non c'era, per una scelta motivata così: «una bolla persa è un documento perso, una foto di cantiere non arrivata si riscatta». Il ragionamento era sbagliato in un punto: **riscattare una foto richiede di sapere che manca**, e a dirlo è solo un buco nella sequenza. Senza progressivo non esiste un controllo di continuità; esiste solo la speranza che tutto sia arrivato. Sequenza propria del modulo, che parte da 1 e non va confrontata con quella delle bolle.
- **Identità del dispositivo nella shell** (`core/dispositivo.js`): è l'identità del telefono, non di un modulo, e i due moduli la leggono da lì. Prima viveva nel database delle bolle, ed è da lì che viene **ereditata** sui telefoni già in uso: rigenerarla avrebbe fatto apparire in raccolta due dispositivi dove ce n'è uno, spezzando la sequenza delle bolle già inviate.
- **Conserva ultime N = 10** per default, contro le 20 delle bolle: le foto d'archivio non sono compresse e pesano.
- **Codice condiviso nella shell:** anagrafica cantieri (`core/cantieri.js`), normalizzazione dell'endpoint (`core/endpoint.js`), versione dell'app (`core/versione.js`), identità del dispositivo (`core/dispositivo.js`), configurazione via link (`core/configurazione-link.js`). Spostati lì in occasione di questo modulo: erano dentro Bolle, e copiarli avrebbe creato due verità destinate a divergere. Della configurazione via link cambiano solo i testi e le impostazioni di destinazione: il meccanismo — link nell'hash, QR, applicazione sul telefono che riceve — è uno solo, e la copia rimasta indietro sarebbe quella che perde un carattere della firma senza dirlo.
- **Compressione e anteprime duplicate** invece che condivise: il codice immagini di Bolle contiene anche il controllo di leggibilità, che è specifico delle bolle (misura se un testo è leggibile). Estrarlo avrebbe voluto dire rimaneggiare un file del modulo in produzione. Cinquanta righe duplicate sono un prezzo accettabile; da riunire quando entrambi i moduli saranno stabili.
- **Nessun controllo di leggibilità** in questo modulo: una foto di cantiere non è un foglio da leggere, e un avviso che scatta a caso viene ignorato sempre.
