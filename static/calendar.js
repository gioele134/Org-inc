const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const selezionate = new Set();
const confermate = new Set();

const oggi = new Date();
const lunediCorrente = new Date(oggi.setDate(oggi.getDate() - oggi.getDay() + 1));
const primoLunedi = new Date(lunediCorrente);
primoLunedi.setDate(primoLunedi.getDate() + 7);

let settimanaIndex = 0;
let disponibilitaTutte = {};

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
  document.getElementById('contatoreSelezioni').textContent = selezionate.size;
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
      const utenti = disponibilitaTutte[dataStr] || [];

      if (confermate.has(dataStr)) {
        div.classList.add('confermata');
      }

      if (selezionate.has(dataStr)) {
        div.classList.add('selezionato');
      }

      div.addEventListener('click', () => {
        if (selezionate.has(dataStr)) {
          selezionate.delete(dataStr);
        } else {
          selezionate.add(dataStr);
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
  disponibilitaTutte = dati.tutte;
  dati.confermate.forEach(d => confermate.add(d));

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
    const nuove = [];
    const daRimuovere = [];

    for (let data of selezionate) {
      if (!confermate.has(data)) {
        nuove.push(data);
      }
    }

    for (let data of confermate) {
      if (!selezionate.has(data)) {
        daRimuovere.push(data);
      }
    }

    await fetch('/aggiorna_disponibilita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aggiunte: nuove, rimosse: daRimuovere })
    });

    nuove.forEach(d => confermate.add(d));
    daRimuovere.forEach(d => confermate.delete(d));
    selezionate.clear();

    creaGriglia();
    aggiornaContatore();
    mostraToast("Disponibilità aggiornata");
  });

  creaGriglia();
  aggiornaContatore();
});

function mostraToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    toast.remove();
  }, 2500);
}
