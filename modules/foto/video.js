// Video del modulo Foto cantiere.
//
// I video si registrano con la fotocamera **di sistema**, non dentro l'app:
// registrare in-app significherebbe MediaRecorder, che produce formati diversi
// fra Android e iOS e non usa l'encoder hardware del telefono. Il video
// dell'app di sistema è migliore, consuma meno batteria e si apre su qualunque
// PC dell'ufficio. Per le foto la fotocamera interna serve a non uscire fra
// uno scatto e l'altro; un video si registra uno per volta, quindi quel
// problema non esiste.
//
// Il video NON si comprime: transcodificare in un browser non è realistico.
// Parte come l'ha prodotto il telefono, e per questo il peso è l'unico vero
// vincolo — vedi il limite nelle impostazioni del modulo.

const ESTENSIONI = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
  'video/x-matroska': 'mkv',
};

export function eVideo(file) {
  return String(file.type || '').startsWith('video/');
}

// Estensione del file: la usa il flow per nominare il file in raccolta.
// Un video salvato come .jpg non si apre, quindi il dato deve viaggiare.
export function estensioneDi(file) {
  const daTipo = ESTENSIONI[file.type];
  if (daTipo) return daTipo;
  const dalNome = String(file.name || '').split('.').pop();
  return dalNome && dalNome.length <= 5 ? dalNome.toLowerCase() : 'mp4';
}

// Primo fotogramma come anteprima, più la durata. Se il browser non decodifica
// il formato si restituisce comunque il video senza anteprima: l'invio non
// deve dipendere dalla riuscita di una miniatura.
export function anteprimaVideo(file) {
  return new Promise(risolvi => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let chiuso = false;
    const finisci = (anteprima, durata) => {
      if (chiuso) return;
      chiuso = true;
      URL.revokeObjectURL(url);
      risolvi({ anteprima, durata });
    };
    // Tetto di attesa: un formato che il browser non digerisce non deve
    // lasciare l'operatore davanti a una rotella che gira.
    const scadenza = setTimeout(() => finisci(null, 0), 6000);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      // Non il fotogramma zero, spesso nero: mezzo secondo dentro.
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const scala = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scala));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scala));
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          clearTimeout(scadenza);
          finisci(blob, Math.round(video.duration || 0));
        }, 'image/jpeg', 0.7);
      } catch {
        clearTimeout(scadenza);
        finisci(null, Math.round(video.duration || 0));
      }
    };
    video.onerror = () => {
      clearTimeout(scadenza);
      finisci(null, 0);
    };
    video.src = url;
  });
}

export function durataLeggibile(secondi) {
  if (!secondi) return '';
  const minuti = Math.floor(secondi / 60);
  const resto = secondi % 60;
  return minuti > 0 ? `${minuti}′${String(resto).padStart(2, '0')}″` : `${resto}″`;
}
