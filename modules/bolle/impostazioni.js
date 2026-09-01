// Impostazioni del modulo Bolle, persistite in localStorage del dispositivo.
// L'URL dell'endpoint contiene una firma di accesso: non sta MAI nel repo.
// Sul dispositivo si inserisce dalle Impostazioni; in sviluppo locale può
// arrivare da core/configurazione.js (file escluso da git).

const CHIAVE = 'llitalia.bolle';

// Il designer di Power Automate mostra l'URL con api-version=1, che il servizio
// rifiuta con 400: si normalizza sempre a questa versione.
export const API_VERSION = '2024-10-01';

const PREDEFINITE = {
  endpoint: '',
  token: 'collaudo',
  mock: true,
  conservaUltime: 20,
  ultimoCantiere: '',
};

// Sostituzione mirata del solo parametro api-version: non tocca il resto della
// query string, così la firma (sig=) resta byte per byte quella originale.
export function normalizzaEndpoint(url) {
  const testo = String(url || '').trim();
  if (!testo) return '';
  if (/[?&]api-version=/i.test(testo)) {
    return testo.replace(/([?&]api-version=)[^&]*/i, `$1${API_VERSION}`);
  }
  return `${testo}${testo.includes('?') ? '&' : '?'}api-version=${API_VERSION}`;
}

export function endpointDaCorreggere(url) {
  const testo = String(url || '').trim();
  return testo !== '' && testo !== normalizzaEndpoint(testo);
}

export function impostazioniBolle() {
  let salvate;
  try {
    salvate = JSON.parse(localStorage.getItem(CHIAVE)) || {};
  } catch {
    salvate = {};
  }
  return { ...PREDEFINITE, ...salvate };
}

export function salvaImpostazioniBolle(modifiche) {
  const dati = { ...impostazioniBolle(), ...modifiche };
  if (dati.endpoint) dati.endpoint = normalizzaEndpoint(dati.endpoint);
  localStorage.setItem(CHIAVE, JSON.stringify(dati));
  return dati;
}

// Sviluppo locale: se esiste core/configurazione.js (mai versionato) ne prende
// endpoint e token, senza sovrascrivere quanto già impostato sul dispositivo.
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
  if (Object.keys(modifiche).length === 0) return false;
  salvaImpostazioniBolle(modifiche);
  return true;
}
