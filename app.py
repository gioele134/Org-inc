from flask import Flask, render_template, request, redirect, url_for, session, flash
import os
from flask import jsonify

app = Flask(__name__)
app.secret_key = 'chiave_super_segreta'  # Cambiala in produzione

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

@app.route('/aggiorna_disponibilita', methods=['POST'])
def aggiorna_disponibilita():
    from flask import request
    dati = request.get_json()
    data = dati.get('data')
    disponibile = dati.get('disponibile')

    print(f"Ricevuto: {data} - disponibile: {disponibile}")
    # Qui potrai salvare in DB o file
    return jsonify({"status": "ok"})

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
