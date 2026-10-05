# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 17 del 05/10/2026.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia **foto e video**, non legge nulla del contenuto. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> **Rev. 17 — un livello con una voce sola non si chiede (0.37.7).** Se un livello obbligatorio ha una sola voce possibile — oggi solo SNZ2.2 in fase `Interrato`, piano `P-1` — il menù non compare: l'app la sceglie, la scrive a video e la manda. Da due voci in su si chiede sempre, e il valore messo dall'app non si porta dietro quando si cambia fase (§4.5). Contratto invariato.
>
> **Rev. 16 — il telefono che non lascia leggere una foto (0.37.4).** Due foto valide rifiutate a mezzogiorno e partite la sera senza toccarle: a fallire era la **lettura** del file, non il file. Tre correzioni in §4.1 — **una lettura sola, subito** (i byte si leggono una volta e quella copia serve per tutto il resto), **quattro tentativi** a 0,5/1,5/3 s, e l'avviso che **segue il caso**: «il telefono non ha lasciato leggere questa foto», con «Riprova» e **senza** «Aggiungi comunque». Da qui una regola generale: **la frase in testa è quella del caso**, e i file messi da parte si raggruppano per quello che l'operatore deve fare. In §4.1 anche il ripiego di «Scatta» sulla fotocamera di sistema, che spiega un file in raccolta senza firma del canvas. Il contratto **non cambia**.
>
> **Rev. 15 — un JPEG si riconosce dai byte (0.37.3).** `preparaImmagine` decideva «già JPEG» dal `type` del file, la lettura dell'ora dai byte: due fonti, due risposte diverse sullo stesso file. Un JPEG con `type` `''` o `application/octet-stream` — su Android succede — veniva **ricodificato in silenzio**, e in archivio finivano byte diversi dall'originale senza nessun errore. Ora la firma `FF D8 FF` sta in un posto solo e la chiedono lì tutti e due (§3). Conseguenza dichiarata: per le foto il `mimeType` del payload è sempre `image/jpeg` e non si prende più dal `type`. Nel §3 anche **come si riconosce, dai byte, da dove arriva un JPEG in raccolta**.
>
> **Rev. 14 — la diagnosi a video (0.37.2).** Quando una foto si ferma perché non ha la data di scatto, l'avviso dice adesso **per ogni file quale dei nove casi è**, in italiano, e accanto i fatti misurati: se è un JPEG, quanti byte si sono letti, quali segmenti si sono visti (§4.1). Motivo: il 30/09 uno screenshot di tre foto messe da parte insieme non distingueva «non c'è nessun EXIF» da «l'EXIF c'è ma senza data» — due cause con due correzioni diverse, e una frase sola per tutte. **«Non è un JPEG» diventa un caso a sé** (prima ricadeva in «nessun blocco EXIF»): a chi manda un HEIC dire che nel file non ci sono i dati della fotocamera è falso. Il contratto **non cambia**: il motivo sta a video, nel payload non entra.
>
> **Rev. 13 — quattro punti CHIUSI e un difetto corretto (0.37.1).** I quattro «resta aperto» che questo documento si trascinava dietro sono chiusi con riscontri sul campo, e stanno in §0: vanno letti prima di riaprirli. Il difetto: un invio interrotto restava su «Invio in corso» per sempre — sette giorni sul telefono di Francesco, mai arrivato, segnalato ogni giorno come buco di continuità. Corretto in §4-ter. **Rettifica del 18/09:** il «rilascio che non arriva ai telefoni» non è mai stato osservato — la lettura che lo faceva credere era una copia servita dalla cache, non il contenuto del commit. Nel repo le due costanti di versione erano allineate e il collaudo che le confronta esisteva già. Da allora un riscontro del pubblicato si fa scavalcando la cache (`collaudi/pubblicato.js` lo fa con `no-store`), e una differenza si attribuisce a un commit solo leggendo il commit.
>
> **Rev. 12 — via la categoria: TUTTO va in archivio**, deciso da Francesco il 29/09/2026, dalla **0.37.0**. La distinzione Avanzamento / Archivio non ha più senso: quello che si manda dall'app è documentazione, e per le urgenze si usa WhatsApp. Conseguenze: (1) **nel modulo non c'è più niente da scegliere sul tipo di foto** (§2); (2) **sparisce la compressione a 2500 px** — ogni immagine parte a risoluzione originale (§3); (3) la **fase diventa obbligatoria su ogni invio** del modulo Foto, e non più solo sull'archivio (§4.4); (4) **il campo `tipo` RESTA nel contratto**, sempre valorizzato `ARCHIVIO` (§4). Il punto (4) è quello da non sbagliare: il flow compone il nome del file da `tipo` e lo script archiviatore prende solo gli elementi con `Tipo = ARCHIVIO` — un invio con `tipo` vuoto atterrerebbe in raccolta e ci resterebbe per sempre, senza nessun errore. Si è tolta la scelta, non il campo, e l'invio ha anche un ripiego su quel valore. **Il contratto non cambia in nient'altro:** nessun campo rinominato, nessun campo tolto, e un telefono non ancora aggiornato continua a mandare `AVANZAMENTO` senza errori.
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

## 0. Punti chiusi — non riaprirli senza leggere qui

Quattro cose che questo documento ha elencato per settimane fra quelle aperte. **Sono chiuse**, con riscontri fatti sul campo, e la data del riscontro è il motivo per cui non vanno rimesse in coda.

| Punto | Stato | Riscontro |
|---|---|---|
| Verifica dei **livelli** sul campo | **chiuso** | Foto vere: `P1`+`1A` e `Nord` il 18/09, `P-1` il 22/09, `P0` il 23/09, `P4` il 28/09, `Lotto1` senza livelli il 24/09. Tutte lette nelle colonne `Piano`/`Unita`/`Prospetto` e riportate nel registro; tutte depositate nella cartella giusta. |
| **Runbook del venerdì** per la struttura a livelli | **chiuso** | Recepita dalla rev. 15 del runbook, 18/09. |
| Colonna **`Fase`** in raccolta | **chiuso** | Esiste in `FotoCantiere` **e** in `BolleInArrivo`, verificata via REST il 18/09, compilata su tutti gli elementi recenti. |
| Risposta del flow ai **doppioni** | **chiuso** | Il corpo è `{"esito": "gia_presente", "idClient": "<idClient>"}`. Provato sul campo il 29/09: il n. 55, rimandato, ha mostrato «Era già in raccolta: nessun doppione creato» e sul server non è nato nessun file nuovo. |

Sull'ultimo punto, una conseguenza che vale oltre il suo caso: **rimandare un elemento è sicuro**, perché il flow riconosce un `idClient` già visto. È il presupposto su cui si regge la ripartenza automatica degli invii interrotti (§4-ter) — senza quella garanzia, la scelta sarebbe stata un'altra.

Sul riconoscimento lato app: l'`esito` si legge cercando la stringa `gia_presente` nel corpo, non il nome del campo. Ora che la forma è nota il controllo si potrebbe stringere; resta com'è perché una lettura più larga non sbaglia mai in modo pericoloso — al massimo non riconosce un caso, e allora la foto risulta semplicemente inviata.

## 1. A cosa serve

Chi è in cantiere fotografa e manda in ufficio, e quello che manda è **documentazione**: finisce nella cartella di commessa sul server.

