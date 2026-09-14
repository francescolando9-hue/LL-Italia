// La gerarchia visiva: cosa si tocca deve essere la cosa più grande a video.
//
// Segnalato dal cantiere il 14/09/2026, aprendo la 0.31.0: «mi viene da
// premere "usa la fotocamera del telefono"». Era vero e misurabile — quel
// pulsante era alto 76 px con testo a 1,3 rem, mentre l'azione principale
// nella barra in basso stava a 1 rem: il più grande sullo schermo era la via
// di riserva. Qui si misura che l'ordine sia quello giusto, in entrambi i
// moduli, perché «sembra a posto» non è un collaudo.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

// Le misure concordate col cantiere, in pixel e non in rapporti: l'azione
// principale sta a 64, le azioni di contorno a 52. Il 15/09 le seconde sono
// state alzate da 46 a 52 — «leggermente più grandi, non troppo però» — e
// questo è il tetto: sopra, l'etichetta va a capo e il pulsante torna alto
// quanto la barra.
//
// Si misura l'ALTEZZA, non l'area: un pulsante largo e basso non chiama come
// uno alto e pieno di colore. E si guarda il riempimento — fuori dalla barra
// nessun pulsante deve essere pieno di COLORE. Il bianco della scheda non
// conta: contarlo ha portato a togliere il bordo blu alle alternative, e dal
// cantiere è tornato «sembrano spenti».
const ALTEZZA_PRINCIPALE = 64;
const TETTO_CONTORNO = 54;

// Schermo stretto ma reale (iPhone SE, Android piccoli): lì l'etichetta a capo
// ci sta, purché il pulsante resti comunque più basso dell'azione principale.
const STRETTO = 320;

async function misura(pagina) {
  return pagina.evaluate(() => {
    const area = e => { const r = e.getBoundingClientRect(); return Math.round(r.width * r.height); };
    const descrivi = e => ({
      testo: e.textContent.replace(/\s+/g, ' ').trim(),
      altezza: Math.round(e.getBoundingClientRect().height),
      area: area(e),
      corpo: Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10,
      pieno: !['rgba(0, 0, 0, 0)', 'transparent', 'rgb(255, 255, 255)'].includes(getComputedStyle(e).backgroundColor),
      righe: righeDi(e),
    });
    // Quante righe occupa davvero l'etichetta. L'altezza del PULSANTE non lo
    // dice — `min-height` lo stira comunque, e una riga e due si confondono —
    // quindi si misura il testo, con un Range sul contenuto.
    function righeDi(e) {
      const intervallo = document.createRange();
      intervallo.selectNodeContents(e);
      const testo = intervallo.getBoundingClientRect().height;
      return Math.max(1, Math.round(testo / parseFloat(getComputedStyle(e).lineHeight)));
    }
    const principale = document.querySelector('.barra-comandi .btn-primario');
    const invia = document.querySelector('.barra-comandi #invia');
    const alternative = [...document.querySelectorAll('.azioni-alternative .btn')].map(descrivi);
    // Tutto ciò che è premibile fuori dalla barra: nessuno di questi deve
    // essere più vistoso dell'azione principale.
    const fuori = [...document.querySelectorAll('.vista .btn')]
      .filter(e => !e.closest('.barra-comandi'))
      .filter(e => e.getBoundingClientRect().height > 0)
      .map(descrivi);
    return {
      principale: descrivi(principale),
      invia: descrivi(invia),
      alternative,
      fuori,
      barraInFondo: Math.round(window.innerHeight
        - document.querySelector('.barra-comandi').getBoundingClientRect().bottom),
    };
  });
}

