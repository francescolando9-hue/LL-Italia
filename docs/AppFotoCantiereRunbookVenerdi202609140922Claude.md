# App LL Italia — Runbook del venerdì: foto d'archivio da SharePoint a `L:`

> **Rev. 1 del 14/09/2026 ore 09:22.** Procedura ricorrente per portare le foto di categoria **Archivio** dalla raccolta `FotoCantiere` alle cartelle di commessa sul server. Da eseguire in **Cowork**, il venerdì sera, insieme al controllo delle segnalazioni.
>
> Non è un documento di programmazione: l'app non c'entra, qui si lavora a valle della raccolta. Nessun segreto — token e URL firmati vivono nel flow e sui dispositivi, non qui.
>
> **Rev. 3 del 14/09/2026 ore 15:10:** i **percorsi di destinazione escono da questo documento**. Esistono, sono stati verificati sul server il 10/09 e stanno nel file di conoscenza di progetto su `L:`, insieme alla regola sulle sottocartelle: qui non si scrivono perché il repo è pubblicato integralmente su GitHub Pages e quelli sono percorsi del server interno. Resta qui tutto il resto — la struttura delle sottocartelle, la procedura, la quadratura.
>
> Rev. 2: aggiunto l'`Indice.txt` mensile (§7 non è più un punto aperto) e deciso cosa fare dei file senza colonne rimasti dal collaudo (§8). **Il runbook è eseguibile.**

## 1. Cosa fa, in una frase

Ogni venerdì prende le foto **Archivio** arrivate dai telefoni durante la settimana, le deposita nella cartella d'ambito della commessa a cui si riferiscono, e segna in raccolta che sono state scaricate — così il venerdì dopo non le riprende.

**Cosa NON fa**, per scelta:

- **non cancella niente da SharePoint.** La raccolta resta la copia di riferimento: se un file sul server viene spostato o perso, si riscarica. Cancellare per fare spazio è una decisione separata, da prendere quando la raccolta sarà cresciuta;
- **non tocca le foto di Avanzamento.** Servono a capirsi sul momento e non hanno valore documentale: restano in raccolta, consultabili dalla vista `Avanzamento`;
- **non rinomina i file.** Il nome lo compone il flow (`Foto[Commessa][Tipo][AAAAMMGGHHMM][Operatore].jpg`) ed è già nella nomenclatura di gruppo. Rinominare sul server romperebbe la corrispondenza con la raccolta, che è quello che rende possibile la quadratura.

## 2. Prerequisiti, una volta sola

1. **Le cartelle di commessa collegate in Cowork**, selezionate dal selettore entrando da **Questo PC → `lc (L:)`**. Mai incollare percorsi a mano, mai l'UNC, e **mai collegare l'intera `L:`**: solo le cartelle foto delle commesse attive.
2. **Accesso alla raccolta `FotoCantiere`** sul sito Cantieri LL.
3. La vista **`Archivio da scaricare`** esiste già in raccolta ed è la coda di lavoro di questo runbook: mostra le foto con `Tipo = ARCHIVIO` e `DataScarico` vuota, ad ambito ricorsivo (quindi vede anche le sottocartelle `AAAA/AAAAMM` create dal flow).

## 3. Dove vanno i file

⚠️ **I percorsi esatti non stanno in questo documento.** Sono registrati nel **file di conoscenza di progetto su `L:`**, verificati sul server il 10/09/2026, insieme alla mappa commessa → cartella e alla regola sulle sottocartelle. Chi esegue il runbook in Cowork li ha già davanti; questo repo è pubblicato integralmente su GitHub Pages, e i percorsi del server interno non ci vanno.

Qui resta la **forma**, che serve a capire la procedura:

```
<cartella foto della commessa>\<AAAA>\<AAAAMM>\              le foto
<cartella foto della commessa>\<AAAA>\<AAAAMM>\Video\        i video
```

**`<AAAA>` e `<AAAAMM>` si calcolano su `DataScatto`, non sulla data di oggi.** Una foto scattata il 30 settembre e scaricata il 3 ottobre appartiene a settembre: se si usasse la data di scarico, le cartelle sul server non corrisponderebbero più a quelle in SharePoint e la quadratura del mese smetterebbe di funzionare.

Le commesse che l'app può mandare oggi sono **`MAR`, `SNZ2.2`, `MNG`** (`core/cantieri.js`). Se se ne aggiunge una nell'app, **va aggiunta anche alla mappa** nel file di conoscenza: una commessa senza cartella registrata fa fermare il runbook su quelle foto, che è il comportamento voluto — vedi §6.

## 4. La procedura

