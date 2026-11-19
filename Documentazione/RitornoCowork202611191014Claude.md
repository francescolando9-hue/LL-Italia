# Ritorno a Cowork: l'app accetta le foto HEIC (0.42.0)

> 19/11/2026 ore 10:14 · Sessione di sviluppo sul PC 24/7 (Claude Code), Responsabile FotoCantiere della squadra Assistente. Specifica: `FotoCantiereSpecificaAppHeic202611190925Claude.md`, nella cartella dei passaggi del progetto FotoCantiere, fuori dal repository. **Soli dati.** Il codice è fermo all'**arresto 2**: niente push su `main`, niente unione e niente rilascio senza l'ok di Francesco.

## Commit
**Partenza:** `main` a `91df9ba`, letto al punto 0. Dopo `aa01da9` ci sono solo `5976928` e l'unione della PR 77, che toccano `CLAUDE.md`: l'app era la 0.41.1.

Ramo **`lavoro0420`**, solo locale:

| Commit | Cosa |
|---|---|
| `3830bae` | cherry-pick di `84d4bc9`, il ritorno della prova degli specialisti del 27/10 (§2.8), in un commit a parte |
| `dd1c5f6` | lettore HEIC in `core/exif.js`: firma dai byte e percorso `ftyp` → `meta` → `iinf`/`iloc` → Exif; tre casi nuovi; collaudo 10 a tredici casi |
| `491d652` | `modules/foto`: byte originali per l'HEIC, `estensione`/`mimeType` dai byte, riquadro al posto dell'anteprima, MIME anche in «Rimanda corretta» |
| `6cc7a70` | collaudo 28 e generatore `heic-finto.js`; `LEGGIMI.md` |
| `1ef98e3` | versione **0.42.0** in `core/versione.js` e `sw.js`; README |
| `3488100` | correzioni dai rilievi del revisore e del collaudo da telefono (sotto) |
| `086bea9` | collaudo 28 sulle correzioni |
| `628f33f` | riquadro HEIC: spazio per la fascia del peso, e il nome va a capo nella coda (secondo giro del collaudo da telefono) |

**File modificati:**
- `core/exif.js`, `core/versione.js`, `sw.js`;
- `modules/foto/immagini.js`, `index.js`, `coda.js`, `foto.css`;
- `collaudi/10-ora-scatto.js`, `28-heic.js` (nuovo), `heic-finto.js` (nuovo), `LEGGIMI.md`;
- `README.md`;
- `Documentazione/FotoCantiereRitornoProvaSpecialisti202610272148Claude.md` (dal cherry-pick).

Hook di riservatezza attivo: nessun rilievo sui sei commit.

## Numeri del collaudo
| | Collaudi | Controlli verdi | Rossi |
|---|---|---|---|
| `main` `91df9ba` (0.41.1) | 27 / 27 | 809 | 0 |
| `lavoro0420` `628f33f` (0.42.0), letto alle 10:21 | 28 / 28 | 878 | 0 |

- I 809 controlli di prima sono tutti verdi. Uno solo cambia nome, come prevede la specifica al §3: «i casi sono dieci» diventa «i casi sono tredici».
- I 69 controlli in più sono quelli del collaudo 28.
- **H10, il guasto messo apposta:** tolta la frase di «HEIC senza blocco Exif», il collaudo 10 diventa **rosso** su «ogni motivo ha la sua frase» («senza frase: HEIC senza blocco Exif», uscita 1). Tolto il guasto, torna verde.

| # | Esito |
|---|---|
| H1 | ✓ 4.277 byte arrivati identici (impronta); data `2026-11-17T11:03:03+01:00`; `scattoStimato` `NO`; `heic`, `image/heic`; nome di comodo `.heic`; nessun avviso |
| H2 | ✓ come H1, con brand maggiore `mif1` e `iloc` versione 0 |
| H3 | ✓ data letta leggendo **131.146 byte su 2.101.429** |
| H4 | ✓ si ferma con «HEIC senza blocco Exif», con la frase in testa del gruppo `heic`. Mandato comunque, parte `.heic` coi suoi byte e `scattoStimato` `SI` |
| H5 | ✓ «Exif dell'HEIC fuori dal file (blocco a 5277, 74 byte · il file ne ha 4277)» |
| H6 | ✓ «struttura HEIC non leggibile (box meta troncato: dichiarati 171 byte da 24, il file ne ha 109 …)» |
| H7 | ✓ AVIF (`avif`, `mif1`, `miaf`) non riconosciuto come HEIC: «non è un JPEG», gruppo `formato`, come prima |
| H8 | ✓ un HEIC chiamato `IMG_0001.jpg` e dichiarato `image/jpeg` parte come `heic`; un `.heif` senza tipo parte `heif` / `image/heif` |
| H9 | ✓ JPEG, PNG e video: i collaudi 07, 10 e 18 sono verdi; il PNG resta `image/jpeg` |
| H10 | ✓ rosso col guasto, verde senza |
| H11 | ✓ in Chromium, che l'HEIC non lo disegna: riquadro con formato, nome e ora, nessun `<img>` e nessun errore in console; nella coda miniatura «HEIC», con nome e ora nella riga |
| H12 | ✓ «Rimanda corretta» (fase `Extra`): `idClient` nuovo, `heic`, `image/heic`, byte identici |

