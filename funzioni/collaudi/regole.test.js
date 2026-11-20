// Collaudi del lato server: le regole delle Segnalazioni su un archivio in
// memoria. Si lanciano con `node --test funzioni/collaudi/` (nessuna
// dipendenza). Sono le prove della sezione D del vecchio testo dei flow, più i
// guasti a metà che il revisore aveva trovato il 20/11/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riceviPasso, leggi, payloadIncompleto, cifre14, tokenValido } from '../src/regole.js';
import { creaMemoria } from '../src/memoria.js';

const TOKEN = 'token-di-prova-lungo-abbastanza';
const JPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]).toString('base64');
let contatore = 0;
const id = () => `id-${String(++contatore).padStart(8, '0')}`;

function passo(campi = {}) {
  return {
    token: TOKEN, azione: 'apertura', idClient: id(), idSegnalazione: 'seg-00000001',
    operatore: 'Paolo Sanzarello', passaA: '', testo: 'perde il sifone', commessa: 'MNG',
    ambito: 'Alloggio', piano: 'P7', unita: '7B', parteComune: '', dataIntervento: '2026-11-20T15:11:17+01:00',
    idDispositivo: 'dispositivo-1', versioneApp: '0.43.0', foto: [], ...campi,
  };
}
const manda = (archivio, campi) => riceviPasso(passo(campi), archivio, { token: TOKEN });

test('token: sbagliato, assente o troppo corto in configurazione → 401, niente scritto', async () => {
  const a = creaMemoria();
  assert.equal((await manda(a, { token: 'altro' })).stato, 401);
  assert.equal((await riceviPasso(passo(), a, { token: '' })).stato, 401, 'un token vuoto in configurazione non apre a nessuno');
  assert.equal((await riceviPasso(null, a, { token: TOKEN })).stato, 401);
  assert.equal(a.segnalazioni.size, 0);
  assert.equal(tokenValido('corto', 'corto'), false);
});

test('dati che mancano o non validi → 400 payload_incompleto', async () => {
  const a = creaMemoria();
  for (const [campi, campo] of [
    [{ idClient: 'corto' }, 'idClient'],
    [{ idClient: "x'or'1'='1aaaa" }, 'idClient'],
    [{ idSegnalazione: '' }, 'idSegnalazione'],
    [{ dataIntervento: '20/11/2026' }, 'dataIntervento'],
    [{ operatore: '' }, 'operatore'],
    [{ azione: 'cancella' }, 'azione'],
    [{ commessa: '' }, 'commessa'],
    [{ azione: 'passaggio', passaA: '' }, 'passaA'],
    [{ foto: [{ nome: 'a', contenutoBase64: JPEG }, { nome: 'b', contenutoBase64: JPEG }, { nome: 'c', contenutoBase64: JPEG }, { nome: 'd', contenutoBase64: JPEG }] }, 'foto'],
    [{ foto: [{ nome: 'a', contenutoBase64: '' }] }, 'foto'],
    [{ foto: [{ nome: 'a/../b', contenutoBase64: JPEG }] }, 'foto'],
    [{ foto: [{ nome: 'a', contenutoBase64: JPEG }, { nome: 'a', contenutoBase64: JPEG }] }, 'foto'],
  ]) {
    const r = await manda(a, campi);
    assert.equal(r.stato, 400, JSON.stringify(campi));
    assert.equal(r.corpo.campo, campo, JSON.stringify(campi));
  }
  assert.equal(a.segnalazioni.size, 0);
  assert.equal(payloadIncompleto(passo()), '');
});

