// Fotocamera dentro l'app, per scattare più foto di fila senza uscire.
//
// Perché esiste: `<input type="file" capture>` passa il controllo alla
// fotocamera di SISTEMA, che dopo ogni scatto torna al browser. Per una bolla
// su tre fogli significa entrare e uscire tre volte, e chi ha poca
// dimestichezza si perde. Qui la fotocamera è dentro la pagina: si scatta, la
// miniatura si accoda in basso, si scatta ancora, e alla fine si conferma —
// come in WhatsApp.
//
// Resta un compromesso da conoscere: `getUserMedia` dà il flusso video della
// fotocamera, non la foto elaborata dall'app di sistema (HDR, multiscatto,
// messa a fuoco assistita). Su alcuni telefoni la risoluzione è inferiore a
// quella dello scatto nativo. Per questo la fotocamera di sistema resta
// raggiungibile in un tocco: su una bolla poco leggibile è l'alternativa.

// Si chiede il massimo: il browser concede quello che può, e la risoluzione
// ottenuta viene riportata a chi chiama per poterla misurare.
const RISOLUZIONE = { width: { ideal: 4096 }, height: { ideal: 3072 } };

const VINCOLI = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, ...RISOLUZIONE },
};

const QUALITA_SCATTO = 0.92;

// --- Quale obiettivo -------------------------------------------------------
//
// `facingMode: environment` dice al browser «una fotocamera posteriore», e su
// un telefono che ne ha tre il browser sceglie lui — e su diversi Android
// sceglie l'ultra-grandangolare. Inquadra tutto il foglio, ma distorce: la
// fotocamera di sistema su quella lente applica una correzione software, il
// flusso che arriva qui è quello grezzo. Misurato in cantiere il 14/09/2026.
//
// Il browser non dice la focale di una fotocamera. Quello che dice è il nome,
// e i nomi seguono due convenzioni: su Android Chrome «camera2 0, facing
// back», «camera2 2, facing back»… dove la principale è di norma la 0; su
// iPhone il nome della lente per esteso («Back Camera», «Back Ultra Wide
// Camera», «Back Telephoto Camera»). Con queste due regole — scarta le lenti
// che si dichiarano ultra/wide/tele/macro, e fra le altre prendi quella col
// numero più basso e il nome più corto — si prende la principale su tutti i
// telefoni che seguono una delle due convenzioni, senza sapere il modello.
//
// Dove i nomi non dicono niente si lascia fare al browser, come prima: non
// c'è nessuna configurazione per modello da tenere aggiornata, e la
// fotocamera di sistema resta a un tocco come via d'uscita. Quello che l'app
// ha visto e scelto finisce nella pagina Informazioni, così se su un telefono
// la scelta è sbagliata lo si legge lì invece di chiederlo all'operatore.
const CHIAVE_DIAGNOSTICA = 'llitalia.fotocamera';
const POSTERIORE = /\b(back|rear|environment)\b|posteriore|retro/i;
const ANTERIORE = /\b(front|user)\b|anteriore|frontale|selfie/i;
// Lenti da non usare per un foglio: distorcono o inquadrano troppo poco.
const DA_EVITARE = /ultra|wide|grandang|tele|macro|depth|profond|bokeh|infra/i;
// Fotocamere «composte» (più lenti fuse in una): funzionano, ma la singola
// principale è più prevedibile.
const COMPOSTE = /dual|doppia|triple|tripla|quad/i;

// Sceglie fra le fotocamere elencate quella con cui fotografare un foglio.
// Pura, senza browser: è quella che il collaudo prova con gli elenchi di
// nomi dei telefoni veri. Restituisce `{ scelto, motivo }`; `scelto` è null
// quando i nomi non permettono di scegliere.
export function scegliObiettivo(dispositivi) {
  const conNome = (dispositivi || [])
    .filter(d => d && d.kind === 'videoinput' && d.label && d.deviceId);
  if (conNome.length === 0) return { scelto: null, motivo: 'nessuna fotocamera con un nome leggibile' };
  const posteriori = conNome.filter(d => POSTERIORE.test(d.label) && !ANTERIORE.test(d.label));
  if (posteriori.length === 0) return { scelto: null, motivo: 'nessun nome dice quale sia la posteriore' };
  if (posteriori.length === 1) return { scelto: posteriori[0], motivo: 'unica posteriore' };
  const ordinate = posteriori
    .map(d => ({
      dispositivo: d,
      penalita: DA_EVITARE.test(d.label) ? 2 : COMPOSTE.test(d.label) ? 1 : 0,
      indice: primoNumero(d.label),
    }))
    .sort((a, b) => a.penalita - b.penalita
      || a.indice - b.indice
      || a.dispositivo.label.length - b.dispositivo.label.length);
  const prima = ordinate[0];
  return {
    scelto: prima.dispositivo,
    motivo: prima.penalita === 2
      ? 'tutte le posteriori si dichiarano grandangolari o tele: presa la prima'
      : `principale fra ${posteriori.length} posteriori`,
  };
}

