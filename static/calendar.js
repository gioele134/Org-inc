const giorniSettimana = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
let settimanaCorrente = 0;
let selezionate = {}; // es: { "2024-04-10": "M" }
let confermate = {};  // es: { "2024-04-10": "M" }
let mappaDisponibilita = {}; // es: { "2024-04-10": { M: 2, P: 1 } }

document.addEventListener("DOMContentLoaded", async () => {
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
  const nuovaSettimana = settimanaCorrente + differenza;
  if (nuovaSettimana >= 0 && nuovaSettimana <= 4) {
    settimanaCorrente = nuovaSettimana;
    aggiornaSettimana();
  }
}

function aggiornaSettimana() {
  const griglia = document.getElementById("griglia");
  griglia.innerHTML = "";
  selezionate = {};
  aggiornaContatore();

  const oggi = new Date();
  const giornoSettimana = oggi.getDay();
  const lunediCorrente = new Date(oggi.setDate(oggi.getDate() - giornoSettimana + 1)); // lunedì attuale
  const lunedi = new Date(lunediCorrente);
  lunedi.setDate(lunedi.getDate() + 7 * (settimanaCorrente + 1)); // +1 per saltare la settimana attuale

  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  const range = `${formattaDataBreve(lunedi)} – ${formattaDataBreve(domenica)}`;
  document.getElementById("titoloSettimana").textContent = range;

  for (let i = 0; i < 6; i++) {
    const giorno = new Date(lunedi);
    giorno.setDate(lunedi.getDate() + i);
    const dataISO = giorno.toISOString().split("T")[0];
    const etichetta = `${giorniSettimana[giorno.getDay()]} ${String(giorno.getDate()).padStart(2, "0")}`;

    const div = document.createElement("div");
    div.classList.add("giorno");

    const label = document.createElement("div");
    label.classList.add("etichetta");
    label.textContent = etichetta;

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

      btn.addEventListener("click", () => {
        if (btn.disabled) return;

        // alternanza esclusiva M / P
        selezionate[dataISO] = selezionate[dataISO] === turno ? null : turno;
        aggiornaSettimana();
      });

      if (selezionate[dataISO] === turno) {
        btn.classList.add("selezionato");
      }

      turniDiv.appendChild(btn);
    });

    const conteggio = document.createElement("div");
    conteggio.classList.add("conteggio");
    const contM = (mappaDisponibilita[dataISO]?.M || 0);
    const contP = (mappaDisponibilita[dataISO]?.P || 0);
    conteggio.textContent = `M: ${contM} / P: ${contP}`;

    div.appendChild(label);
    div.appendChild(turniDiv);
    div.appendChild(conteggio);
    griglia.appendChild(div);
  }

  // domenica
  const dom = new Date(domenica);
  const domLabel = `DOMENICA ${String(dom.getDate()).padStart(2, "0")}`;
  const divDom = document.createElement("div");
  divDom.classList.add("domenica");
  divDom.textContent = domLabel;
  griglia.appendChild(divDom);

  aggiornaContatore();
}

function aggiornaContatore() {
  const totale = Object.values(selezionate).filter(v => v !== null).length;
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
