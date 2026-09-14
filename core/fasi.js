// Le fasi di lavoro del gruppo: elenco chiuso, uguale per tutti i moduli.
//
// Il lavoro è diviso in fasi → attività → lavorazioni; qui si sceglie il
// livello delle **fasi**, che è quello a cui una bolla di consegna o una foto
// di cantiere si attribuisce sul momento, senza dover conoscere il
// cronoprogramma. Elenco dato da Francesco il 14/09/2026. «CMC 128» c'era ed
// è stata tolta lo stesso giorno su sua decisione (è un codice di commessa,
// non una fase); «Impianto SEFCC» era in rosso nell'elenco d'origine e resta
// finché non decide lui — togliere una voce è un rigo, aggiungerla dopo che
// le bolle sono già partite senza è un buco.
//
// La fase è FACOLTATIVA in tutti i moduli (deciso da Francesco il 14/09):
// «— nessuna fase —» è una scelta valida, e il campo parte vuoto. Meglio una
// bolla senza fase che una bolla ferma perché l'operatore non sa quale.
//
// Perché un elenco e non un campo libero: vale lo stesso ragionamento degli
// operatori (core/operatori.js). «Murature», «murature», «Muratura» e
// «Murat.» in raccolta sono quattro fasi, e nessun conteggio per fase regge.
//
// Ordine alfabetico, non per frequenza: sono ventisei voci, e in un elenco
// lungo si cerca per lettera, non per abitudine.
export const FASI = [
  'Bonifica',
  'Cantiere',
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

// Le opzioni del menù a tendina. La prima è «nessuna fase», sempre presente e
// sempre selezionabile, perché la fase è facoltativa; l'ultima scelta si
// ripropone, e «nessuna» è una scelta come le altre. Uguale nei due moduli
// perché è scritto una volta.
export function opzioniFase(ultima, scappaHtml) {
  const nota = faseValida(ultima);
  const nessuna = `<option value=""${nota ? '' : ' selected'}>— nessuna fase —</option>`;
  return nessuna + FASI.map(f =>
    `<option value="${scappaHtml(f)}"${f === ultima ? ' selected' : ''}>${scappaHtml(f)}</option>`
  ).join('');
}