**Dal 29/09/2026 non c'è più una categoria da scegliere.** Fino alla 0.36.1 le foto erano di due tipi — `AVANZAMENTO`, da guardare e commentare, e `ARCHIVIO`, da conservare — con due trattamenti diversi dell'immagine. La distinzione è stata tolta da Francesco: **tutto quello che parte da questa app va in archivio**, e per dire «guarda a che punto siamo» si usa WhatsApp, che è dove quelle foto venivano già guardate.

Cosa cambia in pratica: un campo in meno da scegliere prima di scattare, e ogni immagine a risoluzione originale (§3). Cosa NON cambia: il campo `tipo` nel contratto, che resta e vale sempre `ARCHIVIO` (§4) — è quello su cui si regge l'archiviazione a valle.

## 2. Le schermate

Una sola schermata di lavoro, con la stessa impostazione di Bolle:

1. **Cantiere** (obbligatorio) — stessa anagrafica del modulo Bolle, che vive in `core/cantieri.js`: **un solo elenco per tutta l'app**, perché due elenchi separati potrebbero divergere e una commessa presente in un modulo e assente nell'altro è un dato sbagliato che arriva a destinazione senza far rumore. **Sette commesse dal 16/09/2026** — `BRU`, `MAR`, `MNG`, `MRS`, `SNU`, `SNZ2.1`, `SNZ2.2` — in ordine alfabetico di codice.
   **Fase di lavoro** — elenco chiuso di gruppo in `core/fasi.js` più «nessuna fase», lo stesso delle bolle, ultima scelta preselezionata. **Obbligatoria su ogni invio dalla 0.37.0** (§4.4): tutto va in archivio, e una foto d'archivio senza fase non saprebbe in quale cartella andare. Per una foto generica il percorso veloce è la fase `Cantiere`, che non pretende livelli. Per un'urbanizzazione il campo si chiama **Lotto** e mostra i lotti di quella commessa al posto delle fasi (§4.5). Una commessa senza piani interrati non vede la fase `Interrato`.
   **Piano**, **Unità**, **Prospetto** — compaiono **solo dove la fase li pretende**, e dove compaiono sono obbligatori: non esistono livelli facoltativi (§4.5). Con l'unità il piano non si chiede — lo ricava l'app — ma si legge sotto il menù, perché l'operatore non l'ha scelto e vederlo è il solo modo che ha di accorgersi se non torna. **Nessuno dei tre è preselezionato:** un livello è il nome di una cartella sul server, e una scelta preselezionata che nessuno guarda archivia la foto nell'appartamento sbagliato senza fare rumore. Costa un tocco per invio, non per foto.
2. **Scatta foto** — apre la **fotocamera dentro l'app** (`core/fotocamera.js`, la stessa del modulo Bolle): si scatta più volte di fila senza uscire, con rullino e contatore, poi *Fine*. Accanto restano **Usa la fotocamera del telefono** e **Scegli dalla galleria** (multi-foto). Anteprime rimovibili, ognuna col peso reale del file che partirà.
   Qui gli scatti di una sessione **non** vengono raggruppati: ogni foto è una foto. Il gesto però è identico a quello delle bolle, così chi usa l'app impara una sola cosa.
3. **Nota** (facoltativa, max 255 caratteri) — vale per tutte le foto di quell'invio. Si svuota dopo l'invio, perché la nota successiva è un'altra cosa.
4. **Invia** — resta disabilitato finché non ci sono almeno una foto, un cantiere e **la fase** (obbligatoria su ogni invio dalla 0.37.0), più i livelli che quella fase pretende. L'avviso accanto al pulsante dice cosa manca e perché.
5. **Rimanda** — sotto ogni elemento **già inviato**, foto e bolle, per qualunque motivo: foto venuta male, dato sbagliato, o il dubbio che non sia arrivata. Prima esisteva solo per le bolle, solo dallo storico, e solo per correggere il cantiere. Si apre un riquadro con i campi dell'invio già compilati, e il pulsante **dice quale delle due cose sta per fare**, perché in raccolta sono due cose diverse:
   - **«Rimanda la stessa»** (niente modificato) → **stesso `idClient` e stesso progressivo**. Il flow riconosce il duplicato, risponde `gia_presente` e non crea un secondo file; l'app scrive *«Era già in raccolta: nessun doppione creato»*. Non conta fra le «inviate oggi», perché in raccolta non è arrivato niente di nuovo — e quel contatore serve a essere confrontato coi file atterrati.
   - **«Rimanda corretta»** (cantiere, fase, livelli o nota cambiati) → **`idClient` nuovo e progressivo nuovo**: è un invio nuovo a tutti gli effetti. Quella già mandata resta in raccolta e **va annullata dall'ufficio**: il telefono non può saperlo se è già stata lavorata. L'ora dello scatto resta quella della foto — rimandarla non la riscatta.
6. **Coda invii** con gli stati e i contatori del giorno, come in Bolle. **Dalla 0.37.0 la riga non porta più il marchio «Archivio»**: uguale su ogni riga non distingueva niente. Il marchio compare **solo** su un elemento con un tipo diverso da `ARCHIVIO` — cioè accodato prima della 0.37.0 e non ancora partito: quello lo script a valle non lo archivierebbe, e va riconosciuto a colpo d'occhio. Ogni riga porta il **numero progressivo** (`n. 47`), che si legge a voce quando l'ufficio segnala un buco nella sequenza. Gli stati usano le classi del design system della shell: quelle sbagliate — e per un giorno lo sono state — fanno uscire «Inviata» senza colore, cioè senza conferma visiva che la foto sia arrivata.

Nelle impostazioni del modulo c'è **Configura un altro telefono**: genera un QR che porta indirizzo e codice su un altro dispositivo senza digitare nulla. Il link è **solo di questo modulo** — le bolle hanno una destinazione propria e un link proprio. Serve prima di distribuire l'app agli operai: l'URL del trigger è lungo e firmato, e sulle bolle una copia manuale è già costata un'ora di diagnosi per una lettera cambiata nel nome di un parametro e un carattere perso dalla firma.

## 3. Preparazione delle immagini

**Un trattamento solo, dalla 0.37.0: risoluzione originale.** La compressione a 2500 px serviva all'`AVANZAMENTO`, che non esiste più.

Se il file è già JPEG si spediscono **i byte originali, senza ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine senza alcun vantaggio. Se il telefono produce HEIC o PNG si converte in JPEG a piena risoluzione (qualità 0,95), perché il nome del file in raccolta è `.jpg` e byte HEIC dentro un `.jpg` sarebbero un file che non si apre.

**«Già JPEG» si decide dai BYTE, dalla 0.37.3** — la firma `FF D8 FF` in testa al file — e non dal `type` che il selettore dichiara. Fino alla 0.37.2 i due punti che se lo chiedono rispondevano a fonti diverse: la preparazione guardava `file.type`, la lettura dell'ora guardava i byte. Su Android il `type` arriva `''` o `application/octet-stream` su file che sono JPEG perfetti (passati per un gestore di file, scaricati, prodotti da un'app che non lo dichiara): quei file venivano **ricodificati in silenzio** — la decodifica riesce, quindi nessun errore da nessuna parte — e in archivio finivano byte diversi da quelli scattati dal telefono, mentre l'ora arrivava giusta perché quella guardava i byte. Non si vede: la foto si apre, la data è giusta, il peso è plausibile. Si vede solo confrontando le impronte. Adesso la firma sta in un posto solo (`eJpeg`, in `core/exif.js`) e la chiedono lì tutti e due.

