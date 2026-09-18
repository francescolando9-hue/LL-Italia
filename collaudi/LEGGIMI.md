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
| `07-foto-invio.js` | Le due categorie preparano l'immagine in modo diverso, il contratto di invio ha tutti i campi e i tipi giusti, un file oltre il limite non entra in coda. |
| `08-errori-flow.js` | Il flow rifiuta: la bolla resta sul telefono, il messaggio dice dove guardare, e al ritorno riparte da sola senza consumare un numero. |
| `09-operatore.js` | Il nome dell'operatore si **sceglie** da un elenco chiuso e non si scrive: niente segnaposto firmabile, e un nome salvato da una versione col campo libero viene riportato alla grafia ufficiale o richiesto di nuovo — mai indovinato. |
| `10-ora-scatto.js` | `dataScatto` è l'ora dello **scatto**, letta dall'EXIF del file originale **prima** della ricodifica, col fuso del giorno dello scatto. Una **copia ridotta senza EXIF** (Google Foto, WhatsApp) **non entra in coda**: l'app avvisa e chiede, e mandata comunque parte con la **data del file** — provato su un file con la data messa ad agosto, che se l'app ripiegasse sull'ora dell'invio finirebbe in settembre: è l'unico modo di distinguere il ripiego giusto da quello sbagliato. Una foto **scattata** dall'app è sempre `scattoStimato` `NO`. |
| `11-obiettivo.js` | La fotocamera in-app sceglie la lente **principale** dai nomi che i telefoni dichiarano (Samsung e Pixel con Chrome, iPhone con Safari), lascia fare al browser dove i nomi non aiutano, registra cosa ha visto per Informazioni; e i comandi stanno al posto giusto: scatto al centro, Fine a sinistra, niente a destra. |
| `14-commesse.js` | Le **sette commesse**: codice ed etichetta come concordate, menù in **ordine alfabetico di codice** e non nell'ordine del file — provato leggendo il file servito dall'app e verificando che i due ordini NON coincidano, altrimenti la prova non distinguerebbe un `sort()` che funziona da un elenco ordinato a mano — stesso elenco nei due moduli, e nel payload il **codice** (`BRU`, `SNZ2.1` col punto intero), non l'etichetta. |
| `13-gerarchia.js` | L'azione principale è **la cosa più grande a video**, in entrambi i moduli: barra appoggiata al fondo, 64 px, nessun pulsante pieno di colore o alto uguale fuori dalla barra, alternative su una riga sola e **col nome per esteso** — accorciare l'etichetta per far stare il pulsante è una scorciatoia sulla chiarezza. Più: il perché Invia è spento si legge **dentro la barra**, e l'avviso di aggiornamento non copre i comandi. |
| `15-livelli.js` | I **livelli dell'archivio**. Per `SNU` e `BRU` il menù mostra i **lotti** al posto delle fasi e il campo si chiama «Lotto»; `MAR` non vede `Interrato` perché non ha interrati, e su `MNG` la fase `Interrato` offre solo `P-2` e `P-1`. Dove la fase pretende un livello, **senza la scelta Invia resta spento** e l'app dice cosa manca. Col piano **derivato** dall'unità la prova è su **`10A` di SNZ2.2**, che deve arrivare a `P10` e non a `P1`: è il caso su cui una deduzione dal codice e la lettura dalla mappa danno risultati diversi — con `1A` passerebbero entrambe. E i tre campi sono un codice **oppure `null`, mai `""`**, in tutti gli invii. |
| `16-rimanda.js` | **«Rimanda»** nei suoi due casi, foto e bolle. Senza modifiche: **stesso `idClient` e stesso progressivo**, il flow risponde `gia_presente`, l'app lo dice e il contatore delle inviate **non si gonfia** — 6 richieste, 4 file distinti, 2 `gia_presente`. Con modifiche: `idClient` e progressivo nuovi, i livelli corretti, **il piano ricalcolato** dalla nuova unità, l'ora dello scatto invariata, e per le bolle l'`idBolla` dell'originale conservato. |
| `12-fase-e-barra.js` | La **fase di lavoro** si sceglie da un elenco chiuso in entrambi i moduli. È **obbligatoria solo sulle foto da archiviare**: lì Invia resta spento e l'app dice perché, e basta una foto d'archivio in un invio misto perché serva; per bolle e avanzamento si invia col campo vuoto. Scelta una volta si ripropone («nessuna» compresa), e arriva al flow con la grafia esatta. E nel modulo Bolle **Fotografa** e **Invia** stanno in una barra fissa in basso, visibili anche in fondo a una coda lunga. |

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
