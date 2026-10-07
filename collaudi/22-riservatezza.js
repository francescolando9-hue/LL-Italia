// Riservatezza: niente percorsi del server e niente dati veri nel repository,
// che è pubblico. Decisione di Francesco del 07/10/2026.
//
// Prova tre cose, e la terza è quella che conta:
//
//  1. il repository di oggi è pulito — con il numero dei file letti, perché
//     «niente da segnalare» su zero file letti non prova niente;
//  2. lo scanner (`collaudi/riservatezza.js`) RICONOSCE i casi veri e NON
//     blocca quelli che solo gli somigliano: un numero di undici cifre
//     qualsiasi non è una partita IVA, `Interrato\P-1\` non è un percorso di
//     rete, «su `L:`» non è un percorso;
//  3. l'hook prima del commit BLOCCA davvero, in un repository usa e getta:
//     un commit con un percorso UNC, uno con un percorso su L:, uno con una
//     partita IVA non passano; uno pulito sì; e conta quello che c'è in stage,
//     non la copia di lavoro.
//
// **Nessun valore vero qui dentro.** I percorsi hanno nomi inventati
// («macchinafinta», «condivisa»), e i numeri sono inventati con la cifra di
// controllo CALCOLATA qui, con un'implementazione scritta a parte da quella
// dello scanner: se le due sbagliassero allo stesso modo il collaudo
// passerebbe lo stesso, ma due errori identici scritti in due modi diversi
// sono molto meno probabili di uno. Gli algoritmi dello scanner sono stati
// provati anche sugli esempi di scuola pubblici (codice fiscale, IBAN), che
// qui non si scrivono perché sarebbero dati di persone possibili.
//
// I valori si compongono a pezzi, a runtime: scritti per intero, questo file
// verrebbe bloccato dal controllo che prova.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const scanner = require('./riservatezza');

const RADICE = path.join(__dirname, '..');
const BS = '\\';

// --- Oracoli: le cifre di controllo, scritte a parte -------------------------

function cifraPartitaIva(primeDieci) {
  const doppi = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]; // 2·c, ridotto a una cifra
  const somma = [...primeDieci].reduce((s, c, i) => s + (i % 2 ? doppi[Number(c)] : Number(c)), 0);
  return String((10 - (somma % 10)) % 10);
}

function carattereFiscale(primi15) {
  const dispari = '1 0 5 7 9 13 15 17 19 21 2 4 18 20 11 3 6 8 12 14 16 10 22 25 24 23'.split(' ').map(Number);
  const indice = c => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65);
  const somma = [...primi15].reduce((s, c, i) => s + (i % 2 ? indice(c) : dispari[indice(c)]), 0);
  return String.fromCharCode(65 + (somma % 26));
}

