# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 11 del 18/09/2026.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia **foto e video**, non legge nulla del contenuto. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> **Rev. 11 — fase nuova: `SistemazioneEsterna`** («Sistemazione esterna»), decisa da Francesco il 18/09/2026, dalla **0.36.1**. Senza livelli, quindi sul server va in `SistemazioneEsterna\[AAAAMM]\`. Le fasi diventano **27**, e i conteggi di §4.5 passano a 10 piano / 4 unità / 1 prospetto / **12 niente**. Master dell'anagrafica alla rev. 4, `versione` `202609182010`. Nota sul nome: «Sistemazione esterna» è **anche** un'attività della contabilità di gruppo — la coincidenza è nota e accettata, e si governa a valle qualificando il dominio in una colonna, non rinominando quello che l'operatore legge.
>
> **Rev. 10 — i LIVELLI dell'archivio** (§4.5), dalla **0.36.0**, decisi da Francesco il 18/09/2026. Sotto la fase l'archivio di commessa guadagna un livello, e dove quel livello è obbligatorio **sostituisce la cartella del mese** (§6). Quattro cose nel contratto: (1) per le **urbanizzazioni** (`SNU`, `BRU`) il **lotto prende il posto della fase** e viaggia nello stesso campo `fase` col suo codice (`Lotto2`); (2) tre campi nuovi — **`piano`**, **`unita`**, **`prospetto`** — codici senza spazi, `null` dove non si applicano e **mai stringa vuota**; (3) con l'unità il **piano non si chiede**: si ricava dalla mappa dell'anagrafica e si manda comunque; (4) **servono tre colonne nuove in raccolta** (§5). Più due cose che il contratto non tocca: **«Rimanda» su ogni elemento inviato** (§2, due casi distinti) e l'**avviso sulle foto senza data di scatto** (§4.1). L'anagrafica di piani, unità, prospetti e lotti sta in `core/anagrafica.js`, è la **copia di un master su `L:`** e si sostituisce in blocco: la sua `versione` compare nella pagina Informazioni. Rev. 9 — **sette commesse selezionabili** (erano tre): `BRU`, `MAR`, `MNG`, `MRS`, `SNU`, `SNZ2.1`, `SNZ2.2`, in `core/cantieri.js`, menù in ordine alfabetico di codice imposto da un `sort()`. Il campo `commessa` non cambia forma — viaggia il solo codice — e nessun campo nuovo entra nel contratto: il lato ricevente deriva la cartella dal codice con una regola. Dalla **0.35.0**. Rev. 8 — la fase viaggia come CODICE senza spazi (§4.4): in colonna e nel nome della cartella sul server c'è `FinituraAlloggi`, a video l'operatore legge «Finitura alloggi». Dalla **0.34.0**. Rev. 7 — la fase è OBBLIGATORIA per la categoria `ARCHIVIO` (§4.4), dalla **0.33.0**: quelle foto sul server vanno nella **cartella della fase** (§6), e senza fase non saprebbero dove andare. Per l'`AVANZAMENTO` resta facoltativa. Rev. 6 — campo `fase` (§4, §4.4): la fase di lavoro a cui la foto si attribuisce, da elenco chiuso di gruppo; **serve una colonna `Fase` in raccolta** (§5). Dalla **0.31.0**. Rev. 5 — `dataScatto` è finalmente l'ora dello scatto (§4.1): fino alla 0.28.0 era l'ora dell'invio, misurato in produzione il 14/09. Dalla **0.29.0** l'app legge l'ora dall'EXIF della foto originale e, quando non ci riesce, lo **dichiara** con il campo nuovo `scattoStimato`. **Serve una colonna nuova in raccolta** (§5). Rev. 4 — esiti del collaudo del 14/09 (§5), marcatore dello scarico deciso e percorsi di destinazione non più «mancanti» (§6). Rev. 3 — riallineata al collaudo del ricevente (`docs/FotoCantiereBriefingRicevente.md`, 10/09/2026 sera): raccolta e flow esistono e sono collaudati, `DataScatto` viaggia come 12 cifre, i campi numerici vogliono un numero vero, le foto portano `idDispositivo` e `progressivo`, il caricamento a blocchi resta fermo. **Dove questo documento e il briefing divergessero ancora, fa fede il briefing:** lì c'è ciò che è stato misurato sul tenant.
>
> ⚠️ **Due punti aperti:** l'apertura della sessione di caricamento a blocchi, che il tenant oggi rifiuta (§4-bis); e l'ora di ripresa dei **video**, che non sta nell'EXIF e per ora resta stimata (§4.1).
>
> ✅ **Il lato ricevente è pronto per le foto, dal 18/09/2026 ore 16:05.** Le tre colonne esistono in `FotoCantiere` (testo 255, non obbligatorie, nome interno identico al visualizzato) e il flow le mappa su `triggerBody()?['piano']`, `['unita']`, `['prospetto']`. Verificato con un invio vero: le colonne di sempre si compilano, le tre nuove arrivano `null` — cioè il ramo regge, **ma l'aggancio quando i campi ci sono resta da dimostrare**, e lo dimostra il primo invio dalla 0.36.0. Per questo il rilascio si fa **presidiato**, guardando la prima foto di ognuna delle quattro famiglie: piano, unità, prospetto, nessun livello.
>
> 🔴 **`BolleInArrivo` non ha quelle colonne e non le prende.** Conseguenza: **il modulo Bolle non chiede i livelli e non li manda** — vedi la specifica Bolle, rev. 6. Il lotto invece sì, perché viaggia nel campo `fase`. Resta aperto lo smistamento del venerdì (§6): finché non è riscritto, i livelli arrivano in raccolta e nessuno li usa — le foto però sono a posto, e si smistano appena il runbook c'è. La destinazione del runbook del venerdì **non è** fra i punti aperti: i percorsi esistono, sono verificati e registrati fuori da questo repo (§6).

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
2. **Cantiere** (obbligatorio) — stessa anagrafica del modulo Bolle, che vive in `core/cantieri.js`: **un solo elenco per tutta l'app**, perché due elenchi separati potrebbero divergere e una commessa presente in un modulo e assente nell'altro è un dato sbagliato che arriva a destinazione senza far rumore. **Sette commesse dal 16/09/2026** — `BRU`, `MAR`, `MNG`, `MRS`, `SNU`, `SNZ2.1`, `SNZ2.2` — in ordine alfabetico di codice.
   **Fase di lavoro** — elenco chiuso di gruppo in `core/fasi.js` più «nessuna fase», lo stesso delle bolle, ultima scelta preselezionata. **Obbligatoria se fra le foto in attesa ce n'è almeno una `ARCHIVIO`**, facoltativa altrimenti (§4.4). Per un'urbanizzazione il campo si chiama **Lotto** e mostra i lotti di quella commessa al posto delle fasi (§4.5). Una commessa senza piani interrati non vede la fase `Interrato`.
   **Piano**, **Unità**, **Prospetto** — compaiono **solo dove la fase li pretende**, e dove compaiono sono obbligatori: non esistono livelli facoltativi (§4.5). Con l'unità il piano non si chiede — lo ricava l'app — ma si legge sotto il menù, perché l'operatore non l'ha scelto e vederlo è il solo modo che ha di accorgersi se non torna. **Nessuno dei tre è preselezionato:** un livello è il nome di una cartella sul server, e una scelta preselezionata che nessuno guarda archivia la foto nell'appartamento sbagliato senza fare rumore. Costa un tocco per invio, non per foto.
