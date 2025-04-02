from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
from pathlib import Path
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'supersecretkey'
FILE_DISPONIBILITA = Path("disponibilita.json")

# ------------------- Utility -------------------

def carica_disponibilita():
    if FILE_DISPONIBILITA.exists():
        with open(FILE_DISPONIBILITA, "r") as f:
            return json.load(f)
    return {}

def salva_disponibilita(dati):
    with open(FILE_DISPONIBILITA, "w") as f:
        json.dump(dati, f)

# ------------------- Login -------------------

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username and password:
            session['username'] = username
            return redirect(url_for('calendario'))
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

@app.route('/dati_disponibilita')
def dati_disponibilita():
    username = session.get('username')
    dati = carica_disponibilita()
    confermate = [data for data, utenti in dati.items() if username in utenti]
    return jsonify({
        "tutte": dati,
        "confermate": confermate
    })

@app.route('/aggiorna_disponibilita', methods=['POST'])
def aggiorna_disponibilita():
    username = session.get('username')
    dati = request.get_json()
    aggiunte = dati.get("aggiunte", [])
    tutte = carica_disponibilita()

    for data in aggiunte:
        tutte.setdefault(data, [])
        if username not in tutte[data]:
            tutte[data].append(username)

    salva_disponibilita(tutte)
    return jsonify({"status": "ok"})

# ------------------- Riepilogo -------------------

@app.route('/riepilogo')
def riepilogo():
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    dati = carica_disponibilita()

    oggi = datetime.today()
    lunedi_base = oggi - timedelta(days=oggi.weekday())
    lunedi_base = lunedi_base.replace(hour=0, minute=0, second=0, microsecond=0)

    settimana_index = int(request.args.get("settimana", 0))
    lunedi_attivo = lunedi_base + timedelta(weeks=1 + settimana_index)
    domenica_attiva = lunedi_attivo + timedelta(days=6)

    disponibilita_settimanale = {
        data: utenti for data, utenti in dati.items()
        if lunedi_attivo <= datetime.fromisoformat(data) <= domenica_attiva
    }

    contatori = {}
    for utenti in dati.values():
        for u in utenti:
            contatori[u] = contatori.get(u, 0) + 1

    return render_template(
        'riepilogo.html',
        username=username,
        disponibilita=disponibilita_settimanale,
        settimana_index=settimana_index,
        contatori=contatori
    )

@app.route('/elimina_disponibilita', methods=['POST'])
def elimina_disponibilita():
    username = session.get('username')
    data = request.get_json().get('data')
    tutte = carica_disponibilita()

    if data in tutte and username in tutte[data]:
        tutte[data].remove(username)
        if not tutte[data]:
            del tutte[data]
        salva_disponibilita(tutte)
        return jsonify({"status": "ok"})
    return jsonify({"status": "not_found"}), 404

# ------------------- Avvio -------------------

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
