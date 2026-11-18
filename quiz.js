const byId = id => document.getElementById(id);
const names = ['Toate temele', 'Spectre și analiză spectrală', 'Radiația laser', 'Radioactivitate', 'Polarizare și polarimetrie', 'Absorbție și fotocolorimetrie'];
let theme = -1;
let mode = 'study';
let position = 0;
let deck = [];
let selections = new Map();
let checked = new Set();
let missed = [];
const topics = byId('topics');

function shuffle(values) {
  const reordered = [...values];
  for (let index = reordered.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [reordered[index], reordered[swap]] = [reordered[swap], reordered[index]];
  }
  return reordered;
}

function create(tag, message, className) {
  const element = document.createElement(tag);
  if (message) element.textContent = message;
  if (className) element.className = className;
  return element;
}

function show(section) {
  for (const name of ['home', 'session', 'results']) byId(name).hidden = name !== section;
  window.scrollTo(0, 0);
}

function updateTopics() {
  topics.replaceChildren();
  names.forEach((name, index) => {
    const topic = index - 1;
    const button = create('button', name, 'topic-button');
    button.setAttribute('aria-pressed', String(theme === topic));
    const count = topic < 0 ? items.length : items.filter(item => item.topic === topic).length;
    button.append(create('small', count + ' întrebări'));
    button.onclick = () => { theme = topic; updateTopics(); topics.children[index].focus(); };
    topics.append(button);
  });
}

function loadHistory() {
  try {
    const last = JSON.parse(localStorage.getItem('biofizica-last'));
    if (last) byId('history').textContent = 'Ultimul rezultat: ' + last.correct + '/' + last.total;
  } catch { /* Local progress is optional. */ }
}

function begin(pool, sessionMode) {
  mode = sessionMode;
  deck = pool.map(item => ({ ...item, choices: shuffle([item.a, ...item.o]) }));
  position = 0;
  selections = new Map();
  checked = new Set();
  show('session');
  renderQuestion();
}

function renderQuestion(moveFocus = true) {
  const item = deck[position];
  const locked = checked.has(item.id);
  const selected = selections.get(item.id);
  byId('position').textContent = (position + 1) + ' / ' + deck.length;
  byId('progress').value = 100 * selections.size / deck.length;
  byId('topic').textContent = names[item.topic + 1];
  byId('original').textContent = 'Itemul ' + item.id;
  byId('question').textContent = item.q;
  const figure = byId('figure');
  figure.hidden = !item.image;
  if (item.image) figure.src = item.image;
  const options = byId('options');
  options.replaceChildren();
  item.choices.forEach((option, index) => {
    const style = locked && option === item.a ? ' correct' : locked && selected === option ? ' wrong' : '';
    const label = create('label', '', 'choice' + style);
    const input = create('input');
    input.type = 'radio';
    input.name = 'option';
    input.value = option;
    input.checked = selected === option;
    input.disabled = locked;
    input.onchange = () => {
      selections.set(item.id, option);
      byId('progress').value = selections.size * 100 / deck.length;
      byId('check').disabled = false;
    };
    label.append(input, create('span', String.fromCharCode(65 + index) + '. ' + option));
    options.append(label);
  });
  const feedback = byId('feedback');
  feedback.hidden = !locked;
  feedback.replaceChildren();
  if (locked) feedback.append(create('strong', selected === item.a ? 'Corect. ' : selected ? 'Răspuns corect. ' : 'Soluție. '), document.createTextNode(item.a + ' ' + item.e));
  byId('check').hidden = mode === 'exam' || locked;
  byId('check').disabled = false;
  byId('check').textContent = 'Verifică / vezi soluția';
  byId('back').disabled = position === 0;
  byId('next').textContent = position === deck.length - 1 ? 'Vezi rezultatul' : 'Următoarea →';
  if (moveFocus) byId('question').focus();
}

function renderReview() {
  const review = byId('review');
  review.replaceChildren();
  const list = byId('only-errors').checked ? missed : deck;
  for (const item of list) {
    const selected = selections.get(item.id);
    const entry = create('details', '', 'card review-item');
    const state = selected === item.a ? 'Corect' : selected ? 'Greșit' : 'Fără răspuns';
    entry.append(create('summary', 'Itemul ' + item.id + ' · ' + state + ' · ' + item.q));
    if (item.image) {
      const image = create('img', '', 'review-image');
      image.src = item.image;
      image.alt = 'Figura itemului ' + item.id;
      image.loading = 'lazy';
      entry.append(image);
    }
    if (selected) entry.append(create('p', 'Ai ales: ' + selected));
    entry.append(create('p', 'Răspuns corect: ' + item.a, 'answer-note'), create('p', item.e));
    review.append(entry);
  }
  if (!list.length) review.append(create('p', 'Toate răspunsurile sunt corecte.'));
}

function finish() {
  missed = deck.filter(item => selections.get(item.id) !== item.a);
  const correct = deck.length - missed.length;
  byId('score').textContent = correct + ' din ' + deck.length + ' corecte';
  byId('score-detail').textContent = Math.round(100 * correct / deck.length) + '% · ' + (deck.length - selections.size) + ' fără răspuns';
  byId('retry').disabled = !missed.length;
  byId('only-errors').checked = false;
  try { localStorage.setItem('biofizica-last', JSON.stringify({ correct, total: deck.length })); } catch {}
  loadHistory();
  show('results');
  renderReview();
  byId('score').focus();
}

byId('start').onclick = () => {
  const number = byId('item');
  if (!number.reportValidity()) return;
  if (number.value) {
    const match = items.find(item => item.id === Number(number.value));
    if (match) begin([match], 'study');
    return;
  }
  const pool = items.filter(item => theme < 0 || item.topic === theme);
  const size = byId('size').value;
  begin(shuffle(pool).slice(0, size === 'all' ? pool.length : Number(size)), byId('mode').value);
};
byId('home-back').onclick = byId('result-home').onclick = () => show('home');
byId('back').onclick = () => { position--; renderQuestion(); };
byId('next').onclick = () => {
  if (position + 1 === deck.length) finish();
  else { position++; renderQuestion(); window.scrollTo(0, 0); }
};
byId('check').onclick = () => { checked.add(deck[position].id); renderQuestion(false); byId('next').focus(); };
byId('retry').onclick = () => begin(shuffle(missed), 'study');
byId('only-errors').onchange = renderReview;
byId('options').onsubmit = event => event.preventDefault();
const full = byId('full');
if (!document.fullscreenEnabled) full.hidden = true;
full.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { full.hidden = true; }
};
document.addEventListener('fullscreenchange', () => {
  full.textContent = document.fullscreenElement ? 'Ieși din ecran complet' : 'Ecran complet';
});
updateTopics();
loadHistory();
