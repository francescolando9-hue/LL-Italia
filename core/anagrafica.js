// Anagrafica dei livelli dell'archivio di commessa: piani, unità, prospetti,
// lotti, e quale livello ogni fase pretende.
//
// **È DATO, NON LOGICA.** Il blocco `ANAGRAFICA` qui sotto è la copia di un
// master che vive su `L:` e si sostituisce in blocco quando cambia: non si
// corregge una voce a mano, non si deduce una mappatura che non c'è, non si
// aggiunge una commessa di propria iniziativa. Il campo `versione` dice quale
// copia è questa, e compare nella pagina Informazioni: quando l'ufficio dice
// «ho aggiornato l'anagrafica» si confronta quel numero, invece di fidarsi.
//
// A cosa serve. Dal 18/09/2026 l'archivio di commessa sul server ha UN LIVELLO
// sotto la fase, e dove quel livello è obbligatorio **sostituisce la cartella
// del mese** — deciso da Francesco:
//
//   Bonifica\202609\               fase senza livelli: resta il mese
//   Strutture\P1\                  piano obbligatorio
//   FinituraAlloggi\P1\1.01\       unità obbligatoria, piano derivato
//   FinituraFacciata\Nord\         prospetto obbligatorio
//   Lotto2\202609\                 urbanizzazioni: il lotto fa da fase
//
// **Non esistono livelli facoltativi:** ogni fase o pretende il livello, o non
// lo chiede. È la regola che rende il percorso calcolabile senza eccezioni, e
// il motivo per cui `livelliPerFase` ha tre valori e non quattro.
//
// Perché la mappa unità → piano sta qui e non si calcola. Le commesse numerano
// le unità in modi diversi: `1.01` in MAR, `1A` in MNG e in SNZ2.2. Dedurre il
// piano dal codice dell'unità funzionerebbe su MAR e sbaglierebbe su MNG il
// giorno che qualcuno numera `10A` — e sbaglierebbe in silenzio, mettendo la
// foto in una cartella che esiste. Si legge dalla mappa, sempre.
//
// Commesse senza anagrafica. SNZ2.1 e MRS sono concluse, e una commessa nuova
// non ce l'ha ancora: per loro non c'è nessun livello da offrire, le fasi
// restano tutte disponibili e i tre campi non viaggiano. A valle la foto
// finisce nella cartella del mese con un'anomalia — voluto: non blocca chi sta
// scattando in cantiere per un dato che manca in ufficio.

import { FASI, etichettaFase } from './fasi.js';

