// Caricamento in due fasi, per i file che non stanno in una sola richiesta.
//
// Perché: il contenuto in base64 dentro JSON aggiunge un terzo al peso, e un
// video da 60 MB diventa un corpo da 80 MB — che il flow rifiuta e che su una
// rete di cantiere non arriva comunque. Qui il telefono chiede al flow DOVE
// mettere i byte, li manda a blocchi direttamente a quell'indirizzo, poi
// avvisa il flow che ha finito così può scrivere le colonne.
//
// Tre passaggi, tutti verso lo stesso endpoint del flow, che smista sul campo
// `azione`:
//
//   1. `preparaCaricamento` → il flow risponde con l'indirizzo di caricamento
//      (per esempio una sessione di upload di Microsoft Graph, che accetta PUT
//      a blocchi senza autenticazione) oppure con `{"modo":"inline"}`;
//   2. `PUT` dei blocchi a quell'indirizzo, con `Content-Range`, riprendendo
//      da dove si era interrotto invece di ricominciare da zero;
//   3. `completaCaricamento` → il flow scrive commessa, tipo, nota e le altre
//      colonne sul file appena arrivato. Senza questo passo il file c'è ma è
//      senza metadati, quindi il runbook non saprebbe di chi è.
//
// Se il flow risponde `inline`, o non risponde in modo comprensibile, si torna
// all'invio in una sola richiesta: l'app non deve smettere di funzionare
// perché il flow non è ancora pronto.

// Microsoft Graph vuole blocchi multipli di 320 KiB: un blocco di taglia
// diversa viene rifiutato a metà caricamento, e sarebbe un difetto scoperto
// solo sui file grandi.
const UNITA_BLOCCO = 327680;

export function bloccoValido(byteRichiesti) {
  const blocchi = Math.max(1, Math.floor(byteRichiesti / UNITA_BLOCCO));
  return blocchi * UNITA_BLOCCO;
}

// Fase 1. Restituisce { modo, urlCaricamento, dimensioneBlocco }.
export async function preparaCaricamento(endpoint, corpo) {
  const risposta = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, azione: 'preparaCaricamento' }),
  });
  if (!risposta.ok) {
    throw new Error(`Il flow non ha preparato il caricamento: ${risposta.status}`);
  }
  let dati;
  try {
    dati = await risposta.json();
  } catch {
    // Un flow che non risponde JSON non sa fare le due fasi: si ripiega.
    return { modo: 'inline' };
  }
  if (!dati || !dati.urlCaricamento) return { modo: 'inline' };
  return {
    modo: 'sessione',
    urlCaricamento: dati.urlCaricamento,
    dimensioneBlocco: bloccoValido(Number(dati.dimensioneBlocco) || 10 * 1048576),
  };
}

// Quanti byte il server ha già: serve a riprendere un caricamento interrotto
// invece di rispedire tutto. Microsoft Graph risponde con nextExpectedRanges.
export async function byteGiaCaricati(urlCaricamento) {
  try {
    const risposta = await fetch(urlCaricamento, { method: 'GET' });
    if (!risposta.ok) return null;
    const dati = await risposta.json();
    const intervalli = dati && dati.nextExpectedRanges;
    if (!Array.isArray(intervalli) || intervalli.length === 0) return null;
    const inizio = Number(String(intervalli[0]).split('-')[0]);
    return Number.isFinite(inizio) ? inizio : null;
  } catch {
    return null;
  }
}

// Fase 2. Manda i blocchi e riferisce l'avanzamento; `daByte` permette di
// riprendere. Restituisce la risposta finale del server, se ne dà una.
export async function inviaBlocchi(urlCaricamento, file, dimensioneBlocco, daByte = 0, alProgresso = () => {}) {
  let inizio = daByte;
  let ultimaRisposta = null;
  while (inizio < file.size) {
    const fine = Math.min(inizio + dimensioneBlocco, file.size);
    const blocco = file.slice(inizio, fine);
    const risposta = await fetch(urlCaricamento, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${inizio}-${fine - 1}/${file.size}`,
      },
      body: blocco,
    });
    // 202 = blocco accettato, ne aspetta altri. 200/201 = caricamento chiuso.
    if (risposta.status !== 202 && risposta.status !== 200 && risposta.status !== 201) {
      throw new Error(`Blocco rifiutato dal server: ${risposta.status}`);
    }
    ultimaRisposta = risposta;
    inizio = fine;
    alProgresso(inizio, file.size);
  }
  return ultimaRisposta;
}

// Fase 3. Il flow scrive le colonne sul file arrivato.
export async function completaCaricamento(endpoint, corpo) {
  const risposta = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, azione: 'completaCaricamento' }),
  });
  if (!risposta.ok) {
    // I byte sono arrivati ma le colonne no: è uno stato a metà, e va detto.
    // Il file esiste in raccolta senza metadati, quindi il retry deve
    // ritentare SOLO questo passo, non ricaricare i byte.
    throw new Error(`Byte caricati, ma il flow non ha scritto i dati: ${risposta.status}`);
  }
  return true;
}
