# Briefing per Claude Code — modulo «Foto cantiere»: stato reale dopo il collaudo

> Scritto da Cowork la sera del **10/09/2026**, dopo aver costruito la raccolta, il flow di
> ricezione e averli collaudati con foto vere mandate dal telefono.
>
> **Dove questo documento e la specifica `docs/AppFotoCantiereSpecifica….md` divergono, fa fede
> questo**: qui c'è ciò che è stato misurato sul tenant, non ciò che era previsto. Aggiorna la
> specifica di conseguenza.

---

## 1. Cosa esiste e funziona lato server

- **Raccolta `FotoCantiere`** sul sito Cantieri LL, 12 colonne: `Tipo` (indicizzata), `Commessa`,
  `Operatore`, `Nota`, `DataScatto`, `IdClient` (indicizzata), `IdDispositivo`, `Progressivo`,
  `VersioneApp`, `Genere` (indicizzata), `DurataSecondi`, `DataScarico`. Versioni limitate a 3.
  Tre viste ad ambito ricorsivo: `Ultime foto`, `Archivio da scaricare`, `Avanzamento`.
- **Flow `FotoCantiereRicevitore`**, ramo **invio in una richiesta** (nessuna `azione` nel payload):
  token → validazione payload → guardia duplicati su `IdClient` → `Create file` (trasferimento a
  blocchi verso SharePoint) → `Update file properties` → Response.
  **Sette Response**, tutte con `Access-Control-Allow-Origin: *` e `Content-Type: application/json`:
  401 token, 400 payload incompleto, 200 `gia_presente`, 200 ok, e tre 500 distinti su creazione
  file, scrittura colonne e lettura duplicati. Nessuna via d'uscita muta.
- **Collaudato sui numeri**: tre foto vere (una `AVANZAMENTO`, due `ARCHIVIO`), tre file in
  raccolta, tutte le colonne compilate, cartelle `2026/202609` create dal flow, ora di scatto
  coincidente con `Created`. Quadratura 3 su 3.
- Il campo `nomeFile` mandato dall'app è **ignorato**: il nome lo compone il flow, con prefisso da
  `genere` (`Foto…`/`Video…`) ed estensione da `estensione` (ripiego `jpg`).

## 2. Due correzioni al contratto che la specifica non riporta

**a) `DataScatto` non è la stringa ISO: sono 12 cifre `AAAAMMGGHHMM`.**
La colonna è di tipo testo, come previsto, ma **non basta**: il connettore SharePoint riconosce
qualunque valore che *somigli* a una data e lo riscrive prima di consegnarlo alla colonna. Provato
sul campo: `2026-09-10T21:47:21+02:00` è finito in raccolta come `09/10/2026 12:47:21`, **nove ore
di scarto**. Corretto scrivendo 12 cifre, che non somigliano a una data; riverificato incrociando
con `Created`, che SharePoint scrive senza passare dal connettore. È lo stesso rimedio già adottato
sulle bolle il 03/09. **L'app non cambia**: continua a mandare `dataScatto` in ISO 8601 con fuso,
è il flow che compatta.

**b) I campi numerici vogliono un null vero, non una stringa vuota.**
`progressivo` e `durataSecondi` mappati per interpolazione arrivano al connettore come `""` quando
l'app non li manda, e la scrittura fallisce con *«required to be of type Number/double»*. È costato
venti foto entrate senza colonne. Risolto lato flow. **Conseguenza per l'app**: quando manderai
`progressivo`, mandalo come **numero JSON** (`"progressivo": 47`), non come stringa.

## 3. Numeri misurati, che correggono le stime della specifica

| | peso file | corpo della richiesta |
|---|---|---|
| `AVANZAMENTO` (2500 px, q. 0,85) | 1,49 MB | ~2,0 MB |
| `ARCHIVIO` da fotocamera in-app | 3,76 MB | ~5,0 MB |
| `ARCHIVIO` da fotocamera nativa, byte originali | **4,39 MB** | **~5,9 MB** |

L'ipotesi «foto d'archivio da 12 MB, corpo da 16 MB» **non si è verificata** su questo telefono, e
`immagini.js` conferma il perché: per l'archivio, se il file è già JPEG l'app spedisce i byte
originali senza ricodificarli. Quindi **per le foto il ramo in una richiesta basta**, con margine
largo dentro la finestra di 120 secondi del trigger. Il caricamento a blocchi serve ai **video**,
che non si comprimono e arrivano al tetto dei 20 MB (26,7 MB di corpo, ~107 s a 2 Mbit/s).

