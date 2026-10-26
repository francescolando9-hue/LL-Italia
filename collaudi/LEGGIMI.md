# Collaudi dell'app

Prove automatiche che guidano l'app da un browser vero, come farebbe un
telefono, e **dicono i numeri**: quante foto sono partite, quante sono arrivate,
cosa c'era scritto a video. «Verde» da solo non è un risultato — è la regola di
gruppo, e qui è il criterio con cui sono scritti.

## Come si eseguono

Serve **Playwright**, che è una dipendenza di sviluppo: non entra nell'app, che
resta senza dipendenze e senza build.

```
cd collaudi
npm install playwright        # una volta sola, su questo computer
cd ..
node collaudi/materiale.js    # genera le foto di prova (una volta sola)
node collaudi/esegui.js       # tutti i collaudi
node collaudi/esegui.js 05    # solo quelli col nome che contiene «05»
node collaudi/pubblicato.js   # DOPO un rilascio: il sito in linea dice la versione giusta?
node collaudi/esegui.js 12 16 --cpu=4               # CPU del browser rallentata 4 volte
node collaudi/esegui.js 16 --ritardo-letture=300    # letture della coda consegnate 300 ms dopo
```

**Le due leve** (dal 26/10/2026) servono a riprodurre a comando i rossi che
compaiono solo quando tutto è più lento — la suite completa, un PC carico —
invece di aspettare che capitino: `--cpu=N` rallenta la CPU del browser di
prova (CDP), `--ritardo-letture=ms` fa arrivare all'app con quel ritardo il
risultato delle letture da IndexedDB. La seconda serve dove la prima non
basta: la lettura la fa il processo del browser, e il rosso del collaudo 16 non
si vedeva nemmeno a CPU ×20. L'app non si tocca; le leve usate si leggono in
testa all'uscita. Con le due leve 12 e 16 sono verdi; il resto della suite con
`--ritardo-letture` non è stato misurato.

L'uscita è `0` se tutto torna, `1` se anche un solo controllo fallisce: si può
mettere davanti a un rilascio senza doverlo leggere a occhio.

Sia `collaudi/node_modules/` sia `collaudi/materiale/` sono esclusi dal repo:
il primo è roba di npm, il secondo sono megabyte di immagini generate.

## Cosa prova ciascuno

