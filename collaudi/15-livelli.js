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
      await pagina.selectOption('#categoria', 'ARCHIVIO');
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
    await pagina.selectOption('#categoria', 'ARCHIVIO');

    // Scegliere la FASE e aspettare che i menù dei livelli si siano rifatti:
    // il marcatore `data-livelli` dice per quale coppia commessa/fase sono
    // costruiti, e finché non combacia si stanno leggendo quelli di prima.
    const scegliFase = async codice => {
      await pagina.selectOption('#fase', codice);
      await aiuto.attendi(pagina, cod =>
        document.querySelector('#fase').dataset.livelli.endsWith(`|${cod}`),
        `livelli rifatti per ${codice}`, 10000, codice);
    };

    registro.titolo('Urbanizzazioni: al posto delle fasi, i lotti');
    await scegliCommessa('#commessa', 'SNU');
    const lottiSNU = await voci('#fase');
    registro.dice('SNU offre', lottiSNU.join(' '));
    registro.controlla('SNU ha quattro lotti', lottiSNU.join(',') === 'Lotto1,Lotto2,Lotto3,Lotto4');
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
    await scegliCommessa('#commessa', 'MNG');
    const fasiMNG = await voci('#fase');
    registro.controlla('MNG la mostra, perché ha due interrati', fasiMNG.includes('Interrato'));
    registro.controlla('e sono tutte e 26', fasiMNG.length === 26, String(fasiMNG.length));
    await scegliFase('Interrato');
    const pianiInterrato = await voci('#piano');
    registro.dice('MNG, fase Interrato: piani offerti', pianiInterrato.join(' '));
    registro.controlla('per Interrato solo i piani sotto quota',
      pianiInterrato.join(',') === 'P-2,P-1',
      '«Interrato, piano terzo» è una scelta che non vuol dire niente');
    await scegliCommessa('#commessa', 'SNZ2.2');
    await scegliFase('Interrato');
    registro.controlla('su SNZ2.2, che ha un interrato solo, ne offre uno',
      (await voci('#piano')).join(',') === 'P-1');

    registro.titolo('Piano obbligatorio: senza, non si parte');
    await scegliCommessa('#commessa', 'MAR');
    await scegliFase('Strutture');
    registro.controlla('compare il menù del piano', await visibile('#campo-piano'));
    registro.controlla('e non quelli di unità e prospetto',
      !(await visibile('#campo-unita')) && !(await visibile('#campo-prospetto')));
    registro.dice('MAR: piani offerti', (await voci('#piano')).join(' '));
    registro.controlla('sono i tre di MAR', (await voci('#piano')).join(',') === 'P0,P1,P2');
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
      '55 voci di fila su SNZ2.2 non si scorrono col pollice');
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
    registro.controlla('una commessa senza anagrafica mostra tutte e 26 le fasi',
      fasiMRS.length === 26 && fasiMRS.includes('Interrato'), String(fasiMRS.length));
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
      (await voci('#fase')).join(',') === 'Lotto1,Lotto2,Lotto3,Lotto4'
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

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
