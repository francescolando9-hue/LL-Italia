# Ritorno a Cowork — app LL Italia 0.39.0: palazzina («Lotto»), parti comuni, TN1 nei menù

> 13/10/2026 ore 17:42 · dalla sessione Claude Code cloud del repository dell'app, per il progetto **FotoCantiere**. Questo file è un messaggio, non una fonte: riscontralo sul codice, sui commit e sui registri prima di registrarlo. Sono soli dati, quelli che la specifica chiede. Il repository è pubblico: qui non ci sono percorsi del server né dati veri. Specifica ricevuta: `Documentazione/FotoCantiereSpecificaAppPalazzina202610131413Claude.md`, rev. 2.

## 1. Commit e file modificati

- **Punto di partenza:** `adca1e9`. La specifica indica `53fb1af`: `adca1e9` aggiunge solo la specifica (1 file, 151 righe), quindi il codice di partenza è lo stesso.
- **Commit del lavoro**, ramo `claude/friendly-feynman-9d89na`, PR numero 70:

  | Commit | Cosa |
  |---|---|
  | `baf41d5` | §3.1: blocco `ANAGRAFICA` rigenerato dal §6, master `202610101049` |
  | `75d2ec0` | §3.2: TN1 nel menù, otto commesse; collaudi 14, 15, 21 |
  | `855dc1b` | §3.3–3.6: palazzina, parti comuni, `scala` nel payload, «Rimanda»; collaudo 23 nuovo; collaudi 07 e 15 |
  | `811be14` | §3.7: versione `0.39.0` in `sw.js` e `core/versione.js`; README, specifica Foto rev. 22, LEGGIMI dei collaudi |

- **Su `main`:** `ff59d65`, unione della PR 70 il 13/10/2026 alle 17:39:44 (+0200), genitori `adca1e9` e `811be14`. L'albero di `main` è identico a quello di `811be14`.
- **File modificati** (16, 1239 righe aggiunte e 147 tolte): `core/anagrafica.js`, `core/cantieri.js`, `core/versione.js`, `sw.js`, `modules/foto/index.js`, `modules/foto/coda.js`, `modules/foto/invio.js`, `README.md`, `docs/AppFotoCantiereSpecifica….md`, `collaudi/07-foto-invio.js`, `collaudi/14-commesse.js`, `collaudi/15-livelli.js`, `collaudi/21-cantiere-senza-memoria.js`, `collaudi/23-palazzina-parti-comuni.js` (nuovo), `collaudi/LEGGIMI.md`, `collaudi/aiuto.js`. Il blocco `ANAGRAFICA` non è stato scritto a mano: l'ha rigenerato uno script dal JSON del §6, dopo essersi visto riprodurre byte per byte il blocco di partenza (188 righe).

## 2. Numeri del collaudo

- **Suite intera sull'albero di `811be14`, uguale a quello di `main`: 23 collaudi, 645 controlli ✓, 0 ✗.** Il dato di partenza (`adca1e9`) era 508: 472 nei collaudi 01–21 più 36 del 22. Sono +137: 129 del collaudo 23 nuovo e 8 negli altri. **Correzione:** nel testo della PR 70 e nel resoconto in chat avevo scritto 668; era il conto delle righe ✓ con le 23 di riepilogo dentro. I controlli sono 645.
- **Collaudo 23: 33 casi su 33.** I 28 della specifica, con la numerazione del master, più 5 approvati da Francesco il 13/10/2026: «Rimanda» con il solo lotto corretto (29), «Rimanda» di un record «Parti comuni» e valori ricavati dall'unità che non diventano punto di partenza (30), dall'unità a «Parti comuni» (31), lotto che riparte al cambio piano (32), voce unica del lotto con commesse sintetiche (33).
- **Numeri attesi, tutti misurati dall'app:**
  - menù delle commesse a 8 voci, in foto e in bolle;
  - TN1: 6 piani; 64 unità in 16 gruppi (4 lotti × 4 piani) nell'ordine del dato; 4 lotti offerti per ciascuno di `P0`, `P1`, `P2`, `P3` e `Tetto`, nessuno per `P-1`; 65 voci nel menù delle unità di `ImpiantoIdrosanitario`;
  - voce unica: 60 combinazioni di commessa, fase e livello obbligatorio, 2 a voce unica (SNZ2.2 · `Interrato` · `P-1` e TN1 · `Interrato` · `P-1`), 1 senza voci (MAR · `Interrato`); lotto: 0 casi a voce unica con il dato vero;
  - `PartiComuni` non è il codice di nessuna unità; `scala` mai uguale a `''` in tutti i payload del collaudo; nelle bolle nessun livello e nessun campo `scala`.
- **Guasti messi apposta, tutti visti rossi**, su copie del commit e mai sul repository; la copia senza guasti era verde:

  | Guasto | Controlli rossi |
  |---|---|
  | una voce del blocco `ANAGRAFICA` ritoccata | 1 (impronta) |
  | lotto non chiesto su TN1 · `Strutture` · `P1` | 27 (casi 1, 2, 10, 11, 15, 23–26, 29–33) |
  | `scala: ''` nel payload | 33 (collaudi 07, 15, 23) |
  | «Parti comuni» comparsa in `FinituraAlloggi` | 3 (caso 18) |
  | voce unica del lotto rotta | 5 (caso 33) |
  | lotto che non riparte al cambio piano | 4 (casi 32, 33) |
  | «Rimanda» senza `scala` nel confronto «cambiato» | 2 (caso 29) |
  | «Rimanda» col piano ricavato come punto di partenza | 4 (caso 30) |
  | lotto non ricavato dall'unità | 6 (casi 6, 12, 25) |
  | lotto fuori anagrafica che parte | 3 (casi 11, 33) |
  | TN1 fuori dal menù | 6 (collaudi 14, 15, 21) |

