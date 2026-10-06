// I livelli dell'archivio: lotto, piano, unità, prospetto.
//
// Deciso da Francesco il 18/09/2026: sotto la fase l'archivio di commessa
// guadagna un livello, e dove quel livello è obbligatorio sostituisce la
// cartella del mese. Tre regole, e tre modi di sbagliarle in silenzio:
//
//  1. il LOTTO prende il posto della fase per le urbanizzazioni (SNU, BRU), e
//     viaggia nello stesso campo `fase`;
//  2. PIANO, UNITÀ e PROSPETTO compaiono solo dove la fase li pretende, e dove
//     compaiono sono obbligatori — non esistono livelli facoltativi;
//  3. con l'unità il PIANO NON SI CHIEDE: si ricava dalla mappa
//     dell'anagrafica e si manda comunque.
//
// La prova che conta è la 3, e va fatta sul caso che può fallire. Dedurre il
// piano dal codice dell'unità funziona su `1A` → `P1` e su `1.01` → `P1`, e
// sbaglia su `10A`, che un «primo carattere» qualunque manderebbe a `P1`
// invece che a `P10`. Un collaudo che provasse solo `1A` non distinguerebbe la
// mappa da una deduzione sbagliata: passerebbe in entrambi i casi, e
// l'archivio comincerebbe a riempirsi di foto nell'appartamento di un altro
// piano senza che nulla lo segnali.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

