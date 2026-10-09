# Ritorno a Cowork — app LL Italia 0.38.1: anagrafica al master 202610092114

> 10/10/2026 ore 01:47 · dalla sessione Claude Code del repository dell'app, per il progetto **FotoCantiere** (e per conoscenza AutomazioneMagazzinoCantiere). Questo file è un messaggio, non una fonte: prima di lavorare rileggi i documenti indicati al punto 5. Il repository è pubblico: qui non ci sono percorsi del server né dati veri.

## 1. Le scelte fatte

- **Confronto prima di scrivere.** Il JSON consegnato è stato confrontato campo per campo con la copia della 0.38.0. Le differenze sono **esattamente le tre attese**: la versione, il campo `scale` di MAR, la commessa TN1. MNG, SNZ2.2, SNU, BRU, `livelliPerFase` e `prospettiStandard` sono identici.
- **Impronta.** Forma canonica di 6886 byte, SHA-256 `3829c27bb9959f592815583a7173706674cd4f4535de66ff15d8391a0ebdd7fa`, uguale a quella dichiarata. Calcolata in Python e in JavaScript sul JSON, e di nuovo sul blocco rigenerato.
- **Rigenerazione per intero, da script.** Il blocco `ANAGRAFICA` di `core/anagrafica.js` non è stato scritto a mano: uno script lo ha prodotto dal JSON, nello stesso stile di prima. Il diff è di 40 righe aggiunte e una cambiata (la versione), quindi le parti invariate sono uscite identiche carattere per carattere.
- **Controlli di struttura**, tutti superati:
  - MAR: tre scale da 5, 6 e 4 alloggi; ogni alloggio in una scala sola; nessuna scala coincide con un piano; Tetto fuori dalle scale; `piani` e `unita` per piano invariati.
  - TN1: palazzine 4–7 da 16 alloggi; P-1 in nessuna scala (autorimessa comune); Tetto una volta sola in `piani`; 64 alloggi, nessuno sul Tetto; prospetti vuoti.
  - Controllo di riservatezza sul JSON: nessun ritrovamento.
- **Una correzione al collaudo, trovata guastandolo.** Con l'anagrafica vecchia il collaudo 15 si interrompeva («ESPLOSO») invece di dire cosa mancava. Il conto delle scale ora regge una commessa assente, e con l'anagrafica vecchia i rossi sono 10, ognuno col suo motivo.

## 2. Cosa si è deciso

- Versione **0.38.1**, insieme in `sw.js` e `core/versione.js`.
- Il campo `scale` e TN1 entrano solo come dato. La logica, i selettori e il payload non cambiano; `core/cantieri.js` e `core/fasi.js` non cambiano.
- **TN1 è in anagrafica ma non nel menù**: il menù resta a sette commesse, e il collaudo 14 lo controlla.
- Il commento in testa a `core/anagrafica.js` spiega le scale e il caso TN1.

## 3. Cosa c'è da fare, in ordine

1. **Sul telefono**, quando la build di Pages è passata: la pagina Informazioni mostra la versione 0.38.1 e l'anagrafica `202610092114`; i menù del cantiere hanno ancora sette commesse, senza TN1.
2. **Chiudere la consegna nel master dell'anagrafica**: l'app ha la versione `202610092114` con l'impronta `3829c27b…`, la stessa del master.
3. **Allineare la riga «Anagrafica di piani e unità» della skill** per TN1 (P-1 autorimessa comune, Tetto, scale), come già concordato.
4. **Estratto per Claude Code.** Il `CLAUDE.md` del repository porta ancora l'estratto della skill v2.7: per il passaggio di consegne dice «prompt da incollare», mentre la skill dalla v2.29 vuole questo file nel repository. Valutare se mandare l'estratto aggiornato, da scrivere in un commit dedicato. Questo ritorno segue già la v2.29.
5. **Per quando TN1 entrerà nei menù** (lavoro a parte, dopo il livello palazzina):
   - il P-1 è il suo unico piano sotto quota, quindi TN1 · `Interrato` sarà una voce unica;
   - con i prospetti vuoti, `FinituraFacciata` su TN1 non chiederà il prospetto;
   - i quattro tetti delle palazzine si decidono col livello palazzina.

## 4. Cosa non si deve fare

- Non correggere a mano il blocco nel repository: si rigenera dal master, e un ritocco fa diventare rosso il collaudo 15.
- Non aggiungere TN1 a `core/cantieri.js` prima del livello palazzina.
- Non usare le scale nella logica senza una decisione: oggi sono solo dato.

## 5. Dove stanno i documenti

- `core/anagrafica.js`: il blocco e il commento in testa.
- `docs/AppFotoCantiereSpecifica….md`: rev. 21 in testa e blocco «Rilascio 0.38.1» al §5; §4.5 aggiornato (impronta, scale, TN1).
- `README.md`: paragrafo sull'anagrafica.
- `collaudi/LEGGIMI.md`: descrizione del collaudo 15.
- Indice dei documenti: `docs/INDICE.md`.

## 6. Come si collauda

- **Collaudi automatici: 22, con 508 controlli, tutti verdi** (498 prima, 10 nuovi nel collaudo 15).
- Il collaudo 15 confronta versione e impronta del master e conta scale e TN1. Visto fallire con ogni guasto rimesso apposta:

  | Guasto | Rossi |
  |---|---|
  | anagrafica della 0.38.0 | 10, ognuno col suo motivo |
  | un alloggio di TN1 ritoccato a mano | 2 |
  | scale di MAR copiate dai piani | 3 |
  | TN1 aggiunto al menù | 2 nel collaudo 14, 1 nel 15 |
  | un secondo Tetto in TN1 | 2 |

- Su GitHub la regola «ProtezioneRamoPrincipale» è attiva e richiede il controllo `riservatezza` per unire su `main` (riletta il 10/10). Il ramo di prova del controllo non c'è più.
