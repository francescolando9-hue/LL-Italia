// Configurazione trasferibile del modulo Foto cantiere: solo i testi e le
// impostazioni del modulo. Il meccanismo vive nella shell, in
// `core/configurazione-link.js`.
//
// Serve prima di distribuire l'app agli operai: l'indirizzo del flow è lungo e
// firmato, e digitarlo a mano su ogni telefono è un'ora di diagnosi appena
// qualcuno sbaglia un carattere. Endpoint e token di questo modulo sono diversi
// da quelli delle bolle, quindi il link è un altro: sono due destinazioni.
import { configurazioneTrasferibile } from '../../core/configurazione-link.js';
import { impostazioniFoto, salvaImpostazioniFoto, normalizzaEndpoint } from './impostazioni.js';

const { linkConfigurazione, vistaConfigura, vistaCondividi } = configurazioneTrasferibile({
  rotta: '#/foto',
  etichettaModulo: 'Foto cantiere',
  frasePresentazione: 'Il link contiene l\'indirizzo dell\'ufficio e il codice di accesso. Applicandolo, questo telefono potrà inviare le foto di cantiere.',
  fraseFatto: 'Puoi iniziare a mandare le foto. Se ti viene chiesto nome e cognome, è la prima volta: scrivilo e prosegui.',
  fraseAvvisoQr: 'Questo codice contiene il codice di accesso: vale come una password. Mostralo solo a chi deve usare l\'app e non appenderlo in bacheca.',
  impostazioni: impostazioniFoto,
  salva: salvaImpostazioniFoto,
  normalizzaEndpoint,
});

export { linkConfigurazione, vistaConfigura, vistaCondividi };
