# App LL Italia 0.41.0 — controlli intermittenti, a capo uguali su ogni PC, contatori in fondo con avviso in cima, scorrimento fra le bolle inviate, fasi escluse dalle app: specifica delle modifiche

> **26/10/2026 ore 20:49, rev. 2 · Cowork, progetto FotoCantiere, per Francesco Lando · destinataria: la sessione locale di Claude Code del repository `LL-Italia`.**
> - **Rispetto alla rev. 1 delle 19:54**, per decisioni di Francesco Lando delle 20:47: **prima di tutto si capisce perché due controlli falliscono a intermittenza** (§3.0), e **un file `.gitattributes` tiene gli a capo uguali su ogni PC** (§3.6). Partenza fissata.
> - **Partenza:** `main` a **`472f642`** (unione della PR #73 delle 20:45: estratto della skill v3.1 nel `CLAUDE.md`, otto commesse nei documenti, controllo dell'hook letto dall'indice di git), albero `edec12ab4a52757683a2a228720974c27790a9ea`, app 0.40.0. Se `main` è andato avanti, è un primo arresto (§6).
> - **Decisioni di Francesco Lando del 26/10/2026, 19:44–19:51**, su segnalazione di Paolo Sanzarello: (1) nei due moduli i contatori del giorno vanno **in fondo**, e **in cima compare un avviso solo quando c'è un problema**; (2) nel dettaglio di «Bolle inviate» si passa alla bolla successiva o precedente **scorrendo in orizzontale**, con **due frecce**; (3) **le app non offrono `AcquistoTerreno`, `Marketing` e `SpeseTecniche`**: la lista delle fasi resta una sola, quella del master del gruppo, e le app ne mostrano un sottoinsieme dichiarato. `Extra` resta. (4) **I due controlli intermittenti** si diagnosticano prima di ogni altra modifica. (5) **`.gitattributes`** con gli a capo del repository su ogni PC.
> - **Fonte delle regole:** il master dell'anagrafica del progetto FotoCantiere, **rev. 22** (regola delle fasi escluse al §2; il dato del §5 è invariato: versione `202610261235`, impronta `ecb2c273…`), e queste decisioni. Le regole che servono all'app sono al §1. Questo documento, il `CLAUDE.md` e il codice bastano per lavorare.
> - **Copia depurata:** niente percorsi del server, identificativi o dati di clienti; si può salvare in `Documentazione/`.

## 1. Le regole

1. **Contatori in fondo, avviso in cima** (moduli Bolle e Foto). I quattro contatori di oggi — Scattate oggi, Inviate oggi, In attesa, Errore — escono dalla cima della schermata e vanno **in fondo**, dopo la sezione «Coda invii» e prima del collegamento alle impostazioni del modulo. In cima, al loro posto, compare **un avviso solo quando c'è un problema**, e nient'altro quando tutto è in ordine.
2. **Quando c'è un problema:** un elemento della coda che **non è ancora arrivato 10 minuti dopo essere entrato in coda**. Entra in coda quando l'operatore preme Invia, oppure con «Rimanda». Le bozze non contano. Il riferimento è il momento dell'ingresso in coda, non quello della foto: una foto fatta mezz'ora prima e inviata adesso non è in ritardo. I ritentativi automatici e la ripresa di un invio interrotto **non** spostano quel momento. Soglia: **10 minuti**, una costante sola per i due moduli. Con la soglia, un errore passeggero, che il motore della coda risolve da solo al tentativo dopo, non accende l'avviso.
3. **L'avviso dice il caso esatto**, una riga per caso, a parole e non col solo colore: «N bolle in errore da più di 10 minuti» e «N bolle in attesa da più di 10 minuti» (nel modulo Foto: «foto o video»), con singolare e plurale giusti. Un tocco sull'avviso porta alla sezione «Coda invii». L'avviso si aggiorna da solo, anche senza altri eventi: compare **entro un minuto** dal superamento della soglia e sparisce quando gli elementi arrivano.
4. **Scorrimento fra le bolle inviate** (solo modulo Bolle: il modulo Foto non ha una pagina delle inviate, ed è voluto). Nel dettaglio di una bolla aperta da «Bolle inviate»:
   - scorrendo il dito **verso sinistra** si passa alla bolla **successiva**, cioè quella sotto nell'elenco; **verso destra** alla **precedente**;
   - in basso ci sono **due frecce grandi**, ‹ e ›, che fanno la stessa cosa e si usano coi guanti;
   - si scorre **dentro l'elenco che si sta guardando** (giorno o mese, col filtro del cantiere), **nell'ordine in cui le righe sono mostrate**, una riga alla volta: le pagine di una bolla di più pagine si scorrono una per una;
   - **ai due capi ci si ferma**: la freccia di quel lato è spenta e compare «È la prima bolla di questo elenco» o «È l'ultima bolla di questo elenco»; non si ricomincia dall'inizio e non si cambia mese;
   - **in cima al dettaglio** compare la riga della bolla, con gli stessi dati della riga dell'elenco (ora, n. progressivo, pagina, cantiere, fase, operatore), e la posizione, «3 di 12»;
   - **uno scorrimento verticale non cambia mai bolla**, e nemmeno un gesto che parte dal bordo sinistro o destro dello schermo, che su Android è il gesto «indietro»;
   - **con la pagina ingrandita** (si pizzica per leggere la bolla) il dito sposta l'immagine e non cambia bolla;
   - il riquadro **«Cantiere sbagliato?»** resta su ogni bolla e a ogni cambio riparte da «— scegli il cantiere —»: una scelta non mandata si perde cambiando bolla, senza conferme;
   - una bolla la cui foto non è più sul telefono mostra il messaggio di oggi, e lo scorrimento continua a funzionare;
   - le immagini lasciate si rilasciano dalla memoria.
5. **Fasi escluse dalle app** (moduli Bolle e Foto). `AcquistoTerreno`, `Marketing` e `SpeseTecniche` non compaiono nel menù della fase, che passa da **29 a 26 voci** su ogni commessa edificio e sulle commesse senza anagrafica. Sono fasi della contabilità: non arrivano mai bolle né foto di cantiere. **La lista resta una sola:** `FASI` in `core/fasi.js` resta la copia delle 29 fasi del master, controllata dall'impronta delle etichette come oggi, e **una sola riga** dichiara le fasi escluse dalle app, con il motivo e la decisione. Il menù è `FASI` meno le escluse. `etichettaFase` continua a dare l'etichetta anche delle fasi escluse, per gli elementi già in coda. Le loro righe in `livelliPerFase` restano: il dato dell'anagrafica non cambia. Lotti invariati su SNU e BRU.
6. **Niente è retroattivo:** un elemento già in coda con una fase esclusa parte com'è.

## 2. Dati in ingresso

- **`main`** come al testo di testa: app 0.40.0; suite di partenza attesa **23 collaudi verdi, 677 controlli** (misurati dalla sessione locale sul contenuto di `8dca0ac`, che per i collaudi coincide con `472f642`). Si misura prima di modificare.
- **Controlli intermittenti** (misura di Cowork del 26/10/2026, contenitore Linux, ramo `7daebc2`, codice dell'app uguale a `472f642`):
  - collaudo 12, «la bolla parte con fase FognaturaNera, senza livelli»: **rosso in 2 giri completi su 2**, con il payload letto `fase: ""`; **verde in 3 giri su 3** lanciato da solo;
  - collaudo 16, «scelta una fase, il pulsante dice «Rimanda corretta» e si accende»: **rosso in 1 giro completo su 2**; subito dopo la foto è partita con la fase scelta (`Cantiere`);
  - nella sessione locale su Windows la suite completa è stata verde in tutti i giri. Sono controlli entrati con la 0.40.0. Ipotesi di Cowork, **non verificata**: il collaudo legge il risultato prima che sia assestato (per il 12, l'ultimo invio ricevuto prima che arrivi quello nuovo). L'alternativa da escludere: l'app perde la fase scelta fra la scelta e l'invio.
- **A capo:** nell'indice di `472f642` i 95 file di testo sono tutti `i/lf` e le 4 immagini delle icone `i/-text`; nessun `.gitattributes`. Sul PC d'ufficio `core.autocrlf=true`: la copia di lavoro ha CRLF, e la coda del `CLAUDE.md` letta dal disco dà 14919 byte e un'impronta diversa da quella del contenuto registrato (`a3e947d5…`, 14832 byte; misura della sessione locale del 26/10).
- **Contatori:** `#bolle-contatori` in cima a `modules/bolle/index.js` e `#foto-contatori` in cima a `modules/foto/index.js`, quattro elementi ciascuno. «In attesa» conta gli stati `in_coda` e `invio`, «Errore» lo stato `errore`. In fondo alle due schermate: sezione «Coda invii» (`#lista-coda`), poi il collegamento alle impostazioni del modulo.
- **Tempo nei record della coda:** oggi c'è `creatoIl`, il momento in cui la foto è entrata fra le bozze. **Non c'è il momento dell'ingresso in coda**: va aggiunto (§3.1). Il motore della coda (`core/coda-invio.js`) mette un elemento in `errore` a ogni tentativo fallito e lo riprende al giro dopo: «Errore» quindi va e viene anche per un guasto passeggero.
- **Dettaglio delle bolle inviate:** `modules/bolle/storico.js`, visore a schermo pieno (`#visore`) con la sola immagine e, se la foto è ancora sul telefono, il riquadro «Cantiere sbagliato?»; si chiude con ✕. Non mostra di quale bolla si tratta. La pagina permette lo zoom (nel viewport non c'è `user-scalable=no`).
- **Fasi:** `FASI` con 29 voci, impronta delle etichette `682df6edbc092d8caf2dcf7e2e0ca68c13a5a57bc4e5404a39db8b68edb0dc1d`; menù di oggi a 29 voci (`vociSelettoreFase`).

## 3. Modifiche

### 3.0 Prima di tutto: i due controlli intermittenti
Prima di ogni altra modifica si stabilisce, **con una prova e non per deduzione**, perché i due controlli del §2 falliscono a intermittenza: si riproduce il rosso (per esempio rallentando la CPU del browser di prova, o facendo girare la suite completa) e si guarda **cosa ha fatto l'app** in quel giro.
- **Se il difetto è dell'app** — una bolla che parte senza la fase scelta, o un pulsante che resta nello stato sbagliato — è un **arresto**: si scrive a Francesco cosa si è visto, prima di modificare qualunque cosa. Una correzione dell'app passa davanti al resto della 0.41.0.
- **Se il difetto è del collaudo**, il controllo aspetta che il risultato sia assestato (come fanno già gli altri collaudi dei menù) e si rende stabile: la prova è al §4.
In tutti e due i casi la diagnosi, con la prova, va nel ritorno.

### 3.1 Coda dei due moduli
Un campo locale nuovo, **`accodatoIl`**, scritto quando un elemento passa da bozza a coda (Invia) e quando nasce con «Rimanda». Non cambia nei ritentativi né nella ripresa di un invio interrotto. Per un elemento già in coda senza il campo vale `creatoIl`. **Il campo non entra nel payload**: il contratto col flow non cambia.

### 3.2 Contatori e avviso
Come al §1, punti 1–3, nei due moduli. Le frasi dell'avviso e i loro casi stanno in un punto solo, condiviso dai due moduli, e la corrispondenza fra casi e frasi è collaudata, come per gli altri messaggi dell'app.

### 3.3 Dettaglio delle bolle inviate
Come al §1, punto 4. I valori delle soglie del gesto li sceglie la sessione e li scrive nel codice con il motivo; il riferimento è uno spostamento orizzontale chiaramente maggiore di quello verticale, e una fascia ai bordi in cui il gesto non si prende.

### 3.4 Fasi escluse
Come al §1, punto 5: in `core/fasi.js` la riga delle escluse (`AcquistoTerreno`, `Marketing`, `SpeseTecniche`) e il commento di testa aggiornato; il menù in `core/anagrafica.js` le toglie per gli edifici e per le commesse senza anagrafica.

### 3.5 Versione
**0.41.0**: `VERSIONE_CODICE` in `core/versione.js` e `VERSIONE` in `sw.js`, insieme.

### 3.6 A capo uguali su ogni PC
Un file `.gitattributes` nella radice, con una riga di commento che dice perché e la regola `* text=auto eol=lf`: i file di testo hanno su ogni PC gli a capo che hanno nel repository, le immagini restano binarie. In un **commit dedicato**, il primo dopo la specifica. `git add --renormalize .` **non deve cambiare nessun file** oltre a `.gitattributes`, perché nell'indice sono già tutti LF. Subito dopo, **con la copia di lavoro pulita**, la sessione locale riscrive la propria copia di lavoro perché prenda gli a capo nuovi. Il README dice in una riga perché il file c'è.

### 3.7 Documenti
- `README.md`: contatori e avviso, scorrimento in «Bolle inviate», menù a 26 fasi con le tre escluse e il motivo.
- `docs/AppFotoCantiereSpecifica….md` **rev. 24** e `docs/AppBolleSpecificaFunzionale….md` **revisione 11**: le stesse cose, nelle parti che descrivono le regole correnti; la storia resta com'è.
- `collaudi/LEGGIMI.md` allineato ai collaudi nuovi o cambiati.
- `CLAUDE.md`, **parte del progetto**, in un commit dedicato: il principio «contatori locali scatti/inviate/in coda/errore sempre visibili» diventa «contatori locali scatti/inviate/in coda/errore in fondo alla schermata; un elemento non arrivato 10 minuti dopo l'ingresso in coda si segnala in cima, senza dover scorrere (decisione di Francesco del 26/10/2026)»; nella descrizione di `core/fasi.js` si aggiunge che le app non offrono le fasi escluse, dichiarate lì. L'estratto delle regole di condotta non si tocca.

## 4. Collaudo

Previsione scritta prima; ogni controllo nuovo **visto fallire** su un guasto messo apposta, poi verde. I collaudi nuovi possono stare in file nuovi.

### 4.1 Tabella dei casi

| # | Modulo · ingresso | Esito atteso |
|---|---|---|
| 1 | Bolle · coda vuota | nessun avviso in cima; i quattro contatori in fondo, dopo «Coda invii» e prima del collegamento alle impostazioni |
| 2 | Foto · coda vuota | come il caso 1 |
| 3 | Bolle · un elemento `in_coda` con `accodatoIl` di 11 minuti fa | in cima «1 bolla in attesa da più di 10 minuti»; un tocco porta a «Coda invii» |
| 4 | Bolle · un elemento `errore` con `accodatoIl` di 11 minuti fa | in cima «1 bolla in errore da più di 10 minuti» |
| 5 | Bolle · un elemento `errore` con `accodatoIl` di 2 minuti fa | nessun avviso; «Errore 1» nei contatori in fondo |
| 6 | Foto · due elementi `in_coda` da più di 10 minuti e uno `errore` da più di 10 minuti | due righe: «2 foto o video in attesa da più di 10 minuti», «1 foto o video in errore da più di 10 minuti» |
| 7 | Bolle · elemento `in_coda` a 9 minuti e 30 secondi, nessun altro evento | l'avviso compare entro un minuto dal superamento dei 10 minuti |
| 8 | Bolle · elemento senza `accodatoIl` (salvato dalla 0.40.0) con `creatoIl` di 11 minuti fa | avviso, come il caso 3 |
| 9 | Bolle · bozza di 30 minuti, poi Invia | `accodatoIl` = momento di Invia; nessun avviso; il payload non contiene `accodatoIl` |
| 10 | Bolle · tentativo fallito e poi riuscito | `accodatoIl` invariato fra i due tentativi |
| 11 | «Bolle inviate» · elenco di 5 righe · si apre la 3ª | in cima la riga della bolla e «3 di 5» |
| 12 | … dito verso sinistra · poi verso destra | «4 di 5», poi «3 di 5», coi dati della riga giusta |
| 13 | … freccia › fino in fondo | alla 5ª la freccia › è spenta e compare «È l'ultima bolla di questo elenco»; un altro gesto non cambia niente |
| 14 | … alla 1ª | freccia ‹ spenta, «È la prima bolla di questo elenco» |
| 15 | … scorrimento verticale lungo | la bolla non cambia |
| 16 | … gesto che parte dal bordo dello schermo | la bolla non cambia |
| 17 | … pagina ingrandita · dito verso sinistra | la bolla non cambia |
| 18 | … filtro di un cantiere e giorno scelto | si scorre solo fra le righe mostrate, nel loro ordine |
| 19 | … bolla di 3 pagine | tre passi, uno per pagina, con «pag. 1/3» … «pag. 3/3» |
| 20 | … «Cantiere sbagliato?» con un cantiere scelto e non mandato · poi bolla successiva | il menù riparte da «— scegli il cantiere —», Rimanda spento |
| 21 | … bolla con la sola miniatura sul telefono | messaggio di oggi; lo scorrimento funziona |
| 22 | Foto e Bolle · menù della fase su MNG, MAR, TN1, MRS | 26 voci (Bolle: più «— nessuna fase —»; Foto: più «— scegli la fase —»), in ordine alfabetico; né `AcquistoTerreno`, né `Marketing`, né `SpeseTecniche` |
| 23 | `core/fasi.js` | `FASI` a 29 voci, impronta delle etichette invariata; ogni fase esclusa è un codice di `FASI` |
| 24 | Coda Foto · elemento salvato prima con `fase` `Marketing` | parte com'è; a video «Marketing» |
| 25 | SNU | lotti invariati |
| 26 | collaudi 12 e 16 · causa dei rossi intermittenti (§3.0) | diagnosi con la prova nel ritorno; se è dell'app, arresto prima di modificare |
| 27 | suite completa · 5 giri di fila, dopo la correzione | 5 su 5 verdi; in più i collaudi 12 e 16 verdi anche con la CPU del browser di prova rallentata (×4) |
| 28 | `.gitattributes` · `git add --renormalize .` | nessun file cambia nell'indice oltre a `.gitattributes`; le 4 icone restano `-text` |
| 29 | copia di lavoro del PC, riscritta | `git ls-files --eol`: tutti i file di testo `w/lf`; la coda del `CLAUDE.md` letta **dal disco** dà `a3e947d5…`, 14832 byte |

### 4.2 Numeri attesi

- **Fasi:** `FASI` 29, impronta `682df6ed…`; menù **26** su MAR, MNG, SNZ2.2, TN1 e MRS; nel menù 10 fasi col piano, 4 con l'unità, 1 col prospetto, **11** senza livelli (sulla lista intera restano 10 / 4 / 1 / 14).
- **Anagrafica:** versione `202610261235`, impronta `ecb2c273…`, 32 voci; **60 combinazioni**, nessuna voce unica, nessun livello senza voci: le fasi escluse non hanno livelli, quindi questi numeri non cambiano.
- **Suite:** tutti i collaudi verdi; il numero dei collaudi e dei controlli si dichiara, e lo scarto da 677 si spiega: controlli tolti, aggiunti, cambiati.
- **Controllo di riservatezza** verde.
- **Controlli intermittenti:** 5 giri completi di fila verdi; con la CPU rallentata, il controllo corretto verde e quello di prima rosso (è la prova che la correzione tocca la causa).
- **Guasti messi apposta, almeno sei, visti rossi:** contatori rimessi in cima; avviso con soglia a zero (compare anche al caso 5); `accodatoIl` spostato da un ritentativo; un gesto verticale che cambia bolla; il capo dell'elenco che ricomincia dall'inizio; una fase esclusa scritta male nella riga delle escluse (un codice che non è in `FASI`).

## 5. Fuori perimetro

- Contratto col flow e col ricevente: invariato; `accodatoIl` resta sul telefono.
- Una pagina delle foto inviate nel modulo Foto: non c'è e non si crea.
- La logica di «Rimanda» e di «Cantiere sbagliato?», salvo il ritorno a «— scegli il cantiere —» al cambio di bolla.
- Il dato dell'anagrafica (§5 del master) e la lista `FASI`.
- La pagina Informazioni della shell.
- L'estratto delle regole di condotta nel `CLAUDE.md`.
- Gli a capo degli altri repository (per esempio quello dell'archiviatore): non si toccano.

## 6. Ordine di lavoro e punti di arresto

1. **Lettura** di questa specifica, del `CLAUDE.md` e del codice; controllo di `main` come al testo di testa; suite di partenza misurata (attesi 23 collaudi verdi, 677 controlli).
2. **Diagnosi dei due controlli intermittenti** (§3.0), senza modificare l'app.
3. **Primo arresto, prima di modificare:** un difetto dell'app trovato al punto 2, una differenza fra questa specifica e il codice, o un caso che la specifica non copre → **domanda a Francesco**. Se non c'è niente, lo si dice in una riga, con la diagnosi, e si procede.
4. **Ramo di lavoro, commit firmati.** Commit: questa specifica in `Documentazione/`, invariata; `.gitattributes` (dedicato) e riscrittura della copia di lavoro; la correzione dei controlli intermittenti; poi le modifiche, a commit piccoli; il `CLAUDE.md` in un commit dedicato.
5. Collaudi del §4, coi guasti messi apposta; suite completa cinque volte di fila e controllo di riservatezza.
6. **Secondo arresto, prima del rilascio:** PR su `main` col ritorno del §7, **non si unisce**; a Francesco il collegamento, i commit, i numeri, i guasti visti rossi e gli ingressi che cambiano comportamento. Unisce Francesco dopo il riscontro di Cowork.
7. Dopo l'unione: `node collaudi/pubblicato.js` dalla sessione locale (atteso 0.41.0); Francesco verifica sul telefono (Informazioni 0.41.0, menù a 26 fasi, contatori in fondo).

## 7. Ritorno

`Documentazione/RitornoCowork[AAAAMMGGHHMM]Claude.md`, nella stessa PR, fatto di soli dati: commit e file modificati, con l'esito del primo arresto; **diagnosi dei due controlli intermittenti, con la prova**, e i cinque giri; misure degli a capo (casi 28 e 29); numeri del §4.2 con lo scarto spiegato e i guasti visti rossi; soglie scelte per il gesto; **ingressi che cambiano comportamento** rispetto a `main` (attesi: contatori in fondo; avviso in cima; `accodatoIl` nei record; scorrimento, frecce e riga della bolla nel dettaglio; menù a 26 fasi), più quelli trovati; punti aperti, compresi i casi trovati fuori da questa specifica.
