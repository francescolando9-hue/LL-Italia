# libheif (decodificatore HEIC)

Usato da `core/heic.js` per trasformare un HEIC in pixel sul telefono, nei moduli Bolle e Segnalazioni (dalla 0.45.0). Non è codice dell'app: si sostituisce in blocco, non si ritocca.

- **Pacchetto:** `libheif-js` **1.23.5** (npm, `registry.npmjs.org`), distribuzione Emscripten di libheif per browser e Node. Tarball scaricato il 24/11/2026, SHA-256 `d0bfe7198bd624c524cef8ccf78e15ceb42683c87598c64c2e13ced0d8680932`.
- **File servito:** `libheif-bundle.mjs` (modulo ES, WebAssembly incorporato; nessun indirizzo di rete dentro), preso da `libheif-wasm/libheif-bundle.mjs` del pacchetto, 2.043.959 byte, SHA-256 `095194187be00d3e36335b8ad7f5552d70655e5e2159486d7d36cd4daa47bba9`. Il collaudo 30 ricalcola l'impronta.
- **Licenza:** LGPL-3.0 per libheif (`LICENSE-libheif-LGPL-3.0.txt`); il resto del pacchetto è descritto in `LICENSE-libheif-js.txt`. Il file è servito **non modificato**, come libreria a sé caricata a richiesta, quindi sostituibile da chi voglia usarne un'altra versione.
- **Perché questa:** decodifica HEIC/HEIF (HEVC compreso) in WebAssembly, versione fissata, nessuna rete esterna a runtime, ~2 MB contro i 2,7 MB di `heic2any` (che include una libheif più vecchia). Si carica con `import()` solo alla prima foto HEIC che il browser non disegna da sé.
- **Aggiornarla:** nuova versione = nuovo pacchetto letto, file sostituito, impronta qui e nel collaudo 30, nome della cache in `sw.js` (`libreria-heic-<versione>`).
