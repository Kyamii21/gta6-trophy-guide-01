// Leonida Trophy Tracker: checklist of all 55 GTA VI trophies with guides, sources, filters, spoiler shield and roadmap.
import { loadEarnedTrophies, saveEarnedTrophies, exportProgressFile, importProgressFile } from "./trophy-store.js";
import { trophyMatchesFilters, visibleTrophyName, visibleTrophyDescription, countByGrade } from "./trophy-filters.js";
import { renderRoadmapStages } from "./roadmap-view.js";

const GRADE_ORDER = ["platinum", "gold", "silver", "bronze"];
const GRADE_LETTER = { platinum: "P", gold: "G", silver: "S", bronze: "B" };

const listElement = document.getElementById("trophy-list");
const progressCount = document.getElementById("progress-count");
const progressBar = document.getElementById("progress-bar");
const gradeProgressList = document.getElementById("grade-progress");
const gradeFilter = document.getElementById("grade-filter");
const searchBox = document.getElementById("search-box");
const spoilerToggle = document.getElementById("spoiler-toggle");
const checklistView = document.getElementById("checklist-view");
const roadmapView = document.getElementById("roadmap-view");
const roadmapStages = document.getElementById("roadmap-stages");

let earned = loadEarnedTrophies();
let selectedName = null;
const filters = { kind: "all", grade: "all", search: "" };

const trophyDocument = await (await fetch("data/trophies.json")).json();
const trophies = trophyDocument.trophies;

function renderProgressHeader() {
  progressCount.textContent = `${earned.size} of ${trophies.length} earned`;
  progressBar.style.width = `${(earned.size / trophies.length) * 100}%`;
  const { totals, done } = countByGrade(trophies, earned);
  gradeProgressList.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const item = document.createElement("li");
    item.textContent = `${grade}: ${done[grade] ?? 0}/${totals[grade] ?? 0}`;
    gradeProgressList.append(item);
  }
}

function buildTrophyCard(trophy) {
  const card = document.createElement("article");
  card.className = "trophy-card" + (earned.has(trophy.name) ? " earned" : "") + (selectedName === trophy.name ? " selected" : "");
  card.dataset.trophyName = trophy.name;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = earned.has(trophy.name);
  checkbox.setAttribute("aria-label", `Mark ${trophy.name} as earned`);
  checkbox.addEventListener("click", (event) => event.stopPropagation());
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) earned.add(trophy.name);
    else earned.delete(trophy.name);
    saveEarnedTrophies(earned);
    renderAll();
  });

  const medal = document.createElement("span");
  medal.className = `grade-medal grade-${trophy.grade}`;
  medal.textContent = GRADE_LETTER[trophy.grade] ?? "?";
  medal.title = trophy.grade;

  const textBlock = document.createElement("div");
  const nameElement = document.createElement("p");
  nameElement.className = "trophy-name";
  nameElement.textContent = visibleTrophyName(trophy, spoilerToggle.checked, earned);
  const descriptionElement = document.createElement("p");
  descriptionElement.className = "trophy-description";
  descriptionElement.textContent = visibleTrophyDescription(trophy, spoilerToggle.checked, earned);
  textBlock.append(nameElement, descriptionElement);

  const tags = document.createElement("div");
  tags.className = "trophy-tags";
  const gradeTag = document.createElement("span");
  gradeTag.className = "tag";
  gradeTag.textContent = trophy.grade;
  tags.append(gradeTag);
  if (trophy.hidden) {
    const hiddenTag = document.createElement("span");
    hiddenTag.className = "tag tag-hidden";
    hiddenTag.textContent = "hidden on PSN";
    tags.append(hiddenTag);
  }
  if (trophy.missable) {
    const missableTag = document.createElement("span");
    missableTag.className = "tag tag-missable";
    missableTag.textContent = "MISSABLE";
    tags.append(missableTag);
  }
  if (trophy.count) {
    const countTag = document.createElement("span");
    countTag.className = "tag";
    countTag.textContent = `target ${trophy.count.toLocaleString("en-US")}`;
    tags.append(countTag);
  }

  card.append(checkbox, medal, textBlock, tags);
  card.addEventListener("click", () => {
    selectedName = trophy.name;
    renderAll();
  });
  return card;
}

function renderChecklist() {
  listElement.replaceChildren();
  let shownCount = 0;
  for (const trophy of trophies) {
    if (trophyMatchesFilters(trophy, filters, earned)) {
      listElement.append(buildTrophyCard(trophy));
      shownCount += 1;
    }
  }
  listElement.dataset.shownCount = String(shownCount);
  if (!listElement.children.length) {
    const empty = document.createElement("p");
    empty.textContent = "No trophies match the current filters.";
    listElement.append(empty);
  }
}

