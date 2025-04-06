// --- CONFIGURAZIONE SUPABASE ---
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// --- VARIABILI GLOBALI ---
let settimanaCorrente = 0;
let settimane = [];
let filtroAttivo = null; // "1" oppure "2" oppure null

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

  const turniCompleti = [];
  const turniIncompleti = [];

  for (const giorno of Object.values(settimana.giorni)) {
    ["M", "P"].forEach(turno => {
      const lista = giorno[turno] || [];
      if (lista.length === 0) return;

      const label = `${giorno.data.toLowerCase()} ${turno === "M" ? "mattina" : "pomeriggio"}`;

      const turnoObj = {
        label,
        utenti: lista,
        data: giorno.data_iso,
        turno,
        count: lista.length
      };

      if (lista.length === 3) {
        turniCompleti.push(turnoObj);
      } else {
        turniIncompleti.push(turnoObj);
      }
    });
  }

  // Titolo settimana
  const titoloSett = document.createElement("h3");
  titoloSett.textContent = `Settimana ${settimana.numero}`;
  contenitore.appendChild(titoloSett);

  // Turni completi
  if (turniCompleti.length > 0) {
    const titolo = document.createElement("h3");
    titolo.textContent = "Turni al completo";
    contenitore.appendChild(titolo);

    turniCompleti.forEach(turno => {
      const div = document.createElement("div");
      div.classList.add("giorno-riepilogo");
      div.innerHTML = `
        <strong>${turno.label}</strong>
        <div>${renderTurno(turno.utenti, turno.data, turno.turno)}</div>
      `;
      contenitore.appendChild(div);
    });
  }

  // Turni incompleti con filtro
  if (turniIncompleti.length > 0) {
    const titolo = document.createElement("h3");
    titolo.textContent = "Turni incompleti";
    contenitore.appendChild(titolo);

    turniIncompleti
      .filter(t => filtroAttivo === null || String(t.count) === filtroAttivo)
      .forEach(turno => {
        const div = document.createElement("div");
        div.classList.add("giorno-riepilogo");
        div.innerHTML = `
          <strong>${turno.label}</strong>
          <div>${renderTurno(turno.utenti, turno.data, turno.turno)}</div>
        `;
        contenitore.appendChild(div);
      });

    // Pulsanti filtro
    const filtriDiv = document.createElement("div");
    filtriDiv.classList.add("filtro-turni");

    filtriDiv.innerHTML = `
      <button onclick="applicaFiltro('1')" ${filtroAttivo === '1' ? 'disabled' : ''}>Turni con 1 adesione</button>
      <button onclick="applicaFiltro('2')" ${filtroAttivo === '2' ? 'disabled' : ''}>Turni con 2 adesioni</button>
      <button onclick="applicaFiltro(null)" ${filtroAttivo === null ? 'disabled' : ''}>Tutti</button>
    `;

    contenitore.appendChild(filtriDiv);
  }
}

// --- FORMATTA UTENTI CON RIMOZIONE / ADESIONE ---
function renderTurno(lista, dataISO, turno) {
  let html = "";

  lista.forEach((utente, index) => {
    const colorClass = index === 2 ? "blue" : index < 2 ? "green" : "grey";
    html += `<span class="turno-badge ${colorClass}"><span class="icon">●</span> ${utente}</span>`;

    if (utente === window.username) {
      html += `
        <button onclick="rimuoviTurno('${dataISO}', '${turno}')" class="btn-rimuovi">✖</button>
      `;
    }
    html += " ";
  });

  if (!lista.includes(window.username) && lista.length < 3) {
    html += `
      <button onclick="aderisciTurno('${dataISO}', '${turno}')" class="btn-aderisci">aderisci</button>
    `;
  }

  return html;
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

// --- FILTRO ---
function applicaFiltro(valore) {
  filtroAttivo = valore;
  aggiornaSettimana();
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
