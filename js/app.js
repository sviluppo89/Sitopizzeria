(function () {
  "use strict";

  const TAGS = {
    vegetariana: "Vegetariana",
    piccante: "Piccante",
    consigliata: "Consigliata",
    novita: "Novità"
  };

  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const listEl = document.getElementById("menu-list");
  const catsEl = document.getElementById("cats");
  const searchEl = document.getElementById("search");
  const emptyEl = document.getElementById("empty");

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // --- Render categorie e piatti ---
  catsEl.innerHTML = MENU.map((c) => `<a class="cat" href="#cat-${esc(c.id)}" data-id="${esc(c.id)}">${esc(c.nome)}</a>`).join("");

  listEl.innerHTML = MENU.map((c) => `
    <section class="cat-section" id="cat-${esc(c.id)}" data-id="${esc(c.id)}">
      <h3 class="cat-section__title">${esc(c.nome)}</h3>
      ${c.nota ? `<p class="cat-section__note">${esc(c.nota)}</p>` : ""}
      <ul class="items">
        ${c.piatti.map((p) => `
          <li class="item" data-search="${esc(norm(p.nome + " " + (p.ingredienti || "")))}">
            <div class="item__main">
              <h4 class="item__name">${esc(p.nome)}</h4>
              ${p.ingredienti ? `<p class="item__desc">${esc(p.ingredienti)}</p>` : ""}
              ${(p.tag || []).length ? `<div class="item__tags">${p.tag.map((t) => `<span class="tag tag--${esc(t)}">${esc(TAGS[t] || t)}</span>`).join("")}</div>` : ""}
            </div>
            <span class="item__price">${euro.format(p.prezzo)}</span>
          </li>`).join("")}
      </ul>
    </section>`).join("");

  if (typeof AGGIUNTE !== "undefined" && AGGIUNTE.length) {
    document.getElementById("extras-list").innerHTML = AGGIUNTE.map((a) => `<li>${esc(a)}</li>`).join("");
    document.getElementById("extras").hidden = false;
  }

  // --- Ricerca ---
  searchEl.addEventListener("input", () => {
    const q = norm(searchEl.value.trim());
    let total = 0;
    document.querySelectorAll(".cat-section").forEach((sec) => {
      let n = 0;
      sec.querySelectorAll(".item").forEach((it) => {
        const ok = !q || it.dataset.search.includes(q);
        it.hidden = !ok;
        if (ok) n++;
      });
      sec.hidden = n === 0;
      total += n;
    });
    emptyEl.hidden = total > 0;
  });

  // --- Categoria attiva durante lo scroll ---
  const links = [...catsEl.querySelectorAll(".cat")];
  const setActive = (id) => {
    links.forEach((l) => {
      const on = l.dataset.id === id;
      l.classList.toggle("is-active", on);
      if (on) {
        l.setAttribute("aria-current", "true");
        const track = catsEl;
        track.scrollTo({ left: l.offsetLeft - track.clientWidth / 2 + l.clientWidth / 2, behavior: "smooth" });
      } else {
        l.removeAttribute("aria-current");
      }
    });
  };

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.dataset.id); });
    }, { rootMargin: "-140px 0px -60% 0px" });
    document.querySelectorAll(".cat-section").forEach((s) => obs.observe(s));
  }
  if (links[0]) links[0].classList.add("is-active");
})();
