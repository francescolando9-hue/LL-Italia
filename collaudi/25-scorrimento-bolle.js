// Scorrimento fra le bolle inviate (dalla 0.41.0).
//
// Decisione di Francesco del 26/10/2026, su segnalazione di Paolo Sanzarello:
// nel dettaglio di una bolla aperta da «Bolle inviate» si passa alla
// successiva (quella sotto nell'elenco) scorrendo il dito verso sinistra, alla
// precedente verso destra. Si scorre dentro l'elenco che si sta guardando, nel
// suo ordine, una riga alla volta; ai capi ci si ferma e lo si dice; in cima
// c'è la riga della bolla e «3 di 12». Casi 11–21 della tabella della
// specifica del 26/10/2026, con la stessa numerazione.
//
// **Dalla 0.41.1** (decisione di Francesco del 27/10/2026) le due frecce e il
// piede fisso che le conteneva non ci sono più: il gesto si capisce da solo, e
// il piede copriva il riquadro dove si sceglie il cantiere. La frase dei capi
// sta nella testa, una alla volta, e con una bolla sola è «È l’unica bolla di
// questo elenco» (prima si leggevano tutte e due). Qui i casi 15 e 16 della
// specifica del 27/10/2026; dove la prova andava avanti con la freccia ›, ora
// va avanti col gesto.
//
// I dati: un ottobre di otto righe scritte direttamente nel database del
// telefono — lo storico, le miniature e, per quattro righe, la foto intera —
// con una bolla di tre pagine, righe con la sola miniatura e una senza
// immagine. I gesti sono `TouchEvent` costruiti sul visore (il codice ascolta
// touchstart/touchend); lo zoom invece è vero: `Emulation.setPageScaleFactor`
// ingrandisce la pagina come un pizzico, e `visualViewport.scale` sale.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

// Le otto righe, dalla più recente. `foto`: 'intera' (la foto è ancora sul
// telefono: c'è «Cantiere sbagliato?»), 'miniatura', 'nessuna'.
const RIGHE = [
  { id: 'r1', giorno: '2026-10-22', ora: '10:30', commessa: 'MNG', progressivo: 108, fase: 'Strutture', foto: 'intera' },
  { id: 'r2', giorno: '2026-10-22', ora: '10:20', commessa: 'MAR', progressivo: 107, fase: '', foto: 'miniatura' },
  { id: 'r3', giorno: '2026-10-21', ora: '16:02', commessa: 'MNG', progressivo: 106, fase: 'Murature', foto: 'intera', pagina: 3, pagine: 3 },
  { id: 'r4', giorno: '2026-10-21', ora: '16:01', commessa: 'MNG', progressivo: 105, fase: 'Murature', foto: 'intera', pagina: 2, pagine: 3 },
  { id: 'r5', giorno: '2026-10-21', ora: '16:00', commessa: 'MNG', progressivo: 104, fase: 'Murature', foto: 'intera', pagina: 1, pagine: 3 },
  { id: 'r6', giorno: '2026-10-21', ora: '09:00', commessa: 'SNZ2.2', progressivo: 103, fase: '', foto: 'miniatura' },
  { id: 'r7', giorno: '2026-10-20', ora: '15:00', commessa: 'MNG', progressivo: 102, fase: 'Cantiere', foto: 'nessuna' },
  { id: 'r8', giorno: '2026-10-20', ora: '08:00', commessa: 'MAR', progressivo: 101, fase: 'Murature', foto: 'miniatura' },
];
const ID_BOLLA_DI_TRE = '00000000-0000-4000-8000-000000000025';
const idClient = id => `00000000-0000-4000-8000-0000000000${id.slice(1).padStart(2, '0')}`;

