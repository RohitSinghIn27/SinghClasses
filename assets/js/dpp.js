/**
 * Generic DPP Engine — Refined for Class 11 CS Practice
 * Handles dynamic data-* validation, persistent storage, resilient DOM checks,
 * strict CBSE output verification, and live scoring.
 */

const STORAGE_KEY = 'class11_cs_dpp01_state';

let state = {
  scores: {},
  attempted: {},
  subjective: {},
  weaknesses: []
};

// Initialize State from LocalStorage
function loadSavedState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
      restoreDOMFromState();
    } catch (e) {
      console.warn("Error restoring session:", e);
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getStageCompletionStatus() {
  const s1 = Boolean(state.attempted.q1 !== undefined && state.attempted.q2 !== undefined && state.attempted.q3 !== undefined && state.attempted.q4 !== undefined);
  const s2 = Boolean(state.attempted.q5);
  const s3 = Boolean(state.attempted['6a'] && state.attempted['6b'] && state.attempted['6c'] && state.attempted['6d'] && state.attempted['6e']);
  const s4 = Boolean(state.subjective.q7 && state.subjective.q8);
  const s5 = Boolean(state.subjective.q9 && state.subjective.q10);
  return [s1, s2, s3, s4, s5];
}

// Stage Progression (Supports both full layout and headless rails)
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

    if (wrapper) wrapper.classList.remove('state-complete', 'state-recommended', 'state-available');
    if (step) step.classList.remove('state-complete', 'state-recommended', 'state-available');
    if (pill) pill.className = 'stage-state-pill';

    if (status[idx]) {
      if (wrapper) wrapper.classList.add('state-complete');
      if (step) step.classList.add('state-complete');
      if (pill) { pill.classList.add('pill-complete'); pill.innerHTML = '✅ Complete'; }
      if (rStatus) rStatus.innerText = '✓';
    } else if (idx === recommendedIdx) {
      if (wrapper) wrapper.classList.add('state-recommended');
      if (step) step.classList.add('state-recommended');
      if (pill) { pill.classList.add('pill-recommended'); pill.innerHTML = '▶ In Progress'; }
      if (rStatus) rStatus.innerText = '▶';
    } else {
      if (wrapper) wrapper.classList.add('state-available');
      if (step) step.classList.add('state-available');
      if (pill) { pill.classList.add('pill-available'); pill.innerHTML = '○ Available'; }
      if (rStatus) rStatus.innerText = '○';
    }
  }
}

function toggleStageAccordion(num) {
  const body = document.getElementById(`stage-body-${num}`);
  if (body) body.classList.toggle('collapsed');
}

