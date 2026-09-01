CLAUDE.md — App LL Italia (PWA modulare del gruppo)
Cos'è questo repo
La PWA unica del gruppo MLP / LL Italia: un'app contenitore a moduli (sezioni), destinata a crescere con i progetti del gruppo. Il primo e per ora unico modulo è Bolle: fotografare le bolle di consegna nei cantieri e inviarle al sistema di magazzino via endpoint HTTP → raccolta SharePoint BolleInArrivo. Moduli futuri verranno aggiunti senza rifare la base.
Utenti del modulo Bolle: operai e fornitori in cantiere, spesso esterni all'azienda, senza account M365, con guanti e sole negli occhi.
Architettura: shell + moduli
Shell (core/): manifest e branding "LL Italia", Service Worker, home/launcher con le tessere dei moduli, routing hash (#/bolle), impostazioni di app (es. autore, condiviso tra moduli), design system (variabili CSS comuni).
Moduli (modules/<nome>/): autonomi e isolati — un modulo non rompe gli altri; aggiungerne uno tocca la shell solo per la tessera in home. Ogni modulo ha le proprie impostazioni (per Bolle: endpoint, chiave, mock).
Con un solo modulo attivo, la home può portare direttamente a Bolle, ma la struttura a launcher resta.
Fonte di verità (per il modulo Bolle)
AppBolleSpecificaFunzionale….md — specifica ufficiale (verrà allegata da Francesco: prevale su tutto).
Il kickoff AppLLItaliaKickoffClaudeCode….md.
Questo file.
Le parti marcate [PROVVISORIO] si implementano dietro configurazione, mai cablate. Non inventare nomi di campi SharePoint, percorsi, formati non documentati: se un'informazione manca, fermarsi e chiedere.
Stack vincolato
Vanilla JS, HTML, CSS. Nessun framework, nessun build step, nessuna dipendenza npm a runtime. (Standard del gruppo; stesso stack del repo archiviowhatsapp.)
Service Worker per offline e install; IndexedDB per le code dei moduli; manifest PWA a nome "LL Italia".
Hosting di sviluppo: GitHub Pages dal branch principale.
Target: browser mobile recenti (Chrome Android in primis, poi Safari iOS). Camera via <input type="file" accept="image/*" capture="environment">.
Principi non negoziabili
Offline-first (modulo Bolle): lo scatto non deve MAI perdersi. Prima la coda locale, poi l'invio; retry con backoff al ritorno della rete; l'elemento esce dalla coda solo a conferma del server (idempotenza via uuid client).
Il modulo Bolle è capture-only: niente OCR, niente dati estratti, niente scritture su Lists, niente logica di attribuzione.
UI in italiano, essenziale, tap target grandi: il flusso felice di Bolle è 3 tocchi — foto → cantiere (ultimo usato preselezionato) → invia.
Nessun segreto nel repo: URL endpoint e chiavi si inseriscono nelle Impostazioni e vivono solo in localStorage del dispositivo.
Collaudo sui numeri, mai sull'esito formale: contatori locali scatti/inviate/in coda/errore sempre visibili; un invio "riuscito" si dimostra contando foto scattate vs foto atterrate.
Convenzioni di lavoro
Commit piccoli e frequenti, messaggi in italiano, imperativi ("Aggiunge coda offline").
README aggiornato a ogni feature: cosa fa, come si prova da telefono.
Definition of done: provata su mobile (o emulazione), funziona offline dove pertinente, nessun errore console, README aggiornato, gli altri moduli e la shell non regrediscono.
Modello di collaborazione: proporre, non decidere — le scelte di prodotto spettano a Francesco; in dubbio, opzioni con pro/contro e chiedere.
