// Modulo Segnalazioni (dalla 0.43.0).
//
// Fonte: la registrazione del 26/10/2026 fra Francesco e Paolo e le otto
// decisioni di Francesco del 20/11/2026; previsione approvata il 20/11/2026
// (versione 2). Il giro:
//   - il primo che passa da un alloggio o da una parte comune apre la
//     segnalazione, con un testo (anche dettato) e le foto che servono (dalla
//     0.44.0 senza limite: ogni foto parte da sola, dopo il suo passo);
//   - poi la chiude, o la passa a un altro: «ho fatto la mia parte, deve
//     passare X»;
//   - chi deve intervenire la trova IN CIMA ALL'APP, appena la apre («Tocca a
//     te»): niente mail, niente Teams;
//   - ogni passo resta tracciato sul server.
// Fase, attività e «a carico di» NON li sceglie chi apre: li propone l'IA nel
// giro delle 20:00 e li conferma Francesco. Per questo qui non c'è nessun menù
// della fase.
import * as coda from './coda.js';
import * as invio from './invio.js';
import {
  impostazioniSegnalazioni, salvaImpostazioniSegnalazioni, configurato, elencoSalvato, storiaSalvata,
  normalizzaEndpoint, POSSONO_APRIRE, COORDINANO,
} from './impostazioni.js';
import { vistaConfigura, vistaCondividi } from './configurazione.js';
import { collegaDettatura } from './dettatura.js';
import { preparaFoto } from './immagini.js';
import { impostazioniApp, scappaHtml } from '../../core/impostazioni.js';
import { naviga } from '../../core/router.js';
import { OPERATORI } from '../../core/operatori.js';
import { CANTIERI, etichettaCantiere } from '../../core/cantieri.js';
import {
  anagraficaNota, eUrbanizzazione, unitaDi, pianiDi, corpiDistinti, scaleDi, etichettaScala,
} from '../../core/anagrafica.js';
import { messaggioSalvataggio } from '../../core/errori.js';

const ROTTA = '#/segnalazioni';
// Ogni quanto, al massimo, l'apertura dell'app rilegge l'elenco dal server.
const RILETTURA_MINIMA_MS = 60 * 1000;

function assicuraStile() {
  if (!document.getElementById('stile-segnalazioni')) {
    const collegamento = document.createElement('link');
    collegamento.id = 'stile-segnalazioni';
    collegamento.rel = 'stylesheet';
    collegamento.href = './modules/segnalazioni/segnalazioni.css';
    document.head.appendChild(collegamento);
  }
}

// --- Piccoli aiuti ---------------------------------------------------------------

const io = () => impostazioniApp.autore;
export const puoAprire = nome => POSSONO_APRIRE.includes(nome);
export const coordina = nome => COORDINANO.includes(nome);

// Le date dal server sono 14 cifre AAAAMMGGHHMMSS (il server non passa mai al
// connettore un valore che somigli a una data). A video «GG/MM alle HH:MM».
export function dataLeggibile(cifre) {
  const t = String(cifre || '');
  if (!/^\d{12,14}$/.test(t)) return '';
  return `${t.slice(6, 8)}/${t.slice(4, 6)} alle ${t.slice(8, 10)}:${t.slice(10, 12)}`;
}

export function giorniDa(cifre, ora = new Date()) {
  const t = String(cifre || '');
  if (!/^\d{8}/.test(t)) return null;
  const giorno = new Date(Number(t.slice(0, 4)), Number(t.slice(4, 6)) - 1, Number(t.slice(6, 8)));
  const oggi = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate());
  return Math.max(0, Math.round((oggi - giorno) / 86400000));
}

function fraseGiorni(n) {
  if (n === null) return '';
  if (n === 0) return 'da oggi';
  if (n === 1) return 'da ieri';
  return `da ${n} giorni`;
}

// Dove: l'unità per un alloggio, la descrizione per una parte comune.
export function luogo(s) {
  if (s.ambito === 'Alloggio') return s.unita ? `alloggio ${s.unita}` : 'alloggio';
  return s.parteComune || 'parti comuni';
}

// La storia di una segnalazione con le foto al loro posto (dalla 0.44.0). Ogni
// foto è una riga `foto` sul server; a video non compare da sola: si conta nel
// passo a cui appartiene («Apertura · Paolo · … · 5 foto»), riconosciuto da
// `idPasso`, sommata alle foto che un passo di una 0.43.x portava dentro. Le
// foto il cui passo non è nella storia (un passo rifiutato, una storia letta a
// metà) stanno in una riga «Foto» per passo, dove compare la prima.
export function raggruppaStoria(interventi) {
  const passi = interventi.filter(i => i.azione !== 'foto');
  const perIdClient = new Map();
  const righe = [];
  for (const i of interventi) {
    if (i.azione !== 'foto') {
      const riga = { ...i, numeroFoto: Number(i.numeroFoto) || 0 };
      if (i.idClient) perIdClient.set(i.idClient, riga);
      righe.push(riga);
    }
  }
  const orfane = new Map();
  interventi.forEach((i, posizione) => {
    if (i.azione !== 'foto') return;
    const passo = i.idPasso ? perIdClient.get(i.idPasso) : null;
    if (passo) { passo.numeroFoto += 1; return; }
    const chiave = i.idPasso || `foto-${posizione}`;
    if (!orfane.has(chiave)) {
      const riga = { azione: 'foto', operatore: i.operatore || '', data: i.data || '', testo: '', passaA: '', numeroFoto: 0, posizione };
      orfane.set(chiave, riga);
    }
    orfane.get(chiave).numeroFoto += 1;
  });
  if (orfane.size === 0) return righe;
  // Le orfane al posto della loro prima foto. `righe` e `passi` vanno di pari
  // passo: la riga n è il passo n.
  const tutte = [
    ...righe.map((r, n) => ({ r, posizione: interventi.indexOf(passi[n]) })),
    ...[...orfane.values()].map(r => ({ r, posizione: r.posizione })),
  ];
  return tutte.sort((a, b) => a.posizione - b.posizione).map(({ r }) => {
    const riga = { ...r };
    delete riga.posizione;
    return riga;
  });
}

