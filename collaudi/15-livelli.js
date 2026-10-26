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
      const etichette = fasi.FASI.map(f => f.etichetta);
      const chiavi = Object.keys(ana.ANAGRAFICA.livelliPerFase);
      const lotti = chiavi.filter(k => /^Lotto\d+$/.test(k));
      return {
        fasi: codici,
        etichette,
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
    // L'ordine è quello dell'ETICHETTA, la stringa che si legge a video, non
    // quello del codice: «Impianto Antincendio» e «ImpiantoAntincendio» non
    // ordinano allo stesso modo di «Impianto ascensore» e «ImpiantoAscensore»
    // se si confronta il codice senza spazi. Confronto italiano, senza
    // distinzione di maiuscole e accenti.
    const perEtichetta = [...coerenza.etichette].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    registro.controlla('in ordine alfabetico sull’etichetta, come si legge a video',
      coerenza.etichette.join('|') === perEtichetta.join('|'),
      'in un elenco di ventinove voci si cerca per lettera, non per abitudine');

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
    const VERSIONE_MASTER = '202610261235';
    const IMPRONTA_MASTER = 'ecb2c273fa623b24291ba792530d12359e1c4ae0c0f996c2e980a31729a12ec4';
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
      const { CANTIERI } = await import('./core/cantieri.js');
      // L'elenco delle commesse su cui si contano le voci uniche si RICAVA:
      // sono quelle del menù (`core/cantieri.js`) che in anagrafica hanno
      // `tipo: 'edificio'`. Scritto a mano diventava un terzo posto dove una
      // commessa nuova va aggiunta, e dimenticarla non faceva rumore. Oggi dà
      // MAR, MNG, SNZ2.2 e TN1; una commessa nuova entra nel conteggio da sola.
      const edifici = CANTIERI.map(c => c.codice)
        .filter(c => (a.datiCommessa(c) || {}).tipo === 'edificio');
      const out = {
        voci: Object.keys(a.ANAGRAFICA.livelliPerFase).length,
        edificiElenco: edifici, edifici: {}, lotti: {},
      };
      for (const c of edifici) {
        const p = a.pianiDi(c);
        out.edifici[c] = {
          piani: p.length,
          ultimo: p[p.length - 1].codice,
          crescente: p.every((x, i) => i === 0 || Number(x.ordine) > Number(p[i - 1].ordine)),
          unita: a.unitaDi(c).length,
          unitaSulTetto: a.unitaDi(c).filter(u => u.piano === 'Tetto').length,
        };
      }
      for (const c of ['SNU', 'BRU']) out.lotti[c] = a.lottiDi(c).map(l => l.codice || l);
      let combinazioni = 0;
      const uniche = [];
      const senzaVoci = [];
      for (const c of edifici) {
        for (const f of FASI.map(x => x.codice)) {
          const regola = a.ANAGRAFICA.livelliPerFase[f];
          const unici = a.livelliUnici(c, f);
          for (const liv of ['piano', 'unita', 'prospetto']) {
            if (regola[liv] !== 'O') continue;
            combinazioni += 1;
            if (unici[liv]) uniche.push(`${c} · ${f} · ${unici[liv].codice}`);
            else if (!a.livelliRichiesti(c, f)[liv]) senzaVoci.push(`${c} · ${f} · ${liv}`);
          }
        }
      }
      // Quante fasi pretendono quale livello (O = obbligatorio, - = nessuno):
      // dal passaggio del 26/10/2026 sono 10 per il piano, 4 per l'unità, 1 per
      // il prospetto e 14 senza livelli, su 29.
      const perLivello = { piano: 0, unita: 0, prospetto: 0, nessuno: 0 };
      for (const f of FASI.map(x => x.codice)) {
        const r = a.ANAGRAFICA.livelliPerFase[f];
        const richiesti = ['piano', 'unita', 'prospetto'].filter(l => r[l] === 'O');
        for (const l of richiesti) perLivello[l] += 1;
        if (richiesti.length === 0) perLivello.nessuno += 1;
      }
      out.perLivello = perLivello;
      out.combinazioni = combinazioni;
      out.uniche = uniche;
      out.senzaVoci = senzaVoci;
      // Le scale (dal master 202610092114): solo dove le scale sono più di
      // una. Si contano qui perché la logica non le usa, e quindi nessun
      // altro controllo se ne accorgerebbe se cambiassero.
      const scale = c => {
        // Una commessa che manca non fa esplodere il conto: si legge come
        // «zero scale», e il controllo che la aspetta lo dice.
        const dati = a.ANAGRAFICA.commesse[c] || {};
        const tutte = a.unitaDi(c).map(u => u.codice);
        const elenco = Array.isArray(dati.scale) ? dati.scale : [];
        const assegnate = elenco.flatMap(s => s.unita);
        return {
          quante: elenco.length,
          codici: elenco.map(s => s.codice),
          alloggi: elenco.map(s => s.unita.length),
          partizione: assegnate.length === tutte.length && new Set(assegnate).size === tutte.length
            && assegnate.every(u => tutte.includes(u)),
          ugualeAUnPiano: elenco.filter(s => a.pianiDi(c).some(p => {
            const delPiano = ((dati.unita || {})[p.codice] || []).slice().sort().join(',');
            return delPiano === s.unita.slice().sort().join(',');
          })).map(s => s.codice),
          comuni: a.pianiDi(c).map(p => p.codice).filter(p => !elenco.some(s => s.piani.includes(p))),
        };
      };
      out.scale = { MAR: scale('MAR'), MNG: scale('MNG'), 'SNZ2.2': scale('SNZ2.2'), TN1: scale('TN1') };
      const pTN1 = a.pianiDi('TN1');
      out.TN1 = {
        piani: pTN1.map(p => p.codice).join(','),
        tetti: pTN1.filter(p => p.codice === 'Tetto').length,
        crescente: pTN1.every((x, i) => i === 0 || Number(x.ordine) > Number(pTN1[i - 1].ordine)),
        unita: a.unitaDi('TN1').length,
        unitaSulTetto: a.unitaDi('TN1').filter(u => u.piano === 'Tetto').length,
        prospetti: a.prospettiDi('TN1').length,
      };
      out.TN1nelMenu = CANTIERI.some(c => c.codice === 'TN1');
      out.TN1inAnagrafica = a.anagraficaNota('TN1');
      // Dal master 202610101049: quali commesse hanno corpi distinti, e le
      // parti comuni. Sono dato, come le scale: l'impronta dice SE cambiano,
      // questi dicono COSA.
      out.corpiDistinti = Object.keys(a.ANAGRAFICA.commesse)
        .filter(c => a.ANAGRAFICA.commesse[c].corpiDistinti === true);
      out.partiComuni = a.ANAGRAFICA.partiComuni;
      return out;
    });
    registro.dice('numeri dell’anagrafica', numeri);
    registro.controlla('32 voci per fase: 29 fasi e 3 lotti', numeri.voci === 32, String(numeri.voci));
    registro.controlla('fasi per livello: 10 a piano, 4 a unità, 1 a prospetto, 14 senza livelli',
      numeri.perLivello.piano === 10 && numeri.perLivello.unita === 4
        && numeri.perLivello.prospetto === 1 && numeri.perLivello.nessuno === 14,
      `piano ${numeri.perLivello.piano} · unità ${numeri.perLivello.unita} · prospetto ${numeri.perLivello.prospetto} · nessuno ${numeri.perLivello.nessuno}`,
      'sono 29 fasi: 10 + 4 + 1 + 14, e nessuna fase pretende due livelli obbligatori');
    registro.controlla('piani: MAR 4, MNG 12, SNZ2.2 15',
      numeri.edifici.MAR.piani === 4 && numeri.edifici.MNG.piani === 12 && numeri.edifici['SNZ2.2'].piani === 15);
    registro.controlla('in tutte le commesse edificio il Tetto è l’ultimo piano, e l’ordine sale dal più basso',
      Object.values(numeri.edifici).every(e => e.ultimo === 'Tetto' && e.crescente),
      'i piani stanno nel loro ordine proprio, non in ordine alfabetico: «P10» prima di «P2» non vuol dire niente');
    registro.controlla('nessuna unità sul Tetto',
      Object.values(numeri.edifici).every(e => e.unitaSulTetto === 0),
      'il Tetto è un piano a sé, non una parte comune e non un alloggio');
    registro.controlla('unità invariate: MAR 15, MNG 16, SNZ2.2 51',
      numeri.edifici.MAR.unita === 15 && numeri.edifici.MNG.unita === 16 && numeri.edifici['SNZ2.2'].unita === 51);
    registro.controlla('lotti: SNU 3, BRU 3',
      numeri.lotti.SNU.join(',') === 'Lotto1,Lotto2,Lotto3' && numeri.lotti.BRU.join(',') === 'Lotto1,Lotto2,Lotto3');
    registro.controlla('le commesse del conteggio sono quelle del menù che hanno un edificio: MAR, MNG, SNZ2.2, TN1',
      numeri.edificiElenco.join(',') === 'MAR,MNG,SNZ2.2,TN1', numeri.edificiElenco.join(' '),
      'l’elenco si ricava da core/cantieri.js e dall’anagrafica, non si scrive a mano');
    // Erano due, `SNZ2.2 · Interrato · P-1` e `TN1 · Interrato · P-1`, e una
    // senza voci, `MAR · Interrato`: tutte e tre dipendevano da `Interrato`,
    // che dal 26/10/2026 non è più una fase. Il caso 16 della specifica, la voce
    // unica del piano, si prova con una commessa sintetica più sotto.
    registro.controlla('60 combinazioni di commessa, fase e livello obbligatorio: 15 per commessa, e nessuna a voce unica',
      numeri.combinazioni === 60 && numeri.uniche.length === 0,
      `${numeri.combinazioni} combinazioni, a voce unica: ${numeri.uniche.join(' ; ') || 'nessuna'}`);
    registro.controlla('e nessuna senza voci: ogni livello obbligatorio ha qualcosa da scegliere',
      numeri.senzaVoci.length === 0, numeri.senzaVoci.join(' ; ') || 'nessuna');

    registro.titolo('Le scale, TN1 e le parti comuni (master 202610101049)');
    const sm = numeri.scale.MAR;
    registro.controlla('MAR: tre scale, «1» «2» «3», da 5, 6 e 4 alloggi',
      sm.quante === 3 && sm.codici.join(',') === '1,2,3' && sm.alloggi.join(',') === '5,6,4',
      `${sm.quante} scale: ${sm.codici.join(' ')} · alloggi ${sm.alloggi.join('/')}`);
    registro.controlla('ogni alloggio di MAR sta in una scala e in una sola', sm.partizione,
      'una scala dentro l’altra, o un alloggio senza scala, vorrebbe dire una copia guasta');
    registro.controlla('e nessuna scala è un piano copiato', sm.ugualeAUnPiano.length === 0,
      `i conteggi coincidono con quelli dei piani (5/6/4), le composizioni no${sm.ugualeAUnPiano.length ? `: uguali ${sm.ugualeAUnPiano.join(' ')}` : ''}`);
    registro.controlla('il Tetto di MAR resta fuori dalle scale: è comune alla commessa',
      sm.comuni.join(',') === 'Tetto', sm.comuni.join(' ') || 'nessuno');
    registro.controlla('MNG e SNZ2.2 hanno una scala sola: niente campo «scale»',
      numeri.scale.MNG.quante === 0 && numeri.scale['SNZ2.2'].quante === 0);
    const st = numeri.scale.TN1;
    registro.controlla('TN1: le palazzine 4–7 come scale, 16 alloggi ciascuna',
      st.quante === 4 && st.codici.join(',') === '4,5,6,7' && st.alloggi.every(n => n === 16) && st.partizione,
      `${st.codici.join(' ')} · alloggi ${st.alloggi.join('/')}`);
    registro.controlla('il P-1 di TN1 è comune alle quattro palazzine: l’autorimessa',
      st.comuni.join(',') === 'P-1', st.comuni.join(' ') || 'nessuno');
    registro.controlla('TN1: P-1…P3 più il Tetto, in ordine, e il Tetto una volta sola',
      numeri.TN1.piani === 'P-1,P0,P1,P2,P3,Tetto' && numeri.TN1.tetti === 1 && numeri.TN1.crescente,
      `${numeri.TN1.piani} — il menù dei piani legge «piani», non le scale che il Tetto lo citano tutte`);
    registro.controlla('TN1: 64 alloggi, nessuno sul Tetto, i quattro prospetti',
      numeri.TN1.unita === 64 && numeri.TN1.unitaSulTetto === 0 && numeri.TN1.prospetti === 4,
      `${numeri.TN1.unita} alloggi · ${numeri.TN1.prospetti} prospetti`);
    registro.controlla('i corpi distinti sono solo quelli di TN1',
      numeri.corpiDistinti.join(',') === 'TN1', numeri.corpiDistinti.join(' ') || 'nessuno',
      'MAR ha tre scale ma è un edificio solo: la palazzina non c’entra');
    const pc = numeri.partiComuni || {};
    registro.controlla('parti comuni: voce «Parti comuni», codice PartiComuni, solo in ImpiantoIdrosanitario',
      pc.codice === 'PartiComuni' && pc.etichetta === 'Parti comuni' && (pc.fasi || []).join(',') === 'ImpiantoIdrosanitario',
      `${pc.codice} · «${pc.etichetta}» · ${(pc.fasi || []).join(' ')}`);
    registro.controlla('e le tre fasi gemelle rimandano alle fasi delle parti comuni',
      JSON.stringify(pc.fasiGemelle) === JSON.stringify({
        FinituraAlloggi: 'FinituraPartiComuniInterne',
        ImpiantoElettricoAlloggi: 'ImpiantoElettricoPartiComuni',
        ImpiantoTermicoAlloggi: 'ImpiantoTermicoCondominiale',
      }), JSON.stringify(pc.fasiGemelle));
    registro.controlla('TN1 è in anagrafica e nel menù',
      numeri.TN1inAnagrafica && numeri.TN1nelMenu,
      'dalla 0.39.0 TN1 si sceglie nei due moduli, con il livello palazzina: i suoi casi sono nel collaudo 23');

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

    registro.titolo('Le fasi sono le stesse su ogni edificio');
    const fasiMAR = await voci('#fase');
    registro.dice('MAR: quante fasi', String(fasiMAR.length));
    await scegliCommessa('#commessa', 'MNG');
    const fasiMNG = await voci('#fase');
    registro.dice('MNG: quante fasi', String(fasiMNG.length));
    // Fino al 26/10/2026 MAR ne mostrava una in meno di MNG: senza piani sotto
    // quota non offriva `Interrato`, perché sarebbe stata una cartella che non
    // sarebbe mai esistita. Quella fase non c'è più — l'interrato si legge dal
    // piano — e con lei il filtro: i due elenchi devono essere lo stesso.
    registro.controlla('MAR e MNG mostrano le stesse 29 fasi, nello stesso ordine',
      fasiMAR.length === 29 && fasiMNG.join(',') === fasiMAR.join(','),
      `MAR ${fasiMAR.length} · MNG ${fasiMNG.length}`,
      'un elenco diverso fra due edifici vorrebbe dire che un filtro è rimasto acceso');
    registro.controlla('e né Interrato né ImpiantiDiReteCondominiali, che non sono più fasi',
      ![...fasiMAR, ...fasiMNG].some(v => v === 'Interrato' || v === 'ImpiantiDiReteCondominiali'));

    // **Una voce sola: non si chiede** (dalla 0.37.7). Il caso vero era SNZ2.2
    // con un solo piano sotto quota e la fase `Interrato`: una tendina con
    // `P-1` come unica voce, cioè un tocco obbligatorio per una scelta che non
    // c'era. Dal 26/10/2026 `Interrato` non è più una fase, e con le commesse
    // di oggi nessuna combinazione ha una voce sola: la regola resta nel
    // codice (vale per piano, unità, prospetto e lotto) ma non ha più un caso
    // reale su cui provarla. Si prova allora con una **commessa sintetica**, un
    // solo piano per una fase a piano obbligatorio, messa in memoria dalla
    // pagina e tolta a fine prova: non entra nei dati, e nel codice dell'app
    // non si è toccato niente. Previsione scritta prima di provare: menù del
    // piano nascosto, valore e perché a video, Invia acceso senza toccare
    // niente, `piano: "P0"` nel payload.
    registro.titolo('Un piano solo possibile: non si chiede, lo sceglie l’app (commessa sintetica)');
    const ridisegnaFoto = async () => {
      // La vista Foto costruisce il menù delle commesse e quello dei livelli
      // quando si apre: dopo aver cambiato i dati in memoria si esce e si
      // rientra, senza ricaricare la pagina (un ricarico rifarebbe i moduli).
      await pagina.goto(app.indirizzo + '/index.html#/bolle');
      await pagina.waitForSelector('#cantiere');
      await pagina.goto(app.indirizzo + '/index.html#/foto');
      await pagina.waitForSelector('#commessa');
    };
    await pagina.evaluate(async () => {
      const a = await import('./core/anagrafica.js');
      const { CANTIERI } = await import('./core/cantieri.js');
      a.ANAGRAFICA.commesse.SINT1 = {
        tipo: 'edificio',
        piani: [{ codice: 'P0', etichetta: 'Piano terra', ordine: 0 }],
        unita: { P0: ['A01', 'A02'] },
        etichetteUnita: {}, prospetti: ['Nord', 'Sud'],
      };
      CANTIERI.push({ codice: 'SINT1', etichetta: 'SINT1 - commessa di prova' });
    });
    await ridisegnaFoto();
    await scegliCommessa('#commessa', 'SINT1');
    await scegliFase('Strutture');
    registro.controlla('la commessa sintetica ha un piano solo, e Strutture lo pretende',
      (await voci('#piano')).join(',') === 'P0');
    registro.controlla('il menù del piano NON si vede',
      !(await visibile('#piano')),
      'una tendina con una voce sola è un tocco per niente');
    const unico = await pagina.$eval('#unico-piano', e => e.textContent.replace(/\s+/g, ' ').trim());
    registro.dice('al suo posto si legge', unico);
    registro.controlla('al suo posto si legge il piano che parte, e perché',
      await visibile('#unico-piano') && /P0/.test(unico) && /Piano terra/.test(unico)
        && /unico piano di questa commessa/.test(unico),
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
    const sintetico = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('payload', `fase: ${JSON.stringify(sintetico.fase)} · piano: ${JSON.stringify(sintetico.piano)}`);
    registro.controlla('nel payload il piano c’è, ed è P0',
      sintetico.fase === 'Strutture' && sintetico.piano === 'P0',
      'non chiederlo non vuol dire non mandarlo: a valle il percorso è Strutture\\P0\\');

    // La trappola: il valore messo dall'app non deve diventare una scelta.
    // Si ricompone la stessa commessa (dopo Invia cantiere e fase tornano
    // vuoti), si sceglie la fase e l'app mette `P0`; poi la commessa «prende»
    // un secondo piano e si cambia fase: il menù rifatto ha due voci, `P0`
    // compreso. Se si portasse dietro il valore di prima, `P0` resterebbe
    // selezionato senza che nessuno l'abbia scelto — una preselezione, cioè
    // la foto nella cartella sbagliata senza far rumore. Il secondo piano si
    // aggiunge DOPO aver visto la voce unica, così il caso può fallire: con
    // una fase che `P0` non ce l'ha, o con una voce sola anche dopo, il valore
    // cadrebbe da sé e la prova non proverebbe niente.
    registro.titolo('Il piano scelto dall’app non si porta dietro come scelta');
    await scegliCommessa('#commessa', 'SINT1');
    await scegliFase('Strutture');
    registro.controlla('di nuovo su Strutture, P0 lo sceglie l’app',
      (await pagina.$eval('#piano', e => e.value)) === 'P0' && await visibile('#unico-piano'));
    await pagina.evaluate(async () => {
      const a = await import('./core/anagrafica.js');
      const s = a.ANAGRAFICA.commesse.SINT1;
      s.piani.push({ codice: 'P1', etichetta: 'Piano primo', ordine: 1 });
      s.unita.P1 = ['A11'];
    });
    await scegliFase('Murature');
    const pianiMurature = await voci('#piano');
    registro.dice('SINT1 con due piani, Murature: piani offerti', pianiMurature.join(' '));
    registro.controlla('Murature offre anche P0, quindi la prova può fallire',
      pianiMurature.includes('P0') && pianiMurature.length === 2);
    registro.controlla('il menù torna a vedersi', await visibile('#piano') && !(await visibile('#unico-piano')));
    registro.controlla('e parte dal segnaposto, NON da P0',
      (await pagina.$eval('#piano', e => e.value)) === '',
      'P0 l’aveva messo l’app per Strutture: per Murature la scelta è dell’operatore');
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('e senza scelta Invia resta spento',
      await pagina.$eval('#invia', e => e.disabled));
    // Si toglie la foto: il blocco dopo ne vuole una sola, la sua.
    // La conferma «Eliminare questa foto?» la accetta già `nuovoTelefono`.
    await pagina.click('.foto-rimuovi');
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 0, 'foto tolta', 10000);
    // La commessa sintetica si toglie: fuori da questo blocco i dati sono
    // quelli veri, e la vista si ridisegna senza la sua voce.
    await pagina.evaluate(async () => {
      const a = await import('./core/anagrafica.js');
      const { CANTIERI } = await import('./core/cantieri.js');
      delete a.ANAGRAFICA.commesse.SINT1;
      CANTIERI.splice(CANTIERI.findIndex(c => c.codice === 'SINT1'), 1);
    });
    await ridisegnaFoto();
    registro.controlla('tolta la commessa sintetica, il menù ha di nuovo le otto commesse vere',
      (await voci('#commessa')).join(',') === 'BRU,MAR,MNG,MRS,SNU,SNZ2.1,SNZ2.2,TN1',
      (await voci('#commessa')).join(','));

    // Le fasi entrate col passaggio del 26/10/2026 e quelle che hanno preso il
    // posto di `Interrato`: ognuna col suo comportamento, perché sono i casi
    // nuovi e non c'è un controllo vecchio che li copra.
    registro.titolo('Le fasi entrate e quelle sciolte: Fognatura, Parti comuni interne, Spese, Terreno');
    await scegliCommessa('#commessa', 'MNG');
    await scegliFase('FognaturaNera');
    const pianiFognatura = await voci('#piano');
    registro.dice('MNG, FognaturaNera: piani offerti', pianiFognatura.join(' '));
    registro.controlla('Fognatura nera chiede il piano, e sono i 12 di MNG',
      pianiFognatura.length === 12 && await visibile('#piano') && !(await visibile('#unico-piano')),
      `${pianiFognatura.length} voci`);
    registro.controlla('e non chiede unità né prospetto',
      !(await visibile('#campo-unita')) && !(await visibile('#campo-prospetto')));
    await pagina.setInputFiles('#input-galleria', [materiale('scatto-exif.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('senza il piano Invia resta spento', await pagina.$eval('#invia', e => e.disabled),
      'scarichi e collettori vanno in una cartella per piano, interrato compreso: la cartella non si indovina');
    await pagina.selectOption('#piano', 'P-1');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    const primaFogna = flow.stato.ricevuti.length;
    await pagina.click('#invia');
    const fineFogna = Date.now() + 90000;
    while (flow.stato.ricevuti.length === primaFogna && Date.now() < fineFogna) {
      await new Promise(r => setTimeout(r, 300));
    }
    const fogna = flow.stato.ricevuti[flow.stato.ricevuti.length - 1];
    registro.dice('payload', `fase: ${JSON.stringify(fogna.fase)} · piano: ${JSON.stringify(fogna.piano)} · unita: ${JSON.stringify(fogna.unita)} · prospetto: ${JSON.stringify(fogna.prospetto)} · scala: ${JSON.stringify(fogna.scala)}`);
    registro.controlla('l’interrato si legge dal piano: fase FognaturaNera, piano P-1, il resto null',
      fogna.fase === 'FognaturaNera' && fogna.piano === 'P-1'
        && fogna.unita === null && fogna.prospetto === null && fogna.scala === null,
      'a valle il percorso è FognaturaNera\\P-1\\');

    await scegliCommessa('#commessa', 'SNZ2.2');
    await scegliFase('FinituraPartiComuniInterne');
    const pianiPC = await voci('#piano');
    registro.dice('SNZ2.2, FinituraPartiComuniInterne: piani offerti', pianiPC.join(' '));
    registro.controlla('Finitura parti comuni interne offre i 15 piani di SNZ2.2, P-1 compreso',
      pianiPC.length === 15 && pianiPC.includes('P-1'), `${pianiPC.length} voci`);
    registro.controlla('nessuna voce unica: il menù si vede e P-1 non è scelto dall’app',
      await visibile('#piano') && !(await visibile('#unico-piano'))
        && (await pagina.$eval('#piano', e => e.value)) === '',
      'su SNZ2.2 box e cantine stavano in «Interrato» col P-1 scelto dall’app; ora la fase è di chi scatta e il piano lo sceglie lui');
    const comuni = await mandaFoto('SNZ2.2', 'FinituraPartiComuniInterne', { piano: 'P-1' });
    registro.dice('payload', `fase: ${JSON.stringify(comuni.fase)} · piano: ${JSON.stringify(comuni.piano)}`);
    registro.controlla('scelto P-1 parte FinituraPartiComuniInterne con P-1',
      comuni.fase === 'FinituraPartiComuniInterne' && comuni.piano === 'P-1');

    for (const fase of ['SpeseTecniche', 'AcquistoTerreno']) {
      await scegliCommessa('#commessa', 'MNG');
      await scegliFase(fase);
      registro.controlla(`${fase}: nessun livello chiesto`,
        !(await visibile('#campo-piano')) && !(await visibile('#campo-unita')) && !(await visibile('#campo-prospetto')));
      const senzaLivelli = await mandaFoto('MNG', fase);
      registro.dice(`${fase}: payload`, `fase: ${JSON.stringify(senzaLivelli.fase)} · piano: ${JSON.stringify(senzaLivelli.piano)}`);
      registro.controlla(`${fase}: Invia si accende con la sola fase e il payload non ha livelli`,
        senzaLivelli.fase === fase && senzaLivelli.piano === null && senzaLivelli.unita === null
          && senzaLivelli.prospetto === null && senzaLivelli.scala === null,
        'a valle il percorso è la cartella del mese: AAAAMM');
    }

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
    registro.controlla('una commessa senza anagrafica mostra tutte e 29 le fasi, e non Interrato',
      fasiMRS.length === 29 && !fasiMRS.includes('Interrato'), String(fasiMRS.length));
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
    registro.controlla('e i campi dei livelli NON sono nel payload, nemmeno la palazzina',
      !('piano' in bolla) && !('unita' in bolla) && !('prospetto' in bolla) && !('scala' in bolla),
      'mandarli sapendo che vengono scartati è il difetto che questa modifica evita');

    registro.titolo('Nessuna stringa vuota, in nessun invio di foto');
    // Solo i payload del modulo Foto: `tipo` c'è lì e non nelle bolle.
    const tutti = flow.stato.ricevuti.filter(r => 'tipo' in r);
    const vuoti = tutti.flatMap(r => ['piano', 'unita', 'prospetto', 'scala']
      .filter(c => r[c] === '').map(c => `${c} di ${r.idClient}`));
    registro.dice('invii di foto esaminati', String(tutti.length));
    registro.controlla('i quattro campi (piano, unità, prospetto, scala) sono un codice oppure null, mai ""',
      vuoti.length === 0, vuoti.join(' · ') || 'nessuno');
    registro.controlla('e viaggiano sempre, anche quando valgono null',
      tutti.every(r => 'piano' in r && 'unita' in r && 'prospetto' in r && 'scala' in r),
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