function controlloIban(paese, conto) {
  const numero = [...`${conto}${paese}00`].map(c => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join('');
  return String(98n - (BigInt(numero) % 97n)).padStart(2, '0');
}

// --- I casi, inventati ----------------------------------------------------------

const pivaCorpo = '9876543' + '001';
const PIVA = pivaCorpo + cifraPartitaIva(pivaCorpo);
const PIVA_SBAGLIATA = pivaCorpo + String((Number(cifraPartitaIva(pivaCorpo)) + 1) % 10);
const pivaUfficioFuori = '9876543' + '500';
const PIVA_UFFICIO_INESISTENTE = pivaUfficioFuori + cifraPartitaIva(pivaUfficioFuori);

const cfCorpo = 'ZZZZZZ' + '99' + 'A' + '01' + 'Z' + '999';
const CF = cfCorpo + carattereFiscale(cfCorpo);
const CF_SBAGLIATO = cfCorpo + String.fromCharCode(65 + ((CF.charCodeAt(15) - 65 + 1) % 26));
// Omocodia: V vale 9, M vale 1. Stessa persona inventata, cifre in lettere.
const cfOmocodico = 'ZZZZZZ' + 'VV' + 'A' + '0M' + 'Z' + '999';
const CF_OMOCODICO = cfOmocodico + carattereFiscale(cfOmocodico);

const contoIt = 'Z' + '99999' + '99999' + '000000000001';
const IBAN = 'IT' + controlloIban('IT', contoIt) + contoIt;
const IBAN_A_GRUPPI = IBAN.match(/.{1,4}/g).join(' ');
const IBAN_SBAGLIATO = 'IT' + String((Number(controlloIban('IT', contoIt)) + 1) % 100).padStart(2, '0') + contoIt;

const UNC = `${BS}${BS}macchinafinta${BS}condivisa${BS}Cartella`;
const UNC_JS = `${BS.repeat(4)}macchinafinta${BS.repeat(2)}condivisa`;
const UNC_SOLO_NOME = `${BS}${BS}macchinafinta`;
const SU_L = 'L:' + BS + 'Cartella' + BS + 'documento.pdf';
const SU_L_JS = 'L:' + BS + BS + 'Cartella';
const SU_A = 'a:' + BS + 'archivio';

const DEVE_TROVARE = [
  ['percorso UNC', `vedi ${UNC} per i dettagli`, 'percorso UNC'],
  ['percorso UNC scritto in una stringa JS', `const p = '${UNC_JS}';`, 'percorso UNC'],
  ['percorso UNC col solo nome della macchina', `apri ${UNC_SOLO_NOME}`, 'percorso UNC'],
  ['percorso su L:', `il file sta in ${SU_L}`, 'percorso su unità mappata (L: o A:)'],
  ['percorso su L: scritto in una stringa JS', `'${SU_L_JS}'`, 'percorso su unità mappata (L: o A:)'],
  ['percorso su A:, minuscolo', `(${SU_A})`, 'percorso su unità mappata (L: o A:)'],
  ['partita IVA', `P.IVA ${PIVA}.`, 'partita IVA'],
  ['partita IVA col prefisso IT', `IT${PIVA}`, 'partita IVA'],
  ['codice fiscale', `CF: ${CF}`, 'codice fiscale'],
  ['codice fiscale in minuscolo', `cf ${CF.toLowerCase()}`, 'codice fiscale'],
  ['codice fiscale omocodico', `CF: ${CF_OMOCODICO}`, 'codice fiscale'],
  ['IBAN compatto', `IBAN ${IBAN}`, 'IBAN'],
  ['IBAN a gruppi di quattro', `IBAN: ${IBAN_A_GRUPPI}.`, 'IBAN'],
  ['IBAN seguito da una parola maiuscola', `${IBAN} SNZ2`, 'IBAN'],
];

const NON_DEVE_TROVARE = [
  ['partita IVA con la cifra di controllo sbagliata', `numero ${PIVA_SBAGLIATA}`],
  ['undici cifre con un ufficio che non esiste', `numero ${PIVA_UFFICIO_INESISTENTE}`],
  ['codice fiscale col carattere di controllo sbagliato', `CF: ${CF_SBAGLIATO}`],
  ['IBAN con le cifre di controllo sbagliate', `IBAN ${IBAN_SBAGLIATO}`],
  ['un percorso relativo dentro un testo', `a valle il percorso è Interrato${BS}P-1${BS}`],
  ['lo stesso, scritto in una stringa JS', `'Interrato${BS}${BS}P-1${BS}${BS}'`],
  ['il nome dell\'unità, senza percorso', 'il master vive su `L:`'],
  ['una data-ora di dodici cifre', 'rilascio del 202610070939, nel nome AutomazioneMagazzino202610070939Claude.md'],
  ['un\'impronta SHA-256', '0e736ea7f4c00ae5b597047695048b788df6aa75687713178fe35fe66022f3e6'],
];

// --- Il repository usa e getta per l'hook ---------------------------------------

function esegui(comando, argomenti, cwd) {
  const r = spawnSync(comando, argomenti, { cwd, encoding: 'utf8' });
  return { stato: r.status, uscita: `${r.stdout || ''}${r.stderr || ''}` };
}

function preparaRepositoryDiProva() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'llitalia-riservatezza-'));
  const g = (...a) => esegui('git', a, dir);
  g('init', '-q');
  g('config', 'user.email', 'collaudo@example.invalid');
  g('config', 'user.name', 'Collaudo');
  g('config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'collaudi'));
  fs.mkdirSync(path.join(dir, '.githooks'));
  fs.copyFileSync(path.join(__dirname, 'riservatezza.js'), path.join(dir, 'collaudi', 'riservatezza.js'));
  fs.copyFileSync(path.join(RADICE, '.githooks', 'pre-commit'), path.join(dir, '.githooks', 'pre-commit'));
  fs.chmodSync(path.join(dir, '.githooks', 'pre-commit'), 0o755);
  g('config', 'core.hooksPath', '.githooks');
  return { dir, g };
}

