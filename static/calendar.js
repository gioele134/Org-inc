const giorniSettimana = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
let settimanaCorrente = 0;
let selezionate = {};
let confermate = {};
let mappaDisponibilita = {};
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
  if (!griglia) return;
  griglia.innerHTML = "";

  const oggi = new Date();
  const giornoSettimana = oggi.getDay();
  const diff = giornoSettimana === 0 ? -6 : 1 - giornoSettimana;
  const lunediCorrente = new Date(oggi);
  lunediCorrente.setDate(oggi.getDate() + diff);

  const lunedi = new Date(lunediCorrente);
  lunedi.setDate(lunedi.getDate() + 7 * (settimanaCorrente + 1));
  const domenica = new Date(lunedi);
  domenica.setDate(domenica.getDate() + 6);

  const titolo = document.getElementById("titoloSettimana");
  if (titolo) {
    titolo.textContent = `${formattaDataBreve(lunedi)} – ${formattaDataBreve(domenica)}`;
  }

  for (let i = 0; i < 6; i++) {
    const giorno = new Date(lunedi);
    giorno.setDate(giorno.getDate() + i);
    const dataISO = giorno.toISOString().split("T")[0];
    const label = `${giorniSettimana[giorno.getDay()]} ${String(giorno.getDate()).padStart(2, "0")}`;
    const èFestivo = giorniFestivi.includes(dataISO);

    const div = document.createElement("div");
    div.classList.add("giorno");

    const etichetta = document.createElement("div");
    etichetta.classList.add("etichetta");
    etichetta.textContent = label;
    div.appendChild(etichetta);

    if (èFestivo) {
      const festivoTag = document.createElement("div");
      festivoTag.textContent = "FESTIVO";
      festivoTag.style.color = "#b40000";
      festivoTag.style.fontWeight = "bold";
      festivoTag.style.fontSize = "0.85rem";
      festivoTag.style.marginBottom = "0.3rem";
      div.appendChild(festivoTag);
    }

    const turniDiv = document.createElement("div");
    turniDiv.classList.add("turni");

    const turnoConfermato = confermate[dataISO];
    if (turnoConfermato) {
      const conferma = document.createElement("div");
      conferma.classList.add("turno-confermato");
      conferma.textContent = `${turnoConfermato} ✔`;
      conferma.style.color = "green";
      conferma.style.fontWeight = "bold";
      turniDiv.appendChild(conferma);
    } else if (!èFestivo) {
      ["M", "P"].forEach(turno => {
        const btn = document.createElement("button");
        btn.classList.add("turno-btn");
        btn.textContent = turno;

        const èConfermato = confermate[dataISO] === turno;
        const èSelezionato = selezionate[dataISO] === turno;

        if (èConfermato) {
          btn.classList.add("selezionato");
          btn.disabled = true;
        }

        if (èSelezionato) {
          btn.classList.add("selezionato");
        }

        if (!èConfermato) {
          btn.addEventListener("click", (e) => {
            if (selezionate[dataISO] === turno) {
              delete selezionate[dataISO];
            } else {
              selezionate[dataISO] = turno;
            }

            // Applica stile immediato e ricarica con leggero delay
            e.target.classList.add("selezionato");
            aggiornaContatore();
            setTimeout(() => aggiornaSettimana(), 20);
          });
        }

        turniDiv.appendChild(btn);
      });
    }

    const conteggio = document.createElement("div");
    conteggio.classList.add("conteggio");
    const contM = mappaDisponibilita[dataISO]?.M || 0;
    const contP = mappaDisponibilita[dataISO]?.P || 0;
    conteggio.textContent = `M: ${contM} / P: ${contP}`;

    div.appendChild(turniDiv);
    div.appendChild(conteggio);
    griglia.appendChild(div);
  }

  const domLabel = `DOMENICA ${String(domenica.getDate()).padStart(2, "0")}`;
  const divDom = document.createElement("div");
  divDom.classList.add("domenica");
  divDom.textContent = domLabel;
  griglia.appendChild(divDom);

  aggiornaContatore();
}

function aggiornaContatore() {
  const totale = Object.values(selezionate).filter(Boolean).length;
  const contatore = document.getElementById("contatoreSelezioni");
  if (contatore) contatore.textContent = totale;
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
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function formattaDataBreve(data) {
  return `${String(data.getDate()).padStart(2, "0")} ${data.toLocaleString("it-IT", { month: "short" })}`;
}

async function caricaFestivi() {
  try {
    const anno = new Date().getFullYear();
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${anno}/IT`);
    const json = await res.json();
    giorniFestivi = json.map(f => f.date);
  } catch (e) {
    giorniFestivi = [];
  }
}
