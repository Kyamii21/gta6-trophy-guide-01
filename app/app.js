/* Leonida Legend — GTA VI trophy guide & tracker (v4)
   Offline static app: loads data/trophies.json once, keeps progress in
   localStorage, supports export/import, filters, a spoiler shield and
   URL parameters for deep links (?view=guide&trophy=28&shield=off). */
(function () {
  "use strict";

  var STORAGE_KEY = "leonida-legend-progress-v4";
  var RING_C = 326.7; // 2 * pi * 52

  var state = {
    trophies: [],
    roadmap: [],
    earned: {},        // id -> true
    view: "checklist",
    guideId: 28,
    filters: { search: "", kind: "all", grade: "all", status: "all", hidden: "all", missableOnly: false, shield: true }
  };

  /* ---------- small helpers ---------- */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function byId(id) {
    for (var i = 0; i < state.trophies.length; i++) {
      if (state.trophies[i].id === id) return state.trophies[i];
    }
    return null;
  }
  function isEarned(t) { return !!state.earned[t.id]; }
  function kindLabel(kind) {
    var map = {
      story: "Story", collectibles: "Collectibles", activities: "Activities",
      crime: "Crime & money", exploration: "Exploration", completion: "Completion"
    };
    return map[kind] || kind;
  }
  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

  /* The spoiler shield covers hidden trophies until they are earned:
     name and official description are replaced, exactly like the PS5 list. */
  function shielded(t) {
    return state.filters.shield && t.hidden && !isEarned(t);
  }
  function displayName(t) { return shielded(t) ? "Hidden trophy #" + t.id : t.name; }
  function displayDesc(t) {
    return shielded(t)
      ? "Hidden until earned. Turn off the spoiler shield or mark it earned to reveal."
      : t.description;
  }

  /* ---------- persistence ---------- */
  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && data.earned && typeof data.earned === "object") state.earned = data.earned;
    } catch (e) { /* corrupted storage: start clean */ }
  }
  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        app: "leonida-legend", version: 4, savedAt: new Date().toISOString(), earned: state.earned
      }));
    } catch (e) { /* storage unavailable (e.g. private mode): keep in-memory state */ }
  }
  function setEarned(id, on) {
    if (on) state.earned[id] = true; else delete state.earned[id];
    saveProgress();
    renderAll();
  }

  /* ---------- URL parameters (deep links / screenshots) ---------- */
  function applyUrlParams() {
    var q = new URLSearchParams(window.location.search);
    var view = q.get("view");
    if (view && ["checklist", "guide", "roadmap", "missable"].indexOf(view) >= 0) state.view = view;
    var tid = parseInt(q.get("trophy"), 10);
    if (!isNaN(tid)) state.guideId = tid;
    var shield = q.get("shield");
    if (shield === "off") state.filters.shield = false;
    if (shield === "on") state.filters.shield = true;
    var earned = q.get("earned");
    if (earned) {
      earned.split(",").forEach(function (part) {
        var n = parseInt(part.trim(), 10);
        if (!isNaN(n)) state.earned[n] = true;
      });
    }
    var kind = q.get("kind"); if (kind) state.filters.kind = kind;
    var grade = q.get("grade"); if (grade) state.filters.grade = grade;
    var search = q.get("q"); if (search) state.filters.search = search;
  }

  /* ---------- filtering ---------- */
  function matches(t) {
    var f = state.filters;
    if (f.kind !== "all" && t.kind !== f.kind) return false;
    if (f.grade !== "all" && t.grade !== f.grade) return false;
    if (f.status === "earned" && !isEarned(t)) return false;
    if (f.status === "unearned" && isEarned(t)) return false;
    if (f.hidden === "hidden" && !t.hidden) return false;
    if (f.hidden === "visible" && t.hidden) return false;
    if (f.missableOnly && !t.missable) return false;
    if (f.search) {
      var hay = (t.name + " " + t.description + " " + t.guide + " " + (t.steps || []).join(" ")).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) < 0) return false;
    }
    return true;
  }

  /* ---------- rendering: stats ---------- */
  function barRow(label, done, total, color) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '<div class="bar-row"><span class="lbl">' + esc(label) + '</span>' +
      '<span class="bar"><i style="width:' + pct + '%;background:' + color + '"></i></span>' +
      '<span class="val">' + done + "/" + total + " · " + pct + "%</span></div>";
  }
  function renderStats() {
    var total = state.trophies.length;
    var done = state.trophies.filter(isEarned).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    $("#stat-pct").textContent = pct + "%";
    $("#stat-count").textContent = done + " / " + total + " earned";
    $("#ring-fg").style.strokeDashoffset = String(RING_C * (1 - (total ? done / total : 0)));

    var grades = ["platinum", "gold", "silver", "bronze"];
    var gradeColors = { platinum: "#bfe9ff", gold: "#ffd35c", silver: "#d7deea", bronze: "#e0a06a" };
    var gradeHtml = grades.map(function (g) {
      var list = state.trophies.filter(function (t) { return t.grade === g; });
      return barRow(gradeLabel(g), list.filter(isEarned).length, list.length, gradeColors[g]);
    }).join("");

    var kinds = ["story", "collectibles", "activities", "crime", "exploration", "completion"];
    var kindHtml = kinds.map(function (k) {
      var list = state.trophies.filter(function (t) { return t.kind === k; });
      return barRow(kindLabel(k), list.filter(isEarned).length, list.length, "#2ee6c8");
    }).join("");

    var hiddenList = state.trophies.filter(function (t) { return t.hidden; });
    var missList = state.trophies.filter(function (t) { return t.missable; });
    var flagsHtml =
      barRow("Hidden", hiddenList.filter(isEarned).length, hiddenList.length, "#a9b4d8") +
      barRow("Missable", missList.filter(isEarned).length, missList.length, "#ffb02e") +
      barRow("Visible", state.trophies.filter(function (t) { return !t.hidden; }).filter(isEarned).length,
        state.trophies.filter(function (t) { return !t.hidden; }).length, "#ff5da2");

    $("#stat-grid").innerHTML =
      '<div class="stat-card"><h3>By grade</h3>' + gradeHtml + "</div>" +
      '<div class="stat-card"><h3>By kind</h3>' + kindHtml + "</div>" +
      '<div class="stat-card"><h3>Hidden &amp; missable</h3>' + flagsHtml + "</div>";
  }

  /* ---------- rendering: trophy cards ---------- */
  function cardHtml(t) {
    var earned = isEarned(t);
    var name = displayName(t);
    var desc = displayDesc(t);
    var peek = shielded(t)
      ? "Guide hidden by the spoiler shield until this trophy is earned."
      : t.guide;
    var meta =
      '<span class="chip chip-' + (t.grade === "platinum" ? "plat" : t.grade) + '">' + gradeLabel(t.grade) + "</span>" +
      '<span class="chip chip-kind">' + esc(kindLabel(t.kind)) + "</span>" +
      '<span class="chip chip-stage">Stage ' + t.stage + "</span>" +
      (t.hidden ? '<span class="chip chip-hidden">Hidden</span>' : "") +
      (t.missable ? '<span class="chip chip-missable">⚠ Potentially missable</span>' : "");
    return '<article class="card' + (earned ? " is-earned" : "") + '">' +
      '<div class="card-top"><span class="grade-dot grade-' + t.grade + '"></span>' +
      '<h3 class="' + (shielded(t) ? "shielded-name" : "") + '">' + esc(name) + "</h3></div>" +
      '<p class="desc">' + esc(desc) + "</p>" +
      '<div class="meta">' + meta + "</div>" +
      '<p class="guide-peek"><strong>Guide:</strong> ' + esc(peek.length > 220 ? peek.slice(0, 220) + "…" : peek) + "</p>" +
      '<div class="card-foot">' +
      '<label class="earned-toggle"><input type="checkbox" data-earned="' + t.id + '"' + (earned ? " checked" : "") + "> Earned</label>" +
      '<button type="button" class="open-guide" data-open-guide="' + t.id + '">Full guide →</button>' +
      "</div></article>";
  }

  function renderChecklist() {
    var list = state.trophies.filter(matches);
    $("#trophy-grid").innerHTML = list.map(cardHtml).join("");
    $("#empty-state").hidden = list.length !== 0;
    var done = state.trophies.filter(isEarned).length;
    $("#result-line").textContent =
      "Showing " + list.length + " of " + state.trophies.length + " trophies · " + done + " earned (" +
      (state.trophies.length ? Math.round((done / state.trophies.length) * 100) : 0) + "%)" +
      (state.filters.shield ? " · spoiler shield on" : " · spoiler shield off");
  }

  /* ---------- rendering: guide detail ---------- */
  function renderGuidePicker() {
    var sel = $("#guide-select");
    sel.innerHTML = state.trophies.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === state.guideId ? " selected" : "") + ">" +
        esc(gradeLabel(t.grade)) + " — " + esc(displayName(t)) + (isEarned(t) ? " ✓" : "") + "</option>";
    }).join("");
  }

  function renderGuide() {
    var t = byId(state.guideId) || state.trophies[0];
    if (!t) return;
    state.guideId = t.id;
    var earned = isEarned(t);
    var covered = shielded(t);
    var steps = (t.steps || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    var tips = (t.tips || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    var sources = (t.sources || []).map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + "</a>" +
        '<span class="src-url">' + esc(s.url) + "</span></li>";
    }).join("");
    var meta =
      '<span class="chip chip-' + (t.grade === "platinum" ? "plat" : t.grade) + '">' + gradeLabel(t.grade) + "</span>" +
      '<span class="chip chip-kind">' + esc(kindLabel(t.kind)) + "</span>" +
      '<span class="chip chip-stage">Roadmap stage ' + t.stage + "</span>" +
      (t.hidden ? '<span class="chip chip-hidden">Hidden trophy</span>' : '<span class="chip chip-hidden">Visible trophy</span>') +
      (t.missable ? '<span class="chip chip-missable">⚠ Potentially missable</span>' : "");
    $("#guide-detail").innerHTML =
      '<div class="gd-head"><span class="grade-dot grade-' + t.grade + '"></span><h2>' + esc(displayName(t)) + "</h2></div>" +
      '<div class="gd-official"><div class="lbl">Official PlayStation description</div><div class="txt">“' + esc(displayDesc(t)) + "”</div></div>" +
      '<div class="gd-meta">' + meta + "</div>" +
      (covered
        ? '<p class="gd-guide">This trophy is hidden and the spoiler shield is on, so its name, description and guide stay covered until you earn it — just like the PS5 trophy list. Mark it earned or turn the shield off to read the full guide.</p>'
        : '<p class="gd-guide">' + esc(t.guide) + "</p>" +
          (t.missableNote ? '<div class="gd-missable"><strong>Missable watch:</strong> ' + esc(t.missableNote) + "</div>" : "") +
          '<div class="gd-steps"><h3>Step by step</h3><ol>' + steps + "</ol></div>" +
          (tips ? '<div class="gd-tips"><h3>Tips</h3><ul>' + tips + "</ul></div>" : "")) +
      '<div class="gd-sources"><h3>Sources</h3><ul>' + sources + "</ul></div>" +
      '<label class="earned-toggle gd-earned"><input type="checkbox" data-earned="' + t.id + '"' + (earned ? " checked" : "") + "> Mark as earned</label>";
  }

  /* ---------- rendering: roadmap ---------- */
  function renderRoadmap() {
    $("#roadmap-list").innerHTML = state.roadmap.map(function (stage) {
      var members = stage.trophies.map(function (name) {
        for (var i = 0; i < state.trophies.length; i++) {
          if (state.trophies[i].name === name) return state.trophies[i];
        }
        return null;
      }).filter(Boolean);
      var done = members.filter(isEarned).length;
      var chips = members.map(function (t) {
        return '<span class="chip' + (isEarned(t) ? " done" : "") + '" data-open-guide="' + t.id + '" title="Open guide">' +
          esc(displayName(t)) + "</span>";
      }).join("");
      return '<article class="stage-card"><div class="stage-head">' +
        '<span class="stage-num">' + stage.stage + "</span><h3>" + esc(stage.title) + "</h3>" +
        '<span class="stage-prog">' + done + " / " + members.length + " done</span></div>" +
        '<p class="stage-goal"><strong>Goal:</strong> ' + esc(stage.goal) + "</p>" +
        '<p class="stage-notes">' + esc(stage.notes) + "</p>" +
        '<div class="stage-trophies">' + chips + "</div></article>";
    }).join("");
  }

  /* ---------- rendering: missable view ---------- */
  function renderMissable() {
    $("#missable-list").innerHTML = state.trophies.filter(function (t) { return t.missable; }).map(cardHtml).join("");
    $("#hidden-list").innerHTML = state.trophies.filter(function (t) { return t.hidden; }).map(cardHtml).join("");
  }

  /* ---------- view switching ---------- */
  function showView(view) {
    state.view = view;
    ["checklist", "guide", "roadmap", "missable"].forEach(function (v) {
      $("#view-" + v).hidden = v !== view;
    });
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.classList.toggle("is-active", tab.getAttribute("data-view") === view);
    });
    $("#controls").style.display = view === "checklist" ? "" : "none";
  }

  function renderAll() {
    renderStats();
    renderChecklist();
    renderGuidePicker();
    renderGuide();
    renderRoadmap();
    renderMissable();
    showView(state.view);
  }

  /* ---------- export / import / reset ---------- */
  function exportProgress() {
    var payload = {
      app: "leonida-legend", version: 4, game: "Grand Theft Auto VI (PS5)",
      exportedAt: new Date().toISOString(),
      earnedIds: Object.keys(state.earned).map(Number).sort(function (a, b) { return a - b; }),
      earned: state.earned
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "leonida-legend-progress.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var earned = {};
        if (Array.isArray(data.earnedIds)) {
          data.earnedIds.forEach(function (n) { if (byId(Number(n))) earned[Number(n)] = true; });
        } else if (data.earned && typeof data.earned === "object") {
          Object.keys(data.earned).forEach(function (k) { if (data.earned[k] && byId(Number(k))) earned[Number(k)] = true; });
        } else {
          throw new Error("Unrecognised progress file");
        }
        state.earned = earned;
        saveProgress();
        renderAll();
        window.alert("Progress imported: " + Object.keys(earned).length + " trophies marked earned.");
      } catch (e) {
        window.alert("That file could not be imported. Please choose a Leonida Legend progress JSON export.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- wiring ---------- */
  function bindEvents() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () { showView(tab.getAttribute("data-view")); });
    });

    $("#f-search").addEventListener("input", function (e) { state.filters.search = e.target.value; renderChecklist(); });
    $("#f-kind").addEventListener("change", function (e) { state.filters.kind = e.target.value; renderChecklist(); });
    $("#f-grade").addEventListener("change", function (e) { state.filters.grade = e.target.value; renderChecklist(); });
    $("#f-status").addEventListener("change", function (e) { state.filters.status = e.target.value; renderChecklist(); });
    $("#f-hidden").addEventListener("change", function (e) { state.filters.hidden = e.target.value; renderChecklist(); });
    $("#f-missable").addEventListener("change", function (e) { state.filters.missableOnly = e.target.checked; renderChecklist(); });
    $("#f-shield").addEventListener("change", function (e) { state.filters.shield = e.target.checked; renderAll(); });

    $("#guide-select").addEventListener("change", function (e) {
      state.guideId = Number(e.target.value);
      renderGuide();
    });

    document.addEventListener("change", function (e) {
      var id = e.target.getAttribute && e.target.getAttribute("data-earned");
      if (id) setEarned(Number(id), e.target.checked);
    });
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-open-guide]") : null;
      if (!el) return;
      state.guideId = Number(el.getAttribute("data-open-guide"));
      showView("guide");
      renderGuidePicker();
      renderGuide();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("#btn-export").addEventListener("click", exportProgress);
    $("#file-import").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
      e.target.value = "";
    });
    $("#btn-reset").addEventListener("click", function () {
      if (window.confirm("Reset all trophy progress? Export a backup first if you want to keep it.")) {
        state.earned = {};
        saveProgress();
        renderAll();
      }
    });

    /* Keyboard: "/" jumps to search, Escape clears it. */
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        showView("checklist");
        $("#f-search").focus();
      } else if (e.key === "Escape" && e.target === $("#f-search")) {
        e.target.value = "";
        state.filters.search = "";
        renderChecklist();
      }
    });
  }

  function syncControls() {
    $("#f-search").value = state.filters.search;
    $("#f-kind").value = state.filters.kind;
    $("#f-grade").value = state.filters.grade;
    $("#f-status").value = state.filters.status;
    $("#f-hidden").value = state.filters.hidden;
    $("#f-missable").checked = state.filters.missableOnly;
    $("#f-shield").checked = state.filters.shield;
  }

  /* ---------- boot ---------- */
  function boot() {
    loadProgress();
    applyUrlParams();
    fetch("data/trophies.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        state.trophies = Array.isArray(data) ? data : (data.trophies || []);
        state.roadmap = (data && data.roadmap) || [];
        state.trophies.sort(function (a, b) { return a.id - b.id; });
        if (!byId(state.guideId) && state.trophies.length) state.guideId = state.trophies[0].id;
        bindEvents();
        syncControls();
        renderAll();
      })
      .catch(function (err) {
        $("#trophy-grid").innerHTML = '<p class="empty">Could not load data/trophies.json (' + esc(err.message) +
          "). Serve the app/ folder with any static file server, or open it in Chrome with local file access enabled.</p>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
