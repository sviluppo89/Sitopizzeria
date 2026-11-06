/* =========================================================
   MENÙ DI PIZZERIA PALLONE
   ---------------------------------------------------------
   Per modificare il menù cambia solo questo file.

   Ogni categoria ha:
     id      -> parola breve senza spazi (serve per i link)
     nome    -> titolo mostrato sul sito
     nota    -> (facoltativo) frase sotto il titolo
     tipo    -> illustrazione: "pizza", "calzone", "fritto", "bevanda", "dolce"
     piatti  -> elenco dei prodotti

   Ogni prodotto ha:
     nome         -> nome del prodotto
     ingredienti  -> (facoltativo) descrizione
     prezzo       -> numero con il punto per i decimali (es. 6.5 = € 6,50)
     tag          -> (facoltativo) uno o più tra:
                     "novita", "piccante", "vegetariana", "consigliata"

   Facoltativo per ogni prodotto:
     foto         -> percorso di una foto, es. "img/margherita.jpg"
                     (se manca viene mostrata un'illustrazione)

   ATTENZIONE: prodotti e prezzi qui sotto sono di ESEMPIO.
   Sostituiscili con quelli reali della pizzeria.
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
    id: "classiche",
    tipo: "pizza",
    nome: "Pizze Classiche",
    piatti: [
      { nome: "Marinara", ingredienti: "Pomodoro, aglio, origano, olio EVO", prezzo: 4.0, tag: ["vegetariana"] },
      { nome: "Margherita", ingredienti: "Pomodoro, fior di latte, basilico, olio EVO", prezzo: 5.0, tag: ["vegetariana"] },
      { nome: "Napoli", ingredienti: "Pomodoro, fior di latte, alici, origano", prezzo: 6.0 },
      { nome: "Diavola", ingredienti: "Pomodoro, fior di latte, salame piccante", prezzo: 6.5, tag: ["piccante"] },
      { nome: "Prosciutto e Funghi", ingredienti: "Pomodoro, fior di latte, prosciutto cotto, funghi champignon", prezzo: 7.0 },
      { nome: "Capricciosa", ingredienti: "Pomodoro, fior di latte, prosciutto cotto, funghi, carciofi, olive", prezzo: 7.5 },
      { nome: "Quattro Formaggi", ingredienti: "Fior di latte, gorgonzola, provola, parmigiano", prezzo: 7.0, tag: ["vegetariana"] },
      { nome: "Wurstel e Patatine", ingredienti: "Fior di latte, wurstel, patatine fritte", prezzo: 6.5 }
    ]
  },
  {
    id: "speciali",
    tipo: "pizza",
    nome: "Pizze Speciali",
    nota: "Le creazioni della casa.",
    piatti: [
      { nome: "Pallone", ingredienti: "Pomodorino giallo, bufala, pancetta croccante, basilico", prezzo: 9.0, tag: ["consigliata"] },
      { nome: "Salsiccia e Friarielli", ingredienti: "Fior di latte, salsiccia, friarielli, peperoncino", prezzo: 8.0, tag: ["piccante"] },
      { nome: "Bufalina", ingredienti: "Pomodoro, mozzarella di bufala campana DOP, basilico", prezzo: 8.0, tag: ["vegetariana"] },
      { nome: "Patate e Provola", ingredienti: "Provola affumicata, patate al forno, pepe, rosmarino", prezzo: 7.0, tag: ["vegetariana"] },
      { nome: "Ortolana", ingredienti: "Fior di latte, melanzane, zucchine, peperoni grigliati", prezzo: 7.5, tag: ["vegetariana"] },
      { nome: "Crudo e Rucola", ingredienti: "Fior di latte, prosciutto crudo, rucola, scaglie di grana", prezzo: 8.5 },
      { nome: "Tonno e Cipolla", ingredienti: "Pomodoro, fior di latte, tonno, cipolla di Tropea", prezzo: 7.5, tag: ["novita"] }
    ]
  },
  {
    id: "calzoni",
    tipo: "calzone",
    nome: "Calzoni e Fritte",
    piatti: [
      { nome: "Calzone al Forno", ingredienti: "Ricotta, salame, fior di latte, pomodoro", prezzo: 7.0 },
      { nome: "Ripieno Fritto", ingredienti: "Ricotta, cicoli, provola, pepe", prezzo: 7.0 },
      { nome: "Montanara", ingredienti: "Pizzetta fritta con pomodoro, parmigiano e basilico", prezzo: 3.5, tag: ["vegetariana"] }
    ]
  },
  {
    id: "fritti",
    tipo: "fritto",
    nome: "Fritti",
    piatti: [
      { nome: "Crocchè di Patate", prezzo: 1.5, tag: ["vegetariana"] },
      { nome: "Frittatina di Pasta", ingredienti: "Bucatini, besciamella, piselli, prosciutto", prezzo: 2.5 },
      { nome: "Arancino", ingredienti: "Riso, ragù, fior di latte", prezzo: 2.5 },
      { nome: "Zeppoline", ingredienti: "Pasta cresciuta, 6 pezzi", prezzo: 2.5, tag: ["vegetariana"] },
      { nome: "Patatine Fritte", ingredienti: "Porzione", prezzo: 3.0, tag: ["vegetariana"] }
    ]
  },
  {
    id: "bevande",
    tipo: "bevanda",
    nome: "Bevande",
    piatti: [
      { nome: "Acqua naturale / frizzante", ingredienti: "0,5 L", prezzo: 1.0 },
      { nome: "Coca-Cola, Fanta, Sprite", ingredienti: "Lattina 33 cl", prezzo: 2.0 },
      { nome: "Birra Peroni", ingredienti: "Bottiglia 66 cl", prezzo: 3.0 },
      { nome: "Birra artigianale", ingredienti: "Bottiglia 33 cl", prezzo: 4.0 }
    ]
  },
  {
    id: "dolci",
    tipo: "dolce",
    nome: "Dolci",
    piatti: [
      { nome: "Pizza alla Nutella", ingredienti: "Disco di pizza con Nutella e zucchero a velo", prezzo: 5.0, tag: ["vegetariana"] },
      { nome: "Graffa", ingredienti: "Ciambella fritta zuccherata", prezzo: 1.5, tag: ["vegetariana"] }
    ]
  }
];

/* Aggiunte: mostrate in fondo al menù. Lascia [] per nasconderle. */
const AGGIUNTE = [
  "Mozzarella di bufala +€ 2,00",
  "Ogni ingrediente extra +€ 1,00",
  "Impasto integrale +€ 1,00"
];