test('apertura: solo gli otto; riapertura: solo Francesco e Paolo → 403', async () => {
  const a = creaMemoria();
  for (const nome of ['Maurizio Lando', 'Giovanni Lippolis', 'Alessio Ferrara', 'Emanuele Zaccaro', 'Riccardo Zaccaro',
    'francesco lando', 'Francesco Lando ', 'Florin', 'Roberto Borinschi ']) {
    assert.equal((await manda(a, { operatore: nome, idSegnalazione: `seg-${nome.replace(/\W/g, '')}x` })).stato, 403, nome);
  }
  assert.equal(a.segnalazioni.size, 0);
  // Correzione di Francesco del 20/11/2026 (0.43.1): «No le segnalazioni devo
  // poterle aprire anche io», «Aggiungi anche Florin e Roberto Borinschi a
  // quelli che possono aprire segnalazioni». Fino alla 0.43.0 qui c'era un 403.
  for (const nome of ['Francesco Lando', 'Florin Zaharia', 'Roberto Borinschi']) {
    const s = `seg-${nome.replace(/\W/g, '')}`;
    const r = await manda(a, { operatore: nome, idSegnalazione: s });
    assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], `${nome} apre`);
    const sua = [...a.segnalazioni.values()].find(x => x.IdSegnalazione === s);
    assert.deepEqual([sua.ApertaDa, sua.ToccaA], [nome, nome], `${nome}: senza passaA la tiene lui`);
  }
  for (const nome of ['Andrea Gondos', 'Domenico Caminiti', 'Enzo Santovito', 'Paolo Sanzarello', 'Rosario Incarbone']) {
    assert.equal((await manda(a, { operatore: nome, idSegnalazione: `seg-${nome.replace(/\W/g, '')}` })).stato, 200, nome);
  }
  // Chi riapre non cambia: Francesco e Paolo.
  await manda(a, { operatore: 'Francesco Lando', idSegnalazione: 'seg-FrancescoLando', azione: 'chiusura' });
  for (const nome of ['Rosario Incarbone', 'Domenico Caminiti', 'Enzo Santovito', 'Andrea Gondos', 'Florin Zaharia', 'Roberto Borinschi']) {
    assert.equal((await manda(a, { operatore: nome, idSegnalazione: 'seg-FrancescoLando', azione: 'riapertura' })).stato, 403, nome);
  }
  assert.equal((await manda(a, { operatore: 'Francesco Lando', idSegnalazione: 'seg-FrancescoLando', azione: 'riapertura' })).stato, 200);
});

test('il giro intero: apre con foto, passa, chiude, non si passa una chiusa, riapre', async () => {
  const a = creaMemoria();
  const s = 'seg-giro-0001';
  let r = await manda(a, { idSegnalazione: s, passaA: 'Enzo Santovito', foto: [{ nome: 'abcdefgh-1', contenutoBase64: JPEG }] });
  assert.deepEqual([r.stato, r.corpo.esito, r.corpo.id], [200, 'ok', 1]);
  const riga = a.segnalazioni.get(1);
  assert.equal(riga.ToccaA, 'Enzo Santovito');
  assert.equal(riga.ApertaIl, '20261120151117', 'data in 14 cifre, senza fuso');
  assert.equal(riga.StatoCodifica, 'Nuova');
  assert.equal(riga.NumeroFoto, 1);
  assert.deepEqual([...a.allegati.get(1).keys()], ['abcdefgh-1.jpg']);

  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', operatore: 'Enzo Santovito', passaA: 'Rosario Incarbone' });
  assert.equal(r.stato, 200);
  assert.equal(a.segnalazioni.get(1).ToccaA, 'Rosario Incarbone');

  // Dalla 0.44.0 non c'è più «troppe foto»: un passo di un telefono 0.43.x con 3
  // foto su una segnalazione che ne ha già una passa (fino alla 0.43.1 era 409).
  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', operatore: 'Rosario Incarbone', passaA: 'Enzo Santovito',
    foto: [{ nome: 'x1', contenutoBase64: JPEG }, { nome: 'x2', contenutoBase64: JPEG }, { nome: 'x3', contenutoBase64: JPEG }] });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], '1 + 3 foto: niente più limite per segnalazione');
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 4);
  assert.equal(a.segnalazioni.get(1).ToccaA, 'Enzo Santovito');

  r = await manda(a, { idSegnalazione: s, azione: 'chiusura', operatore: 'Rosario Incarbone', testo: 'Sifone sostituito' });
  assert.equal(r.stato, 200);
  const chiusa = a.segnalazioni.get(1);
  assert.deepEqual([chiusa.Stato, chiusa.ToccaA, chiusa.ChiusaDa], ['Chiusa', null, 'Rosario Incarbone']);

  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', operatore: 'Enzo Santovito', passaA: 'Paolo Sanzarello' });
  assert.deepEqual([r.stato, r.corpo.esito], [409, 'gia_chiusa']);
  r = await manda(a, { idSegnalazione: s, azione: 'riapertura', operatore: 'Rosario Incarbone' });
  assert.equal(r.stato, 403);
  r = await manda(a, { idSegnalazione: s, azione: 'riapertura', operatore: 'Paolo Sanzarello', passaA: 'Rosario Incarbone', testo: 'perde ancora' });
  assert.equal(r.stato, 200);
  assert.deepEqual([a.segnalazioni.get(1).Stato, a.segnalazioni.get(1).ToccaA, a.segnalazioni.get(1).ChiusaDa], ['Aperta', 'Rosario Incarbone', null]);
  r = await manda(a, { idSegnalazione: s, azione: 'riapertura', operatore: 'Paolo Sanzarello' });
  assert.deepEqual([r.stato, r.corpo.esito], [409, 'gia_aperta']);
  assert.deepEqual(a.interventi.map(i => i.Azione), ['apertura', 'passaggio', 'passaggio', 'chiusura', 'riapertura']);
});