module.exports = {
  nome: 'Gerarchia visiva: l’azione principale è la più grande a video',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20 },
    });

    for (const [modulo, rotta] of [['Bolle', '#/bolle'], ['Foto cantiere', '#/foto']]) {
      registro.titolo(`${modulo}: aprendo l’app, il pulsante più grande è quello giusto`);
      await pagina.goto(app.indirizzo + '/index.html' + rotta);
      await pagina.waitForSelector('.barra-comandi .btn-primario');
      // Il foglio di stile del modulo si aggiunge a pagina già disegnata:
      // misurare prima che sia applicato dà le misure della shell e basta.
      await aiuto.attendi(pagina, () => [...document.styleSheets].some(f => /modules\//.test(f.href || '')),
        'foglio di stile del modulo applicato', 20000);
      const m = await misura(pagina);
      registro.dice('azione principale', `«${m.principale.testo}» — ${m.principale.altezza} px, corpo ${m.principale.corpo} px`);
      registro.dice('alternative', m.alternative.map(a => `«${a.testo}» ${a.altezza} px`));

      registro.controlla('la barra è appoggiata al fondo dello schermo', m.barraInFondo === 0, `${m.barraInFondo} px`);
      registro.controlla(`l’azione principale è alta ${ALTEZZA_PRINCIPALE} px`,
        m.principale.altezza === ALTEZZA_PRINCIPALE, `${m.principale.altezza} px`);
      registro.controlla('e Invia è grande uguale', m.invia.altezza === m.principale.altezza,
        `${m.invia.altezza} px contro ${m.principale.altezza}`);
      registro.controlla('le alternative ci sono ancora', m.alternative.length >= 1,
        'la fotocamera di sistema resta la via d’uscita quando quella interna non basta');
      registro.controlla(`ogni alternativa sta entro ${TETTO_CONTORNO} px`,
        m.alternative.every(a => a.altezza <= TETTO_CONTORNO),
        m.alternative.map(a => `${a.testo}: ${a.altezza} px`).join(' · '));
      registro.controlla('e l’etichetta sta in una riga sola',
        m.alternative.every(a => a.righe === 1),
        m.alternative.map(a => `${a.testo}: ${a.righe} riga/e`).join(' · '));
      // Accorciare il TESTO per far stare il pulsante è una scorciatoia sulla
      // chiarezza: «Del telefono» sta in una riga e non dice niente. Si
      // accorcia la misura, non il nome.
      registro.controlla('e dice per esteso cosa fa, non un frammento',
        m.alternative.every(a => a.testo.replace(/[^\p{L} ]/gu, '').trim().split(/\s+/).length >= 3),
        m.alternative.map(a => a.testo).join(' · '));

      const troppoAlti = m.fuori.filter(e => e.altezza > TETTO_CONTORNO);
      const pieni = m.fuori.filter(e => e.pieno);
      registro.dice('pulsanti fuori dalla barra', m.fuori.map(e => `«${e.testo}» ${e.altezza} px${e.pieno ? ', PIENO' : ''}`));
      registro.controlla(`nessun pulsante fuori dalla barra supera i ${TETTO_CONTORNO} px`,
        troppoAlti.length === 0,
        troppoAlti.map(e => `${e.testo} (${e.altezza} px)`).join(', ') || 'nessuno — è la regola che la 0.31.0 violava');
      registro.controlla('e nessuno è pieno di colore: il colore pieno è della barra',
        pieni.length === 0, pieni.map(e => e.testo).join(', ') || 'nessuno');
      registro.controlla('l’azione principale ha il corpo più grande',
        m.fuori.every(e => m.principale.corpo > e.corpo),
        `${m.principale.corpo} px contro ${Math.max(...m.fuori.map(e => e.corpo))} px`);
      registro.controlla('nessuna delle alternative si chiama ancora come l’azione principale',
        m.alternative.every(a => a.testo !== m.principale.testo));
    }

    registro.titolo(`Su uno schermo da ${STRETTO} px l’etichetta va a capo, ma il pulsante resta più basso`);
    // Il telefono di chi prova non è l'unico telefono: a 320 px «Usa la
    // fotocamera del telefono» in una riga non ci sta, e con l'interlinea
    // normale quel pulsante arriverebbe a 66 px — più alto della barra.
    await pagina.setViewportSize({ width: STRETTO, height: 800 });
    for (const [modulo, rotta] of [['Bolle', '#/bolle'], ['Foto cantiere', '#/foto']]) {
      await pagina.goto(app.indirizzo + '/index.html' + rotta);
      await pagina.waitForSelector('.barra-comandi .btn-primario');
      await aiuto.attendi(pagina, () => [...document.styleSheets].some(f => /modules\//.test(f.href || '')),
        'foglio di stile del modulo applicato', 20000);
      const s = await misura(pagina);
      registro.dice(`${modulo} a ${STRETTO} px`,
        s.alternative.map(a => `«${a.testo}» ${a.altezza} px, ${a.righe} riga/e`));
      registro.controlla(`${modulo}: nessuna alternativa arriva all’azione principale`,
        s.alternative.every(a => a.altezza < s.principale.altezza),
        `principale ${s.principale.altezza} px`);
    }
    await pagina.setViewportSize({ width: 390, height: 844 });

    registro.titolo('Quello che manca per inviare si legge accanto al pulsante spento');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await pagina.selectOption('#cantiere', '');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    const dove = await aiuto.attendi(pagina, () => {
      const e = document.querySelector('#avviso-cantiere');
      const t = e ? e.textContent.trim() : '';
      if (!t) return false;
      const barra = document.querySelector('.barra-comandi');
      return {
        testo: t,
        dentroLaBarra: barra.contains(e),
        distanzaDaInvia: Math.round(Math.abs(
          e.getBoundingClientRect().bottom - document.querySelector('#invia').getBoundingClientRect().top)),
        inviaSpento: document.querySelector('#invia').disabled,
      };
    }, 'avviso di cosa manca', 20000);
    registro.dice('avviso', dove);
    registro.controlla('Invia è spento', dove.inviaSpento);
    registro.controlla('e il perché sta dentro la barra, non in cima alla scheda', dove.dentroLaBarra,
      'da lassù, con la coda lunga, non si vedeva');
    registro.controlla('a pochi pixel dal pulsante', dove.distanzaDaInvia < 24, `${dove.distanzaDaInvia} px`);

    registro.titolo('Con la barra in basso, l’avviso di aggiornamento non la copre');
    // Si misura contro i PULSANTI, non contro il riquadro della barra: è dei
    // pulsanti che nessuno deve poter rubare il tocco.
    const conAvviso = await pagina.evaluate(() => {
      const finto = document.createElement('div');
      finto.className = 'barra-aggiornamento';
      finto.innerHTML = '<span>Versione aggiornata pronta</span><button>Aggiorna</button>';
      document.body.appendChild(finto);
      const avviso = finto.getBoundingClientRect();
      const copre = [...document.querySelectorAll('.barra-comandi .btn')]
        .filter(b => avviso.top < b.getBoundingClientRect().bottom)
        .map(b => b.textContent.replace(/\s+/g, ' ').trim());
      const invia = document.querySelector('#invia').getBoundingClientRect();
      const esito = {
        copre,
        avvisoAlto: Math.round(avviso.height),
        margine: Math.round(avviso.top - invia.bottom),
        inviaAncoraVisibile: invia.top >= 0 && invia.bottom <= window.innerHeight,
      };
      finto.remove();
      return esito;
    });
    registro.dice('con l’avviso a video', conAvviso);
    registro.controlla('l’avviso non copre nessuno dei due pulsanti',
      conAvviso.copre.length === 0, conAvviso.copre.join(', ') || 'nessuno');
    registro.controlla('e i pulsanti restano sullo schermo', conAvviso.inviaAncoraVisibile);

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