function oraLeggibile(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} alle ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Le segnalazioni come le vede il telefono: quelle del server, più quelle
// aperte da qui e non ancora arrivate, con i passi in coda già applicati. Così
// una segnalazione appena passata a Enzo sparisce subito da «Tocca a te» di chi
// l'ha passata, invece di restarci finché il passo non arriva.
export function segnalazioniDelTelefono(dalServer, elementi) {
  const perId = new Map(dalServer.map(s => [s.idSegnalazione, { ...s }]));
  // Le foto (dalla 0.44.0 elementi a sé) non cambiano lo stato: contano solo
  // nel numero delle foto di una segnalazione aperta da qui e non ancora arrivata.
  const passi = elementi.filter(p => !invio.eFoto(p));
  const fotoLocali = idSeg => elementi.filter(p => invio.eFoto(p) && p.idSegnalazione === idSeg
    && !(p.stato === 'inviata' && invio.RIFIUTI_DEFINITIVI[p.esitoServer])).length;
  for (const p of passi) {
    if (p.stato === 'inviata' && p.esitoServer !== 'ok' && p.esitoServer !== 'gia_presente') continue;
    let s = perId.get(p.idSegnalazione);
    if (p.azione === 'apertura' && !s) {
      s = {
        id: null, idSegnalazione: p.idSegnalazione, commessa: p.commessa, ambito: p.ambito, piano: p.piano,
        unita: p.unita, parteComune: p.parteComune, testo: p.testo, apertaDa: p.autore, apertaIl: '',
        stato: 'Aperta', toccaA: p.passaA || p.autore, numeroFoto: (p.foto || []).length + fotoLocali(p.idSegnalazione),
        ultimoOperatore: p.autore, ultimaNota: p.testo, locale: true,
      };
      perId.set(p.idSegnalazione, s);
    }
    if (!s || p.stato === 'inviata') continue;
    // Il passo non è ancora arrivato: si applica alla copia del telefono.
    if (p.azione === 'passaggio') s.toccaA = p.passaA;
    if (p.azione === 'chiusura') { s.stato = 'Chiusa'; s.toccaA = ''; s.chiusaDa = p.autore; }
    if (p.azione === 'riapertura') { s.stato = 'Aperta'; s.toccaA = p.passaA || p.autore; }
    s.inInvio = true;
  }
  return [...perId.values()];
}

export function toccanoA(segnalazioni, nome) {
  return segnalazioni.filter(s => s.stato === 'Aperta' && s.toccaA === nome);
}

async function statoAttuale() {
  const passi = await coda.elenca().catch(() => []);
  const elenco = elencoSalvato();
  return { passi, elenco, segnalazioni: segnalazioniDelTelefono(elenco.segnalazioni, passi) };
}

// --- In cima all'app: «Tocca a te» --------------------------------------------
// La home chiama questa funzione per ogni modulo che la dichiara. Disegna
// subito con l'ultimo elenco salvato, poi lo rilegge dal server e ridisegna.
// Senza niente che tocchi a chi ha il telefono in mano, non disegna niente:
// in cima compare qualcosa solo quando serve (Paolo, 26/10: «le quattro cose
// che ti servono», senza scorrere).
let ultimaRilettura = 0;

