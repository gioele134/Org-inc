from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from datetime import datetime, timedelta
from supabase import create_client
import os

# --- Supabase setup ---
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Flask setup ---
app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET"]

# --- Utenti autorizzati ---
UTENTI = {
    "gioele": "1234",
    "admin": "adminpass",
    "ciao": "ciao",
    "1234": "gioele"
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

# --- Riepilogo ---
@app.route("/riepilogo")
def riepilogo():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template(
        "riepilogo.html",
        username=session["username"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_key=os.environ["SUPABASE_KEY"]
    )

# --- API: dati per il calendario ---
@app.route("/dati_disponibilita_turni")
def dati_disponibilita_turni():
    if "username" not in session:
        return jsonify({})
    username = session["username"]

    # Recupera confermate
    confermate = {}
    res = supabase.table("disponibilita").select("data, turno").eq("utente", username).execute()
    for r in res.data:
        confermate[r["data"]] = r["turno"]

    # Totali per giorno/turno
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

# --- API: aggiorna disponibilità ---
@app.route("/aggiorna_disponibilita_turni", methods=["POST"])
def aggiorna_disponibilita_turni():
    if "username" not in session:
        return "Non autorizzato", 403
    username = session["username"]
    selezioni = request.json.get("selezioni", [])

    for sel in selezioni:
        data = sel["data"]
        turno = sel["turno"]

        supabase.table("disponibilita").delete().eq("utente", username).eq("data", data).execute()
        supabase.table("disponibilita").insert({
            "utente": username,
            "data": data,
            "turno": turno,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

    return "", 204

# --- API: rimuovi turno ---
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

# --- API: aderire a turno da riepilogo ---
@app.route("/aderisci_turno", methods=["POST"])
def aderisci_turno():
    if "username" not in session:
        return "Non autorizzato", 403
    username = session["username"]
    data = request.json.get("data")
    turno = request.json.get("turno")

    if not data or not turno:
        return "Dati mancanti", 400

    # Rimuove precedenti per quella data
    supabase.table("disponibilita").delete().eq("utente", username).eq("data", data).execute()

    # Inserisce nuovo turno
    supabase.table("disponibilita").insert({
        "utente": username,
        "data": data,
        "turno": turno,
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return "", 204

# --- Avvio app ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
