# App LL Italia — Runbook del venerdì: foto d'archivio da SharePoint a `L:`

> **Rev. 1 del 14/09/2026 ore 09:22.** Procedura ricorrente per portare le foto di categoria **Archivio** dalla raccolta `FotoCantiere` alle cartelle di commessa sul server. Da eseguire in **Cowork**, il venerdì sera, insieme al controllo delle segnalazioni.
>
> Non è un documento di programmazione: l'app non c'entra, qui si lavora a valle della raccolta. Nessun segreto — token e URL firmati vivono nel flow e sui dispositivi, non qui.
>
> ⚠️ **Manca un dato e non lo invento: la radice delle cartelle di commessa su `L:`.** Tutto il resto è deciso. Vedi §3: è una riga da completare, poi il runbook è eseguibile.

## 1. Cosa fa, in una frase

Ogni venerdì prende le foto **Archivio** arrivate dai telefoni durante la settimana, le deposita nella cartella d'ambito **12 Foto** della commessa a cui si riferiscono, e segna in raccolta che sono state scaricate — così il venerdì dopo non le riprende.

**Cosa NON fa**, per scelta:

- **non cancella niente da SharePoint.** La raccolta resta la copia di riferimento: se un file su `L:` viene spostato o perso, si riscarica. Cancellare per fare spazio è una decisione separata, da prendere quando la raccolta sarà cresciuta;
- **non tocca le foto di Avanzamento.** Servono a capirsi sul momento e non hanno valore documentale: restano in raccolta, consultabili dalla vista `Avanzamento`;
- **non rinomina i file.** Il nome lo compone il flow (`Foto[Commessa][Tipo][AAAAMMGGHHMM][Operatore].jpg`) ed è già nella nomenclatura di gruppo. Rinominare su `L:` romperebbe la corrispondenza con la raccolta, che è quello che rende possibile la quadratura.

## 2. Prerequisiti, una volta sola

1. **Le cartelle di commessa collegate in Cowork**, selezionate dal selettore entrando da **Questo PC → `lc (L:)`**. Mai incollare percorsi a mano, mai l'UNC `\\DCMLP19\…`, e **mai collegare l'intera `L:`**: solo le cartelle `12 Foto` delle commesse attive.
2. **Accesso alla raccolta `FotoCantiere`** sul sito Cantieri LL.
3. La vista **`Archivio da scaricare`** esiste già in raccolta ed è la coda di lavoro di questo runbook: mostra le foto con `Tipo = ARCHIVIO` e `DataScarico` vuota, ad ambito ricorsivo (quindi vede anche le sottocartelle `AAAA/AAAAMM` create dal flow).

## 3. Dove vanno i file — da completare

Destinazione, per ogni foto:

```
<RADICE_COMMESSA>\<Commessa>\12 Foto\<AAAA>\<AAAAMM>\
```

e per i video, quando ce ne saranno:

```
<RADICE_COMMESSA>\<Commessa>\12 Foto\<AAAA>\<AAAAMM>\Video\
```

**`<AAAA>` e `<AAAAMM>` si calcolano su `DataScatto`, non sulla data di oggi.** Una foto scattata il 30 settembre e scaricata il 3 ottobre appartiene a settembre: se si usasse la data di scarico, le cartelle su `L:` non corrisponderebbero più a quelle in SharePoint e la quadratura del mese smetterebbe di funzionare.

