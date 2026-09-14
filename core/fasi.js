// Le fasi di lavoro del gruppo: elenco chiuso, uguale per tutti i moduli.
//
// Il lavoro è diviso in fasi → attività → lavorazioni; qui si sceglie il
// livello delle **fasi**, che è quello a cui una bolla di consegna o una foto
// di cantiere si attribuisce sul momento, senza dover conoscere il
// cronoprogramma. Elenco dato da Francesco il 14/09/2026, così com'è: due
// voci («CMC 128», «Impianto SEFCC») sono state segnalate come da verificare
// e restano finché non decide lui — togliere una voce da un elenco chiuso è
// un rigo, aggiungerla dopo che le bolle sono già partite senza è un buco.
//
// Perché un elenco e non un campo libero: vale lo stesso ragionamento degli
// operatori (core/operatori.js). «Murature», «murature», «Muratura» e
// «Murat.» in raccolta sono quattro fasi, e nessun conteggio per fase regge.
//
// Ordine alfabetico, non per frequenza: sono ventisette voci, e in un elenco
// lungo si cerca per lettera, non per abitudine.
export const FASI = [
  'Bonifica',
  'Cantiere',
  'CMC 128',
  'Consolidamento',
  'Demolizione',
  'Extra',
  'Finitura alloggi',
  'Finitura facciata',
  'Finitura parti comuni interne',
  'Impermeabilizzazioni',
  'Impianti di rete condominiali',
  'Impianto Antincendio',
  'Impianto ascensore',
  'Impianto elettrico alloggi',
  'Impianto elettrico parti comuni',
  'Impianto fotovoltaico',
  'Impianto idrosanitario',
  'Impianto SEFCC',
  'Impianto termico alloggi',
  'Impianto termico condominiale',
  'Interrato',
  'Marketing',
  'Murature',
  'Ponteggio',
  'Scavi',
  'Strutture',
  'Urbanizzazioni',
];

export function faseValida(nome) {
  return FASI.includes(String(nome || '').trim());
}

// Le opzioni del menù a tendina, con il segnaposto quando non c'è un'ultima
// scelta da riproporre. Uguale nei due moduli perché è scritto una volta.
export function opzioniFase(ultima, scappaHtml) {
  const nota = faseValida(ultima);
  const segnaposto = nota ? '' : '<option value="" selected disabled>— scegli la fase —</option>';
  return segnaposto + FASI.map(f =>
    `<option value="${scappaHtml(f)}"${f === ultima ? ' selected' : ''}>${scappaHtml(f)}</option>`
  ).join('');
}
