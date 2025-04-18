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

  const { data, error } = await supabase
    .from("disponibilita")
    .select("*")
    .order("created_at", { ascending: true });

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

  const sezioneCompleti = document.getElementById("turni-completi");
  sezioneCompleti.innerHTML = "";

  const settimana = settimane[settimanaCorrente];
  if (!settimana) {
    contenitore.innerHTML = "<p>Nessuna disponibilità per questa settimana.</p>";
    sezioneCompleti.innerHTML = "<p>Nessun turno è al completo</p>";
    return;
  }

  const titolo = document.createElement("h3");
  titolo.id = "titoloSettimana";
  titolo.textContent = `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;
  contenitore.appendChild(titolo);

  const turniCompleti = [];
  const turniIncompleti = [];

  for (const giorno of Object.values(settimana.giorni)) {
    ["M", "P"].forEach(turno => {
      const lista = giorno[turno] || [];
      const label = `${giorno.data.toLowerCase()} ${turno === "M" ? "mattina" : "pomeriggio"}`;
      if (lista.length >= 2) {
        turniCompleti.push({ label, utenti: lista, data: giorno.data_iso, turno });
      } else if (lista.length === 1) {
        turniIncompleti.push({ label, utenti: lista, data: giorno.data_iso, turno });
      }
    });
  }

  // --- TURNI COMPLETI (2 o 3 adesioni) ---
  if (turniCompleti.length > 0) {
    const titoloCompleti = document.createElement("h2");
    titoloCompleti.textContent = "Turni al Completo";
    sezioneCompleti.appendChild(titoloCompleti);

    turniCompleti.forEach(turno => {
      const div = document.createElement("div");
      div.classList.add("giorno-riepilogo", "turno-completo");
      div.innerHTML = `
        <strong>${turno.label}</strong>
        <div>${renderTurno(turno.utenti, turno.data, turno.turno)}</div>
      `;
      sezioneCompleti.appendChild(div);
    });
  } else {
    const avviso = document.createElement("p");
    avviso.textContent = "Nessun turno è al completo";
    sezioneCompleti.appendChild(avviso);
  }

  // --- TURNI INCOMPLETI (1 adesione) ---
  if (turniIncompleti.length > 0) {
    const titoloIncompleti = document.createElement("h4");
    titoloIncompleti.textContent = "Turni incompleti";
    contenitore.appendChild(titoloIncompleti);

    turniIncompleti.forEach(turno => {
      const div = document.createElement("div");
      div.classList.add("giorno-riepilogo");
      div.innerHTML = `
        <strong>${turno.label}</strong>
        <div>${renderTurno(turno.utenti, turno.data, turno.turno)}</div>
      `;
      contenitore.appendChild(div);
    });
  } else {
    const avviso = document.createElement("p");
    avviso.innerHTML = `Non ci sono turni incompleti. <a href="/calendario">Seleziona date dal calendario</a>.`;
    contenitore.appendChild(avviso);
  }
}

// --- FORMATTA UTENTI ---
function renderTurno(lista, dataISO, turno) {
  let html = "";

  lista.forEach((utente, index) => {
    const colorClass = index === 2 ? "blue" : index < 2 ? "green" : "grey";
    const ruolo = index < 2 ? "Titolare" : "Riserva";
    const ora = window.timestampMap?.[dataISO]?.[turno]?.[utente] || "";
    const orario = ora ? ` <small>${formatDateTime(ora)}</small>` : "";

    html += `
      <div class="riga-turno">
        <span class="turno-badge ${colorClass}">
          <span class="icon">●</span> ${utente} <span class="ruolo">${ruolo}</span>${orario}
        </span>
        ${utente === window.username ? `<button onclick="rimuoviTurno('${dataISO}', '${turno}')" class="btn-rimuovi">Rimuovi</button>` : ""}
      </div>
    `;
  });

  if (!lista.includes(window.username) && lista.length < 3) {
    const label = lista.length === 1 ? "aderisci" : "aderisci come riserva";
    html += `<button onclick="aderisciTurno('${dataISO}', '${turno}')" class="btn-aderisci">${label}</button>`;
  }

  return html;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString("it-IT")} ${date.toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit' })}`;
}

// --- RIMUOVI TURNO ---
async function rimuoviTurno(data, turno) {
  const { error } = await supabase
    .from("disponibilita")
    .delete()
    .eq("data", data)
    .eq("turno", turno)
    .eq("utente", window.username);

  if (!error) {
    mostraToast("Turno rimosso");
    const { data: aggiornata } = await supabase
      .from("disponibilita")
      .select("*")
      .order("created_at", { ascending: true });
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
    const { data: aggiornata } = await supabase
      .from("disponibilita")
      .select("*")
      .order("created_at", { ascending: true });
    settimane = organizzaPerSettimane(aggiornata);
    aggiornaSettimana();
  }
}

// --- ORGANIZZA PER SETTIMANE ---
function organizzaPerSettimane(disponibilita) {
  const settimaneMap = new Map();
  const timestamps = {};

  disponibilita.forEach(record => {
    const { data, turno, utente, created_at } = record;
    const dataObj = new Date(data);
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
    const giornoKey = data;
    const giornoLabel = dataObj.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit" }).toUpperCase();

    if (!settimana.giorni[giornoKey]) {
      settimana.giorni[giornoKey] = { data: giornoLabel, data_iso: data, M: [], P: [] };
    }

    settimana.giorni[giornoKey][turno].push(utente);

    if (!timestamps[data]) timestamps[data] = {};
    if (!timestamps[data][turno]) timestamps[data][turno] = {};
    timestamps[data][turno][utente] = created_at;
  });

  window.timestampMap = timestamps;

  return Array.from(settimaneMap.values()).sort((a, b) => a.numero - b.numero);
}

// --- UTILS ---
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
