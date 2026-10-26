// Palazzina («Lotto») e parti comuni nel modulo Foto, dalla 0.39.0: 34 casi.
//
// I casi 1–28 sono la tabella della specifica, con la numerazione del master
// — la stessa del collaudo dello script, che dallo stesso payload ricava il
// percorso. I casi 29–33 li ha approvati Francesco il 13/10/2026, dopo il
// confronto del §7 punto 1, perché la tabella non li copriva:
//
//   29  «Rimanda»: correggere SOLO il lotto. Se la palazzina non entra nel
//       confronto «cambiato», il pulsante resta «Rimanda la stessa», l'idClient
//       è quello di prima, il flow risponde gia_presente e la correzione non
//       parte — senza nessun errore.
//   30  «Rimanda» di un record «Parti comuni» (il piano e il lotto del record
//       tornano nel riquadro), e un valore ricavato dall'unità che NON diventa
//       il punto di partenza del piano quando poi si passa a «Parti comuni».
//   31  il verso opposto del 25: dall'unità a «Parti comuni».
//   32  il lotto che RIPARTE quando cambia il piano (decisione del 13/10/2026).
//   33  la voce unica del lotto, che con il dato vero non scatta mai: si prova
//       con commesse sintetiche, a livello di funzioni e di vista condivisa.
//
// Dal passaggio a fasi e attività del 26/10/2026 (app 0.40.0) cambiano due
// casi della tabella e se ne aggiunge uno. Il 3, che era TN1 · `Interrato`
// col P-1 scelto dall'app, diventa TN1 · `FinituraPartiComuniInterne` col P-1
// scelto dall'operatore (`Interrato` non è più una fase). Il 28 conta 29 fasi
// e verifica che `Interrato` non ci sia. Il 34 è il caso 6 di quella
// specifica: TN1 · `FognaturaBianca` · P1 chiede il lotto.
//
// Ingresso = scelte dell'operatore; esito = i quattro campi del payload nell'ordine
// piano, unita, prospetto, scala, oppure il blocco dell'invio.
//
// Non si leggono i menù «a occhio dopo un'attesa fissa»: ogni passo aspetta che
// il ridisegno si sia assestato (due istantanee uguali di fila), perché i menù si
// rifanno in modo asincrono e un collaudo che legge le voci di un istante prima
// misura la scelta di prima — è la trappola 4ter di `aiuto.js`.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const J = JSON.stringify;

