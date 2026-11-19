// Leonida Trophy Tracker — offline PS5 trophy guide for Grand Theft Auto VI.
// Data lives in data/trophies.json beside this file. No network calls beyond
// loading that local file; ticks are stored in localStorage on this device.
const STORE_KEY = "leonida-trophy-tracker-v2";
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_LABEL = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
const CATEGORY_LABEL = {
  story: "Story",
  "side-stories": "Side stories",
  collectibles: "Collectibles",
  activities: "Activities",
  crime: "Crime",
  money: "Money & property",
  misc: "Miscellaneous",
  completion: "Completion"
};

const els = {
  heroStats: document.getElementById("hero-stats"),
  progressLine: document.getElementById("progress-line"),
  overallBar: document.getElementById("overall-bar"),
  overallFill: document.getElementById("overall-fill"),
  gradeGrid: document.getElementById("grade-grid"),
  roadmapGrid: document.getElementById("roadmap-grid"),
  search: document.getElementById("search"),
  gradeSelect: document.getElementById("grade-select"),
  sortSelect: document.getElementById("sort-select"),
  spoilerBtn: document.getElementById("spoiler-btn"),
  chips: document.getElementById("chips"),
  countLine: document.getElementById("count-line"),
  list: document.getElementById("trophies"),
  empty: document.getElementById("empty-state"),
  hero: document.getElementById("guide-hero"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  resetBtn: document.getElementById("reset-btn"),
  expandBtn: document.getElementById("expand-btn"),
  collapseBtn: document.getElementById("collapse-btn"),
  saveNote: document.getElementById("save-note")
};

const params = new URLSearchParams(window.location.search);
const shot = params.get("shot") || "";
const shotId = Number(params.get("id") || "28");

let docData = null;
let earned = new Set();
let spoilerOn = false;
let activeFilter = "all"; // all | category value | missable | hidden | earned | remaining | stage-N
let shotMode = shot !== "";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      earned = new Set(parsed.filter((n) => Number.isInteger(n)));
    } else if (parsed && Array.isArray(parsed.earned)) {
      earned = new Set(parsed.earned.filter((n) => Number.isInteger(n)));
      spoilerOn = Boolean(parsed.spoiler);
    }
  } catch (err) {
    earned = new Set();
  }
}

function saveStore() {
  if (shotMode) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), spoiler: spoilerOn }));
  } catch (err) {
    els.saveNote.textContent = "Saving is unavailable in this browser session. Export your progress to keep it.";
  }
}

function applyShotPreset() {
  if (!shotMode) return;
  document.body.classList.add("shot-" + shot);
  if (shot === "cover") {
    earned = new Set([2, 3, 8, 20, 21, 28, 35, 42, 46, 4, 9, 15, 25, 48]);
    spoilerOn = false;
    activeFilter = "all";
    els.sortSelect.value = "roadmap";
  } else if (shot === "guide") {
    earned = new Set([2, 3, 8, 20, 21]);
    spoilerOn = false;
    activeFilter = "all";
    els.search.value = "";
  } else if (shot === "roadmap") {
    earned = new Set([2, 3, 8, 20, 21, 28, 4, 9, 46, 35, 42, 19, 32, 48, 5, 10, 11, 12, 13, 6, 7]);
    spoilerOn = false;
    activeFilter = "all";
  } else if (shot === "missable") {
    earned = new Set([2, 3, 8, 20, 21]);
    spoilerOn = false;
    activeFilter = "missable";
  }
  els.saveNote.textContent = "Preview mode: example progress is shown and nothing is saved.";
}

function stageTitle(stage) {
  const found = (docData.roadmap || []).find((r) => r.stage === stage);
  return found ? found.title : "Stage " + stage;
}

function isMasked(t) {
  return spoilerOn && t.hidden && !earned.has(t.id);
}

