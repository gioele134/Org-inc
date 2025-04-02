from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = "tua-chiave-segreta"  # da personalizzare

PATH_FILE = "disponibilita.json"
UTENTI = {
    "admin": "adminpass",
    "gioele": "1234",
    "mario": "abcd"
}

# --- Utilità ---
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

# --- Dati JSON per il frontend ---
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

# --- Invio disponibilità ---
@app.route("/aggiorna_disponibilita_turni", methods=["POST"])
def aggiorna_disponibilita_turni():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    selezioni = request.json.get("selezioni", [])
    dati = carica_disponibilita()

    # Rimuovi l'utente da tutti i turni delle date inviate
    for sel in selezioni:
        data = sel["data"]
        if data in dati:
            for turno in ["M", "P"]:
                if username in dati[data].get(turno, []):
                    dati[data][turno].remove(username)

    # Aggiungi nuova disponibilità
    for sel in selezioni:
        data = sel["data"]
        turno = sel["turno"]
        if data not in dati:
            dati[data] = {"M": [], "P": []}
        if username not in dati[data][turno]:
            dati[data][turno].append(username)

    salva_disponibilita(dati)
    return "", 204

# --- Riepilogo ---
@app.route("/riepilogo")
def riepilogo():
    if "username" not in session:
        return redirect(url_for("login"))

    username = session["username"]
    dati = carica_disponibilita()

    # Raggruppa disponibilità per data
    riepilogo = {}
    for data, turni in dati.items():
        for turno, utenti in turni.items():
            for u in utenti:
                riepilogo.setdefault(data, []).append((u, turno))

    return render_template("riepilogo.html", username=username, disponibilita=riepilogo)

# --- Rimuovi disponibilità (solo proprie) ---
@app.route("/rimuovi_disponibilita", methods=["POST"])
def rimuovi_disponibilita():
    if "username" not in session:
        return "Non autorizzato", 403

    username = session["username"]
    data = request.form.get("data")
    turno = request.form.get("turno")

    if not data or not turno:
        return "Dati mancanti", 400

    dati = carica_disponibilita()
    if data in dati and turno in dati[data]:
        if username in dati[data][turno]:
            dati[data][turno].remove(username)
            salva_disponibilita(dati)

    return redirect(url_for("riepilogo"))