module.exports = {
  nome: 'Livelli dell’archivio: lotto, piano, unità, prospetto',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
      foto: { endpoint: flow.endpoint('foto'), token: 'PROVA', conservaUltime: 20, limiteMB: 20 },
    });

    const voci = async selettore => pagina.$$eval(`${selettore} option`,
      o => o.filter(e => e.value).map(e => e.value));
    const visibile = async id => pagina.$eval(id, e => !e.classList.contains('nascosto')
      && getComputedStyle(e).display !== 'none');

    // Cambiare commessa e ASPETTARE che i menù si siano rifatti. Il ridisegno
    // è asincrono — legge la coda prima di toccare la vista — quindi leggere
    // le voci subito dopo `selectOption` legge quelle della commessa di prima:
    // un collaudo che misura il passato, e che passa o fallisce a caso. Si
    // attende la chiave con cui il menù dichiara per quale commessa è stato
    // costruito.
    const scegliCommessa = async (selettore, codice) => {
      await pagina.selectOption(selettore, codice);
      await aiuto.attendi(pagina, cod =>
        document.querySelector('#fase').dataset.livelli.startsWith(`${cod}|`),
        `menù della fase rifatto per ${codice}`, 10000, codice);
    };

    // Un invio completo dal modulo Foto: categoria, commessa, fase, livelli.
    const mandaFoto = async (commessa, fase, livelli = {}) => {
      const prima = flow.stato.ricevuti.length;
      await pagina.selectOption('#commessa', commessa);
      await pagina.selectOption('#fase', fase);
      for (const [campo, valore] of Object.entries(livelli)) {
        await pagina.selectOption(`#${campo}`, valore);
      }
      await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
      const fine = Date.now() + 90000;
      while (flow.stato.ricevuti.length === prima && Date.now() < fine) {
        await new Promise(r => setTimeout(r, 300));
      }
      return flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    };

    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    // La categoria si sceglie una volta e resta: senza, l'app rifiuta i file
    // prima di guardare i livelli, perché è la categoria a decidere come
    // l'immagine viene preparata.

    // Scegliere la FASE e aspettare che i menù dei livelli si siano rifatti:
    // il marcatore `data-livelli` dice per quale coppia commessa/fase sono
    // costruiti, e finché non combacia si stanno leggendo quelli di prima.
    const scegliFase = async codice => {
      await pagina.selectOption('#fase', codice);
      await aiuto.attendi(pagina, cod =>
        document.querySelector('#fase').dataset.livelli.endsWith(`|${cod}`),
        `livelli rifatti per ${codice}`, 10000, codice);
    };

    // L'elenco delle fasi vive in DUE posti dentro l'app: `core/fasi.js` dice
    // quali sono (codice + etichetta), `core/anagrafica.js` dice cosa ognuna
    // pretende. Non sono due copie — sono due fatti diversi sulla stessa lista
    // — ma le chiavi devono combaciare, e finché non c'era questo controllo una
    // divergenza non faceva rumore: una fase presente in `fasi.js` e assente in
    // `anagrafica.js` risulta «senza livelli», quindi si può scegliere e la foto
    // parte — e finisce nella cartella del mese invece che in quella del piano.
    // Aggiunto il 18/09/2026, quando è entrata `SistemazioneEsterna`.
    registro.titolo('I due posti dove vivono le fasi dicono la stessa cosa');
    const coerenza = await pagina.evaluate(async () => {
      const fasi = await import('./core/fasi.js');
      const ana = await import('./core/anagrafica.js');
      const codici = fasi.FASI.map(f => f.codice);
      const chiavi = Object.keys(ana.ANAGRAFICA.livelliPerFase);
      const lotti = chiavi.filter(k => /^Lotto\d+$/.test(k));
      return {
        fasi: codici,
        senzaRegola: codici.filter(c => !chiavi.includes(c)),
        regolaSenzaFase: chiavi.filter(k => !lotti.includes(k) && !codici.includes(k)),
        lotti,
        versioneAnagrafica: ana.VERSIONE_ANAGRAFICA,
      };
    });
    registro.dice('fasi nell’elenco', String(coerenza.fasi.length));
    registro.dice('versione dell’anagrafica', coerenza.versioneAnagrafica);
    registro.controlla('ogni fase dell’elenco ha la sua riga nell’anagrafica',
      coerenza.senzaRegola.length === 0, coerenza.senzaRegola.join(' · ') || 'tutte',
      'una fase senza riga risulta «senza livelli»: si può scegliere, la foto parte, e finisce nella cartella sbagliata senza far rumore');
    registro.controlla('e l’anagrafica non ha righe per fasi che non esistono',
      coerenza.regolaSenzaFase.length === 0, coerenza.regolaSenzaFase.join(' · ') || 'nessuna');
    registro.controlla('i codici di lotto sono i tre attesi',
      coerenza.lotti.join(',') === 'Lotto1,Lotto2,Lotto3', coerenza.lotti.join(' '),
      'Lotto4 è uscito dal master il 05/10/2026: SNU ha tre lotti, come BRU');
    registro.controlla('in ordine alfabetico',
      coerenza.fasi.join(',') === [...coerenza.fasi].sort((a, b) => a.localeCompare(b, 'it')).join(','),
      'in un elenco di ventisette voci si cerca per lettera, non per abitudine');

    // **L'anagrafica è la copia di un master che vive su L:**, e qui si
    // controlla che sia ESATTAMENTE quella copia: l'impronta SHA-256 della
    // sua forma canonica — chiavi ordinate, nessuno spazio, UTF-8 — deve
    // essere quella del master della versione dichiarata. L'impronta è stata
    // calcolata due volte in modo indipendente il 05/10/2026: in Python dal
    // JSON del master, come la può rifare Cowork sul file su L:, e in
    // JavaScript dal blocco dell'app. Coincidevano.
    //
    // Serve a due cose: una voce corretta a mano nel repo fa diventare rosso
    // questo controllo (si rigenera dal master, non si ritocca), e un master
    // cambiato su L: senza riallineare l'app si vede confrontando due
    // numeri, invece di accorgersene da una foto finita nella cartella
    // sbagliata. È quello che è successo fra il 04 e il 05/10: il master è
    // cambiato due volte e l'app no.
    //
    // A ogni nuovo master: si rigenera il blocco, e si aggiornano INSIEME
    // `VERSIONE_MASTER` e `IMPRONTA_MASTER`, l'impronta calcolata dal file
    // del master e non dall'app — altrimenti il controllo confronterebbe
    // l'app con se stessa.
    const VERSIONE_MASTER = '202610050932';
    const IMPRONTA_MASTER = '0e736ea7f4c00ae5b597047695048b788df6aa75687713178fe35fe66022f3e6';
    registro.titolo('L’anagrafica è la copia esatta del master');
    const copia = await pagina.evaluate(async () => {
      const ana = await import('./core/anagrafica.js');
      const canonico = v => Array.isArray(v) ? `[${v.map(canonico).join(',')}]`
        : v && typeof v === 'object'
          ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`
          : JSON.stringify(v);
      return { versione: ana.ANAGRAFICA.versione, testo: canonico(ana.ANAGRAFICA) };
    });
    const impronta = require('crypto').createHash('sha256').update(copia.testo, 'utf8').digest('hex');
    registro.dice('versione e impronta nell’app', `${copia.versione} · ${impronta.slice(0, 16)}… · ${Buffer.byteLength(copia.testo)} byte`);
    registro.controlla('la versione è quella del master', copia.versione === VERSIONE_MASTER,
      `app ${copia.versione} · master ${VERSIONE_MASTER}`);
    registro.controlla('e il contenuto è identico, voce per voce', impronta === IMPRONTA_MASTER,
      impronta === IMPRONTA_MASTER ? 'impronta uguale'
        : `impronta diversa (${impronta.slice(0, 16)}…): qualcosa è stato ritoccato a mano, o il master è cambiato`);

    // I numeri del master, scritti a mano: l'impronta dice SE qualcosa è
    // cambiato, questi dicono COSA — ed è la riga che si legge quando
    // l'impronta diventa rossa.
    const numeri = await pagina.evaluate(async () => {
      const a = await import('./core/anagrafica.js');
      const { FASI } = await import('./core/fasi.js');
      const edifici = ['MAR', 'MNG', 'SNZ2.2'];
      const out = { voci: Object.keys(a.ANAGRAFICA.livelliPerFase).length, edifici: {}, lotti: {} };
      for (const c of edifici) {
        const p = a.pianiDi(c);
        out.edifici[c] = {
          piani: p.length,
          ultimo: p[p.length - 1].codice,
          crescente: p.every((x, i) => i === 0 || Number(x.ordine) > Number(p[i - 1].ordine)),
          unita: a.unitaDi(c).length,
          unitaSulTetto: a.unitaDi(c).filter(u => u.piano === 'Tetto').length,
          tettoInInterrato: a.pianiPerFase(c, 'Interrato').some(x => x.codice === 'Tetto'),
        };
      }
      for (const c of ['SNU', 'BRU']) out.lotti[c] = a.lottiDi(c).map(l => l.codice || l);
      let combinazioni = 0;
      const uniche = [];
      for (const c of edifici) {
        for (const f of FASI.map(x => x.codice)) {
          const regola = a.ANAGRAFICA.livelliPerFase[f];
          const unici = a.livelliUnici(c, f);
          for (const liv of ['piano', 'unita', 'prospetto']) {
            if (regola[liv] !== 'O') continue;
            combinazioni += 1;
            if (unici[liv]) uniche.push(`${c} · ${f} · ${unici[liv].codice}`);
          }
        }
      }
      out.combinazioni = combinazioni;
      out.uniche = uniche;
      return out;
    });
    registro.dice('numeri dell’anagrafica', numeri);
    registro.controlla('30 voci per fase: 27 fasi e 3 lotti', numeri.voci === 30, String(numeri.voci));
    registro.controlla('piani: MAR 4, MNG 12, SNZ2.2 15',
      numeri.edifici.MAR.piani === 4 && numeri.edifici.MNG.piani === 12 && numeri.edifici['SNZ2.2'].piani === 15);
    registro.controlla('in tutti e tre il Tetto è l’ultimo piano, e l’ordine sale dal più basso',
      Object.values(numeri.edifici).every(e => e.ultimo === 'Tetto' && e.crescente),
      'i piani stanno nel loro ordine proprio, non in ordine alfabetico: «P10» prima di «P2» non vuol dire niente');
    registro.controlla('nessuna unità sul Tetto',
      Object.values(numeri.edifici).every(e => e.unitaSulTetto === 0),
      'il Tetto è un piano a sé, non una parte comune e non un alloggio');
    registro.controlla('unità invariate: MAR 15, MNG 16, SNZ2.2 51',
      numeri.edifici.MAR.unita === 15 && numeri.edifici.MNG.unita === 16 && numeri.edifici['SNZ2.2'].unita === 51);
    registro.controlla('e il filtro di Interrato esclude il Tetto',
      Object.values(numeri.edifici).every(e => !e.tettoInInterrato),
      'ordine positivo: «Interrato, Tetto» non è una cartella che qualcuno cerchi');
    registro.controlla('lotti: SNU 3, BRU 3',
      numeri.lotti.SNU.join(',') === 'Lotto1,Lotto2,Lotto3' && numeri.lotti.BRU.join(',') === 'Lotto1,Lotto2,Lotto3');
    registro.controlla('voce unica: una sola combinazione su 45, SNZ2.2 · Interrato · P-1',
      numeri.combinazioni === 45 && numeri.uniche.length === 1 && numeri.uniche[0] === 'SNZ2.2 · Interrato · P-1',
      `${numeri.combinazioni} combinazioni, a voce unica: ${numeri.uniche.join(' ; ') || 'nessuna'}`);

    registro.titolo('Urbanizzazioni: al posto delle fasi, i lotti');
    await scegliCommessa('#commessa', 'SNU');
    const lottiSNU = await voci('#fase');
    registro.dice('SNU offre', lottiSNU.join(' '));
    registro.controlla('SNU ha tre lotti, e Lotto4 non c’è più',
      lottiSNU.join(',') === 'Lotto1,Lotto2,Lotto3',
      'tolto dal master il 05/10/2026: mandarlo lo farebbe depositare come «codice di fase sconosciuto»');
    registro.controlla('l’etichetta del campo dice «Lotto», non «Fase di lavoro»',
      (await pagina.$eval('#etichetta-fase', e => e.textContent.trim())) === 'Lotto');
    registro.controlla('a video il lotto ha lo spazio, nel valore no',
      (await pagina.$$eval('#fase option', o => o.map(e => e.textContent.trim()))).includes('Lotto 2'),
      'il codice diventa il nome della cartella e non può avere spazi; a video si legge normale');
    registro.controlla('e non c’è nessuna fase fra le voci',
      !lottiSNU.some(v => /^(Bonifica|Strutture|FinituraAlloggi)$/.test(v)));

    await scegliCommessa('#commessa', 'BRU');
    const lottiBRU = await voci('#fase');
    registro.dice('BRU offre', lottiBRU.join(' '));
    registro.controlla('BRU ha tre lotti', lottiBRU.join(',') === 'Lotto1,Lotto2,Lotto3',
      'tre e non quattro: l’elenco è per commessa, non uno per tutte');

    await scegliCommessa('#commessa', 'MAR');
    registro.controlla('su un edificio l’etichetta torna «Fase di lavoro»',
      (await pagina.$eval('#etichetta-fase', e => e.textContent.trim())) === 'Fase di lavoro');

    registro.titolo('Il filtro su Interrato, nei due versi');
    const fasiMAR = await voci('#fase');
    registro.dice('MAR: quante fasi', String(fasiMAR.length));
    registro.controlla('MAR non mostra la fase Interrato', !fasiMAR.includes('Interrato'),
      'MAR non ha piani sotto quota: offrirla sarebbe offrire una cartella che non esisterà mai');
    registro.controlla('e ne mostra esattamente una in meno delle 27',
      fasiMAR.length === 26, String(fasiMAR.length),
      'il conteggio dice che il filtro toglie UNA voce e non due: senza, «non c’è Interrato» starebbe anche con mezzo elenco mancante');
    await scegliCommessa('#commessa', 'MNG');
    const fasiMNG = await voci('#fase');
    registro.controlla('MNG la mostra, perché ha due interrati', fasiMNG.includes('Interrato'));
    registro.controlla('e sono tutte e 27', fasiMNG.length === 27, String(fasiMNG.length));
    await scegliFase('Interrato');
    const pianiInterrato = await voci('#piano');
    registro.dice('MNG, fase Interrato: piani offerti', pianiInterrato.join(' '));
    registro.controlla('per Interrato solo i piani sotto quota',
      pianiInterrato.join(',') === 'P-2,P-1',
      '«Interrato, piano terzo» è una scelta che non vuol dire niente');
    registro.controlla('e il menù del piano si vede, perché c’è da scegliere',
      await visibile('#piano') && !(await visibile('#unico-piano')),
      'due voci: si chiede, come sempre');

    // **Una voce sola: non si chiede** (dalla 0.37.7). SNZ2.2 ha un solo piano
    // sotto quota, e l'app apriva lo stesso un menù con «— scegli il piano —»
    // e `P-1` come unica voce: un tocco obbligatorio per una scelta che non
    // c'era. Previsione scritta prima di provare: menù nascosto, valore scritto
    // a video, Invia acceso senza toccare niente, `piano: "P-1"` nel payload.
    registro.titolo('Un piano solo possibile: non si chiede, lo sceglie l’app');
    await scegliCommessa('#commessa', 'SNZ2.2');
    await scegliFase('Interrato');
    registro.controlla('su SNZ2.2 c’è un interrato solo', (await voci('#piano')).join(',') === 'P-1');
    registro.controlla('il menù del piano NON si vede',
      !(await visibile('#piano')),
      'una tendina con una voce sola è un tocco per niente');
    const unico = await pagina.$eval('#unico-piano', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('al suo posto si legge', unico);
    registro.controlla('al suo posto si legge il piano che parte, e perché',
      await visibile('#unico-piano') && /P-1/.test(unico) && /Primo piano interrato/.test(unico)
        && /unico piano interrato/.test(unico),
      'l’operatore deve vedere in che cartella va la foto anche quando non c’è niente da scegliere');
    registro.controlla('il campo «Piano» resta a video', await visibile('#campo-piano'));
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso da solo', 10000);
    registro.controlla('Invia si accende senza toccare il piano',
      !(await pagina.$eval('#invia', e => e.disabled)));
    const primaUnico = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fineUnico = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaUnico && Date.now() < fineUnico) {
      await new Promise(r => setTimeout(r, 300));
    }
    const interrato = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('payload', `fase: ${JSON.stringify(interrato.fase)} · piano: ${JSON.stringify(interrato.piano)}`);
    registro.controlla('nel payload il piano c’è, ed è P-1',
      interrato.fase === 'Interrato' && interrato.piano === 'P-1',
      'non chiederlo non vuol dire non mandarlo: a valle il percorso è Interrato\\P-1\\');

    // La trappola: il valore messo dall'app non deve diventare una scelta.
    // `Strutture` su SNZ2.2 offre TUTTI i piani, `P-1` compreso: se il menù
    // rifatto si portasse dietro il valore di prima, `P-1` resterebbe
    // selezionato senza che nessuno l'abbia scelto — una preselezione, cioè
    // la foto nella cartella sbagliata senza far rumore. Il caso è scelto
    // perché possa fallire: con una fase che `P-1` non ce l'ha, il valore
    // cadrebbe da sé e la prova non proverebbe niente.
    registro.titolo('Il piano scelto dall’app non si porta dietro come scelta');
    // Dentro UNA composizione, senza invii in mezzo: dalla 0.38.0 dopo Invia
    // cantiere e fase tornano vuoti, quindi la trappola si ricostruisce da
    // capo — SNZ2.2, Interrato (l'app sceglie P-1), poi Strutture.
    await scegliCommessa('#commessa', 'SNZ2.2');
    await scegliFase('Interrato');
    registro.controlla('di nuovo su Interrato, P-1 lo sceglie l’app',
      (await pagina.$eval('#piano', e => e.value)) === 'P-1' && await visibile('#unico-piano'));
    await scegliFase('Strutture');
    const pianiStrutture = await voci('#piano');
    registro.dice('SNZ2.2, Strutture: piani offerti', pianiStrutture.join(' '));
    registro.controlla('Strutture offre anche P-1, quindi la prova può fallire',
      pianiStrutture.includes('P-1') && pianiStrutture.length > 1);
    registro.controlla('il menù torna a vedersi', await visibile('#piano') && !(await visibile('#unico-piano')));
    registro.controlla('e parte dal segnaposto, NON da P-1',
      (await pagina.$eval('#piano', e => e.value)) === '',
      'P-1 l’aveva messo l’app per Interrato: per Strutture la scelta è dell’operatore');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('e senza scelta Invia resta spento',
      await pagina.$eval('#invia', e => e.disabled));
    // Si toglie la foto: il blocco dopo ne vuole una sola, la sua.
    // La conferma «Eliminare questa foto?» la accetta già `nuovoTelefono`.
    await pagina.click('.foto-rimuovi');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 0, 'foto tolta', 10000);

    registro.titolo('Piano obbligatorio: senza, non si parte');
    await scegliCommessa('#commessa', 'MAR');
    await scegliFase('Strutture');
    registro.controlla('compare il menù del piano', await visibile('#campo-piano'));
    registro.controlla('e non quelli di unità e prospetto',
      !(await visibile('#campo-unita')) && !(await visibile('#campo-prospetto')));
    registro.dice('MAR: piani offerti', (await voci('#piano')).join(' '));
    registro.controlla('sono i quattro di MAR, col Tetto in fondo',
      (await voci('#piano')).join(',') === 'P0,P1,P2,Tetto',
      'il Tetto è un piano a sé dal 04/10/2026, subito sopra l’ultimo piano');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('con la foto pronta ma senza piano, Invia è spento',
      await pagina.$eval('#invia', e => e.disabled),
      'un livello che la fase pretende non ha ripiego: la cartella non si indovina');
    const avviso = await pagina.$eval('#avviso-invio', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('avviso nella barra', avviso);
    registro.controlla('e l’app dice che manca il piano', /piano/i.test(avviso));
    await pagina.selectOption('#piano', 'P1');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    const primaStrutture = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fineStrutture = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaStrutture && Date.now() < fineStrutture) {
      await new Promise(r => setTimeout(r, 300));
    }
    const strutture = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('payload', `fase: ${JSON.stringify(strutture.fase)} · piano: ${JSON.stringify(strutture.piano)} · unita: ${JSON.stringify(strutture.unita)} · prospetto: ${JSON.stringify(strutture.prospetto)}`);
    registro.controlla('il piano arriva col suo codice', strutture.piano === 'P1');
    registro.controlla('unità e prospetto arrivano null, non vuoti',
      strutture.unita === null && strutture.prospetto === null,
      'una stringa vuota in colonna somiglia a un dato e non lo è');

    registro.titolo('Unità obbligatoria, piano ricavato dalla mappa');
    const mng = await mandaFoto('MNG', 'FinituraAlloggi', { unita: '1A' });
    registro.dice('MNG payload', `unita: ${JSON.stringify(mng.unita)} · piano: ${JSON.stringify(mng.piano)}`);
    registro.controlla('l’unità è quella scelta', mng.unita === '1A');
    registro.controlla('e il piano viaggia anche se nessuno l’ha scelto', mng.piano === 'P1',
      'a valle il percorso è [Fase]\\[Piano]\\[Unità]: senza il piano la cartella non si costruisce');

    await scegliCommessa('#commessa', 'MNG');
    await scegliFase('FinituraAlloggi');
    registro.controlla('il menù del piano non compare: lo determina l’unità',
      !(await visibile('#campo-piano')) && await visibile('#campo-unita'),
      'chiederlo sarebbe un tocco in più per un dato che l’unità già decide');
    registro.dice('MNG: quante unità', String((await voci('#unita')).length));
    registro.controlla('le unità sono raggruppate per piano',
      (await pagina.$$eval('#unita optgroup', o => o.length)) > 1,
      '51 voci di fila su SNZ2.2 non si scorrono col pollice');
    await pagina.selectOption('#unita', '1B');
    const aiutoUnita = await pagina.$eval('#aiuto-unita', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('aiuto sotto il menù', aiutoUnita);
    registro.controlla('a video si legge il piano ricavato', /P1\b/.test(aiutoUnita),
      'l’operatore non l’ha scelto: vederlo è il solo modo che ha di accorgersi se non torna');

    // La prova sul caso che può fallire: `10A` su SNZ2.2. Un «primo carattere»
    // lo manderebbe a P1.
    const dieci = await mandaFoto('SNZ2.2', 'FinituraAlloggi', { unita: '10A' });
    registro.dice('SNZ2.2 unità 10A → piano', JSON.stringify(dieci.piano));
    registro.controlla('l’unità 10A sta al piano P10, non al P1', dieci.piano === 'P10',
      'è la prova che il piano si LEGGE dalla mappa e non si deduce dal codice');
    const punto = await mandaFoto('MAR', 'FinituraAlloggi', { unita: '1.01' });
    registro.dice('MAR unità 1.01 → piano', JSON.stringify(punto.piano));
    registro.controlla('e su MAR, che numera «1.01», il piano è lo stesso P1', punto.piano === 'P1',
      'due commesse numerano diversamente e la regola è una: la mappa');

    registro.titolo('Prospetto: solo la finitura di facciata');
    const facciata = await mandaFoto('MAR', 'FinituraFacciata', { prospetto: 'Nord' });
    registro.dice('payload', `prospetto: ${JSON.stringify(facciata.prospetto)} · piano: ${JSON.stringify(facciata.piano)}`);
    registro.controlla('il prospetto arriva', facciata.prospetto === 'Nord');
    registro.controlla('e il piano resta null', facciata.piano === null);
    await scegliCommessa('#commessa', 'MAR');
    await scegliFase('FinituraFacciata');
    registro.controlla('i prospetti sono i quattro standard',
      (await voci('#prospetto')).join(',') === 'Nord,Sud,Est,Ovest');

    registro.titolo('Fase senza livelli, e commessa senza anagrafica');
    // `SistemazioneEsterna`, entrata il 18/09/2026: fase senza livelli, quindi
    // sul server va in `SistemazioneEsterna\[AAAAMM]\`. Provata a parte da
    // `Bonifica` perché è quella nuova, ed è dove un'aggiunta fatta in un solo
    // posto dei due si vedrebbe.
    await scegliCommessa('#commessa', 'MAR');
    await scegliFase('SistemazioneEsterna');
    registro.controlla('la fase nuova non chiede nessun livello',
      !(await visibile('#campo-piano')) && !(await visibile('#campo-unita'))
      && !(await visibile('#campo-prospetto')));
    const esterna = await mandaFoto('MAR', 'SistemazioneEsterna');
    registro.dice('payload', `fase: ${JSON.stringify(esterna.fase)} · piano: ${JSON.stringify(esterna.piano)} · unita: ${JSON.stringify(esterna.unita)} · prospetto: ${JSON.stringify(esterna.prospetto)}`);
    registro.controlla('il codice arriva senza spazi', esterna.fase === 'SistemazioneEsterna',
      'a video si legge «Sistemazione esterna», in colonna deve arrivare il codice: è il nome della cartella');
    registro.controlla('e i tre livelli sono null veri, non stringhe vuote',
      esterna.piano === null && esterna.unita === null && esterna.prospetto === null,
      [esterna.piano, esterna.unita, esterna.prospetto].map(v => JSON.stringify(v)).join(' '));

    const bonifica = await mandaFoto('MAR', 'Bonifica');
    registro.controlla('una fase senza livelli non chiede niente',
      bonifica.piano === null && bonifica.unita === null && bonifica.prospetto === null);
    const lotto = await mandaFoto('SNU', 'Lotto3');
    registro.dice('SNU payload', `fase: ${JSON.stringify(lotto.fase)} · piano: ${JSON.stringify(lotto.piano)}`);
    registro.controlla('per un’urbanizzazione il lotto viaggia nel campo fase', lotto.fase === 'Lotto3');
    registro.controlla('e i tre livelli restano null', lotto.piano === null && lotto.unita === null);

    // SNZ2.1 e MRS sono concluse e in anagrafica non ci sono: le loro fasi
    // restano tutte, e i livelli non viaggiano. A valle la foto finisce nella
    // cartella del mese con un'anomalia — voluto: non si blocca chi sta
    // scattando per un dato che manca in ufficio.
    await scegliCommessa('#commessa', 'MRS');
    const fasiMRS = await voci('#fase');
    registro.controlla('una commessa senza anagrafica mostra tutte e 27 le fasi',
      fasiMRS.length === 27 && fasiMRS.includes('Interrato'), String(fasiMRS.length));
    const senzaAnagrafica = await mandaFoto('MRS', 'Strutture');
    registro.controlla('e non chiede il piano, perché non ne ha da offrire',
      senzaAnagrafica.piano === null,
      'non bloccare l’operatore per un dato che manca in ufficio è una scelta, non una dimenticanza');

    registro.titolo('Nel modulo Bolle il lotto sì, i livelli NO');
    // Il selettore della fase è condiviso di proposito, e per un'urbanizzazione
    // mostra il lotto anche su una bolla. I tre LIVELLI invece non ci sono:
    // `BolleInArrivo` non ha le colonne per riceverli (verificato sul tenant il
    // 18/09/2026 alle 16:05), e un campo che arriva e viene scartato in
    // silenzio è peggio di un campo che non parte — peggio ancora se per
    // sceglierlo l'operatore ha dovuto fermarsi.
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#cantiere');
    await scegliCommessa('#cantiere', 'SNU');
    registro.controlla('anche una bolla di SNU prende il lotto',
      (await voci('#fase')).join(',') === 'Lotto1,Lotto2,Lotto3'
      && (await pagina.$eval('#etichetta-fase', e => e.textContent.trim())) === 'Lotto',
      'il selettore è condiviso di proposito: due elenchi separati diventerebbero due verità');
    await scegliCommessa('#cantiere', 'MNG');
    await scegliFase('FinituraAlloggi');
    registro.controlla('i menù dei livelli non esistono nemmeno',
      (await pagina.$$('#campo-piano, #campo-unita, #campo-prospetto')).length === 0,
      'non nascosti: assenti. Un menù nascosto resterebbe un candidato a ricomparire per sbaglio');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    registro.controlla('e la bolla parte senza chiedere niente in più',
      !(await pagina.$eval('#invia', e => e.disabled)),
      'una fase che pretende l’unità non deve fermare una bolla: quel dato in raccolta non ci arriva');
    const primaBolla = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fineBolla = Date.now() + 60000;
    while (flow.stato.ricevuti.length === primaBolla && Date.now() < fineBolla) {
      await new Promise(r => setTimeout(r, 300));
    }
    const bolla = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('payload della bolla', `fase: ${JSON.stringify(bolla.fase)} · campi livello presenti: ${
      ['piano', 'unita', 'prospetto'].filter(c => c in bolla).join(', ') || 'nessuno'}`);
    registro.controlla('la fase (qui FinituraAlloggi) arriva', bolla.fase === 'FinituraAlloggi');
    registro.controlla('e i tre campi dei livelli NON sono nel payload',
      !('piano' in bolla) && !('unita' in bolla) && !('prospetto' in bolla),
      'mandarli sapendo che vengono scartati è il difetto che questa modifica evita');

    registro.titolo('Nessuna stringa vuota, in nessun invio di foto');
    // Solo i payload del modulo Foto: `tipo` c'è lì e non nelle bolle.
    const tutti = flow.stato.ricevuti.filter(r => 'tipo' in r);
    const vuoti = tutti.flatMap(r => ['piano', 'unita', 'prospetto']
      .filter(c => r[c] === '').map(c => `${c} di ${r.idClient}`));
    registro.dice('invii di foto esaminati', String(tutti.length));
    registro.controlla('i tre campi sono un codice oppure null, mai ""',
      vuoti.length === 0, vuoti.join(' · ') || 'nessuno');
    registro.controlla('e viaggiano sempre, anche quando valgono null',
      tutti.every(r => 'piano' in r && 'unita' in r && 'prospetto' in r),
      'un campo assente e un campo null si comportano diversamente in un flow: meglio uno solo dei due');

    // Il Tetto a video, nei due posti dove il master lo vuole e nel posto
    // dove non lo vuole. Si torna al modulo Foto: i menu dei piani e delle
    // unità ci sono solo lì.
    registro.titolo('Il Tetto: in fondo ai piani, mai fra le unità');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#commessa');
    for (const commessa of ['MNG', 'SNZ2.2']) {
      await scegliCommessa('#commessa', commessa);
      await scegliFase('Strutture');
      const piani = await voci('#piano');
      const ultimaVoce = await pagina.$$eval('#piano option', o => o[o.length - 1].textContent.trim());
      registro.dice(`${commessa}, Strutture: piani offerti`, piani.join(' '));
      registro.controlla(`${commessa}: il Tetto è l’ultima voce del menù dei piani`,
        piani[piani.length - 1] === 'Tetto' && ultimaVoce === 'Tetto', ultimaVoce);
    }
    await scegliCommessa('#commessa', 'SNZ2.2');
    await scegliFase('FinituraAlloggi');
    const gruppi = await pagina.$$eval('#unita optgroup', o => o.map(e => e.label));
    const valoriUnita = await voci('#unita');
    registro.dice('SNZ2.2, FinituraAlloggi: gruppi del menù delle unità', gruppi.join(' · '));
    registro.controlla('fra le unità il Tetto non c’è, né come gruppo né come voce',
      !gruppi.includes('Tetto') && !valoriUnita.includes('Tetto') && valoriUnita.length === 51,
      `${valoriUnita.length} unità — il Tetto non ha unità, e una fase che chiede l’unità non lo offre`);

    // **Un Lotto4 rimasto in memoria** (punto 4 della 0.37.8). L'app ricorda
    // l'ultima fase scelta, una per modulo (`ultimaFase` in `llitalia.foto` e
    // in `llitalia.bolle`), e alla riapertura la riseleziona solo se è ancora
    // fra le voci. Un telefono che aveva mandato una foto o una bolla di SNU
    // col Lotto4 ce l'ha ancora in memoria: deve ritrovarsi con «— nessun
    // lotto —», non con Lotto4 selezionato. È la stessa trappola della 0.37.7,
    // e il caso è quello che può fallire: il valore in memoria è proprio
    // quello che è sparito.
    registro.titolo('Un Lotto4 rimasto in memoria non resta selezionato');
    for (const [modulo, selettore, chiave, extra] of [
      ['foto', '#commessa', 'llitalia.foto', { ultimaCommessa: 'SNU' }],
      ['bolle', '#cantiere', 'llitalia.bolle', { ultimoCantiere: 'SNU' }],
    ]) {
      await pagina.evaluate(({ chiave, extra }) => {
        const dati = JSON.parse(localStorage.getItem(chiave) || '{}');
        localStorage.setItem(chiave, JSON.stringify({ ...dati, ...extra, ultimaFase: 'Lotto4' }));
      }, { chiave, extra });
      await pagina.goto(app.indirizzo + `/index.html#/${modulo}`);
      await pagina.reload();
      await pagina.waitForSelector(selettore);
      await scegliCommessa(selettore, 'SNU');
      const stato = await pagina.$eval('#fase', e => ({
        valore: e.value, testo: e.options[e.selectedIndex].textContent.trim(),
      }));
      registro.dice(`${modulo}: in memoria Lotto4, a video`, `«${stato.testo}» (valore ${JSON.stringify(stato.valore)})`);
      // Dalla 0.37.9 la memoria non si legge proprio più, e il segnaposto
      // dice la verità sul campo: «scegli il lotto» nelle foto, dove è
      // obbligatorio; «nessun lotto» nelle bolle, dove è facoltativo.
      const atteso = modulo === 'foto' ? /scegli il lotto/ : /nessun lotto/;
      registro.controlla(`${modulo}: Lotto4 non è selezionato, si riparte dal segnaposto`,
        stato.valore === '' && atteso.test(stato.testo), `«${stato.testo}»`);
    }
    // Nel modulo Foto la fase è obbligatoria: senza lotto Invia resta spento.
    // Nelle bolle no — è facoltativa per scelta di Francesco — quindi lì
    // «nessun lotto» è una scelta valida, e il collaudo non pretende altro.
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.reload();
    await pagina.waitForSelector('#commessa');
    await scegliCommessa('#commessa', 'SNU');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('foto: senza lotto Invia resta spento',
      await pagina.$eval('#invia', e => e.disabled),
      'la foto non parte né col Lotto4 né senza lotto: aspetta che l’operatore scelga');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
