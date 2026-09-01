// Configurazione locale di sviluppo — COPIA questo file in core/configurazione.js
// (che è escluso da git) e inserisci i tuoi valori.
//
// Serve SOLO per le prove in locale: l'URL dell'endpoint contiene una firma di
// accesso e non deve mai finire nel repo pubblico. Sul telefono e sull'app
// pubblicata l'endpoint si inserisce invece dalle Impostazioni del modulo Bolle,
// dove vive solo in localStorage del dispositivo.
export default {
  // URL del flow Power Automate. Ricorda: api-version=2024-10-01
  // (quello mostrato dal designer riporta api-version=1 e viene rifiutato con 400).
  endpoint: '',
  token: 'collaudo',
};
