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

test('apertura: solo i cinque; riapertura: solo Francesco e Paolo → 403', async () => {
  const a = creaMemoria();
  assert.equal((await manda(a, { operatore: 'Florin Zaharia' })).stato, 403);
  assert.equal((await manda(a, { operatore: 'Francesco Lando' })).stato, 403, 'Francesco riapre ma non apre');
  for (const nome of ['Andrea Gondos', 'Domenico Caminiti', 'Enzo Santovito', 'Paolo Sanzarello', 'Rosario Incarbone']) {
    assert.equal((await manda(a, { operatore: nome, idSegnalazione: `seg-${nome.replace(/\W/g, '')}` })).stato, 200, nome);
  }
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

  r = await manda(a, { idSegnalazione: s, azione: 'passaggio', operatore: 'Rosario Incarbone', passaA: 'Enzo Santovito',
    foto: [{ nome: 'x1', contenutoBase64: JPEG }, { nome: 'x2', contenutoBase64: JPEG }, { nome: 'x3', contenutoBase64: JPEG }] });
  assert.deepEqual([r.stato, r.corpo.esito], [409, 'troppe_foto'], '1 + 3 > 3');

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
  assert.deepEqual(a.interventi.map(i => i.Azione), ['apertura', 'passaggio', 'chiusura', 'riapertura']);
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

test('cifre14', () => {
  assert.equal(cifre14('2026-11-20T08:05:09+01:00'), '20261120080509');
});