test('lo stesso invio due volte → gia_presente, niente di nuovo', async () => {
  const a = creaMemoria();
  const p = passo({ idSegnalazione: 'seg-doppio-01' });
  assert.equal((await riceviPasso(p, a, { token: TOKEN })).corpo.esito, 'ok');
  const r = await riceviPasso(p, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'gia_presente']);
  assert.equal(a.interventi.length, 1);
  assert.equal(a.segnalazioni.size, 1);
});

test('passaggio su una segnalazione non ancora arrivata → 409 sconosciuta, si riprova', async () => {
  const a = creaMemoria();
  const r = await manda(a, { idSegnalazione: 'seg-mai-vista', azione: 'passaggio', passaA: 'Enzo Santovito' });
  assert.deepEqual([r.stato, r.corpo.esito], [409, 'segnalazione_sconosciuta']);
});

test('guasti a metà: l\'invio ripreso va a buon fine, senza conflitti e senza doppioni', async () => {
  const a = creaMemoria();
  const s = 'seg-guasto-01';
  await manda(a, { idSegnalazione: s, foto: [{ nome: 'f1', contenutoBase64: JPEG }] });

  // Chiusura: la segnalazione si aggiorna, poi cade la scrittura dell'intervento.
  const chiusura = passo({ idSegnalazione: s, azione: 'chiusura', operatore: 'Paolo Sanzarello' });
  a.stato.guasto = 'creaIntervento';
  let r = await riceviPasso(chiusura, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [500, 'errore_scrittura_intervento']);
  assert.equal(a.segnalazioni.get(1).Stato, 'Chiusa', 'la segnalazione era già cambiata');
  r = await riceviPasso(chiusura, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], 'ripresa: non «già chiusa»');
  assert.equal(a.interventi.filter(i => i.Azione === 'chiusura').length, 1);

  // Riapertura con 2 foto: cade la seconda foto; ripresa senza contarle due volte.
  const riapertura = passo({ idSegnalazione: s, azione: 'riapertura', operatore: 'Paolo Sanzarello',
    foto: [{ nome: 'r1', contenutoBase64: JPEG }, { nome: 'r2', contenutoBase64: JPEG }] });
  const originale = a.aggiungiFoto;
  let chiamate = 0;
  a.aggiungiFoto = async (...arg) => { chiamate += 1; if (chiamate === 2) throw new Error('rete'); return originale(...arg); };
  r = await riceviPasso(riapertura, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [500, 'errore_scrittura_foto']);
  a.aggiungiFoto = originale;
  r = await riceviPasso(riapertura, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], 'ripresa: non «troppe foto» né «già aperta»');
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 3, '1 + 2, contate una volta');
  assert.deepEqual([...a.allegati.get(1).keys()].sort(), ['f1.jpg', 'r1.jpg', 'r2.jpg'], 'r1 non ricaricata');

  // Apertura: cade la creazione dell'intervento; la ripresa non crea una seconda segnalazione.
  const apertura = passo({ idSegnalazione: 'seg-guasto-02', foto: [{ nome: 'a1', contenutoBase64: JPEG }] });
  a.stato.guasto = 'creaIntervento';
  assert.equal((await riceviPasso(apertura, a, { token: TOKEN })).stato, 500);
  assert.equal((await riceviPasso(apertura, a, { token: TOKEN })).stato, 200);
  assert.equal([...a.segnalazioni.values()].filter(x => x.IdSegnalazione === 'seg-guasto-02').length, 1);
  assert.equal([...a.segnalazioni.values()].find(x => x.IdSegnalazione === 'seg-guasto-02').NumeroFoto, 1);

  a.stato.guasto = 'cercaIntervento';
  assert.deepEqual((await manda(a, {})).corpo, { esito: 'errore_lettura' });
});

