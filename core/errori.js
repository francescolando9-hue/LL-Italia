// Messaggi d'errore, in un posto solo.
//
// Due cose, entrambe nate da difetti veri:
//
// 1. La spiegazione dei codici HTTP era scritta due volte, una per modulo, e
//    aveva già iniziato a divergere: il modulo Foto spiegava il 413 («file
//    troppo grande»), quello Bolle no — stesso errore, stesso operatore, una
//    frase utile e una muta, a seconda di dove premeva.
//
// 2. Un errore di salvataggio arrivava a video **così com'è**, cioè in inglese
//    e nel gergo del browser: *«Failed to execute 'add' on 'IDBObjectStore'»*.
//    Il caso che conta è la memoria piena — succede in cantiere, su telefoni
//    con la galleria piena e le foto d'archivio che non si comprimono — e lì
//    la foto NON è entrata in coda. Con l'offline-first tutto dipende dal fatto
//    che l'operatore lo capisca e faccia qualcosa: un messaggio che non si
//    legge vale come nessun messaggio.

// Perché il flow ha rifiutato: il numero da solo non dice a chi guarda cosa
// fare. Il 502 in particolare non è un problema di rete — è il flow che è
// terminato senza eseguire nessuna azione Response: il file non è stato
// salvato e la spiegazione sta nella cronologia del flow.
export function spiegazioneStato(stato) {
  if (stato === 400) return ' — verifica api-version nell’URL, o il file è troppo grande per il flow';
  if (stato === 401 || stato === 403) return ' — token o firma non validi';
  if (stato === 413) return ' — file troppo grande per il flow';
  if (stato === 502) return ' — il flow è terminato senza rispondere: guarda la cronologia del flow';
  if (stato === 504) return ' — il flow non ha risposto in tempo: guarda la cronologia del flow';
  if (stato >= 500) return ' — il flow non è arrivato in fondo: guarda la cronologia del flow';
  return '';
}

// Un errore di salvataggio detto all'operatore, con dentro cosa fare.
// `cosa` è la parola giusta per il modulo: «la foto», «la bolla».
export function messaggioSalvataggio(errore, cosa = 'la foto') {
  if (memoriaPiena(errore)) {
    return `Memoria del telefono piena: ${cosa} NON è stata salvata. `
      + 'Manda quelle in attesa, poi libera spazio (foto e video della galleria) e riprova.';
  }
  const testo = (errore && errore.message) || '';
  // Un messaggio del browser, in inglese e nel suo gergo, non dice niente a
  // chi è in cantiere: meglio una frase che almeno indica la via d'uscita.
  if (!testo || /IDBObjectStore|IndexedDB|transaction|DOMException/i.test(testo)) {
    return `Non è stato possibile salvare ${cosa} su questo telefono: riprova, e se succede ancora riavvia l'app.`;
  }
  return testo;
}

// La memoria piena si presenta con nomi diversi a seconda del browser e del
// punto in cui capita: si riconoscono tutti, non solo quello di Chrome.
export function memoriaPiena(errore) {
  if (!errore) return false;
  const nome = errore.name || '';
  if (nome === 'QuotaExceededError' || nome === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  // Firefox usa il codice 22 senza il nome moderno.
  if (errore.code === 22 || errore.code === 1014) return true;
  return /quota|storage is full|spazio/i.test(String(errore.message || ''));
}
