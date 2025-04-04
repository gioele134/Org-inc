const settimanaCorrenteIniziale = 0;
let settimanaCorrente = settimanaCorrenteIniziale;
let settimane = [];

// Utility: calcola il numero della settimana ISO
Date.prototype.getWeek = function () {
  const date = new Date(this.getTime());
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
};

document.addEventListener("DOMContentLoaded", async () => {
  await caricaSettimane();
  aggiornaSettimana();
  document.getElementById("prevSettimana").addEventListener("click", () => cambiaSettimana(-1));
  document.getElementById("nextSettimana").addEventListener("click", () => cambiaSettimana(1));
});

async function caricaSettimane() {
  const res = await fetch("/riepilogo_dati.json");
  const dati = await res.json();
  settimane = dati.settimane || [];
}

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
  if (!settimana) return;

  document.getElementById("titoloSettimana").textContent = `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;

  settimana.giorni.forEach(giorno => {
    const giornoDiv = document.createElement("div");
    giornoDiv.classList.add("giorno-riepilogo");

    giornoDiv.innerHTML = `
      <strong>${giorno.data}</strong>
      <div><b>M:</b> ${renderTurno(giorno.M, giorno.data_iso, "M")}</div>
      <div><b>P:</b> ${renderTurno(giorno.P, giorno.data_iso, "P")}</div>
    `;

    contenitore.appendChild(giornoDiv);
  });
}

function renderTurno(lista, data, turno) {
  if (!lista || lista.length === 0) return "nessuno";

  return lista.map(utente => {
    const isCurrentUser = utente === window.username; // puoi settarlo nel template se serve
    return isCurrentUser
      ? `${utente} <form method="POST" action="/rimuovi_disponibilita" style="display:inline;">
          <input type="hidden" name="data" value="${data}">
          <input type="hidden" name="turno" value="${turno}">
          <button type="submit" class="rimuovi-btn" title="Rimuovi disponibilità">✖</button>
         </form>`
      : utente;
  }).join(" ");
}
