// Home/launcher della shell: una tessera per modulo.
//
// Dalla 0.43.0 un modulo può dichiarare `inCima(el)`: la home gli dà un
// riquadro sopra le tessere, e il modulo ci disegna quello che chi apre l'app
// deve vedere subito — oggi «Tocca a te» delle Segnalazioni. Il modulo decide
// se disegnare qualcosa: senza niente da dire il riquadro resta vuoto e la
// home è quella di prima. La shell non sa cosa ci finisce dentro.
import { scappaHtml } from './impostazioni.js';

export function vistaHome(el, moduli) {
  const inCima = moduli.filter(m => typeof m.inCima === 'function');
  const tessere = moduli.map(modulo => `
    <a class="tessera" href="#/${modulo.id}">
      <span class="icona" aria-hidden="true">${modulo.icona}</span>
      <span>
        <span class="nome">${scappaHtml(modulo.titolo)}</span>
        <p class="descrizione">${scappaHtml(modulo.descrizione)}</p>
      </span>
    </a>
  `).join('');
  el.innerHTML = `
    ${inCima.map(m => `<div class="in-cima" data-modulo="${scappaHtml(m.id)}"></div>`).join('')}
    <h2 class="tenue" style="margin:4px 4px 12px">Moduli</h2>
    <nav class="griglia-moduli">${tessere}</nav>
  `;
  for (const modulo of inCima) {
    const riquadro = el.querySelector(`.in-cima[data-modulo="${modulo.id}"]`);
    // Un modulo che sbaglia qui non deve togliere la home a nessuno.
    Promise.resolve().then(() => modulo.inCima(riquadro)).catch(() => { riquadro.innerHTML = ''; });
  }
}
