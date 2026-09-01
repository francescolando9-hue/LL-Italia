// Modulo Bolle: foto delle bolle di consegna verso il magazzino (capture-only).
export default {
  id: 'bolle',
  titolo: 'Bolle',
  descrizione: 'Foto delle bolle di consegna verso il magazzino',
  icona: '📷',
  registra(registraRotta) {
    registraRotta('#/bolle', vista);
  },
};

function vista(el) {
  el.innerHTML = `
    <section class="scheda">
      <h2>Bolle</h2>
      <p class="tenue">Modulo in costruzione.</p>
    </section>
  `;
}
