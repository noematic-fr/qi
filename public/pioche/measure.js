/** GoatCounter events + local counters. No cookies. */

const KEY = "pioche-stats-v1";

function empty() {
  return { hands: 0, encore: 0, picks: {}, links: {} };
}

function load() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty();
  }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

const pending = [];

function gc(path, title) {
  const ev = { path, title: title || path, event: true };
  if (window.goatcounter && typeof window.goatcounter.count === "function") {
    window.goatcounter.count(ev);
    return;
  }
  pending.push(ev);
}

function flush() {
  if (!window.goatcounter || typeof window.goatcounter.count !== "function") return;
  while (pending.length) window.goatcounter.count(pending.shift());
}

setInterval(flush, 800);

export function track(kind, id = "", title = "") {
  const stats = load();
  if (kind === "hand") stats.hands += 1;
  else if (kind === "encore") stats.encore += 1;
  else if (kind === "pick" && id) stats.picks[id] = (stats.picks[id] || 0) + 1;
  else if (kind === "link" && id) stats.links[id] = (stats.links[id] || 0) + 1;
  save(stats);

  const path = id ? `${kind}/${id}` : kind;
  gc(path, title || path);
}

export function snapshot() {
  return load();
}

export function rate() {
  const s = load();
  const pickN = Object.values(s.picks).reduce((a, b) => a + b, 0);
  const linkN = Object.values(s.links).reduce((a, b) => a + b, 0);
  return {
    ...s,
    pickN,
    linkN,
    handsPerSession: s.hands,
    linksPerPick: pickN ? linkN / pickN : 0,
  };
}
