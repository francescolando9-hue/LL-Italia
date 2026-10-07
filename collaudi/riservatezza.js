// Controllo di riservatezza: niente percorsi del server e niente dati veri nel
// repository, che è PUBBLICO e pubblicato per intero su GitHub Pages.
//
// La regola è di gruppo (estratto in CLAUDE.md): in nessun file entrano
// percorsi del server interno, e nessun dato di cliente entra in un
// repository, nemmeno nei commenti o nei dati di prova. Questo controllo ne
// prende la parte che si può riconoscere da una macchina senza indovinare:
//
//  - **percorsi UNC**: due barre rovesciate seguite da un nome di macchina,
//    qualunque sia il nome — anche nella forma raddoppiata delle stringhe JS;
//  - **percorsi sulle unità mappate dell'ufficio**, L: e A: seguite dalla barra
//    rovesciata (scritte così, a parole, perché scritte per esteso questo file
//    bloccherebbe sé stesso);
//  - **partite IVA, codici fiscali, IBAN**, riconosciuti con la **cifra di
//    controllo**: un numero di undici cifre qualsiasi non basta a bloccare un
//    commit, ne serve uno che sia davvero una partita IVA possibile.
//
// **Qui dentro non c'è nessun nome di macchina né di condivisione, e nessun
// dato vero**: finirebbero nel repository che il controllo protegge. I casi di
// prova li costruisce il collaudo (`22-riservatezza.js`), calcolando le cifre
// di controllo su numeri inventati.
//
// Si usa in tre posti, con lo stesso codice:
//   node collaudi/riservatezza.js              tutto il repository (CI, collaudo)
//   node collaudi/riservatezza.js --in-stage   solo i file in stage (hook)
// L'hook è `.githooks/pre-commit`, da attivare una volta per clone con
//   git config core.hooksPath .githooks
// Il controllo su GitHub è `.github/workflows/riservatezza.yml`.
//
// Quello che trova si scrive SENZA il valore — tipo, file, riga, colonna — perché
// i log di GitHub Actions di un repository pubblico sono pubblici: stampare il
// percorso trovato vorrebbe dire pubblicarlo nel momento in cui lo si blocca.
//
// Nessuna dipendenza: solo moduli di Node, così gira anche dove i collaudi col
// browser non sono installati.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Le cifre di controllo ---------------------------------------------------

// Partita IVA: 11 cifre. Le prime 7 sono la matricola, le 3 dopo l'ufficio
// provinciale, l'ultima il controllo (algoritmo di Luhn sulle prime 10).
// L'ufficio stringe ancora: 001–100, oppure 120, 121, 888, 999 — e una
// matricola tutta di zeri non esiste. Un numero che passa tutto questo è una
// partita IVA possibile; uno qualunque di 11 cifre lo è una volta su cento.
function partitaIvaValida(cifre) {
  if (!/^\d{11}$/.test(cifre)) return false;
  if (/^0{7}/.test(cifre)) return false;
  const ufficio = Number(cifre.slice(7, 10));
  if (!((ufficio >= 1 && ufficio <= 100) || [120, 121, 888, 999].includes(ufficio))) return false;
  let somma = 0;
  for (let i = 0; i < 10; i += 1) {
    let c = Number(cifre[i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somma += c;
  }
  return (10 - (somma % 10)) % 10 === Number(cifre[10]);
}

// Codice fiscale delle persone: 16 caratteri. L'ultimo è il controllo, dalle
// tabelle dei caratteri in posizione dispari e pari. Le cifre possono essere
// sostituite da lettere (omocodia: L M N P Q R S T U V al posto di 0–9), e la
// tabella le tratta come le cifre corrispondenti.
const DISPARI = {
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

function valorePari(carattere) {
  return /\d/.test(carattere) ? Number(carattere) : carattere.charCodeAt(0) - 65;
}

function carattereControlloFiscale(primi15) {
  let somma = 0;
  for (let i = 0; i < 15; i += 1) {
    const c = primi15[i];
    // Posizioni 1, 3, 5… (contando da 1) sono le «dispari».
    somma += i % 2 === 0 ? DISPARI[c] : valorePari(c);
  }
  return String.fromCharCode(65 + (somma % 26));
}

function codiceFiscaleValido(codice) {
  const c = codice.toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(c)) return false;
  return carattereControlloFiscale(c.slice(0, 15)) === c[15];
}

// IBAN: paese, due cifre di controllo, poi il conto. Il controllo è il resto
// della divisione per 97 (deve fare 1) dopo aver portato in fondo i primi
// quattro caratteri e trasformato le lettere in numeri (A = 10 … Z = 35). Si
// controllano solo i paesi di cui si conosce la lunghezza: una sequenza di
// lettere e cifre della lunghezza sbagliata non è un IBAN.
const LUNGHEZZA_IBAN = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IT: 27,
  LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

function resto97(numeriEdLettere) {
  let resto = 0;
  for (const c of numeriEdLettere) {
    const valore = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const cifra of valore) resto = (resto * 10 + Number(cifra)) % 97;
  }
  return resto;
}

function ibanValido(iban) {
  const compatto = iban.replace(/ /g, '').toUpperCase();
  const attesa = LUNGHEZZA_IBAN[compatto.slice(0, 2)];
  if (!attesa || compatto.length !== attesa) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compatto)) return false;
  return resto97(compatto.slice(4) + compatto.slice(0, 4)) === 1;
}