**Conseguenza sul MIME dichiarato:** per una foto il payload porta sempre `mimeType: image/jpeg`, che dalla 0.37.3 non si prende più dal `type` del file. Dopo la preparazione una foto è un JPEG per costruzione — o byte originali riconosciuti dalla firma, o un JPEG uscito dalla conversione — e dichiarare `application/octet-stream` su un file che in raccolta si chiama `.jpg` sarebbe dichiarare il falso. Per il **video** la fonte resta il `type` del file: lì è l'unica che c'è. Il flow non vede nessuna differenza rispetto a prima: quei file, fino alla 0.37.2, gli arrivavano ricodificati dal canvas e quindi già come `image/jpeg`.

#### Da dove arriva un JPEG, letto dai suoi byte

Serve in diagnosi, e il 30/09/2026 è servito davvero. Un JPEG **uscito da un canvas** — cioè prodotto dall'app, non dalla fotocamera — ha una struttura riconoscibile: `APP0 «JFIF»`, poi `APP2 «ICC_PROFILE»` di 472 byte, due `DQT`, `SOF0`, quattro `DHT`, `SOS`. **Nessun `APP1/Exif`**, quindi nessun `DateTimeOriginal`. Un JPEG che arriva **dalla fotocamera del telefono** porta invece la struttura di quel telefono, e quasi sempre un `APP1/Exif`.

Fra i canvas dell'app si distingue dalla **qualità**, che si legge nel primo coefficiente della prima tabella `DQT` (misurato sul Chromium dei collaudi):

| Primo coefficiente `DQT` | Qualità | Chi l'ha prodotto |
|---|---|---|
| **3** | 0,92 | **«Scatta»**, la fotocamera dentro l'app (`QUALITA_SCATTO`, `core/fotocamera.js`) |
| **2** | 0,95 | la **conversione** HEIC/PNG → JPEG di `preparaImmagine` |
| **5** | 0,85 | il vecchio `AVANZAMENTO` (fino alla 0.36.1) e le foto delle **bolle** |

Cautela dichiarata: la tabella è misurata sul Chromium dei collaudi, non su un Pixel. Le tabelle di quantizzazione per una data qualità sono deterministiche e lo stesso encoder gira su Android, ma se un caso dovesse dipendere da questo la prova è diretta: si scatta una foto con «Scatta» sul telefono in questione e si confrontano i byte.

**Ricodificare butta via l'EXIF**, e ora è l'unico caso rimasto in cui succede: la conversione HEIC/PNG passa per un canvas, e dal canvas i metadati non escono. Resta la ragione per cui l'ora dello scatto si legge **prima** della preparazione (§4.1). Conseguenza della semplificazione, da registrare: fino alla 0.36.1 quel comportamento era **collaudabile** — si mandava una foto come `AVANZAMENTO`, i byte arrivavano senza EXIF e l'ora arrivava comunque giusta, e funzionamento e guasto davano risultati diversi. Adesso un JPEG parte com'è, quindi quella prova non ha più oggetto, e l'unica ricodifica rimasta è su formati che il Chromium dei collaudi non sa produrre. Non è un controllo tolto: è un controllo rimasto senza caso, ed è annotato fra le cose che i collaudi non dimostrano.

**Misure sul flow vero** (collaudo del ricevente, 10/09/2026 sera, telefono reale) — sostituiscono le stime di laboratorio:

| Caso | Peso del file | Corpo della richiesta |
|---|---|---|
| `ARCHIVIO` da fotocamera in-app | 3,76 MB | ~5,0 MB |
| `ARCHIVIO` da fotocamera nativa, byte originali | **4,39 MB** | **~5,9 MB** |
| `ARCHIVIO`, il più grande arrivato finora (14/09) | **6,17 MB** | **~8,2 MB**, accettato in una sola richiesta |

**L'ipotesi «foto d'archivio da 12 MB, corpo da 16 MB» non si è verificata**, e il codice conferma il perché: per l'archivio, se il file è già JPEG l'app spedisce i byte originali senza ricodificarli, e un telefono non produce JPEG da 12 MB. Quindi **per le foto il ramo in una richiesta basta**, con margine largo dentro la finestra di 120 secondi del trigger. Il collaudo del 14/09 ha alzato il tetto conosciuto da 4,39 a 6,17 MB — sempre accettato in una richiesta sola — senza cambiare la conclusione.

⚠️ Il tetto **conosciuto** non è il tetto **vero**: nessuno ha ancora cercato il punto in cui il flow smette di accettare. La prova di taglia a scaglioni è fra quelle che restano da fare (§5), e va fatta **prima** che qualcuno mandi un video, non dopo.

Il caricamento a blocchi serve ai **video**, che non si comprimono e arrivano al tetto dei 20 MB: 26,7 MB di corpo, circa 107 secondi a 2 Mbit/s. Se il flow rifiuta un corpo, l'app lo dice con un messaggio dedicato (`413` → «foto troppo grande per il flow») e **la foto resta in coda**, non si perde.

## 3-bis. Video (aggiunto il 10/09/2026)

Si può inviare anche un video, non solo foto.

- **Si registra con la fotocamera di sistema**, non dentro l'app: il pulsante è *Registra un video*. Registrare in-app significherebbe `MediaRecorder`, che produce formati diversi fra Android e iPhone e non usa l'encoder hardware del telefono. Il video di sistema è migliore, consuma meno batteria e si apre su qualunque PC dell'ufficio. Per le foto la fotocamera interna serve a non uscire fra uno scatto e l'altro; un video si registra uno per volta, quindi quel problema non c'è.
- **Il video non viene compresso.** Transcodificare in un browser non è realistico: parte come l'ha prodotto il telefono. Anche il video è `ARCHIVIO` dalla 0.37.0, e anche per lui la fase è obbligatoria.
- **Il peso è l'unico vero vincolo.** Nelle impostazioni del modulo c'è un **tetto in MB** (predefinito 20). Un file che lo supera **non entra in coda** e l'app lo dice subito — *«Un file da 373,4 MB supera il limite di 20 MB e non è stato aggiunto: registra un video più corto»* — invece di accodarlo e farlo ritentare a vuoto per sempre. Il valore giusto lo dice il collaudo sul flow vero.
- **Anteprima e durata** si ricavano da un fotogramma del filmato, mezzo secondo dentro. Se il browser non decodifica il formato, l'anteprima è un'icona e la durata resta 0: l'invio non dipende dalla riuscita di una miniatura.
- Foto e video **possono stare nello stesso invio**: il pulsante dice *Invia 1 foto e 1 video*.

## 4. Contratto di invio

