from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "tua-chiave-super-segreta"

PATH_FILE = "disponibilita.json"
UTENTI = {
    "gioele": "1234",
    "admin": "adminpass"
}

# --- Utility ---
def carica_disponibilita():
    if not os.path.exists(PATH_FILE):
        return {}
    with open(PATH_FILE, "r") as f:
        return json.load(f)

def salva_disponibilita(dati):
    with open(PATH_FILE, "w") as f:
        json.dump(dati, f, indent=2)

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

# --- Dati JSON per frontend ---
@app.route("/dati_disponibilita_turni")
def dati_disponibilita_turni():
    if "username" not in session:
        return jsonify({})

    username = session["username"]
    disponibilita = carica_disponibilita()

    confermate = {
        data: turno
        for data, turni in disponibilita.items()
        for turno, utenti in turni.items()
        if username in utenti
    }

    return jsonify({
        "confermate": confermate,
        "tutte": disponibilita
    })

# --- Aggiorna turni ---
@app.route("/aggiorna_disponibilita_turni", methods=["POST"])
def aggiorna_disponibilita_turni():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    selezioni = request.json.get("selezioni", [])
    dati = carica_disponibilita()

    for sel in selezioni:
        data = sel["data"]
        turno = sel["turno"]

        if data not in dati:
            dati[data] = {"M": [], "P": []}
        for t in ["M", "P"]:
            if username in dati[data][t]:
                dati[data][t].remove(username)
        dati[data][turno].append(username)

    salva_disponibilita(dati)
    return "", 204

# --- Riepilogo settimanale ---
@app.route("/riepilogo")
def riepilogo():
    if "username" not in session:
        return redirect(url_for("login"))

    dati = carica_disponibilita()
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

        for offset in range(6):  # lun-sab
            giorno = lunedi + timedelta(days=offset)
            data_str = giorno.strftime("%Y-%m-%d")
            giorno_label = giorno.strftime("%A").upper() + " " + giorno.strftime("%d")
            m = []
            p = []

            for utente, disponibilita_utente in dati.items():
                if data_str in disponibilita_utente:
                    if "M" in disponibilita_utente[data_str] and utente in disponibilita_utente[data_str]["M"]:
                        m.append(utente)
                    if "P" in disponibilita_utente[data_str] and utente in disponibilita_utente[data_str]["P"]:
                        p.append(utente)

            settimana_data["giorni"].append({
                "data": giorno_label,
                "M": m if m else None,
                "P": p if p else None
            })

        settimane.append(settimana_data)

    return render_template("riepilogo.html", settimane=settimane)

# --- Rimuovi disponibilità ---
@app.route("/rimuovi_disponibilita", methods=["POST"])
def rimuovi_disponibilita():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    data = request.form.get("data")
    turno = request.form.get("turno")

    dati = carica_disponibilita()
    if data in dati and turno in dati[data]:
        if username in dati[data][turno]:
            dati[data][turno].remove(username)
            salva_disponibilita(dati)

    return redirect(url_for("riepilogo"))

# --- Avvio ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
