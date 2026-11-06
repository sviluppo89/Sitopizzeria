# Pizzeria Pallone – Sito menù e ordini

Sito statico pensato per lo smartphone, con pagina di gestione (`admin.html`).
Non serve un server né un abbonamento: il menù è il file `data/menu.json` nel repository
e la pagina admin lo aggiorna tramite GitHub.

## Il sito (`index.html`)
- Menù con categorie fisse in alto, ricerca e filtri
- Carosello "Le offerte" con validità per giorni della settimana o per periodo
- Formati e gusti, extra a pagamento (es. "Nel ruoto +2 €"), allergeni
- Carrello e **invio dell'ordine già scritto su WhatsApp**
- Stato "Aperto / Chiuso", avvisi in cima, pausa degli ordini online
- Modalità scura automatica, installabile come app

## La pagina admin (`admin.html`)
| Sezione | Cosa puoi fare |
|---|---|
| **Menù** | Aggiungere, modificare, duplicare, eliminare e riordinare prodotti e categorie. Segnare un prodotto come *esaurito* con un tocco. Nascondere senza cancellare. Foto, formati, etichette, allergeni, giorni |
| **Offerte** | Creare offerte e promo con giorni della settimana e periodo (dal/al), attivarle e spegnerle |
| **Negozio** | Pausa ordini online, avviso in cima al sito, orari, consegna (costo, minimo, zone), contatti, P.IVA |
| **Altro** | Pubblicare, anteprima, annullare le modifiche, QR code del menù, copia di sicurezza |

Le modifiche restano in **bozza** sul dispositivo finché non premi **Pubblica**.
Con l'occhio in alto vedi l'**anteprima** del sito con le modifiche.

### Primo accesso
1. Crea un codice di accesso su GitHub (la pagina admin spiega i passaggi in "Come ottengo il codice di accesso?").
   Serve il permesso **Contents: Read and write** solo sul repository *Sitopizzeria*.
2. Apri `admin.html`, incolla il codice e premi **Entra**. Resta salvato su quel dispositivo.

### Pubblicare il sito gratis
Il pannello pubblica sul ramo `main` (si cambia in "Impostazioni avanzate" all'accesso).
- **GitHub Pages**: Settings → Pages → Branch `main`. Con il piano gratuito il repository deve essere *pubblico*
  (il contenuto è comunque il menù del sito; il codice di accesso non è mai nel repository).
- In alternativa **Netlify** o **Cloudflare Pages** (gratuiti) funzionano anche con repository privato:
  si collegano a GitHub e si aggiornano da soli a ogni pubblicazione.

## Struttura
- `index.html`, `css/style.css`, `js/app.js` – il sito
- `admin.html`, `css/admin.css`, `js/admin.js` – la gestione
- `js/art.js` – i disegni automatici dei prodotti
- `data/menu.json` – menù, offerte e dati del negozio
- `img/uploads/` – foto caricate dalla pagina admin

Per provare in locale serve un piccolo server (il sito legge `data/menu.json`), ad esempio
`python3 -m http.server`, poi apri http://localhost:8000
