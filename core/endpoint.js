// Normalizzazione degli endpoint dei flow Power Automate, condivisa dai moduli.
// Sta nella shell perché è un fatto della piattaforma, non di un modulo: il
// designer di Power Automate mostra l'URL con api-version=1, che il servizio
// rifiuta con 400. Ogni modulo che invia a un flow ha lo stesso problema.
export const API_VERSION = '2024-10-01';

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