function jumpToStage(num) {
  const el = document.getElementById(`stage-${num}`);
  const body = document.getElementById(`stage-body-${num}`);
  if (body && body.classList.contains('collapsed')) body.classList.remove('collapsed');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function jumpToQuestion(qId) {
  const el = document.getElementById(qId);
  if (!el) return;
  const stage = el.closest('.stage-wrapper');
  if (stage) {
    const body = stage.querySelector('.stage-body');
    if (body && body.classList.contains('collapsed')) body.classList.remove('collapsed');
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('active-target');
  setTimeout(() => el.classList.remove('active-target'), 1200);
}

// Dynamic MCQ Submission
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
  state.attempted[qid] = selectedIdx;

  const rail = document.getElementById(`rail-${qid}`);
  if (rail) rail.className = `q-node-bullet ${isCorrect ? 'correct' : 'incorrect'}`;

  const fb = document.getElementById(`feedback-${qid}`);
  if (fb) {
    fb.className = `pedagogical-feedback ${isCorrect ? 'correct-feedback' : 'wrong-feedback'} open`;
    fb.innerHTML = `
      <div class="fb-status-headline">${isCorrect ? '✓ Correct Answer' : '✗ Needs Attention'}</div>
      <div class="fb-point"><strong>Why:</strong> <span>${why}</span></div>
      <div class="fb-trap-highlight">⚠️ <strong>Trap:</strong> ${trap}</div>
      <div class="fb-point"><strong>Remember:</strong> <span>${remember}</span></div>
    `;
  }

  updateWeakness(concept, !isCorrect);
  updateProgressMetrics();
  updateStageSequence();
  saveState();
}

// Validate Q5 Underline Worksheet Blanks (Scaled to 3 Marks)
function validateBlanksQ5() {
  const inputs = document.querySelectorAll('#item-q5 input[data-match]');
  let correctCount = 0;

  inputs.forEach((input) => {
    const pattern = new RegExp(input.getAttribute('data-match'), 'i');
    const isMatch = pattern.test(input.value.trim());
    input.className = `worksheet-blank ${isMatch ? 'correct' : 'wrong'}`;
    if (isMatch) correctCount += 1;
  });

  // 4 blanks evaluated across 3 total marks
  const marksAwarded = (correctCount === 4) ? 3 : (correctCount * 0.75);
  state.scores.q5 = marksAwarded;
  state.attempted.q5 = Array.from(inputs).map(i => i.value);

  const rail = document.getElementById('rail-q5');
  if (rail) rail.className = `q-node-bullet ${correctCount === inputs.length ? 'correct' : (correctCount > 0 ? 'attempted' : 'incorrect')}`;

  const fb = document.getElementById('feedback-q5');
  if (fb) fb.className = 'pedagogical-feedback neutral-feedback open';

  updateWeakness("Default I/O Parameters & input() Types", correctCount < inputs.length);
  updateProgressMetrics();
  updateStageSequence();
  saveState();
}

// Case-Sensitive Prediction Verification for REPL Prompts
function verifyPrediction(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const pattern = new RegExp(input.getAttribute('data-match')); // Strict Case-Sensitivity
  const subKey = input.getAttribute('data-sub');
  const concept = input.getAttribute('data-concept');
  const isCorrect = pattern.test(input.value.trim());

  input.className = `repl-field ${isCorrect ? 'correct' : 'wrong'}`;
  state.scores[subKey] = isCorrect ? 1 : 0;
  state.attempted[subKey] = input.value;

  const fb = document.getElementById(`feedback-${subKey}`);
  if (fb) {
    fb.className = `pedagogical-feedback ${isCorrect ? 'correct-feedback' : 'wrong-feedback'} open`;
    fb.innerHTML = isCorrect ? 
      `<div class="fb-status-headline">✓ Accurate Console Output: ${concept}</div>` : 
      `<div class="fb-status-headline">✗ Output mismatch for ${concept}. Python is strictly case-sensitive.</div>`;
  }

  updateWeakness(concept, !isCorrect);

  const subkeys = ['6a', '6b', '6c', '6d', '6e'];
  const correctCount = subkeys.filter(k => state.scores[k] === 1).length;
  const rail6 = document.getElementById('rail-q6');
  if (rail6) {
    if (correctCount === subkeys.length) rail6.className = "q-node-bullet correct";
    else if (correctCount > 0) rail6.className = "q-node-bullet attempted";
  }

  updateProgressMetrics();
  updateStageSequence();
  saveState();
}

// Subjective Self-Review
function markSubjectiveReviewed(qKey, btnId, railId) {
  const btn = document.getElementById(btnId);
  const rail = document.getElementById(railId);
  state.subjective[qKey] = !state.subjective[qKey];
  const isDone = state.subjective[qKey];

  if (btn) {
    btn.classList.toggle('checked', isDone);
    btn.innerText = isDone ? "✓ Reviewed & Mastered" : "✓ Mark Self-Reviewed";
  }
  if (rail) rail.className = isDone ? "q-node-bullet correct" : "q-node-bullet";

  updateProgressMetrics();
  updateStageSequence();
  saveState();
}

function toggleHelp(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function updateWeakness(topic, isWeak) {
  const idx = state.weaknesses.indexOf(topic);
  if (isWeak && idx === -1) state.weaknesses.push(topic);
  else if (!isWeak && idx !== -1) state.weaknesses.splice(idx, 1);
}

// Global Progress Metrics Calculation (20 Marks Total)
function updateProgressMetrics() {
  const q1_4 = ['q1', 'q2', 'q3', 'q4'].reduce((sum, k) => sum + (state.scores[k] || 0), 0);
  const q5 = (state.scores.q5 || 0);
  const q6 = ['6a', '6b', '6c', '6d', '6e'].reduce((sum, k) => sum + (state.scores[k] || 0), 0);
  const subj = Object.values(state.subjective).filter(Boolean).length * 2;

  const totalEarned = Math.min(20, Math.round((q1_4 + q5 + q6 + subj) * 10) / 10);
  const pct = Math.round((totalEarned / 20) * 100);

  const headerScore = document.getElementById('live-header-score');
  if (headerScore) headerScore.innerText = `⚡ ${totalEarned}/20`;

  const marksBox = document.getElementById('final-marks-box');
  const accBox = document.getElementById('final-acc-box');
  if (marksBox) marksBox.innerText = `${totalEarned} / 20 Marks`;
  if (accBox) accBox.innerText = `${pct}% Accuracy`;

  const weakBox = document.getElementById('weak-topics-list');
  if (weakBox) {
    weakBox.innerText = state.weaknesses.length > 0 ? state.weaknesses.join(', ') : "Clean sheet! No conceptual errors flagged today.";
  }

  const strongBox = document.getElementById('strong-topics-list');
  if (strongBox) {
    const mastered = [];
    document.querySelectorAll('.question-card[data-concept]').forEach(card => {
      const qid = card.getAttribute('data-qid');
      if (state.scores[qid] >= 1 || state.subjective[qid]) {
        mastered.push(card.getAttribute('data-concept'));
      }
    });
    if (mastered.length > 0) strongBox.innerText = Array.from(new Set(mastered)).join(', ');
  }

  const allComplete = getStageCompletionStatus().every(Boolean);
  const banner = document.getElementById('completion-section');
  if (banner) {
    if (allComplete) banner.classList.add('visible');
    else banner.classList.remove('visible');
  }
}

// Restore Session State on Page Load
function restoreDOMFromState() {
  ['q1', 'q2', 'q3', 'q4'].forEach(qid => {
    if (state.attempted[qid] !== undefined) {
      const card = document.getElementById(`item-${qid}`);
      if (card) {
        const selectedIdx = state.attempted[qid];
        const correctIdx = parseInt(card.getAttribute('data-correct'), 10);
        card.querySelectorAll('.mcq-opt').forEach((btn, idx) => {
          btn.disabled = true;
          if (idx === correctIdx) btn.classList.add('is-correct');
          else if (idx === selectedIdx) btn.classList.add('is-wrong');
        });
        const rail = document.getElementById(`rail-${qid}`);
        if (rail) rail.className = `q-node-bullet ${selectedIdx === correctIdx ? 'correct' : 'incorrect'}`;
      }
    }
  });

  if (state.attempted.q5 && Array.isArray(state.attempted.q5)) {
    const inputs = document.querySelectorAll('#item-q5 input[data-match]');
    inputs.forEach((input, i) => {
      input.value = state.attempted.q5[i] || '';
      const pattern = new RegExp(input.getAttribute('data-match'), 'i');
      if (input.value) input.className = `worksheet-blank ${pattern.test(input.value.trim()) ? 'correct' : 'wrong'}`;
    });
  }

  ['6a', '6b', '6c', '6d', '6e'].forEach(k => {
    if (state.attempted[k]) {
      const input = document.getElementById(`pred-${k}`);
      if (input) {
        input.value = state.attempted[k];
        const pattern = new RegExp(input.getAttribute('data-match'));
        input.className = `repl-field ${pattern.test(input.value.trim()) ? 'correct' : 'wrong'}`;
      }
    }
  });

  ['q7', 'q8', 'q9', 'q10'].forEach(k => {
    if (state.subjective[k]) {
      const btn = document.getElementById(`btn-review-${k}`);
      const rail = document.getElementById(`rail-${k}`);
      if (btn) { btn.classList.add('checked'); btn.innerText = "✓ Reviewed & Mastered"; }
      if (rail) rail.className = "q-node-bullet correct";
    }
  });

  updateProgressMetrics();
  updateStageSequence();
}

function resetPracticeSheet() {
  if (confirm("Reset all answers and re-attempt DPP #01?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function copySnippet(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Snippet copied to clipboard!");
  });
}

function toggleSheetMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('sheet-menu');
  if (menu) menu.classList.toggle('open');
}

window.addEventListener('click', () => {
  const sheetMenu = document.getElementById('sheet-menu');
  if (sheetMenu) sheetMenu.classList.remove('open');
});

function switchResource(key, stamp, title) {
  document.getElementById('header-stamp-label').innerText = stamp;
  document.getElementById('header-sheet-title').innerText = title;
  const sheetMenu = document.getElementById('sheet-menu');
  if (sheetMenu) sheetMenu.classList.remove('open');
  jumpToStage(1);
}

// Enter-Key Event Bindings
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  updateStageSequence();

  document.querySelectorAll('.repl-field').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyPrediction(input.id);
    });
  });

  document.querySelectorAll('#item-q5 input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') validateBlanksQ5();
    });
  });
});