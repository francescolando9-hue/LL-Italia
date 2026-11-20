// L'archivio vero: le due liste del sito Cantieri LL, via REST di SharePoint.
//
// L'identità è quella della Function App (identità gestita dal sistema), a cui
// è concesso «write» SOLO sul sito Cantieri LL (Sites.Selected), come
// all'archiviatore delle foto. Nessun segreto nel codice né nelle impostazioni:
// il token lo dà la piattaforma, all'indirizzo che mette in IDENTITY_ENDPOINT.
//
// Si usa il REST di SharePoint e non Graph perché Graph non sa gestire gli
// allegati degli elementi di una lista, e le foto stanno lì.
//
// Impostazioni dell'app (le scrive lo script iniziale):
//   SITO_URL            https://<tenant>.sharepoint.com/sites/<sito>
//   LISTA_SEGNALAZIONI  Segnalazioni
//   LISTA_INTERVENTI    SegnalazioniInterventi

const CAMPI_SEGNALAZIONE = [
  'ID', 'IdSegnalazione', 'IdClient', 'Commessa', 'Ambito', 'Piano', 'Unita', 'ParteComune', 'Testo',
  'ApertaDa', 'ApertaIl', 'Stato', 'ToccaA', 'UltimoIntervento', 'UltimoOperatore', 'UltimaNota',
  'ChiusaDa', 'ChiusaIl', 'NumeroFoto', 'Modified',
];
const CAMPI_INTERVENTO = ['ID', 'IdSegnalazione', 'IdClient', 'Azione', 'Operatore', 'PassaA', 'Testo', 'DataIntervento', 'NumeroFoto'];

let tokenInCache = null;

async function tokenSharePoint(sito) {
  if (tokenInCache && tokenInCache.scade - Date.now() > 5 * 60 * 1000) return tokenInCache.valore;
  const risorsa = new URL(sito).origin;
  const indirizzo = `${process.env.IDENTITY_ENDPOINT}?resource=${encodeURIComponent(risorsa)}&api-version=2019-08-01`;
  const r = await fetch(indirizzo, { headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER } });
  if (!r.ok) throw new Error(`token: ${r.status}`);
  const dati = await r.json();
  tokenInCache = { valore: dati.access_token, scade: Number(dati.expires_on) * 1000 };
  return tokenInCache.valore;
}

export function creaArchivioSharePoint(env = process.env) {
  const sito = String(env.SITO_URL || '').replace(/\/+$/, '');
  if (!sito) throw new Error('SITO_URL non impostato');
  const listaS = env.LISTA_SEGNALAZIONI || 'Segnalazioni';
  const listaI = env.LISTA_INTERVENTI || 'SegnalazioniInterventi';
  const lista = nome => `${sito}/_api/web/lists/getbytitle('${encodeURIComponent(nome)}')`;

  async function chiama(indirizzo, { metodo = 'GET', corpo, intestazioni = {}, binario = false } = {}) {
    const token = await tokenSharePoint(sito);
    const r = await fetch(indirizzo, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json;odata=nometadata',
        ...(corpo !== undefined && !binario ? { 'Content-Type': 'application/json;odata=nometadata' } : {}),
        ...intestazioni,
      },
      body: corpo === undefined ? undefined : (binario ? corpo : JSON.stringify(corpo)),
    });
    if (!r.ok) throw new Error(`SharePoint ${metodo} ${r.status}`);
    const testo = await r.text();
    return testo ? JSON.parse(testo) : null;
  }

  async function tutte(indirizzo) {
    const righe = [];
    let prossimo = indirizzo;
    while (prossimo) {
      const pagina = await chiama(prossimo);
      righe.push(...(pagina.value || []));
      prossimo = pagina['odata.nextLink'] || null;
    }
    return righe;
  }

  // Gli identificativi arrivano già controllati da regole.js (lettere, cifre,
  // trattini): nel filtro non può entrare un apice.
  const filtro = (campo, valore) => `$filter=${campo} eq '${valore}'`;
  const scegli = campi => `$select=${campi.join(',')}`;

  return {
    async cercaIntervento(idClient) {
      const r = await chiama(`${lista(listaI)}/items?${scegli(['ID'])}&${filtro('IdClient', idClient)}&$top=1`);
      return (r.value || [])[0] || null;
    },
    async cercaSegnalazione(idSegnalazione) {
      const r = await chiama(`${lista(listaS)}/items?${scegli(CAMPI_SEGNALAZIONE)}&${filtro('IdSegnalazione', idSegnalazione)}&$top=1`);
      return (r.value || [])[0] || null;
    },
    async creaSegnalazione(campi) {
      const r = await chiama(`${lista(listaS)}/items`, { metodo: 'POST', corpo: campi });
      return r.ID || r.Id;
    },
    async aggiornaSegnalazione(id, campi) {
      await chiama(`${lista(listaS)}/items(${Number(id)})`, {
        metodo: 'POST', corpo: campi, intestazioni: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      });
    },
    async fotoPresenti(id) {
      const r = await chiama(`${lista(listaS)}/items(${Number(id)})/AttachmentFiles`);
      return (r.value || []).map(a => a.FileName);
    },
    async aggiungiFoto(id, nome, byte) {
      await chiama(`${lista(listaS)}/items(${Number(id)})/AttachmentFiles/add(FileName='${encodeURIComponent(nome)}')`, {
        metodo: 'POST', corpo: byte, binario: true,
      });
    },
    async creaIntervento(campi) {
      await chiama(`${lista(listaI)}/items`, { metodo: 'POST', corpo: campi });
    },
    async elenco(dal) {
      const quando = dal.toISOString().slice(0, 19) + 'Z';
      return tutte(`${lista(listaS)}/items?${scegli(CAMPI_SEGNALAZIONE)}`
        + `&$filter=(Stato eq 'Aperta') or (Modified ge datetime'${quando}')&$orderby=ID desc&$top=500`);
    },
    async storia(idSegnalazione) {
      return tutte(`${lista(listaI)}/items?${scegli(CAMPI_INTERVENTO)}&${filtro('IdSegnalazione', idSegnalazione)}&$orderby=ID asc&$top=500`);
    },
  };
}
