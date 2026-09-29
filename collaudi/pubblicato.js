// Il SITO PUBBLICATO dice la stessa versione del repo?
//
//   node collaudi/pubblicato.js
//
// Perché sta fuori da `esegui.js`. Gli altri collaudi girano su un server
// locale che serve il repo così com'è: provano che il codice è coerente, e
// `02-versione.js` in particolare prova che `sw.js` e `core/versione.js`
// dicono lo stesso numero. Quello che NON possono provare è che quel codice
// sia davvero arrivato su GitHub Pages — e fra «l'ho scritto» e «è in linea»
// ci stanno un merge, una build e qualche minuto.
//
// Questo ha bisogno di rete e di un rilascio già fatto, quindi non può stare
// nella suite che si esegue prima di ogni commit: si lancia DOPO aver unito
// su main, e risponde all'unica domanda che conta in quel momento — «i
// telefoni riceveranno questo numero?».
//
// Tre confronti, e servono tutti e tre:
//   1. sul sito, `sw.js` e `core/versione.js` dicono lo stesso numero
//      (se divergono, il pacchetto scende ma la pagina esegue altro);
//   2. il numero sul sito è quello del repo locale
//      (se no, Pages non ha ancora ricostruito, o il merge non è passato);
//   3. il file che Pages serve non è quello della versione precedente
//      rimasto in cache (si chiede con `cache: no-store`).
const fs = require('fs');
const path = require('path');

const SITO = process.argv[2] || 'https://francescolando9-hue.github.io/LL-Italia';
const RADICE = path.join(__dirname, '..');

const versioneDa = (testo, regola) => {
  const trovata = regola.exec(testo);
  return trovata ? trovata[1] : '';
};
const REGOLA_SW = /const VERSIONE = '([^']+)'/;
const REGOLA_CODICE = /export const VERSIONE_CODICE = '([^']+)'/;

async function scarica(percorso) {
  // `no-store` e un parametro usa-e-getta: senza, si rischia di misurare una
  // copia in cache e dichiarare pubblicato qualcosa che non lo è.
  const indirizzo = `${SITO}/${percorso}?_=${Date.now()}`;
  const risposta = await fetch(indirizzo, { cache: 'no-store' });
  if (!risposta.ok) throw new Error(`${percorso}: HTTP ${risposta.status}`);
  return risposta.text();
}

(async () => {
  const locali = {
    sw: versioneDa(fs.readFileSync(path.join(RADICE, 'sw.js'), 'utf8'), REGOLA_SW),
    codice: versioneDa(fs.readFileSync(path.join(RADICE, 'core/versione.js'), 'utf8'), REGOLA_CODICE),
  };
  console.log('Sito:', SITO);
  console.log(`Nel repo locale:   sw.js ${locali.sw} · core/versione.js ${locali.codice}`);

  let online;
  try {
    online = {
      sw: versioneDa(await scarica('sw.js'), REGOLA_SW),
      codice: versioneDa(await scarica('core/versione.js'), REGOLA_CODICE),
    };
  } catch (errore) {
    console.error('\nNon si è riusciti a leggere il sito:', errore.message);
    console.error('Senza questa lettura non si sa se il rilascio è arrivato: non vale come esito.');
    process.exit(2);
  }
  console.log(`Sul sito pubblicato: sw.js ${online.sw || '—'} · core/versione.js ${online.codice || '—'}`);

  const controlli = [
    ['il sito dichiara un numero in entrambi i file', Boolean(online.sw && online.codice)],
    ['sul sito le due costanti coincidono', online.sw === online.codice],
    ['e sono quelle del repo locale', online.sw === locali.sw && online.codice === locali.codice],
    ['nel repo locale le due costanti coincidono', locali.sw === locali.codice],
  ];
  let falliti = 0;
  console.log('');
  for (const [cosa, esito] of controlli) {
    console.log(`  ${esito ? '✓' : '✗'} ${cosa}`);
    if (!esito) falliti += 1;
  }
  if (falliti > 0) {
    console.log(`\n${falliti} controlli falliti. Se il merge è appena avvenuto, Pages può metterci qualche minuto: riprova prima di concludere.`);
    process.exit(1);
  }
  console.log(`\nIn linea la ${online.sw}. I telefoni la prendono al primo avvio, e serve un ricarico per eseguirla.`);
})();
