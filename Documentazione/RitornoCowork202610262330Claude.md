# Ritorno a Cowork — 0.41.0: controlli intermittenti, a capo, contatori e avviso, scorrimento, fasi escluse

> 26/10/2026 ore 23:30 · dalla sessione Claude Code locale (Windows) del repository dell'app, per il progetto **FotoCantiere**. Questo file è un messaggio, non una fonte: riscontralo sul codice, sui commit e sui registri prima di registrarlo. Sono soli dati, quelli che la specifica chiede al §7. Il repository è pubblico: qui non ci sono percorsi del server né dati veri. Specifica ricevuta: `Documentazione/FotoCantiereSpecificaAppContatoriScorrimentoFasiEscluse202610262049Claude.md` (rev. 2). **La PR non è unita: unisce Francesco, dopo il tuo riscontro.**

## 1. Commit, file modificati, primo arresto

- **Partenza:** `origin/main` a `472f642`, albero `edec12ab4a52757683a2a228720974c27790a9ea`, app 0.40.0: è la partenza indicata dalla specifica. Ramo di lavoro `lavoro0410`.
- **Suite di partenza su `472f642`**, prima di ogni modifica: **23 collaudi verdi, 677 controlli: 677 ✓, 0 ✗**. È uguale all'atteso.
- **Esito del primo arresto.** La diagnosi (§2) ha dato due difetti **dei collaudi** e nessuno dell'app. Ho però trovato una differenza e tre casi che la specifica non copre, e li ho chiesti a Francesco prima di modificare. Le sue decisioni, del 26/10/2026:
  1. la causa del rosso del 16 non si riproduce con la CPU rallentata (vedi §2) → **la prova si fa con le letture della coda ritardate** (`--ritardo-letture=300`, nuova leva dei collaudi);
  2. nei collaudi c'erano letture del marcatore `data-livelli` senza protezione, che a CPU ×10 fermano il collaudo con un TypeError → **una funzione sola in `aiuto.js`**, che tutti i collaudi chiamano, in un commit a parte;
  3. «Riprova» manuale → **non sposta `accodatoIl`**;
  4. menù della fase senza cantiere scelto → **26 voci anche lì**.

  Dopo un'interruzione, Francesco ha deciso anche un quinto punto: il caso 13 del collaudo 16, rosso solo con le letture ritardate, **si corregge nello stesso commit dei controlli intermittenti, con le due regole della trappola 6**.
