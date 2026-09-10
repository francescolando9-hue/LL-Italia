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

const VINCOLI = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    // Si chiede il massimo: il browser concede quello che può, e la
    // risoluzione ottenuta viene riportata a chi chiama per poterla misurare.
    width: { ideal: 4096 },
    height: { ideal: 3072 },
  },
};

const QUALITA_SCATTO = 0.92;

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
    flusso = await navigator.mediaDevices.getUserMedia(VINCOLI);
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
      <button type="button" class="fotocamera-scatta" aria-label="Scatta"><span></span></button>
      <button type="button" class="btn btn-successo fotocamera-fine" disabled>Fine</button>
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
