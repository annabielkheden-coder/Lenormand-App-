import { CARD_INTERPRETATIONS } from './data/interpretations.js';

const CARD_IMAGE_BASE = './assets/cards/lenormand_cards_optimized_for_repo/assets/cards';
const CARD_BACK = `${CARD_IMAGE_BASE}/back.png`;
const DATA_URL = './data/cards.json';
const JOURNAL_KEY = 'lenormand-oracle-journal-v1';

let cards = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindTabs();
  bindControls();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
    cards = await response.json();
    renderLibrary(cards);
    renderJournal();
    $('#readingResult').innerHTML = `<article class="interpretation"><strong>Ready.</strong> Choose a one-card draw or a three-card reading.</article>`;
  } catch (error) {
    $('#readingResult').innerHTML = `<p class="error">Could not load card data. Confirm that ./data/cards.json exists and Vercel is deploying the repository root.</p>`;
    console.error(error);
  }
}

function bindTabs() {
  $$('.tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.tabs button').forEach((item) => item.classList.remove('active'));
      $$('.panel').forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      $(`#${button.dataset.tab}`).classList.add('active');
    });
  });
}

function bindControls() {
  $('#drawOne').addEventListener('click', () => draw(1));
  $('#drawThree').addEventListener('click', () => draw(3));
  $('#search').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    const filtered = cards.filter((card) => {
      const interpretation = getInterpretation(card).toLowerCase();
      const haystack = [card.name, card.slug, ...(card.keywords || []), interpretation].join(' ').toLowerCase();
      return haystack.includes(query);
    });
    renderLibrary(filtered);
  });
  $('#clearJournal').addEventListener('click', () => {
    localStorage.removeItem(JOURNAL_KEY);
    renderJournal();
  });
}

function draw(count) {
  if (!cards.length) return;

  const selected = shuffle([...cards]).slice(0, count);
  const question = $('#question').value.trim() || 'What should I know right now?';
  const spreadName = count === 1 ? 'One-card draw' : 'Situation / Challenge / Advice';
  const interpretation = interpret(selected, question);

  $('#readingResult').innerHTML = [
    ...selected.map((card, index) => renderCard(card, count === 3 ? ['Situation', 'Challenge', 'Advice'][index] : 'Focus')),
    `<article class="interpretation"><h3>${escapeHtml(spreadName)}</h3><p><strong>Question:</strong> ${escapeHtml(question)}</p><blockquote class="oracle-text">${escapeHtml(interpretation)}</blockquote></article>`
  ].join('');

  saveReading({ spreadName, question, cards: selected, interpretation });
}

function getInterpretation(card) {
  return CARD_INTERPRETATIONS[card.id] || card.general || `${card.name} invites reflection through ${keywordPhrase(card)}.`;
}

function renderCard(card, label = '') {
  const keywords = (card.keywords || []).join(', ');
  const imageSrc = `${CARD_IMAGE_BASE}/${card.image}`;
  const interpretation = getInterpretation(card);

  return `<article class="card">
    <img src="${imageSrc}" alt="${escapeHtml(card.name)} card" loading="lazy" onerror="this.src='${CARD_BACK}'">
    <p class="number">${label ? `${escapeHtml(label)} · ` : ''}Card ${card.id}</p>
    <h3>${escapeHtml(card.name)}</h3>
    <p class="keywords">${escapeHtml(keywords)}</p>
    <blockquote class="oracle-text">${escapeHtml(interpretation)}</blockquote>
  </article>`;
}

function renderLibrary(list = cards) {
  const grid = $('#libraryGrid');

  if (!list.length) {
    grid.innerHTML = '<p>No cards match your search.</p>';
    return;
  }

  grid.innerHTML = list.map((card) => {
    const imageSrc = `${CARD_IMAGE_BASE}/${card.image}`;
    const keywords = (card.keywords || []).join(', ');
    const interpretation = getInterpretation(card);

    return `<article class="card library-card">
      <img src="${imageSrc}" alt="${escapeHtml(card.name)} card" loading="lazy" onerror="this.src='${CARD_BACK}'">
      <p class="number">Card ${card.id}</p>
      <h3>${escapeHtml(card.name)}</h3>
      <p class="keywords">${escapeHtml(keywords)}</p>
      <blockquote class="oracle-text">${escapeHtml(interpretation)}</blockquote>
    </article>`;
  }).join('');
}

function interpret(selected, question) {
  if (selected.length === 1) {
    return getInterpretation(selected[0]);
  }

  const [situation, challenge, advice] = selected;
  return [
    `For “${question},” the first card asks you to begin here: ${getInterpretation(situation)}`,
    `The second card complicates the path: ${getInterpretation(challenge)}`,
    `The third card offers a way forward: ${getInterpretation(advice)}`
  ].join(' ');
}

function keywordPhrase(card) {
  return (card.keywords || []).slice(0, 3).join(', ') || "the card's core meaning";
}

function saveReading(reading) {
  const journal = getJournal();

  journal.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    spreadName: reading.spreadName,
    question: reading.question,
    cards: reading.cards.map((card) => ({
      id: card.id,
      name: card.name,
      image: card.image,
      keywords: card.keywords || []
    })),
    interpretation: reading.interpretation
  });

  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal.slice(0, 50)));
  renderJournal();
}

function getJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || [];
  } catch {
    return [];
  }
}

function displayJournal() {
  const journal = getJournal();
  const list = $('#journalList');

  if (!journal.length) {
    list.innerHTML = '<p>No saved readings yet. Draw a card to start your local journal.</p>';
    return;
  }

  list.innerHTML = journal.map((entry) => {
    const cardImages = entry.cards.map((card) => {
      const imageSrc = `${CARD_IMAGE_BASE}/${card.image}`;
      return `<img src="${imageSrc}" alt="${escapeHtml(card.name)} card" loading="lazy" onerror="this.src='${CARD_BACK}'">`;
    }).join('');

    const cardsText = entry.cards.map((card) => card.name).join(', ');

    return `<article class="journal-entry">
      <time datetime="${entry.createdAt}">${new Date(entry.createdAt).toLocaleString()}</time>
      <h3>${escapeHtml(entry.spreadName)}</h3>
      <div class="cards journal-card-images">${cardImages}</div>
      <p><strong>Question:</strong> ${escapeHtml(entry.question)}</p>
      <p><strong>Cards:</strong> ${escapeHtml(cardsText)}</p>
      <blockquote class="oracle-text">${escapeHtml(entry.interpretation)}</blockquote>
    </article>`;
  }).join('');
}

function renderJournal() {
  displayJournal();
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
