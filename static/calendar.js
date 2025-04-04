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

  // Gestione click solo se non è confermato
  if (!èConfermato) {
    btn.addEventListener("click", () => {
      if (selezionate[dataISO] === turno) {
        delete selezionate[dataISO];
      } else {
        selezionate[dataISO] = turno;
      }
      aggiornaSettimana();
    });
  }

  turniDiv.appendChild(btn);
});
