const CARD_IMAGE_BASE = "./assets/cards/lenormand_cards_optimized_for_repo/assets/cards";
const CARD_BACK = `${CARD_IMAGE_BASE}/back.png`;
const DATA_URL = "./data/cards.json";
const JOURNAL_KEY = "lenormand-oracle-journal-v1";

let cards = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindTabs();
  bindControls();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
    cards = await response.json();
    renderLibrary(cards);
    renderJournal();
    $("#readingResult").innerHTML = `<article class="interpretation"><strong>Ready.</strong> Choose a one-card draw or a three-card reading.</article>`;
  } catch (error) {
    $("#readingResult").innerHTML = `<p class="error">Could not load card data. Confirm that ./data/cards.json exists and Vercel is deploying the repository root.</p>`;
    console.error(error);
  }
}

function bindTabs() {
  $$(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tabs button").forEach((item) => item.classList.remove("active"));
      $$(".panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}`).classList.add("active");
    });
  });
}

function bindControls() {
  $("#drawOne").addEventListener("click", () => draw(1));
  $("#drawThree").addEventListener("click", () => draw(3));
  $("#search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    const filtered = cards.filter((card) => {
      const haystack = [card.name, card.slug, ...(card.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    renderLibrary(filtered);
  });
  $("#clearJournal").addEventListener("click", () => {
    localStorage.removeItem(JOURNAL_KEY);
    renderJournal();
  });
}

function draw(count) {
  if (!cards.length) return;
  const selected = shuffle([...cards]).slice(0, count);
  const question = $("#question").value.trim() || "What should I know right now?";
  const spreadName = count === 1 ? "One-card draw" : "Situation / Challenge / Advice";
  const interpretation = interpret(selected, question);

  $("#readingResult").innerHTML = [
    ...selected.map((card, index) => renderCard(card, count === 3 ? ["Situation", "Challenge", "Advice"][index] : "Focus")),
    `<article class="interpretation"><h3>${escapeHtml(spreadName)}</h3><p><strong>Question:</strong> ${escapeHtml(question)}</p><p>${escapeHtml(interpretation)}</p></article>`
  ].join("");

  saveReading({ spreadName, question, cards: selected, interpretation });
  renderJournal();
}

function renderCard(card, label = "") {
  const keywords = (card.keywords || []).join(", ");
  const imageSrc = `${CARD_IMAGE_BASE}/${card.image}`;
  return `<article class="card">
    <img src="${imageSrc}" alt="${escapeHtml(card.name)} card" loading="lazy" onerror="this.src='${CARD_BACK}'">
    <p class="number">${label ? `${escapeHtml(label)} · ` : ""}Card ${card.id}</p>
    <h3>${escapeHtml(card.name)}</h3>
    <p class="keywords">${escapeHtml(keywords)}</p>
    ${card.general ? `<p>${escapeHtml(card.general)}</p>` : ""}
    ${card.reflection_prompt ? `<p><strong>Reflect:</strong> ${escapeHtml(card.reflection_prompt)}</p>` : ""}
  </article>`;
}

function renderLibrary(list) {
  $("#libraryGrid").innerHTML = list.map((card) => renderCard(card)).join("");
}

function interpret(selected, question) {
  if (selected.length === 1) {
    const card = selected[0];
    return `${card.name} brings attention to ${keywordPhrase(card)}. Let this symbol frame the question: ${question}`;
  }

  const [situation, challenge, advice] = selected;
  return `The situation is shaped by ${situation.name}: ${keywordPhrase(situation)}. The challenge appears through ${challenge.name}: ${keywordPhrase(challenge)}. The advice is ${advice.name}: work with ${keywordPhrase(advice)} as your next practical step.`;
}

function keywordPhrase(card) {
  return (card.keywords || []).slice(0, 3).join(", ") || "the card's core meaning";
}

function saveReading(reading) {
  const journal = getJournal();
  journal.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    spreadName: reading.spreadName,
    question: reading.question,
    cards: reading.cards.map((card) => ({ id: card.id, name: card.name, image: card.image, keywords: card.keywords || [] })),
    interpretation: reading.interpretation
  });
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal.slice(0, 50)));
}

function getJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || [];
  } catch {
    return [];
  }
}

function renderJournal() {
  const journal = getJournal();
  if (!journal.length) {
    $("#journalList").innerHTML = `<p>No saved readings yet. Draw a card to start your local journal.</p>`;
    return;
  }

  $("#journalList").innerHTML = journal.map((entry) => {
    const cardsText = entry.cards.map((card) => card.name).join(", ");
    return `<article class="journal-entry">
      <time datetime="${entry.createdAt}">${new Date(entry.createdAt).toLocaleString()}</time>
      <h3>${escapeHtml(entry.spreadName)}</h3>
      <p><strong>Question:</strong> ${escapeHtml(entry.question)}</p>
      <p><strong>Cards:</strong> ${escapeHtml(cardsText)}</p>
      <p>${escapeHtml(entry.interpretation)}</p>
    </article>`;
  }).join("");
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function escapeHtml(value) {
  return String(value ?/ "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
