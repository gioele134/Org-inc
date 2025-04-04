const giorniSettimana = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
let settimanaCorrente = 0;
let selezionate = {};  // { "2024-04-10": "M" }
let confermate = {};
let mappaDisponibilita = {}; // { "2024-04-10": { M: 2, P: 1 } }
let giorniFestivi = [];

document.addEventListener("DOMContentLoaded", async () => {
  await caricaFestivi();
  await caricaDati();
  aggiornaSettimana();
  document.getElementById("prevBtn").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextBtn").addEventListener("click", () => cambiaSettimana(1));
  document.getElementById("inviaBtn").addEventListener("click", inviaSelezioni);
});

async function caricaDati() {
  const res = await fetch("/dati_disponibilita_turni");
  const dati = await res.json();
  confermate = dati.confermate || {};
  mappaDisponibilita = dati.tutte || {};
}

function cambiaSettimana(differenza) {
  const nuova = settimanaCorrente + differenza;
  if (nuova >= 0 && nuova < 5) {
    settimanaCorrente = nuova;
    aggiornaSettimana();
  }
}

function aggiornaSettimana() {
  const griglia = document.getElementById("griglia");
  griglia.innerHTML = "";
  aggiornaContatore();

  const oggi = new Date();
  const giornoSettimana = oggi.getDay();
  const diff = giornoSettimana === 0 ? -6 : 1 - giornoSettimana;
  const lunediCorrente = new Date(oggi);
  lunediCorrente.setDate(oggi.getDate() + diff);

  const lunedi = new Date(lunediCorrente);
  lunedi.setDate(lunedi.getDate() + 7 * (settimanaCorrente + 1));

  const domenica = new Date(lunedi);
  domenica.setDate(domenica.getDate() + 6);
  const range = `${formattaDataBreve(lunedi)} – ${formattaDataBreve(domenica)}`;
  document.getElementById("titoloSettimana").textContent = range;

  for (let i = 0; i < 6; i++) {
    const giorno = new Date(lunedi);
    giorno.setDate(giorno.getDate() + i);
    const dataISO = giorno.toISOString().split("T")[0];
    const label = `${giorniSettimana[giorno.getDay()]} ${String(giorno.getDate()).padStart(2, "0")}`;
    const èFestivo = giorniFestivi.includes(dataISO);

    const div = document.createElement("div");
    div.classList.add("giorno");
    if (èFestivo) div.classList.add("festivo");

    const etichetta = document.createElement("div");
    etichetta.classList.add("etichetta");
    etichetta.textContent = label;

    const turniDiv = document.createElement("div");
    turniDiv.classList.add("turni");

    ["M", "P"].forEach(turno => {
      const btn = document.createElement("button");
      btn.classList.add("turno-btn");
      btn.textContent = turno;

      if (confermate[dataISO] === turno) {
        btn.classList.add("selezionato");
        btn.disabled = true;
      }

      if (selezionate[dataISO] === turno) {
        btn.classList.add("selezionato");
      }

      btn.addEventListener("click", () => {
        if (btn.disabled || èFestivo) return;
        if (selezionate[dataISO] === turno) {
          delete selezionate[dataISO];
        } else {
          selezionate[dataISO] = turno;
        }
        aggiornaSettimana();
      });

      btn.dataset.data = dataISO;
      btn.dataset.turno = turno;
      turniDiv.appendChild(btn);
    });

    const conteggio = document.createElement("div");
    conteggio.classList.add("conteggio");
    const contM = (mappaDisponibilita[dataISO]?.M || 0);
    const contP = (mappaDisponibilita[dataISO]?.P || 0);
    conteggio.textContent = `M: ${contM} / P: ${contP}`;

    div.appendChild(etichetta);
    div.appendChild(turniDiv);
    div.appendChild(conteggio);
    griglia.appendChild(div);
  }

  const dom = new Date(domenica);
  const domLabel = `DOMENICA ${String(dom.getDate()).padStart(2, "0")}`;
  const divDom = document.createElement("div");
  divDom.classList.add("domenica");
  divDom.textContent = domLabel;
  griglia.appendChild(divDom);

  aggiornaContatore();
}

function aggiornaContatore() {
  const totale = Object.values(selezionate).filter(Boolean).length;
  document.getElementById("contatoreSelezioni").textContent = totale;
}

async function inviaSelezioni() {
  const daInviare = Object.entries(selezionate)
    .filter(([_, turno]) => turno)
    .map(([data, turno]) => ({ data, turno }));

  if (daInviare.length === 0) return;

  const res = await fetch("/aggiorna_disponibilita_turni", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selezioni: daInviare })
  });

  if (res.ok) {
    mostraToast("Disponibilità aggiornata");
    selezionate = {};
    await caricaDati();
    aggiornaSettimana();
  }
}

function mostraToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function formattaDataBreve(data) {
  return `${String(data.getDate()).padStart(2, "0")} ${data.toLocaleString("it-IT", { month: "short" })}`;
}

async function caricaFestivi() {
  try {
    const res = await fetch("https://date.nager.at/api/v3/PublicHolidays/2024/IT");
    const json = await res.json();
    giorniFestivi = json.map(f => f.date);
  } catch (e) {
    console.warn("Festivi non disponibili. Continuo senza.");
    giorniFestivi = [];
  }
}
