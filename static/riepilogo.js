document.addEventListener("DOMContentLoaded", () => {
  const settimane = document.querySelectorAll(".settimana");
  const titolo = document.getElementById("titoloSettimana");
  let indice = 0;

  function aggiornaSettimana() {
    settimane.forEach((s, i) => {
      s.style.display = i === indice ? "block" : "none";
      if (i === indice) {
        const h3 = s.querySelector("h3");
        titolo.textContent = h3 ? h3.textContent : "";
      }
    });

    document.getElementById("prevBtn").disabled = indice === 0;
    document.getElementById("nextBtn").disabled = indice === settimane.length - 1;
  }

  document.getElementById("prevBtn").addEventListener("click", () => {
    if (indice > 0) {
      indice--;
      aggiornaSettimana();
    }
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (indice < settimane.length - 1) {
      indice++;
      aggiornaSettimana();
    }
  });

  aggiornaSettimana();
});
