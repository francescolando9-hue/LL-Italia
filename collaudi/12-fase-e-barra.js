// La fase di lavoro, in entrambi i moduli, e la barra dei comandi delle bolle.
//
// Richieste 3 e 4 del 14/09/2026. La fase è un elenco chiuso di gruppo
// (core/fasi.js) e si sceglie con Invia, come il cantiere. È **obbligatoria
// solo nel modulo Foto e solo per la categoria ARCHIVIO** (deciso da
// Francesco il 15/09): quelle foto sul server finiscono nella cartella della
// fase, e senza fase non saprebbero dove andare. Per l'avanzamento e per le
// bolle resta facoltativa. Qui si prova tutt'e due i comportamenti: dove è
// facoltativa si invia col campo vuoto, dove è obbligatoria Invia resta
// spento e l'app dice perché; e che al flow arriva con la grafia esatta.
// **Dalla 0.37.9 la fase NON si ripropone**: si sceglie a ogni invio (le 38
// bolle del 05/10/2026, decisione di Francesco del 06/10). Qui se ne prova
// l'effetto sul giro delle bolle; i tre meccanismi — memoria all'apertura,
// menù che non torna dopo Invia, fase portata al cambio di commessa — li
// prova uno per uno 20-fase-senza-memoria.js. La barra:
// con dieci bolle da mandare si finiva a scorrere su e giù per ritrovare ora
// Fotografa ora Invia — devono stare tutti e due sempre a portata di pollice.
// Nota dalla 0.36.0: qui si usano fasi SENZA livelli (`ImpiantoAscensore`,
// `ImpiantoFotovoltaico`), perché qui si prova la fase e non i livelli. `FinituraAlloggi` pretende l'unità e bloccherebbe
// l'invio: i livelli hanno il loro collaudo (15-livelli.js), e provare due
// regole nello stesso posto vuol dire non sapere quale ha fallito.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

// Il menù della fase NASCE VUOTO (dalla 0.36.0) e lo riempie la shell al primo
// ridisegno, che è asincrono. `waitForSelector('#fase')` dice solo che
// l'elemento esiste, non che abbia le sue voci: leggerlo subito dopo dà a
// volte un elenco vuoto, e il collaudo fallisce una volta su sei senza che
// nulla sia rotto. Si aspetta il marcatore `data-livelli`, che la shell scrive
// per ultimo, quando i menù sono a posto.
const attendiMenuFase = (pagina, aiuto) => aiuto.attendiMarcatore(pagina, () => true, 'menù della fase riempito');

// Il conteggio, che ha una storia: 27 date da Francesco il 14/09, meno
// «CMC 128» che lui stesso ha tolto lo stesso giorno (era un codice di
// commessa finito in un elenco di fasi) = 26; più `SistemazioneEsterna`,
// aggiunta il 18/09 = 27. Dal passaggio del gruppo a fasi e attività (24/10/2026,
// app 0.40.0) escono `Interrato` e `ImpiantiDiReteCondominiali` e entrano
// `AcquistoTerreno`, `FognaturaBianca`, `FognaturaNera` e `SpeseTecniche` = 29.
// Sta in una costante perché il numero ricompare in più controlli, e un elenco
// che si accorcia per sbaglio si vede qui.
// **Dalla 0.41.0 il menù ne mostra 26** (decisione di Francesco del 26/10/2026):
// `AcquistoTerreno`, `Marketing` e `SpeseTecniche` sono fasi della contabilità
// e le app non le offrono. `FASI` resta a 29, copia del master: le escluse
// sono dichiarate in una riga di `core/fasi.js`, e qui si riscrivono a mano per
// confrontarle con quella riga — due copie che cambiano insieme non si
// accorgerebbero di un codice scritto male.
const QUANTE_FASI = 29;
const QUANTE_NEL_MENU = 26;
const FASI_ESCLUSE = ['AcquistoTerreno', 'Marketing', 'SpeseTecniche'];

