// Le due funzioni del modulo Segnalazioni su Azure Functions (modello v4 per
// Node.js). Qui c'è solo il collegamento: leggere la richiesta, chiamare le
// regole (src/regole.js) con l'archivio SharePoint, rispondere. Le regole non
// stanno qui perché devono girare uguali nei collaudi.
//
//   POST /api/segnalazioni          apertura, passaggio, chiusura, riapertura
//   POST /api/segnalazioni-elenco   elenco, o storia di una segnalazione
//
// Due serrature, come per i flow: la chiave della funzione nell'indirizzo
// (`?code=`, authLevel 'function') e il codice di accesso nel corpo
// (`token`), che sta nelle impostazioni dell'app come TOKEN_SEGNALAZIONI.
// Il CORS lo fa la piattaforma (lo imposta lo script iniziale).
import { app } from '@azure/functions';
import { riceviPasso, leggi } from './regole.js';
import { creaArchivioSharePoint } from './sharepoint.js';

let archivio = null;
const archivioVero = () => {
  if (!archivio) archivio = creaArchivioSharePoint();
  return archivio;
};

async function corpoJson(richiesta) {
  try {
    return await richiesta.json();
  } catch {
    return null;
  }
}

app.http('segnalazioni', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'segnalazioni',
  handler: async (richiesta, contesto) => {
    const dati = await corpoJson(richiesta);
    const esito = await riceviPasso(dati, archivioVero(), { token: process.env.TOKEN_SEGNALAZIONI });
    if (esito.stato >= 500) contesto.error(`segnalazioni: ${esito.corpo.esito}`);
    return { status: esito.stato, jsonBody: esito.corpo };
  },
});

app.http('segnalazioni-elenco', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'segnalazioni-elenco',
  handler: async (richiesta, contesto) => {
    const dati = await corpoJson(richiesta);
    const esito = await leggi(dati, archivioVero(), { token: process.env.TOKEN_SEGNALAZIONI });
    if (esito.stato >= 500) contesto.error(`segnalazioni-elenco: ${esito.corpo.esito}`);
    return { status: esito.stato, jsonBody: esito.corpo };
  },
});
