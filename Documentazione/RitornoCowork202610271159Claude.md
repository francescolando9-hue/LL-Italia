# Ritorno a Cowork — app LL Italia 0.41.1: «Rimanda» che non perde la fase, cantiere o fase da correggere, visore senza frecce

> **27/10/2026 ore 11:59 · dalla sessione locale «Sviluppo App LL Italia» (Claude Code), per la sessione «FotoCantiere prova responsabile».**
> Specifica: `Documentazione/FotoCantiereSpecificaAppBolleRimandaFase0411202610270053Claude.md` (copia invariata, commit `9b5dcc2`). Partenza: `main` a `961c95b`, albero `922362e8…`, app 0.41.0. Ramo `lavoro0411`, commit firmati. **Nessuna unione su `main`**: la PR resta aperta per Francesco. Soli dati.

## 1. Commit e file

| Commit | Contenuto |
|---|---|
| `9b5dcc2` | specifica salvata invariata in `Documentazione/` |
| `6a0d923` | collaudo 26, caso 1, **visto rosso sul codice di oggi** (§3) |
| `00685c5` | `collaudi/esegui.js`, regola 6, da solo (§4) |
| `ae54bbb` | regola 1 e strada A nella Coda invii: `core/anagrafica.js`, `core/errori.js`, `modules/bolle/index.js` |
| `eb791c1` | collaudo 26, casi 2–6, i due casi del cambio di cantiere, le quattro frasi |
| `0da5726` | «Cantiere o fase sbagliati?» e visore senza frecce: `modules/bolle/storico.js`, `modules/bolle/coda.js`, `modules/bolle/bolle.css` |
| `9a5e152` | collaudi 21 e 25 allineati |
| `a2f4a4c` | collaudo 27 nuovo |
| `6d4d1c5` | versione 0.41.1 in `sw.js` e `core/versione.js`, insieme |
| `4bdfc4b` | collaudi 26 e 27: attese che non fermano il collaudo con un guasto; caso 17 misurato a ogni posizione di scorrimento |
| `d5827ee` | README, `docs/AppBolleSpecificaFunzionale…` alla **revisione 12** (Schermate 2 e 3; storia invariata), `collaudi/LEGGIMI.md`, commento della trappola 9 in `collaudi/aiuto.js` |
| *(questo file)* | ritorno |

18 file, +1095 / −156 rispetto a `961c95b` (prima di questo file). **`CLAUDE.md` non toccato**: vedi §8.

## 2. Arresto 1 e deciso durante il lavoro

Arresto 1 mandato prima di modificare, con la misura di partenza: `main` = `961c95b`, albero come in testa; **25 collaudi verdi, 745 controlli**. Risposta della sessione responsabile, tutte accolte come proposte:

- **D1 — differenza fra specifica e codice.** «Come nella Coda invii» contraddiceva il caso 9: nella Coda invii, al cambio di cantiere, il menù della fase ripartiva dal segnaposto (0.37.9) e da MAR a MNG la bolla partiva con `fase: ""`. **Strada A**: nei due riquadri, al cambio di cantiere il menù torna alla fase della bolla (F) se il cantiere nuovo la offre, altrimenti vale la regola 1; una fase scelta a mano prima del cambio non si porta dietro. Due casi aggiunti (collaudo 26). Il cambio della 0.37.9 nella Coda invii è fra gli ingressi del §6.
- **D2 — frase della regola 1 con lotti e urbanizzazioni.** Inizio secondo F («La fase «X» non è fra quelle…» / «Il lotto «Lotto 1» non è fra quelli…»), fine secondo il menù del cantiere scelto («scegli la fase» / «scegli il lotto»); per una fase tolta il codice com'è.
- **D3 — testi di «Bolle inviate».** Conferma con le sole parti che cambiano, cantiere col codice e fase con l'etichetta: «su MNG?», «con fase Murature?», «su MNG, fase Murature?», «su SNU, Lotto 1?», «senza fase?» (fase tolta apposta). Riga sotto il pulsante: «Cambia il cantiere o la fase per rimandarla.» / la frase della regola 1 / «Cambia: cantiere MNG, fase Murature. Invio nuovo, con un identificativo nuovo.»
- **D4 — cantiere della bolla non più nel menù.** «— scegli il cantiere —» in testa solo in quel caso, pulsante spento finché non si sceglie.
- **§3.1**: condizione in `core/anagrafica.js` (`faseDaRivedere`), frase in `core/errori.js` (`fraseFaseDaRivedere`).
- **`CLAUDE.md`**: le regole della sessione di sviluppo non permettono di modificarlo su richiesta di un'altra sessione; la conferma va chiesta direttamente a Francesco (§8).

