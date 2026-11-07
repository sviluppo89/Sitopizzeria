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

  /* ---------- Caricamento dati (data/menu.json, gestito dalla pagina admin) ---------- */
  const PREVIEW = new URLSearchParams(location.search).has("anteprima");
  // Modalità tavolo (QR sui tavolini): solo consultazione, ordinazione da mostrare al cameriere
  const TABLE = new URLSearchParams(location.search).has("tavolo");
  if (TABLE) document.body.classList.add("is-table");
  const CART_KEY = TABLE ? "pallone-cart-tavolo" : "pallone-cart";
  const loadData = () => {
    if (PREVIEW) {
      const d = store.get("pallone-admin-draft", null);
      if (d) return Promise.resolve(d);
    }
    return fetch("data/menu.json?v=" + Date.now(), { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  };
  loadData().then(start).catch((e) => {
    console.error(e);
    document.getElementById("menu-list").innerHTML =
      '<p class="empty">Non riesco a caricare il menù. Riprova tra poco o chiamaci.</p>';
  });

  function start(DATA) {
  const C = DATA.info || {};
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const day = (d) => new Date(d + "T00:00:00"); // data locale, non UTC
  const inRange = (o) => (!o.dal || day(o.dal) <= today0) && (!o.al || day(o.al) >= today0);
  const ORDERS_ON = TABLE || !C.ordini || C.ordini.attivi !== false; // al tavolo si ordina sempre a voce
  const MENU = [];
  const todayOk = (o) => !o.giorni || !o.giorni.length || o.giorni.includes(new Date().getDay());
  const promos = (DATA.promo || []).filter((o) => o.attiva !== false && inRange(o) && (!C.offerteSoloOggi || todayOk(o)));
  if (promos.length) MENU.push({
    id: "offerte", nome: "Le offerte", tipo: "offerta", offerte: true,
    piatti: promos.map((o) => ({
      nome: o.titolo, ingredienti: o.testo, prezzo: o.prezzo, foto: o.foto || undefined,
      giorni: o.giorni && o.giorni.length ? o.giorni : undefined,
      dettagli: o.dettagli || undefined,
      scelte: (o.scelte || []).filter((s) => s.prodotti && s.prodotti.length),
      segnaposto: (o.scelte || []).some((s) => s.prodotti && s.prodotti.length) ? undefined : (o.richiesta || undefined)
    }))
  });
  (DATA.categorie || []).filter((c) => c.attiva !== false).forEach((c) => {
    const piatti = c.prodotti.filter((p) => p.attivo !== false).map((p) => ({
      uid: p.id, nome: p.nome, ingredienti: p.ingredienti,
      prezzo: p.varianti && p.varianti.length ? undefined : p.prezzo,
      varianti: p.varianti && p.varianti.length ? p.varianti : undefined,
      tag: p.tag, allergeni: p.allergeni, foto: p.foto || undefined, evidenza: p.evidenza === true,
      disponibile: p.disponibile !== false,
      giorni: p.giorni && p.giorni.length ? p.giorni : undefined,
      dettagli: p.dettagli || undefined, segnaposto: p.richiesta || undefined
    }));
    if (piatti.length) MENU.push({ id: c.id, nome: c.nome, tipo: c.tipo, nota: c.nota, opzioni: c.opzioni && c.opzioni.length ? c.opzioni : undefined, piatti });
  });

  // Sconti su prodotti e categorie (es. "il lunedì le classiche a 5 €")
  const SCONTI = (DATA.sconti || []).filter((x) => x.attiva !== false && inRange(x)
    && (!x.giorni || !x.giorni.length || x.giorni.includes(new Date().getDay())));
  const applySconto = (x, price) => {
    const v = Number(x.valore) || 0;
    const r = x.tipo === "percentuale" ? price * (1 - v / 100) : x.tipo === "meno" ? price - v : Math.min(price, v);
    return Math.max(0, Math.round(r * 100) / 100);
  };
  // miglior sconto per un prezzo di un prodotto
  const bestDeal = (p, price) => {
    let best = null;
    SCONTI.forEach((x) => {
      if (!((x.categorie || []).includes(p.cat) || (x.prodotti || []).includes(p.uid))) return;
      const np = applySconto(x, price);
      if (np < price && (!best || np < best.price)) best = { price: np, sconto: x };
    });
    return best;
  };

  // Avvisi in cima alla pagina
  const notices = [];
  if (PREVIEW) notices.push(["preview", "Anteprima: stai vedendo le modifiche non ancora pubblicate."]);
  if (!ORDERS_ON) notices.push(["pause", (C.ordini && C.ordini.messaggioPausa) || "Al momento non accettiamo ordini online."]);
  if (C.avviso) notices.push(["info", C.avviso]);
  $("#notices").innerHTML = notices.map(([t, m]) => `<p class="notice notice--${t}">${esc(m)}</p>`).join("");
  const ic = (n, c) => window.PallonIcons.svg(n, c);
  const TAG_INFO = {
    vegetariana: { ico: "leaf", label: "Vegetariana", cls: "ic--green" },
    piccante: { ico: "chili", label: "Piccante", cls: "ic--red" },
    novita: { ico: "sparkle", label: "Novità" },
    consigliata: { ico: "star", label: "La più amata" }
  };

  /* Aggiunte per tutto il menù (es. bufala +1 €): valgono per le categorie scelte in admin.
     Se non è stato scelto nulla, valgono per pizze, calzoni, scrigni e panuozzo. */
  const EXTRA_LIST = (DATA.aggiunte || []).filter((a) => a && a.nome && typeof a.prezzo === "number");
  const EXTRA_CATS = Array.isArray(DATA.aggiunteCategorie) ? DATA.aggiunteCategorie
    : (DATA.categorie || []).filter((c) => ["pizza", "calzone"].includes(c.tipo)).map((c) => c.id);
  const extrasFor = (catId) => (EXTRA_CATS.includes(catId) ? EXTRA_LIST.map((a) => ({ ...a, g: true })) : []);

  /* ---------- Indice prodotti ---------- */
  const PRODUCTS = new Map();
  const CAT_IDS = {}; // categoria -> elenco id prodotti, nell'ordine del menù
  MENU.forEach((cat) => {
    CAT_IDS[cat.id] = cat.piatti.map((p) => {
      let id = `${cat.id}-${slug(p.nome)}`;
      while (PRODUCTS.has(id)) id += "-2";
      PRODUCTS.set(id, {
        ...p, id, tag: p.tag || [], tipo: cat.tipo || "pizza", cat: cat.id,
        varianti: p.varianti || null, opzioni: [...(p.opzioni || cat.opzioni || []), ...(cat.offerte ? [] : extrasFor(cat.id))],
        disponibile: p.disponibile !== false, offerta: !!cat.offerte
      });
      const pr = PRODUCTS.get(id);
      const ref = pr.varianti ? pr.varianti[0].prezzo : pr.prezzo;
      const deal = typeof ref === "number" ? bestDeal(pr, ref) : null;
      if (deal) { pr.deal = deal.sconto; pr.tag = [...pr.tag, "promo"]; }
      return id;
    });
  });

  /* Prezzi, varianti e offerte */
  const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const validToday = (p) => !p.giorni || p.giorni.includes(new Date().getDay());
  const daysLabel = (p) => (p.giorni || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_SHORT[d]).join(" · ");
  const canOrder = (p) => ORDERS_ON && p.disponibile && validToday(p);
  const needsSheet = (p) => !!(p.varianti || p.segnaposto || (p.scelte && p.scelte.length) || (p.opzioni && p.opzioni.length));
  // prezzo base (variante) con l'eventuale sconto del giorno
  const finalPrice = (p, base) => { const d = bestDeal(p, base); return d ? d.price : base; };
  const priceLabel = (p) => {
    if (!p.varianti) return fmt(finalPrice(p, p.prezzo));
    const ps = p.varianti.map((v) => finalPrice(p, v.prezzo));
    const min = Math.min(...ps);
    return ps.every((x) => x === min) ? fmt(min) : `da ${fmt(min)}`;
  };
  // come priceLabel ma mostra anche il prezzo pieno barrato
  const priceHTML = (p) => {
    if (!p.deal) return priceLabel(p);
    const full = p.varianti ? Math.min(...p.varianti.map((v) => v.prezzo)) : p.prezzo;
    return `<s class="price-old">${fmt(full)}</s> <span class="price-promo">${priceLabel(p)}</span>`;
  };
  const descOf = (p) => p.ingredienti && p.ingredienti !== "Scegli il gusto" ? p.ingredienti : (p.varianti ? p.varianti.map((v) => v.nome).join(" · ") : (p.ingredienti || ""));
  const unitPrice = (l) => {
    const p = PRODUCTS.get(l.id);
    const base = finalPrice(p, p.varianti ? (p.varianti[l.v] || p.varianti[0]).prezzo : p.prezzo);
    return base + (l.o || []).reduce((a, i) => a + ((p.opzioni[i] || {}).prezzo || 0), 0);
  };
  const lineLabel = (l) => {
    const p = PRODUCTS.get(l.id);
    const bits = [];
    if (p.varianti) bits.push((p.varianti[l.v] || p.varianti[0]).nome);
    (l.o || []).forEach((i) => p.opzioni[i] && bits.push(p.opzioni[i].nome.toLowerCase()));
    return p.nome + (bits.length ? ` (${bits.join(", ")})` : "");
  };

  const art = window.pallonArt;

  const badges = (tags, onlyIcons) => tags.map((t) => {
    const i = TAG_INFO[t]; if (!i) return "";
    return onlyIcons
      ? (t === "vegetariana" || t === "piccante" ? `<span class="ico-tag" role="img" aria-label="${i.label}" title="${i.label}">${ic(i.ico, i.cls)}</span>` : "")
      : `<span class="badge badge--${t}">${ic(i.ico)} ${i.label}</span>`;
  }).join("");

  /* ---------- Stato ---------- */
  const state = {
    // righe del carrello: { id, qty, note, v: indice variante, o: [indici opzioni] }
    cart: store.get(CART_KEY, []).filter((l) => PRODUCTS.has(l.id) && (!PRODUCTS.get(l.id).varianti || PRODUCTS.get(l.id).varianti[l.v])),
    mode: TABLE ? "asporto" : store.get("pallone-mode", "asporto"),
    filters: new Set(),
    query: ""
  };
  const save = () => { store.set(CART_KEY, state.cart); if (!TABLE) store.set("pallone-mode", state.mode); };
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
  if (C.facebook) { $("#i-fb").hidden = false; $("#i-fb").href = C.facebook; }
  $("#i-ig").hidden = !C.instagram;
  $("#f-legal").textContent = [C.nome, C.indirizzo, C.citta, C.piva ? "P.IVA " + C.piva : ""].filter(Boolean).join(" · ");
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
    if (cur) { const e = cur[1] % 1440; return { open: true, text: `Aperto · chiude alle ${e === 0 ? "24:00" : `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`}` }; }
    const next = (O[d] || []).map(([a]) => toMin(a)).find((s) => s > mins);
    if (next != null) return { open: false, text: `Chiuso · apre alle ${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}` };
    // nessuna apertura oggi più tardi: cerco il prossimo giorno aperto
    for (let k = 1; k <= 7; k++) {
      const nd = (d + k) % 7, f = O[nd] || [];
      if (f.length) {
        const when = k === 1 ? "domani" : DAYS[nd].toLowerCase();
        const closedToday = !(O[d] || []).length;
        return { open: false, text: `${closedToday ? "Chiuso oggi" : "Chiuso"} · riapre ${when} alle ${f[0][0]}`, reopen: `${when} alle ${f[0][0]}`, closedToday };
      }
    }
    return { open: false, text: "Chiuso" };
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
      return `<li class="${d === today ? "is-today" : ""}"><span>${DAYS[d]}</span><span>${f.length ? f.map(([a, b]) => `${a}–${b === "00:00" ? "24:00" : b}`).join(", ") : "Chiuso"}</span></li>`;
    }).join("");
    $("#hours-card").hidden = false;
  }
  renderHours();

  /* ---------- Render menù ---------- */
  $("#cats").innerHTML = MENU.map((c) => `<a class="cat" href="#${c.offerte ? "featured-wrap" : "cat-" + esc(c.id)}" data-id="${esc(c.id)}">${esc(c.nome)}</a>`).join("");

  const addBtn = (id) => {
    const p = PRODUCTS.get(id);
    if (!canOrder(p)) return "";
    const q = qtyOf(id);
    return `<button type="button" class="add${q ? " has-qty" : ""}" data-add="${id}" aria-label="Aggiungi ${esc(p.nome)}${q ? `, già ${q} nel tuo ordine` : ""}">${q ? q : "+"}</button>`;
  };
  const statusBadge = (p) => !p.disponibile ? `<span class="badge badge--off">Non disponibile</span>`
    : p.giorni ? (validToday(p) ? `<span class="badge badge--today">Valida oggi</span>` : `<span class="badge badge--days">${daysLabel(p)}</span>`) : "";

  $("#menu-list").innerHTML = MENU.map((c) => `
    <section class="cat-section" id="cat-${esc(c.id)}" data-id="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
      <h3 class="cat-section__title" id="h-${esc(c.id)}">${esc(c.nome)}</h3>
      ${c.nota ? `<p class="cat-section__note">${esc(c.nota)}</p>` : ""}
      ${c.opzioni && c.opzioni.length ? `<div class="cat-section__extras">${c.opzioni.map((o) => `<span class="xpill">${ic("plus")}${esc(o.nome)}<b>+${fmt(o.prezzo)}</b></span>`).join("")}</div>` : ""}
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
              <span class="item__price">${priceHTML(p)}</span>
              ${p.deal ? `<span class="badge badge--promo">${ic("tag")} ${esc(p.deal.nome)}</span>` : ""}
              ${p.tag.includes("novita") ? ` <span class="badge badge--novita">${ic("sparkle")} Novità</span>` : ""}
              ${statusBadge(p)}
              ${p.evidenza ? `<span class="badge badge--star">${ic("star")} In evidenza</span>` : ""}
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
  // In evidenza: al massimo 3, in cima al sito
  const SPOT = [...PRODUCTS.values()].filter((p) => p.evidenza).slice(0, 3);
  if (SPOT.length) {
    $("#spot-title").textContent = SPOT.length > 1 ? "In evidenza" : "Il nostro consiglio";
    $("#spot-list").innerHTML = SPOT.map((p) => `
      <div class="spot${canOrder(p) ? "" : " is-off"}" data-id="${p.id}">
        <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${priceLabel(p)}. Dettagli"></button>
        <div class="spot__art">${art(p)}</div>
        <div class="spot__body">
          <span class="badge badge--star">${ic("star")} In evidenza</span>
          <span class="spot__name">${esc(p.nome)}</span>
          <span class="spot__desc">${esc(descOf(p))}</span>
          <span class="spot__price">${priceHTML(p)}</span>
        </div>
        ${addBtn(p.id)}
      </div>`).join("");
    $("#spot-wrap").hidden = false;
  }

  const offers = [...PRODUCTS.values()].filter((p) => p.offerta);
  const featuredList = offers.length
    ? offers.sort((a, b) => validToday(b) - validToday(a))
    : [...PRODUCTS.values()].filter((p) => p.tag.includes("consigliata") || p.tag.includes("novita"));
  if (offers.length) $("#featured-title").textContent = "Le offerte";
  if (!featuredList.length) $("#featured-wrap").remove(); // nessuna offerta oggi: niente carosello
  else $("#featured").innerHTML = featuredList.map((p) => `
    <div class="fcard${canOrder(p) ? "" : " is-off"}" data-id="${p.id}">
      <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${priceLabel(p)}. Dettagli"></button>
      <div class="fcard__art">${art(p)}</div>
      ${p.giorni ? statusBadge(p) : p.tag.includes("consigliata") ? `<span class="badge badge--consigliata">${ic("star")} La più amata</span>` : p.tag.includes("novita") ? `<span class="badge badge--novita">${ic("sparkle")} Novità</span>` : ""}
      <div class="fcard__body">
        <span class="fcard__name">${esc(p.nome)}</span>
        <span class="fcard__desc">${esc(descOf(p))}</span>
        <span class="fcard__price">${priceHTML(p)}</span>
      </div>
      ${addBtn(p.id)}
    </div>`).join("");

  const todayDeals = SCONTI.filter((x) => [...PRODUCTS.values()].some((p) => p.deal === x));
  if (todayDeals.length) {
    $("#deals").innerHTML = todayDeals.map((x) => `
      <button type="button" class="deal" data-deal>
        <span class="deal__ico" aria-hidden="true">${ic("tag")}</span>
        <span class="deal__txt"><strong>Oggi: ${esc(x.nome)}</strong><small>${esc(x.testo || "Tocca per vedere i prodotti in promo")}</small></span>
        <span class="deal__go" aria-hidden="true">›</span>
      </button>`).join("");
    $("#deals").hidden = false;
  }
  const EXTRAS = EXTRA_LIST;
  if (EXTRAS.length && EXTRA_CATS.length) {
    $("#extras-list").innerHTML = EXTRAS.map((a) => `<li><span>${esc(a.nome)}</span><b>+${fmt(a.prezzo)}</b></li>`).join("");
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
      // le offerte stanno nel carosello in alto: nell'elenco compaiono solo come risultato di una ricerca
      if (sec.dataset.id === "offerte" && !q && !state.filters.size) { sec.hidden = true; return; }
      sec.hidden = n === 0; total += n;
    });
    const filtering = !!q || state.filters.size > 0;
    $("#empty").hidden = total > 0;
    if ($("#featured-wrap")) $("#featured-wrap").hidden = filtering;
    if ($("#spot-wrap")) $("#spot-wrap").hidden = filtering || !SPOT.length;
    $("#search-clear").hidden = !q;
    $$(".cat").forEach((l) => (l.hidden = l.dataset.id === "offerte" ? (filtering ? $("#cat-offerte").hidden : !$("#featured-wrap")) : $("#cat-" + l.dataset.id).hidden));
    $$('.cat[data-id="offerte"]').forEach((l) => (l.href = filtering ? "#cat-offerte" : "#featured-wrap"));
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
  $("#deals").addEventListener("click", (e) => {
    if (!e.target.closest("[data-deal]")) return;
    const b = $('.filter[data-filter="promo"]');
    if (b && b.getAttribute("aria-pressed") !== "true") b.click();
    $("#menu").scrollIntoView({ behavior: "smooth" });
  });
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
    const line = $(".cats").getBoundingClientRect().bottom + 24; // margine: la sezione si ferma appena sotto la barra delle categorie
    let cur = null;
    $$(".cat-section:not([hidden])").forEach((s) => { if (s.getBoundingClientRect().top <= line) cur = s.dataset.id; });
    const fw = $("#featured-wrap");
    // finché il carosello delle offerte è sullo schermo, è attivo "Le offerte"
    if (fw && !fw.hidden && $('.cat[data-id="offerte"]') && fw.getBoundingClientRect().bottom > 140) cur = "offerte";
    setActive(cur || ($$(".cat-section:not([hidden])")[0] || {}).dataset?.id);
    $(".cats").classList.toggle("is-stuck", $(".cats").getBoundingClientRect().top <= parseInt(getComputedStyle(document.documentElement).getPropertyValue("--appbar-h")) + 1);
  }
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  onScroll();

  /* ---------- Modalità asporto / domicilio ---------- */
  if (C.consegna && C.consegna.attiva === false) {
    state.mode = "asporto";
    $$('.segmented__opt[data-mode="domicilio"]').forEach((b) => b.parentNode.removeChild(b));
    $$(".segmented").forEach((g) => (g.style.gridTemplateColumns = "1fr"));
  }
  function renderMode() {
    $$(".segmented__opt").forEach((b) => b.setAttribute("aria-checked", b.dataset.mode === state.mode));
    $("#c-addr-wrap").hidden = state.mode !== "domicilio";
    const note = $("#delivery-note");
    if (state.mode === "domicilio" && C.consegna) {
      const bits = [];
      if (typeof C.consegna.costo === "number") bits.push(C.consegna.costo ? `Consegna ${fmt(C.consegna.costo)}` : "Consegna gratuita");
      if (typeof C.consegna.minimoOrdine === "number") bits.push(`ordine minimo ${fmt(C.consegna.minimoOrdine)}`);
      if (C.consegna.zone) bits.push(`Zone: ${C.consegna.zone}`);
      note.textContent = bits.length ? bits.join(" · ") : "Ti consegniamo a casa: indica l'indirizzo quando invii l'ordine.";
      note.hidden = false;
    } else {
      note.textContent = `Ritiro in pizzeria: ${C.indirizzo}, ${String(C.citta || "").replace(/^\d+\s*/, "")}.`;
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

  /* ---------- Suggerimenti in "Il tuo ordine" (bibite, fritture…) ---------- */
  const BY_UID = new Map([...PRODUCTS.values()].filter((p) => p.uid).map((p) => [p.uid, p]));
  const DEFAULT_SUGG = ["fritture-patatine-stick", "fritture-crocche", "fritture-frittatina-fatta-in-casa", "fritture-frittelle-alle-alghe",
    "fritture-nuggets-di-pollo", "bibite-coca-cola", "bibite-coca-cola-zero", "bibite-fanta", "bibite-peroni", "bibite-acqua"];
  let suggList = [];
  function buildSuggestions() {
    const chosen = Array.isArray(C.suggeriti) && C.suggeriti.length ? C.suggeriti : DEFAULT_SUGG;
    const inOrder = new Set(state.cart.map((l) => l.id));
    let list = chosen.map((u) => BY_UID.get(u)).filter((p) => p && canOrder(p) && !p.offerta && !inOrder.has(p.id));
    // prima quello che manca: se non c'è una bibita, le bibite vanno avanti (e lo stesso per i fritti)
    const has = (tipo) => state.cart.some((l) => PRODUCTS.get(l.id).tipo === tipo);
    const rank = (p) => (p.tipo === "bevanda" && !has("bevanda")) || (p.tipo === "fritto" && !has("fritto")) ? 0 : 1;
    const groups = [list.filter((p) => rank(p) === 0), list.filter((p) => rank(p) === 1)];
    // alterna fritto / bibita per varietà
    const mix = (arr) => { const a = arr.filter((p) => p.tipo === "fritto"), b = arr.filter((p) => p.tipo !== "fritto"), out = [];
      while (a.length || b.length) { if (a.length) out.push(a.shift()); if (b.length) out.push(b.shift()); } return out; };
    suggList = [...mix(groups[0]), ...mix(groups[1])].slice(0, 8).map((p) => p.id);
  }
  function renderSuggestions() {
    const box = $("#upsell");
    if (!suggList.length) { box.hidden = true; return; }
    box.hidden = false;
    $("#upsell-track").innerHTML = suggList.map((id) => {
      const p = PRODUCTS.get(id);
      return `<div class="ucard">
        <button type="button" class="item__open" data-open="${p.id}" aria-label="${esc(p.nome)}, ${priceLabel(p)}. Dettagli"></button>
        <div class="ucard__art">${art(p)}${addBtn(p.id)}</div>
        <span class="ucard__name">${esc(p.nome)}</span>
        <span class="ucard__price">${priceHTML(p)}</span>
      </div>`;
    }).join("");
  }

  /* ---------- Carrello ---------- */
  let editingNote = -1; // riga del carrello di cui si sta scrivendo la nota
  function addToCart(id, qty = 1, note = "", v = 0, o = [], c = []) {
    note = note.trim();
    const key = (l) => [l.id, l.note, l.v || 0, (l.o || []).join(","), (l.c || []).join(",")].join("|");
    const nl = c.length ? { id, qty, note, v, o, c } : { id, qty, note, v, o };
    const line = state.cart.find((l) => key(l) === key(nl));
    line ? (line.qty += qty) : state.cart.push(nl);
    editingNote = -1;
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
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="-1" aria-label="${l.qty === 1 ? "Rimuovi" : "Diminuisci"} ${esc(p.nome)}">${l.qty === 1 ? ic("trash") : "−"}</button>
            <output>${l.qty}</output>
            <button type="button" class="stepper__btn" data-line="${i}" data-delta="1" aria-label="Aumenta ${esc(p.nome)}">+</button>
          </div>
        </div>
        <span class="cart__price">${fmt(unitPrice(l) * l.qty)}</span>
        ${l.c && l.c.length ? `<ul class="cart__choices">${l.c.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${editingNote === i ? `
          <div class="cart__noteedit">
            <input type="text" maxlength="160" value="${esc(l.note)}" placeholder="Es. ben cotta, senza origano" data-note-input="${i}" aria-label="Nota per ${esc(p.nome)}" enterkeyhint="done">
            <button type="button" class="btn btn--primary btn--xs" data-note-save="${i}">Salva</button>
          </div>` : `
          ${l.note ? `<span class="cart__note">${ic("note")} ${esc(l.note)}</span>` : ""}
          ${needsSheet(p)
            ? `<button type="button" class="cart__notebtn" data-line-edit="${i}">${ic("pencil")} Modifica ${p.opzioni.length ? "ingredienti e note" : "scelta e note"}</button>`
            : `<button type="button" class="cart__notebtn" data-note-edit="${i}">${ic("pencil")} ${l.note ? "Modifica nota" : "Aggiungi nota"}</button>`}`}
      </li>`;
    }).join("");
    renderTotals();
    renderSuggestions();
    renderAddButtons();
    updateMore($("#cart-sheet"));
  }
  function saveNote(i) {
    const input = $(`[data-note-input="${i}"]`); const line = state.cart[i];
    if (!input || !line) return;
    line.note = input.value.trim();
    // se ora è uguale a un'altra riga (stessa pizza, stessa nota) le unisco
    const key = (l) => [l.id, l.note, l.v || 0, (l.o || []).join(","), (l.c || []).join(",")].join("|");
    const twin = state.cart.findIndex((l, j) => j !== i && key(l) === key(line));
    if (twin >= 0) { state.cart[twin].qty += line.qty; state.cart.splice(i, 1); }
    editingNote = -1; save(); renderCart();
    live(line.note ? "Nota salvata" : "Nota tolta");
  }
  $("#cart-list").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.dataset.noteInput != null) { e.preventDefault(); saveNote(+e.target.dataset.noteInput); }
  });
  $("#cart-list").addEventListener("click", (e) => {
    const le = e.target.closest("[data-line-edit]");
    if (le) { openProduct(state.cart[+le.dataset.lineEdit].id, +le.dataset.lineEdit); return; }
    const ed = e.target.closest("[data-note-edit]");
    if (ed) {
      editingNote = +ed.dataset.noteEdit; renderCart();
      const inp = $(`[data-note-input="${editingNote}"]`); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      return;
    }
    const sv = e.target.closest("[data-note-save]");
    if (sv) { saveNote(+sv.dataset.noteSave); return; }
    const b = e.target.closest("[data-line]"); if (!b) return;
    editingNote = -1;
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
    requestAnimationFrame(() => updateMore(d));
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
  // Se sotto c'è altro da vedere: sfumatura in fondo + pulsante "Scorri per continuare"
  function updateMore(d) {
    const body = d && $(".sheet__body", d), btn = d && $(".sheet__more", d);
    if (!body || !btn) return;
    const more = body.scrollHeight - body.scrollTop - body.clientHeight > 24;
    btn.hidden = !more;
  }
  $$(".sheet").forEach((d) => {
    const foot = $(".sheet__footer", d), body = $(".sheet__body", d);
    foot.insertAdjacentHTML("afterbegin", `<div class="sheet__more" hidden><button type="button" class="sheet__morebtn">Scorri per continuare ${ic("chev", "ic--down")}</button></div>`);
    $(".sheet__morebtn", d).addEventListener("click", () => body.scrollBy({ top: body.clientHeight * 0.75, behavior: "smooth" }));
    body.addEventListener("scroll", () => updateMore(d), { passive: true });
    new ResizeObserver(() => updateMore(d)).observe(body);
    d.addEventListener("close", () => { if (!$$(".sheet[open]").length) document.body.classList.remove("is-locked"); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); });
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
  let selV = 0, selO = [], selC = [];
  function updateAddLabel() {
    $("#ps-qty").textContent = qty;
    $("#ps-minus").disabled = qty <= 1;
    const add = $("#ps-add");
    if (!ORDERS_ON) { add.textContent = "Ordini online in pausa"; add.disabled = true; }
    else if (!current.disponibile) { add.textContent = "Al momento non disponibile"; add.disabled = true; }
    else if (!validToday(current)) { add.textContent = `Valida solo ${daysLabel(current)}`; add.disabled = true; }
    else { add.textContent = `${editLine >= 0 ? "Aggiorna" : "Aggiungi"} · ${fmt(unitPrice({ id: current.id, v: selV, o: selO }) * qty)}`; add.disabled = false; }
  }
  let editLine = -1; // riga dell'ordine che si sta modificando (-1 = nuovo prodotto)
  function openProduct(id, lineIndex = -1) {
    current = PRODUCTS.get(id); qty = 1; selV = 0; selO = []; selC = [];
    editLine = lineIndex;
    // offerte con scelte: per ogni voce il cliente sceglie tra i prodotti decisi in admin
    const catName = (id) => (MENU.find((c) => c.id === id) || {}).nome || "";
    const steps = (current.scelte || []).map((s) => {
      const items = s.prodotti.map((u) => BY_UID.get(u)).filter(Boolean);
      // nomi uguali in categorie diverse (es. Parmigiana pizza e ripieno): aggiungo la categoria
      const label = (p) => items.filter((x) => x.nome === p.nome).length > 1 ? `${p.nome} (${catName(p.cat).replace(/^(le|i|gli|il|la) /i, "").toLowerCase()})` : p.nome;
      return { ...s, items: items.map((p) => ({ ...p, nome: label(p) })) };
    }).filter((s) => s.items.length);
    current._steps = steps;
    $("#ps-steps").innerHTML = steps.map((s, k) => `
      <fieldset class="choices choices--step" data-step="${k}">
        <legend><span class="step-n">${k + 1}</span> ${esc(s.titolo || "Scegli")} <small class="step-req">obbligatoria</small></legend>
        <div class="optlist">${s.items.map((p) => `
          <label class="choice${p.disponibile ? "" : " is-off"}"><input type="radio" name="ps-c${k}" value="${esc(p.nome)}" ${p.disponibile ? "" : "disabled"}>
            <span class="choice__name">${esc(p.nome)}${p.disponibile ? "" : " <small>(finito)</small>"}</span></label>`).join("")}</div>
      </fieldset>`).join("");
    $("#ps-art").innerHTML = art(current);
    $("#ps-art").classList.toggle("is-contain", !!current.fotoIntera);
    $("#ps-name").textContent = current.nome;
    $("#ps-tags").innerHTML = badges(current.tag, false) + statusBadge(current) + (current.deal ? `<span class="badge badge--promo">${ic("tag")} ${esc(current.deal.nome)}</span>` : "");
    const desc = current.ingredienti && current.ingredienti !== "Scegli il gusto" ? current.ingredienti : "";
    $("#ps-desc").textContent = desc;
    $("#ps-desc").hidden = !desc;
    const al = current.allergeni || [];
    $("#ps-allergens").textContent = al.length ? "Allergeni: " + al.join(", ") : "";
    $("#ps-allergens").hidden = !al.length;
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
          <span class="choice__name">${esc(v.nome)}</span>${same && !current.deal ? "" : `<span class="choice__price">${finalPrice(current, v.prezzo) < v.prezzo ? `<s class="price-old">${fmt(v.prezzo)}</s> ` : ""}${fmt(finalPrice(current, v.prezzo))}</span>`}</label>`).join("");
    }
    // opzioni (es. nel ruoto)
    const ow = $("#ps-options");
    ow.hidden = !current.opzioni.length;
    const optRow = (o, i) => `
      <label class="choice"><input type="checkbox" name="ps-o" value="${i}">
        <span class="choice__name">${esc(o.nome)}</span><span class="choice__price">+${fmt(o.prezzo)}</span></label>`;
    const own = current.opzioni.map((o, i) => [o, i]).filter(([o]) => !o.g);
    const glob = current.opzioni.map((o, i) => [o, i]).filter(([o]) => o.g);
    $("#ps-options-list").innerHTML = (own.length ? `<div class="optlist">${own.map(([o, i]) => optRow(o, i)).join("")}</div>` : "")
      + (glob.length ? `<p class="choices__sub">Ingredienti in più</p><div class="optlist">${glob.map(([o, i]) => optRow(o, i)).join("")}</div>` : "");
    $("#ps-note").value = "";
    $("#ps-note").placeholder = current.segnaposto || "Es. ben cotta, senza origano…";
    $("#ps-note-label").firstChild.textContent = current.segnaposto ? "La tua scelta " : "Vuoi cambiare qualcosa? ";
    const quick = !current.segnaposto && current.tipo === "pizza" ? ["Ben cotta", "Poco cotta", "Tagliata a spicchi"] : [];
    $("#ps-note-chips").innerHTML = quick.map((q) => `<button type="button" class="note-chip" data-quick="${esc(q)}" aria-pressed="false">${esc(q)}</button>`).join("");
    $("#ps-note-chips").hidden = !quick.length;
    $("#ps-note-hint").hidden = !!current.segnaposto;
    $("#ps-note-label small").hidden = !!current.segnaposto;
    $("#ps-note-wrap").hidden = !canOrder(current);
    $(".stepper", ps).hidden = !canOrder(current);
    // modifica di una riga già nell'ordine: ripristino le scelte fatte
    if (editLine >= 0 && state.cart[editLine]) {
      const l = state.cart[editLine];
      qty = l.qty; selV = l.v || 0; selO = (l.o || []).slice();
      const vr = $(`input[name="ps-v"][value="${selV}"]`, ps); if (vr) vr.checked = true;
      selO.forEach((i) => { const c = $(`input[name="ps-o"][value="${i}"]`, ps); if (c) c.checked = true; });
      (l.c || []).forEach((txt) => {
        const k = (current._steps || []).findIndex((s) => txt.startsWith(s.titolo + ": "));
        if (k < 0) return;
        const val = txt.slice(current._steps[k].titolo.length + 2);
        const r = [...ps.querySelectorAll(`input[name="ps-c${k}"]`)].find((x) => x.value === val);
        if (r) { r.checked = true; selC[k] = val; }
      });
      $("#ps-note").value = l.note || "";
    }
    updateAddLabel();
    openSheet(ps);
    $(".sheet__body", ps).scrollTop = 0;
  }
  ps.addEventListener("close", () => { editLine = -1; });
  ps.addEventListener("change", (e) => {
    if (e.target.name === "ps-v") selV = +e.target.value;
    if (e.target.name === "ps-o") selO = $$('input[name="ps-o"]:checked', ps).map((i) => +i.value);
    if (/^ps-c\d+$/.test(e.target.name)) {
      const k = +e.target.name.slice(4); selC[k] = e.target.value;
      e.target.closest(".choices--step").classList.remove("is-missing");
    }
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
    const steps = current._steps || [];
    const missing = steps.findIndex((s, k) => !selC[k]);
    if (missing >= 0) {
      const fs = $(`[data-step="${missing}"]`, ps);
      steps.forEach((s, k) => { if (!selC[k]) $(`[data-step="${k}"]`, ps).classList.add("is-missing"); });
      fs.scrollIntoView({ behavior: "smooth", block: "center" });
      live(`Scegli: ${steps[missing].titolo}`);
      return;
    }
    const choices = steps.map((s, k) => `${s.titolo}: ${selC[k]}`);
    if (editLine >= 0 && state.cart[editLine]) {
      const nl = { id: current.id, qty, note: $("#ps-note").value.trim(), v: current.varianti ? selV : 0, o: selO.slice().sort((a, b) => a - b) };
      if (choices.length) nl.c = choices;
      state.cart[editLine] = nl;
      editLine = -1; save(); renderCart(); vibrate();
      live(`${lineLabel(nl)} aggiornato`);
    } else {
      addToCart(current.id, qty, $("#ps-note").value, current.varianti ? selV : 0, selO.slice().sort((a, b) => a - b), choices);
    }
    closeSheet(ps);
  });

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = PRODUCTS.get(add.dataset.add);
      if (needsSheet(p)) openProduct(p.id);
      else {
        addToCart(p.id);
        if (!store.get("pallone-notehint", false)) {
          store.set("pallone-notehint", true);
          siteToast(TABLE ? "Aggiunto alla tua ordinazione." : "Aggiunto! Puoi scrivere una nota da «Vedi ordine».");
        }
      }
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) openProduct(open.dataset.open);
  });

  let toastT;
  function siteToast(msg) {
    const t = $("#site-toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 5000);
  }

  /* Carrello */
  const cs = $("#cart-sheet");
  // Fasce orarie ogni mezz'ora (20:00, 20:30…), la prima almeno 30 minuti da adesso.
  // Con gli orari impostati in admin propone solo fasce dentro l'orario di oggi.
  function timeSlots(now = new Date()) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const first = Math.ceil((mins + 30) / 30) * 30;
    let ranges = [[0, 24 * 60]];
    if (C.orari) {
      const d = now.getDay(); ranges = [];
      (C.orari[d] || []).forEach(([a, b]) => { const s = toMin(a); let e = toMin(b); if (e <= s) e += 1440; ranges.push([s, e]); });
      (C.orari[(d + 6) % 7] || []).forEach(([a, b]) => { const s = toMin(a), e = toMin(b); if (e <= s) ranges.push([s - 1440, e]); });
    }
    const out = [];
    ranges.forEach(([s, e]) => {
      for (let t = Math.max(first, Math.ceil(s / 30) * 30); t < e; t += 30) out.push(t);
    });
    return [...new Set(out)].sort((x, y) => x - y)
      .map((t) => `${String(Math.floor(((t % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((t % 60) + 60) % 60).padStart(2, "0")}`);
  }
  function fillTimes() {
    const sel = $("#c-time");
    const slots = timeSlots();
    const info = openInfo();
    const first = !slots.length && info && info.reopen
      ? `<option value="">${info.closedToday ? "Oggi siamo chiusi" : "Per oggi abbiamo chiuso"}: riapriamo ${info.reopen}</option>`
      : '<option value="">Prima possibile (ti diciamo noi l\'orario)</option>';
    const opts = [first]
      .concat(slots.map((t) => `<option>${t}</option>`));
    const prev = sel.value; sel.innerHTML = opts.join(""); sel.value = slots.includes(prev) ? prev : "";
  }
  $("#cartbar").addEventListener("click", () => {
    buildSuggestions(); renderSuggestions();
    fillTimes();
    $("#c-name").value = $("#c-name").value || store.get("pallone-name", "");
    $("#c-addr").value = $("#c-addr").value || store.get("pallone-addr", "");
    $("#c-city").value = $("#c-city").value || store.get("pallone-city", "");
    $("#c-error").hidden = true;
    $("#cs-sent").hidden = true;
    openSheet(cs);
  });
  $("#cart-more").addEventListener("click", () => { closeSheet(cs); setTimeout(() => $("#menu").scrollIntoView(), 250); });

  $("#ps-note").addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
  // scelte rapide: aggiungono o tolgono il testo dalla nota
  $("#ps-note-chips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-quick]"); if (!c) return;
    const ta = $("#ps-note"), q = c.dataset.quick;
    let parts = ta.value.split(",").map((x) => x.trim()).filter(Boolean);
    const on = parts.some((x) => x.toLowerCase() === q.toLowerCase());
    if (on) parts = parts.filter((x) => x.toLowerCase() !== q.toLowerCase());
    else {
      if (q.startsWith("Ben") || q.startsWith("Poco")) parts = parts.filter((x) => !/^(ben|poco) cotta$/i.test(x)); // solo una cottura
      parts.push(q);
    }
    ta.value = parts.join(", ");
    $$("[data-quick]", $("#ps-note-chips")).forEach((b) => b.setAttribute("aria-pressed", parts.some((x) => x.toLowerCase() === b.dataset.quick.toLowerCase())));
  });
  ["#c-name", "#c-addr", "#c-city"].forEach((s) => $(s).addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); $("#c-error").hidden = true; }));
  // Link Google Maps per l'indirizzo di consegna (cliccabile dentro WhatsApp)
  function mapsLink(q) {
    // niente parentesi o spazi nel link: WhatsApp lo renderebbe cliccabile solo a metà
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q.replace(/[()]/g, " ").replace(/\s+/g, " ").trim()).replace(/%20/g, "+");
  }
  $("#send-wa").addEventListener("click", () => {
    const name = $("#c-name"), addr = $("#c-addr"), city = $("#c-city"), err = $("#c-error");
    [name, addr, city].forEach((i) => i.removeAttribute("aria-invalid"));
    let msg = "";
    if (!name.value.trim()) { msg = "Inserisci il tuo nome."; name.setAttribute("aria-invalid", "true"); name.focus(); }
    else if (state.mode === "domicilio" && !addr.value.trim()) { msg = "Inserisci via e numero civico."; addr.setAttribute("aria-invalid", "true"); addr.focus(); }
    else if (state.mode === "domicilio" && !city.value.trim()) { msg = "Inserisci la città."; city.setAttribute("aria-invalid", "true"); city.focus(); }
    else if (state.mode === "domicilio" && C.consegna && typeof C.consegna.minimoOrdine === "number" && subtotal() < C.consegna.minimoOrdine) {
      msg = `Per la consegna l'ordine minimo è ${fmt(C.consegna.minimoOrdine)}.`;
    }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    store.set("pallone-name", name.value.trim());
    if (addr.value.trim()) store.set("pallone-addr", addr.value.trim());
    if (city.value.trim()) store.set("pallone-city", city.value.trim());
    const fullAddr = `${addr.value.trim()}, ${city.value.trim()}`;

    const lines = state.cart.map((l) => {
      return `• ${l.qty}× ${lineLabel(l)} — ${fmt(unitPrice(l) * l.qty)}${PRODUCTS.get(l.id).deal ? ` (promo ${PRODUCTS.get(l.id).deal.nome})` : ""}${(l.c || []).map((x) => `\n   ↳ ${x}`).join("")}${l.note ? `\n   ↳ ${l.note}` : ""}`;
    });
    const fee = deliveryFee();
    const text = [
      `Ciao ${C.nome}! Vorrei fare questo ordine:`,
      "",
      ...lines,
      "",
      fee ? `Consegna: ${fmt(fee)}` : null,
      `*Totale: ${fmt(subtotal() + fee)}*`,
      "",
      `👤 Nome: ${name.value.trim()}`,
      state.mode === "domicilio" ? `🛵 Consegna a domicilio: ${fullAddr}\n📍 Apri in Maps: ${mapsLink(fullAddr)}` : "🥡 Ritiro in pizzeria (asporto)",
      `🕒 Orario richiesto: ${$("#c-time").value || "prima possibile"} (da confermare)`,
      $("#c-note").value.trim() ? `📝 Note: ${$("#c-note").value.trim()}` : null,
      "",
      "Attendo la vostra conferma dell'ordine e dell'orario. Grazie!"
    ].filter((x) => x !== null).join("\n");

    window.open(waBase + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    // dopo l'invio: ricorda che bisogna aspettare la conferma
    $("#cs-sent").hidden = false;
    $(".sheet__body", cs).scrollTop = 0;
  });
  $("#cs-sent-ok").addEventListener("click", () => closeSheet(cs));
  $("#cs-sent-clear").addEventListener("click", () => {
    state.cart = []; editingNote = -1; save(); renderCart(); closeSheet(cs);
  });

  /* ---------- Modalità tavolo ---------- */
  if (TABLE) {
    $(".hero__eyebrow").textContent = "Benvenuto al tavolo";
    $(".hero__title").innerHTML = "Scegli con calma,<br>mostra al cameriere.";
    $(".hero__sub").textContent = "Componi la tua ordinazione dal menù e mostrala a chi passa al tavolo.";
    $(".cartbar__label").textContent = "La mia ordinazione";
    $("#cs-title").textContent = "La mia ordinazione";
    $("#cart-more").textContent = "+ Aggiungi altro dal menù";
    document.title = `${C.nome || "Pizzeria"} · Menù al tavolo`;
  }
  let wakeLock = null;
  function renderWaiter() {
    $("#wt-list").innerHTML = state.cart.map((l) => {
      const p = PRODUCTS.get(l.id);
      const v = p.varianti ? (p.varianti[l.v] || p.varianti[0]).nome : "";
      const extras = (l.o || []).map((i) => p.opzioni[i]).filter(Boolean).map((o) => o.nome);
      return `<li class="wt-item">
        <span class="wt-qty">${l.qty}×</span>
        <div class="wt-body">
          <b class="wt-name">${esc(p.nome)}${v ? ` <span class="wt-var">${esc(v)}</span>` : ""}</b>
          ${extras.length ? `<span class="wt-sub wt-plus">+ ${extras.map(esc).join(", ")}</span>` : ""}
          ${(l.c || []).map((x) => `<span class="wt-sub">${esc(x)}</span>`).join("")}
          ${l.note ? `<span class="wt-sub wt-note">“${esc(l.note)}”</span>` : ""}
        </div>
        <span class="wt-price">${fmt(unitPrice(l) * l.qty)}</span>
      </li>`;
    }).join("");
    $("#wt-total").textContent = fmt(subtotal());
  }
  $("#show-waiter").addEventListener("click", async () => {
    if (!state.cart.length) return;
    renderWaiter();
    $("#waiter").showModal();
    $("#wt-clear").dataset.armed = ""; $("#wt-clear").textContent = "Nuova ordinazione";
    try { wakeLock = navigator.wakeLock ? await navigator.wakeLock.request("screen") : null; } catch { wakeLock = null; } // schermo acceso
  });
  $("#waiter").addEventListener("close", () => { try { wakeLock && wakeLock.release(); } catch { /* niente */ } wakeLock = null; });
  $("#wt-close").addEventListener("click", () => $("#waiter").close());
  $("#wt-edit").addEventListener("click", () => $("#waiter").close());
  $("#wt-clear").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tocca ancora per svuotare"; return; }
    state.cart = []; save(); renderCart(); $("#waiter").close(); closeSheet($("#cart-sheet"));
    siteToast("Ordinazione svuotata.");
  });

  /* ---------- Avvio ---------- */
  renderMode();
  renderCart();
  applyFilters();
  setInterval(renderHours, 60000);
  } // fine start()
})();
