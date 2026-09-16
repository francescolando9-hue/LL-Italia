CLAUDE.md — App LL Italia (PWA modulare del gruppo)
Cos'è questo repo
La PWA unica del gruppo MLP / LL Italia: un'app contenitore a moduli (sezioni), destinata a crescere con i progetti del gruppo. Due moduli attivi: **Bolle** (fotografare le bolle di consegna nei cantieri e inviarle al sistema di magazzino via endpoint HTTP → raccolta SharePoint BolleInArrivo) e **Foto cantiere** (foto di avanzamento lavori e foto da archiviare sul server, in due categorie scelte dall'operatore, verso un flow e una raccolta propri). Moduli futuri si aggiungono senza rifare la base.
Utenti del modulo Bolle: operai e fornitori in cantiere, spesso esterni all'azienda, senza account M365, con guanti e sole negli occhi.
Architettura: shell + moduli
Shell (core/): manifest e branding "LL Italia", Service Worker, home/launcher con le tessere dei moduli, routing hash (#/bolle), impostazioni di app (es. autore, condiviso tra moduli), design system (variabili CSS comuni).
Moduli (modules/<nome>/): autonomi e isolati — un modulo non rompe gli altri; aggiungerne uno tocca la shell solo per la tessera in home. Il descrittore esportato da modules/<nome>/index.js dichiara: id, titolo, descrizione, icona, registra(registraRotta), e in più — facoltativi, ma è il modo giusto per farsi vedere dalla shell senza che la shell sappia com'è fatto il modulo — stato() che restituisce {bozze, inAttesa, inErrore, oggi, righe} per la pagina Informazioni, e azzeraGiorno {titolo, spiegazione, esegui()} per i contatori del giorno. La shell non importa mai la coda o i dati di un modulo: chiede al descrittore. Ogni modulo ha le proprie impostazioni ed endpoint (per Bolle: endpoint, token, foto conservate; per Foto cantiere gli stessi, verso un flow diverso). Nella shell vive ciò che è di tutti: anagrafica cantieri (core/cantieri.js), elenco degli operatori (core/operatori.js: elenco chiuso, il nome si sceglie e non si scrive), normalizzazione degli endpoint dei flow (core/endpoint.js), versione dell'app (core/versione.js), fotocamera interna multiscatto (core/fotocamera.js), identità del dispositivo (core/dispositivo.js), configurazione via link e QR (core/configurazione-link.js), messaggi d'errore verso l'operatore (core/errori.js), motore della coda di invio con retry e backoff (core/coda-invio.js: creaMotore({coda, conservaUltime, inviaRecord, preparaRecord, segnaInviato})), ora del dispositivo in ISO con fuso (core/orario.js), lettura dell'ora di scatto dall'EXIF (core/exif.js: dataScattoDaFoto(file), senza librerie), elenco chiuso delle fasi di lavoro (core/fasi.js: FASI con codice ed etichetta, opzioniFase, etichettaFase — viaggia il codice senza spazi, a video si legge l'etichetta; dato da Francesco, non si inventa né si amplia). Non duplicare questi in un modulo: due verità divergono.
Con due o più moduli la home mostra le tessere; con un solo modulo attivo aprirebbe direttamente su quello.
Fonte di verità (per il modulo Bolle)
docs/AppBolleSpecificaFunzionale….md — specifica ufficiale, rev. 2: prevale su tutto.
docs/AppBolleFlowRicezione….md — il flow di ricezione e la raccolta BolleInArrivo (struttura, procedure, esiti dei collaudi).
docs/AppBolleContinuitaRunbook….md — documento unico per il lavoro a valle, dalla raccolta in poi.
docs/AppFotoCantiereSpecifica….md — specifica del modulo Foto cantiere e requisiti del suo flow.
Il runbook del venerdì del modulo Foto (AppFotoCantiereRunbookVenerdi….md) NON sta in questo repo: vive su L:, accanto al file di conoscenza di progetto, perché nomina percorsi del server interno e il repo è pubblicato integralmente su GitHub Pages. Si esegue in Cowork. Se serve modificarlo, si lavora sulla copia su L: — non se ne fa una seconda qui.
docs/FotoCantiereBriefingRicevente.md — stato reale di raccolta e flow, misurato sul tenant dopo il collaudo del 10/09/2026. Dove divergono, questo prevale sulla specifica del modulo Foto: lì c'è ciò che è stato misurato, non ciò che era previsto.
docs/INDICE.md — nome stabile, senza data: elenca i documenti correnti col nome completo e una riga ciascuno. Va aggiornato quando un documento di docs/ cambia nome — cioè quando nasce, sparisce o cambia natura. **In questo repository i nomi NON cambiano a ogni revisione**: la data nel nome è quella di creazione e la storia la tiene git (standard di gruppo, skill ll-italia §9 «Documenti in repository (git)», confermato da Francesco il 14/09/2026). La revisione si scrive dentro il documento, in testa. Serve a chi legge il repo da fuori (Cowork via GitHub Pages), che con i nomi datati perderebbe l'indirizzo a ogni revisione. È un puntatore: non riassume e non duplica i documenti, altrimenti diventa una versione parallela destinata a divergere.
Questo file. Il kickoff del 01/09/2026 è superato dalla specifica rev. 2 e resta nella storia del repo.
Non inventare nomi di campi SharePoint, percorsi, formati non documentati: se un'informazione manca, fermarsi e chiedere.
Stack vincolato
Vanilla JS, HTML, CSS. Nessun framework, nessun build step, nessuna dipendenza npm a runtime. (Standard del gruppo; stesso stack del repo archiviowhatsapp.)
Service Worker per offline e install; IndexedDB per le code dei moduli; manifest PWA a nome "LL Italia". A ogni rilascio si incrementano INSIEME VERSIONE in sw.js (cosa è installato) e VERSIONE_CODICE in core/versione.js (cosa sta girando): il confronto fra le due è ciò che permette all'app di accorgersi che sta eseguendo codice vecchio con un pacchetto nuovo già sceso, e di dirlo invece di dichiarare una versione che non sta eseguendo.
Hosting di sviluppo: GitHub Pages dal branch principale.
Target: browser mobile recenti (Chrome Android in primis, poi Safari iOS). Camera via <input type="file" accept="image/*" capture="environment">.
Principi non negoziabili
Offline-first (modulo Bolle): lo scatto non deve MAI perdersi. Prima la coda locale, poi l'invio; retry con backoff al ritorno della rete; l'elemento esce dalla coda solo a conferma del server (idempotenza via uuid client).
Il modulo Bolle è capture-only: niente OCR, niente dati estratti, niente scritture su Lists, niente logica di attribuzione.
UI in italiano, essenziale, tap target grandi: il flusso felice di Bolle è 3 tocchi — foto → cantiere (ultimo usato preselezionato) → invia. Per gli scatti multipli si resta dentro la fotocamera dell'app: uscire e rientrare a ogni pagina è la cosa che confonde chi ha poca dimestichezza.
Nessun segreto nel repo: URL endpoint e chiavi si inseriscono nelle Impostazioni e vivono solo in localStorage del dispositivo.
Collaudo sui numeri, mai sull'esito formale: contatori locali scatti/inviate/in coda/errore sempre visibili; un invio "riuscito" si dimostra contando foto scattate vs foto atterrate.
Convenzioni di lavoro
Commit piccoli e frequenti, messaggi in italiano, imperativi ("Aggiunge coda offline").
README aggiornato a ogni feature: cosa fa, come si prova da telefono.
Definition of done: provata su mobile (o emulazione), funziona offline dove pertinente, nessun errore console, README aggiornato, gli altri moduli e la shell non regrediscono. I collaudi automatici stanno in collaudi/ (node collaudi/esegui.js): vanno eseguiti prima di ogni rilascio e ampliati quando si aggiunge una funzione. In collaudi/aiuto.js, in cima, ci sono le trappole gia' pagate — la prima: page.waitForFunction con un predicato async NON aspetta niente, perche' una Promise e' sempre vera.
Modello di collaborazione: proporre, non decidere — le scelte di prodotto spettano a Francesco; in dubbio, opzioni con pro/contro e chiedere.

# Regole di condotta (estratto dalla skill organizzativa ll-italia v2.7 del 14/09/2026)

Stanno qui perché una sessione di Claude Code non carica la skill organizzativa del gruppo e non vede il server aziendale. Riportate come sono state consegnate.

## Passaggio di consegne fra ambienti

Il lavoro attraversa due ambienti. In **chat e Cowork** si prendono le decisioni, si ragiona sull'impostazione, si scrivono relazioni e documenti di conoscenza, si aggiornano le cartelle di progetto sul server aziendale e si fanno le letture di riscontro sui sistemi. In **Claude Code** si scrive e si mantiene il codice. Nessuno dei due fa il mestiere dell'altro.

**Chi arriva al punto in cui la parte successiva tocca all'altro chiude il turno scrivendo il prompt da incollare nell'altro ambiente.** Vale nei due versi e si ripete a ogni passaggio, non una volta per progetto. Da Claude Code verso Cowork: quando il codice è a un punto fermo, esaurite le domande all'utente, e restano documenti di conoscenza, relazioni, segnalazioni o verifiche sui sistemi.

Contenuto minimo del prompt di consegna, in quest'ordine: **cosa si è pensato** (il ragionamento e le alternative scartate, non solo l'esito); **cosa si è deciso** (decisioni esecutive e vincoli, in forma affermativa); **cosa c'è da fare** (elenco puntuale, nell'ordine); **cosa non si deve fare** (limiti espliciti); **dove stanno i documenti** (nomi senza data); **come si collauda** (i numeri attesi). Se non c'è niente da consegnare si scrive «niente da passare a Cowork»: una chiusura vuota è valida, un prompt inventato no.

