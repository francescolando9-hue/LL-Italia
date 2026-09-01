Kickoff Claude Code — App LL Italia · Sessione 1 (shell + modulo Bolle)
Data: 01/09/2026 · Origine: progetto AutomazioneMagazzinoCantiere (conoscenza di progetto rev. 5) · Owner: Francesco Lando · Sostituisce: AppBolleKickoffClaudeCode202609011201.md
Documento ponte generato dalla chat di progetto: consente di partire oggi, da mobile, senza accesso al server aziendale. Decisione di prodotto (01/09/2026): l'app è la PWA unica del gruppo — si chiama "LL Italia" — a struttura modulare; Bolle è solo il primo modulo. La specifica funzionale ufficiale del modulo Bolle (AppBolleSpecificaFunzionale….md, su server) prevale su questo kickoff e verrà allegata in una sessione successiva per riconciliare le parti [PROVVISORIO]. Leggere prima CLAUDE.md.
Contesto in una riga
Le squadre fotografano le bolle alla consegna; oggi le foto viaggiano via WhatsApp + passaggio manuale; a regime entrano dal modulo Bolle di quest'app → endpoint HTTP → raccolta SharePoint BolleInArrivo, dove le legge il runbook serale del magazzino. L'app cambia solo il trasporto: il resto del sistema non la vede.
Spec funzionale sintetica — modulo Bolle (stabile, dalla conoscenza di progetto)
Schermata del modulo:
Pulsante grande Fotografa bolla (camera posteriore; in alternativa selezione da galleria).
Picker cantiere, valori vincolati: MAR | MNG | SNZ2.1 | SNZ2.2 | SNU | BRU | TN1 — ultimo usato preselezionato e persistito.
Autore: nome e cognome — impostazione di app (shell), chiesta al primo utilizzo, persistita, modificabile.
Invia: accoda sempre localmente, poi tenta l'invio; scatti multipli in sequenza.
Coda visibile con stati per elemento: In coda / Invio in corso / Inviata / Errore (riprova); contatori scattate / inviate / in attesa / errore (collaudo sui numeri).
Comportamenti: offline totale (scatto e coda senza rete; invio automatico al ritorno della connettività e a ogni apertura; retry manuale); uscita dalla coda solo a conferma server (idempotenza via uuid client); foto conservata finché non confermata, poi eliminabile (conserva ultime N); modalità mock per sviluppo e demo senza backend.
Contratto endpoint [PROVVISORIO — riconciliare con specifica ufficiale]
Codice
Il backend (Power Automate o simile → BolleInArrivo) non fa parte di questo repo: tutto dietro configurazione + mock.
Deliverable Sessione 1 (in ordine, commit piccoli)
Scaffold: index.html, core/ (shell: router hash, home, impostazioni app, design system CSS), modules/bolle/, manifest.webmanifest (nome "LL Italia"), sw.js, README.md; GitHub Pages attivo.
PWA installabile; icona provvisoria con scritta "LL" (il logo ufficiale arriverà da Francesco).
Home/launcher con la tessera Bolle e routing #/bolle; con un solo modulo, apertura diretta su Bolle mantenendo la home raggiungibile.
Modulo Bolle: flusso capture completo con coda IndexedDB e stati.
Invio con retry/backoff + idempotenza uuid, mock funzionante end-to-end.
Impostazioni: di app (autore) e di modulo (endpoint, chiave, mock on/off, conserva ultime N foto).
README: come installarla sul telefono e come provarla in mock.
Fuori scope oggi: backend reale, autenticazione definitiva, naming definitivo dei file foto, colonne di BolleInArrivo, moduli futuri — attendono specifica ufficiale e decisioni di Francesco.
Punti aperti in capo a Francesco (non deciderli in autonomia)
Nome del repo (proposte: llitalia o appllitalia, minuscolo); logo/branding ufficiale; tecnologia e URL dell'endpoint; meccanismo chiave/sicurezza (utenti senza account M365); nomenclatura definitiva dei file foto; colonne della raccolta BolleInArrivo; hosting di produzione (GitHub Pages vs altro); elenco autori libero o vincolato.
Backlog dopo la Sessione 1
Integrazione endpoint reale e collaudo sui numeri (scattate vs atterrate su SharePoint); multi-foto per bolla (fronte/retro); compressione adattiva su rete lenta; pagina diagnostica (stato SW, spazio IndexedDB, versione app); predisposizione secondo modulo quando servirà.