test('elenco: le aperte e le chiuse da meno di 30 giorni, coi campi per l\'app; storia in ordine', async () => {
  const a = creaMemoria();
  await manda(a, { idSegnalazione: 'seg-el-0001', testo: 'virgolette "e" a capo\nseconda riga' });
  await manda(a, { idSegnalazione: 'seg-el-0002' });
  await manda(a, { idSegnalazione: 'seg-el-0002', azione: 'chiusura' });
  await manda(a, { idSegnalazione: 'seg-el-0003' });
  await manda(a, { idSegnalazione: 'seg-el-0003', azione: 'chiusura' });
  a.segnalazioni.get(3).Modified = new Date(Date.now() - 40 * 86400000);

  let r = await leggi({ token: TOKEN, operatore: 'Paolo Sanzarello' }, a, { token: TOKEN });
  assert.equal(r.stato, 200);
  assert.deepEqual(r.corpo.segnalazioni.map(s => s.idSegnalazione), ['seg-el-0002', 'seg-el-0001']);
  assert.deepEqual(Object.keys(r.corpo.segnalazioni[0]).sort(), [
    'ambito', 'apertaDa', 'apertaIl', 'chiusaDa', 'chiusaIl', 'commessa', 'id', 'idSegnalazione', 'numeroFoto',
    'parteComune', 'piano', 'stato', 'testo', 'toccaA', 'ultimaNota', 'ultimoIntervento', 'ultimoOperatore', 'unita',
  ]);
  assert.equal(r.corpo.segnalazioni[1].testo, 'virgolette "e" a capo\nseconda riga');
  assert.equal(r.corpo.segnalazioni[0].toccaA, '', 'una chiusa non tocca a nessuno, e non vale null');
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(r.corpo)));

  r = await leggi({ token: TOKEN, idSegnalazione: 'seg-el-0002' }, a, { token: TOKEN });
  assert.deepEqual(r.corpo.interventi.map(i => i.azione), ['apertura', 'chiusura']);
  assert.equal(r.corpo.interventi[0].data, '20261120151117');
  assert.equal((await leggi({ token: 'no' }, a, { token: TOKEN })).stato, 401);
  assert.equal((await leggi({ token: TOKEN, idSegnalazione: "x' or 1 eq 1" }, a, { token: TOKEN })).stato, 400);
});

// --- Foto singole (0.44.0) -----------------------------------------------------
// Una foto: azione `foto`, operatore e data del passo, idPasso, una foto sola.
function fotoDi(passoBase, campi = {}) {
  // Come l'app: un idClient a forma di UUID, che è anche il nome dell'allegato.
  const idClient = crypto.randomUUID();
  return {
    token: TOKEN, azione: 'foto', idClient, idSegnalazione: passoBase.idSegnalazione, idPasso: passoBase.idClient,
    operatore: passoBase.operatore, dataIntervento: passoBase.dataIntervento,
    idDispositivo: 'dispositivo-1', versioneApp: '0.44.0',
    foto: [{ nome: idClient, contenutoBase64: JPEG }], ...campi,
  };
}

test('foto: una richiesta, una foto — allegato, NumeroFoto + 1, riga foto; la segnalazione non cambia altro', async () => {
  const a = creaMemoria();
  const apertura = passo({ idSegnalazione: 'seg-foto-0001', passaA: 'Enzo Santovito', testo: 'perde', dataIntervento: '2026-11-21T09:10:11+01:00' });
  assert.equal((await riceviPasso(apertura, a, { token: TOKEN })).corpo.esito, 'ok');
  const prima = { ...a.segnalazioni.get(1) };
  const f = fotoDi(apertura, { dataIntervento: apertura.dataIntervento });
  const r = await riceviPasso(f, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito, r.corpo.azione, r.corpo.numeroFoto], [200, 'ok', 'foto', 1]);
  const dopo = a.segnalazioni.get(1);
  assert.equal(dopo.NumeroFoto, 1);
  for (const campo of ['Stato', 'ToccaA', 'UltimaNota', 'UltimoOperatore', 'IdClient', 'UltimoIntervento']) {
    assert.equal(dopo[campo], prima[campo], `${campo} non cambia`);
  }
  assert.deepEqual([...a.allegati.get(1).keys()], [`${f.idClient}.jpg`], 'col nome che manda l\'app');
  const riga = a.interventi.at(-1);
  assert.deepEqual(
    [riga.Azione, riga.Operatore, riga.DataIntervento, riga.IdClient, riga.NumeroFoto, riga.Testo, riga.RigaSegnalazione],
    ['foto', 'Paolo Sanzarello', '20261121091011', f.idClient, 1, apertura.idClient, 1],
  );
});