3. **Scatta foto** — apre la **fotocamera dentro l'app** (`core/fotocamera.js`, la stessa del modulo Bolle): si scatta più volte di fila senza uscire, con rullino e contatore, poi *Fine*. Accanto restano **Usa la fotocamera del telefono** e **Scegli dalla galleria** (multi-foto). Anteprime rimovibili, ognuna con categoria e peso reale del file che partirà.
   Qui gli scatti di una sessione **non** vengono raggruppati: ogni foto è una foto. Il gesto però è identico a quello delle bolle, così chi usa l'app impara una sola cosa.
4. **Nota** (facoltativa, max 255 caratteri) — vale per tutte le foto di quell'invio. Si svuota dopo l'invio, perché la nota successiva è un'altra cosa.
5. **Invia** — resta disabilitato finché non c'è almeno una foto e un cantiere, e finché manca la fase se fra le foto in attesa ce n'è una da archiviare. L'avviso accanto al pulsante dice cosa manca e perché.
6. **Rimanda** — sotto ogni elemento **già inviato**, foto e bolle, per qualunque motivo: foto venuta male, dato sbagliato, o il dubbio che non sia arrivata. Prima esisteva solo per le bolle, solo dallo storico, e solo per correggere il cantiere. Si apre un riquadro con i campi dell'invio già compilati, e il pulsante **dice quale delle due cose sta per fare**, perché in raccolta sono due cose diverse:
   - **«Rimanda la stessa»** (niente modificato) → **stesso `idClient` e stesso progressivo**. Il flow riconosce il duplicato, risponde `gia_presente` e non crea un secondo file; l'app scrive *«Era già in raccolta: nessun doppione creato»*. Non conta fra le «inviate oggi», perché in raccolta non è arrivato niente di nuovo — e quel contatore serve a essere confrontato coi file atterrati.
   - **«Rimanda corretta»** (cantiere, fase, livelli o nota cambiati) → **`idClient` nuovo e progressivo nuovo**: è un invio nuovo a tutti gli effetti. Quella già mandata resta in raccolta e **va annullata dall'ufficio**: il telefono non può saperlo se è già stata lavorata. L'ora dello scatto resta quella della foto — rimandarla non la riscatta.
