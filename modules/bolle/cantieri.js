// Anagrafica dei cantieri attivi per il modulo Bolle.
// A video l'etichetta estesa, nel payload SOLO il codice commessa: l'elenco è
// in codice (non modificabile dal dispositivo) perché un codice sbagliato
// arriverebbe al magazzino come commessa inesistente.
export const CANTIERI = [
  { codice: 'MAR', etichetta: 'MAR - Caselle Torinese' },
  { codice: 'SNZ2.2', etichetta: 'SNZ2.2 - Settimo Torinese' },
  { codice: 'MNG', etichetta: 'MNG - via Monginevro 181' },
];

export function etichettaCantiere(codice) {
  const trovato = CANTIERI.find(c => c.codice === codice);
  return trovato ? trovato.etichetta : codice;
}

export function codiceValido(codice) {
  return CANTIERI.some(c => c.codice === codice);
}
