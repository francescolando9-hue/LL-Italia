// «Detta»: il testo compare nel campo mentre si parla e si corregge prima di
// mandare. L'audio non si conserva: l'app non lo registra, riceve solo il testo
// (decisione 3 di Francesco del 20/11/2026).
//
// Usa il riconoscimento vocale del browser (Web Speech API). Su Chrome per
// Android può passare dai servizi Google e di norma vuole la rete. Dove non
// c'è, o dove il microfono è negato, il pulsante lo dice e resta il microfono
// della tastiera, che fa la stessa cosa senza l'app.

export function dettaturaDisponibile() {
  return typeof window !== 'undefined'
    && typeof (window.SpeechRecognition || window.webkitSpeechRecognition) === 'function';
}

// Collega un pulsante a un campo di testo. `avviso` è l'elemento dove scrivere
// cosa succede. Restituisce una funzione che ferma la dettatura (da chiamare
// quando si lascia la schermata).
export function collegaDettatura(bottone, campo, avviso) {
  if (!dettaturaDisponibile()) {
    bottone.classList.add('nascosto');
    avviso.textContent = 'Per dettare usa il microfono della tastiera.';
    return () => {};
  }
  const Riconoscimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  let riconoscimento = null;
  let base = '';
  let attiva = false;

  const aggiornaBottone = () => {
    bottone.textContent = attiva ? '■ Ferma' : '🎤 Detta';
    bottone.setAttribute('aria-pressed', attiva ? 'true' : 'false');
  };

  const ferma = () => {
    attiva = false;
    aggiornaBottone();
    if (riconoscimento) {
      try { riconoscimento.stop(); } catch { /* già ferma */ }
    }
  };

  bottone.addEventListener('click', () => {
    if (attiva) { ferma(); return; }
    riconoscimento = new Riconoscimento();
    riconoscimento.lang = 'it-IT';
    riconoscimento.continuous = true;
    riconoscimento.interimResults = true;
    base = campo.value.trim() ? `${campo.value.trim()} ` : '';
    riconoscimento.onresult = evento => {
      let definitivo = '';
      let provvisorio = '';
      for (let i = 0; i < evento.results.length; i += 1) {
        const testo = evento.results[i][0].transcript;
        if (evento.results[i].isFinal) definitivo += testo;
        else provvisorio += testo;
      }
      campo.value = `${base}${definitivo}${provvisorio}`.replace(/\s+/g, ' ').trimStart();
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    };
    riconoscimento.onerror = evento => {
      const codice = evento && evento.error;
      if (codice === 'no-speech' || codice === 'aborted') return;
      avviso.textContent = codice === 'not-allowed' || codice === 'service-not-allowed'
        ? 'Microfono non permesso: consentilo nelle impostazioni del telefono, oppure usa il microfono della tastiera.'
        : codice === 'network'
          ? 'Per dettare serve la rete: usa il microfono della tastiera.'
          : 'Dettatura non riuscita: usa il microfono della tastiera.';
      ferma();
    };
    riconoscimento.onend = () => {
      if (attiva) ferma();
    };
    try {
      riconoscimento.start();
      attiva = true;
      avviso.textContent = 'Parla: il testo compare qui sopra e lo puoi correggere.';
    } catch {
      avviso.textContent = 'Dettatura non disponibile adesso: usa il microfono della tastiera.';
      attiva = false;
    }
    aggiornaBottone();
  });
  aggiornaBottone();
  return ferma;
}
