// Le regole del modulo Segnalazioni, lato server (dalla 0.43.0).
//
// Decisione di Francesco del 20/11/2026: niente flow di Power Automate, due
// funzioni su Azure Functions che scrivono su SharePoint con un'identità che
// vede il solo sito Cantieri LL. Questo file è il cuore delle due funzioni ed
// è PURO: non sa niente di Azure né di SharePoint. Parla con un «archivio»
// (src/sharepoint.js in esercizio, src/memoria.js nei collaudi), e restituisce
// `{ stato, corpo }`. Così le stesse regole girano nei collaudi del server e in
// quelli dell'app (collaudi/29-segnalazioni.js): app e server si provano
// insieme, e un contratto che diverge diventa rosso.
//
// Il contratto è quello che l'app manda dalla 0.43.0 (modules/segnalazioni/
// invio.js). Le colonne si chiamano come nelle liste SharePoint.

import { timingSafeEqual } from 'node:crypto';

// Chi apre: decisione 1 di Francesco del 20/11/2026, corretta da lui la sera
// stessa (0.43.1): «No le segnalazioni devo poterle aprire anche io» e
// «Aggiungi anche Florin e Roberto Borinschi a quelli che possono aprire
// segnalazioni». Otto, coi nomi di core/operatori.js. I clienti no.
export const POSSONO_APRIRE = [
  'Andrea Gondos', 'Domenico Caminiti', 'Enzo Santovito', 'Florin Zaharia',
  'Francesco Lando', 'Paolo Sanzarello', 'Roberto Borinschi', 'Rosario Incarbone',
];
// Chi riapre: decisione 8.
export const COORDINANO = ['Francesco Lando', 'Paolo Sanzarello'];
// Dalla 0.44.0 le foto non hanno limite (Francesco, 20/11/2026: «le foto non
// devono essere massimo 3, numero libero») e viaggiano una per richiesta, con
// l'azione `foto`. I passi dei telefoni ancora alla 0.43.x portano le foto
// dentro di sé, fino a 3: il massimo che quell'app manda. Oltre è un invio che
// nessuna app scrive, e si rifiuta. Il limite per segnalazione non c'è più.
export const FOTO_PER_PASSO = 3;
export const AZIONI = ['apertura', 'passaggio', 'chiusura', 'riapertura'];
// L'azione delle foto singole: non è un passo e non cambia la segnalazione.
export const AZIONE_FOTO = 'foto';
// Le chiuse restano nell'elenco per 30 giorni: servono a chi deve riaprirle.
export const GIORNI_CHIUSE = 30;

// Identificativi dell'app: lettere, cifre e trattini. Stringerli qui serve a
// due cose: finiscono in un filtro OData (src/sharepoint.js) e nelle risposte,
// e niente di quello che arriva da fuori deve poterne cambiare il senso.
const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;
const NOME_FOTO_VALIDO = /^[A-Za-z0-9-]{1,64}$/;

const risposta = (stato, corpo) => ({ stato, corpo });

export function tokenValido(atteso, ricevuto) {
  if (typeof atteso !== 'string' || atteso.length < 16 || typeof ricevuto !== 'string') return false;
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(ricevuto, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// `dataIntervento` arriva ISO con fuso (`2026-11-20T15:11:17+01:00`); in
// lista va come 14 cifre AAAAMMGGHHMMSS dell'ora del telefono. Il fuso si
// lascia cadere di proposito, come nella raccolta delle foto: è l'ora che
// l'operatore ha visto sul telefono.
export function cifre14(iso) {
  return String(iso || '').slice(0, 19).replace(/\D/g, '');
}

function testo(v, massimo = 4000) {
  return typeof v === 'string' ? v.slice(0, massimo) : '';
}

// Perché la richiesta non si può nemmeno guardare. Vuoto se va bene.
export function payloadIncompleto(d) {
  if (!d || typeof d !== 'object') return 'corpo';
  if (!ID_VALIDO.test(String(d.idClient || ''))) return 'idClient';
  if (!ID_VALIDO.test(String(d.idSegnalazione || ''))) return 'idSegnalazione';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(d.dataIntervento || ''))) return 'dataIntervento';
  if (!testo(d.operatore)) return 'operatore';
  if (!AZIONI.includes(d.azione) && d.azione !== AZIONE_FOTO) return 'azione';
  if (d.azione === 'apertura' && !testo(d.commessa)) return 'commessa';
  if (d.azione === 'passaggio' && !testo(d.passaA)) return 'passaA';
  if (d.azione === AZIONE_FOTO && !ID_VALIDO.test(String(d.idPasso || ''))) return 'idPasso';
  const foto = d.foto === undefined ? [] : d.foto;
  if (!Array.isArray(foto)) return 'foto';
  // Una foto per richiesta, esattamente: due in una richiesta sono un'app
  // che non segue il contratto, e nessuna è una richiesta vuota.
  if (d.azione === AZIONE_FOTO && foto.length !== 1) return 'foto';
  if (foto.length > FOTO_PER_PASSO) return 'foto';
  for (const f of foto) {
    if (!f || !NOME_FOTO_VALIDO.test(String(f.nome || '')) || !testo(f.contenutoBase64, Infinity)) return 'foto';
  }
  if (new Set(foto.map(f => f.nome)).size !== foto.length) return 'foto';
  return '';
}

