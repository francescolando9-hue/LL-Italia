# LL Italia — PWA modulare del gruppo

App contenitore a moduli del gruppo MLP / LL Italia. Primo modulo attivo: **Bolle** — fotografare le bolle di consegna in cantiere e inviarle al sistema di magazzino (endpoint HTTP → raccolta SharePoint BolleInArrivo). I moduli futuri si aggiungeranno senza rifare la base.

Stack: **vanilla JS, HTML, CSS** — nessun framework, nessun build step, nessuna dipendenza a runtime. PWA con Service Worker (offline e installazione) e IndexedDB (coda del modulo). Fonte di verità del modulo Bolle: la specifica funzionale in `docs/` (`AppBolleSpecificaFunzionale….md`, prevale su tutto), poi `CLAUDE.md`.

## Come installarla sul telefono

L'app è pubblicata su GitHub Pages: `https://francescolando9-hue.github.io/LL-Italia/`
La pubblicazione è automatica a ogni push su `main` (workflow `.github/workflows/pages.yml`, che attiva Pages da solo alla prima esecuzione).

**Android (Chrome):** aprire il link → menu ⋮ → **Aggiungi a schermata Home** (o "Installa app") → confermare. L'icona LL Italia compare in home e l'app si apre a schermo intero.

**iPhone/iPad (Safari):** aprire il link → pulsante Condividi → **Aggiungi a schermata Home** → confermare.

Alla prima apertura l'app chiede **chi sei**, scegliendo da un elenco chiuso di nomi: la scelta è salvata sul dispositivo e allegata a ogni invio. Dopo la prima visita l'app funziona anche **senza rete**.

## Come si usa

1. Aprire il modulo Bolle (l'app ci entra direttamente; la home dei moduli resta raggiungibile dal logo in alto a sinistra).
2. **Fotografa bolla** (camera posteriore) oppure **Scegli dalla galleria** (multi-foto). Le foto entrano subito in IndexedDB come bozze: non si perdono nemmeno chiudendo l'app.
2b. **La fotocamera è dentro l'app**: si scatta, la miniatura si accoda in basso, si scatta ancora, e alla fine si tocca **Fine** — come in WhatsApp. Gli scatti di una stessa sessione sono le **pagine di una sola bolla**: è la ragione per cui la sessione esiste. La fotocamera **del telefono** resta a un tocco (secondo pulsante), e diventa l'unica se il permesso viene negato.
3. Subito dopo la prima foto l'app dice cosa sta per partire — *«Questa foto è una bolla di una pagina»* — e offre **«+ Aggiungi pagina a questa bolla»**. Se la bolla continua su un altro foglio si tocca quel pulsante e si scatta la pagina successiva: le anteprime si numerano (`pag. 1`, `pag. 2`…) e il pulsante diventa *Invia 1 bolla di N pagine*. Se invece la bolla è finita, si manda così. La composizione si chiude a ogni invio: la bolla dopo riparte da una pagina.
4. Scegliere il **cantiere** e, se si vuole, la **fase di lavoro** (dal secondo invio gli ultimi usati sono preselezionati) e premere **Invia**. La fase viene da un elenco chiuso di gruppo (`core/fasi.js`), lo stesso del modulo Foto — a video si legge «Finitura alloggi», quello che viaggia è il codice `FinituraAlloggi`, senza spazi, che sul server è anche il nome della cartella — e **nelle bolle è facoltativa**: «— nessuna fase —» è una scelta valida e il campo parte vuoto. (Nel modulo Foto è obbligatoria per le foto da archiviare.)
4b. **Fotografa** e **Invia** stanno in una **barra fissa in basso**, sempre visibili qualunque sia il punto della pagina: con dieci bolle da mandare il giro è scatta → Fine → Invia → Fotografa, senza cercare i pulsanti su e giù per la pagina.
4c. **Le due azioni della barra sono le cose più grandi a video** (dalla 0.32.0): 64 px di altezza, colore pieno, e finché non c'è niente da mandare *Fotografa* si prende due terzi della barra. Le vie alternative — la fotocamera di sistema, la galleria — restano nella scheda una sotto l'altra, **col nome per esteso e il bordo blu**, ma alte 52 px contro i 64 della barra: a dire «secondaria» è la **misura**, non un'etichetta accorciata né un bordo grigio. Due tentativi sbagliati per arrivarci, in un giorno: il primo lasciava quei pulsanti alti 76 px col testo più grande della pagina; il secondo li stringeva su due colonne e per farceli stare ne accorciava i nomi a «Del telefono», «Un video» — frammenti che non dicono cosa fanno — con un bordo grigio che li faceva sembrare spenti. Prima era il contrario: *«Usa la fotocamera del telefono»* era alto 76 px contro i 56 della barra, ed era quello che veniva da premere aprendo l'app.
5. Nella **Coda invii** ogni foto passa per gli stati *In coda → Invio in corso → Inviata* (o *Errore*, con pulsante Riprova). *Inviata* significa **salvata in raccolta**: è la risposta del flow a farlo passare, non l'invio della richiesta.
6. **Prova offline:** attivare la modalità aereo, scattare e premere Invia → le foto restano *In coda*; al ritorno della rete partono da sole. L'invio riparte anche a ogni apertura dell'app, con retry automatico a backoff (5 s → 10 s → … → max 5 min).

**Collaudo sui numeri, mai sull'esito formale:** i quattro contatori in alto (Scattate oggi / Inviate oggi / In attesa / Errore) sono il riferimento. "Scattate" conta le foto confermate con Invia (le anteprime rimosse prima dell'invio non contano). Un invio "riuscito" si dimostra confrontando scattate vs inviate vs foto atterrate a destinazione: ogni scarto è un difetto da spiegare.

## Bolle inviate (storico)

Dalla schermata del modulo, il pulsante **Bolle inviate** apre il registro degli invii confermati:

- **Calendario del mese**, con i giorni che hanno bolle evidenziati e il numero sopra ciascuno. Si tocca un giorno per vederne l'elenco, lo si ritocca (o si usa *Tutto il mese*) per tornare al mese intero; le frecce spostano di mese. All'apertura il calendario si posiziona sul mese dell'ultimo invio.
- **Elenco** raggruppato per giorno, con ora, cantiere e operatore. **Toccando una riga la bolla si apre a schermo intero.**
- **Filtro cantiere** e totale del periodo con il dettaglio per commessa.