// --- Le regole ---------------------------------------------------------------

// Ogni regola trova i candidati con un'espressione e li conferma con una
// funzione: le forme si riconoscono con l'espressione, i dati veri con la
// cifra di controllo.
const REGOLE = [
  {
    tipo: 'percorso UNC',
    // Due barre rovesciate (o quattro, come si scrivono in una stringa JS)
    // seguite da un nome di macchina. NON preceduto da una lettera, una cifra
    // o un'altra barra: `Interrato\P-1\` è un percorso relativo dentro un
    // testo, non un percorso di rete.
    espressione: /(?<![\w\\])\\\\(?:\\\\)?[A-Za-z0-9][A-Za-z0-9._$-]*/g,
    conferma: () => true,
  },
  {
    tipo: 'percorso su unità mappata (L: o A:)',
    // L: e A: seguite dalla barra rovesciata, anche raddoppiata come nelle
    // stringhe JS.
    // «su `L:`», senza barra, è il nome dell'unità e non un percorso.
    espressione: /(?<![A-Za-z0-9])[LlAa]:\\/g,
    conferma: () => true,
  },
  {
    tipo: 'partita IVA',
    espressione: /(?<![A-Za-z0-9])(?:IT)?(\d{11})(?![A-Za-z0-9])/g,
    conferma: trovato => partitaIvaValida(trovato[1]),
  },
  {
    tipo: 'codice fiscale',
    espressione: /(?<![A-Za-z0-9])[A-Za-z]{6}[0-9LMNPQRSTUVlmnpqrstuv]{2}[ABCDEHLMPRSTabcdehlmprst][0-9LMNPQRSTUVlmnpqrstuv]{2}[A-Za-z][0-9LMNPQRSTUVlmnpqrstuv]{3}[A-Za-z](?![A-Za-z0-9])/g,
    conferma: trovato => codiceFiscaleValido(trovato[0]),
  },
  {
    tipo: 'IBAN',
    // Compatto o a gruppi separati da uno spazio. Se la sequenza continua
    // oltre (una parola maiuscola subito dopo), si prova la lunghezza giusta
    // per quel paese.
    espressione: /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}(?![A-Za-z0-9])/g,
    conferma: trovato => {
      const compatto = trovato[0].replace(/ /g, '');
      const attesa = LUNGHEZZA_IBAN[compatto.slice(0, 2)];
      return Boolean(attesa) && compatto.length >= attesa && ibanValido(compatto.slice(0, attesa));
    },
  },
];

