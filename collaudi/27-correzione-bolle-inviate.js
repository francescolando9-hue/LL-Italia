// «Bolle inviate»: «Cantiere o fase sbagliati?» (dalla 0.41.1).
//
// Decisione di Francesco del 27/10/2026: dal visore di una bolla inviata si
// rimanda la bolla perché è sbagliata la fase, o il cantiere, o tutti e due.
// Prima il riquadro era «Cantiere sbagliato?»: un menù dei soli ALTRI
// cantieri, e la bolla ripartiva con la fase di prima, anche se tolta. Ora:
// - due menù che partono dai valori della bolla (cantiere e fase), il pulsante
//   «Rimanda corretta» acceso solo se è cambiato almeno uno dei due;
// - la fase della bolla non si perde in silenzio (regola 1, come nella Coda
//   invii, collaudo 26);
// - la conferma e la riga sotto il pulsante dicono solo le parti che cambiano
//   (testi decisi sull'arresto 1, D3);
// - una bolla il cui cantiere non è più nel menù parte da «— scegli il
//   cantiere —» (D4);
// - nessun elemento fisso o sticky del visore copre i comandi del riquadro
//   (regola 5), misurato con `document.elementFromPoint` a 390×844.
// Casi 7–14 e 17 della tabella della specifica, con la stessa numerazione.
//
// I dati: cinque bolle dello stesso giorno, tutte con la foto ancora sul
// telefono (è la condizione del riquadro), scritte nel database come in 25.
// Una ha un cantiere che il menù non ha (`XX9`, inventato).
const { nuovoTelefono, configura, materiale } = require('./aiuto');

const BOLLE = [
  { id: 'b1', ora: '10:50', commessa: 'MAR', fase: 'Strutture', progressivo: 701 },
  { id: 'b2', ora: '10:40', commessa: 'MAR', fase: 'Interrato', progressivo: 702 },
  { id: 'b3', ora: '10:30', commessa: 'MAR', fase: 'Strutture', progressivo: 703 },
  { id: 'b4', ora: '10:20', commessa: 'MNG', fase: 'Murature', progressivo: 704 },
  { id: 'b5', ora: '10:10', commessa: 'XX9', fase: 'Strutture', progressivo: 705 },
];
const GIORNO = '2026-10-23';
const idClient = id => `00000000-0000-4000-8000-0000000270${id.slice(1).padStart(2, '0')}`;
const idBolla = id => `00000000-0000-4000-8000-0000000271${id.slice(1).padStart(2, '0')}`;
const AVVERTENZA = /quella già inviata su \S+ resta in magazzino e va annullata dall'ufficio\./;

