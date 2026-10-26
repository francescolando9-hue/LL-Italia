# App LL Italia 0.41.1 — «Rimanda» che non perde la fase, cantiere o fase da correggere in «Bolle inviate», visore senza frecce, collaudi indipendenti: specifica delle modifiche

> **27/10/2026 ore 00:53 · dalla sessione Responsabile FotoCantiere (Claude Code locale, nome per i messaggi «FotoCantiere prova responsabile»), per la sessione locale «Sviluppo App LL Italia» del repository `LL-Italia`.**
> - **Partenza:** `main` a **`961c95b`** (unione della PR #74, app 0.41.0), albero `922362e816301d5884a775bb076d40f5b666c4a9`. Se `main` è andato avanti, è un arresto 1 (§6).
> - **Decisioni di Francesco Lando del 27/10/2026**, prese dopo il ritorno della 0.41.0 (`Documentazione/RitornoCowork202610262330Claude.md`, §7) e dopo la prova della 0.41.0 sul suo telefono (00:13): (1) «Rimanda» su una bolla inviata con una fase non più offerta: il pulsante resta spento finché non si sceglie una fase, come nel modulo Foto; (2) le guardie del flow finto si azzerano fra un collaudo e l'altro; (3) con una bolla sola, una frase sola, «È l’unica…»; (4) README: la specifica Foto è citata come «rev. 5»; (5) **le frecce del visore si tolgono**: il gesto si capisce da solo, e il piede fisso copre la parte dove si sceglie il cantiere in cui rimandare la bolla. **Alle 00:5x:** (6) in «Bolle inviate» si deve poter rimandare la bolla **perché è sbagliata la fase, o il cantiere, o tutti e due**, con i due menù che **partono dai valori della bolla**. Le soglie del gesto restano: provate sul telefono di Francesco.
> - **Fonte delle regole:** queste decisioni, il master dell'anagrafica del progetto FotoCantiere (rev. 22: versione `202610261235`, impronta `ecb2c273…`, invariata) e la skill `ll-italia` (*Scelte chieste a chi lavora*, *Messaggi d'errore*). Le regole che servono all'app sono al §1. Questo documento, il `CLAUDE.md` e il codice bastano per lavorare.
> - **Copia depurata:** niente percorsi del server, identificativi o dati di clienti; si salva in `Documentazione/`.

## 1. Le regole

1. **La fase di una bolla non si perde in silenzio** (modulo Bolle, tutti e due i riquadri con cui si rimanda una bolla inviata: «Rimanda questa bolla» nella Coda invii e il riquadro di correzione di «Bolle inviate»). Sia F la fase della bolla inviata.
   - Se F è vuota, o è fra le voci del menù della fase per il cantiere scelto, il menù parte da F e il resto funziona come oggi.
   - Se F non è vuota e **non** è fra quelle voci — una fase tolta dal master (`Interrato`, `ImpiantiDiReteCondominiali`), una fase esclusa dalle app (`AcquistoTerreno`, `Marketing`, `SpeseTecniche`), oppure una fase che il cantiere scelto non prevede (per esempio `Strutture` portata su SNU, dove il menù offre i lotti) — il menù sta su «— nessuna fase —» e **il pulsante resta spento finché non si sceglie una voce del menù diversa da «— nessuna fase —»**.
   - In quel caso sotto il pulsante una frase dice il caso, con l'etichetta della fase: «La fase «Interrato» non è fra quelle che si possono scegliere per questo cantiere: scegli la fase per rimandarla.» La frase sta nel punto in cui stanno le altre frasi dell'app, e un collaudo lega il caso alla sua frase.
   - Il riferimento è il modulo Foto, dove dalla 0.40.0 la fase è fra le cose mancanti di «Rimanda» (`modules/foto/index.js`, riga dei `mancanti`).
2. **In «Bolle inviate» si corregge il cantiere, la fase o tutti e due.** Il riquadro «Cantiere sbagliato?» diventa **«Cantiere o fase sbagliati?»**, sempre solo per le bolle la cui foto originale è ancora sul telefono.
   - Due menù: **cantiere**, con tutti i cantieri dell'app, compreso quello della bolla; **fase**, costruito come nel riquadro «Rimanda questa bolla» della Coda invii (stesse funzioni di `core/anagrafica.js`, quindi lotti su SNU e BRU, fasi escluse non offerte).
   - **Partono dai valori della bolla:** il cantiere della bolla e la sua fase, salvo il caso della regola 1, dove la fase parte da «— nessuna fase —». Cambiando il cantiere il menù della fase si ricostruisce come nella Coda invii, e la regola 1 vale anche lì.
   - Il pulsante si chiama **«Rimanda corretta»** ed è **acceso solo se è cambiato almeno uno dei due valori** e la regola 1 è rispettata; con niente di cambiato resta spento. Sotto, una riga dice cosa manca o cosa cambierà.
   - Prima di mandare, la conferma di oggi dice cosa cambia: «Rimandare questa bolla su MNG, fase Murature?» (solo le parti che cambiano, con le etichette), seguita dall'avvertenza di oggi sulla bolla già inviata che resta in magazzino e va annullata dall'ufficio.
   - La bolla riparte come oggi: invio nuovo con identificativo nuovo, stessa pagina della stessa bolla, col cantiere e la fase scelti.
   - A ogni cambio di bolla il riquadro riparte dai valori della bolla nuova; una scelta non mandata si perde, senza conferme, come oggi.