| File | Cosa dimostra |
|---|---|
| `01-offline.js` | Con **i server spenti e il telefono senza campo**: l'app si apre, tutti i moduli e le pagine funzionano, il QR di configurazione si disegna, una bolla scattata resta in coda e parte da sola al ritorno della rete. |
| `02-versione.js` | La versione dichiarata è quella che **sta girando**, non quella installata; con un pacchetto nuovo già sceso compare la barra e Informazioni distingue «in uso» da «pronta». |
| `03-informazioni.js` | La pagina del supporto mostra i numeri di **ogni modulo**; l'azzeramento dei contatori delle bolle non tocca le foto in errore. |
| `04-memoria-piena.js` | Con la **quota ristretta a 1 MB**: il messaggio è in italiano e dice cosa fare, e la foto non entra in coda (non si finge che sia salvata). |
| `05-continuita-bolle.js` | Progressivo per dispositivo senza buchi, identità **ereditata** dai telefoni già in uso, sequenze separate fra due telefoni. |
| `06-bolle-pagine.js` | Una bolla su più fogli resta una bolla: `idBolla` unico, pagine numerate, e la via d'uscita se il raggruppamento era sbagliato. Dalla 0.38.0 il cantiere si sceglie prima di ogni invio: dopo Invia riparte da «— scegli il cantiere —». |
| `07-foto-invio.js` | Il menù della categoria **non esiste più** (assente, non nascosto), ogni foto parte a **risoluzione originale** — byte identici al file sul telefono — e il campo **`tipo` vale `ARCHIVIO` su ogni invio**: è quello da cui il flow compone il nome del file e su cui filtra lo script archiviatore, quindi un campo vuoto lascerebbe la foto in raccolta per sempre senza nessun errore. Più: il contratto ha tutti i campi e i tipi giusti, e un file oltre il limite non entra in coda. Dalla 0.39.0 l'elenco esatto dei campi comprende **`scala`**, che c'è sempre e fuori da TN1 vale `null`. |
| `08-errori-flow.js` | Il flow rifiuta: la bolla resta sul telefono, il messaggio dice dove guardare, e al ritorno riparte da sola senza consumare un numero. |
| `09-operatore.js` | Il nome dell'operatore si **sceglie** da un elenco chiuso e non si scrive: niente segnaposto firmabile, e un nome salvato da una versione col campo libero viene riportato alla grafia ufficiale o richiesto di nuovo — mai indovinato. Il menu si confronta con `core/operatori.js` (stesso contenuto, stesso ordine) e il **numero dei nomi resta scritto a mano**: due cose che cambiano insieme non si accorgono di un nome sparito, questo sì. Dal 05/10/2026 prova anche che l'elenco serve i **due moduli** (un nome scelto una volta arriva uguale nel payload delle bolle e in quello delle foto); che l'elenco è **in ordine alfabetico** secondo la regola della shell — un nome aggiunto in fondo, che è il modo naturale di aggiungerne uno, fa fallire il collaudo — e che il telefono ricorda il **nome** e non la posizione: si rilegge quello che c'è scritto in `localStorage`, e un nome salvato con l'ordine di prima si ritrova scelto dopo il riordino. Il caso è scelto perché possa fallire: «Paolo Sanzarello» era il 1° dell'elenco e adesso è il 10°. |
| `10-ora-scatto.js` | `dataScatto` è l'ora dello **scatto**, letta dall'EXIF del file originale **prima** della ricodifica, col fuso del giorno dello scatto. Una **copia ridotta senza EXIF** (Google Foto, WhatsApp) **non entra in coda**: l'app avvisa e chiede, e mandata comunque parte con la **data del file** — provato su un file con la data messa ad agosto, che se l'app ripiegasse sull'ora dell'invio finirebbe in settembre: è l'unico modo di distinguere il ripiego giusto da quello sbagliato. Una foto **scattata** dall'app è sempre `scattoStimato` `NO`. Dalla 0.37.2 controlla anche la **riga di diagnosi**: che dica nome, peso, tipo, il motivo in italiano e i segmenti JPEG visti; che i dieci motivi di `core/exif.js` — letti dal sorgente, non elencati a mano — abbiano **ognuno la sua frase**, tutte diverse; e che **due file di due cause diverse** (un JPEG senza EXIF e un PNG) diano a video **due righe diverse**. Con un file solo, una frase unica per tutti i casi passerebbe. |
| `11-obiettivo.js` | La fotocamera in-app sceglie la lente **principale** dai nomi che i telefoni dichiarano (Samsung e Pixel con Chrome, iPhone con Safari), lascia fare al browser dove i nomi non aiutano, registra cosa ha visto per Informazioni; e i comandi stanno al posto giusto: scatto al centro, Fine a sinistra, niente a destra. |
| `14-commesse.js` | Le **otto commesse** (sette dal 16/09/2026, **TN1 dalla 0.39.0**): codice ed etichetta come concordate, menù in **ordine alfabetico di codice** e non nell'ordine del file — provato leggendo il file servito dall'app e verificando che i due ordini NON coincidano, altrimenti la prova non distinguerebbe un `sort()` che funziona da un elenco ordinato a mano — stesso elenco nei due moduli, e nel payload il **codice** (`BRU`, `SNZ2.1` col punto intero, `TN1`, in foto e in bolle), non l'etichetta. |
| `13-gerarchia.js` | L'azione principale è **la cosa più grande a video**, in entrambi i moduli: barra appoggiata al fondo, 64 px, nessun pulsante pieno di colore o alto uguale fuori dalla barra, alternative su una riga sola e **col nome per esteso** — accorciare l'etichetta per far stare il pulsante è una scorciatoia sulla chiarezza. Più: il perché Invia è spento si legge **dentro la barra**, e l'avviso di aggiornamento non copre i comandi. |
| `15-livelli.js` | I **livelli dell'archivio**. Prima di tutto la **coerenza fra i due posti in cui vivono le fasi**: `core/fasi.js` dice quali sono, `core/anagrafica.js` cosa ognuna pretende, e una fase presente in uno e assente nell'altro risulterebbe «senza livelli» — si può scegliere, la foto parte, e finisce nella cartella del mese invece che in quella del piano, senza nessun segnale. Poi: Per `SNU` e `BRU` il menù mostra i **lotti** al posto delle fasi e il campo si chiama «Lotto»; dal 26/10/2026 (0.40.0) `MAR` e `MNG` mostrano **le stesse 29 fasi**, senza `Interrato` né `ImpiantiDiReteCondominiali` — `Interrato` non è più una fase e i due filtri che aveva sono caduti. Dove la fase pretende un livello, **senza la scelta Invia resta spento** e l'app dice cosa manca. Col piano **derivato** dall'unità la prova è su **`10A` di SNZ2.2**, che deve arrivare a `P10` e non a `P1`: è il caso su cui una deduzione dal codice e la lettura dalla mappa danno risultati diversi — con `1A` passerebbero entrambe. E i tre campi sono un codice **oppure `null`, mai `""`**, in tutti gli invii di foto — mentre nel payload di una **bolla non ci sono affatto**, perché la raccolta delle bolle non ha quelle colonne: mandarli sapendo che vengono scartati è il difetto che la modifica evita. Dalla 0.37.7: un livello con **una voce sola** non si chiede — il menù non c'è, si legge il valore col perché, Invia si accende da solo e il payload lo porta — e il valore messo dall'app **non si porta dietro**: cambiando fase, in un menù che lo offre insieme ad altri, riparte dal segnaposto. Dal 26/10/2026 nessuna commessa vera ha più una voce sola (erano `SNZ2.2` e `TN1` in `Interrato`), quindi **le due prove si fanno su una commessa sintetica** a un solo piano (`P0`, fase `Strutture`), messa in memoria dalla pagina e tolta a fine prova, con invio vero: menù nascosto, `P0 — Piano terra` col perché, payload `piano: "P0"`; poi un secondo piano aggiunto in memoria e fase `Murature`, e il menù riparte dal segnaposto con Invia spento (dalla 0.38.0 il cantiere si sceglie in apertura del blocco: non si ripropone più). Dalla 0.37.8: l'anagrafica è la **copia esatta del master** — versione e impronta SHA-256 della forma canonica, confrontate con quelle del master scritte nel collaudo e calcolate dal file del master, non dall'app — più i numeri che dicono cosa è cambiato quando l'impronta diventa rossa (30 voci, piani 4/12/15 col Tetto in fondo, unità 15/16/51 e nessuna sul Tetto, lotti 3/3, una sola voce unica su 45); il Tetto a video in fondo ai piani e mai fra le unità; e un **Lotto4 rimasto in memoria** che riparte da «— nessun lotto —» in tutti e due i moduli. Il controllo dell'impronta è stato visto fallire su due copie guastate apposta: un ritocco a mano (versione verde, impronta rossa) e l'anagrafica di prima. **Dalla 0.38.1 (master 202610092114): le scale e TN1** — MAR con tre scale da 5, 6 e 4 alloggi, ogni alloggio in una sola, nessuna uguale a un piano (i conteggi coincidono con quelli dei piani, le composizioni no), il Tetto comune; MNG e SNZ2.2 senza scale; TN1 con le palazzine 4–7 da 16 alloggi, il P-1 comune, il Tetto una volta sola in `piani`, 64 alloggi, prospetti vuoti, e **in anagrafica ma non nel menù**. Visto fallire con: l'anagrafica della 0.38.0 (10 rossi, che dicono cosa manca), un alloggio di TN1 ritoccato a mano (2), le scale di MAR copiate dai piani (3), TN1 aggiunto al menù (2 nel 14, 1 nel 15), un secondo Tetto in TN1 (2). **Dalla 0.39.0 (master 202610101049): TN1 nel menù e la palazzina.** Versione e impronta del master nuovo (`df5dd3f6…`, 7208 byte); i corpi distinti solo a TN1; il contenuto di `partiComuni`; i prospetti di TN1 che ora sono i quattro standard; e il conteggio delle voci uniche che **non è più scritto a mano**: le commesse sono quelle del menù che in anagrafica hanno un edificio (MAR, MNG, SNZ2.2, TN1), 60 combinazioni (alla 0.39.0 con 2 a voce unica e 1 senza voci, tutte e tre in `Interrato`). I campi del payload sono quattro — `piano`, `unita`, `prospetto`, `scala` — codice oppure `null`, mai `""`, e nel payload di una bolla non ce n'è nessuno. **Dalla 0.40.0 (master `202610261235`, impronta `ecb2c273…`, 7319 byte): le 29 fasi.** Ordine alfabetico **sull'etichetta**, come si legge a video; 32 voci in `livelliPerFase` (29 fasi e 3 lotti); fasi per livello 10 piano, 4 unità, 1 prospetto, 14 nessuno; 60 combinazioni (15 per commessa) e **nessuna** a voce unica né senza voci; MRS, senza anagrafica, mostra 29 fasi e non `Interrato`. Fasi nuove: `FognaturaNera` su MNG chiede il piano (12 voci) e con `P-1` parte con `fase` `FognaturaNera`; `FinituraPartiComuniInterne` su SNZ2.2 offre 15 piani, `P-1` compreso, senza voce unica; `SpeseTecniche` e `AcquistoTerreno` non chiedono livelli e partono con la sola fase. **Dalla 0.41.0** il menù conta 10 / 4 / 1 / **11** (26 voci; sulla lista intera restano 10 / 4 / 1 / 14), MAR, MNG e MRS mostrano 26 fasi, le tre escluse non ci sono, e la prova «parte con la sola fase» passa a `Extra`, che resta. |
| `16-rimanda.js` | **«Rimanda»** nei suoi due casi, foto e bolle. Senza modifiche: **stesso `idClient` e stesso progressivo**, il flow risponde `gia_presente`, l'app lo dice e il contatore delle inviate **non si gonfia** — 6 richieste, 4 file distinti, 2 `gia_presente`. Con modifiche: `idClient` e progressivo nuovi, i livelli corretti, **il piano ricalcolato** dalla nuova unità, l'ora dello scatto invariata, e per le bolle l'`idBolla` dell'originale conservato. Dalla 0.40.0, **elementi di prima dell'aggiornamento**: i record si scrivono direttamente nel database del telefono, nella forma che l'app di prima lasciava, e si ricarica la pagina. Una foto in coda con `Interrato` e `P-1` parte col suo codice e a video si legge `Interrato`; una bolla in coda con `ImpiantiDiReteCondominiali` parte com'è; **«Rimanda» su una foto inviata con `Interrato`** apre il menù della fase da «— scegli la fase —», con il pulsante spento e «Scegli la fase per rimandarla.», e scelta una fase («Rimanda corretta») parte con `idClient` nuovo. **Il rosso intermittente del 26/10/2026** su «scelta una fase, il pulsante dice «Rimanda corretta» e si accende» era del collaudo: il pulsante dice «Rimanda corretta» **già all'apertura** (fase vuota contro `Interrato`), quindi l'attesa di quel testo non aspettava niente e si leggeva il disegno di prima della scelta. Ora si aspetta il marcatore `MNG|Cantiere` del riquadro (`attendiMarcatore` col prefisso `r-`). Con `--ritardo-letture=300`: prima rosso 3 giri su 3, dopo verde 3 su 3. Con la stessa leva si è visto anche il caso 13 leggere la bolla sbagliata (trappola 6): ora prima delle ricariche si aspetta che niente sia in coda o in invio, e i casi 12, 13 e 14 cercano il payload per contenuto con un `idClient` nuovo. **Caso 24 della specifica del 26/10/2026 sera**: una foto in coda salvata prima con `Marketing` parte com'è, e a video si legge «Marketing». |
| `17-invio-interrotto.js` | Un invio interrotto **torna inviabile**. Due casi: un record lasciato su «invio» da una sessione morta — ricostruito com'era il n. 56, perché quello stato dall'interfaccia non si sa produrre — che al riavvio riparte **da solo**, col contenuto intatto e dicendolo a video; e una richiesta che **non risponde più**, che deve finire in errore invece di restare appesa, perché finché resta appesa il motore non lavora nessun altro elemento. Il tetto vero è otto minuti: il collaudo lo accorcia da `localStorage`, che è la stessa leva del supporto. |
| `18-jpeg-dai-byte.js` | Gli **stessi byte** JPEG mandati tre volte con tre `type` diversi (`''`, `image/jpg`, `application/octet-stream`) arrivano **identici**, confrontati per impronta, e con la data dello scatto letta. È il caso che può fallire: con tre file diversi, o con un `type` giusto, funzionamento e guasto darebbero lo stesso risultato. Controlla anche l'altra metà della regola — un **PNG vero continua a convertirsi**, e quello che parte inizia per `FF D8 FF` — e la firma stessa: `FF D8` da solo non basta, PNG, HEIC e file vuoto non passano. |
| `19-lettura-negata.js` | Il telefono che non lascia leggere una foto. Il guasto è **iniettato**: `Blob.prototype.arrayBuffer` rifiuta le prime N letture col `DOMException` vero (`NotReadableError`, col messaggio parola per parola), perché un file su disco in un container si legge sempre. Prova che con la prima lettura negata e la seconda riuscita la foto passa lo stesso, coi byte originali e la data dell'EXIF; che se non si legge mai l'avviso è quello del caso — e **non** «non ha la data di scatto», **non** «copia ridotta», **senza** «Aggiungi comunque» — con quanti tentativi sono stati fatti e in quanto tempo; e che «Riprova», quando il telefono torna a collaborare, accoda la foto con l'ora vera. |
| `20-fase-senza-memoria.js` | **La fase si sceglie a ogni invio**, nei due moduli (le 38 bolle del 05/10/2026). Prova i tre meccanismi che la preselezionavano, separatamente: la **memoria** riletta all'apertura (col modulo che si apre già sull'ultimo cantiere, come su un telefono vero — altrimenti il controllo non può fallire), il **menù che non torna** dopo Invia, e la fase **portata con sé** al cambio di commessa; che la memoria non si scriva più; che con la fase ripartano i livelli; che una foto senza fase non parta; e che una scelta valga per un invio anche quando l'invio porta più foto. Sul telefono c'è già una fase vecchia in memoria (`Cantiere`) diversa da quella che si sceglie, così «riletta» e «rimasta nel menù» danno valori diversi. Visto fallire sul codice della 0.37.8 (15 rossi) e con ognuno dei tre meccanismi rimesso apposta (4, 6 e 2 rossi). **Riscritto nella 0.38.0**: il modulo non si apre più sull'ultimo cantiere, e una fase scelta prima del cantiere passa al primo cantiere scelto — quindi la fase si guarda **all'apertura, prima di toccare il cantiere**, e di nuovo dopo averlo scelto; il cambio di commessa si prova da un cantiere a un altro. Con la memoria della fase rimessa apposta: 6 rossi. Togliere **solo** l'azzeramento della fase dopo Invia non fa più rosso niente — il cantiere che riparte rifà da sé il menù della fase —; togliendo anche il ritorno del cantiere, 6 rossi qui e 5 nel 21. Dalla 0.40.0 dove la prova sceglieva `Interrato` sceglie `Strutture` (`Interrato` non è più una fase; serve una fase diversa da `Cantiere`, quella in memoria sul telefono), e qui sta anche il caso 17 della specifica del 26/10/2026: dopo un invio la fase riparte dal segnaposto, in foto e in bolle, senza nessuna preselezione. |
| `21-cantiere-senza-memoria.js` | **Il cantiere si sceglie a ogni invio**, nei due moduli (dalla 0.38.0), e nelle foto **i livelli ripartono al cambio di fase**. Sul telefono c'è un cantiere vecchio in memoria (`BRU`), diverso da quelli della prova. Prova: apertura su «— scegli il cantiere —» col segnaposto fra le voci; **due bolle di fila di due cantieri diversi** (MNG, poi SNZ2.2) — la seconda non parte finché non si sceglie; la memoria che non si scrive; la fase scelta **prima** del cantiere che si conserva, e riparte da un cantiere a un altro; la ricarica; il menù di «Cantiere sbagliato?» nello storico che parte da «scegli» con Rimanda spento; nelle foto il piano (`Strutture` → `Murature`) e l'unità (`FinituraAlloggi` → `ImpiantoElettricoAlloggi`) che ripartono anche se la voce c'è ancora; la foto dopo un invio che non parte senza cantiere. E che il cantiere ha **otto voci** nei due moduli: nessun caso a voce unica. Visto fallire sul codice della 0.37.9 (17 rossi) e con ogni meccanismo rimesso apposta: memoria del cantiere 8, menù che non torna 5, piano portato 1, chiave dell'unità senza fase 1, storico senza segnaposto 2, fase persa al primo cantiere 1. |
| `22-riservatezza.js` | **Niente percorsi del server e niente dati veri nel repository**, che è pubblico (dal 07/10/2026). Il repository di oggi è pulito — col numero dei file letti, perché «niente» su zero file non prova niente. Lo scanner `riservatezza.js` riconosce i casi costruiti apposta: percorsi UNC (anche nella forma raddoppiata delle stringhe JS e col solo nome della macchina), percorsi sulle unità L: e A:, partita IVA (anche col prefisso IT), codice fiscale (anche minuscolo e omocodico), IBAN (compatto, a gruppi, seguito da una parola maiuscola); e **non** blocca quello che solo gli somiglia: le stesse cifre col controllo sbagliato, undici cifre con un ufficio inesistente, `Interrato` seguito da un percorso relativo, «su `L:`» senza barra, una data-ora di dodici cifre, un'impronta SHA-256. Poi, **in un repository usa e getta, l'hook prima del commit**: un commit pulito passa, uno con un percorso UNC, uno con un percorso su L: e uno con una partita IVA no, e il messaggio dice dove ma non il valore; conta quello che è in stage, non la copia di lavoro. I numeri sono inventati, con la cifra di controllo calcolata da un'implementazione scritta a parte da quella dello scanner. Visto fallire con ogni meccanismo rimesso apposta: regola UNC tolta 8 rossi, regola L:/A: tolta 7, cifre di controllo ignorate 3 (più 1 per l'IBAN), hook che non blocca 4, hook che legge la copia di lavoro 1, messaggio che stampa il valore 2, un percorso in un file nuovo del repository 1. **Che l'hook sia eseguibile si legge dall'indice di git** (`git ls-files -s`, atteso `100755`), non dal file su disco: su Windows il file system non ha il bit di esecuzione e Node riporta `100666` per qualunque file, quindi il controllo sul disco era rosso anche con l'hook a posto (dal 26/10/2026). Una frase per caso: git assente, cartella che non è un clone git, `.git` illeggibile, cartella dentro un altro repository, hook assente dal disco o dall'indice, modo diverso da `100755`. Visto fallire su un clone con `git update-index --chmod=-x` (1 rosso, «modo 100644») e su una copia senza `.git` («non è un clone git»; lì il resto del collaudo si ferma prima, sullo scanner, e per questo `modoDellHook` è esportata). Non usa il browser: lo scanner gira anche da solo, `node collaudi/riservatezza.js`. |
| `23-palazzina-parti-comuni.js` | **La palazzina («Lotto») e le parti comuni**, dalla 0.39.0: **34 casi** (dalla 0.40.0). I primi 28 sono la tabella della specifica (TN1 e MAR: lotto dopo il piano e prima del prospetto, ricavato dall'unità, assente sul P-1; «Parti comuni» in `ImpiantoIdrosanitario` con il piano scelto dall'operatore e la riga sulle fasi gemelle; non regressione su MNG, SNZ2.2, SNU; video; cambi di contesto; bolle; selettore della fase di TN1), con la stessa numerazione del master. Gli ultimi cinque li ha approvati Francesco il 13/10/2026 perché la tabella non li copriva: «Rimanda» col **solo lotto** corretto (se la palazzina non entra nel confronto, resta «Rimanda la stessa» e la correzione non parte), «Rimanda» di un record «Parti comuni» e i valori ricavati dall'unità che **non** diventano il punto di partenza, il verso opposto del caso 25, il **lotto che riparte** al cambio piano, e la **voce unica del lotto** — che con il dato vero non scatta mai — provata su commesse sintetiche, a livello di funzioni e di vista condivisa. Dalla 0.40.0 il caso 3 è TN1 · `FinituraPartiComuniInterne` col `P-1` scelto dall'operatore (era TN1 · `Interrato`, col `P-1` scelto dall'app), il 28 conta 29 fasi e verifica che `Interrato` non ci sia, e il **34** è TN1 · `FognaturaBianca` · `P1` che chiede il lotto. Dalla 0.41.0 il 28 conta 26 fasi, senza le tre escluse dalle app. Ogni caso aspetta che i menù si siano assestati (due istantanee uguali) e parte da una **coda vuota**: una riga video in coda sposta fuori schermo la barra «Invia» (trappola 7 di `aiuto.js`, difetto preesistente). In coda i numeri: 8 voci nel menù, 6 piani di TN1, 4 lotti per ciascun piano tranne il P-1, 64 unità in 16 gruppi, 65 voci nell'idrosanitario, `PartiComuni` che non è unità di nessuno, `scala` mai `""`. |
| `24-contatori-avviso.js` | **Contatori in fondo, avviso in cima** (dalla 0.41.0), nei due moduli: i casi 1–10 della specifica del 26/10/2026 sera. Coda vuota: nessun avviso, i quattro contatori dopo «Coda invii» e prima delle impostazioni, e in cima niente prima della scheda. Elementi scritti nel database del telefono con la rete spenta (il motore li lascia dove sono) e vista riaperta cambiando rotta: in coda da 11 minuti «1 bolla in attesa da più di 10 minuti», e un tocco porta alla coda (la sezione era a 659 px dalla cima, dopo il tocco in vista); in errore da 11 minuti la riga dell'errore; in errore da 2 minuti niente avviso ed «Errore 1» in fondo; nel modulo Foto due in attesa e uno in errore danno le due righe, in quest'ordine; un elemento della 0.40.0 senza `accodatoIl` vale per `creatoIl`. Il tempo è quello della pagina (`page.clock` di Playwright): a 9 minuti e 30 secondi niente, poi solo il tempo che passa e l'avviso compare **da solo** entro un minuto dalla soglia. Con la rete accesa: una bozza di mezz'ora mandata adesso ha `accodatoIl` al tocco su Invia, nessun avviso e nessun `accodatoIl` nel payload; «Rimanda la stessa» 20 minuti dopo sposta `accodatoIl` a quel momento; un primo tentativo e un ritentativo falliti (flow a 500) e poi «Riprova» non lo spostano. Più la corrispondenza fra i casi del motore e le frasi di `core/errori.js`, con singolare e plurale. Visto fallire con: contatori rimessi in cima (3), soglia a zero (10, compreso il caso 5), `accodatoIl` spostato da un ritentativo (1). Il collaudo spegne da sé la guardia sui duplicati del flow finto (trappola 9). |
| `25-scorrimento-bolle.js` | **Scorrimento fra le bolle inviate** (dalla 0.41.0): i casi 11–21 della specifica. Un ottobre di otto righe scritte nel database del telefono — una bolla di tre pagine, righe con la foto intera, con la sola miniatura e senza immagine, tre cantieri. Con il filtro MNG (5 righe): aperta la 3ª, in cima la sua riga e «3 di 5»; dito verso sinistra «4 di 5», verso destra «3 di 5»; con › fino in fondo la freccia si spegne e si legge «È l'ultima bolla di questo elenco», e un altro gesto non riparte dall'inizio; alla 1ª lo stesso col ‹. Non cambiano bolla: uno scorrimento verticale, una diagonale ripida, un gesto che parte dagli 8 px a sinistra o dai 384 a destra, il dito verso sinistra con la pagina ingrandita (`Emulation.setPageScaleFactor`, scala 2) — e lo stesso gesto, partito a 40 px e a scala 1, la cambia: è la prova che le regole contano, non un gesto che non funziona. Con giorno e cantiere scelti si scorre solo fra le 3 righe mostrate, nel loro ordine, e le tre pagine della bolla una per una. «Cantiere sbagliato?» con una scelta non mandata riparte da «— scegli il cantiere —» alla bolla dopo, senza conferme e senza invii. Le bolle con la sola miniatura o senza immagine danno il messaggio di oggi e lo scorrimento continua; delle immagini prese ne resta presa una, e nessuna dopo la chiusura. I gesti sono `TouchEvent` costruiti sul visore. Visto fallire con: il controllo «orizzontale almeno il doppio del verticale» tolto (5), il capo che ricomincia dall'inizio (12). Soglie del gesto da verificare sul telefono. |
| `12-fase-e-barra.js` | La **fase di lavoro** si sceglie da un elenco chiuso in entrambi i moduli. Nel modulo Foto è **obbligatoria su ogni invio** (dalla 0.37.0): Invia resta spento, l'app dice perché, e rimettere il menù a «nessuna fase» non fa passare niente — la via d'uscita che c'era per l'avanzamento non esiste più. Nelle bolle si invia col campo vuoto. Arriva al flow con la grafia esatta. E nel modulo Bolle **Fotografa** e **Invia** stanno in una barra fissa in basso, visibili anche in fondo a una coda lunga. Dalla 0.37.9 **la fase non si ripropone**: dopo Invia, e dopo una ricarica, le bolle ripartono da «— nessuna fase —» e le foto da «— scegli la fase —»; i tre meccanismi uno per uno li prova il collaudo 20. Dalla 0.38.0 il cantiere non si preseleziona: le bolle e le foto di questo collaudo lo scelgono prima di ogni invio, altrimenti «Invia spento» passerebbe per il motivo sbagliato (manca il cantiere, non la fase). **Dalla 0.40.0 l'elenco è quello del master delle fasi `2026-10-24.3`**: 29 voci, e il collaudo **ricalcola l'impronta SHA-256 delle etichette** nell'ordine dell'elenco (`682df6ed…`, 555 byte) — un'etichetta cambiata o due voci scambiate lo fanno diventare rosso —, controlla che `Interrato` e `ImpiantiDiReteCondominiali` non ci siano e che le quattro nuove sì, che l'ordine sia alfabetico sull'etichetta, e che il menù sia lo stesso (29 voci) su MNG, MAR e MRS; nelle bolle `FognaturaNera` non chiede livelli e parte con la sola fase. **Dalla 0.41.0 il menù ha 26 voci**: le app non offrono `AcquistoTerreno`, `Marketing` e `SpeseTecniche`. `FASI` resta a 29 con l'impronta invariata, la riga delle escluse in `core/fasi.js` dev'essere uguale a quella scritta a mano nel collaudo e fatta di codici di `FASI`, `etichettaFase` dà ancora la loro etichetta, e il menù — senza cantiere e su MNG, MAR, TN1, MRS, nei due moduli (caso 22) — è `FASI` meno le escluse, in ordine alfabetico. Visto fallire con `Marketin` nella riga delle escluse: 20 rossi fra 12, 15 e 23. **Il rosso intermittente del 26/10/2026** («la bolla parte con fase FognaturaNera», 2 giri su 2 nella suite di Cowork) era del collaudo: si ricaricava dopo l'arrivo della foto al flow e prima di «Inviata», la foto ripartiva da sola (stesso `idClient`) e `attendiRicevuti(6)` passava subito, leggendo la bolla di prima. Ora si aspetta «Inviata» prima di ricaricare e la bolla si cerca fra le richieste arrivate dopo il tocco, con un `idClient` nuovo. A CPU ×4: prima rosso 3 giri su 3, dopo verde 3 su 3. |

## Le trappole, già pagate

Sono in `aiuto.js`, in cima. Chi scrive un collaudo nuovo non deve ritrovarle
da solo — e chi legge un collaudo che «passa» deve sapere cosa può nascondere.

1. **`page.waitForFunction` con un predicato `async` non aspetta niente.**
   Guarda se il valore restituito è vero, e una Promise è sempre vera: l'attesa
   finisce subito e si misura uno stato a metà. Per le condizioni asincrone si
   usa `attendi()`, che interroga la pagina da Node con `evaluate`.
   *Costo reale: un difetto dato per confermato che non esisteva, e un
   «precache da 5 risorse su 38» che in realtà era completo in un secondo.*
2. **Simulare la rete assente col browser non ferma il service worker.**
   `context.setOffline(true)` lascia passare le richieste che parte il service
   worker: un collaudo offline fatto così dà per funzionante roba che offline
   non funziona. Per l'offline vero si **spengono i server** (e in più si mette
   il telefono in modalità aereo, che serve a far dire «no» anche a
   `navigator.onLine`).
   *Costo reale: il QR di configurazione risultava funzionante offline, e non
   lo era.*