module.exports = {
  nome: 'Palazzina («Lotto») e parti comuni: 34 casi nel modulo Foto',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    // Il flow finto fa la guardia sui duplicati come quello vero: serve ai casi
    // di «Rimanda», che esiste per farsi dire `gia_presente`.
    flow.stato.deduplica = true;
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 60 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 60, limiteMB: 20 },
    });

    // ------------------------------------------------------------------ strumenti
    const foto = () => flow.stato.ricevuti.filter(r => 'tipo' in r);
    const ultimaFoto = () => foto()[foto().length - 1];
    const campoDi = (s, nome) => s.campi.find(c => c[0] === nome);
    const visibile = (s, nome) => campoDi(s, nome)[1];

    const istantanea = prefisso => pagina.evaluate(p => {
      const vis = id => {
        const e = document.querySelector(id);
        return Boolean(e) && !e.classList.contains('nascosto') && getComputedStyle(e).display !== 'none';
      };
      const val = id => { const e = document.querySelector(id); return e ? e.value : null; };
      const voci = id => [...document.querySelectorAll(`${id} option`)].filter(o => o.value).map(o => o.value);
      return {
        livelli: document.querySelector(`#${p}fase`).dataset.livelli,
        campi: ['piano', 'unita', 'scala', 'prospetto'].map(c => [c, vis(`#campo-${p}${c}`), val(`#${p}${c}`), voci(`#${p}${c}`).length]),
        unico: ['piano', 'unita', 'scala', 'prospetto'].map(c => vis(`#unico-${p}${c}`)),
        invia: document.querySelector('#invia').disabled,
      };
    }, prefisso);

    // Aspetta che il ridisegno si sia assestato: due istantanee uguali di fila.
    const assesta = async (prefisso = '') => {
      let ultima = '';
      let uguali = 0;
      const fine = Date.now() + 20000;
      while (Date.now() < fine) {
        const adesso = J(await istantanea(prefisso));
        uguali = adesso === ultima ? uguali + 1 : 0;
        ultima = adesso;
        if (uguali >= 2) return JSON.parse(adesso);
        await new Promise(r => setTimeout(r, 120));
      }
      throw new Error('i menù non si sono assestati');
    };

    const svuotaBozze = async () => {
      while (await pagina.$('.foto-rimuovi')) {
        const prima = await pagina.$$eval('.foto-anteprima', e => e.length);
        await pagina.click('.foto-rimuovi');
        await aiuto.attendi(pagina, n => document.querySelectorAll('.foto-anteprima').length < n, 'foto tolta', 10000, prima);
      }
    };

    let inviate = 0;
    // Ogni caso parte da una coda vuota. Non è solo pulizia: una riga VIDEO in
    // coda fa sbordare la pagina in orizzontale (layout viewport 482 px invece di
    // 390, misurato anche sul commit 0.38.1) e sposta fuori schermo la barra
    // «Invia», che un clic vero non raggiunge più. Il difetto è dell'app e
    // preesiste a questa modifica; qui il caso 23 manda un video, e i casi dopo
    // non devono ereditarne la riga. Si azzera il solo database delle foto: le
    // impostazioni del telefono restano.
    const apri = async () => {
      await pagina.goto(app.indirizzo + '/index.html#/foto');
      await pagina.evaluate(() => new Promise(risolvi => {
        const richiesta = indexedDB.deleteDatabase('llitalia-foto');
        richiesta.onsuccess = richiesta.onerror = richiesta.onblocked = () => risolvi();
      }));
      inviate = 0;
      await pagina.reload();
      await pagina.waitForSelector('#commessa');
      await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli !== undefined, 'menù pronti', 10000);
      await svuotaBozze();
    };

    // Un passo dell'operatore: sceglie e aspetta che i menù siano rifatti.
    const scegli = async (campo, valore, prefisso = '') => {
      await pagina.selectOption(`#${prefisso}${campo === 'commessa' ? 'commessa' : campo}`, valore);
      if (campo === 'commessa') {
        await aiuto.attendi(pagina, cod => document.querySelector('#fase').dataset.livelli.startsWith(`${cod}|`),
          `menù rifatto per ${valore}`, 10000, valore);
      } else if (campo === 'fase') {
        await aiuto.attendi(pagina, f => document.querySelector('#fase').dataset.livelli.endsWith(`|${f}`),
          `livelli rifatti per ${valore}`, 10000, valore);
      }
      return assesta(prefisso);
    };

    const aggiungi = async (genere = 'foto') => {
      if (genere === 'video') {
        // Un file piccolo con il tipo di un video: l'app non lo decodifica e lo
        // accoda senza anteprima — è quello che serve, il contenuto non conta.
        await pagina.setInputFiles('#input-video', { name: 'prova.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(2048, 1) });
      } else {
        await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
      }
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      return assesta();
    };

    const manda = async () => {
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      const prima = foto().length;
      await pagina.click('#invia');
      const fine = Date.now() + 90000;
      while (foto().length === prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      if (foto().length === prima) throw new Error('il flow non ha ricevuto l’invio');
      inviate += 1;
      // «Arrivata al flow» non vuol dire «invio finito»: si aspetta «Inviata»
      // prima di ricaricare (trappola 6 di aiuto.js).
      await aiuto.attendi(pagina, n => document.querySelectorAll('#lista-coda .badge-inviata').length >= n,
        'stato Inviata', 90000, inviate);
      return ultimaFoto();
    };

    // Nessun invio a metà: un «Rimanda la stessa» fa passare il record da Inviata
    // a In coda e di nuovo a Inviata, e ricaricare la pagina lì dentro lascia un
    // invio interrotto che riparte da solo (trappola 6 di aiuto.js).
    const attendiQuiete = () => aiuto.attendi(pagina,
      () => document.querySelectorAll('#lista-coda .badge-coda, #lista-coda .badge-invio, #lista-coda .badge-errore').length === 0,
      'coda ferma, nessun invio a metà', 60000);
    const quattro = p => [p.piano, p.unita, p.prospetto, p.scala];
    const messaggioInvio = () => pagina.$eval('#avviso-invio', e => e.textContent.replace(/\s+/g, ' ').trim());

    const verdi = [];
    const rossi = [];
    const caso = async (n, titolo, corpo) => {
      registro.titolo(`Caso ${n} · ${titolo}`);
      const prima = registro.falliti;
      try {
        await corpo();
      } catch (errore) {
        registro.controlla(`il caso ${n} arriva in fondo`, false, errore.message);
      }
      (registro.falliti === prima ? verdi : rossi).push(n);
    };

    // Un caso della tabella: cantiere, fase, passi, e l'esito atteso — i quattro
    // campi del payload, oppure il blocco dell'invio con la parola che il messaggio nomina.
    const tabella = (n, titolo, { commessa, fase, passi = [], atteso, blocca, genere = 'foto', verifica, payload }) =>
      caso(n, titolo, async () => {
        await apri();
        await scegli('commessa', commessa);
        if (fase) await scegli('fase', fase);
        for (const [campo, valore] of passi) await scegli(campo, valore);
        const s = await aggiungi(genere);
        if (verifica) await verifica(s);
        if (blocca) {
          const msg = await messaggioInvio();
          registro.dice('avviso nella barra', msg);
          registro.controlla('l’invio è bloccato', s.invia === true, 'Invia spento');
          registro.controlla(`e il messaggio nomina ${blocca.nome}`, blocca.parola.test(msg), msg);
          await svuotaBozze();
          return;
        }
        const p = await manda();
        registro.dice('payload', `piano ${J(p.piano)} · unita ${J(p.unita)} · prospetto ${J(p.prospetto)} · scala ${J(p.scala)}`);
        registro.controlla('i quattro campi del payload sono quelli attesi', J(quattro(p)) === J(atteso), J(quattro(p)));
        registro.controlla('e nessuno è una stringa vuota', quattro(p).every(v => v !== ''),
          'una colonna con «» somiglia a un dato e non lo è');
        if (payload) await payload(p);
      });

    // ------------------------------------------------------------------ casi 1-12: TN1 e MAR, palazzina
    await tabella(1, 'TN1 · Strutture · piano P1, lotto 4', {
      commessa: 'TN1', fase: 'Strutture', passi: [['piano', 'P1'], ['scala', '4']], atteso: ['P1', null, null, '4'],
    });
    await tabella(2, 'TN1 · Impermeabilizzazioni · Tetto, lotto 5', {
      commessa: 'TN1', fase: 'Impermeabilizzazioni', passi: [['piano', 'Tetto'], ['scala', '5']], atteso: ['Tetto', null, null, '5'],
      verifica: async () => {
        const lotti = await pagina.$$eval('#scala option', o => o.filter(e => e.value).map(e => e.value));
        registro.controlla('il Tetto ha un lotto per palazzina: i quattro tetti',
          lotti.join(',') === '4,5,6,7', lotti.join(' '));
      },
    });
    // Era «TN1 · Interrato · nessuna scelta», col P-1 scelto dall'app. Con
    // `Interrato` fuori dall'elenco il percorso 3 del master è questo: la fase la
    // decide l'oggetto, il piano lo sceglie l'operatore, e nessuna voce è unica.
    await caso(3, 'TN1 · FinituraPartiComuniInterne · P-1 scelto dall’operatore', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      const dopoFase = await scegli('fase', 'FinituraPartiComuniInterne');
      registro.controlla('il menù del piano si vede, coi sei piani di TN1, e nessuna voce unica',
        visibile(dopoFase, 'piano') && campoDi(dopoFase, 'piano')[3] === 6 && dopoFase.unico[0] === false,
        J(campoDi(dopoFase, 'piano')));
      registro.controlla('il piano parte dal segnaposto: il P-1 non lo sceglie più l’app',
        campoDi(dopoFase, 'piano')[2] === '', J(campoDi(dopoFase, 'piano')));
      await scegli('piano', 'P-1');
      const s = await aggiungi();
      registro.controlla('P-1 è comune alle quattro palazzine: nessun selettore «Lotto»', !visibile(s, 'scala'));
      registro.controlla('e Invia si accende con la sola scelta del piano', s.invia === false);
      const p = await manda();
      registro.dice('payload', `fase ${J(p.fase)} · piano ${J(p.piano)} · unita ${J(p.unita)} · prospetto ${J(p.prospetto)} · scala ${J(p.scala)}`);
      registro.controlla('i quattro campi del payload sono quelli attesi',
        J(quattro(p)) === J(['P-1', null, null, null]) && p.fase === 'FinituraPartiComuniInterne', J(quattro(p)));
    });
    await tabella(4, 'TN1 · Strutture · piano P-1', {
      commessa: 'TN1', fase: 'Strutture', passi: [['piano', 'P-1']], atteso: ['P-1', null, null, null],
      verifica: async s => registro.controlla('nessun selettore «Lotto»: il P-1 è comune alle quattro palazzine',
        !visibile(s, 'scala')),
    });
    await tabella(5, 'TN1 · FinituraFacciata · lotto 6, prospetto Nord', {
      commessa: 'TN1', fase: 'FinituraFacciata', passi: [['scala', '6'], ['prospetto', 'Nord']], atteso: [null, null, 'Nord', '6'],
      verifica: async s => registro.controlla('il lotto compare prima del prospetto, e tutti e due sono a video',
        visibile(s, 'scala') && visibile(s, 'prospetto') && !visibile(s, 'piano')),
    });
    await tabella(6, 'TN1 · FinituraAlloggi · unità 431', {
      commessa: 'TN1', fase: 'FinituraAlloggi', passi: [['unita', '431']], atteso: ['P3', '431', null, '4'],
      verifica: async s => {
        registro.controlla('nessun selettore «Lotto»: lo ricava l’app dall’unità', !visibile(s, 'scala'));
        const gruppo = await pagina.$eval('#unita option[value="431"]', o => o.parentElement.label);
        registro.controlla('l’unità sta nel gruppo «Lotto 4 · Piano terzo»', gruppo === 'Lotto 4 · Piano terzo', gruppo);
        const aiutoUnita = await pagina.$eval('#aiuto-unita', e => e.textContent.replace(/\s+/g, ' ').trim());
        registro.dice('aiuto sotto il menù', aiutoUnita);
        registro.controlla('e a video si leggono il piano e il lotto ricavati', /Piano P3/.test(aiutoUnita) && /Lotto 4/.test(aiutoUnita),
          'l’operatore non li ha scelti: vederli è il solo modo che ha di accorgersi se la mappa non torna');
      },
    });
    await tabella(7, 'TN1 · Cantiere', {
      commessa: 'TN1', fase: 'Cantiere', atteso: [null, null, null, null],
    });
    await tabella(8, 'MAR · Strutture · piano P1', {
      commessa: 'MAR', fase: 'Strutture', passi: [['piano', 'P1']], atteso: ['P1', null, null, null],
      verifica: async s => registro.controlla('nessun selettore «Lotto»: MAR ha tre scale ma è un edificio solo', !visibile(s, 'scala')),
    });
    await tabella(9, 'MAR · FinituraAlloggi · unità 1.03', {
      commessa: 'MAR', fase: 'FinituraAlloggi', passi: [['unita', '1.03']], atteso: ['P1', '1.03', null, null],
      verifica: async s => {
        const gruppi = await pagina.$$eval('#unita optgroup', g => g.map(x => x.label));
        registro.controlla('i gruppi restano per piano, come oggi',
          gruppi.join('|') === 'Piano terra|Piano primo|Piano secondo', gruppi.join(' | '));
        registro.controlla('e nessun selettore «Lotto»', !visibile(s, 'scala'));
      },
    });
    await tabella(10, 'TN1 · Strutture · piano P1, lotto non scelto', {
      commessa: 'TN1', fase: 'Strutture', passi: [['piano', 'P1']], blocca: { nome: 'il lotto', parola: /lotto/i },
    });
    await caso(11, 'TN1 · Strutture · piano P1: il menù «Lotto» offre quattro voci e nessuna è preselezionata', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'Strutture');
      await scegli('piano', 'P1');
      const s = await aggiungi();
      const voci = await pagina.$$eval('#scala option', o => o.filter(e => e.value).map(e => [e.value, e.textContent.trim()]));
      registro.dice('il menù offre', J(voci));
      registro.controlla('«Lotto 4» … «Lotto 7», valori 4–7',
        J(voci) === J([['4', 'Lotto 4'], ['5', 'Lotto 5'], ['6', 'Lotto 6'], ['7', 'Lotto 7']]));
      registro.controlla('nessuno è preselezionato', campoDi(s, 'scala')[2] === '' && s.invia === true,
        `valore ${J(campoDi(s, 'scala')[2])}, Invia ${s.invia ? 'spento' : 'acceso'}`);
      registro.controlla('l’etichetta del campo è «Lotto»',
        (await pagina.$eval('label[for="scala"]', e => e.textContent.trim())) === 'Lotto');
      // Un lotto fuori anagrafica non si può mandare: non c'è fra le voci, e se
      // arrivasse da fuori (un record riaperto) non vale.
      const fuori = await pagina.evaluate(async () => {
        const a = await import('./core/anagrafica.js');
        return {
          mancanti: a.livelliMancanti('TN1', 'Strutture', { piano: 'P1', scala: '9' }),
          mandare: a.livelliDaMandare('TN1', 'Strutture', { piano: 'P1', scala: '9' }),
        };
      });
      registro.controlla('un lotto fuori anagrafica («9») non si può mandare: manca ancora il lotto',
        J(fuori.mancanti) === J(['il lotto']) && fuori.mandare.scala === null, J(fuori));
      await svuotaBozze();
    });
    await tabella(12, 'TN1 · FinituraAlloggi · unità 431: il lotto è sempre quello dell’unità', {
      commessa: 'TN1', fase: 'FinituraAlloggi', passi: [['unita', '431']], atteso: ['P3', '431', null, '4'],
      payload: async () => {
        const fuori = await pagina.evaluate(async () => {
          const a = await import('./core/anagrafica.js');
          return a.livelliDaMandare('TN1', 'FinituraAlloggi', { unita: '431', scala: '7' }).scala;
        });
        registro.controlla('anche con un lotto diverso in mano, parte quello dell’unità', fuori === '4', J(fuori));
      },
    });

    // ------------------------------------------------------------------ casi 13-18: parti comuni
    await tabella(13, 'MAR · ImpiantoIdrosanitario · «Parti comuni», piano P0', {
      commessa: 'MAR', fase: 'ImpiantoIdrosanitario', passi: [['unita', 'PartiComuni'], ['piano', 'P0']],
      atteso: ['P0', 'PartiComuni', null, null],
      verifica: async s => registro.controlla('il piano si sceglie, e il lotto non c’è', visibile(s, 'piano') && !visibile(s, 'scala')),
    });
    await tabella(14, 'SNZ2.2 · ImpiantoIdrosanitario · «Parti comuni», piano P-1', {
      commessa: 'SNZ2.2', fase: 'ImpiantoIdrosanitario', passi: [['unita', 'PartiComuni'], ['piano', 'P-1']],
      atteso: ['P-1', 'PartiComuni', null, null],
      verifica: async s => registro.controlla('il menù del piano ha i 15 piani della commessa, interrato e Tetto compresi',
        campoDi(s, 'piano')[3] === 15, String(campoDi(s, 'piano')[3])),
    });
    await tabella(15, 'TN1 · ImpiantoIdrosanitario · «Parti comuni», piano P2, lotto 5', {
      commessa: 'TN1', fase: 'ImpiantoIdrosanitario', passi: [['unita', 'PartiComuni'], ['piano', 'P2'], ['scala', '5']],
      atteso: ['P2', 'PartiComuni', null, '5'],
    });
    await tabella(16, 'TN1 · ImpiantoIdrosanitario · «Parti comuni», piano P-1', {
      commessa: 'TN1', fase: 'ImpiantoIdrosanitario', passi: [['unita', 'PartiComuni'], ['piano', 'P-1']],
      atteso: ['P-1', 'PartiComuni', null, null],
      verifica: async s => registro.controlla('nessun selettore «Lotto»: l’autorimessa è comune', !visibile(s, 'scala')),
    });
    await tabella(17, 'MNG · ImpiantoIdrosanitario · «Parti comuni», piano non scelto', {
      commessa: 'MNG', fase: 'ImpiantoIdrosanitario', passi: [['unita', 'PartiComuni']],
      blocca: { nome: 'il piano', parola: /piano/i },
    });
    await caso(18, 'le tre fasi gemelle non hanno «Parti comuni»: la riga sotto il menù dice dove vanno', async () => {
      await apri();
      await scegli('commessa', 'MAR');
      const gemelle = [
        ['FinituraAlloggi', 'Per le parti comuni usa la fase Finitura parti comuni interne.'],
        ['ImpiantoElettricoAlloggi', 'Per le parti comuni usa la fase Impianto elettrico parti comuni.'],
        ['ImpiantoTermicoAlloggi', 'Per le parti comuni usa la fase Impianto termico condominiale.'],
      ];
      for (const [fase, frase] of gemelle) {
        await scegli('fase', fase);
        const voci = await pagina.$$eval('#unita option', o => o.map(e => e.value).filter(Boolean));
        const riga = await pagina.$eval('#gemella-unita', e => e.textContent.replace(/\s+/g, ' ').trim());
        registro.controlla(`${fase}: nel menù delle unità «Parti comuni» non c'è`, !voci.includes('PartiComuni'), `${voci.length} voci`);
        registro.controlla(`e sotto il menù si legge «${frase}»`, riga === frase, riga);
      }
      await scegli('fase', 'ImpiantoIdrosanitario');
      const dopo = await pagina.$$eval('#unita option', o => o.map(e => [e.value, e.parentElement.tagName]).filter(v => v[0]));
      const ultima = dopo[dopo.length - 1];
      registro.controlla('nell’idrosanitario «Parti comuni» c’è: ultima voce, fuori dai gruppi',
        ultima[0] === 'PartiComuni' && ultima[1] === 'SELECT', J(ultima));
      registro.controlla('e la riga sulle fasi gemelle sparisce',
        (await pagina.$eval('#gemella-unita', e => e.textContent.trim())) === '');
    });

    // ------------------------------------------------------------------ casi 19-23: non regressione e video
    await tabella(19, 'MNG · Strutture · piano P5 (non regressione)', {
      commessa: 'MNG', fase: 'Strutture', passi: [['piano', 'P5']], atteso: ['P5', null, null, null],
    });
    await tabella(20, 'SNZ2.2 · FinituraAlloggi · unità 1A (non regressione)', {
      commessa: 'SNZ2.2', fase: 'FinituraAlloggi', passi: [['unita', '1A']], atteso: ['P1', '1A', null, null],
    });
    await tabella(21, 'MAR · FinituraFacciata · prospetto Nord (non regressione)', {
      commessa: 'MAR', fase: 'FinituraFacciata', passi: [['prospetto', 'Nord']], atteso: [null, null, 'Nord', null],
    });
    await tabella(22, 'SNU · Lotto2 (non regressione)', {
      commessa: 'SNU', fase: 'Lotto2', atteso: [null, null, null, null],
      payload: p => registro.controlla('il lotto delle urbanizzazioni viaggia in fase, non in scala',
        p.fase === 'Lotto2' && p.scala === null, `fase ${J(p.fase)} · scala ${J(p.scala)}`),
    });
    await tabella(23, 'TN1 · Strutture · piano P1, lotto 4, video', {
      commessa: 'TN1', fase: 'Strutture', passi: [['piano', 'P1'], ['scala', '4']], atteso: ['P1', null, null, '4'], genere: 'video',
      payload: p => registro.controlla('il genere è video', p.genere === 'video', p.genere),
    });

    // ------------------------------------------------------------------ casi 24-26: cambi di contesto
    await tabella(24, 'TN1 · Strutture · P1, lotto 4, poi piano P-1', {
      commessa: 'TN1', fase: 'Strutture', passi: [['piano', 'P1'], ['scala', '4'], ['piano', 'P-1']],
      atteso: ['P-1', null, null, null],
      verifica: async s => registro.controlla('il selettore «Lotto» sparisce, e il 4 non resta in mano',
        !visibile(s, 'scala') && campoDi(s, 'scala')[2] === '', J(campoDi(s, 'scala'))),
    });
    await tabella(25, 'TN1 · Idrosanitario · «Parti comuni», P2, lotto 5, poi unità 431', {
      commessa: 'TN1', fase: 'ImpiantoIdrosanitario',
      passi: [['unita', 'PartiComuni'], ['piano', 'P2'], ['scala', '5'], ['unita', '431']],
      atteso: ['P3', '431', null, '4'],
      verifica: async s => registro.controlla('il menù del piano e quello del lotto spariscono',
        !visibile(s, 'piano') && !visibile(s, 'scala') && campoDi(s, 'piano')[2] === '' && campoDi(s, 'scala')[2] === '',
        J([campoDi(s, 'piano'), campoDi(s, 'scala')])),
    });
    await tabella(26, 'TN1 · Strutture · P1, lotto 4; poi MAR · Strutture · P1', {
      commessa: 'TN1', fase: 'Strutture',
      passi: [['piano', 'P1'], ['scala', '4'], ['commessa', 'MAR'], ['fase', 'Strutture'], ['piano', 'P1']],
      atteso: ['P1', null, null, null],
      verifica: async s => registro.controlla('su MAR nessun selettore «Lotto», e il 4 di TN1 non c’è più',
        !visibile(s, 'scala') && campoDi(s, 'scala')[2] === '', J(campoDi(s, 'scala'))),
    });

    // ------------------------------------------------------------------ caso 27: Bolle
    await caso(27, 'Bolle · TN1: nel menù, e nel payload nessun livello e nessun campo «scala»', async () => {
      await pagina.goto(app.indirizzo + '/index.html#/bolle');
      await pagina.reload();
      await pagina.waitForSelector('#cantiere');
      const menu = await pagina.$$eval('#cantiere option', o => o.filter(e => e.value).map(e => e.value));
      registro.controlla('TN1 c’è nel menù delle bolle (8 voci)', menu.includes('TN1') && menu.length === 8, menu.join(' '));
      await pagina.selectOption('#cantiere', 'TN1');
      await aiuto.attendi(pagina, () => document.querySelector('#fase').dataset.livelli.startsWith('TN1|'), 'menù rifatto per TN1', 10000);
      await pagina.selectOption('#fase', 'Strutture');
      registro.controlla('nelle bolle i menù dei livelli non esistono, il lotto compreso',
        (await pagina.$$('#campo-piano, #campo-unita, #campo-scala, #campo-prospetto, #scala')).length === 0);
      await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      const prima = flow.stato.ricevuti.length;
      await pagina.click('#invia');
      const fine = Date.now() + 60000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      const bolla = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
      registro.dice('payload della bolla', `commessa ${J(bolla.commessa)} · fase ${J(bolla.fase)} · campi ${Object.keys(bolla).filter(c => ['piano', 'unita', 'prospetto', 'scala'].includes(c)).join(',') || 'nessun livello'}`);
      registro.controlla('la commessa è TN1', bolla.commessa === 'TN1');
      registro.controlla('nessun livello e nessun campo «scala», come oggi',
        !('piano' in bolla) && !('unita' in bolla) && !('prospetto' in bolla) && !('scala' in bolla));
      await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda .badge-inviata').length >= 1, 'bolla inviata', 60000);
    });

    // ------------------------------------------------------------------ caso 28: il selettore della fase di TN1
    await caso(28, 'TN1 · selettore della fase: 29 fasi, nessun lotto di urbanizzazione', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      const etichetta = await pagina.$eval('#etichetta-fase', e => e.textContent.trim());
      const fasi = await pagina.$$eval('#fase option', o => o.filter(e => e.value).map(e => e.value));
      registro.controlla('l’etichetta è «Fase di lavoro»', etichetta === 'Fase di lavoro', etichetta);
      registro.controlla('le voci sono le 29 fasi, e Interrato non c’è più',
        fasi.length === 29 && !fasi.includes('Interrato') && !fasi.includes('ImpiantiDiReteCondominiali'), String(fasi.length));
      registro.controlla('e non c’è nessun Lotto1–Lotto3: TN1 è un edificio, non un’urbanizzazione',
        !fasi.some(f => /^Lotto\d+$/.test(f)));
    });

    // ------------------------------------------------------------------ casi 29-33: i cinque in più
    await caso(29, '«Rimanda» · correggere SOLO il lotto: «Rimanda corretta», idClient nuovo', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'Strutture');
      await scegli('piano', 'P1');
      await scegli('scala', '4');
      await aggiungi();
      const prima = await manda();
      registro.dice('primo invio', `idClient ${prima.idClient} · n. ${prima.progressivo} · P1 · lotto ${prima.scala}`);
      await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
      await pagina.click('.foto-rimanda');
      await pagina.waitForSelector('#r-manda');
      await aiuto.attendi(pagina, () => document.querySelector('#r-scala').value === '4', 'il riquadro riparte dal lotto del record', 10000);
      const s = await assesta('r-');
      registro.controlla('il riquadro ripropone fase, piano e lotto dell’invio',
        (await pagina.$eval('#r-fase', e => e.value)) === 'Strutture' && campoDi(s, 'piano')[2] === 'P1' && campoDi(s, 'scala')[2] === '4',
        J(s.campi));
      registro.controlla('senza toccare niente dice «Rimanda la stessa»',
        (await pagina.$eval('#r-manda', e => e.textContent.trim())) === 'Rimanda la stessa');
      await pagina.selectOption('#r-scala', '5');
      const cambiato = await aiuto.attendi(pagina, () => document.querySelector('#r-manda').textContent.trim() === 'Rimanda corretta',
        'il pulsante cambia da sé', 8000).then(() => true, () => false);
      registro.controlla('cambiato il solo lotto, il pulsante dice «Rimanda corretta»', cambiato,
        'se la palazzina non entra nel confronto resta «Rimanda la stessa»: l’idClient è quello di prima e la correzione non parte');
      if (!cambiato) return;
      const richieste = flow.stato.ricevuti.length;
      await pagina.click('#r-manda');
      const fine = Date.now() + 60000;
      while (flow.stato.ricevuti.length === richieste && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      const dopo = ultimaFoto();
      registro.dice('secondo invio', `idClient ${dopo.idClient} · n. ${dopo.progressivo} · piano ${dopo.piano} · lotto ${dopo.scala}`);
      registro.controlla('idClient e progressivo nuovi', dopo.idClient !== prima.idClient && dopo.progressivo === prima.progressivo + 1,
        'in raccolta deve comparire una riga diversa');
      registro.controlla('e porta il lotto corretto, con il piano di prima', dopo.scala === '5' && dopo.piano === 'P1', J(quattro(dopo)));
      inviate += 1;
      await aiuto.attendi(pagina, n => document.querySelectorAll('#lista-coda .badge-inviata').length >= n,
        'rimandata inviata', 60000, inviate);
      await attendiQuiete();
    });

    await caso(30, '«Rimanda» · un record «Parti comuni» riparte da piano e lotto; i valori ricavati dall’unità no', async () => {
      // (a) il record «Parti comuni»: piano e lotto sono scelte vere, e tornano nel riquadro.
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'ImpiantoIdrosanitario');
      await scegli('unita', 'PartiComuni');
      await scegli('piano', 'P2');
      await scegli('scala', '5');
      await aggiungi();
      const a = await manda();
      await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
      await pagina.click('.foto-rimanda');
      await pagina.waitForSelector('#r-manda');
      const riparte = await aiuto.attendi(pagina, () => document.querySelector('#r-unita').value === 'PartiComuni'
        && document.querySelector('#r-piano').value === 'P2' && document.querySelector('#r-scala').value === '5',
        'il riquadro riparte da unità, piano e lotto del record', 8000).then(() => true, () => false);
      const s = await assesta('r-');
      registro.controlla('il riquadro ripropone «Parti comuni», il piano P2 e il lotto 5',
        riparte, J(s.campi));
      registro.controlla('il menù del piano e quello del lotto sono a video', visibile(s, 'piano') && visibile(s, 'scala'));
      registro.controlla('«Rimanda la stessa» è acceso senza toccare niente',
        (await pagina.$eval('#r-manda', e => e.textContent.trim())) === 'Rimanda la stessa'
        && !(await pagina.$eval('#r-manda', e => e.disabled)));
      const giaPrima = flow.stato.giaPresenti;
      const richieste = flow.stato.ricevuti.length;
      await pagina.click('#r-manda');
      const fine = Date.now() + 60000;
      while (flow.stato.ricevuti.length === richieste && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      registro.controlla('stesso idClient, e il flow risponde gia_presente',
        ultimaFoto().idClient === a.idClient && flow.stato.giaPresenti === giaPrima + 1,
        `${ultimaFoto().idClient === a.idClient ? 'stesso id' : 'id diverso'}, gia_presente ${giaPrima} → ${flow.stato.giaPresenti}`);
      await attendiQuiete();

      // (b) il record di un'unità: il piano e il lotto sono ricavati, e non sono
      // il punto di partenza del piano se poi si passa a «Parti comuni».
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'ImpiantoIdrosanitario');
      await scegli('unita', '431');
      await aggiungi();
      const b = await manda();
      registro.dice('record di un’unità', J(quattro(b)));
      await aiuto.attendi(pagina, () => Boolean(document.querySelector('.foto-rimanda')), 'pulsante Rimanda', 20000);
      await pagina.click('.foto-rimanda');
      await pagina.waitForSelector('#r-manda');
      await aiuto.attendi(pagina, () => document.querySelector('#r-unita').value === '431', 'il riquadro riparte dall’unità', 8000);
      await assesta('r-');
      await pagina.selectOption('#r-unita', 'PartiComuni');
      const dopo = await assesta('r-');
      registro.controlla('passando a «Parti comuni» il menù del piano parte dal segnaposto, non da P3',
        visibile(dopo, 'piano') && campoDi(dopo, 'piano')[2] === '', J(campoDi(dopo, 'piano')),
        'il P3 era ricavato dall’unità: ripresentarlo sarebbe una preselezione che nessuno ha fatto');
      registro.controlla('e il lotto non c’è finché il piano non è scelto', !visibile(dopo, 'scala'));
      registro.controlla('«Rimanda» resta spento e dice che manca il piano',
        (await pagina.$eval('#r-manda', e => e.disabled)) && /piano/i.test(await pagina.$eval('#r-spiegazione', e => e.textContent)));
    });

    await caso(31, 'TN1 · Idrosanitario · dall’unità 431 a «Parti comuni»: piano e lotto ripartono vuoti', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'ImpiantoIdrosanitario');
      await scegli('unita', '431');
      await aggiungi();
      let s = await scegli('unita', 'PartiComuni');
      registro.controlla('il menù del piano compare, vuoto, e il lotto non c’è ancora',
        visibile(s, 'piano') && campoDi(s, 'piano')[2] === '' && !visibile(s, 'scala'), J(s.campi));
      registro.controlla('Invia è spento e il messaggio nomina il piano',
        s.invia === true && /piano/i.test(await messaggioInvio()), await messaggioInvio());
      s = await scegli('piano', 'P3');
      registro.controlla('scelto il piano compare il lotto, e NON è il 4 di prima',
        visibile(s, 'scala') && campoDi(s, 'scala')[2] === '', J(campoDi(s, 'scala')),
        'il 4 era ricavato dall’unità 431: non è una scelta');
      registro.controlla('Invia resta spento e il messaggio nomina il lotto',
        s.invia === true && /lotto/i.test(await messaggioInvio()), await messaggioInvio());
      await svuotaBozze();
    });

    await caso(32, 'TN1 · Strutture · il lotto riparte quando cambia il piano', async () => {
      await apri();
      await scegli('commessa', 'TN1');
      await scegli('fase', 'Strutture');
      await aggiungi();
      let s = await scegli('piano', 'P1');
      s = await scegli('scala', '4');
      registro.controlla('con P1 e il lotto 4 Invia si accende', s.invia === false && campoDi(s, 'scala')[2] === '4');
      s = await scegli('piano', 'P2');
      registro.controlla('cambiato il piano (P1 → P2) il lotto riparte dal segnaposto, anche se il 4 c’è ancora fra le voci',
        visibile(s, 'scala') && campoDi(s, 'scala')[2] === '' && campoDi(s, 'scala')[3] === 4, J(campoDi(s, 'scala')),
        'decisione di Francesco del 13/10/2026: tenerlo manderebbe la foto, in silenzio, nella palazzina del piano di prima');
      registro.controlla('Invia si spegne e il messaggio nomina il lotto',
        s.invia === true && /lotto/i.test(await messaggioInvio()), await messaggioInvio());
      s = await scegli('piano', 'P-1');
      registro.controlla('sul P-1 il lotto sparisce', !visibile(s, 'scala') && s.invia === false, J(campoDi(s, 'scala')));
      s = await scegli('piano', 'P1');
      registro.controlla('tornando da P-1 a P1 il lotto non è preselezionato',
        visibile(s, 'scala') && campoDi(s, 'scala')[2] === '' && s.invia === true, J(campoDi(s, 'scala')));
      await svuotaBozze();
    });

    await caso(33, 'la voce unica del lotto, con commesse sintetiche', async () => {
      await apri();
      // Due commesse inventate, solo in memoria di questa pagina: una con due
      // palazzine che si sovrappongono sul P1 (A: P0–P1, B: P1–P2), una con una
      // palazzina sola. Con il dato vero nessun piano ha un lotto solo: senza
      // questo il ramo non avrebbe un caso che possa fallire.
      const esito = await pagina.evaluate(async () => {
        const a = await import('./core/anagrafica.js');
        const { scappaHtml } = await import('./core/impostazioni.js');
        const piani = [
          { codice: 'P0', etichetta: 'Piano terra', ordine: 0 },
          { codice: 'P1', etichetta: 'Piano primo', ordine: 1 },
          { codice: 'P2', etichetta: 'Piano secondo', ordine: 2 },
          { codice: 'Tetto', etichetta: 'Tetto', ordine: 3 },
        ];
        a.ANAGRAFICA.commesse.SINT = {
          tipo: 'edificio', corpiDistinti: true, piani,
          unita: { P0: ['A01'], P1: ['A11', 'B11'], P2: ['B21'], Tetto: [] },
          scale: [
            { codice: 'A', piani: ['P0', 'P1'], unita: ['A01', 'A11'] },
            { codice: 'B', piani: ['P1', 'P2'], unita: ['B11', 'B21'] },
          ],
          etichetteUnita: {}, prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
        };
        a.ANAGRAFICA.commesse.MONO = {
          tipo: 'edificio', corpiDistinti: true, piani,
          unita: { P0: ['Z01'], P1: ['Z11'], P2: ['Z21'], Tetto: [] },
          scale: [{ codice: 'Z', piani: ['P0', 'P1', 'P2', 'Tetto'], unita: ['Z01', 'Z11', 'Z21'] }],
          etichetteUnita: {}, prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
        };
        const riga = (c, f, scelte) => ({
          unico: (a.livelliUnici(c, f, scelte).scala || {}).codice || null,
          mandare: a.livelliDaMandare(c, f, scelte).scala,
          mancanti: a.livelliMancanti(c, f, scelte),
        });
        const funzioni = {
          p0: riga('SINT', 'Strutture', { piano: 'P0' }),
          p1: riga('SINT', 'Strutture', { piano: 'P1' }),
          p2: riga('SINT', 'Strutture', { piano: 'P2' }),
          tetto: riga('SINT', 'Strutture', { piano: 'Tetto' }),
          facciataDue: riga('SINT', 'FinituraFacciata', { prospetto: 'Nord' }),
          facciataUna: riga('MONO', 'FinituraFacciata', { prospetto: 'Nord' }),
          stantio: riga('SINT', 'Strutture', { piano: 'P2', scala: 'A' }),
          scelta: riga('SINT', 'Strutture', { piano: 'P1', scala: 'B' }),
        };

        // La vista condivisa, su un pezzo di DOM staccato dall'app: `campiLivelli`
        // e `sincronizzaLivelli` sono quelle vere, con il prefisso `s-` perché gli
        // id non si ripetano nella stessa pagina.
        const radice = document.createElement('div');
        radice.innerHTML = a.campiLivelli('s-');
        document.body.appendChild(radice);
        const vis = id => { const e = radice.querySelector(id); return !e.classList.contains('nascosto'); };
        const sync = () => a.sincronizzaLivelli(radice, 'SINT', scappaHtml, 's-', {}, true, { faseObbligatoria: true });
        sync();
        radice.querySelector('#s-fase').value = 'Strutture';
        let r = sync();
        const vista = {};
        radice.querySelector('#s-piano').value = 'P0';
        r = sync();
        vista.p0 = {
          menuNascosto: !vis('#s-scala'), unico: vis('#unico-s-scala'),
          testo: radice.querySelector('#unico-s-scala').textContent.replace(/\s+/g, ' ').trim(),
          scala: r.scala, mancanti: r.mancanti,
        };
        radice.querySelector('#s-piano').value = 'P1';
        r = sync();
        vista.p1 = {
          menuVisibile: vis('#s-scala'), unico: vis('#unico-s-scala'),
          valore: radice.querySelector('#s-scala').value, scala: r.scala, mancanti: r.mancanti,
          voci: [...radice.querySelectorAll('#s-scala option')].filter(o => o.value).map(o => o.textContent.trim()),
        };
        radice.querySelector('#s-piano').value = 'P0';
        r = sync();
        radice.querySelector('#s-piano').value = 'P2';
        r = sync();
        vista.p2 = { unico: vis('#unico-s-scala'), scala: r.scala };
        radice.remove();
        delete a.ANAGRAFICA.commesse.SINT;
        delete a.ANAGRAFICA.commesse.MONO;
        return { funzioni, vista };
      });
      registro.dice('funzioni', esito.funzioni);
      registro.dice('vista', esito.vista);
      const f = esito.funzioni;
      registro.controlla('un piano che una sola palazzina ha (P0: solo A) ha il lotto a voce unica: parte A, e non si chiede',
        f.p0.unico === 'A' && f.p0.mandare === 'A' && f.p0.mancanti.length === 0, J(f.p0));
      registro.controlla('lo stesso per P2 (solo B)', f.p2.unico === 'B' && f.p2.mandare === 'B' && f.p2.mancanti.length === 0, J(f.p2));
      registro.controlla('un piano con due palazzine (P1: A e B) NON è a voce unica: si chiede, e finché manca Invia è bloccato',
        f.p1.unico === null && f.p1.mandare === null && f.p1.mancanti.join() === 'il lotto', J(f.p1));
      registro.controlla('scelto il lotto (B) parte quello scelto', f.scelta.mandare === 'B' && f.scelta.mancanti.length === 0, J(f.scelta));
      registro.controlla('il Tetto, che sta in nessuna scala, non ha lotto', f.tetto.mandare === null && f.tetto.mancanti.length === 0, J(f.tetto));
      registro.controlla('un lotto stantio (A) su un piano che non lo ha (P2) non vale: parte l’unico possibile, B',
        f.stantio.mandare === 'B', J(f.stantio));
      registro.controlla('nella facciata le palazzine sono tutte: due non sono voce unica, una sola sì',
        f.facciataDue.unico === null && f.facciataDue.mancanti.join() === 'il lotto'
        && f.facciataUna.unico === 'Z' && f.facciataUna.mandare === 'Z' && f.facciataUna.mancanti.length === 0,
        `${J(f.facciataDue)} · ${J(f.facciataUna)}`);
      const v = esito.vista;
      registro.controlla('a video, sul piano a voce unica il menù si nasconde e si legge «Lotto A» col perché',
        v.p0.menuNascosto && v.p0.unico && /Lotto A/.test(v.p0.testo) && /unico lotto che ha questo piano/.test(v.p0.testo) && v.p0.scala === 'A' && v.p0.mancanti.length === 0,
        J(v.p0));
      registro.controlla('passando al piano con due palazzine il menù torna e riparte dal segnaposto: la voce messa dall’app non si porta dietro',
        v.p1.menuVisibile && !v.p1.unico && v.p1.valore === '' && v.p1.scala === null && v.p1.mancanti.join() === 'il lotto'
        && v.p1.voci.join() === 'Lotto A,Lotto B', J(v.p1));
      registro.controlla('e sul piano con un solo lotto (P2) si torna alla voce unica', v.p2.unico && v.p2.scala === 'B', J(v.p2));
    });

    // ------------------------------------------------------------------ caso 34: dalla specifica del 26/10/2026
    await tabella(34, 'TN1 · FognaturaBianca · piano P1, lotto 4', {
      commessa: 'TN1', fase: 'FognaturaBianca', passi: [['piano', 'P1'], ['scala', '4']], atteso: ['P1', null, null, '4'],
      verifica: async s => registro.controlla('Fognatura bianca chiede il piano e poi il lotto, come le altre fasi per piano',
        visibile(s, 'piano') && visibile(s, 'scala') && !visibile(s, 'unita') && !visibile(s, 'prospetto')),
      payload: async p => registro.controlla('la fase è FognaturaBianca: a valle FognaturaBianca\\S4\\P1\\',
        p.fase === 'FognaturaBianca', J(p.fase)),
    });

    // ------------------------------------------------------------------ i numeri attesi
    registro.titolo('I numeri');
    registro.dice('casi verdi', `${verdi.length} su 34${rossi.length ? ` — rossi: ${rossi.join(', ')}` : ''}`);
    registro.controlla('34 casi verdi su 34', verdi.length === 34 && rossi.length === 0, rossi.length ? `rossi: ${rossi.join(', ')}` : 'tutti');

    await apri();
    const menuFoto = await pagina.$$eval('#commessa option', o => o.filter(e => e.value).map(e => e.value));
    registro.controlla('il menù delle commesse ha 8 voci, in foto', menuFoto.length === 8, menuFoto.join(' '));

    await scegli('commessa', 'TN1');
    await scegli('fase', 'Strutture');
    const piani = await pagina.$$eval('#piano option', o => o.filter(e => e.value).map(e => e.value));
    registro.controlla('TN1: 6 piani', piani.length === 6, piani.join(' '));
    const lottiPerPiano = {};
    for (const piano of piani) {
      const s = await scegli('piano', piano);
      lottiPerPiano[piano] = visibile(s, 'scala') ? campoDi(s, 'scala')[3] : 0;
    }
    registro.dice('lotti offerti per piano', lottiPerPiano);
    registro.controlla('4 lotti per ciascuno di P0, P1, P2, P3 e Tetto, nessuno per P-1',
      ['P0', 'P1', 'P2', 'P3', 'Tetto'].every(p => lottiPerPiano[p] === 4) && lottiPerPiano['P-1'] === 0, J(lottiPerPiano));

    await scegli('fase', 'FinituraAlloggi');
    const unita = await pagina.$$eval('#unita option', o => o.filter(e => e.value).length);
    const gruppi = await pagina.$$eval('#unita optgroup', g => g.map(x => x.label));
    registro.controlla('TN1: 64 unità in 16 gruppi (4 lotti × 4 piani)', unita === 64 && gruppi.length === 16, `${unita} unità in ${gruppi.length} gruppi`);
    registro.controlla('nell’ordine del dato: Lotto 4 · Piano terra … Lotto 7 · Piano terzo',
      gruppi[0] === 'Lotto 4 · Piano terra' && gruppi[3] === 'Lotto 4 · Piano terzo'
      && gruppi[4] === 'Lotto 5 · Piano terra' && gruppi[15] === 'Lotto 7 · Piano terzo', `${gruppi[0]} … ${gruppi[15]}`);
    await scegli('fase', 'ImpiantoIdrosanitario');
    const idrosanitario = await pagina.$$eval('#unita option', o => o.filter(e => e.value).length);
    registro.controlla('in ImpiantoIdrosanitario 65 voci nel menù delle unità (64 più «Parti comuni»)', idrosanitario === 65, String(idrosanitario));

    const codici = await pagina.evaluate(async () => {
      const a = await import('./core/anagrafica.js');
      const { CANTIERI } = await import('./core/cantieri.js');
      return CANTIERI.map(c => c.codice).filter(c => a.unitaDi(c).some(u => u.codice === a.codicePartiComuni()));
    });
    registro.controlla('«PartiComuni» non è il codice di nessuna unità, in nessuna commessa', codici.length === 0, codici.join(' ') || 'nessuna');

    const vuoti = foto().filter(r => r.scala === '' || r.piano === '' || r.unita === '' || r.prospetto === '');
    registro.dice('invii di foto esaminati', String(foto().length));
    registro.controlla('«scala» non è mai «» in nessun payload del collaudo, né gli altri tre campi',
      vuoti.length === 0 && foto().every(r => 'scala' in r), vuoti.length ? `${vuoti.length} invii con «»` : 'nessuno');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