**Il prompt non è una fonte**, è un messaggio: chi lo riceve rilegge i documenti indicati invece di fidarsi del riassunto.

## Riservatezza nei repository

I repository nascono **privati**; il passaggio a pubblico è una decisione esplicita, caso per caso. **Nessun dato di cliente** entra in un repository, quale che sia la visibilità: importi contrattuali, nomi di acquirenti, identificativi riconducibili, estratti di atti — vale anche per commenti nel codice, dati di prova e configurazioni. I dati di prova si inventano, non si copiano da casi reali.

**In nessun file del repository** — codice, documentazione, `README`, `CLAUDE.md`, esempi di configurazione — entrano percorsi del server interno, percorsi UNC, ID di tenant o di applicazione, thumbprint di certificati, token o URL firmati. Vivono nella configurazione sul server, il cui percorso arriva al programma come parametro; nel repository ne resta un esempio con valori finti.

I documenti aziendali portati in un repository sono **copie depurate**, con una nota in testa che dichiara la depurazione e indica dove sta il master.

## Come si lavora

**Lingua italiana**, tono professionale e operativo, si dà del tu.

**Collaudo sui numeri, mai sull'esito formale.** Un'esecuzione riuscita non è un risultato corretto: si collauda contando, e si dichiarano i numeri. Un «fatto» senza numeri non dimostra niente. Una prova va scelta sul caso che può fallire: provare un caso in cui il funzionamento e il guasto danno lo stesso risultato non prova niente.