3. **La cache si legge quando il precache è finito**, non quando la cache
   esiste: il service worker la crea e poi la riempie.
4. **Fra un sotto-collaudo e l'altro si ripulisce.** I contatori del giorno
   stanno in localStorage e le code in IndexedDB: se restano, un'attesa risulta
   vera prima del tempo. E la cancellazione di un database con una connessione
   aperta resta in sospeso e scatta dopo, cancellando quello che è appena stato
   messo in coda: per questo `puliscine()` ricarica la pagina.
5. **Il ridisegno è asincrono.** Leggere un pulsante subito dopo il tocco
   significa leggere quello di prima: si aspetta il testo nuovo.
6. **Un `goto` allo stesso indirizzo non ridisegna.** Per rileggere una pagina
   dopo un'azione serve `reload()`.
7. **Il marcatore dei menù si legge solo con `leggiMarcatore` / `attendiMarcatore`**
   (dal 26/10/2026). Finché la shell non l'ha scritto il menù non è pronto, e
   `….dataset.livelli.startsWith(…)` scritto a mano esplode proprio lì, con un
   TypeError che ferma tutto il collaudo: c'erano 19 letture così, visto sul 16
   a CPU ×10. Le 25 letture dei collaudi passano tutte dalla funzione.
8. **Un'attesa deve riguardare l'effetto dell'azione, non una condizione già
   vera prima.** «Rimanda corretta» c'è già all'apertura quando la fase
   dell'invio è stata tolta, e «niente in coda né in invio» è vero anche prima
   del tocco su «Rimanda»: aspettarle dopo il tocco non aspetta niente e si
   legge il disegno di prima. Si aspetta il marcatore con la coppia nuova, o la
   richiesta nuova al flow. Pagata il 26/10/2026 (collaudo 16, e il 24 mentre
   si scriveva).
