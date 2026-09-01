// Impostazioni del modulo Bolle, persistite in localStorage del dispositivo.
// Endpoint e chiave NON stanno nel repo: si inseriscono qui (da specifica).

const CHIAVE = 'llitalia.bolle';

// Lista cantieri configurabile — al lancio solo MAR (da specifica funzionale);
// le altre commesse si aggiungono dalle impostazioni del modulo.
const PREDEFINITE = {
  endpoint: '',
  chiave: '',
  mock: true,
  conservaUltime: 20,
  cantieri: ['MAR'],
  ultimoCantiere: '',
};

export function impostazioniBolle() {
  let salvate;
  try {
    salvate = JSON.parse(localStorage.getItem(CHIAVE)) || {};
  } catch {
    salvate = {};
  }
  const dati = { ...PREDEFINITE, ...salvate };
  if (!Array.isArray(dati.cantieri) || dati.cantieri.length === 0) {
    dati.cantieri = [...PREDEFINITE.cantieri];
  }
  return dati;
}

export function salvaImpostazioniBolle(modifiche) {
  const dati = { ...impostazioniBolle(), ...modifiche };
  localStorage.setItem(CHIAVE, JSON.stringify(dati));
  return dati;
}
