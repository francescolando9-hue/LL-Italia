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
// **L'ordine è alfabetico sul nome come si legge a video** (nome, poi
// cognome), deciso da Francesco il 05/10/2026. Fino alla 0.37.5 era un ordine
// d'uso — chi apre l'app più spesso in cima — e aveva due difetti: va rimesso
// a mano a ogni ingresso, e dipende da chi lo valuta. L'ordine alfabetico non
// si valuta: si collauda, e un nome aggiunto in fondo fa fallire il collaudo
// invece di restare lì per mesi.
//
// L'ordine sta QUI e in nessun altro posto: non si riordina a video. Un
// secondo ordinamento sarebbe un secondo elenco, e due elenchi divergono.
//
// Sta nella shell e non in un modulo perché è di tutti: due elenchi separati
// potrebbero divergere, e un nome presente in un modulo e assente nell'altro
// sarebbe esattamente il problema che questo file esiste per eliminare.
export const OPERATORI = [
  'Alessio Ferrara',
  'Andrea Gondos',
  'Domenico Caminiti',
  'Emanuele Zaccaro',
  'Enzo Santovito',
  'Florin Zaharia',
  'Francesco Lando',
  'Giovanni Lippolis',
  'Maurizio Lando',
  'Paolo Sanzarello',
  'Riccardo Zaccaro',
  'Roberto Borinschi',
  'Rosario Incarbone',
];

// Il confronto con cui l'elenco è ordinato, e con cui il collaudo lo verifica:
// alfabetico italiano, senza distinzione di maiuscole e accenti. Sta qui perché
// chi aggiunge un nome possa rimetterlo al posto giusto con la stessa regola
// con cui il collaudo glielo chiederà.
export function confrontaOperatori(a, b) {
  return String(a).localeCompare(String(b), 'it', { sensitivity: 'base' });
}

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
