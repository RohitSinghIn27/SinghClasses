let strokes = [], redoStack = [], appMode = 'read', hideTimer = null;
let currentTool = 'pen', strokeColor = '#dc2626', baseWidth = 2.5, currentStroke = null;
let timerSeconds = 0, timerInterval = null;
let userAnswers = {};
let toastTimeout = null;
let totalPaperMarks = 0;

// Paper Width Stepping Configuration
const PAPER_WIDTH_STEPS = [760, 860, 980, 1100, 1240];
let currentWidthIndex = 1; // Default: 860px

const storageKey = `singhclasses_${window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_')}_notes`;
const saveStrokesToStorage = () => { try { localStorage.setItem(storageKey, JSON.stringify(strokes)); } catch(e){} };
const loadStrokesFromStorage = () => { try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch(e) { return []; } };

const annotationBar = document.getElementById('annotationBar');
const timerDisplay = document.getElementById('timerDisplay');
const canvas = document.getElementById('drawingCanvas');
const container = document.getElementById('paperContainer');
const ctx = canvas?.getContext('2d');
const toastEl = document.getElementById('appToast');

function showToast(msg) {
  if (!toastEl) return;
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function changePaperWidth(delta) {
  const nextIndex = currentWidthIndex + delta;
  if (nextIndex < 0 || nextIndex >= PAPER_WIDTH_STEPS.length) return;

  currentWidthIndex = nextIndex;
  const newWidth = PAPER_WIDTH_STEPS[currentWidthIndex];
  const paperEl = document.getElementById('paperContainer');

  if (paperEl) {
    paperEl.style.maxWidth = `${newWidth}px`;
    showToast(`Page Width: ${newWidth}px`);

    setTimeout(() => {
      if (typeof resizeCanvas === 'function') {
        resizeCanvas();
      }
    }, 230);
  }
}

/* Practice Stopwatch Engine (Counts up 00:00) */
function startStopwatch() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetStopwatch() {
  pauseStopwatch();
  timerSeconds = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  if (!timerDisplay) return;
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function initEngine() {
  const currentYearEl = document.getElementById('current-year');
  if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

  const qBlocks = document.querySelectorAll('.question-block');
  const nav = document.getElementById('dynamicNavPills');
  totalPaperMarks = 0;

  if (nav && qBlocks.length) {
    let pillsHtml = '';
    qBlocks.forEach(block => {
      const qId = block.id;
      const numBadge = block.querySelector('.q-number-badge');
      const numText = numBadge ? numBadge.textContent.trim() : qId;
      const marks = parseInt(block.getAttribute('data-marks') || '1', 10);
      totalPaperMarks += marks;

      pillsHtml += `<button class="nav-pill" id="pill_${qId}" onclick="jumpToQuestion('${qId}')">${numText}</button>`;

      const opts = block.querySelectorAll('.exam-opt');
      opts.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
          radio.addEventListener('change', () => {
            selectMCQAnswer(qId, radio.value, block.getAttribute('data-correct') || '');
          });
        }
      });

      const subInput = block.querySelector('.practice-subjective-input');
      if (subInput) {
        subInput.addEventListener('input', (e) => {
          const pill = document.getElementById(`pill_${qId}`);
          if (pill) pill.classList.toggle('attempted', e.target.value.trim().length > 0);
        });
      }
    });

    pillsHtml += `<button class="btn-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">↑</button>`;
    nav.innerHTML = pillsHtml;
  }

  strokes = loadStrokesFromStorage();
  updateScoreSummary();
  resizeCanvas();
  highlightActivePillOnScroll();
}

