const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let settimanaCorrente = 0;
let settimane = [];

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

function cambiaSettimana(delta) {
  const nuova = settimanaCorrente + delta;
  if (nuova >= 0 && nuova < settimane.length) {
    settimanaCorrente = nuova;
    aggiornaSettimana();
  }
}

function aggiornaSettimana() {
  const contenitore = document.getElementById("settimaneContainer");
  contenitore.innerHTML = "";

  const settimana = settimane[settimanaCorrente];
  if (!settimana) {
    contenitore.innerHTML = "<p>Nessuna disponibilità per questa settimana.</p>";
    return;
  }

  document.getElementById("titoloSettimana").textContent = `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;

  const sezioneCompleti = document.createElement("div");
  sezioneCompleti.classList.add("turni-completi");
  const titolo = document.createElement("h3");
  titolo.textContent = "Turni al completo";
  sezioneCompleti.appendChild(titolo);

  for (const giorno of Object.values(settimana.giorni)) {
    ["M", "P"].forEach(turno => {
      const lista = giorno[turno];
      if (lista.length === 3) {
        const riga = document.createElement("div");
        riga.classList.add("turno-completo");
        riga.innerHTML = `
          <strong>${giorno.data.toLowerCase()} ${turno === "M" ? "mattina" : "pomeriggio"}</strong><br>
          ${lista.map((nome, idx) => `<span style="color: ${idx === 2 ? 'blue' : 'green'}">${nome}</span>`).join(", ")}
        `;
        sezioneCompleti.appendChild(riga);
      }
    });
  }

  contenitore.appendChild(sezioneCompleti);

  for (const giorno of Object.values(settimana.giorni)) {
    const giornoDiv = document.createElement("div");
    giornoDiv.classList.add("giorno-riepilogo");

    giornoDiv.innerHTML = `
      <strong>${giorno.data}</strong>
      <div><b>M:</b> ${renderTurno(giorno.M, giorno.data_iso, "M")}</div>
      <div><b>P:</b> ${renderTurno(giorno.P, giorno.data_iso, "P")}</div>
    `;

    contenitore.appendChild(giornoDiv);
  }
}

function renderTurno(lista, dataISO, turno) {
  if (!lista || lista.length === 0) return "";

  return lista.map(utente => {
    if (utente === window.username) {
      return `
        ${utente}
        <button onclick="rimuoviTurno('${dataISO}', '${turno}')" class="btn-rimuovi">✖</button>
      `;
    }
    return utente;
  }).join(", ");
}

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

function mostraToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