- **Commit**, tutti firmati con chiave SSH (firma `gpgsig` nell'oggetto di ogni commit; la verifica locale non è configurata, quella su GitHub è nella PR):

  | Commit | Cosa |
  |---|---|
  | `b3b3e44` | la specifica, invariata, in `Documentazione/` (SHA-256 `f5c6ca96…d889`, uguale all'originale) |
  | `348aeac` | `.gitattributes`, commit dedicato |
  | `7f50cd9` | collaudi: leve `--cpu=N` e `--ritardo-letture=ms` |
  | `c3bf603` | collaudi: il marcatore dei menù da una funzione sola (decisione 2) |
  | `6ea6d3d` | collaudi 12 e 16: i controlli aspettano il risultato assestato; caso 13 del 16 (decisione 5) |
  | `903e3ba` | fasi escluse dalle app |
  | `e0e906f` | `accodatoIl` nelle due code |
  | `a9bd2dd` | contatori in fondo, avviso in cima; collaudo 24 |
  | `b9ff952` | scorrimento fra le bolle inviate; collaudo 25 |
  | `6d08590` | visore: piede fisso con capi e frecce, sfondo pieno (dopo una prova a vista su emulazione 390×844) |
  | `b84b0a2` | collaudo 16: caso 24 (foto in coda con `Marketing`) |
  | `44c9632` | versione 0.41.0 |
  | `b9e1a16` | README |
  | `8377110` | specifiche: Foto rev. 24, Bolle revisione 11 |
  | `429e4b9` | `collaudi/LEGGIMI.md` |
  | `37d783c` | `CLAUDE.md`, commit dedicato (albero `c8994379a1b4c78f4ff26f66902c88698cff3da4`) |

  Più il commit di questo file.
- **File modificati rispetto a `472f642`** (37, più questo):
  - nuovi: `.gitattributes`, la specifica in `Documentazione/`, `collaudi/24-contatori-avviso.js`, `collaudi/25-scorrimento-bolle.js`;
  - app: `core/anagrafica.js`, `core/coda-invio.js`, `core/errori.js`, `core/fasi.js`, `core/ui.css`, `core/versione.js`, `sw.js`, `modules/bolle/{bolle.css,coda.js,index.js,storico.js}`, `modules/foto/{coda.js,index.js}`;
  - collaudi: `07`, `09`, `10`, `12`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`, `23`, `aiuto.js`, `esegui.js`, `LEGGIMI.md`;
  - documenti: `CLAUDE.md`, `README.md`, `docs/AppFotoCantiereSpecifica202609141630Claude.md`, `docs/AppBolleSpecificaFunzionale202609011935Claude.md`. `docs/INDICE.md` non cambia: nessun nome cambia.

## 2. Diagnosi dei due controlli intermittenti, con la prova

Prima di ogni modifica dell'app, con tracce diagnostiche temporanee nei collaudi (non committate) e senza toccare l'app. **Esito: tutti e due i difetti sono dei collaudi. L'app ha fatto la cosa giusta in tutti i giri osservati.**

**Collaudo 12, «la bolla parte con fase FognaturaNera, senza livelli».**
- **Riproduzione:** rosso **3 giri su 3** con la CPU del browser rallentata ×4.
- **Cosa ha fatto l'app.**
  - Prima di Invia il menù della fase era su `FognaturaNera`, e il flow aveva già ricevuto 6 richieste: 4 bolle e la stessa foto `ImpiantoFotovoltaico` due volte, con lo stesso `idClient`.
  - Il collaudo ricaricava la pagina appena la foto arrivava al flow, prima che risultasse «Inviata». Il record restava su «invio» e ripartiva da solo al caricamento: è il comportamento voluto dalla 0.37.1, ed è la trappola 6 di `aiuto.js`.
  - Così `attendiRicevuti(6)` passava subito, e il collaudo leggeva la 4ª bolla (`fase: ""`).
  - A cose ferme è arrivata la 7ª richiesta: la bolla con `fase: "FognaturaNera"`.
- **Correzione (`6ea6d3d`):** prima di ricaricare si aspetta «Inviata». La bolla si cerca fra le richieste arrivate dopo il tocco, per contenuto e con un `idClient` nuovo.

**Collaudo 16, «scelta una fase, il pulsante dice «Rimanda corretta» e si accende».**
- **Causa:** appena si apre «Rimanda» su una foto con `Interrato`, il pulsante dice **già** «Rimanda corretta», spento, perché la fase vuota è diversa da `Interrato`. Lo si legge anche nella suite di partenza: «Rimanda appena aperto: … "pulsante":"Rimanda corretta","spento":true». Quindi l'attesa di quel testo dopo la scelta non aspettava niente.
- **La CPU rallentata non lo riproduce:** 0 rossi su 5 giri a ×4, 0 su 3 a ×20. Il ridisegno passa da una lettura IndexedDB, che fa il processo del browser.
- **Riproduzione:** con la consegna delle letture ritardata di 300 ms nel browser di prova, rosso **3 giri su 3**.
- **Cosa ha fatto l'app.** Il controllo leggeva a 5 ms dalla scelta il disegno di prima: marcatore `MNG|`, pulsante spento, «Scegli la fase per rimandarla.». L'app si è assestata da sola a circa 320 ms (marcatore `MNG|Cantiere`, pulsante acceso), e la foto è partita con `fase: "Cantiere"`.
- **Correzione:** si aspetta il marcatore `MNG|Cantiere` del riquadro e si controllano il testo e il pulsante.

**Altri due punti dello stesso tipo, visti con le leve:**
- **Il terzo, a CPU ×10.** Il 16 si è fermato in `scegliCommessa`, su `….dataset.livelli.startsWith` con il marcatore non ancora scritto (TypeError). Nei collaudi c'erano **19 letture del marcatore senza protezione e 6 copie della protezione scritte a mano**: le 25 passano ora da `attendiMarcatore` (`c3bf603`). Nel primo arresto avevo detto «21 senza protezione»: due di quelle erano già protette, e il numero giusto è 19.
  - Prova: il 16 a CPU ×10, **5 giri su 5 senza fermarsi, 36 ✓**; la suite intera dopo il commit, **677 ✓**, nessun controllo cambia significato.
  - Resta fuori la lettura dentro l'istantanea del 23: è un valore confrontato, non un'attesa, e non può esplodere.
- **Il caso 13 del 16, con le letture ritardate.** Leggeva come «bolla in coda con ImpiantiDiReteCondominiali» la bolla rimandata poco prima (`fase ""`, SNZ2.2): era ripartita da sola dopo una ricarica, ancora la trappola 6. Corretto con le due regole: prima delle ricariche niente in coda né in invio; casi 12, 13 e 14 per contenuto, con un `idClient` nuovo.

**Prima e dopo la correzione:**

| Controllo | Leva | Prima | Dopo |
|---|---|---|---|
| 12 · bolla `FognaturaNera` | `--cpu=4` | rosso 3/3 | verde 3/3 |
| 16 · «Rimanda corretta» acceso | `--ritardo-letture=300` | rosso 3/3 | verde 3/3 |
| 16 · caso 13 | `--ritardo-letture=300` | rosso 3/3 | verde 3/3 |
| 12 + 16, collaudo finale | `--cpu=4` | — | **verde 3/3, 94 ✓** |
| suite completa, collaudo finale | nessuna | — | **5 giri di fila su 5 verdi**, 25 collaudi, 745 ✓, 0 ✗ ciascuno |

## 3. A capo (casi 28 e 29)

- **Caso 28.** `.gitattributes`: una riga di commento e `* text=auto eol=lf`. `git add --renormalize .` **non cambia nessun file** nell'indice oltre a `.gitattributes`. Dopo: 97 file `i/lf` (i 95 di prima, la specifica e `.gitattributes`) e le 4 icone `i/-text`.
- **Caso 29.** La copia di lavoro è stata riscritta con l'albero pulito (la modifica in corso messa da parte e poi ripresa).
  - Prima: 95 file `w/crlf`, 2 `w/lf`, 4 `w/-text`.
  - `git checkout-index -f -a` non ha riscritto niente, perché git considerava i file aggiornati. Quindi ho tolto dal disco i 95 file con CRLF e li ho ripresi con `git checkout -- .`.
  - Dopo: **97 `w/lf`, 4 `w/-text`**, copia pulita.
  - Coda del `CLAUDE.md` letta **dal disco**, da `## Passaggio di consegne fra ambienti` alla fine: **14832 byte, 0 CR, SHA-256 `a3e947d543fb574bfd567780c4644542ea8ca72360a630c74a5298d738dc9735`**. È uguale anche dopo il commit del `CLAUDE.md` (`37d783c`).

## 4. Numeri del §4.2

- **Fasi:**
  - `FASI` ha 29 voci, impronta delle etichette `682df6ed…` invariata. La riga `FASI_ESCLUSE_DALLE_APP` vale `AcquistoTerreno, Marketing, SpeseTecniche` e sono tutti codici di `FASI`.
  - Menù a **26** su MAR, MNG, SNZ2.2, TN1, MRS, SNZ2.1 e senza cantiere; SNU e BRU, 3 lotti ciascuna.
  - Nel menù 10 fasi col piano, 4 con l'unità, 1 col prospetto, **11** senza livelli. Sulla lista intera 10 / 4 / 1 / 14.
- **Anagrafica:** versione `202610261235`, impronta `ecb2c273…`, 32 voci, **60 combinazioni**, nessuna voce unica, nessun livello senza voci (collaudo 15, invariato).
- **Suite:** **25 collaudi verdi, 745 controlli, 0 ✗**, in 5 giri di fila. **Scarto da 677: +68.**
  - **12: 48 → 56 (+8).** Tolti 7: «le quattro nuove ci sono», «sono le 29 del menù», MNG/ordine/MAR/MRS a 29 nel modulo Foto, MNG a 29 nelle bolle. Aggiunti 15: le tre escluse assenti, le due fognature presenti, `FASI` a 29, riga delle escluse uguale all'attesa, escluse fatte di codici di `FASI`, `etichettaFase` delle escluse, menù = `FASI` meno le escluse, caso 22 su 4 commesse × 2 moduli. Cambiato: «ci sono le 29 fasi» diventa «senza cantiere 26».
  - **15: 0 netto.** Tolti i 4 controlli di `SpeseTecniche` e `AcquistoTerreno` scelte nel menù; aggiunti il menù per livello 10/4/1/11, l'assenza delle escluse e i 2 controlli su `Extra`. Cambiati MAR/MNG e MRS da 29 a 26.
  - **16: 36 → 38 (+2).** Caso 24, due controlli. Cambiato il controllo di «Rimanda corretta», che ora guarda testo e pulsante.
  - **23: 0 netto.** Caso 28 da 29 a 26.
  - **24 nuovo: +30. 25 nuovo: +28.**
  - Nessun controllo cambia nei collaudi 07, 09, 10, 14, 17, 18, 19, 20 e 21: lì è cambiata solo la lettura del marcatore.
- **Controllo di riservatezza:** verde (99 file del repository letti, niente da segnalare) e a ogni commit con l'hook.
- **Guasti messi apposta, visti rossi e tolti** (ripristino controllato con le impronte dei file):

  | Guasto | Rossi |
  |---|---|
  | contatori rimessi in cima (Bolle) | 3 (casi 1 e 5) |
  | avviso con soglia a zero | 10, compreso il caso 5 |
  | `accodatoIl` spostato da un ritentativo | 1 (caso 10) |
  | gesto: tolto «orizzontale almeno il doppio del verticale» | 5, il primo sulla diagonale ripida del caso 15 |
  | il capo dell'elenco che ricomincia dall'inizio | 12, il primo al caso 13 |
  | `Marketin` nella riga delle escluse | 20 fra 12, 15 e 23, fra cui «ognuna è un codice di FASI» |

## 5. Soglie scelte per il gesto (`modules/bolle/storico.js`)

Scelte dalla sessione, scritte nel codice col motivo, **da verificare sul telefono**:
- **60 px** di spostamento orizzontale;
- orizzontale **almeno il doppio** del verticale, cioè un angolo sotto i 27° circa;
- **fascia di 32 px** ai bordi sinistro e destro, dove il gesto non si prende (il gesto «indietro» di Android);
- niente cambio con la pagina ingrandita (`visualViewport.scale` > 1,01) e con due dita.

Ascoltatori `touchstart`/`touchend` passivi: lo scorrimento e lo zoom restano quelli del browser.

## 6. Ingressi che cambiano comportamento rispetto a `main`

1. **Contatori in fondo**, nei due moduli: dopo «Coda invii», prima del collegamento alle impostazioni.
2. **Avviso in cima**, solo per un elemento non arrivato 10 minuti dopo l'ingresso in coda.
   - Una riga per caso, nell'ordine attesa poi errore. Un tocco porta a «Coda invii».
   - Controllo da solo ogni **30 secondi**: legge la coda e aggiorna solo l'avviso, non ridisegna la schermata.
   - Soglia e conteggio in `core/coda-invio.js`, frasi in `core/errori.js`.
3. **`accodatoIl` nei record** delle due code. Lo scrivono:
   - Invia, con un solo momento per tutto l'invio;
   - «Rimanda la stessa», «Rimanda corretta» e «Cantiere sbagliato?».

   Non lo spostano i ritentativi, la ripresa di un invio interrotto e «Riprova». Non entra nel payload.
4. **Nel dettaglio delle bolle inviate:** scorrimento, due frecce, riga della bolla e posizione, messaggio ai capi.
   - Il visore ora ha lo **sfondo pieno** (prima era semitrasparente) e il **piede fisso**, con il messaggio e le frecce.
   - Le immagini lasciate si rilasciano a ogni cambio di bolla, non solo alla chiusura.
5. **Menù della fase a 26 voci**, nei due moduli, con o senza cantiere scelto. Di conseguenza «Rimanda» su un elemento già inviato con una fase esclusa riparte dal segnaposto, come per le fasi tolte (§7, punto 3).
6. **Versione 0.41.0** in `sw.js` e `core/versione.js`.
7. **Strumenti dei collaudi** (l'app non cambia): leve `--cpu` e `--ritardo-letture`, `leggiMarcatore` / `attendiMarcatore`, tre trappole nuove in `LEGGIMI.md` (marcatore, attesa di una condizione già vera, guardia sui duplicati del flow finto).
8. **Copia di lavoro su questo PC:** a capo LF (`.gitattributes`).

## 7. Punti aperti, compresi i casi trovati fuori dalla specifica

1. **`esegui.js` non spegne la guardia sui duplicati del flow finto** fra un collaudo e l'altro.
   - Il 16, il 17 e il 23 la accendono (`flow.stato.deduplica = true`); restano accesi anche `nonRispondere` e il contatore `giaPresenti`.
   - Visto mentre scrivevo il 24: nella suite intera, dopo il 23, il ritentativo del caso 10 riceveva `gia_presente` e risultava inviato. Rosso nel 23+24 senza la riga, verde con la riga.
   - Il 24 la spegne da sé. Proposta, **non fatta**: azzerare `deduplica`, `nonRispondere` e `giaPresenti` in `esegui.js` fra i collaudi. Cambierebbe le condizioni dei collaudi dal 17 al 25 nella suite (oggi verdi anche da soli): decide Francesco.
2. **Elenco di una riga sola nel visore** (caso non coperto dalla specifica): le due frecce sono spente e compaiono **tutte e due** le frasi, «È la prima…» e «È l'ultima…». L'ho deciso senza chiedere: da confermare.
3. **«Rimanda» su una bolla già inviata con una fase non più offerta.** **Previsione dal codice, non osservata.**
   - Il menù della fase del riquadro parte da «— nessuna fase —», il pulsante dice subito «Rimanda corretta», acceso, e la bolla ripartirebbe con `fase ""`.
   - Vale per `Interrato` e `ImpiantiDiReteCondominiali` dalla 0.40.0, e ora anche per le tre escluse. Nel modulo Foto invece il pulsante resta spento finché non si sceglie una fase.
   - La logica di «Rimanda» è fuori perimetro: non toccata.
4. **Le soglie del gesto e il comportamento dei gesti vanno provati sul telefono**, in particolare sul Galaxy S21+ di Paolo con la navigazione a gesti. Nel collaudo i gesti sono `TouchEvent` costruiti, non dita vere.
5. **Il resto della suite con `--ritardo-letture=300` non è stato misurato**: solo il 16. Con la CPU ×4 sono stati misurati solo il 12, il 16 e il 24.
6. **Il README cita ancora la specifica Foto come «rev. 5»**, alla sezione del modulo Foto: era così su `main` e non l'ho toccato. Oggi è alla rev. 24.

## 8. Dopo l'unione

Non fatto: la PR non è unita. Dopo l'unione di Francesco, dalla sessione locale si esegue `node collaudi/pubblicato.js` (atteso 0.41.0 sul sito). Poi Francesco verifica sul telefono: Informazioni 0.41.0, menù a 26 fasi, contatori in fondo e, dalla pagina delle bolle inviate, lo scorrimento.
