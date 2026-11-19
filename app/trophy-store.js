// Progress storage for the Leonida Trophy Tracker: earned trophy names in localStorage, with export and import.
const PROGRESS_KEY = "leonida-trophy-tracker-progress";

export function loadEarnedTrophies() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveEarnedTrophies(earned) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned]));
}

export function exportProgressFile(earned) {
  const payload = JSON.stringify({ app: "Leonida Trophy Tracker", earned: [...earned] }, null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  link.download = "leonida-trophy-progress.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importProgressFile(file) {
  const parsed = JSON.parse(await file.text());
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error("Progress file has no earned list");
  return new Set(names.filter((name) => typeof name === "string"));
}
