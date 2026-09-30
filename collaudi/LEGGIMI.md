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
```

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
| `06-bolle-pagine.js` | Una bolla su più fogli resta una bolla: `idBolla` unico, pagine numerate, e la via d'uscita se il raggruppamento era sbagliato. |
| `07-foto-invio.js` | Il menù della categoria **non esiste più** (assente, non nascosto), ogni foto parte a **risoluzione originale** — byte identici al file sul telefono — e il campo **`tipo` vale `ARCHIVIO` su ogni invio**: è quello da cui il flow compone il nome del file e su cui filtra lo script archiviatore, quindi un campo vuoto lascerebbe la foto in raccolta per sempre senza nessun errore. Più: il contratto ha tutti i campi e i tipi giusti, e un file oltre il limite non entra in coda. |
| `08-errori-flow.js` | Il flow rifiuta: la bolla resta sul telefono, il messaggio dice dove guardare, e al ritorno riparte da sola senza consumare un numero. |
| `09-operatore.js` | Il nome dell'operatore si **sceglie** da un elenco chiuso e non si scrive: niente segnaposto firmabile, e un nome salvato da una versione col campo libero viene riportato alla grafia ufficiale o richiesto di nuovo — mai indovinato. |
| `10-ora-scatto.js` | `dataScatto` è l'ora dello **scatto**, letta dall'EXIF del file originale **prima** della ricodifica, col fuso del giorno dello scatto. Una **copia ridotta senza EXIF** (Google Foto, WhatsApp) **non entra in coda**: l'app avvisa e chiede, e mandata comunque parte con la **data del file** — provato su un file con la data messa ad agosto, che se l'app ripiegasse sull'ora dell'invio finirebbe in settembre: è l'unico modo di distinguere il ripiego giusto da quello sbagliato. Una foto **scattata** dall'app è sempre `scattoStimato` `NO`. Dalla 0.37.2 controlla anche la **riga di diagnosi**: che dica nome, peso, tipo, il motivo in italiano e i segmenti JPEG visti; che i nove motivi di `core/exif.js` — letti dal sorgente, non elencati a mano — abbiano **ognuno la sua frase**, tutte diverse; e che **due file di due cause diverse** (un JPEG senza EXIF e un PNG) diano a video **due righe diverse**. Con un file solo, una frase unica per tutti i casi passerebbe. |
| `11-obiettivo.js` | La fotocamera in-app sceglie la lente **principale** dai nomi che i telefoni dichiarano (Samsung e Pixel con Chrome, iPhone con Safari), lascia fare al browser dove i nomi non aiutano, registra cosa ha visto per Informazioni; e i comandi stanno al posto giusto: scatto al centro, Fine a sinistra, niente a destra. |
| `14-commesse.js` | Le **sette commesse**: codice ed etichetta come concordate, menù in **ordine alfabetico di codice** e non nell'ordine del file — provato leggendo il file servito dall'app e verificando che i due ordini NON coincidano, altrimenti la prova non distinguerebbe un `sort()` che funziona da un elenco ordinato a mano — stesso elenco nei due moduli, e nel payload il **codice** (`BRU`, `SNZ2.1` col punto intero), non l'etichetta. |
| `13-gerarchia.js` | L'azione principale è **la cosa più grande a video**, in entrambi i moduli: barra appoggiata al fondo, 64 px, nessun pulsante pieno di colore o alto uguale fuori dalla barra, alternative su una riga sola e **col nome per esteso** — accorciare l'etichetta per far stare il pulsante è una scorciatoia sulla chiarezza. Più: il perché Invia è spento si legge **dentro la barra**, e l'avviso di aggiornamento non copre i comandi. |
| `15-livelli.js` | I **livelli dell'archivio**. Prima di tutto la **coerenza fra i due posti in cui vivono le fasi**: `core/fasi.js` dice quali sono, `core/anagrafica.js` cosa ognuna pretende, e una fase presente in uno e assente nell'altro risulterebbe «senza livelli» — si può scegliere, la foto parte, e finisce nella cartella del mese invece che in quella del piano, senza nessun segnale. Poi: Per `SNU` e `BRU` il menù mostra i **lotti** al posto delle fasi e il campo si chiama «Lotto»; `MAR` non vede `Interrato` perché non ha interrati, e su `MNG` la fase `Interrato` offre solo `P-2` e `P-1`. Dove la fase pretende un livello, **senza la scelta Invia resta spento** e l'app dice cosa manca. Col piano **derivato** dall'unità la prova è su **`10A` di SNZ2.2**, che deve arrivare a `P10` e non a `P1`: è il caso su cui una deduzione dal codice e la lettura dalla mappa danno risultati diversi — con `1A` passerebbero entrambe. E i tre campi sono un codice **oppure `null`, mai `""`**, in tutti gli invii di foto — mentre nel payload di una **bolla non ci sono affatto**, perché la raccolta delle bolle non ha quelle colonne: mandarli sapendo che vengono scartati è il difetto che la modifica evita. |
| `16-rimanda.js` | **«Rimanda»** nei suoi due casi, foto e bolle. Senza modifiche: **stesso `idClient` e stesso progressivo**, il flow risponde `gia_presente`, l'app lo dice e il contatore delle inviate **non si gonfia** — 6 richieste, 4 file distinti, 2 `gia_presente`. Con modifiche: `idClient` e progressivo nuovi, i livelli corretti, **il piano ricalcolato** dalla nuova unità, l'ora dello scatto invariata, e per le bolle l'`idBolla` dell'originale conservato. |
| `17-invio-interrotto.js` | Un invio interrotto **torna inviabile**. Due casi: un record lasciato su «invio» da una sessione morta — ricostruito com'era il n. 56, perché quello stato dall'interfaccia non si sa produrre — che al riavvio riparte **da solo**, col contenuto intatto e dicendolo a video; e una richiesta che **non risponde più**, che deve finire in errore invece di restare appesa, perché finché resta appesa il motore non lavora nessun altro elemento. Il tetto vero è otto minuti: il collaudo lo accorcia da `localStorage`, che è la stessa leva del supporto. |
| `18-jpeg-dai-byte.js` | Gli **stessi byte** JPEG mandati tre volte con tre `type` diversi (`''`, `image/jpg`, `application/octet-stream`) arrivano **identici**, confrontati per impronta, e con la data dello scatto letta. È il caso che può fallire: con tre file diversi, o con un `type` giusto, funzionamento e guasto darebbero lo stesso risultato. Controlla anche l'altra metà della regola — un **PNG vero continua a convertirsi**, e quello che parte inizia per `FF D8 FF` — e la firma stessa: `FF D8` da solo non basta, PNG, HEIC e file vuoto non passano. |
| `12-fase-e-barra.js` | La **fase di lavoro** si sceglie da un elenco chiuso in entrambi i moduli. Nel modulo Foto è **obbligatoria su ogni invio** (dalla 0.37.0): Invia resta spento, l'app dice perché, e rimettere il menù a «nessuna fase» non fa passare niente — la via d'uscita che c'era per l'avanzamento non esiste più. Nelle bolle si invia col campo vuoto. Scelta una volta si ripropone («nessuna» compresa), e arriva al flow con la grafia esatta. E nel modulo Bolle **Fotografa** e **Invia** stanno in una barra fissa in basso, visibili anche in fondo a una coda lunga. |

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