export const ANAGRAFICA = {
  versione: '202609181330',
  prospettiStandard: ['Nord', 'Sud', 'Est', 'Ovest'],
  // 'O' = obbligatorio, il selettore compare e senza la scelta non si invia.
  // 'D' = derivato: non si chiede, si ricava dalla mappa e si manda comunque.
  // '-' = il selettore non compare e il campo non viaggia.
  livelliPerFase: {
    Bonifica:                     { piano: '-', unita: '-', prospetto: '-' },
    Cantiere:                     { piano: '-', unita: '-', prospetto: '-' },
    Consolidamento:               { piano: '-', unita: '-', prospetto: '-' },
    Demolizione:                  { piano: '-', unita: '-', prospetto: '-' },
    Extra:                        { piano: '-', unita: '-', prospetto: '-' },
    FinituraAlloggi:              { piano: 'D', unita: 'O', prospetto: '-' },
    FinituraFacciata:             { piano: '-', unita: '-', prospetto: 'O' },
    FinituraPartiComuniInterne:   { piano: 'O', unita: '-', prospetto: '-' },
    Impermeabilizzazioni:         { piano: 'O', unita: '-', prospetto: '-' },
    ImpiantiDiReteCondominiali:   { piano: 'O', unita: '-', prospetto: '-' },
    ImpiantoAntincendio:          { piano: 'O', unita: '-', prospetto: '-' },
    ImpiantoAscensore:            { piano: '-', unita: '-', prospetto: '-' },
    ImpiantoElettricoAlloggi:     { piano: 'D', unita: 'O', prospetto: '-' },
    ImpiantoElettricoPartiComuni: { piano: 'O', unita: '-', prospetto: '-' },
    ImpiantoFotovoltaico:         { piano: '-', unita: '-', prospetto: '-' },
    ImpiantoIdrosanitario:        { piano: 'D', unita: 'O', prospetto: '-' },
    ImpiantoSEFCC:                { piano: 'O', unita: '-', prospetto: '-' },
    ImpiantoTermicoAlloggi:       { piano: 'D', unita: 'O', prospetto: '-' },
    ImpiantoTermicoCondominiale:  { piano: 'O', unita: '-', prospetto: '-' },
    Interrato:                    { piano: 'O', unita: '-', prospetto: '-' },
    Marketing:                    { piano: '-', unita: '-', prospetto: '-' },
    Murature:                     { piano: 'O', unita: '-', prospetto: '-' },
    Ponteggio:                    { piano: '-', unita: '-', prospetto: '-' },
    Scavi:                        { piano: '-', unita: '-', prospetto: '-' },
    Strutture:                    { piano: 'O', unita: '-', prospetto: '-' },
    Urbanizzazioni:               { piano: '-', unita: '-', prospetto: '-' },
    Lotto1:                       { piano: '-', unita: '-', prospetto: '-' },
    Lotto2:                       { piano: '-', unita: '-', prospetto: '-' },
    Lotto3:                       { piano: '-', unita: '-', prospetto: '-' },
    Lotto4:                       { piano: '-', unita: '-', prospetto: '-' },
  },
  commesse: {
    MAR: {
      tipo: 'edificio',
      piani: [
        { codice: 'P0', etichetta: 'Piano terra',   ordine: 0 },
        { codice: 'P1', etichetta: 'Piano primo',   ordine: 1 },
        { codice: 'P2', etichetta: 'Piano secondo', ordine: 2 },
      ],
      unita: {
        P0: ['0.01', '0.02', '0.03', '0.04', '0.05'],
        P1: ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06'],
        P2: ['2.01', '2.02', '2.03', '2.04'],
      },
      etichetteUnita: {},
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    MNG: {
      tipo: 'edificio',
      piani: [
        { codice: 'P-2', etichetta: 'Secondo piano interrato', ordine: -2 },
        { codice: 'P-1', etichetta: 'Primo piano interrato',   ordine: -1 },
        { codice: 'P0',  etichetta: 'Piano terra',             ordine: 0 },
        { codice: 'P1',  etichetta: 'Piano primo',             ordine: 1 },
        { codice: 'P2',  etichetta: 'Piano secondo',           ordine: 2 },
        { codice: 'P3',  etichetta: 'Piano terzo',             ordine: 3 },
        { codice: 'P4',  etichetta: 'Piano quarto',            ordine: 4 },
        { codice: 'P5',  etichetta: 'Piano quinto',            ordine: 5 },
        { codice: 'P6',  etichetta: 'Piano sesto',             ordine: 6 },
        { codice: 'P7',  etichetta: 'Piano settimo',           ordine: 7 },
        { codice: 'P8',  etichetta: 'Piano ottavo',            ordine: 8 },
      ],
      unita: {
        'P-2': [], 'P-1': [],
        P0: ['0A'],
        P1: ['1A', '1B'], P2: ['2A', '2B'], P3: ['3A', '3B'], P4: ['4A', '4B'],
        P5: ['5A', '5B'], P6: ['6A', '6B'], P7: ['7A', '7B'],
        P8: ['8B'],
      },
      etichetteUnita: {
        '0A': 'Trilocale con giardino esterno',
        '1A': 'Quadrilocale', '1B': 'Cinquelocali',
        '2A': 'Quadrilocale', '2B': 'Cinquelocali',
        '3A': 'Quadrilocale', '3B': 'Cinquelocali',
        '4A': 'Quadrilocale', '4B': 'Cinquelocali',
        '5A': 'Quadrilocale', '5B': 'Cinquelocali',
        '6A': 'Quadrilocale', '6B': 'Cinquelocali',
        '7A': 'Quadrilocale', '7B': 'Cinquelocali',
        '8B': "Attico (superficie di quadrilocale piu' cinquelocali)",
      },
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    'SNZ2.2': {
      tipo: 'edificio',
      piani: [
        { codice: 'P-1', etichetta: 'Primo piano interrato', ordine: -1 },
        { codice: 'P0',  etichetta: 'Piano terra',           ordine: 0 },
        { codice: 'P1',  etichetta: 'Piano primo',           ordine: 1 },
        { codice: 'P2',  etichetta: 'Piano secondo',         ordine: 2 },
        { codice: 'P3',  etichetta: 'Piano terzo',           ordine: 3 },
        { codice: 'P4',  etichetta: 'Piano quarto',          ordine: 4 },
        { codice: 'P5',  etichetta: 'Piano quinto',          ordine: 5 },
        { codice: 'P6',  etichetta: 'Piano sesto',           ordine: 6 },
        { codice: 'P7',  etichetta: 'Piano settimo',         ordine: 7 },
        { codice: 'P8',  etichetta: 'Piano ottavo',          ordine: 8 },
        { codice: 'P9',  etichetta: 'Piano nono',            ordine: 9 },
        { codice: 'P10', etichetta: 'Piano decimo',          ordine: 10 },
        { codice: 'P11', etichetta: 'Piano undicesimo',      ordine: 11 },
        { codice: 'P12', etichetta: 'Piano dodicesimo',      ordine: 12 },
      ],
      unita: {
        'P-1': [],
        P0:  ['0A', '0B', '0C'],
        P1:  ['1A', '1B', '1C', '1D'],
        P2:  ['2A', '2B', '2C', '2D'],
        P3:  ['3A', '3B', '3C', '3D'],
        P4:  ['4A', '4B', '4C', '4D'],
        P5:  ['5A', '5B', '5C', '5D'],
        P6:  ['6A', '6B', '6C', '6D'],
        P7:  ['7A', '7B', '7C', '7D'],
        P8:  ['8A', '8B', '8C', '8D'],
        P9:  ['9A', '9B', '9C', '9D'],
        P10: ['10A', '10B', '10C', '10D'],
        P11: ['11A', '11B', '11C', '11D'],
        P12: ['12A', '12B', '12C', '12D'],
      },
      etichetteUnita: {},
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    SNU: { tipo: 'urbanizzazione', lotti: ['Lotto1', 'Lotto2', 'Lotto3', 'Lotto4'] },
    BRU: { tipo: 'urbanizzazione', lotti: ['Lotto1', 'Lotto2', 'Lotto3'] },
  },
};

export const VERSIONE_ANAGRAFICA = ANAGRAFICA.versione;

const SENZA_LIVELLI = { piano: '-', unita: '-', prospetto: '-' };

// I dati di una commessa, o null se non ne ha: `null` è un caso previsto, non
// un errore, e chi chiama deve trattarlo come «nessun livello da offrire».
export function datiCommessa(codice) {
  return ANAGRAFICA.commesse[String(codice || '')] || null;
}

export function anagraficaNota(codice) {
  return Boolean(datiCommessa(codice));
}

export function eUrbanizzazione(codice) {
  const dati = datiCommessa(codice);
  return Boolean(dati) && dati.tipo === 'urbanizzazione';
}

// Cosa pretende una fase. Una fase che non è nell'elenco — tolta, o un record
// accodato da una versione precedente — non pretende niente: meglio un livello
// in meno che un invio bloccato da un dato che non si sa più cosa sia.
export function livelliDiFase(codiceFase) {
  return ANAGRAFICA.livelliPerFase[String(codiceFase || '')] || SENZA_LIVELLI;
}

// I lotti di un'urbanizzazione. Codice senza spazi perché diventa il nome
// della cartella; a video lo spazio si rimette, come per le fasi.
export function lottiDi(codice) {
  const dati = datiCommessa(codice);
  if (!dati || !Array.isArray(dati.lotti)) return [];
  return dati.lotti.map(lotto => ({ codice: lotto, etichetta: etichettaLotto(lotto) }));
}

export function etichettaLotto(codice) {
  const numero = /^Lotto(\d+)$/.exec(String(codice || ''));
  return numero ? `Lotto ${numero[1]}` : String(codice || '');
}

export function pianiDi(codice) {
  const dati = datiCommessa(codice);
  if (!dati || !Array.isArray(dati.piani)) return [];
  return dati.piani.map(p => ({ ...p }));
}

// Tutte le unità della commessa, ognuna col proprio piano già attaccato: chi
// le mostra non deve rifare il giro della mappa, e chi deve derivare il piano
// non ha una seconda strada per arrivarci.
export function unitaDi(codice) {
  const dati = datiCommessa(codice);
  if (!dati || !dati.unita) return [];
  const elenco = [];
  for (const piano of pianiDi(codice)) {
    for (const unita of dati.unita[piano.codice] || []) {
      elenco.push({
        codice: unita,
        piano: piano.codice,
        etichettaPiano: piano.etichetta,
        etichetta: (dati.etichetteUnita || {})[unita] || '',
      });
    }
  }
  return elenco;
}

// Il piano di un'unità, dalla mappa e SOLO dalla mappa. Stringa vuota se
// l'unità non è in anagrafica: non si tira a indovinare dal codice.
export function pianoDiUnita(codice, unita) {
  const trovata = unitaDi(codice).find(u => u.codice === String(unita || ''));
  return trovata ? trovata.piano : '';
}

export function prospettiDi(codice) {
  const dati = datiCommessa(codice);
  const elenco = (dati && Array.isArray(dati.prospetti)) ? dati.prospetti : [];
  return elenco.map(p => ({ codice: p, etichetta: p }));
}

export function haInterrati(codice) {
  return pianiDi(codice).some(p => Number(p.ordine) < 0);
}

// I piani che una fase può offrire. Filtro dichiarato da Francesco: per
// `Interrato` solo i piani sotto quota, perché «Interrato, piano terzo» è una
// scelta che non vuol dire niente e in cartella diventerebbe un percorso che
// nessuno cerca.
export function pianiPerFase(codice, codiceFase) {
  const piani = pianiDi(codice);
  return codiceFase === 'Interrato' ? piani.filter(p => Number(p.ordine) < 0) : piani;
}

// Quali selettori mostrare, per questa commessa e questa fase.
//
// `pianoDerivato` è il caso dell'unità: il piano NON si chiede — sarebbe un
// tocco in più per un dato che l'unità già determina — ma viaggia comunque,
// perché a valle il percorso è `[Fase]\[Piano]\[Unità]\` e il piano serve.
//
// Un livello si chiede solo se c'è qualcosa da offrire: una commessa senza
// anagrafica, o senza piani sotto quota per `Interrato`, non può pretendere
// una scelta impossibile. Vale anche al contrario: dove non si chiede, non
// viaggia.
export function livelliRichiesti(codice, codiceFase) {
  const regola = livelliDiFase(codiceFase);
  const dati = datiCommessa(codice);
  if (!dati || dati.tipo !== 'edificio') {
    return { piano: false, unita: false, prospetto: false, pianoDerivato: false };
  }
  const unita = regola.unita === 'O' && unitaDi(codice).length > 0;
  const piano = !unita && regola.piano === 'O' && pianiPerFase(codice, codiceFase).length > 0;
  const prospetto = regola.prospetto === 'O' && prospettiDi(codice).length > 0;
  return { piano, unita, prospetto, pianoDerivato: unita && regola.piano === 'D' };
}

// I tre valori da mandare, normalizzati: il codice dove il livello si applica,
// `null` dove non si applica. **Mai stringa vuota**: una colonna vuota e una
// colonna assente si distinguono in raccolta, `''` invece è un valore che
// somiglia a un dato e non lo è — ed è già costato venti foto entrate senza
// colonne il 10/09.
export function livelliDaMandare(codice, codiceFase, scelte = {}) {
  const richiesti = livelliRichiesti(codice, codiceFase);
  const unita = richiesti.unita ? (scelte.unita || null) : null;
  const piano = richiesti.piano
    ? (scelte.piano || null)
    : richiesti.pianoDerivato ? (pianoDiUnita(codice, unita) || null) : null;
  return {
    piano,
    unita,
    prospetto: richiesti.prospetto ? (scelte.prospetto || null) : null,
  };
}

// Quali livelli mancano all'appello, per bloccare l'invio e dirlo. Le etichette
// sono quelle che l'operatore legge nel messaggio, non i nomi dei campi.
export function livelliMancanti(codice, codiceFase, scelte = {}) {
  const richiesti = livelliRichiesti(codice, codiceFase);
  return [
    richiesti.piano && !scelte.piano && 'il piano',
    richiesti.unita && !scelte.unita && 'l’unità',
    richiesti.prospetto && !scelte.prospetto && 'il prospetto',
  ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Il selettore che l'operatore vede: fasi, oppure lotti.
//
// Sta qui e non in `core/fasi.js` perché a decidere è la COMMESSA, e le fasi
// non sanno niente delle commesse. La dipendenza va in un verso solo:
// `anagrafica.js` legge `fasi.js`, mai il contrario.
//
// I due moduli chiamano questa funzione e non costruiscono le opzioni da sé:
// un elenco scritto due volte diverge, e qui divergere significa che una bolla
// di SNU prende una fase e una foto di SNU prende un lotto.
// ---------------------------------------------------------------------------

// Per un'urbanizzazione il lotto PRENDE IL POSTO della fase — deciso da
// Francesco il 18/09/2026 — e viaggia nello stesso campo `fase`: a valle il
// codice diventa il nome della cartella, esattamente come `FinituraAlloggi`.
// Il selettore è condiviso col modulo Bolle, quindi anche una bolla di SNU
// prende il lotto: è voluto.
export function vociSelettoreFase(codiceCommessa) {
  if (eUrbanizzazione(codiceCommessa)) return lottiDi(codiceCommessa);
  // Secondo filtro dichiarato: una commessa senza piani interrati non deve
  // vedere la fase `Interrato` — è il caso di MAR. Una commessa SENZA
  // anagrafica non si filtra: non sapere com'è fatta non è un motivo per
  // togliere voci a chi sta scattando.
  const nota = anagraficaNota(codiceCommessa);
  return FASI.filter(f => !(nota && f.codice === 'Interrato' && !haInterrati(codiceCommessa)));
}

export function etichettaSelettoreFase(codiceCommessa) {
  return eUrbanizzazione(codiceCommessa) ? 'Lotto' : 'Fase di lavoro';
}

// A video: «Lotto 2» per i lotti, l'etichetta della fase per le fasi, il
// codice così com'è per quello che non si riconosce più — un dato che non si
// sa leggere si mostra, non si fa sparire.
export function etichettaFaseOLotto(codice) {
  return /^Lotto\d+$/.test(String(codice || '')) ? etichettaLotto(codice) : etichettaFase(codice);
}

// Vero se il valore è ammissibile per questa commessa: serve a non riproporre
// una fase filtrata via o un lotto di un'altra urbanizzazione.
export function valoreFaseAmmesso(codiceCommessa, codice) {
  return vociSelettoreFase(codiceCommessa).some(v => v.codice === codice);
}

export function opzioniFaseOLotto(codiceCommessa, ultima, scappaHtml) {
  const voci = vociSelettoreFase(codiceCommessa);
  const nota = voci.some(v => v.codice === ultima);
  const nessuna = eUrbanizzazione(codiceCommessa) ? '— nessun lotto —' : '— nessuna fase —';
  return `<option value=""${nota ? '' : ' selected'}>${nessuna}</option>`
    + voci.map(v => `<option value="${scappaHtml(v.codice)}"${v.codice === ultima ? ' selected' : ''}>${scappaHtml(v.etichetta)}</option>`).join('');
}

// Le opzioni di un livello. Nessuna preselezione: il livello è il nome di una
// cartella sul server, e una scelta preselezionata che nessuno guarda archivia
// la foto nell'appartamento sbagliato senza fare rumore. Meglio un tocco in
// più per invio — non per foto: l'invio ne porta quante se ne vogliono.
export function opzioniLivello(voci, segnaposto, scelto, scappaHtml) {
  const nota = voci.some(v => v.codice === scelto);
  return `<option value=""${nota ? '' : ' selected'}>${scappaHtml(segnaposto)}</option>`
    + voci.map(v => {
      const testo = v.etichetta && v.etichetta !== v.codice ? `${v.codice} — ${v.etichetta}` : v.codice;
      return `<option value="${scappaHtml(v.codice)}"${v.codice === scelto ? ' selected' : ''}>${scappaHtml(testo)}</option>`;
    }).join('');
}

// Le unità raggruppate per piano. Sono tante — 55 su SNZ2.2 — e un elenco
// piatto di 55 voci non si scorre col pollice: i gruppi danno al dito un
// appiglio, e il piano resta leggibile accanto all'unità senza che lo si debba
// scegliere (lo determina l'unità, §`livelliRichiesti`).
export function opzioniUnita(codiceCommessa, scelta, scappaHtml) {
  const tutte = unitaDi(codiceCommessa);
  const nota = tutte.some(u => u.codice === scelta);
  let html = `<option value=""${nota ? '' : ' selected'}>— scegli l\u2019unità —</option>`;
  for (const piano of pianiDi(codiceCommessa)) {
    const delPiano = tutte.filter(u => u.piano === piano.codice);
    if (delPiano.length === 0) continue;
    html += `<optgroup label="${scappaHtml(piano.etichetta)}">`
      + delPiano.map(u => {
        const testo = u.etichetta ? `${u.codice} — ${u.etichetta}` : u.codice;
        return `<option value="${scappaHtml(u.codice)}"${u.codice === scelta ? ' selected' : ''}>${scappaHtml(testo)}</option>`;
      }).join('')
      + '</optgroup>';
  }
  return html;
}

// ---------------------------------------------------------------------------
// Il pezzo di vista che i due moduli condividono.
//
// Foto e Bolle mostrano gli stessi quattro menù — fase (o lotto), piano,
// unità, prospetto — con le stesse regole, e li ricostruiscono a ogni
// ridisegno. Scritto due volte diventerebbe due comportamenti: uno dei due
// modulo smetterebbe di filtrare `Interrato`, o terrebbe un piano scelto per
// una commessa che non l'ha, e a dirlo sarebbe solo una cartella sbagliata sul
// server tre settimane dopo. Sta quindi nella shell, come l'anagrafica che
// legge, e i moduli gli passano soltanto il codice della commessa — che nei
// due si chiama `#commessa` e `#cantiere`, ed è l'unica differenza.
//
// Gli `id` degli elementi sono un contratto fra questa funzione e i due
// moduli: `#fase`, `#etichetta-fase`, `#piano`, `#unita`, `#prospetto` e i
// contenitori `#campo-piano`, `#campo-unita`, `#campo-prospetto`.
//
// Il `prefisso` serve al riquadro di «Rimanda», che mostra gli stessi quattro
// menù una seconda volta nella stessa pagina: lì gli id diventano `#r-fase`,
// `#r-piano`, `#campo-r-piano`… Due elementi con lo stesso id nello stesso
// documento sarebbero HTML non valido, e `querySelector` su uno dei due
// prenderebbe quello sbagliato — un menù che corregge la foto di un altro.
// ---------------------------------------------------------------------------

// Ricostruisce un menù solo quando serve davvero. La chiave dice di cosa sono
// fatte le opzioni: finché non cambia, il menù si lascia stare — rifarlo a
// ogni ridisegno butterebbe la scelta appena fatta dall'operatore, e i
// ridisegni qui sono continui (ne parte uno per ogni foto preparata).
function rifaiSeServe(menu, chiave, iniziale, costruisci) {
  if (!menu || menu.dataset.chiave === chiave) return;
  // `iniziale` vale SOLO alla prima costruzione: è l'ultima scelta salvata,
  // o il valore del record che si sta rimandando. Riapplicarlo dopo
  // rimetterebbe una fase che l'operatore ha appena riportato a «nessuna».
  const precedente = menu.dataset.chiave === undefined ? (menu.value || iniziale || '') : menu.value;
  menu.dataset.chiave = chiave;
  menu.innerHTML = costruisci(precedente);
  // Se il valore di prima non è più fra le opzioni, `value` resta vuoto da
  // sé: il menù mostra il segnaposto e l'invio si blocca chiedendo la scelta,
  // invece di partire con un dato che non vale più per questa commessa.
  if (precedente && menu.querySelector(`option[value="${CSS.escape(precedente)}"]`)) {
    menu.value = precedente;
  }
}

export function sincronizzaLivelli(radice, codiceCommessa, scappaHtml, prefisso = '', iniziali = {}) {
  const menuFase = radice.querySelector(`#${prefisso}fase`);
  if (!menuFase) return { fase: '', piano: null, unita: null, prospetto: null, mancanti: [] };

  rifaiSeServe(menuFase, `fase:${codiceCommessa}`, iniziali.fase,
    precedente => opzioniFaseOLotto(codiceCommessa, precedente, scappaHtml));
  const etichetta = radice.querySelector(`#etichetta-${prefisso}fase`);
  if (etichetta) etichetta.textContent = etichettaSelettoreFase(codiceCommessa);

  const fase = menuFase.value;
  const richiesti = livelliRichiesti(codiceCommessa, fase);

  const campoPiano = radice.querySelector(`#campo-${prefisso}piano`);
  const menuPiano = radice.querySelector(`#${prefisso}piano`);
  if (campoPiano) campoPiano.classList.toggle('nascosto', !richiesti.piano);
  if (richiesti.piano) {
    rifaiSeServe(menuPiano, `piano:${codiceCommessa}:${fase}`, iniziali.piano,
      precedente => opzioniLivello(pianiPerFase(codiceCommessa, fase), '— scegli il piano —', precedente, scappaHtml));
  } else if (menuPiano) {
    menuPiano.value = '';
  }

  const campoUnita = radice.querySelector(`#campo-${prefisso}unita`);
  const menuUnita = radice.querySelector(`#${prefisso}unita`);
  if (campoUnita) campoUnita.classList.toggle('nascosto', !richiesti.unita);
  if (richiesti.unita) {
    rifaiSeServe(menuUnita, `unita:${codiceCommessa}`, iniziali.unita,
      precedente => opzioniUnita(codiceCommessa, precedente, scappaHtml));
  } else if (menuUnita) {
    menuUnita.value = '';
  }

  const campoProspetto = radice.querySelector(`#campo-${prefisso}prospetto`);
  const menuProspetto = radice.querySelector(`#${prefisso}prospetto`);
  if (campoProspetto) campoProspetto.classList.toggle('nascosto', !richiesti.prospetto);
  if (richiesti.prospetto) {
    rifaiSeServe(menuProspetto, `prospetto:${codiceCommessa}`, iniziali.prospetto,
      precedente => opzioniLivello(prospettiDi(codiceCommessa), '— scegli il prospetto —', precedente, scappaHtml));
  } else if (menuProspetto) {
    menuProspetto.value = '';
  }

  const scelte = {
    piano: menuPiano ? menuPiano.value : '',
    unita: menuUnita ? menuUnita.value : '',
    prospetto: menuProspetto ? menuProspetto.value : '',
  };

  // Il piano derivato si scrive a video: l'operatore non l'ha scelto, e vedere
  // che l'app l'ha ricavato è il solo modo che ha di accorgersi se la mappa
  // dice una cosa diversa da quella che ha in mente.
  const aiutoUnita = radice.querySelector(`#aiuto-${prefisso}unita`);
  if (aiutoUnita) {
    const piano = richiesti.pianoDerivato && scelte.unita ? pianoDiUnita(codiceCommessa, scelte.unita) : '';
    const nome = piano ? (pianiDi(codiceCommessa).find(p => p.codice === piano) || {}).etichetta : '';
    aiutoUnita.textContent = piano
      ? `Piano ${piano}${nome ? ` (${nome})` : ''}: lo ricava l’app dall’unità, non c’è da sceglierlo.`
      : '';
  }

  // Marcatore di sincronia: dice per quale coppia commessa/fase i menù sono
  // stati costruiti. Serve alle diagnosi — e ai collaudi, che altrimenti
  // leggono le voci un istante prima che il ridisegno le abbia rifatte e
  // misurano la commessa di prima. Si scrive per ULTIMO, quando tutti i menù
  // sono a posto: prima non sarebbe vero.
  menuFase.dataset.livelli = `${codiceCommessa}|${fase}`;

  return {
    fase,
    ...livelliDaMandare(codiceCommessa, fase, scelte),
    mancanti: livelliMancanti(codiceCommessa, fase, scelte),
  };
}

// Il blocco dei quattro menù, identico in tutti i posti in cui compare: i due
// moduli e i due riquadri di «Rimanda». Sta qui perché gli `id` sono un
// contratto con `sincronizzaLivelli`, e quattro copie scritte a mano sono
// quattro occasioni di sbagliare un id — cosa che non dà nessun errore, dà
// solo un menù che non compare mai e un livello che non parte.
//
// I menù nascono VUOTI: a riempirli è `sincronizzaLivelli` al primo ridisegno,
// che è anche l'unico a sapere quali voci vanno mostrate per quella commessa.
export function campiLivelli(prefisso = '') {
  return `
      <div class="campo">
        <label for="${prefisso}fase" id="etichetta-${prefisso}fase">Fase di lavoro</label>
        <select id="${prefisso}fase" required></select>
        <p id="aiuto-${prefisso}fase" class="aiuto tenue"></p>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}piano">
        <label for="${prefisso}piano">Piano</label>
        <select id="${prefisso}piano" required></select>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}unita">
        <label for="${prefisso}unita">Unità</label>
        <select id="${prefisso}unita" required></select>
        <p id="aiuto-${prefisso}unita" class="aiuto tenue"></p>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}prospetto">
        <label for="${prefisso}prospetto">Prospetto</label>
        <select id="${prefisso}prospetto" required></select>
      </div>`;
}
