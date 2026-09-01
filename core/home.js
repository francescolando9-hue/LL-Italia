// Home/launcher della shell: una tessera per modulo.
import { scappaHtml } from './impostazioni.js';

export function vistaHome(el, moduli) {
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
    <h2 class="tenue" style="margin:4px 4px 12px">Moduli</h2>
    <nav class="griglia-moduli">${tessere}</nav>
  `;
}