// Cerca in un testo. Torna i ritrovamenti SENZA il valore trovato: tipo,
// riga, colonna e lunghezza bastano a trovarlo, e non lo ripubblicano.
function cerca(testo) {
  const trovati = [];
  for (const regola of REGOLE) {
    regola.espressione.lastIndex = 0;
    for (const trovato of testo.matchAll(regola.espressione)) {
      if (!regola.conferma(trovato)) continue;
      const prima = testo.slice(0, trovato.index);
      const riga = prima.split('\n').length;
      const colonna = trovato.index - prima.lastIndexOf('\n');
      trovati.push({ tipo: regola.tipo, riga, colonna, lunghezza: trovato[0].length });
    }
  }
  return trovati.sort((a, b) => a.riga - b.riga || a.colonna - b.colonna);
}

// --- I file da leggere -------------------------------------------------------

const BINARI = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|otf|mp4|mov|webm)$/i;

function git(argomenti, radice, comeTesto = true) {
  return execFileSync('git', argomenti, {
    cwd: radice,
    encoding: comeTesto ? 'utf8' : 'buffer',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function radiceRepository(da = process.cwd()) {
  return git(['rev-parse', '--show-toplevel'], da).trim();
}

// Un file è testo se nei primi 8 KB non c'è un byte nullo.
function eTesto(buffer) {
  return !buffer.subarray(0, 8192).includes(0);
}

// Tutto il repository: i file tracciati più quelli nuovi non ignorati, letti
// dalla copia di lavoro. È quello che vede GitHub dopo il push, più quello che
// sta per entrarci.
function fileDelRepository(radice) {
  return git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], radice)
    .split('\0').filter(Boolean)
    .filter(nome => !BINARI.test(nome))
    .map(nome => ({ nome, leggi: () => fs.readFileSync(path.join(radice, nome)) }))
    .filter(file => fs.existsSync(path.join(radice, file.nome)));
}

// Solo i file in stage, letti dall'INDICE e non dalla copia di lavoro: è
// quello che il commit conterrà davvero, anche quando una parte delle modifiche
// è rimasta fuori dallo stage.
function fileInStage(radice) {
  return git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'], radice)
    .split('\0').filter(Boolean)
    .filter(nome => !BINARI.test(nome))
    .map(nome => ({ nome, leggi: () => git(['show', `:${nome}`], radice, false) }));
}

function controlla({ radice = radiceRepository(), inStage = false } = {}) {
  const file = inStage ? fileInStage(radice) : fileDelRepository(radice);
  const ritrovamenti = [];
  let letti = 0;
  for (const f of file) {
    const contenuto = f.leggi();
    if (!eTesto(contenuto)) continue;
    letti += 1;
    for (const t of cerca(contenuto.toString('utf8'))) ritrovamenti.push({ file: f.nome, ...t });
  }
  return { letti, ritrovamenti };
}

function principale() {
  const inStage = process.argv.includes('--in-stage');
  let esito;
  try {
    esito = controlla({ inStage });
  } catch (errore) {
    console.error(`Controllo di riservatezza: non è stato possibile eseguirlo (${errore.message}).`);
    process.exit(2);
  }
  const dove = inStage ? 'file in stage' : 'file del repository';
  if (esito.ritrovamenti.length === 0) {
    console.log(`Controllo di riservatezza: ${esito.letti} ${dove} letti, niente da segnalare.`);
    return;
  }
  console.error(`Controllo di riservatezza: ${esito.ritrovamenti.length} ritrovamenti in ${esito.letti} ${dove}.`);
  for (const r of esito.ritrovamenti) {
    console.error(`  ${r.file}:${r.riga}:${r.colonna}  ${r.tipo} (${r.lunghezza} caratteri)`);
  }
  console.error('Il repository è pubblico: niente percorsi del server e niente dati veri.'
    + ' Togli il dato dal file (vive nella configurazione sul server, o si inventa) e riprova.');
  process.exit(1);
}

module.exports = {
  cerca, controlla, partitaIvaValida, codiceFiscaleValido, ibanValido,
  carattereControlloFiscale, resto97, LUNGHEZZA_IBAN,
};

if (require.main === module) principale();