// L'indice della fotocamera nel nome Android «camera2 N, facing back». Il
// «2» di camera2 è parte del nome dell'API, non un indice: preso per tale,
// tutte le posteriori risultavano la numero 2 e vinceva la prima in elenco —
// cioè quella che il browser aveva già scelto, l'ultra-grandangolare.
// Trovato dal collaudo con l'elenco di un Samsung.
function primoNumero(testo) {
  const android = /camera2\s+(\d+)/i.exec(testo);
  if (android) return Number(android[1]);
  const numeri = String(testo).match(/\d+/g);
  return numeri ? Number(numeri[numeri.length - 1]) : 0;
}

// Apre la posteriore come fa il browser, poi — se i nomi permettono di fare
// meglio — passa alla principale. Gli errori della prima apertura (permesso
// negato, nessuna fotocamera) salgono a chi chiama; da lì in poi niente può
// far fallire l'apertura: nel dubbio si tiene il flusso che c'è.
async function apriPosteriore() {
  let flusso = await navigator.mediaDevices.getUserMedia(VINCOLI);
  const diagnostica = { quando: new Date().toISOString(), rilevate: [], inUso: '', esito: '' };
  try {
    const traccia = flusso.getVideoTracks()[0];
    const attuale = traccia && typeof traccia.getSettings === 'function' ? traccia.getSettings() : {};
    // Le etichette si leggono solo DOPO un permesso concesso: per questo
    // l'elenco viene qui e non prima della prima apertura.
    const dispositivi = typeof navigator.mediaDevices.enumerateDevices === 'function'
      ? (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
      : [];
    diagnostica.rilevate = dispositivi.map(d => d.label || '(senza nome)');
    const nomeAttuale = (dispositivi.find(d => d.deviceId === attuale.deviceId) || {}).label
      || (traccia && traccia.label) || '(senza nome)';
    const { scelto, motivo } = scegliObiettivo(dispositivi);
    if (!scelto) {
      diagnostica.inUso = nomeAttuale;
      diagnostica.esito = `scelta lasciata al browser: ${motivo}`;
    } else if (scelto.deviceId === attuale.deviceId) {
      diagnostica.inUso = scelto.label;
      diagnostica.esito = `${motivo}, già aperta dal browser`;
    } else {
      try {
        const migliore = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: scelto.deviceId }, ...RISOLUZIONE },
        });
        fermaFlusso(flusso);
        flusso = migliore;
        diagnostica.inUso = scelto.label;
        diagnostica.esito = `${motivo}, scelta dall'app (il browser aveva aperto «${nomeAttuale}»)`;
      } catch (errore) {
        diagnostica.inUso = nomeAttuale;
        diagnostica.esito = `la principale «${scelto.label}» non si è aperta (${errore.name || 'errore'}): tenuta quella del browser`;
      }
    }
    await zoomNormale(flusso, diagnostica);
  } catch (errore) {
    diagnostica.esito = `diagnosi non riuscita: ${errore.message}`;
  }
  salvaDiagnostica(diagnostica);
  return flusso;
}

