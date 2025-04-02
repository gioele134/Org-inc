from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import os
import json
from pathlib import Path
app = Flask(__name__)
app.secret_key = 'sostituisci_questa_con_una_chiave_sicura'

# Utenti autorizzati
UTENTI_AUTORIZZATI = {
    'gioelel': 'password123',
    'utente2': 'segreto456'
}

@app.route('/')
def home():
    if 'username' in session:
        return redirect(url_for('calendario'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in UTENTI_AUTORIZZATI and UTENTI_AUTORIZZATI[username] == password:
            session['username'] = username
            return redirect(url_for('calendario'))
        else:
            flash('Credenziali non valide. Riprova.')
    return render_template('login.html')

@app.route('/calendario')
def calendario():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('calendario.html', username=session['username'])

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

FILE_DISPONIBILITA = Path("disponibilita.json")

def carica_disponibilita():
    if FILE_DISPONIBILITA.exists():
        with open(FILE_DISPONIBILITA, "r") as f:
            return json.load(f)
    return {}

def salva_disponibilita(dati):
    with open(FILE_DISPONIBILITA, "w") as f:
        json.dump(dati, f)

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

@app.route('/dati_disponibilita')
def dati_disponibilita():
    return jsonify(carica_disponibilita())

# Avvio server compatibile con Render
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
