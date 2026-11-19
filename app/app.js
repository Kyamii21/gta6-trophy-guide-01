'use strict';

/* Leonida Trophy Tracker — offline GTA VI trophy guide and tracker.
   Loads its data from data/trophies.json (a file of this app), keeps progress
   in localStorage, and makes no network requests. */

const STORAGE_KEY = 'leonida-trophy-tracker-v1';

const STAGES = [
  { id: 1, name: 'Story', blurb: 'Chapters and story missions. Unmissable — play them first.' },
  { id: 2, name: 'Stranger strands', blurb: 'Character finals and stranger strands. The missable window: finish before the final mission.' },
  { id: 3, name: 'Activities & challenges', blurb: 'Shooting range, races, stunts, drone races and the challenge list.' },
  { id: 4, name: 'Collectibles & exploration', blurb: 'Cards, WAiNK It spots, meditation spots, areas, vehicles, garages.' },
  { id: 5, name: 'Money, robberies & feats', blurb: 'Vaults, gang operations, laundering, partner feats and odd jobs.' },
  { id: 6, name: '100% & platinum', blurb: 'The completion capstone, then the platinum itself.' }
];

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  completion: 'Completion',
  platinum: 'Platinum'
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'online', label: 'Online' },
  { key: 'earned', label: 'Earned' },
  { key: 'remaining', label: 'Remaining' }
];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const state = {
  trophies: [],
  earned: new Set(),
  filter: 'all',
  stageFilter: 0,
  query: '',
  spoiler: false,
  hideEarned: false,
  sort: 'roadmap',
  openGuides: new Set(),
  preset: false
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stageName(id) {
  const stage = STAGES.find((s) => s.id === id);
  return stage ? stage.name : 'Stage ' + id;
}

function isMasked(trophy) {
  return state.spoiler && trophy.secret && !state.earned.has(trophy.id);
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.earned)) {
      state.earned = new Set(parsed.earned.filter((n) => Number.isInteger(n)));
    }
  } catch (err) {
    state.earned = new Set();
  }
}

function saveProgress() {
  if (state.preset) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b) }));
  } catch (err) {
    /* storage unavailable: progress simply will not persist */
  }
}

function matchesFilters(trophy) {
  if (state.stageFilter && trophy.stage !== state.stageFilter) return false;
  if (state.hideEarned && state.earned.has(trophy.id)) return false;
  switch (state.filter) {
    case 'all': break;
    case 'earned': if (!state.earned.has(trophy.id)) return false; break;
    case 'remaining': if (state.earned.has(trophy.id)) return false; break;
    case 'missable': if (!trophy.missable) return false; break;
    default: if (trophy.kind !== state.filter) return false;
  }
  if (state.query) {
    const haystack = (trophy.name + ' ' + trophy.description).toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }
  return true;
}

function sortTrophies(list) {
  const byRoadmap = (a, b) => (a.stage - b.stage) || (a.id - b.id);
  if (state.sort === 'grade') {
    return list.sort((a, b) => (GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]) || byRoadmap(a, b));
  }
  if (state.sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return list.sort(byRoadmap);
}

function renderProgress() {
  const total = state.trophies.length;
  const earnedCount = state.trophies.filter((t) => state.earned.has(t.id)).length;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-count').textContent = earnedCount + ' / ' + total + ' earned';
  document.getElementById('progress-fill').style.width = pct + '%';
  const counts = document.getElementById('grade-counts');
  counts.textContent = '';
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const ofGrade = state.trophies.filter((t) => t.grade === grade);
    const got = ofGrade.filter((t) => state.earned.has(t.id)).length;
    const chip = el('span', 'grade-chip');
    chip.appendChild(el('span', 'medal ' + grade));
    chip.appendChild(document.createTextNode(GRADE_LABELS[grade] + ' ' + got + '/' + ofGrade.length));
    counts.appendChild(chip);
  }
}