3. **Visore delle bolle inviate senza frecce.** Si tolgono le due frecce e il piede che le contiene; si scorre col gesto, con le soglie di oggi (60 px, orizzontale almeno doppio del verticale, fascia di 32 px ai bordi, niente gesto con la pagina ingrandita o con due dita).
4. **Il messaggio sui capi resta, in una frase sola**, nella **testa del visore**, sotto la riga della bolla e la posizione «3 di 12», e non in un elemento fisso o sticky: «È la prima bolla di questo elenco», «È l’ultima bolla di questo elenco» oppure, con una bolla sola, **«È l’unica bolla di questo elenco»**. Stesso stile e stesso apostrofo tipografico (U+2019) delle frasi di oggi.
5. **Nessun elemento fisso o sticky del visore copre i comandi del riquadro di correzione** (menù del cantiere, menù della fase, pulsante): il collaudo lo misura sulla misura dello schermo dei collaudi, 390×844.
6. **Collaudi indipendenti dall'ordine.** In `collaudi/esegui.js`, fra un collaudo e l'altro, insieme a quello che si azzera già, si rimettono `deduplica = false`, `nonRispondere = false` e `giaPresenti = 0` del flow finto. Un collaudo lanciato da solo e lo stesso collaudo nella suite completa danno lo stesso esito.
7. **Le specifiche correnti si citano senza numero di revisione** nel README e nel `CLAUDE.md`: la revisione corrente è in testa al file citato. Le citazioni storiche («vedi la specifica Bolle rev. 9» per una misura di quella revisione) restano.

## 2. Dati in ingresso (letti su `961c95b`)

- **«Rimanda questa bolla»** (Coda invii), `modules/bolle/index.js`: compare per le bolle `inviata` con la foto ancora sul telefono; cantiere preselezionato su quello della bolla, fase da `sincronizzaLivelli(…, { fase: record.fase || '' }, false)`; i mancanti sono solo `[!cantiere && 'il cantiere']` (riga 549); il pulsante dice «Rimanda corretta» se qualcosa è cambiato, altrimenti «Rimanda la stessa». **Previsione dal codice, non osservata** (ritorno della 0.41.0, §7.3): con F tolta o esclusa il menù parte da «— nessuna fase —», il pulsante è acceso su «Rimanda corretta» e la bolla ripartirebbe con `fase: ""` (`modules/bolle/coda.js`, `nuovo.fase = dati.fase || ''`). Nessun collaudo copre il caso.
- **«Cantiere sbagliato?»** («Bolle inviate»), `modules/bolle/storico.js`, `riquadroCorrezione` e `collegaCorrezione`: menù del cantiere con i soli **altri** cantieri, da «— scegli il cantiere —»; pulsante «Rimanda» acceso appena si sceglie; `window.confirm`; nuova bozza e `coda.confermaSingola(nuova.id, scelto, autore, riga)`, che tiene la **fase della bolla originale** (`record.fase = (bolla && bolla.fase) || ''`), anche se tolta o esclusa. Niente menù della fase.
- **Visore**, `storico.js` e `bolle.css`: `#visore` con `#chiudi-visore` (fisso), `#visore-testa`, `#visore-contenuto` (immagine e riquadro), e il piede `.bolle-visore-piede` (`position: sticky; bottom: 0`) con `#visore-capo` e le frecce `#bolla-prec` e `#bolla-succ`. `disegnaTesta` scrive le due frasi in due `<span>`: con una bolla sola compaiono **tutte e due**. Soglie in `SOGLIA_GESTO_PX`, `RAPPORTO_GESTO`, `FASCIA_BORDO_PX`.
- **Collaudi:** 25 file numerati; `esegui.js` fra un collaudo e l'altro fa solo `flow.azzera()` (svuota i ricevuti), `stato = 200`, `risposte = null`. Le guardie stanno in `aiuto.js` (`deduplica`, `giaPresenti`, `nonRispondere`). Le impostano il 16, il 17 e il 23 (`deduplica = true`), il 17 (`nonRispondere` acceso e spento), il 24 (le spegne da sé). **Previsione dal codice, da misurare:** oggi i collaudi 18–22 girano con `deduplica` ereditata accesa dal 16 e dal 17.
- **Suite di partenza** (ritorno della 0.41.0, contando i ✓ come allora): **25 collaudi verdi, 745 controlli**. Si misura prima di modificare.
- **Citazioni delle specifiche:** README, sezione del modulo Foto («rev. 5») e albero del repository («rev. 2» per la Bolle, «rev. 5» per la Foto); `CLAUDE.md`, riga della specifica Bolle («rev. 2»). Oggi la specifica Foto è alla rev. 24 e la Bolle alla revisione 11.
- **Frasi dei capi** nei documenti: la specifica in `Documentazione/` e il README le scrivono con l'apostrofo semplice, il codice con quello tipografico.

