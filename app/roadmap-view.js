// The six-stage roadmap to the platinum, grouped from each trophy's stage field.

export const ROADMAP_STAGES = [
  { stage: 1, title: "Stage 1 — Story playthrough", blurb: "Play the main story: the opening mission, Chapters 1–4, the named story missions and the final mission. All unmissable." },
  { stage: 2, title: "Stage 2 — Missables & chapter cleanup", blurb: "Watch the one missable-flagged trophy (the choice count) and try the two cryptic VCIA/Rhino trophies while those story beats are in play." },
  { stage: 3, title: "Stage 3 — Collectibles", blurb: "Sweep Leonida: explore all 52 areas, 18 meditation spots, 100 WAiNK locations, 3 card sets, 100 vehicles discovered, 10 Scooter Bros registrations." },
  { stage: 4, title: "Stage 4 — Activities & challenges", blurb: "Gold all 42 Shooting Range challenges, 250 stunts, 50 challenges, races, drone races, robberies and the partner wanted-level feats." },
  { stage: 5, title: "Stage 5 — Side content", blurb: "Finish every character strand (Andy, Kenton, Billy, Randy, Tyrone), 8 stranger strands, Bret's hunt, Cal's fishing challenge and the arcade." },
  { stage: 6, title: "Stage 6 — Final grind & platinum", blurb: "Launder $250,000, spend $100,000, buy all 8 garages, reach 100% completion — then the platinum, Vice Got a Price!, pops." },
];

export function renderRoadmapStages(container, trophies, earned) {
  container.replaceChildren();
  for (const stageInfo of ROADMAP_STAGES) {
    const inStage = trophies.filter((trophy) => trophy.stage === stageInfo.stage);
    const doneCount = inStage.filter((trophy) => earned.has(trophy.name)).length;
    const card = document.createElement("article");
    card.className = "stage-card";
    const heading = document.createElement("h3");
    heading.textContent = stageInfo.title;
    const progress = document.createElement("p");
    progress.className = "stage-progress";
    progress.textContent = `${doneCount} of ${inStage.length} earned — ${stageInfo.blurb}`;
    const list = document.createElement("ul");
    for (const trophy of inStage) {
      const item = document.createElement("li");
      if (earned.has(trophy.name)) item.className = "earned";
      const countNote = trophy.count ? ` (target ${trophy.count.toLocaleString("en-US")})` : "";
      const missableNote = trophy.missable ? " — MISSABLE" : "";
      item.textContent = `${trophy.name} [${trophy.grade}]${countNote}${missableNote}`;
      list.append(item);
    }
    card.append(heading, progress, list);
    container.append(card);
  }
}
