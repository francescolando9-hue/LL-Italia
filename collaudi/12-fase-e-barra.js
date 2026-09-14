// La fase di lavoro, in entrambi i moduli, e la barra dei comandi delle bolle.
//
// Richieste 3 e 4 del 14/09/2026. La fase è un elenco chiuso di gruppo
// (core/fasi.js) e si sceglie con Invia, come il cantiere — ma è FACOLTATIVA,
// in tutti i moduli, per decisione di Francesco: qui si prova che senza si
// invia lo stesso e il campo parte vuoto, che scelta una volta si ripropone
// («nessuna» compresa), e che al flow arriva con la grafia esatta. La barra:
// con dieci bolle da mandare si finiva a scorrere su e giù per ritrovare ora
// Fotografa ora Invia — devono stare tutti e due sempre a portata di pollice.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

// 27 date da Francesco, meno «CMC 128» che lui stesso ha tolto: era un codice
// di commessa finito in un elenco di fasi.
const QUANTE_FASI = 26;

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
    const mandaBolla = async file => {
      await pagina.setInputFiles('#input-galleria', [materiale(file)]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
    };

    registro.titolo('Bolle: la fase si sceglie da un elenco, e non è obbligatoria');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#fase');
    const voci = await pagina.$$eval('#fase option', o => o.map(e => ({ v: e.value, t: e.textContent.trim(), d: e.disabled })));
    const nomi = voci.filter(o => o.v).map(o => o.t);
    registro.dice('fasi a video', `${nomi.length}: ${nomi[0]} … ${nomi[nomi.length - 1]}`);
    registro.controlla(`ci sono le ${QUANTE_FASI} fasi`, nomi.length === QUANTE_FASI, String(nomi.length));
    registro.controlla('«CMC 128» non c\'è più', !nomi.includes('CMC 128'), 'tolta da Francesco il 14/09: è una commessa, non una fase');
    registro.controlla('in ordine alfabetico', nomi[0] === 'Bonifica' && nomi[nomi.length - 1] === 'Urbanizzazioni');
    registro.controlla('la prima voce è «nessuna fase», selezionabile',
      voci[0].v === '' && !voci[0].d && /nessuna/i.test(voci[0].t), voci[0].t);
    registro.controlla('il campo è un menù a tendina, non testo libero',
      (await pagina.$eval('#fase', e => e.tagName.toLowerCase())) === 'select');

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

    registro.titolo('Scelta una volta, la fase si ripropone; e «nessuna» è una scelta come le altre');
    await pagina.selectOption('#fase', 'Murature');
    await mandaBolla('bolla2.jpg');
    await attendiRicevuti(2);
    registro.controlla('la fase arriva al flow con la grafia dell’elenco', flow.stato.ricevuti[1].fase === 'Murature');
    registro.controlla('accanto a commessa e operatore, che non cambiano',
      flow.stato.ricevuti[1].commessa === 'MAR' && flow.stato.ricevuti[1].operatore === 'Paolo Sanzarello');
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    registro.controlla('dopo la ricarica la fase è già selezionata',
      (await pagina.$eval('#fase', e => e.value)) === 'Murature');
    await mandaBolla('bolla.jpg');
    await attendiRicevuti(3);
    registro.controlla('foto → Invia, senza altri tocchi: la terza bolla porta la stessa fase',
      flow.stato.ricevuti[2].fase === 'Murature');
    await pagina.selectOption('#fase', '');
    await mandaBolla('bolla2.jpg');
    await attendiRicevuti(4);
    registro.controlla('tornati a «nessuna», il campo parte di nuovo vuoto', flow.stato.ricevuti[3].fase === '');
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    registro.controlla('e «nessuna» si ricorda come le altre', (await pagina.$eval('#fase', e => e.value)) === '');
    const inCoda = await pagina.$$eval('#lista-coda .bolle-voce .riga', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    registro.dice('righe della coda', inCoda);
    registro.controlla('la coda mostra la fase dove c’è, e niente dove non c’è',
      inCoda.filter(t => /Murature/.test(t)).length === 2 && inCoda.every(t => !/·\s*·/.test(t)));

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

    registro.titolo('Foto cantiere: stesso elenco, stessa regola');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#fase');
    const nomiFoto = await pagina.$$eval('#fase option', o => o.filter(e => e.value).map(e => e.textContent.trim()));
    registro.controlla('l’elenco è identico a quello delle bolle', nomiFoto.join('|') === nomi.join('|'),
      'due elenchi separati sarebbero due verità destinate a divergere');
    registro.controlla('e qui nessuna fase è preselezionata: sono moduli diversi',
      (await pagina.$eval('#fase', e => e.value)) === '');
    const mandaFoto = async () => {
      await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
      await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
      await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
      await pagina.click('#invia');
    };
    await pagina.selectOption('#categoria', 'AVANZAMENTO');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await mandaFoto();
    await attendiRicevuti(5);
    registro.controlla('senza fase la foto parte, col campo vuoto', flow.stato.ricevuti[4].fase === '');
    registro.controlla('e nessun avviso chiede la fase',
      !/fase/i.test(await pagina.$eval('#avviso-invio', e => e.textContent)));
    await pagina.selectOption('#fase', 'Impianto fotovoltaico');
    await mandaFoto();
    await attendiRicevuti(6);
    const foto = flow.stato.ricevuti[5];
    registro.dice('payload foto → fase', foto.fase);
    registro.controlla('la fase arriva al flow', foto.fase === 'Impianto fotovoltaico');
    registro.controlla('insieme al resto del contratto', foto.commessa === 'SNZ2.2' && foto.tipo === 'AVANZAMENTO' && foto.scattoStimato);
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    registro.controlla('e si ripropone alla prossima apertura', (await pagina.$eval('#fase', e => e.value)) === 'Impianto fotovoltaico');

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
