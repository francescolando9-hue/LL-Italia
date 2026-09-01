# LL Italia — PWA modulare del gruppo

App contenitore a moduli del gruppo MLP / LL Italia. Primo modulo attivo: **Bolle** — fotografare le bolle di consegna in cantiere e inviarle al sistema di magazzino (endpoint HTTP → raccolta SharePoint BolleInArrivo). I moduli futuri si aggiungeranno senza rifare la base.

Stack: **vanilla JS, HTML, CSS** — nessun framework, nessun build step, nessuna dipendenza a runtime. PWA con Service Worker (offline e installazione) e IndexedDB (coda del modulo). Fonte di verità del modulo Bolle: `docs/AppBolleSpecificaFunzionale202609011148Claude.md` (prevale su tutto), poi `docs/AppLLItaliaKickoffClaudeCode202609011205.md` e `CLAUDE.md`.

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
3. Controllare il **cantiere** (l'ultimo usato è preselezionato) e premere **Invia**.
4. Nella **Coda invii** ogni foto passa per gli stati *In coda → Invio in corso → Inviata* (o *Errore*, con pulsante Riprova). Il mock risponde dopo ~0,7 s con un id di salvataggio e **deduplica sull'id client** (uuid) come farà il flow reale.
5. **Prova offline:** attivare la modalità aereo, scattare e premere Invia → le foto restano *In coda*; al ritorno della rete partono da sole. L'invio riparte anche a ogni apertura dell'app, con retry automatico a backoff (5 s → 10 s → … → max 5 min).

**Collaudo sui numeri, mai sull'esito formale:** i quattro contatori in alto (Scattate oggi / Inviate oggi / In attesa / Errore) sono il riferimento. "Scattate" conta le foto confermate con Invia (le anteprime rimosse prima dell'invio non contano). Un invio "riuscito" si dimostra confrontando scattate vs inviate vs foto atterrate a destinazione: ogni scarto è un difetto da spiegare.

## Impostazioni

- **App** (⚙ in alto a destra, condivise tra moduli): nome e cognome dell'operatore.
- **Modulo Bolle** (link in fondo alla schermata del modulo): endpoint di invio, chiave di accesso, mock on/off, quante foto inviate conservare (ultime N, default 20), elenco cantieri (al lancio: **MAR**; le altre commesse — MNG, SNZ2.1, SNZ2.2, SNU, BRU, TN1 — si aggiungono da qui).

Endpoint e chiave **non stanno nel repo**: vivono solo in localStorage del dispositivo.

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

Compressione client-side prima dell'accodamento: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità per l'OCR del runbook prevale sul peso); HEIC gestito via canvas dove il dispositivo lo decodifica. Una foto esce dalla coda **solo a conferma del server**; l'id client univoco rende l'invio idempotente.

## Contratto endpoint [PROVVISORIO — rev. 2]

Adeguato al vincolo CORS del trigger HTTP di Power Automate, che non gestisce il preflight del browser: la richiesta è una "richiesta semplice" (`Content-Type: text/plain`, nessun header custom, chiave nel corpo), che il browser invia senza preflight; il flow risponde con l'header `Access-Control-Allow-Origin: *`. Dettagli in `modules/bolle/invio.js` e nella guida `docs/AppBolleGuidaFlowRicezione….md`:

```
POST {endpoint}
Content-Type: text/plain;charset=UTF-8

{ "chiave": "…", "id": "<uuid client>", "cantiere": "MAR", "autore": "Nome Cognome",
  "timestampDispositivo": "2026-09-01T12:41:07+02:00",
  "foto": { "nome": "…", "tipo": "image/jpeg", "base64": "…" } }

Risposta attesa: 2xx con { "id": "<id salvataggio>" } e header Access-Control-Allow-Origin: *
```

## Sviluppo locale

```
python3 -m http.server 8123
# http://127.0.0.1:8123
```

A ogni modifica dei file dell'app va incrementata `VERSIONE` in `sw.js` (e aggiornata la lista `RISORSE` se si aggiungono file), altrimenti i dispositivi restano sulla cache vecchia.

## Fuori perimetro (in capo a Francesco)

Backend reale e URL/chiave dell'endpoint; meccanismo di sicurezza definitivo; nomenclatura definitiva dei file foto e colonne di BolleInArrivo; hosting di produzione; elenco autori libero o vincolato; OCR, login M365, notifiche push, moduli futuri.
