# App LL Italia — Specifica funzionale upload bolle (rev. 2, capture-only)

> **Revisione 2 del 01/09/2026 ore 19:35** — allinea la specifica al **flow di ricezione realmente costruito e collaudato**, che prevale: il token viaggia **nel corpo** (non nell'header) e i campi si chiamano `token`, `commessa`, `operatore`, `idClient`, `dataInvio`, `nomeFile`, `contenutoBase64`; la risposta è **202 Accepted senza corpo**; l'URL richiede `api-version=2024-10-01`. Discrepanza rispetto alla rev. 1 ratificata da Francesco il 01/09/2026. La rev. 1 resta nella storia del repo (commit precedenti).

> Bozza per lo sviluppo con **Claude Code** (repo GitHub dedicato). Decisione e alternative scartate: `RelazioneDecisioneAppLLItaliaTrasportoBolle….md` in `L:\123\Claude\Relazioni\`. Perimetro: **solo raccolta e invio**; nessun riconoscimento bolle in-app.

## Utenti e piattaforma
- Utenti: chi ritira/scarica materiale in cantiere (squadre in appalto, Paolo, Francesco). Nessun account M365 richiesto.
- Piattaforma: **PWA vanilla JS** su GitHub Pages (stack del repo `archiviowhatsapp`: Service Worker, IndexedDB), installabile con "Aggiungi a schermata Home", funzionante su Android e iOS/Safari.

## Schermate
1. **Home / Carica bolle**: picker **Cantiere** (obbligatorio, lista configurabile — al lancio: MAR; poi le altre commesse), pulsante fotocamera/galleria multi-foto, anteprime con rimozione, pulsante **Invia**.
2. **Coda invii**: elenco invii con stato In coda / Inviato / Fallito (ritenta automaticamente alla connessione; retry manuale). Contatore del giorno: foto scattate / inviate — è il numero per il collaudo.
3. **Impostazioni** (prima apertura): nome e cognome operatore, memorizzato sul dispositivo e allegato a ogni invio.

## Pipeline di invio
- Compressione client-side: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità della bolla per l'OCR del runbook prevale sul peso); HEIC gestito via canvas.
- Coda offline in IndexedDB; invio al ripristino della rete; nessuna perdita se l'app viene chiusa.
- **Contratto in vigore (rev. 2):** POST JSON all'endpoint, **un file per richiesta**, token statico **nel corpo**:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",            // solo il codice: MAR | SNZ2.2 | MNG
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",     // GUID per invio, per la deduplica
  "dataInvio": "2026-09-01T17:27:53+02:00",
  "nomeFile": "…",              // IGNORATO dal backend: il nome lo compone il flow
  "contenutoBase64": "…" }
```

- `api-version=2024-10-01` è obbligatoria: l'URL mostrato dal designer di Power Automate riporta `api-version=1` e viene rifiutato con 400. L'app corregge il parametro da sola, lasciando intatta la firma `sig=`.
- L'URL contiene una firma di accesso: non entra mai nel repo pubblico (impostazioni sul dispositivo, oppure `core/configurazione.js` escluso da git in sviluppo locale).
- Il base64 dentro JSON regge senza problemi file da 155 KB: collaudato.

## Ricezione (flow Power Automate) — costruita e collaudata
- Validazioni: token, tipo file (jpeg), dimensione massima, campi obbligatori.
- Salvataggio in raccolta SharePoint **BolleInArrivo** (sito Cantieri LL); il **nome del file lo compone il flow** (il campo `nomeFile` inviato dall'app è ignorato).
- **Risposta: 202 Accepted senza corpo.** È lo stato HTTP a fare da conferma: solo alla sua ricezione la foto esce dalla coda dell'app.
- **Deduplica su `idClient`: prevista, non ancora attiva.** Finché non lo è, evitare rinvii manuali dello stesso scatto.

## ⚠️ Punto aperto — CORS (da verificare dal telefono)
Il collaudo del backend è avvenuto senza browser (curl/Postman). Dal browser ogni POST `application/json` è preceduta da un preflight `OPTIONS`: perché l'app riceva il 202, il trigger deve accettare anche `OPTIONS` e la Response deve includere l'header `Access-Control-Allow-Origin` (`*` o l'origine di GitHub Pages). Verificato in laboratorio su endpoint finto: senza quell'header non atterra nulla e le foto **restano in coda** in stato Errore, senza perdite, e ripartono appena il flow risponde correttamente.

## Sicurezza
- Il token nell'app pubblicata è un segreto debole: difese reali nel flow (validazioni, throttling, dimensioni). Rischio residuo accettato: upload spuri in ingresso; nessun dato in uscita dall'endpoint.

## Collaudo (sui numeri, mai sull'esito formale)
- Giornaliero in training: contatore app (scattate/inviate) vs file in raccolta vs foto lavorate dal runbook. Ogni scarto è un difetto da spiegare.

## Fuori perimetro (rinviato)
OCR/riconoscimento in-app; login M365; notifiche push; altri moduli LL Italia (SAL squadre, presenze). L'architettura non li preclude.

## Integrazione col runbook
Al passaggio in produzione il runbook legge dalla raccolta BolleInArrivo (metadata inclusi: la Commessa arriva certa dalla fonte) invece che da `Bolle\` su `L:`; tutto il resto invariato.