POST JSON al **proprio** flow — diverso da quello delle bolle — un file per richiesta, `api-version=2024-10-01` obbligatoria (l'app corregge il parametro da sola, lasciando intatta la firma `sig=`).

```
{ "token": "…",
  "tipo": "ARCHIVIO",                 // sempre, dalla 0.37.0: la scelta non c'è più,
                                      //   ma IL CAMPO RESTA e non è mai vuoto
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

⚠️ **`tipo` non può essere vuoto, ed è il motivo per cui il campo è sopravvissuto alla categoria.** A valle ci stanno appese due cose: il flow **compone il nome del file** da `tipo`, e lo **script archiviatore prende solo gli elementi con `Tipo = ARCHIVIO`**. Un invio con `tipo` vuoto atterrerebbe in raccolta e ci resterebbe per sempre — nessun errore, nessun avviso, e nessuno che se ne accorga finché non si va a cercare una foto che si credeva archiviata. L'app lo valorizza sempre, e l'invio ha anche un ripiego per i record accodati da versioni precedenti.

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

⚠️ **«Scatta» può diventare la fotocamera di sistema, e allora la foto arriva dalla seconda riga della tabella, non dalla prima.** Succede in due casi: se il telefono non consente la fotocamera dentro l'app (`getUserMedia` assente o contesto non sicuro) il pulsante «Scatta» è direttamente l'`input capture` di sistema; e se l'apertura della fotocamera interna **fallisce** — permesso negato, nessuna fotocamera, fotocamera occupata da un'altra app — l'app dice cosa è andato storto e apre la fotocamera di sistema al suo posto, invece di lasciare l'operatore senza modo di scattare. In quel caso il file **non** ha la firma del canvas (§3): porta l'EXIF della fotocamera del telefono, i byte originali, e `scattoStimato` `NO` anche quando `DateTimeOriginal` manca, perché lo scatto è di un istante prima. È il ripiego giusto, ma va saputo quando si guarda un file in raccolta e si cerca di capire da dove arriva.

#### Le copie ridotte, e perché si fermano (dalla 0.36.0)

**Il caso, misurato il 17/09/2026.** Cinque foto scelte dalla galleria erano **copie ridotte** — Google Foto dopo «Libera spazio», oppure WhatsApp — con lato lungo 1600 px e **nessun EXIF**. L'app ha stimato `dataScatto` = ora dell'invio, e in archivio sono finite con un'ora falsa nel nome. Se scatto e invio cadono in due mesi diversi, la foto finisce **nel mese sbagliato** e non se ne accorge nessuno: la stima è plausibile, e lo `scattoStimato` = `SI` lo dice a chi va a guardare — cioè a nessuno, prima che sia tardi.

**Cosa fa l'app adesso.** Un file di galleria senza `DateTimeOriginal` **non entra in coda**. Compare un avviso, con la via d'uscita giusta **per prima**: *«Questa foto non ha la data di scatto. Cerca l'originale nell'album Fotocamera: lì la data c'è»*, e sotto le due azioni — *Aggiungi comunque* e *Cerco l'originale*. Non è un blocco: in cantiere non si può fermare qualcuno su un file che non tornerà. È una scelta consapevole al posto di una stima silenziosa.

Se si manda comunque: **`dataScatto` = data del file** (`lastModified`) quando è plausibile — **non nel futuro e non prima del 2020** — altrimenti l'ora dell'invio; `scattoStimato` = `SI` in ogni caso. La data del file è quasi sempre molto più vicina allo scatto dell'ora in cui si preme Invia: una copia ridotta viene creata poco dopo lo scatto e conserva quella.

**Non si perde niente a fermarle:** un file scelto dalla galleria è ancora nella galleria. Le foto **scattate** dall'app non passano mai da qui — quelle l'ora ce l'hanno.

Una data EXIF **assurda** (l'orologio mai impostato: `1970`, `2001`, `2008`) vale come assente e segue la stessa strada. Il tag c'è, il valore no.

**Dalla 0.37.2 l'avviso dice, per ogni file, PERCHÉ si è fermato.** Fino alla 0.37.1 i nove casi interni di `core/exif.js` uscivano a video con una frase sola — *«probabilmente è una copia ridotta»* — e il 30/09/2026 uno screenshot di tre foto messe da parte insieme non rispondeva a nessuna delle domande che serviva chiudere: non si distingueva «non c'è nessun EXIF» da «l'EXIF c'è ma senza la data» da «non è nemmeno un JPEG». Tre cause diverse, tre cose diverse da fare.

Adesso sotto l'avviso c'è **una riga per file**, con tre livelli di lettura:

- il **nome del file**, il **peso** e il **tipo dichiarato dal selettore** (`image/jpeg`, `image/png`, o «tipo non dichiarato»);
- il **motivo in italiano**, per chi deve decidere cosa fare (*«nel file non ci sono i dati della fotocamera»*, *«i dati della fotocamera ci sono, ma senza l'ora dello scatto»*, *«il file non è una foto JPEG»*, *«l'orologio del telefono non era impostato»*, …);
- fra parentesi, il **motivo tecnico e i fatti misurati**: se è un JPEG, **quanti byte** si sono letti e **quali segmenti** si sono visti prima di arrendersi — per esempio `nessun blocco EXIF nel file · JPEG sì · letti 128 KiB · segmenti APP0(16) APP2(472) DQT(67) SOF(17) DHT(28) SOS`.

Quell'ultima riga è la differenza fra uno screenshot da interpretare e uno screenshot che risponde: **arrivare a `SOS` senza aver incontrato un `APP1/Exif` dimostra che il segmento NON c'è**, e non che i 128 KiB letti non bastavano — che è esattamente l'alternativa che non si poteva escludere il 30/09.

**«Non è un JPEG» è un caso a sé dalla 0.37.2** (prima ricadeva in «nessun blocco EXIF»). Dire *«nel file non ci sono i dati della fotocamera»* a chi ha mandato un HEIC è falso: i dati ci sono, è l'app che da quel contenitore non li legge («Cosa NON si legge», qui sotto). La riga lo dice — `non è un JPEG · primi byte 89 50` — e chi legge sa che la via d'uscita non è «cerca l'originale» ma «questo formato l'app non lo sa leggere».

**Il motivo non viaggia nel payload** e non compare in raccolta: sta a video e basta, perché serve a decidere sul momento e a diagnosticare da uno screenshot. Il contratto non cambia.

#### Il telefono che non lascia leggere una foto (dalla 0.37.4)

**Il caso, misurato il 30/09/2026.** Sul Galaxy S21+ di Paolo due foto scattate alle 11:26 **con la fotocamera del telefono** sono state rifiutate dall'app alle 11:31, e le stesse due foto sono partite senza un intoppo alle 19:25, con l'EXIF completo, `ScattoStimato` `NO` e i byte originali. Il file è sempre stato a posto: a fallire era la **lettura**. La riga di diagnosi della 0.37.2 è quella che ha chiuso la domanda in un colpo — `NotReadableError · The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired` — e alle 19:20, sullo stesso file, la stessa causa era uscita come *«Formato immagine non supportato da questo dispositivo»*: stessa causa, un'altra frase, e l'operatore mandato a cercare un originale che aveva già in mano.

**Perché succede.** Su Android il `File` che arriva dal selettore non è un file su disco: è un riferimento a un contenuto (`content://`) tenuto in vita da un'altra applicazione. Quel riferimento può decadere, e decade **fra una lettura e l'altra**. Fino alla 0.37.3 lo stesso `File` veniva riletto da capo quattro o cinque volte in momenti diversi — l'EXIF, la firma, la preparazione, l'anteprima, la copia in IndexedDB — e bastava che una di quelle letture cadesse nel momento sbagliato.

**Tre correzioni, e servono tutte e tre.**

1. **Una lettura sola, subito.** Appena una foto viene scelta se ne leggono i byte (`arrayBuffer`) e quella copia serve per tutto il resto: EXIF, firma, preparazione, anteprima, invio. Un `Blob` costruito su un `ArrayBuffer` sta nella memoria del browser e non dipende più da nessun'altra applicazione, quindi le letture successive non possono fallire. Il **video non passa da qui**: si legge a blocchi al momento dell'invio, perché tenere in memoria un filmato da 200 MB è il modo di far chiudere la pagina al sistema.
2. **Ritentare.** Quattro tentativi in tutto, a `0,5 s`, `1,5 s` e `3 s` dal primo. Il riferimento decaduto a volte torna leggibile dopo poco, ed è quello che il caso di Paolo dimostra: a mezzogiorno no, la sera sì. Le attese si possono accorciare da `localStorage` (`llitalia.atteseRilettura`, millisecondi separati da virgola): serve al supporto e ai collaudi.
3. **L'avviso segue il caso.** Se dopo i tentativi la foto non si legge: *«Il telefono non ha lasciato leggere questa foto all'app. La foto è a posto: riprova a sceglierla, oppure usa Scatta»*, con il pulsante **«Riprova»** e **senza «Aggiungi comunque»** — che la manderebbe con un'ora stimata mentre quella vera sta dentro il file, a due tentativi di distanza. «Riprova» ripassa dalla stessa strada con la provenienza di prima: se stavolta la lettura riesce, la foto entra in coda con la sua ora vera, misurata.

**La frase in testa è quella del caso, non una comune a tutti.** Dalla 0.37.4 i file messi da parte si raggruppano per **quello che l'operatore deve fare**, e ogni gruppo ha il suo riquadro con la sua frase: lettura negata, copia ridotta senza dati della fotocamera, file che non è un JPEG, dati della fotocamera senza l'ora, orologio del telefono mai impostato. La riga di diagnosi resta una per file. Con un caso solo — che è quasi sempre — il riquadro è quello di prima; con più casi i pulsanti comuni stanno in fondo all'ultimo riquadro mandabile, e non si ripetono. Il motivo della correzione: il 30/09 la frase *«non hanno la data di scatto, quasi certamente copie ridotte, cerca gli originali»* è comparsa sopra una foto che la data ce l'aveva.

**Il contratto non cambia in niente.** Una foto letta al secondo tentativo è una foto come tutte le altre, e una foto che non si è letta non parte affatto.

**La lettura avviene PRIMA di qualunque ricodifica.** Non è un dettaglio di ordine: la conversione HEIC/PNG → JPEG passa per un canvas, e dal canvas l'EXIF non esce. Leggerlo dopo vorrebbe dire non leggerlo su quei formati — cioè proprio sugli iPhone, che è il modo più efficace di non accorgersene. Fino alla 0.36.1 il canvas serviva anche alla compressione dell'`AVANZAMENTO`, e la cosa era più facile da provare (§3).

**Niente libreria EXIF**: lo stack è vincolato e qui non serve. Si leggono i primi 128 KB del file e si scandiscono i marcatori JPEG fino all'APP1 (`core/exif.js`, ~300 righe). Il contenuto della foto non viene toccato.

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

**Obbligatoria su OGNI invio del modulo Foto, dalla 0.37.0.** Era stata ristretta all'`ARCHIVIO` il 15/09/2026, quando l'`AVANZAMENTO` esisteva ancora e restava in raccolta senza smistarsi; tolta la categoria, tolta anche l'eccezione — tutto va in archivio, quindi tutto ha bisogno di una cartella. Invia resta spento e l'avviso nella barra dice *«Scegli la fase per inviare. Sul server le foto si ordinano per fase»*; l'app lo dice già sotto il campo, prima di scattare.

**Nel modulo Bolle resta facoltativa:** le bolle in archivio non ci vanno, e meglio una bolla senza fase che una bolla ferma perché l'operatore non sa quale.

Per una foto generica, che non appartiene a una lavorazione precisa, il percorso veloce è la fase **`Cantiere`**: è nell'elenco, non pretende livelli, e costa un tocco.

Il campo arriva **vuoto** solo per le bolle e per le foto accodate prima della 0.31.0. **Dalla 0.33.0 nessuna foto `ARCHIVIO` può più partire senza fase:** è la garanzia su cui si regge lo smistamento per cartella del runbook. È la **fase di lavoro** a cui la foto si attribuisce: il gruppo divide il lavoro in fasi → attività → lavorazioni, e si sceglie il livello delle fasi perché è quello che chi è in cantiere sa dire sul momento, senza guardare il cronoprogramma.

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

**Lato raccolta serve la colonna `Fase`** (riga di testo singola), mappata sul campo omonimo. Finché non c'è, il flow ignora il campo e le foto atterrano lo stesso: il rilascio è indipendente. Dalla 0.37.0 una foto in arrivo dall'app **non ha mai la fase vuota**: se la colonna risulta vuota, o è una foto di una versione precedente, o la colonna non è mappata.

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

**Una voce sola: non si chiede, la sceglie l'app** (dalla 0.37.7). Se per quella commessa e quella fase un livello obbligatorio ha **una sola voce possibile**, il menù non compare: al suo posto si legge il valore che parte e il perché — *«P-1 — Primo piano interrato · è l'unico piano interrato di questa commessa: lo sceglie l'app»* — e il valore viaggia nel payload come se l'operatore l'avesse scelto. Il caso che l'ha fatto notare: SNZ2.2 in fase `Interrato` apriva un menù con «— scegli il piano —» e `P-1` come unica voce, cioè un tocco obbligatorio per una scelta che non c'era. Con l'anagrafica di oggi è **l'unico caso** in cui la regola scatta (misurato su tutte le commesse e tutte le fasi), ma vale per tutti e tre i livelli: un prospetto unico o un'unità unica seguono la stessa strada.

Non contraddice la regola «nessuna preselezione» dei menù dei livelli: ne è il confine. Quella regola esiste perché una voce preselezionata che nessuno guarda archivia la foto nell'appartamento sbagliato; con una voce sola un appartamento sbagliato non c'è. **Da due voci in su si chiede sempre.** E il valore messo dall'app **non si porta dietro come scelta**: passando da `Interrato` (solo `P-1`) a `Strutture` (tutti i piani, `P-1` compreso) il menù riparte dal segnaposto e non da `P-1` — altrimenti la voce scelta dall'app diventerebbe esattamente la preselezione che quella regola impedisce. Il campo «Piano» resta a video anche quando non c'è niente da scegliere: l'operatore deve vedere in quale cartella va la foto.

**`null`, mai stringa vuota.** Dove il livello non si applica il campo arriva `null` e non `''`. Vale la regola già registrata dei campi vuoti: una colonna con `''` somiglia a un dato e non lo è, e sui campi numerici una stringa vuota è già costata venti foto entrate senza colonne il 10/09. I tre campi **viaggiano sempre**, anche quando valgono `null`: un campo assente e un campo nullo si comportano diversamente in un flow, e meglio uno solo dei due casi.

**Commesse senza anagrafica.** `SNZ2.1` e `MRS` sono concluse e in anagrafica non ci sono; una commessa nuova non ce l'ha ancora. Per loro non c'è nessun livello da offrire: le fasi restano tutte disponibili e i tre campi arrivano `null`. A valle la foto finisce nella cartella del mese con un'anomalia — **voluto**: non si blocca chi sta scattando in cantiere per un dato che manca in ufficio.

**Dove vive l'elenco delle fasi: due posti, e uno solo li tiene insieme.** Dentro l'app le fasi stanno in `core/fasi.js` — quali sono, con codice ed etichetta — e in `core/anagrafica.js`, nella tabella `livelliPerFase` — cosa ognuna pretende. Non sono due copie della stessa lista: sono **due fatti diversi** sulla stessa lista, e per questo stanno separati. Ma le chiavi devono combaciare, e una divergenza **non farebbe rumore**: una fase presente in `fasi.js` e assente in `livelliPerFase` risulta «senza livelli», quindi si può scegliere, la foto parte, e finisce nella cartella del mese invece che in quella del piano. Dal 18/09/2026 la coerenza fra i due è **collaudata** (`15-livelli.js`): ogni fase ha la sua riga, l'anagrafica non ha righe per fasi che non esistono, e l'ordine è alfabetico. Chi aggiunge una fase tocca quindi **due file**, e se ne dimentica uno il collaudo lo dice.

**Dove sta l'anagrafica.** In `core/anagrafica.js`, accanto a `cantieri.js` e `fasi.js`: piani con etichetta e ordine, unità per piano con le loro etichette, prospetti, lotti, e la tabella `livelliPerFase`. **È dato, non logica**, ed è la copia di un master che vive su `L:`: si sostituisce in blocco quando cambia, non si corregge una voce a mano. Il campo `versione` (`202609181330`) compare nella pagina **Informazioni**: quando l'ufficio dice «ho aggiornato piani e unità», quel numero è la risposta.

### 4-ter. Invii interrotti: «in corso» vale solo per la sessione che l'ha avviato

**Il difetto, misurato il 29/09/2026.** Sul telefono di Francesco l'elemento n. 56 (SNZ2.2, `Impermeabilizzazioni`, `P-1`, scattato il 22/09 alle 11:37) era fermo su «Invio in corso» **da sette giorni**, attraverso chiusure dell'app e aggiornamenti. Al ricevente non era mai arrivato, e lo script lo segnalava ogni giorno come buco di continuità.

Perché restava lì. Il motore mette il record su `invio` prima della richiesta e lo sposta a `inviata` o a `errore` quando la richiesta finisce. Se la pagina muore nel mezzo — app chiusa, telefono in tasca, scheda scaricata dal sistema — il record resta su `invio` **nel database**, e da lì non si muove più: il giro degli invii prende `in_coda` e `errore`, e a video «Riprova» e «Rimanda» si accendono su `errore` e su `inviata`. Nessuna strada, in nessuna direzione. L'elemento era invisibile all'app e mancante a destinazione.

**Il principio, dalla 0.37.1:** «in corso» è vero **solo finché vive la pagina che ha avviato la richiesta**. Uno stato «in corso» ereditato da una sessione precedente è per definizione interrotto.

**Due correzioni, per due casi diversi.**

1. **Fra sessioni.** Alla prima elaborazione della coda in una sessione, ogni record su `invio` torna `in_coda` e **riparte da solo**. Fra un pulsante da premere e una ripartenza automatica si è scelta la seconda: la promessa della coda è che lo scatto non si perda, e aspettare che qualcuno si accorga di un elemento fermo è esattamente il modo in cui si è perso. È sicuro perché il flow risponde `gia_presente` a un `idClient` già visto (§0): nel peggiore dei casi si spende una richiesta e non nasce nessun doppione. A video l'elemento lo dichiara — *«Invio interrotto da una chiusura dell'app: ripreso»* — perché uno che riparte in silenzio sembra partito due volte. Il **caricamento a blocchi non si azzera**: `urlCaricamento` e `byteInviati` restano, e la ripresa chiede al server quanti byte ha davvero (§4-bis); ricominciare da zero un video quasi finito sarebbe il contrario di quello che serve.
2. **Dentro la stessa sessione.** Ogni richiesta ha un **tetto di tempo**: passato quello viene abortita e il record va in `errore`, con «Riprova» a video. Non è un obiettivo di prestazione — è la differenza fra «ci mette tanto» e «non finirà mai». Finché una richiesta resta appesa il motore, che lavora un elemento per volta, **non va avanti**: si ferma tutta la coda, non solo quell'elemento.

**Il tetto è otto minuti**, largo di proposito. Un video di 27 MB su una linea da 2 Mbit/s vuole un minuto e mezzo di solo caricamento, e in cantiere la linea è peggio; d'altra parte il flow ha una finestra di 120 secondi, quindi una richiesta che passa gli otto minuti non aveva comunque nessuna possibilità di riuscire. Si può accorciare da `localStorage` (`llitalia.scadenzaInvioMs`, millisecondi): serve al supporto su un telefono che si comporta male, e serve ai collaudi — un tetto di otto minuti non si prova aspettando otto minuti.

⚠️ **Il contratto col flow non cambia in niente.** Un invio ripreso è una richiesta identica a quella di prima, con lo stesso `idClient`.

**Una conseguenza misurata il 30/09/2026, che il ricevente può vedere nello storico del flow.** Il flow riceve la richiesta qualche istante prima che il telefono abbia registrato la risposta, e in quella finestra il record è ancora su `invio`. Se l'app viene chiusa o ricaricata **proprio lì**, alla riapertura quel record risulta interrotto e riparte: al flow arriva una **seconda richiesta con lo stesso `idClient`**, a cui risponde `gia_presente`. In raccolta non nasce niente, e il comportamento è quello giusto — l'alternativa è un elemento fermo per sette giorni. Va saputo perché nello storico delle esecuzioni si legge come una chiamata in più, non come un errore. Lo ha scoperto un collaudo che ricaricava la pagina un istante dopo l'invio, ed è registrato fra le trappole (`collaudi/aiuto.js`, n. 6).

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

**Raccolta `FotoCantiere`** sul sito Cantieri LL, 12 colonne, versioni limitate a 3, tre viste ad ambito ricorsivo (`Ultime foto`, `Archivio da scaricare`, `Avanzamento`). ⚠️ Dalla 0.37.0 la vista **`Avanzamento` non riceverà più niente di nuovo**: l'app non manda più quel tipo. Tenerla o toglierla è una decisione del ricevente — quello che conta è che nessuno la legga come «niente da archiviare oggi».

| Colonna | Tipo | Origine nel payload |
|---|---|---|
| `Tipo` | Riga di testo singola, **indicizzata** | `tipo` |
| `Commessa` | Riga di testo singola | `commessa` |
| `Fase` | Riga di testo singola | `fase` — **esiste**, verificata via REST il 18/09/2026 (§0); vedi §4.4. Contiene il **codice** senza spazi (`FinituraAlloggi`), che è anche il nome della cartella sul server. Sempre valorizzata sulle `ARCHIVIO` dalla 0.33.0 |
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
| `ScattoStimato` | Riga di testo singola | `scattoStimato`, vedi sotto |
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
| EXIF `2026:09:14 08:31:39` con `OffsetTimeOriginal +02:00` | `dataScatto` = `2026-09-14T08:31:39+02:00`, `scattoStimato` `NO` | ✓ |
| EXIF `2026:01:15 09:00:00` senza fuso, ordine byte `MM` | `2026-01-15T09:00:00+01:00` (fuso del **giorno dello scatto**), `NO` | ✓ |
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

### Rilascio 0.37.7 — un livello con una voce sola non si chiede

**Niente da fare a valle** e contratto invariato: il piano parte come prima, l'unica differenza è che non lo sceglie più l'operatore quando c'è una voce sola. Per SNZ2.2 in fase `Interrato` in raccolta arriva sempre `Piano = P-1`, come arrivava quando l'operatore lo sceglieva a mano.

Previsione scritta prima di provare, e confermata (collaudo `15-livelli.js`):

| Caso | Atteso | Esito |
|---|---|---|
| SNZ2.2 + `Interrato` | menù del piano nascosto, al suo posto `P-1 — Primo piano interrato` e il perché | ✓ |
| … con una foto pronta | Invia si accende senza toccare il piano | ✓ |
| … il payload | `fase: "Interrato"`, `piano: "P-1"` | ✓ |
| MNG + `Interrato` (due interrati) | il menù resta, si sceglie fra `P-2` e `P-1` | ✓ |
| SNZ2.2, da `Interrato` a `Strutture` | il menù torna e parte dal segnaposto, **non** da `P-1`; senza scelta Invia resta spento | ✓ |

L'ultimo caso è scelto perché possa fallire: `Strutture` su SNZ2.2 offre anche `P-1`, quindi un menù che si portasse dietro il valore di prima lo terrebbe selezionato. Con una fase che `P-1` non l'avesse, il valore cadrebbe da sé e la prova non proverebbe niente.

### Rilascio 0.37.4 — la lettura negata dal telefono

**Niente da fare a valle** e contratto invariato: una foto letta al secondo tentativo è una foto come tutte le altre, e una foto che non si è letta non parte affatto.

Due cose che il ricevente può notare, e nessuna è un intervento:

1. **Possono arrivare foto vecchie di qualche ora o di qualche giorno**, con `DataScatto` corretta e `ScattoStimato` `NO`: sono quelle che un telefono aveva rifiutato e che ora, al secondo tentativo o con «Riprova», partono. Non è un ritardo della coda.
2. **Le foto rifiutate per lettura non arrivano più con un'ora stimata**, perché non arrivano affatto finché non si leggono. Prima potevano atterrare con la data del file: era il male minore di un avviso che diceva la cosa sbagliata.

Previsione scritta prima di provare, e confermata (collaudo `19-lettura-negata.js`):

| Caso | Atteso | Esito |
|---|---|---|
| Prima lettura negata, seconda riuscita | la foto entra in coda e parte, senza nessun avviso | ✓ 4 letture chieste al browser |
| … byte e data di quella foto | byte identici per impronta, data dall'EXIF, `NO` | ✓ `56a73bb3…`, `2026-09-14T08:31:39+02:00` |
| Lettura sempre negata | niente in coda, e in testa la frase di QUESTO caso | ✓ *«Il telefono non ha lasciato leggere questa foto all'app»* |
| … la vecchia frase | **non** deve comparire: né «non ha la data di scatto», né «copia ridotta», né «cerca l'originale» | ✓ |
| … i pulsanti | «Riprova» presente, «Aggiungi comunque» assente | ✓ |
| … la riga di diagnosi | nome, peso, tipo, quanti tentativi e in quanto tempo, e la frase del browser | ✓ `4 letture tentate in 0.1 s · NotReadableError: The requested file could not be read…` |
| «Riprova» quando il telefono torna a collaborare | la foto entra in coda con l'ora vera e i byte originali | ✓ |

**Cosa questo NON dimostra:** il telefono di Paolo. Il guasto qui è **iniettato** — `Blob.prototype.arrayBuffer` sostituito con una versione che rifiuta le prime N letture col `DOMException` vero — perché un file su disco, in un container, si legge sempre. Che sul Galaxy S21+ la prima correzione (una lettura sola) basti da sola non si può sapere da qui: la prova è che quelle foto entrino in coda al primo colpo.

### Rilascio 0.37.3 — un JPEG si riconosce dai byte

**Niente da fare a valle**, e il contratto non cambia: nessun campo nuovo, nessun campo rinominato, nessun valore diverso da quelli che il flow già riceve. Quello che cambia è **quali byte** partono per certi file, e sono i byte giusti: quelli originali del telefono.

Una cosa che il ricevente deve sapere, e non è un intervento: le foto arrivate **fino alla 0.37.2** da telefoni che dichiaravano un `type` storto sono in raccolta **ricodificate** — immagine giusta, data giusta, byte non originali. Non si distinguono a occhio e non c'è niente da rifare: la promessa dei byte originali vale da qui in avanti. Se dovesse servire riconoscerle, la struttura è quella del canvas descritta in §3 (`APP0 JFIF` + `APP2 ICC_PROFILE`, nessun `APP1/Exif`, primo coefficiente `DQT` = 2).

Previsione scritta prima di provare, e confermata (collaudo `18-jpeg-dai-byte.js`):

| Caso | Atteso | Esito |
|---|---|---|
| Stessi byte JPEG con `type` `''` | in raccolta **byte identici**, confronto per impronta | ✓ impronta `56a73bb3…` uguale, 521810 byte |
| … con `type` `image/jpg` | idem | ✓ stessa impronta |
| … con `type` `application/octet-stream` | idem | ✓ stessa impronta |
| In tutti e tre | la data dello scatto si legge lo stesso | ✓ `2026-09-14T08:31:39+02:00`, `scattoStimato` `NO` |
| In tutti e tre | `mimeType` dichiarato `image/jpeg` | ✓ |
| Un PNG vero | **continua a convertirsi**: byte diversi, e quello che parte inizia per `FF D8 FF` | ✓ 21979 → 15363 byte |
| La firma | `FF D8 FF` sì; `FF D8` da solo, PNG, HEIC e file vuoto no | ✓ |

**Cosa questo NON dimostra:** il caso HEIC. Il Chromium dei collaudi non sa produrre un HEIC, quindi la conversione da HEIC resta provata solo sul PNG, che segue lo stesso ramo. La prova vera è su un iPhone che manda una foto e su cosa atterra in raccolta.

### Rilascio 0.37.2 — la diagnosi a video

**Niente da fare a valle**, e niente che cambi nel contratto: il motivo per cui una foto si è fermata resta **sul telefono**, sotto l'avviso. In raccolta non arriva niente di nuovo e niente di diverso.

A cosa serve al ricevente: quando dal cantiere arriva lo screenshot di una foto che non parte, adesso quello screenshot **contiene già la risposta** — non serve chiedere il file originale per sapere se l'EXIF manca, se c'è ma senza la data, o se il file non è un JPEG.

Previsione scritta prima di provare, e confermata (collaudo `10-ora-scatto.js`):

| Caso | Atteso | Esito |
|---|---|---|
| Copia senza EXIF | riga col nome, il peso, `image/jpeg`, il motivo in italiano e i segmenti visti | ✓ `nessun blocco EXIF nel file · JPEG sì · letti 128 KiB · segmenti APP0(16) … SOS` |
| PNG (non è un JPEG) | motivo **diverso** da quello della copia senza EXIF | ✓ *«il file non è una foto JPEG…»* · `primi byte 89 50` |
| Due file, due cause | due righe, e non la stessa frase due volte | ✓ |
| I nove motivi di `core/exif.js` | ognuno la sua frase, tutte diverse | ✓ (i motivi si leggono dal sorgente, non si elencano a mano) |
| Contratto | nessun campo nuovo, nessun valore cambiato | ✓ |

**Cosa questo NON dimostra:** il caso di Paolo. Quelle tre foto stanno sul suo telefono, e la prova è che rifacendo lo stesso invio con la 0.37.2 la riga dica quale delle cause è — una risposta sola, senza leggere i byte del file.

### Rilascio 0.37.1 — invii interrotti

**Niente da fare a valle**: il contratto non cambia, un invio ripreso è una richiesta identica con lo stesso `idClient`. Quello che cambia è che elementi rimasti fermi su «Invio in corso» su qualche telefono **ripartiranno da soli** al primo avvio dopo l'aggiornamento: se erano già arrivati il flow risponderà `gia_presente` e non nascerà nessun doppione; se non erano arrivati — il caso del n. 56 — atterreranno adesso, e i buchi di continuità che lo script segnalava si chiuderanno.

Previsione scritta prima di provare, e confermata (collaudo `17-invio-interrotto.js`):

| Caso | Atteso | Esito |
|---|---|---|
| Record su `invio` ereditato da una sessione chiusa | torna `in_coda` al primo avvio e riparte da solo | ✓ |
| Contenuto del record ripreso | fase, livelli e tipo intatti | ✓ `Impermeabilizzazioni` / `P-1` / `ARCHIVIO` |
| Richiesta che non risponde più | va in **errore**, non resta appesa | ✓ in 3,1 s con tetto a 3 s |
| Messaggio d'errore | dice che è scaduta, non che manca la rete | ✓ |
| Dopo il retry | nessun elemento resta su `invio` | ✓ |

**Cosa questo NON dimostra:** il caso vero. Il n. 56 sta sul telefono di Francesco, e la prova è che dopo l'aggiornamento e un ricarico diventi inviabile e arrivi sul server come `Snz22Foto20260922113715-07.jpg` in `Impermeabilizzazioni\P-1\`. Quella verifica è del ricevente.

### Rilascio 0.37.0 — via la categoria

**Niente da fare a valle.** Il contratto non cambia: nessun campo rinominato, nessuno tolto, nessuna colonna nuova. Cambia soltanto il VALORE di `tipo`, che da oggi è sempre `ARCHIVIO`.

Tre cose che il ricevente deve sapere, e nessuna è un intervento:

1. **La vista `Avanzamento` non riceverà più niente di nuovo.** Non è un guasto. Tenerla o toglierla è una scelta del ricevente; l'importante è che nessuno la legga come «oggi non è arrivato niente».
2. **Il filtro `Tipo = ARCHIVIO` dello script archiviatore va lasciato dov'è.** Sembra ridondante ora che arriva solo quello, e toglierlo farebbe sparire la protezione contro gli elementi vecchi — oltre a togliere il motivo per cui l'app continua a mandare quel campo.
3. **Un telefono non ancora aggiornato continua a mandare `AVANZAMENTO`,** e deve poterlo fare senza errori: la 0.36.1 resterà in giro finché tutti non riaprono l'app.

Provato in locale coi collaudi automatici (16 verdi):

| Caso | Atteso | Esito |
|---|---|---|
| Menù della categoria | non esiste più nel DOM | ✓ |
| `tipo` nel payload | `ARCHIVIO` su ogni invio | ✓ |
| Byte inviati | identici al file originale, nessuna ricompressione | ✓ |
| Fase | obbligatoria su ogni invio; rimettendo «nessuna fase» l'invio si blocca | ✓ |
| Foto con fase `Cantiere` | parte senza chiedere livelli | ✓ |
| `sw.js` e `core/versione.js` | stesso numero, `0.37.0` | ✓ |

**Cosa questo NON dimostra:** che il numero sia arrivato **sul sito pubblicato**. I collaudi girano su un server locale che serve il repo, e fra «unito su main» e «in linea» ci sono una build di Pages e qualche minuto. Da qui si chiude con `node collaudi/pubblicato.js`, che legge `sw.js` e `core/versione.js` **dal sito** e li confronta fra loro e col repo.

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
- si scarica **solo `ARCHIVIO`** — che dalla 0.37.0 è tutto quello che arriva dall'app. Il filtro **resta**: continua a proteggere dagli elementi vecchi, e la sua esistenza è il motivo per cui il campo `tipo` non è stato tolto dal contratto (§4).

### Il marcatore dello scarico: `DataScarico`, e nient'altro

**Deciso il 14/09/2026: si usa la colonna `DataScarico` (testo), non una colonna `Stato`.** La rev. 3 di questo documento proponeva uno `Stato` per analogia con le bolle: la proposta è ritirata.

Tre motivi:

1. **`DataScarico` esiste già**, insieme alla vista `Archivio da scaricare` che filtra sul suo essere vuota. Vuota = da scaricare; valorizzata = scaricata il… Costruire un secondo marcatore su qualcosa che funziona significa solo darsi due verità da tenere allineate;
2. **dice anche QUANDO**, cosa che uno stato non direbbe;
3. **il ciclo delle foto ha due soli esiti.** Nelle bolle `Stato` ha cinque valori perché lì la lavorazione ne ha davvero cinque; qui una foto è scaricata o non lo è. Copiare il meccanismo delle bolle avrebbe portato la complessità senza il problema che la giustifica.

⚠️ **Conseguenza da non perdere:** il runbook deve trovare **un solo marcatore**. Se un domani comparisse anche uno `Stato`, chi esegue non saprebbe quale guardare — ed è il tipo di ambiguità che si scopre quando una foto viene scaricata due volte, o mai.

### Cosa resta aperto

- **Quando si potano le foto dalla raccolta.** Oggi non si cancella niente: la raccolta è la copia di riferimento. Quando lo spazio diventerà un problema servirà una regola esplicita (per esempio: si cancellano le foto con `DataScarico` più vecchia di N mesi, mai quelle senza). Non è urgente, ma non è improvvisabile.
- **Le foto di `AVANZAMENTO`** già in raccolta restano lì per sempre e nessuno le pota: vale lo stesso ragionamento. Dalla 0.37.0 non ne arrivano di nuove, quindi quell'insieme è chiuso e non cresce più.

## 7. Scelte di costruzione, e perché

- **Database separato** (`llitalia-foto`) da quello delle bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
- **Coda più semplice di quella delle bolle**, di proposito: niente storico permanente, niente miniature conservate. **Il progressivo invece c'è**, dall'11/09/2026 — e prima non c'era, per una scelta motivata così: «una bolla persa è un documento perso, una foto di cantiere non arrivata si riscatta». Il ragionamento era sbagliato in un punto: **riscattare una foto richiede di sapere che manca**, e a dirlo è solo un buco nella sequenza. Senza progressivo non esiste un controllo di continuità; esiste solo la speranza che tutto sia arrivato. Sequenza propria del modulo, che parte da 1 e non va confrontata con quella delle bolle.
- **Identità del dispositivo nella shell** (`core/dispositivo.js`): è l'identità del telefono, non di un modulo, e i due moduli la leggono da lì. Prima viveva nel database delle bolle, ed è da lì che viene **ereditata** sui telefoni già in uso: rigenerarla avrebbe fatto apparire in raccolta due dispositivi dove ce n'è uno, spezzando la sequenza delle bolle già inviate.
- **Conserva ultime N = 10** per default, contro le 20 delle bolle: le foto d'archivio non sono compresse e pesano.
- **Codice condiviso nella shell:** anagrafica cantieri (`core/cantieri.js`), normalizzazione dell'endpoint (`core/endpoint.js`), versione dell'app (`core/versione.js`), identità del dispositivo (`core/dispositivo.js`), configurazione via link (`core/configurazione-link.js`). Spostati lì in occasione di questo modulo: erano dentro Bolle, e copiarli avrebbe creato due verità destinate a divergere. Della configurazione via link cambiano solo i testi e le impostazioni di destinazione: il meccanismo — link nell'hash, QR, applicazione sul telefono che riceve — è uno solo, e la copia rimasta indietro sarebbe quella che perde un carattere della firma senza dirlo.
- **Compressione e anteprime duplicate** invece che condivise: il codice immagini di Bolle contiene anche il controllo di leggibilità, che è specifico delle bolle (misura se un testo è leggibile). Estrarlo avrebbe voluto dire rimaneggiare un file del modulo in produzione. Cinquanta righe duplicate sono un prezzo accettabile; da riunire quando entrambi i moduli saranno stabili.
- **Nessun controllo di leggibilità** in questo modulo: una foto di cantiere non è un foglio da leggere, e un avviso che scatta a caso viene ignorato sempre.
