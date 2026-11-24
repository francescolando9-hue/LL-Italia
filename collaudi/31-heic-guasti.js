// HEIC in Bolle e Segnalazioni: i guasti della decodifica (0.45.0, revisione della PR 82).
//
// Il collaudo 30 prova che l'HEIC si decodifica e che i casi dicono la loro frase.
// Questo prova i tre difetti che la revisione automatica della PR 82 ha trovato
// nel modo in cui `core/heic.js` e `modules/bolle/immagini.js` usano libheif, più
// i tre rilievi facoltativi. Ognuno si vede ROSSO sul codice di `846fe9b` e verde
// dopo la correzione:
//
//  1. Un errore della decodifica dei pixel che libheif non porta al chiamante
//     (la sua `display` lavora in un `setTimeout` senza `try`) lasciava Bolle ferma
//     su «Elaborazione di N foto…» e Segnalazioni senza messaggio, e le foto
//     seguenti non partivano. Ora arriva come errore «decodifica».
//  2. Ogni decodifica lasciava vivo il contesto di libheif nella memoria
//     WebAssembly (si libera solo alla decodifica successiva dello stesso
//     decodificatore): si contano le `heif_context_alloc` e le `heif_context_free`.
//  3. Con più HEIC scelti insieme in Bolle le tele a piena risoluzione restavano
//     vive fino alla fine del gruppo: ora una foto alla volta.
//  Facoltativi: memoria che manca per il canvas → «troppo grande» (non «TypeError»);
//  libreria scaricata ma che non parte → motivo suo, non «riprova con la rete».
//
// Come si provoca un guasto vero senza un HEIC che lo provochi: il bundle di libheif
// si serve con una riga in più che lo espone alla prova (`globalThis.__libheif`), e
// la prova ne sostituisce i punti dove il guasto nasce (la decodifica dei pixel, la
// lettura del file). Il codice dell'app non è toccato: passa dalle stesse funzioni
// di libheif che userebbe con un HEIC vero. Con `COLLAUDO_HEIC_VERO` si prova anche
// il rilascio dei contesti su decodifiche vere.
const fs = require('fs');
const path = require('path');
const { nuovoTelefono, configura } = require('./aiuto');
const { heicFinto } = require('./heic-finto');

const BUNDLE = path.join(__dirname, '..', 'core', 'vendor', 'libheif', 'libheif-bundle.mjs');
const L = 2800; // più larga del lato massimo della bolla (2500): la tela decodificata si riconosce dalla misura
const A = 1000;

// Il bundle di libheif, con una riga in più che lo espone alla prova.
function bundleEsposto() {
  const testo = fs.readFileSync(BUNDLE, 'utf8');
  if (!testo.includes('e.HeifImage=X,')) throw new Error('il bundle di libheif è cambiato: aggiornare il collaudo 31');
  return testo.replace('e.HeifImage=X,', 'e.HeifImage=X,globalThis.__libheif=e,');
}

async function telefono(browser, app, flow, corpoBundle) {
  const t = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome', serviceWorkers: 'block' });
  await t.contesto.route('**/libheif-bundle.mjs*', r => r.fulfill({
    status: 200, contentType: 'text/javascript', body: corpoBundle,
  }));
  await configura(t.pagina, app.indirizzo, {
    bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
  });
  await t.pagina.evaluate(ep => {
    localStorage.setItem('llitalia.segnalazioni', JSON.stringify(ep));
    localStorage.setItem('llitalia.app', JSON.stringify({ autore: 'Paolo Sanzarello' }));
  }, {
    endpoint: flow.endpoint('segnalazioni-ricevitore'), endpointElenco: flow.endpoint('segnalazioni-elenco'), token: 'PROVA',
  });
  return t;
}

