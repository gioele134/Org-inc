const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const disponibilita = {};
const selezioniUtente = new Set();

const oggi = new Date();
const lunediCorrente = new Date(oggi.setDate(oggi.getDate() - oggi.getDay() + 1));
const primoLunedi = new Date(lunediCorrente);
primoLunedi.setDate(primoLunedi.getDate() + 7); // settimana successiva

let settimanaIndex = 0;

function formatData(date) {
  return date.toISOString().split('T')[0];
}

function etichettaGiorno(i, data) {
  const numero = String(data.getDate()).padStart(2, '0');
  return `${giorni[i]} ${numero}`;
}

function getLunediSettimana(i) {
  const base = new Date(primoLunedi);
  base.setDate(base.getDate() + (i * 7));
  return base;
}

function aggiornaContatore() {
  document.getElementById('contatoreSelezioni').textContent = selezioniUtente.size;
}

function creaGriglia() {
  const container = document.getElementById('griglia');
  const titolo = document.getElementById('titoloSettimana');
  container.innerHTML = '';

  const lunedi = getLunediSettimana(settimanaIndex);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  titolo.textContent = `Settimana: ${formatData(lunedi)} → ${formatData(domenica)}`;

  for (let i = 0; i < 7; i++) {
    const giornoData = new Date(lunedi);
    giornoData.setDate(lunedi.getDate() + i);
    const dataStr = formatData(giornoData);

    const div = document.createElement('div');
    div.classList.add('giorno');
    div.dataset.data = dataStr;
    div.textContent = etichettaGiorno(i, giornoData);

    if (i === 6) {
      div.classList.add('domenica');
    } else {
      if (disponibilita[dataStr] === 2) {
        div.classList.add('disponibilita-2');
      } else if (disponibilita[dataStr] === 1) {
        div.classList.add('disponibilita-1');
      }

      if (selezioniUtente.has(dataStr)) {
        div.classList.add('selezionato');
      }

      div.addEventListener('click', () => {
        if (selezioniUtente.has(dataStr)) {
          selezioniUtente.delete(dataStr);
        } else {
          selezioniUtente.add(dataStr);
        }

        creaGriglia();
        aggiornaContatore();
      });
    }

    container.appendChild(div);
  }

  document.getElementById('prevBtn').disabled = settimanaIndex === 0;
  document.getElementById('nextBtn').disabled = settimanaIndex === 4;
}

document.addEventListener('DOMContentLoaded', async function () {
  const res = await fetch('/dati_disponibilita');
  const dati = await res.json();
  Object.assign(disponibilita, dati);

  document.getElementById('prevBtn').addEventListener('click', () => {
    if (settimanaIndex > 0) {
      settimanaIndex--;
      creaGriglia();
      aggiornaContatore();
    }
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (settimanaIndex < 4) {
      settimanaIndex++;
      creaGriglia();
      aggiornaContatore();
    }
  });

  document.getElementById('inviaBtn').addEventListener('click', async () => {
    for (let dataStr of selezioniUtente) {
      const count = disponibilita[dataStr] || 0;
      if (count < 2) {
        disponibilita[dataStr] = count + 1;
        await fetch('/aggiorna_disponibilita', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: dataStr,
            disponibilita: disponibilita[dataStr]
          })
        });
      }
    }

    selezioniUtente.clear();
    creaGriglia();
    aggiornaContatore();
    alert("Disponibilità inviate con successo.");
  });

  creaGriglia();
  aggiornaContatore();
});
