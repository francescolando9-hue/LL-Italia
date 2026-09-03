# App Bolle — Controllo di leggibilità: metodo e taratura

> Perché esiste: una bolla mossa o al buio si scopre in ufficio la sera, quando il foglio non c'è più e il camion è partito. Quella bolla è persa. Misurarla in cantiere costa cinque secondi.

## Cosa misura (e cosa no)

Il modulo resta **capture-only**: non legge il contenuto della bolla. Su un ridotto a 640 px calcola due grandezze:

- **Nitidezza** — varianza del laplaciano, cioè quanto contrasto locale c'è nell'immagine. Alta dove i bordi sono netti (testo a fuoco), bassa su una foto mossa, dove ogni bordo è spalmato sui pixel vicini.
- **Pixel bruciati** — quota di pixel oltre 250 di luminanza, dove il testo è irrecuperabile. Serve per riflessi e controluce. **Non** si usa la luminosità media: la carta bianca è legittimamente chiara, e una soglia sulla media allarmerebbe su ogni bolla buona.

La luminosità media si usa solo per il caso opposto, la foto troppo scura.

Il ridotto a lato fisso serve a rendere la misura confrontabile tra fotocamere diverse: senza normalizzare la scala, un telefono da 108 Mpx e uno da 8 darebbero numeri non paragonabili.

## Valori misurati (03/09/2026)

Bolla di prova con intestazione, sei righe di articoli e grana fotografica, sfocata con raggio crescente:

| Immagine | Nitidezza | Luminosità | Bruciati | Esito |
|---|---|---|---|---|
| nitida | 4061 | 240 | 0 | ok |
| sfocatura raggio 2 (ancora leggibile) | 355 | 240 | 0 | ok |
| sfocatura raggio 5 | 8 | 240 | 0 | **scarsa** — sfocata o mossa |
| sfocatura raggio 9 | 1 | 240 | 0 | **scarsa** — sfocata o mossa |
| luminosità 0,18 (cabina buia) | 130 | 42 | 0 | **scarsa** — troppo scura |
| luminosità 1,9 (sole diretto) | 2794 | 252 | 0,978 | **scarsa** — riflesso o controluce |
| due bolle reali di collaudo | 1045 / 876 | 234 / 232 | 0 | ok |

## Soglie adottate

```
nitidezza < 50    → scarsa (sfocata o mossa)
nitidezza < 200   → dubbia (registrata, nessun avviso a video)
luminosità < 60   → scarsa (troppo scura)
bruciati > 0,25   → scarsa (riflesso o controluce)
```

**Criterio di taratura: non allarmare sulle foto buone.** Un avviso che scatta sempre viene ignorato sempre, e a quel punto non protegge più niente. Per questo la sfocatura leggera (raggio 2, testo ancora leggibile) passa come buona: si preferisce lasciar passare una foto mediocre che infastidire l'operatore su una foto valida.

## Comportamento

**Avvisa, non blocca.** L'avviso compare sopra le anteprime e la foto segnalata porta una fascia arancione col motivo. L'operatore può rifarla o inviarla comunque: la regola che nessuna bolla si perda prevale sul controllo di qualità. Se l'analisi non è eseguibile sul dispositivo, l'esito è `ok` e l'invio procede.

Le foto giudicate `dubbia` non generano avvisi ma l'esito resta registrato sul record locale, utile se in futuro si volesse capire quanto spesso si lavora al limite.
