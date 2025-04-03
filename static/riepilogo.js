let settimanaCorrente = 0;

document.addEventListener("DOMContentLoaded", () => {
  const settimane = document.querySelectorAll(".settimana");
  const titolo = document.getElementById("titoloSettimana");

  function mostraSettimana(index) {
    settimane.forEach((s, i) => {
      s.style.display = i === index ? "block" : "none";
    });
    titolo.textContent = settimane[index].querySelector("h3").textContent;
  }

  document.getElementById("prevSettimana").addEventListener("click", () => {
    if (settimanaCorrente > 0) {
      settimanaCorrente--;
      mostraSettimana(settimanaCorrente);
    }
  });

  document.getElementById("nextSettimana").addEventListener("click", () => {
    if (settimanaCorrente < settimane.length - 1) {
      settimanaCorrente++;
      mostraSettimana(settimanaCorrente);
    }
  });

  mostraSettimana(settimanaCorrente);
});

function mostraToast() {
  const toast = document.getElementById("toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