## 3. Caso 1 visto rosso sul codice di oggi

Commit `6a0d923` (collaudo 26 col solo caso 1, codice della 0.41.0): **3 rossi su 5 controlli**. Riquadro aperto su una bolla MAR · `Interrato`: menù su «— nessuna fase —» (verde), pulsante **acceso** su «Rimanda corretta», sotto la frase «Invio nuovo, con un identificativo nuovo…» invece di quella del caso; premuto, **la bolla è partita su MAR con `fase: ""`**. È la previsione del ritorno della 0.41.0, §7.3, ora osservata. Dopo la correzione: verde.

## 4. Regola 6: suite prima e dopo `esegui.js`

Stesso albero, unica differenza l'azzeramento; in tutte e due le suite una riga temporanea (non committata) stampava le guardie del flow finto all'avvio di ogni collaudo.

| | collaudi | controlli | rossi | controlli che cambiano esito |
|---|---|---|---|---|
| prima (`6a0d923` + riga di misura) | 26 | 750 | 3 (tutti del 26, caso 1, attesi) | — |
| dopo (`00685c5` + riga di misura) | 26 | 750 | 3 (gli stessi) | **0** |

Guardie all'avvio, **prima**: `deduplica` accesa dal 17 al 24 (il 17 e il 23 la accendono anche da sé, il 24 la spegne da sé; ereditata e usata dal 18 al 22); `giaPresenti` a 2 al 17, 3 dal 18 al 23, 4 dal 24 al 26; `nonRispondere` sempre spento. **Dopo**: tutte spente e a zero in tutti i 26 collaudi. La previsione della specifica diceva «cambia solo la condizione di `deduplica` nei collaudi 18–22»: misurato, `deduplica` era accesa all'avvio dal 17 al 24 e `giaPresenti` diverso da zero dal 17 al 26; nessun controllo cambia esito.

## 5. Numeri del §4.2

**Suite finale** (`d5827ee`), **5 giri di fila: 5 su 5 verdi**, ogni giro **27 collaudi, 809 controlli, 0 rossi** (179–183 s di collaudi per giro).

**Scarto da 745: +64.**

| Collaudo | Partenza → finale | Spiegazione |
|---|---|---|
| 26 (nuovo) | 0 → 22 | casi 1–6, i due casi del D1, le quattro frasi e i casi in cui non scatta, console |
| 27 (nuovo) | 0 → 36 | casi 7–14 e 17, D3, D4, console |
| 25 | 28 → 34 | **5 tolti**: freccia › fino in fondo (testa), freccia › spenta con «È l’ultima…», gesto e freccia spenta al capo, freccia ‹ spenta con «È la prima…», caso 20 «riparte da — scegli il cantiere —». **11 aggiunti**: nel mezzo nessuna frase, nessuna freccia né piede, col gesto fino in fondo (testa), «È l’ultima…» una sola nella testa, gesto al capo, «È la prima…» una sola nella testa, caso 20 dai valori della bolla nuova, e i quattro del caso 15 (elenco di una bolla) |
| 21 | 25 → 25 | **3 cambiati**: il menù della correzione parte dal cantiere della bolla con otto cantieri (era «da — scegli il cantiere —»), «Rimanda corretta» spento finché non si cambia (era «Rimanda» spento finché non si sceglie), scelto un altro cantiere si accende |
| gli altri 23 | 692 → 692 | invariati |

