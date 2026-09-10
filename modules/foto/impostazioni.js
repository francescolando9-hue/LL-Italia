// Impostazioni del modulo Foto, persistite in localStorage del dispositivo.
// Endpoint e token sono quelli del PROPRIO flow, diverso da quello delle bolle:
// l'URL contiene una firma di accesso e non sta mai nel repo.
import { API_VERSION, normalizzaEndpoint, endpointDaCorreggere } from '../../core/endpoint.js';

export { API_VERSION, normalizzaEndpoint, endpointDaCorreggere };

const CHIAVE = 'llitalia.foto';

const PREDEFINITE = {
  endpoint: '',
  token: 'collaudo',
  conservaUltime: 10,
  ultimaCommessa: '',
  ultimaCategoria: '',
  // Tetto di peso per un singolo invio, in MB. Serve ai video, che non si
  // possono comprimere nel browser: il contenuto viaggia in base64 dentro
  // JSON, che aggiunge un terzo, e oltre una certa taglia il flow rifiuta.
  // Meglio dirlo all'operatore prima di accodare che lasciarlo ritentare a
  // vuoto. Il valore giusto lo dice il collaudo sul flow vero.
  limiteMB: 20,
  // Caricamento in due fasi: il telefono chiede al flow dove mettere i byte e
  // li manda a blocchi. Spento per default, perché richiede un flow che sappia
  // rispondere: acceso su un flow che non lo sa fare non romperebbe nulla —
  // l'app ripiega sull'invio in una richiesta — ma non serve a niente.
  dueFasi: false,
  // Tetto quando le due fasi sono attive: qui il vincolo non è più la taglia
  // della richiesta, ma il tempo di caricamento in cantiere.
  limiteDueFasiMB: 200,
  // Taglia dei blocchi. Microsoft Graph vuole multipli di 320 KiB: il valore
  // viene arrotondato dal codice che carica.
  bloccoMB: 10,
};

export function impostazioniFoto() {
  let salvate;
  try {
    salvate = JSON.parse(localStorage.getItem(CHIAVE)) || {};
  } catch {
    salvate = {};
  }
  return { ...PREDEFINITE, ...salvate };
}

export function salvaImpostazioniFoto(modifiche) {
  const dati = { ...impostazioniFoto(), ...modifiche };
  if (dati.endpoint) dati.endpoint = normalizzaEndpoint(dati.endpoint);
  localStorage.setItem(CHIAVE, JSON.stringify(dati));
  return dati;
}
