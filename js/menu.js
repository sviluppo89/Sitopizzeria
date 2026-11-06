/* =========================================================
   MENÙ DI PIZZERIA PALLONE
   ---------------------------------------------------------
   Per modificare il menù cambia solo questo file.
   (Menù importato da go.nordqr.com/pizzeria-pallone)

   CATEGORIA
     id       -> parola breve senza spazi (serve per i link)
     nome     -> titolo mostrato sul sito
     tipo     -> illustrazione se manca la foto:
                 "pizza", "offerta", "calzone", "fritto", "bevanda", "dolce"
     nota     -> (facoltativo) frase sotto il titolo
     foto     -> (facoltativo) foto sotto il titolo
     opzioni  -> (facoltativo) aggiunte con sovrapprezzo che il cliente
                 può scegliere, es. [{ nome: "Nel ruoto", prezzo: 2 }]
     offerte  -> true = i prodotti vanno nel carosello "Le offerte"
     piatti   -> elenco dei prodotti

   PRODOTTO
     nome         -> nome del prodotto
     ingredienti  -> (facoltativo) descrizione
     prezzo       -> numero con il punto per i decimali (6.5 = 6,50 €)
     varianti     -> (al posto di prezzo) formati/gusti con prezzo diverso,
                     es. [{ nome: "33 cl", prezzo: 2 }, { nome: "66 cl", prezzo: 3 }]
     tag          -> (facoltativo) ["piccante"], ["novita"], ["consigliata"], ["vegetariana"]
     foto         -> (facoltativo) es. "img/margherita.webp"
     fotoIntera   -> true = mostra la foto senza ritagli (volantini)
     disponibile  -> false = prodotto visibile ma non ordinabile
     giorni       -> (offerte) giorni validi: 0 = domenica ... 6 = sabato
     dettagli     -> (facoltativo) testo in più nella scheda del prodotto
     segnaposto   -> (facoltativo) suggerimento nel campo note
   ========================================================= */

/* ---------- DATI DELLA PIZZERIA ---------- */
const CONFIG = {
  nome: "Pizzeria Pallone",
  telefono: "0823 460661",
  whatsapp: "393887839516",            // solo numeri, con 39 davanti
  indirizzo: "Via Circumvallazione, 21",
  citta: "81020 Casapulla (CE)",
  instagram: "pizzeriapallone",
  email: "nicolapalma87@libero.it",

  /* Orari: un elenco per giorno (0 = domenica ... 6 = sabato).
     Ogni fascia è ["apertura", "chiusura"]. Giorno chiuso = [].
     Lascia orari: null per non mostrare orari e stato "Aperto/Chiuso".
     Esempio:
     orari: {
       0: [["18:30", "23:30"]],
       1: [],
       2: [["18:30", "23:30"]],
       3: [["18:30", "23:30"]],
       4: [["18:30", "23:30"]],
       5: [["18:30", "00:00"]],
       6: [["18:30", "00:00"]]
     }, */
  orari: null,

  /* Consegna a domicilio: metti i numeri per mostrarli (null = non mostrare) */
  consegna: {
    attiva: true,
    costo: null,        // es. 1.5
    minimoOrdine: null  // es. 10
  }
};

