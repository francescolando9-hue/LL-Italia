# App LL Italia — Modulo «Foto cantiere»: specifica e requisiti a valle

> **Rev. 1 del 10/09/2026 ore 17:28.** Secondo modulo della PWA di gruppo, accanto a Bolle. Capture-only: raccoglie e invia foto, non legge nulla del contenuto. Nessun segreto qui: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.
>
> ⚠️ **Un punto resta aperto e non l'ho inventato:** la cartella di destinazione su `L:` dove il runbook del venerdì deposita le foto, per commessa. Va indicata da Francesco — vedi §6.

## 1. A cosa serve

Chi è in cantiere fotografa e manda in ufficio. Due usi diversi, che finora viaggiavano insieme su WhatsApp e si distinguevano solo dal contesto della conversazione:

| Categoria | Codice | A cosa serve |
|---|---|---|
| Avanzamento lavori — per capirci tra noi | `AVANZAMENTO` | Dire a che punto è una lavorazione. Si guarda, si commenta, non si archivia. |
| Da archiviare sul server | `ARCHIVIO` | Documentazione che deve finire nella cartella di commessa su `L:`. |

**La categoria si sceglie prima di scattare**, come il cantiere: non è un'etichetta messa dopo, perché decide **come l'immagine viene preparata** (§3).

## 2. Le schermate

Una sola schermata di lavoro, con la stessa impostazione di Bolle:

1. **Tipo di foto** (obbligatorio) — le due categorie sopra. Sotto, una riga che dice cosa comporta la scelta: *«Compressa per partire veloce anche con poca rete»* oppure *«Inviata a risoluzione originale: pesa di più e con poca rete parte più lentamente»*.
2. **Cantiere** (obbligatorio) — stessa anagrafica del modulo Bolle, che vive in `core/cantieri.js`: **un solo elenco per tutta l'app**, perché due elenchi separati potrebbero divergere e una commessa presente in un modulo e assente nell'altro è un dato sbagliato che arriva a destinazione senza far rumore.
3. **Scatta foto** / **Scegli dalla galleria** (multi-foto), con anteprime rimovibili. Ogni anteprima porta categoria e peso reale del file che partirà.
4. **Nota** (facoltativa, max 255 caratteri) — vale per tutte le foto di quell'invio. Si svuota dopo l'invio, perché la nota successiva è un'altra cosa.
5. **Invia** — resta disabilitato finché non c'è almeno una foto e un cantiere.
6. **Coda invii** con gli stati e i contatori del giorno, come in Bolle.

Se si cambia categoria quando ci sono già foto in attesa, l'app **avvisa** che quelle partono col tipo con cui sono state preparate, non con quello scelto adesso. Cambiare l'etichetta a posteriori sarebbe una bugia: il file è già stato compresso, o non lo è stato.

## 3. Preparazione delle immagini

| Categoria | Trattamento |
|---|---|
| `AVANZAMENTO` | JPEG, lato lungo 2500 px, qualità 0,85 — come le bolle. Leggera, parte anche con poca rete. |
| `ARCHIVIO` | **Risoluzione originale** (deciso il 10/09/2026). Se il file è già JPEG si spediscono **i byte originali, senza ricodificarli**: ricomprimere «a qualità massima» degraderebbe l'immagine senza alcun vantaggio. Se il telefono produce HEIC o PNG si converte in JPEG a piena risoluzione (qualità 0,95), perché il nome del file in raccolta è `.jpg` e byte HEIC dentro un `.jpg` sarebbero un file che non si apre. |

**Misure reali** (collaudo del 10/09/2026, foto 4032 × 3024):

| Caso | Sul telefono | Inviato | Corpo della richiesta |
|---|---|---|---|
| Avanzamento | 1,30 MB | 0,47 MB | 0,63 MB |
| Archivio | 1,30 MB | 1,30 MB (**byte identici**) | 1,74 MB |
| Archivio, caso peggiore | 11,95 MB | 11,95 MB | **15,93 MB** |

⚠️ **Il caso peggiore va provato sul flow vero prima di prometterlo in cantiere.** Il base64 dentro JSON aggiunge un terzo al peso: una foto da 12 MB diventa un corpo da 16 MB. In laboratorio, contro un endpoint finto in locale, l'invio è durato 2,7 secondi — un dato che **non dice nulla** su un telefono in cantiere con poca rete, né su cosa faccia il flow reale con un corpo di quella taglia. Se il flow rifiuta, l'app lo dice con un messaggio dedicato (`413` → «foto troppo grande per il flow») e **la foto resta in coda**, non si perde.

## 4. Contratto di invio

