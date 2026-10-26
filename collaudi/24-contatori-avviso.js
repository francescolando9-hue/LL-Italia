// Contatori in fondo, avviso in cima (dalla 0.41.0).
//
// Decisione di Francesco del 26/10/2026, su segnalazione di Paolo Sanzarello:
// nei due moduli i quattro contatori del giorno escono dalla cima e vanno in
// fondo, dopo «Coda invii» e prima del collegamento alle impostazioni; in cima,
// al loro posto, compare un avviso SOLO quando c'è un problema — un elemento
// della coda non ancora arrivato 10 minuti dopo esserci entrato. Il momento
// dell'ingresso in coda è `accodatoIl` (core/coda-invio.js): Invia, «Rimanda»;
// i ritentativi e «Riprova» non lo spostano. Qui ci sono i casi 1–10 della
// tabella della specifica, con la stessa numerazione, più la corrispondenza
// fra casi e frasi dell'avviso.
//
// Come si tiene fermo il tempo e la coda:
// - **L'orologio della pagina** è quello di Playwright (`page.clock`): il tempo
//   scorre da sé, e `fastForward` lo fa saltare in avanti facendo scattare i
//   timer della pagina — il controllo che l'app fa da sola ogni 30 secondi
//   compreso. Così «compare entro un minuto, senza altri eventi» si prova
//   senza aspettare minuti veri, e senza toccare l'app.
// - **La rete spenta** (`setOffline`) tiene gli elementi dove sono: senza rete
//   il motore non li tocca (restano «In coda» o «Errore»). Gli elementi si
//   scrivono direttamente nel database del telefono, con i tempi che servono,
//   e la vista si riapre cambiando rotta — come chi esce e rientra nel modulo.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const MINUTO = 60 * 1000;
const DATABASE = { bolle: 'llitalia-bolle', foto: 'llitalia-foto' };
const ETICHETTE = ['Scattate oggi', 'Inviate oggi', 'In attesa', 'Errore'];

