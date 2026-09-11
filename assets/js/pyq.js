/* Configuration & Metadata */
const GOOGLE_SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwkN1-eImwPa44VhUWvHS_-mZLsvsObUK-x17LASWTU7FMiyqQCkbvVJgrf8_lNUO0E8Q/exec';

const SESSIONS = ['2025-26', '2024-25', '2023-24', '2022-23'];
const PAPER_METADATA = [
  { id: 'sqp', num: '1', label: 'Sample Paper', tag: 'SQP', badge: 'badge-sqp', title: 'Sample Question Paper (SQP)', desc: 'Official CBSE SQP with Marking Scheme', qp: 'SQP-01', set: 'Set 1', time: '30 Mins', marks: 12 },
  { id: 'main', num: '2', label: 'Main Exam', tag: 'Main', badge: 'badge-main', title: 'CBSE Board Main Paper', desc: 'CBSE Annual Board Examination Paper', qp: '91/1', set: 'Set 91', time: '45 Mins', marks: 15 },
  { id: 'comp', num: '3', label: 'Compartment', tag: 'Comp.', badge: 'badge-comp', title: 'Compartment / Supplementary Paper', desc: 'Supplementary Examination Paper', qp: '91/C', set: 'Set 1', time: '40 Mins', marks: 14 }
];

let currentSession = '2025-26', currentPaperId = 'main', currentWidthIndex = 1;
const PAPER_WIDTHS = [760, 860, 980, 1100, 1240];
let appMode = 'read', currentTool = 'read', strokeColor = '#dc2626', baseWidth = 2.5;
let currentStroke = null, strokes = [], redoStack = [];
let timerSeconds = 0, timerInterval = null, userAnswers = {}, subjectiveAnswers = {}, totalPaperMarks = 0;
let barAutoHideTimer = null, toastTimeout = null, currentPaperRating = 0;

const $ = (id) => document.getElementById(id);
const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);
const paperStorageKey = () => `singhclasses_pyq_${currentSession}_${currentPaperId}`;
const drawingStorageKey = () => `singhclasses_draw_${currentSession}_${currentPaperId}`;
const feedbackStorageKey = () => `singhclasses_feedbacks_${currentSession}_${currentPaperId}`;

function toggleActionsMenu(e) { if (e) e.stopPropagation(); $('actionsOverflowWrapper')?.classList.toggle('open'); }
window.addEventListener('click', (e) => {
  if (!$('actionsOverflowWrapper')?.contains(e.target)) $('actionsOverflowWrapper')?.classList.remove('open');
  if (!$('sessionPickerWrapper')?.contains(e.target)) $('sessionPickerWrapper')?.classList.remove('open');
});

function showToast(msg) {
  const el = $('appToast'); if (!el) return;
  clearTimeout(toastTimeout); el.textContent = msg; el.classList.add('show');
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2400);
}

function changePaperWidth(delta) {
  const next = currentWidthIndex + delta;
  if (next < 0 || next >= PAPER_WIDTHS.length) return;
  currentWidthIndex = next;
  $('paperContainer').style.maxWidth = `${PAPER_WIDTHS[next]}px`;
  showToast(`Width: ${PAPER_WIDTHS[next]}px`);
  setTimeout(resizeCanvas, 240);
}

/* Fullscreen Toggle */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function updateFullscreenIcons() {
  const isFS = !!document.fullscreenElement;
  const iconFS = $('iconFullscreen');
  const iconMin = $('iconMinimize');
  const btn = $('btnFullscreen');
  if (iconFS && iconMin) {
    iconFS.style.display = isFS ? 'none' : 'block';
    iconMin.style.display = isFS ? 'block' : 'none';
  }
  if (btn) btn.title = isFS ? 'Exit Fullscreen' : 'Fullscreen';
}
document.addEventListener('fullscreenchange', updateFullscreenIcons);

