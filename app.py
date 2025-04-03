from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from datetime import datetime, timedelta
from supabase import create_client
import os

# --- Supabase setup ---
SUPABASE_URL = "https://obeqzopopwfvkugojggs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZXF6b3BvcHdmdmt1Z29qZ2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MDY1NzcsImV4cCI6MjA1OTI4MjU3N30._dc4v6kraW1XXpfVsFej1mfnrWF0nQ5NzBFMfxaxQt0"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Flask setup ---
app = Flask(__name__)
app.secret_key = "tua-chiave-super-segreta"

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

    # Disponibilità inviate dall’utente
    confermate = {}
    res = supabase.table("disponibilita").select("data, turno").eq("utente", username).execute()
    for r in res.data:
        confermate[r["data"]] = r["turno"]

    # Tutte le disponibilità
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

        # Rimuovi disponibilità esistente per quel giorno
        supabase.table("disponibilita").delete().eq("utente", username).eq("data", data).execute()

        # Inserisci nuova
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

# --- Riepilogo ---
@app.route("/riepilogo")
def riepilogo():
    if "username" not in session:
        return redirect(url_for("login"))

    conn = get_db_connection()
    cur = conn.cursor()

    oggi = datetime.today()
    lunedi_corrente = oggi - timedelta(days=oggi.weekday())
    settimane = []

    for i in range(1, 6):  # da settimana prossima a +5
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
            data_iso = giorno.strftime("%Y-%m-%d")
            giorno_label = f"{giorni_it[offset]} {giorno.strftime('%d')}"

            # Recupera utenti per M e P
            cur.execute("SELECT utente FROM disponibilita WHERE data=? AND turno='M'", (data_iso,))
            m = [r["utente"] for r in cur.fetchall()]
            cur.execute("SELECT utente FROM disponibilita WHERE data=? AND turno='P'", (data_iso,))
            p = [r["utente"] for r in cur.fetchall()]

            settimana_data["giorni"].append({
                "data": giorno_label,
                "data_iso": data_iso,
                "M": m if m else None,
                "P": p if p else None
            })

        settimane.append(settimana_data)

    conn.close()
    return render_template("riepilogo.html", settimane=settimane, username=session["username"])
# --- Avvio ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