9. **La guardia sui duplicati del flow finto resta accesa da un collaudo
   all'altro.** La accendono il 16, il 17 e il 23, ed `esegui.js` fra un
   collaudo e l'altro azzera solo `ricevuti`, `stato` e `risposte`: chi viene
   dopo la trova accesa. Chi ha bisogno di un flow che rifiuti anche un
   ritentativo la spegne da sé (`flow.stato.deduplica = false`), come il 24:
   senza, il ritentativo — stesso `idClient` del tentativo rifiutato — riceveva
   `gia_presente` e risultava inviato, solo nella suite intera.

## Cosa questi collaudi NON dimostrano

Vanno detti, altrimenti passano per garanzie che non sono:

- **Il telefono vero.** Qui gira Chromium su un computer: fotocamera, permessi,
  memoria reale e rete di cantiere sono altra cosa. La *definition of done* del
  progetto chiede comunque la prova su mobile.
- **Il flow vero.** Il flow di questi collaudi è finto: risponde come quello
  vero, ma non scrive in raccolta. La quadratura «foto partite contro foto
  atterrate» si fa sul tenant, non qui.
- **I video.** Questo Chromium non decodifica H.264: il file di prova serve solo
  al controllo del peso. Anteprima e durata di un video vero si verificano sul
  telefono.