La partenza per collaudo di 21 e 25 è stata rimisurata su `961c95b` (copia di lavoro a parte, poi tolta): 25 e 28 controlli, verdi.

**Casi 19 e 20 della tabella.** I collaudi dal 16 al 27 lanciati uno per uno: stesso numero di controlli e stesso esito (tutti verdi) che nella suite — 16: 38, 17: 11, 18: 21, 19: 20, 20: 23, 21: 25, 22: 36, 23: 133, 24: 30, 25: 34, 26: 22, 27: 36.

**Anagrafica e fasi invariate** (dal collaudo 15 e dal 12 nella suite finale): anagrafica `202610261235`, impronta `ecb2c273fa623b24…`, 7319 byte; master delle fasi `2026-10-24.3`, impronta delle etichette `682df6edbc092d8c…`, 555 byte; `FASI` a 29; menù a 26 su MNG, MAR, TN1, MRS nei due moduli.

**Controllo di riservatezza**: verde, 103 file del repository letti; l'hook ha letto e passato ogni commit.

**Guasti messi apposta: sette, tutti visti rossi** (ognuno applicato, collaudato e tolto; albero pulito dopo):

| Guasto | Rossi |
|---|---|
| G1 · il codice della Coda invii di `961c95b` | 10 nel 26 (casi 1, 3, 5 e i tre del D1) |
| G2 · la frase della regola 1 tolta, nei due riquadri | 6 (3 nel 26, 3 nel 27) |
| G3 · in «Bolle inviate» pulsante acceso senza niente di cambiato | 4 (1 nel 21, 1 nel 25, 2 nel 27) |
| G4 · con una bolla sola le due frasi insieme | 2 nel 25 |
| G5 · il piede sticky della 0.41.0 rimesso in fondo al visore | 5 (2 nel 25, 3 nel 27: caso 17 sulla 1ª, 3ª e 5ª bolla) |
| G6 · il cantiere della bolla tolto dal menù del riquadro | 6 rossi più un arresto del 27 (2 nel 21, 1 nel 25, 3 nel 27, poi il 27 si ferma su un menù di lotti) |
| G7 · al cambio di cantiere la fase riparte dal segnaposto (D1) | 7 (3 nel 26, 4 nel 27, caso 9) |

**G5 al primo tentativo era verde**, ed è stato corretto il collaudo, non il guasto: (1) con il solo `scrollIntoView` i comandi non arrivano mai sotto il piede, perché il visore scorre di 213–238 px e il riquadro sta in fondo; il caso 17 ora misura a ogni passo di 40 px di scorrimento, con l'immagine caricata; (2) un piede di prova vuoto si schiaccia ad altezza zero nella colonna flessibile del visore (misurato: 828–828 px), quindi il guasto rimette il piede della 0.41.0 con la frase e i due pulsanti da 64 px.

**Caso 21 della tabella.** README: nessuna specifica corrente con numero di revisione (tolti «rev. 5» della Foto in due punti e «rev. 2» della Bolle); resta la citazione storica «vedi la specifica Bolle rev. 9» per una misura di quella revisione. `CLAUDE.md`: **non ancora fatto**, §8.

## 6. Ingressi che cambiano comportamento rispetto a `961c95b`

