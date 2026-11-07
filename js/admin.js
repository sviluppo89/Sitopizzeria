/* =========================================================
   Pizzeria Pallone — pannello di gestione
   ---------------------------------------------------------
   Le modifiche restano in "bozza" su questo dispositivo finché
   non premi "Pubblica": allora vengono salvate nel repository
   GitHub (data/menu.json + foto in img/uploads) e il sito si
   aggiorna da solo.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Impostazioni predefinite ---------- */
  const DEFAULT_REPO = { owner: "sviluppo89", repo: "Sitopizzeria", branch: "main" };
  const DATA_PATH = "data/menu.json";
  const UPLOAD_DIR = "img/uploads";
  const K = { gh: "pallone-admin-gh", draft: "pallone-admin-draft", base: "pallone-admin-base", demo: "pallone-admin-demo", site: "pallone-admin-site" };

  /* ---------- Utilità ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const isPrice = (n) => typeof n === "number" && Number.isFinite(n); // NaN (es. "abc") non è un prezzo
  const fmt = (n) => (isPrice(n) ? euro.format(n) : "—");
  const parseMoney = (v) => {
    const t = String(v ?? "").trim().replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
  };
  const moneyInput = (n) => (isPrice(n) ? String(n).replace(".", ",") : "");
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* niente */ } }
  };
  const b64encode = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64decode = (b64) => decodeURIComponent(escape(atob(b64.replace(/\s/g, ""))));
  const art = (p) => (window.pallonArt ? window.pallonArt(p) : "");

  const DAYS = [[1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Gio"], [5, "Ven"], [6, "Sab"], [0, "Dom"]];
  const DAY_FULL = { 0: "Domenica", 1: "Lunedì", 2: "Martedì", 3: "Mercoledì", 4: "Giovedì", 5: "Venerdì", 6: "Sabato" };
  const ic = (n, c) => (window.PallonIcons ? window.PallonIcons.svg(n, c) : "");
  const TAGS = [["piccante", "Piccante", "chili"], ["vegetariana", "Vegetariana", "leaf"], ["novita", "Novità", "sparkle"], ["consigliata", "Consigliata", "star"]];
  const ALLERGENI = ["Glutine", "Latte", "Uova", "Pesce", "Crostacei", "Molluschi", "Frutta a guscio", "Arachidi", "Soia", "Sedano", "Senape", "Sesamo", "Solfiti", "Lupini"];
  const TIPI = [["pizza", "Pizza"], ["calzone", "Calzone / ripieno"], ["fritto", "Fritto"], ["bevanda", "Bevanda"], ["dolce", "Dolce"], ["offerta", "Offerta / menù combo"]];

  const DEMO_OK = new URLSearchParams(location.search).has("prova");
  if (!DEMO_OK) store.del(K.demo);
  $("#demo-box").hidden = !DEMO_OK;

  /* ---------- Stato ---------- */
  const S = {
    gh: store.get(K.gh, null),          // { token, owner, repo, branch }
    // la modalità prova si apre solo con "?prova" nell'indirizzo (es. admin.html?prova)
    demo: DEMO_OK && store.get(K.demo, false),
    base: null,                         // { data, sha } = versione pubblicata
    draft: null,                        // bozza in modifica
    view: "menu",
    open: new Set(),
    reorder: null,
    q: ""
  };

  /* ---------- Messaggi ---------- */
  let toastTimer;
  function toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false; t.classList.toggle("toast--err", !!err);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), err ? 5000 : 2600);
  }
  function ask(title, text, yes = "Elimina", danger = true, no = "Annulla") {
    const d = $("#confirm");
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    const y = $("#confirm-yes");
    y.textContent = yes; y.className = "btn " + (danger ? "btn--danger" : "btn--primary");
    $('#confirm button[value="no"]').textContent = no;
    d.returnValue = "";
    d.showModal();
    return new Promise((res) => d.addEventListener("close", () => res(d.returnValue === "yes"), { once: true }));
  }

  /* ---------- GitHub ---------- */
  async function gh(path, opts = {}) {
    const { owner, repo, token } = S.gh;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) }
    });
    if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; try { e.body = await r.json(); } catch { /* niente */ } throw e; }
    return r.status === 204 ? null : r.json();
  }
  async function getRemote() {
    try {
      const f = await gh(`/contents/${DATA_PATH}?ref=${encodeURIComponent(S.gh.branch)}`);
      return { data: JSON.parse(b64decode(f.content)), sha: f.sha };
    } catch (e) {
      if (e.status === 404) return null; // il file non c'è ancora: verrà creato alla prima pubblicazione
      throw e;
    }
  }
  const putFile = (path, contentB64, message, sha) =>
    gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify({ message, content: contentB64, branch: S.gh.branch, ...(sha ? { sha } : {}) }) });

  async function loadLocalFile() {
    const r = await fetch(DATA_PATH + "?v=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("menu.json non trovato");
    return r.json();
  }

  /* ---------- Bozza ---------- */
  const strip = (d) => { const c = clone(d); delete c.aggiornato; return JSON.stringify(c); };
  const isDirty = () => S.base && S.draft && strip(S.draft) !== strip(S.base.data);
  function saveDraft() {
    const ok = store.set(K.draft, S.draft);
    store.set(K.base, { sha: S.base.sha, data: S.base.data });
    if (!ok) toast("Memoria del dispositivo piena: pubblica le modifiche o usa foto più piccole.", true);
    updateStatus();
  }
  function updateStatus() {
    const st = $("#sync-status");
    const dirty = isDirty();
    st.classList.toggle("is-dirty", dirty);
    st.classList.toggle("is-demo", S.demo);
    st.innerHTML = S.demo ? (dirty ? "Prova · modifiche solo qui" : "Modalità prova") : (dirty ? `${ic("dot")} Modifiche da pubblicare` : `${ic("check")} Tutto pubblicato`);
    $("#publish").disabled = !dirty || S.demo;
    $("#publish-2").disabled = !dirty || S.demo;
    $("#discard").disabled = !dirty;
    $("#more-status").textContent = S.demo
      ? "Sei in modalità prova: puoi provare tutto e vedere l'anteprima, ma per pubblicare devi entrare con il codice di accesso."
      : dirty
        ? "Hai modifiche non ancora visibili sul sito. Controllale con l'anteprima e poi premi Pubblica."
        : `Il sito è aggiornato${S.draft && S.draft.aggiornato ? " (ultima pubblicazione: " + new Date(S.draft.aggiornato).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) + ")" : ""}.`;
  }

  /* ---------- Avvio ---------- */
  async function boot() {
    if (!S.gh && !S.demo) return showLogin();
    try {
      let base;
      if (S.demo) {
        const saved = store.get(K.base, null);
        base = saved && saved.data ? saved : { data: await loadLocalFile(), sha: null };
      } else {
        base = (await getRemote()) || { data: await loadLocalFile(), sha: null };
      }
      S.base = base;
      const draft = store.get(K.draft, null);
      const savedBase = store.get(K.base, null);
      if (draft && savedBase && savedBase.sha !== base.sha && strip(draft) !== strip(savedBase.data)) {
        const keep = await ask("Il menù online è cambiato",
          "Qualcuno ha pubblicato da un altro dispositivo. Vuoi tenere le modifiche non pubblicate di questo dispositivo?",
          "Tieni le mie", false, "Usa quelle online");
        S.draft = keep ? draft : clone(base.data);
      } else if (draft && (!savedBase || savedBase.sha === base.sha)) {
        S.draft = draft;
      } else {
        S.draft = clone(base.data);
      }
      normalize(S.draft);
      saveDraft();
      showApp();
    } catch (e) {
      console.error(e);
      if (e.status === 401) { store.del(K.gh); S.gh = null; showLogin("Il codice di accesso non è più valido. Inseriscine uno nuovo."); }
      else showLogin("Non riesco a caricare il menù. Controlla la connessione e riprova.");
    }
  }
  function normalize(d) {
    d.info = d.info || {};
    d.info.ordini = d.info.ordini || { attivi: true, messaggioPausa: "" };
    d.info.consegna = d.info.consegna || { attiva: true, costo: null, minimoOrdine: null, zone: "" };
    d.promo = d.promo || [];
    d.sconti = d.sconti || [];
    d.aggiunte = d.aggiunte || [];
    d.categorie = d.categorie || [];
    d.categorie.forEach((c) => { c.prodotti = c.prodotti || []; c.opzioni = c.opzioni || []; });
  }

  /* ---------- Accesso ---------- */
  function showLogin(err) {
    $("#app").hidden = true; $("#login").hidden = false;
    const g = S.gh || DEFAULT_REPO;
    $("#login-owner").value = g.owner; $("#login-repo").value = g.repo; $("#login-branch").value = g.branch;
    $("#login-error").textContent = err || ""; $("#login-error").hidden = !err;
  }
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = $("#login-token").value.trim();
    const owner = $("#login-owner").value.trim() || DEFAULT_REPO.owner;
    const repo = $("#login-repo").value.trim() || DEFAULT_REPO.repo;
    const branch = $("#login-branch").value.trim() || DEFAULT_REPO.branch;
    const err = $("#login-error");
    if (!token) { err.textContent = "Inserisci il codice di accesso."; err.hidden = false; return; }
    const btn = $("#login-submit"); btn.disabled = true; btn.textContent = "Controllo…";
    S.gh = { token, owner, repo, branch };
    try {
      const info = await gh("");
      if (info.permissions && !info.permissions.push) throw Object.assign(new Error("noperm"), { status: 403 });
      try { await gh(`/branches/${encodeURIComponent(branch)}`); }
      catch (x) { if (x.status === 404) throw Object.assign(new Error("nobranch"), { status: 4041 }); throw x; }
      store.set(K.gh, S.gh); store.del(K.demo); S.demo = false;
      store.del(K.base);
      $("#login-token").value = "";
      await boot();
    } catch (x) {
      S.gh = null;
      err.textContent = x.status === 401 ? "Codice non valido o scaduto."
        : x.status === 404 ? "Repository non trovato, oppure il codice non ha accesso a questo repository."
        : x.status === 403 ? "Il codice non ha il permesso di modificare (serve Contents: Read and write)."
        : x.status === 4041 ? `Il ramo "${branch}" non esiste nel repository.`
        : "Connessione non riuscita. Riprova.";
      err.hidden = false;
    } finally { btn.disabled = false; btn.textContent = "Entra"; }
  });
  $("#demo").addEventListener("click", () => { S.demo = true; store.set(K.demo, true); boot(); });

  function showApp() {
    $("#login").hidden = true; $("#app").hidden = false;
    $("#account-info").textContent = S.demo ? "Modalità prova (nessun account collegato)." : `Collegato a ${S.gh.owner}/${S.gh.repo} · ramo ${S.gh.branch}`;
    $("#logout").textContent = S.demo ? "Esci dalla prova" : "Esci da questo dispositivo";
    renderAll();
    updateStatus();
  }
  $("#logout").addEventListener("click", async () => {
    const msg = isDirty() ? "Hai modifiche non pubblicate: andranno perse." : "Dovrai inserire di nuovo il codice per entrare.";
    if (!(await ask("Vuoi uscire?", msg, "Esci"))) return;
    Object.values(K).forEach(store.del);
    S.gh = null; S.demo = false; S.base = S.draft = null;
    showLogin();
  });

  /* ---------- Navigazione ---------- */
  $$(".tab").forEach((t) => t.addEventListener("click", () => go(t.dataset.view)));
  function go(v) {
    S.view = v;
    $$(".tab").forEach((t) => { const on = t.dataset.view === v; t.classList.toggle("is-active", on); t.setAttribute("aria-current", on ? "page" : "false"); });
    $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + v));
    $("#view-title").textContent = $("#view-" + v).dataset.title;
    scrollTo(0, 0);
    if (v === "more") renderQR();
  }
  function renderAll() { renderMenu(); renderPromo(); renderSconti(); renderShop(); updateStatus(); }

  /* =========================================================
     MENÙ
     ========================================================= */
  const priceText = (p) => {
    if (p.varianti && p.varianti.length) {
      const ps = p.varianti.map((v) => v.prezzo).filter((x) => isPrice(x));
      const min = Math.min(...ps), max = Math.max(...ps);
      return ps.length ? (min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`) : "—";
    }
    return fmt(p.prezzo);
  };
  const daysText = (g) => DAYS.filter(([d]) => g.includes(d)).map(([, n]) => n).join(" · ");

  function renderMenu() {
    const q = S.q.trim().toLowerCase();
    const cats = S.draft.categorie;
    $("#cat-list").innerHTML = cats.map((c, ci) => {
      const prods = c.prodotti.map((p, pi) => ({ p, pi })).filter(({ p }) => !q || (p.nome + " " + p.ingredienti).toLowerCase().includes(q));
      if (q && !prods.length) return "";
      const open = q || S.open.has(c.id);
      const hidden = c.prodotti.filter((p) => p.attivo === false).length;
      const out = c.prodotti.filter((p) => p.disponibile === false).length;
      const reordering = S.reorder === c.id;
      return `
      <section class="cat${open ? " is-open" : ""}${c.attiva === false ? " is-off" : ""}" data-ci="${ci}">
        <div class="cat__head">
          <button type="button" class="cat__toggle" data-act="toggle-cat" aria-expanded="${!!open}">
            ${ic("chev", "cat__chev")}
            <span style="min-width:0">
              <span class="cat__name">${esc(c.nome)}</span>
              <span class="cat__meta">${c.prodotti.length} prodotti${hidden ? ` · ${hidden} nascosti` : ""}${out ? ` · ${out} esauriti` : ""}${c.attiva === false ? " · categoria nascosta" : ""}</span>
            </span>
          </button>
          <button type="button" class="iconbtn" data-act="edit-cat" aria-label="Modifica categoria ${esc(c.nome)}" title="Modifica categoria">
            ${ic("pencil")}
          </button>
        </div>
        ${open ? `
        <div class="cat__body">
          ${prods.length ? prods.map(({ p, pi }) => `
            <div class="prod${p.attivo === false ? " is-hidden" : ""}" data-pi="${pi}">
              <button type="button" class="prod__open" data-act="edit-prod">
                <span class="thumb">${art({ ...p, tipo: c.tipo })}</span>
                <span class="prod__txt">
                  <span class="prod__name">${esc(p.nome)}</span>
                  <span class="prod__sub"><span class="prod__price">${priceText(p)}</span>
                    ${p.attivo === false ? '<span class="tag">Nascosto</span>' : ""}
                    ${p.disponibile === false ? '<span class="tag tag--off">Esaurito</span>' : ""}
                    ${p.giorni && p.giorni.length ? `<span class="tag">${daysText(p.giorni)}</span>` : ""}
                    ${p.evidenza ? `<span class="tag tag--warn">${ic("star")} In evidenza</span>` : ""}
                    ${p.foto && p.foto.startsWith("data:") ? '<span class="tag tag--warn">Foto nuova</span>' : ""}
                  </span>
                </span>
              </button>
              ${reordering ? `
                <div class="order">
                  <button type="button" class="iconbtn" data-act="up" aria-label="Sposta su ${esc(p.nome)}" ${pi === 0 ? "disabled" : ""}>↑</button>
                  <button type="button" class="iconbtn" data-act="down" aria-label="Sposta giù ${esc(p.nome)}" ${pi === c.prodotti.length - 1 ? "disabled" : ""}>↓</button>
                </div>` : `
                <label class="prod__side" title="Disponibile oggi">
                  <input type="checkbox" class="switch" data-act="avail" ${p.disponibile !== false ? "checked" : ""} aria-label="${esc(p.nome)} disponibile">
                  <span>${p.disponibile !== false ? "Disponibile" : "Esaurito"}</span>
                </label>`}
            </div>`).join("") : '<p class="empty-hint">Nessun prodotto in questa categoria.</p>'}
          ${q ? "" : `
          <div class="cat__foot">
            <button type="button" class="btn btn--light" data-act="add-prod">+ Aggiungi prodotto</button>
            ${c.prodotti.length > 1 ? `<button type="button" class="btn btn--ghost" data-act="reorder">${reordering ? "Fine" : "Cambia ordine"}</button>` : ""}
          </div>`}
        </div>` : ""}
      </section>`;
    }).join("") || '<p class="empty-hint">Nessun prodotto trovato.</p>';
    $("#add-cat").hidden = !!q;
  }

  $("#menu-search").addEventListener("input", (e) => { S.q = e.target.value; renderMenu(); });

  $("#cat-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const catEl = b.closest(".cat"); const ci = +catEl.dataset.ci; const c = S.draft.categorie[ci];
    const prodEl = b.closest(".prod"); const pi = prodEl ? +prodEl.dataset.pi : -1;
    switch (b.dataset.act) {
      case "toggle-cat": S.open.has(c.id) ? S.open.delete(c.id) : S.open.add(c.id); renderMenu(); break;
      case "edit-cat": editCategory(ci); break;
      case "edit-prod": editProduct(ci, pi); break;
      case "add-prod": editProduct(ci, -1); break;
      case "reorder": S.reorder = S.reorder === c.id ? null : c.id; renderMenu(); break;
      case "up": case "down": {
        const j = b.dataset.act === "up" ? pi - 1 : pi + 1;
        if (j < 0 || j >= c.prodotti.length) return;
        [c.prodotti[pi], c.prodotti[j]] = [c.prodotti[j], c.prodotti[pi]];
        saveDraft(); renderMenu();
        const again = $(`.cat[data-ci="${ci}"] .prod[data-pi="${j}"] [data-act="${b.dataset.act}"]`);
        if (again && !again.disabled) again.focus();
        break;
      }
    }
  });
  $("#cat-list").addEventListener("change", (e) => {
    if (e.target.dataset.act !== "avail") return;
    const c = S.draft.categorie[+e.target.closest(".cat").dataset.ci];
    const p = c.prodotti[+e.target.closest(".prod").dataset.pi];
    p.disponibile = e.target.checked;
    e.target.nextElementSibling.textContent = p.disponibile ? "Disponibile" : "Esaurito";
    saveDraft();
    toast(`${p.nome}: ${p.disponibile ? "di nuovo disponibile" : "segnato come esaurito"}`);
  });
  $("#add-cat").addEventListener("click", () => editCategory(-1));
  $("#edit-extras").addEventListener("click", () => editExtras());

  // Aggiunte valide per tutto il menù (es. Mozzarella di bufala +2 €)
  function editExtras() {
    const html = panel("", `<p class="muted" style="font-size:.9rem">Le aggiunte che il cliente può mettere su qualsiasi pizza, con il prezzo in più. Compaiono in fondo al menù. Per le aggiunte di una sola categoria (es. "Nel ruoto") apri la categoria con la matita.</p>${rowsHTML(S.draft.aggiunte || [], "Es. Mozzarella di bufala", "€")}`);
    openEditor("Aggiunte a pagamento", html, (root) => {
      const rows = readRows(root);
      if (rows.some((r) => !r.nome || !isPrice(r.prezzo))) { toast("Ogni aggiunta deve avere nome e prezzo.", true); return false; }
      S.draft.aggiunte = rows.map((r) => ({ nome: r.nome, prezzo: r.prezzo }));
      saveDraft(); toast("Aggiunte salvate");
    }, (root) => bindRows(root));
  }

  /* =========================================================
     OFFERTE
     ========================================================= */
  const dayDate = (d) => new Date(d + "T00:00:00");
  function promoStatus(o) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    if (o.attiva === false) return ["Spenta", ""];
    if (o.al && dayDate(o.al) < t) return ["Scaduta", "tag--off"];
    if (o.dal && dayDate(o.dal) > t) return [`Dal ${dayDate(o.dal).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`, "tag--warn"];
    if (o.giorni && o.giorni.length && !o.giorni.includes(new Date().getDay())) return [`Solo ${daysText(o.giorni)}`, ""];
    return ["Attiva oggi", "tag--ok"];
  }
  $("#promo-today").addEventListener("change", (e) => {
    S.draft.info.offerteSoloOggi = e.target.checked; saveDraft(); renderPromo();
    toast(e.target.checked ? "Le offerte degli altri giorni non si vedranno sul sito" : "Tutte le offerte attive si vedranno sul sito");
  });
  function renderPromo() {
    const list = S.draft.promo;
    $("#promo-today").checked = S.draft.info.offerteSoloOggi === true;
    $("#promo-list").innerHTML = list.length ? list.map((o, i) => {
      let [st, cls] = promoStatus(o);
      if (S.draft.info.offerteSoloOggi && st.startsWith("Solo ")) { st = `Nascosta oggi · ${st.slice(5)}`; cls = "tag--off"; }
      return `
      <div class="pcard" data-i="${i}">
        <button type="button" class="prod__open" data-act="edit">
          <span class="thumb">${art({ nome: o.titolo, ingredienti: o.testo, dettagli: o.dettagli, prezzo: o.prezzo, foto: o.foto, tipo: "offerta" })}</span>
          <span class="prod__txt">
            <span class="prod__name">${esc(o.titolo)}</span>
            <span class="prod__sub"><span class="prod__price">${fmt(o.prezzo)}</span><span class="tag ${cls}">${esc(st)}</span></span>
          </span>
        </button>
        <label class="prod__side"><input type="checkbox" class="switch" data-act="on" ${o.attiva !== false ? "checked" : ""} aria-label="Offerta ${esc(o.titolo)} attiva"><span>${o.attiva !== false ? "Attiva" : "Spenta"}</span></label>
      </div>`;
    }).join("") : '<p class="empty-hint">Nessuna offerta. Creane una!</p>';
  }
  $("#promo-list").addEventListener("click", (e) => {
    const b = e.target.closest('[data-act="edit"]'); if (!b) return;
    editPromo(+b.closest(".pcard").dataset.i);
  });
  $("#promo-list").addEventListener("change", (e) => {
    if (e.target.dataset.act !== "on") return;
    const o = S.draft.promo[+e.target.closest(".pcard").dataset.i];
    o.attiva = e.target.checked; saveDraft(); renderPromo();
    toast(`Offerta "${o.titolo}" ${o.attiva ? "attivata" : "spenta"}`);
  });
  $("#add-promo").addEventListener("click", () => editPromo(-1));

  /* =========================================================
     SCONTI su prodotti e categorie
     ========================================================= */
  const scontoShort = (x) => x.tipo === "percentuale" ? `-${String(x.valore).replace(".", ",")}%` : x.tipo === "meno" ? `-${fmt(x.valore)}` : `a ${fmt(x.valore)}`;
  const applySconto = (x, price) => {
    const v = Number(x.valore) || 0;
    const r = x.tipo === "percentuale" ? price * (1 - v / 100) : x.tipo === "meno" ? price - v : Math.min(price, v);
    return Math.max(0, Math.round(r * 100) / 100);
  };
  // prodotti a cui si applica uno sconto
  const scontoTargets = (x) => S.draft.categorie.flatMap((c) => c.prodotti
    .filter((p) => (x.categorie || []).includes(c.id) || (x.prodotti || []).includes(p.id))
    .map((p) => ({ p, c })));
  function scontoTargetText(x) {
    const cats = S.draft.categorie.filter((c) => (x.categorie || []).includes(c.id)).map((c) => c.nome);
    const n = (x.prodotti || []).length;
    return [...cats, n ? `${n} prodott${n === 1 ? "o" : "i"}` : ""].filter(Boolean).join(" + ") || "Nessun prodotto";
  }
  function renderSconti() {
    const list = S.draft.sconti;
    $("#sconti-list").innerHTML = list.length ? list.map((x, i) => {
      const [st, cls] = promoStatus(x);
      return `
      <div class="pcard" data-i="${i}">
        <button type="button" class="prod__open" data-act="edit">
          <span class="thumb thumb--deal">${esc(scontoShort(x))}</span>
          <span class="prod__txt">
            <span class="prod__name">${esc(x.nome)}</span>
            <span class="prod__sub"><span>${esc(scontoTargetText(x))}</span><span class="tag ${cls}">${esc(st)}</span></span>
          </span>
        </button>
        <label class="prod__side"><input type="checkbox" class="switch" data-act="on" ${x.attiva !== false ? "checked" : ""} aria-label="Sconto ${esc(x.nome)} attivo"><span>${x.attiva !== false ? "Attivo" : "Spento"}</span></label>
      </div>`;
    }).join("") : '<p class="empty-hint">Nessuno sconto. Creane uno, ad esempio "Lunedì classiche a 5 €".</p>';
  }
  $("#sconti-list").addEventListener("click", (e) => {
    const b = e.target.closest('[data-act="edit"]'); if (!b) return;
    editSconto(+b.closest(".pcard").dataset.i);
  });
  $("#sconti-list").addEventListener("change", (e) => {
    if (e.target.dataset.act !== "on") return;
    const x = S.draft.sconti[+e.target.closest(".pcard").dataset.i];
    x.attiva = e.target.checked; saveDraft(); renderSconti();
    toast(`Sconto "${x.nome}" ${x.attiva ? "attivato" : "spento"}`);
  });
  $("#add-sconto").addEventListener("click", () => editSconto(-1));

  function editSconto(i) {
    const isNew = i < 0;
    const x = isNew
      ? { id: uid("sconto"), nome: "", testo: "", tipo: "prezzo", valore: null, categorie: [], prodotti: [], giorni: [], dal: "", al: "", attiva: true }
      : clone(S.draft.sconti[i]);
    const TIPO = [["prezzo", "Prezzo fisso", "Es. tutte a 5 €"], ["percentuale", "Sconto %", "Es. -20%"], ["meno", "Sconto €", "Es. -1 € su ognuna"]];
    const picker = S.draft.categorie.map((c) => {
      const allOn = (x.categorie || []).includes(c.id);
      const sel = c.prodotti.filter((p) => allOn || (x.prodotti || []).includes(p.id)).length;
      return `
      <details data-cat="${esc(c.id)}">
        <summary>${esc(c.nome)}<span class="cnt">${allOn ? "Tutta la categoria" : sel ? sel + " scelti" : ""}</span></summary>
        <label class="pick pick--all"><input type="checkbox" data-allcat="${esc(c.id)}" ${allOn ? "checked" : ""}><span>Tutta la categoria <small>(anche i prodotti aggiunti in futuro)</small></span></label>
        ${c.prodotti.map((p) => `
        <label class="pick"><input type="checkbox" data-prod="${esc(p.id)}" ${allOn || (x.prodotti || []).includes(p.id) ? "checked" : ""} ${allOn ? "disabled" : ""}>
          <span>${esc(p.nome)}</span><small>${priceText(p)}</small></label>`).join("")}
      </details>`;
    }).join("");
    const html = `
      ${panel("", `
        ${fieldHTML("Nome dello sconto *", `<input type="text" name="nome" value="${esc(x.nome)}" placeholder="Es. Lunedì classiche a 5 €" required>`, "Lo vedono i clienti, quindi scrivilo in modo chiaro.")}
        ${fieldHTML("Frase sotto il nome <small>(facoltativa)</small>", `<input type="text" name="testo" value="${esc(x.testo)}" placeholder="Es. Margherita, Marinara, Diavola e tante altre">`)}
        ${switchHTML("attiva", "Sconto attivo", "", x.attiva !== false)}
      `)}
      ${panel("Che sconto?", `
        <div class="seg" role="radiogroup" aria-label="Tipo di sconto">${TIPO.map(([v, l]) => `<label><input type="radio" name="tipo" value="${v}" ${x.tipo === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
        ${fieldHTML(`<span id="val-label">Valore</span> *`, `<input type="text" name="valore" inputmode="decimal" value="${moneyInput(x.valore)}">`, '<span id="val-hint"></span>')}
      `)}
      ${panel("Su quali prodotti?", `
        <p class="muted" style="font-size:.86rem">Scegli intere categorie o singoli prodotti.</p>
        <div class="picker">${picker}</div>
      `)}
      ${panel("Quando vale", `
        <div class="field"><span class="field__label">Giorni della settimana <small>(nessuno = tutti i giorni)</small></span>${chipsHTML("giorni", DAYS, x.giorni || [])}</div>
        <div class="grid2">
          ${fieldHTML("Dal <small>(facoltativo)</small>", `<input type="date" name="dal" value="${esc(x.dal)}">`)}
          ${fieldHTML("Al <small>(facoltativo)</small>", `<input type="date" name="al" value="${esc(x.al)}">`)}
        </div>
      `)}
      <div class="summary-box" id="sc-summary" aria-live="polite"></div>
      ${isNew ? "" : `<div class="danger-zone">
        <button type="button" class="btn btn--light" id="dup">Duplica</button>
        <button type="button" class="btn btn--danger-ghost" id="del">Elimina sconto</button>
      </div>`}`;

    const read = (root) => {
      const tipo = ($("input[name=tipo]:checked", root) || {}).value || "prezzo";
      const categorie = $$("[data-allcat]:checked", root).map((i) => i.dataset.allcat);
      const prodotti = $$("[data-prod]:checked:not(:disabled)", root).map((i) => i.dataset.prod);
      return { ...x, tipo, categorie, prodotti, valore: parseMoney($("[name=valore]", root).value), giorni: checked(root, "giorni").map(Number) };
    };
    const refresh = (root) => {
      const y = read(root);
      $("#val-label", root).textContent = y.tipo === "prezzo" ? "Nuovo prezzo (€)" : y.tipo === "percentuale" ? "Percentuale di sconto (%)" : "Euro di sconto (€)";
      $("#val-hint", root).textContent = y.tipo === "prezzo" ? "I prodotti che costano già meno restano al loro prezzo." : y.tipo === "percentuale" ? "Es. 20 = 20% in meno." : "Es. 1 = un euro in meno su ogni prodotto.";
      $("[name=valore]", root).placeholder = y.tipo === "prezzo" ? "Es. 5" : y.tipo === "percentuale" ? "Es. 20" : "Es. 1";
      $$("details[data-cat]", root).forEach((d) => {
        const all = $("[data-allcat]", d).checked;
        $$("[data-prod]", d).forEach((i) => { i.disabled = all; if (all) i.checked = true; });
        const n = $$("[data-prod]:checked", d).length;
        $(".cnt", d).textContent = all ? "Tutta la categoria" : n ? `${n} scelti` : "";
      });
      const t = scontoTargets(y);
      const ok = isPrice(y.valore);
      const ex = ok ? t.slice(0, 4).map(({ p }) => {
        const base = p.varianti && p.varianti.length ? p.varianti[0].prezzo : p.prezzo;
        if (!isPrice(base)) return "";
        const np = applySconto(y, base);
        return `<li>${esc(p.nome)}: ${np < base ? `<s>${fmt(base)}</s> → <b>${fmt(np)}</b>` : `${fmt(base)} (resta uguale: costa già così)`}</li>`;
      }).join("") : "";
      $("#sc-summary", root).innerHTML = !t.length ? "Scegli almeno una categoria o un prodotto."
        : `Si applica a <b>${t.length}</b> prodott${t.length === 1 ? "o" : "i"}${y.giorni.length ? ` ogni <b>${daysText(y.giorni)}</b>` : " tutti i giorni"}.${ex ? `<ul>${ex}${t.length > 4 ? "<li>…</li>" : ""}</ul>` : ""}`;
    };

    openEditor(isNew ? "Nuovo sconto" : x.nome, html, (root) => {
      const y = read(root);
      y.nome = $("[name=nome]", root).value.trim();
      y.testo = $("[name=testo]", root).value.trim();
      y.attiva = $("[name=attiva]", root).checked;
      y.dal = $("[name=dal]", root).value; y.al = $("[name=al]", root).value;
      if (!y.nome) { $("[name=nome]", root).setAttribute("aria-invalid", "true"); $("[name=nome]", root).focus(); toast("Scrivi il nome dello sconto.", true); return false; }
      if (!isPrice(y.valore) || (y.tipo === "percentuale" && y.valore > 100)) { $("[name=valore]", root).setAttribute("aria-invalid", "true"); $("[name=valore]", root).focus(); toast("Scrivi un valore valido.", true); return false; }
      if (!y.categorie.length && !y.prodotti.length) { toast("Scegli almeno una categoria o un prodotto.", true); return false; }
      if (y.dal && y.al && y.al < y.dal) { toast("La data di fine è prima di quella di inizio.", true); return false; }
      if (isNew) S.draft.sconti.push(y); else S.draft.sconti[i] = y;
      saveDraft(); renderSconti(); toast(isNew ? "Sconto creato" : "Modifiche salvate");
    }, (root) => {
      refresh(root);
      root.addEventListener("change", () => refresh(root));
      $("[name=valore]", root).addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); refresh(root); });
      if (isNew) setTimeout(() => $("[name=nome]", root).focus(), 50);
      const dup = $("#dup", root), del = $("#del", root);
      if (dup) dup.addEventListener("click", () => {
        const copy = clone(S.draft.sconti[i]); copy.id = uid("sconto"); copy.nome += " (copia)"; copy.attiva = false;
        S.draft.sconti.splice(i + 1, 0, copy); saveDraft(); renderSconti(); ed.close(); toast("Sconto duplicato (spento)");
      });
      if (del) del.addEventListener("click", async () => {
        ed.close();
        if (await ask(`Eliminare "${x.nome}"?`, "Per toglierlo solo per un po', spegni l'interruttore \"Attivo\".")) {
          S.draft.sconti.splice(i, 1); saveDraft(); renderSconti(); toast("Sconto eliminato");
        } else editSconto(i);
      });
    });
  }

  /* =========================================================
     NEGOZIO
     ========================================================= */
  const getPath = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, path, v) => { const ks = path.split("."); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[last] = v; };

  function renderShop() {
    const info = S.draft.info;
    $$("#shop-form [data-k]").forEach((el) => {
      const v = getPath(info, el.dataset.k);
      if (el.type === "checkbox") el.checked = v !== false;
      else if (el.dataset.type === "money") el.value = moneyInput(v);
      else el.value = v ?? "";
    });
    $("#hours-on").checked = !!info.orari;
    renderHours();
  }
  $("#shop-form").addEventListener("input", (e) => {
    const el = e.target; if (!el.dataset.k) return;
    let v;
    if (el.type === "checkbox") v = el.checked;
    else if (el.dataset.type === "money") {
      v = parseMoney(el.value);
      el.setAttribute("aria-invalid", Number.isNaN(v) ? "true" : "false");
      if (Number.isNaN(v)) return;
    } else if (el.dataset.type === "phone") v = el.value.replace(/\D/g, "");
    else v = el.value;
    setPath(S.draft.info, el.dataset.k, v);
    saveDraft();
  });
  $("#shop-form").addEventListener("change", (e) => { if (e.target.dataset.k) { e.target.dispatchEvent(new Event("input", { bubbles: true })); } });

  // Orari
  const DEFAULT_HOURS = () => Object.fromEntries(DAYS.map(([d]) => [d, [["18:30", "23:30"]]]));
  $("#hours-on").addEventListener("change", (e) => {
    S.draft.info.orari = e.target.checked ? (S.lastHours || DEFAULT_HOURS()) : null;
    if (!e.target.checked) S.lastHours = getPath(S.base.data, "info.orari") || S.lastHours;
    saveDraft(); renderHours();
  });
  function renderHours() {
    const o = S.draft.info.orari;
    const box = $("#hours-editor");
    if (!o) { box.innerHTML = '<p class="muted">Gli orari non sono mostrati sul sito.</p>'; return; }
    box.innerHTML = DAYS.map(([d]) => {
      const slots = o[d] || [];
      return `
      <div class="day" data-d="${d}">
        <div class="day__head">
          <span class="day__name">${DAY_FULL[d]}</span>
          <label class="switchrow" style="padding:0"><small>${slots.length ? "Aperto" : "Chiuso"}</small><input type="checkbox" class="switch" data-h="open" ${slots.length ? "checked" : ""} aria-label="${DAY_FULL[d]} aperto"></label>
        </div>
        ${slots.length ? `<div class="slots">${slots.map(([a, b], i) => `
          <div class="slot" data-i="${i}">
            <input type="time" value="${a}" data-h="a" aria-label="${DAY_FULL[d]} apertura"><span>–</span>
            <input type="time" value="${b}" data-h="b" aria-label="${DAY_FULL[d]} chiusura">
            ${slots.length > 1 ? `<button type="button" class="iconbtn" data-h="del" aria-label="Togli fascia">×</button>` : ""}
          </div>`).join("")}</div>
          ${slots.length < 2 ? `<button type="button" class="linkbtn" data-h="add">+ Aggiungi fascia (es. pranzo)</button>` : ""}` : ""}
      </div>`;
    }).join("") + `<button type="button" class="btn btn--light btn--sm copyall" data-h="copy">Copia gli orari del lunedì su tutti i giorni aperti</button>`;
  }
  $("#hours-editor").addEventListener("change", (e) => {
    const el = e.target, dayEl = el.closest(".day"); if (!dayEl) return;
    const d = dayEl.dataset.d, o = S.draft.info.orari;
    if (el.dataset.h === "open") { o[d] = el.checked ? [["18:30", "23:30"]] : []; saveDraft(); renderHours(); return; }
    const i = +el.closest(".slot").dataset.i;
    if (el.dataset.h === "a") o[d][i][0] = el.value;
    if (el.dataset.h === "b") o[d][i][1] = el.value;
    saveDraft();
  });
  $("#hours-editor").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-h]"); if (!b) return;
    const o = S.draft.info.orari;
    if (b.dataset.h === "copy") {
      const mon = o[1] && o[1].length ? o[1] : [["18:30", "23:30"]];
      DAYS.forEach(([d]) => { if ((o[d] || []).length) o[d] = clone(mon); });
      saveDraft(); renderHours(); toast("Orari copiati"); return;
    }
    const d = b.closest(".day").dataset.d;
    if (b.dataset.h === "add") o[d].push(["12:00", "15:00"]);
    if (b.dataset.h === "del") o[d].splice(+b.closest(".slot").dataset.i, 1);
    o[d].sort((x, y) => x[0].localeCompare(y[0]));
    saveDraft(); renderHours();
  });

  /* =========================================================
     EDITOR (pannello)
     ========================================================= */
  const ed = $("#editor");
  let onSave = null;
  function openEditor(title, html, save, mount) {
    $("#editor-title").textContent = title;
    $("#editor-body").innerHTML = html;
    onSave = save;
    ed.showModal();
    $("#editor-body").scrollTop = 0;
    if (mount) mount($("#editor-body"));
  }
  $("#editor-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (onSave && onSave($("#editor-body")) !== false) ed.close();
  });
  ed.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) ed.close(); });

  // blocchi riutilizzabili
  const fieldHTML = (label, inner, hint) => `<label class="field"><span class="field__label">${label}</span>${inner}${hint ? `<span class="field__hint">${hint}</span>` : ""}</label>`;
  const switchHTML = (name, label, sub, on) => `<label class="switchrow"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><input type="checkbox" class="switch" name="${name}" ${on ? "checked" : ""}></label>`;
  const chipsHTML = (name, items, sel) => `<div class="chips">${items.map(([v, l, i]) => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(v)}" ${sel.map(String).includes(String(v)) ? "checked" : ""}><span>${i ? ic(i) : ""}${esc(l)}</span></label>`).join("")}</div>`;
  const panel = (title, inner) => `<div class="panel">${title ? `<div class="panel__head"><h2>${title}</h2></div>` : ""}${inner}</div>`;
  const rowsHTML = (list, phName, phPrice) => `
    <div class="variants" data-ph-name="${esc(phName)}" data-ph-price="${esc(phPrice)}">${list.map((v) => rowHTML(v, phName, phPrice)).join("")}</div>
    <button type="button" class="add-link" data-add-row>+ Aggiungi</button>`;
  const rowHTML = (v, phName, phPrice) => `
    <div class="variant">
      <input type="text" data-v="nome" value="${esc(v.nome || "")}" placeholder="${esc(phName)}" aria-label="Nome">
      <input type="text" inputmode="decimal" data-v="prezzo" value="${moneyInput(v.prezzo)}" placeholder="${esc(phPrice)}" aria-label="Prezzo in euro">
      <button type="button" class="iconbtn" data-del-row aria-label="Togli">×</button>
    </div>`;
  const readRows = (root) => $$(".variant", root).map((r) => ({ nome: $('[data-v="nome"]', r).value.trim(), prezzo: parseMoney($('[data-v="prezzo"]', r).value) })).filter((v) => v.nome || v.prezzo != null);
  const checked = (root, name) => $$(`input[name="${name}"]:checked`, root).map((i) => i.value);
  function bindRows(root) {
    root.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add-row]");
      if (add) {
        const list = add.previousElementSibling;
        list.insertAdjacentHTML("beforeend", rowHTML({}, list.dataset.phName, list.dataset.phPrice));
        $$('.variant [data-v="nome"]', list).pop().focus();
      }
      const del = e.target.closest("[data-del-row]");
      if (del) del.closest(".variant").remove();
    });
  }

  // Foto: ridimensiona e ritaglia 4:3 sul dispositivo, poi la tiene nella bozza
  function photoHTML(foto, preview) {
    return `
    <div class="photo">
      <div class="photo__box" id="ph-box">${foto ? `<img src="${esc(foto)}" alt="">` : preview}${foto ? "" : '<span class="photo__badge">Disegno automatico</span>'}</div>
      <div class="photo__btns">
        <label class="btn btn--light">${foto ? "Cambia foto" : "Aggiungi foto"}<input type="file" accept="image/*" id="ph-input" hidden></label>
        ${foto ? '<button type="button" class="btn btn--ghost" id="ph-del">Usa il disegno</button>' : ""}
      </div>
    </div>`;
  }
  function bindPhoto(root, getPreview, holder) {
    const refresh = () => {
      const wrap = $(".photo", root);
      wrap.outerHTML = photoHTML(holder.foto, getPreview());
      wire();
    };
    const wire = () => {
      $("#ph-input", root).addEventListener("change", async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { holder.foto = await processImage(f); refresh(); }
        catch { toast("Questa immagine non si può usare. Prova con una foto JPG o PNG.", true); }
      });
      const del = $("#ph-del", root);
      if (del) del.addEventListener("click", () => { holder.foto = ""; refresh(); });
    };
    wire();
  }
  function processImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const W = 960, H = 720, r = W / H;
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        if (sw / sh > r) { sx = (sw - sh * r) / 2; sw = sh * r; } else { sy = (sh - sw / r) / 2; sh = sw / r; }
        const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const ctx = cv.getContext("2d"); ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        URL.revokeObjectURL(url);
        let out = cv.toDataURL("image/webp", 0.8);
        if (!out.startsWith("data:image/webp")) out = cv.toDataURL("image/jpeg", 0.82);
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }

  /* ---------- Prodotto ---------- */
  function editProduct(ci, pi) {
    const cat = S.draft.categorie[ci];
    const isNew = pi < 0;
    const p = isNew
      ? { id: uid(cat.id), nome: "", ingredienti: "", prezzo: null, varianti: [], tag: [], allergeni: [], foto: "", attivo: true, disponibile: true, giorni: [], dettagli: "", richiesta: "" }
      : clone(cat.prodotti[pi]);
    const holder = { foto: p.foto || "" };
    const multi = p.varianti && p.varianti.length > 0;
    const preview = () => art({ ...p, nome: $("[name=nome]", ed)?.value || p.nome, ingredienti: $("[name=ingredienti]", ed)?.value || p.ingredienti, tipo: S.draft.categorie[+($("[name=cat]", ed)?.value ?? ci)].tipo });

    const html = `
      ${photoHTML(holder.foto, art({ ...p, tipo: cat.tipo }))}
      ${panel("", `
        ${fieldHTML("Nome *", `<input type="text" name="nome" value="${esc(p.nome)}" placeholder="Es. Margherita" required>`)}
        ${fieldHTML("Ingredienti o descrizione", `<textarea name="ingredienti" rows="3" placeholder="Es. Pomodoro San Marzano, Fior di latte, Basilico">${esc(p.ingredienti)}</textarea>`)}
        ${fieldHTML("Categoria", `<select name="cat">${S.draft.categorie.map((c, i) => `<option value="${i}" ${i === ci ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select>`)}
      `)}
      ${panel("Prezzo", `
        ${switchHTML("multi", "Più formati o gusti", "Es. 33 cl / 66 cl, 5 / 10 pezzi, piccola / grande", multi)}
        <div id="single" ${multi ? "hidden" : ""}>${fieldHTML("Prezzo (€) *", `<input type="text" name="prezzo" inputmode="decimal" value="${moneyInput(p.prezzo)}" placeholder="Es. 6,50">`)}</div>
        <div id="multi" ${multi ? "" : "hidden"}>${rowsHTML(multi ? p.varianti : [{}, {}], "Es. Grande", "€")}</div>
        ${cat.opzioni && cat.opzioni.length ? `<p class="muted" style="font-size:.86rem">Extra della categoria: ${cat.opzioni.map((o) => `${esc(o.nome)} +${fmt(o.prezzo)}`).join(", ")}</p>` : ""}
      `)}
      ${panel("Sul sito", `
        ${switchHTML("attivo", "Visibile sul sito", "Spegnilo per nasconderlo senza cancellarlo.", p.attivo !== false)}
        ${switchHTML("disponibile", "Disponibile", "Se è finito, spegnilo: resta visibile ma non si può ordinare.", p.disponibile !== false)}
        ${switchHTML("evidenza", `${ic("star")} In evidenza`, "Compare in cima al sito (massimo 3 pizze) e con il badge nel menù.", p.evidenza === true)}
        <div class="field"><span class="field__label">Etichette</span>${chipsHTML("tag", TAGS, p.tag || [])}</div>
        <div class="field"><span class="field__label">Ordinabile solo in questi giorni <small>(nessuno = tutti i giorni)</small></span>${chipsHTML("giorni", DAYS, p.giorni || [])}</div>
      `)}
      ${panel("Allergeni", `<p class="muted" style="font-size:.86rem">Obbligatori per legge: seleziona quelli presenti.</p>${chipsHTML("allergeni", ALLERGENI.map((a) => [a, a]), p.allergeni || [])}`)}
      ${panel("Altre informazioni", `
        ${fieldHTML("Chiedi al cliente di scrivere qualcosa <small>(facoltativo)</small>", `<input type="text" name="richiesta" value="${esc(p.richiesta)}" placeholder="Es. Scrivi gli ingredienti che vuoi">`, "Se compilato, il cliente deve scriverlo prima di aggiungere il prodotto.")}
        ${fieldHTML("Testo in evidenza nella scheda <small>(facoltativo)</small>", `<textarea name="dettagli" rows="2">${esc(p.dettagli)}</textarea>`)}
      `)}
      ${isNew ? "" : `<div class="danger-zone">
        <button type="button" class="btn btn--light" id="dup">Duplica</button>
        <button type="button" class="btn btn--danger-ghost" id="del">Elimina prodotto</button>
      </div>`}`;

    openEditor(isNew ? "Nuovo prodotto" : p.nome, html, (root) => {
      const nome = $("[name=nome]", root).value.trim();
      if (!nome) { $("[name=nome]", root).setAttribute("aria-invalid", "true"); $("[name=nome]", root).focus(); toast("Scrivi il nome del prodotto.", true); return false; }
      const isMulti = $("[name=multi]", root).checked;
      let prezzo = null, varianti = [];
      if (isMulti) {
        varianti = readRows(root);
        if (!varianti.length || varianti.some((v) => !v.nome || !isPrice(v.prezzo))) { toast("Ogni formato deve avere nome e prezzo.", true); return false; }
      } else {
        prezzo = parseMoney($("[name=prezzo]", root).value);
        if (!isPrice(prezzo)) { $("[name=prezzo]", root).setAttribute("aria-invalid", "true"); $("[name=prezzo]", root).focus(); toast("Scrivi un prezzo valido, es. 6,50", true); return false; }
      }
      Object.assign(p, {
        nome, ingredienti: $("[name=ingredienti]", root).value.trim(), prezzo, varianti,
        attivo: $("[name=attivo]", root).checked, disponibile: $("[name=disponibile]", root).checked,
        tag: checked(root, "tag"), giorni: checked(root, "giorni").map(Number), allergeni: checked(root, "allergeni"),
        richiesta: $("[name=richiesta]", root).value.trim(), dettagli: $("[name=dettagli]", root).value.trim(),
        foto: holder.foto, evidenza: $("[name=evidenza]", root).checked
      });
      const others = S.draft.categorie.flatMap((c) => c.prodotti).filter((x) => x.evidenza && x.id !== p.id).length;
      if (p.evidenza && others >= 3) { toast("Ci sono già 3 pizze in evidenza: togline una prima.", true); return false; }
      const newCi = +$("[name=cat]", root).value;
      if (isNew) S.draft.categorie[newCi].prodotti.push(p);
      else if (newCi !== ci) { cat.prodotti.splice(pi, 1); S.draft.categorie[newCi].prodotti.push(p); }
      else cat.prodotti[pi] = p;
      S.open.add(S.draft.categorie[newCi].id);
      saveDraft(); renderMenu();
      toast(isNew ? `"${nome}" aggiunto` : "Modifiche salvate");
    }, (root) => {
      bindRows(root);
      bindPhoto(root, preview, holder);
      $("[name=multi]", root).addEventListener("change", (e) => { $("#single", root).hidden = e.target.checked; $("#multi", root).hidden = !e.target.checked; });
      $("[name=nome]", root).addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
      $("[name=prezzo]", root).addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
      if (isNew) setTimeout(() => $("[name=nome]", root).focus(), 50);
      const dup = $("#dup", root), del = $("#del", root);
      if (dup) dup.addEventListener("click", () => {
        const copy = clone(cat.prodotti[pi]); copy.id = uid(cat.id); copy.nome += " (copia)";
        cat.prodotti.splice(pi + 1, 0, copy); saveDraft(); renderMenu(); ed.close();
        toast("Prodotto duplicato"); editProduct(ci, pi + 1);
      });
      if (del) del.addEventListener("click", async () => {
        ed.close();
        if (await ask(`Eliminare "${p.nome}"?`, "Se vuoi solo toglierlo per un po', usa \"Visibile sul sito\" invece di eliminarlo.")) {
          cat.prodotti.splice(pi, 1);
          S.draft.sconti.forEach((x) => { x.prodotti = (x.prodotti || []).filter((id) => id !== p.id); });
          saveDraft(); renderMenu(); renderSconti(); toast("Prodotto eliminato");
        } else editProduct(ci, pi);
      });
    });
  }

  /* ---------- Categoria ---------- */
  function editCategory(ci) {
    const isNew = ci < 0;
    const c = isNew ? { id: uid("cat"), nome: "", tipo: "pizza", nota: "", attiva: true, opzioni: [], prodotti: [] } : S.draft.categorie[ci];
    const n = S.draft.categorie.length;
    const html = `
      ${panel("", `
        ${fieldHTML("Nome categoria *", `<input type="text" name="nome" value="${esc(c.nome)}" placeholder="Es. Pizze bianche" required>`)}
        ${fieldHTML("Nota sotto il titolo <small>(facoltativa)</small>", `<input type="text" name="nota" value="${esc(c.nota)}" placeholder="Es. Tutte le pizze anche con impasto integrale">`)}
        ${fieldHTML("Disegno per i prodotti senza foto", `<select name="tipo">${TIPI.map(([v, l]) => `<option value="${v}" ${c.tipo === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
        ${switchHTML("attiva", "Categoria visibile sul sito", "", c.attiva !== false)}
      `)}
      ${panel("Extra a pagamento", `<p class="muted" style="font-size:.86rem">Il cliente può aggiungerli a ogni prodotto di questa categoria. Es. "Nel ruoto" +2 €, "Impasto integrale" +1 €.</p>${rowsHTML(c.opzioni || [], "Es. Nel ruoto", "€")}`)}
      ${isNew ? "" : panel("Posizione nel menù", `<div class="btnrow" style="margin:0">
        <button type="button" class="btn btn--light" id="cat-up" ${ci === 0 ? "disabled" : ""}>↑ Sposta su</button>
        <button type="button" class="btn btn--light" id="cat-down" ${ci === n - 1 ? "disabled" : ""}>↓ Sposta giù</button></div>`)}
      ${isNew ? "" : `<div class="danger-zone"><button type="button" class="btn btn--danger-ghost" id="cat-del">Elimina categoria</button></div>`}`;
    const commit = (root) => {
      const nome = $("[name=nome]", root).value.trim();
      if (!nome) { $("[name=nome]", root).setAttribute("aria-invalid", "true"); toast("Scrivi il nome della categoria.", true); return false; }
      const opzioni = readRows(root);
      if (opzioni.some((o) => !o.nome || !isPrice(o.prezzo))) { toast("Ogni extra deve avere nome e prezzo.", true); return false; }
      Object.assign(c, { nome, nota: $("[name=nota]", root).value.trim(), tipo: $("[name=tipo]", root).value, attiva: $("[name=attiva]", root).checked, opzioni });
      if (isNew) { S.draft.categorie.push(c); S.open.add(c.id); }
      saveDraft(); renderMenu();
      return true;
    };
    openEditor(isNew ? "Nuova categoria" : c.nome, html, (root) => {
      if (commit(root) === false) return false;
      toast(isNew ? "Categoria creata" : "Modifiche salvate");
    }, (root) => {
      bindRows(root);
      if (isNew) setTimeout(() => $("[name=nome]", root).focus(), 50);
      const move = (d) => {
        if (commit(root) === false) return;
        const cats = S.draft.categorie; const j = ci + d;
        [cats[ci], cats[j]] = [cats[j], cats[ci]];
        saveDraft(); renderMenu(); ed.close(); toast("Categoria spostata");
      };
      const up = $("#cat-up", root), down = $("#cat-down", root), del = $("#cat-del", root);
      if (up) up.addEventListener("click", () => move(-1));
      if (down) down.addEventListener("click", () => move(1));
      if (del) del.addEventListener("click", async () => {
        ed.close();
        const cnt = c.prodotti.length;
        if (await ask(`Eliminare "${c.nome}"?`, cnt ? `Verranno eliminati anche i suoi ${cnt} prodotti. Per nasconderla e basta, spegni "Categoria visibile sul sito".` : "La categoria è vuota.")) {
          const gone = new Set(c.prodotti.map((p) => p.id));
          S.draft.categorie.splice(ci, 1);
          S.draft.sconti.forEach((x) => { x.categorie = (x.categorie || []).filter((id) => id !== c.id); x.prodotti = (x.prodotti || []).filter((id) => !gone.has(id)); });
          saveDraft(); renderMenu(); renderSconti(); toast("Categoria eliminata");
        } else editCategory(ci);
      });
    });
  }

  /* ---------- Offerta ---------- */
  function editPromo(i) {
    const isNew = i < 0;
    const o = isNew ? { id: uid("promo"), titolo: "", testo: "", prezzo: null, giorni: [], dal: "", al: "", attiva: true, dettagli: "", richiesta: "", foto: "" } : clone(S.draft.promo[i]);
    const holder = { foto: o.foto || "" };
    const html = `
      ${photoHTML(holder.foto, art({ nome: o.titolo, ingredienti: o.testo, dettagli: o.dettagli, prezzo: o.prezzo, tipo: "offerta" }))}
      ${panel("", `
        ${fieldHTML("Nome offerta *", `<input type="text" name="titolo" value="${esc(o.titolo)}" placeholder="Es. Menù famiglia" required>`)}
        ${fieldHTML("Cosa comprende", `<textarea name="testo" rows="2" placeholder="Es. 2 pizze classiche + patatine + bibita 1,5 L">${esc(o.testo)}</textarea>`)}
        ${fieldHTML("Prezzo (€) *", `<input type="text" name="prezzo" inputmode="decimal" value="${moneyInput(o.prezzo)}" placeholder="Es. 19,90">`)}
        ${switchHTML("attiva", "Offerta attiva", "", o.attiva !== false)}
      `)}
      ${panel("Quando vale", `
        <div class="field"><span class="field__label">Giorni della settimana <small>(nessuno = tutti i giorni)</small></span>${chipsHTML("giorni", DAYS, o.giorni || [])}</div>
        <div class="grid2">
          ${fieldHTML("Dal <small>(facoltativo)</small>", `<input type="date" name="dal" value="${esc(o.dal)}">`)}
          ${fieldHTML("Al <small>(facoltativo)</small>", `<input type="date" name="al" value="${esc(o.al)}">`)}
        </div>
        <p class="field__hint">Fuori da questo periodo l'offerta sparisce dal sito da sola.</p>
      `)}
      ${panel("Scelta del cliente", `
        ${fieldHTML("Chiedi al cliente di scrivere <small>(facoltativo)</small>", `<input type="text" name="richiesta" value="${esc(o.richiesta)}" placeholder="Es. Scrivi le pizze e la bibita">`)}
        ${fieldHTML("Dettagli in evidenza <small>(facoltativo)</small>", `<textarea name="dettagli" rows="3" placeholder="Es. Pizze a scelta tra: Margherita, Marinara, Diavola…">${esc(o.dettagli)}</textarea>`)}
      `)}
      ${isNew ? "" : `<div class="danger-zone">
        <button type="button" class="btn btn--light" id="dup">Duplica</button>
        <button type="button" class="btn btn--danger-ghost" id="del">Elimina offerta</button>
      </div>`}`;
    openEditor(isNew ? "Nuova offerta" : o.titolo, html, (root) => {
      const titolo = $("[name=titolo]", root).value.trim();
      const prezzo = parseMoney($("[name=prezzo]", root).value);
      if (!titolo) { $("[name=titolo]", root).setAttribute("aria-invalid", "true"); toast("Scrivi il nome dell'offerta.", true); return false; }
      if (!isPrice(prezzo)) { $("[name=prezzo]", root).setAttribute("aria-invalid", "true"); toast("Scrivi un prezzo valido.", true); return false; }
      const dal = $("[name=dal]", root).value, al = $("[name=al]", root).value;
      if (dal && al && al < dal) { toast("La data di fine è prima di quella di inizio.", true); return false; }
      Object.assign(o, {
        titolo, prezzo, dal, al, testo: $("[name=testo]", root).value.trim(), attiva: $("[name=attiva]", root).checked,
        giorni: checked(root, "giorni").map(Number), richiesta: $("[name=richiesta]", root).value.trim(),
        dettagli: $("[name=dettagli]", root).value.trim(), foto: holder.foto
      });
      if (isNew) S.draft.promo.push(o); else S.draft.promo[i] = o;
      saveDraft(); renderPromo(); toast(isNew ? "Offerta creata" : "Modifiche salvate");
    }, (root) => {
      bindPhoto(root, () => art({ nome: $("[name=titolo]", root).value, ingredienti: $("[name=testo]", root).value, prezzo: parseMoney($("[name=prezzo]", root).value), tipo: "offerta" }), holder);
      if (isNew) setTimeout(() => $("[name=titolo]", root).focus(), 50);
      const dup = $("#dup", root), del = $("#del", root);
      if (dup) dup.addEventListener("click", () => {
        const copy = clone(S.draft.promo[i]); copy.id = uid("promo"); copy.titolo += " (copia)"; copy.attiva = false;
        S.draft.promo.splice(i + 1, 0, copy); saveDraft(); renderPromo(); ed.close(); toast("Offerta duplicata (spenta)");
      });
      if (del) del.addEventListener("click", async () => {
        ed.close();
        if (await ask(`Eliminare "${o.titolo}"?`, "Per toglierla solo per un po', spegni l'interruttore \"Attiva\".")) {
          S.draft.promo.splice(i, 1); saveDraft(); renderPromo(); toast("Offerta eliminata");
        } else editPromo(i);
      });
    });
  }

  /* =========================================================
     PUBBLICAZIONE
     ========================================================= */
  let publishing = false;
  async function publish() {
    if (S.demo) return toast("In modalità prova non puoi pubblicare.", true);
    if (publishing || !isDirty()) return;
    publishing = true;
    const btns = [$("#publish"), $("#publish-2")];
    btns.forEach((b) => { b.disabled = true; b.textContent = "Pubblico…"; });
    try {
      const data = clone(S.draft);
      // 1) carica le foto nuove
      const items = [...data.categorie.flatMap((c) => c.prodotti), ...data.promo].filter((x) => x.foto && x.foto.startsWith("data:"));
      for (const [n, x] of items.entries()) {
        btns.forEach((b) => (b.textContent = `Foto ${n + 1}/${items.length}…`));
        const ext = x.foto.startsWith("data:image/webp") ? "webp" : "jpg";
        const path = `${UPLOAD_DIR}/${x.id}-${Date.now().toString(36)}.${ext}`;
        await putFile(path, x.foto.split(",")[1], `Foto: ${x.nome || x.titolo}`);
        x.foto = path;
      }
      // 2) salva il menù
      btns.forEach((b) => (b.textContent = "Pubblico…"));
      data.aggiornato = new Date().toISOString();
      let sha = S.base.sha;
      const send = (s) => putFile(DATA_PATH, b64encode(JSON.stringify(data, null, 1)), "Aggiornamento menù dal pannello admin", s);
      let res;
      try { res = await send(sha); }
      catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        const remote = await getRemote();
        if (!(await ask("Il menù online è cambiato", "Qualcuno ha pubblicato da un altro dispositivo. Vuoi sostituirlo con la tua versione?", "Sostituisci", false))) throw Object.assign(new Error("annullato"), { quiet: true });
        res = await send(remote && remote.sha);
      }
      S.base = { data: clone(data), sha: res.content.sha };
      S.draft = clone(data);
      saveDraft(); renderAll();
      toast("Pubblicato! Il sito si aggiorna entro 1-2 minuti.");
    } catch (e) {
      console.error(e);
      if (!e.quiet) toast(e.status === 401 ? "Codice di accesso scaduto: esci ed entra di nuovo." : "Pubblicazione non riuscita. Le modifiche restano salvate qui: riprova.", true);
    } finally {
      publishing = false;
      btns.forEach((b) => (b.textContent = b.id === "publish" ? "Pubblica" : "Pubblica modifiche"));
      updateStatus();
    }
  }
  $("#publish").addEventListener("click", publish);
  $("#publish-2").addEventListener("click", publish);
  $("#discard").addEventListener("click", async () => {
    if (!(await ask("Annullare le modifiche?", "Torni all'ultima versione pubblicata. Le modifiche non pubblicate andranno perse.", "Annulla modifiche", true, "No"))) return;
    S.draft = clone(S.base.data); saveDraft(); renderAll(); toast("Modifiche annullate");
  });

  /* ---------- Copia di sicurezza ---------- */
  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S.draft, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `menu-pallone-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#import").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || !Array.isArray(d.categorie)) throw new Error("formato");
      if (!(await ask("Ripristinare questa copia?", "Sostituisce il menù in modifica. Dopo potrai controllare e pubblicare.", "Ripristina", false))) return;
      normalize(d); S.draft = d; saveDraft(); renderAll(); toast("Copia ripristinata: controlla e pubblica");
    } catch { toast("Questo file non è una copia valida del menù.", true); }
  });

  /* ---------- QR code ---------- */
  const siteUrl = () => store.get(K.site, "") || (S.gh ? `https://${S.gh.owner.toLowerCase()}.github.io/${S.gh.repo}/` : location.href.replace(/admin\.html.*$/, ""));
  function renderQR() {
    const input = $("#site-url");
    if (!input.value) input.value = siteUrl();
    const box = $("#qr"); box.innerHTML = "";
    if (!window.QRCode) { box.textContent = "QR non disponibile senza connessione."; return; }
    new window.QRCode(box, { text: input.value, width: 400, height: 400, colorDark: "#0b4d2c", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
  }
  $("#site-url").addEventListener("change", (e) => { store.set(K.site, e.target.value.trim()); renderQR(); });
  $("#qr-download").addEventListener("click", () => {
    const cv = $("#qr canvas"); if (!cv) return;
    const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "qr-menu-pizzeria-pallone.png"; a.click();
  });

  // avvisa prima di chiudere con modifiche non pubblicate
  addEventListener("beforeunload", (e) => { if (!S.demo && isDirty()) { e.preventDefault(); e.returnValue = ""; } });

  boot();
})();