function jumpToQuestion(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Instant evaluation on selection in Practice Mode */
function selectMCQAnswer(qId, selectedVal, correctVal) {
  userAnswers[qId] = { selected: selectedVal, correct: correctVal };
  const block = document.getElementById(qId);
  if (!block) return;

  block.querySelectorAll('.exam-opt').forEach(opt => {
    const radio = opt.querySelector('input[type="radio"]');
    opt.classList.toggle('selected', radio && radio.value === selectedVal);
  });

  if (appMode === 'practice') {
    const isRight = selectedVal === correctVal;

    block.querySelectorAll('.exam-opt').forEach(opt => {
      const radio = opt.querySelector('input[type="radio"]');
      if (!radio) return;
      if (radio.value === correctVal) {
        opt.classList.add('correct-answer');
      } else if (radio.value === selectedVal) {
        opt.classList.add('incorrect-answer');
      }
      radio.disabled = true;
    });

    const expBox = document.getElementById(`exp_${qId}`);
    if (expBox) expBox.classList.add('show');

    const pill = document.getElementById(`pill_${qId}`);
    if (pill) {
      pill.classList.remove('attempted');
      pill.classList.toggle('correct', isRight);
      pill.classList.toggle('incorrect', !isRight);
    }
  } else {
    const pill = document.getElementById(`pill_${qId}`);
    if (pill) pill.classList.add('attempted');
  }

  updateScoreSummary();
}

function toggleExplanation(qId) {
  const box = document.getElementById(`exp_${qId}`);
  if (!box) return;
  const isOpen = box.classList.toggle('show');
  const block = document.getElementById(qId);
  if (!block) return;

  const correctVal = block.getAttribute('data-correct');
  const type = block.getAttribute('data-type') || '';

  if (isOpen && type.includes('mcq')) {
    const pill = document.getElementById(`pill_${qId}`);
    const userChoice = userAnswers[qId]?.selected;

    block.querySelectorAll('.exam-opt').forEach(opt => {
      const radio = opt.querySelector('input[type="radio"]');
      if (!radio) return;
      if (radio.value === correctVal) {
        opt.classList.add('correct-answer');
      } else if (radio.value === userChoice) {
        opt.classList.add('incorrect-answer');
      }
    });

    if (userChoice && pill) {
      const isRight = userChoice === correctVal;
      pill.classList.remove('attempted');
      pill.classList.toggle('correct', isRight);
      pill.classList.toggle('incorrect', !isRight);
    }
  }
  updateScoreSummary();
}

function updateScoreSummary() {
  let gained = 0;
  document.querySelectorAll('.question-block').forEach(block => {
    const qId = block.id;
    const correctVal = block.getAttribute('data-correct');
    const marks = parseInt(block.getAttribute('data-marks') || '1', 10);
    if (correctVal && userAnswers[qId]?.selected === correctVal) {
      gained += marks;
    }
  });

  const scoreEl = document.getElementById('scoreDisplay');
  if (scoreEl) scoreEl.textContent = `Score: ${gained}/${totalPaperMarks} Marks`;
}

function setAppMode(m) {
  if (m === 'annotate' && appMode === 'annotate') {
    annotationBar?.classList.toggle('visible');
    return;
  }
  appMode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.body.classList.remove('body-read', 'body-practice', 'body-annotate');
  document.body.classList.add(`body-${m}`);

  annotationBar?.classList.remove('visible');
  canvas?.classList.remove('pen-active');

  if (m === 'read') {
    document.getElementById('btnModeRead')?.classList.add('active');
    pauseStopwatch();
  } else if (m === 'practice') {
    document.getElementById('btnModePractice')?.classList.add('active');
    startStopwatch(); // Auto-starts stopwatch on entering practice mode
  } else if (m === 'annotate') {
    document.getElementById('btnModeAnnotate')?.classList.add('active');
    annotationBar?.classList.add('visible');
    canvas?.classList.add('pen-active');
    pauseStopwatch();
  }
}

function togglePaperTheme() {
  document.body.classList.toggle('dark-paper');
}

function autoHideAnnotationBar(delay = 280) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => annotationBar?.classList.remove('visible'), delay);
}

function copySnippet(id) {
  const codeBox = document.getElementById(`code_${id}`);
  if (codeBox) {
    navigator.clipboard.writeText(codeBox.innerText).then(() => {
      showToast("Code copied to clipboard!");
    });
  }
}

function toggleSnippetOutput(id) {
  const outBox = document.getElementById(`out_${id}`);
  if (outBox) outBox.classList.toggle('show');
}

/* Canvas Drawing Engine */
function resizeCanvas() {
  if (!canvas || !container) return;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  redrawAllStrokes();
}
window.addEventListener('resize', resizeCanvas);

function redrawAllStrokes() {
  if (!ctx || !canvas) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  strokes.forEach(renderSmoothStroke);
  ctx.restore();
}

function renderSmoothStroke(stroke) {
  if (!stroke.points?.length || !ctx) return;
  ctx.save();
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.tool === 'highlighter') {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * 5;
    ctx.globalAlpha = 0.32;
    ctx.globalCompositeOperation = 'multiply';
  } else if (stroke.tool === 'eraser') {
    ctx.lineWidth = stroke.width * 7;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

const getCoords = e => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, pressure: e.pressure > 0 ? e.pressure : 0.5 };
};