module.exports = {
  nome: 'Bolle inviate: scorrimento fra le bolle, frecce, riga della bolla e capi dell’elenco',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    // Conta le immagini prese e rilasciate dalla pagina (URL.createObjectURL /
    // revokeObjectURL): scorrendo, quelle lasciate si devono rilasciare.
    await contesto.addInitScript(() => {
      window.__url = { creati: 0, revocati: 0 };
      const crea = URL.createObjectURL.bind(URL);
      const revoca = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = o => { window.__url.creati += 1; return crea(o); };
      URL.revokeObjectURL = u => { window.__url.revocati += 1; return revoca(u); };
    });
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#bolle-contatori');

    // ------------------------------------------------------------- i dati
    const b64 = require('fs').readFileSync(materiale('bolla.jpg')).toString('base64');
    await pagina.evaluate(async ({ righe, b64, idBolla }) => {
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
      const db = await new Promise((ok, ko) => { const r = indexedDB.open('llitalia-bolle'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
      const metti = (store, valore) => new Promise((ok, ko) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(valore);
        tx.oncomplete = ok;
        tx.onerror = () => ko(tx.error);
      });
      for (const r of righe) {
        const inviatoIl = Date.parse(`${r.giorno}T${r.ora}:00+02:00`);
        const dataInvio = `${r.giorno}T${r.ora}:00+02:00`;
        const di3 = Boolean(r.pagine);
        await metti('storico', {
          idClient: r.idClient, commessa: r.commessa, fase: r.fase, operatore: 'Paolo Sanzarello', dataInvio, inviatoIl,
          impronta: '', progressivo: r.progressivo, idBolla: di3 ? idBolla : r.idClient, pagina: r.pagina || 1, pagine: r.pagine || 1,
        });
        if (r.foto !== 'nessuna') await metti('miniature', { idClient: r.idClient, blob, inviatoIl });
        if (r.foto === 'intera') {
          await metti('foto', {
            id: r.idClient, stato: 'inviata', foto: blob, cantiere: r.commessa, fase: r.fase, autore: 'Paolo Sanzarello',
            miniatura: blob, impronta: '', qualita: 'ok', motivoQualita: '', nome: `${r.idClient}.jpg`,
            timestampDispositivo: dataInvio, creatoIl: inviatoIl - 60000, accodatoIl: inviatoIl - 50000, tentativi: 0,
            ultimoErrore: '', inviatoIl, idServer: null, progressivo: r.progressivo,
            idBolla: di3 ? idBolla : r.idClient, pagina: r.pagina || 1, pagine: r.pagine || 1,
          });
        }
      }
      db.close();
    }, { righe: RIGHE.map(r => ({ ...r, idClient: idClient(r.id) })), b64, idBolla: ID_BOLLA_DI_TRE });

    await pagina.evaluate(() => { location.hash = '#/bolle/storico'; });
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 8, 'elenco del mese', 10000);

    // ------------------------------------------------------------- strumenti
    const idDi = id => idClient(id);
    const nomeDi = cliente => (RIGHE.find(r => idClient(r.id) === cliente) || {}).id || cliente;
    // Le righe come si vedono, nell'ordine dell'elenco.
    const elenco = () => pagina.$$eval('.bolle-riga[data-id]', e => e.map(x => x.dataset.id));
    // I dati di una riga dell'elenco, senza la lente.
    const testoRiga = sel => pagina.$eval(sel, e => [...e.querySelectorAll('.ora, .cantiere, .tenue')]
      .map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
    const statoVisore = () => pagina.evaluate(() => {
      const testa = document.querySelector('.bolle-riga-testa');
      return {
        aperto: !document.querySelector('#visore').classList.contains('nascosto'),
        riga: testa ? [...testa.querySelectorAll('.ora, .cantiere, .tenue')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ') : '',
        posizione: (document.querySelector('.bolle-visore-posizione') || {}).textContent || '',
        capo: document.querySelector('#visore-capo').textContent.trim(),
        // La frase dei capi sta nella testa, e la testa non è fissa né sticky.
        capoNellaTesta: Boolean(document.querySelector('#visore-testa #visore-capo')),
        testaFissa: ['fixed', 'sticky'].includes(getComputedStyle(document.querySelector('#visore-testa')).position)
          || ['fixed', 'sticky'].includes(getComputedStyle(document.querySelector('#visore-capo')).position),
        // Le frecce non ci sono più: nessun elemento, né nascosto né spento.
        frecce: document.querySelectorAll('#bolla-prec, #bolla-succ, .bolle-freccia-grande, .bolle-visore-piede').length,
        contenuto: document.querySelector('#visore-contenuto').textContent.replace(/\s+/g, ' ').trim(),
        immagine: Boolean(document.querySelector('#visore-contenuto img')),
        menu: (document.querySelector('#cantiere-corretto') || {}).value,
        fase: (document.querySelector('#c-fase') || {}).value,
        rimandaSpento: (document.querySelector('#rimanda') || {}).disabled,
      };
    });
    const UNICA = 'È l’unica bolla di questo elenco';
    const PRIMA = 'È la prima bolla di questo elenco';
    const ULTIMA = 'È l’ultima bolla di questo elenco';
    // Il contenuto arriva dopo una lettura del database: si aspetta che il
    // visore non dica più «Apertura…».
    const attendiContenuto = () => aiuto.attendi(pagina,
      () => !/Apertura/.test(document.querySelector('#visore-contenuto').textContent), 'bolla caricata', 10000);
    // Un gesto di un dito sul visore, da (x0,y0) a (x1,y1).
    const gesto = async (x0, y0, x1, y1) => {
      await pagina.evaluate(({ x0, y0, x1, y1 }) => {
        const visore = document.querySelector('#visore');
        const t = (x, y) => new Touch({ identifier: 1, target: visore, clientX: x, clientY: y });
        const a = t(x0, y0);
        const m = t((x0 + x1) / 2, (y0 + y1) / 2);
        const b = t(x1, y1);
        visore.dispatchEvent(new TouchEvent('touchstart', { touches: [a], targetTouches: [a], changedTouches: [a], bubbles: true }));
        visore.dispatchEvent(new TouchEvent('touchmove', { touches: [m], targetTouches: [m], changedTouches: [m], bubbles: true }));
        visore.dispatchEvent(new TouchEvent('touchmove', { touches: [b], targetTouches: [b], changedTouches: [b], bubbles: true }));
        visore.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [b], bubbles: true }));
      }, { x0, y0, x1, y1 });
      await attendiContenuto();
    };
    const versoSinistra = () => gesto(300, 400, 120, 410);
    const versoDestra = () => gesto(90, 400, 270, 410);
    const apri = async id => {
      await pagina.click(`.bolle-riga[data-id="${idDi(id)}"]`);
      await attendiContenuto();
    };
    const chiudi = async () => {
      await pagina.click('#chiudi-visore');
      await aiuto.attendi(pagina, () => document.querySelector('#visore').classList.contains('nascosto'), 'visore chiuso', 5000);
    };
    // La testa deve dire la stessa riga dell'elenco e la posizione.
    const controllaTesta = async (caso, id, posizione) => {
      const s = await statoVisore();
      const attesa = await testoRiga(`.bolle-riga[data-id="${idDi(id)}"]`);
      registro.controlla(`${caso} · in cima la riga di ${id} e «${posizione}»`,
        s.riga === attesa && s.posizione === posizione, `«${s.riga}» · «${s.posizione}»`);
      return s;
    };

    // ================================================================ 11–14
    registro.titolo('Casi 11–14 · elenco di 5 righe (mese, filtro MNG)');
    await pagina.selectOption('#commessa', 'MNG');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 5, 'elenco MNG', 10000);
    const elencoMNG = await elenco();
    registro.dice('righe mostrate', elencoMNG.map(nomeDi).join(' '));
    await apri('r4');
    await controllaTesta('caso 11', 'r4', '3 di 5');

    await versoSinistra();
    await controllaTesta('caso 12 · dito verso sinistra', 'r5', '4 di 5');
    await versoDestra();
    await controllaTesta('caso 12 · poi verso destra', 'r4', '3 di 5');

    let s = await statoVisore();
    registro.controlla('0.41.1 caso 16 · nel mezzo dell’elenco nessuna frase dei capi', s.capo === '', `«${s.capo}»`);
    registro.controlla('0.41.1 caso 16 · nessuna freccia nella pagina (#bolla-prec e #bolla-succ non esistono), niente piede',
      s.frecce === 0, `${s.frecce} elementi`);
    await versoSinistra();
    await versoSinistra();
    s = await controllaTesta('caso 13 · col gesto fino in fondo', 'r7', '5 di 5');
    registro.controlla('caso 13 · alla 5ª, una frase sola: «È l’ultima bolla di questo elenco», nella testa',
      s.capo === ULTIMA && s.capoNellaTesta && !s.testaFissa, `«${s.capo}»`);
    await versoSinistra();
    s = await statoVisore();
    registro.controlla('caso 13 · un altro gesto non cambia niente: niente giro dall’inizio',
      s.posizione === '5 di 5' && s.riga === await testoRiga(`.bolle-riga[data-id="${idDi('r7')}"]`), s.posizione);

    for (let i = 0; i < 4; i += 1) await versoDestra();
    s = await controllaTesta('caso 14 · alla 1ª', 'r1', '1 di 5');
    registro.controlla('caso 14 · una frase sola: «È la prima bolla di questo elenco», nella testa',
      s.capo === PRIMA && s.capoNellaTesta && !s.testaFissa, `«${s.capo}»`);
    await versoDestra();
    s = await statoVisore();
    registro.controlla('caso 14 · un altro gesto verso destra non cambia niente', s.posizione === '1 di 5', s.posizione);

    // ================================================================ 15–17
    registro.titolo('Casi 15–17 · gesti che non devono cambiare bolla');
    await versoSinistra();
    await controllaTesta('punto di partenza', 'r3', '2 di 5');
    await gesto(200, 150, 180, 650);
    s = await statoVisore();
    registro.controlla('caso 15 · scorrimento verticale lungo (500 px, 20 di lato): la bolla non cambia', s.posizione === '2 di 5', s.posizione);
    await gesto(200, 650, 120, 200);
    s = await statoVisore();
    registro.controlla('caso 15 · anche in diagonale ripida (80 di lato, 450 in verticale)', s.posizione === '2 di 5', s.posizione);
    await gesto(8, 400, 250, 405);
    s = await statoVisore();
    registro.controlla('caso 16 · gesto che parte dal bordo sinistro (8 px): la bolla non cambia', s.posizione === '2 di 5', s.posizione);
    await gesto(384, 400, 120, 405);
    s = await statoVisore();
    registro.controlla('caso 16 · e dal bordo destro (384 px su 390)', s.posizione === '2 di 5', s.posizione);
    // Il controllo dell'altro verso: lo stesso gesto, partito poco più in là
    // del bordo, cambia bolla — altrimenti i due controlli sopra non
    // distinguerebbero «bordo escluso» da «gesto che non funziona».
    const cdp = await contesto.newCDPSession(pagina);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await aiuto.attendi(pagina, () => window.visualViewport.scale > 1.5, 'pagina ingrandita', 5000);
    const scala = await pagina.evaluate(() => window.visualViewport.scale);
    await versoSinistra();
    s = await statoVisore();
    registro.controlla(`caso 17 · pagina ingrandita (scala ${scala}), dito verso sinistra: la bolla non cambia`,
      s.posizione === '2 di 5', s.posizione);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await aiuto.attendi(pagina, () => window.visualViewport.scale < 1.01, 'pagina normale', 5000);
    await gesto(40, 400, 250, 405);
    s = await statoVisore();
    registro.controlla('di nuovo a scala 1, lo stesso gesto (partito a 40 px) cambia bolla', s.posizione === '1 di 5', s.posizione,
      'la prova che i gesti sopra non cambiavano bolla per la regola, non perché il gesto non funziona');
    await chiudi();

    // ================================================================ 18–19
    registro.titolo('Casi 18–19 · giorno scelto e filtro MNG: si scorre solo fra le righe mostrate');
    // Quale riga dell'elenco sta mostrando la testa: la si riconosce dal testo,
    // che è unico per riga (il n. progressivo è diverso).
    const quale = async () => {
      const s = await statoVisore();
      for (const id of await elenco()) {
        if (await testoRiga(`.bolle-riga[data-id="${id}"]`) === s.riga) return { id, ...s };
      }
      return { id: '(nessuna riga dell’elenco)', ...s };
    };
    await pagina.click('.bolle-giorno-cella[data-giorno="2026-10-21"]');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 3, 'elenco del 21 per MNG', 10000);
    const elenco21 = await elenco();
    registro.dice('righe mostrate', elenco21.map(nomeDi).join(' '));
    await pagina.click(`.bolle-riga[data-id="${elenco21[0]}"]`);
    await attendiContenuto();
    const viste = [];
    for (let i = 0; i < 5; i += 1) {
      viste.push(await quale());
      await versoSinistra();
    }
    registro.dice('righe viste scorrendo verso sinistra', viste.map(v => `${nomeDi(v.id)} (${v.posizione})`).join(' → '));
    registro.controlla('caso 18 · si scorre solo fra le righe mostrate, nel loro ordine, e all’ultima ci si ferma',
      viste.map(v => v.id).join('|') === [...elenco21, elenco21[2], elenco21[2]].join('|')
        && viste.map(v => v.posizione).join('|') === '1 di 3|2 di 3|3 di 3|3 di 3|3 di 3',
      'né la riga SNZ2.2 dello stesso giorno né quelle di altri giorni');
    const pagineViste = viste.slice(0, 3).map(v => (v.riga.match(/pag\. \d\/\d/) || [''])[0]);
    registro.controlla('caso 19 · bolla di 3 pagine: tre passi, uno per pagina («pag. 1/3» … «pag. 3/3»)',
      pagineViste.length === 3 && ['pag. 1/3', 'pag. 2/3', 'pag. 3/3'].every(p => pagineViste.filter(x => x === p).length === 1),
      pagineViste.join(', '));

    // ================================================================ 20
    // Dalla 0.41.1 il riquadro è «Cantiere o fase sbagliati?» e parte dai
    // valori della bolla: la bolla dopo ritrova il SUO cantiere e la SUA fase,
    // col pulsante spento finché non si cambia qualcosa.
    registro.titolo('Caso 20 · «Cantiere o fase sbagliati?» con una scelta non mandata, poi la bolla dopo');
    for (let i = 0; i < 2; i += 1) await versoDestra();
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('#cantiere-corretto')), 'riquadro di correzione', 10000);
    const primaDellaScelta = flow.stato.ricevuti.length;
    let dialoghi = 0;
    pagina.on('dialog', () => { dialoghi += 1; });
    await pagina.selectOption('#cantiere-corretto', 'MAR');
    await aiuto.attendi(pagina, () => !document.querySelector('#rimanda').disabled, 'Rimanda acceso', 5000);
    s = await statoVisore();
    registro.dice('prima di cambiare bolla', `menù ${s.menu} · Rimanda ${s.rimandaSpento ? 'spento' : 'acceso'}`);
    await versoSinistra();
    await aiuto.attendi(pagina, () => Boolean(document.querySelector('#cantiere-corretto')), 'riquadro della bolla dopo', 10000);
    await aiuto.attendiMarcatore(pagina, () => true, 'menù della fase del riquadro pronto', { prefisso: 'c-' });
    const dopo = await quale();
    const rigaDopo = RIGHE.find(r => idClient(r.id) === dopo.id) || {};
    registro.controlla(`caso 20 · il riquadro riparte dai valori della bolla nuova (${nomeDi(dopo.id)}: ${rigaDopo.commessa} · ${rigaDopo.fase}) e Rimanda è spento`,
      dopo.menu === rigaDopo.commessa && dopo.fase === rigaDopo.fase && dopo.rimandaSpento === true,
      `menù «${dopo.menu}» · fase «${dopo.fase}» · Rimanda ${dopo.rimandaSpento ? 'spento' : 'acceso'}`);
    registro.controlla('caso 20 · la scelta non mandata si perde senza conferme e senza invii',
      dialoghi === 0 && flow.stato.ricevuti.length === primaDellaScelta,
      `${dialoghi} conferme · ${flow.stato.ricevuti.length - primaDellaScelta} invii`);
    await chiudi();

    // ============================================ 0.41.1 caso 15
    // Un elenco di una bolla sola: il filtro SNZ2.2 lascia la sola r6.
    registro.titolo('0.41.1 caso 15 · elenco di una bolla sola');
    await pagina.click('#tutto-mese');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 1, 'elenco di SNZ2.2', 10000);
    await apri('r6');
    s = await controllaTesta('0.41.1 caso 15', 'r6', '1 di 1');
    registro.controlla('0.41.1 caso 15 · una frase sola, «È l’unica bolla di questo elenco», nella testa',
      s.capo === UNICA && s.capoNellaTesta && !s.testaFissa, `«${s.capo}»`);
    registro.controlla('0.41.1 caso 15 · nessuna freccia nella pagina', s.frecce === 0, `${s.frecce} elementi`);
    await versoSinistra();
    await versoDestra();
    s = await statoVisore();
    registro.controlla('0.41.1 caso 15 · il gesto, nei due versi, non cambia niente',
      s.posizione === '1 di 1' && s.capo === UNICA, `${s.posizione} · «${s.capo}»`);
    await chiudi();

    // ================================================================ 21
    registro.titolo('Caso 21 · bolle senza la foto intera sul telefono');
    await pagina.selectOption('#commessa', '');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 8, 'elenco del mese', 10000);
    await pagina.evaluate(() => { window.__url = { creati: 0, revocati: 0 }; });
    await apri('r2');
    s = await statoVisore();
    registro.controlla('caso 21 · la sola miniatura: il messaggio di oggi, con l’immagine ridotta',
      s.immagine && /Anteprima ridotta conservata sul telefono/.test(s.contenuto) && s.menu === undefined, s.contenuto);
    await versoSinistra();
    await controllaTesta('caso 21 · e lo scorrimento funziona', 'r3', '3 di 8');
    for (let i = 0; i < 4; i += 1) await versoSinistra();
    s = await controllaTesta('caso 21 · una bolla senza nessuna immagine', 'r7', '7 di 8');
    registro.controlla('caso 21 · dice che la foto non è più sul dispositivo, senza immagine',
      !s.immagine && /non è più sul dispositivo/.test(s.contenuto), s.contenuto);
    await versoSinistra();
    await controllaTesta('caso 21 · e da lì si va avanti lo stesso', 'r8', '8 di 8');

    // Le immagini lasciate si rilasciano: dopo sei bolle ne resta presa una.
    const memoria = await pagina.evaluate(() => ({ ...window.__url }));
    registro.dice('immagini prese e rilasciate dal visore', `${memoria.creati} prese, ${memoria.revocati} rilasciate`);
    registro.controlla('le immagini lasciate si rilasciano dalla memoria: ne resta presa al massimo una',
      memoria.creati >= 5 && memoria.creati - memoria.revocati <= 1, `${memoria.creati - memoria.revocati} ancora prese`);
    await chiudi();
    const chiuso = await pagina.evaluate(() => ({ ...window.__url }));
    registro.controlla('e alla chiusura nessuna', chiuso.creati === chiuso.revocati, `${chiuso.creati - chiuso.revocati} ancora prese`);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
