/* GOAT v2 — shared data + helpers for the interaction studies.
   Exposes window.GOAT = { list, items, cover(), nav(), toast(), byId() }.
   Every study ranks the same list so the metaphors can be compared fairly. */
(function () {
  const list = {
    title: "The Greatest RPGs Ever Made",
    curator: "you",
    size: 10,
    topic: "Video games · Role-playing",
  };

  // hue pair + motif drive the generative cover (stand-in for AI/API art).
  // traits feed the Taste DNA prototype later; note = sample curator write-up.
  const items = [
    { id: "w3",   title: "The Witcher 3",          year: 2015, by: "CD Projekt Red",   h: [150, 35],  motif: "moon",  traits: ["narrative", "open-world", "dark"],       note: "Side quests written better than most games' main plots." },
    { id: "er",   title: "Elden Ring",             year: 2022, by: "FromSoftware",     h: [42, 20],   motif: "sun",   traits: ["open-world", "challenge", "mythic"],     note: "Wonder per minute, unmatched. Every horizon is a promise kept." },
    { id: "bg3",  title: "Baldur's Gate 3",        year: 2023, by: "Larian Studios",   h: [345, 280], motif: "shard", traits: ["tactical", "narrative", "reactive"],      note: "The game that says yes to every stupid idea you have." },
    { id: "de",   title: "Disco Elysium",          year: 2019, by: "ZA/UM",            h: [12, 190],  motif: "slash", traits: ["narrative", "literary", "melancholic"],   note: "A novel that argues with you. Your own skills heckle you." },
    { id: "me2",  title: "Mass Effect 2",          year: 2010, by: "BioWare",          h: [205, 20],  motif: "rings", traits: ["narrative", "cinematic", "companions"],   note: "The suicide mission is still the best final act in games." },
    { id: "p5r",  title: "Persona 5 Royal",        year: 2020, by: "Atlus",            h: [355, 0],   motif: "slash", traits: ["style", "turn-based", "social"],         note: "Pure style. Even the menus have swagger." },
    { id: "ct",   title: "Chrono Trigger",         year: 1995, by: "Square",           h: [210, 48],  motif: "rings", traits: ["classic", "turn-based", "time"],         note: "No filler, thirteen endings, perfect pacing." },
    { id: "ff7",  title: "Final Fantasy VII",      year: 1997, by: "Square",           h: [130, 200], motif: "grid",  traits: ["classic", "cinematic", "melancholic"],   note: "" },
    { id: "pst",  title: "Planescape: Torment",    year: 1999, by: "Black Isle",       h: [28, 300],  motif: "shard", traits: ["literary", "narrative", "strange"],      note: "" },
    { id: "ds",   title: "Dark Souls",             year: 2011, by: "FromSoftware",     h: [24, 220],  motif: "sun",   traits: ["challenge", "dark", "mythic"],           note: "" },
    { id: "fnv",  title: "Fallout: New Vegas",     year: 2010, by: "Obsidian",         h: [36, 15],   motif: "grid",  traits: ["reactive", "open-world", "satire"],      note: "" },
    { id: "bb",   title: "Bloodborne",             year: 2015, by: "FromSoftware",     h: [0, 250],   motif: "moon",  traits: ["challenge", "dark", "gothic"],           note: "" },
    { id: "dos2", title: "Divinity: Original Sin 2", year: 2017, by: "Larian Studios", h: [270, 175], motif: "rings", traits: ["tactical", "reactive", "co-op"],         note: "" },
    { id: "sky",  title: "Skyrim",                 year: 2011, by: "Bethesda",         h: [200, 215], motif: "shard", traits: ["open-world", "freedom", "mythic"],       note: "" },
    { id: "dq11", title: "Dragon Quest XI",        year: 2017, by: "Square Enix",      h: [195, 50],  motif: "sun",   traits: ["classic", "turn-based", "warm"],         note: "" },
    { id: "hk",   title: "Hollow Knight",          year: 2017, by: "Team Cherry",      h: [220, 190], motif: "moon",  traits: ["challenge", "melancholic", "handmade"],  note: "" },
  ];

  const byId = (id) => items.find((i) => i.id === id);

  /** Build a generative cover element. opts: { meta: bool, title: bool } */
  function cover(item, opts = {}) {
    const el = document.createElement("div");
    el.className = "cover";
    el.dataset.motif = item.motif;
    el.style.setProperty("--h1", item.h[0]);
    el.style.setProperty("--h2", item.h[1]);
    if (opts.meta !== false) {
      const m = document.createElement("span");
      m.className = "c-meta";
      m.textContent = item.year;
      el.appendChild(m);
    }
    if (opts.title !== false) {
      const t = document.createElement("span");
      t.className = "c-title";
      t.textContent = item.title;
      el.appendChild(t);
    }
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${item.title} cover`);
    return el;
  }

  /** Item's signature colour, for glows and ambient backdrops. */
  const glow = (item, a = 0.55) => `hsl(${item.h[1]} 85% 60% / ${a})`;

  const STUDIES = [
    { href: "index.html",  label: "Overview" },
    { href: "spread.html", label: "Editorial spread", n: "A" },
    { href: "canvas.html", label: "Infinite canvas",  n: "B" },
    { href: "shelf.html",  label: "Collector's shelf", n: "C" },
    { href: "stage.html",  label: "Stage",            n: "D" },
    { href: "dna.html",    label: "Taste DNA",        n: "E" },
    { href: "modes.html",  label: "One list, four modes", n: "F" },
  ];

  /** Render the shared top nav into the first element matching selector. */
  function nav(current, selector = "#study-nav") {
    const host = document.querySelector(selector);
    if (!host) return;
    host.className = "study-nav";
    host.innerHTML =
      `<a class="brand" href="index.html">G.O.A.T.<small>v2 studies</small></a><ul>` +
      STUDIES.map((s) =>
        `<li><a class="tab" href="${s.href}"${s.href === current ? ' aria-current="page"' : ""}>` +
        `${s.n ? `<span class="n">${s.n}</span>` : ""}${s.label}</a></li>`
      ).join("") + `</ul>`;
  }

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.GOAT = { list, items, byId, cover, glow, nav, toast, reducedMotion, STUDIES };
})();