- **Su GitHub:** controllo `Riservatezza` riuscito sulla testa della PR (`811be14`, evento pull request e push) e su `main` (`ff59d65`). Pubblicazione su Pages: esecuzione 70 sul commit `ff59d65`, completata con successo, dalle 15:39:47 alle 15:40:07 UTC.

## 3. Ingressi che cambiano comportamento rispetto a `53fb1af`

Quelli della specifica, e solo questi:

- TN1 nei due menù delle commesse, foto e bolle;
- il selettore «Lotto» nelle fasi per piano e per prospetto di TN1;
- `scala` ricavata e gruppi per lotto nelle fasi per unità di TN1;
- «Parti comuni» in `ImpiantoIdrosanitario` di tutte le commesse edificio;
- la riga «Per le parti comuni usa la fase …» nelle tre fasi gemelle;
- il campo `scala` in ogni payload di foto e video, `null` fuori da TN1.

**Tre aggiunte che la specifica non nomina, approvate da Francesco il 13/10/2026:** la riga della coda mostra «Lotto 4 · P1»; per TN1 il testo sotto il menù delle unità dice «Piano P3 (Piano terzo) e Lotto 4: li ricava l'app dall'unità…»; un'unità o un lotto che non sta fra le voci possibili non parte.

Nel dato, la riga `8B` di `etichetteUnita` di MNG è in fondo invece che al secondo posto, perché il JSON canonico ha le chiavi ordinate: non cambia nessun valore.

## 4. In esercizio

- **Commit su `main`:** `ff59d65`.
- **Impronta del blocco `ANAGRAFICA` su `main`:** `df5dd3f6ecb6075ee74d70b7efd2de30be70f2d471b05617a725d680141495a8`, 7208 byte, versione `202610101049`, uguale a quella del §6. Letta dai file di `main`. `sw.js` e `core/versione.js` sono entrambi a `0.39.0`.
- **`node collaudi/pubblicato.js`: nessun esito.** Da questa sessione il sito `francescolando9-hue.github.io` è negato dalla policy di rete dell'ambiente: il proxy risponde 403 alla richiesta di connessione, due volte (15:41:18 e 15:41:26 UTC), sia con lo script, anche con `NODE_USE_ENV_PROXY=1`, sia con `curl`. Lo script esce con codice 2 («Non si è riusciti a leggere il sito»), che per sua stessa dichiarazione non vale come esito. **L'impronta e la versione in esercizio, cioè quelle servite ai telefoni, non sono quindi misurate.** Di sicuro c'è lo stato del deploy alla fonte (esecuzione 70 riuscita), che è un indizio e non la lettura del sito.

## 5. Punti aperti

1. **Da eseguire: la lettura del sito pubblicato.** `node collaudi/pubblicato.js` da una macchina che raggiunge il sito, oppure aggiungendo l'host agli indirizzi consentiti dell'ambiente cloud. Sul telefono, dopo un ricarico: pagina Informazioni con versione `0.39.0` e anagrafica `202610101049`.
2. **Difetto preesistente, non corretto: una riga video nella coda del modulo Foto fa sbordare la pagina in orizzontale e sposta fuori schermo la barra «Invia».** In emulazione mobile (390×844) il layout viewport passa a 482×1044, e a 547×1184 con `SNZ2.1 · Impermeabilizzazioni`. Un clic reale su «Invia» fallisce («intercepts pointer events») anche se il pulsante è acceso. Misurato anche sul commit `adca1e9` (app 0.38.1) con MAR · Bonifica, quindi non dipende dalla 0.39.0; con le foto non succede. Elementi oltre i 392 px nella riga video: progressivo, tag «Video», colonna delle azioni (badge e «Rimanda»). La causa esatta non è identificata. Il collaudo 23 lo aggira partendo da una coda vuota a ogni caso; è annotato come trappola 7 in `collaudi/aiuto.js`. Misura in emulazione, da verificare sul telefono vero. La registra Cowork, per decisione di Francesco.
3. **Il testo del §1 della specifica non corrispondeva al codice.** L'ultimo punto delle «Regole che restano» dice che, quando un menù si ricostruisce, il valore scelto resta se è ancora fra le voci, «come per gli altri livelli». Dalla 0.38.0 non è così: piano, unità e prospetto ripartono dal segnaposto al cambio di cantiere o di fase, anche se il valore è ancora fra le voci; «resta» vale solo per i valori iniziali del riquadro «Rimanda». Il lotto dipende dal piano e la specifica non diceva cosa fare cambiando piano: Francesco ha deciso il 13/10/2026 che **il lotto riparte**. Da riallineare nel master dell'anagrafica la frase della regola 7 e quella del §1.
4. **Non verificato:** il telefono vero (solo emulazione Playwright); il ricevente, cioè colonna `Scala`, flow e script, dichiarati pronti dalla specifica ma non nel repository; se il ramo a blocchi del flow (`dueFasi`, spento di default) mappa `scala`, perché il caso 23 copre solo l'invio in una richiesta.
5. **Il ricevente alza l'anomalia «livello mancante» per la palazzina solo da `versioneApp` 0.39.0:** l'app invia esattamente `0.39.0`, non una versione precedente né successiva.
