// Filtering and the spoiler shield for the Leonida Trophy Tracker checklist.

export function trophyMatchesFilters(trophy, filters, earned) {
  if (filters.kind === "missable") {
    if (!trophy.missable) return false;
  } else if (filters.kind !== "all" && trophy.kind !== filters.kind) {
    return false;
  }
  if (filters.grade !== "all" && trophy.grade !== filters.grade) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function isSpoilerShielded(trophy, spoilerOn, earned) {
  return spoilerOn && trophy.kind === "story" && !earned.has(trophy.name);
}

export function visibleTrophyName(trophy, spoilerOn, earned) {
  return isSpoilerShielded(trophy, spoilerOn, earned) ? "Hidden story trophy" : trophy.name;
}

export function visibleTrophyDescription(trophy, spoilerOn, earned) {
  return isSpoilerShielded(trophy, spoilerOn, earned)
    ? "Earn this story trophy to reveal its name and description."
    : trophy.description;
}

export function countByGrade(trophies, earned) {
  const totals = {};
  const done = {};
  for (const trophy of trophies) {
    totals[trophy.grade] = (totals[trophy.grade] ?? 0) + 1;
    if (earned.has(trophy.name)) done[trophy.grade] = (done[trophy.grade] ?? 0) + 1;
  }
  return { totals, done };
}