function renderGuidePanel() {
  const placeholder = document.getElementById("guide-placeholder");
  const content = document.getElementById("guide-content");
  const trophy = trophies.find((entry) => entry.name === selectedName);
  if (!trophy) {
    placeholder.hidden = false;
    content.hidden = true;
    return;
  }
  placeholder.hidden = true;
  content.hidden = false;
  document.getElementById("guide-title").textContent = visibleTrophyName(trophy, spoilerToggle.checked, earned);
  const countNote = trophy.count ? ` · PSN target ${trophy.count.toLocaleString("en-US")}` : "";
  const hiddenNote = trophy.hidden ? " · hidden on PSN" : "";
  document.getElementById("guide-meta").textContent =
    `${trophy.grade} · ${trophy.kind} · roadmap stage ${trophy.stage}${countNote}${hiddenNote}`;
  document.getElementById("guide-description").textContent =
    `Official description: ${visibleTrophyDescription(trophy, spoilerToggle.checked, earned)}`;
  document.getElementById("guide-text").textContent = trophy.guide;
  const missableBox = document.getElementById("guide-missable");
  if (trophy.missable) {
    missableBox.hidden = false;
    missableBox.textContent = `MISSABLE: ${trophy.missableReason ?? "See the guide above."}`;
  } else {
    missableBox.hidden = true;
  }
  const sourcesList = document.getElementById("guide-sources");
  sourcesList.replaceChildren();
  for (const source of trophy.sources ?? []) {
    const item = document.createElement("li");
    item.textContent = source;
    sourcesList.append(item);
  }
}

function renderAll() {
  renderProgressHeader();
  renderChecklist();
  renderGuidePanel();
  renderRoadmapStages(roadmapStages, trophies, earned);
}

function showView(viewName) {
  const isRoadmap = viewName === "roadmap";
  checklistView.hidden = isRoadmap;
  roadmapView.hidden = !isRoadmap;
  document.getElementById("tab-checklist").classList.toggle("active", !isRoadmap);
  document.getElementById("tab-roadmap").classList.toggle("active", isRoadmap);
}

function wireControls() {
  for (const chip of document.querySelectorAll("#kind-filters .chip")) {
    chip.addEventListener("click", () => {
      filters.kind = chip.dataset.kind;
      for (const other of document.querySelectorAll("#kind-filters .chip")) {
        other.classList.toggle("active", other === chip);
      }
      renderAll();
    });
  }
  gradeFilter.addEventListener("change", () => {
    filters.grade = gradeFilter.value;
    renderAll();
  });
  searchBox.addEventListener("input", () => {
    filters.search = searchBox.value.trim();
    renderAll();
  });
  spoilerToggle.addEventListener("change", renderAll);
  document.getElementById("export-button").addEventListener("click", () => exportProgressFile(earned));
  document.getElementById("import-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    earned = await importProgressFile(file);
    saveEarnedTrophies(earned);
    renderAll();
  });
  document.getElementById("tab-checklist").addEventListener("click", () => showView("checklist"));
  document.getElementById("tab-roadmap").addEventListener("click", () => showView("roadmap"));
}

function applyScreenshotPreset() {
  const shot = new URLSearchParams(location.search).get("shot");
  if (!shot) return;
  document.body.classList.add(`shot-${shot}`);
  const seedEarned = ["Just Like Paradise", "Paradise Lost", "Trust", "Break the Bank", "Master of None", "Stick Fiddler", "Whip It Good", "Ten Pin"];
  if (shot === "checklist") {
    earned = new Set(seedEarned);
    selectedName = "The Shootist";
  } else if (shot === "guide") {
    earned = new Set(seedEarned);
    selectedName = "The Shootist";
    filters.kind = "activities";
    for (const chip of document.querySelectorAll("#kind-filters .chip")) {
      chip.classList.toggle("active", chip.dataset.kind === "activities");
    }
  } else if (shot === "roadmap") {
    earned = new Set(seedEarned);
    showView("roadmap");
  } else if (shot === "missable") {
    earned = new Set(seedEarned);
    spoilerToggle.checked = true;
    filters.kind = "missable";
    selectedName = "Actions Speak Louder";
    for (const chip of document.querySelectorAll("#kind-filters .chip")) {
      chip.classList.toggle("active", chip.dataset.kind === "missable");
    }
  }
}

wireControls();
applyScreenshotPreset();
renderAll();