- **Che la lettura negata sia risolta sul telefono di Paolo.** Il guasto di
  `19-lettura-negata.js` è iniettato, e dimostra che le tre correzioni fanno
  quello che devono. Se sul Galaxy S21+ la prima — una lettura sola — basti da
  sola, lo dice solo quel telefono.
- **La conversione da HEIC.** Il Chromium dei collaudi non sa produrre un
  HEIC, quindi `18-jpeg-dai-byte.js` prova l'altra metà della regola — «quello
  che JPEG non è si converte» — su un **PNG**, che segue lo stesso ramo di
  codice. Che un iPhone che manda HEIC atterri come JPEG apribile lo dice solo
  un iPhone.
- **Il caricamento a blocchi.** È spento in attesa che il tenant permetta di
  aprire la sessione di caricamento (vedi la specifica del modulo Foto, §4-bis).
- **L'anagrafica dei livelli.** Piani, unità e prospetti sono la **copia** di un
  master che vive su `L:` (`core/anagrafica.js`): il collaudo prova che l'app
  li usa come si è deciso, non che i dati siano giusti. Che l'unità `8B` di MNG
  esista davvero e stia all'ottavo piano lo sa solo chi tiene il master.
- **La guardia sui duplicati.** Il flow finto di `16-rimanda.js` riconosce un
  `idClient` già visto e risponde `gia_presente` come quello vero, ma è una
  simulazione: che il flow vero lo faccia, e con quale forma nel corpo della
  risposta, va verificato sul tenant. L'app riconosce «era già in raccolta»
  cercando la stringa `gia_presente` nel corpo, perché **il nome del campo non
  è documentato** — da stringere quando il ricevente lo conferma. Non
  riconoscerlo non fa danni: la foto è arrivata comunque.