## 3. Modifiche

- **3.1 Regola 1** nei due riquadri, con un punto solo per la condizione «fase non fra le voci» e per la sua frase.
- **3.2 Regola 2**, `storico.js`: riquadro, menù, pulsante, conferma, rimando con la fase scelta. Se serve, `coda.confermaSingola` riceve la fase scelta; il contratto col flow non cambia (`fase` c'è già nel payload).
- **3.3 Regole 3, 4 e 5**, `storico.js` e `bolle.css`: frecce, piede e loro stili tolti; frase dei capi nella testa.
- **3.4 Regola 6**, `collaudi/esegui.js`.
- **3.5 Versione 0.41.1**: `VERSIONE_CODICE` in `core/versione.js` e `VERSIONE` in `sw.js`, insieme.
- **3.6 Documenti:** README (scorrimento senza frecce, riquadro «Cantiere o fase sbagliati?», regola 1, citazioni della regola 7), `docs/AppBolleSpecificaFunzionale….md` alla **revisione 12** nelle parti che descrivono le regole correnti (la storia resta com'è), `collaudi/LEGGIMI.md` allineato. Nei documenti le frasi dei capi si scrivono come nel codice. Il `CLAUDE.md`, parte del progetto, solo per la regola 7, in un **commit dedicato**; l'estratto delle regole di condotta non si tocca.

## 4. Collaudo

Previsione scritta prima; ogni controllo nuovo **visto fallire** su un guasto messo apposta, poi verde. I collaudi nuovi possono stare in file nuovi.

### 4.1 Tabella dei casi

| # | Ingresso | Esito atteso |
|---|---|---|
| 1 | Coda invii · bolla inviata MAR con fase `Interrato` · «Rimanda questa bolla» | **Prima della correzione, rosso:** il collaudo riproduce il difetto (pulsante acceso, invio con `fase: ""`). **Dopo, verde:** menù su «— nessuna fase —», pulsante spento, frase del caso con «Interrato» |
| 2 | … come 1, poi si sceglie `FinituraPartiComuniInterne` | pulsante «Rimanda corretta» acceso; payload MAR, `fase` `FinituraPartiComuniInterne`, identificativo nuovo |
| 3 | Coda invii · bolla con fase `Marketing` | come il caso 1, frase con «Marketing» |
| 4 | Coda invii · bolla MAR con fase `Strutture`, niente cambiato | menù su `Strutture`, «Rimanda la stessa» acceso: invariato |
| 5 | Coda invii · bolla MAR `Strutture` · cantiere cambiato in SNU | fase su «— nessuna fase —», pulsante spento, frase; scelto `Lotto1` → acceso, payload SNU `Lotto1` |
| 6 | Coda invii · bolla senza fase · «Rimanda» | «— nessuna fase —» e «Rimanda la stessa» acceso: invariato |
| 7 | «Bolle inviate» · bolla MAR `Strutture` con foto sul telefono | riquadro «Cantiere o fase sbagliati?»; cantiere MAR e fase `Strutture` selezionati; pulsante spento |
| 8 | … cambia solo la fase in `Murature` | pulsante acceso; conferma con «fase Murature»; payload MAR `Murature`, identificativo nuovo, stessa pagina della stessa bolla |
| 9 | … cambia solo il cantiere in MNG | pulsante acceso; payload MNG `Strutture` |
| 10 | … cambiano tutti e due | payload coi due valori nuovi |
| 11 | «Bolle inviate» · bolla con fase `Interrato` | fase su «— nessuna fase —», pulsante spento anche cambiando il cantiere, frase; scelta una fase → acceso |
| 12 | «Bolle inviate» · MAR `Strutture` · cantiere cambiato in SNU | come il caso 5 |
| 13 | … conferma annullata | niente parte, niente in coda |
| 14 | … scelta non mandata, poi gesto alla bolla successiva | il riquadro riparte dai valori della bolla nuova |
| 15 | Visore · elenco di 1 bolla | una frase sola, «È l’unica bolla di questo elenco»; nessuna freccia nella pagina; il gesto non cambia niente |
| 16 | Visore · elenco di 5 · 1ª e 5ª | «È la prima…», «È l’ultima…», una frase alla volta, nella testa; `#bolla-prec` e `#bolla-succ` non esistono |
| 17 | Visore 390×844 · riquadro portato in vista, sulla 1ª, sulla 3ª e sulla 5ª bolla | al centro del menù del cantiere, del menù della fase e del pulsante, `document.elementFromPoint` dà il controllo stesso (o un suo figlio) |
| 18 | Gesto | casi della 0.41.0 su verticale, bordo, pagina ingrandita, due dita, filtro e pagine di una bolla: invariati |
| 19 | Collaudi 16–25 lanciati uno per uno, e suite completa | stesso esito per ogni collaudo nei due modi |
| 20 | Suite completa · 5 giri di fila | 5 su 5 verdi |
| 21 | README e `CLAUDE.md` | nessuna specifica corrente citata con un numero di revisione |

### 4.2 Numeri attesi

- **Suite:** tutti i collaudi verdi; numero dei collaudi e dei controlli dichiarati, e lo scarto da 745 spiegato: controlli tolti (le frecce), aggiunti, cambiati.
- **Regola 6:** la suite **prima e dopo** la modifica di `esegui.js`, senza altre modifiche in mezzo; ogni controllo che cambia esito si spiega. Previsione dal codice: nessuno cambia esito, e cambia solo la condizione di `deduplica` nei collaudi 18–22.
- **Anagrafica e fasi invariate:** versione `202610261235`, impronta `ecb2c273…`; `FASI` a 29, impronta delle etichette `682df6ed…`; menù a 26.
- **Controllo di riservatezza** verde.
- **Guasti messi apposta, almeno sei, visti rossi:** il codice di oggi per il caso 1; la frase della regola 1 tolta; nel riquadro di «Bolle inviate» il pulsante acceso senza niente di cambiato; le due frasi insieme con una bolla sola; un piede sticky rimesso sopra il riquadro (caso 17); il cantiere della bolla tolto dal menù del riquadro.

## 5. Fuori perimetro

- Il modulo Foto: il suo «Rimanda» è già come la regola 1.
- Il contratto col flow e col ricevente.
- Le soglie del gesto, i contatori e l'avviso in cima, la regola delle fasi escluse, `FASI` e l'anagrafica.
- «Rimanda la stessa» della Coda invii, salvo la regola 1.
- La pagina Informazioni della shell; l'estratto delle regole di condotta nel `CLAUDE.md`.
- La prova del gesto sul telefono di Paolo.

## 6. Ordine di lavoro e punti di arresto

1. **Lettura** di questa specifica, del `CLAUDE.md` e del codice; controllo di `main` come in testa; **suite di partenza misurata** (attesi 25 collaudi verdi, 745 controlli).
2. **Arresto 1, prima di modificare:** una differenza fra questa specifica e il codice o il master, o un caso che la specifica non copre → **messaggio alla sessione «FotoCantiere prova responsabile»**, che risponde o porta la domanda a Francesco. Se non c'è niente, lo si dice in una riga, con la misura di partenza, e si procede.
3. **Ramo di lavoro, commit firmati.** Commit: questa specifica in `Documentazione/`, invariata; poi il collaudo del caso 1 visto rosso sul codice di oggi; poi le modifiche, a commit piccoli, con `esegui.js` in un commit a sé e la suite misurata prima e dopo; il `CLAUDE.md` in un commit dedicato.
4. Collaudi del §4, coi guasti messi apposta; suite completa cinque volte di fila e controllo di riservatezza.
5. **Arresto 2, prima del rilascio:** PR su `main` col ritorno del §7, **non si unisce**; messaggio alla sessione «FotoCantiere prova responsabile» col collegamento, i commit, i numeri, i guasti visti rossi e gli ingressi che cambiano comportamento. Il responsabile la riscontra; **unisce Francesco**.
6. Dopo l'unione: `node collaudi/pubblicato.js` dalla sessione locale (atteso 0.41.1); Francesco verifica sul telefono (Informazioni 0.41.1, visore senza frecce, riquadro «Cantiere o fase sbagliati?»).

## 7. Ritorno

`Documentazione/RitornoCowork[AAAAMMGGHHMM]Claude.md`, nella stessa PR, fatto di soli dati: commit e file modificati, con l'esito del primo arresto; il caso 1 visto rosso sul codice di oggi; la suite prima e dopo la regola 6, con i controlli che cambiano esito spiegati; numeri del §4.2 con lo scarto da 745 spiegato e i guasti visti rossi; **ingressi che cambiano comportamento** rispetto a `961c95b` (attesi: regola 1 nei due riquadri; riquadro «Cantiere o fase sbagliati?»; niente frecce né piede; frase dei capi nella testa e «È l’unica…»; `esegui.js`), più quelli trovati; punti aperti, compresi i casi trovati fuori da questa specifica.
