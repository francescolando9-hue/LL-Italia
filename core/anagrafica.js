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
// **Si rigenera, non si ritocca.** Il blocco si riscrive per intero dal JSON
// del master, e il collaudo `15-livelli.js` confronta l'impronta SHA-256
// della sua forma canonica (chiavi ordinate, nessuno spazio, UTF-8) con
// quella del master della versione dichiarata: una voce corretta a mano qui
// fa diventare rosso il collaudo. A ogni master nuovo si aggiornano insieme il
// blocco, `VERSIONE_MASTER` e `IMPRONTA_MASTER` nel collaudo — l'impronta
// calcolata dal file del master, non da questo.
//
// Fra il 04 e il 05/10/2026 il master è cambiato due volte (il Tetto come
// piano a sé in MAR, MNG e SNZ2.2; Lotto4 tolto da SNU) e l'app no: la 0.37.8
// l'ha riallineata, e da allora l'impronta lo avrebbe detto subito. Il master
// 202610092114 (decisioni di Francesco del 09/10/2026) l'ha portato la 0.38.1:
// le scale e la commessa TN1, qui sotto.
//
// **Le scale** (dal master 202610092114). Il campo `scale` c'è solo nelle
// commesse con più di una scala — oggi MAR (tre scale da 5, 6 e 4 alloggi) e
// TN1 (le palazzine 4–7). Ogni voce ha `codice` (testo), `piani` e `unita`;
// dove il campo manca la commessa ha una scala sola, «1». Un piano che non sta
// in nessuna scala è comune alla commessa: il Tetto di MAR, il P-1 di TN1
// (l'autorimessa delle quattro palazzine). **La logica dell'app non le usa**:
// nessun selettore, niente nel payload, `livelliRichiesti` non le guarda.
// Stanno qui perché il blocco è la copia esatta del master, e l'impronta lo
// pretende. Il menù dei piani legge `piani`, non le scale: il Tetto di TN1,
// che tutte e quattro le palazzine citano, compare una volta sola.
//
// **TN1 è in anagrafica ma non nel menù.** Non è in `core/cantieri.js` — il
// menù resta a sette commesse, e il collaudo 14 lo controlla — e l'anagrafica
// si interroga solo col codice scelto dal menù (`datiCommessa`): qui TN1 è un
// dato inerte, che nessun invio può raggiungere. Entrerà nei menù dopo il
// livello palazzina nell'archivio, che è un lavoro a parte; a quel punto
// conterà anche che il P-1 è il suo unico piano sotto quota (voce unica in
// `Interrato`) e che i prospetti sono vuoti (Finitura facciata non li chiede).
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
// non ce l'ha ancora (TN1 è il caso opposto: l'anagrafica c'è, il menù no —
// vedi sopra). Per loro non c'è nessun livello da offrire, le fasi
// restano tutte disponibili e i tre campi non viaggiano. A valle la foto
// finisce nella cartella del mese con un'anomalia — voluto: non blocca chi sta
// scattando in cantiere per un dato che manca in ufficio.

import { FASI, etichettaFase } from './fasi.js';

