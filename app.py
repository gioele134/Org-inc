from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "tua-chiave-super-segreta"

# --- Inizializzazione DB (creazione automatica su Render) ---
def inizializza_db():
    conn = sqlite3.connect("disponibilita.db")
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS disponibilita (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            utente TEXT NOT NULL,
            data TEXT NOT NULL,
            turno TEXT NOT NULL,
            inserito_il TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(utente, data)
        )
    ''')
    conn.commit()
    conn.close()

inizializza_db()

# --- Utility DB ---
def get_db_connection():
    conn = sqlite3.connect("disponibilita.db")
    conn.row_factory = sqlite3.Row
    return conn

# --- Credenziali ---
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

# --- Dati JSON per frontend ---
@app.route("/dati_disponibilita_turni")
def dati_disponibilita_turni():
    if "username" not in session:
        return jsonify({})

    username = session["username"]
    conn = get_db_connection()
    cur = conn.cursor()

    # Turni confermati dell'utente
    cur.execute("SELECT data, turno FROM disponibilita WHERE utente=?", (username,))
    confermate_raw = cur.fetchall()
    confermate = {r["data"]: r["turno"] for r in confermate_raw}

    # Conteggi totali per ogni data e turno
    cur.execute("SELECT data, turno, COUNT(*) as totale FROM disponibilita GROUP BY data, turno")
    tutte_raw = cur.fetchall()
    tutte = {}
    for r in tutte_raw:
        giorno = r["data"]
        turno = r["turno"]
        tutte.setdefault(giorno, {})[turno] = r["totale"]

    conn.close()

    return jsonify({
        "confermate": confermate,
        "tutte": tutte
    })

# --- Aggiorna turni ---
@app.route("/aggiorna_disponibilita_turni", methods=["POST"])
def aggiorna_disponibilita_turni():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    selezioni = request.json.get("selezioni", [])
    conn = get_db_connection()
    cur = conn.cursor()

    for sel in selezioni:
        data = sel["data"]
        turno = sel["turno"]

        # Rimuovi eventuale selezione precedente per quella data
        cur.execute("DELETE FROM disponibilita WHERE utente=? AND data=?", (username, data))

        # Aggiungi nuova selezione
        cur.execute(
            "INSERT INTO disponibilita (utente, data, turno) VALUES (?, ?, ?)",
            (username, data, turno)
        )

    conn.commit()
    conn.close()
    return "", 204

# --- Riepilogo settimanale ---
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

            # Recupera gli utenti che hanno dato disponibilità
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

# --- Rimuovi disponibilità ---
@app.route("/rimuovi_disponibilita", methods=["POST"])
def rimuovi_disponibilita():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    data = request.form.get("data")
    turno = request.form.get("turno")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM disponibilita WHERE utente=? AND data=? AND turno=?",
        (username, data, turno)
    )
    conn.commit()
    conn.close()

    return redirect(url_for("riepilogo"))

# --- Avvio ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
