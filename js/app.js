(function () {
  "use strict";

  /* ---------- Utilità ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const fmt = (n) => euro.format(n);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* niente */ } }
  };
  const live = (msg) => { const el = $("#live"); el.textContent = ""; setTimeout(() => (el.textContent = msg), 30); };
  const vibrate = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* niente */ } };

  const C = typeof CONFIG !== "undefined" ? CONFIG : {};
  const TAG_INFO = {
    vegetariana: { ico: "🌱", label: "Vegetariana" },
    piccante: { ico: "🌶️", label: "Piccante" },
    novita: { ico: "✨", label: "Novità" },
    consigliata: { ico: "★", label: "La più amata" }
  };

  /* ---------- Indice prodotti ---------- */
  const PRODUCTS = new Map();
  const CAT_IDS = {}; // categoria -> elenco id prodotti, nell'ordine del menù
  MENU.forEach((cat) => {
    CAT_IDS[cat.id] = cat.piatti.map((p) => {
      let id = `${cat.id}-${slug(p.nome)}`;
      while (PRODUCTS.has(id)) id += "-2";
      PRODUCTS.set(id, {
        ...p, id, tag: p.tag || [], tipo: cat.tipo || "pizza", cat: cat.id,
        varianti: p.varianti || null, opzioni: p.opzioni || cat.opzioni || [],
        disponibile: p.disponibile !== false, offerta: !!cat.offerte
      });
      return id;
    });
  });

  /* Prezzi, varianti e offerte */
  const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const validToday = (p) => !p.giorni || p.giorni.includes(new Date().getDay());
  const daysLabel = (p) => (p.giorni || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_SHORT[d]).join(" · ");
  const canOrder = (p) => p.disponibile && validToday(p);
  const needsSheet = (p) => !!(p.varianti || p.segnaposto);
  const priceLabel = (p) => {
    if (!p.varianti) return fmt(p.prezzo);
    const ps = p.varianti.map((v) => v.prezzo);
    const min = Math.min(...ps);
    return ps.every((x) => x === min) ? fmt(min) : `da ${fmt(min)}`;
  };
  const descOf = (p) => p.ingredienti && p.ingredienti !== "Scegli il gusto" ? p.ingredienti : (p.varianti ? p.varianti.map((v) => v.nome).join(" · ") : (p.ingredienti || ""));
  const unitPrice = (l) => {
    const p = PRODUCTS.get(l.id);
    const base = p.varianti ? (p.varianti[l.v] || p.varianti[0]).prezzo : p.prezzo;
    return base + (l.o || []).reduce((a, i) => a + ((p.opzioni[i] || {}).prezzo || 0), 0);
  };
  const lineLabel = (l) => {
    const p = PRODUCTS.get(l.id);
    const bits = [];
    if (p.varianti) bits.push((p.varianti[l.v] || p.varianti[0]).nome);
    (l.o || []).forEach((i) => p.opzioni[i] && bits.push(p.opzioni[i].nome.toLowerCase()));
    return p.nome + (bits.length ? ` (${bits.join(", ")})` : "");
  };

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
      case "offerta": // pizza + patatine + bibita
        return `<svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="42" cy="56" r="32" fill="${CR}"/><circle cx="42" cy="56" r="26" fill="${R}"/>
          ${[[34, 48], [50, 52], [38, 66], [52, 68], [44, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${W}"/>`).join("")}
          <path d="M44 46c4-4 9-3 10 1-4 3-8 3-10-1z" fill="${G}"/>
          <rect x="70" y="30" width="16" height="44" rx="5" fill="${R}"/><rect x="70" y="42" width="16" height="11" fill="${W}"/><rect x="73" y="25" width="10" height="6" rx="2" fill="#9aa"/>
          ${[0, 1, 2, 3].map((i) => `<rect x="${12 + i * 5}" y="${10 + (i % 2) * 4}" width="3.5" height="20" rx="1.5" fill="#f2c23a" transform="rotate(${-12 + i * 8} ${14 + i * 5} 30)"/>`).join("")}
          <path d="M8 22h26l-4 18H12z" fill="${R}"/></svg>`;
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

  const badges = (tags, onlyIcons) => tags.map((t) => {
    const i = TAG_INFO[t]; if (!i) return "";
    return onlyIcons
      ? (t === "vegetariana" || t === "piccante" ? `<span class="ico-tag" role="img" aria-label="${i.label}" title="${i.label}">${i.ico}</span>` : "")
      : `<span class="badge badge--${t}">${i.ico} ${i.label}</span>`;
  }).join("");

  /* ---------- Stato ---------- */
  const state = {
    // righe del carrello: { id, qty, note, v: indice variante, o: [indici opzioni] }
    cart: store.get("pallone-cart", []).filter((l) => PRODUCTS.has(l.id) && (!PRODUCTS.get(l.id).varianti || PRODUCTS.get(l.id).varianti[l.v])),
    mode: store.get("pallone-mode", "asporto"),
    filters: new Set(),
    query: ""
  };
  const save = () => { store.set("pallone-cart", state.cart); store.set("pallone-mode", state.mode); };
  const qtyOf = (id) => state.cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);
  const subtotal = () => state.cart.reduce((a, l) => a + unitPrice(l) * l.qty, 0);
  const deliveryFee = () => (state.mode === "domicilio" && C.consegna && typeof C.consegna.costo === "number" ? C.consegna.costo : 0);

  /* ---------- Link di contatto ---------- */
  const tel = "tel:+39" + String(C.telefono || "").replace(/\D/g, "");
  const waBase = "https://wa.me/" + C.whatsapp;
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${C.nome} ${C.indirizzo} ${C.citta}`);
  ["#q-call", "#i-call", "#d-call", "#cs-call"].forEach((s) => ($(s).href = tel));
  $("#q-wa").href = waBase + "?text=" + encodeURIComponent(`Ciao ${C.nome}! `);
  $("#i-wa").href = waBase;
  ["#q-map", "#i-map"].forEach((s) => ($(s).href = mapUrl));
  $("#i-addr").textContent = C.indirizzo;
  $("#i-city").textContent = C.citta;
  $("#i-phone").textContent = C.telefono;
  $("#i-wa-num").textContent = "+" + String(C.whatsapp).replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, "$1 $2 $3 $4");
  $("#i-ig").href = "https://instagram.com/" + C.instagram;
  $("#i-ig-name").textContent = "@" + C.instagram;
  if (C.email) $("#f-mail").innerHTML = `<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`;

  /* ---------- Orari e stato aperto/chiuso ---------- */
  const DAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  function openInfo(now = new Date()) {
    const O = C.orari; if (!O) return null;
    const mins = now.getHours() * 60 + now.getMinutes();
    const d = now.getDay();
    // fasce di oggi + fasce di ieri che superano la mezzanotte
    const check = [];
    (O[d] || []).forEach(([a, b]) => { let e = toMin(b); const s = toMin(a); if (e <= s) e += 1440; check.push([s, e]); });
    (O[(d + 6) % 7] || []).forEach(([a, b]) => { const s = toMin(a); const e = toMin(b); if (e <= s) check.push([s - 1440, e]); });
    const cur = check.find(([s, e]) => mins >= s && mins < e);
    if (cur) { const e = cur[1] % 1440; return { open: true, text: `Aperto · chiude alle ${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}` }; }
    const next = (O[d] || []).map(([a]) => toMin(a)).find((s) => s > mins);
    if (next != null) return { open: false, text: `Chiuso · apre alle ${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}` };
    return { open: false, text: "Chiuso ora" };
  }
  function renderHours() {
    const info = openInfo();
    if (!info) return;
    const st = $("#status");
    st.hidden = false; st.textContent = info.text.split(" · ")[0];
    st.title = info.text;
    st.classList.toggle("is-open", info.open); st.classList.toggle("is-closed", !info.open);
    const today = new Date().getDay();
    $("#hours").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const f = C.orari[d] || [];
      return `<li class="${d === today ? "is-today" : ""}"><span>${DAYS[d]}</span><span>${f.length ? f.map(([a, b]) => `${a}–${b}`).join(", ") : "Chiuso"}</span></li>`;
    }).join("");
    $("#hours-card").hidden = false;
  }
  renderHours();

  /* ---------- Render menù ---------- */
  $("#cats").innerHTML = MENU.map((c) => `<a class="cat" href="#cat-${esc(c.id)}" data-id="${esc(c.id)}">${esc(c.nome)}</a>`).join("");

  const addBtn = (id) => {
    const p = PRODUCTS.get(id);
    if (!canOrder(p)) return "";
    const q = qtyOf(id);
    return `<button type="button" class="add${q ? " has-qty" : ""}" data-add="${id}" aria-label="Aggiungi ${esc(p.nome)}${q ? `, già ${q} nel carrello` : ""}">${q ? q : "+"}</button>`;
  };
  const statusBadge = (p) => !p.disponibile ? `<span class="badge badge--off">Non disponibile</span>`
    : p.giorni ? (validToday(p) ? `<span class="badge badge--today">Valida oggi</span>` : `<span class="badge badge--days">${daysLabel(p)}</span>`) : "";

  $("#menu-list").innerHTML = MENU.map((c) => `
    <section class="cat-section" id="cat-${esc(c.id)}" data-id="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
      <h3 class="cat-section__title" id="h-${esc(c.id)}">${esc(c.nome)}</h3>
      ${c.nota ? `<p class="cat-section__note">${esc(c.nota)}</p>` : ""}
      ${c.foto ? `<img class="cat-section__img" src="${esc(c.foto)}" alt="" loading="lazy" decoding="async">` : ""}
      <ul class="items">
        ${CAT_IDS[c.id].map((pid) => {
          const p = PRODUCTS.get(pid);
          return `
          <li class="item${canOrder(p) ? "" : " is-off"}" data-id="${p.id}" data-tags="${p.tag.join(" ")}" data-search="${esc(norm([p.nome, p.ingredienti, c.nome, ...(p.varianti || []).map((v) => v.nome)].join(" ")))}">
            <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${priceLabel(p)}. Dettagli"></button>
            <div class="item__main">
              <h4 class="item__name">${esc(p.nome)} ${badges(p.tag, true)}</h4>
              ${descOf(p) ? `<p class="item__desc">${esc(descOf(p))}</p>` : ""}
              <span class="item__price">${priceLabel(p)}</span>
              ${p.tag.includes("novita") ? ` <span class="badge badge--novita">✨ Novità</span>` : ""}
              ${statusBadge(p)}
            </div>
            <div class="item__media">
              <div class="item__art">${art(p)}</div>
              ${addBtn(p.id)}
            </div>
          </li>`;
        }).join("")}
      </ul>
    </section>`).join("");

  // Carosello: le offerte (quelle valide oggi per prime), altrimenti i prodotti consigliati
  const offers = [...PRODUCTS.values()].filter((p) => p.offerta);
  const featuredList = offers.length
    ? offers.sort((a, b) => validToday(b) - validToday(a))
    : [...PRODUCTS.values()].filter((p) => p.tag.includes("consigliata") || p.tag.includes("novita"));
  if (offers.length) $("#featured-title").textContent = "Le offerte";
  else $(".section-head__link").remove();
  if (!featuredList.length) $("#featured-wrap").remove();
  $("#featured").innerHTML = featuredList.map((p) => `
    <div class="fcard${canOrder(p) ? "" : " is-off"}" data-id="${p.id}">
      <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${priceLabel(p)}. Dettagli"></button>
      <div class="fcard__art">${art(p)}</div>
      ${p.giorni ? statusBadge(p) : p.tag.includes("consigliata") ? `<span class="badge badge--consigliata">★ La più amata</span>` : p.tag.includes("novita") ? `<span class="badge badge--novita">✨ Novità</span>` : ""}
      <div class="fcard__body">
        <span class="fcard__name">${esc(p.nome)}</span>
        <span class="fcard__desc">${esc(descOf(p))}</span>
        <span class="fcard__price">${priceLabel(p)}</span>
      </div>
      ${addBtn(p.id)}
    </div>`).join("");

  if (typeof AGGIUNTE !== "undefined" && AGGIUNTE.length) {
    $("#extras-list").innerHTML = AGGIUNTE.map((a) => `<li>${esc(a)}</li>`).join("");
    $("#extras").hidden = false;
  }

  /* ---------- Ricerca e filtri ---------- */
  function applyFilters() {
    const q = norm(state.query.trim());
    let total = 0;
    $$(".cat-section").forEach((sec) => {
      let n = 0;
      $$(".item", sec).forEach((it) => {
        const tags = it.dataset.tags.split(" ");
        const ok = (!q || it.dataset.search.includes(q)) && [...state.filters].every((f) => tags.includes(f));
        it.hidden = !ok; if (ok) n++;
      });
      sec.hidden = n === 0; total += n;
    });
    const filtering = !!q || state.filters.size > 0;
    $("#empty").hidden = total > 0;
    if ($("#featured-wrap")) $("#featured-wrap").hidden = filtering;
    $("#search-clear").hidden = !q;
    $$(".cat").forEach((l) => (l.hidden = $("#cat-" + l.dataset.id).hidden));
  }
  const search = $("#search");
  search.addEventListener("input", () => { state.query = search.value; applyFilters(); });
  $("#search-clear").addEventListener("click", () => { search.value = ""; state.query = ""; applyFilters(); search.focus(); });
  // nasconde i filtri senza prodotti corrispondenti
  $$(".filter").forEach((b) => { if (![...PRODUCTS.values()].some((p) => p.tag.includes(b.dataset.filter))) b.remove(); });
  if (!$$(".filter").length) $(".filters").remove();
  $$(".filter").forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.filter;
    state.filters.has(f) ? state.filters.delete(f) : state.filters.add(f);
    b.setAttribute("aria-pressed", state.filters.has(f));
    applyFilters();
  }));
  $("#reset-filters").addEventListener("click", () => {
    state.filters.clear(); state.query = ""; search.value = "";
    $$(".filter").forEach((b) => b.setAttribute("aria-pressed", "false"));
    applyFilters();
  });
  $("#open-search").addEventListener("click", () => {
    $("#menu").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setTimeout(() => search.focus({ preventScroll: true }), 350);
  });

  /* ---------- Categoria attiva / appbar ---------- */
  const catLinks = $$(".cat");
  const catTrack = $("#cats");
  let activeCat = null;
  function setActive(id) {
    if (id === activeCat) return; activeCat = id;
    catLinks.forEach((l) => {
      const on = l.dataset.id === id;
      l.classList.toggle("is-active", on);
      on ? l.setAttribute("aria-current", "true") : l.removeAttribute("aria-current");
      if (on) catTrack.scrollTo({ left: l.offsetLeft - catTrack.clientWidth / 2 + l.clientWidth / 2, behavior: "smooth" });
    });
  }
  function onScroll() {
    $(".appbar").classList.toggle("is-scrolled", scrollY > 4);
    const line = $(".cats").getBoundingClientRect().bottom + 8;
    let cur = null;
    $$(".cat-section:not([hidden])").forEach((s) => { if (s.getBoundingClientRect().top <= line) cur = s.dataset.id; });
    setActive(cur || ($$(".cat-section:not([hidden])")[0] || {}).dataset?.id);
    $(".cats").classList.toggle("is-stuck", $(".cats").getBoundingClientRect().top <= parseInt(getComputedStyle(document.documentElement).getPropertyValue("--appbar-h")) + 1);
  }
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  onScroll();

  /* ---------- Modalità asporto / domicilio ---------- */
  function renderMode() {
    $$(".segmented__opt").forEach((b) => b.setAttribute("aria-checked", b.dataset.mode === state.mode));
    $("#c-addr-wrap").hidden = state.mode !== "domicilio";
    const note = $("#delivery-note");
    if (state.mode === "domicilio" && C.consegna) {
      const bits = [];
      if (typeof C.consegna.costo === "number") bits.push(C.consegna.costo ? `Consegna ${fmt(C.consegna.costo)}` : "Consegna gratuita");
      if (typeof C.consegna.minimoOrdine === "number") bits.push(`ordine minimo ${fmt(C.consegna.minimoOrdine)}`);
      note.textContent = bits.length ? bits.join(" · ") : "Ti consegniamo a casa: indica l'indirizzo quando invii l'ordine.";
      note.hidden = false;
    } else {
      note.textContent = `Ritiro in pizzeria: ${C.indirizzo}, Casapulla.`;
      note.hidden = false;
    }
    renderTotals();
    save();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".segmented__opt");
    if (b) { state.mode = b.dataset.mode; renderMode(); }
  });
  // Frecce da tastiera nei radiogroup
  $$(".segmented").forEach((g) => g.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    state.mode = state.mode === "asporto" ? "domicilio" : "asporto"; renderMode();
    $(`.segmented__opt[data-mode="${state.mode}"]`, g).focus();
  }));

  /* ---------- Carrello ---------- */
  function addToCart(id, qty = 1, note = "", v = 0, o = []) {
    note = note.trim();
    const key = (l) => [l.id, l.note, l.v || 0, (l.o || []).join(",")].join("|");
    const nl = { id, qty, note, v, o };
    const line = state.cart.find((l) => key(l) === key(nl));
    line ? (line.qty += qty) : state.cart.push(nl);
    save(); renderCart(true); vibrate();
    live(`${qty} × ${lineLabel(nl)} aggiunto all'ordine`);
  }
  function renderAddButtons() {
    $$("[data-add]").forEach((b) => { b.outerHTML = addBtn(b.dataset.add); });
  }
  function renderTotals() {
    const sub = subtotal(), fee = deliveryFee();
    $("#s-sub").textContent = fmt(sub);
    $("#s-del-row").hidden = !(state.mode === "domicilio" && C.consegna && typeof C.consegna.costo === "number");
    $("#s-del").textContent = fee ? fmt(fee) : "Gratis";
    $("#s-tot").textContent = fmt(sub + fee);
  }
  function renderCart(bump) {
    const count = state.cart.reduce((a, l) => a + l.qty, 0);
    const bar = $("#cartbar");
    bar.hidden = count === 0;
    $("#dock-contacts").hidden = count > 0;
    $("#cart-count").textContent = count;
    $("#cart-total").textContent = fmt(subtotal());
    bar.setAttribute("aria-label", `Vedi ordine: ${count} prodotti, ${fmt(subtotal())}`);
    if (bump && count) { bar.classList.remove("bump"); void bar.offsetWidth; bar.classList.add("bump"); }

    $("#cart-list").innerHTML = state.cart.map((l, i) => {
      const p = PRODUCTS.get(l.id);
      return `<li class="cart__item">
        <span class="cart__name">${esc(lineLabel(l))}</span>
        <div class="cart__side">
          <div class="stepper stepper--sm" aria-label="Quantità ${esc(p.nome)}">
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="-1" aria-label="${l.qty === 1 ? "Rimuovi" : "Diminuisci"} ${esc(p.nome)}">${l.qty === 1 ? "🗑" : "−"}</button>
            <output>${l.qty}</output>
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="1" aria-label="Aumenta ${esc(p.nome)}">+</button>
          </div>
        </div>
        <span class="cart__price">${fmt(unitPrice(l) * l.qty)}</span>
        ${l.note ? `<span class="cart__note">“${esc(l.note)}”</span>` : ""}
      </li>`;
    }).join("");
    renderTotals();
    renderAddButtons();
  }
  $("#cart-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-line]"); if (!b) return;
    const i = +b.dataset.line, line = state.cart[i];
    line.qty += +b.dataset.delta;
    if (line.qty <= 0) state.cart.splice(i, 1);
    save(); renderCart(); vibrate();
    if (!state.cart.length) closeSheet($("#cart-sheet"));
  });

  /* ---------- Bottom sheet ---------- */
  let lastFocus = null;
  function openSheet(d) {
    lastFocus = document.activeElement;
    d.showModal(); document.body.classList.add("is-locked");
  }
  function closeSheet(d) {
    if (!d.open) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => { d.classList.remove("is-closing"); d.close(); };
    if (reduce) return done();
    d.classList.add("is-closing");
    d.addEventListener("animationend", done, { once: true });
    setTimeout(() => d.open && done(), 300);
  }
  $$(".sheet").forEach((d) => {
    d.addEventListener("close", () => { document.body.classList.remove("is-locked"); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); });
    d.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(d); }); // tasto Esc
    d.addEventListener("click", (e) => { if (e.target === d) closeSheet(d); }); // tap sullo sfondo
    $(".sheet__close", d).addEventListener("click", (e) => { e.preventDefault(); closeSheet(d); });
    // trascina giù per chiudere (mobile)
    let y0 = null, dy = 0;
    d.addEventListener("touchstart", (e) => { const body = $(".sheet__body", d); if (body.scrollTop > 0 && body.contains(e.target)) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    d.addEventListener("touchmove", (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); d.style.transform = `translateY(${dy}px)`; }, { passive: true });
    d.addEventListener("touchend", () => { if (y0 == null) return; d.style.transform = ""; if (dy > 110) closeSheet(d); y0 = null; });
  });

  /* Scheda prodotto */
  let current = null, qty = 1;
  const ps = $("#product-sheet");
  let selV = 0, selO = [];
  function updateAddLabel() {
    $("#ps-qty").textContent = qty;
    $("#ps-minus").disabled = qty <= 1;
    const add = $("#ps-add");
    if (!current.disponibile) { add.textContent = "Al momento non disponibile"; add.disabled = true; }
    else if (!validToday(current)) { add.textContent = `Valida solo ${daysLabel(current)}`; add.disabled = true; }
    else { add.textContent = `Aggiungi · ${fmt(unitPrice({ id: current.id, v: selV, o: selO }) * qty)}`; add.disabled = false; }
  }
  function openProduct(id) {
    current = PRODUCTS.get(id); qty = 1; selV = 0; selO = [];
    $("#ps-art").innerHTML = art(current);
    $("#ps-art").classList.toggle("is-contain", !!current.fotoIntera);
    $("#ps-name").textContent = current.nome;
    $("#ps-tags").innerHTML = badges(current.tag, false) + statusBadge(current);
    const desc = current.ingredienti && current.ingredienti !== "Scegli il gusto" ? current.ingredienti : "";
    $("#ps-desc").textContent = desc;
    $("#ps-desc").hidden = !desc;
    $("#ps-more").textContent = current.dettagli || "";
    $("#ps-more").hidden = !current.dettagli;
    // varianti (formato / gusto)
    const vw = $("#ps-variants");
    vw.hidden = !current.varianti;
    if (current.varianti) {
      const same = current.varianti.every((v) => v.prezzo === current.varianti[0].prezzo);
      $("#ps-variants-title").textContent = same ? "Scegli il gusto" : "Scegli il formato";
      $("#ps-variants-list").innerHTML = current.varianti.map((v, i) => `
        <label class="choice"><input type="radio" name="ps-v" value="${i}"${i === 0 ? " checked" : ""}>
          <span class="choice__name">${esc(v.nome)}</span>${same ? "" : `<span class="choice__price">${fmt(v.prezzo)}</span>`}</label>`).join("");
    }
    // opzioni (es. nel ruoto)
    const ow = $("#ps-options");
    ow.hidden = !current.opzioni.length;
    $("#ps-options-list").innerHTML = current.opzioni.map((o, i) => `
      <label class="choice"><input type="checkbox" name="ps-o" value="${i}">
        <span class="choice__name">${esc(o.nome)}</span><span class="choice__price">+ ${fmt(o.prezzo)}</span></label>`).join("");
    $("#ps-note").value = "";
    $("#ps-note").placeholder = current.segnaposto || "Es. ben cotta, senza origano…";
    $("#ps-note-label").firstChild.textContent = current.segnaposto ? "La tua scelta " : "Richieste particolari ";
    $("#ps-note-label small").hidden = !!current.segnaposto;
    $("#ps-note-wrap").hidden = !canOrder(current);
    $(".stepper", ps).hidden = !canOrder(current);
    updateAddLabel();
    openSheet(ps);
    $(".sheet__body", ps).scrollTop = 0;
  }
  ps.addEventListener("change", (e) => {
    if (e.target.name === "ps-v") selV = +e.target.value;
    if (e.target.name === "ps-o") selO = $$('input[name="ps-o"]:checked', ps).map((i) => +i.value);
    updateAddLabel();
  });
  $("#ps-minus").addEventListener("click", () => { qty = Math.max(1, qty - 1); updateAddLabel(); });
  $("#ps-plus").addEventListener("click", () => { qty = Math.min(20, qty + 1); updateAddLabel(); });
  $("#product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!canOrder(current)) return;
    if (current.segnaposto && !$("#ps-note").value.trim()) {
      $("#ps-note").setAttribute("aria-invalid", "true"); $("#ps-note").focus(); return;
    }
    addToCart(current.id, qty, $("#ps-note").value, current.varianti ? selV : 0, selO);
    closeSheet(ps);
  });

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = PRODUCTS.get(add.dataset.add);
      needsSheet(p) ? openProduct(p.id) : addToCart(p.id);
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) openProduct(open.dataset.open);
  });

  /* Carrello */
  const cs = $("#cart-sheet");
  function fillTimes() {
    const sel = $("#c-time");
    const opts = ['<option value="">Prima possibile</option>'];
    const d = new Date(); d.setSeconds(0, 0);
    d.setMinutes(Math.ceil((d.getMinutes() + 30) / 15) * 15);
    for (let i = 0; i < 16; i++) {
      const t = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      opts.push(`<option>${t}</option>`);
      d.setMinutes(d.getMinutes() + 15);
    }
    const prev = sel.value; sel.innerHTML = opts.join(""); sel.value = prev;
  }
  $("#cartbar").addEventListener("click", () => {
    fillTimes();
    $("#c-name").value = $("#c-name").value || store.get("pallone-name", "");
    $("#c-addr").value = $("#c-addr").value || store.get("pallone-addr", "");
    $("#c-error").hidden = true;
    openSheet(cs);
  });
  $("#cart-more").addEventListener("click", () => { closeSheet(cs); setTimeout(() => $("#menu").scrollIntoView(), 250); });

  $("#ps-note").addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
  ["#c-name", "#c-addr"].forEach((s) => $(s).addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); $("#c-error").hidden = true; }));
  $("#send-wa").addEventListener("click", () => {
    const name = $("#c-name"), addr = $("#c-addr"), err = $("#c-error");
    [name, addr].forEach((i) => i.removeAttribute("aria-invalid"));
    let msg = "";
    if (!name.value.trim()) { msg = "Inserisci il tuo nome."; name.setAttribute("aria-invalid", "true"); name.focus(); }
    else if (state.mode === "domicilio" && !addr.value.trim()) { msg = "Inserisci l'indirizzo di consegna."; addr.setAttribute("aria-invalid", "true"); addr.focus(); }
    else if (state.mode === "domicilio" && C.consegna && typeof C.consegna.minimoOrdine === "number" && subtotal() < C.consegna.minimoOrdine) {
      msg = `Per la consegna l'ordine minimo è ${fmt(C.consegna.minimoOrdine)}.`;
    }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    store.set("pallone-name", name.value.trim());
    if (addr.value.trim()) store.set("pallone-addr", addr.value.trim());

    const lines = state.cart.map((l) => {
      return `• ${l.qty}× ${lineLabel(l)} — ${fmt(unitPrice(l) * l.qty)}${l.note ? `\n   ↳ ${l.note}` : ""}`;
    });
    const fee = deliveryFee();
    const text = [
      `Ciao ${C.nome}! Vorrei ordinare:`,
      "",
      ...lines,
      "",
      fee ? `Consegna: ${fmt(fee)}` : null,
      `*Totale: ${fmt(subtotal() + fee)}*`,
      "",
      `👤 Nome: ${name.value.trim()}`,
      state.mode === "domicilio" ? `🛵 Consegna a domicilio: ${addr.value.trim()}` : "🥡 Ritiro in pizzeria (asporto)",
      `🕒 Orario: ${$("#c-time").value || "prima possibile"}`,
      $("#c-note").value.trim() ? `📝 Note: ${$("#c-note").value.trim()}` : null
    ].filter((x) => x !== null).join("\n");

    window.open(waBase + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  });

  /* ---------- Avvio ---------- */
  renderMode();
  renderCart();
  applyFilters();
  setInterval(renderHours, 60000);
})();