Delle foto inviate il telefono conserva l'originale solo per le ultime N (impostazione del modulo, default 20); di tutte conserva invece una **miniatura a 800 px** (~70 KB), fino a 300 bolle. Aprendo una riga si vede l'originale se c'è ancora, altrimenti la miniatura, che basta a riconoscere la bolla ma non a leggerne le righe — per quello c'è la raccolta. Oltre le 300, la riga resta nell'elenco senza immagine.

Il registro è **locale al dispositivo**: mostra ciò che quel telefono ha inviato, non è la vista condivisa della raccolta e non segue il cambio di dispositivo. Il raggruppamento per giorno usa la **data di scatto** (`dataInvio`), non l'istante di consegna al server.

## Foto già inviata

Aggiungendo dalla galleria un file **identico** a uno già presente (stessa immagine, non un secondo scatto), l'app lo riconosce dall'impronta SHA-256 del file originale e avvisa: *«Questa foto è già stata inviata il … alle … su …»*. La scelta resta all'operatore — si può confermare e mandarla comunque — ma il doppione per sbaglio non passa più inosservato.

Due scatti diversi della stessa bolla restano invece due invii distinti: nessun confronto di byte può riconoscerli, servirebbe leggere il numero della bolla (OCR), che è fuori perimetro.

## Controllo di leggibilità

Appena la foto è acquisita, l'app misura nitidezza e zone bruciate e avvisa se sembra **mossa, troppo scura o in controluce**: l'anteprima si marca in arancione col motivo. Una bolla illeggibile scoperta in cantiere si rifà in cinque secondi; scoperta in ufficio la sera è persa.

**Avvisa, non blocca**: l'operatore può inviare comunque, perché la regola che nessuna bolla si perda prevale. Le soglie sono tarate per non allarmare sulle foto buone — un avviso che scatta sempre viene ignorato sempre. Metodo e valori misurati: `docs/AppBolleLeggibilita….md`.

Il controllo non legge il contenuto della bolla: misura solo il contrasto locale dei pixel, quindi il modulo resta capture-only.

## Configurare un altro telefono

Un telefono già configurato può passare indirizzo e codice a un altro senza digitare nulla: *Impostazioni del modulo Bolle* → **Configura un altro telefono** mostra un codice QR da far inquadrare (e il link, copiabile).

I dati viaggiano dentro l'hash dell'indirizzo, che il browser **non** invia al server: non finiscono nei log di GitHub Pages. Il telefono che riceve mostra destinazione e codice mascherato, chiede conferma, e dopo l'applicazione ripulisce l'indirizzo per non lasciare il segreto nella cronologia.

⚠️ Quel codice **vale come una password**: si mostra solo a chi deve usare l'app, non si appende in bacheca e si manda per messaggio diretto, non in un gruppo.

## Rimanda una foto o una bolla già inviata

Dalla 0.36.0, sotto **ogni** elemento inviato — foto e bolle — c'è **Rimanda**, per qualunque motivo: foto venuta male, dato sbagliato, o il dubbio che non sia arrivata. Si apre un riquadro coi campi già compilati, e il pulsante dice **quale delle due cose** sta per fare, perché in raccolta sono due cose diverse:

- **Rimanda la stessa** (niente modificato) — riusa lo **stesso identificativo**. Il flow riconosce il duplicato, non crea un doppione e l'app scrive *«Era già in raccolta»*. Non conta fra le inviate di oggi: in raccolta non è arrivato niente di nuovo, e quel numero serve a essere confrontato coi file atterrati.
- **Rimanda corretta** (cantiere, fase, livelli o nota cambiati) — è un **invio nuovo**, con identificativo e numero progressivo nuovi. Quella già mandata resta in raccolta e **va annullata dall'ufficio**: il telefono non può sapere se è già stata lavorata. L'ora dello scatto resta quella della foto — rimandarla non la riscatta. Per una pagina di una bolla di più fogli l'`idBolla` resta quello dell'originale, così la correzione non spezza la bolla in due.

Serve che la foto sia ancora sul telefono: rimandare una miniatura al posto dell'originale consegnerebbe all'ufficio una foto peggiore.

## Cantiere sbagliato

Nello storico, aprendo una bolla si può **rimandarla su un altro cantiere** — capita di inviare col picker rimasto sull'ultimo cantiere usato. Possibile solo se la foto originale è ancora sul dispositivo: rimandare la miniatura significherebbe consegnare al magazzino una bolla meno leggibile.

La bolla già inviata **resta in raccolta**: l'app lo dice esplicitamente e va annullata dall'ufficio. È un limite della scelta capture-only, non un difetto.

## Informazioni e aggiornamenti

Dalle impostazioni dell'app, il link **Informazioni sull'app** apre la pagina che serve al supporto quando un operatore chiama dal cantiere: versione in uso (e, se diversa, quella pronta da applicare), se il funzionamento offline è attivo, stato della rete, spazio occupato sul telefono. C'è anche un pulsante **Cerca aggiornamenti**.

Sotto, **una scheda per ogni modulo** con i suoi numeri: da inviare, in coda, **bloccate** (marcate in rosso: è il numero per cui si telefona), scattate e inviate oggi, più quello che il modulo ha di suo — storico e progressivo per le bolle, progressivo per le foto. I numeri li dichiara il modulo, non la shell: prima li leggeva solo dalle bolle, e un telefono con tre foto ferme in errore compariva come «0 in errore» proprio nella pagina che esiste per capire cosa è bloccato.

### Senza rete

Collaudato spegnendo il server che serve l'app — non simulando la rete assente nel browser, che in Chromium non ferma le richieste del service worker e misura meno di quanto sembri. Con il server spento continuano a funzionare: home, modulo Bolle, modulo Foto, storico, tutte le impostazioni, Informazioni, e il **QR di configurazione** di entrambi i moduli. Una bolla scattata senza rete entra in coda, resta, e parte da sola al ritorno del campo.

Il QR era l'unico pezzo che offline non si disegnava: il generatore si carica a richiesta e non era nel precache. Due telefoni in cantiere senza campo sono esattamente il caso in cui serve, quindi ora è precachato — e se qualcosa va storto comunque, il messaggio dice se manca la rete invece di dare la colpa al telefono.

### Quando il telefono è pieno

Con la memoria piena lo scatto **non entra in coda**: è il caso in cui la promessa «la foto non si perde» dipende dall'operatore, quindi deve capirlo. Prima arrivava a video il messaggio del browser, in inglese e nel suo gergo (*«Failed to execute 'add' on 'IDBObjectStore'»*); ora dice *«Memoria del telefono piena: la bolla NON è stata salvata. Manda quelle in attesa, poi libera spazio e riprova»*, e l'app smette di provare con le altre foto di quell'invio invece di ripetere lo stesso errore.

