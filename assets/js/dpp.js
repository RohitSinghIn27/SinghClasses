/**
 * Generic DPP Engine
 * This file contains zero hardcoded question content.
 * All question text, choices, explanations, and patterns are read dynamically
 * from data-* attributes inside index.html.
 */

const state = {
  scores: {},
  attempted: {},
  subjective: {},
  weaknesses: new Set()
};

function getStageCompletionStatus() {
  const s1 = state.attempted.q1 && state.attempted.q2 && state.attempted.q3 && state.attempted.q4;
  const s2 = state.attempted.q5;
  const s3 = state.attempted['6a'] && state.attempted['6b'] && state.attempted['6c'] && state.attempted['6d'] && state.attempted['6e'];
  const s4 = state.subjective.q7 && state.subjective.q8;
  const s5 = state.subjective.q9 && state.subjective.q10;
  return [s1, s2, s3, s4, s5];
}

function updateStageSequence() {
  const status = getStageCompletionStatus();
  let recommendedIdx = status.findIndex(d => !d);
  if (recommendedIdx === -1) recommendedIdx = 5;

  for (let i = 1; i <= 5; i++) {
    const idx = i - 1;
    const wrapper = document.getElementById(`stage-${i}`);
    const pill = document.getElementById(`stage-pill-${i}`);
    const step = document.getElementById(`rail-step-${i}`);
    const rStatus = document.getElementById(`rail-status-${i}`);
    const banner = document.getElementById(`advisory-stage-${i}`);

    wrapper.classList.remove('state-complete', 'state-recommended', 'state-available');
    step.classList.remove('state-complete', 'state-recommended', 'state-available');
    pill.className = 'stage-state-pill';

    if (status[idx]) {
      wrapper.classList.add('state-complete');
      step.classList.add('state-complete');
      pill.classList.add('pill-complete');
      pill.innerHTML = '✅ Complete';
      rStatus.innerText = '✓';
      if (banner) banner.style.display = 'none';
    } else if (idx === recommendedIdx) {
      wrapper.classList.add('state-recommended');
      step.classList.add('state-recommended');
      pill.classList.add('pill-recommended');
      pill.innerHTML = '▶ Recommended next';
      rStatus.innerText = '▶';
      if (banner) banner.style.display = status.slice(0, idx).some(d => !d) ? 'flex' : 'none';
    } else {
      wrapper.classList.add('state-available');
      step.classList.add('state-available');
      pill.classList.add('pill-available');
      pill.innerHTML = '○ Available';
      rStatus.innerText = '○';
      if (banner) banner.style.display = status.slice(0, idx).some(d => !d) ? 'flex' : 'none';
    }
  }
}

