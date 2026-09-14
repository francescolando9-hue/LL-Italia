// La fase di lavoro, in entrambi i moduli, e la barra dei comandi delle bolle.
//
// Richieste 3 e 4 del 14/09/2026. La fase è un elenco chiuso di gruppo
// (core/fasi.js) e si sceglie con Invia, come il cantiere: qui si prova che
// senza non si parte, che scelta una volta si ripropone, e che al flow arriva
// con la grafia esatta. La barra: con dieci bolle da mandare si finiva a
// scorrere su e giù per ritrovare ora Fotografa ora Invia — devono stare
// tutti e due sempre a portata di pollice.
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const QUANTE_FASI = 27;

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

    registro.titolo('Bolle: la fase si sceglie, e senza non si invia');
    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#fase');
    const voci = await pagina.$$eval('#fase option', o => o.map(e => ({ v: e.value, t: e.textContent.trim(), d: e.disabled })));
    const nomi = voci.filter(o => o.v).map(o => o.t);
    registro.dice('fasi a video', `${nomi.length}: ${nomi[0]} … ${nomi[nomi.length - 1]}`);
    registro.controlla(`ci sono le ${QUANTE_FASI} fasi date da Francesco`, nomi.length === QUANTE_FASI, String(nomi.length));
    registro.controlla('in ordine alfabetico', nomi[0] === 'Bonifica' && nomi[nomi.length - 1] === 'Urbanizzazioni');
    registro.controlla('parte da un segnaposto non selezionabile', voci[0].v === '' && voci[0].d && /scegli/i.test(voci[0].t), voci[0].t);
    registro.controlla('il campo è un menù a tendina, non testo libero',
      (await pagina.$eval('#fase', e => e.tagName.toLowerCase())) === 'select');

    await pagina.setInputFiles('#input-galleria', [materiale('bolla.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await pagina.selectOption('#cantiere', 'MAR');
    await aiuto.attendi(pagina, () => document.querySelector('#avviso-cantiere').textContent.trim() !== '', 'avviso', 10000);
    registro.controlla('con cantiere e senza fase Invia resta spento', await pagina.$eval('#invia', e => e.disabled));
    const avviso = await pagina.$eval('#avviso-cantiere', e => e.textContent.trim());
    registro.dice('avviso', avviso);
    registro.controlla('e l’app dice che manca la fase', /la fase/.test(avviso) && !/cantiere/.test(avviso));

    await pagina.selectOption('#fase', 'Murature');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(1);
    registro.dice('payload bolla → fase', flow.stato.ricevuti[0] && flow.stato.ricevuti[0].fase);
    registro.controlla('la fase arriva al flow con la grafia dell’elenco', flow.stato.ricevuti[0].fase === 'Murature');
    registro.controlla('accanto a commessa e operatore, che non cambiano',
      flow.stato.ricevuti[0].commessa === 'MAR' && flow.stato.ricevuti[0].operatore === 'Paolo Sanzarello');

    registro.titolo('Scelta una volta, la fase si ripropone: il giro resta di tre tocchi');
    await pagina.reload();
    await pagina.waitForSelector('#fase');
    registro.controlla('dopo la ricarica la fase è già selezionata',
      (await pagina.$eval('#fase', e => e.value)) === 'Murature');
    await pagina.setInputFiles('#input-galleria', [materiale('bolla2.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-anteprima').length === 1, 'anteprima', 60000);
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso senza toccare nulla', 10000);
    registro.controlla('foto → Invia, senza altri tocchi', true);
    await pagina.click('#invia');
    await attendiRicevuti(2);
    registro.controlla('la seconda bolla porta la stessa fase', flow.stato.ricevuti[1].fase === 'Murature');
    const inCoda = await pagina.$$eval('#lista-coda .bolle-voce .riga', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    registro.controlla('la coda mostra la fase accanto al cantiere', inCoda.every(t => /Murature/.test(t)), inCoda[0]);

    registro.titolo('Bolle: Fotografa e Invia stanno in una barra fissa in basso');
    const misure = await pagina.evaluate(() => {
      const barra = document.querySelector('.bolle-barra');
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
      const coperto = ultimo ? ultimo.getBoundingClientRect().bottom > document.querySelector('.bolle-barra').getBoundingClientRect().top : false;
      return { invia: dentro(document.querySelector('#invia')), fotografa: dentro(document.querySelector('#apri-fotocamera') || document.querySelector('label[for="input-camera"]')), ultimaRigaCoperta: coperto };
    });
    registro.controlla('scorrendo in fondo, Invia è ancora sullo schermo', visibili.invia);
    registro.controlla('e anche Fotografa', visibili.fotografa);
    registro.controlla('l’ultima riga della coda non finisce sotto la barra', !visibili.ultimaRigaCoperta);

    registro.titolo('Foto cantiere: stessa fase, stesso elenco, stessa regola');
    await pagina.goto(app.indirizzo + '/index.html#/foto');
    await pagina.waitForSelector('#fase');
    const nomiFoto = await pagina.$$eval('#fase option', o => o.filter(e => e.value).map(e => e.textContent.trim()));
    registro.controlla('l’elenco è identico a quello delle bolle', nomiFoto.join('|') === nomi.join('|'),
      'due elenchi separati sarebbero due verità destinate a divergere');
    registro.controlla('e qui nessuna fase è preselezionata: sono moduli diversi',
      (await pagina.$eval('#fase', e => e.value)) === '');
    await pagina.selectOption('#categoria', 'AVANZAMENTO');
    await pagina.selectOption('#commessa', 'SNZ2.2');
    await pagina.setInputFiles('#input-galleria', [materiale('foto-cantiere.jpg')]);
    await aiuto.attendi(pagina, () => document.querySelectorAll('.foto-anteprima').length === 1, 'anteprima', 90000);
    registro.controlla('senza fase Invia resta spento', await pagina.$eval('#invia', e => e.disabled));
    const avvisoFoto = await pagina.$eval('#avviso-invio', e => e.textContent.trim());
    registro.controlla('e l’avviso nomina la fase', /la fase/.test(avvisoFoto), avvisoFoto);
    await pagina.selectOption('#fase', 'Impianto fotovoltaico');
    await aiuto.attendi(pagina, () => !document.querySelector('#invia').disabled, 'Invia acceso', 10000);
    await pagina.click('#invia');
    await attendiRicevuti(3);
    const foto = flow.stato.ricevuti[2];
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