// Carica libheif (con una decodifica che fallisce da sé) e poi ne sostituisce i
// punti di guasto. `cattivi`: pezzi di testo che, se compaiono nel file, rendono
// la decodifica dei suoi pixel un errore.
async function armaLibreria(pagina, { cattivi = [] } = {}) {
  await pagina.evaluate(async () => {
    const h = await import('./core/heic.js');
    try { await h.decodificaHeic(new File([new Uint8Array(16)], 'x.heic')); } catch { /* serve solo a caricare libheif */ }
  });
  await pagina.evaluate(({ L, A, cattivi }) => {
    const lib = globalThis.__libheif;
    const s = globalThis.__prova = { alloc: 0, libera: 0, decodifiche: 0, vivePrima: [], tele: [] };
    const alloc = lib.heif_context_alloc;
    const libera = lib.heif_context_free;
    lib.heif_context_alloc = (...a) => { s.alloc += 1; return alloc.apply(lib, a); };
    lib.heif_context_free = (...a) => { s.libera += 1; return libera.apply(lib, a); };
    // Le tele create dall'app, per contare quali sono ancora vive.
    const crea = document.createElement.bind(document);
    document.createElement = (tag, ...r) => {
      const el = crea(tag, ...r);
      if (String(tag).toLowerCase() === 'canvas') s.tele.push(el);
      return el;
    };
    // Un HEIC «decodificabile»: un contesto vero, un'immagine di L×A.
    lib.HeifDecoder.prototype.decode = function (byte) {
      this.decoder = lib.heif_context_alloc();
      const testo = new TextDecoder('latin1').decode(byte);
      return [new lib.HeifImage({ cattivo: cattivi.some(c => testo.includes(c)) })];
    };
    lib.HeifImage.prototype.get_width = () => L;
    lib.HeifImage.prototype.get_height = () => A;
    lib.HeifImage.prototype.free = () => {};
    lib.heif_image_release = () => {};
    lib.heif_js_decode_image2 = async handle => {
      s.decodifiche += 1;
      s.vivePrima.push(s.tele.filter(c => c.width === L && c.height === A).length);
      if (handle && handle.cattivo) throw new RangeError('guasto di prova nella decodifica dei pixel');
      return {
        code: 0, image: 0,
        channels: [{ id: lib.heif_channel.heif_channel_interleaved, width: L, height: A, stride: L * 4, data: new Uint8Array(L * A * 4).fill(120) }],
      };
    };
  }, { L, A, cattivi });
}