function renderRoadmap() {
  const grid = document.getElementById('stage-grid');
  grid.textContent = '';
  for (const stage of STAGES) {
    const inStage = state.trophies.filter((t) => t.stage === stage.id);
    const got = inStage.filter((t) => state.earned.has(t.id)).length;
    const card = el('button', 'stage-card' + (state.stageFilter === stage.id ? ' active' : ''));
    card.type = 'button';
    card.appendChild(el('div', 'stage-num', 'Stage ' + stage.id));
    card.appendChild(el('div', 'stage-name', stage.name));
    card.appendChild(el('p', 'stage-blurb', stage.blurb));
    card.appendChild(el('div', 'stage-progress', got + ' / ' + inStage.length + ' earned'));
    const bar = el('div', 'stage-bar');
    const fill = el('div');
    fill.style.width = (inStage.length ? Math.round((got / inStage.length) * 100) : 0) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);
    const missables = inStage.filter((t) => t.missable).length;
    if (missables) {
      card.appendChild(el('div', 'stage-warn', '⚠ ' + missables + ' missable — finish before the final mission'));
    }
    card.addEventListener('click', () => {
      state.stageFilter = state.stageFilter === stage.id ? 0 : stage.id;
      renderAll();
    });
    grid.appendChild(card);
  }
}

function renderFilters() {
  const row = document.getElementById('kind-filters');
  row.textContent = '';
  for (const filter of FILTERS) {
    const chip = el('button', 'chip' + (state.filter === filter.key ? ' active' : ''));
    chip.type = 'button';
    chip.appendChild(document.createTextNode(filter.label));
    const count = countForFilter(filter.key);
    const countSpan = el('span', 'chip-count', String(count));
    chip.appendChild(countSpan);
    chip.addEventListener('click', () => {
      state.filter = filter.key;
      renderAll();
    });
    row.appendChild(chip);
  }
}

function countForFilter(key) {
  switch (key) {
    case 'all': return state.trophies.length;
    case 'earned': return state.trophies.filter((t) => state.earned.has(t.id)).length;
    case 'remaining': return state.trophies.filter((t) => !state.earned.has(t.id)).length;
    case 'missable': return state.trophies.filter((t) => t.missable).length;
    default: return state.trophies.filter((t) => t.kind === key).length;
  }
}

function trophyCard(trophy) {
  const earned = state.earned.has(trophy.id);
  const masked = isMasked(trophy);
  const guideOpen = !masked && state.openGuides.has(trophy.id);
  const card = el('article', 'card' + (earned ? ' earned' : '') + (trophy.missable ? ' missable-card' : '') + (guideOpen ? ' guide-open' : ''));
  card.dataset.trophyId = String(trophy.id);

  const top = el('div', 'card-top');
  top.appendChild(el('span', 'medal ' + trophy.grade));
  const name = el('h3', 'card-name' + (masked ? ' masked' : ''), masked ? 'Hidden trophy' : trophy.name);
  top.appendChild(name);
  const toggle = el('label', 'earned-toggle');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', 'Mark earned: ' + trophy.name);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(trophy.id); else state.earned.delete(trophy.id);
    saveProgress();
    renderAll();
  });
  toggle.appendChild(box);
  toggle.appendChild(document.createTextNode('Earned'));
  top.appendChild(toggle);
  card.appendChild(top);

  const desc = el('p', 'card-desc' + (masked ? ' masked' : ''),
    masked ? 'Hidden until earned — turn the spoiler shield off to reveal.' : trophy.description);
  card.appendChild(desc);

  const meta = el('div', 'card-meta');
  meta.appendChild(el('span', 'tag grade-tag', GRADE_LABELS[trophy.grade]));
  meta.appendChild(el('span', 'tag kind-' + trophy.kind, KIND_LABELS[trophy.kind] || trophy.kind));
  meta.appendChild(el('span', 'tag', 'Stage ' + trophy.stage + ' · ' + stageName(trophy.stage)));
  if (trophy.count) {
    meta.appendChild(el('span', 'tag count-tag', 'Target: ' + trophy.count.toLocaleString('en-US')));
  }
  if (trophy.missable) {
    meta.appendChild(el('span', 'missable-flag', '⚠ MISSABLE'));
  }
  if (trophy.secret) {
    meta.appendChild(el('span', 'tag', 'Secret'));
  }
  card.appendChild(meta);

  const guideBtn = el('button', 'guide-btn', state.openGuides.has(trophy.id) ? 'Hide guide' : 'Show guide');
  guideBtn.type = 'button';
  if (masked) {
    guideBtn.disabled = true;
    guideBtn.textContent = 'Guide hidden by spoiler shield';
  } else {
    guideBtn.addEventListener('click', () => {
      if (state.openGuides.has(trophy.id)) state.openGuides.delete(trophy.id);
      else state.openGuides.add(trophy.id);
      renderGrid();
    });
  }
  card.appendChild(guideBtn);

  if (guideOpen) {
    const panel = el('div', 'guide-panel');
    panel.appendChild(el('p', '', trophy.guide));
    const sources = el('div', 'sources');
    sources.appendChild(el('strong', '', 'Sources: '));
    sources.appendChild(document.createTextNode((trophy.sources || []).join(' · ')));
    panel.appendChild(sources);
    card.appendChild(panel);
  }

  return card;
}

