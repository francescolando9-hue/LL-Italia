// Collaudi dell'archivio SharePoint senza SharePoint: si sostituisce `fetch`
// e si guarda COSA lo script chiederebbe — indirizzi, filtri, intestazioni,
// corpi. Non prova che SharePoint risponda come previsto (quello si prova sul
// tenant dopo lo script iniziale); prova che le richieste siano quelle giuste.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { creaArchivioSharePoint } from '../src/sharepoint.js';

const SITO = 'https://esempio.sharepoint.com/sites/Prova';
let richieste = [];
let risposte = [];

beforeEach(() => {
  richieste = [];
  risposte = [];
  process.env.IDENTITY_ENDPOINT = 'http://identita.locale/token';
  process.env.IDENTITY_HEADER = 'segreto-della-piattaforma';
  globalThis.fetch = async (indirizzo, opzioni = {}) => {
    richieste.push({ indirizzo: String(indirizzo), ...opzioni });
    if (String(indirizzo).startsWith('http://identita.locale')) {
      return new Response(JSON.stringify({ access_token: 'TOKEN-SP', expires_on: String(Math.floor(Date.now() / 1000) + 3600) }));
    }
    const prossima = risposte.shift() || { value: [] };
    return new Response(prossima === '' ? '' : JSON.stringify(prossima), { status: prossima.__stato || 200 });
  };
});

const archivio = () => creaArchivioSharePoint({ SITO_URL: `${SITO}/` });

test('il token si chiede per il sito, con l\'intestazione della piattaforma, e si riusa', async () => {
  const a = archivio();
  await a.cercaIntervento('abcdefgh-1');
  await a.cercaSegnalazione('abcdefgh-2');
  const token = richieste.filter(r => r.indirizzo.startsWith('http://identita.locale'));
  // Il token sta in una cache del modulo: può essere stato chiesto da un test precedente.
  assert.ok(token.length <= 1);
  if (token.length === 1) {
    assert.match(token[0].indirizzo, /resource=https%3A%2F%2Fesempio\.sharepoint\.com&api-version=2019-08-01/);
    assert.equal(token[0].headers['X-IDENTITY-HEADER'], 'segreto-della-piattaforma');
  }
  const sp = richieste.filter(r => r.indirizzo.startsWith(SITO));
  assert.equal(sp[0].headers.Authorization, 'Bearer TOKEN-SP');
  assert.equal(sp[0].headers.Accept, 'application/json;odata=nometadata');
});

test('le ricerche filtrano per IdClient e IdSegnalazione sulle liste giuste', async () => {
  const a = archivio();
  risposte.push({ value: [{ ID: 7 }] });
  assert.deepEqual(await a.cercaIntervento('abcdefgh-1'), { ID: 7 });
  risposte.push({ value: [] });
  assert.equal(await a.cercaSegnalazione('seg-00000001'), null);
  const [uno, due] = richieste.filter(r => r.indirizzo.startsWith(SITO));
  assert.match(uno.indirizzo, /lists\/getbytitle\('SegnalazioniInterventi'\)\/items\?\$select=ID&\$filter=IdClient eq 'abcdefgh-1'&\$top=1$/);
  assert.match(due.indirizzo, /lists\/getbytitle\('Segnalazioni'\)\/items\?\$select=.*IdSegnalazione.*&\$filter=IdSegnalazione eq 'seg-00000001'&\$top=1$/);
});

test('crea, aggiorna con MERGE, allegati in binario', async () => {
  const a = archivio();
  risposte.push({ ID: 42 });
  assert.equal(await a.creaSegnalazione({ Title: 't', Stato: 'Aperta' }), 42);
  risposte.push('');
  await a.aggiornaSegnalazione(42, { ToccaA: null });
  risposte.push({ value: [{ FileName: 'a-1.jpg' }] });
  assert.deepEqual(await a.fotoPresenti(42), ['a-1.jpg']);
  risposte.push({});
  await a.aggiungiFoto(42, 'a-2.jpg', Buffer.from([1, 2, 3]));
  const sp = richieste.filter(r => r.indirizzo.startsWith(SITO));
  assert.equal(sp[0].method, 'POST');
  assert.equal(sp[0].headers['Content-Type'], 'application/json;odata=nometadata');
  assert.deepEqual(JSON.parse(sp[0].body), { Title: 't', Stato: 'Aperta' });
  assert.match(sp[1].indirizzo, /items\(42\)$/);
  assert.equal(sp[1].headers['X-HTTP-Method'], 'MERGE');
  assert.equal(sp[1].headers['IF-MATCH'], '*');
  assert.equal(sp[1].body, '{"ToccaA":null}', 'null vero, per svuotare la colonna');
  assert.match(sp[2].indirizzo, /items\(42\)\/AttachmentFiles$/);
  assert.match(sp[3].indirizzo, /items\(42\)\/AttachmentFiles\/add\(FileName='a-2\.jpg'\)$/);
  assert.ok(Buffer.isBuffer(sp[3].body));
  assert.equal(sp[3].headers['Content-Type'], undefined);
});

test('elenco: aperte o modificate da una data, a pagine; storia in ordine', async () => {
  const a = archivio();
  risposte.push({ value: [{ ID: 3 }], 'odata.nextLink': `${SITO}/_api/pagina2` });
  risposte.push({ value: [{ ID: 1 }] });
  const righe = await a.elenco(new Date('2026-10-21T10:00:00.123Z'));
  assert.deepEqual(righe.map(r => r.ID), [3, 1]);
  const sp = richieste.filter(r => r.indirizzo.startsWith(SITO));
  assert.match(sp[0].indirizzo, /\$filter=\(Stato eq 'Aperta'\) or \(Modified ge datetime'2026-10-21T10:00:00Z'\)&\$orderby=ID desc/);
  assert.equal(sp[1].indirizzo, `${SITO}/_api/pagina2`);
  risposte.push({ value: [] });
  await a.storia('seg-00000001');
  assert.match(richieste.at(-1).indirizzo, /SegnalazioniInterventi.*IdSegnalazione eq 'seg-00000001'&\$orderby=ID asc/);
});

test('un errore di SharePoint diventa un\'eccezione, che le regole trasformano in 500', async () => {
  const a = archivio();
  risposte.push({ __stato: 403 });
  await assert.rejects(() => a.cercaIntervento('abcdefgh-1'), /SharePoint GET 403/);
});

test('senza SITO_URL non parte', () => {
  assert.throws(() => creaArchivioSharePoint({}), /SITO_URL/);
});