/* Dropdown Session Picker */
function renderSessionPicker() {
  const tabsBox = $('sessionTabsContainer'), panelsBox = $('paperPanelsContainer');
  if (!tabsBox || !panelsBox) return;
  tabsBox.innerHTML = SESSIONS.map(s => `<button type="button" class="sess-tab ${s === currentSession ? 'active' : ''}" onclick="switchSessionTab('${s}', this)">${s}</button>`).join('');
  panelsBox.innerHTML = SESSIONS.map(s => `
    <div class="paper-group-panel ${s === currentSession ? 'active' : ''}" id="panel_${s}">
      ${PAPER_METADATA.map(p => `
        <div class="paper-option-item ${p.id === currentPaperId ? 'active' : ''}" onclick="handlePaperSelect('${s}', '${p.id}', this)">
          <span class="paper-num-badge">${p.num}</span>
          <div class="paper-meta">
            <div class="paper-meta-header"><strong>${p.title}</strong><span class="paper-badge ${p.badge}">${p.tag}</span></div>
            <span>${p.desc}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function toggleSessionDropdown(e) { if (e) e.stopPropagation(); $('sessionPickerWrapper')?.classList.toggle('open'); }
function switchSessionTab(session, tabBtn) {
  qsa('.sess-tab').forEach(b => b.classList.remove('active')); tabBtn.classList.add('active');
  qsa('.paper-group-panel').forEach(p => p.classList.remove('active'));
  $(`panel_${session}`)?.classList.add('active');
}

/* Paper Switching With 2.5s Loading Animation */
function handlePaperSelect(session, typeId, itemEl) {
  if (currentSession === session && currentPaperId === typeId) { $('sessionPickerWrapper')?.classList.remove('open'); return; }
  saveCurrentProgress();
  currentSession = session; currentPaperId = typeId;
  qsa('.paper-option-item').forEach(el => el.classList.remove('active')); itemEl.classList.add('active');
  $('sessionPickerWrapper')?.classList.remove('open');

  const meta = PAPER_METADATA.find(p => p.id === typeId) || PAPER_METADATA[0];
  $('currentPaperLabel').textContent = `${session} • ${meta.tag}`;
  $('displaySessionTitle').textContent = `Session: ${session} — Class XII`;
  $('displayCategoryTitle').textContent = meta.title;
  $('displayQpBlock').innerHTML = `Q.P. Code: <strong>${meta.qp}</strong> &nbsp;|&nbsp; Set: <strong>${meta.set}</strong>`;
  $('displayTime').textContent = `Time Allowed: ${meta.time}`;

  const loader = $('paperLoader');
  const bar = $('loaderBarFill');
  const status = $('loaderStatusText');
  if (status) status.textContent = `Loading ${session} • ${meta.tag}...`;

  if (bar) bar.style.width = '0%';
  if (loader) loader.classList.add('active');

  setTimeout(() => { if (bar) bar.style.width = '100%'; }, 50);

  setTimeout(() => {
    if (loader) loader.classList.remove('active');
    if (bar) bar.style.width = '0%';
    restoreSavedProgress();
    initDrawingState();
    loadFeedbackResponses();
    showToast(`Loaded ${session} • ${meta.tag}`);
  }, 2500);
}

/* Initialization From DOM */
function initializeQuestionsFromDOM() {
  const blocks = qsa('.question-block');
  totalPaperMarks = 0;
  blocks.forEach(b => {
    const marks = parseInt(b.getAttribute('data-marks') || '1', 10);
    totalPaperMarks += marks;
  });
  if ($('displayMarks')) $('displayMarks').textContent = `Maximum Marks: ${totalPaperMarks}`;

  const nav = $('dynamicNavPills');
  if (nav && blocks.length > 0) {
    nav.innerHTML = Array.from(blocks).map((b, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<button class="nav-pill ${i === 0 ? 'active' : ''}" id="pill_${b.id}" onclick="jumpTo('${b.id}')">${num}</button>`;
    }).join('');
  }
  const vp = $('pillsViewport'); if (vp) vp.scrollLeft = 0;

  bindQuestionEvents();
  restoreSavedProgress();
  initDrawingState();
  resizeCanvas();
  loadFeedbackResponses();
}

function bindQuestionEvents() {
  qsa('.question-block').forEach(block => {
    block.querySelectorAll('.exam-opt input[type="radio"]').forEach(radio => {
      radio.onchange = () => handleOptionClick(block.id, radio.value);
    });
  });
}

function handleSubjectiveInput(qId) {
  const val = $(`sub_${qId}`)?.value.trim() || '';
  subjectiveAnswers[qId] = val;
  $(`pill_${qId}`)?.classList.toggle('attempted', val.length > 0);
  const btn = $(`btn_sub_${qId}`);
  if (btn) btn.disabled = val.length === 0;
  saveCurrentProgress();
}

function checkSubjectiveSolution(qId) {
  if (appMode !== 'practice') return;
  const val = $(`sub_${qId}`)?.value.trim() || '';
  if (!val) { showToast("Please enter an answer first."); return; }
  $(`exp_${qId}`)?.classList.toggle('show');
}

function handleOptionClick(qId, val) {
  if (appMode !== 'practice') {
    $(qId)?.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    return;
  }
  const block = $(qId), correct = block?.getAttribute('data-correct') || '';
  userAnswers[qId] = { val, correct };

  block.querySelectorAll('.exam-opt').forEach(opt => opt.classList.remove('selected', 'correct-answer', 'incorrect-answer'));
  const selectedOpt = $(`opt_${qId}_${val}`);
  selectedOpt?.classList.add('selected');

  const isCorrect = val === correct;
  if (isCorrect) selectedOpt?.classList.add('correct-answer');
  else {
    selectedOpt?.classList.add('incorrect-answer');
    $(`opt_${qId}_${correct}`)?.classList.add('correct-answer');
  }

  $(`exp_${qId}`)?.classList.add('show');
  const pill = $(`pill_${qId}`);
  if (pill) {
    pill.classList.remove('attempted');
    pill.classList.toggle('correct', isCorrect);
    pill.classList.toggle('incorrect', !isCorrect);
  }
  updateLiveScore();
  saveCurrentProgress();
}

function updateLiveScore() {
  let score = 0;
  qsa('.question-block').forEach(b => {
    const cor = b.getAttribute('data-correct');
    const marks = parseInt(b.getAttribute('data-marks') || '1', 10);
    if (cor && userAnswers[b.id]?.val === cor) score += marks;
  });
  if ($('scoreDisplay')) $('scoreDisplay').textContent = `Live Score: ${score}/${totalPaperMarks}`;
  const savedBest = parseInt(localStorage.getItem(`${paperStorageKey()}_best`) || '0', 10);
  if (score > savedBest) {
    localStorage.setItem(`${paperStorageKey()}_best`, score);
    if ($('bestScoreDisplay')) $('bestScoreDisplay').textContent = `Best: ${score}/${totalPaperMarks}`;
  } else if ($('bestScoreDisplay')) {
    $('bestScoreDisplay').textContent = `Best: ${savedBest}/${totalPaperMarks}`;
  }
}

function saveCurrentProgress() {
  localStorage.setItem(paperStorageKey(), JSON.stringify({ userAnswers, subjectiveAnswers, timerSeconds, lastSaved: Date.now() }));
}

function restoreSavedProgress() {
  userAnswers = {}; subjectiveAnswers = {}; timerSeconds = 0;
  const raw = localStorage.getItem(paperStorageKey());
  const bestScore = localStorage.getItem(`${paperStorageKey()}_best`);
  if ($('bestScoreDisplay')) $('bestScoreDisplay').textContent = `Best: ${bestScore !== null ? bestScore : '--'}/${totalPaperMarks}`;
  if (!raw) { updateLiveScore(); return; }

  try {
    const data = JSON.parse(raw);
    userAnswers = data.userAnswers || {};
    subjectiveAnswers = data.subjectiveAnswers || {};
    timerSeconds = data.timerSeconds || 0;
    updateTimer();

    Object.keys(subjectiveAnswers).forEach(qId => {
      const input = $(`sub_${qId}`);
      if (input) {
        input.value = subjectiveAnswers[qId];
        $(`pill_${qId}`)?.classList.toggle('attempted', input.value.trim().length > 0);
        const btn = $(`btn_sub_${qId}`);
        if (btn) btn.disabled = input.value.trim().length === 0;
      }
    });

    Object.keys(userAnswers).forEach(qId => {
      const { val, correct } = userAnswers[qId];
      const radio = document.querySelector(`input[name="p_${qId}"][value="${val}"]`);
      if (radio) radio.checked = true;
      const selectedOpt = $(`opt_${qId}_${val}`);
      selectedOpt?.classList.add('selected');
      const isCorrect = val === correct;

      if (appMode === 'practice') {
        if (isCorrect) selectedOpt?.classList.add('correct-answer');
        else {
          selectedOpt?.classList.add('incorrect-answer');
          $(`opt_${qId}_${correct}`)?.classList.add('correct-answer');
        }
        $(`exp_${qId}`)?.classList.add('show');
      }
      const pill = $(`pill_${qId}`);
      if (pill) {
        if (appMode === 'practice') {
          pill.classList.toggle('correct', isCorrect);
          pill.classList.toggle('incorrect', !isCorrect);
        } else pill.classList.add('attempted');
      }
    });
    updateLiveScore();
  } catch (e) { console.error(e); }
}

/* Timer Control */
const updateTimer = () => {
  if ($('timerDisplay')) {
    $('timerDisplay').textContent = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
  }
};
const startTimer = () => { if (!timerInterval) { timerInterval = setInterval(() => { timerSeconds++; updateTimer(); if (timerSeconds % 10 === 0) saveCurrentProgress(); }, 1000); } };
const pauseTimer = () => { clearInterval(timerInterval); timerInterval = null; saveCurrentProgress(); };
const resetTimer = () => { pauseTimer(); timerSeconds = 0; updateTimer(); };

const jumpTo = (id) => {
  const target = $(id); if (!target) return;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 72, behavior: 'smooth' });
  const pill = $(`pill_${id}`);
  if (pill) { qsa('.nav-pill').forEach(p => p.classList.remove('active')); pill.classList.add('active'); autoShiftPill(pill); }
};

function autoShiftPill(pill) {
  const vp = $('pillsViewport'); if (!vp || !pill) return;
  const targetScroll = pill.offsetLeft - (vp.clientWidth / 2) + (pill.offsetWidth / 2);
  vp.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
}

function handleStudyClick() {
  if (appMode !== 'read') setAppMode('read');
  const bar = $('annotationBar');
  if (bar?.classList.contains('bar-hidden')) showAnnotationBar(); else hideAnnotationBar();
}

function setAppMode(mode) {
  appMode = mode;
  qsa('.mode-btn').forEach(b => b.classList.remove('active'));
  document.body.className = `body-${mode}`;

  if (mode === 'read') {
    $('btnModeRead')?.classList.add('active');
    pauseTimer(); setDrawingTool('read');
    qsa('.explanation-box').forEach(el => el.classList.remove('show'));
    qsa('.terminal-output').forEach(el => el.classList.remove('show'));
    qsa('.exam-opt').forEach(opt => opt.classList.remove('selected', 'correct-answer', 'incorrect-answer'));
    qsa('input[type="radio"]').forEach(r => r.checked = false);
  } else if (mode === 'practice') {
    $('btnModePractice')?.classList.add('active');
    hideAnnotationBar(); setDrawingTool('read');
    startTimer();
    restoreSavedProgress();
  }
}

/* Annotation Toolbar Controls */
function showAnnotationBar() { if (appMode !== 'read') return; $('annotationBar')?.classList.remove('bar-hidden'); scheduleAutoHide(4000); }
function hideAnnotationBar() { $('annotationBar')?.classList.add('bar-hidden'); clearTimeout(barAutoHideTimer); }
function scheduleAutoHide(delay = 4000) {
  clearTimeout(barAutoHideTimer);
  if (appMode !== 'read') return;
  barAutoHideTimer = setTimeout(() => { if ($('annotationBar') && !$('annotationBar').matches(':hover')) hideAnnotationBar(); }, delay);
}
function initAutoHideToolbar() {
  const bar = $('annotationBar'); if (!bar) return;
  bar.addEventListener('mouseenter', () => clearTimeout(barAutoHideTimer));
  bar.addEventListener('mouseleave', () => scheduleAutoHide(2000));
}

function setDrawingTool(t) {
  currentTool = t;
  qsa('.tool-tab').forEach(b => b.classList.remove('active'));
  $({ read: 'tabRead', pen: 'tabPen', highlighter: 'tabHighlight', eraser: 'tabEraser' }[t])?.classList.add('active');
  $('drawingCanvas')?.classList.toggle('pen-active', t !== 'read');
  scheduleAutoHide(4000);
}

function setStrokeColor(c, el) {
  strokeColor = c;
  qsa('.swatch').forEach(s => s.classList.remove('active')); el.classList.add('active');
  if (currentTool === 'read' || currentTool === 'eraser') setDrawingTool('pen');
  scheduleAutoHide(4000);
}

const togglePaperTheme = () => document.body.classList.toggle('dark-paper');
const setStrokeSize = (v) => {
  baseWidth = parseFloat(v);
  if ($('sizeNumDisplay')) $('sizeNumDisplay').textContent = parseFloat(v).toFixed(1);
  scheduleAutoHide(4000);
};

/* Code Snippet Copy With Feedback */
function copySnippet(id) {
  const b = $(`code_${id}`);
  if (b) {
    navigator.clipboard.writeText(b.innerText).then(() => {
      showToast("Code copied from SinghClasses.in!");
    });
  }
}
function toggleSnippetOutput(id) {
  if (appMode === 'read') return;
  $(`out_${id}`)?.classList.toggle('show');
}

/* Canvas Engine */
const canvas = $('drawingCanvas'), ctx = canvas?.getContext('2d'), container = $('paperContainer');
function initDrawingState() {
  try { strokes = JSON.parse(localStorage.getItem(drawingStorageKey())) || []; } catch(e) { strokes = []; }
  redrawStrokes();
}
function resizeCanvas() {
  if (!canvas || !container) return;
  const r = container.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  canvas.style.width = `${r.width}px`; canvas.style.height = `${r.height}px`;
  redrawStrokes();
}
window.addEventListener('resize', resizeCanvas);

function redrawStrokes() {
  if (!ctx || !canvas) return;
  const d = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(d, d); strokes.forEach(renderStroke); ctx.restore();
}

function renderStroke(s) {
  if (!s.points?.length || !ctx) return;
  ctx.save(); ctx.beginPath(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = s.color;
  if (s.tool === 'highlighter') { ctx.lineWidth = s.width * 5; ctx.globalAlpha = 0.32; ctx.globalCompositeOperation = 'multiply'; }
  else if (s.tool === 'eraser') { ctx.lineWidth = s.width * 7; ctx.globalCompositeOperation = 'destination-out'; }
  else { ctx.lineWidth = s.width; ctx.globalCompositeOperation = 'source-over'; }
  s.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke(); ctx.restore();
}

const getPoint = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
if (canvas) {
  canvas.addEventListener('pointerdown', e => {
    if (currentTool === 'read') return;
    currentStroke = { tool: currentTool, color: strokeColor, width: baseWidth, points: [getPoint(e)] };
    strokes.push(currentStroke); redoStack = []; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (currentStroke && currentTool !== 'read') { currentStroke.points.push(getPoint(e)); redrawStrokes(); }
  });
  canvas.addEventListener('pointerup', e => {
    if (currentStroke) { canvas.releasePointerCapture(e.pointerId); currentStroke = null; localStorage.setItem(drawingStorageKey(), JSON.stringify(strokes)); }
  });
}

/* Reset Modal Handlers */
const openClearModal = () => $('clearConfirmModal')?.classList.add('open');
const closeClearModal = () => $('clearConfirmModal')?.classList.remove('open');
function confirmAndClearAll() {
  closeClearModal(); strokes = []; redoStack = []; userAnswers = {}; subjectiveAnswers = {};
  localStorage.removeItem(drawingStorageKey()); localStorage.removeItem(paperStorageKey());
  redrawStrokes(); resetTimer();
  if (appMode === 'practice') startTimer();
  qsa('input[type="radio"]').forEach(r => r.checked = false);
  qsa('.exam-opt').forEach(o => o.classList.remove('selected', 'correct-answer', 'incorrect-answer'));
  qsa('.practice-subjective-input').forEach(i => i.value = '');
  qsa('.terminal-output, .explanation-box').forEach(el => el.classList.remove('show'));
  qsa('.nav-pill').forEach(p => p.classList.remove('attempted', 'correct', 'incorrect'));
  setDrawingTool('read'); updateLiveScore(); showToast("Paper progress reset.");
}

/* Star Rating */
function setPaperRating(stars) {
  currentPaperRating = stars;
  const row = $('starRatingRow');
  if (!row) return;
  const buttons = row.querySelectorAll('.star-btn');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('rated', i < stars);
  });
  showToast(`Thank you! Rated ${stars} star${stars > 1 ? 's' : ''}.`);
}

/* Feedback & Issue Modal */
function openFeedbackModal(category = 'Suggestion') {
  const modal = $('feedbackModal');
  const catSelect = $('feedbackCategory');
  const title = $('feedbackModalTitle');
  const desc = $('feedbackModalDesc');

  if (catSelect) catSelect.value = category;
  if (title) {
    if (category === 'Issue / Typo') {
      title.textContent = 'Report an Issue / Typo';
      desc.textContent = 'Found a typo or wrong question phrasing? Let us know so we can fix it immediately.';
    } else if (category === 'Suggestion') {
      title.textContent = 'Suggest an Improvement';
      desc.textContent = 'Help us improve question quality, paper structure, or add more practice options.';
    } else {
      title.textContent = 'Save Your Feedback';
      desc.textContent = 'Save your thoughts, attempt performance, and suggestions on this paper.';
    }
  }

  const savedName = localStorage.getItem('singhclasses_student_name') || '';
  const savedClass = localStorage.getItem('singhclasses_student_class') || 'Class 12';
  if ($('feedbackUserName')) $('feedbackUserName').value = savedName;
  if ($('feedbackUserClass')) $('feedbackUserClass').value = savedClass;

  modal?.classList.add('open');
}

function closeFeedbackModal() {
  $('feedbackModal')?.classList.remove('open');
  if ($('feedbackForm')) $('feedbackForm').reset();
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const name = $('feedbackUserName')?.value.trim();
  const studentClass = $('feedbackUserClass')?.value;
  const category = $('feedbackCategory')?.value;
  const message = $('feedbackMessage')?.value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!name || !message) {
    showToast("Please fill in both Name and Message.");
    return;
  }

  localStorage.setItem('singhclasses_student_name', name);
  localStorage.setItem('singhclasses_student_class', studentClass);

  const payload = {
    session: currentSession,
    paper: currentPaperId,
    name: name,
    studentClass: studentClass,
    category: category,
    rating: currentPaperRating ? `${currentPaperRating} Stars` : 'Unrated',
    message: message
  };

  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const newEntry = {
      id: 'fb_' + Date.now(),
      name: name,
      studentClass: studentClass,
      category: category,
      message: message,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(feedbackStorageKey())) || [];
    } catch (err) { list = []; }

    list.unshift(newEntry);
    localStorage.setItem(feedbackStorageKey(), JSON.stringify(list));

    closeFeedbackModal();
    showToast("Feedback saved to Google Sheet!");
    setTimeout(loadFeedbackResponses, 1000);
  } catch (error) {
    console.error("Submission error:", error);
    showToast("Saved locally. Could not connect to Sheet.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

/* Load Responses Live From Google Sheet via doGet */
async function loadFeedbackResponses() {
  const container = $('feedbackCardsContainer');
  const countBadge = $('responseCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = "Loading...";

  let list = [];

  try {
    const res = await fetch(GOOGLE_SHEET_WEBAPP_URL, { method: "GET", redirect: "follow" });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        list = json.data;
      }
    }
  } catch (err) {
    console.warn("Sheet fetch unavailable, using local cache:", err);
  }

  // Fallback to local storage if remote response is empty
  if (list.length === 0) {
    try {
      list = JSON.parse(localStorage.getItem(feedbackStorageKey())) || [];
    } catch (e) { list = []; }
  }

  // Default entry if no submissions exist yet
  if (list.length === 0) {
    list = [
      {
        id: 'default_1',
        name: 'Aman Verma',
        studentClass: 'Class 12',
        category: 'Suggestion',
        message: 'The explanations for Q2 (random module) and Q4 (stack list) are super clear! Please add more SQL join questions.',
        timestamp: 'Recent'
      }
    ];
  }

  if (countBadge) countBadge.textContent = `${list.length} Response${list.length > 1 ? 's' : ''}`;

  container.innerHTML = list.map(item => {
    let tagClass = 'tag-feedback';
    if (String(item.category).includes('Issue')) tagClass = 'tag-issue';
    else if (String(item.category).includes('Suggestion')) tagClass = 'tag-suggestion';

    return `
      <div class="response-card" id="${item.id}">
        <div class="response-meta-row">
          <div class="response-author-box">
            <span class="response-author-name">${escapeHtml(item.name)}</span>
            <span class="response-class-pill">${escapeHtml(item.studentClass)}</span>
          </div>
          <span class="response-badge-tag ${tagClass}">${escapeHtml(item.category)}</span>
        </div>
        <div class="response-body-text">${escapeHtml(item.message)}</div>
        <div class="response-date-text">Submitted on ${item.timestamp || 'Recent'}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

/* Scroll Spy Navigation */
window.addEventListener('scroll', () => {
  const qBlocks = qsa('.question-block');
  let currentBlock = null;
  for (let i = 0; i < qBlocks.length; i++) {
    const rect = qBlocks[i].getBoundingClientRect();
    if (rect.top <= 170 && rect.bottom >= 80) { currentBlock = qBlocks[i]; break; }
  }
  if (!currentBlock && qBlocks.length) {
    if (window.scrollY < 180) currentBlock = qBlocks[0];
    else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) currentBlock = qBlocks[qBlocks.length - 1];
  }
  if (currentBlock) {
    const pill = $(`pill_${currentBlock.id}`);
    if (pill && !pill.classList.contains('active')) {
      qsa('.nav-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      autoShiftPill(pill);
    }
  }
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if ($('scrollProgressBar') && max > 0) $('scrollProgressBar').style.width = `${((document.documentElement.scrollTop || document.body.scrollTop) / max) * 100}%`;
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeClearModal();
    closeFeedbackModal();
    $('actionsOverflowWrapper')?.classList.remove('open');
    $('sessionPickerWrapper')?.classList.remove('open');
  }
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key.toLowerCase() === 'r') setDrawingTool('read');
  if (e.key.toLowerCase() === 'p') setDrawingTool('pen');
  if (e.key.toLowerCase() === 'e') setDrawingTool('eraser');
});

window.addEventListener('DOMContentLoaded', () => {
  if ($('current-year')) $('current-year').textContent = new Date().getFullYear();
  renderSessionPicker();
  initializeQuestionsFromDOM();
  setAppMode('read');
  initAutoHideToolbar();
});