⚠️ **`<RADICE_COMMESSA>` va indicata da Francesco.** La forma attesa è `L:\DOCUMENTI\` o equivalente; la cartella `12 Foto` è la cartella d'ambito 12 della tassonomia di gruppo, quindi quella non è in discussione. Fino a quando questa riga non è completata, **il runbook non si esegue**: depositare file in una cartella inventata è peggio che non depositarli.

| Codice commessa (quello che manda l'app) | Cartella su `L:` |
|---|---|
| `MAR` | `<RADICE_COMMESSA>\MAR\12 Foto\` — **da confermare** |
| `SNZ2.2` | `<RADICE_COMMESSA>\SNZ2.2\12 Foto\` — **da confermare** |
| `MNG` | `<RADICE_COMMESSA>\MNG\12 Foto\` — **da confermare** |

Sono le tre commesse che l'app può mandare oggi (`core/cantieri.js`). Se se ne aggiunge una nell'app, **va aggiunta anche qui**: una commessa senza riga in questa tabella fa fermare il runbook su quelle foto, che è il comportamento voluto — vedi §6.

## 4. La procedura

1. **Apri la vista `Archivio da scaricare`** e conta gli elementi. Annota il numero: è il primo dei tre numeri della quadratura.
2. **Per ogni elemento**, nell'ordine in cui la vista li presenta:
   1. leggi `Commessa`, `DataScatto`, `Genere` e il nome del file;
   2. individua la cartella di destinazione secondo §3, **creandola se non esiste**;
   3. **copia** il file (copia, non sposta: in SharePoint resta);
   4. **verifica che il file su `L:` abbia la stessa dimensione in byte** dell'originale. È il controllo che distingue una copia riuscita da una copia interrotta, e costa un istante;
   5. **solo dopo la verifica**, scrivi `DataScarico` con la data e ora di adesso, formato `AAAAMMGGHHMM` (testo, come `DataScatto`: il connettore SharePoint riscrive qualunque valore che somigli a una data, ed è già costato nove ore di scarto).
3. **Se un passaggio fallisce, non scrivere `DataScarico`.** Un elemento non marcato torna nella vista il venerdì dopo, ed è esattamente quello che deve succedere. Scrivere la data su una copia non riuscita è il modo di perdere una foto senza accorgersene.
4. **Alla fine, riapri la vista.** Deve essere vuota, o contenere solo gli elementi che hai deliberatamente lasciato indietro (§6), con l'elenco di quali e perché.

## 5. La quadratura — il collaudo, sui numeri

Tre numeri, che devono coincidere:

| | Numero |
|---|---|
| A | elementi nella vista `Archivio da scaricare` **prima** di cominciare |
| B | file **nuovi** depositati su `L:` in questa esecuzione |
| C | elementi che risultano marcati con `DataScarico` **dopo** |

**A = B = C.** Ogni scarto è un difetto da spiegare, non da arrotondare:

- **B < A**: qualche file non è sceso. Guarda quali elementi sono rimasti nella vista e perché;
- **C < B**: hai copiato file senza marcarli. Il venerdì dopo li riscarichi e ti ritrovi doppioni su `L:`: rimedia marcandoli adesso, dopo aver verificato che il file ci sia;
- **C > B**: hai marcato qualcosa che non è sceso. È il caso peggiore, perché quella foto non tornerà più nella vista: togli la `DataScarico` dagli elementi interessati.

Scrivi i tre numeri nel resoconto dell'esecuzione. Un runbook che dice «fatto» senza numeri non dimostra niente.

### Il controllo di continuità (consigliato, dalla prossima esecuzione)

Ogni foto porta `IdDispositivo` e `Progressivo`: la sequenza è **per dispositivo**, parte da 1 e non si azzera mai. Raggruppando la raccolta per `IdDispositivo` e ordinando per `Progressivo`, **un numero mancante significa una foto scattata e mai arrivata**. È lo stesso controllo che sulle bolle dice «zero buchi» ogni sera.

Due avvertenze, altrimenti il controllo dà falsi allarmi:

- **non raggruppare mai per `Operatore`**: è testo libero, si spezza a ogni grafia diversa del nome e fonde due telefoni della stessa persona;
- **la sequenza delle foto è indipendente da quella delle bolle**: sono due raccolte, ognuna si controlla per conto suo. Non confrontarle.

**Le foto arrivate prima del 12/09/2026 hanno `Progressivo` e `IdDispositivo` vuoti**: sono partite da una versione dell'app che non li mandava ancora. Non sono un buco: la sequenza parte dalla prima foto che porta il numero 1.

## 6. I casi che si presentano, e cosa fare

| Caso | Cosa fare |
|---|---|
| **Commessa non in tabella** (§3) | **Fermati su quella foto**: non scaricarla, non marcarla, segnalala nel resoconto. Depositarla «da qualche parte» significa perderla in un posto plausibile. |
| **File già presente su `L:` con lo stesso nome** | Confronta le dimensioni. Identiche: è già stato scaricato, marca `DataScarico` e prosegui. Diverse: **non sovrascrivere**, segnala nel resoconto — due file diversi con lo stesso nome sono un dato da capire, non da risolvere in automatico. |
| **Foto in raccolta senza colonne compilate** | Il file c'è ma non si sa di chi è: non scaricarla e segnalala. È il sintomo di un invio andato a metà (successo il 10/09 con i campi numerici mandati come stringa vuota, poi corretto lato flow). |
| **Un video fra le foto** | Va nella sottocartella `Video` (§3). Conta nella quadratura come gli altri. |
| **La vista è vuota** | Nessuna foto d'archivio questa settimana. Scrivilo nel resoconto: «0 elementi» è un esito, non un'esecuzione saltata. |

## 7. Punti aperti — da decidere, non da presumere

1. **`Nota` e `Operatore` non arrivano su `L:`.** Il file porta l'operatore nel nome, ma la nota — che l'operatore scrive apposta — resta solo in SharePoint. **Proposta:** un file `Indice.txt` in ogni cartella `AAAAMM`, con una riga per foto (nome file, operatore, data di scatto, nota), aggiunto in coda a ogni esecuzione. Costa poco e rende la cartella leggibile da sola. Da confermare prima di metterlo nel runbook.
2. **Quando si potano le foto dalla raccolta.** Oggi non si cancella niente. Quando lo spazio diventerà un problema, la regola dovrà essere esplicita (per esempio: si cancellano le foto con `DataScarico` più vecchia di N mesi, mai quelle senza). Non urgente, ma non improvvisabile.
3. **Le foto di Avanzamento** restano in raccolta per sempre, e nessuno le pota. Vale lo stesso ragionamento del punto 2.

## 8. Prima esecuzione

Alla data di questo documento la raccolta contiene:

- **due foto `ARCHIVIO` per `SNZ2.2`**, mandate da Francesco il 14/09/2026 con l'app `0.27.0`: portano `Progressivo` e `IdDispositivo`, e sono le prime su cui il controllo di continuità ha senso;
- **tre foto del collaudo del 10/09/2026** (una `AVANZAMENTO`, due `ARCHIVIO`), partite da una versione precedente: hanno `Progressivo` e `IdDispositivo` vuoti. Si scaricano come le altre — la colonna vuota riguarda il controllo di continuità, non la validità della foto.

Quindi alla prima esecuzione ci si aspetta **A = 4** nella vista `Archivio da scaricare` (due di SNZ2.2 più due del collaudo), salvo altre foto arrivate nel frattempo. Se il numero è diverso, capisci perché **prima** di cominciare a copiare.

⚠️ **Attenzione a una cosa che la vista NON mostra.** Il collaudo del 10/09 ha lasciato in raccolta una ventina di file **entrati senza colonne**, per il difetto dei campi numerici poi corretto lato flow. Avendo `Tipo` vuoto **non compaiono nella vista `Archivio da scaricare`**: non fanno sbagliare la quadratura, ma stanno lì e nessuno sa di chi sono.

Vanno guardati **prima** della prima esecuzione, aprendo la raccolta senza filtri, e decisi una volta sola: se sono file di prova si cancellano, altrimenti si compilano a mano le colonne e rientrano nel giro normale. Finché restano lì, chiunque apra la raccolta trova file che sembrano persi.
