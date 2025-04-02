const giorniSettimana = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
let settimanaCorrente = 0;
let selezionate = new Set();
let confermate = new Set();
let mappaDisponibilita = {};

document.addEventListener("DOMContentLoaded", async () => {
  await caricaDati();
  aggiornaSettimana();
  document.getElementById("prevBtn").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextBtn").addEventListener("click", () => cambiaSettimana(1));
  document.getElementById("inviaBtn").addEventListener("click", inviaSelezioni);
});

async function caricaDati() {
  const res = await fetch("/dati_disponibilita");
  const dati = await res.json();
  confermate = new Set(dati.confermate);
  mappaDisponibilita = dati.tutte;
}

function cambiaSettimana(differenza) {
  const nuovaSettimana = settimanaCorrente + differenza;
  if (nuovaSettimana >= 0 && nuovaSettimana <= 3) {
    settimanaCorrente = nuovaSettimana;
    aggiornaSettimana();
  }
}

function aggiornaSettimana() {
  const griglia = document.getElementById("griglia");
  griglia.innerHTML = "";
  selezionate.clear();
  aggiornaContatore();

  const oggi = new Date();
  const lunedi = new Date(oggi.setDate(oggi.getDate() - oggi.getDay() + 1 + settimanaCorrente * 7));

  document.getElementById("titoloSettimana").textContent = `Settimana ${settimanaCorrente + 1}`;

  for (let i = 0; i < 6; i++) {
    const giorno = new Date(lunedi);
    giorno.setDate(lunedi.getDate() + i);
    const dataISO = giorno.toISOString().split('T')[0];
    const label = `${giorniSettimana[giorno.getDay()]} ${String(giorno.getDate()).padStart(2, '0')}`;

    const div = document.createElement("div");
    div.classList.add("giorno");

    if (confermate.has(dataISO)) {
      div.classList.add("confermata");
    } else {
      div.addEventListener("click", () => toggleSelezione(div, dataISO));
    }

    const etichetta = document.createElement("div");
    etichetta.classList.add("etichetta");
    etichetta.textContent = label;

    const conteggio = document.createElement("div");
    conteggio.classList.add("conteggio");
    conteggio.textContent = (mappaDisponibilita[dataISO] || []).length;

    div.appendChild(etichetta);
    div.appendChild(conteggio);
    griglia.appendChild(div);
  }

  // Domenica
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  const domLabel = `DOMENICA ${String(domenica.getDate()).padStart(2, '0')}`;

  const divDom = document.createElement("div");
  divDom.classList.add("domenica");
  divDom.textContent = domLabel;
  griglia.appendChild(divDom);
}

function toggleSelezione(div, data) {
  if (selezionate.has(data)) {
    selezionate.delete(data);
    div.classList.remove("selezionato");
  } else {
    selezionate.add(data);
    div.classList.add("selezionato");
  }
  aggiornaContatore();
}

function aggiornaContatore() {
  document.getElementById("contatoreSelezioni").textContent = selezionate.size;
}

async function inviaSelezioni() {
  if (selezionate.size === 0) return;

  const res = await fetch("/aggiorna_disponibilita", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aggiunte: [...selezionate] })
  });

  if (res.ok) {
    mostraToast("Disponibilità aggiornata");
    await caricaDati();
    aggiornaSettimana();
  }
}

function mostraToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.classList.add("toast");
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