// Seconda causa possibile dello stesso sintomo: una fotocamera «logica» che
// fonde più lenti e parte con zoom sotto 1, cioè sull'ultra-grandangolare.
// Dove il browser espone lo zoom, 1 è la lente principale: si chiede quello.
// Dove non lo espone, o è già ≥ 1, non si tocca niente.
async function zoomNormale(flusso, diagnostica) {
  const traccia = flusso.getVideoTracks()[0];
  if (!traccia || typeof traccia.getCapabilities !== 'function') return;
  const capacita = traccia.getCapabilities() || {};
  const impostazioni = traccia.getSettings() || {};
  if (!capacita.zoom || typeof impostazioni.zoom !== 'number') return;
  if (impostazioni.zoom >= 1 || !(capacita.zoom.max >= 1)) return;
  try {
    await traccia.applyConstraints({ advanced: [{ zoom: 1 }] });
    diagnostica.zoom = `da ${impostazioni.zoom} a 1`;
  } catch {
    diagnostica.zoom = `a ${impostazioni.zoom}, non modificabile`;
  }
}

function fermaFlusso(flusso) {
  for (const traccia of flusso.getTracks()) traccia.stop();
}

function salvaDiagnostica(diagnostica) {
  try {
    localStorage.setItem(CHIAVE_DIAGNOSTICA, JSON.stringify(diagnostica));
  } catch {
    // Senza spazio per la diagnostica si fotografa lo stesso.
  }
}

// Cosa l'app ha visto e scelto l'ultima volta che ha aperto la fotocamera:
// lo mostra la pagina Informazioni. `null` se non è mai stata aperta.
export function diagnosticaFotocamera() {
  try {
    const letta = JSON.parse(localStorage.getItem(CHIAVE_DIAGNOSTICA));
    return letta && typeof letta === 'object' ? letta : null;
  } catch {
    return null;
  }
}

