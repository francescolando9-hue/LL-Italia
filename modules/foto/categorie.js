// Le due categorie di foto di cantiere. Il codice viaggia nel payload e finisce
// in una colonna della raccolta; l'etichetta è quella che legge chi è in
// cantiere, e deve dire a cosa serve la foto, non come si chiama il campo.
export const CATEGORIE = [
  {
    codice: 'AVANZAMENTO',
    etichetta: 'Avanzamento lavori — per capirci tra noi',
    breve: 'Avanzamento',
    // Compressa come le bolle: deve partire anche con poca rete, e serve a
    // guardarla, non ad archiviarla.
    originale: false,
  },
  {
    codice: 'ARCHIVIO',
    etichetta: 'Da archiviare sul server',
    breve: 'Archivio',
    // Risoluzione originale, per decisione del 10/09/2026: la foto va sul
    // server come l'ha scattata il telefono.
    originale: true,
  },
];

export function categoria(codice) {
  return CATEGORIE.find(c => c.codice === codice) || null;
}

export function etichettaCategoria(codice) {
  const trovata = categoria(codice);
  return trovata ? trovata.breve : codice;
}