// **L'elenco è la copia di un master** (il master delle fasi e attività del
// gruppo, fasi di cantiere), e qui si controlla che sia ESATTAMENTE quella
// copia: l'impronta SHA-256 delle etichette, nell'ordine dell'elenco, deve
// essere quella del master della versione dichiarata. Una voce aggiunta, tolta,
// rinominata o spostata a mano in `core/fasi.js` fa diventare rosso il
// controllo. A ogni master nuovo si aggiornano INSIEME la versione e l'impronta,
// e l'impronta si calcola dal master, non da questo repository — altrimenti si
// confronterebbe l'app con se stessa. In JavaScript è lo SHA-256 di
// `JSON.stringify(FASI.map(f => f.etichetta))`, in UTF-8.
const VERSIONE_MASTER_FASI = '2026-10-24.3';
const IMPRONTA_ETICHETTE_FASI = '682df6edbc092d8caf2dcf7e2e0ca68c13a5a57bc4e5404a39db8b68edb0dc1d';
const FASI_TOLTE = ['Interrato', 'ImpiantiDiReteCondominiali'];

module.exports = {
  nome: 'Fase di lavoro nei due moduli, e barra dei comandi delle bolle',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    // Telefono che la fase non l'ha MAI scelta: `configura` la preimposta per
    // gli altri collaudi, qui va tolta apposta.
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20, ultimaFase: '' },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 10, limiteMB: 20, ultimaFase: '' },
    });

    const attendiRicevuti = async quanti => {
      const fine = Date.now() + 60000;
      while (flow.stato.ricevuti.length < quanti && Date.now() < fine) await new Promise(r => setTimeout(r, 300));
      return flow.stato.ricevuti.length;
    };
    // **Si aspetta «Inviata», non «arrivata al flow».** Il flow riceve la
    // richiesta prima che la pagina abbia finito di registrare la risposta: in
    // quella finestra il record è ancora su `invio`, e una `reload()` — questo
    // collaudo ne fa quattro — lo lascia lì. Dalla 0.37.1, al caricamento
    // dopo, quel record risulta interrotto e **riparte da solo**: al flow
    // arriva una richiesta in più, e i controlli fatti per posizione si
    // spostano tutti di uno. Non è un difetto dell'app, è il comportamento
    // giusto — il flow vero risponde `gia_presente` e non nasce nessun
    // doppione — ma il collaudo deve smettere di guardare mentre l'invio è a
    // metà. Trappola pagata il 30/09/2026: fallito 2 controlli su 373, e solo
    // dentro la suite completa, dove tutto è più lento.
    // Dalla 0.38.0 anche il cantiere si sceglie a ogni invio: lo sceglie qui,
    // come l'operatore. Se il cantiere è già MAR la scelta non cambia niente,
    // e soprattutto non tocca la fase già scelta.
    const mandaBolla = async file => {
      const primaInviate = await pagina.$$eval('#lista-coda .badge-inviata', e => e.length);
      await pagina.setInputFiles('#input-galleria', [materiale(file)]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
      if ((await pagina.$eval('#cantiere', e => e.value)) !== 'MAR') await pagina.selectOption('#cantiere', 'MAR');
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
      await aiuto.attendi(pagina,
        n => document.querySelectorAll('#lista-coda .badge-inviata').length > n,
        'bolla dichiarata Inviata', 60000, primaInviate);
    };

    // Caso 22 della specifica del 26/10/2026: il menù della fase su MNG, MAR,
    // TN1 e MRS ha 26 voci più il segnaposto del modulo, in ordine alfabetico
    // sull'etichetta, uguali su tutte e quattro, senza le fasi tolte e senza le
    // escluse dalle app.
    const menuSuQuattroCommesse = async (selettore, segnaposto, modulo) => {
      let primo = null;
      for (const commessa of ['MNG', 'MAR', 'TN1', 'MRS']) {
        await pagina.selectOption(selettore, commessa);
        await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${commessa}|`), `menù della fase pronto per ${commessa}`);
        const voci = await pagina.$$eval('#fase option', o => o.map(e => ({ v: e.value, t: e.textContent.trim() })));
        const etichette = voci.slice(1).map(o => o.t);
        const codiciMenu = voci.slice(1).map(o => o.v);
        const ordinate = [...etichette].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
        registro.controlla(`${modulo} · ${commessa}: «${voci[0].t}» e ${QUANTE_NEL_MENU} voci in ordine alfabetico, senza tolte né escluse`,
          segnaposto.test(voci[0].t) && voci[0].v === '' && codiciMenu.length === QUANTE_NEL_MENU
            && etichette.join('|') === ordinate.join('|')
            && ![...FASI_TOLTE, ...FASI_ESCLUSE].some(f => codiciMenu.includes(f))
            && (primo === null || primo === codiciMenu.join('|')),
          `${codiciMenu.length} voci${[...FASI_TOLTE, ...FASI_ESCLUSE].filter(f => codiciMenu.includes(f)).map(f => ` · c'è ${f}`).join('')}`);
        if (primo === null) primo = codiciMenu.join('|');
      }
    };

    registro.titolo('Bolle: la fase si sceglie da un elenco, e non è obbligatoria');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#fase');
    await attendiMenuFase(pagina, aiuto);
    const voci = await pagina.$$eval('#fase option', o => o.map(e => ({ v: e.value, t: e.textContent.trim(), d: e.disabled })));
    const scelte = voci.filter(o => o.v);
    const nomi = scelte.map(o => o.t);
    registro.dice('fasi a video', `${nomi.length}: ${nomi[0]} … ${nomi[nomi.length - 1]}`);
    registro.controlla(`senza cantiere scelto ci sono le ${QUANTE_NEL_MENU} fasi delle app`,
      nomi.length === QUANTE_NEL_MENU, String(nomi.length),
      'dalla 0.41.0 anche qui: le app non offrono le tre fasi della contabilità');
    const codici = scelte.map(o => o.v);
    registro.controlla('le due fasi tolte col passaggio del 24/10/2026 non ci sono',
      FASI_TOLTE.every(f => !codici.includes(f)), FASI_TOLTE.filter(f => codici.includes(f)).join(', ') || 'nessuna',
      '`Interrato` si legge dal piano; `ImpiantiDiReteCondominiali` è sciolta in `FognaturaNera` e `FognaturaBianca`');
    registro.controlla('né le tre escluse dalle app (AcquistoTerreno, Marketing, SpeseTecniche)',
      FASI_ESCLUSE.every(f => !codici.includes(f)), FASI_ESCLUSE.filter(f => codici.includes(f)).join(', ') || 'nessuna');
    registro.controlla('e le due fognature, entrate col passaggio, ci sono',
      ['FognaturaBianca', 'FognaturaNera'].every(f => codici.includes(f)));
    registro.controlla('«CMC 128» non c\'è più', !nomi.includes('CMC 128'), 'tolta da Francesco il 14/09: è una commessa, non una fase');

    // A video si legge l'etichetta, con gli spazi; quello che viaggia — e che
    // diventa il nome della cartella sul server — è il codice, senza spazi.
    // Se il codice avesse spazi servirebbe una tabella di conversione fra
    // colonna e cartella, cioè una seconda verità da tenere allineata.
    registro.dice('codice ed etichetta, dove differiscono',
      scelte.filter(o => o.v !== o.t).slice(0, 3).map(o => `${o.v} = «${o.t}»`));
    registro.controlla('nessun codice contiene spazi',
      scelte.every(o => !/\s/.test(o.v)),
      scelte.filter(o => /\s/.test(o.v)).map(o => o.v).join(', ') || 'nessuno');
    registro.controlla('i codici sono in PascalCase',
      scelte.every(o => /^[A-Z][A-Za-z0-9]*$/.test(o.v)),
      scelte.filter(o => !/^[A-Z][A-Za-z0-9]*$/.test(o.v)).map(o => o.v).join(', ') || 'tutti');
    registro.controlla('e le etichette restano leggibili, con gli spazi',
      scelte.some(o => /\s/.test(o.t)) && scelte.every(o => o.t.length > 0),
      'l\'operatore sceglie leggendo, non decifrando un codice');
    // L'ordine si controlla SULL'ETICHETTA, cioè sulla stringa che si legge a
    // video, con il confronto italiano senza distinzione di maiuscole e accenti:
    // non sul codice, che a video non si vede, e non sulla prima e l'ultima voce
    // — che dicono solo dove l'elenco comincia e finisce.
    const inOrdine = [...nomi].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    registro.controlla('in ordine alfabetico sull’etichetta, come si legge a video',
      nomi.join('|') === inOrdine.join('|'),
      nomi.join('|') === inOrdine.join('|') ? `${nomi[0]} … ${nomi[nomi.length - 1]}` : 'l’elenco non è in ordine');
    registro.controlla('la prima voce è «nessuna fase», selezionabile',
      voci[0].v === '' && !voci[0].d && /nessuna/i.test(voci[0].t), voci[0].t);
    registro.controlla('il campo è un menù a tendina, non testo libero',
      (await pagina.$eval('#fase', e => e.tagName.toLowerCase())) === 'select');

    registro.titolo('L’elenco è la copia esatta del master delle fasi');
    const elencoDelCodice = await pagina.evaluate(async () => {
      const { FASI, FASI_ESCLUSE_DALLE_APP, etichettaFase } = await import('./core/fasi.js');
      return {
        etichette: FASI.map(f => f.etichetta),
        codici: FASI.map(f => f.codice),
        escluse: FASI_ESCLUSE_DALLE_APP,
        etichetteEscluse: FASI_ESCLUSE_DALLE_APP.map(etichettaFase),
      };
    });
    const dalCodice = elencoDelCodice.etichette;
    const testoEtichette = JSON.stringify(dalCodice);
    const improntaEtichette = require('crypto').createHash('sha256').update(testoEtichette, 'utf8').digest('hex');
    registro.dice('master delle fasi e impronta nell’app',
      `${VERSIONE_MASTER_FASI} · ${improntaEtichette.slice(0, 16)}… · ${Buffer.byteLength(testoEtichette)} byte`);
    registro.controlla('le etichette sono quelle del master, nell’ordine del master',
      improntaEtichette === IMPRONTA_ETICHETTE_FASI,
      improntaEtichette === IMPRONTA_ETICHETTE_FASI ? 'impronta uguale'
        : `impronta diversa (${improntaEtichette.slice(0, 16)}…): un’etichetta o l’ordine sono cambiati a mano, o il master è cambiato`);
    registro.controlla(`FASI ha ${QUANTE_FASI} voci, con le tre escluse dentro`,
      dalCodice.length === QUANTE_FASI, String(dalCodice.length),
      'la lista resta una sola: le escluse si tolgono dal menù, non dalla copia del master');
    registro.dice('fasi escluse dalle app (core/fasi.js)', elencoDelCodice.escluse.join(', '));
    registro.controlla('la riga delle escluse dice AcquistoTerreno, Marketing, SpeseTecniche',
      elencoDelCodice.escluse.join('|') === FASI_ESCLUSE.join('|'), elencoDelCodice.escluse.join(', '));
    registro.controlla('e ognuna è un codice di FASI',
      elencoDelCodice.escluse.length > 0 && elencoDelCodice.escluse.every(c => elencoDelCodice.codici.includes(c)),
      elencoDelCodice.escluse.filter(c => !elencoDelCodice.codici.includes(c)).join(', ') || 'tutte',
      'un codice scritto male non escluderebbe niente, senza nessun segnale');
    registro.controlla('etichettaFase dà ancora la loro etichetta, per quello che è già in coda',
      elencoDelCodice.etichetteEscluse.join('|') === 'Acquisto terreno|Marketing|Spese tecniche',
      elencoDelCodice.etichetteEscluse.join(', '));
    const menuAtteso = dalCodice.filter((_, i) => !FASI_ESCLUSE.includes(elencoDelCodice.codici[i]));
    registro.controlla(`e il menù è FASI meno le escluse: ${QUANTE_NEL_MENU} voci, nello stesso ordine`,
      menuAtteso.join('|') === nomi.join('|'),
      'il menù legge l’elenco: se due liste diverse fossero in giro, qui si vedrebbe');

    await pagina.selectOption('#cantiere', 'MAR');
    await mandaBolla('bolla.jpg');
    await attendiRicevuti(1);
    registro.dice('senza fase → payload', `fase: ${JSON.stringify(flow.stato.ricevuti[0].fase)}`);
    registro.controlla('senza fase si invia lo stesso', flow.stato.ricevuti.length === 1);
    registro.controlla('e il campo parte vuoto, non assente',
      'fase' in flow.stato.ricevuti[0] && flow.stato.ricevuti[0].fase === '',
      'la colonna in raccolta resta vuota: è il segno che la fase non è stata indicata');
    registro.controlla('nessun avviso che chieda la fase',
      !/fase/i.test(await pagina.$eval('#avviso-cantiere', e => e.textContent)));

    registro.titolo('La fase si sceglie a ogni bolla: dopo Invia si riparte da «nessuna»');
    await pagina.selectOption('#fase', 'ImpiantoAscensore');
    await mandaBolla('bolla2.jpg');
    await attendiRicevuti(2);
    registro.controlla('la fase arriva al flow col codice dell’elenco', flow.stato.ricevuti[1].fase === 'ImpiantoAscensore');
    registro.controlla('accanto a commessa e operatore, che non cambiano',
      flow.stato.ricevuti[1].commessa === 'MAR' && flow.stato.ricevuti[1].operatore === 'Paolo Sanzarello');
    registro.controlla('subito dopo Invia la fase è tornata a «— nessuna fase —»',
      (await pagina.$eval('#fase', e => e.value)) === '',
      'fino alla 0.37.8 restava: la bolla dopo partiva con la stessa fase senza che nessuno la guardasse');
    await mandaBolla('bolla.jpg');
    await attendiRicevuti(3);
    registro.controlla('foto → Invia senza toccare il menù: la bolla parte SENZA fase',
      flow.stato.ricevuti[2].fase === '',
      'è il caso delle 38 bolle del 05/10: il vuoto dice che nessuno l’ha scelta, una fase ripetuta no');
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    await attendiMenuFase(pagina, aiuto);
    registro.controlla('e dopo una ricarica, ancora «— nessuna fase —»',
      (await pagina.$eval('#fase', e => e.value)) === '');
    await mandaBolla('bolla2.jpg');
    await attendiRicevuti(4);
    registro.controlla('una bolla senza fase resta una bolla valida', flow.stato.ricevuti[3].fase === '');
    const inCoda = await pagina.$$eval('#lista-coda .bolle-voce .riga', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    registro.dice('righe della coda', inCoda);
    registro.controlla('la coda mostra l’ETICHETTA, non il codice',
      inCoda.filter(t => /Impianto ascensore/.test(t)).length === 1
      && !inCoda.some(t => /ImpiantoAscensore/.test(t)),
      'a video si legge la fase, non un codice da decifrare');
    registro.controlla('e dove la fase non c’è non lascia un separatore vuoto',
      inCoda.every(t => !/·\s*·/.test(t)));

    registro.titolo('Bolle: Fotografa e Invia stanno in una barra fissa in basso');
    const misure = await pagina.evaluate(() => {
      const barra = document.querySelector('.barra-comandi');
      const r = barra.getBoundingClientRect();
      const stile = getComputedStyle(barra);
      return {
        posizione: stile.position,
        fondo: Math.round(window.innerHeight - r.bottom),
        contiene: [...barra.querySelectorAll('button, label')].map(e => e.id || e.getAttribute('for')),
        inviaNellaBarra: Boolean(barra.querySelector('#invia')),
        fotografaNellaBarra: Boolean(barra.querySelector('#apri-fotocamera, label[for="input-camera"]')),
        inviaNellaScheda: Boolean(document.querySelector('.scheda #invia')),
      };
    });
    registro.dice('barra', misure);
    registro.controlla('la barra è fissa', misure.posizione === 'fixed');
    registro.controlla('e sta attaccata al fondo dello schermo', misure.fondo === 0, `${misure.fondo} px dal fondo`);
    registro.controlla('contiene Invia e Fotografa', misure.inviaNellaBarra && misure.fotografaNellaBarra);
    registro.controlla('Invia non è più nella scheda: uno solo, non due', !misure.inviaNellaScheda);

    // In fondo a una coda lunga, i due pulsanti devono restare a portata.
    await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const visibili = await pagina.evaluate(() => {
      const dentro = e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0; };
      const ultimo = document.querySelector('#lista-coda li:last-child');
      const coperto = ultimo ? ultimo.getBoundingClientRect().bottom > document.querySelector('.barra-comandi').getBoundingClientRect().top : false;
      return { invia: dentro(document.querySelector('#invia')), fotografa: dentro(document.querySelector('#apri-fotocamera') || document.querySelector('label[for="input-camera"]')), ultimaRigaCoperta: coperto };
    });
    registro.controlla('scorrendo in fondo, Invia è ancora sullo schermo', visibili.invia);
    registro.controlla('e anche Fotografa', visibili.fotografa);
    registro.controlla('l’ultima riga della coda non finisce sotto la barra', !visibili.ultimaRigaCoperta);

    registro.titolo('Foto cantiere: stesso elenco, ma per l’archivio la fase è obbligatoria');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#fase');
    await attendiMenuFase(pagina, aiuto);
    const nomiFoto = await pagina.$$eval('#fase option', o => o.filter(e => e.value).map(e => e.textContent.trim()));
    registro.controlla('l’elenco è identico a quello delle bolle', nomiFoto.join('|') === nomi.join('|'),
      'due elenchi separati sarebbero due verità destinate a divergere');
    registro.controlla('e qui nessuna fase è preselezionata: sono moduli diversi',
      (await pagina.$eval('#fase', e => e.value)) === '');

    registro.titolo('Foto cantiere: le stesse 26 fasi su ogni edificio e senza anagrafica');
    // Fino alla 0.39.0 MAR, senza piani interrati, vedeva una fase in meno
    // (il filtro di `Interrato`); dalla 0.40.0 nessuna fase si nasconde per
    // commessa. Dalla 0.41.0 le app non offrono le tre fasi della contabilità:
    // 26 voci su MNG, MAR, TN1 e su MRS, che non ha anagrafica (caso 22 della
    // specifica del 26/10/2026; nelle bolle più sotto).
    await menuSuQuattroCommesse('#commessa', /scegli la fase/, 'Foto');
    const mandaFoto = async () => {
      await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
    };
    const accodaFoto = async () => {
      await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    };

    registro.titolo('Nel modulo Foto la fase è obbligatoria SEMPRE');
    // Fino alla 0.36.1 dipendeva dalla categoria: obbligatoria per l'archivio,
    // facoltativa per l'avanzamento. Dalla 0.37.0 la categoria non esiste più
    // e tutto va in archivio, quindi la regola è una: senza fase non si parte.
    // Questo è il posto dove si vedrebbe se quella semplificazione avesse
    // lasciato in giro un ramo che lascia passare un invio senza fase.
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await aiuto.attendiMarcatore(pagina, m => m.startsWith('SNZ2.2|'),
      'menù della fase pronto');
    registro.dice('aiuto sotto il campo', await pagina.$eval('#aiuto-fase', e => e.textContent.trim()));
    registro.controlla('l’app dice dove finirà la foto, prima di scattare',
      /cartella della fase/i.test(await pagina.$eval('#aiuto-fase', e => e.textContent)),
      'dirlo dopo il primo scatto sarebbe dirlo in ritardo');
    await accodaFoto();
    await aiuto.attendi(pagina, () => document.querySelector('#invia').disabled, 'Invia spento', 10000);
    registro.controlla('con una foto in attesa e nessuna fase, Invia è spento',
      await pagina.$eval('#invia', e => e.disabled));
    const avvisoArchivio = await pagina.$eval('#avviso-invio', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso nella barra', avvisoArchivio);
    registro.controlla('e il perché si legge accanto al pulsante',
      /la fase/.test(avvisoArchivio) && /server/.test(avvisoArchivio));

    registro.titolo('Scelta la fase, la foto parte');
    await pagina.selectOption('#fase', 'ImpiantoFotovoltaico');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(5);
    // Per CONTENUTO, non per posizione: solo le foto portano `tipo`, e una
    // richiesta in più (vedi `mandaBolla`) non deve poter spostare il
    // controllo su un payload che non è quello in prova.
    const foto = flow.stato.ricevuti.find(r => r && 'tipo' in r);
    registro.dice('payload foto', `fase: ${foto.fase} · tipo: ${JSON.stringify(foto.tipo)}`);
    registro.controlla('al flow arriva il CODICE, non l’etichetta', foto.fase === 'ImpiantoFotovoltaico',
      'è quello che diventa il nome della cartella sul server');
    registro.controlla('insieme al resto del contratto',
      foto.commessa === 'SNZ2.2' && foto.tipo === 'ARCHIVIO' && foto.scattoStimato);
    registro.controlla('nessuna foto è mai partita senza fase',
      flow.stato.ricevuti.filter(r => 'tipo' in r).every(r => r.fase),
      'è la garanzia su cui si regge lo smistamento per cartella sul server');
    // Prima di ricaricare si aspetta «Inviata», non l'arrivo al flow (trappola 6
    // di aiuto.js). Fino al 26/10/2026 qui si ricaricava subito: con la pagina
    // lenta il record era ancora su «invio», al caricamento ripartiva da solo
    // (è giusto: il flow vero risponde `gia_presente`) e al flow arrivava la
    // stessa foto due volte. Quella richiesta in più faceva passare in anticipo
    // l'attesa della bolla `FognaturaNera`, in fondo, e il controllo leggeva la
    // bolla di prima: rosso 3 giri su 3 a CPU ×4, 2 su 2 nella suite di Cowork.
    await aiuto.attendi(pagina, () => document.querySelectorAll('#lista-coda .badge-inviata').length >= 1,
      'foto dichiarata Inviata', 60000);
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    await attendiMenuFase(pagina, aiuto);
    registro.controlla('e alla prossima apertura si riparte da «— scegli la fase —»',
      (await pagina.$eval('#fase', e => e.value)) === ''
      && /scegli la fase/.test(await pagina.$eval('#fase', e => e.options[e.selectedIndex].textContent)),
      'dalla 0.37.9 la fase non si ricorda: si sceglie a ogni invio');

    registro.titolo('Scelta e poi tolta, l’invio si blocca di nuovo');
    // La via d'uscita che c'era per l'avanzamento non esiste più: riportare il
    // menù a «nessuna fase» non fa passare niente.
    // Il cantiere si sceglie (dalla 0.38.0 non si preseleziona più): senza,
    // Invia sarebbe spento per lui, e il controllo passerebbe per il motivo
    // sbagliato.
    await accodaFoto();
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await aiuto.attendiMarcatore(pagina, m => m.startsWith('SNZ2.2|'),
      'menù della fase pronto');
    await pagina.selectOption('#fase', 'ImpiantoFotovoltaico');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.selectOption('#fase', '');
    await aiuto.attendi(pagina, () => document.querySelector('#invia').disabled, 'Invia spento', 10000);
    registro.controlla('tornati a «— scegli la fase —», Invia si spegne',
      await pagina.$eval('#invia', e => e.disabled),
      'non c’è più una categoria che permetta di mandare una foto senza fase');

    registro.titolo('Bolle: le stesse 26 fasi, e una fase nuova non chiede nessun livello');
    // `FognaturaNera` nel modulo Foto vuole il piano; nelle bolle no: i livelli
    // sono le cartelle dell'archivio di commessa, dove le bolle non vanno.
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await attendiMenuFase(pagina, aiuto);
    await menuSuQuattroCommesse('#cantiere', /nessuna fase/, 'Bolle');
    await pagina.selectOption('#cantiere', 'MNG');
    await aiuto.attendiMarcatore(pagina, m => m.startsWith('MNG|'),
      'menù della fase pronto per MNG');
    await pagina.selectOption('#fase', 'FognaturaNera');
    registro.controlla('con FognaturaNera nessun livello chiesto: i menù dei livelli non esistono',
      (await pagina.$$('#campo-piano, #campo-unita, #campo-scala, #campo-prospetto')).length === 0);
    // Non `mandaBolla`: quella riporta il cantiere a MAR, e al cambio di cantiere
    // la fase riparte dal segnaposto — la bolla uscirebbe senza fase.
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    // La bolla si cerca fra le richieste arrivate DOPO il tocco, per contenuto
    // (le bolle non portano `tipo`) e con un `idClient` mai visto prima: non
    // «la sesta richiesta» né «l'ultima bolla». Un invio ripreso da solo dopo
    // una ricarica è una richiesta in più, e con un conteggio fisso il collaudo
    // leggeva la bolla di prima (`fase: ""`) mentre questa era ancora in viaggio.
    const primaDellaBolla = flow.stato.ricevuti.length;
    const giaVisti = new Set(flow.stato.ricevuti.map(r => r && r.idClient));
    const bollaNuova = () => flow.stato.ricevuti.slice(primaDellaBolla)
      .find(r => r && !('tipo' in r) && !giaVisti.has(r.idClient));
    await pagina.click('#invia');
    const fineAttesa = Date.now() + 60000;
    while (!bollaNuova() && Date.now() < fineAttesa) await new Promise(r => setTimeout(r, 300));
    const bollaNera = bollaNuova();
    if (!bollaNera) throw new Error('la bolla FognaturaNera non è arrivata al flow in 60 secondi');
    registro.dice('payload della bolla', `fase: ${JSON.stringify(bollaNera.fase)} · campi livello: ${
      ['piano', 'unita', 'prospetto', 'scala'].filter(c => c in bollaNera).join(', ') || 'nessuno'}`);
    registro.controlla('la bolla parte con fase FognaturaNera, senza livelli',
      bollaNera.fase === 'FognaturaNera' && !('piano' in bollaNera) && !('scala' in bollaNera));

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
