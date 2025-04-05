// --- CONFIGURAZIONE SUPABASE ---
const { createClient } = supabase;
const supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// --- VARIABILI GLOBALI ---
let settimanaCorrente = 0;
let settimane = [];

// --- FUNZIONE UTILE PER CALCOLO SETTIMANA ---
Date.prototype.getWeek = function () {
  const date = new Date(this.getTime());
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
};

// --- DOM READY ---
document.addEventListener("DOMContentLoaded", async () => {
  await caricaDatiDaSupabase();
  aggiornaSettimana();

  document.getElementById("prevSettimana").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextSettimana").addEventListener("click", () => cambiaSettimana(1));
});

// --- RECUPERO DATI DA SUPABASE ---
async function caricaDatiDaSupabase() {
  const { data, error } = await supabaseClient.from("disponibilita").select("*");

  if (error) {
    console.error("Errore nel caricamento dei dati:", error);
    return;
  }

  settimane = organizzaPerSettimane(data);
}

// --- ORGANIZZAZIONE PER SETTIMANA ---
function organizzaPerSettimane(disponibilita) {
  const settimaneMap = new Map();

  disponibilita.forEach(record => {
    const dataISO = record.data; // "2025-04-08"
    const dataObj = new Date(dataISO);
    const settimanaNum = dataObj.getWeek();
    const lunedi = getMonday(dataObj);
    const domenica = getSunday(dataObj);

    if (!settimaneMap.has(settimanaNum)) {
      settimaneMap.set(settimanaNum, {
        numero: settimanaNum,
        inizio: lunedi.toLocaleDateString("it-IT"),
        fine: domenica.toLocaleDateString("it-IT"),
        giorni: {}
      });
    }

    const settimana = settimaneMap.get(settimanaNum);
    const giornoLabel = dataObj.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit"
    }).toUpperCase();
    const giornoKey = dataISO;

    if (!settimana.giorni[giornoKey]) {
      settimana.giorni[giornoKey] = {
        data: giornoLabel,
        data_iso: dataISO,
        M: [],
        P: []
      };
    }

    settimana.giorni[giornoKey][record.turno].push(record.utente);
  });

  return Array.from(settimaneMap.values()).sort((a, b) => a.numero - b.numero);
}

// --- CAMBIO SETTIMANA ---
function cambiaSettimana(delta) {
  const nuova = settimanaCorrente + delta;
  if (nuova >= 0 && nuova < settimane.length) {
    settimanaCorrente = nuova;
    aggiornaSettimana();
  }
}

// --- AGGIORNA INTERFACCIA ---
function aggiornaSettimana() {
  const contenitore = document.getElementById("settimaneContainer");
  contenitore.innerHTML = "";

  const settimana = settimane[settimanaCorrente];
  if (!settimana) return;

  document.getElementById("titoloSettimana").textContent =
    `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;

  for (const giorno of Object.values(settimana.giorni)) {
    const giornoDiv = document.createElement("div");
    giornoDiv.classList.add("giorno-riepilogo");

    giornoDiv.innerHTML = `
      <strong>${giorno.data}</strong>
      <div><b>M:</b> ${renderTurno(giorno.M)}</div>
      <div><b>P:</b> ${renderTurno(giorno.P)}</div>
    `;

    contenitore.appendChild(giornoDiv);
  }
}

// --- RENDER LISTA UTENTI PER TURNO ---
function renderTurno(lista) {
  if (!lista || lista.length === 0) return "nessuno";
  return lista.join(", ");
}

// --- FUNZIONI PER CALCOLARE LUNEDÌ E DOMENICA ---
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getSunday(date) {
  const monday = getMonday(date);
  return new Date(monday.getTime() + 6 * 86400000);
}
