const giorniSettimana = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
let settimanaCorrente = 0;
let selezionate = {};  // { "2024-04-10": "M" }
let confermate = {};
let mappaDisponibilita = {}; // { "2024-04-10": { M: 2, P: 1 } }
let giorniFestivi = [];

function getNumeroSettimana(data) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

document.addEventListener("DOMContentLoaded", async () => {
  const anno = new Date().getFullYear();
  await caricaFestivi(anno);
  await caricaDati();
  aggiornaSettimana();
  document.getElementById("prevBtn").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextBtn").addEventListener("click", () => cambiaSettimana(1));
  document.getElementById("inviaBtn").addEventListener("click", inviaSelezioni);
});

async function caricaFestivi(anno) {
  const cacheKey = `festivi-${anno}`;
  const cache = localStorage.getItem(cacheKey);
  if (cache) {
    giorniFestivi = JSON.parse(cache);
    return;
  }

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${anno}/IT`);
    const dati = await res.json();
    giorniFestivi = dati.map(d => d.date);
    localStorage.setItem(cacheKey, JSON.stringify(giorniFestivi));
  } catch (err) {
    console.error("Errore nel caricamento dei festivi:", err);
    giorniFestivi = [];
  }
}

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
  const lunediCorrente = new Date(oggi.setDate(oggi.getDate() - oggi.getDay() + 1));
  const lunedi = new Date(lunediCorrente);
  lunedi.setDate(lunedi.getDate() + 7 * (settimanaCorrente + 1));

  const domenica = new Date(lunedi);
  domenica.setDate(domenica.getDate() + 6);
  const range = `${formattaDataBreve(lunedi)} – ${formattaDataBreve(domenica)}`;
  const numeroSettimana = getNumeroSettimana(lunedi);
  document.getElementById("titoloSettimana").textContent = `Settimana ${numeroSettimana} — ${range}`;

  for (let i = 0; i < 6; i++) {
    const giorno = new Date(lunedi);
    giorno.setDate(giorno.getDate() + i);
    const dataISO = giorno.toISOString().split("T")[0];
    const label = `${giorniSettimana[giorno.getDay()]} ${String(giorno.getDate()).padStart(2, "0")}`;

    const div = document.createElement("div");
    div.classList.add("giorno");

    const etichetta = document.createElement("div");
    etichetta.classList.add("etichetta");
    etichetta.textContent = label;

    if (giorniFestivi.includes(dataISO)) {
      div.classList.add("festivo");
      const msg = document.createElement("div");
      msg.classList.add("festivo-label");
      msg.textContent = "Festivo";
      div.appendChild(etichetta);
      div.appendChild(msg);
      griglia.appendChild(div);
      continue;
    }

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
        if (selezionate[dataISO] === turno) {
          delete selezionate[dataISO];
        } else {
          selezionate[dataISO] = turno;
        }
        aggiornaSettimana();
      });

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
