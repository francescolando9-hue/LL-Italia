// Router hash della shell: le rotte si registrano per prefisso (es. "#/bolle").
let rotte = [];
let outlet = null;

export function registraRotta(prefisso, render) {
  rotte.push({ prefisso, render });
  // Il prefisso più lungo vince: "#/bolle/impostazioni" prima di "#/bolle".
  rotte.sort((a, b) => b.prefisso.length - a.prefisso.length);
}

export function avviaRouter(elemento) {
  outlet = elemento;
  window.addEventListener('hashchange', gestisci);
  gestisci();
}

// Naviga via hash; con sostituisci=true non lascia traccia nella history.
export function naviga(hash, sostituisci = false) {
  if (sostituisci) {
    history.replaceState(null, '', hash);
    gestisci();
  } else {
    location.hash = hash;
  }
}

function gestisci() {
  const grezzo = location.hash || '#/';
  // I parametri vanno dentro l'hash, non nella query della pagina: così non
  // vengono inviati al server né finiscono nei suoi log.
  const taglio = grezzo.indexOf('?');
  const percorso = taglio === -1 ? grezzo : grezzo.slice(0, taglio);
  const parametri = new URLSearchParams(taglio === -1 ? '' : grezzo.slice(taglio + 1));
  const rotta = rotte.find(r => percorso === r.prefisso || percorso.startsWith(r.prefisso + '/'));
  if (!rotta) {
    naviga('#/', true);
    return;
  }
  outlet.innerHTML = '';
  const sottoPercorso = percorso.slice(rotta.prefisso.length).replace(/^\//, '');
  rotta.render(outlet, sottoPercorso, parametri);
  window.scrollTo(0, 0);
}

// Rimuove i parametri dall'indirizzo senza ricaricare la vista: si usa dopo
// aver consumato un link di configurazione, per non lasciarne traccia.
export function pulisciParametri() {
  const grezzo = location.hash || '';
  const taglio = grezzo.indexOf('?');
  if (taglio === -1) return;
  history.replaceState(null, '', grezzo.slice(0, taglio));
}