1. **Apri la vista `Archivio da scaricare`** e conta gli elementi. Annota il numero: è il primo dei tre numeri della quadratura.
2. **Per ogni elemento**, nell'ordine in cui la vista li presenta:
   1. leggi `Commessa`, `DataScatto`, `Genere` e il nome del file;
   2. individua la cartella di destinazione — mappa nel file di conoscenza, forma in §3 — **creandola se non esiste**;
   3. **copia** il file (copia, non sposta: in SharePoint resta);
   4. **verifica che il file sul server abbia la stessa dimensione in byte** dell'originale. È il controllo che distingue una copia riuscita da una copia interrotta, e costa un istante;
   5. **aggiungi una riga all'`Indice.txt`** della cartella del mese (§4-bis), creandolo se non c'è;
   6. **solo dopo la verifica e la riga nell'indice**, scrivi `DataScarico` con la data e ora di adesso, formato `AAAAMMGGHHMM` (testo, come `DataScatto`: il connettore SharePoint riscrive qualunque valore che somigli a una data, ed è già costato nove ore di scarto).
3. **Se un passaggio fallisce, non scrivere `DataScarico`.** Un elemento non marcato torna nella vista il venerdì dopo, ed è esattamente quello che deve succedere. Scrivere la data su una copia non riuscita è il modo di perdere una foto senza accorgersene.
4. **Alla fine, riapri la vista.** Deve essere vuota, o contenere solo gli elementi che hai deliberatamente lasciato indietro (§6), con l'elenco di quali e perché.

## 4-bis. L'`Indice.txt` della cartella

Il file porta con sé l'operatore nel nome, ma **la nota no** — ed è la cosa che l'operatore ha scritto apposta, con le mani sporche, perché serviva. In SharePoint c'è; sul server, senza indice, si perde.

In ogni cartella `AAAAMM` sta un `Indice.txt`, a cui il runbook **aggiunge in coda** una riga per ogni file depositato. Una riga per file, campi separati da tabulazione, così si apre con Blocco note e si incolla in Excel:

```
NomeFile	DataScatto	Operatore	Commessa	Genere	Nota
FotoSNZ2.2ARCHIVIO202609141032PaoloSanzarello.jpg	202609141032	Paolo Sanzarello	SNZ2.2	foto	Armatura pilastri piano terra
FotoSNZ2.2ARCHIVIO202609141035PaoloSanzarello.jpg	202609141035	Paolo Sanzarello	SNZ2.2	foto	
```

Tre regole:

- **si aggiunge in coda, non si riscrive.** Il file cresce a ogni venerdì e non si tocca quello che c'è già;
- **l'intestazione si scrive solo alla creazione**, quando la cartella del mese nasce;
- **una nota vuota resta vuota.** Non si inventa una descrizione: una nota assente è un dato, una nota inventata è un errore che sopravvive al runbook.

Se una riga non si riesce a scrivere, vale la regola del §4.3: **non marcare `DataScarico`**. Il file scende di nuovo il venerdì dopo e l'indice si completa allora — meglio una riga doppia, che si vede, di una foto senza riga, che non si vede.

## 5. La quadratura — il collaudo, sui numeri

Tre numeri, che devono coincidere:

| | Numero |
|---|---|
| A | elementi nella vista `Archivio da scaricare` **prima** di cominciare |
| B | file **nuovi** depositati sul server in questa esecuzione |
| C | elementi che risultano marcati con `DataScarico` **dopo** |

**A = B = C.** Ogni scarto è un difetto da spiegare, non da arrotondare:

- **B < A**: qualche file non è sceso. Guarda quali elementi sono rimasti nella vista e perché;
- **C < B**: hai copiato file senza marcarli. Il venerdì dopo li riscarichi e ti ritrovi doppioni sul server: rimedia marcandoli adesso, dopo aver verificato che il file ci sia;
- **C > B**: hai marcato qualcosa che non è sceso. È il caso peggiore, perché quella foto non tornerà più nella vista: togli la `DataScarico` dagli elementi interessati.

Scrivi i tre numeri nel resoconto dell'esecuzione. Un runbook che dice «fatto» senza numeri non dimostra niente.

### Il controllo di continuità — primo giro fatto, ed è pulito

Ogni foto porta `IdDispositivo` e `Progressivo`: la sequenza è **per dispositivo**, parte da 1 e non si azzera mai. Raggruppando la raccolta per `IdDispositivo` e ordinando per `Progressivo`, **un numero mancante significa una foto scattata e mai arrivata**. È lo stesso controllo che sulle bolle dice «zero buchi» ogni sera.

Due avvertenze, altrimenti il controllo dà falsi allarmi:

- **non raggruppare mai per `Operatore`**: è testo libero, si spezza a ogni grafia diversa del nome e fonde due telefoni della stessa persona;
- **la sequenza delle foto è indipendente da quella delle bolle**: sono due raccolte, ognuna si controlla per conto suo. Non confrontarle.