test('foto: chiunque abbia il codice, anche su una chiusa; doppione → gia_presente', async () => {
  const a = creaMemoria();
  const apertura = passo({ idSegnalazione: 'seg-foto-0002' });
  await riceviPasso(apertura, a, { token: TOKEN });
  const chiusura = passo({ idSegnalazione: 'seg-foto-0002', azione: 'chiusura', operatore: 'Giovanni Lippolis' });
  assert.equal((await riceviPasso(chiusura, a, { token: TOKEN })).stato, 200);
  const f = fotoDi(chiusura);
  let r = await riceviPasso(f, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], 'foto di una chiusura, dopo la chiusura, da uno che non apre');
  assert.equal(a.segnalazioni.get(1).Stato, 'Chiusa');
  r = await riceviPasso(f, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'gia_presente']);
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 1, 'il doppione non conta');
  assert.equal(a.allegati.get(1).size, 1);
  assert.equal(a.interventi.filter(i => i.Azione === 'foto').length, 1);
});

test('foto: segnalazione che non c\'è → 409 sconosciuta; zero, due foto o senza idPasso → 400', async () => {
  const a = creaMemoria();
  const base = passo({ idSegnalazione: 'seg-foto-mai' });
  let r = await riceviPasso(fotoDi(base), a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [409, 'segnalazione_sconosciuta']);
  assert.equal(a.interventi.length, 0);
  for (const [campi, campo] of [
    [{ foto: [] }, 'foto'],
    [{ foto: [{ nome: 'f1', contenutoBase64: JPEG }, { nome: 'f2', contenutoBase64: JPEG }] }, 'foto'],
    [{ foto: undefined }, 'foto'],
    [{ idPasso: '' }, 'idPasso'],
    [{ idPasso: "x' or 1 eq 1" }, 'idPasso'],
  ]) {
    r = await riceviPasso(fotoDi(base, campi), a, { token: TOKEN });
    assert.deepEqual([r.stato, r.corpo.campo], [400, campo], JSON.stringify(Object.keys(campi)));
  }
  assert.equal((await riceviPasso(fotoDi(base, { token: 'altro' }), a, { token: TOKEN })).stato, 401);
});

test('foto: ripresa dopo un guasto a metà — niente secondo allegato e niente doppio conteggio', async () => {
  const a = creaMemoria();
  const apertura = passo({ idSegnalazione: 'seg-foto-0003' });
  await riceviPasso(apertura, a, { token: TOKEN });
  // Allegato caricato, intervento non scritto.
  const f = fotoDi(apertura);
  a.stato.guasto = 'creaIntervento';
  let r = await riceviPasso(f, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [500, 'errore_scrittura_intervento']);
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 1);
  r = await riceviPasso(f, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok']);
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 1, 'contata una volta');
  assert.equal(a.allegati.get(1).size, 1, 'un allegato solo');
  // Allegato caricato, NumeroFoto non aggiornato.
  const g = fotoDi(apertura);
  a.stato.guasto = 'aggiornaSegnalazione';
  r = await riceviPasso(g, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [500, 'errore_scrittura_segnalazione']);
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 1);
  r = await riceviPasso(g, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito, r.corpo.numeroFoto], [200, 'ok', 2], 'la ripresa recupera il conteggio');
  assert.equal(a.allegati.get(1).size, 2);
  // Allegato non caricato: la ripresa lo carica.
  const h = fotoDi(apertura);
  a.stato.guasto = 'aggiungiFoto';
  r = await riceviPasso(h, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [500, 'errore_scrittura_foto']);
  r = await riceviPasso(h, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.numeroFoto], [200, 3]);
  assert.equal(a.interventi.filter(i => i.Azione === 'foto').length, 3);
});

test('foto: un allegato aggiunto a mano dalla lista non entra in NumeroFoto', async () => {
  const a = creaMemoria();
  const apertura = passo({ idSegnalazione: 'seg-foto-mano' });
  await riceviPasso(apertura, a, { token: TOKEN });
  await a.aggiungiFoto(1, 'IMG_1234.jpg', Buffer.from([1]));
  await a.aggiungiFoto(1, 'verbale.pdf', Buffer.from([2]));
  const r = await riceviPasso(fotoDi(apertura), a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.numeroFoto], [200, 1], 'una foto dell\'app, non tre allegati');
  assert.equal(a.segnalazioni.get(1).NumeroFoto, 1);
  assert.equal(a.allegati.get(1).size, 3, 'gli allegati a mano restano dove sono');
});

