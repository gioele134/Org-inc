let settimanaCorrente = 0;

document.addEventListener("DOMContentLoaded", () => {
  mostraSettimana(settimanaCorrente);

  document.getElementById("prevSettimana").addEventListener("click", () => {
    if (settimanaCorrente > 0) {
      settimanaCorrente--;
      mostraSettimana(settimanaCorrente);
    }
  });

  document.getElementById("nextSettimana").addEventListener("click", () => {
    if (settimanaCorrente < 4) {
      settimanaCorrente++;
      mostraSettimana(settimanaCorrente);
    }
  });
});

function mostraSettimana(index) {
  const tutte = document.querySelectorAll(".settimana");
  tutte.forEach((s, i) => {
    s.style.display = (i === index) ? "block" : "none";
  });

  const titolo = tutte[index]?.querySelector("h3")?.textContent || "";
  document.getElementById("titoloSettimana").textContent = titolo;
}

function mostraToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