**Le foto arrivate prima del 12/09/2026 hanno `Progressivo` e `IdDispositivo` vuoti**: sono partite da una versione dell'app che non li mandava ancora. Non sono un buco: la sequenza parte dalla prima foto che porta il numero 1.

**Primo controllo, 14/09/2026:** due foto d'archivio dallo stesso dispositivo, `Progressivo` **1 e 2 consecutivi** e `IdDispositivo` valorizzato su entrambe. Nessun buco. È il primo giro in cui questo controllo ha potuto dire qualcosa, e ha detto la cosa giusta — da qui in poi un numero mancante è una foto scattata e mai arrivata, non un'incertezza.

## 6. I casi che si presentano, e cosa fare

| Caso | Cosa fare |
|---|---|
| **Commessa senza cartella registrata** (§3) | **Fermati su quella foto**: non scaricarla, non marcarla, segnalala nel resoconto. Depositarla «da qualche parte» significa perderla in un posto plausibile. |
| **File già presente sul server con lo stesso nome** | Confronta le dimensioni. Identiche: è già stato scaricato, marca `DataScarico` e prosegui. Diverse: **non sovrascrivere**, segnala nel resoconto — due file diversi con lo stesso nome sono un dato da capire, non da risolvere in automatico. |
| **Foto in raccolta senza colonne compilate** | Il file c'è ma non si sa di chi è: non scaricarla e segnalala. È il sintomo di un invio andato a metà (successo il 10/09 con i campi numerici mandati come stringa vuota, poi corretto lato flow). |
| **Un video fra le foto** | Va nella sottocartella `Video` (§3). Conta nella quadratura come gli altri. |
| **La vista è vuota** | Nessuna foto d'archivio questa settimana. Scrivilo nel resoconto: «0 elementi» è un esito, non un'esecuzione saltata. |

## 7. Punti aperti — da decidere, non da presumere

1. **Quando si potano le foto dalla raccolta.** Oggi non si cancella niente. Quando lo spazio diventerà un problema, la regola dovrà essere esplicita (per esempio: si cancellano le foto con `DataScarico` più vecchia di N mesi, mai quelle senza). Non urgente, ma non improvvisabile.
2. **Le foto di Avanzamento** restano in raccolta per sempre, e nessuno le pota. Vale lo stesso ragionamento del punto 1.

## 8. Prima esecuzione

Alla data di questo documento la raccolta contiene:

- **due foto `ARCHIVIO` per `SNZ2.2`**, mandate da Francesco il 14/09/2026 con l'app `0.27.0`: portano `Progressivo` e `IdDispositivo`, e sono le prime su cui il controllo di continuità ha senso;
- **tre foto del collaudo del 10/09/2026** (una `AVANZAMENTO`, due `ARCHIVIO`), partite da una versione precedente: hanno `Progressivo` e `IdDispositivo` vuoti. Si scaricano come le altre — la colonna vuota riguarda il controllo di continuità, non la validità della foto.

Quindi alla prima esecuzione ci si aspetta **A = 4** nella vista `Archivio da scaricare` (due di SNZ2.2 più due del collaudo), salvo altre foto arrivate nel frattempo. Se il numero è diverso, capisci perché **prima** di cominciare a copiare.

### Da fare una volta sola, PRIMA della prima esecuzione

Il collaudo del 10/09 ha lasciato in raccolta una **ventina di file entrati senza colonne**, per il difetto dei campi numerici poi corretto lato flow. Avendo `Tipo` vuoto **non compaiono nella vista `Archivio da scaricare`**: non fanno sbagliare la quadratura, ma stanno lì e chiunque apra la raccolta trova file che sembrano persi.

**Decisione di Francesco del 14/09/2026: si cancellano.** Sono file di prova del collaudo, non foto di cantiere.

Procedura, da fare in raccolta e **non** dal runbook settimanale:

1. apri `FotoCantiere` **senza filtri** (non da una vista: le viste filtrano su `Tipo`, che in questi file è vuoto);
2. ordina per `Created` e isola i file del **10/09/2026** con `Tipo`, `Commessa` e `Operatore` **vuoti**;
3. **conta quanti sono e scrivilo** nel resoconto prima di cancellare: è l'unico numero che resterà di loro;
4. verifica che fra quelli non ci sia nulla del **14/09** — le due foto di SNZ2.2 hanno tutte le colonne compilate e **non vanno toccate**;
5. cancella. La raccolta tiene 3 versioni, quindi restano nel cestino del sito per il periodo di conservazione: se ci si accorge di un errore si recuperano da lì.

Fatto questo, la raccolta contiene solo file attribuiti, e «file senza colonne» torna a essere il sintomo di un difetto (§6) invece che il residuo di un collaudo.