function renderGrid() {
  const grid = document.getElementById('trophy-grid');
  grid.textContent = '';
  const visible = sortTrophies(state.trophies.filter(matchesFilters));
  for (const trophy of visible) grid.appendChild(trophyCard(trophy));
  document.getElementById('empty-note').hidden = visible.length > 0;
  const line = document.getElementById('result-line');
  if (state.filter === 'online') {
    line.textContent = 'The official PlayStation 5 list has no online trophies — all 55 are single-player.';
  } else if (state.stageFilter) {
    line.textContent = 'Showing ' + visible.length + ' of ' + state.trophies.length + ' trophies · Stage ' + state.stageFilter + ' (' + stageName(state.stageFilter) + ') — click the stage again to clear.';
  } else {
    line.textContent = 'Showing ' + visible.length + ' of ' + state.trophies.length + ' trophies.';
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderFilters();
  renderGrid();
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-tracker',
    version: 1,
    earned: [...state.earned].sort((a, b) => a - b),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const list = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(list)) throw new Error('no earned list');
      const known = new Set(state.trophies.map((t) => t.id));
      state.earned = new Set(list.filter((n) => Number.isInteger(n) && known.has(n)));
      saveProgress();
      renderAll();
    } catch (err) {
      document.getElementById('result-line').textContent = 'Import failed: that file is not a tracker progress export.';
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  state.earned = new Set();
  state.openGuides = new Set();
  saveProgress();
  renderAll();
}

function applyShotPreset(name) {
  state.preset = true;
  if (name === 'cover') {
    state.earned = new Set([2, 3, 4, 8, 16, 21, 44]);
    state.openGuides = new Set([2]);
    state.filter = 'all';
    state.spoiler = false;
  } else if (name === 'guide') {
    state.earned = new Set([2, 3, 4, 5, 8, 9, 16, 21]);
    state.openGuides = new Set([40]);
    state.filter = 'all';
    state.spoiler = false;
  } else if (name === 'roadmap') {
    state.earned = new Set([2, 3, 4, 8, 9, 22, 26]);
    state.openGuides = new Set();
    state.filter = 'all';
    state.spoiler = true;
  } else if (name === 'missable') {
    state.earned = new Set([22]);
    state.openGuides = new Set([22]);
    state.filter = 'missable';
    state.spoiler = true;
  }
  document.getElementById('spoiler-toggle').checked = state.spoiler;
}

function bindControls() {
  document.getElementById('search-input').addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderGrid();
  });
  document.getElementById('spoiler-toggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    renderGrid();
  });
  document.getElementById('hide-earned-toggle').addEventListener('change', (event) => {
    state.hideEarned = event.target.checked;
    renderGrid();
  });
  document.getElementById('sort-select').addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderGrid();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-input').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', resetProgress);
}

function scrollToOpenGuide() {
  const first = state.openGuides.values().next().value;
  if (first === undefined) return;
  const card = document.querySelector('[data-trophy-id="' + first + '"]');
  if (card) card.scrollIntoView({ block: 'center' });
}

async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('trophies.json: ' + response.status);
  const data = await response.json();
  const list = Array.isArray(data) ? data : data.trophies;
  if (!Array.isArray(list)) throw new Error('trophies.json: no trophies array');
  state.trophies = list;
}

async function init() {
  bindControls();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) applyShotPreset(shot);
  else loadProgress();
  try {
    await loadTrophies();
  } catch (err) {
    document.getElementById('load-error').hidden = false;
    return;
  }
  renderAll();
  if (shot === 'guide' || shot === 'missable') scrollToOpenGuide();
}

document.addEventListener('DOMContentLoaded', init);