// --- Ricevitore: apertura, passaggio, chiusura, riapertura ------------------

export async function riceviPasso(d, archivio, { token, registra = () => {} }) {
  if (!d || !tokenValido(token, d.token)) return risposta(401, { esito: 'token_non_valido' });
  const manca = payloadIncompleto(d);
  if (manca) return risposta(400, { esito: 'payload_incompleto', campo: manca });
  if (d.azione === AZIONE_FOTO) return riceviFoto(d, archivio, registra);
  if (d.azione === 'apertura' && !POSSONO_APRIRE.includes(d.operatore)) return risposta(403, { esito: 'operatore_non_ammesso' });
  if (d.azione === 'riapertura' && !COORDINANO.includes(d.operatore)) return risposta(403, { esito: 'operatore_non_ammesso' });

  const foto = Array.isArray(d.foto) ? d.foto : [];
  let gia;
  let seg;
  try {
    gia = await archivio.cercaIntervento(d.idClient);
    if (gia) return risposta(200, { esito: 'gia_presente', idClient: d.idClient });
    seg = await archivio.cercaSegnalazione(d.idSegnalazione);
  } catch (e) {
    registra('lettura', e);
    return risposta(500, { esito: 'errore_lettura' });
  }

  // Un invio ripreso dopo un guasto a metà: la segnalazione è già stata
  // aggiornata da QUESTO invio (lo dice IdClient), ma l'intervento non è stato
  // scritto, quindi la guardia sui doppioni lo lascia passare. Non ha
  // conflitti e non conta le foto due volte.
  const ripresa = Boolean(seg) && seg.IdClient === d.idClient;
  if (!ripresa) {
    if (!seg && d.azione !== 'apertura') return risposta(409, { esito: 'segnalazione_sconosciuta' });
    if (seg && d.azione !== 'apertura') {
      if ((d.azione === 'passaggio' || d.azione === 'chiusura') && seg.Stato === 'Chiusa') return risposta(409, { esito: 'gia_chiusa' });
      if (d.azione === 'riapertura' && seg.Stato === 'Aperta') return risposta(409, { esito: 'gia_aperta' });
      // Dalla 0.44.0 non c'è più «troppe foto»: il limite per segnalazione è tolto.
    }
  }
  const fotoTotali = !seg ? foto.length
    : (ripresa || d.azione === 'apertura') ? (Number(seg.NumeroFoto) || 0)
      : (Number(seg.NumeroFoto) || 0) + foto.length;

  const data = cifre14(d.dataIntervento);
  const comuni = {
    IdClient: d.idClient,
    UltimoIntervento: data,
    UltimoOperatore: testo(d.operatore, 255),
    UltimaNota: testo(d.testo),
    NumeroFoto: fotoTotali,
  };
  let id;
  try {
    if (!seg) {
      const luogo = testo(d.unita, 255) || testo(d.parteComune, 255);
      id = await archivio.creaSegnalazione({
        Title: `${testo(d.commessa, 100)} · ${luogo}`.slice(0, 255),
        IdSegnalazione: d.idSegnalazione,
        Commessa: testo(d.commessa, 255),
        Ambito: testo(d.ambito, 255),
        Piano: testo(d.piano, 255),
        Unita: testo(d.unita, 255),
        ParteComune: testo(d.parteComune, 255),
        Testo: testo(d.testo),
        ApertaDa: testo(d.operatore, 255),
        ApertaIl: data,
        Stato: 'Aperta',
        ToccaA: testo(d.passaA, 255) || testo(d.operatore, 255),
        StatoCodifica: 'Nuova',
        ...comuni,
      });
    } else {
      id = seg.ID;
      if (d.azione === 'passaggio') {
        await archivio.aggiornaSegnalazione(id, { ToccaA: testo(d.passaA, 255), ...comuni });
      } else if (d.azione === 'chiusura') {
        await archivio.aggiornaSegnalazione(id, {
          Stato: 'Chiusa', ToccaA: null, ChiusaDa: testo(d.operatore, 255), ChiusaIl: data, ...comuni,
        });
      } else if (d.azione === 'riapertura') {
        await archivio.aggiornaSegnalazione(id, {
          Stato: 'Aperta', ToccaA: testo(d.passaA, 255) || testo(d.operatore, 255), ChiusaDa: null, ChiusaIl: null, ...comuni,
        });
      }
      // apertura ripresa: la segnalazione c'è già, si va avanti senza crearne un'altra.
    }
  } catch (e) {
    registra('scrittura_segnalazione', e);
    return risposta(500, { esito: 'errore_scrittura_segnalazione' });
  }

  // Foto come allegati della segnalazione, col nome fisso: un invio ripreso
  // trova quelle già caricate e non le carica una seconda volta.
  try {
    const presenti = new Set(await archivio.fotoPresenti(id));
    for (const f of foto) {
      const nome = `${f.nome}.jpg`;
      if (presenti.has(nome)) continue;
      await archivio.aggiungiFoto(id, nome, Buffer.from(f.contenutoBase64, 'base64'));
    }
  } catch (e) {
    registra('scrittura_foto', e);
    return risposta(500, { esito: 'errore_scrittura_foto' });
  }

  // L'intervento PER ULTIMO: è lui che fa da guardia sui doppioni. Se il giro
  // si ferma prima, l'app riprova e la guardia la lascia passare.
  try {
    await archivio.creaIntervento({
      Title: d.azione,
      IdSegnalazione: d.idSegnalazione,
      RigaSegnalazione: id,
      IdClient: d.idClient,
      Azione: d.azione,
      Operatore: testo(d.operatore, 255),
      PassaA: testo(d.passaA, 255),
      Testo: testo(d.testo),
      DataIntervento: data,
      NumeroFoto: foto.length,
      IdDispositivo: testo(d.idDispositivo, 255),
      VersioneApp: testo(d.versioneApp, 255),
    });
  } catch (e) {
    registra('scrittura_intervento', e);
    return risposta(500, { esito: 'errore_scrittura_intervento' });
  }
  return risposta(200, { esito: 'ok', idSegnalazione: d.idSegnalazione, id, azione: d.azione });
}