Collaudato restringendo davvero la quota del sito a 1 MB e provando con una foto da 12 MB, su entrambi i moduli. Il riconoscimento copre i nomi che l'errore prende su browser diversi, non solo quello di Chrome.

### Riparti col conteggio di oggi

Sulla stessa pagina, in fondo, il pulsante **Azzera i contatori di oggi**. Serve quando l'ufficio ha tolto da SharePoint delle bolle mandate per sbaglio e queste vanno rimandate: i contatori del giorno sommano invii veri e invii annullati, e non si capisce più quanti siano quelli buoni — proprio il numero su cui si regge il collaudo.

Azzera i contatori del giorno e toglie dall'elenco le bolle già confermate dal server. **Non** tocca:

- le foto ancora da inviare o in errore — nessuna bolla non arrivata può sparire da lì;
- lo storico delle bolle inviate, che è il registro del dispositivo e non un contatore;
- la **numerazione progressiva**, che deve proseguire: azzerarla aprirebbe in raccolta un buco falso, indistinguibile da una bolla persa.

Sta in una pagina secondaria e chiede conferma in due passaggi, con davanti i numeri che si stanno per azzerare: con i guanti un tocco per sbaglio ci sta.

La versione non è scritta a mano da nessuna parte: si legge dal nome della cache che il Service Worker ha davvero attiva, quindi non può divergere dal codice pubblicato.

Quando si pubblica una versione nuova, sui telefoni già installati compare in basso una barra **«È disponibile una versione aggiornata dell'app»** con il pulsante *Aggiorna*: nessuno deve svuotare cache o reinstallare.

## Impostazioni

- **App** (⚙ in alto a destra, condivise tra moduli): il proprio nome, **da un menù a tendina**; sotto, il riquadro *Questo dispositivo* con l'identificativo in sola lettura e il pulsante per copiarlo.

  L'elenco è chiuso (`core/operatori.js`) perché scritto a mano lo stesso operatore diventa «Paolo Sanzarello», «Paolo», «Sanzarello» e ogni refuso possibile: in raccolta sembrano persone diverse, e qualunque conteggio per operatore smette di valere. Un telefono aggiornato da una versione precedente **conserva il nome se corrisponde a uno dell'elenco** (anche con maiuscole o spazi diversi); se non corrisponde — «P. Sanzarello» — l'app **richiede la scelta** invece di indovinare: attribuire un invio per somiglianza è peggio di una domanda in più. Per aggiungere o togliere un nome si modifica l'elenco e si rilascia una versione: dal telefono non si può.
- **Modulo Bolle** (link in fondo alla schermata del modulo): endpoint di invio, token, quante foto inviate conservare (ultime N, default 20). L'elenco cantieri non si tocca da qui: vedi sotto.

**La modalità mock non è più un'impostazione** (rimossa il 03/09/2026, con l'app entrata in uso). Era un interruttore di sviluppo in mano all'operatore, e accesa per sbaglio significava bolle che l'app dava per inviate e che non arrivavano da nessuna parte. Resta disponibile **solo su localhost**, per lo sviluppo: la si accende da `core/configurazione.js` e il banner giallo lo dichiara a video. In campo è spenta qualunque cosa dica il valore salvato sul dispositivo — anche su un telefono che l'aveva accesa prima dell'aggiornamento.

## Modulo «Foto cantiere»

Secondo modulo, accanto a Bolle: chi è in cantiere fotografa e manda in ufficio. **Due categorie, scelte prima di scattare** come si sceglie il cantiere:

| Categoria | Codice | A cosa serve | Come parte |
|---|---|---|---|
| Avanzamento lavori | `AVANZAMENTO` | dire a che punto è una lavorazione | compressa (2500 px, 0,85) |
| Da archiviare sul server | `ARCHIVIO` | documentazione per la cartella di commessa su `L:` | **risoluzione originale** |

La categoria si sceglie prima perché **decide come l'immagine viene preparata**, non è un'etichetta messa dopo: cambiarla a foto già pronte non ricomprime nulla, e l'app lo dice invece di tacere. Per l'archivio, se il file è già JPEG partono **i byte originali senza ricodifica** — ricomprimere «a qualità massima» degraderebbe l'immagine senza vantaggi; HEIC e PNG vengono convertiti a piena risoluzione, perché in raccolta il file si chiama `.jpg`.

**Si può inviare anche un video** (*Registra un video*), che parte con la fotocamera **di sistema**: registrare in-app darebbe formati diversi fra Android e iPhone e non userebbe l'encoder del telefono. Il video **non viene compresso** — transcodificare in un browser non è realistico — quindi conta il **tetto di peso** nelle impostazioni del modulo (predefinito 20 MB): un file più grande non entra in coda e l'app lo dice subito, invece di farlo ritentare a vuoto. Anteprima e durata si ricavano da un fotogramma del filmato. Foto e video possono stare nello stesso invio.

Accanto al cantiere c'è la **fase di lavoro** (dalla 0.31.0), dallo stesso elenco chiuso del modulo Bolle, con l'ultima scelta preselezionata; vale per tutte le foto di un invio. **È obbligatoria per le foto da archiviare** (dalla 0.33.0): quelle vanno sul server nella cartella della fase, e senza fase non saprebbero dove andare — se fra le foto in attesa ce n'è almeno una d'archivio, Invia resta spento e l'avviso dice perché. Per l'avanzamento lavori resta facoltativa. Lato raccolta serve la colonna `Fase`; finché non c'è il flow ignora il campo.

