// Esegue i collaudi, in fila, e dice se qualcosa non torna.
//
//   node collaudi/esegui.js              tutti
//   node collaudi/esegui.js offline      solo quelli col nome che contiene «offline»
//
// Esce con codice 1 se anche un solo controllo fallisce: serve a poterlo
// mettere davanti a un rilascio senza doverlo leggere a occhio.
const fs = require('fs');
const path = require('path');
const aiuto = require('./aiuto');

const FILTRO = process.argv.slice(2).filter(a => !a.startsWith('-'));

async function principale() {
  if (!fs.existsSync(aiuto.MATERIALE)) {
    console.error('Manca il materiale di prova. Esegui prima:\n  node collaudi/materiale.js');
    process.exit(1);
  }

  const files = fs.readdirSync(__dirname)
    .filter(n => /^\d\d-.*\.js$/.test(n))
    .filter(n => FILTRO.length === 0 || FILTRO.some(f => n.includes(f)))
    .sort();
  if (files.length === 0) { console.error('Nessun collaudo corrisponde a', FILTRO.join(' ')); process.exit(1); }

  // Il server dell'app si spegne e si riaccende: il collaudo offline lo
  // spegne apposta, ed è l'unico modo onesto di provarlo.
  let statico = await aiuto.avviaStatico();
  const app = {
    get indirizzo() { return statico.indirizzo; },
    chiudi: () => statico.chiudi(),
    riavvia: async () => { statico = await aiuto.avviaStatico(); },
  };
  const flow = await aiuto.avviaFlow();
  const browser = await aiuto.apriBrowser();

  const esiti = [];
  for (const file of files) {
    const collaudo = require(path.join(__dirname, file));
    const registro = aiuto.creaRegistro(collaudo.nome);
    console.log(`\n${'='.repeat(70)}\n${file} — ${collaudo.nome}`);
    if (collaudo.descrizione) console.log(collaudo.descrizione);
    const avvio = Date.now();
    try {
      flow.azzera();
      flow.stato.stato = 200;
      flow.stato.risposte = null;
      await collaudo.esegui({ browser, app, flow, registro, aiuto });
      esiti.push({ file, falliti: registro.falliti, secondi: (Date.now() - avvio) / 1000 });
    } catch (errore) {
      console.log(`   ✗ ESPLOSO — ${errore.message}`);
      esiti.push({ file, falliti: registro.falliti + 1, secondi: (Date.now() - avvio) / 1000, errore: errore.message });
    }
    // Un collaudo può aver spento il server: si rimette in piedi per il
    // prossimo, altrimenti il guasto si propaga e la diagnosi si confonde.
    try { await fetch(app.indirizzo + '/index.html'); } catch { await app.riavvia(); }
  }

  await browser.close();
  await flow.chiudi();
  try { await app.chiudi(); } catch { /* già chiuso da un collaudo */ }

  console.log(`\n${'='.repeat(70)}\nRIEPILOGO`);
  let falliti = 0;
  for (const e of esiti) {
    falliti += e.falliti;
    console.log(`  ${e.falliti === 0 ? '✓' : `✗ ${e.falliti} controlli falliti`}  ${e.file}  (${e.secondi.toFixed(1)}s)`
      + (e.errore ? ` — ${e.errore}` : ''));
  }
  console.log(falliti === 0 ? '\nTutto a posto.' : `\n${falliti} controlli falliti.`);
  process.exit(falliti === 0 ? 0 : 1);
}

principale().catch(e => { console.error('FALLITO:', e.stack || e.message); process.exit(1); });