1. **Coda invii, «Rimanda questa bolla», fase della bolla non offerta per il cantiere scelto** (tolta, esclusa, o un cantiere che non la prevede): pulsante **spento** finché non si sceglie una voce, e sotto la frase del caso. Prima: acceso su «Rimanda corretta», bolla rimandata con `fase: ""`. Il testo del pulsante spento resta «Rimanda corretta».
2. **Coda invii, cambio di cantiere** (D1): il menù della fase torna alla fase della bolla se il cantiere nuovo la offre; una scelta a mano non si porta dietro. Prima (dalla 0.37.9): ripartiva dal segnaposto e la bolla partiva senza fase.
3. **«Bolle inviate»: «Cantiere sbagliato?» → «Cantiere o fase sbagliati?»** Menù del cantiere con **tutti** i cantieri, che parte da quello della bolla (prima: i soli altri cantieri, da «— scegli il cantiere —», dalla 0.38.0); **menù della fase nuovo**, che parte dalla fase della bolla, con le regole 1 e D1; pulsante **«Rimanda corretta»** (prima «Rimanda») acceso solo se è cambiato qualcosa; **riga sotto il pulsante** nuova; **conferma** con le sole parti che cambiano (prima «Rimandare questa bolla su X?»); la bolla riparte con **la fase scelta** (prima sempre quella dell'invio originale, anche se tolta). Sottotitolo: «Rimanda la stessa foto col cantiere e la fase giusti.» (era «… sul cantiere giusto.»). D4: «— scegli il cantiere —» e «Scegli il cantiere per rimandarla.» solo per un cantiere fuori menù.
4. **Visore**: niente frecce (`#bolla-prec`, `#bolla-succ`) né piede sticky; la frase dei capi sta nella testa, sotto «3 di 12», una alla volta; con una bolla sola «È l’unica bolla di questo elenco» (prima le due frasi insieme). Il visore ha di nuovo il margine in fondo (16 px più l'area sicura), che col piede era a zero.
5. **`collaudi/esegui.js`**: prima di ogni collaudo anche `deduplica = false`, `nonRispondere = false`, `giaPresenti = 0`.
6. `coda.confermaSingola` accetta la fase scelta (quinto argomento); senza, tiene quella della bolla come prima. Il contratto col flow non cambia: `fase` c'era già.
7. Versione **0.41.1** in `sw.js` e `core/versione.js`.

## 7. Punti aperti e casi fuori dalla specifica

- **Segnaposto su SNU e BRU.** Nei casi 5 e 12 la specifica dice «— nessuna fase —»; l'app, come già prima, su un'urbanizzazione mostra «— nessun lotto —». I collaudi controllano «— nessun lotto —».
- **Dopo un rimando riuscito dal riquadro di «Bolle inviate»**, cambiando un menù il pulsante si riaccende e si potrebbe rimandare una seconda volta: come nella 0.41.0, non toccato.
- **Frase dei capi**: tenuta con la classe di oggi (centrata) dentro una testa allineata a sinistra, come chiede «stesso stile»; da guardare sul telefono.
- **Testi non dati dalla specifica né dall'arresto**: il sottotitolo del riquadro e la riga di D4, scritti sul modello di quelli esistenti (§6.3).
- **Uscite grezze**: quelle della suite di partenza, delle due suite della regola 6 e del primo giro dei guasti non sono più disponibili (la cartella temporanea della sessione è stata ripulita durante il lavoro); i numeri sopra sono quelli letti allora, e la partenza di 21 e 25 è stata rimisurata. Le uscite dei cinque giri finali e dei collaudi da soli ci sono.
- **Dopo l'unione** (§6 passo 6 della specifica): `node collaudi/pubblicato.js` dalla sessione locale, atteso 0.41.1; Francesco verifica sul telefono Informazioni 0.41.1, visore senza frecce, riquadro «Cantiere o fase sbagliati?» (e che scorrendo nessuna barra copra i menù); soglie del gesto da riprovare.

## 8. `CLAUDE.md` (regola 7)

Da fare, in un commit dedicato, **solo con la conferma diretta di Francesco nella sessione di sviluppo**: la richiesta è arrivata da un'altra sessione, e le regole della sessione di sviluppo non ammettono di modificare il `CLAUDE.md` per questo. Cosa cambierebbe: riga della specifica Bolle, «specifica ufficiale, rev. 2: prevale su tutto» → «specifica ufficiale: prevale su tutto». La riga «Il kickoff del 01/09/2026 è superato dalla specifica rev. 2» è storia (dice cosa ha superato il kickoff) e resterebbe com'è. Se la conferma arriva prima dell'unione, il commit entra in questa PR e questo paragrafo si aggiorna.
