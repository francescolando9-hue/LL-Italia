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