// --- Foto singole (dalla 0.44.0) --------------------------------------------
//
// Una richiesta, una foto. L'app la manda DOPO il passo a cui appartiene, con
// operatore e data di quel passo e il suo `idClient` in `idPasso`. La foto non è
// un passo: non cambia Stato, ToccaA, UltimaNota, UltimoOperatore né IdClient
// della segnalazione — IdClient è quello che riconosce un passo ripreso dopo un
// guasto a metà, e una foto che lo sovrascrivesse trasformerebbe la ripresa di
// una chiusura in un «già chiusa».
//
// Vale su una segnalazione chiusa (la foto di una chiusura arriva dopo la
// chiusura) e la manda chiunque abbia il codice, come passaggio e chiusura.
//
// Ordine dei passi, scelto per la ripresa:
//   1. allegato, saltato se c'è già col suo nome;
//   2. NumeroFoto, che si RICAVA dagli allegati: il più grande fra il valore
//      scritto e quanti allegati ha la segnalazione. Una ripresa che trova
//      l'allegato già caricato non conta due volte, e una caduta fra 1 e 2 si
//      recupera alla ripresa. Nel caso normale è il +1 della specifica;
//   3. la riga in SegnalazioniInterventi, PER ULTIMA: è la guardia sui doppioni.
// L'idPasso sta in Testo: niente colonna nuova negli interventi, quindi le
// funzioni non dipendono da uno script di colonne. Nella storia esce come
// `idPasso`, e il testo di una riga `foto` resta vuoto.
async function riceviFoto(d, archivio, registra) {
  const f = d.foto[0];
  const nome = `${f.nome}.jpg`;
  let seg;
  try {
    if (await archivio.cercaIntervento(d.idClient)) return risposta(200, { esito: 'gia_presente', idClient: d.idClient });
    seg = await archivio.cercaSegnalazione(d.idSegnalazione);
  } catch (e) {
    registra('lettura', e);
    return risposta(500, { esito: 'errore_lettura' });
  }
  if (!seg) return risposta(409, { esito: 'segnalazione_sconosciuta' });
  const id = seg.ID;

  let allegati;
  try {
    const presenti = new Set(await archivio.fotoPresenti(id));
    if (!presenti.has(nome)) {
      await archivio.aggiungiFoto(id, nome, Buffer.from(f.contenutoBase64, 'base64'));
      presenti.add(nome);
    }
    allegati = presenti.size;
  } catch (e) {
    registra('scrittura_foto', e);
    return risposta(500, { esito: 'errore_scrittura_foto' });
  }

  const numero = Math.max(Number(seg.NumeroFoto) || 0, allegati);
  if (numero !== (Number(seg.NumeroFoto) || 0)) {
    try {
      await archivio.aggiornaSegnalazione(id, { NumeroFoto: numero });
    } catch (e) {
      registra('scrittura_segnalazione', e);
      return risposta(500, { esito: 'errore_scrittura_segnalazione' });
    }
  }

  try {
    await archivio.creaIntervento({
      Title: AZIONE_FOTO,
      IdSegnalazione: d.idSegnalazione,
      RigaSegnalazione: id,
      IdClient: d.idClient,
      Azione: AZIONE_FOTO,
      Operatore: testo(d.operatore, 255),
      PassaA: '',
      Testo: String(d.idPasso),
      DataIntervento: cifre14(d.dataIntervento),
      NumeroFoto: 1,
      IdDispositivo: testo(d.idDispositivo, 255),
      VersioneApp: testo(d.versioneApp, 255),
    });
  } catch (e) {
    registra('scrittura_intervento', e);
    return risposta(500, { esito: 'errore_scrittura_intervento' });
  }
  return risposta(200, { esito: 'ok', idSegnalazione: d.idSegnalazione, id, azione: AZIONE_FOTO, numeroFoto: numero });
}

