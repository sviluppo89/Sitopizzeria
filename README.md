# Pizzeria Pallone – Sito menù e ordini

Sito statico, pensato prima di tutto per lo smartphone. Non serve nessuna installazione:
basta pubblicare la cartella (GitHub Pages, Netlify, Vercel…).

## Cosa fa
- Menù con categorie fisse in alto, ricerca e filtri (vegetariane, piccanti, novità)
- Sezione "I più amati" (prodotti con tag `consigliata` o `novita`)
- Scheda prodotto con quantità e richieste particolari ("ben cotta", "senza origano"…)
- Carrello sempre visibile in basso, salvato anche se si chiude la pagina
- Scelta Asporto / Domicilio, nome, indirizzo, orario desiderato
- **Invio dell'ordine già scritto su WhatsApp** al numero della pizzeria
- Stato "Aperto / Chiuso" e tabella orari (se compilati)
- Modalità scura automatica, installabile come app sul telefono

## Come modificare
Tutto si cambia in **`js/menu.js`**:
- `CONFIG` → telefono, WhatsApp, indirizzo, **orari**, costo e minimo di consegna
- `MENU` → categorie e prodotti (`nome`, `ingredienti`, `prezzo`, `tag`, `foto` facoltativa)
- `AGGIUNTE` → elenco delle aggiunte

Le foto vanno nella cartella `img/` (consigliato: JPG/WebP quadrate, circa 600×600, sotto i 100 KB).
Senza foto viene mostrata un'illustrazione automatica.

> I prodotti e i prezzi attuali sono **di esempio**: vanno sostituiti con quelli reali.
