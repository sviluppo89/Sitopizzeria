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
  MENU.forEach((cat) => cat.piatti.forEach((p) => {
    const id = `${cat.id}-${slug(p.nome)}`;
    PRODUCTS.set(id, { ...p, id, tag: p.tag || [], tipo: cat.tipo || "pizza", cat: cat.id });
  }));

  /* ---------- Illustrazioni SVG (usate se manca la foto) ---------- */
  function art(p) {
    if (p.foto) return `<img src="${esc(p.foto)}" alt="" loading="lazy" decoding="async">`;
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
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="70" rx="38" ry="10" fill="#0001"/><circle cx="36" cy="56" r="16" fill="#d9a441"/><circle cx="62" cy="54" r="17" fill="#c98f2e"/><circle cx="50" cy="38" r="15" fill="#e3b155"/>${dots(10, 1.4, "#a8711d", 26)}</svg>`;
      case "bevanda":
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="36" y="20" width="28" height="62" rx="8" fill="${R}"/><rect x="36" y="38" width="28" height="18" fill="${W}"/><rect x="40" y="14" width="20" height="8" rx="3" fill="#9aa"/><rect x="40" y="26" width="5" height="50" rx="2.5" fill="#fff4"/></svg>`;
      case "dolce":
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" fill="${CR}"/><circle cx="50" cy="50" r="30" fill="#5a3418"/>${dots(14, 1.6, W, 26)}</svg>`;
      default: { // pizza
        const rossa = ing.includes("pomodoro") && !ing.includes("pomodorino giallo");
        const base = rossa ? R : (ing.includes("giallo") ? "#f2b82a" : W);
        let top = "";
        if (/fior di latte|mozzarella|bufala|provola|formagg/.test(ing)) top += dots(7, 6, rossa ? W : "#f3e6c8", 27);
        if (/basilico|friariell|rucola|zucchin/.test(ing)) top += dots(5, 3.2, G, 29);
        if (/salame|salsiccia|pancetta|prosciutto|crudo|wurstel/.test(ing)) top += dots(6, 4.2, "#9b2b23", 28);
        if (/funghi|melanzane|patate|carciofi/.test(ing)) top += dots(5, 3.6, "#b98a55", 25);
        if (/olive|alici|tonno/.test(ing)) top += dots(6, 2.4, "#3b3b3b", 26);
        if (/aglio|origano/.test(ing) && !top) top += dots(16, 1.2, G, 28);
        return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="44" fill="#0001"/><circle cx="50" cy="50" r="44" fill="${CR}"/><circle cx="50" cy="50" r="36" fill="${base}"/>${top}</svg>`;
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
    cart: store.get("pallone-cart", []).filter((l) => PRODUCTS.has(l.id)), // [{id, qty, note}]
    mode: store.get("pallone-mode", "asporto"),
    filters: new Set(),
    query: ""
  };
  const save = () => { store.set("pallone-cart", state.cart); store.set("pallone-mode", state.mode); };
  const qtyOf = (id) => state.cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);
  const subtotal = () => state.cart.reduce((a, l) => a + PRODUCTS.get(l.id).prezzo * l.qty, 0);
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
    const q = qtyOf(id);
    return `<button type="button" class="add${q ? " has-qty" : ""}" data-add="${id}" aria-label="Aggiungi ${esc(PRODUCTS.get(id).nome)}${q ? `, già ${q} nel carrello` : ""}">${q ? q : "+"}</button>`;
  };

  $("#menu-list").innerHTML = MENU.map((c) => `
    <section class="cat-section" id="cat-${esc(c.id)}" data-id="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
      <h3 class="cat-section__title" id="h-${esc(c.id)}">${esc(c.nome)}</h3>
      ${c.nota ? `<p class="cat-section__note">${esc(c.nota)}</p>` : ""}
      <ul class="items">
        ${c.piatti.map((raw) => {
          const p = PRODUCTS.get(`${c.id}-${slug(raw.nome)}`);
          return `
          <li class="item" data-id="${p.id}" data-tags="${p.tag.join(" ")}" data-search="${esc(norm(p.nome + " " + (p.ingredienti || "")))}">
            <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${fmt(p.prezzo)}. Dettagli"></button>
            <div class="item__main">
              <h4 class="item__name">${esc(p.nome)} ${badges(p.tag, true)}</h4>
              ${p.ingredienti ? `<p class="item__desc">${esc(p.ingredienti)}</p>` : ""}
              <span class="item__price">${fmt(p.prezzo)}</span>
              ${p.tag.includes("novita") ? ` <span class="badge badge--novita">✨ Novità</span>` : ""}
            </div>
            <div class="item__media">
              <div class="item__art">${art(p)}</div>
              ${addBtn(p.id)}
            </div>
          </li>`;
        }).join("")}
      </ul>
    </section>`).join("");

  // I più amati
  const featured = [...PRODUCTS.values()].filter((p) => p.tag.includes("consigliata") || p.tag.includes("novita"));
  const featuredList = featured.length ? featured : [...PRODUCTS.values()].slice(0, 4);
  $("#featured").innerHTML = featuredList.map((p) => `
    <div class="fcard" data-id="${p.id}">
      <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${fmt(p.prezzo)}. Dettagli"></button>
      <div class="fcard__art">${art(p)}</div>
      ${p.tag.includes("consigliata") ? `<span class="badge badge--consigliata">★ La più amata</span>` : p.tag.includes("novita") ? `<span class="badge badge--novita">✨ Novità</span>` : ""}
      <div class="fcard__body">
        <span class="fcard__name">${esc(p.nome)}</span>
        <span class="fcard__desc">${esc(p.ingredienti || "")}</span>
        <span class="fcard__price">${fmt(p.prezzo)}</span>
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
    $("#featured-wrap").hidden = filtering;
    $("#search-clear").hidden = !q;
    $$(".cat").forEach((l) => (l.hidden = $("#cat-" + l.dataset.id).hidden));
  }
  const search = $("#search");
  search.addEventListener("input", () => { state.query = search.value; applyFilters(); });
  $("#search-clear").addEventListener("click", () => { search.value = ""; state.query = ""; applyFilters(); search.focus(); });
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
  function addToCart(id, qty = 1, note = "") {
    note = note.trim();
    const line = state.cart.find((l) => l.id === id && l.note === note);
    line ? (line.qty += qty) : state.cart.push({ id, qty, note });
    save(); renderCart(true); vibrate();
    live(`${qty} × ${PRODUCTS.get(id).nome} aggiunta all'ordine`);
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
        <span class="cart__name">${esc(p.nome)}</span>
        <div class="cart__side">
          <div class="stepper stepper--sm" aria-label="Quantità ${esc(p.nome)}">
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="-1" aria-label="${l.qty === 1 ? "Rimuovi" : "Diminuisci"} ${esc(p.nome)}">${l.qty === 1 ? "🗑" : "−"}</button>
            <output>${l.qty}</output>
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="1" aria-label="Aumenta ${esc(p.nome)}">+</button>
          </div>
        </div>
        <span class="cart__price">${fmt(p.prezzo * l.qty)}</span>
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
  function updateAddLabel() {
    $("#ps-qty").textContent = qty;
    $("#ps-add").textContent = `Aggiungi · ${fmt(current.prezzo * qty)}`;
    $("#ps-minus").disabled = qty <= 1;
  }
  function openProduct(id) {
    current = PRODUCTS.get(id); qty = 1;
    $("#ps-art").innerHTML = art(current);
    $("#ps-name").textContent = current.nome;
    $("#ps-tags").innerHTML = badges(current.tag, false);
    $("#ps-desc").textContent = current.ingredienti || "";
    $("#ps-desc").hidden = !current.ingredienti;
    $("#ps-note").value = "";
    updateAddLabel();
    openSheet(ps);
  }
  $("#ps-minus").addEventListener("click", () => { qty = Math.max(1, qty - 1); updateAddLabel(); });
  $("#ps-plus").addEventListener("click", () => { qty = Math.min(20, qty + 1); updateAddLabel(); });
  $("#product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addToCart(current.id, qty, $("#ps-note").value);
    closeSheet(ps);
  });

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { addToCart(add.dataset.add); return; }
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
      const p = PRODUCTS.get(l.id);
      return `• ${l.qty}× ${p.nome} — ${fmt(p.prezzo * l.qty)}${l.note ? `\n   ↳ ${l.note}` : ""}`;
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