if (canvas) {
  canvas.addEventListener('pointerdown', e => {
    if (appMode !== 'annotate') return;
    annotationBar?.classList.remove('visible');
    const p = getCoords(e);
    const w = (e.pointerType === 'pen' && e.pressure > 0) ? baseWidth * (0.5 + e.pressure * 0.9) : baseWidth;
    currentStroke = { tool: currentTool, color: strokeColor, width: w, points: [p] };
    strokes.push(currentStroke);
    redoStack = [];
    canvas.setPointerCapture(e.pointerId);
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    renderSmoothStroke(currentStroke);
    ctx.restore();
  });

  canvas.addEventListener('pointermove', e => {
    if (currentStroke && appMode === 'annotate') {
      currentStroke.points.push(getCoords(e));
      redrawAllStrokes();
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (currentStroke) {
      canvas.releasePointerCapture(e.pointerId);
      currentStroke = null;
      saveStrokesToStorage();
    }
  });

  canvas.addEventListener('pointercancel', () => currentStroke = null);
}

function setDrawingTool(t) {
  currentTool = t;
  document.querySelectorAll('.tool-tab').forEach(el => el.classList.remove('active'));
  const tab = t === 'pen' ? 'tabPen' : t === 'highlighter' ? 'tabHighlight' : 'tabEraser';
  document.getElementById(tab)?.classList.add('active');
  autoHideAnnotationBar();
}

function setStrokeColor(c, el) {
  strokeColor = c;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  if (currentTool === 'eraser') setDrawingTool('pen');
  autoHideAnnotationBar();
}

const setStrokeSize = v => baseWidth = parseFloat(v);
function undoStroke() { if (strokes.length) { redoStack.push(strokes.pop()); saveStrokesToStorage(); redrawAllStrokes(); } }
function redoStroke() { if (redoStack.length) { strokes.push(redoStack.pop()); saveStrokesToStorage(); redrawAllStrokes(); } }

/* In-Browser Modal Clear Handler */
function clearEverythingNow() {
  openClearModal();
}

function openClearModal() {
  const modal = document.getElementById('clearConfirmModal');
  if (modal) modal.classList.add('open');
}

function closeClearModal() {
  const modal = document.getElementById('clearConfirmModal');
  if (modal) modal.classList.remove('open');
}

function confirmAndClearAll() {
  closeClearModal();
  strokes = [];
  redoStack = [];
  saveStrokesToStorage();
  redrawAllStrokes();
  userAnswers = {};
  resetStopwatch();
  if (appMode === 'practice') startStopwatch();
  
  document.querySelectorAll('input[type="radio"]').forEach(r => {
    r.checked = false;
    r.disabled = false;
  });
  document.querySelectorAll('.exam-opt').forEach(opt => opt.classList.remove('selected', 'correct-answer', 'incorrect-answer'));
  document.querySelectorAll('.practice-subjective-input').forEach(t => t.value = '');
  document.querySelectorAll('.terminal-output, .explanation-box').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.nav-pill').forEach(pill => pill.classList.remove('attempted', 'correct', 'incorrect'));
  updateScoreSummary();
  showToast("All annotations, responses, and time cleared.");
}

function highlightActivePillOnScroll() {
  const qBlocks = document.querySelectorAll('.question-block');
  const scrollPos = window.scrollY + 100;
  qBlocks.forEach(block => {
    const top = block.offsetTop;
    const height = block.offsetHeight;
    const id = block.id;
    const pill = document.getElementById(`pill_${id}`);
    if (pill && scrollPos >= top && scrollPos < top + height) {
      document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    }
  });

  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const progressBar = document.getElementById('scrollProgressBar');
  if (progressBar) progressBar.style.width = scrolled + '%';
}
window.addEventListener('scroll', highlightActivePillOnScroll);

function toggleFullscreen() {
  !document.fullscreenElement ? document.documentElement.requestFullscreen().catch(()=>{}) : document.exitFullscreen?.();
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeClearModal();
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redoStroke() : undoStroke();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redoStroke();
  } else if (e.key.toLowerCase() === 's') setAppMode('read');
  else if (e.key.toLowerCase() === 't') setAppMode('practice');
  else if (e.key.toLowerCase() === 'p') appMode === 'annotate' ? annotationBar?.classList.toggle('visible') : setAppMode('annotate');
});

window.addEventListener('DOMContentLoaded', () => {
  initEngine();
  setAppMode('read');
});