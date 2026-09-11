// Configurazione trasferibile del modulo Bolle: qui stanno solo i testi e le
// impostazioni del modulo. Il meccanismo — link nell'hash, QR, applicazione sul
// telefono che riceve — vive nella shell, in `core/configurazione-link.js`,
// perché è identico per ogni modulo.
import { configurazioneTrasferibile } from '../../core/configurazione-link.js';
import { impostazioniBolle, salvaImpostazioniBolle, normalizzaEndpoint } from './impostazioni.js';

const { linkConfigurazione, vistaConfigura, vistaCondividi } = configurazioneTrasferibile({
  rotta: '#/bolle',
  etichettaModulo: 'Bolle',
  frasePresentazione: 'Il link contiene l\'indirizzo del magazzino e il codice di accesso. Applicandolo, questo telefono potrà inviare le bolle.',
  fraseFatto: 'Puoi iniziare a mandare le bolle. Se ti viene chiesto nome e cognome, è la prima volta: scrivilo e prosegui.',
  fraseAvvisoQr: 'Questo codice contiene il codice di accesso al magazzino: vale come una password. Mostralo solo a chi deve usare l\'app e non appenderlo in bacheca.',
  impostazioni: impostazioniBolle,
  salva: salvaImpostazioniBolle,
  normalizzaEndpoint,
  // La modalità di prova va spenta su un telefono che viene configurato per il
  // cantiere: accesa, l'app darebbe per inviate bolle che non partono.
  extraDaSalvare: { mock: false },
});

export { linkConfigurazione, vistaConfigura, vistaCondividi };