module.exports = {
  nome: 'Riservatezza: niente percorsi del server né dati veri, e l’hook li blocca',

  async esegui({ registro }) {
    registro.titolo('Il repository di oggi è pulito');
    const oggi = scanner.controlla({ radice: RADICE });
    registro.dice('file letti', String(oggi.letti));
    registro.controlla('i file letti sono quelli del repository, non zero',
      oggi.letti >= 50, `${oggi.letti} — «niente da segnalare» su zero file non proverebbe niente`);
    registro.controlla('nessun percorso del server e nessun dato vero',
      oggi.ritrovamenti.length === 0,
      oggi.ritrovamenti.map(r => `${r.file}:${r.riga} ${r.tipo}`).join(' · ') || 'nessuno');

    registro.titolo('Lo scanner riconosce i casi veri, costruiti apposta');
    for (const [descrizione, testo, tipo] of DEVE_TROVARE) {
      const trovati = scanner.cerca(testo);
      registro.controlla(descrizione, trovati.some(t => t.tipo === tipo),
        trovati.map(t => t.tipo).join(', ') || 'non trovato');
    }

    registro.titolo('…e non blocca quello che solo gli somiglia');
    for (const [descrizione, testo] of NON_DEVE_TROVARE) {
      const trovati = scanner.cerca(testo);
      registro.controlla(descrizione, trovati.length === 0,
        trovati.map(t => t.tipo).join(', ') || 'lasciato passare');
    }

    registro.titolo('L’hook prima del commit, in un repository usa e getta');
    const { dir, g } = preparaRepositoryDiProva();
    const commit = messaggio => g('commit', '-q', '-m', messaggio);
    const quantiCommit = () => Number((g('rev-list', '--count', 'HEAD').uscita.trim()) || 0);
    try {
      g('add', '-A');
      let r = commit('Base');
      registro.controlla('un commit pulito passa, e il controllo è girato davvero',
        r.stato === 0 && /file in stage letti, niente da segnalare/.test(r.uscita),
        r.uscita.trim().split('\n')[0]);

      const nota = path.join(dir, 'nota.md');
      const casiBloccati = [
        ['un percorso UNC', `Il file sta in ${UNC}.\n`, 'percorso UNC'],
        ['un percorso su L:', `Il file sta in ${SU_L}.\n`, 'unità mappata'],
        ['una partita IVA', `Fornitore con P.IVA ${PIVA}.\n`, 'partita IVA'],
      ];
      for (const [descrizione, contenuto, parola] of casiBloccati) {
        fs.writeFileSync(nota, contenuto);
        g('add', 'nota.md');
        r = commit(`Prova con ${descrizione}`);
        registro.controlla(`un commit con ${descrizione} NON passa`,
          r.stato !== 0 && r.uscita.includes(parola) && quantiCommit() === 1,
          r.uscita.trim().split('\n').slice(0, 2).join(' / '));
        registro.controlla('e nel messaggio c’è dove, non il valore',
          /nota\.md:1:\d+/.test(r.uscita) && !r.uscita.includes('macchinafinta') && !r.uscita.includes(PIVA),
          'i log di un repository pubblico sono pubblici: stampare il dato vorrebbe dire pubblicarlo');
      }

      // In stage una nota pulita, nella copia di lavoro un percorso: il commit
      // contiene la versione in stage, ed è quella che conta.
      fs.writeFileSync(nota, 'Nota pulita.\n');
      g('add', 'nota.md');
      fs.writeFileSync(nota, `Nota pulita.\nIl file sta in ${UNC}.\n`);
      r = commit('Nota pulita');
      const committato = g('show', 'HEAD:nota.md').uscita;
      registro.controlla('conta quello che è in stage, non la copia di lavoro',
        r.stato === 0 && quantiCommit() === 2 && committato === 'Nota pulita.\n',
        `uscita ${r.stato}, commit ${quantiCommit()}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    registro.titolo('Hook e controllo su GitHub sono al loro posto');
    const hook = path.join(RADICE, '.githooks', 'pre-commit');
    registro.controlla('l’hook esiste ed è eseguibile',
      fs.existsSync(hook) && (fs.statSync(hook).mode & 0o111) !== 0);
    const flusso = fs.readFileSync(path.join(RADICE, '.github', 'workflows', 'riservatezza.yml'), 'utf8');
    registro.controlla('il controllo su GitHub gira su ogni push e su ogni pull request',
      /^\s*push:/m.test(flusso) && /^\s*pull_request:/m.test(flusso));
    registro.controlla('e usa lo stesso scanner, su tutto il repository',
      /node collaudi\/riservatezza\.js\s*$/m.test(flusso));
  },
};