test('foto: una foto non sporca la ripresa di un passo (IdClient della segnalazione intatto)', async () => {
  const a = creaMemoria();
  const apertura = passo({ idSegnalazione: 'seg-foto-0004' });
  await riceviPasso(apertura, a, { token: TOKEN });
  const chiusura = passo({ idSegnalazione: 'seg-foto-0004', azione: 'chiusura' });
  a.stato.guasto = 'creaIntervento';
  assert.equal((await riceviPasso(chiusura, a, { token: TOKEN })).stato, 500);
  // Nel frattempo arriva la foto di quella chiusura.
  assert.equal((await riceviPasso(fotoDi(chiusura), a, { token: TOKEN })).stato, 200);
  const r = await riceviPasso(chiusura, a, { token: TOKEN });
  assert.deepEqual([r.stato, r.corpo.esito], [200, 'ok'], 'non «già chiusa»');
});

test('foto: un giro con 12 foto su una segnalazione, in tre passi', async () => {
  const a = creaMemoria();
  const s = 'seg-foto-dodici';
  const passi = [
    passo({ idSegnalazione: s, passaA: 'Enzo Santovito' }),
    passo({ idSegnalazione: s, azione: 'passaggio', operatore: 'Enzo Santovito', passaA: 'Rosario Incarbone' }),
    passo({ idSegnalazione: s, azione: 'chiusura', operatore: 'Rosario Incarbone' }),
  ];
  const quante = [5, 4, 3];
  for (let i = 0; i < passi.length; i += 1) {
    assert.equal((await riceviPasso(passi[i], a, { token: TOKEN })).corpo.esito, 'ok');
    for (let n = 0; n < quante[i]; n += 1) {
      const r = await riceviPasso(fotoDi(passi[i]), a, { token: TOKEN });
      assert.equal(r.corpo.esito, 'ok');
    }
  }
  const seg = a.segnalazioni.get(1);
  assert.equal(seg.NumeroFoto, 12);
  assert.equal(a.allegati.get(1).size, 12);
  assert.equal(seg.Stato, 'Chiusa');
  const righe = a.interventi.filter(i => i.Azione === 'foto');
  assert.equal(righe.length, 12);
  assert.deepEqual(quante, passi.map(p => righe.filter(i => i.Testo === p.idClient).length), 'ogni foto col suo passo');
  // La storia: le foto escono con idPasso e senza testo; i passi con idClient.
  const storia = (await leggi({ token: TOKEN, idSegnalazione: s }, a, { token: TOKEN })).corpo.interventi;
  assert.equal(storia.length, 15);
  const fotoStoria = storia.filter(i => i.azione === 'foto');
  assert.ok(fotoStoria.every(i => i.testo === '' && i.idPasso && i.numeroFoto === 1));
  assert.deepEqual(storia.filter(i => i.azione !== 'foto').map(i => i.idClient), passi.map(p => p.idClient));
  assert.ok(storia.filter(i => i.azione !== 'foto').every(i => i.idPasso === ''));
});

test('passi dei telefoni 0.43.x: fino a 3 foto accettate, 4 rifiutate; le foto non entrano nel limite', async () => {
  const a = creaMemoria();
  const s = 'seg-vecchia-01';
  const tre = [1, 2, 3].map(n => ({ nome: `abcdefgh-${n}`, contenutoBase64: JPEG }));
  let r = await manda(a, { idSegnalazione: s, versioneApp: '0.43.1', foto: tre });
  assert.deepEqual([r.stato, a.segnalazioni.get(1).NumeroFoto], [200, 3]);
  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', passaA: 'Enzo Santovito', versioneApp: '0.43.1',
    foto: [1, 2, 3, 4].map(n => ({ nome: `ijklmnop-${n}`, contenutoBase64: JPEG })) });
  assert.deepEqual([r.stato, r.corpo.campo], [400, 'foto']);
  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', passaA: 'Enzo Santovito', versioneApp: '0.43.1',
    foto: [1, 2, 3].map(n => ({ nome: `ijklmnop-${n}`, contenutoBase64: JPEG })) });
  assert.deepEqual([r.stato, a.segnalazioni.get(1).NumeroFoto], [200, 6], '3 + 3: oltre il vecchio limite di 3');
});

test('cifre14', () => {
  assert.equal(cifre14('2026-11-20T08:05:09+01:00'), '20261120080509');
});
