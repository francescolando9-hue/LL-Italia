// Configurazione trasferibile del modulo Segnalazioni: qui solo i testi e le
// impostazioni. Il meccanismo — link nell'hash, QR, applicazione sul telefono
// che riceve — vive nella shell (`core/configurazione-link.js`). Questo modulo
// ha due indirizzi invece di uno: il secondo, quello dell'elenco, viaggia nel
// link accanto al primo.
import { configurazioneTrasferibile } from '../../core/configurazione-link.js';
import { impostazioniSegnalazioni, salvaImpostazioniSegnalazioni, normalizzaEndpoint } from './impostazioni.js';

const { linkConfigurazione, vistaConfigura, vistaCondividi } = configurazioneTrasferibile({
  rotta: '#/segnalazioni',
  etichettaModulo: 'Segnalazioni',
  frasePresentazione: 'Il link contiene i due indirizzi delle segnalazioni e il codice di accesso. Applicandolo, questo telefono potrà vedere le segnalazioni e mandarle.',
  fraseFatto: 'Puoi aprire il modulo Segnalazioni: quelle che toccano a te compaiono anche in cima all\'app.',
  fraseAvvisoQr: 'Questo codice contiene il codice di accesso alle segnalazioni: vale come una password. Mostralo solo a chi deve usare l\'app e non appenderlo in bacheca.',
  impostazioni: impostazioniSegnalazioni,
  salva: salvaImpostazioniSegnalazioni,
  normalizzaEndpoint,
  secondoEndpoint: 'endpointElenco',
});

export { linkConfigurazione, vistaConfigura, vistaCondividi };