export function fotocameraDisponibile() {
  return Boolean(
    window.isSecureContext
    && navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

// Apre la fotocamera e risolve con gli scatti fatti, in ordine.
// Array vuoto = l'utente ha annullato. In caso di permesso negato o
// fotocamera non disponibile solleva un errore con un messaggio leggibile:
// chi chiama deve poter ripiegare sulla fotocamera di sistema.
export async function apriFotocamera(opzioni = {}) {
  const titolo = opzioni.titolo || 'Scatta';
  const suggerimento = opzioni.suggerimento || '';
  if (!fotocameraDisponibile()) {
    throw new Error('Questo telefono non consente la fotocamera dentro l’app');
  }

  let flusso;
  try {
    flusso = await apriPosteriore();
  } catch (errore) {
    // NotAllowedError = permesso negato; NotFoundError = nessuna fotocamera.
    throw new Error(errore && errore.name === 'NotAllowedError'
      ? 'Permesso per la fotocamera negato: usa la fotocamera del telefono'
      : 'Fotocamera non disponibile: usa la fotocamera del telefono');
  }

  const strato = document.createElement('div');
  strato.className = 'fotocamera';
  strato.innerHTML = `
    <div class="fotocamera-testata">
      <button type="button" class="fotocamera-chiudi" aria-label="Chiudi">&#10005;</button>
      <span class="fotocamera-titolo"></span>
      <span class="fotocamera-conta" aria-live="polite"></span>
    </div>
    <video class="fotocamera-video" playsinline muted autoplay></video>
    <p class="fotocamera-suggerimento"></p>
    <p class="fotocamera-avviso"></p>
    <div class="fotocamera-rullino"></div>
    <div class="fotocamera-comandi">
      <button type="button" class="btn btn-successo fotocamera-fine" disabled>Fine</button>
      <button type="button" class="fotocamera-scatta" aria-label="Scatta"><span></span></button>
      <span class="fotocamera-spazio" aria-hidden="true"></span>
    </div>
  `;
  strato.querySelector('.fotocamera-titolo').textContent = titolo;
  strato.querySelector('.fotocamera-suggerimento').textContent = suggerimento;
  document.body.appendChild(strato);
  document.body.classList.add('senza-scorrimento');

  const video = strato.querySelector('.fotocamera-video');
  const rullino = strato.querySelector('.fotocamera-rullino');
  const conta = strato.querySelector('.fotocamera-conta');
  const fine = strato.querySelector('.fotocamera-fine');
  const scatta = strato.querySelector('.fotocamera-scatta');
  const avvisoScatto = strato.querySelector('.fotocamera-avviso');
  const suggerimentoElemento = strato.querySelector('.fotocamera-suggerimento');
  video.srcObject = flusso;
  // Il pulsante nasce spento: chi tocca subito troverebbe un video senza
  // ancora dimensioni, e lo scatto uscirebbe vuoto.
  scatta.disabled = true;
  suggerimentoElemento.textContent = 'Attendo la fotocamera…';

  const scatti = [];
  const miniature = [];

  const aggiornaConta = () => {
    conta.textContent = scatti.length === 0 ? '' : `${scatti.length}`;
    fine.disabled = scatti.length === 0;
    fine.textContent = scatti.length === 0
      ? 'Fine'
      : scatti.length === 1 ? 'Fine · 1 foto' : `Fine · ${scatti.length} foto`;
  };
  aggiornaConta();

  // `loadeddata` non basta: le dimensioni del fotogramma arrivano dopo, e
  // fino a quel momento un canvas costruito su di esse sarebbe 0 x 0.
  // Verificato in collaudo: senza questa attesa il primo scatto va perso.
  const pronta = await attendiDimensioni(video);
  // Risoluzione realmente concessa dal browser: serve a sapere se lo scatto
  // interno regge il confronto con quello di sistema, invece di sperarlo.
  const risoluzione = { larghezza: video.videoWidth, altezza: video.videoHeight };
  suggerimentoElemento.textContent = pronta
    ? suggerimento
    : 'La fotocamera non manda immagini: usa la fotocamera del telefono.';
  scatta.disabled = !pronta;

  const chiudi = () => {
    for (const traccia of flusso.getTracks()) traccia.stop();
    video.srcObject = null;
    for (const url of miniature) URL.revokeObjectURL(url);
    strato.remove();
    document.body.classList.remove('senza-scorrimento');
  };

  return new Promise(risolvi => {
    scatta.addEventListener('click', async () => {
      // Guardia: se il fotogramma non c'è, meglio dirlo che salvare un vuoto.
      if (!video.videoWidth || !video.videoHeight) {
        avvisoScatto.textContent = 'Fotocamera non ancora pronta: riprova tra un istante.';
        return;
      }
      scatta.disabled = true;
      avvisoScatto.textContent = '';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const blob = await new Promise((ok, no) => canvas.toBlob(
          b => b ? ok(b) : no(new Error('Scatto non riuscito')), 'image/jpeg', QUALITA_SCATTO));
        // Il file prende un nome parlante: nei log e nelle diagnosi "blob"
        // non dice da dove arriva la foto.
        const file = new File([blob], `Scatto${scatti.length + 1}.jpg`, { type: 'image/jpeg' });
        scatti.push(file);
        const url = URL.createObjectURL(blob);
        miniature.push(url);
        const miniatura = document.createElement('img');
        miniatura.src = url;
        miniatura.alt = `Scatto ${scatti.length}`;
        rullino.appendChild(miniatura);
        rullino.scrollLeft = rullino.scrollWidth;
        aggiornaConta();
      } catch (errore) {
        // Uno scatto perso in silenzio è peggio di uno scatto rifatto.
        avvisoScatto.textContent = `Scatto non riuscito: ${errore.message}. Riprova.`;
      } finally {
        scatta.disabled = false;
      }
    });

    fine.addEventListener('click', () => {
      chiudi();
      risolvi({ file: scatti, risoluzione });
    });

    strato.querySelector('.fotocamera-chiudi').addEventListener('click', () => {
      // Annullare butta gli scatti: si chiede conferma solo se ce ne sono.
      if (scatti.length > 0
        && !window.confirm(`Chiudere senza usare ${scatti.length === 1 ? 'la foto scattata' : `le ${scatti.length} foto scattate`}?`)) {
        return;
      }
      chiudi();
      risolvi({ file: [], risoluzione });
    });
  });
}

// Attende che il video abbia dimensioni reali. Non esiste un evento
// affidabile su tutti i browser: si guarda il valore, fotogramma dopo
// fotogramma, con un tetto di attesa perché una fotocamera che non parte non
// deve bloccare l'operatore davanti a una schermata nera.
function attendiDimensioni(video, millisecondiMassimi = 8000) {
  return new Promise(risolvi => {
    const scadenza = Date.now() + millisecondiMassimi;
    const controlla = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) { risolvi(true); return; }
      if (Date.now() > scadenza) { risolvi(false); return; }
      requestAnimationFrame(controlla);
    };
    controlla();
  });
}