## 4. Tre interventi lato app, in ordine di utilità

1. **Il badge «Inviata» non si vede.** `modules/foto/index.js` usa le classi `badge-attesa` e
   `badge-ok`, che **in `ui.css` non esistono**: il foglio definisce `badge-coda`, `badge-invio`,
   `badge-inviata`, `badge-errore`. Risultato: lo stato inviato esce senza colore, mentre l'errore
   si vede perché la sua classe c'è. Si chiude aggiungendo a `ui.css`
   `.badge-attesa { background: var(--attesa); }` e `.badge-ok { background: var(--ok); }`,
   oppure allineando i due nomi a quelli del modulo Bolle. **Chi collauda oggi non ha conferma
   visiva che una foto sia arrivata: è il difetto più fastidioso dei tre.**
2. **`idDispositivo` e `progressivo` anche nelle foto.** Oggi `corpoInvio` del modulo Foto non li
   manda e le due colonne restano vuote: senza sequenza per dispositivo **non esiste un controllo
   di continuità**, cioè non si può dimostrare che nessuna foto si è persa fra telefono e raccolta.
   Sulle bolle è quel controllo a dire «zero buchi» ogni sera. Le colonne in raccolta ci sono già
   e accettano il vuoto: si popolano da sole appena l'app le manda, senza toccare il flow.
   `progressivo` come numero JSON (§2b).
3. **Configurazione via link anche per il modulo Foto.** Il modulo Bolle ha la rotta
   `#/bolle/configura?e=…&t=…` in base64url; il modulo Foto no, quindi endpoint e token vanno
   digitati a mano su ogni telefono. L'URL del trigger è lungo e firmato, e sulle bolle una copia
   manuale è già costata un'ora di diagnosi (una `k` nel nome del parametro e un carattere perso
   dalla firma). Serve prima di distribuire l'app agli operai.

## 5. Caricamento a blocchi: non partire dal client, il presupposto non è ancora verificato

Il punto 5 della specifica — «verificare che l'`uploadUrl` accetti un PUT cross-origin
dall'origine dell'app» — **non è ancora chiuso, e prima del CORS c'è un gradino**: la sessione di
caricamento va creata, e non è detto che si riesca senza registrazione applicativa.

Verificato stasera dal browser autenticato come Francesco:

- `_api/v2.0/drives` sul sito **risponde 200** ed elenca i drive, `FotoCantiere` compreso: la
  superficie compatibile Graph esiste sul tenant ed è indirizzabile.
- `_api/v2.0/drives/{driveId}/root:/…:/createUploadSession` risponde **403 accessDenied**. In
  lettura passa, in scrittura no.

Non è una condanna: il connettore SharePoint di Power Automate autentica in un altro modo. Ma il
primo passo non è codice dell'app, è un **flow di prova da due azioni** — trigger HTTP più
*Send an HTTP request to SharePoint* (non l'azione HTTP generica) verso `createUploadSession`.
Se torna 200 con `uploadUrl`, si sa due cose insieme: la sessione si crea, **e** si crea senza
registrazione su Entra, perché quell'azione riusa la connessione che il flow ha già. Solo allora
ha senso il test del PUT cross-origin, e solo dopo quello ha senso accendere `dueFasi` su un
dispositivo. Se torna 403, serve la registrazione applicativa su Entra con `Sites.Selected` — che
è già un punto aperto del progetto magazzino, e sblocca anche l'identità propria del runbook.

**Dettaglio d'integrazione per quando si costruirà lo Switch su `azione`:** la validazione del
payload oggi pretende `contenutoBase64` non vuoto, e i rami `preparaCaricamento` e
`completaCaricamento` arrivano senza contenuto. Va spostata **dentro il ramo predefinito**,
altrimenti i due rami nuovi si prendono un 400 dalla porta accanto.

## 6. Cosa non cambiare

- **L'app resta capture-only**: raccoglie e invia, non legge nulla del contenuto.
- **Endpoint e token sono per modulo**, diversi da quelli delle bolle. Il token è oggi
  `LLI-FOTO-…` e non più il predefinito `collaudo`.
- **La catena delle bolle non si tocca**: flow, raccolta e colonne sono in esercizio.
- **L'app non legge il corpo della risposta**, solo lo stato HTTP: verificato nel codice
  (`invio.js` fa `if (!risposta.ok) throw` e non tocca il body). Il flow ne manda comunque uno,
  serve alle diagnosi. Non costruire dipendenze da quel corpo senza dirlo.