// --- Elenco: le segnalazioni, o la storia di una ----------------------------

export function perApp(s) {
  return {
    id: s.ID,
    idSegnalazione: s.IdSegnalazione || '',
    commessa: s.Commessa || '',
    ambito: s.Ambito || '',
    piano: s.Piano || '',
    unita: s.Unita || '',
    parteComune: s.ParteComune || '',
    testo: s.Testo || '',
    apertaDa: s.ApertaDa || '',
    apertaIl: s.ApertaIl || '',
    stato: s.Stato || '',
    toccaA: s.ToccaA || '',
    ultimoIntervento: s.UltimoIntervento || '',
    ultimoOperatore: s.UltimoOperatore || '',
    ultimaNota: s.UltimaNota || '',
    chiusaDa: s.ChiusaDa || '',
    chiusaIl: s.ChiusaIl || '',
    numeroFoto: Number(s.NumeroFoto) || 0,
  };
}

export async function leggi(d, archivio, { token, ora = new Date(), registra = () => {} }) {
  if (!d || !tokenValido(token, d.token)) return risposta(401, { esito: 'token_non_valido' });
  try {
    if (d.idSegnalazione) {
      if (!ID_VALIDO.test(String(d.idSegnalazione))) return risposta(400, { esito: 'payload_incompleto', campo: 'idSegnalazione' });
      const interventi = await archivio.storia(d.idSegnalazione);
      return risposta(200, {
        esito: 'ok',
        modalita: 'storia',
        idSegnalazione: d.idSegnalazione,
        // Dalla 0.44.0 anche `idClient` e `idPasso`: la scheda raccoglie le
        // righe `foto` nel passo a cui appartengono. Il testo di una riga
        // `foto` è l'idPasso: esce vuoto, perché i telefoni ancora alla 0.43.x
        // mostrano il testo così com'è.
        interventi: interventi.map(i => {
          const eFoto = i.Azione === AZIONE_FOTO;
          return {
            azione: i.Azione || '', operatore: i.Operatore || '', passaA: i.PassaA || '',
            testo: eFoto ? '' : (i.Testo || ''),
            data: i.DataIntervento || '', numeroFoto: Number(i.NumeroFoto) || 0,
            idClient: i.IdClient || '', idPasso: eFoto ? (i.Testo || '') : '',
          };
        }),
      });
    }
    const dal = new Date(ora.getTime() - GIORNI_CHIUSE * 86400000);
    const segnalazioni = await archivio.elenco(dal);
    return risposta(200, { esito: 'ok', modalita: 'elenco', segnalazioni: segnalazioni.map(perApp) });
  } catch (e) {
    registra('lettura_elenco', e);
    return risposta(500, { esito: 'errore_lettura_elenco' });
  }
}
