// --- CONFIGURAZIONE SUPABASE ---
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// --- VARIABILI GLOBALI ---
let settimanaCorrente = 0;
let settimane = [];

// --- DOM READY ---
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("settimaneContainer");

  if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
    container.innerHTML = "<p>Errore: Supabase URL o KEY non definite.</p>";
    return;
  }

  const { data, error } = await supabase.from("disponibilita").select("*");
  if (error || !data) {
    container.innerHTML = "<p>Errore nel caricamento dei dati.</p>";
    return;
  }

  settimane = organizzaPerSettimane(data);
  aggiornaSettimana();

  document.getElementById("prevSettimana").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextSettimana").addEventListener("click", () => cambiaSettimana(1));
});

// --- CAMBIO SETTIMANA ---
function cambiaSettimana(delta) {
  const nuova = settimanaCorrente + delta;
  if (nuova >= 0 && nuova < settimane.length) {
    settimanaCorrente = nuova;
    aggiornaSettimana();
  }
}

// --- AGGIORNA SETTIMANA ---
function aggiornaSettimana() {
  const contenitore = document.getElementById("settimaneContainer");
  contenitore.innerHTML = "";

  const settimana = settimane[settimanaCorrente];
  if (!settimana) {
    contenitore.innerHTML = "<p>Nessuna disponibilità per questa settimana.</p>";
    return;
  }

  document.getElementById("titoloSettimana").textContent = `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;

  // Sezione: Turni al completo
  const bloccoCompleti = document.createElement("div");
  bloccoCompleti.innerHTML = "<h3>Turni al completo</h3>";

  // Sezione: Turni incompleti
  const bloccoIncompleti = document.createElement("div");
  bloccoIncompleti.innerHTML = "<h3>TurniIncompleti</h3>";

  for (const giorno of Object.values(settimana.giorni)) {
    ["M", "P"].forEach(turno => {
      const adesioni = giorno[turno] || [];
      if (adesioni.length === 0) return; // ignora turni vuoti

      const div = document.createElement("div");
      div.classList.add("giorno-riepilogo");

      const titolo = `${giorno.data.toLowerCase()} ${turno === "M" ? "mattina" : "pomeriggio"}`;
      let html = `<strong>${titolo}</strong><div>`;

      adesioni.forEach((utente, i) => {
        const colore = i === 2 ? "colore-terzo" : i < 2 ? "colore-primi" : "";
        html += `<span class="${colore}">${utente}</span>`;
        if (utente === window.username) {
          html += `<button onclick="rimuoviTurno('${giorno.data_iso}', '${turno}')" class="btn-rimuovi">✖</button>`;
        }
        html += " ";
      });

      if (!adesioni.includes(window.username) && adesioni.length < 3) {
        html += `<button onclick="aderisciTurno('${giorno.data_iso}', '${turno}')" class="btn-aderisci">aderisci</button>`;
      }

      html += "</div>";
      div.innerHTML = html;

      if (adesioni.length === 3) {
        bloccoCompleti.appendChild(div);
      } else {
        bloccoIncompleti.appendChild(div);
      }
    });
  }

  contenitore.appendChild(bloccoCompleti);
  contenitore.appendChild(bloccoIncompleti);
}

// --- RIMUOVI TURNO UTENTE ---
async function rimuoviTurno(data, turno) {
  const { error } = await supabase
    .from("disponibilita")
    .delete()
    .eq("data", data)
    .eq("turno", turno)
    .eq("utente", window.username);

  if (!error) {
    mostraToast("Turno rimosso");
    const { data: aggiornata } = await supabase.from("disponibilita").select("*");
    settimane = organizzaPerSettimane(aggiornata);
    aggiornaSettimana();
  }
}

// --- ADERISCI TURNO ---
async function aderisciTurno(data, turno) {
  const { error } = await supabase
    .from("disponibilita")
    .insert([{ data: data, turno: turno, utente: window.username }]);

  if (!error) {
    mostraToast("Aderito al turno");
    const { data: aggiornata } = await supabase.from("disponibilita").select("*");
    settimane = organizzaPerSettimane(aggiornata);
    aggiornaSettimana();
  }
}

// --- ORGANIZZAZIONE DATI ---
function organizzaPerSettimane(disponibilita) {
  const settimaneMap = new Map();

  disponibilita.forEach(record => {
    const dataISO = record.data;
    const dataObj = new Date(dataISO);
    const settimanaNum = getSettimana(dataObj);

    if (!settimaneMap.has(settimanaNum)) {
      settimaneMap.set(settimanaNum, {
        numero: settimanaNum,
        inizio: getMonday(dataObj).toLocaleDateString("it-IT"),
        fine: getSunday(dataObj).toLocaleDateString("it-IT"),
        giorni: {}
      });
    }

    const settimana = settimaneMap.get(settimanaNum);
    const giornoKey = dataISO;
    const giornoLabel = dataObj.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit" }).toUpperCase();

    if (!settimana.giorni[giornoKey]) {
      settimana.giorni[giornoKey] = { data: giornoLabel, data_iso: dataISO, M: [], P: [] };
    }

    settimana.giorni[giornoKey][record.turno].push(record.utente);
  });

  return Array.from(settimaneMap.values()).sort((a, b) => a.numero - b.numero);
}

// --- UTILS SETTIMANA ---
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

function getSettimana(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// --- TOAST ---
function mostraToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