module.exports = {
  nome: 'Contatori in fondo, e in cima un avviso solo quando un elemento non arriva in 10 minuti',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    // Il caso 10 ha bisogno di un flow che RIFIUTA anche il ritentativo. Con la
    // guardia sui duplicati accesa — la accendono il 16, il 17 e il 23, ed
    // esegui.js fra un collaudo e l'altro non la spegne — il ritentativo, che ha
    // lo stesso idClient del primo tentativo rifiutato, riceverebbe
    // `gia_presente` e risulterebbe inviato: visto nella suite intera il
    // 26/10/2026 («stato inviata, tentativi 1»), mai lanciando il 24 da solo.
    flow.stato.deduplica = false;
    flow.stato.nonRispondere = false;
    await pagina.clock.install();
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 20, limiteMB: 20 },
    });

    // ------------------------------------------------------------- strumenti
    const ora = () => pagina.evaluate(() => Date.now());
    const attendiRichiesteNuove = async (prima, descrizione) => {
      const fine = Date.now() + 60000;
      while (flow.stato.ricevuti.length <= prima && Date.now() < fine) await new Promise(r => setTimeout(r, 100));
      if (flow.stato.ricevuti.length <= prima) throw new Error(`${descrizione}: nessuna richiesta in 60 secondi`);
    };

    // Riapre la vista del modulo passando dalla home: è la stessa vista che
    // vede l'operatore quando rientra, ridisegnata da capo, senza ricaricare
    // la pagina (con la rete spenta non si potrebbe).
    const riapri = async modulo => {
      await pagina.evaluate(() => { location.hash = '#/'; });
      await aiuto.attendi(pagina, m => !document.querySelector(`#${m}-contatori`), 'home', 10000, modulo);
      await pagina.evaluate(m => { location.hash = `#/${m}`; }, modulo);
      await aiuto.attendi(pagina, m => document.querySelectorAll(`#${m}-contatori .${m}-chip`).length === 4,
        `vista ${modulo} disegnata`, 10000, modulo);
    };

    // Svuota le due code: database cancellati e pagina ricaricata, con la rete
    // accesa (la cancellazione con una connessione aperta resta in sospeso
    // fino al ricarico: trappola 4 di aiuto.js).
    const svuota = async () => {
      await contesto.setOffline(false);
      await pagina.evaluate(nomi => Promise.all(nomi.map(n => new Promise(risolvi => {
        const r = indexedDB.deleteDatabase(n);
        r.onsuccess = r.onerror = r.onblocked = () => risolvi();
      }))), Object.values(DATABASE));
      await pagina.reload();
      await pagina.waitForSelector('body');
    };

    // Scrive un elemento nella coda del modulo, nella forma che l'app lascia.
    // I tempi sono in minuti PRIMA di adesso, letti dall'orologio della pagina.
    const inietta = (modulo, campi) => pagina.evaluate(async ({ db, modulo, campi, b64 }) => {
      const adesso = Date.now();
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
      const base = modulo === 'bolle'
        ? { cantiere: 'MNG', autore: 'Paolo Sanzarello', miniatura: null, impronta: '', qualita: 'ok',
          motivoQualita: '', nome: 'prova.jpg', fase: '', idServer: null, idBolla: crypto.randomUUID(),
          pagina: 1, pagine: 1 }
        : { tipo: 'ARCHIVIO', genere: 'foto', estensione: 'jpg', mime: 'image/jpeg', durata: 0,
          commessa: 'MNG', fase: 'Cantiere', piano: null, unita: null, prospetto: null, scala: null,
          autore: 'Paolo Sanzarello', nota: '', nome: 'prova.jpg', dataScatto: '2026-10-26T10:00:00+01:00',
          scattoStimato: 'NO', urlCaricamento: '', byteInviati: 0, byteCaricati: false, anteprima: blob };
      const record = {
        id: crypto.randomUUID(), foto: blob, byte: blob.size, ...base,
        timestampDispositivo: '2026-10-26T10:00:00+01:00', tentativi: 0, ultimoErrore: '', inviatoIl: null,
        progressivo: 900 + Math.floor(Math.random() * 99),
      };
      const { creatoMinutiFa, accodatoMinutiFa, ...resto } = campi;
      Object.assign(record, resto);
      record.creatoIl = adesso - creatoMinutiFa * 60000;
      if (accodatoMinutiFa !== undefined) record.accodatoIl = adesso - accodatoMinutiFa * 60000;
      const aperto = await new Promise((ok, ko) => {
        const r = indexedDB.open(db);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      if (!aperto.objectStoreNames.contains('foto')) throw new Error(`database ${db} senza archivio foto`);
      await new Promise((ok, ko) => {
        const tx = aperto.transaction('foto', 'readwrite');
        tx.objectStore('foto').put(record);
        tx.oncomplete = ok;
        tx.onerror = () => ko(tx.error);
      });
      aperto.close();
      return record.id;
    }, { db: DATABASE[modulo], modulo, campi, b64: require('fs').readFileSync(materiale('bolla.jpg')).toString('base64') });

    // Legge un record della coda dal database del telefono.
    const leggi = (modulo, id) => pagina.evaluate(async ({ db, id }) => {
      const aperto = await new Promise((ok, ko) => {
        const r = indexedDB.open(db);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      const record = await new Promise((ok, ko) => {
        const tx = aperto.transaction('foto', 'readonly');
        const r = tx.objectStore('foto').get(id);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      aperto.close();
      return record ? { stato: record.stato, creatoIl: record.creatoIl, accodatoIl: record.accodatoIl, tentativi: record.tentativi } : null;
    }, { db: DATABASE[modulo], id });

    // Quello che si vede: avviso in cima, contatori e loro posizione.
    const vista = modulo => pagina.evaluate(m => {
      const avviso = document.querySelector(`#${m}-avviso`);
      const contatori = document.querySelector(`#${m}-contatori`);
      const coda = document.querySelector('#sezione-coda');
      const impostazioni = document.querySelector(`a[href="#/${m}/impostazioni"]`);
      const dopo = (a, b) => Boolean(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
      const visibile = e => Boolean(e) && !e.classList.contains('nascosto') && getComputedStyle(e).display !== 'none';
      return {
        avvisoVisibile: visibile(avviso),
        righe: avviso ? [...avviso.querySelectorAll('.riga')].map(r => r.textContent.trim()) : [],
        etichette: [...contatori.querySelectorAll('.etichetta')].map(e => e.textContent.trim()),
        valori: Object.fromEntries([...contatori.querySelectorAll(`.${m}-chip`)].map(c =>
          [c.querySelector('.etichetta').textContent.trim(), Number(c.querySelector('.valore').textContent)])),
        dopoLaCoda: dopo(coda, contatori),
        primaDelleImpostazioni: dopo(contatori, impostazioni),
        sottoLaCoda: contatori.getBoundingClientRect().top > coda.getBoundingClientRect().top,
        // Il primo elemento visibile della vista: in cima non c'è niente se
        // tutto è in ordine, quindi è la scheda del cantiere.
        primoVisibile: (() => {
          const e = [...document.querySelector(`#${m}-contatori`).parentElement.children].find(visibile);
          return e ? (e.id || e.className) : '';
        })(),
      };
    }, modulo);

    // L'avviso si aggiorna dopo una lettura della coda: si aspetta che
    // dica quello che deve, entro un limite, e poi si legge.
    const attendiAvviso = (modulo, visibile, limite = 10000) => aiuto.attendi(pagina, ({ m, v }) => {
      const e = document.querySelector(`#${m}-avviso`);
      return Boolean(e) && e.classList.contains('nascosto') === !v;
    }, `avviso ${visibile ? 'visibile' : 'nascosto'} in ${modulo}`, limite, { m: modulo, v: visibile }).catch(() => false);

    // ============================================== frasi e casi, un punto solo
    registro.titolo('Le frasi dell’avviso: una per caso, in un punto solo per i due moduli');
    const frasi = await pagina.evaluate(async () => {
      const { FRASI_AVVISO_RITARDO, righeAvvisoRitardo } = await import('./core/errori.js');
      const { elementiInRitardo, SOGLIA_RITARDO_MS, CONTROLLO_RITARDO_MS } = await import('./core/coda-invio.js');
      const bolla = { uno: 'bolla', tanti: 'bolle' };
      const foto = { uno: 'foto o video', tanti: 'foto o video' };
      const casi = Object.keys(elementiInRitardo([]));
      return {
        casi,
        conFrase: Object.keys(FRASI_AVVISO_RITARDO),
        soglia: SOGLIA_RITARDO_MS,
        controllo: CONTROLLO_RITARDO_MS,
        esempi: casi.flatMap(c => [1, 2].flatMap(n => [bolla, foto].map(nome =>
          (FRASI_AVVISO_RITARDO[c] ? FRASI_AVVISO_RITARDO[c](n, nome) : `(nessuna frase per ${c})`)))),
        vuoto: righeAvvisoRitardo({ attesa: 0, errore: 0 }, bolla).length,
      };
    });
    registro.dice('casi del motore', frasi.casi.join(', '));
    registro.dice('frasi', frasi.esempi);
    registro.controlla('ogni caso del motore ha la sua frase, e non ci sono frasi senza caso',
      frasi.casi.length > 0 && frasi.casi.join('|') === frasi.conFrase.join('|'),
      `casi ${frasi.casi.join(', ')} · frasi ${frasi.conFrase.join(', ')}`);
    registro.controlla('le frasi sono tutte diverse', new Set(frasi.esempi).size === frasi.esempi.length);
    registro.controlla('singolare e plurale giusti: «1 bolla», «2 bolle», «1 foto o video», «2 foto o video»',
      frasi.esempi.includes('1 bolla in attesa da più di 10 minuti')
        && frasi.esempi.includes('2 bolle in attesa da più di 10 minuti')
        && frasi.esempi.includes('1 bolla in errore da più di 10 minuti')
        && frasi.esempi.includes('2 foto o video in errore da più di 10 minuti'));
    registro.controlla('una soglia sola, 10 minuti; il controllo da solo ogni 30 secondi',
      frasi.soglia === 10 * MINUTO && frasi.controllo === 30 * 1000, `${frasi.soglia} ms · ${frasi.controllo} ms`);
    registro.controlla('nessun caso, nessuna riga', frasi.vuoto === 0);

    // ============================================================ casi 1 e 2
    for (const [numero, modulo] of [[1, 'bolle'], [2, 'foto']]) {
      registro.titolo(`Caso ${numero} · ${modulo === 'bolle' ? 'Bolle' : 'Foto'} · coda vuota`);
      await svuota();
      await pagina.evaluate(m => { location.hash = `#/${m}`; }, modulo);
      await riapri(modulo);
      const v = await vista(modulo);
      registro.dice('in vista', JSON.stringify({ avviso: v.avvisoVisibile, primo: v.primoVisibile, etichette: v.etichette }));
      registro.controlla(`caso ${numero} · nessun avviso in cima`, !v.avvisoVisibile && v.righe.length === 0);
      registro.controlla(`caso ${numero} · i quattro contatori ci sono, con i loro nomi`,
        v.etichette.join('|') === ETICHETTE.join('|'), v.etichette.join(', '));
      registro.controlla(`caso ${numero} · e stanno in fondo: dopo «Coda invii» e prima delle impostazioni`,
        v.dopoLaCoda && v.primaDelleImpostazioni && v.sottoLaCoda,
        `dopo la coda ${v.dopoLaCoda} · prima delle impostazioni ${v.primaDelleImpostazioni} · più in basso ${v.sottoLaCoda}`);
      registro.controlla(`caso ${numero} · in cima, quando tutto è in ordine, non c’è niente prima della scheda`,
        !/contatori|avviso/.test(v.primoVisibile), v.primoVisibile);
    }

    // ============================================================ casi 3–6, 8
    // Rete spenta: il motore lascia gli elementi come sono.
    const conRetiSpente = async (modulo, elementi) => {
      await svuota();
      await pagina.evaluate(m => { location.hash = `#/${m}`; }, modulo);
      await riapri(modulo);
      await contesto.setOffline(true);
      for (const e of elementi) await inietta(modulo, e);
      await riapri(modulo);
    };

    registro.titolo('Caso 3 · Bolle · un elemento in coda da 11 minuti');
    await conRetiSpente('bolle', [{ stato: 'in_coda', creatoMinutiFa: 40, accodatoMinutiFa: 11 }]);
    await attendiAvviso('bolle', true);
    let v = await vista('bolle');
    registro.dice('avviso', v.righe);
    registro.controlla('caso 3 · in cima «1 bolla in attesa da più di 10 minuti»',
      v.avvisoVisibile && v.righe.length === 1 && v.righe[0] === '1 bolla in attesa da più di 10 minuti',
      v.righe.join(' | '));
    const primaDelTocco = await pagina.evaluate(() => ({
      y: window.scrollY, top: Math.round(document.querySelector('#sezione-coda').getBoundingClientRect().top) }));
    await pagina.click('#bolle-avviso');
    await aiuto.attendi(pagina, () => {
      const top = document.querySelector('#sezione-coda').getBoundingClientRect().top;
      const finePagina = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
      return top <= 20 || finePagina;
    }, 'coda invii in vista', 10000).catch(() => false);
    const dopoIlTocco = await pagina.evaluate(() => ({
      y: window.scrollY,
      top: Math.round(document.querySelector('#sezione-coda').getBoundingClientRect().top),
      finePagina: window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2,
    }));
    registro.dice('«Coda invii» rispetto alla cima dello schermo', `prima del tocco ${primaDelTocco.top} px, dopo ${dopoIlTocco.top} px`);
    // Prima del tocco la sezione deve essere lontana dalla cima, altrimenti il
    // controllo passerebbe anche con un avviso che non fa niente.
    registro.controlla('caso 3 · un tocco sull’avviso porta a «Coda invii»',
      primaDelTocco.top > 100 && dopoIlTocco.y > primaDelTocco.y && (dopoIlTocco.top <= 20 || dopoIlTocco.finePagina),
      `scorrimento ${primaDelTocco.y} → ${dopoIlTocco.y}`);
    await pagina.evaluate(() => window.scrollTo(0, 0));

    registro.titolo('Caso 4 · Bolle · un elemento in errore da 11 minuti');
    await conRetiSpente('bolle', [{ stato: 'errore', tentativi: 3, ultimoErrore: 'HTTP 500', creatoMinutiFa: 40, accodatoMinutiFa: 11 }]);
    await attendiAvviso('bolle', true);
    v = await vista('bolle');
    registro.controlla('caso 4 · in cima «1 bolla in errore da più di 10 minuti»',
      v.avvisoVisibile && v.righe.join('|') === '1 bolla in errore da più di 10 minuti', v.righe.join(' | '));

    registro.titolo('Caso 5 · Bolle · un elemento in errore da 2 minuti');
    await conRetiSpente('bolle', [{ stato: 'errore', tentativi: 1, ultimoErrore: 'HTTP 500', creatoMinutiFa: 40, accodatoMinutiFa: 2 }]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda li').length === 1, 'riga in coda', 10000);
    v = await vista('bolle');
    registro.dice('contatori in fondo', JSON.stringify(v.valori));
    registro.controlla('caso 5 · nessun avviso: un errore di 2 minuti si risolve ancora da solo',
      !v.avvisoVisibile && v.righe.length === 0, v.righe.join(' | ') || 'nessuna riga');
    registro.controlla('caso 5 · «Errore 1» nei contatori in fondo', v.valori.Errore === 1 && v.dopoLaCoda,
      `Errore ${v.valori.Errore}`);

    registro.titolo('Caso 6 · Foto · due in coda e uno in errore, tutti da più di 10 minuti');
    await conRetiSpente('foto', [
      { stato: 'in_coda', creatoMinutiFa: 30, accodatoMinutiFa: 12 },
      { stato: 'in_coda', creatoMinutiFa: 30, accodatoMinutiFa: 15 },
      { stato: 'errore', tentativi: 2, ultimoErrore: 'HTTP 502', creatoMinutiFa: 30, accodatoMinutiFa: 20 },
    ]);
    await attendiAvviso('foto', true);
    v = await vista('foto');
    registro.dice('avviso', v.righe);
    registro.controlla('caso 6 · due righe: «2 foto o video in attesa…» e «1 foto o video in errore…»',
      v.avvisoVisibile && v.righe.join('|')
        === '2 foto o video in attesa da più di 10 minuti|1 foto o video in errore da più di 10 minuti',
      v.righe.join(' | '));

    registro.titolo('Caso 8 · Bolle · un elemento salvato dalla 0.40.0, senza accodatoIl, creato 11 minuti fa');
    await conRetiSpente('bolle', [{ stato: 'in_coda', creatoMinutiFa: 11 }]);
    await attendiAvviso('bolle', true);
    v = await vista('bolle');
    registro.controlla('caso 8 · vale creatoIl: avviso come al caso 3',
      v.avvisoVisibile && v.righe.join('|') === '1 bolla in attesa da più di 10 minuti', v.righe.join(' | '));

    // ============================================================ caso 7
    // Nessun altro evento: niente tocchi, niente ricariche, niente invii. Il
    // tempo della pagina avanza a passi di 5 secondi.
    registro.titolo('Caso 7 · Bolle · in coda da 9 minuti e 30 secondi, poi solo il tempo che passa');
    await conRetiSpente('bolle', [{ stato: 'in_coda', creatoMinutiFa: 20, accodatoMinutiFa: 9.5 }]);
    await pagina.waitForTimeout(500);
    v = await vista('bolle');
    registro.controlla('caso 7 · a 9 minuti e 30 secondi nessun avviso', !v.avvisoVisibile);
    let secondi = 0;
    let compareA = null;
    let primaDellaSoglia = false;
    while (secondi < 120) {
      await pagina.clock.fastForward(5000);
      secondi += 5;
      await pagina.waitForTimeout(150);
      const visibile = await pagina.$eval('#bolle-avviso', e => !e.classList.contains('nascosto'));
      if (visibile && secondi < 30) primaDellaSoglia = true;
      if (visibile && compareA === null) { compareA = secondi; break; }
    }
    // La soglia si supera 30 secondi dopo l'apertura.
    registro.dice('avviso comparso', compareA === null ? 'mai, in 2 minuti' : `${compareA} s dopo l'apertura, ${compareA - 30} s dopo la soglia`);
    registro.controlla('caso 7 · non prima della soglia', !primaDellaSoglia);
    registro.controlla('caso 7 · compare da solo entro un minuto dal superamento dei 10 minuti',
      compareA !== null && compareA - 30 <= 60, compareA === null ? 'mai' : `${compareA - 30} s`);
    v = await vista('bolle');
    registro.controlla('caso 7 · e dice «1 bolla in attesa da più di 10 minuti»',
      v.righe.join('|') === '1 bolla in attesa da più di 10 minuti', v.righe.join(' | '));

    // ======================================================= casi 9 e 10
    // Rete accesa: qui gli invii partono davvero, verso il flow finto.
    await svuota();
    await pagina.evaluate(() => { location.hash = '#/bolle'; });
    await riapri('bolle');

    registro.titolo('Caso 9 · Bolle · bozza di 30 minuti, poi Invia');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    const scatto = await ora();
    await pagina.clock.fastForward(30 * MINUTO);
    await pagina.selectOption('#cantiere', 'MAR');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    const primaDiInvia = flow.stato.ricevuti.length;
    const momentoInvia = await ora();
    await pagina.click('#invia');
    await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda .badge-inviata').length === 1, 'bolla inviata', 60000);
    const payload9 = flow.stato.ricevuti.slice(primaDiInvia).find(r => r && !('tipo' in r));
    const record9 = await leggi('bolle', payload9.idClient);
    registro.dice('tempi del record', `creatoIl ${Math.round((record9.creatoIl - scatto) / 1000)} s dallo scatto · accodatoIl ${Math.round((record9.accodatoIl - momentoInvia) / 1000)} s dal tocco su Invia · ${Math.round((record9.accodatoIl - record9.creatoIl) / MINUTO)} minuti fra i due`);
    registro.controlla('caso 9 · accodatoIl è il momento di Invia, non quello della foto',
      Number.isFinite(record9.accodatoIl) && record9.accodatoIl >= momentoInvia && record9.accodatoIl - momentoInvia < 5000
        && record9.accodatoIl - record9.creatoIl >= 30 * MINUTO);
    registro.controlla('caso 9 · il payload non contiene accodatoIl: il contratto col flow non cambia',
      !('accodatoIl' in payload9), Object.keys(payload9).filter(k => /accodat/i.test(k)).join(', ') || 'assente');
    v = await vista('bolle');
    registro.controlla('caso 9 · nessun avviso: una bolla fotografata mezz’ora fa e mandata adesso non è in ritardo',
      !v.avvisoVisibile);

    // Fuori tabella, dal §1.2: anche «Rimanda» è un ingresso in coda.
    registro.titolo('«Rimanda la stessa» 20 minuti dopo: si rientra in coda adesso');
    await pagina.clock.fastForward(20 * MINUTO);
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.bolle-rimanda')), 'pulsante Rimanda', 20000);
    await pagina.click('.bolle-rimanda');
    await pagina.waitForSelector('#r-manda');
    const momentoRimanda = await ora();
    const primaDiRimanda = flow.stato.ricevuti.length;
    await pagina.click('#r-manda');
    // Si aspetta l'effetto del tocco — la richiesta nuova al flow — e solo
    // dopo «niente in viaggio»: quella condizione era già vera prima del
    // tocco, e aspettarla da sola leggeva il record di prima.
    await attendiRichiesteNuove(primaDiRimanda, 'la bolla rimandata arriva al flow');
    await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda .badge-inviata').length === 1
      && !document.querySelector('#lista-coda .badge-coda, #lista-coda .badge-invio'), 'rimandata e inviata', 60000);
    const rimandata = await leggi('bolle', payload9.idClient);
    registro.controlla('accodatoIl è il momento di «Rimanda», non quello del primo invio',
      rimandata.accodatoIl >= momentoRimanda && rimandata.accodatoIl - record9.accodatoIl >= 20 * MINUTO,
      `${Math.round((rimandata.accodatoIl - record9.accodatoIl) / MINUTO)} minuti dopo il primo`);

    registro.titolo('Caso 10 · Bolle · tentativo fallito, ritentativo fallito, poi Riprova riuscito');
    flow.stato.stato = 500;
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    const primaDel10 = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    await attendiRichiesteNuove(primaDel10, 'il primo tentativo arriva al flow');
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('#lista-coda .badge-errore')), 'errore', 30000);
    const id10 = flow.stato.ricevuti.slice(primaDel10).find(r => r && !('tipo' in r)).idClient;
    const dopoIlPrimo = await leggi('bolle', id10);
    // Il ritentativo automatico: il motore aspetta 5 secondi dopo il primo
    // fallimento. Il tempo della pagina si fa avanzare a passi di un secondo
    // finché il secondo tentativo non è fallito anche lui: un salto unico
    // potrebbe arrivare prima che il motore abbia programmato il ritentativo.
    let dopoIlSecondo = await leggi('bolle', id10);
    const fineSecondo = Date.now() + 60000;
    while (!(dopoIlSecondo.tentativi >= 2 && dopoIlSecondo.stato === 'errore') && Date.now() < fineSecondo) {
      await pagina.clock.fastForward(1000);
      await pagina.waitForTimeout(100);
      dopoIlSecondo = await leggi('bolle', id10);
    }
    if (!(dopoIlSecondo.tentativi >= 2 && dopoIlSecondo.stato === 'errore')) {
      throw new Error(`secondo tentativo fallito non visto: stato ${dopoIlSecondo.stato}, tentativi ${dopoIlSecondo.tentativi}, `
        + `richieste al flow dopo Invia ${flow.stato.ricevuti.length - primaDel10}`);
    }
    // «Riprova» premuto subito: il ritentativo automatico dopo (10 secondi)
    // non scatta, perché il tempo della pagina non lo si fa avanzare e Riprova
    // azzera l'attesa del motore. Così l'invio riuscito è quello di Riprova.
    flow.stato.stato = 200;
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('.bolle-riprova')), 'Riprova', 20000);
    await pagina.click('.bolle-riprova');
    await aiuto.attendi(pagina, () => !document.querySelector('#lista-coda .badge-errore, #lista-coda .badge-coda, #lista-coda .badge-invio'),
      'riuscito', 60000);
    const riuscito = await leggi('bolle', id10);
    registro.dice('accodatoIl nei tre momenti', `${dopoIlPrimo.accodatoIl} · ${dopoIlSecondo.accodatoIl} · ${riuscito.accodatoIl} (tentativi ${dopoIlPrimo.tentativi}, ${dopoIlSecondo.tentativi}; stato finale ${riuscito.stato})`);
    registro.controlla('caso 10 · accodatoIl invariato fra i tentativi e dopo Riprova',
      Number.isFinite(dopoIlPrimo.accodatoIl) && dopoIlPrimo.accodatoIl === dopoIlSecondo.accodatoIl
        && dopoIlSecondo.accodatoIl === riuscito.accodatoIl && dopoIlSecondo.tentativi >= 2 && riuscito.stato === 'inviata',
      'i ritentativi, la ripresa e «Riprova» non spostano il momento dell’ingresso in coda');

    await contesto.setOffline(false);
    // I due 500 del caso 10 sono voluti: il browser li scrive in console.
    registro.controllaConsole(errori, ['status of 500']);
    await contesto.close();
  },
};
