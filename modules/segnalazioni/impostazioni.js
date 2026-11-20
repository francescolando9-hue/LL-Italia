// Impostazioni del modulo Segnalazioni, persistite in localStorage del dispositivo.
//
// Il modulo parla con DUE funzioni (Azure Functions, decisione di Francesco del
// 20/11/2026 al posto dei flow): `segnalazioni`, che riceve
// aperture, passaggi, chiusure e riaperture, e `segnalazioni-elenco`, che
// restituisce l'elenco. È il primo modulo che LEGGE dal server: Foto e Bolle
// mandano soltanto. Gli indirizzi contengono la chiave della funzione (`code=`):
// non stanno MAI nel repo, arrivano col QR o si scrivono nelle impostazioni.
// Il token è uno solo, uguale nelle due funzioni.
import { normalizzaEndpoint } from '../../core/endpoint.js';

export { normalizzaEndpoint };

const CHIAVE = 'llitalia.segnalazioni';
const CHIAVE_ELENCO = 'llitalia.segnalazioni.elenco';
const CHIAVE_STORIE = 'llitalia.segnalazioni.storie';
const STORIE_DA_TENERE = 50;

// Chi apre una segnalazione: decisione di Francesco del 20/11/2026, i cinque
// che passano negli alloggi e parlano coi clienti. I clienti no. Il server
// rifiuta comunque un'apertura da un altro nome (403): l'elenco sta qui per
// non mostrare un pulsante che porta a un rifiuto.
export const POSSONO_APRIRE = [
  'Andrea Gondos', 'Domenico Caminiti', 'Enzo Santovito', 'Paolo Sanzarello', 'Rosario Incarbone',
];

// Chi riapre una segnalazione chiusa, e chi può agire su tutte anche quando
// non l'ha in mano: Francesco e Paolo (decisione 8 del 20/11/2026).
export const COORDINANO = ['Francesco Lando', 'Paolo Sanzarello'];

// Fino a 3 foto per segnalazione, in tutto (decisione 4 del 20/11/2026).
export const FOTO_MASSIME = 3;

const PREDEFINITE = {
  endpoint: '',
  endpointElenco: '',
  token: '',
  conservaUltime: 20,
};

function leggiJson(chiave, ripiego) {
  try {
    return JSON.parse(localStorage.getItem(chiave)) || ripiego;
  } catch {
    return ripiego;
  }
}

// localStorage pieno non deve far perdere niente: l'elenco è una copia di
// quello che sta sul server, e se non si salva lo si rilegge la volta dopo.
function scriviJson(chiave, valore) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
    return true;
  } catch {
    return false;
  }
}

export function impostazioniSegnalazioni() {
  return { ...PREDEFINITE, ...leggiJson(CHIAVE, {}) };
}

export function salvaImpostazioniSegnalazioni(modifiche) {
  const dati = { ...impostazioniSegnalazioni(), ...modifiche };
  if (dati.endpoint) dati.endpoint = normalizzaEndpoint(dati.endpoint);
  if (dati.endpointElenco) dati.endpointElenco = normalizzaEndpoint(dati.endpointElenco);
  scriviJson(CHIAVE, dati);
  return dati;
}

export function configurato() {
  const i = impostazioniSegnalazioni();
  return Boolean(i.endpoint && i.endpointElenco && i.token);
}

// --- La copia dell'elenco ------------------------------------------------------
// L'ultimo elenco letto resta sul telefono: senza rete la home mostra quello,
// con l'ora della lettura, invece di niente.

export function elencoSalvato() {
  const dati = leggiJson(CHIAVE_ELENCO, null);
  if (!dati || !Array.isArray(dati.segnalazioni)) return { lettoIl: 0, segnalazioni: [] };
  return dati;
}

export function salvaElenco(segnalazioni, lettoIl = Date.now()) {
  scriviJson(CHIAVE_ELENCO, { lettoIl, segnalazioni });
}

export function storiaSalvata(idSegnalazione) {
  const storie = leggiJson(CHIAVE_STORIE, {});
  return storie[idSegnalazione] || null;
}

export function salvaStoria(idSegnalazione, interventi, lettoIl = Date.now()) {
  const storie = leggiJson(CHIAVE_STORIE, {});
  storie[idSegnalazione] = { lettoIl, interventi };
  const chiavi = Object.keys(storie).sort((a, b) => storie[b].lettoIl - storie[a].lettoIl);
  for (const vecchia of chiavi.slice(STORIE_DA_TENERE)) delete storie[vecchia];
  scriviJson(CHIAVE_STORIE, storie);
}
