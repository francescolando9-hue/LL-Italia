# App LL Italia — Specifica funzionale upload bolle (rev. 1, capture-only)

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
- POST all'endpoint con token statico in header; payload: cantiere, autore, timestamp dispositivo, foto (base64 o multipart), id client univoco per deduplica.

## Ricezione (flow Power Automate o Logic App)
- Validazioni: token, tipo file (jpeg), dimensione massima, campi obbligatori; deduplica su id client.
- Salvataggio in raccolta SharePoint **BolleInArrivo** (sito Cantieri LL): cartelle `[AAAA]/[AAAAMM]/`, nome file `Bolla[Commessa][AAAAMMGGHHMMSS][Autore][n].jpg`, colonne metadata: Commessa, Autore, DataInvio, IdClient.
- Risposta all'app: id salvataggio (per lo stato Inviato).

## Sicurezza
- Il token nell'app pubblicata è un segreto debole: difese reali nel flow (validazioni, throttling, dimensioni). Rischio residuo accettato: upload spuri in ingresso; nessun dato in uscita dall'endpoint.

## Collaudo (sui numeri, mai sull'esito formale)
- Giornaliero in training: contatore app (scattate/inviate) vs file in raccolta vs foto lavorate dal runbook. Ogni scarto è un difetto da spiegare.

## Fuori perimetro (rinviato)
OCR/riconoscimento in-app; login M365; notifiche push; altri moduli LL Italia (SAL squadre, presenze). L'architettura non li preclude.

## Integrazione col runbook
Al passaggio in produzione il runbook legge dalla raccolta BolleInArrivo (metadata inclusi: la Commessa arriva certa dalla fonte) invece che da `Bolle\` su `L:`; tutto il resto invariato.
