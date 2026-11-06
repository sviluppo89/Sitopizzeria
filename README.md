# Pizzeria Pallone – Sito menù e ordini

Sito statico, pensato prima di tutto per lo smartphone. Non serve nessuna installazione:
basta pubblicare la cartella (GitHub Pages, Netlify, Vercel…).

## Cosa fa
- Menù con categorie fisse in alto, ricerca e filtri (vegetariane, piccanti, novità)
- Carosello "Le offerte" con il badge "Valida oggi" in base al giorno della settimana
- Formati e gusti (es. 33 cl / 1,5 L, 5 / 10 pezzi) e opzione "Nel ruoto +2 €" per le pizze
- Prodotti non disponibili mostrati ma non ordinabili
- Scheda prodotto con quantità e richieste particolari ("ben cotta", "senza origano"…)
- Carrello sempre visibile in basso, salvato anche se si chiude la pagina
- Scelta Asporto / Domicilio, nome, indirizzo, orario desiderato
- **Invio dell'ordine già scritto su WhatsApp** al numero della pizzeria
- Stato "Aperto / Chiuso" e tabella orari (se compilati)
- Modalità scura automatica, installabile come app sul telefono

## Come modificare
Tutto si cambia in **`js/menu.js`**:
- `CONFIG` → telefono, WhatsApp, indirizzo, **orari**, costo e minimo di consegna
- `MENU` → categorie e prodotti (tutti i campi sono spiegati in cima al file)
- `AGGIUNTE` → elenco delle aggiunte

Se un giorno vuoi una foto per un prodotto, aggiungi `foto: "img/nome.webp"`: al posto del disegno comparirà la foto.

Il menù è stato importato da go.nordqr.com/pizzeria-pallone.
Ogni prodotto è mostrato con un'illustrazione disegnata in automatico in base agli ingredienti.
Se cambi il menù su NordQR, ricordati di aggiornare anche `js/menu.js`.