- **Che l'EXIF si legga PRIMA della preparazione** — non più. Fino alla 0.36.1 era
  una prova vera: si mandava una foto come «Avanzamento», la compressione la
  faceva passare per un canvas, i byte arrivavano **senza** EXIF e l'ora
  arrivava comunque giusta. Funzionamento e guasto davano risultati diversi.
  Dalla 0.37.0 non c'è più compressione: un JPEG parte com'è, e quella prova
  è rimasta **senza oggetto**. L'unica ricodifica superstite è HEIC/PNG →
  JPEG, che questo Chromium non sa produrre. Non è un controllo tolto, è un
  controllo che non ha più un caso su cui girare — e va saputo, perché quel
  pezzo di codice resta e non è più coperto.
- **Che il numero di versione sia arrivato SUL SITO.** I collaudi girano su un
  server locale che serve il repo: `02-versione.js` prova che `sw.js` e
  `core/versione.js` dicono lo stesso numero, non che quel numero sia in
  linea. Lo prova `node collaudi/pubblicato.js`, che va lanciato **dopo** il
  merge e ha bisogno di rete.
- **L'EXIF dei telefoni veri.** Le foto con l'ora dello scatto dentro sono
  **costruite** (`exif-finto.js`), non uscite da un telefono: provano che il
  lettore capisce il formato — e lo provano davvero, perché chi scrive i byte e
  chi li legge sono due pezzi di codice indipendenti — ma non che ogni
  produttore scriva l'EXIF come dice la specifica. Un iPhone (ordine `MM`, e
  spesso HEIC, dove l'ora resta stimata) e un Android con l'ora regolata a mano
  vanno provati sul campo.
- **La lente che il telefono apre davvero.** Il Chromium del collaudo ha una
  fotocamera finta sola, senza un nome che dica il verso: la scelta della
  lente è provata sulla funzione pura con gli elenchi di nomi dei telefoni
  veri, non aprendo tre lenti e guardando quale inquadra di più. La prova che
  conta è sul telefono: inquadratura in-app uguale a quella di sistema a 1×,
  e la riga *Fotocamera in-app* di Informazioni dice cosa è stato scelto.