const MENU = [
  {
    id: "offerte",
    nome: "Le offerte",
    tipo: "offerta",
    offerte: true,
    piatti: [
      { nome: "Today's Special", ingredienti: "Pizza Classic + patatina o alghe + bibita", prezzo: 8, giorni: [1, 3, 5], dettagli: "Pizza Classic a scelta tra: Napoletana, Marinara, Margherita, Bufala, Diavola, Siciliana, 4 Formaggi, Cosacca, USA, Crocchè, Parmigiana, Ripieni.", segnaposto: "Scrivi la pizza, patatina o alghe e la bibita" },
      { nome: "Scrigno Party", ingredienti: "Scrigno o pizza special + patatina o alghe + bibita", prezzo: 9.99, giorni: [1, 3, 5], segnaposto: "Scrivi lo scrigno o la pizza, patatina o alghe e la bibita" },
      { nome: "Crazy Sunday", ingredienti: "Una selezione di pizze del menù a 5 €", prezzo: 5, giorni: [0], segnaposto: "Quale pizza dell'offerta?" },
      { nome: "Give Me 5", ingredienti: "Una selezione di pizze del menù a 5 €", prezzo: 5, giorni: [4, 0], segnaposto: "Quale pizza dell'offerta?" }
    ]
  },
  {
    id: "pizze",
    nome: "Le pizze",
    tipo: "pizza",
    opzioni: [{"nome": "Nel ruoto", "prezzo": 2}],
    piatti: [
      { nome: "Margherita", ingredienti: "Pomodoro San Marzano, Fior di latte, Olio evo, Basilico", prezzo: 5 },
      { nome: "Focaccia", ingredienti: "Olio evo, Origano", prezzo: 3 },
      { nome: "Napoletana", ingredienti: "Pomodoro San Marzano, Aglio, Origano, Olio Evo, Basilico", prezzo: 5 },
      { nome: "Marinara", ingredienti: "Pomodoro San Marzano, Alici di Cetara, Olive nere, Aglio, Olio evo, Basilico", prezzo: 5 },
      { nome: "Cosacca", ingredienti: "Pomodoro San Marzano, Pecorino Romano, Olio evo, Basilico", prezzo: 6 },
      { nome: "Diavola", ingredienti: "Pomodoro San Marzano, Fior di latte, Salame piccante, Olio evo, Basilico", prezzo: 6, tag: ["piccante"] },
      { nome: "Siciliana", ingredienti: "Pomodoro San Marzano, Fior di latte, Melanzane a funghetto, Grana Padano, Olio evo, Basilico", prezzo: 6.5 },
      { nome: "Marinara Gialla", ingredienti: "Pomodorini gialli, Capperi, Alici di Cetara, Olive nere, Aglio, Origano, Olio evo, Basilico", prezzo: 7 },
      { nome: "Bufala", ingredienti: "Pomodoro San Marzano, Mozzarella di Bufala DOP, Olio Evo, Basilico", prezzo: 7 },
      { nome: "Ortolana", ingredienti: "Fior di latte, Melanzane, Zucchine, Peperoni, Olio evo, Basilico", prezzo: 7 },
      { nome: "4 Formaggi", ingredienti: "Fior di latte, Gorgonzola DOP, Provola di Agerola, Parmigiano Reggiano, Olio evo, Basilico", prezzo: 7 },
      { nome: "USA", ingredienti: "Fior di latte, Würstel, Patatine stick, Olio evo", varianti: [{"nome": "Piccola", "prezzo": 7}, {"nome": "Media", "prezzo": 8}, {"nome": "Grande", "prezzo": 8}] },
      { nome: "Mimosa", ingredienti: "Fior di latte, Prosciutto cotto alla brace, Mais, Panna, Olio evo, Basilico", prezzo: 7 },
      { nome: "Parmigiana", ingredienti: "Pomodoro San Marzano, Fior di latte, Parmigiana di melanzane, Parmigiano Reggiano, Olio evo, Basilico", prezzo: 7 },
      { nome: "Crocchè", ingredienti: "Fior di latte, Crocchè Home Made, Prosciutto cotto alla brace, Olio evo, Basilico", prezzo: 8 },
      { nome: "O' Nonno", ingredienti: "Fior di latte, Salsiccia fresca, Patate al forno, Olio evo, Basilico", prezzo: 8 },
      { nome: "Tropea", ingredienti: "Fior di latte, Tonno, Cipolla rossa di Tropea IGP, Olio evo, Basilico", prezzo: 8 },
      { nome: "DOC", ingredienti: "Datterini rossi, Mozzarella di bufala DOP, Olio evo, Basilico", prezzo: 8 },
      { nome: "Capricciosa", ingredienti: "Pomodoro San Marzano, Fior di latte, Prosciutto cotto alla brace, Salame dolce, Olive nere, Carciofini, Funghi, Olio evo, Basilico", prezzo: 8 },
      { nome: "Carabiniera", ingredienti: "Pomodoro San Marzano, Mozzarella di bufala DOP, Salame piccante, Olive nere, Origano, Olio evo, Basilico", prezzo: 8, tag: ["piccante"] },
      { nome: "Mediterranea", ingredienti: "Fior di latte, Pomodorini, Rucola, Prosciutto crudo, Parmigiano Reggiano, Olio evo", prezzo: 8 },
      { nome: "Cacio e Gusto", ingredienti: "Fior di latte, Pancetta, Zucchine, Pecorino Romano, Olio evo", prezzo: 8 },
      { nome: "Cetara", ingredienti: "Mozzarella di bufala DOP, Pomodorini, Alici di Cetara, Olive nere, Olio evo", prezzo: 8 },
      { nome: "Laura", ingredienti: "Mozzarella di bufala DOP, Salame piccante, Patate al forno, Olio evo, Basilico", prezzo: 8, tag: ["piccante"] },
      { nome: "Ariccia", ingredienti: "Crema di patate, Provola di Agerola, Porchetta Ariccia artigianale, Parmigiano Reggiano, Olio evo, Basilico", prezzo: 8 },
      { nome: "Ninja", ingredienti: "Fior di latte, Gorgonzola DOP, Provola, Parmigiano reggiano, Salame piccante", prezzo: 9, tag: ["piccante"] },
      { nome: "Ross", ingredienti: "Provola, Pomodori gialli e rossi, Pepe", prezzo: 9 },
      { nome: "Giulia", ingredienti: "Fior di latte, Prosciutto crudo, Pomodorini confit, Stracciata di bufala", prezzo: 9 },
      { nome: "One Piece", ingredienti: "Fior di latte, Tonno, Olive nere, Pomodorini confit, Crumble di cipolla", prezzo: 9 },
      { nome: "Fresella", ingredienti: "Focaccia, Tonno, Pomodorini, Olive nere, Pesto, Origano, Mozzarella di bufala, Rucola", prezzo: 10 }
    ]
  },
  {
    id: "special",
    nome: "Pizze special",
    tipo: "pizza",
    opzioni: [{"nome": "Nel ruoto", "prezzo": 2}],
    piatti: [
      { nome: "La Zingara", ingredienti: "Prosciutto crudo, Insalata, Mozzarella di bufala, Pomodorini, Maionese", prezzo: 9 },
      { nome: "One Piece", ingredienti: "Fior di latte, Tonno, Olive, Pomodorini confit, Crumble di cipolla", prezzo: 9 },
      { nome: "Scrignuozzo Nic&Dan", ingredienti: "Provola, BBQ, Pulled pork, Patate al forno, Salame piccante, Salsa brasiliana", prezzo: 10, tag: ["piccante"] }
    ]
  },
  {
    id: "ruoto",
    nome: "Pizze nel ruoto",
    tipo: "pizza",
    nota: "Tutte le pizze del menù si possono avere anche nel ruoto con 2 € in più: scegli \"Nel ruoto\" quando aggiungi la pizza.",
    piatti: [
      { nome: "Pietro NY", ingredienti: "Pomodoro San Marzano, Fior di latte, Salame piccante, Miele, Olio e basilico", prezzo: 10, tag: ["piccante"] },
      { nome: "Mary Piennolo", ingredienti: "Pomodorini del piennolo, Alici di Cetara, Olive, Capperi, Aglio, Origano", prezzo: 10, disponibile: false },
      { nome: "LA “78”", ingredienti: "Sugo alla puttanesca, Tonno, Mozzarella di bufala, Basilico, Olio evo", prezzo: 10 },
      { nome: "Ciccio", ingredienti: "Salsiccia, Peperoni, Olive, Provola, Origano", prezzo: 10 }
    ]
  },
  {
    id: "ripieni",
    nome: "I ripieni",
    tipo: "calzone",
    piatti: [
      { nome: "Napoli", ingredienti: "Pomodoro San Marzano, Fior di latte, Salame dolce, Ricotta, Olio evo, Basilico", prezzo: 7 },
      { nome: "Classico", ingredienti: "Pomodoro San Marzano, Fior di latte, Prosciutto cotto alla brace, Funghi, Olio evo, Basilico", prezzo: 7 },
      { nome: "Scarola", ingredienti: "Scarola, Capperi, Alici di Cetara, Olive nere, Olio evo, Basilico", prezzo: 6.5 },
      { nome: "Parmigiana", ingredienti: "Pomodoro San Marzano, Fior di latte, Parmigiana di melanzane, Prosciutto cotto alla brace, Parmigiano Reggiano, Olio evo, Basilico", prezzo: 7 }
    ]
  },
  {
    id: "scrigni",
    nome: "Gli scrigni",
    tipo: "calzone",
    piatti: [
      { nome: "Scrigno Mediterranea", ingredienti: "Ripieno aperto in crosta di Parmigiano Reggiano, Prosciutto crudo, Mozzarella di bufala DOP, Rucola, Parmigiano Reggiano", prezzo: 8 },
      { nome: "Scrigno Pulled Pork", ingredienti: "Ripieno aperto in crosta di parmigiano reggiano, Pulled pork, Provola di Agerola, Patate al forno al burro, salsa BBQ", prezzo: 9 },
      { nome: "Scrigno Bandidos", ingredienti: "Ripieno aperto in crosta di parmigiano reggiano, Fior di latte, Patatine Dippers, Bandidos, Salsa cheddar", prezzo: 8 },
      { nome: "Scrigno Bacoli", ingredienti: "Mozzarella di bufala, Pesto, Parmigiana di melanzane, Parmigiano", prezzo: 9 },
      { nome: "Scrigno Poldo", ingredienti: "Polpettine di chianina, Würstel fritti, Patatine stick, Triplo cheddar, Maionese", prezzo: 9 },
      { nome: "Scrigno killer", ingredienti: "Fior di latte, Formaggio piccante, Salame piccante, Nuggets, Patatine, Salsa harissa", prezzo: 9, tag: ["piccante"] },
      { nome: "Scrigno Vittorio", ingredienti: "Crema cacio e pepe, Porchetta, Provola, Patate al forno al burro", prezzo: 9 }
    ]
  },
  {
    id: "panuozzo",
    nome: "Panuozzo",
    tipo: "calzone",
    piatti: [
      { nome: "Panuozzo a scelta", ingredienti: "Gli ingredienti li scegli tu!", varianti: [{"nome": "Piccolo", "prezzo": 6}, {"nome": "Medio", "prezzo": 7}, {"nome": "Grande", "prezzo": 8}], segnaposto: "Scrivi gli ingredienti che vuoi" }
    ]
  },
  {
    id: "fritture",
    nome: "Le fritture",
    tipo: "fritto",
    piatti: [
      { nome: "Crocchè", ingredienti: "Fatto in casa", prezzo: 1 },
      { nome: "Crocchè Ripieno", prezzo: 2 },
      { nome: "Frittelle alle alghe", ingredienti: "10 pezzi", prezzo: 2 },
      { nome: "Frittatina fatta in casa", ingredienti: "Scegli il gusto", varianti: [{"nome": "Prosciutto cotto e besciamella", "prezzo": 2.5}, {"nome": "Cacio e pepe", "prezzo": 2.5}, {"nome": "Carne macinata e piselli", "prezzo": 2.5}] },
      { nome: "Nuggets di pollo", varianti: [{"nome": "5 pezzi", "prezzo": 3}, {"nome": "10 pezzi", "prezzo": 5}] },
      { nome: "Bandidos di pollo", varianti: [{"nome": "5 pezzi", "prezzo": 3}, {"nome": "10 pezzi", "prezzo": 5}] },
      { nome: "Jalapeños piccanti", varianti: [{"nome": "3 pezzi", "prezzo": 3}, {"nome": "6 pezzi", "prezzo": 5}], tag: ["piccante"] },
      { nome: "Anelli di cipolla", varianti: [{"nome": "5 pezzi", "prezzo": 3}, {"nome": "10 pezzi", "prezzo": 5}] },
      { nome: "Patatine stick", varianti: [{"nome": "Piccola", "prezzo": 2.5}, {"nome": "Grande", "prezzo": 5}] },
      { nome: "Patatine Dippers / Twister", varianti: [{"nome": "Piccola", "prezzo": 3.5}, {"nome": "Grande", "prezzo": 6}] },
      { nome: "Montanara classica", ingredienti: "Pomodoro San Marzano, Mozzarella, Parmigiano", prezzo: 2 },
      { nome: "Montanara special", prezzo: 2.5 },
      { nome: "Pallone Box", ingredienti: "Patate Dippers, 5 Bandidos, 10 frittelle alle alghe, 5 anelli di cipolla, 5 nuggets", prezzo: 13.5 }
    ]
  },
  {
    id: "dolci",
    nome: "I dolci",
    tipo: "dolce",
    piatti: [
      { nome: "Pizza Nutella", ingredienti: "Focaccia, Nutella, Zucchero a velo", prezzo: 6 },
      { nome: "Pallone Choc", ingredienti: "Straccetti di pizza, Nutella, Zucchero a velo", prezzo: 6 }
    ]
  },
  {
    id: "bibite",
    nome: "Le bibite",
    tipo: "bevanda",
    piatti: [
      { nome: "Acqua", ingredienti: "0,5 L", prezzo: 1 },
      { nome: "Coca-Cola", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "1,5 L", "prezzo": 3.5}] },
      { nome: "Coca-Cola Zero", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "1,5 L", "prezzo": 3.5}] },
      { nome: "Fanta", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "1,5 L", "prezzo": 3.5}] },
      { nome: "Sprite", ingredienti: "33 cl", prezzo: 2 },
      { nome: "Estathè", ingredienti: "33 cl", prezzo: 2 },
      { nome: "Peroni", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "66 cl", "prezzo": 3}] },
      { nome: "Heineken", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "66 cl", "prezzo": 3}] },
      { nome: "Nastro Azzurro", varianti: [{"nome": "33 cl", "prezzo": 2}, {"nome": "66 cl", "prezzo": 3}] }
    ]
  }
];

/* Aggiunte mostrate in fondo al menù. Lascia [] per nasconderle. */
const AGGIUNTE = [];