**Sotto la fase, un livello** (dalla 0.36.0). L'archivio di commessa sul server ha una cartella in più sotto la fase, e **dove c'è sostituisce la cartella del mese**: `Strutture\P1\`, `FinituraAlloggi\P1\1.01\`, `FinituraFacciata\Nord\`, mentre una fase senza livelli resta `Bonifica\202609\`. L'app chiede quindi **piano**, **unità** o **prospetto**, ma solo dove la fase li pretende — 10 fasi vogliono il piano, 4 l'unità, 1 il prospetto, 11 niente — e **dove li chiede sono obbligatori**: non esistono livelli facoltativi, perché una cartella non si indovina. Con l'unità il **piano non si chiede**: lo ricava l'app dalla mappa dell'anagrafica e lo manda comunque, e sotto il menù si legge quale ha ricavato. La mappa **non si deduce dal codice**: le commesse numerano diversamente (`1.01` su MAR, `1A` su MNG) e `10A` su SNZ2.2 sta al `P10`, non al `P1`. Due filtri: per la fase `Interrato` solo i piani sotto quota, e una commessa senza interrati non vede nemmeno la fase (è il caso di MAR).

**Per le urbanizzazioni il lotto prende il posto della fase.** Su `SNU` e `BRU` il campo si chiama **Lotto** e mostra i lotti di quella commessa; il valore viaggia nello stesso campo `fase` (`Lotto2`), perché a valle è sempre la cartella immediatamente sotto la commessa. Il selettore è condiviso col modulo Bolle, quindi anche una bolla di SNU prende il lotto.

Piani, unità, prospetti e lotti stanno in `core/anagrafica.js`: è **dato, non logica**, è la copia di un master che vive su `L:` e si sostituisce in blocco. La sua versione si legge nella pagina Informazioni. Le commesse concluse (`SNZ2.1`, `MRS`) non hanno anagrafica: le loro fasi restano tutte e i tre campi non viaggiano — a valle la foto va nella cartella del mese con un'anomalia, che è meglio di un operatore bloccato in cantiere per un dato che manca in ufficio.

**Una copia ridotta senza data di scatto si ferma** (dalla 0.36.0). Il 17/09 cinque foto scelte dalla galleria erano copie fatte da Google Foto dopo «Libera spazio», o da WhatsApp: senza EXIF, e l'app ha stimato l'ora dell'invio — con scatto e invio in due mesi diversi, la foto finisce nel mese sbagliato. Ora un file di galleria senza `DateTimeOriginal` **non entra in coda**: l'app avvisa, dice di cercare l'originale nell'album *Fotocamera*, e lascia la via d'uscita *Aggiungi comunque* — in quel caso parte con la **data del file** (se plausibile: non nel futuro, non prima del 2020) e `scattoStimato` `SI`. Le foto **scattate** dall'app non passano da qui: quelle l'ora ce l'hanno.

C'è una **nota facoltativa** (max 255 caratteri) che vale per tutte le foto di un invio, e si svuota dopo. Coda offline, retry e contatori del giorno funzionano come in Bolle, con un database e un endpoint propri: i due moduli non si toccano.

Ogni foto porta anche **`idDispositivo` e `progressivo`**, come le bolle: senza una sequenza per dispositivo non si può dimostrare che nessuna foto si è persa fra telefono e raccolta, si può solo sperarlo. Il numero si assegna **all'accodamento** (una bozza scartata non lascia buchi), parte da 1 e non si azzera mai; la sequenza è **propria del modulo** e non va confrontata con quella delle bolle. L'identità del telefono invece è una sola per tutta l'app (`core/dispositivo.js`) e un telefono che usava già le bolle **conserva quella che aveva**. Il raggruppamento si fa su `IdDispositivo`, **mai** su `Operatore`, che è testo libero.

**L'ora dello scatto è l'ora dello scatto** (dalla 0.29.0). Prima era l'ora dell'**invio**: due foto d'archivio di SNZ2.2 fatte alle 08:31:39 e alle 08:31:42 sono atterrate in raccolta con la stessa `DataScatto` 202609140915, cioè il momento in cui l'operatore ha premuto Invia — 44 minuti dopo. Ora, per una foto scelta dalla galleria, l'app legge `DateTimeOriginal` dall'**EXIF del file originale**, prima di qualunque ricodifica (la compressione dell'avanzamento passa per un canvas, e dal canvas l'EXIF non esce). Se la foto porta anche `OffsetTimeOriginal` il fuso è quello; altrimenti le cifre si leggono come ora locale del dispositivo, **mai come UTC**. Per gli scatti fatti dentro l'app l'ora è quella dell'istante dello scatto, non quella del *Fine*: con dieci foto di fila la differenza sono minuti.

Quando l'ora non si riesce a sapere — niente EXIF, tag assente, orologio del telefono mai impostato, o un video (l'ora di ripresa sta nel contenitore, non nell'EXIF: **punto aperto**) — l'app ripiega sull'ora di accodamento e **lo dichiara**: il campo `scattoStimato` vale `SI` invece di `NO`. Serve a non dover distinguere a mano una misura da un'approssimazione, che è la condizione che ha reso invisibile il difetto per due settimane. Nessuna libreria: 128 KB di testa del file e una scansione dei marcatori JPEG (`core/exif.js`). **Da fare lato raccolta:** la colonna `ScattoStimato`; finché non c'è, il flow ignora il campo e le foto atterrano lo stesso, con l'ora giusta.

Nelle impostazioni del modulo c'è **Configura un altro telefono**, come in Bolle: un QR porta indirizzo e codice su un altro dispositivo senza digitare nulla. Il link è **solo di questo modulo**, perché la destinazione è un'altra.

**Per i file che non stanno in una richiesta c'è il caricamento a blocchi**, da accendere nelle impostazioni del modulo (*Caricamento a blocchi per i file grandi*, **spento per default**). Il telefono chiede al flow **dove** mettere i byte (`azione: "preparaCaricamento"`), li manda a pezzi in `PUT` diretti a quell'indirizzo — senza passare dal flow, quindi senza limite di taglia del corpo — e alla fine avvisa il flow perché scriva le colonne (`azione: "completaCaricamento"`). Un caricamento interrotto **riprende da dove era**: al tentativo successivo l'app chiede al server quanti byte ha davvero e riparte da lì, invece di rispedire decine di megabyte. Con i blocchi attivi il tetto di peso è un altro, più alto (predefinito 200 MB): il vincolo non è più la richiesta, è il tempo. Su un flow che non sa rispondere il file **resta in coda** con un errore che si legge, non sparisce.

Collaudato in locale: un video da 28,9 MB passa in 16 blocchi e arriva **intero** (byte contati, non «esito verde»); interrotto al terzo blocco riprende da 5.898.240 e non da zero; un flow che risponde «inline» lascia il file in coda in Errore.

⚠️ **Oggi l'interruttore va lasciato spento, e l'app lo dice a video.** Il collaudo del 10/09/2026 ha trovato un gradino prima del CORS: la sessione di caricamento non si riesce ad aprire — `_api/v2.0/drives` risponde 200, ma `createUploadSession` risponde **403 accessDenied**. Il prossimo passo non è codice dell'app: è un flow di prova da due azioni (trigger HTTP + *Send an HTTP request to SharePoint* verso `createUploadSession`). Se torna 200 con `uploadUrl` si riparte; se torna 403 serve la registrazione applicativa su Entra con `Sites.Selected`. Dettagli in `docs/AppFotoCantiereSpecifica….md` §4-bis.

Misure **sul flow vero** (10/09/2026, telefono reale): avanzamento 1,49 MB → ~2,0 MB di corpo; archivio da fotocamera nativa 4,39 MB → ~5,9 MB. L'ipotesi «foto d'archivio da 12 MB, corpo da 16 MB» **non si è verificata**: un telefono non produce JPEG da 12 MB, e per l'archivio l'app spedisce i byte originali senza ricodificarli. Quindi **per le foto l'invio in una richiesta basta**, con margine largo dentro la finestra di 120 secondi del trigger. Se il flow rifiuta un corpo, l'app lo dice e la foto resta in coda.

Specifica completa e requisiti del flow: `docs/AppFotoCantiereSpecifica….md` (rev. 5). Quello che è stato **misurato sul tenant** sta in `docs/FotoCantiereBriefingRicevente.md`, e dove i due divergono **fa fede il briefing**. Il lavoro a valle — come le foto d'archivio arrivano dalla raccolta alle cartelle di commessa sul server — ha un runbook che **non sta in questo repo**: vive su `L:` accanto al file di conoscenza di progetto, perché nomina percorsi del server interno e qui verrebbe pubblicato su GitHub Pages. Si esegue in Cowork, il venerdì. **Punto aperto:** l'apertura della sessione di caricamento a blocchi.

## Collaudi

Le prove automatiche stanno in `collaudi/`: guidano l'app da un browser vero, come farebbe un telefono, e **dicono i numeri** invece di limitarsi a passare.

```
cd collaudi && npm install playwright && cd ..   # una volta sola
node collaudi/materiale.js                       # genera le foto di prova
node collaudi/esegui.js                          # tutti, esce 1 se qualcosa non torna
```

Playwright è una dipendenza di **sviluppo**: l'app resta senza dipendenze e senza build step. Le foto di prova si generano, non si committano.

Sedici collaudi: senza rete, versione in uso, pagina Informazioni, memoria piena, continuità delle bolle, bolle su più pagine, contratto di invio delle foto, errori del flow, elenco chiuso degli operatori, ora dello scatto, obiettivo e comandi della fotocamera in-app, fase di lavoro e barra dei comandi, gerarchia visiva, sette commesse, **livelli dell'archivio** e **Rimanda**. In `collaudi/LEGGIMI.md` c'è cosa prova ciascuno, **le trappole già pagate** (a partire da `page.waitForFunction` con predicato `async`, che non aspetta niente) e — soprattutto — **cosa questi collaudi non dimostrano**: il telefono vero, il flow vero, i video, il caricamento a blocchi.

## Struttura del repo

```
index.html            shell: testata, outlet delle viste
manifest.webmanifest  manifest PWA "LL Italia"
sw.js                 service worker: precache e offline (bump di VERSIONE a ogni release)
icons/                icone dal logo ufficiale (logo.png = sorgente)
core/                 shell: router hash, home/launcher, impostazioni app, design system CSS
core/vendor/          codice di terzi incluso nel repo (vedi sotto)
core/cantieri.js      anagrafica cantieri, condivisa dai moduli
core/operatori.js     chi può firmare un invio: elenco chiuso, condiviso
core/fasi.js          le fasi di lavoro: elenco chiuso, codice + etichetta, condiviso
core/anagrafica.js    piani, unità, prospetti, lotti e cosa ogni fase pretende:
                      copia di un master su L:, si sostituisce in blocco
