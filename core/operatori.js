// Chi può firmare un invio: elenco chiuso, uguale per tutti i moduli.
//
// Perché un elenco e non un campo libero. Il nome finisce in raccolta ed è
// quello che l'ufficio legge per sapere chi ha mandato cosa. Scritto a mano,
// la stessa persona diventa «Paolo Sanzarello», «Paolo», «Sanzarello»,
// «P.Sanzarello» e ogni refuso possibile — e in raccolta sembrano cinque
// persone. Non è un problema estetico: è un dato che arriva a destinazione
// sbagliato senza far rumore, e che rende inutile qualunque conteggio per
// operatore.
//
// L'ordine è quello dato da Francesco, non alfabetico: si sceglie col pollice
// da un elenco corto, e chi usa l'app più spesso sta in cima.
//
// Sta nella shell e non in un modulo perché è di tutti: due elenchi separati
// potrebbero divergere, e un nome presente in un modulo e assente nell'altro
// sarebbe esattamente il problema che questo file esiste per eliminare.
export const OPERATORI = [
  'Paolo Sanzarello',
  'Riccardo Zaccaro',
  'Emanuele Zaccaro',
  'Rosario Incarbone',
  'Roberto Borinschi',
  'Florin Zaharia',
  'Andrea Gondos',
  'Enzo Santovito',
  'Francesco Lando',
];

export function operatoreValido(nome) {
  return OPERATORI.includes(String(nome || '').trim());
}

// Riconosce un nome già salvato sul telefono e lo riporta alla grafia
// ufficiale: serve all'aggiornamento, dove il nome c'era già come testo
// libero. Tollera maiuscole e spazi doppi — «paolo  sanzarello» è la stessa
// persona — ma **non indovina**: «P. Sanzarello» non corrisponde a nessuno, e
// in quel caso è giusto richiedere la scelta invece di attribuire un invio a
// qualcuno per somiglianza.
export function riconosciOperatore(nome) {
  const pulito = String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!pulito) return '';
  return OPERATORI.find(o => o.toLowerCase() === pulito) || '';
}