function searchableText(t) {
  if (isMasked(t)) {
    return ["hidden trophy", t.grade, t.category, "stage " + t.stage].join(" ").toLowerCase();
  }
  return [t.name, t.description, t.guide, t.target, t.window, t.category, t.grade, stageTitle(t.stage), (t.sources || []).join(" "), t.hidden ? "hidden secret psn" : "visible", t.missable ? "missable" : ""]
    .join(" ")
    .toLowerCase();
}

function matchesFilter(t) {
  if (activeFilter === "all") return true;
  if (activeFilter === "missable") return Boolean(t.missable);
  if (activeFilter === "hidden") return Boolean(t.hidden);
  if (activeFilter === "earned") return earned.has(t.id);
  if (activeFilter === "remaining") return !earned.has(t.id);
  if (activeFilter.startsWith("stage-")) return t.stage === Number(activeFilter.slice(6));
  return t.category === activeFilter;
}

function visibleTrophies() {
  const q = els.search.value.trim().toLowerCase();
  const grade = els.gradeSelect.value;
  let rows = docData.trophies.filter((t) => {
    if (!matchesFilter(t)) return false;
    if (grade !== "all" && t.grade !== grade) return false;
    if (q && !searchableText(t).includes(q)) return false;
    return true;
  });
  const sort = els.sortSelect.value;
  rows.sort((a, b) => {
    if (sort === "grade") return GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.stage - b.stage || a.id - b.id;
    if (sort === "name") {
      const an = isMasked(a) ? "Hidden trophy" : a.name;
      const bn = isMasked(b) ? "Hidden trophy" : b.name;
      return an.localeCompare(bn) || a.id - b.id;
    }
    if (sort === "remaining") {
      const ae = earned.has(a.id) ? 1 : 0;
      const be = earned.has(b.id) ? 1 : 0;
      return ae - be || a.stage - b.stage || a.id - b.id;
    }
    return a.stage - b.stage || a.id - b.id;
  });
  return rows;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badge(text, className) {
  return el("span", "badge " + className, text);
}

function renderHeroStats() {
  const total = docData.trophies.length;
  const hiddenCount = docData.trophies.filter((t) => t.hidden).length;
  const missableCount = docData.trophies.filter((t) => t.missable).length;
  els.heroStats.replaceChildren();
  const pills = [
    ["55", " trophies total"],
    [String(hiddenCount), " hidden on PSN"],
    [String(missableCount) + " potentially", " missable"],
    ["6", " roadmap stages"],
    ["0", " online trophies"]
  ];
  for (const [strong, rest] of pills) {
    const pill = el("span", "stat-pill");
    pill.append(el("strong", "", strong), document.createTextNode(rest));
    els.heroStats.append(pill);
  }
  void total;
}

function renderProgress() {
  const total = docData.trophies.length;
  const got = earned.size;
  const pct = total === 0 ? 0 : Math.round((got / total) * 100);
  els.progressLine.textContent = got + " of " + total + " earned — " + pct + "% of the Platinum set. " + (total - got) + " to go.";
  els.overallFill.style.width = pct + "%";
  els.overallBar.setAttribute("aria-valuenow", String(pct));
  els.gradeGrid.replaceChildren();
  for (const grade of ["platinum", "gold", "silver", "bronze"]) {
    const all = docData.trophies.filter((t) => t.grade === grade);
    const have = all.filter((t) => earned.has(t.id)).length;
    const box = el("div", "grade-box g-" + grade);
    box.append(el("div", "g-name", GRADE_LABEL[grade]));
    box.append(el("div", "g-count", have + " / " + all.length));
    box.append(el("div", "muted small", all.length === 0 ? "" : Math.round((have / all.length) * 100) + "% complete"));
    const bar = el("div", "g-bar");
    const fill = el("div", "g-fill");
    fill.style.width = (all.length === 0 ? 0 : Math.round((have / all.length) * 100)) + "%";
    bar.append(fill);
    box.append(bar);
    els.gradeGrid.append(box);
  }
}

function renderRoadmap() {
  els.roadmapGrid.replaceChildren();
  for (const stage of docData.roadmap || []) {
    const inStage = docData.trophies.filter((t) => t.stage === stage.stage);
    const have = inStage.filter((t) => earned.has(t.id)).length;
    const card = el("article", "stage-card");
    card.append(el("span", "stage-no", "Stage " + stage.stage));
    card.append(el("h3", "", stage.title));
    card.append(el("p", "", stage.focus));
    card.append(el("p", "stage-window", stage.window));
    card.append(el("p", "stage-counts", stage.counts));
    const names = inStage.map((t) => (isMasked(t) ? "Hidden trophy" : t.name)).join(" · ");
    card.append(el("p", "small", "In this stage: " + names));
    card.append(el("div", "stage-progress", have + " of " + inStage.length + " earned in this stage"));
    const btn = el("button", "btn btn-ghost", "Show Stage " + stage.stage + " trophies");
    btn.type = "button";
    btn.addEventListener("click", () => {
      activeFilter = "stage-" + stage.stage;
      renderChips();
      renderList();
      document.getElementById("trophies-title").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    card.append(btn);
    els.roadmapGrid.append(card);
  }
}

function chipDefs() {
  const byCat = (cat) => docData.trophies.filter((t) => t.category === cat).length;
  return [
    ["all", "All", docData.trophies.length],
    ["story", "Story", byCat("story")],
    ["missable", "Missable", docData.trophies.filter((t) => t.missable).length],
    ["collectibles", "Collectibles", byCat("collectibles")],
    ["activities", "Activities", byCat("activities")],
    ["side-stories", "Side stories", byCat("side-stories")],
    ["crime", "Crime", byCat("crime")],
    ["money", "Money & property", byCat("money")],
    ["hidden", "Hidden on PSN", docData.trophies.filter((t) => t.hidden).length],
    ["earned", "Earned", earned.size],
    ["remaining", "Remaining", docData.trophies.length - earned.size]
  ];
}

function renderChips() {
  els.chips.replaceChildren();
  for (const [value, label, count] of chipDefs()) {
    const btn = el("button", "chip");
    btn.type = "button";
    btn.setAttribute("aria-pressed", activeFilter === value ? "true" : "false");
    btn.append(document.createTextNode(label + " "));
    btn.append(el("span", "chip-count", "(" + count + ")"));
    btn.addEventListener("click", () => {
      activeFilter = value;
      renderChips();
      renderList();
    });
    els.chips.append(btn);
  }
  if (activeFilter.startsWith("stage-")) {
    const note = el("span", "badge badge-target", "Stage filter active — pick All to clear");
    els.chips.append(note);
  }
}

function sourcesBlock(t) {
  const wrap = el("div", "sources");
  const head = el("div", "");
  head.append(el("strong", "", "Sources: "));
  head.append(document.createTextNode("guide steps above follow these references. Open the named guide for maps and full checklists."));
  wrap.append(head);
  const ul = el("ul", "");
  for (const s of t.sources || []) ul.append(el("li", "", s));
  wrap.append(ul);
  return wrap;
}

function trophyCard(t, forceOpen) {
  const masked = isMasked(t);
  const isEarned = earned.has(t.id);
  const card = el("article", "trophy" + (isEarned ? " earned" : "") + (t.missable ? " missable-card" : ""));
  card.id = "trophy-" + t.id;
  const top = el("div", "t-top");
  const checkWrap = el("div", "t-check");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = isEarned;
  box.id = "earned-" + t.id;
  box.setAttribute("aria-label", "Mark earned: " + (masked ? "hidden trophy" : t.name));
  box.addEventListener("change", () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    saveStore();
    renderAll();
  });
  checkWrap.append(box);
  const label = el("label", "visually-hidden", "Earned");
  label.htmlFor = "earned-" + t.id;
  checkWrap.append(label);
  top.append(checkWrap);

  const main = el("div", "t-main");
  main.append(el("h3", "t-title", masked ? "Hidden trophy" : t.name));
  main.append(el("p", "t-desc", masked ? "Hidden on PSN until earned. Tick Earned to reveal the name, description and guide." : t.description));

  const meta = el("div", "t-meta");
  meta.append(badge(GRADE_LABEL[t.grade], "badge-grade-" + t.grade));
  if (t.hidden) meta.append(badge("Hidden on PSN", "badge-hidden"));
  if (t.missable) meta.append(badge("Missable — read window", "badge-missable"));
  if (isEarned) meta.append(badge("Earned", "badge-earned"));
  meta.append(badge("Stage " + t.stage, ""));
  meta.append(badge(CATEGORY_LABEL[t.category] || t.category, ""));
  if (!masked && t.target) meta.append(badge("Target: " + t.target, "badge-target"));
  main.append(meta);

  if (!masked && t.window) {
    const isWarn = t.missable || /MISSABLE|PERMANENT|TIME-SENSITIVE|Only|Needs|Do not/i.test(t.window);
    main.append(el("p", "t-window" + (isWarn ? "" : " plain"), t.window));
  }
  top.append(main);
  card.append(top);

  const details = el("details", "guide");
  if (forceOpen) details.open = true;
  const summary = el("summary", "", masked ? "Guide hidden by spoiler shield" : "Guide — steps and Sources");
  details.append(summary);
  const body = el("div", "guide-body");
  if (masked) {
    body.append(el("p", "", "Turn the spoiler shield off, or tick this trophy earned, to read its guide. The shield mirrors the PSN list, where hidden trophies stay blank until earned."));
  } else {
    body.append(el("p", "", t.guide));
    body.append(sourcesBlock(t));
  }
  details.append(body);
  card.append(details);
  return card;
}

function renderGuideHero() {
  if (shot !== "guide") {
    els.hero.hidden = true;
    els.hero.replaceChildren();
    return;
  }
  const t = docData.trophies.find((x) => x.id === shotId) || docData.trophies[27];
  els.hero.hidden = false;
  els.hero.replaceChildren();
  els.hero.append(el("p", "hero-kicker", "Guide spotlight — Stage " + t.stage + " · " + (CATEGORY_LABEL[t.category] || t.category)));
  const title = el("h2", "", t.name);
  title.id = "guide-hero-title";
  els.hero.append(title);
  els.hero.append(el("p", "hero-desc", t.description));
  const meta = el("div", "t-meta");
  meta.append(badge(GRADE_LABEL[t.grade], "badge-grade-" + t.grade));
  if (t.hidden) meta.append(badge("Hidden on PSN", "badge-hidden"));
  if (t.missable) meta.append(badge("Missable — read window", "badge-missable"));
  meta.append(badge("Target: " + t.target, "badge-target"));
  meta.append(badge("Stage " + t.stage + " of 6", ""));
  els.hero.append(meta);
  els.hero.append(el("p", "t-window", t.window));
  els.hero.append(el("p", "hero-guide", t.guide));
  els.hero.append(sourcesBlock(t));
  const note = el("p", "muted small", "Every one of the 55 trophies in the list below has a guide and Sources line in this same format. Use search and filters to jump to any trophy.");
  els.hero.append(note);
}

function renderList() {
  const rows = visibleTrophies();
  els.list.replaceChildren();
  if (activeFilter === "missable") {
    const explainer = el("div", "callout callout-warn");
    explainer.append(el("strong", "", "Only one potentially missable trophy. "));
    explainer.append(document.createTextNode("Positive Mental Attitude below is the sole trophy launch-week sources flag as possibly missable, because Lucia's Chapter 1 balcony meditation disappears after Chapter 1. Its guide gives the exact morning, place and accept prompt, plus the partner rule for the remaining spots. Race Against Yago (time-sensitive) and the Irredeemable Criminal Profile (permanent) are warnings on their own cards — they are not missable trophies and are not hidden in this filter to inflate the count."));
    els.list.append(explainer);
  }
  for (const t of rows) {
    const forceOpen = (shot === "guide" && t.id === shotId) || (shot === "missable" && Boolean(t.missable));
    els.list.append(trophyCard(t, forceOpen));
  }
  els.empty.hidden = rows.length !== 0;
  const filterName = activeFilter === "all" ? "all trophies" : activeFilter.replace("-", " ");
  els.countLine.textContent = "Showing " + rows.length + " of " + docData.trophies.length + " trophies (" + filterName + "). " + earned.size + " earned so far.";
}

function renderSpoilerBtn() {
  els.spoilerBtn.setAttribute("aria-pressed", spoilerOn ? "true" : "false");
  els.spoilerBtn.textContent = spoilerOn ? "Hide hidden trophies: On" : "Hide hidden trophies: Off";
}

function renderAll() {
  renderHeroStats();
  renderProgress();
  renderRoadmap();
  renderChips();
  renderSpoilerBtn();
  renderGuideHero();
  renderList();
}

function downloadExport() {
  const payload = {
    app: "Leonida Trophy Tracker",
    game: "Grand Theft Auto VI",
    platform: "PlayStation 5",
    version: 2,
    earned: [...earned].sort((a, b) => a - b),
    spoiler: spoilerOn
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leonida-trophy-progress.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleImport(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    let ids = [];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (Number.isInteger(item)) ids.push(item);
        else if (typeof item === "string") {
          const found = docData.trophies.find((t) => t.name === item);
          if (found) ids.push(found.id);
        }
      }
    } else if (parsed && Array.isArray(parsed.earned)) {
      ids = parsed.earned.filter((n) => Number.isInteger(n));
      if (typeof parsed.spoiler === "boolean") spoilerOn = parsed.spoiler;
    } else {
      throw new Error("bad format");
    }
    const valid = new Set(docData.trophies.map((t) => t.id));
    earned = new Set(ids.filter((id) => valid.has(id)));
    saveStore();
    renderAll();
    els.saveNote.textContent = "Imported " + earned.size + " earned trophies.";
  } catch (err) {
    els.saveNote.textContent = "Import failed: that file is not a trophy progress JSON this tracker recognises.";
  }
}

function bindControls() {
  els.search.addEventListener("input", renderList);
  els.gradeSelect.addEventListener("change", renderList);
  els.sortSelect.addEventListener("change", renderList);
  els.spoilerBtn.addEventListener("click", () => {
    spoilerOn = !spoilerOn;
    saveStore();
    renderAll();
  });
  els.exportBtn.addEventListener("click", downloadExport);
  els.importFile.addEventListener("change", (e) => handleImport(e.target.files[0]));
  els.resetBtn.addEventListener("click", () => {
    if (window.confirm("Clear all earned ticks on this device? Export first if you want a backup.")) {
      earned = new Set();
      saveStore();
      renderAll();
    }
  });
  els.expandBtn.addEventListener("click", () => {
    document.querySelectorAll("details.guide").forEach((d) => { d.open = true; });
  });
  els.collapseBtn.addEventListener("click", () => {
    document.querySelectorAll("details.guide").forEach((d) => { d.open = false; });
  });
}

async function init() {
  loadStore();
  try {
    const res = await fetch("data/trophies.json");
    if (!res.ok) throw new Error("load failed");
    docData = await res.json();
  } catch (err) {
    els.progressLine.textContent = "Could not load data/trophies.json. Open this page through a local server or a browser that allows local file access, then reload.";
    els.countLine.textContent = "Trophy data failed to load.";
    return;
  }
  applyShotPreset();
  bindControls();
  renderAll();
  if (shot === "guide") {
    els.hero.scrollIntoView({ block: "start" });
  } else if (shot === "roadmap") {
    document.getElementById("roadmap-title").scrollIntoView({ block: "start" });
  } else if (shot === "missable") {
    document.getElementById("controls-title").scrollIntoView({ block: "start" });
  }
}

init();