core/endpoint.js      api-version dei flow Power Automate, condivisa
core/fotocamera.js    fotocamera dentro l'app, multiscatto, condivisa dai moduli
core/dispositivo.js   identità dell'installazione, una per telefono, condivisa
core/informazioni.js  pagina per il supporto: i numeri li dichiarano i moduli
core/errori.js        messaggi d'errore verso l'operatore, una sola verità
core/coda-invio.js    motore della coda: retry, backoff, «esce solo a conferma»
core/configurazione-link.js  link e QR che configurano un altro telefono, condivisi
core/versione.js      versione in uso, letta dalla cache attiva del service worker
modules/bolle/        modulo Bolle: vista, coda IndexedDB, compressione, invio, impostazioni
modules/foto/         modulo Foto cantiere: due categorie, coda propria, invio
collaudi/             prove automatiche su browser vero (node collaudi/esegui.js)
docs/                 7 documenti, tutti correnti:
                      INDICE.md                         indice a nome stabile: i nomi completi
                                                        degli altri, per chi legge da fuori
                      AppBolleSpecificaFunzionale….md   specifica ufficiale, rev. 2 (prevale su tutto)
                      AppBolleFlowRicezione….md         flow di ricezione e raccolta BolleInArrivo
                      AppBolleContinuitaRunbook….md     documento unico per il lavoro a valle
                      AppBolleLeggibilita….md           metodo e taratura del controllo di leggibilità
                      AppFotoCantiereSpecifica….md      modulo Foto cantiere, rev. 5
                      FotoCantiereBriefingRicevente.md  stato reale misurato sul tenant (prevale
                                                        sulla specifica dove divergono)
