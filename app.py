from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from datetime import datetime, timedelta
from supabase import create_client
import os

# --- Supabase setup ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://obeqzopopwfvkugojggs.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "INSERISCI_LA_TUA_CHIAVE_SEGRETA")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Flask setup ---
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "chiave-super-segreta")

# --- Utenti autorizzati ---
UTENTI = {
    "gioele": "1234",
    "admin": "adminpass"
}

# --- Login ---
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form["username"]
        pw = request.form["password"]
        if user in UTENTI and UTENTI[user] == pw:
            session["username"] = user
            return redirect(url_for("calendario"))
        return render_template("login.html", errore="Credenziali non valide")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# --- Calendario ---
@app.route("/calendario")
def calendario():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("calendario.html", username=session["username"])

# --- Dati per il frontend ---
@app.route("/dati_disponibilita_turni")
def dati_disponibilita_turni():
    if "username" not in session:
        return jsonify({})

    username = session["username"]

    # Disponibilità dell’utente
    confermate = {}
    res = supabase.table("disponibilita").select("data, turno").eq("utente", username).execute()
    for r in res.data:
        confermate[r["data"]] = r["turno"]

    # Totale disponibilità
    tutte = {}
    res = supabase.table("disponibilita").select("data, turno").execute()
    for r in res.data:
        giorno = r["data"]
        turno = r["turno"]
        if giorno not in tutte:
            tutte[giorno] = {"M": 0, "P": 0}
        tutte[giorno][turno] += 1

    return jsonify({
        "confermate": confermate,
        "tutte": tutte
    })

# --- Aggiorna disponibilità ---
@app.route("/aggiorna_disponibilita_turni", methods=["POST"])
def aggiorna_disponibilita_turni():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    selezioni = request.json.get("selezioni", [])

    for sel in selezioni:
        data = sel["data"]
        turno = sel["turno"]

        # Rimuove precedenti disponibilità per quel giorno
        supabase.table("disponibilita").delete().eq("utente", username).eq("data", data).execute()

        # Inserisce nuova disponibilità
        supabase.table("disponibilita").insert({
            "utente": username,
            "data": data,
            "turno": turno
        }).execute()

    return "", 204

# --- Rimuovi disponibilità ---
@app.route("/rimuovi_disponibilita", methods=["POST"])
def rimuovi_disponibilita():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    data = request.form.get("data")
    turno = request.form.get("turno")

    supabase.table("disponibilita").delete()\
        .eq("utente", username)\
        .eq("data", data)\
        .eq("turno", turno).execute()

    return redirect(url_for("riepilogo"))

# --- Helper per riepilogo ---
def utenti_per_turno(disponibilita, data_str, turno):
    return [r["utente"] for r in disponibilita if r["data"] == data_str and r["turno"] == turno]

# --- Riepilogo ---
@app.route("/riepilogo")
def riepilogo():
    if "username" not in session:
        return redirect(url_for("login"))

    oggi = datetime.today()
    lunedi_corrente = oggi - timedelta(days=oggi.weekday())
    settimane = []

    # Recupera tutte le disponibilità
    res = supabase.table("disponibilita").select("*").execute()
    disponibilita = res.data if res.data else []

    for i in range(1, 6):
        lunedi = lunedi_corrente + timedelta(weeks=i)
        domenica = lunedi + timedelta(days=6)
        settimana_data = {
            "numero": lunedi.isocalendar()[1],
            "inizio": lunedi.strftime("%d/%m/%y"),
            "fine": domenica.strftime("%d/%m/%y"),
            "giorni": []
        }

        giorni_it = ["LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"]
        for offset in range(6):
            giorno = lunedi + timedelta(days=offset)
            data_str = giorno.strftime("%Y-%m-%d")
            giorno_label = f"{giorni_it[offset]} {giorno.strftime('%d')}"

            m = utenti_per_turno(disponibilita, data_str, "M")
            p = utenti_per_turno(disponibilita, data_str, "P")

            settimana_data["giorni"].append({
                "data": giorno_label,
                "data_iso": data_str,
                "M": m if m else None,
                "P": p if p else None
            })

        settimane.append(settimana_data)

    return render_template("riepilogo.html", settimane=settimane, username=session["username"])

# --- Avvio app ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
