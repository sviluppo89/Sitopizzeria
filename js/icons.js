/* =========================================================
   Icone di Pizzeria Pallone
   Un solo stile per tutto il sito e la pagina admin:
   linee da 1.9 px, angoli arrotondati, colore = colore del testo.
   Uso in HTML:  <i data-icon="phone"></i>
   Uso in JS:    PallonIcons.svg("phone")
   ========================================================= */
(function () {
  "use strict";
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    scooter: '<circle cx="6" cy="17.5" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M8.5 17.5H15l-2.2-7.5H10"/><path d="M14.5 10H17l2.4 5.6"/><path d="M3 10.5h6v3.5H4.2z"/>',
    phone: '<path d="M5.2 3.8h3.1l1.8 4.6-2.3 1.4a11.5 11.5 0 0 0 6.4 6.4l1.4-2.3 4.6 1.8v3.1a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 3.2 6a2 2 0 0 1 2-2.2z"/>',
    whatsapp: '<path d="M3.6 20.4 5 16.3A8.6 8.6 0 1 1 8 19.3z"/><path d="M9.2 8.6c-.1 2.9 2.9 6 6 6.1l.9-1.5-2-1-.9.7a5 5 0 0 1-2.4-2.4l.7-.9-1-2z"/>',
    pin: '<path d="M12 21s-6.8-6-6.8-11.3a6.8 6.8 0 0 1 13.6 0C18.8 15 12 21 12 21z"/><circle cx="12" cy="9.7" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle class="f" cx="17.2" cy="6.8" r="1"/>',
    facebook: '<path d="M14 20.5v-7.8h2.8l.5-3.3H14V7.6c0-.9.5-1.6 1.6-1.6h1.8V3.2a20 20 0 0 0-2.7-.2c-2.6 0-4.3 1.6-4.3 4.5v1.9H7.6v3.3h2.8v7.8"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle class="f" cx="4.5" cy="6.5" r="1.2"/><circle class="f" cx="4.5" cy="12" r="1.2"/><circle class="f" cx="4.5" cy="17.5" r="1.2"/>',
    tag: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.6"/>',
    store: '<path d="M4 9.2 5.6 4h12.8L20 9.2"/><path d="M4 9.2a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.2 11.5V20h13.6v-8.5"/><path d="M10 20v-4.6h4V20"/>',
    more: '<circle class="f" cx="5.5" cy="12" r="1.5"/><circle class="f" cx="12" cy="12" r="1.5"/><circle class="f" cx="18.5" cy="12" r="1.5"/>',
    chili: '<path d="M9.5 8.2c4.4-.8 9 1.6 9.5 6.3.6 5-5.6 7.8-11.4 5.5-1.4-.5-2.4-1.3-2.6-2 4.2.2 6.8-2.6 5.6-6.6z"/><path d="M9.5 8.2C9 6.2 9.9 4.6 12 3.6"/>',
    leaf: '<path d="M5 19.5C4.6 11 10 4.8 20 4.5c.2 9.6-5.5 15.2-14.2 15.2"/><path d="M5 19.5 13.5 11"/>',
    sparkle: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9z"/><path d="M19 3.5v3M17.5 5h3"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M7.5 3.5v2.2a4.5 4.5 0 0 0 9 0V3.5"/><path d="M7.5 20.5v-2.2a4.5 4.5 0 0 1 9 0v2.2"/>',
    pencil: '<path d="M4 20l1.1-4.3L15.8 5a2.1 2.1 0 0 1 3 3L8.3 18.8z"/><path d="m14.2 6.6 3.2 3.2"/>',
    note: '<path d="M6 3.5h8.5l3.5 3.5v13.5H6z"/><path d="M14 3.5V7.5h4"/><path d="M9 12.5h6M9 16.5h4"/>',
    check: '<path d="m5 12.5 4.3 4.3L19 7.2"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.3 2.6 2.6 5-5.3"/>',
    dot: '<circle class="f" cx="12" cy="12" r="4"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="m6.3 7 .9 13h9.6l.9-13"/><path d="M10 11v5.5M14 11v5.5"/>',
    chev: '<path d="m9.5 6 6 6-6 6"/>',
    fries: '<path d="M6 10h12l-1.6 10.5H7.6z"/><path d="M8 10 7 4.5M10.5 10 10 3.5M13.5 10l.5-6.5M16 10l1-5.5"/>',
    cup: '<path d="M6.5 7.5h11l-1.3 13H7.8z"/><path d="M12 7.5 13.5 3h3"/><path d="M7 12h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    checkMini: '<path d="m6 12.5 4 4L18 8"/>',
    pizza: '<path d="M12 21 3.5 6.3a17 17 0 0 1 17 0z"/><path d="M4.8 8.6a15 15 0 0 1 14.4 0"/><circle class="f" cx="10.3" cy="11.3" r="1.2"/><circle class="f" cx="13.8" cy="13.6" r="1.1"/><circle class="f" cx="12" cy="16.7" r=".9"/>'
  };
  function svg(name, cls) {
    const body = P[name]; if (!body) return "";
    return `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  }
  function fill(root) {
    (root || document).querySelectorAll("i[data-icon]").forEach((el) => {
      el.outerHTML = svg(el.dataset.icon, el.className);
    });
  }
  window.PallonIcons = { svg, fill };
  fill();
})();