export async function inCima(el) {
  assicuraStile();
  const disegna = async () => {
    if (!configurato() || !io()) { el.innerHTML = ''; return; }
    const { elenco, segnalazioni } = await statoAttuale();
    if (!el.isConnected) return;
    const mie = toccanoA(segnalazioni, io());
    if (mie.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <section class="segn-banda" id="tocca-a-te">
        <h2>Tocca a te <span class="segn-conta">${mie.length}</span></h2>
        <ul class="segn-elenco">${mie.map(rigaSegnalazione).join('')}</ul>
        <p class="tenue segn-letto">${elenco.lettoIl ? `Elenco aggiornato ${oraLeggibile(elenco.lettoIl)}` : 'Elenco non ancora letto dal server'}</p>
      </section>`;
  };
  await disegna();
  if (configurato() && navigator.onLine && Date.now() - ultimaRilettura > RILETTURA_MINIMA_MS) {
    ultimaRilettura = Date.now();
    try {
      await invio.leggiElenco();
      if (el.isConnected) await disegna();
    } catch {
      // Senza rete o col server che non risponde resta l'ultimo elenco letto,
      // con la sua ora: è quello che c'è, e lo si dice.
    }
  }
}

function rigaSegnalazione(s) {
  const numero = s.id ? `n. ${s.id}` : 'nuova';
  const quando = s.locale ? 'in invio' : fraseGiorni(giorniDa(s.ultimoIntervento || s.apertaIl));
  const da = s.ultimoOperatore && s.ultimoOperatore !== s.toccaA ? ` · da ${scappaHtml(s.ultimoOperatore)}` : '';
  const testo = String(s.ultimaNota || s.testo || '').slice(0, 90);
  return `
    <li>
      <a class="segn-riga" href="${ROTTA}/scheda?id=${encodeURIComponent(s.idSegnalazione)}">
        <span class="segn-dove">${scappaHtml(s.commessa)} · ${scappaHtml(luogo(s))}</span>
        <span class="segn-testo">${scappaHtml(testo)}</span>
        <span class="segn-meta tenue">${numero}${da}${quando ? ` · ${quando}` : ''}${s.inInvio ? ' · <strong>in invio</strong>' : ''}</span>
      </a>
    </li>`;
}

// --- La tessera: l'elenco ------------------------------------------------------

let radice = null;

// L'elemento in cui il router disegna è UNO per tutte le schermate: una
// lettura dell'elenco che finisce, o un passo della coda che cambia stato,
// non deve ridisegnare l'elenco delle segnalazioni sopra la home o sopra
// un altro modulo in cui l'operatore è passato nel frattempo. Si ridisegna
// solo se la schermata in vista è ancora questa (difetto trovato dal
// collaudo 29 il 20/11/2026: la home copriva sé stessa con l'elenco).
function inVista(rotta = ROTTA) {
  return (location.hash || '').split('?')[0] === rotta;
}

async function vista(el) {
  assicuraStile();
  radice = el;
  if (!configurato()) {
    el.innerHTML = `
      <section class="scheda">
        <h2>Segnalazioni</h2>
        <p>Questo telefono non è ancora configurato per le segnalazioni.</p>
        <p class="tenue">Fatti mostrare il codice da chi le usa già: Segnalazioni → Impostazioni → «Configura un altro telefono».</p>
      </section>
      <a class="btn btn-secondario" href="${ROTTA}/impostazioni">Impostazioni del modulo</a>`;
    return;
  }
  await ridisegna();
  invio.avvia();
  try {
    await invio.leggiElenco();
    await ridisegna();
  } catch (errore) {
    if (!inVista()) return;
    const avviso = el.querySelector('#segn-lettura');
    if (avviso) avviso.textContent = `${avviso.textContent} — non riletto adesso: ${errore.message}.`;
  }
}

async function ridisegna() {
  const el = radice;
  if (!el || !el.isConnected || !inVista()) return;
  const { passi, elenco, segnalazioni } = await statoAttuale();
  // La lettura della coda è asincrona: nel frattempo si può essere andati altrove.
  if (!inVista()) return;
  const nome = io();
  const mie = toccanoA(segnalazioni, nome);
  const aperte = segnalazioni.filter(s => s.stato === 'Aperta' && s.toccaA !== nome);
  const chiuse = segnalazioni.filter(s => s.stato === 'Chiusa');
  const inCoda = passi.filter(p => p.stato !== 'inviata');
  const rifiutati = passi.filter(p => p.stato === 'inviata' && invio.RIFIUTI_DEFINITIVI[p.esitoServer]);

  const perCantiere = elenco => {
    const gruppi = new Map();
    for (const s of elenco) {
      if (!gruppi.has(s.commessa)) gruppi.set(s.commessa, []);
      gruppi.get(s.commessa).push(s);
    }
    return [...gruppi.keys()].sort().map(c => `
      <h3 class="segn-gruppo">${scappaHtml(etichettaCantiere(c))}</h3>
      <ul class="segn-elenco">${gruppi.get(c).map(rigaSegnalazione).join('')}</ul>`).join('');
  };

  el.innerHTML = `
    ${puoAprire(nome) ? `<a class="btn btn-primario" id="nuova" href="${ROTTA}/nuova">＋ Nuova segnalazione</a>` : ''}
    ${mie.length > 0 ? `
      <section class="segn-banda">
        <h2>Tocca a te <span class="segn-conta">${mie.length}</span></h2>
        <ul class="segn-elenco">${mie.map(rigaSegnalazione).join('')}</ul>
      </section>` : ''}
    ${inCoda.length > 0 ? `
      <section class="scheda" id="segn-coda">
        <h2>Da inviare</h2>
        <ul class="segn-elenco">${righeCoda(inCoda).join('')}</ul>
      </section>` : ''}
    ${rifiutati.length > 0 ? `
      <section class="scheda" id="segn-rifiutati">
        <h2>Non registrati</h2>
        <ul class="segn-elenco">${righeRifiutati(rifiutati).join('')}</ul>
      </section>` : ''}
    <section class="scheda">
      <h2>Aperte</h2>
      ${aperte.length > 0 ? perCantiere(aperte) : '<p class="tenue">Nessun\'altra segnalazione aperta.</p>'}
    </section>
    ${chiuse.length > 0 ? `
      <details class="scheda">
        <summary><strong>Chiuse negli ultimi 30 giorni (${chiuse.length})</strong></summary>
        ${perCantiere(chiuse)}
      </details>` : ''}
    <p class="tenue" id="segn-lettura">${elenco.lettoIl ? `Elenco aggiornato ${oraLeggibile(elenco.lettoIl)}` : 'Elenco non ancora letto dal server'}</p>
    <button class="btn btn-secondario" id="aggiorna" type="button">Aggiorna l'elenco</button>
    <a class="btn btn-secondario" href="${ROTTA}/impostazioni">Impostazioni</a>`;

  el.querySelector('#aggiorna').addEventListener('click', async () => {
    const avviso = el.querySelector('#segn-lettura');
    avviso.textContent = 'Lettura in corso…';
    try {
      await invio.leggiElenco();
      await ridisegna();
    } catch (errore) {
      avviso.textContent = `Elenco non riletto: ${errore.message}.`;
    }
  });
  el.querySelectorAll('[data-riprova]').forEach(b => b.addEventListener('click', async () => {
    for (const id of b.dataset.riprova.split(',')) await invio.riprova(id);
  }));
  el.querySelectorAll('[data-togli]').forEach(b => b.addEventListener('click', async () => {
    const ids = b.dataset.togli.split(',');
    // Un'apertura rifiutata si toglie insieme alle sue foto non ancora partite:
    // senza, la foto non troverebbe più il passo e partirebbe da sola verso una
    // segnalazione che non c'è. Restano fra i «Non registrati», da togliere a
    // loro volta: non si perdono in silenzio. Le foto degli altri passi
    // rifiutati partono lo stesso (invio.fotoScartateConIlPasso).
    const elementi = await coda.elenca();
    const aperture = elementi.filter(x => ids.includes(x.id) && !invio.eFoto(x) && invio.fotoScartateConIlPasso(x)).map(x => x.id);
    for (const f of elementi.filter(x => invio.eFoto(x) && aperture.includes(x.idPasso) && x.stato !== 'inviata')) {
      f.stato = 'inviata';
      f.esitoServer = 'passo_non_registrato';
      f.inviatoIl = Date.now();
      await coda.aggiorna(f);
    }
    for (const id of ids) await coda.elimina(id);
    await ridisegna();
  }));
}

const NOMI_AZIONE = {
  apertura: 'Apertura', passaggio: 'Passaggio', chiusura: 'Chiusura', riapertura: 'Riapertura', foto: 'Foto',
};
const DEL_PASSO = {
  apertura: 'dell\'apertura', passaggio: 'del passaggio', chiusura: 'della chiusura', riapertura: 'della riapertura',
};

function badgeStato(p, ids = [p.id]) {
  return p.stato === 'errore'
    ? `<span class="badge badge-errore">Errore</span> <span class="segn-errore">${scappaHtml(p.ultimoErrore)}</span>
       <button class="btn btn-piccolo btn-secondario" type="button" data-riprova="${ids.join(',')}">Riprova</button>`
    : p.stato === 'invio' ? '<span class="badge badge-invio">Invio in corso</span>' : '<span class="badge badge-coda">In coda</span>';
}

function rigaPasso(p) {
  const verso = p.azione === 'passaggio' ? ` a ${scappaHtml(p.passaA)}` : '';
  return `
    <li class="segn-passo" data-id="${p.id}">
      <span class="segn-dove">${NOMI_AZIONE[p.azione] || p.azione}${verso} · ${scappaHtml(p.commessa || '')} ${p.azione === 'apertura' ? scappaHtml(luogo(p)) : ''}</span>
      <span class="segn-testo">${scappaHtml(String(p.testo || '').slice(0, 90))}</span>
      <span class="segn-meta">${badgeStato(p)}${(p.foto || []).length ? ` · ${p.foto.length} foto` : ''}</span>
    </li>`;
}

// Le foto in coda (dalla 0.44.0 un elemento per foto): dodici righe uguali
// coprirebbero il resto. Quelle dello stesso passo, nello stesso stato e con lo
// stesso errore stanno in una riga sola, «Foto della chiusura · MNG · 5 foto ·
// In coda», con un solo «Riprova» che vale per tutte. Una foto con un errore
// diverso dalle altre ha la sua riga.
function raggruppaFoto(elementi, chiaveDi) {
  const righe = [];
  const gruppi = new Map();
  for (const p of elementi) {
    if (!invio.eFoto(p)) { righe.push({ p, ids: [p.id] }); continue; }
    const chiave = chiaveDi(p);
    if (!gruppi.has(chiave)) {
      const gruppo = { p, ids: [] };
      gruppi.set(chiave, gruppo);
      righe.push(gruppo);
    }
    gruppi.get(chiave).ids.push(p.id);
  }
  return righe;
}

function dicituraFoto(p) {
  return `Foto${DEL_PASSO[p.azionePasso] ? ` ${DEL_PASSO[p.azionePasso]}` : ''} · ${scappaHtml(p.commessa || '')}`;
}

// Una foto che aspetta il suo passo non è un guasto: il motore la segna in
// errore col messaggio dell'attesa, ma a video sta con le foto in coda dello
// stesso passo, senza «Riprova» (riparte da sola dopo il passo). Senza, una
// stessa infornata si spezzava fra «In coda» ed «Errore» secondo il momento in
// cui si guarda.
const inAttesa = p => p.stato !== 'errore' || p.ultimoErrore === invio.MESSAGGIO_ATTESA_PASSO;

export function righeCoda(elementi) {
  return raggruppaFoto(elementi, p => `${p.idPasso}|${inAttesa(p) ? 'attesa' : `errore|${p.ultimoErrore}`}`)
    .map(({ p, ids }) => {
      if (!invio.eFoto(p)) return rigaPasso(p);
      const gruppo = elementi.filter(x => ids.includes(x.id));
      const badge = !inAttesa(p) ? badgeStato(p, ids)
        : gruppo.some(x => x.stato === 'invio') ? '<span class="badge badge-invio">Invio in corso</span>'
          : '<span class="badge badge-coda">In coda</span>';
      return `
    <li class="segn-passo segn-foto-coda" data-id="${p.id}" data-passo="${scappaHtml(p.idPasso || '')}">
      <span class="segn-dove">${dicituraFoto(p)}</span>
      <span class="segn-meta">${badge} · <span class="segn-quante">${ids.length}</span> foto</span>
    </li>`;
    });
}

// Fra i «Non registrati» le foto di uno stesso passo stanno in una riga sola, e
// «Ho capito, togli» le toglie tutte.
export function righeRifiutati(elementi) {
  return raggruppaFoto(elementi, p => `${p.idPasso}|${p.esitoServer}`)
    .map(({ p, ids }) => rigaRifiuto(p, ids));
}

function rigaRifiuto(p, ids = [p.id]) {
  const dove = invio.eFoto(p)
    ? `${dicituraFoto(p)} · <span class="segn-quante">${ids.length}</span> foto`
    : `${NOMI_AZIONE[p.azione] || p.azione}${p.azione === 'passaggio' ? ` a ${scappaHtml(p.passaA)}` : ''}`;
  return `
    <li class="segn-passo">
      <span class="segn-dove">${dove}</span>
      <span class="segn-testo">${scappaHtml(invio.RIFIUTI_DEFINITIVI[p.esitoServer])}</span>
      <button class="btn btn-piccolo btn-secondario" type="button" data-togli="${ids.join(',')}">Ho capito, togli</button>
    </li>`;
}

// --- Nuova segnalazione ---------------------------------------------------------

let fotoNuove = [];
let fermaDettatura = () => {};

function campiFoto(prefisso = '') {
  return `
    <div class="campo">
      <label>Foto <span class="tenue">(facoltative, quante servono)</span></label>
      <div class="segn-foto" id="${prefisso}anteprime"></div>
      <div class="segn-pulsanti">
        <label class="btn btn-secondario btn-piccolo" for="${prefisso}scatta">📷 Scatta foto</label>
        <input id="${prefisso}scatta" class="nascosto" type="file" accept="image/*" capture="environment">
        <label class="btn btn-secondario btn-piccolo" for="${prefisso}galleria">🖼️ Dalla galleria</label>
        <input id="${prefisso}galleria" class="nascosto" type="file" accept="image/*" multiple>
      </div>
      <p class="avviso avviso-attenzione nascosto" id="${prefisso}avviso-foto"></p>
    </div>`;
}

// Le foto si preparano subito, una per volta: chi ne sceglie una che il
// telefono non sa leggere lo vede adesso, invece di scoprirlo all'invio. Dalla
// 0.44.0 non c'è un massimo.
function collegaFoto(el, prefisso) {
  const anteprime = el.querySelector(`#${prefisso}anteprime`);
  const avviso = el.querySelector(`#${prefisso}avviso-foto`);
  const disegna = () => {
    anteprime.innerHTML = fotoNuove.map((f, i) => `
      <span class="segn-miniatura">
        <img alt="Foto ${i + 1}" src="${f.url}">
        <button type="button" class="segn-togli" data-indice="${i}" aria-label="Togli la foto ${i + 1}">✕</button>
      </span>`).join('');
    anteprime.querySelectorAll('.segn-togli').forEach(b => b.addEventListener('click', () => {
      const [tolta] = fotoNuove.splice(Number(b.dataset.indice), 1);
      URL.revokeObjectURL(tolta.url);
      avviso.classList.add('nascosto');
      disegna();
    }));
  };
  const aggiungi = async file => {
    try {
      const blob = await preparaFoto(file);
      fotoNuove.push({ blob, url: URL.createObjectURL(blob) });
      disegna();
    } catch (errore) {
      avviso.textContent = errore.message;
      avviso.classList.remove('nascosto');
    }
  };
  for (const id of [`${prefisso}scatta`, `${prefisso}galleria`]) {
    const input = el.querySelector(`#${id}`);
    input.addEventListener('change', async () => {
      avviso.classList.add('nascosto');
      for (const file of [...input.files]) await aggiungi(file);
      input.value = '';
    });
  }
  disegna();
}

function azzeraFoto() {
  for (const f of fotoNuove) URL.revokeObjectURL(f.url);
  fotoNuove = [];
}

function opzioniPassaggio(escluso, segnaposto) {
  return `<option value="">${segnaposto}</option>` + OPERATORI
    .filter(n => n !== escluso)
    .map(n => `<option value="${scappaHtml(n)}">${scappaHtml(n)}</option>`).join('');
}

function campiTesto(prefisso, etichetta, segnaposto) {
  return `
    <div class="campo">
      <label for="${prefisso}testo">${etichetta}</label>
      <textarea id="${prefisso}testo" rows="4" placeholder="${segnaposto}"></textarea>
      <div class="segn-pulsanti">
        <button class="btn btn-secondario btn-piccolo" type="button" id="${prefisso}detta" aria-pressed="false">🎤 Detta</button>
      </div>
      <p class="aiuto tenue" id="${prefisso}avviso-detta">Scrivi l'alloggio, non il nome del cliente.</p>
    </div>`;
}

function vistaNuova(el) {
  assicuraStile();
  fermaDettatura();
  azzeraFoto();
  if (!puoAprire(io())) {
    el.innerHTML = `
      <section class="scheda">
        <h2>Nuova segnalazione</h2>
        <p>Le segnalazioni le aprono Paolo, Domenico, Rosario, Enzo, Andrea, Florin, Roberto e Francesco. Se ne vedi una che tocca a te, la trovi nell'elenco.</p>
      </section>
      <a class="btn btn-secondario" href="${ROTTA}">Torna alle segnalazioni</a>`;
    return;
  }
  const cantieri = CANTIERI.map(c => `<option value="${scappaHtml(c.codice)}">${scappaHtml(c.etichetta)}</option>`).join('');
  el.innerHTML = `
    <section class="scheda">
      <h2>Nuova segnalazione</h2>
      <form id="form-nuova" novalidate>
        <div class="campo">
          <label for="commessa">Cantiere</label>
          <select id="commessa"><option value="" selected disabled>— scegli il cantiere —</option>${cantieri}</select>
        </div>
        <fieldset class="campo segn-ambito">
          <legend>Dove</legend>
          <label><input type="radio" name="ambito" value="Alloggio"> Un alloggio</label>
          <label><input type="radio" name="ambito" value="Parte comune"> Parti comuni</label>
        </fieldset>
        <div id="dove"></div>
        ${campiTesto('', 'Cosa c\'è', 'Per esempio: il condizionatore non parte, sentiti gli elettrici')}
        ${campiFoto('')}
        <div class="campo">
          <label for="passa-a">Deve passare <span class="tenue">(facoltativo)</span></label>
          <select id="passa-a">${opzioniPassaggio('', '— la tengo io —')}</select>
          <p class="aiuto tenue">Se scegli un nome, la segnalazione compare in cima alla sua app.</p>
        </div>
        <p class="avviso avviso-errore nascosto" id="errore-nuova"></p>
        <button class="btn btn-primario" type="submit" id="invia-segnalazione">Invia la segnalazione</button>
      </form>
    </section>
    <a class="btn btn-secondario" href="${ROTTA}" id="annulla">Annulla</a>`;

  const commessa = el.querySelector('#commessa');
  const dove = el.querySelector('#dove');
  const ambito = () => (el.querySelector('input[name="ambito"]:checked') || {}).value || '';

  // Il luogo si sceglie dall'anagrafica che l'app ha già (decisione 7). Una
  // commessa senza anagrafica — conclusa, o un'urbanizzazione — si scrive a
  // parole: meglio un «dove» scritto che una segnalazione che non si può aprire.
  const disegnaDove = () => {
    const c = commessa.value;
    const a = ambito();
    if (!c || !a) { dove.innerHTML = ''; return; }
    if (!anagraficaNota(c) || eUrbanizzazione(c)) {
      dove.innerHTML = `
        <div class="campo">
          <label for="dove-testo">${a === 'Alloggio' ? 'Quale alloggio' : 'Quale parte comune'}</label>
          <input id="dove-testo" type="text" maxlength="60" placeholder="${a === 'Alloggio' ? 'per esempio 3B' : 'per esempio scala B, ascensore'}">
        </div>`;
      return;
    }
    if (a === 'Alloggio') {
      const unita = unitaDi(c);
      dove.innerHTML = `
        <div class="campo">
          <label for="unita">Alloggio</label>
          <select id="unita"><option value="" selected disabled>— scegli l'alloggio —</option>
            ${unita.map(u => `<option value="${scappaHtml(u.codice)}" data-piano="${scappaHtml(u.piano)}">${scappaHtml(u.codice)} · ${scappaHtml(u.etichettaPiano)}</option>`).join('')}
          </select>
        </div>`;
      return;
    }
    const palazzine = corpiDistinti(c) ? scaleDi(c) : [];
    dove.innerHTML = `
      ${palazzine.length > 0 ? `
        <div class="campo">
          <label for="scala">Palazzina</label>
          <select id="scala"><option value="">Tutte le palazzine</option>
            ${palazzine.map(s => `<option value="${scappaHtml(s.codice)}">${scappaHtml(etichettaScala(s.codice))}</option>`).join('')}
          </select>
        </div>` : ''}
      <div class="campo">
        <label for="piano">Piano</label>
        <select id="piano"><option value="">Tutto l'edificio</option>
          ${pianiDi(c).map(p => `<option value="${scappaHtml(p.codice)}">${scappaHtml(p.etichetta)}</option>`).join('')}
        </select>
        <p class="aiuto tenue">Ascensore, scale, autorimessa: scrivilo nel testo qui sotto.</p>
      </div>`;
  };
  commessa.addEventListener('change', disegnaDove);
  el.querySelectorAll('input[name="ambito"]').forEach(r => r.addEventListener('change', disegnaDove));

  fermaDettatura = collegaDettatura(el.querySelector('#detta'), el.querySelector('#testo'), el.querySelector('#avviso-detta'));
  collegaFoto(el, '');

  el.querySelector('#form-nuova').addEventListener('submit', async evento => {
    evento.preventDefault();
    const errore = el.querySelector('#errore-nuova');
    const mostra = testo => { errore.textContent = testo; errore.classList.remove('nascosto'); };
    errore.classList.add('nascosto');
    const c = commessa.value;
    const a = ambito();
    const testo = el.querySelector('#testo').value.trim();
    if (!c) return mostra('Scegli il cantiere.');
    if (!a) return mostra('Scegli se è un alloggio o una parte comune.');
    let piano = '';
    let unita = '';
    let parteComune = '';
    const testoDove = el.querySelector('#dove-testo');
    if (testoDove) {
      const scritto = testoDove.value.trim();
      if (!scritto) return mostra(a === 'Alloggio' ? 'Scrivi quale alloggio.' : 'Scrivi quale parte comune.');
      if (a === 'Alloggio') unita = scritto; else parteComune = scritto;
    } else if (a === 'Alloggio') {
      const scelta = el.querySelector('#unita');
      if (!scelta.value) return mostra('Scegli l\'alloggio.');
      unita = scelta.value;
      piano = scelta.selectedOptions[0].dataset.piano || '';
    } else {
      const scala = el.querySelector('#scala');
      const sceltaPiano = el.querySelector('#piano');
      piano = sceltaPiano.value;
      const pezzi = [];
      if (scala && scala.value) pezzi.push(etichettaScala(scala.value));
      pezzi.push(piano ? sceltaPiano.selectedOptions[0].textContent.trim() : 'Tutto l\'edificio');
      parteComune = pezzi.join(' · ');
    }
    if (!testo) return mostra('Scrivi (o detta) cosa c\'è.');
    const bottone = el.querySelector('#invia-segnalazione');
    bottone.disabled = true;
    fermaDettatura();
    try {
      await coda.accoda({
        azione: 'apertura', autore: io(), passaA: el.querySelector('#passa-a').value, testo,
        commessa: c, ambito: a, piano, unita, parteComune, foto: fotoNuove.map(f => f.blob),
      });
    } catch (e) {
      bottone.disabled = false;
      return mostra(messaggioSalvataggio(e, 'la segnalazione'));
    }
    azzeraFoto();
    invio.avvia();
    naviga(ROTTA);
    return undefined;
  });
}

// --- La scheda ------------------------------------------------------------------

async function vistaScheda(el, _sotto, parametri, giaRiletta = false) {
  assicuraStile();
  fermaDettatura();
  azzeraFoto();
  const idSegnalazione = parametri.get('id') || '';
  const { passi, segnalazioni } = await statoAttuale();
  if (!inVista(`${ROTTA}/scheda`)) return;
  const s = segnalazioni.find(x => x.idSegnalazione === idSegnalazione);
  if (!s) {
    el.innerHTML = `
      <section class="scheda">
        <h2>Segnalazione non trovata</h2>
        <p>Non è nell'ultimo elenco letto. Torna all'elenco e aggiornalo.</p>
      </section>
      <a class="btn btn-secondario" href="${ROTTA}">Torna alle segnalazioni</a>`;
    return;
  }
  const nome = io();
  const aperta = s.stato === 'Aperta';
  const puoAgire = aperta && (s.toccaA === nome || coordina(nome));
  const puoRiaprire = !aperta && coordina(nome);
  const nonArrivati = passi.filter(p => p.idSegnalazione === idSegnalazione && p.stato !== 'inviata');
  const locali = nonArrivati.filter(p => !invio.eFoto(p));
  // Foto da questo telefono non ancora arrivate: elementi a sé dalla 0.44.0,
  // dentro i passi in una coda rimasta da una 0.43.x.
  const fotoInInvio = nonArrivati.reduce((n, p) => n + (invio.eFoto(p) ? 1 : (p.foto || []).length), 0);
  // Per una segnalazione già arrivata il server le conta; per una nuova sono già
  // nel numero che il telefono le attribuisce.
  const fotoArrivate = s.locale ? 0 : (Number(s.numeroFoto) || 0);

  el.innerHTML = `
    <section class="scheda">
      <h2>${scappaHtml(s.commessa)} · ${scappaHtml(luogo(s))}</h2>
      <p class="tenue">${s.id ? `Segnalazione n. ${s.id}` : 'Segnalazione nuova, non ancora arrivata'}${s.apertaDa ? ` · aperta da ${scappaHtml(s.apertaDa)}` : ''}${s.apertaIl ? ` il ${dataLeggibile(s.apertaIl)}` : ''}</p>
      <p class="segn-testo-pieno">${scappaHtml(s.testo || '')}</p>
      <dl class="info-elenco">
        <dt>Stato</dt><dd id="segn-stato">${aperta ? 'Aperta' : 'Chiusa'}${s.inInvio ? ' (in invio)' : ''}</dd>
        ${aperta ? `<dt>Tocca a</dt><dd id="segn-tocca">${scappaHtml(s.toccaA || '—')}</dd>` : ''}
        ${!aperta && s.chiusaDa ? `<dt>Chiusa da</dt><dd>${scappaHtml(s.chiusaDa)}${s.chiusaIl ? ` il ${dataLeggibile(s.chiusaIl)}` : ''}</dd>` : ''}
        <dt>Foto</dt><dd id="segn-numero-foto">${fotoArrivate}${fotoArrivate ? ' (si guardano in SharePoint)' : ''}${fotoInInvio ? ` · ${fotoInInvio} in invio da questo telefono` : ''}</dd>
      </dl>
    </section>
    <section class="scheda">
      <h2>Interventi</h2>
      <ol class="segn-storia" id="segn-storia"><li class="tenue">Lettura in corso…</li></ol>
      ${locali.length > 0 ? `<p class="tenue">${locali.length} ${locali.length === 1 ? 'passo' : 'passi'} da questo telefono non ancora arrivati.</p>` : ''}
    </section>
    ${puoAgire ? `
      <section class="scheda" id="segn-azioni">
        <h2>Il tuo intervento</h2>
        ${campiTesto('a-', 'Cosa hai fatto', 'Per esempio: collegamenti a posto, sentire quelli delle macchine')}
        ${campiFoto('a-')}
        <div class="campo">
          <label for="a-passa">Ho fatto la mia parte, deve passare</label>
          <select id="a-passa">${opzioniPassaggio(nome, '— scegli chi —')}</select>
        </div>
        <p class="avviso avviso-errore nascosto" id="errore-azione"></p>
        <button class="btn btn-primario" type="button" id="passa">Passa</button>
        <button class="btn btn-successo" type="button" id="chiudi">Risolto, chiudi</button>
      </section>` : ''}
    ${puoRiaprire ? `
      <section class="scheda" id="segn-riapri">
        <h2>Riapri</h2>
        ${campiTesto('r-', 'Perché', 'Per esempio: il cliente dice che perde ancora')}
        <div class="campo">
          <label for="r-passa">Deve passare</label>
          <select id="r-passa">${opzioniPassaggio('', '— la tengo io —')}</select>
        </div>
        <p class="avviso avviso-errore nascosto" id="errore-riapri"></p>
        <button class="btn btn-primario" type="button" id="riapri">Riapri la segnalazione</button>
      </section>` : ''}
    <a class="btn btn-secondario" href="${ROTTA}">Torna alle segnalazioni</a>`;

  const disegnaStoria = storia => {
    const lista = el.querySelector('#segn-storia');
    if (!lista) return;
    const interventi = raggruppaStoria(storia && Array.isArray(storia.interventi) ? storia.interventi : []);
    lista.innerHTML = interventi.length === 0
      ? `<li class="tenue">${s.locale ? 'Ancora nessuno: la segnalazione non è arrivata.' : 'Storia non disponibile senza rete.'}</li>`
      : interventi.map(i => `
        <li>
          <strong>${NOMI_AZIONE[i.azione] || scappaHtml(i.azione)}</strong>
          ${i.azione === 'passaggio' || (i.azione !== 'chiusura' && i.azione !== 'foto' && i.passaA) ? ` a ${scappaHtml(i.passaA || '')}` : ''}
          · ${scappaHtml(i.operatore || '')} · ${dataLeggibile(i.data)}
          ${i.testo ? `<br><span>${scappaHtml(i.testo)}</span>` : ''}
          ${Number(i.numeroFoto) ? `<br><span class="tenue segn-foto-passo">${i.numeroFoto} foto</span>` : ''}
        </li>`).join('');
  };
  disegnaStoria(storiaSalvata(idSegnalazione));
  if (!s.locale) invio.leggiStoria(idSegnalazione).then(storia => { if (inVista(`${ROTTA}/scheda`)) disegnaStoria(storia); });

  // La scheda si disegna subito con l'ultimo elenco salvato, che può essere
  // vecchio: un altro l'ha intanto passata o chiusa. Si rilegge, e se stato o
  // destinatario sono cambiati si ridisegna — ma non sopra un testo che
  // l'operatore sta già scrivendo: lì l'eventuale rifiuto del server
  // («già chiusa») lo dirà la coda.
  if (!giaRiletta && configurato() && navigator.onLine) {
    invio.leggiElenco().then(async () => {
      if (!inVista(`${ROTTA}/scheda`) || parametri.get('id') !== new URLSearchParams((location.hash.split('?')[1]) || '').get('id')) return;
      const { segnalazioni: aggiornate } = await statoAttuale();
      const nuova = aggiornate.find(x => x.idSegnalazione === idSegnalazione);
      const scritto = [...el.querySelectorAll('textarea')].some(t => t.value.trim()) || fotoNuove.length > 0;
      if (nuova && !scritto && (nuova.stato !== s.stato || nuova.toccaA !== s.toccaA)) {
        await vistaScheda(el, _sotto, parametri, true);
      }
    }).catch(() => {});
  }

  const registra = async (dati, idErrore) => {
    const errore = el.querySelector(`#${idErrore}`);
    errore.classList.add('nascosto');
    fermaDettatura();
    try {
      await coda.accoda({ idSegnalazione, autore: nome, commessa: s.commessa, ...dati, foto: fotoNuove.map(f => f.blob) });
    } catch (e) {
      errore.textContent = messaggioSalvataggio(e, 'il passo');
      errore.classList.remove('nascosto');
      return;
    }
    azzeraFoto();
    invio.avvia();
    naviga(ROTTA);
  };

  if (puoAgire) {
    fermaDettatura = collegaDettatura(el.querySelector('#a-detta'), el.querySelector('#a-testo'), el.querySelector('#a-avviso-detta'));
    collegaFoto(el, 'a-');
    el.querySelector('#passa').addEventListener('click', () => {
      const passaA = el.querySelector('#a-passa').value;
      if (!passaA) {
        const errore = el.querySelector('#errore-azione');
        errore.textContent = 'Scegli chi deve passare.';
        errore.classList.remove('nascosto');
        return;
      }
      registra({ azione: 'passaggio', passaA, testo: el.querySelector('#a-testo').value.trim() }, 'errore-azione');
    });
    el.querySelector('#chiudi').addEventListener('click', () => {
      registra({ azione: 'chiusura', testo: el.querySelector('#a-testo').value.trim() }, 'errore-azione');
    });
  }
  if (puoRiaprire) {
    fermaDettatura = collegaDettatura(el.querySelector('#r-detta'), el.querySelector('#r-testo'), el.querySelector('#r-avviso-detta'));
    el.querySelector('#riapri').addEventListener('click', () => {
      const testo = el.querySelector('#r-testo').value.trim();
      if (!testo) {
        const errore = el.querySelector('#errore-riapri');
        errore.textContent = 'Scrivi perché la riapri.';
        errore.classList.remove('nascosto');
        return;
      }
      registra({ azione: 'riapertura', passaA: el.querySelector('#r-passa').value, testo }, 'errore-riapri');
    });
  }
}

// --- Impostazioni ---------------------------------------------------------------

function vistaImpostazioni(el) {
  assicuraStile();
  const i = impostazioniSegnalazioni();
  el.innerHTML = `
    <section class="scheda">
      <h2>Impostazioni Segnalazioni</h2>
      <form id="form-imp-segnalazioni">
        <div class="campo">
          <label for="endpoint">Indirizzo di invio (URL)</label>
          <input id="endpoint" type="url" inputmode="url" placeholder="https://&hellip;" value="${scappaHtml(i.endpoint)}">
        </div>
        <div class="campo">
          <label for="endpoint-elenco">Indirizzo dell'elenco (URL)</label>
          <input id="endpoint-elenco" type="url" inputmode="url" placeholder="https://&hellip;" value="${scappaHtml(i.endpointElenco)}">
          <p class="aiuto tenue">Tutti e due li comunica Francesco, o arrivano col codice da un altro telefono. Contengono una firma di accesso: vivono solo su questo dispositivo.</p>
        </div>
        <div class="campo">
          <label for="token">Codice di accesso</label>
          <input id="token" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${scappaHtml(i.token)}">
        </div>
        <button class="btn btn-primario" type="submit">Salva</button>
      </form>
      <p id="conferma" class="avviso avviso-info nascosto">Impostazioni salvate.</p>
    </section>
    <section class="scheda">
      <h2>Altri telefoni</h2>
      <p class="tenue">Passa indirizzi e codice a un altro telefono facendogli inquadrare un codice, senza digitare nulla.</p>
      <a class="btn btn-secondario" href="${ROTTA}/condividi">Configura un altro telefono</a>
    </section>
    <a class="btn btn-secondario" href="${ROTTA}">Torna alle segnalazioni</a>`;
  el.querySelector('#form-imp-segnalazioni').addEventListener('submit', evento => {
    evento.preventDefault();
    const nuove = salvaImpostazioniSegnalazioni({
      endpoint: el.querySelector('#endpoint').value.trim(),
      endpointElenco: el.querySelector('#endpoint-elenco').value.trim(),
      token: el.querySelector('#token').value.trim(),
    });
    el.querySelector('#endpoint').value = nuove.endpoint ? normalizzaEndpoint(nuove.endpoint) : '';
    el.querySelector('#endpoint-elenco').value = nuove.endpointElenco ? normalizzaEndpoint(nuove.endpointElenco) : '';
    el.querySelector('#conferma').classList.remove('nascosto');
  });
}

invio.alCambiamento(() => { ridisegna(); });

export default {
  id: 'segnalazioni',
  titolo: 'Segnalazioni',
  descrizione: 'Problemi negli alloggi e nelle parti comuni: chi apre, chi passa, chi chiude',
  icona: '📋',
  registra(registraRotta) {
    registraRotta(ROTTA, vista);
    registraRotta(`${ROTTA}/nuova`, vistaNuova);
    registraRotta(`${ROTTA}/scheda`, vistaScheda);
    registraRotta(`${ROTTA}/impostazioni`, vistaImpostazioni);
    registraRotta(`${ROTTA}/configura`, vistaConfigura);
    registraRotta(`${ROTTA}/condividi`, vistaCondividi);
    window.addEventListener('online', () => invio.avvia());
    // I passi rimasti in coda partono anche senza aprire il modulo.
    if (configurato()) invio.avvia();
  },
  inCima,
  // Dalla 0.44.0 una foto è un elemento della coda ma non è un passo: «In coda»
  // e «Bloccate» contano tutti gli elementi che devono ancora arrivare (anche
  // una foto ferma è una cosa che manca all'ufficio), «Oggi» conta passi e foto
  // a parte, e la riga «Foto in coda» dice quante di quelle in coda sono foto.
  async stato() {
    const passi = await coda.elenca().catch(() => []);
    const elenco = elencoSalvato();
    const oggi = coda.contatoriOggi();
    const fotoInCoda = passi.filter(p => invio.eFoto(p) && p.stato !== 'inviata').length;
    return {
      bozze: 0,
      inAttesa: passi.filter(p => p.stato === 'in_coda' || p.stato === 'invio').length,
      inErrore: passi.filter(p => p.stato === 'errore').length,
      oggi,
      oggiTesto: `${oggi.scattate} passi fatti, ${oggi.inviate} arrivati · ${oggi.foto} foto, ${oggi.fotoInviate} arrivate`,
      righe: [
        ['Foto in coda', String(fotoInCoda)],
        ['Elenco letto', elenco.lettoIl ? oraLeggibile(elenco.lettoIl) : 'mai'],
        ['Segnalazioni che toccano a te', String(toccanoA(segnalazioniDelTelefono(elenco.segnalazioni, passi), io()).length)],
      ],
    };
  },
};