7. **Coda invii** con gli stati e i contatori del giorno, come in Bolle. Ogni riga porta il **numero progressivo** (`n. 47`), che si legge a voce quando l'ufficio segnala un buco nella sequenza. Gli stati usano le classi del design system della shell: quelle sbagliate — e per un giorno lo sono state — fanno uscire «Inviata» senza colore, cioè senza conferma visiva che la foto sia arrivata.

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
  "commessa": "MAR",                  // solo il codice; sette commesse dal 16/09/2026
  "fase": "FinituraAlloggi",          // CODICE della fase senza spazi (§4.4);
                                      //   per SNU e BRU qui c'è il LOTTO: "Lotto2" (§4.5)
  "piano": "P1",                      // livelli dell'archivio (§4.5), codici senza spazi.
  "unita": "1A",                      //   null dove il livello non si applica,
  "prospetto": null,                  //   MAI stringa vuota
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
  "versioneApp": "0.36.0",
  "nomeFile": "…",                    // IGNORATO dal backend: lo compone il flow
  "contenutoBase64": "…" }
```

**Attenzione, il campo si chiama `dataScatto`** — non `dataInvio` come nelle bolle. Nelle bolle il nome del campo e quello della colonna divergono per un incidente storico; qui nascono uguali. **Non dare per scontata la simmetria fra i due contratti.**

### 4.1 `dataScatto`: quando la foto è stata FATTA

#### Il difetto, misurato in produzione il 14/09/2026

Fino alla **0.28.0** `dataScatto` non era l'ora dello scatto: era **l'ora dell'invio**. L'app scriveva l'orologio del momento in cui la foto entrava in coda, e lo mandava sotto quel nome.

La prova: due foto `ARCHIVIO` della commessa SNZ2.2 sono in raccolta con `DataScatto` **202609140915 tutt'e due**, mentre l'EXIF dei file originali dice `DateTimeOriginal` **2026:09:14 08:31:39** e **08:31:42**. Tre secondi di distanza diventati zero, e **quarantaquattro minuti** di scarto dal vero.

Perché è grave: per l'archivio di commessa **l'ora dello scatto è il dato**, ed è il criterio con cui il flow sceglie le cartelle `AAAA/AAAAMM`. Una foto fatta il 30 del mese e mandata il 1º del mese dopo finiva nella cartella sbagliata. E soprattutto **non faceva rumore**: in colonna si legge un'ora plausibile, e nessuno ha modo di accorgersi che è l'ora sbagliata.

#### Da dove viene l'ora, dalla 0.36.0

**Conta da dove arriva il file, e non solo cosa c'è scritto dentro.** È l'unica cosa che distingue «scattata adesso, su richiesta dell'app» da «scelta dalla galleria, e può essere di tre mesi fa»: nel primo caso l'ora del file dista secondi dallo scatto anche senza EXIF, nel secondo non dista niente di conoscibile.

| Come arriva la foto | Ora usata | `scattoStimato` |
|---|---|---|
| Scattata con la fotocamera **dentro l'app** | l'orologio del telefono **all'istante dello scatto** (il file nasce lì: nessun EXIF da leggere, e nessuno da cercare) | `NO` |
| Scattata con la fotocamera **del telefono aperta dall'app** — e l'EXIF c'è | `DateTimeOriginal` (tag EXIF `0x9003`) letto dal file **originale** | `NO` |
| Scattata con la fotocamera **del telefono aperta dall'app** — e l'EXIF manca | la data del file: la foto è di un istante fa, lo scarto è di secondi | `NO` |
| **Scelta dalla galleria** — e l'EXIF c'è | `DateTimeOriginal` dal file originale | `NO` |
| **Scelta dalla galleria** — e l'EXIF manca, o la data è assurda | **la foto NON entra in coda:** l'app avvisa e chiede (vedi sotto). Mandata comunque: la data del file se plausibile, altrimenti l'ora dell'invio | `SI` |
| **Video** | l'ora di accodamento — punto aperto, vedi sotto | `SI` |

#### Le copie ridotte, e perché si fermano (dalla 0.36.0)

**Il caso, misurato il 17/09/2026.** Cinque foto scelte dalla galleria erano **copie ridotte** — Google Foto dopo «Libera spazio», oppure WhatsApp — con lato lungo 1600 px e **nessun EXIF**. L'app ha stimato `dataScatto` = ora dell'invio, e in archivio sono finite con un'ora falsa nel nome. Se scatto e invio cadono in due mesi diversi, la foto finisce **nel mese sbagliato** e non se ne accorge nessuno: la stima è plausibile, e lo `scattoStimato` = `SI` lo dice a chi va a guardare — cioè a nessuno, prima che sia tardi.

**Cosa fa l'app adesso.** Un file di galleria senza `DateTimeOriginal` **non entra in coda**. Compare un avviso, con la via d'uscita giusta **per prima**: *«Questa foto non ha la data di scatto. Cerca l'originale nell'album Fotocamera: lì la data c'è»*, e sotto le due azioni — *Aggiungi comunque* e *Cerco l'originale*. Non è un blocco: in cantiere non si può fermare qualcuno su un file che non tornerà. È una scelta consapevole al posto di una stima silenziosa.

Se si manda comunque: **`dataScatto` = data del file** (`lastModified`) quando è plausibile — **non nel futuro e non prima del 2020** — altrimenti l'ora dell'invio; `scattoStimato` = `SI` in ogni caso. La data del file è quasi sempre molto più vicina allo scatto dell'ora in cui si preme Invia: una copia ridotta viene creata poco dopo lo scatto e conserva quella.

**Non si perde niente a fermarle:** un file scelto dalla galleria è ancora nella galleria. Le foto **scattate** dall'app non passano mai da qui — quelle l'ora ce l'hanno.

Una data EXIF **assurda** (l'orologio mai impostato: `1970`, `2001`, `2008`) vale come assente e segue la stessa strada. Il tag c'è, il valore no.

**La lettura avviene PRIMA di qualunque ricodifica.** Non è un dettaglio di ordine: la preparazione dell'`AVANZAMENTO` (2500 px, qualità 0,85) passa per un canvas, e dal canvas l'EXIF non esce. Leggerlo dopo vorrebbe dire non leggerlo mai — e il difetto sarebbe tornato su una categoria sola, che è il modo più efficace di non accorgersene.

**Niente libreria EXIF**: lo stack è vincolato e qui non serve. Si leggono i primi 128 KB del file e si scandiscono i marcatori JPEG fino all'APP1 (`core/exif.js`, ~150 righe). Il contenuto della foto non viene toccato.

#### Il fuso

Se la foto porta anche `OffsetTimeOriginal` (tag `0x9011`), **il fuso è quello**: è il fuso in cui la foto è stata scattata, e vince su quello del telefono che sta inviando.

Se non c'è — e su molti telefoni non c'è — le cifre si leggono come **ora locale del dispositivo**, con il fuso in vigore **quel giorno** (a gennaio in Italia `+01:00`, a settembre `+02:00`: applicare il fuso di oggi a una foto di sei mesi fa sposterebbe di un'ora). **Non si interpretano mai come UTC:** l'EXIF non ha un fuso implicito, e leggerlo come UTC sposterebbe indietro di due ore ogni foto italiana. Nel caso peggiore, con l'ora locale, sbaglia solo una foto arrivata da un altro fuso; leggendo UTC sbaglierebbero tutte.

#### `scattoStimato`: `SI` / `NO`

Campo **nuovo dalla 0.29.0**, testo, sempre presente. Vale `NO` quando l'ora è stata misurata e `SI` quando è un ripiego, cioè quando in `dataScatto` non c'è l'ora dello scatto perché non si è potuta sapere.

**Dalla 0.36.0 il confine è più netto:** `NO` copre tutte le foto **scattate** — dentro l'app o con la fotocamera del telefono aperta dall'app — e tutte quelle che portano l'EXIF; `SI` resta alle **copie senza data** (e ai video, punto aperto). I due casi prima si confondevano, e in colonna si leggevano uguali.

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

**Per le urbanizzazioni il LOTTO prende il posto della fase (dalla 0.36.0).** Su `SNU` e `BRU` il menù non mostra le fasi ma i lotti di quella commessa — `Lotto1`…`Lotto4` per SNU, `Lotto1`…`Lotto3` per BRU — e il valore viaggia **nello stesso campo `fase`**, col suo codice senza spazi, come `FinituraAlloggi`. A valle è sempre la stessa cosa: la cartella immediatamente sotto la commessa. A video l'etichetta ha lo spazio («Lotto 2»), nel campo no. Il selettore è **condiviso col modulo Bolle**, quindi anche una bolla di SNU prende il lotto: è voluto.

**Un filtro sulle fasi (dalla 0.36.0).** Una commessa senza piani interrati **non vede la fase `Interrato`** — è il caso di `MAR`: offrirla vorrebbe dire offrire una cartella che non esisterà mai. Una commessa **senza anagrafica** (le concluse `SNZ2.1` e `MRS`, o una nuova) non si filtra: non sapere com'è fatta non è un motivo per togliere voci a chi sta scattando.

**Codice ed etichetta (dalla 0.34.0).** Come per i cantieri e per le categorie, viaggia il **codice** — senza spazi, PascalCase — mentre a video l'operatore legge l'**etichetta**. Il motivo è lo smistamento sul server (§6): le cartelle non hanno spazi nel nome, e **il codice È il nome della cartella**, senza tabelle di conversione fra colonna e cartella da tenere allineate. Le 27 fasi, `codice` = `etichetta` dove coincidono:

| Codice (in colonna e cartella) | Etichetta (a video) |
|---|---|
| `Bonifica` · `Cantiere` · `Consolidamento` · `Demolizione` · `Extra` · `Impermeabilizzazioni` · `Interrato` · `Marketing` · `Murature` · `Ponteggio` · `Scavi` · `Strutture` · `Urbanizzazioni` | identiche al codice |
| `SistemazioneEsterna` | Sistemazione esterna |
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

### 4.5 I livelli dell'archivio: `piano`, `unita`, `prospetto`

Tre campi **nuovi dalla 0.36.0**, decisi da Francesco il 18/09/2026. Sotto la fase l'archivio di commessa guadagna un livello, e **dove quel livello è obbligatorio sostituisce la cartella del mese** (§6):

```
Bonifica\202609\<file>                  fase senza livelli: resta il mese
Strutture\P1\<file>                     piano obbligatorio
FinituraAlloggi\P1\1.01\<file>          unità obbligatoria, piano derivato
FinituraFacciata\Nord\<file>            prospetto obbligatorio
Lotto2\202609\<file>                    urbanizzazioni: il lotto fa da fase
```

**Non esistono livelli facoltativi: ogni fase o pretende il livello, o non lo chiede.** È la regola che rende il percorso calcolabile senza eccezioni, e il motivo per cui la tabella ha tre valori e non quattro. Delle 27 fasi: **10 vogliono il piano, 4 l'unità, 1 il prospetto** (`FinituraFacciata`), **12 niente**.

| Valore in anagrafica | Cosa fa l'app |
|---|---|
| `O` — obbligatorio | il menù compare e **senza la scelta non si invia**: Invia resta spento e l'avviso dice cosa manca |
| `D` — derivato | il menù **non** compare: il valore si ricava dall'anagrafica e **viaggia comunque** |
| `-` | il menù non compare e il campo **non viaggia**: arriva `null` |

**Il piano derivato.** Dove la fase pretende l'unità (`FinituraAlloggi`, `ImpiantoElettricoAlloggi`, `ImpiantoIdrosanitario`, `ImpiantoTermicoAlloggi`) il piano è `D`: non si chiede — sarebbe un tocco in più per un dato che l'unità già determina — ma si manda, perché il percorso a valle è `[Fase]\[Piano]\[Unità]\` e senza il piano la cartella non si costruisce.

⚠️ **La mappa unità → piano NON si deduce dal codice dell'unità.** Le commesse numerano diversamente: `1.01` in MAR, `1A` in MNG e in SNZ2.2. Una regola «primo carattere» funzionerebbe su `1A` → `P1` e **sbaglierebbe su `10A`**, che sta al `P10` e finirebbe al `P1` — in una cartella che esiste, nell'appartamento di un altro. Si legge dalla mappa, sempre. Il collaudo `15-livelli.js` prova proprio `10A`, perché è il caso su cui le due strade danno risultati diversi.

**Il filtro sui piani.** Per la fase `Interrato` l'app offre **solo i piani con ordine negativo**: «Interrato, piano terzo» è una scelta che non vuol dire niente, e in cartella diventerebbe un percorso che nessuno cerca.

**`null`, mai stringa vuota.** Dove il livello non si applica il campo arriva `null` e non `''`. Vale la regola già registrata dei campi vuoti: una colonna con `''` somiglia a un dato e non lo è, e sui campi numerici una stringa vuota è già costata venti foto entrate senza colonne il 10/09. I tre campi **viaggiano sempre**, anche quando valgono `null`: un campo assente e un campo nullo si comportano diversamente in un flow, e meglio uno solo dei due casi.

**Commesse senza anagrafica.** `SNZ2.1` e `MRS` sono concluse e in anagrafica non ci sono; una commessa nuova non ce l'ha ancora. Per loro non c'è nessun livello da offrire: le fasi restano tutte disponibili e i tre campi arrivano `null`. A valle la foto finisce nella cartella del mese con un'anomalia — **voluto**: non si blocca chi sta scattando in cantiere per un dato che manca in ufficio.

**Dove vive l'elenco delle fasi: due posti, e uno solo li tiene insieme.** Dentro l'app le fasi stanno in `core/fasi.js` — quali sono, con codice ed etichetta — e in `core/anagrafica.js`, nella tabella `livelliPerFase` — cosa ognuna pretende. Non sono due copie della stessa lista: sono **due fatti diversi** sulla stessa lista, e per questo stanno separati. Ma le chiavi devono combaciare, e una divergenza **non farebbe rumore**: una fase presente in `fasi.js` e assente in `livelliPerFase` risulta «senza livelli», quindi si può scegliere, la foto parte, e finisce nella cartella del mese invece che in quella del piano. Dal 18/09/2026 la coerenza fra i due è **collaudata** (`15-livelli.js`): ogni fase ha la sua riga, l'anagrafica non ha righe per fasi che non esistono, e l'ordine è alfabetico. Chi aggiunge una fase tocca quindi **due file**, e se ne dimentica uno il collaudo lo dice.

**Dove sta l'anagrafica.** In `core/anagrafica.js`, accanto a `cantieri.js` e `fasi.js`: piani con etichetta e ordine, unità per piano con le loro etichette, prospetti, lotti, e la tabella `livelliPerFase`. **È dato, non logica**, ed è la copia di un master che vive su `L:`: si sostituisce in blocco quando cambia, non si corregge una voce a mano. Il campo `versione` (`202609181330`) compare nella pagina **Informazioni**: quando l'ufficio dice «ho aggiornato piani e unità», quel numero è la risposta.

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
| `Piano` | Riga di testo singola (255) | `piano` — **esiste dal 18/09/2026 ore 16:05**, vedi §4.5. Codice senza spazi (`P1`, `P-2`, `P10`), che è anche il nome della cartella. Vuota dove la fase non prevede il piano |
| `Unita` | Riga di testo singola (255) | `unita` — **esiste dal 18/09/2026 ore 16:05**, vedi §4.5. Nome interno senza accento. Codice così com'è in anagrafica (`1.01` su MAR, `1A` su MNG): **niente normalizzazioni**, il punto fa parte del codice |
| `Prospetto` | Riga di testo singola (255) | `prospetto` — **esiste dal 18/09/2026 ore 16:05**, vedi §4.5. `Nord`, `Sud`, `Est` o `Ovest`; valorizzata solo su `FinituraFacciata` |

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

### Rilascio 0.36.0 — i livelli dell'archivio

**Stato al 18/09/2026 ore 16:05.**

1. ✅ **Tre colonne in `FotoCantiere`** — `Piano`, `Unita`, `Prospetto`, testo 255, non obbligatorie, nome interno identico al visualizzato. **Fatte.**
2. ✅ **Tre mappature in `Update file properties`** — `triggerBody()?['piano']`, `['unita']`, `['prospetto']`. **Fatte**, e verificate con un invio vero: le tre colonne arrivano `null`, che è il comportamento giusto per una 0.35.0 che non manda quei campi. **Che la mappatura agganci quando i campi ci sono lo dimostra il primo invio dalla 0.36.0**, non questo: un `null` che arriva da un campo assente e un `null` che arriva da una mappatura rotta si leggono uguali.
3. ❌ **In `BolleInArrivo` NON si aggiungono.** Deciso il 18/09: quelle colonne non ci sono e non ci saranno, quindi il modulo Bolle **non chiede i livelli e non li manda** (specifica Bolle, rev. 6). Un campo che arriva e viene scartato in silenzio è peggio di un campo che non parte — peggio ancora se per sceglierlo l'operatore si è fermato.
4. ⏳ **Lo smistamento del runbook del venerdì** va riscritto secondo la tabella di §6: dove il livello c'è, **sostituisce la cartella del mese**. **Aperto.** Non blocca il rilascio: finché non c'è, i livelli restano in raccolta senza essere usati.

🔴 **Il rilascio si fa presidiato.** La prova dell'aggancio è la prima foto di **ognuna delle quattro famiglie** — una con il piano, una con l'unità, una con il prospetto, una senza livelli — guardata in raccolta subito dopo l'invio. Tre famiglie su quattro non bastano: una mappatura può agganciare su un campo e non sull'altro, e la famiglia «senza livelli» è quella che dimostra che il `null` non rompe la scrittura delle altre colonne.

⚠️ **Niente conversioni sui codici.** `1.01` resta `1.01` col punto, `P-2` resta `P-2` col segno. Quello che arriva in colonna **è** il nome della cartella: è la scelta che evita una tabella di corrispondenza fra due posti, che il giorno che si aggiunge un piano si disallinea in silenzio.

Provato in locale coi collaudi automatici del repo (`15-livelli.js`, `16-rimanda.js`), sui numeri:

| Caso | Atteso | Esito |
|---|---|---|
| SNU e BRU, menù della fase | 4 e 3 lotti, etichetta del campo «Lotto» | ✓ |
| `MAR`, elenco delle fasi | 25 voci: `Interrato` non c'è (MAR non ha interrati) | ✓ |
| `MNG` + `Interrato`, piani offerti | solo `P-2` e `P-1` | ✓ |
| `MAR` + `Strutture` senza piano scelto | Invia spento, avviso «Scegli il piano per inviare» | ✓ |
| `MNG` + `FinituraAlloggi` + unità `1A` | `unita` `1A` e `piano` `P1` **derivato** | ✓ |
| `SNZ2.2` + `FinituraAlloggi` + unità **`10A`** | `piano` **`P10`**, non `P1` | ✓ |
| `MAR` + `FinituraAlloggi` + unità `1.01` | `piano` `P1`, punto del codice intatto | ✓ |
| `MRS` (senza anagrafica) + `Strutture` | nessun menù di livello, tre campi `null`, invio permesso | ✓ |
| Tutti gli invii del collaudo | i tre campi sono un codice **oppure `null`, mai `""`** | ✓ |
| «Rimanda la stessa» | stesso `idClient` e stesso progressivo, `gia_presente`, **zero file in più** | ✓ |
| «Rimanda corretta» | `idClient` e progressivo nuovi, livelli corretti, piano ricalcolato | ✓ |
| Copia di galleria senza EXIF, data del file ad agosto | fermata con avviso; mandata comunque, `dataScatto` di **agosto** e non di oggi | ✓ |

**Cosa questo NON dimostra:** niente di quello che succede dopo l'endpoint. Il flow qui è finto, e la sua guardia sui duplicati è una simulazione di quella vera. Resta da verificare sul tenant, sui numeri: che le tre colonne si popolino, che `1.01` e `P-2` arrivino intatti, e che il runbook costruisca il percorso giusto. La prova è quella solita — si manda una foto e si guarda cosa atterra.

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

- **le foto si smistano per FASE, e sotto per LIVELLO o per mese** (fase e mese decisi il 15/09/2026, il livello il 18/09/2026). La regola è una sola, e dipende da cosa la fase pretende (§4.5):

  | Cosa pretende la fase | Percorso sotto la cartella foto della commessa |
  |---|---|
  | niente (11 fasi) | `[CodiceFase]\[AAAAMM]\` |
  | il piano (10 fasi) | `[CodiceFase]\[Piano]\` |
  | l'unità (4 fasi) | `[CodiceFase]\[Piano]\[Unità]\` |
  | il prospetto (`FinituraFacciata`) | `[CodiceFase]\[Prospetto]\` |
  | urbanizzazioni (`SNU`, `BRU`) | `[CodiceLotto]\[AAAAMM]\` — il lotto arriva in colonna `Fase` |

  **Dove il livello c'è, SOSTITUISCE la cartella del mese**: non si annida sotto. I codici sono quelli in colonna, **senza spazi e identici**: niente conversioni, né sui codici di fase (§4.4) né su quelli dei livelli (§4.5) — `1.01` resta `1.01`, punto compreso. Una foto `ARCHIVIO` di una commessa **senza anagrafica** (§4.5) arriva coi tre livelli vuoti: finisce nella cartella del mese, e **va segnalata come anomalia** invece di essere indovinata. Le decisioni ancora aperte — quante sottocartelle creare e quando, il nome esatto delle cartelle, dove finiscono le foto già scaricate e i video — sono in capo a Francesco e vanno chiuse **prima** di creare qualunque cartella;
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