module.exports = {
  nome: 'Bolle inviate: «Cantiere o fase sbagliati?», dai valori della bolla, e comandi mai coperti',

  async esegui({ browser, app, flow, registro, aiuto }) {
    const { contesto, pagina, errori } = await nuovoTelefono(browser);
    await configura(pagina, app.indirizzo, {
      bolle: { endpoint: flow.endpoint('bolle'), token: 'PROVA', conservaUltime: 20 },
    });
    // Le conferme: si leggono, e si accettano o si annullano a comando. Il
    // telefono dei collaudi le accetta tutte da sé: qui serve anche dire no.
    pagina.removeAllListeners('dialog');
    const conferme = [];
    let rispondi = true;
    pagina.on('dialog', d => { conferme.push(d.message()); return rispondi ? d.accept() : d.dismiss(); });

    await pagina.goto(app.indirizzo + '/index.html#/bolle');
    await pagina.waitForSelector('#bolle-contatori');
    const b64 = require('fs').readFileSync(materiale('bolla.jpg')).toString('base64');
    await pagina.evaluate(async ({ bolle, b64, giorno }) => {
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
      const db = await new Promise((ok, ko) => { const r = indexedDB.open('llitalia-bolle'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
      const metti = (store, valore) => new Promise((ok, ko) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(valore);
        tx.oncomplete = ok;
        tx.onerror = () => ko(tx.error);
      });
      for (const b of bolle) {
        const dataInvio = `${giorno}T${b.ora}:00+02:00`;
        const inviatoIl = Date.parse(dataInvio);
        await metti('storico', {
          idClient: b.idClient, commessa: b.commessa, fase: b.fase, operatore: 'Paolo Sanzarello', dataInvio, inviatoIl,
          impronta: '', progressivo: b.progressivo, idBolla: b.idBolla, pagina: 1, pagine: 1,
        });
        await metti('miniature', { idClient: b.idClient, blob, inviatoIl });
        await metti('foto', {
          id: b.idClient, stato: 'inviata', foto: blob, cantiere: b.commessa, fase: b.fase, autore: 'Paolo Sanzarello',
          miniatura: blob, impronta: '', qualita: 'ok', motivoQualita: '', nome: `${b.idClient}.jpg`,
          timestampDispositivo: dataInvio, creatoIl: inviatoIl - 60000, accodatoIl: inviatoIl - 50000, tentativi: 0,
          ultimoErrore: '', inviatoIl, idServer: null, progressivo: b.progressivo, idBolla: b.idBolla, pagina: 1, pagine: 1,
        });
      }
      db.close();
    }, { bolle: BOLLE.map(b => ({ ...b, idClient: idClient(b.id), idBolla: idBolla(b.id) })), b64, giorno: GIORNO });
    await pagina.evaluate(() => { location.hash = '#/bolle/storico'; });
    await aiuto.attendi(pagina, () => document.querySelectorAll('.bolle-riga[data-id]').length === 5, 'elenco di 5 bolle', 10000);

    // ------------------------------------------------------------- strumenti
    const attendiContenuto = () => aiuto.attendi(pagina,
      () => !/Apertura/.test(document.querySelector('#visore-contenuto').textContent), 'bolla caricata', 10000);
    // Il riquadro nasce a ogni bolla aperta: il suo marcatore, qualunque sia,
    // dice che i menù sono costruiti. Quale cantiere mostra lo controllano i
    // casi, non l'attesa: un'attesa sul cantiere giusto, con un guasto,
    // fermerebbe il collaudo invece di farlo diventare rosso.
    const apri = async id => {
      await pagina.click(`.bolle-riga[data-id="${idClient(id)}"]`);
      await attendiContenuto();
      await pagina.waitForSelector('#riquadro-correzione');
      await aiuto.attendiMarcatore(pagina, () => true, `riquadro di ${id} pronto`, { prefisso: 'c-' });
    };
    // Cambiando il cantiere si aspetta il marcatore del cantiere nuovo: la
    // fase che ne esce la controllano i casi.
    const scegliCantiere = async codice => {
      await pagina.selectOption('#cantiere-corretto', codice);
      await aiuto.attendiMarcatore(pagina, m => m.startsWith(`${codice}|`), `riquadro su ${codice}`, { prefisso: 'c-' });
    };
    const chiudi = async () => {
      await pagina.click('#chiudi-visore');
      await aiuto.attendi(pagina, () => document.querySelector('#visore').classList.contains('nascosto'), 'visore chiuso', 5000);
    };
    const riquadro = () => pagina.evaluate(() => {
      const r = document.querySelector('#riquadro-correzione');
      if (!r) return null;
      const menu = r.querySelector('#cantiere-corretto');
      const fase = r.querySelector('#c-fase');
      const voce = m => (m.options[m.selectedIndex] ? m.options[m.selectedIndex].textContent.trim() : '');
      return {
        titolo: r.querySelector('.titolo').textContent.trim(),
        cantiere: menu.value,
        voceCantiere: voce(menu),
        vociCantiere: [...menu.options].map(o => o.value),
        fase: fase.value,
        voceFase: voce(fase),
        spento: r.querySelector('#rimanda').disabled,
        pulsante: r.querySelector('#rimanda').textContent.trim(),
        riga: r.querySelector('#spiegazione-correzione').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    const scegli = async (selettore, valore, marcatore) => {
      await pagina.selectOption(selettore, valore);
      await aiuto.attendiMarcatore(pagina, m => m === marcatore, `riquadro su ${marcatore}`, { prefisso: 'c-' });
    };
    const nuovaRichiesta = async (prima, limite = 30000) => {
      const fine = Date.now() + limite;
      while (flow.stato.ricevuti.length <= prima && Date.now() < fine) await new Promise(r => setTimeout(r, 200));
      return flow.stato.ricevuti[prima] || null;
    };
    // Rimanda: si preme, si legge la conferma, e se la si accetta si aspetta
    // la richiesta nuova al flow.
    const rimanda = async (accetta = true) => {
      const primaConferme = conferme.length;
      const primaRichieste = flow.stato.ricevuti.length;
      rispondi = accetta;
      await pagina.click('#rimanda');
      const fine = Date.now() + 5000;
      while (conferme.length === primaConferme && Date.now() < fine) await new Promise(r => setTimeout(r, 100));
      const conferma = conferme[primaConferme] || '';
      const partita = accetta ? await nuovaRichiesta(primaRichieste) : null;
      return { conferma, domanda: conferma.split('\n')[0], partita };
    };
    const contaInCoda = () => pagina.evaluate(async () => {
      const db = await new Promise((ok, ko) => { const r = indexedDB.open('llitalia-bolle'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
      const tutti = await new Promise((ok, ko) => {
        const q = db.transaction('foto', 'readonly').objectStore('foto').getAll();
        q.onsuccess = () => ok(q.result);
        q.onerror = () => ko(q.error);
      });
      db.close();
      return tutti.length;
    });
    const descrivi = s => `${s.cantiere || '(nessuno)'} · ${s.fase || '(nessuna)'} · ${s.spento ? 'spento' : 'acceso'} · «${s.riga}»`;
    const fraseCaso = (fase, scelta) => `La fase «${fase}» non è fra quelle che si possono scegliere per questo cantiere: scegli ${scelta} per rimandarla.`;

    // ================================================================ caso 17
    // Prima di tutto, con l'elenco com'è: i comandi del riquadro non sono mai
    // coperti da un elemento fisso o sticky del visore. Ogni comando si porta
    // in vista in fondo allo schermo (dove stava il piede con le frecce) e in
    // cima (dove sta la ✕), e al suo centro deve esserci lui.
    registro.titolo('Caso 17 · 390×844: i comandi del riquadro non sono coperti, sulla 1ª, 3ª e 5ª bolla');
    const misura = await pagina.evaluate(() => ({ larghezza: window.innerWidth, altezza: window.innerHeight }));
    registro.dice('schermo', `${misura.larghezza}×${misura.altezza}`);
    for (const id of ['b1', 'b3', 'b5']) {
      await apri(id);
      // L'immagine si aspetta caricata: è lei a spingere il riquadro in basso,
      // e senza le sue misure il visore non scorre e non c'è niente da coprire.
      await aiuto.attendi(pagina, () => {
        const img = document.querySelector('#visore-contenuto img');
        return Boolean(img) && img.complete && img.naturalHeight > 0;
      }, 'immagine della bolla caricata', 10000);
      const misure = await pagina.evaluate(() => {
        const visore = document.querySelector('#visore');
        const esiti = [];
        let prove = 0;
        // Un comando è libero se al centro del suo rettangolo visibile c'è lui.
        const prova = (sel, come) => {
          const el = document.querySelector(sel);
          const r = el.getBoundingClientRect();
          const alto = Math.max(r.top, 0);
          const basso = Math.min(r.bottom, window.innerHeight);
          if (basso - alto < r.height / 2) return; // fuori schermo in questa posizione: niente da misurare
          prove += 1;
          const sopra = document.elementFromPoint(r.left + r.width / 2, (alto + basso) / 2);
          if (!(sopra && (sopra === el || el.contains(sopra)))) {
            esiti.push(`${sel} (${come}) coperto da ${sopra ? (sopra.id ? `#${sopra.id}` : sopra.className || sopra.tagName) : 'niente'}`);
          }
        };
        const comandi = ['#cantiere-corretto', '#c-fase', '#rimanda'];
        // All'apertura, come la vede chi tocca la bolla, e poi a ogni passo di
        // scorrimento di 40 px fino in fondo: ogni posizione in cui un comando
        // è sullo schermo.
        const corsa = visore.scrollHeight - visore.clientHeight;
        for (let y = 0; y <= corsa + 40; y += 40) {
          visore.scrollTop = Math.min(y, corsa);
          for (const sel of comandi) prova(sel, `scorso di ${visore.scrollTop} px`);
        }
        for (const sel of comandi) {
          for (const blocco of ['end', 'start', 'center']) {
            document.querySelector(sel).scrollIntoView({ block: blocco });
            prova(sel, blocco);
          }
        }
        visore.scrollTop = 0;
        return { esiti, prove, corsa };
      });
      const posizione = await pagina.$eval('.bolle-visore-posizione', e => e.textContent);
      registro.dice(`${id}`, `il visore scorre di ${misure.corsa} px · ${misure.prove} misure`);
      registro.controlla(`caso 17 · ${id} (${posizione}): menù del cantiere, menù della fase e pulsante mai coperti, in ogni posizione di scorrimento`,
        misure.corsa > 0 && misure.prove > 0 && misure.esiti.length === 0,
        misure.esiti.slice(0, 3).join(' | ') || `${misure.prove} misure libere su ${misure.prove}`);
      await chiudi();
    }

    // ================================================================ caso 7
    registro.titolo('Caso 7 · bolla MAR «Strutture» con la foto sul telefono');
    await apri('b1');
    let s = await riquadro();
    registro.dice('riquadro', s);
    registro.controlla('caso 7 · il riquadro si chiama «Cantiere o fase sbagliati?»', s.titolo === 'Cantiere o fase sbagliati?', s.titolo);
    registro.controlla('caso 7 · cantiere MAR e fase «Strutture» selezionati: i valori della bolla',
      s.cantiere === 'MAR' && s.fase === 'Strutture', `${s.cantiere} · ${s.fase}`);
    registro.controlla('caso 7 · il menù ha tutti gli otto cantieri, compreso quello della bolla, e nessun segnaposto',
      s.vociCantiere.length === 8 && s.vociCantiere.includes('MAR') && !s.vociCantiere.includes(''), s.vociCantiere.join(' '));
    registro.controlla('caso 7 · il pulsante «Rimanda corretta» è spento', s.spento === true && s.pulsante === 'Rimanda corretta', descrivi(s));
    registro.controlla('caso 7 · la riga dice cosa manca: «Cambia il cantiere o la fase per rimandarla.»',
      s.riga === 'Cambia il cantiere o la fase per rimandarla.', `«${s.riga}»`);

    // ================================================================ caso 8
    registro.titolo('Caso 8 · cambia solo la fase, in «Murature»');
    await scegli('#c-fase', 'Murature', 'MAR|Murature');
    s = await riquadro();
    registro.controlla('caso 8 · il pulsante si accende', s.spento === false, descrivi(s));
    registro.controlla('caso 8 · la riga dice cosa cambierà', s.riga === 'Cambia: fase Murature. Invio nuovo, con un identificativo nuovo.', `«${s.riga}»`);
    let esito = await rimanda();
    registro.dice('conferma', esito.conferma.replace(/\n+/g, ' / '));
    registro.controlla('caso 8 · la conferma: «Rimandare questa bolla con fase Murature?», e l’avvertenza di oggi',
      esito.domanda === 'Rimandare questa bolla con fase Murature?' && AVVERTENZA.test(esito.conferma), esito.domanda);
    let p = esito.partita;
    registro.dice('partita', p && `idClient ${p.idClient} · ${p.commessa} · ${p.fase} · idBolla ${p.idBolla} · pag. ${p.pagina}/${p.pagine}`);
    registro.controlla('caso 8 · parte su MAR con fase Murature, identificativo nuovo, stessa pagina della stessa bolla',
      Boolean(p) && p.commessa === 'MAR' && p.fase === 'Murature' && p.idClient !== idClient('b1')
        && p.idBolla === idBolla('b1') && p.pagina === 1 && p.pagine === 1, p ? `${p.commessa} · ${p.fase}` : 'niente partito');
    await chiudi();

    // ================================================================ caso 9
    registro.titolo('Caso 9 · cambia solo il cantiere, in MNG');
    await apri('b1');
    await scegliCantiere('MNG');
    s = await riquadro();
    registro.controlla('caso 9 · la fase resta «Strutture» e il pulsante si accende', s.fase === 'Strutture' && s.spento === false, descrivi(s));
    registro.controlla('caso 9 · la riga: «Cambia: cantiere MNG. …»', s.riga === 'Cambia: cantiere MNG. Invio nuovo, con un identificativo nuovo.', `«${s.riga}»`);
    esito = await rimanda();
    registro.controlla('caso 9 · la conferma: «Rimandare questa bolla su MNG?»', esito.domanda === 'Rimandare questa bolla su MNG?', esito.domanda);
    p = esito.partita;
    registro.controlla('caso 9 · parte su MNG con fase Strutture',
      Boolean(p) && p.commessa === 'MNG' && p.fase === 'Strutture' && p.idClient !== idClient('b1'), p ? `${p.commessa} · ${p.fase}` : 'niente partito');
    await chiudi();

    // ================================================================ caso 10
    registro.titolo('Caso 10 · cambiano tutti e due');
    await apri('b1');
    await scegliCantiere('MNG');
    await scegli('#c-fase', 'Murature', 'MNG|Murature');
    s = await riquadro();
    registro.controlla('caso 10 · la riga: «Cambia: cantiere MNG, fase Murature. …»',
      s.riga === 'Cambia: cantiere MNG, fase Murature. Invio nuovo, con un identificativo nuovo.', `«${s.riga}»`);
    esito = await rimanda();
    registro.controlla('caso 10 · la conferma: «Rimandare questa bolla su MNG, fase Murature?»',
      esito.domanda === 'Rimandare questa bolla su MNG, fase Murature?', esito.domanda);
    p = esito.partita;
    registro.controlla('caso 10 · parte coi due valori nuovi', Boolean(p) && p.commessa === 'MNG' && p.fase === 'Murature',
      p ? `${p.commessa} · ${p.fase}` : 'niente partito');
    await chiudi();

    // ================================================================ caso 13
    registro.titolo('Caso 13 · conferma annullata');
    await apri('b1');
    await scegli('#c-fase', 'Murature', 'MAR|Murature');
    const inCodaPrima = await contaInCoda();
    const richiestePrima = flow.stato.ricevuti.length;
    esito = await rimanda(false);
    await pagina.waitForTimeout(1500);
    const inCodaDopo = await contaInCoda();
    registro.dice('conferma annullata', esito.domanda);
    registro.controlla('caso 13 · niente parte e niente entra in coda',
      Boolean(esito.domanda) && flow.stato.ricevuti.length === richiestePrima && inCodaDopo === inCodaPrima,
      `${flow.stato.ricevuti.length - richiestePrima} richieste · elementi nel telefono ${inCodaPrima} → ${inCodaDopo}`);

    // ======================================== D3: la fase tolta apposta
    registro.titolo('D3 · fase tolta apposta («— nessuna fase —» su una fase che c’è)');
    await scegli('#c-fase', '', 'MAR|');
    s = await riquadro();
    registro.controlla('D3 · il pulsante si accende e la riga dice «Cambia: senza fase. …»',
      s.spento === false && s.riga === 'Cambia: senza fase. Invio nuovo, con un identificativo nuovo.', descrivi(s));
    esito = await rimanda();
    registro.controlla('D3 · la conferma: «Rimandare questa bolla senza fase?»', esito.domanda === 'Rimandare questa bolla senza fase?', esito.domanda);
    p = esito.partita;
    registro.controlla('D3 · parte su MAR senza fase, perché l’ha deciso chi la rimanda',
      Boolean(p) && p.commessa === 'MAR' && p.fase === '', p ? `${p.commessa} · ${JSON.stringify(p.fase)}` : 'niente partito');
    await chiudi();

    // ================================================================ caso 11
    registro.titolo('Caso 11 · bolla con fase «Interrato» (tolta dal master)');
    await apri('b2');
    s = await riquadro();
    registro.dice('riquadro', s);
    registro.controlla('caso 11 · fase su «— nessuna fase —», pulsante spento, la frase del caso',
      s.fase === '' && s.voceFase === '— nessuna fase —' && s.spento === true && s.riga === fraseCaso('Interrato', 'la fase'), descrivi(s));
    await scegliCantiere('MNG');
    s = await riquadro();
    registro.controlla('caso 11 · cambiato il cantiere, ancora spento e con la frase',
      s.fase === '' && s.spento === true && s.riga === fraseCaso('Interrato', 'la fase'), descrivi(s));
    await scegli('#c-fase', 'Strutture', 'MNG|Strutture');
    s = await riquadro();
    registro.controlla('caso 11 · scelta una fase, si accende', s.spento === false, descrivi(s));
    await chiudi();

    // ================================================================ caso 12
    registro.titolo('Caso 12 · bolla MAR «Strutture», cantiere cambiato in SNU');
    await apri('b3');
    await scegliCantiere('SNU');
    s = await riquadro();
    registro.controlla('caso 12 · il menù sta su «— nessun lotto —», pulsante spento, la frase chiede il lotto',
      s.fase === '' && s.voceFase === '— nessun lotto —' && s.spento === true && s.riga === fraseCaso('Strutture', 'il lotto'), descrivi(s));
    await scegli('#c-fase', 'Lotto1', 'SNU|Lotto1');
    s = await riquadro();
    registro.controlla('caso 12 · scelto «Lotto 1» si accende, e la riga: «Cambia: cantiere SNU, Lotto 1. …»',
      s.spento === false && s.riga === 'Cambia: cantiere SNU, Lotto 1. Invio nuovo, con un identificativo nuovo.', descrivi(s));
    esito = await rimanda();
    registro.controlla('caso 12 · la conferma: «Rimandare questa bolla su SNU, Lotto 1?»', esito.domanda === 'Rimandare questa bolla su SNU, Lotto 1?', esito.domanda);
    p = esito.partita;
    registro.controlla('caso 12 · parte su SNU con Lotto1', Boolean(p) && p.commessa === 'SNU' && p.fase === 'Lotto1',
      p ? `${p.commessa} · ${p.fase}` : 'niente partito');
    await chiudi();

    // ================================================================ caso 14
    // La scelta non mandata è diversa dai valori della bolla dopo (MNG ·
    // Murature): se il riquadro se la portasse dietro, si vedrebbe.
    registro.titolo('Caso 14 · scelta non mandata, poi gesto alla bolla successiva');
    await apri('b3');
    await scegliCantiere('SNZ2.2');
    await scegli('#c-fase', 'Cantiere', 'SNZ2.2|Cantiere');
    const conferme14 = conferme.length;
    const richieste14 = flow.stato.ricevuti.length;
    await pagina.evaluate(() => {
      const visore = document.querySelector('#visore');
      const t = (x, y) => new Touch({ identifier: 1, target: visore, clientX: x, clientY: y });
      const a = t(300, 400);
      const b = t(120, 410);
      visore.dispatchEvent(new TouchEvent('touchstart', { touches: [a], targetTouches: [a], changedTouches: [a], bubbles: true }));
      visore.dispatchEvent(new TouchEvent('touchmove', { touches: [b], targetTouches: [b], changedTouches: [b], bubbles: true }));
      visore.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [b], bubbles: true }));
    });
    await aiuto.attendi(pagina, () => /4 di 5/.test(document.querySelector('.bolle-visore-posizione').textContent), 'bolla successiva', 10000);
    await attendiContenuto();
    await pagina.waitForSelector('#riquadro-correzione');
    await aiuto.attendiMarcatore(pagina, () => true, 'riquadro della bolla dopo pronto', { prefisso: 'c-' });
    s = await riquadro();
    registro.controlla('caso 14 · il riquadro riparte dai valori della bolla nuova (MNG · Murature), pulsante spento',
      s.cantiere === 'MNG' && s.fase === 'Murature' && s.spento === true, descrivi(s));
    registro.controlla('caso 14 · la scelta non mandata si perde senza conferme e senza invii',
      conferme.length === conferme14 && flow.stato.ricevuti.length === richieste14,
      `${conferme.length - conferme14} conferme · ${flow.stato.ricevuti.length - richieste14} invii`);
    await chiudi();

    // ======================================== D4: cantiere della bolla non nel menù
    registro.titolo('D4 · bolla con un cantiere che non è più nel menù (XX9, inventato)');
    await apri('b5');
    s = await riquadro();
    registro.dice('riquadro', s);
    registro.controlla('D4 · il menù parte da «— scegli il cantiere —», non dalla prima voce',
      s.cantiere === '' && s.voceCantiere === '— scegli il cantiere —' && s.vociCantiere.length === 9, `«${s.voceCantiere}» · ${s.vociCantiere.length} voci`);
    registro.controlla('D4 · pulsante spento, e la riga chiede il cantiere',
      s.spento === true && s.riga === 'Scegli il cantiere per rimandarla.', descrivi(s));
    await scegliCantiere('MAR');
    s = await riquadro();
    registro.controlla('D4 · scelto MAR, la fase della bolla resta e il pulsante si accende',
      s.fase === 'Strutture' && s.spento === false, descrivi(s));
    await chiudi();

    registro.controllaConsole(errori);
    await contesto.close();
  },
};