// Vero se la condizione si avvera entro `limite` ms; falso se no (un rosso, non un'esplosione).
async function entro(pagina, funzione, limite, argomento) {
  try {
    await pagina.waitForFunction(funzione, argomento, { timeout: limite, polling: 250 });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  nome: 'HEIC: guasti della decodifica (errore asincrono, contesti liberati, tele una alla volta)',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const corpo = bundleEsposto();
    const file = (n, ora) => ({
      name: `20261124_09000${n}.heic`, mimeType: 'image/heic', buffer: heicFinto({ data: `2026:11:24 09:00:0${ora == null ? n : ora}` }),
    });

    // --- 1. Errore asincrono di libheif: arriva al chiamante ---------------------
    registro.titolo('1. Un errore dei pixel dentro libheif arriva come «decodifica», e le foto seguenti proseguono');
    const t1 = await telefono(browser, app, flow, corpo);
    await t1.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t1.pagina.waitForSelector('#cantiere');
    await armaLibreria(t1.pagina, { cattivi: ['2026:11:24 09:00:01'] });
    const diretto = await t1.pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      const f = new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])].concat([new TextEncoder().encode('2026:11:24 09:00:01')]), 'x.heic');
      const corsa = h.decodificaHeic(f).then(() => ({ esito: 'riuscita' }), e => ({ esito: 'errore', motivo: e.motivo, nome: e.name }));
      return Promise.race([corsa, new Promise(r => setTimeout(() => r({ esito: 'ferma' }), 8000))]);
    });
    registro.dice('decodifica diretta con guasto', diretto);
    registro.controlla('la funzione risponde con un errore di tipo «decodifica» (non resta ad aspettare)',
      diretto.esito === 'errore' && diretto.motivo === 'decodifica', JSON.stringify(diretto));
    const anteprimeBolle = await t1.pagina.$$eval('.bolle-anteprima', e => e.length);
    await t1.pagina.setInputFiles('#input-galleria', [file(1), file(2), file(3)]);
    const finito = await entro(t1.pagina, () => !/Elaborazione di/.test((document.querySelector('#avviso-foto') || {}).textContent || '')
      && document.querySelectorAll('.bolle-anteprima').length >= 2, 25000);
    const avvisoB = await t1.pagina.$eval('#avviso-foto', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso di Bolle', avvisoB);
    registro.controlla('Bolle non resta su «Elaborazione di N foto…»', finito && !/Elaborazione di/.test(avvisoB), avvisoB);
    registro.controlla('dice la frase «decodifica» per la foto guasta', avvisoB.includes('non si riesce ad aprire') && /\(decodifica/.test(avvisoB), avvisoB);
    registro.controlla('le due foto che seguono sono entrate fra le bozze',
      (await t1.pagina.$$eval('.bolle-anteprima', e => e.length)) === anteprimeBolle + 2, `${anteprimeBolle} prima`);

    await t1.pagina.goto(app.indirizzo + '/index.html#/segnalazioni/nuova');
    await t1.pagina.waitForSelector('#commessa');
    await t1.pagina.waitForSelector('#galleria', { state: 'attached' });
    await armaLibreria(t1.pagina, { cattivi: ['2026:11:24 09:00:01'] });
    await t1.pagina.setInputFiles('#galleria', [file(1), file(2), file(3)]);
    const finitaS = await entro(t1.pagina, () => document.querySelectorAll('#anteprime img').length >= 2
      && document.querySelector('#galleria').value === '', 25000);
    const avvisoS = await t1.pagina.$eval('#avviso-foto', e => ({ testo: e.textContent.replace(/\s+/g, ' ').trim(), nascosto: e.classList.contains('nascosto') }));
    registro.dice('avviso di Segnalazioni', avvisoS);
    registro.controlla('Segnalazioni dà il messaggio «decodifica»', !avvisoS.nascosto && avvisoS.testo.includes('non si riesce ad aprire'), avvisoS.testo);
    registro.controlla('le due foto che seguono hanno la loro anteprima e la scelta è chiusa (si può riscegliere lo stesso file)',
      finitaS && (await t1.pagina.$$('#anteprime img')).length === 2, `${(await t1.pagina.$$('#anteprime img')).length} anteprime`);
    t1.errori.length = 0;
    await t1.contesto.close();

    // --- 2. Il contesto di libheif si libera dopo ogni decodifica -----------------
    registro.titolo('2. Ogni decodifica libera il suo contesto di libheif (la memoria WebAssembly non cresce)');
    const t2 = await telefono(browser, app, flow, corpo);
    await t2.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t2.pagina.waitForSelector('#cantiere');
    await t2.pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      try { await h.decodificaHeic(new File([new Uint8Array(16)], 'x.heic')); } catch { /* carica libheif */ }
    });
    await t2.pagina.evaluate(() => {
      const lib = globalThis.__libheif;
      const s = globalThis.__conta = { alloc: 0, libera: 0 };
      const alloc = lib.heif_context_alloc;
      const libera = lib.heif_context_free;
      lib.heif_context_alloc = (...a) => { s.alloc += 1; return alloc.apply(lib, a); };
      lib.heif_context_free = (...a) => { s.libera += 1; return libera.apply(lib, a); };
    });
    const conta = await t2.pagina.evaluate(async buffer => {
      const h = await import('./core/heic.js');
      const esiti = [];
      for (let i = 0; i < 5; i++) {
        try { await h.decodificaHeic(new File([new Uint8Array(buffer)], `x${i}.heic`)); esiti.push('ok'); } catch (e) { esiti.push(e.motivo); }
      }
      return { esiti, ...globalThis.__conta };
    }, [...heicFinto()]);
    registro.dice('5 decodifiche di un file che libheif non sa leggere', conta);
    registro.controlla('i contesti creati sono tanti quanti quelli liberati (la strada d’errore compresa)',
      conta.alloc === 5 && conta.libera === conta.alloc, `creati ${conta.alloc} · liberati ${conta.libera}`);

    const vero = process.env.COLLAUDO_HEIC_VERO;
    if (!vero || !fs.existsSync(vero)) {
      registro.dice('non eseguito', 'COLLAUDO_HEIC_VERO non indica un file: la prova su decodifiche vere manca');
    } else {
      const byteVeri = [...fs.readFileSync(vero)];
      const misura = await t2.pagina.evaluate(async byte => {
        const h = await import('./core/heic.js');
        const lib = globalThis.__libheif;
        const dimensioni = () => (lib.HEAPU8 ? lib.HEAPU8.length : (lib.wasmMemory ? lib.wasmMemory.buffer.byteLength : -1));
        const un = async () => { const c = await h.decodificaHeic(new File([new Uint8Array(byte)], 'v.heic')); const l = c.width; c.width = 0; c.height = 0; return l; };
        await un(); // la prima decodifica porta la memoria al suo livello di lavoro
        const prima = dimensioni();
        const a0 = globalThis.__conta.alloc, f0 = globalThis.__conta.libera;
        const larghezze = [];
        for (let i = 0; i < 8; i++) larghezze.push(await un());
        return { prima, dopo: dimensioni(), alloc: globalThis.__conta.alloc - a0, libera: globalThis.__conta.libera - f0, larghezze };
      }, byteVeri);
      registro.dice('8 decodifiche dello stesso HEIC vero', misura);
      registro.controlla('HEIC vero: contesti creati = liberati', misura.alloc === 8 && misura.libera === 8, `${misura.alloc} / ${misura.libera}`);
      registro.controlla('HEIC vero: la memoria WebAssembly non cresce fra la prima e l’ultima decodifica',
        misura.prima > 0 && misura.dopo === misura.prima, `${misura.prima} → ${misura.dopo} byte`);
    }
    t2.errori.length = 0;
    await t2.contesto.close();

    // --- 3. Più HEIC insieme in Bolle: una tela alla volta -------------------------
    registro.titolo('3. Bolle: con quattro HEIC scelti insieme una sola tela a piena risoluzione è viva alla volta');
    const t3 = await telefono(browser, app, flow, corpo);
    await t3.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t3.pagina.waitForSelector('#cantiere');
    await armaLibreria(t3.pagina);
    await t3.pagina.setInputFiles('#input-galleria', [file(1, 1), file(2, 2), file(3, 3), file(4, 4)]);
    const fine3 = await entro(t3.pagina, () => document.querySelectorAll('.bolle-anteprima').length === 4
      && !/Elaborazione di/.test((document.querySelector('#avviso-foto') || {}).textContent || ''), 60000);
    const r3 = await t3.pagina.evaluate(({ L, A }) => ({
      decodifiche: globalThis.__prova.decodifiche,
      vivePrima: globalThis.__prova.vivePrima,
      alloc: globalThis.__prova.alloc, libera: globalThis.__prova.libera,
      tele: globalThis.__prova.tele.filter(c => c.width === L && c.height === A).length,
      anteprime: document.querySelectorAll('.bolle-anteprima').length,
    }), { L, A });
    registro.dice('misure', r3);
    registro.controlla('le quattro foto sono entrate in coda', fine3 && r3.anteprime === 4, `${r3.anteprime} anteprime`);
    const massimo = Math.max(0, ...r3.vivePrima);
    registro.controlla('a ogni decodifica c’è al più una tela a piena risoluzione viva (la sua)',
      r3.vivePrima.length > 0 && massimo === 1, `massimo ${massimo} su ${r3.vivePrima.length} decodifiche`,
      'con le tele tenute fino alla fine del gruppo il massimo cresce fino al numero di foto');
    const ancoraPiene = await t3.pagina.evaluate(({ L, A }) => globalThis.__prova.tele.filter(c => c.width === L && c.height === A).length, { L, A });
    registro.controlla('a gruppo finito nessuna tela a piena risoluzione è rimasta viva', ancoraPiene === 0, `${ancoraPiene} rimaste`);
    registro.controlla('i contesti di libheif sono tutti liberati', r3.alloc > 0 && r3.alloc === r3.libera, `${r3.alloc} / ${r3.libera}`);
    t3.errori.length = 0;
    await t3.contesto.close();

    // --- Facoltativo: la memoria che manca per la tela è «troppo grande» ------------
    registro.titolo('Facoltativo: se il telefono non ha memoria per la tela, la frase è «troppo grande»');
    const t4 = await telefono(browser, app, flow, corpo);
    await t4.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t4.pagina.waitForSelector('#cantiere');
    await armaLibreria(t4.pagina);
    const memoria = await t4.pagina.evaluate(async ({ L, A }) => {
      const h = await import('./core/heic.js');
      const originale = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...a) { return this.width === L && this.height === A ? null : originale.apply(this, a); };
      try {
        await h.decodificaHeic(new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])], 'x.heic'));
        return { esito: 'riuscita' };
      } catch (e) {
        return { esito: 'errore', nome: e.name, motivo: e.motivo, messaggio: e.message };
      } finally {
        HTMLCanvasElement.prototype.getContext = originale;
      }
    }, { L, A });
    registro.dice('esito', memoria);
    registro.controlla('l’errore è ErroreHeic «troppo-grande», non un TypeError in inglese',
      memoria.nome === 'ErroreHeic' && memoria.motivo === 'troppo-grande', JSON.stringify(memoria));
    t4.errori.length = 0;
    await t4.contesto.close();

    // --- Facoltativo: libreria scaricata ma che non parte -------------------------
    registro.titolo('Facoltativo: libreria scaricata ma che non parte → motivo suo, che non manda a cercare la rete');
    const t5 = await telefono(browser, app, flow, 'export default async function () { throw new Error("WebAssembly.instantiate: out of memory"); }');
    await t5.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t5.pagina.waitForSelector('#cantiere');
    const avvio = await t5.pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      try { await h.decodificaHeic(new File([new Uint8Array(16)], 'x.heic')); return { esito: 'riuscita' }; } catch (e) { return { esito: 'errore', motivo: e.motivo, messaggio: e.message }; }
    });
    registro.dice('esito', avvio);
    registro.controlla('il motivo è «avvio», non «libreria»', avvio.motivo === 'avvio', JSON.stringify(avvio));
    registro.controlla('la frase non dice di riprovare con la rete', avvio.esito === 'errore' && !/rete|scaricare/.test(avvio.messaggio), avvio.messaggio);
    t5.errori.length = 0;
    await t5.contesto.close();

    // --- Facoltativo: cache piena non butta la libreria scaricata ---------------------
    registro.titolo('Facoltativo: con la memoria del browser piena la libreria arriva lo stesso dalla rete');
    const t6 = await nuovoTelefono(browser, { timezoneId: 'Europe/Rome' });
    await configura(t6.pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await aiuto.attendiInstallazione(t6.pagina);
    await t6.pagina.goto(app.indirizzo + '/index.html#/bolle');
    await t6.pagina.waitForSelector('#cantiere');
    const cdp = await t6.contesto.newCDPSession(t6.pagina);
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: app.indirizzo, quotaSize: 1 });
    const piena = await t6.pagina.evaluate(async () => {
      try { await (await caches.open('prova-quota')).put('/x', new Response(new Uint8Array(200000))); return 'scritta'; } catch (e) { return e.name; }
    });
    registro.dice('scrittura in cache con quota 1 byte', piena);
    const quota6 = await t6.pagina.evaluate(async () => {
      const h = await import('./core/heic.js');
      try { await h.decodificaHeic(new File([new Uint8Array(16)], 'x.heic')); return { esito: 'riuscita' }; } catch (e) { return { esito: 'errore', motivo: e.motivo, messaggio: e.message }; }
    });
    registro.dice('decodifica con la memoria piena', quota6);
    registro.controlla('la prova ha davvero la memoria piena (la scrittura in cache fallisce)', piena === 'QuotaExceededError', piena);
    registro.controlla('la libreria parte lo stesso: l’errore è quello della decodifica, non «libreria»',
      quota6.esito === 'errore' && quota6.motivo === 'decodifica', JSON.stringify(quota6));
    t6.errori.length = 0;
    await t6.contesto.close();
  },
};