POST JSON al **proprio** flow — diverso da quello delle bolle — un file per richiesta, `api-version=2024-10-01` obbligatoria (l'app corregge il parametro da sola, lasciando intatta la firma `sig=`).

```
{ "token": "…",
  "tipo": "AVANZAMENTO",              // oppure ARCHIVIO
  "commessa": "MAR",                  // solo il codice
  "operatore": "Paolo Sanzarello",
  "nota": "Getto solaio piano 3 completato",   // può essere vuota
  "idClient": "f15f1935-…",           // GUID della foto, per la deduplica
  "dataScatto": "2026-09-10T17:28:04+02:00",   // ora reale del telefono
  "versioneApp": "0.19.0",
  "nomeFile": "…",                    // IGNORATO dal backend: lo compone il flow
  "contenutoBase64": "…" }
```

**Attenzione, il campo si chiama `dataScatto`** — non `dataInvio` come nelle bolle. Nelle bolle il nome del campo e quello della colonna divergono per un incidente storico; qui nascono uguali. **Non dare per scontata la simmetria fra i due contratti.**

## 5. Cosa serve costruire (in capo a Francesco)

Un flow e una raccolta **nuovi e dedicati**, non quelli delle bolle: così una modifica al flow delle foto non può rompere la catena delle bolle, già in esercizio e collaudata.

**Raccolta SharePoint** (nome da decidere, es. `FotoCantiere`), con queste colonne:

| Colonna | Tipo | Origine nel payload |
|---|---|---|
| `Tipo` | Riga di testo singola (o Scelta con i due valori) | `tipo` |
| `Commessa` | Riga di testo singola | `commessa` |
| `Operatore` | Riga di testo singola | `operatore` |
| `Nota` | Più righe di testo | `nota` |
| `DataScatto` | **Riga di testo singola** | `dataScatto`, verbatim |
| `IdClient` | Riga di testo singola, indicizzata | `idClient` |
| `VersioneApp` | Riga di testo singola — facoltativa | `versioneApp` |

`DataScatto` di tipo **testo** e non *Data e ora*: è la stessa decisione presa per le bolle il 03/09, dopo che SharePoint archiviava un valore sfasato di 7 ore pur essendo corretti sia il fuso del sito sia quello del profilo. Togliere a SharePoint la possibilità di interpretare il dato è l'unico rimedio che ha tenuto.

**Flow**, con la stessa struttura di quello delle bolle (dettaglio in `docs/AppBolleFlowRicezione….md`, che vale come modello):

- controllo del token, con `Response 401` e Terminate nel ramo del token errato;
- `Create file` in cartelle `AAAA/AAAAMM` calcolate su `dataScatto`, **non** sull'orologio del flow;
- `Update file properties` con le colonne sopra;
- `Response 200` finale, **con l'header `Access-Control-Allow-Origin: *` su tutte le Response**: senza, il file arriva ma il browser non lascia leggere la risposta all'app, che segna Errore e ritenta all'infinito;
- **ogni via d'uscita deve avere una Response.** Un ramo che esce senza rispondere fa arrivare all'app un `502`, che significa esattamente «il flow è terminato senza rispondere».

Nome file suggerito, coerente con la nomenclatura di gruppo: `Foto[Commessa][Tipo][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg`.

## 6. Il runbook del venerdì — punto aperto

Una volta a settimana, il venerdì, le foto di categoria `ARCHIVIO` vanno scaricate dalla raccolta e depositate **nella cartella di commessa su `L:`**.

**Manca il dato e non lo invento:** quale cartella, per ciascuna commessa. Serve il percorso esatto (probabilmente sotto la cartella d'ambito della commessa, ma va confermato) e la regola per le sottocartelle — per data, per mese, per lavorazione.

Da decidere insieme al percorso, perché cambia il runbook:

1. **Cosa si scarica:** solo `ARCHIVIO`, o anche `AVANZAMENTO`? L'uso descritto dice solo Archivio: le foto di avanzamento servono a capirsi sul momento e non hanno valore documentale.
2. **Come si marca il lavorato.** È lo stesso problema già affrontato per le bolle: senza uno stato in raccolta, il venerdì successivo il runbook o riscarica tutto o rischia di saltare qualcosa. Coerente con la scelta fatta per le bolle, la strada è una colonna `Stato` che il runbook aggiorna, non lo spostamento dei file.
3. **Cosa fa con `Nota` e `Operatore`**: finiscono nel nome del file, in un file di testo accanto, o si perdono? Se la nota ha valore, va deciso adesso.
4. **Collaudo sui numeri**, mai sull'esito formale: foto di categoria Archivio presenti in raccolta contro file depositati su `L:`. Ogni scarto è un difetto da spiegare.

## 7. Scelte di costruzione, e perché

- **Database separato** (`llitalia-foto`) da quello delle bolle: i due moduli non si toccano, e un problema su uno non ferma l'altro.
- **Coda più semplice di quella delle bolle**, di proposito: niente storico permanente, niente miniature conservate, **niente progressivo**. Il progressivo esiste per le bolle perché una bolla di consegna persa è un documento perso, e il controllo di continuità serve a scoprirlo; una foto di cantiere non arrivata si riscatta. Se in esercizio servisse anche qui, si aggiunge con lo stesso schema.
- **Conserva ultime N = 10** per default, contro le 20 delle bolle: le foto d'archivio non sono compresse e pesano.
- **Codice condiviso nella shell:** anagrafica cantieri (`core/cantieri.js`), normalizzazione dell'endpoint (`core/endpoint.js`), versione dell'app (`core/versione.js`). Spostati lì proprio in occasione di questo modulo: erano dentro Bolle, e copiarli avrebbe creato due verità destinate a divergere.
- **Compressione e anteprime duplicate** invece che condivise: il codice immagini di Bolle contiene anche il controllo di leggibilità, che è specifico delle bolle (misura se un testo è leggibile). Estrarlo avrebbe voluto dire rimaneggiare un file del modulo in produzione. Cinquanta righe duplicate sono un prezzo accettabile; da riunire quando entrambi i moduli saranno stabili.
- **Nessun controllo di leggibilità** in questo modulo: una foto di cantiere non è un foglio da leggere, e un avviso che scatta a caso viene ignorato sempre.