```

**Una deroga da ratificare:** `core/vendor/qrcode.mjs` è codice di terzi incluso nel repo — il generatore di QR `qrcode-generator` di Kazuhiko Arase, licenza MIT, copiato senza modifiche. Non è una dipendenza installata (nessun npm, nessun build step) e viene caricato **solo** dalla schermata di condivisione della configurazione, quindi non pesa sull'avvio. Scriverne uno da zero avrebbe significato implementare correzione d'errore Reed-Solomon e mascheratura: un QR sbagliato è peggio di nessun QR. La verifica è per decodifica: il collaudo rilegge col riconoscitore il codice generato e confronta il testo con il link atteso.

Un modulo nuovo = una cartella in `modules/` + l'import nel registro `moduli` di `core/app.js` (la tessera in home compare da sola). Nella shell sta ciò che è di tutti i moduli: anagrafica cantieri, normalizzazione degli endpoint, versione dell'app.

## Pipeline della foto

Compressione client-side prima dell'accodamento: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità per l'OCR del runbook prevale sul peso); HEIC gestito via canvas dove il dispositivo lo decodifica. Una foto esce dalla coda **solo a conferma del server** (202 Accepted); ogni invio porta un `idClient` univoco, su cui il backend potrà deduplicare.

### La fotocamera dentro l'app

`<input type="file" capture>` passa il controllo alla fotocamera **di sistema**, che dopo ogni scatto torna al browser: per una bolla su tre fogli significa entrare e uscire tre volte, e chi ha poca dimestichezza si perde. La fotocamera interna (`getUserMedia`, in `core/fotocamera.js`, condivisa dai due moduli) risolve questo: video a tutto schermo, **scatto al centro** dove il pollice lo cerca, **Fine alla sua sinistra**, niente a destra (dalla 0.30.0; prima Fine riempiva tutto e lo scatto finiva in basso a sinistra), rullino delle miniature, contatore.

**Quale obiettivo apre** (dalla 0.30.0). Chiedere al browser «una fotocamera posteriore» su un telefono che ne ha tre significa lasciarlo scegliere, e su diversi Android sceglieva l'**ultra-grandangolare**: inquadra tutto il foglio ma distorce, perché il flusso che arriva all'app è grezzo, senza la correzione che l'app di sistema applica a quella lente. Il browser non dice la focale, ma dice il **nome** della fotocamera, e i nomi seguono due convenzioni — Android numera («camera2 0, facing back», dove la 0 è di norma la principale), iPhone nomina la lente («Back Camera», «Back Ultra Wide Camera»). L'app scarta le posteriori che si dichiarano ultra/wide/tele/macro e fra le altre prende quella col numero più basso e il nome più corto: **nessuna configurazione per modello**, funziona su qualunque telefono che segua una delle due convenzioni, e chi arriva domani con un telefono nuovo non deve dire niente a nessuno. Dove i nomi non aiutano si lascia fare al browser come prima, e la fotocamera di sistema resta a un tocco. Se una fotocamera «logica» parte con zoom sotto 1 — l'altro modo di trovarsi sull'ultra-grandangolare — si chiede zoom 1. **Cosa ha visto e cosa ha scelto** sta nella pagina Informazioni, riga *Fotocamera in-app*: è lì che si guarda se su un telefono la lente è sbagliata, invece di chiederlo a chi lo usa.

Verificato sui nomi che i telefoni dichiarano (Samsung e Pixel con Chrome, iPhone con Safari) e sulla meccanica con la fotocamera finta del collaudo; **la lente vera si verifica sul telefono vero**: l'inquadratura in-app deve coincidere con quella dell'app di sistema a 1×.

**Il compromesso, da conoscere:** `getUserMedia` dà il flusso video della fotocamera, non la foto elaborata dall'app di sistema — niente HDR, niente multiscatto, niente messa a fuoco assistita, e su alcuni telefoni una risoluzione inferiore allo scatto nativo. Per le bolle, dove la leggibilità del testo è il punto, **la fotocamera del telefono resta a un tocco**: su una bolla che esce poco leggibile è l'alternativa, e il controllo di leggibilità continua ad avvisare in entrambi i casi.

Due dettagli nati dal collaudo: il pulsante di scatto **nasce spento** e si accende quando il video ha dimensioni reali (`loadeddata` non basta, e senza l'attesa il primo scatto usciva vuoto **in silenzio**); uno scatto che comunque fallisce lo dice a video invece di sparire.

### Bolla su più pagine

Una bolla di consegna può essere su più fogli. La scelta è offerta **subito dopo la prima foto**, non dopo la seconda: il riquadro dice sempre cosa sta per partire (*una bolla di una pagina*, *una sola bolla di 3 pagine*, *3 bolle diverse*) e il pulsante **«+ Aggiungi pagina a questa bolla»** aggiunge il foglio successivo aprendo direttamente la fotocamera. Se l'operatore raggruppa per sbaglio, la via d'uscita è scritta lì: *«Non sono la stessa bolla: mandale separate»*.

**Il contratto non cambia — resta un file per richiesta**, quindi una bolla di tre pagine sono tre invii, ognuno col suo `idClient` e col suo `progressivo`, legati da `idBolla` (uguale per tutte le pagine) più `pagina` e `pagine`.

Anche una bolla di una pagina sola ha il suo `idBolla`, con `pagina` 1 e `pagine` 1: a valle la regola è una — si raggruppa per `idBolla` — senza casi particolari da ricordare. In *Coda invii* e nello storico ogni riga porta il marchio `pag. 2/3`.

**Il collaudo resta in pagine, non in bolle:** tre pagine sono tre file in raccolta e tre progressivi consumati. Il controllo di continuità non cambia — una pagina mai arrivata è un buco nella sequenza come qualunque altra foto — e un gruppo incompleto (`pagine` = 3 con due righe presenti) è un difetto da spiegare.

### Identificativo del dispositivo e numero progressivo

Ogni foto **accodata** riceve un intero incrementale, conservato in IndexedDB: parte da 1 alla prima installazione, non si azzera mai e sopravvive agli aggiornamenti dell'app. Viaggia nel payload come campo `progressivo` e compare a video accanto a ogni bolla — in *Coda invii* e nello storico — così l'operatore può leggerlo a voce quando serve un riscontro dall'ufficio. In *Informazioni sull'app* si vede il numero raggiunto.

Il titolare di quella sequenza è l'**`idDispositivo`**: un GUID generato alla prima apertura e salvato accanto al contatore, che identifica l'installazione e non la persona. Non cambia se l'operatore corregge il proprio nome; riparte solo con una reinstallazione, insieme al contatore. Si legge in *Impostazioni app → Questo dispositivo*, in sola lettura, con un pulsante per copiarlo.

Insieme rendono misurabile il tratto fra il telefono e la raccolta: **raggruppando le bolle per dispositivo, un numero mancante nella sequenza significa una foto scattata e mai arrivata.** Senza questi due campi quel tratto non sarebbe visibile in alcun modo. Raggruppare per `operatore` non basterebbe: è testo libero, quindi una grafia diversa del nome spezza una sequenza e due telefoni della stessa persona ne fondono due.

Perché il segnale resti affidabile, il numero si assegna **all'accodamento** (alla pressione di *Invia*), non allo scatto e non al tentativo di invio:

- una foto **scartata dalle anteprime** prima di inviare non brucia un numero: altrimenti si aprirebbero buchi finti, indistinguibili da una bolla persa;
- i **retry** riusano lo stesso numero, esattamente come `idClient`: il numero è dell'immagine, non della richiesta;
- il numero è assegnato anche **offline**, prima di qualunque rete: si vede in coda subito ed è già quello che arriverà al server.

La sequenza è **per dispositivo, non globale**: due telefoni hanno entrambi il proprio n. 1, e un telefono reinstallato riparte da 1 con un `idDispositivo` nuovo — evento atteso, e riconoscibile proprio perché l'identificativo cambia.

## Contratto con il backend (in vigore)

Il flow di ricezione è **già attivo e collaudato**: l'app si adegua, il contratto non si modifica dal lato app. Un file per richiesta, POST JSON:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",                       // solo il codice, vedi Cantieri
  "fase": "FinituraAlloggi",               // codice della fase senza spazi;
                                           //   per SNU e BRU è il lotto: "Lotto2"
  "piano": "P1",                           // livelli dell'archivio: codici senza spazi,
  "unita": "1A",                           //   null dove il livello non si applica,
  "prospetto": null,                       //   mai stringa vuota
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",                // GUID della bolla, per la deduplica futura
  "idDispositivo": "9b2c7f10-…",           // GUID dell'installazione: titolare della sequenza
  "progressivo": 137,                      // intero: sequenza di quel dispositivo
  "idBolla": "4c1a8e02-…",                 // GUID della bolla: uguale per ogni sua pagina
  "pagina": 2,                             // intero, da 1
  "pagine": 3,                             // intero: pagine che compongono la bolla
  "dataInvio": "2026-09-01T17:27:53+02:00",
  "versioneApp": "0.36.0",                 // versione che sta girando sul telefono
  "nomeFile": "BollaMAR20260901172753PaoloSanzarello.jpg",   // IGNORATO dal backend
  "contenutoBase64": "…" }

Risposta attesa: 202 Accepted senza corpo — è la conferma che fa uscire la foto dalla coda.
```

