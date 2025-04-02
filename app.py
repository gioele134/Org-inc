from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
from pathlib import Path

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # cambia con una chiave sicura in produzione

FILE_DISPONIBILITA = Path("disponibilita.json")

# ------------------- Utilità -------------------

def carica_disponibilita():
    if FILE_DISPONIBILITA.exists():
        with open(FILE_DISPONIBILITA, "r") as f:
            return json.load(f)
    return {}

def salva_disponibilita(dati):
    with open(FILE_DISPONIBILITA, "w") as f:
        json.dump(dati, f)

# ------------------- Login / Logout -------------------

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Per ora accettiamo qualsiasi combinazione
        if username and password:
            session['username'] = username
            return redirect(url_for('calendario'))
        else:
            return render_template('login.html', errore="Credenziali non valide")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ------------------- Calendario -------------------

@app.route('/calendario')
def calendario():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('calendario.html', username=session['username'])

# ------------------- API: Dati disponibilità -------------------

@app.route('/dati_disponibilita')
def dati_disponibilita():
    username = session.get('username')
    dati = carica_disponibilita()
    confermate = [data for data, utenti in dati.items() if username in utenti]
    return jsonify({
        "tutte": dati,
        "confermate": confermate
    })

# ------------------- API: Aggiorna disponibilità -------------------

@app.route('/aggiorna_disponibilita', methods=['POST'])
def aggiorna_disponibilita():
    username = session.get('username')
    dati = request.get_json()
    aggiunte = dati.get("aggiunte", [])
    rimosse = dati.get("rimosse", [])

    tutte = carica_disponibilita()

    for data in aggiunte:
        tutte.setdefault(data, [])
        if username not in tutte[data]:
            tutte[data].append(username)

    for data in rimosse:
        if data in tutte and username in tutte[data]:
            tutte[data].remove(username)
            if not tutte[data]:
                del tutte[data]

    salva_disponibilita(tutte)
    return jsonify({"status": "ok"})

# ------------------- Avvio -------------------

import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
