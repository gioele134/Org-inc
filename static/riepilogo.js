// Aggiungi il tuo URL di Supabase e la chiave API
const supabaseUrl = 'https://obeqzopopwfvkugojggs.supabase.co';  // Sostituisci con il tuo URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZXF6b3BvcHdmdmt1Z29qZ2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MDY1NzcsImV4cCI6MjA1OTI4MjU3N30._dc4v6kraW1XXpfVsFej1mfnrWF0nQ5NzBFMfxaxQt0';  // Sostituisci con la tua chiave API pubblica
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variabili globali per gestire la settimana
let settimanaCorrente = 0;
let settimane = [];

// Quando il documento è pronto, carica i dati
document.addEventListener("DOMContentLoaded", async () => {
    await ottieniDatiSettimane(); // Carica i dati dal backend Supabase
    aggiornaSettimana(); // Mostra la settimana corrente
    document.getElementById("prevSettimana").addEventListener("click", () => cambiaSettimana(-1));
    document.getElementById("nextSettimana").addEventListener("click", () => cambiaSettimana(1));
});

// Funzione per ottenere i dati delle settimane da Supabase
async function ottieniDatiSettimane() {
    // Effettua una chiamata a Supabase per ottenere i dati
    const { data, error } = await supabase
        .from("disponibilita") // Nome della tua tabella in Supabase
        .select("*")
        .order("data", { ascending: true });

    if (error) {
        console.error("Errore nel recupero dei dati:", error);
        return;
    }

    // Processa i dati per ottenere la settimana
    settimane = processaDatiSettimane(data);
}

// Funzione per organizzare i dati in settimane
function processaDatiSettimane(data) {
    const settimaneTemp = [];

    // Elabora i dati, organizzandoli in settimane
    data.forEach(item => {
        const dataArr = item.data.split('-');  // Usa il formato della data YYYY-MM-DD
        const settimanaNum = new Date(item.data).getWeek();

        // Aggiungi la disponibilità alla settimana corretta
        const settimana = settimaneTemp[settimanaNum] || { giorni: {} };
        settimana.giorni[dataArr[2]] = settimana.giorni[dataArr[2]] || [];
        settimana.giorni[dataArr[2]].push(item.turno);
        settimaneTemp[settimanaNum] = settimana;
    });

    return settimaneTemp;
}

// Funzione per cambiare settimana
function cambiaSettimana(differenza) {
    const nuova = settimanaCorrente + differenza;
    if (nuova >= 0 && nuova < settimane.length) {
        settimanaCorrente = nuova;
        aggiornaSettimana();
    }
}

// Funzione per aggiornare la visualizzazione della settimana
function aggiornaSettimana() {
    const griglia = document.getElementById("settimaneContainer");
    griglia.innerHTML = "";

    const settimana = settimane[settimanaCorrente];
    const titoloSettimana = `Settimana ${settimana.numero} — dal ${settimana.inizio} al ${settimana.fine}`;
    document.getElementById("titoloSettimana").textContent = titoloSettimana;

    settimana.giorni.forEach(giorno => {
        const giornoDiv = document.createElement("div");
        giornoDiv.classList.add("giorno-riepilogo");

        const data = giorno.data;
        giornoDiv.innerHTML = `
            <strong>${data}</strong>
            <div><b>M:</b> ${giorno.M || "nessuno"}</div>
            <div><b>P:</b> ${giorno.P || "nessuno"}</div>
        `;
        griglia.appendChild(giornoDiv);
    });
}

// Gestione delle modifiche (clic per rimuovere disponibilità)
async function rimuoviDisponibilita(data, turno) {
    const { error } = await supabase
        .from('disponibilita')
        .delete()
        .eq('data', data)
        .eq('turno', turno);

    if (error) {
        console.error('Errore nella rimozione della disponibilità:', error);
    } else {
        console.log('Disponibilità rimossa correttamente:', data, turno);
        aggiornaSettimana(); // Ricarica la settimana
    }
}

// Gestione del click sulla X per rimuovere una disponibilità
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('rimuovi-btn')) {
        const data = event.target.dataset.data;
        const turno = event.target.dataset.turno;
        rimuoviDisponibilita(data, turno);
    }
});