**`api-version=2024-10-01` è obbligatoria**: l'URL mostrato dal designer di Power Automate riporta `api-version=1` e viene rifiutato con 400. L'app corregge da sola il parametro al salvataggio delle impostazioni, lasciando intatta la firma `sig=`.

## Configurazione dell'endpoint (mai nel repo)

L'URL contiene una firma di accesso: il repo è pubblico, quindi l'URL non vi entra mai. Due strade:

- **Sul telefono e sull'app pubblicata** — modulo Bolle → *Impostazioni del modulo Bolle*: si incollano endpoint e token, che restano in `localStorage` di quel dispositivo. È il modo previsto per le squadre.
- **In sviluppo locale** — copia `core/configurazione.esempio.js` in `core/configurazione.js` (escluso da git tramite `.gitignore`), inserisci i tuoi valori e apri l'app **una volta** su `http://127.0.0.1:8123/?config=locale`: i valori vengono copiati nelle impostazioni del dispositivo, poi bastano quelle. Senza quel parametro il file non viene mai richiesto, quindi l'app pubblicata non lo cerca e non genera errori.

## Cantieri

L'elenco è in `core/cantieri.js` — nella shell, perché è di tutti i moduli — e **non è modificabile dal dispositivo**: un codice commessa errato arriverebbe al magazzino come commessa inesistente. A video l'etichetta estesa, nel payload solo il codice.

**Sette commesse dal 16/09/2026** (erano tre), in ordine alfabetico di codice:

| Codice nel payload | Etichetta a video |
|---|---|
| `BRU` | BRU - urbanizzazioni via Bardonecchia |
| `MAR` | MAR - Caselle Torinese |
| `MNG` | MNG - via Monginevro 181 |
| `MRS` | MRS - via Marsigli 11-13-15 |
| `SNU` | SNU - urbanizzazioni Settimo Torinese |
| `SNZ2.1` | SNZ2.1 - via Eva Mameli Calvino 7 |
| `SNZ2.2` | SNZ2.2 - Settimo Torinese |

**L'ordine del menù non dipende dall'ordine nel file:** lo impone un `sort()` sul codice al caricamento, così chi aggiunge una commessa la scrive dove capita e il menù resta in ordine. Il codice nel payload non cambia forma — è il lato ricevente a derivarne la cartella con una regola, non con una tabella, quindi una commessa nuova non richiede nient'altro nel contratto.

Al primo utilizzo la scelta è esplicita (`— scegli il cantiere —`, Invia resta disabilitato); poi l'ultimo cantiere usato è preselezionato.

## CORS: risolto il 03/09/2026

