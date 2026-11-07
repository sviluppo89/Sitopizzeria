/* Illustrazioni dei prodotti (usate dal sito e dalla pagina admin).
   Se il prodotto ha una foto mostra la foto, altrimenti un disegno
   creato in base al tipo e agli ingredienti. */
(function () {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /* ---------- Illustrazioni SVG (usate se manca la foto) ---------- */
  function art(p) {
    if (p.foto) return `<img src="${esc(p.foto)}" alt="" loading="lazy" decoding="async"${p.fotoIntera ? ' class="is-contain"' : ""}>`;
    const ing = norm(p.ingredienti);
    const R = "#d7141d", CR = "#c08e4c", W = "#fffaf0", G = "#2f8a4e";
    const seed = [...p.nome].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = (i) => { const x = Math.sin(seed * 9.1 + i * 7.3) * 10000; return x - Math.floor(x); };
    let k = 0; // distribuzione a spirale (angolo aureo) per sparpagliare bene i condimenti
    const dots = (n, r, color, rad = 30) => Array.from({ length: n }, (_, i) => {
      k++;
      const a = k * 2.39996 + rnd(k) * .6, d = Math.sqrt((i + .5) / n) * rad * (.85 + rnd(k + 9) * .2);
      return `<circle cx="${(50 + Math.cos(a) * d).toFixed(1)}" cy="${(50 + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="${color}"/>`;
    }).join("");
    switch (p.tipo) {
      case "calzone":
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M12 62a38 38 0 0 1 76 0z" fill="${CR}"/><path d="M18 60a32 32 0 0 1 64 0" fill="none" stroke="#a87638" stroke-width="2" stroke-dasharray="3 5"/>${ing.includes("pomodoro") || ing.includes("montanara") ? `<circle cx="40" cy="44" r="4" fill="${R}"/>` : ""}<path d="M8 62h84" stroke="#a87638" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "fritto":
        if (/patatine|dippers|stick/.test(norm(p.nome))) // cono di patatine
          return `<svg viewBox="0 0 100 100" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<rect x="${30 + i * 6}" y="${16 + (i % 3) * 5}" width="5" height="40" rx="2" fill="#f2c23a" transform="rotate(${-14 + i * 4.5} ${32 + i * 6} 56)"/>`).join("")}<path d="M24 44h52l-8 40H32z" fill="${R}"/><path d="M24 44h52" stroke="#a80f16" stroke-width="3"/></svg>`;
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="70" rx="38" ry="10" fill="#0001"/><circle cx="36" cy="56" r="16" fill="#d9a441"/><circle cx="62" cy="54" r="17" fill="#c98f2e"/><circle cx="50" cy="38" r="15" fill="#e3b155"/>${dots(10, 1.4, "#a8711d", 26)}</svg>`;
      case "bevanda": {
        const n = norm(p.nome);
        const birra = /peroni|heineken|nastro|birra/.test(n);
        const col = /zero/.test(n) ? "#1d1d1d" : /coca/.test(n) ? R : /fanta/.test(n) ? "#f18a1c" : /sprite/.test(n) ? "#2f9e4a"
          : /estath/.test(n) ? "#e9b425" : /acqua/.test(n) ? "#5aa9e6" : /heineken/.test(n) ? "#1f7a3c" : /nastro/.test(n) ? "#2457a6" : birra ? "#b8761f" : R;
        return birra
          ? `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M44 10h12v16c0 4 8 8 8 16v44a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4V42c0-8 8-12 8-16z" fill="${col}"/><rect x="38" y="50" width="24" height="18" rx="2" fill="${W}"/><rect x="43" y="6" width="14" height="6" rx="2" fill="#c9a227"/><rect x="40" y="44" width="4" height="38" rx="2" fill="#fff3"/></svg>`
          : `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="36" y="20" width="28" height="62" rx="8" fill="${col}"/><rect x="36" y="38" width="28" height="18" fill="${W}"/><rect x="40" y="14" width="20" height="8" rx="3" fill="#9aa"/><rect x="40" y="26" width="5" height="50" rx="2.5" fill="#fff4"/></svg>`;
      }
      case "dolce":
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" fill="${CR}"/><circle cx="50" cy="50" r="30" fill="#5a3418"/>${dots(14, 1.6, W, 26)}</svg>`;
      case "offerta": return cover(p);
      default: { // pizza: il disegno cambia in base agli ingredienti
        const has = (re) => re.test(ing);
        const base = has(/pomodorini gialli|pomodori gialli/) && !has(/san marzano/) ? "#f3b52c"
          : has(/pomodoro|sugo|datterini rossi/) ? R
          : has(/crema di patate|crema cacio/) ? "#f1dcae" : W;
        const rossa = base === R;
        const layers = [];
        const add = (re, fn) => { if (has(re)) layers.push(fn()); };
        add(/fior di latte|mozzarella|bufala|provola|stracciat|formaggio/, () => dots(has(/bufala|stracciat/) ? 6 : 7, has(/bufala|stracciat/) ? 6.5 : 5.5, rossa ? W : "#f6ead0", 26));
        add(/gorgonzola/, () => dots(5, 3, "#9fb3a0", 24));
        add(/salame|salsiccia|porchetta|pulled|polpettine/, () => dots(6, 4.4, "#9b2b23", 27));
        add(/pancetta/, () => dots(6, 3, "#c4554a", 26));
        add(/prosciutto/, () => dots(5, 5, "#e7a3a0", 25));
        add(/w.?rstel/, () => dots(6, 3.4, "#d9824a", 25));
        add(/funghi/, () => dots(5, 3.4, "#a07850", 24));
        add(/melanzane|parmigiana/, () => dots(6, 3.6, "#5b2e4f", 25));
        add(/zucchine/, () => dots(6, 3.2, "#7fb069", 26));
        add(/peperoni/, () => dots(4, 3.2, "#f3b52c", 24) + dots(3, 3.2, "#e0442d", 22));
        add(/carciof/, () => dots(4, 3.6, "#9bb46b", 22));
        add(/patate|patatine|crocche/, () => dots(6, 3.6, "#f2c23a", 25));
        add(/mais/, () => dots(12, 1.6, "#f5d33f", 28));
        add(/pomodorini|datterini|confit/, () => dots(6, 3.4, rossa ? "#ff5a4e" : "#e3241f", 26));
        add(/tonno|alici/, () => dots(5, 3, "#8d8d8d", 25));
        add(/olive/, () => dots(6, 2.2, "#2b2b2b", 27));
        add(/capperi/, () => dots(8, 1.4, "#5d7a2e", 27));
        add(/cipolla/, () => Array.from({ length: 4 }, (_, i) => { k++; const a = k * 2.4, d = 10 + i * 5; return `<circle cx="${(50 + Math.cos(a) * d).toFixed(1)}" cy="${(50 + Math.sin(a) * d).toFixed(1)}" r="4" fill="none" stroke="#8e3b8a" stroke-width="1.6"/>`; }).join(""));
        add(/rucola|insalata|scarola|friariell|pesto/, () => dots(10, 2, "#3f8f3a", 28));
        add(/parmigiano|grana|pecorino/, () => dots(14, 1, "#fff6dc", 29));
        add(/basilico/, () => Array.from({ length: 3 }, (_, i) => { k++; const a = k * 2.4, d = 8 + i * 8, x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.6" fill="${G}" transform="rotate(${(a * 57) % 180 | 0} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join(""));
        add(/origano/, () => dots(16, .9, "#4d7a3a", 29));
        add(/miele/, () => `<path d="M30 40q20 10 40 0" fill="none" stroke="#f0b429" stroke-width="2" stroke-linecap="round"/>`);
        add(/^olio evo, origano$/, () => "");
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="44" fill="#0001"/><circle cx="50" cy="50" r="44" fill="${CR}"/><circle cx="50" cy="50" r="36" fill="${base}"/>${layers.join("")}</svg>`;
      }
    }
  }


  /* ---------- Copertine delle offerte ----------
     Illustrazione minimale 16:10 con i colori del logo.
     Gli elementi dipendono dal testo dell'offerta:
     pizza (o scrigno/calzone), patatine o alghe, bibita, numero di pizze.
     Il colore di sfondo cambia da offerta a offerta. */
  const THEMES = [
    { bg: "#0b4d2c", blob: "#d7141d", dots: "#ffffff", sticker: "#ffffff", ink: "#0b4d2c", plate: "#ffffff", plateOp: .12 },
    { bg: "#d7141d", blob: "#0b4d2c", dots: "#ffffff", sticker: "#ffffff", ink: "#d7141d", plate: "#ffffff", plateOp: .16 },
    { bg: "#c08e4c", blob: "#0b4d2c", dots: "#ffffff", sticker: "#ffffff", ink: "#0b4d2c", plate: "#fbf1e1", plateOp: 1 },
    { bg: "#1f2a24", blob: "#c08e4c", dots: "#ffffff", sticker: "#d7141d", ink: "#ffffff", plate: "#ffffff", plateOp: .1 }
  ];
  const euroShort = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(".", ",")) + " €";
  function cover(p) {
    const txt = norm([p.nome, p.ingredienti].join(" ")); // solo nome e descrizione: i dettagli elencano le pizze a scelta
    const seed = [...String(p.nome || "")].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); // stesso nome = stesso colore
    const t = THEMES[seed % THEMES.length];
    const R = "#d7141d", CR = "#c08e4c", W = "#fffaf0", G = "#2f8a4e";
    const calzone = /scrign|calzon|panuozz/.test(txt);
    const fries = /patatin|alghe|fritt|chips|crocch/.test(txt);
    const drink = /bibit|drink|coca|bevand|birra|lattina/.test(txt);
    const two = /\b(2|due) pizz/.test(txt);

    // sfondo: colore pieno, cerchio come nel logo, puntini leggeri
    let dots = "";
    for (let y = 14; y < 200; y += 26) for (let x = 14 + ((y / 26) % 2) * 13; x < 320; x += 26) dots += `<circle cx="${x}" cy="${y}" r="1.6"/>`;
    const bg = `<rect width="320" height="200" fill="${t.bg}"/><g fill="${t.dots}" opacity=".09">${dots}</g>
      <circle cx="300" cy="-6" r="92" fill="${t.blob}"/><circle cx="-18" cy="214" r="62" fill="${t.blob}" opacity=".55"/>`;

    // pizza vista dall'alto
    const pizza = (cx, cy, r) => {
      const m = [[-.35, -.3], [.3, -.38], [.05, .05], [-.4, .28], [.35, .3], [-.02, .5]];
      return `<ellipse cx="${cx}" cy="${cy + r * .93}" rx="${r * .95}" ry="${r * .16}" fill="#000" opacity=".16"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 1.13}" fill="${t.plate}" fill-opacity="${t.plateOp}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${CR}"/><circle cx="${cx}" cy="${cy}" r="${r * .82}" fill="${R}"/>
        ${m.map(([a, b]) => `<circle cx="${cx + a * r}" cy="${cy + b * r}" r="${r * .15}" fill="${W}"/>`).join("")}
        <ellipse cx="${cx + .18 * r}" cy="${cy - .12 * r}" rx="${r * .14}" ry="${r * .07}" fill="${G}" transform="rotate(-30 ${cx + .18 * r} ${cy - .12 * r})"/>
        <ellipse cx="${cx - .2 * r}" cy="${cy + .18 * r}" rx="${r * .13}" ry="${r * .065}" fill="${G}" transform="rotate(25 ${cx - .2 * r} ${cy + .18 * r})"/>`;
    };
    // scrigno / calzone
    const calz = (cx, cy, r) => `<ellipse cx="${cx}" cy="${cy + 6}" rx="${r * 1.05}" ry="${r * .18}" fill="#000" opacity=".16"/>
      <path d="M${cx - r} ${cy}a${r} ${r * .9} 0 0 1 ${2 * r} 0z" fill="${CR}"/>
      <path d="M${cx - r * .82} ${cy - 3}a${r * .82} ${r * .72} 0 0 1 ${1.64 * r} 0" fill="none" stroke="#a87638" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>
      ${[[-.35, -.42], [.1, -.6], [.45, -.35]].map(([a, b]) => `<circle cx="${cx + a * r}" cy="${cy + b * r}" r="${r * .07}" fill="#8a5a24" opacity=".6"/>`).join("")}`;
    // cono di patatine
    const friesCone = (x, y) => `<g>${[0, 1, 2, 3, 4].map((i) => `<rect x="${x + 4 + i * 7}" y="${y - 30 + (i % 2) * 6}" width="6" height="34" rx="2.5" fill="#f2c23a" transform="rotate(${-12 + i * 6} ${x + 7 + i * 7} ${y})"/>`).join("")}
      <path d="M${x - 2} ${y}h46l-7 40H${x + 5}z" fill="${t.bg === R ? "#ffffff" : R}"/><path d="M${x - 2} ${y}h46" stroke="#000" stroke-opacity=".15" stroke-width="3"/></g>`;
    // bibita
    const bottle = (x, y) => `<g><ellipse cx="${x + 11}" cy="${y + 66}" rx="15" ry="4" fill="#000" opacity=".16"/>
      <rect x="${x}" y="${y}" width="22" height="64" rx="7" fill="${t.bg === R ? "#ffffff" : R}"/>
      <rect x="${x}" y="${y + 20}" width="22" height="16" fill="${t.bg === R ? R : W}"/>
      <rect x="${x + 4}" y="${y - 7}" width="14" height="8" rx="3" fill="#9aa5a0"/>
      <rect x="${x + 4}" y="${y + 6}" width="4" height="52" rx="2" fill="#fff" opacity=".35"/></g>`;

    // composizione centrata (resta leggibile anche ritagliata quadrata)
    let main;
    if (calzone) main = calz(160, 132, 62);
    else if (two) main = pizza(128, 104, 44) + pizza(188, 112, 50);
    else main = pizza(158, 104, 56);
    const side = (fries ? friesCone(62, 128) : "") + (drink ? bottle(238, 88) : "");

    // bollino con il prezzo
    const price = typeof p.prezzo === "number" && Number.isFinite(p.prezzo) ? euroShort(p.prezzo) : "";
    // in alto a destra ma non nell'angolo (lì c'è il pulsante di chiusura della scheda)
    const fs = price.length > 6 ? 14 : price.length > 5 ? 16 : 20, X = 238, Y = 44; // es. "8 €", "9,99 €", "19,90 €"
    const sticker = price ? `<g transform="rotate(-8 ${X} ${Y})"><circle cx="${X}" cy="${Y}" r="30" fill="${t.sticker}"/>
      <circle cx="${X}" cy="${Y}" r="25.5" fill="none" stroke="${t.ink}" stroke-opacity=".25" stroke-width="1.5" stroke-dasharray="3 4"/>
      <text x="${X}" y="${Y + fs * .36}" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="${fs}" fill="${t.ink}">${esc(price)}</text></g>` : "";

    return `<svg class="art-cover" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bg}${side}${main}${sticker}</svg>`;
  }

  window.pallonArt = art;
})();
