import { track, rate } from "./measure.js";

const HAND = 3;

const $hand = document.getElementById("hand");
const $prompt = document.getElementById("prompt");

let deck = [];
let bag = [];
let picks = 0;
let locked = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function refill() {
  if (bag.length < HAND) bag = shuffle(deck.map((_, i) => i));
}

function deal() {
  locked = false;
  refill();
  const hand = bag.splice(0, HAND).map((i) => deck[i]);
  $prompt.textContent = deck.prompt || "Choisis celle qui te plaît.";
  $prompt.style.opacity = "1";
  $hand.classList.remove("is-picking");
  $hand.innerHTML = "";
  for (const card of hand) $hand.appendChild(buildCard(card));
  track("hand");
}

function buildCard(card) {
  const root = document.createElement("div");
  root.className = "card";
  root.tabIndex = 0;
  root.setAttribute("role", "button");
  root.setAttribute("aria-label", "Carte mystère");

  const inner = document.createElement("div");
  inner.className = "inner";

  const front = document.createElement("div");
  front.className = "face front";
  const img = document.createElement("img");
  img.src = card.image;
  img.alt = "";
  front.appendChild(img);

  const back = document.createElement("div");
  back.className = "face back";
  back.innerHTML = backHtml(card);

  inner.append(front, back);
  root.appendChild(inner);
  root.addEventListener("click", () => pick(root, card));
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(root, card);
    }
  });
  return root;
}

function backHtml(card) {
  const hasLink = Boolean(card.link);
  return `
    <p class="kind">${escapeHtml(card.kind || "carte")}</p>
    <h2>${escapeHtml(card.title)}</h2>
    <p class="blurb">${escapeHtml(card.blurb || "")}</p>
    <div class="actions">
      ${
        hasLink
          ? `<a class="btn primary" data-link="${escapeAttr(card.id)}" href="${escapeAttr(card.link)}" target="_blank" rel="noopener">${escapeHtml(card.cta || "Ouvrir")}</a>`
          : ""
      }
      <button type="button" class="btn ghost" data-again>Encore trois</button>
    </div>
    <p class="status" data-status></p>
  `;
}

function pick(root, card) {
  if (locked) return;
  locked = true;
  picks += 1;
  track("pick", card.id, card.title);
  $prompt.style.opacity = "0.35";
  $hand.classList.add("is-picking");
  root.classList.add("is-flipped");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", card.title);
  const status = root.querySelector("[data-status]");
  if (status) {
    status.textContent = `${picks} pioche${picks > 1 ? "s" : ""} · ${bag.length} dans le sac`;
  }
  const again = root.querySelector("[data-again]");
  if (again) again.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    track("encore");
    deal();
  });
  const link = root.querySelector("[data-link]");
  if (link) {
    link.addEventListener("click", () => {
      track("link", card.id, card.title);
    });
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("'", "&#39;");
}

async function boot() {
  const res = await fetch("deck.json");
  const data = await res.json();
  deck = data.cards || [];
  deck.prompt = data.prompt;
  if (data.title) document.title = data.title;
  if (deck.length < HAND) {
    $prompt.textContent = "Il faut au moins 3 cartes dans deck.json.";
    return;
  }
  deal();
  if (new URLSearchParams(location.search).has("stats")) {
    console.info("pioche stats", rate());
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot().catch((err) => {
  $prompt.textContent = "Impossible de charger le deck.";
  console.error(err);
});