function jumpToStage(num) {
  const el = document.getElementById(`stage-${num}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function jumpToQuestion(qId) {
  const el = document.getElementById(qId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('active-target');
  setTimeout(() => el.classList.remove('active-target'), 1200);
}

// Handles any MCQ dynamically by reading data-* attributes from the question card
function submitMCQ(btn, selectedIdx) {
  const card = btn.closest('.question-card');
  const correctIdx = parseInt(card.getAttribute('data-correct'), 10);
  const qid = card.getAttribute('data-qid');
  const concept = card.getAttribute('data-concept');
  const why = card.getAttribute('data-why');
  const trap = card.getAttribute('data-trap');
  const remember = card.getAttribute('data-remember');
  const isCorrect = (selectedIdx === correctIdx);

  card.querySelectorAll('.mcq-opt').forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIdx) b.classList.add('is-correct');
    else if (idx === selectedIdx) b.classList.add('is-wrong');
  });

  state.scores[qid] = isCorrect ? 1 : 0;
  state.attempted[qid] = true;
  document.getElementById(`rail-${qid}`).className = `q-node-bullet ${isCorrect ? 'correct' : 'incorrect'}`;

  const fb = document.getElementById(`feedback-${qid}`);
  fb.className = `pedagogical-feedback ${isCorrect ? 'correct-feedback' : 'wrong-feedback'} open`;
  fb.innerHTML = `
    <div class="fb-status-headline">${isCorrect ? '✓ Correct Answer' : '✗ Needs Attention'}</div>
    <div class="fb-point"><strong>Why:</strong> <span>${why}</span></div>
    <div class="fb-trap-highlight">⚠️ <strong>Trap:</strong> ${trap}</div>
    <div class="fb-point"><strong>Remember:</strong> <span>${remember}</span></div>
  `;

  if (!isCorrect) state.weaknesses.add(concept);
  else state.weaknesses.delete(concept);
  
  updateProgressMetrics();
  updateStageSequence();
}

// Dynamically validates all inputs inside Question 5 using data-match
function validateBlanksQ5() {
  const inputs = document.querySelectorAll('#item-q5 input[data-match]');
  let score = 0;

  inputs.forEach((input) => {
    const pattern = new RegExp(input.getAttribute('data-match'), 'i');
    const isMatch = pattern.test(input.value.trim());
    input.className = `code-input-field ${isMatch ? 'correct' : 'wrong'}`;
    if (isMatch) score += 1;
  });

  state.scores.q5 = score;
  state.attempted.q5 = true;
  document.getElementById('rail-q5').className = `q-node-bullet ${score === inputs.length ? 'correct' : (score > 0 ? 'attempted' : 'incorrect')}`;

  const fb = document.getElementById('feedback-q5');
  fb.className = 'pedagogical-feedback neutral-feedback open';

  if (score < inputs.length) state.weaknesses.add("Default I/O Parameters & input() types");
  else state.weaknesses.delete("Default I/O Parameters & input() types");

  updateProgressMetrics();
  updateStageSequence();
}

// Dynamically validates prediction inputs using data-match
function verifyPrediction(inputId) {
  const input = document.getElementById(inputId);
  const pattern = new RegExp(input.getAttribute('data-match'), 'i');
  const subKey = input.getAttribute('data-sub');
  const concept = input.getAttribute('data-concept');
  const isCorrect = pattern.test(input.value.trim());

  input.className = `code-input-field ${isCorrect ? 'correct' : 'wrong'}`;
  state.scores[subKey] = isCorrect ? 1 : 0;
  state.attempted[subKey] = true;

  const fb = document.getElementById(`feedback-${subKey}`);
  fb.className = `pedagogical-feedback ${isCorrect ? 'correct-feedback' : 'wrong-feedback'} open`;
  fb.innerHTML = isCorrect ? 
    `<div class="fb-status-headline">✓ Spot on! Correctly evaluated ${concept}.</div>` : 
    `<div class="fb-status-headline">✗ Re-evaluate operator rules for: ${concept}.</div>`;

  if (!isCorrect) state.weaknesses.add(concept); 
  else state.weaknesses.delete(concept);

  const subkeys = ['6a', '6b', '6c', '6d', '6e'];
  const correctCount = subkeys.filter(k => state.scores[k] === 1).length;
  const rail6 = document.getElementById('rail-q6');
  if (correctCount === subkeys.length) rail6.className = "q-node-bullet correct";
  else if (correctCount > 0) rail6.className = "q-node-bullet attempted";

  updateProgressMetrics();
  updateStageSequence();
}

function markSubjectiveReviewed(qKey, btnId, railId) {
  const btn = document.getElementById(btnId);
  const rail = document.getElementById(railId);
  state.subjective[qKey] = !state.subjective[qKey];
  const isDone = state.subjective[qKey];
  btn.classList.toggle('checked', isDone);
  btn.innerText = isDone ? "✓ Reviewed & Mastered" : "✓ Mark Self-Reviewed";
  rail.className = isDone ? "q-node-bullet attempted" : "q-node-bullet";
  updateProgressMetrics();
  updateStageSequence();
}

function toggleHelp(id) {
  document.getElementById(id).classList.toggle('open');
}

function updateProgressMetrics() {
  const objKeys = ['q1', 'q2', 'q3', 'q4', 'q5', '6a', '6b', '6c', '6d', '6e'];
  const objSum = objKeys.reduce((sum, key) => sum + (state.scores[key] || 0), 0);
  const pct = Math.round((objSum / 12) * 100);

  const totalMarks = objSum + (Object.values(state.subjective).filter(Boolean).length * 2);
  document.getElementById('final-marks-box').innerText = `${totalMarks} / 20 Marks`;
  document.getElementById('final-acc-box').innerText = `${pct}% Accuracy`;

  const weakBox = document.getElementById('weak-topics-list');
  weakBox.innerText = state.weaknesses.size > 0 ? Array.from(state.weaknesses).join(', ') : "Clean sheet! No recurring traps flagged today.";

  const strongBox = document.getElementById('strong-topics-list');
  const mastered = [];
  document.querySelectorAll('.question-card[data-concept]').forEach(card => {
    const qid = card.getAttribute('data-qid');
    if (state.scores[qid] === 1) mastered.push(card.getAttribute('data-concept'));
  });
  if (mastered.length > 0) strongBox.innerText = mastered.join(', ');
}

function toggleSheetMenu(e) {
  e.stopPropagation();
  document.getElementById('sheet-menu').classList.toggle('open');
}

window.addEventListener('click', () => {
  const sheetMenu = document.getElementById('sheet-menu');
  if (sheetMenu) sheetMenu.classList.remove('open');
});

function switchResource(key, stamp, title) {
  document.getElementById('header-stamp-label').innerText = stamp;
  document.getElementById('header-sheet-title').innerText = title;
  document.getElementById('sheet-menu').classList.remove('open');
  jumpToStage(1);
}

// Initial setup
updateStageSequence();