export const ANAGRAFICA = {
  versione: '202610092114',
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
    SistemazioneEsterna:          { piano: '-', unita: '-', prospetto: '-' },
    Strutture:                    { piano: 'O', unita: '-', prospetto: '-' },
    Urbanizzazioni:               { piano: '-', unita: '-', prospetto: '-' },
    Lotto1:                       { piano: '-', unita: '-', prospetto: '-' },
    Lotto2:                       { piano: '-', unita: '-', prospetto: '-' },
    Lotto3:                       { piano: '-', unita: '-', prospetto: '-' },
  },
  commesse: {
    MAR: {
      tipo: 'edificio',
      piani: [
        { codice: 'P0',    etichetta: 'Piano terra',   ordine: 0 },
        { codice: 'P1',    etichetta: 'Piano primo',   ordine: 1 },
        { codice: 'P2',    etichetta: 'Piano secondo', ordine: 2 },
        { codice: 'Tetto', etichetta: 'Tetto',         ordine: 3 },
      ],
      unita: {
        P0:    ['0.01', '0.02', '0.03', '0.04', '0.05'],
        P1:    ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06'],
        P2:    ['2.01', '2.02', '2.03', '2.04'],
        Tetto: [],
      },
      scale: [
        { codice: '1', piani: ['P0', 'P1', 'P2'],
          unita: ['0.01', '0.02', '1.01', '1.02', '2.01'] },
        { codice: '2', piani: ['P0', 'P1', 'P2'],
          unita: ['0.03', '0.04', '1.03', '1.04', '2.02', '2.03'] },
        { codice: '3', piani: ['P0', 'P1', 'P2'],
          unita: ['0.05', '1.05', '1.06', '2.04'] },
      ],
      etichetteUnita: {},
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    MNG: {
      tipo: 'edificio',
      piani: [
        { codice: 'P-2',   etichetta: 'Secondo piano interrato', ordine: -2 },
        { codice: 'P-1',   etichetta: 'Primo piano interrato',   ordine: -1 },
        { codice: 'P0',    etichetta: 'Piano terra',             ordine: 0 },
        { codice: 'P1',    etichetta: 'Piano primo',             ordine: 1 },
        { codice: 'P2',    etichetta: 'Piano secondo',           ordine: 2 },
        { codice: 'P3',    etichetta: 'Piano terzo',             ordine: 3 },
        { codice: 'P4',    etichetta: 'Piano quarto',            ordine: 4 },
        { codice: 'P5',    etichetta: 'Piano quinto',            ordine: 5 },
        { codice: 'P6',    etichetta: 'Piano sesto',             ordine: 6 },
        { codice: 'P7',    etichetta: 'Piano settimo',           ordine: 7 },
        { codice: 'P8',    etichetta: 'Piano ottavo',            ordine: 8 },
        { codice: 'Tetto', etichetta: 'Tetto',                   ordine: 9 },
      ],
      unita: {
        'P-2': [],
        'P-1': [],
        P0:    ['0A'],
        P1:    ['1A', '1B'],
        P2:    ['2A', '2B'],
        P3:    ['3A', '3B'],
        P4:    ['4A', '4B'],
        P5:    ['5A', '5B'],
        P6:    ['6A', '6B'],
        P7:    ['7A', '7B'],
        P8:    ['8B'],
        Tetto: [],
      },
      etichetteUnita: {
        '0A': 'Trilocale con giardino esterno',
        '8B': 'Attico (superficie di quadrilocale più cinquelocali)',
        '1A': 'Quadrilocale',
        '1B': 'Cinquelocali',
        '2A': 'Quadrilocale',
        '2B': 'Cinquelocali',
        '3A': 'Quadrilocale',
        '3B': 'Cinquelocali',
        '4A': 'Quadrilocale',
        '4B': 'Cinquelocali',
        '5A': 'Quadrilocale',
        '5B': 'Cinquelocali',
        '6A': 'Quadrilocale',
        '6B': 'Cinquelocali',
        '7A': 'Quadrilocale',
        '7B': 'Cinquelocali',
      },
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    'SNZ2.2': {
      tipo: 'edificio',
      piani: [
        { codice: 'P-1',   etichetta: 'Primo piano interrato', ordine: -1 },
        { codice: 'P0',    etichetta: 'Piano terra',           ordine: 0 },
        { codice: 'P1',    etichetta: 'Piano primo',           ordine: 1 },
        { codice: 'P2',    etichetta: 'Piano secondo',         ordine: 2 },
        { codice: 'P3',    etichetta: 'Piano terzo',           ordine: 3 },
        { codice: 'P4',    etichetta: 'Piano quarto',          ordine: 4 },
        { codice: 'P5',    etichetta: 'Piano quinto',          ordine: 5 },
        { codice: 'P6',    etichetta: 'Piano sesto',           ordine: 6 },
        { codice: 'P7',    etichetta: 'Piano settimo',         ordine: 7 },
        { codice: 'P8',    etichetta: 'Piano ottavo',          ordine: 8 },
        { codice: 'P9',    etichetta: 'Piano nono',            ordine: 9 },
        { codice: 'P10',   etichetta: 'Piano decimo',          ordine: 10 },
        { codice: 'P11',   etichetta: 'Piano undicesimo',      ordine: 11 },
        { codice: 'P12',   etichetta: 'Piano dodicesimo',      ordine: 12 },
        { codice: 'Tetto', etichetta: 'Tetto',                 ordine: 13 },
      ],
      unita: {
        'P-1': [],
        P0:    ['0A', '0B', '0C'],
        P1:    ['1A', '1B', '1C', '1D'],
        P2:    ['2A', '2B', '2C', '2D'],
        P3:    ['3A', '3B', '3C', '3D'],
        P4:    ['4A', '4B', '4C', '4D'],
        P5:    ['5A', '5B', '5C', '5D'],
        P6:    ['6A', '6B', '6C', '6D'],
        P7:    ['7A', '7B', '7C', '7D'],
        P8:    ['8A', '8B', '8C', '8D'],
        P9:    ['9A', '9B', '9C', '9D'],
        P10:   ['10A', '10B', '10C', '10D'],
        P11:   ['11A', '11B', '11C', '11D'],
        P12:   ['12A', '12B', '12C', '12D'],
        Tetto: [],
      },
      etichetteUnita: {},
      prospetti: ['Nord', 'Sud', 'Est', 'Ovest'],
    },
    TN1: {
      tipo: 'edificio',
      piani: [
        { codice: 'P-1',   etichetta: 'Primo piano interrato', ordine: -1 },
        { codice: 'P0',    etichetta: 'Piano terra',           ordine: 0 },
        { codice: 'P1',    etichetta: 'Piano primo',           ordine: 1 },
        { codice: 'P2',    etichetta: 'Piano secondo',         ordine: 2 },
        { codice: 'P3',    etichetta: 'Piano terzo',           ordine: 3 },
        { codice: 'Tetto', etichetta: 'Tetto',                 ordine: 4 },
      ],
      unita: {
        'P-1': [],
        P0:    ['401', '402', '403', '404', '501', '502', '503', '504', '601', '602', '603', '604', '701', '702', '703', '704'],
        P1:    ['411', '412', '413', '414', '511', '512', '513', '514', '611', '612', '613', '614', '711', '712', '713', '714'],
        P2:    ['421', '422', '423', '424', '521', '522', '523', '524', '621', '622', '623', '624', '721', '722', '723', '724'],
        P3:    ['431', '432', '433', '434', '531', '532', '533', '534', '631', '632', '633', '634', '731', '732', '733', '734'],
        Tetto: [],
      },
      scale: [
        { codice: '4', piani: ['P0', 'P1', 'P2', 'P3', 'Tetto'],
          unita: ['401', '402', '403', '404', '411', '412', '413', '414', '421', '422', '423', '424', '431', '432', '433', '434'] },
        { codice: '5', piani: ['P0', 'P1', 'P2', 'P3', 'Tetto'],
          unita: ['501', '502', '503', '504', '511', '512', '513', '514', '521', '522', '523', '524', '531', '532', '533', '534'] },
        { codice: '6', piani: ['P0', 'P1', 'P2', 'P3', 'Tetto'],
          unita: ['601', '602', '603', '604', '611', '612', '613', '614', '621', '622', '623', '624', '631', '632', '633', '634'] },
        { codice: '7', piani: ['P0', 'P1', 'P2', 'P3', 'Tetto'],
          unita: ['701', '702', '703', '704', '711', '712', '713', '714', '721', '722', '723', '724', '731', '732', '733', '734'] },
      ],
      etichetteUnita: {},
      prospetti: [],
    },
    SNU: { tipo: 'urbanizzazione', lotti: ['Lotto1', 'Lotto2', 'Lotto3'] },
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

// **Un livello con una sola voce possibile non si chiede: lo sceglie l'app**
// (dalla 0.37.7). Il caso che l'ha fatto notare: SNZ2.2, fase `Interrato` —
// la commessa ha un solo piano sotto quota, e l'app apriva lo stesso un menù
// con «— scegli il piano —» e una voce sola, `P-1`. Un tocco obbligatorio per
// una scelta che non c'era.
//
// Non contraddice la regola di `opzioniLivello` — nessuna preselezione — ma
// ne è il confine: quella regola esiste perché una voce preselezionata che
// nessuno guarda archivia la foto nell'appartamento sbagliato. Con UNA voce
// sola non c'è un appartamento sbagliato: l'unico valore possibile non può
// essere quello errato. Da due voci in su si torna a chiedere, sempre.
//
// La regola sta qui, nello strato dei dati, e non solo nella vista: così il
// livello parte anche se il menù non c'è (il riquadro di «Rimanda», una
// vista che si ridisegna in ritardo), e il blocco dell'invio non lo chiede.
export function voceUnica(voci) {
  return Array.isArray(voci) && voci.length === 1 ? voci[0] : null;
}

export function livelliUnici(codice, codiceFase) {
  const richiesti = livelliRichiesti(codice, codiceFase);
  return {
    piano: richiesti.piano ? voceUnica(pianiPerFase(codice, codiceFase)) : null,
    unita: richiesti.unita ? voceUnica(unitaDi(codice)) : null,
    prospetto: richiesti.prospetto ? voceUnica(prospettiDi(codice)) : null,
  };
}

// Le scelte dell'operatore, completate con le voci uniche. Una scelta fatta
// vince sempre: la voce unica riempie solo un vuoto.
function completaScelte(codice, codiceFase, scelte = {}) {
  const unici = livelliUnici(codice, codiceFase);
  return {
    piano: scelte.piano || (unici.piano && unici.piano.codice) || '',
    unita: scelte.unita || (unici.unita && unici.unita.codice) || '',
    prospetto: scelte.prospetto || (unici.prospetto && unici.prospetto.codice) || '',
  };
}

// I tre valori da mandare, normalizzati: il codice dove il livello si applica,
// `null` dove non si applica. **Mai stringa vuota**: una colonna vuota e una
// colonna assente si distinguono in raccolta, `''` invece è un valore che
// somiglia a un dato e non lo è — ed è già costato venti foto entrate senza
// colonne il 10/09.
export function livelliDaMandare(codice, codiceFase, scelteFatte = {}) {
  const richiesti = livelliRichiesti(codice, codiceFase);
  const scelte = completaScelte(codice, codiceFase, scelteFatte);
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
export function livelliMancanti(codice, codiceFase, scelteFatte = {}) {
  const richiesti = livelliRichiesti(codice, codiceFase);
  const scelte = completaScelte(codice, codiceFase, scelteFatte);
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

// Il segnaposto dice la verità sul campo (dalla 0.37.9). Dove la fase è
// FACOLTATIVA — le bolle — la prima voce è «— nessuna fase —» ed è una
// scelta valida: il vuoto in raccolta è un'informazione. Dove è
// OBBLIGATORIA — le foto — la prima voce è «— scegli la fase —»: chiamarla
// «nessuna fase» farebbe credere a una scelta che lì non esiste.
export function opzioniFaseOLotto(codiceCommessa, ultima, scappaHtml, obbligatoria = false) {
  const voci = vociSelettoreFase(codiceCommessa);
  const nota = voci.some(v => v.codice === ultima);
  const lotto = eUrbanizzazione(codiceCommessa);
  const nessuna = obbligatoria
    ? (lotto ? '— scegli il lotto —' : '— scegli la fase —')
    : (lotto ? '— nessun lotto —' : '— nessuna fase —');
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

// Le unità raggruppate per piano. Sono tante — 51 su SNZ2.2 — e un elenco
// piatto di 51 voci non si scorre col pollice: i gruppi danno al dito un
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
function rifaiSeServe(menu, chiave, iniziale, costruisci, portaDietro = true) {
  if (!menu || menu.dataset.chiave === chiave) return;
  // `iniziale` vale SOLO alla prima costruzione: è l'ultima scelta salvata,
  // o il valore del record che si sta rimandando. Riapplicarlo dopo
  // rimetterebbe una fase che l'operatore ha appena riportato a «nessuna».
  //
  // Un valore messo dall'APP — la voce unica, sotto — non è una scelta e non si
  // porta dietro: passando da `Interrato` (un solo piano, `P-1`) a `Strutture`
  // (tutti i piani, `P-1` compreso) il menù rifatto troverebbe `P-1` fra le
  // voci e lo terrebbe selezionato, cioè una preselezione che nessuno ha
  // fatto. È esattamente quello che `opzioniLivello` esiste per impedire.
  //
  // `portaDietro = false` vale per la FASE (dalla 0.37.9): quando il menù si
  // rifa perché è cambiata la commessa, si riparte dal segnaposto anche se la
  // fase di prima esiste nell'elenco nuovo. Una fase scelta per MAR non è una
  // scelta per MNG. Alla PRIMA costruzione vale solo `iniziale`, che arriva
  // vuoto ovunque tranne nel riquadro di «Rimanda», dove è il valore del
  // record da correggere — un dato da rivedere, non un suggerimento.
  const automatico = menu.dataset.automatico === '1';
  delete menu.dataset.automatico;
  const primaVolta = menu.dataset.chiave === undefined;
  const precedente = automatico ? ''
    : primaVolta ? (menu.value || iniziale || '')
      : portaDietro ? menu.value : '';
  menu.dataset.chiave = chiave;
  menu.innerHTML = costruisci(precedente);
  // Se il valore di prima non è più fra le opzioni, `value` resta vuoto da
  // sé: il menù mostra il segnaposto e l'invio si blocca chiedendo la scelta,
  // invece di partire con un dato che non vale più per questa commessa.
  if (precedente && menu.querySelector(`option[value="${CSS.escape(precedente)}"]`)) {
    menu.value = precedente;
  }
}

// La voce unica a video: il menù si nasconde e al suo posto si legge il valore
// che parte, con il perché. Non si nasconde il campo intero: l'operatore deve
// vedere in quale cartella va la foto, anche quando non c'è niente da
// scegliere — è lo stesso motivo per cui il piano ricavato dall'unità si
// scrive sotto il menù dell'unità.
//
// L'unica voce si scrive anche nel menù nascosto, e lo si marca come messo
// dall'app: chi legge il valore lo trova, e `rifaiSeServe` sa che non è una
// scelta da portarsi dietro.
const PERCHE_UNICA = {
  piano: fase => fase === 'Interrato'
    ? 'è l’unico piano interrato di questa commessa: lo sceglie l’app'
    : 'è l’unico piano di questa commessa: lo sceglie l’app',
  unita: () => 'è l’unica unità di questa commessa: la sceglie l’app',
  prospetto: () => 'è l’unico prospetto di questa commessa: lo sceglie l’app',
};

function mostraVoceUnica(radice, prefisso, livello, menu, voce, fase, scappaHtml) {
  if (!menu) return;
  const riga = radice.querySelector(`#unico-${prefisso}${livello}`);
  if (voce) {
    menu.value = voce.codice;
    menu.dataset.automatico = '1';
    menu.classList.add('nascosto');
    if (riga) {
      const testo = voce.etichetta && voce.etichetta !== voce.codice
        ? `${voce.codice} — ${voce.etichetta}` : voce.codice;
      riga.innerHTML = `${scappaHtml(testo)}<span class="tenue">${scappaHtml(PERCHE_UNICA[livello](fase))}</span>`;
      riga.classList.remove('nascosto');
    }
    return;
  }
  menu.classList.remove('nascosto');
  if (riga) {
    riga.innerHTML = '';
    riga.classList.add('nascosto');
  }
}

// `opzioni.faseObbligatoria` cambia solo il segnaposto del menù della fase
// («— scegli la fase —» invece di «— nessuna fase —»): che senza fase non si
// invii lo decide il modulo, come prima.
export function sincronizzaLivelli(radice, codiceCommessa, scappaHtml, prefisso = '', iniziali = {}, conLivelli = true, opzioni = {}) {
  const menuFase = radice.querySelector(`#${prefisso}fase`);
  if (!menuFase) return { fase: '', piano: null, unita: null, prospetto: null, mancanti: [] };

  // La fase NON si porta dietro al cambio di commessa (dalla 0.37.9): da MAR a
  // MNG si riparte dal segnaposto. Con UNA eccezione, dalla 0.38.0: quando si
  // arriva da «nessun cantiere». Il cantiere parte vuoto a ogni invio, e capita
  // di toccare prima la fase: scegliere il cantiere la prima volta COMPLETA il
  // contesto, non lo cambia, e perdere in silenzio una fase appena scelta
  // farebbe partire la bolla senza. Vedi `rifaiSeServe` e `azzeraFase`.
  const daNessunCantiere = menuFase.dataset.chiave === 'fase:';
  rifaiSeServe(menuFase, `fase:${codiceCommessa}`, iniziali.fase,
    precedente => opzioniFaseOLotto(codiceCommessa, precedente, scappaHtml, Boolean(opzioni.faseObbligatoria)),
    daNessunCantiere);
  const etichetta = radice.querySelector(`#etichetta-${prefisso}fase`);
  if (etichetta) etichetta.textContent = etichettaSelettoreFase(codiceCommessa);

  const fase = menuFase.value;
  // Senza livelli il lavoro finisce qui: niente menù da accendere, e
  // soprattutto **niente da pretendere** — `mancanti` vuoto, altrimenti
  // l'invio si bloccherebbe chiedendo un campo che non è a video.
  if (!conLivelli) {
    menuFase.dataset.livelli = `${codiceCommessa}|${fase}`;
    return { fase, piano: null, unita: null, prospetto: null, mancanti: [] };
  }
  const richiesti = livelliRichiesti(codiceCommessa, fase);
  const unici = livelliUnici(codiceCommessa, fase);

  const campoPiano = radice.querySelector(`#campo-${prefisso}piano`);
  const menuPiano = radice.querySelector(`#${prefisso}piano`);
  if (campoPiano) campoPiano.classList.toggle('nascosto', !richiesti.piano);
  if (richiesti.piano) {
    // I livelli ripartono quando cambia la fase (dalla 0.38.0, decisione di
    // Francesco del 06/10/2026), anche dentro lo stesso invio: è la fase a
    // decidere quali livelli servono, e un piano scelto per un'altra fase è
    // fuori contesto. Per questo la fase è nella chiave di tutti e tre i
    // menù, e il valore di prima non si porta dietro.
    rifaiSeServe(menuPiano, `piano:${codiceCommessa}:${fase}`, iniziali.piano,
      precedente => opzioniLivello(pianiPerFase(codiceCommessa, fase), '— scegli il piano —', precedente, scappaHtml),
      false);
  } else if (menuPiano) {
    menuPiano.value = '';
  }
  mostraVoceUnica(radice, prefisso, 'piano', menuPiano, unici.piano, fase, scappaHtml);

  const campoUnita = radice.querySelector(`#campo-${prefisso}unita`);
  const menuUnita = radice.querySelector(`#${prefisso}unita`);
  if (campoUnita) campoUnita.classList.toggle('nascosto', !richiesti.unita);
  if (richiesti.unita) {
    rifaiSeServe(menuUnita, `unita:${codiceCommessa}:${fase}`, iniziali.unita,
      precedente => opzioniUnita(codiceCommessa, precedente, scappaHtml),
      false);
  } else if (menuUnita) {
    menuUnita.value = '';
  }
  mostraVoceUnica(radice, prefisso, 'unita', menuUnita, unici.unita, fase, scappaHtml);

  const campoProspetto = radice.querySelector(`#campo-${prefisso}prospetto`);
  const menuProspetto = radice.querySelector(`#${prefisso}prospetto`);
  if (campoProspetto) campoProspetto.classList.toggle('nascosto', !richiesti.prospetto);
  if (richiesti.prospetto) {
    rifaiSeServe(menuProspetto, `prospetto:${codiceCommessa}:${fase}`, iniziali.prospetto,
      precedente => opzioniLivello(prospettiDi(codiceCommessa), '— scegli il prospetto —', precedente, scappaHtml),
      false);
  } else if (menuProspetto) {
    menuProspetto.value = '';
  }
  mostraVoceUnica(radice, prefisso, 'prospetto', menuProspetto, unici.prospetto, fase, scappaHtml);

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

// **Dopo un invio la fase riparte** (dalla 0.37.9, decisione di Francesco del
// 06/10/2026). Il 05/10 sono partite 38 bolle consecutive con la stessa fase,
// sbagliata: la pagina non si ricarica dopo Invia, il menù restava com'era, e
// la bolla dopo partiva con la fase di quella prima senza che nessuno la
// guardasse. Insieme alla memoria sul telefono (`ultimaFase`, che non si legge
// e non si scrive più) era una preselezione: un valore che nessuno sceglie e
// che manda il dato nel posto sbagliato senza far rumore.
//
// I moduli la chiamano subito dopo aver confermato l'invio, PRIMA del
// ridisegno: col menù della fase vuoto i livelli non si chiedono, e il
// ridisegno li svuota da sé — il piano dell'invio prima non diventa il
// piano di quello dopo.
//
// Dalla 0.38.0 anche il cantiere torna a «— scegli il cantiere —» dopo Invia,
// e il cambio di commessa rifà il menù della fase da solo: oggi questa
// funzione è una seconda difesa, e toglierla non cambia niente a video —
// misurato rimettendo il guasto apposta il 06/10/2026. Resta perché la fase
// non deve dipendere dal cantiere per ripartire: il giorno che il cantiere
// tornasse a restare dopo Invia, la fase ripartirebbe lo stesso.
export function azzeraFase(radice, prefisso = '') {
  const menu = radice.querySelector(`#${prefisso}fase`);
  if (menu) menu.value = '';
}

// Il blocco dei quattro menù, identico in tutti i posti in cui compare: i due
// moduli e i due riquadri di «Rimanda». Sta qui perché gli `id` sono un
// contratto con `sincronizzaLivelli`, e quattro copie scritte a mano sono
// quattro occasioni di sbagliare un id — cosa che non dà nessun errore, dà
// solo un menù che non compare mai e un livello che non parte.
//
// I menù nascono VUOTI: a riempirli è `sincronizzaLivelli` al primo ridisegno,
// che è anche l'unico a sapere quali voci vanno mostrate per quella commessa.
// `conLivelli = false` emette il SOLO menù della fase (o del lotto). Serve al
// modulo Bolle: `BolleInArrivo` non ha le tre colonne dei livelli e non le
// prende — verificato sul tenant il 18/09/2026 alle 16:05 — quindi chiedere un
// piano su una bolla sarebbe attrito per un dato che viene scartato. Il giorno
// che quelle colonne ci fossero, si rimette `true` qui e in
// `sincronizzaLivelli`: la regola non va riscritta, sta già tutta qui.
export function campiLivelli(prefisso = '', conLivelli = true) {
  const soloFase = `
      <div class="campo">
        <label for="${prefisso}fase" id="etichetta-${prefisso}fase">Fase di lavoro</label>
        <select id="${prefisso}fase" required></select>
        <p id="aiuto-${prefisso}fase" class="aiuto tenue"></p>
      </div>`;
  if (!conLivelli) return soloFase;
  return `
      <div class="campo">
        <label for="${prefisso}fase" id="etichetta-${prefisso}fase">Fase di lavoro</label>
        <select id="${prefisso}fase" required></select>
        <p id="aiuto-${prefisso}fase" class="aiuto tenue"></p>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}piano">
        <label for="${prefisso}piano">Piano</label>
        <select id="${prefisso}piano" required></select>
        <p id="unico-${prefisso}piano" class="valore-unico nascosto"></p>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}unita">
        <label for="${prefisso}unita">Unità</label>
        <select id="${prefisso}unita" required></select>
        <p id="unico-${prefisso}unita" class="valore-unico nascosto"></p>
        <p id="aiuto-${prefisso}unita" class="aiuto tenue"></p>
      </div>
      <div class="campo nascosto" id="campo-${prefisso}prospetto">
        <label for="${prefisso}prospetto">Prospetto</label>
        <select id="${prefisso}prospetto" required></select>
        <p id="unico-${prefisso}prospetto" class="valore-unico nascosto"></p>
      </div>`;
}
