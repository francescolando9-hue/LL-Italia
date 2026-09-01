# LL Italia — PWA modulare del gruppo

App contenitore a moduli del gruppo MLP / LL Italia. Primo modulo attivo: **Bolle** — fotografare le bolle di consegna in cantiere e inviarle al sistema di magazzino (endpoint HTTP → raccolta SharePoint BolleInArrivo). I moduli futuri si aggiungeranno senza rifare la base.

Stack: **vanilla JS, HTML, CSS** — nessun framework, nessun build step, nessuna dipendenza a runtime. PWA con Service Worker (offline e installazione) e IndexedDB (coda del modulo). Fonte di verità del modulo Bolle: la specifica funzionale in `docs/` (`AppBolleSpecificaFunzionale….md`, prevale su tutto), poi il kickoff `AppLLItaliaKickoffClaudeCode….md` e `CLAUDE.md`.

## Come installarla sul telefono

L'app è pubblicata su GitHub Pages: `https://francescolando9-hue.github.io/LL-Italia/`
La pubblicazione è automatica a ogni push su `main` (workflow `.github/workflows/pages.yml`, che attiva Pages da solo alla prima esecuzione).

**Android (Chrome):** aprire il link → menu ⋮ → **Aggiungi a schermata Home** (o "Installa app") → confermare. L'icona LL Italia compare in home e l'app si apre a schermo intero.

**iPhone/iPad (Safari):** aprire il link → pulsante Condividi → **Aggiungi a schermata Home** → confermare.

Alla prima apertura l'app chiede **nome e cognome**: vengono salvati sul dispositivo e allegati a ogni invio. Dopo la prima visita l'app funziona anche **senza rete**.

## Come provarla in mock (senza backend)

La **modalità mock è attiva di default**: gli invii sono simulati sul dispositivo, nessun dato esce. Il banner giallo "Modalità mock attiva" lo ricorda sempre.

1. Aprire il modulo Bolle (l'app ci entra direttamente; la home dei moduli resta raggiungibile dal logo in alto a sinistra).
2. **Fotografa bolla** (camera posteriore) oppure **Scegli dalla galleria** (multi-foto). Le foto entrano subito in IndexedDB come bozze: non si perdono nemmeno chiudendo l'app.
3. Scegliere il **cantiere** (dal secondo invio l'ultimo usato è preselezionato) e premere **Invia**.
4. Nella **Coda invii** ogni foto passa per gli stati *In coda → Invio in corso → Inviata* (o *Errore*, con pulsante Riprova). Il mock risponde dopo ~0,7 s simulando la conferma del server.
5. **Prova offline:** attivare la modalità aereo, scattare e premere Invia → le foto restano *In coda*; al ritorno della rete partono da sole. L'invio riparte anche a ogni apertura dell'app, con retry automatico a backoff (5 s → 10 s → … → max 5 min).

**Collaudo sui numeri, mai sull'esito formale:** i quattro contatori in alto (Scattate oggi / Inviate oggi / In attesa / Errore) sono il riferimento. "Scattate" conta le foto confermate con Invia (le anteprime rimosse prima dell'invio non contano). Un invio "riuscito" si dimostra confrontando scattate vs inviate vs foto atterrate a destinazione: ogni scarto è un difetto da spiegare.

## Impostazioni

- **App** (⚙ in alto a destra, condivise tra moduli): nome e cognome dell'operatore.
- **Modulo Bolle** (link in fondo alla schermata del modulo): endpoint di invio, token, mock on/off, quante foto inviate conservare (ultime N, default 20). L'elenco cantieri non si tocca da qui: vedi sotto.

## Struttura del repo

```
index.html            shell: testata, outlet delle viste
manifest.webmanifest  manifest PWA "LL Italia"
sw.js                 service worker: precache e offline (bump di VERSIONE a ogni release)
icons/                icone dal logo ufficiale (logo.png = sorgente)
core/                 shell: router hash, home/launcher, impostazioni app, design system CSS
modules/bolle/        modulo Bolle: vista, coda IndexedDB, compressione, invio, impostazioni
docs/                 specifica funzionale e kickoff
```

Un modulo nuovo = una cartella in `modules/` + l'import nel registro `moduli` di `core/app.js` (la tessera in home compare da sola). Con un solo modulo la home apre direttamente su Bolle.

## Pipeline della foto

Compressione client-side prima dell'accodamento: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità per l'OCR del runbook prevale sul peso); HEIC gestito via canvas dove il dispositivo lo decodifica. Una foto esce dalla coda **solo a conferma del server** (202 Accepted); ogni invio porta un `idClient` univoco, su cui il backend potrà deduplicare.

## Contratto con il backend (in vigore)

Il flow di ricezione è **già attivo e collaudato**: l'app si adegua, il contratto non si modifica dal lato app. Un file per richiesta, POST JSON:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",                       // solo il codice: MAR | SNZ2.2 | MNG
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",                // GUID per invio, per la deduplica futura
  "dataInvio": "2026-09-01T17:27:53+02:00",
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

L'elenco è in `modules/bolle/cantieri.js` e **non è modificabile dal dispositivo**: un codice commessa errato arriverebbe al magazzino come commessa inesistente. A video l'etichetta estesa, nel payload solo il codice.

| Codice nel payload | Etichetta a video |
|---|---|
| `MAR` | MAR - Caselle Torinese |
| `SNZ2.2` | SNZ2.2 - Settimo Torinese |
| `MNG` | MNG - via Monginevro 181 |

Al primo utilizzo la scelta è esplicita (`— scegli il cantiere —`, Invia resta disabilitato); poi l'ultimo cantiere usato è preselezionato.

## ⚠️ Punto aperto: CORS sull'endpoint reale

L'app gira in un browser, quindi ogni invio con `Content-Type: application/json` è preceduto da una richiesta **preflight `OPTIONS`**. Perché l'app riceva il 202, il flow deve rispondere al preflight e includere l'header `Access-Control-Allow-Origin` (per l'origine di GitHub Pages o `*`). Verificato in collaudo con endpoint finto:

- endpoint che risponde al preflight → 3 foto scattate, 3 inviate, 3 atterrate, contatore errori 0;
- endpoint che **non** risponde al preflight → 0 foto atterrate, ma **nessuna perdita**: restano in coda in stato *Errore* con il messaggio «Invio bloccato: nessuna risposta dall'endpoint (rete assente o CORS)» e ripartono col retry appena il flow risponde correttamente.

Se il collaudo del backend è stato fatto con curl o Postman, questo punto non è ancora stato verificato: va provato dal telefono prima di distribuire l'app.

## Sviluppo locale

```
python3 -m http.server 8123
# http://127.0.0.1:8123
```

A ogni modifica dei file dell'app va incrementata `VERSIONE` in `sw.js` (e aggiornata la lista `RISORSE` se si aggiungono file), altrimenti i dispositivi restano sulla cache vecchia.

## Fuori perimetro (in capo a Francesco)

Deduplica lato backend sull'`idClient`; token definitivo al posto di `collaudo`; elenco autori libero o vincolato; hosting di produzione; OCR, login M365, notifiche push, moduli futuri.
