// L'ora del dispositivo, scritta come viaggia verso il flow.
//
// Formato: ISO 8601 con il fuso **esplicito** — `2026-09-14T08:31:39+02:00`.
// L'offset non è un dettaglio di stile: senza, chi riceve deve indovinare se
// quelle cifre sono ora locale o UTC, e sbagliando sposta tutto di due ore.
// Il flow poi compatta la stringa a dodici cifre `AAAAMMGGHHMM` prima di
// scriverla in raccolta, perché il connettore di SharePoint riscrive qualunque
// cosa somigli a una data (nove ore di lavoro per scoprirlo: non si torna
// indietro).
//
// Sta nella shell perché era scritto due volte, identico, in
// `modules/bolle/coda.js` e `modules/foto/coda.js`: due copie della stessa
// funzione sono due verità che prima o poi divergono, e qui a divergere
// sarebbe il modo in cui l'app dichiara *quando* è successo qualcosa.

export function timestampDispositivo(data = new Date()) {
  const scarto = -data.getTimezoneOffset();
  const segno = scarto >= 0 ? '+' : '-';
  const p = n => String(Math.abs(n)).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}` +
    `T${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}` +
    `${segno}${p(Math.floor(Math.abs(scarto) / 60))}:${p(Math.abs(scarto) % 60)}`;
}

// La stessa forma, ma con un offset che arriva da fuori (l'EXIF della foto sa
// il fuso in cui è stata scattata, che non è per forza quello di adesso).
export function timestampConOffset(pezzi, offsetMinuti) {
  const p = n => String(Math.abs(n)).padStart(2, '0');
  const segno = offsetMinuti >= 0 ? '+' : '-';
  return `${String(pezzi.anno).padStart(4, '0')}-${p(pezzi.mese)}-${p(pezzi.giorno)}` +
    `T${p(pezzi.ore)}:${p(pezzi.minuti)}:${p(pezzi.secondi)}` +
    `${segno}${p(Math.floor(Math.abs(offsetMinuti) / 60))}:${p(Math.abs(offsetMinuti) % 60)}`;
}
