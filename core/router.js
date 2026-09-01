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
  const hash = location.hash || '#/';
  const rotta = rotte.find(r => hash === r.prefisso || hash.startsWith(r.prefisso + '/'));
  if (!rotta) {
    naviga('#/', true);
    return;
  }
  outlet.innerHTML = '';
  const sottoPercorso = hash.slice(rotta.prefisso.length).replace(/^\//, '');
  rotta.render(outlet, sottoPercorso);
  window.scrollTo(0, 0);
}
