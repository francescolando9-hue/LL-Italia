// Impostazioni del modulo Bolle, persistite in localStorage del dispositivo.
// L'URL dell'endpoint contiene una firma di accesso: non sta MAI nel repo.
// Sul dispositivo si inserisce dalle Impostazioni; in sviluppo locale può
// arrivare da core/configurazione.js (file escluso da git).

// La normalizzazione dell'endpoint vive nella shell: la usano tutti i moduli
// che inviano a un flow, non solo questo.
import { API_VERSION, normalizzaEndpoint, endpointDaCorreggere } from '../../core/endpoint.js';

export { API_VERSION, normalizzaEndpoint, endpointDaCorreggere };

const CHIAVE = 'llitalia.bolle';

const PREDEFINITE = {
  endpoint: '',
  token: 'collaudo',
  mock: false,
  conservaUltime: 20,
  ultimoCantiere: '',
};

// La modalità mock è uno strumento di sviluppo, non un'opzione d'uso: in
// cantiere significherebbe bolle che sembrano inviate e non arrivano da
// nessuna parte. Vive quindi solo su localhost, e in campo è spenta
// qualunque cosa dica il valore salvato sul dispositivo — anche su un
// telefono che l'aveva accesa prima che l'interruttore venisse rimosso.
function suLocalhost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

export function impostazioniBolle() {
  let salvate;
  try {
    salvate = JSON.parse(localStorage.getItem(CHIAVE)) || {};
  } catch {
    salvate = {};
  }
  const impostazioni = { ...PREDEFINITE, ...salvate };
  impostazioni.mock = Boolean(impostazioni.mock) && suLocalhost();
  return impostazioni;
}

export function salvaImpostazioniBolle(modifiche) {
  const dati = { ...impostazioniBolle(), ...modifiche };
  if (dati.endpoint) dati.endpoint = normalizzaEndpoint(dati.endpoint);
  localStorage.setItem(CHIAVE, JSON.stringify(dati));
  return dati;
}

// Sviluppo locale: se esiste core/configurazione.js (mai versionato) ne prende
// endpoint, token ed eventuale mock, senza sovrascrivere quanto già impostato.
// Va chiesto esplicitamente aprendo l'app con ?config=locale su localhost —
// una volta sola, poi i valori restano nelle impostazioni del dispositivo.
// Così l'app pubblicata non richiede mai un file che non esiste.
export async function caricaConfigurazioneLocale() {
  const locale = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const richiesto = new URLSearchParams(location.search).get('config') === 'locale';
  if (!locale || !richiesto) return false;
  let modulo;
  try {
    modulo = await import('../../core/configurazione.js');
  } catch {
    return false;
  }
  const config = modulo.default || {};
  const attuali = impostazioniBolle();
  const modifiche = {};
  if (!attuali.endpoint && config.endpoint) modifiche.endpoint = config.endpoint;
  if (config.token && attuali.token === PREDEFINITE.token) modifiche.token = config.token;
  if (config.mock === true) modifiche.mock = true;
  if (Object.keys(modifiche).length === 0) return false;
  salvaImpostazioniBolle(modifiche);
  return true;
}