L'app gira in un browser, quindi ogni invio con `Content-Type: application/json` è preceduto da una richiesta **preflight `OPTIONS`**: perché l'app riceva la conferma, il flow deve rispondere al preflight e includere l'header `Access-Control-Allow-Origin`. Le tre azioni *Response* del flow lo portano, e da quel momento il verde dell'app significa **salvata** e non più soltanto **accettata** (senza Response esplicite Power Automate risponde `202` all'arrivo della richiesta, prima di eseguire il flow).

Verificato in laboratorio con endpoint finto, prima di toccare il flow reale: endpoint che risponde al preflight → 3 foto scattate, 3 inviate, 3 atterrate, 0 errori; endpoint che **non** risponde → 0 atterrate e **nessuna perdita**, le foto restano in coda in stato *Errore* con il messaggio «Invio bloccato: nessuna risposta dall'endpoint (rete assente o CORS)» e ripartono col retry appena il flow risponde correttamente. Poi verificato sul flow reale dal telefono: con token errato l'app riceve `401` e la foto **non** risulta inviata.

Dettaglio delle azioni e degli esiti: `docs/AppBolleFlowRicezione….md`.

## Sviluppo locale

```
python3 -m http.server 8123
# http://127.0.0.1:8123
```

A ogni modifica dei file dell'app vanno incrementate **due** costanti, insieme: `VERSIONE` in `sw.js` e `VERSIONE_CODICE` in `core/versione.js` (e va aggiornata la lista `RISORSE` in `sw.js` se si aggiungono file), altrimenti i dispositivi restano sulla cache vecchia.

**Perché la gerarchia visiva è un collaudo e non un'opinione.** Il pulsante più grande a video è quello che si preme: se non è l'azione principale, l'app sta dicendo una cosa e intendendone un'altra. `collaudi/13-gerarchia.js` lo misura in tutti e due i moduli — azione principale a **64 px**, azioni di contorno entro **54**, etichetta su una riga sola, nessun pulsante pieno di colore fuori dalla barra, corpo del testo più grande — e misura anche che l'avviso di *cosa manca per inviare* stia **dentro la barra**, a pochi pixel dal pulsante spento, e che l'avviso di aggiornamento non copra i comandi.

**E lo misura anche su uno schermo da 320 px**, non solo su quello di chi prova. Lì «Usa la fotocamera del telefono» in una riga non ci sta: con l'interlinea normale quel pulsante arriverebbe a 66 px, **più alto dei 64 dell'azione principale** — di nuovo il difetto di partenza, su un telefono che nessuno in ufficio ha in mano. L'interlinea stretta lo tiene a 57. È il motivo per cui le azioni di contorno non si possono alzare oltre i 52 px: non il gusto, il punto in cui l'etichetta va a capo.

**Perché due e non una.** `VERSIONE` dice cosa è *installato*, `VERSIONE_CODICE` cosa sta *girando*. Non sono la stessa cosa: il service worker fa `skipWaiting()`, quindi appena un pacchetto nuovo è sceso diventa attivo e cancella la cache vecchia, ma **la pagina già aperta continua a eseguire i moduli che aveva caricato** — il browser non li ricarica da solo. Finché non si ricarica, l'app sta eseguendo il codice vecchio con installato quello nuovo. Prima l'app leggeva la versione dal nome della cache e in quella finestra dichiarava la versione nuova: diceva di avere una correzione che non stava eseguendo, e stampava quel numero nella colonna `VersioneApp` della raccolta — falsando proprio il dato che serve a sapere con quale versione è stata mandata una foto. Ora le due si confrontano: quando non coincidono compare la barra **«Versione aggiornata pronta»** e Informazioni mostra sia quella in uso sia quella pronta. Se ci si dimentica di allineare le costanti, l'avviso resta acceso — rumoroso, ma non silenzioso.

Il precache non usa `cache.addAll`, che passa dalla cache HTTP del browser: ogni risorsa si chiede con `cache: 'reload'` e con la versione in coda all'indirizzo, così una versione nuova non può riempire la propria cache con i file della precedente. E a richiesta servita si guarda **solo** nella cache della propria versione, non in tutte, per non mettere in esecuzione un misto di due.

## Richieste aperte (raccolte il 14/09/2026, dopo il collaudo sul campo)

Quattro richieste di Francesco, emerse dall'uso in cantiere della 0.29.x. Si affrontano **una alla volta**, nell'ordine in cui sono state date; qui stanno perché non si perdano fra una sessione e l'altra. Nessuna è decisa: ogni punto porta le domande da chiudere prima di scrivere codice.

1. ~~**Obiettivo grandangolare nella fotocamera in-app.**~~ **Fatta nella 0.30.0.** Deciso da Francesco: scelta **automatica**, nessun pulsante, nessuna configurazione per modello di telefono — chi arriva con un telefono nuovo non deve dire niente. Come funziona: sezione *La fotocamera dentro l'app*. Resta da fare **la verifica sul telefono vero**: inquadratura in-app uguale a quella di sistema a 1×; se no, la riga *Fotocamera in-app* di Informazioni dice cosa il telefono ha dichiarato.
2. ~~**Disposizione dei comandi nella fotocamera in-app.**~~ **Fatta nella 0.30.0.** Deciso da Francesco: *Fine* a sinistra dello scatto, scatto al centro, **niente a destra**.
3. ~~**Fase di lavoro nel modulo Foto.**~~ **Fatta nella 0.31.0, in entrambi i moduli** (deciso da Francesco il 14/09, con l'elenco delle fasi: 26 dopo che ha tolto `CMC 128`). Deciso da Francesco: facoltativa nelle bolle e sull'avanzamento, **obbligatoria sulle foto da archiviare** (0.33.0), che sul server si smistano nella cartella della fase; ultima scelta preselezionata; campo `fase` nei due contratti e **colonna `Fase` da aggiungere** in entrambe le raccolte (Cowork). Resta da verificare `Impianto SEFCC` (in rosso nell'elenco originale).
4. ~~**Scatti in serie nel modulo Bolle.**~~ **Fatta nella 0.31.0** con la **barra fissa in basso** (Fotografa + Invia sempre visibili). Resta **proposto, non fatto**: il pulsante «Prossima bolla» dentro la fotocamera, che chiuderebbe e manderebbe la bolla corrente senza uscire — un tocco per bolla invece di tre, ma con invio implicito, senza vedere anteprima e avviso di leggibilità. Da decidere dopo aver provato la barra in cantiere.

## Decisioni del 18/09/2026, fatte nella 0.36.0

Sei punti dati da Francesco. Tutti fatti; le prime tre cambiano il contratto e **richiedono il lato ricevente prima della pubblicazione**.

1. **Il lotto al posto della fase** per le urbanizzazioni (`SNU`, `BRU`): viaggia nel campo `fase` col suo codice, selettore condiviso coi due moduli.
2. **`piano`, `unita`, `prospetto`** nel payload, comparsa guidata dall'anagrafica fase per fase: obbligatorio, derivato, o assente. `null` dove non si applica, mai stringa vuota.
3. **I due filtri su `Interrato`**: solo i piani sotto quota, e una commessa senza interrati non vede la fase.
4. **«Rimanda» su ogni elemento inviato**, nei suoi due casi distinti (sezione sopra).
5. **Le copie ridotte senza data di scatto si fermano** prima dell'invio, con la via d'uscita scritta.
6. **`scattoStimato` = `NO` per gli scatti dell'app.** Era **già così** per la fotocamera interna dalla 0.29.0, e il collaudo `10-ora-scatto.js` lo dimostrava; il caso che restava scoperto era la **fotocamera del telefono aperta dall'app** su una foto senza EXIF, che dichiarava `SI` pur essendo stata scattata un istante prima. Ora l'app distingue **da dove arriva il file**: quella strada dichiara `NO`, e `SI` resta alle copie di galleria senza data e ai video.

## Fuori perimetro (in capo a Francesco)

Sul flow e sulla raccolta: colonne `Progressivo`, `IdDispositivo`, `IdBolla`, `Pagina` e `Pagine` con le loro mappature, la colonna della data (`DataScatto`) di tipo testo (dettaglio in `docs/AppBolleFlowRicezione….md`), e — **dalla 0.36.0, prima della pubblicazione** — `Piano`, `Unita` e `Prospetto` in entrambe le raccolte più lo smistamento del venerdì riscritto (specifica Foto, §6). Deciso e chiuso: token riservato al posto di `collaudo`, autori da elenco chiuso (dal 14/09/2026, prima a campo libero), deduplica lato flow lasciata come controllo inerte. Rinviato: hosting di produzione, compressione adattiva su rete lenta, OCR, login M365, notifiche push, moduli futuri.
