// Un archivio in memoria con la stessa forma di src/sharepoint.js: serve ai
// collaudi del server (funzioni/collaudi) e a quelli dell'app
// (collaudi/29-segnalazioni.js). Imita anche quello che SharePoint fa da sé:
// l'ID progressivo e la data di modifica.

export function creaMemoria() {
  const segnalazioni = new Map(); // ID → riga
  const interventi = [];
  const allegati = new Map(); // ID → Map(nome → byte)
  let prossimo = 1;
  let prossimoIntervento = 1;
  // `guasto` fa fallire una volta il passo indicato: serve a provare gli invii
  // ripresi dopo un guasto a metà.
  const stato = { guasto: '' };
  const fallisci = passo => {
    if (stato.guasto === passo) { stato.guasto = ''; throw new Error(`guasto simulato: ${passo}`); }
  };

  return {
    stato,
    segnalazioni,
    interventi,
    allegati,
    async cercaIntervento(idClient) {
      fallisci('cercaIntervento');
      return interventi.find(i => i.IdClient === idClient) || null;
    },
    async cercaSegnalazione(idSegnalazione) {
      return [...segnalazioni.values()].find(s => s.IdSegnalazione === idSegnalazione) || null;
    },
    async creaSegnalazione(campi) {
      fallisci('creaSegnalazione');
      const id = prossimo++;
      segnalazioni.set(id, { ...campi, ID: id, Modified: new Date() });
      return id;
    },
    async aggiornaSegnalazione(id, campi) {
      fallisci('aggiornaSegnalazione');
      const riga = segnalazioni.get(id);
      for (const [chiave, valore] of Object.entries(campi)) riga[chiave] = valore;
      riga.Modified = new Date();
    },
    async fotoPresenti(id) {
      return [...(allegati.get(id) || new Map()).keys()];
    },
    async aggiungiFoto(id, nome, byte) {
      fallisci('aggiungiFoto');
      if (!allegati.has(id)) allegati.set(id, new Map());
      if (allegati.get(id).has(nome)) throw new Error('allegato già presente');
      allegati.get(id).set(nome, byte);
    },
    async creaIntervento(campi) {
      fallisci('creaIntervento');
      interventi.push({ ...campi, ID: prossimoIntervento++ });
    },
    async elenco(dal) {
      return [...segnalazioni.values()]
        .filter(s => s.Stato === 'Aperta' || s.Modified >= dal)
        .sort((a, b) => b.ID - a.ID);
    },
    async storia(idSegnalazione) {
      return interventi.filter(i => i.IdSegnalazione === idSegnalazione).sort((a, b) => a.ID - b.ID);
    },
  };
}