**Revisione critica dell'impostazione.** Davanti a un'impostazione nuova, prima di eseguire: esplicitare almeno un'alternativa credibile con pro e contro, dichiarare quale si sceglierebbe e perché anche se diversa da quella proposta, elencare i punti deboli di quella proposta. L'accordo senza analisi non è un output valido; se un'alternativa seria non esiste, dirlo invece di inventarne una di facciata.

**Non si presume: si chiede.** Un dato mancante — una colonna, un percorso, una mappatura, un comportamento non documentato — si chiede all'utente e non si deduce. Un dato che non si può verificare non si scrive come certo.

**Un'automazione non è attiva perché è stata creata: è attiva quando la si rilegge e risulta configurata.**

## Nomenclatura dei file

PascalCase senza spazi, underscore o trattini, con suffisso data-ora `AAAAMMGGHHMM`. I documenti generati da Claude aggiungono `Claude` in coda prima dell'estensione; le revisioni fatte da una persona aggiungono `Rev` più l'iniziale.

Due eccezioni che riguardano il codice. **Documenti in un repository versionato:** la storia del repository fa da archivio, quindi il nome porta la data-ora della **creazione** e resta stabile; niente copie datate e niente rinomina a ogni revisione; nome nuovo con data odierna solo al cambio di natura o perimetro, in un commit dedicato. **File prodotti da una procedura automatica** (resoconti di esecuzione, registri, log): niente suffisso `Claude`, perché non sono documenti scritti da Claude; i registri periodici portano il periodo coperto (`AAAAMM`) e non la data-ora di creazione.

## Dove sta il resto

Questo è un estratto. Gli standard di gruppo completi — identità, commesse, regole contabili, convenzioni, registro degli standard — vivono nella skill organizzativa `ll-italia`, il cui master sta sul server aziendale e **non** in questo repository. Quando serve una regola che qui non c'è, **non la si deduce**: la si chiede a Francesco, che la legge dal master.

Se emerge una regola che vale per tutto il gruppo, non si scrive nel repository: si segnala a Cowork nel prompt di consegna, che la registra come segnalazione alla skill.