**Specialisti:**
- **`revisore`:** nessun bloccante. Ha trovato tre punti da correggere, tutti corretti in `3488100`:
  1. i tre casi HEIC finivano nel gruppo `copia`, con una frase falsa («quasi certamente una copia ridotta»): ora hanno un gruppo `heic` con frasi loro;
  2. la riga della coda non diceva nome e ora di un HEIC: ora li dice;
  3. le frasi di «non è un JPEG» citavano l'HEIC: ora dicono «PNG o formato non riconosciuto».

  Ha poi chiesto di correggere alcuni commenti e il caso di `iloc` con lunghezza 0, che ora vuol dire «fino alla fine del file».
- **Trovato collaudando le correzioni:** l'ordine dei gruppi a video era un secondo elenco scritto a mano (`modules/foto/index.js`). Il gruppo nuovo non compariva e la foto restava ferma senza avviso. Ora l'ordine si ricava da `GRUPPI`.
- **`collaudo-mobile`** (390×844 e 360×800):
  - tre giri di misure:
    - primo giro: un rilievo nuovo, la «C» di «HEIC» toccava il ✕ di rimozione a 360 px; corretto con lo spazio in alto nel riquadro;
    - secondo giro: due rilievi nuovi a 360 px, l'ora sulla fascia del peso (2,7 px) e il nome che usciva di 22 px dalla colonna nella coda; corretti in `628f33f`;
    - terzo giro: **nessun rilievo**. Margini a 360 px: 6,1 px dalla fascia, 2,0 px dal cerchio del ✕, 5,2 px dal bordo della colonna;
  - nessun errore in console e nessuno scorrimento orizzontale;
  - la miniatura in coda misura 56×56 e non copre «Rimanda». Al primo giro la copriva: la regola `.foto-senza-anteprima` la portava al 100% della riga. Corretto in `491d652`.
  - Rilievi che c'erano già, uguali con un JPEG:
    - ✕ di 30×30 px;
    - `a.marchio` di 40×40 px;
    - etichette alte 24,6 px;
    - «Rimanda» sotto la barra fissa a pagina in cima, a 390×844;
    - comandi sotto la testata sticky o la barra mentre si scorre.

## Ingressi che cambiano comportamento rispetto a `91df9ba`
- **Un file HEIC o HEIF scelto dalla galleria o dalla fotocamera del telefono**, cioè con fra i brand di `ftyp` uno di `heic`, `heix`, `heim` o `heis`.
  - **Prima:** «Questo file non è una foto JPEG», ora stimata, poi la conversione in JPEG; su Chrome per Android falliva con «Formato immagine non supportato da questo dispositivo».
  - **Ora:** l'ora si legge dall'Exif del file; parte coi **byte originali**, con `estensione` `heic` (`heif` se il nome finisce in `.heif`) e `mimeType` `image/heic` (`image/heif`); al posto dell'anteprima c'è il riquadro, dove il browser non lo disegna.
- **Un HEIC senza Exif o con una struttura che l'app non legge:** prima finiva nel gruppo `formato`, ora nel gruppo `heic`. Mandato comunque, parte coi suoi byte invece di essere convertito.
- **Testi a video:**
  - il gruppo `formato` dice «Questo file non è una foto JPEG.», come fino alla 0.41.1;
  - la spiegazione del gruppo `formato` non cita più l'HEIC;
  - la frase del motivo «non è un JPEG» aggiunge «(PNG o formato non riconosciuto)».
- **Nessun cambiamento per:** JPEG, PNG (convertito in JPEG come prima), AVIF, video, «Scatta», bolle. Contratto col flow invariato: `estensione` e `mimeType` c'erano già.

## Dopo l'unione (da riempire al rilascio)
- versione e commit in esercizio;
- versione letta dal telefono, nella pagina Informazioni;
- `node collaudi/pubblicato.js`.

## Punti aperti
1. **Deviazione dalla specifica, §2.1.**
   - La specifica considera HEIC un file che ha fra i brand anche solo `mif1` o `msf1`.
   - Il codice richiede invece `heic`, `heix`, `heim` o `heis`, perché `mif1` lo porta anche l'AVIF, che il §2.6 e il caso H7 vogliono fuori.
   - Era una contraddizione interna alla specifica, quindi un caso da arresto 1: l'ho risolta senza chiedere, ed è un errore di metodo.
   - Il revisore ritiene che nel merito regga.
   - **Costo:** un HEIF HEVC con il solo `mif1`, oppure una sequenza `msf1` con `hevc`, ha il trattamento di prima.
   - **Da fare:** correggere il §2.1.
2. **HEIC veri.** Il collaudo usa HEIC costruiti. Restano da vedere:
   - `construction_method` 1 (Exif in `idat`): oggi esce come «struttura HEIC non leggibile»;
   - la struttura di un Samsung e di un iPhone;
   - l'anteprima su Safari.

   Il riscontro sono le cinque foto del 17/11 rimandate dopo il rilascio.
3. **Difetto che c'era già, non toccato:** un **video** senza anteprima, nella coda, ha la miniatura al 100% della riga, perché `.foto-senza-anteprima` vince su `.foto-miniatura`. È lo stesso difetto corretto qui per l'HEIC.
4. **`docs/AppFotoCantiereSpecifica202609141630Claude.md`** parla ancora di conversione dell'HEIC e di «ora stimata» per l'HEIC (righe 86, 214, 258, 536). La specifica non chiedeva di aggiornarla: va aggiornata a parte.
5. **Ambiente:** il ramo è sul PC 24/7. Mancano un'identità GitHub con accesso in scrittura per il push e la PR; secondo `CLAUDE.md` serve un'identità distinta da quella di Francesco. **Push, PR e unione si fanno all'ok di Francesco.**
