/* ==========================================================================
   SECTION 1: CORE HELPERS, CONFIG GETTERS & ICONS
   ========================================================================== */
const $ = id => document.getElementById(id);
const isProctoringEnabled = () => window.CBT_CONFIG?.ENABLE_PROCTORING ?? true;
const getCorrectMarks = () => Number(window.CBT_CONFIG?.MARKS_CORRECT ?? 1);
const getIncorrectMarks = () => Number(window.CBT_CONFIG?.MARKS_INCORRECT ?? 0.25);
const getPenaltyMarks = () => Number(window.CBT_CONFIG?.PENALTY_WARNING ?? 2);
const getChapterNumber = () => window.CBT_CONFIG?.CHAPTER_NUMBER ?? "02";
const getTestName = () => window.CBT_CONFIG?.TEST_NAME ?? "Online Test";
const getChapterWeightage = () => window.CBT_CONFIG?.CHAPTER_WEIGHTAGE ?? "15 Marks";
const getFetchQuestionsOfCBT = () => window.CBT_CONFIG?.FetchQuestionsOfCBT ?? "";
const getFetchRecordOfCBT = () => window.CBT_CONFIG?.FetchRecordOfCBT ?? "";
const getFeedbackScriptURL = () => window.CBT_CONFIG?.FeedbackScriptURL ?? "";
const getSaveRecordOfCBT = () => window.CBT_CONFIG?.SaveRecordOfCBT ?? "";
const getHomeUrl = () => window.CBT_CONFIG?.HOME_URL ?? "https://www.singhclasses.in/";
const getYoutubeUrl = () => window.CBT_CONFIG?.YOUTUBE_URL ?? "https://youtu.be/cqiM2VVs-HM";
const getNotesUrl = () => window.CBT_CONFIG?.NOTES_URL ?? "#";

const ICON_ALERT = `<svg class="sc-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
const ICON_FULLSCREEN = `<polyline points="15 3 21 3 21 9"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><polyline points="9 21 3 21 3 15"></polyline><line x1="3" y1="21" x2="10" y2="14"></line>`;
const ICON_MINIMIZE = `<polyline points="4 14 10 14 10 20"></polyline><line x1="10" y1="14" x2="3" y2="21"></line><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line>`;
const ICON_CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const ICON_EMPTY_FOLDER = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="2.5"></circle><line x1="13.8" y1="14.8" x2="16" y2="17"></line></svg>`;

/* ==========================================================================
   SECTION 2: APPLICATION STATE & UTILITY FUNCTIONS
   ========================================================================== */
window.CBTState = {
  listExamPapers: [], isQuestionsLoading: false, fetchFailed: false, questions: [], sections: [],
  currentYearIndex: 0, currentQuestion: 0, studentNameVal: "", studentClassVal: "Class 12",
  studentSectionVal: "A", schoolNameVal: "", studentName: "", selectedSectionMode: "ALL",
  userAnswers: [], visitedQuestions: [], lockedAnswers: [], markedQuestions: [], sectionTimes: [],
  timerInterval: null, isTimerPaused: true, isTimerFrozen: false, securityWarnings: 0,
  isExamActive: false, currentFilter: 'all', activeResourceUrl: "", lastWT: 0,
  sectionToppersFetched: [], pendingRestoreData: null,
  feedbackRating: 0,
  feedbackCategory: "",
  feedbackDataStore: [], hasAnimatedStars: false,
  isExpandedSubmissions: false, allFetchedRecords: [], hasFetchedFeedback: false
};

let spacePressTimestamps = [], autoAdvanceTimer = null;
let touchStartX = 0, touchStartY = 0, lastOptionTapTime = 0, lastTappedIndex = -1;

const debounce = (fn, delay = 150) => {
  let timer = null;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(null, args), delay); };
};

const escapeHTML = str => str == null ? "" : str.toString()
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");

const getVerbatim = (obj, keys, fallback = "") => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return fallback;
};

const shuffleArray = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
};

const getFormattedTimestamp = () => {
  const now = new Date(), pad = n => (n < 10 ? '0' + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
};

function showToastAlert(m) {
  const t = $('custom-alert-toast'), txt = $('custom-alert-text');
  if (t && txt) {
    txt.innerHTML = `${ICON_ALERT} ${m}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
}

function cancelAutoAdvance() {
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
  document.querySelectorAll('.option-countdown-strip').forEach(el => el.remove());
}

function scheduleAutoAdvance(delay = 2000) {
  cancelAutoAdvance();
  const activeLabel = document.querySelector('#q-options input[name="option"]:checked')?.closest('label');
  if (activeLabel) {
    const strip = document.createElement('div');
    strip.className = 'option-countdown-strip';
    activeLabel.appendChild(strip);
  }
  autoAdvanceTimer = setTimeout(() => {
    if (CBTState.isExamActive && !CBTState.sections[CBTState.currentYearIndex]?.submitted) nextQuestion();
  }, delay);
}

/* ==========================================================================
   SECTION 3: HEADER ACTIONS, NAVIGATION & FULLSCREEN
   ========================================================================== */
function goPageBack() {
  if (document.referrer && window.history.length > 1) window.history.back();
  else if (document.referrer) window.location.href = document.referrer;
  else if (window.history.length > 1) window.history.back();
  else window.location.href = "../";
}
window.goPageBack = goPageBack;

window.handleHeaderBack = function() {
  if (CBTState.isExamActive && !CBTState.sections[CBTState.currentYearIndex]?.submitted) triggerVerifyModal('back');
  else goPageBack();
};

window.sharePage = async function() {
  const currentUrl = window.location.href, btn = $('btn-share-page'), badge = $('share-copied-badge'), icon = $('share-icon-svg');
  const showFeedback = () => {
    if (badge) { badge.innerText = "Copied!"; badge.style.display = "inline-block"; }
    if (icon) icon.style.display = "none";
    if (btn) btn.classList.add('copied-active');
    setTimeout(() => {
      if (badge) { badge.innerText = ""; badge.style.display = "none"; }
      if (icon) icon.style.display = "inline-block";
      if (btn) btn.classList.remove('copied-active');
    }, 1800);
  };
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(currentUrl); showFeedback(); }
    else {
      const t = document.createElement('input');
      t.value = currentUrl; document.body.appendChild(t); t.select();
      document.execCommand('copy'); document.body.removeChild(t); showFeedback();
    }
  } catch (e) { showFeedback(); }
};

window.toggleFullScreen = function() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen();
};

function enableDesktopFullscreen() {
  if (window.innerWidth > 640 && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
}

function updateFullscreenIconState() {
  const icon = $('fs-icon'), btn = $('fullscreen-toggle-btn');
  if (!icon) return;
  if (document.fullscreenElement) { icon.innerHTML = ICON_MINIMIZE; if (btn) btn.title = "Exit Fullscreen"; }
  else { icon.innerHTML = ICON_FULLSCREEN; if (btn) btn.title = "Fullscreen"; }
}
document.addEventListener('fullscreenchange', updateFullscreenIconState);

/* ==========================================================================
   SECTION 4: LOCAL STORAGE SESSION MANAGEMENT
   ========================================================================== */
const getSingleSessionKey = () => `cbt_active_attempt_${getTestName().replace(/\s+/g, '_')}`;

function getSavedSession() {
  try {
    const raw = localStorage.getItem(getSingleSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.questions?.length || !data.studentNameVal) return null;
    if (!data.savedAt || (Date.now() - data.savedAt > 3600000)) { clearSessionLocalStorage(); return null; }
    return data;
  } catch (e) { return null; }
}

function saveSessionToLocalStorage() {
  if (!CBTState.isExamActive || !CBTState.studentNameVal) return;
  try {
    localStorage.setItem(getSingleSessionKey(), JSON.stringify({
      savedAt: Date.now(), currentYearIndex: CBTState.currentYearIndex, currentQuestion: CBTState.currentQuestion,
      userAnswers: CBTState.userAnswers, visitedQuestions: CBTState.visitedQuestions, lockedAnswers: CBTState.lockedAnswers,
      markedQuestions: CBTState.markedQuestions, sectionTimes: CBTState.sectionTimes, securityWarnings: CBTState.securityWarnings,
      questions: CBTState.questions, sections: CBTState.sections, studentNameVal: CBTState.studentNameVal,
      studentClassVal: CBTState.studentClassVal, studentSectionVal: CBTState.studentSectionVal, schoolNameVal: CBTState.schoolNameVal,
      studentName: CBTState.studentName, selectedSectionMode: CBTState.selectedSectionMode, sectionToppersFetched: CBTState.sectionToppersFetched
    }));
  } catch (e) {}
}

function clearSessionLocalStorage() { try { localStorage.removeItem(getSingleSessionKey()); } catch (e) {} }

function restoreSession(data) {
  let restoredClass = data.studentClassVal || "Class 12";
  if (!restoredClass.toString().startsWith("Class") && restoredClass !== "OTHER") restoredClass = `Class ${restoredClass}`;
  const qLen = (data.questions || []).length;
  Object.assign(CBTState, {
    currentYearIndex: data.currentYearIndex || 0, currentQuestion: data.currentQuestion || 0,
    userAnswers: data.userAnswers || new Array(qLen).fill(null),
    visitedQuestions: data.visitedQuestions || new Array(qLen).fill(false),
    lockedAnswers: data.lockedAnswers || new Array(qLen).fill(false),
    markedQuestions: data.markedQuestions || new Array(qLen).fill(false),
    sectionTimes: data.sectionTimes || [], securityWarnings: data.securityWarnings || 0,
    questions: data.questions || [], sections: data.sections || [],
    studentNameVal: data.studentNameVal || "", studentClassVal: restoredClass,
    studentSectionVal: data.studentSectionVal || "A", schoolNameVal: data.schoolNameVal || "",
    studentName: data.studentName || "", selectedSectionMode: data.selectedSectionMode || "ALL",
    sectionToppersFetched: data.sectionToppersFetched || [], isExamActive: true, isTimerPaused: false, isTimerFrozen: false
  });
  if ($('student-name-input')) $('student-name-input').value = CBTState.studentNameVal;
  if ($('student-class-input')) $('student-class-input').value = CBTState.studentClassVal;
  if ($('student-section-input')) $('student-section-input').value = CBTState.studentSectionVal;
  if ($('student-school-input')) $('student-school-input').value = CBTState.schoolNameVal;
  if ($('modal-resume')) $('modal-resume').style.display = 'none';
  if ($('modal-welcome')) $('modal-welcome').style.display = 'none';
  document.body.classList.add('exam-in-progress');
  if ($('quiz-screen')) $('quiz-screen').style.display = 'block';
  if ($('unified-nav')) $('unified-nav').style.display = 'flex';
  ensureReviewControlsExist(); enableDesktopFullscreen();
  buildYearNav(); updateTimerDisplay(); startTimer(); loadQuestion();
  if (CBTState.userAnswers.some(ans => ans !== null)) triggerFeedbackSectionAnimation();
  showToastAlert("Previous exam attempt restored successfully!");
}

window.confirmResumeSession = function() { if (CBTState.pendingRestoreData) { restoreSession(CBTState.pendingRestoreData); CBTState.pendingRestoreData = null; } };
window.dismissResumeSession = function() { clearSessionLocalStorage(); CBTState.pendingRestoreData = null; if ($('modal-resume')) $('modal-resume').style.display = 'none'; if ($('modal-welcome')) $('modal-welcome').style.display = 'flex'; };

/* ==========================================================================
   SECTION 5: QUESTION FETCHING & ANSWER RESOLUTION
   ========================================================================== */
function resolveCorrectText(rawValue, optionsArray) {
  if (rawValue == null || rawValue === "") return optionsArray[0] || "";
  const v = rawValue.toString().trim();
  const textMatch = optionsArray.find(opt => opt != null && opt.toString().trim().toLowerCase() === v.toLowerCase());
  if (textMatch !== undefined) return textMatch.toString();
  const letter = v.toLowerCase();
  if (['a', 'b', 'c', 'd', 'e'].includes(letter)) {
    const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[letter];
    if (idx < optionsArray.length) return optionsArray[idx].toString();
  }
  const n = parseInt(v, 10);
  return (!isNaN(n) && n >= 0 && n < optionsArray.length) ? optionsArray[n].toString() : (optionsArray[0]?.toString() || "");
}

function textToIndex(correctText, optionsArray) {
  const idx = optionsArray.findIndex(opt => opt != null && opt.toString().trim().toLowerCase() === correctText.toLowerCase());
  return idx !== -1 ? idx : 0;
}

async function loadQuestionsFromSheet(retries = 3) {
  if (CBTState.isQuestionsLoading || CBTState.listExamPapers.length > 0) return;
  CBTState.isQuestionsLoading = true;
  CBTState.fetchFailed = false;
  const baseUrl = getFetchQuestionsOfCBT();
  if (!baseUrl) {
    CBTState.isQuestionsLoading = false;
    CBTState.fetchFailed = true;
    renderDynamicSectionPickerCards();
    return;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(baseUrl, { method: "GET", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty dataset");
      if (raw[0] && Array.isArray(raw[0].questions)) {
        CBTState.listExamPapers = raw.map(paper => ({
          title: getVerbatim(paper, ['sectiontitle', 'SectionTitle', 'title', 'Title'], "Section"),
          year: getVerbatim(paper, ['section', 'Section', 'year', 'Year'], "1"),
          questions: (paper.questions || []).map(q => {
            const cleanOpts = (Array.isArray(q.options) ? q.options : [
              getVerbatim(q, ['optiona', 'OptionA', 'option1', '0'], ""),
              getVerbatim(q, ['optionb', 'OptionB', 'option2', '1'], ""),
              getVerbatim(q, ['optionc', 'OptionC', 'option3', '2'], ""),
              getVerbatim(q, ['optiond', 'OptionD', 'option4', '3'], "")
            ]).map(o => (o ?? "").toString());
            return {
              text: getVerbatim(q, ['text', 'Text', 'question', 'Question'], "").toString(),
              tag: getVerbatim(q, ['tag', 'Tag', 'TAG', 'column', 'info', 'Info', 'metadata'], "CBSE").toString().trim(),
              options: cleanOpts,
              image: getVerbatim(q, ['image', 'Image', 'imageurl'], "").toString(),
              explanation: getVerbatim(q, ['explanation', 'Explanation', 'exp', 'Exp', 'solution'], "").toString(),
              correctAnswerText: resolveCorrectText(getVerbatim(q, ['correctIndex', 'correct', 'answer', 'ans', '4'], "A"), cleanOpts)
            };
          }).filter(q => q.text !== "")
        })).filter(p => p.questions.length > 0);
      } else {
        const sectionsMap = {};
        raw.forEach(row => {
          const r = {};
          Object.keys(row).forEach(k => { r[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
          const sNum = getVerbatim(r, ['section', 'set'], "1").toString().trim();
          const sTitle = getVerbatim(r, ['sectiontitle', 'title', 'label'], "Part A").toString().trim();
          const qText = getVerbatim(r, ['question', 'questions', 'questiontext', 'text', 'q'], null);
          if (!qText) return;
          const options = [
            getVerbatim(r, ['optiona', 'option1', 'a'], ""),
            getVerbatim(r, ['optionb', 'option2', 'b'], ""),
            getVerbatim(r, ['optionc', 'option3', 'c'], ""),
            getVerbatim(r, ['optiond', 'option4', 'd'], "")
          ].map(o => o.toString());
          if (!sectionsMap[sNum]) sectionsMap[sNum] = { title: sTitle, year: sNum, questions: [] };
          sectionsMap[sNum].questions.push({
            text: qText.toString(),
            tag: getVerbatim(r, ['tag', 'tagname', 'info', 'metadata'], "CBSE").toString().trim(),
            options,
            correctAnswerText: resolveCorrectText(getVerbatim(r, ['correct', 'correctanswer', 'correctindex', 'answer', 'ans'], "A"), options),
            image: getVerbatim(r, ['image', 'imageurl', 'img'], "").toString(),
            explanation: getVerbatim(r, ['explanation', 'exp', 'solution'], "").toString()
          });
        });
        CBTState.listExamPapers = Object.values(sectionsMap).filter(p => p.questions.length > 0);
      }
      if (CBTState.listExamPapers.length > 0) {
        CBTState.listExamPapers.forEach(p => (p.questions || []).forEach(q => { if (q.image) { const i = new Image(); i.src = q.image; } }));
        CBTState.isQuestionsLoading = false;
        CBTState.fetchFailed = false;
        renderDynamicSectionPickerCards();
        return;
      }
    } catch (err) {
      if (attempt < retries) await new Promise(res => setTimeout(res, 800));
    }
  }
  CBTState.isQuestionsLoading = false;
  CBTState.fetchFailed = true;
  renderDynamicSectionPickerCards();
}

window.retryLoadSections = async function() {
  const container = $('dynamic-sections-container');
  if (container) container.innerHTML = '';
  await loadQuestionsFromSheet(3);
};

/* ==========================================================================
   SECTION 6: ONBOARDING FLOW, STEPPER NAVIGATION & FORM VALIDATION
   ========================================================================== */
const DETAIL_FIELDS = [
  { id: 'student-name-input', label: 'Student Name', err: 'Student Name is required' },
  { id: 'student-class-input', label: 'Class', err: '*required' },
  { id: 'student-section-input', label: 'Section', err: '*required' },
  { id: 'student-school-input', label: 'School Name', err: 'School Name is required' }
];

function setupDetailsFieldValidation() {
  DETAIL_FIELDS.forEach(f => {
    const el = $(f.id);
    if (!el) return;
    const box = el.closest('.field-box');
    if (box && !box.querySelector('.field-error-msg')) {
      const msg = document.createElement('span');
      msg.className = 'field-error-msg';
      msg.innerText = f.err;
      box.appendChild(msg);
    }
    const clearError = () => { if (box) box.classList.remove('field-error'); };
    el.addEventListener('input', clearError);
    el.addEventListener('change', clearError);
  });
}

function validateStudentDetails() {
  const missing = [];
  let firstInvalid = null;
  DETAIL_FIELDS.forEach(f => {
    const el = $(f.id);
    const filled = !!el && el.value.trim() !== "";
    const box = el ? el.closest('.field-box') : null;
    if (box) {
      let msgEl = box.querySelector('.field-error-msg');
      if (!msgEl) {
        msgEl = document.createElement('span');
        msgEl.className = 'field-error-msg';
        box.appendChild(msgEl);
      }
      msgEl.innerText = f.err;
      box.classList.toggle('field-error', !filled);
    }
    if (!filled) { missing.push(f.label); if (!firstInvalid) firstInvalid = el; }
  });
  if (missing.length) {
    showToastAlert(`Please complete: ${missing.join(', ')}`);
    if (firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
    return false;
  }
  return true;
}

function syncMarkingLabelsInDOM() {
  const cMarks = getCorrectMarks(), iMarks = getIncorrectMarks(), pMarks = getPenaltyMarks();
  if ($('welcome-correct-lbl')) $('welcome-correct-lbl').innerText = `+${cMarks} for correct answer`;
  if ($('welcome-incorrect-lbl')) $('welcome-incorrect-lbl').innerHTML = `<strong>-${iMarks}</strong> for incorrect answer`;
  if ($('welcome-penalty-lbl')) $('welcome-penalty-lbl').innerText = `-${pMarks} marks`;
  if ($('welcome-penalty-inline')) $('welcome-penalty-inline').innerText = `penalty of ${pMarks} marks.`;
}

function ensureSectionSelectionModalExists() {
  let modalSection = $('welcome-step-section');
  if (!modalSection) {
    const welcomeOverlay = $('modal-welcome'), step1 = $('welcome-step-1');
    if (!welcomeOverlay || !step1) return;
    modalSection = document.createElement('div');
    modalSection.id = 'welcome-step-section';
    modalSection.className = 'custom-modal-box registration-card';
    modalSection.style.display = 'none';
    modalSection.innerHTML = `
      <div class="topic-banner-wrapper">
        <div class="banner-line"></div>
        <div class="modal-topic-title"><svg class="topic-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#046a38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg><span class="topic-text">Select Test Mode</span></div>
        <div class="banner-line"></div>
      </div>
      <div class="modal-stepper">
        <div class="step-item completed clickable" data-step="1" onclick="navigateStepper(1)" title="Edit Student Details"><span class="step-badge">1</span><span class="step-text">Details</span></div><div class="step-divider"></div>
        <div class="step-item active" data-step="2"><span class="step-badge">2</span><span class="step-text">Section</span></div><div class="step-divider"></div>
        <div class="step-item" data-step="3"><span class="step-badge">3</span><span class="step-text">Instructions</span></div><div class="step-divider"></div>
        <div class="step-item" data-step="4"><span class="step-badge">4</span><span class="step-text">Test</span></div>
      </div>
      <div class="section-picker-container">
        <p class="sec-picker-heading">Choose a specific section or attempt the complete test:</p>
        <div class="section-picker-grid" id="section-picker-options-grid">
          <label class="section-opt-card active" id="opt-section-all" onclick="handleSectionOptChange('ALL')">
            <input type="radio" name="cbt-section-select" value="ALL" checked />
            <div class="sec-card-badge">ALL</div>
            <div class="sec-card-info">
              <span class="sec-card-title">Full Mock Test (All Sections)</span>
              <span class="sec-card-sub" id="lbl-all-sec-sub">Attempt all sections sequentially</span>
            </div>
            <span class="sec-card-check" aria-hidden="true">${ICON_CHECK_SVG}</span>
          </label>
          <div id="dynamic-sections-container"></div>
        </div>
      </div>
      <div class="modal-btn-row">
        <button type="button" class="btn-back-home" onclick="backToDetailsStep()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>Back</span></button>
        <button type="button" class="btn-green-submit" onclick="confirmSectionAndProceed()"><span>Proceed to Instructions</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
      </div>`;
    step1.parentNode.insertBefore(modalSection, step1.nextSibling);
  }
  upgradeSteppersToFourSteps();
}

function upgradeSteppersToFourSteps() {
  const step1 = $('welcome-step-1');
  if (step1) {
    const s1 = step1.querySelector('.modal-stepper');
    if (s1) s1.innerHTML = `
      <div class="step-item active" data-step="1"><span class="step-badge">1</span><span class="step-text">Details</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="2"><span class="step-badge">2</span><span class="step-text">Section</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="3"><span class="step-badge">3</span><span class="step-text">Instructions</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="4"><span class="step-badge">4</span><span class="step-text">Test</span></div>`;
  }
  const stepSec = $('welcome-step-section');
  if (stepSec) {
    const sSec = stepSec.querySelector('.modal-stepper');
    if (sSec) sSec.innerHTML = `
      <div class="step-item completed clickable" data-step="1" onclick="navigateStepper(1)" title="Jump to Student Details"><span class="step-badge">1</span><span class="step-text">Details</span></div><div class="step-divider"></div>
      <div class="step-item active" data-step="2"><span class="step-badge">2</span><span class="step-text">Section</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="3"><span class="step-badge">3</span><span class="step-text">Instructions</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="4"><span class="step-badge">4</span><span class="step-text">Test</span></div>`;
    const allCheck = stepSec.querySelector('#opt-section-all .sec-card-check');
    if (allCheck && !allCheck.querySelector('svg')) allCheck.innerHTML = ICON_CHECK_SVG;
  }
  const step2 = $('welcome-step-2');
  if (step2) {
    step2.classList.add('instructions-modal-card');
    const s2 = step2.querySelector('.modal-stepper');
    if (s2) s2.innerHTML = `
      <div class="step-item completed clickable" data-step="1" onclick="navigateStepper(1)" title="Jump to Student Details"><span class="step-badge">1</span><span class="step-text">Details</span></div><div class="step-divider"></div>
      <div class="step-item completed clickable" data-step="2" onclick="navigateStepper(2)" title="Jump to Section Selection"><span class="step-badge">2</span><span class="step-text">Section</span></div><div class="step-divider"></div>
      <div class="step-item active" data-step="3"><span class="step-badge">3</span><span class="step-text">Instructions</span></div><div class="step-divider"></div>
      <div class="step-item" data-step="4"><span class="step-badge">4</span><span class="step-text">Test</span></div>`;
    const instContainer = step2.querySelector('.instructions-container');
    if (instContainer && !instContainer.querySelector('.ig-cards-grid')) {
      instContainer.className = 'instructions-container';
      instContainer.innerHTML = `
        <div class="ig-hero-banner">
          <div class="ig-hero-top">
            <span class="ig-hero-icon-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#046a38" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></span>
            <h2 class="ig-hero-title" id="instructions-mode-title">Full Mock Test Instructions</h2>
          </div>
          <p class="ig-hero-sub">Read the instructions below carefully before starting the test.</p>
        </div>
        <div class="ig-cards-grid">
          <div class="ig-card ig-card-time">
            <div class="ig-card-icon-col"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0066ff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline></svg></div>
            <div class="ig-card-body"><span class="ig-card-label">Time Limit:</span><strong class="ig-time-highlight">1 minute</strong><span class="ig-time-sub">for each question</span></div>
          </div>
          <div class="ig-card ig-card-marking">
            <div class="ig-card-icon-col"><span class="ig-marking-icon-ring"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#046a38" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg></span></div>
            <div class="ig-card-body"><span class="ig-card-label">Marking Scheme:</span><span class="ig-mark-pos" id="welcome-correct-lbl">+1 for correct answer</span><span class="ig-mark-neg" id="welcome-incorrect-lbl"><strong>-0.25</strong> for incorrect answer</span></div>
          </div>
          <div class="ig-card ig-card-penalty">
            <div class="ig-card-icon-col"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="5.7" y1="5.7" x2="18.3" y2="18.3"></line></svg></div>
            <div class="ig-card-body"><span class="ig-card-label">Tab Switching Penalty:</span><strong class="ig-penalty-highlight" id="welcome-penalty-lbl">-2 marks</strong></div>
          </div>
        </div>
        <div class="ig-warning-strip">
          <span class="ig-warn-circle" aria-hidden="true">!</span><span class="ig-warn-divider" aria-hidden="true"></span>
          <span class="ig-warn-badge">Important:</span>
          <p class="ig-warn-text">Do not switch tabs or leave the test window. It will result in a <strong id="welcome-penalty-inline">penalty of 2 marks.</strong></p>
        </div>`;
      syncMarkingLabelsInDOM();
    }
  }
}

window.navigateStepper = function(targetStep) {
  if (targetStep === 1) {
    if ($('welcome-step-section')) $('welcome-step-section').style.display = 'none';
    if ($('welcome-step-2')) $('welcome-step-2').style.display = 'none';
    if ($('welcome-step-1')) $('welcome-step-1').style.display = 'block';
  } else if (targetStep === 2) {
    if (!validateStudentDetails()) return;
    if ($('welcome-step-1')) $('welcome-step-1').style.display = 'none';
    if ($('welcome-step-2')) $('welcome-step-2').style.display = 'none';
    if ($('welcome-step-section')) $('welcome-step-section').style.display = 'block';
    renderDynamicSectionPickerCards();
  }
};

function renderDynamicSectionPickerCards() {
  const container = $('dynamic-sections-container');
  if (!container) return;
  if (CBTState.isQuestionsLoading) {
    container.innerHTML = '';
    return;
  }
  if (CBTState.listExamPapers.length === 0) {
    container.innerHTML = `
      <div class="sec-empty-state-box">
        <div class="sec-empty-svg-wrap">${ICON_EMPTY_FOLDER}</div>
        <div class="sec-empty-title">No Sections Found</div>
        <p class="sec-empty-sub">${CBTState.fetchFailed ? 'Unable to load sections from the server. Check your connection and retry.' : 'No question sections are currently available for this test.'}</p>
        <button type="button" class="btn-retry-sections" onclick="retryLoadSections()">↻ Retry Fetch</button>
      </div>`;
    return;
  }

  container.innerHTML = '';
  let totalQuestionsCount = 0;
  CBTState.listExamPapers.forEach((paper, idx) => {
    const qCount = (paper.questions || []).length;
    totalQuestionsCount += qCount;
    const badgeNum = String(idx + 1).padStart(2, '0');
    const labelTitle = escapeHTML(paper.title || `Section ${badgeNum}`);
    const isSelected = CBTState.selectedSectionMode === String(idx);
    const card = document.createElement('label');
    card.className = `section-opt-card ${isSelected ? 'active' : ''}`;
    card.id = `opt-section-${idx}`;
    card.onclick = () => handleSectionOptChange(String(idx));
    card.innerHTML = `
      <input type="radio" name="cbt-section-select" value="${idx}" ${isSelected ? 'checked' : ''} />
      <div class="sec-card-badge">${badgeNum}</div>
      <div class="sec-card-info">
        <span class="sec-card-title">${labelTitle}</span>
        <span class="sec-card-sub">${qCount} Ques. · ${qCount} mins</span>
      </div>
      <span class="sec-card-check" aria-hidden="true">${ICON_CHECK_SVG}</span>`;
    container.appendChild(card);
  });

  const allSub = $('lbl-all-sec-sub');
  if (allSub && totalQuestionsCount > 0) {
    allSub.innerText = `${CBTState.listExamPapers.length} Sections · ${totalQuestionsCount} Ques. (${totalQuestionsCount} mins)`;
  }
}

window.proceedToRegisterStep = () => {
  ensureSectionSelectionModalExists();
  if ($('welcome-step-intro')) $('welcome-step-intro').style.display = 'none';
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'block';
};

window.goToSectionSelectionStep = () => {
  if (!validateStudentDetails()) return;
  ensureSectionSelectionModalExists();
  const nameInput = $('student-name-input'), rawClass = $('student-class-input') ? $('student-class-input').value : "Class 12";
  CBTState.studentNameVal = (nameInput ? nameInput.value.trim() : "").toUpperCase();
  CBTState.studentClassVal = (rawClass.toString().startsWith("Class") || rawClass === "OTHER") ? rawClass : `Class ${rawClass}`;
  CBTState.studentSectionVal = $('student-section-input') ? $('student-section-input').value : "A";
  CBTState.schoolNameVal = ($('student-school-input') ? $('student-school-input').value.trim() : "").toUpperCase();
  CBTState.studentName = `${CBTState.studentNameVal} | ${CBTState.studentClassVal} | SEC: ${CBTState.studentSectionVal} | ${CBTState.schoolNameVal}`;
  renderDynamicSectionPickerCards();
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'none';
  if ($('welcome-step-section')) $('welcome-step-section').style.display = 'block';
};

window.goToGuidelinesStep = () => {
  const step1 = $('welcome-step-1');
  if (step1 && step1.style.display !== 'none') { goToSectionSelectionStep(); return; }
  confirmSectionAndProceed();
};

window.backToDetailsStep = () => navigateStepper(1);

window.handleSectionOptChange = function(val) {
  CBTState.selectedSectionMode = String(val);
  document.querySelectorAll('.section-opt-card').forEach(c => {
    c.classList.remove('active');
    const chk = c.querySelector('.sec-card-check');
    if (chk) chk.classList.remove('check-pop');
  });
  const targetCard = val === 'ALL' ? $('opt-section-all') : $(`opt-section-${val}`);
  if (targetCard) {
    targetCard.classList.add('active');
    const r = targetCard.querySelector('input');
    if (r) r.checked = true;
    const chk = targetCard.querySelector('.sec-card-check');
    if (chk) {
      void chk.offsetWidth;
      chk.classList.add('check-pop');
    }
  }
};

window.confirmSectionAndProceed = () => {
  if ($('welcome-step-section')) $('welcome-step-section').style.display = 'none';
  if ($('welcome-step-2')) $('welcome-step-2').style.display = 'block';
  syncMarkingLabelsInDOM();
  const titleLbl = $('instructions-mode-title');
  if (CBTState.selectedSectionMode === 'ALL') {
    if (titleLbl) titleLbl.innerText = "Full Mock Test Instructions";
  } else {
    const secIdx = parseInt(CBTState.selectedSectionMode, 10);
    const chosenPaper = CBTState.listExamPapers[secIdx];
    const secTitle = chosenPaper ? chosenPaper.title : `Section ${secIdx + 1}`;
    if (titleLbl) titleLbl.innerText = `${secTitle} Instructions`;
  }
};

window.backToSectionStep = () => navigateStepper(2);

/* ==========================================================================
   SECTION 7: EXAM INITIALIZATION, NAVIGATION & MARK FOR REVIEW
   ========================================================================== */
function ensureReviewControlsExist() {
  const secRow = document.querySelector('.matrix-row-secondary');
  if (secRow && !$('btn-review')) {
    const btnRev = document.createElement('button');
    btnRev.type = 'button';
    btnRev.className = 'btn-review';
    btnRev.id = 'btn-review';
    btnRev.title = 'Mark or unmark question for review (Shortcut: M)';
    btnRev.onclick = () => window.toggleMarkForReview();
    btnRev.innerHTML = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg><span id="btn-review-label">REVIEW</span>`;
    const btnClear = $('btn-clear');
    if (btnClear) secRow.insertBefore(btnRev, btnClear);
    else secRow.appendChild(btnRev);
  }
  const filterBar = document.querySelector('.palette-filter-bar');
  if (filterBar && !$('filter-marked')) {
    const btnFilterMarked = document.createElement('button');
    btnFilterMarked.type = 'button';
    btnFilterMarked.className = 'filter-pill-btn';
    btnFilterMarked.id = 'filter-marked';
    btnFilterMarked.onclick = () => window.filterPalette('marked');
    btnFilterMarked.innerText = 'Marked';
    const unv = $('filter-unvisited');
    if (unv) filterBar.insertBefore(btnFilterMarked, unv);
    else filterBar.appendChild(btnFilterMarked);
  }
}

window.beginExam = async () => {
  if (!CBTState.studentNameVal || !CBTState.schoolNameVal) {
    ['welcome-step-2', 'welcome-step-section'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
    if ($('welcome-step-1')) $('welcome-step-1').style.display = 'block';
    showToastAlert("Please fill in your student details to continue");
    return;
  }
  if ($('modal-welcome')) $('modal-welcome').style.display = 'none';
  const loading = $('quiz-loading-overlay');
  if (loading) loading.style.display = 'flex';
  document.body.classList.add('exam-in-progress');
  CBTState.isExamActive = true;
  let checks = 0;
  while (CBTState.isQuestionsLoading && checks < 300) { await new Promise(r => setTimeout(r, 100)); checks++; }
  if (CBTState.listExamPapers.length === 0) await loadQuestionsFromSheet(3);
  if (loading) loading.style.display = 'none';

  const targetPapers = (CBTState.selectedSectionMode === 'ALL' || !CBTState.listExamPapers[parseInt(CBTState.selectedSectionMode, 10)])
    ? CBTState.listExamPapers
    : [CBTState.listExamPapers[parseInt(CBTState.selectedSectionMode, 10)]];

  if (!targetPapers || targetPapers.length === 0) {
    CBTState.isExamActive = false;
    document.body.classList.remove('exam-in-progress');
    if ($('modal-welcome')) $('modal-welcome').style.display = 'flex';
    navigateStepper(2);
    showToastAlert("Unable to load questions. Please retry fetching sections.");
    return;
  }

  CBTState.questions = [];
  CBTState.sections = [];
  let qt = 0;
  targetPapers.forEach((p, idx) => {
    const st = qt, sq = p.questions.map(q => ({
      question: q.text, tag: q.tag ?? "CBSE", options: [...q.options],
      image: q.image ?? "", correctAnswerText: q.correctAnswerText, explanation: q.explanation ?? ""
    }));
    shuffleArray(sq);
    sq.forEach(q => { CBTState.questions.push(q); qt++; });
    CBTState.sections.push({ index: idx, title: p.title, year: p.year, start: st, end: qt, submitted: false, timeSpent: 0 });
  });

  clearSessionLocalStorage();
  CBTState.userAnswers = new Array(CBTState.questions.length).fill(null);
  CBTState.visitedQuestions = new Array(CBTState.questions.length).fill(false);
  CBTState.lockedAnswers = new Array(CBTState.questions.length).fill(false);
  CBTState.markedQuestions = new Array(CBTState.questions.length).fill(false);
  CBTState.sectionTimes = CBTState.sections.map(s => (s.end - s.start) * 60);
  CBTState.currentYearIndex = 0;
  CBTState.currentQuestion = CBTState.sections[0].start;
  CBTState.isTimerPaused = false;
  CBTState.isTimerFrozen = false;

  if ($('quiz-screen')) $('quiz-screen').style.display = 'block';
  if ($('unified-nav')) $('unified-nav').style.display = 'flex';
  ensureReviewControlsExist(); enableDesktopFullscreen();
  buildYearNav(); updateTimerDisplay(); startTimer(); loadQuestion(); saveSessionToLocalStorage(); fetchAndRenderSidebarToppers();
};

window.buildYearNav = () => {
  const c = $('year-nav-container');
  if (!c) return;
  c.innerHTML = '';
  CBTState.sections.forEach((p, idx) => {
    const t = document.createElement('div');
    const isCurrent = idx === CBTState.currentYearIndex;
    const isPast = idx < CBTState.currentYearIndex || p.submitted;
    const isFuture = idx > CBTState.currentYearIndex;
    t.className = `year-tab ${isCurrent ? 'active' : (isPast ? 'locked-past' : 'locked-future')}`;
    const numBadge = String(idx + 1).padStart(2, '0'), rawLabel = (p.title || "").trim();
    const match = rawLabel.match(/^(.*?)[\s\-_]+(\b[A-Za-z0-9]+)$/);
    const mainLabel = (match && match[1].trim()) ? match[1].trim().toUpperCase() : rawLabel.toUpperCase();
    const accentLabel = (match && match[1].trim()) ? match[2].trim().toUpperCase() : "";
    t.innerHTML = `
      <div class="yt-icon-circle">${isPast ? '✓' : numBadge}</div>
      <div class="yt-title-group">
        <span class="yt-title-main">${escapeHTML(mainLabel)}</span>
        ${accentLabel ? `<span class="yt-title-accent">${escapeHTML(accentLabel)}</span>` : ''}
      </div>`;
    t.onclick = () => {
      cancelAutoAdvance();
      if (isCurrent) return;
      if (isPast) showToastAlert("Submitted sections are locked and cannot be revisited.");
      else if (isFuture) showToastAlert("Submit your current section to unlock the next section.");
    };
    c.appendChild(t);
  });
};

window.toggleMarkForReview = function() {
  cancelAutoAdvance();
  const s = CBTState.sections[CBTState.currentYearIndex];
  if (!s || s.submitted) return;
  const qIdx = CBTState.currentQuestion;
  if (!Array.isArray(CBTState.markedQuestions)) CBTState.markedQuestions = new Array(CBTState.questions.length).fill(false);
  CBTState.markedQuestions[qIdx] = !CBTState.markedQuestions[qIdx];
  loadQuestion();
};

/* ==========================================================================
   SECTION 8: QUESTION RENDERING, PALETTE & EXPLANATION DRAWER
   ========================================================================== */
function isAnswerCorrect(qIdx) {
  if (CBTState.userAnswers[qIdx] === null) return false;
  const q = CBTState.questions[qIdx];
  return (q.options[CBTState.userAnswers[qIdx]] ?? "").toString().trim().toLowerCase() === (q.correctAnswerText ?? "").toString().trim().toLowerCase();
}

const getCorrectIndex = qIdx => textToIndex(CBTState.questions[qIdx].correctAnswerText, CBTState.questions[qIdx].options);

window.loadQuestion = () => {
  CBTState.visitedQuestions[CBTState.currentQuestion] = true;
  const s = CBTState.sections[CBTState.currentYearIndex], qy = CBTState.currentQuestion - s.start, tot = s.end - s.start, curQ = CBTState.questions[CBTState.currentQuestion];
  if ($('q-number')) $('q-number').innerText = (window.innerWidth <= 640) ? `Q${qy + 1} of ${tot}` : `Question ${qy + 1} of ${tot}`;
  const tagEl = $('q-tag-pill');
  if (tagEl) tagEl.innerText = (curQ?.tag?.trim().length > 0) ? curQ.tag.trim().toUpperCase() : "CBSE";
  const pBar = $('qhc-progress-bar');
  if (pBar && tot > 0) pBar.style.width = `${Math.round(((qy + 1) / tot) * 100)}%`;

  const isMarked = !!(CBTState.markedQuestions && CBTState.markedQuestions[CBTState.currentQuestion]);
  const reviewPill = isMarked ? `<span class="q-marked-inline-pill">★ Marked for Review</span>` : '';
  let baseText = `<span style="font-weight:800;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>${escapeHTML(curQ.question)}${reviewPill}`;
  if (curQ.image) baseText += `<div class="question-image-wrap" style="margin:8px 0 12px 0;text-align:left;max-width:100%;"><img src="${curQ.image}" alt="Question Image" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border-color);object-fit:contain;display:block;"></div>`;
  if ($('q-text')) $('q-text').innerHTML = baseText;

  const ol = $('q-options'), isL = CBTState.lockedAnswers[CBTState.currentQuestion] || s.submitted;
  const userChoice = CBTState.userAnswers[CBTState.currentQuestion], ci = getCorrectIndex(CBTState.currentQuestion), lt = ['A', 'B', 'C', 'D', 'E'];
  if (ol) {
    ol.innerHTML = curQ.options.map((opt, i) => {
      let cls = "", badgeHtml = "";
      if (isL && userChoice !== null) {
        if (i === ci && userChoice === i) { cls = "disabled-label correct-answer"; badgeHtml = `<span class="option-status-pill correct">Your Answer (Correct) ✓</span>`; }
        else if (i === ci) { cls = "disabled-label correct-answer"; badgeHtml = `<span class="option-status-pill correct">Correct Answer ✓</span>`; }
        else if (userChoice === i) { cls = "disabled-label wrong-answer"; badgeHtml = `<span class="option-status-pill wrong">Your Answer (Incorrect) ✕</span>`; }
        else cls = "disabled-label";
      } else if (userChoice === i) cls = "selected" + (isL ? " disabled-label" : "");
      else if (isL) cls = "disabled-label";
      return `<li><label class="${cls}" ontouchend="handleOptionDoubleTap(event, ${i})" ondblclick="handleOptionDesktopDblClick(event, ${i})"><div class="option-left-content"><input type="radio" name="option" value="${i}" ${userChoice === i ? "checked" : ""} ${isL ? "disabled" : ""} onchange="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${escapeHTML(opt)}</span></div>${badgeHtml}</label></li>`;
    }).join('');
  }

  const btnExp = $('btn-toggle-exp'), boxExp = $('explanation-box'), contentExp = $('explanation-text-content');
  const expChar = $('exp-correct-char'), expVerdict = $('exp-verdict-text'), btnExpLabel = $('btn-exp-label'), wrapper = $('q-explanation-wrapper');
  if (btnExp && boxExp && contentExp) {
    boxExp.classList.remove('open'); btnExp.classList.remove('open');
    if (wrapper) wrapper.classList.remove('has-open-content');
    if (btnExpLabel) btnExpLabel.innerText = "View Explanation";
    contentExp.innerHTML = (curQ.explanation?.trim().length > 0)
      ? curQ.explanation.replace(/^(?:explanation\s*[:\/-]?\s*(?:solution\s*[:\/-]?\s*)?)/i, '').trim()
      : `The correct answer is option <strong>(${lt[ci]}) ${escapeHTML(curQ.correctAnswerText)}</strong>.`;
    if (expChar) expChar.innerText = lt[ci];
    if (isL) {
      btnExp.classList.remove('disabled');
      if (expVerdict) expVerdict.innerHTML = (userChoice === ci) ? `<strong>Well done!</strong> Great effort.` : `<strong>Review the solution above to understand the concept.</strong>`;
    } else btnExp.classList.add('disabled');
  }

  if ($('btn-prev')) $('btn-prev').disabled = CBTState.currentQuestion === s.start;
  if ($('btn-clear')) $('btn-clear').disabled = userChoice === null || isL;
  const btnRev = $('btn-review'), btnRevLbl = $('btn-review-label');
  if (btnRev) {
    btnRev.disabled = s.submitted;
    btnRev.classList.toggle('active-marked', isMarked);
    if (btnRevLbl) btnRevLbl.innerText = isMarked ? 'MARKED ★' : 'REVIEW';
  }
  const nb = $('btn-next');
  if (nb) {
    if (s.submitted) { nb.innerHTML = `<span>NEXT QUESTION</span>`; nb.disabled = CBTState.currentQuestion === s.end - 1; }
    else nb.innerHTML = (CBTState.currentQuestion === s.end - 1) ? `<span>SUBMIT SECTION &rarr;</span>` : `<span>SAVE &amp; NEXT &rarr;</span>`;
  }
  updatePalette(); updateUserDynamicRank(); placeActionMatrix(); saveSessionToLocalStorage();
};

window.saveAnswer = i => {
  cancelAutoAdvance();
  if (CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted) return;
  CBTState.userAnswers[CBTState.currentQuestion] = i;
  triggerFeedbackSectionAnimation();
  if ($('btn-clear')) $('btn-clear').disabled = false;
  if (!CBTState.sectionToppersFetched[CBTState.currentYearIndex]) {
    CBTState.sectionToppersFetched[CBTState.currentYearIndex] = true;
    fetchAndRenderSidebarToppers();
  }
  loadQuestion();
  if (CBTState.isTimerFrozen && $('timer-box')) $('timer-box').classList.add('timer-frozen');
};

window.clearResponse = () => {
  cancelAutoAdvance();
  if (CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted) return;
  CBTState.userAnswers[CBTState.currentQuestion] = null;
  loadQuestion();
};

window.nextQuestion = () => {
  cancelAutoAdvance();
  if (CBTState.userAnswers[CBTState.currentQuestion] !== null && !CBTState.sections[CBTState.currentYearIndex].submitted) {
    CBTState.lockedAnswers[CBTState.currentQuestion] = true;
  }
  if (CBTState.currentQuestion < CBTState.sections[CBTState.currentYearIndex].end - 1) {
    CBTState.currentQuestion++;
    loadQuestion();
  } else if (!CBTState.sections[CBTState.currentYearIndex].submitted) showSubmitModal();
};

window.prevQuestion = () => {
  cancelAutoAdvance();
  if (CBTState.currentQuestion > CBTState.sections[CBTState.currentYearIndex].start) {
    CBTState.currentQuestion--;
    loadQuestion();
  }
};

window.jumpToQuestion = i => { cancelAutoAdvance(); CBTState.currentQuestion = i; loadQuestion(); };

window.filterPalette = type => {
  CBTState.currentFilter = type;
  document.querySelectorAll('.palette-filter-bar .filter-pill-btn').forEach(btn => btn.classList.remove('active'));
  const active = $('filter-' + type);
  if (active) active.classList.add('active');
  updatePalette();
};

function updatePalette() {
  const s = CBTState.sections[CBTState.currentYearIndex], g = $('palette-grid');
  if (!g || !s) return;
  let rc = 0, wc = 0, sc = 0, html = '';
  for (let i = s.start; i < s.end; i++) {
    const isAnswered = CBTState.userAnswers[i] !== null;
    const isLockedOrSub = CBTState.lockedAnswers[i] || s.submitted;
    const isMarked = !!(CBTState.markedQuestions && CBTState.markedQuestions[i]);
    if (isAnswered && isLockedOrSub) {
      if (isAnswerCorrect(i)) { rc++; sc += getCorrectMarks(); }
      else { wc++; sc -= getIncorrectMarks(); }
    }
    const baseState = CBTState.visitedQuestions[i] ? (isAnswered ? 'answered' : 'not-answered') : 'unvisited';
    const isEvaluatedWrong = isLockedOrSub && isAnswered && !isAnswerCorrect(i);
    let dsp = isEvaluatedWrong ? 'wrong' : (isMarked ? 'marked' : baseState);
    const extraMarkedAns = (isMarked && isAnswered && !isEvaluatedWrong) ? ' has-answer' : '';

    let flt = false;
    if (CBTState.currentFilter !== 'all') {
      if (CBTState.currentFilter === 'answered' && !isAnswered) flt = true;
      else if (CBTState.currentFilter === 'not-answered' && baseState !== 'not-answered') flt = true;
      else if (CBTState.currentFilter === 'marked' && !isMarked) flt = true;
      else if (CBTState.currentFilter === 'unvisited' && baseState !== 'unvisited') flt = true;
    }
    const badgeOverlay = isEvaluatedWrong
      ? `<span class="badge-status-cross">✕</span>`
      : (isMarked && isAnswered ? `<span class="badge-status-saved" title="Answered & Marked for Review">✓</span>` : '');
    html += `<button type="button" class="palette-btn dsp-${dsp}${extraMarkedAns}${i === CBTState.currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" onclick="jumpToQuestion(${i})">${(i - s.start) + 1}${badgeOverlay}</button>`;
  }
  g.innerHTML = html;
  const calculatedScore = Number((sc - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
  if ($('stat-right')) $('stat-right').innerText = rc;
  if ($('stat-wrong')) $('stat-wrong').innerText = wc;
  if ($('stat-score')) $('stat-score').innerText = calculatedScore;
}

window.toggleExplanation = function() {
  const isL = CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted;
  if (!isL) { showToastAlert("Select and submit an answer to view the explanation."); return; }
  cancelAutoAdvance();
  const box = $('explanation-box'), btn = $('btn-toggle-exp'), label = $('btn-exp-label'), wrapper = $('q-explanation-wrapper');
  if (!box) return;
  const isOpen = box.classList.contains('open');
  box.classList.toggle('open', !isOpen);
  if (btn) btn.classList.toggle('open', !isOpen);
  if (label) label.innerText = isOpen ? "View Explanation" : "Hide Explanation";
  if (wrapper) wrapper.classList.toggle('has-open-content', !isOpen);
};

/* ==========================================================================
   SECTION 9: TIMERS, PROCTORING, GESTURES & KEYBOARD SHORTCUTS
   ========================================================================== */
function updateTimerDisplay() {
  const t = CBTState.sectionTimes[CBTState.currentYearIndex] || 0, m = Math.floor(t / 60), s = t % 60;
  if ($('time-left')) $('time-left').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
}

function startTimer() {
  if (CBTState.timerInterval) clearInterval(CBTState.timerInterval);
  let ticks = 0;
  CBTState.timerInterval = setInterval(() => {
    if (CBTState.isTimerPaused || CBTState.isTimerFrozen || !CBTState.isExamActive || CBTState.sections[CBTState.currentYearIndex]?.submitted) return;
    if (CBTState.sectionTimes[CBTState.currentYearIndex] > 0) {
      CBTState.sectionTimes[CBTState.currentYearIndex]--;
      CBTState.sections[CBTState.currentYearIndex].timeSpent++;
    }
    updateTimerDisplay();
    if (++ticks % 5 === 0) saveSessionToLocalStorage();
    if (CBTState.sectionTimes[CBTState.currentYearIndex] <= 0) autoLockAndSubmitSection();
  }, 1000);
}

function autoLockAndSubmitSection() {
  cancelAutoAdvance();
  CBTState.isTimerPaused = true;
  const m = $('modal-timeout');
  if (m) m.style.display = 'flex';
  setTimeout(() => { if (m) m.style.display = 'none'; window.processSectionSubmission(); }, 2000);
}

window.closeSecurityModal = () => {
  if ($('modal-security')) $('modal-security').style.display = 'none';
  document.querySelector('.sc-widget-container')?.classList.remove('sc-blur-active');
  CBTState.isTimerPaused = false;
};

function applySecurityPenalty() {
  if (!isProctoringEnabled() || Date.now() - CBTState.lastWT < 1000) return;
  CBTState.lastWT = Date.now();
  CBTState.securityWarnings++;
  if ($('warning-count-display')) $('warning-count-display').innerText = `Total Warnings: ${CBTState.securityWarnings} (Penalty: -${CBTState.securityWarnings * getPenaltyMarks()} Marks)`;
  document.querySelector('.sc-widget-container')?.classList.add('sc-blur-active');
  if ($('modal-security')) $('modal-security').style.display = 'flex';
  CBTState.isTimerPaused = true;
  updatePalette(); saveSessionToLocalStorage();
}

function handleSpaceBarTripleTap() {
  const now = Date.now();
  spacePressTimestamps.push(now);
  spacePressTimestamps = spacePressTimestamps.filter(t => now - t <= 1200);
  if (spacePressTimestamps.length >= 3) {
    spacePressTimestamps = [];
    CBTState.isTimerFrozen = true;
    $('timer-box')?.classList.add('timer-frozen');
  }
}

['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => document.addEventListener(ev, e => { if (isProctoringEnabled() && CBTState.isExamActive) e.preventDefault(); }));

document.addEventListener('keydown', e => {
  const activeEl = document.activeElement;
  if (activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable)) return;
  if ((e.code === 'Space' || e.key === ' ' || e.keyCode === 32) && CBTState.isExamActive && $('quiz-screen')?.style.display === 'block') {
    e.preventDefault(); handleSpaceBarTripleTap(); return;
  }
  if (CBTState.isExamActive && $('quiz-screen')?.style.display === 'block') {
    const key = e.key ? e.key.toUpperCase() : "", keyMap = { A: 0, 1: 0, B: 1, 2: 1, C: 2, 3: 2, D: 3, 4: 3 };
    if (key in keyMap) {
      e.preventDefault();
      const curQ = CBTState.questions[CBTState.currentQuestion];
      if (curQ?.options && keyMap[key] < curQ.options.length) saveAnswer(keyMap[key]);
      return;
    }
    if (key === 'M') { e.preventDefault(); toggleMarkForReview(); return; }
    if (e.key === 'Enter') { e.preventDefault(); nextQuestion(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); prevQuestion(); return; }
    if (e.key === 'Delete') { e.preventDefault(); clearResponse(); return; }
  }
  if (!CBTState.isExamActive || !isProctoringEnabled()) return;
  const keyLow = e.key ? e.key.toLowerCase() : "", codeLow = e.code ? e.code.toLowerCase() : "", ic = e.ctrlKey || e.metaKey;
  if (keyLow === 'printscreen' || codeLow === 'printscreen' || e.keyCode === 44 || (ic && e.shiftKey && ['3', '4', '5', 's'].includes(keyLow))) {
    e.preventDefault(); try { navigator.clipboard.writeText(''); } catch (err) {}
    applySecurityPenalty(); return false;
  }
  if (e.key === 'F12' || e.keyCode === 123 || (ic && e.shiftKey && ['i', 'j', 'c'].includes(keyLow)) || (ic && ['u', 'p', 's', 'r'].includes(keyLow)) || e.key === 'F5') {
    e.preventDefault(); applySecurityPenalty(); return false;
  }
});

function handleBlurOrHide() {
  if (!CBTState.isExamActive || !isProctoringEnabled() || CBTState.isTimerPaused) return;
  if (document.visibilityState === 'hidden' || !document.hasFocus()) applySecurityPenalty();
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') handleBlurOrHide(); });
window.addEventListener("blur", handleBlurOrHide);

function placeActionMatrix() {
  const matrix = $('action-matrix-slot'), contentArea = $('question-content'), palette = $('palette-column-container');
  if (!matrix || !contentArea || !palette) return;
  if (window.innerWidth <= 640) {
    const toppers = $('sidebar-toppers');
    if (toppers && toppers.parentNode === contentArea) contentArea.insertBefore(matrix, toppers);
    else contentArea.appendChild(matrix);
  } else palette.appendChild(matrix);
}

window.addEventListener('resize', debounce(() => {
  placeActionMatrix();
  if (CBTState.allFetchedRecords?.length > 0) renderSidebarToppers(CBTState.allFetchedRecords);
}, 150));

function setupMobileGestures() {
  const contentArea = $('question-content');
  if (!contentArea) return;
  contentArea.addEventListener('touchstart', e => {
    if (window.innerWidth > 640) return;
    touchStartX = e.changedTouches[0].clientX; touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  contentArea.addEventListener('touchend', e => {
    if (window.innerWidth > 640 || !CBTState.isExamActive) return;
    const diffX = e.changedTouches[0].clientX - touchStartX, diffY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(diffX) > 55 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) nextQuestion(); else prevQuestion();
    }
  }, { passive: true });
}

window.handleOptionDoubleTap = function(e, idx) {
  if (window.innerWidth > 640) return;
  const currentTime = Date.now();
  if (currentTime - lastOptionTapTime < 350 && lastTappedIndex === idx) {
    e.preventDefault();
    if (!CBTState.lockedAnswers[CBTState.currentQuestion] && !CBTState.sections[CBTState.currentYearIndex].submitted) {
      try { navigator.vibrate?.(35); } catch (err) {}
      saveAnswer(idx); CBTState.lockedAnswers[CBTState.currentQuestion] = true; loadQuestion(); scheduleAutoAdvance(2000);
    }
    lastOptionTapTime = 0; lastTappedIndex = -1;
  } else { lastOptionTapTime = currentTime; lastTappedIndex = idx; }
};

window.handleOptionDesktopDblClick = function(e, idx) {
  if (window.innerWidth <= 640) return;
  if (!CBTState.lockedAnswers[CBTState.currentQuestion] && !CBTState.sections[CBTState.currentYearIndex].submitted) {
    saveAnswer(idx); CBTState.lockedAnswers[CBTState.currentQuestion] = true; loadQuestion(); scheduleAutoAdvance(2000);
  }
};

/* ==========================================================================
   SECTION 10: LEADERBOARD, TOP PERFORMERS & DYNAMIC RANK
   ========================================================================== */
async function fetchAndRenderSidebarToppers() {
  const fetchRecordUrl = getFetchRecordOfCBT(), container = $('sidebar-toppers');
  if (!fetchRecordUrl) return;
  try {
    const testName = getTestName(), sec = CBTState.sections[CBTState.currentYearIndex], currentSection = sec ? `${sec.year} - ${sec.title}` : "";
    const res = await fetch(`${fetchRecordUrl}?testName=${encodeURIComponent(testName)}&currentSection=${encodeURIComponent(currentSection)}&_t=${Date.now()}`);
    const data = await res.json();
    let recordsList = data ? (data.records || data.top7 || data.top5 || data.toppers || (Array.isArray(data) ? data : [])) : [];
    if ((!recordsList || recordsList.length === 0) && currentSection) {
      try {
        const broadRes = await fetch(`${fetchRecordUrl}?testName=${encodeURIComponent(testName)}&_t=${Date.now()}`);
        const broadData = await broadRes.json();
        recordsList = broadData ? (broadData.records || broadData.top7 || broadData.top5 || broadData.toppers || (Array.isArray(broadData) ? broadData : [])) : [];
      } catch (e) {}
    }
    CBTState.allFetchedRecords = recordsList || [];
    if (recordsList?.length > 0) { renderSidebarToppers(recordsList); updateUserDynamicRank(); }
    else if (container) container.style.display = 'none';
  } catch (err) { if (container) container.style.display = 'none'; }
}

function getSectionRankedCandidates() {
  const sec = CBTState.sections[CBTState.currentYearIndex];
  const curSec = sec ? `${sec.year} - ${sec.title}`.trim().toLowerCase() : "";
  const list = (CBTState.allFetchedRecords || []).filter(t => {
    if (!t) return false;
    const name = String(t.studentName || t.name || "").trim();
    if (!name || name.toLowerCase() === "awaiting...") return false;
    const recSec = String(t.currentSection || t.section || "").trim().toLowerCase();
    return (curSec && recSec) ? (recSec === curSec || recSec.includes(curSec) || curSec.includes(recSec)) : true;
  });
  const getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0;
  const getAccuracy = t => parseFloat((t.accuracy || "0").toString().replace("%", "")) || 0;
  return list.sort((a, b) => (getMarks(b) - getMarks(a)) || (getAccuracy(b) - getAccuracy(a)));
}

window.openLeaderboardModal = async function() {
  let modal = $('modal-leaderboard');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-leaderboard';
    modal.className = 'custom-modal-overlay';
    modal.onclick = e => { if (e.target === modal) closeLeaderboardModal(); };
    document.body.appendChild(modal);
  }
  const sec = CBTState.sections[CBTState.currentYearIndex];
  const curSecTitle = sec ? `${sec.year} - ${sec.title}` : "Current Section";

  const buildModalContent = (isLoading = false) => {
    const candidates = getSectionRankedCandidates();
    const getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0;
    const rowsHTML = candidates.length === 0
      ? `<div class="lb-empty-state">${isLoading ? 'Syncing latest records...' : 'No candidate scores recorded for this section yet.'}</div>`
      : candidates.map((t, idx) => {
          const rank = idx + 1;
          const badgeClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-rest'));
          const badgeText = rank <= 3 ? `${rank}` : `#${rank}`;
          const rawName = (t.studentName || t.name || '').replace(/\s*\(Reload\s*Dropout\)/gi, '').trim();
          const name = escapeHTML(rawName), marksVal = getMarks(t), marksText = `${marksVal % 1 === 0 ? marksVal : marksVal.toFixed(2)}`;
          const cls = (t.studentClass || t.classVal || "").toString().replace(/^Class\s*/i, '').trim();
          const sSec = (t.studentSection || t.sectionVal || "").toString().replace(/^Sec\s*/i, '').trim();
          const clsSec = (cls && sSec) ? `${cls}-${sSec}` : (cls || sSec || "-");
          const rawSchool = (t.schoolName || t.school || "").toString().trim();
          const school = escapeHTML(rawSchool && rawSchool.toUpperCase() !== "N/A" ? rawSchool : "-");
          const isUser = CBTState.studentNameVal && rawName.toLowerCase() === CBTState.studentNameVal.trim().toLowerCase();
          return `<div class="lb-table-row ${badgeClass} ${isUser ? 'lb-current-user' : ''}">
            <div class="lb-col-rank"><span class="tp6-badge-shape">${badgeText}</span></div>
            <div class="lb-col-name" title="${name}"><span class="lb-name-text">${name}</span>${isUser ? `<span class="lb-you-tag">You</span>` : ''}</div>
            <div class="lb-col-school" title="${school !== '-' ? school : ''}">${school}</div>
            <div class="lb-col-class"><span class="lb-class-pill">${escapeHTML(clsSec)}</span></div>
            <div class="lb-col-marks"><span class="lb-marks-badge ${marksVal < 0 ? 'negative' : ''}">${marksText}</span></div>
          </div>`;
        }).join('');

    modal.innerHTML = `
      <div class="custom-modal-box leaderboard-modal-box">
        <div class="lb-modal-header">
          <div class="lb-modal-title-group">
            <h3 class="lb-modal-title">🏆 Section Leaderboard ${isLoading ? '<span style="font-size:0.78rem;color:#2563eb;font-weight:600;margin-left:4px;">(Refreshing...)</span>' : ''}</h3>
            <span class="lb-modal-subtitle">${escapeHTML(curSecTitle)} · ${candidates.length} Candidate${candidates.length === 1 ? '' : 's'}</span>
          </div>
          <button type="button" class="lb-close-btn" onclick="closeLeaderboardModal()" title="Close">✕</button>
        </div>
        <div class="lb-table-wrap">
          <div class="lb-table-header">
            <div class="lb-col-rank">Rank</div><div class="lb-col-name">Name</div><div class="lb-col-school">School Name</div><div class="lb-col-class">Class&amp;Sec</div><div class="lb-col-marks">Marks</div>
          </div>
          <div class="lb-candidate-list">${rowsHTML}</div>
        </div>
        <div class="modal-btn-row" style="margin-top:12px;"><button type="button" class="modal-btn-confirm-cancel" onclick="closeLeaderboardModal()" style="width:100%;height:42px;border-radius:10px;font-weight:700;">Close Leaderboard</button></div>
      </div>`;
  };
  buildModalContent(true);
  modal.style.display = 'flex';
  await fetchAndRenderSidebarToppers();
  buildModalContent(false);
};

window.closeLeaderboardModal = () => { if ($('modal-leaderboard')) $('modal-leaderboard').style.display = 'none'; };

function renderSidebarToppers(toppersArray) {
  const container = $('sidebar-toppers'), listEl = $('sidebar-toppers-list');
  if (!container || !listEl) return;
  const realToppers = (toppersArray || []).filter(t => t && (t.studentName || t.name) && String(t.studentName || t.name).trim() !== "" && String(t.studentName || t.name).toLowerCase() !== "awaiting...");
  const getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0;
  const getAccuracy = t => parseFloat((t.accuracy || "0").toString().replace("%", "")) || 0;
  realToppers.sort((a, b) => (getMarks(b) - getMarks(a)) || (getAccuracy(b) - getAccuracy(a)));
  const top7 = realToppers.slice(0, 7);
  let cardsHTML = top7.map((t, idx) => {
    const rank = idx + 1;
    const cardTheme = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-rest'));
    const badgeText = rank <= 3 ? `${rank}` : `#${rank}`;
    const rawName = (t.studentName || t.name || '').replace(/\s*\(Reload\s*Dropout\)/gi, '').trim();
    const name = escapeHTML(rawName), marksVal = getMarks(t), marksText = `${marksVal} ${marksVal === 1 ? 'Mark' : 'Marks'}`;
    const cls = (t.studentClass || t.classVal || "").toString().replace(/^Class\s*/i, '').trim();
    const sec = (t.studentSection || t.sectionVal || "").toString().replace(/^Sec\s*/i, '').trim();
    const clsSec = (cls && sec) ? `${cls}-${sec}` : (cls || sec || ""), school = escapeHTML((t.schoolName || t.school || "").toString().trim());
    return `<div class="tp6-compact-card ${cardTheme}"><span class="tp6-badge-shape">${badgeText}</span><span class="tp6-name-text" title="${name}">${name}</span>${marksText ? `<span class="tp6-pipe">|</span><span class="tp6-score-text">${marksText}</span>` : ''}${clsSec ? `<span class="tp6-pipe">|</span><span class="tp6-class-text">${clsSec}</span>` : ''}${school ? `<span class="tp6-school-tag">${school}</span>` : ''}</div>`;
  }).join('');
  if (top7.length < 7) cardsHTML += `<div class="tp6-compact-card tp6-next-card"><span class="tp6-next-trophy">🏆</span><span class="tp6-next-text">You Could Be Next!</span></div>`;
  listEl.innerHTML = `<div class="tp6-row">${cardsHTML}</div>`;
  container.style.display = 'flex';
}

function calculateCurrentExamScore() {
  const s = CBTState.sections[CBTState.currentYearIndex];
  if (!s) return 0;
  let sc = 0;
  for (let i = s.start; i < s.end; i++) {
    if (CBTState.userAnswers[i] !== null && (CBTState.lockedAnswers[i] || s.submitted)) {
      if (isAnswerCorrect(i)) sc += getCorrectMarks(); else sc -= getIncorrectMarks();
    }
  }
  return Number((sc - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
}

function updateUserDynamicRank() {
  if (!CBTState.allFetchedRecords?.length) return;
  const currentScore = calculateCurrentExamScore(), getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0;
  const validScores = CBTState.allFetchedRecords.filter(t => t && (t.studentName || t.name)).map(getMarks);
  if (!validScores.length) return;
  const higherCount = validScores.filter(score => score > currentScore).length;
  const rankStr = `${higherCount + 1} / ${validScores.length + 1}`;
  if ($('user-current-rank-badge') && $('user-current-rank-text')) {
    $('user-current-rank-text').innerText = rankStr;
    $('user-current-rank-badge').style.display = 'inline-flex';
  }
  if ($('lbl-rs-rank-val')) $('lbl-rs-rank-val').innerText = rankStr;
}

/* ==========================================================================
   SECTION 11: SECTION SUBMISSION, SCORECARD, REATTEMPT & EVALUATION
   ========================================================================== */
window.showSubmitModal = () => {
  cancelAutoAdvance();
  if (CBTState.userAnswers[CBTState.currentQuestion] !== null && !CBTState.sections[CBTState.currentYearIndex].submitted) {
    CBTState.lockedAnswers[CBTState.currentQuestion] = true;
  }
  if ($('submit-modal-text')) $('submit-modal-text').innerText = `Submit responses for ${CBTState.sections[CBTState.currentYearIndex].title}?`;
  CBTState.isTimerPaused = true;
  if ($('modal-submit')) $('modal-submit').style.display = 'flex';
};
window.closeSubmitModal = () => { if ($('modal-submit')) $('modal-submit').style.display = 'none'; CBTState.isTimerPaused = false; };
window.confirmSubmitExam = () => { if ($('modal-submit')) $('modal-submit').style.display = 'none'; CBTState.isTimerPaused = false; window.processSectionSubmission(); };

window.processSectionSubmission = async function() {
  cancelAutoAdvance();
  const sec = CBTState.sections[CBTState.currentYearIndex];
  sec.submitted = true;
  for (let i = sec.start; i < sec.end; i++) CBTState.lockedAnswers[i] = true;
  document.body.classList.remove('exam-in-progress');
  if ($('quiz-screen')) $('quiz-screen').style.display = 'none';
  if ($('unified-nav')) $('unified-nav').style.display = 'none';

  const resScreen = $('result-screen'), loaderBox = $('processing-loader-box'), scFrame = $('capture-scorecard-frame'), sumCard = $('cumulative-matrix-container');
  if (resScreen) resScreen.style.display = 'block';
  if (loaderBox) loaderBox.style.display = 'flex';
  if (scFrame) scFrame.style.display = 'none';
  if (sumCard) sumCard.style.display = 'none';

  if ($('lbl-user-greeting')) $('lbl-user-greeting').innerText = CBTState.studentNameVal || "";
  if ($('lbl-section-title')) $('lbl-section-title').innerText = `${sec.title} Completed,`;

  let secCorrect = 0, secIncorrect = 0, secUnattempted = 0, secMarks = 0;
  const totalQuestions = sec.end - sec.start, totalSectionMarks = totalQuestions * getCorrectMarks();
  for (let i = sec.start; i < sec.end; i++) {
    if (CBTState.userAnswers[i] !== null) {
      if (isAnswerCorrect(i)) { secCorrect++; secMarks += getCorrectMarks(); }
      else { secIncorrect++; secMarks -= getIncorrectMarks(); }
    } else secUnattempted++;
  }
  secMarks = Number(secMarks.toFixed(2));
  const formattedTime = `${Math.floor(sec.timeSpent / 60).toString().padStart(2, '0')}:${(sec.timeSpent % 60).toString().padStart(2, '0')}`;
  if ($('lbl-score-obtained')) $('lbl-score-obtained').innerText = (secMarks % 1 === 0) ? secMarks : secMarks.toFixed(2);
  if ($('lbl-score-total')) $('lbl-score-total').innerText = (totalSectionMarks % 1 === 0) ? totalSectionMarks : totalSectionMarks.toFixed(2);
  if ($('lbl-stat-correct-val')) $('lbl-stat-correct-val').innerText = secCorrect;
  if ($('lbl-stat-incorrect-val')) $('lbl-stat-incorrect-val').innerText = secIncorrect;
  if ($('lbl-stat-unattempted-val')) $('lbl-stat-unattempted-val').innerText = secUnattempted;
  if ($('lbl-stat-time-val')) $('lbl-stat-time-val').innerText = formattedTime;

  updateUserDynamicRank();

  const tg = $('table-body-matrix-target');
  if (tg) {
    tg.innerHTML = '';
    let cM = 0, aS = 0, rC = 0, rI = 0, rL = 0, totalExamQ = 0;
    const fmtPct = v => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)) + '%';
    CBTState.sections.forEach(s => {
      let sC = 0, sI = 0, sL = 0, sS = 0;
      const sT = s.end - s.start, sM = sT * getCorrectMarks();
      cM += sM; totalExamQ += sT;
      for (let i = s.start; i < s.end; i++) {
        if (CBTState.userAnswers[i] !== null) {
          if (isAnswerCorrect(i)) { sC++; sS += getCorrectMarks(); }
          else { sI++; sS -= getIncorrectMarks(); }
        } else sL++;
      }
      aS += sS; rC += sC; rI += sI; rL += sL;
      const pR = sM > 0 && sS > 0 && s.submitted ? Math.round((sS / sM) * 100) : 0;
      tg.innerHTML += `<div class="img4-row"><div class="img4-sec-col"><div class="img4-file-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div><div class="img4-sec-titles"><span class="img4-sec-name">${escapeHTML(s.title)}</span><span class="img4-sec-ques">${sT} Ques.</span></div></div><div class="img4-cell-stat"><span class="img4-pill-badge green">${s.submitted ? pR : 0}%</span><span class="img4-sub-ratio">(${s.submitted ? (sS % 1 === 0 ? sS : sS.toFixed(2)) : 0} / ${sM % 1 === 0 ? sM : sM.toFixed(2)})</span></div><div class="img4-cell-stat"><span class="img4-stat-num correct">${s.submitted ? sC : '0'}</span><span class="img4-sub-ratio">${fmtPct(sT > 0 && s.submitted ? ((sC / sT) * 100) : 0)}</span></div><div class="img4-cell-stat"><span class="img4-stat-num incorrect">${s.submitted ? sI : '0'}</span><span class="img4-sub-ratio">${fmtPct(sT > 0 && s.submitted ? ((sI / sT) * 100) : 0)}</span></div><div class="img4-cell-stat"><span class="img4-stat-num unattempted">${s.submitted ? sL : sT}</span><span class="img4-sub-ratio">${fmtPct(sT > 0 ? (((s.submitted ? sL : sT) / sT) * 100) : 0)}</span></div></div>`;
    });
    aS = Number((aS - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
    tg.innerHTML += `<div class="img4-row total-row"><div class="img4-sec-col"><div class="img4-file-icon-box" style="font-weight:900;font-size:1.15rem;color:#1e3a8a;">Σ</div><div class="img4-sec-titles"><span class="img4-sec-name">TOTAL</span><span class="img4-sec-ques">${totalExamQ} Ques.</span></div></div><div class="img4-cell-stat"><span class="img4-pill-badge blue">${cM > 0 ? Math.round((aS / cM) * 100) : 0}%</span><span class="img4-sub-ratio">(${aS % 1 === 0 ? aS : aS.toFixed(2)} / ${cM % 1 === 0 ? cM : cM.toFixed(2)})</span></div><div class="img4-cell-stat"><span class="img4-stat-num correct">${rC}</span><span class="img4-sub-ratio">${fmtPct(totalExamQ > 0 ? ((rC / totalExamQ) * 100) : 0)}</span></div><div class="img4-cell-stat"><span class="img4-stat-num incorrect">${rI}</span><span class="img4-sub-ratio">${fmtPct(totalExamQ > 0 ? ((rI / totalExamQ) * 100) : 0)}</span></div><div class="img4-cell-stat"><span class="img4-stat-num unattempted">${rL}</span><span class="img4-sub-ratio">${fmtPct(totalExamQ > 0 ? ((rL / totalExamQ) * 100) : 0)}</span></div></div>`;
  }

  const saveUrl = getSaveRecordOfCBT();
  if (saveUrl) {
    const params = new URLSearchParams();
    params.append("timestamp", getFormattedTimestamp());
    params.append("studentName", CBTState.studentNameVal || "");
    params.append("studentClass", CBTState.studentClassVal?.toString().startsWith("Class") ? CBTState.studentClassVal : `Class ${CBTState.studentClassVal || ""}`);
    params.append("studentSection", CBTState.studentSectionVal);
    params.append("schoolName", CBTState.schoolNameVal);
    params.append("testName", getTestName());
    params.append("currentSection", `${sec.year} - ${sec.title}`);
    params.append("obtainedScore", secMarks);
    params.append("correctAnswers", secCorrect);
    params.append("incorrectAnswers", secIncorrect);
    params.append("unattemptQuestions", secUnattempted);
    params.append("accuracy", totalQuestions > 0 ? ((secCorrect / totalQuestions) * 100).toFixed(2) + "%" : "0.00%");
    params.append("avgTimePerQuestion", totalQuestions > 0 ? (sec.timeSpent / totalQuestions).toFixed(1) + "s" : "0s");
    params.append("proctoringWarnings", CBTState.securityWarnings);
    params.append("activeTimeTaken", formattedTime);
    try { await fetch(saveUrl, { method: "POST", body: params }); } catch (err) {}
  }

  await new Promise(res => setTimeout(res, 900));
  if (loaderBox) loaderBox.style.display = 'none';
  if (scFrame) scFrame.style.display = 'flex';
  const b = $('btn-dashboard-main-trigger');
  if (b) {
    b.disabled = false; b.style.opacity = '1';
    b.innerHTML = (CBTState.currentYearIndex < CBTState.sections.length - 1) ? `CONTINUE TO NEXT SECTION &rarr;` : `COMPLETE EVALUATION SUMMARY`;
  }
};

window.reAttemptExam = function() {
  cancelAutoAdvance();
  clearSessionLocalStorage();

  const resScreen = $('result-screen'), loaderBox = $('processing-loader-box');
  const scFrame = $('capture-scorecard-frame'), sumCard = $('cumulative-matrix-container');
  if (resScreen) resScreen.style.display = 'none';
  if (loaderBox) loaderBox.style.display = 'none';
  if (scFrame) scFrame.style.display = 'none';
  if (sumCard) sumCard.style.display = 'none';

  const targetPapers = (CBTState.selectedSectionMode === 'ALL' || !CBTState.listExamPapers[parseInt(CBTState.selectedSectionMode, 10)])
    ? CBTState.listExamPapers
    : [CBTState.listExamPapers[parseInt(CBTState.selectedSectionMode, 10)]];

  if (!targetPapers || targetPapers.length === 0) {
    showToastAlert("Unable to restart quiz. Please reload the page.");
    return;
  }

  CBTState.questions = [];
  CBTState.sections = [];
  let qt = 0;
  targetPapers.forEach((p, idx) => {
    const st = qt, sq = p.questions.map(q => ({
      question: q.text, tag: q.tag ?? "CBSE", options: [...q.options],
      image: q.image ?? "", correctAnswerText: q.correctAnswerText, explanation: q.explanation ?? ""
    }));
    shuffleArray(sq);
    sq.forEach(q => { CBTState.questions.push(q); qt++; });
    CBTState.sections.push({ index: idx, title: p.title, year: p.year, start: st, end: qt, submitted: false, timeSpent: 0 });
  });

  CBTState.userAnswers = new Array(CBTState.questions.length).fill(null);
  CBTState.visitedQuestions = new Array(CBTState.questions.length).fill(false);
  CBTState.lockedAnswers = new Array(CBTState.questions.length).fill(false);
  CBTState.markedQuestions = new Array(CBTState.questions.length).fill(false);
  CBTState.sectionTimes = CBTState.sections.map(s => (s.end - s.start) * 60);
  CBTState.currentYearIndex = 0;
  CBTState.currentQuestion = CBTState.sections[0].start;
  CBTState.isTimerPaused = false;
  CBTState.isTimerFrozen = false;
  CBTState.securityWarnings = 0;
  CBTState.isExamActive = true;

  document.body.classList.add('exam-in-progress');
  if ($('quiz-screen')) $('quiz-screen').style.display = 'block';
  if ($('unified-nav')) $('unified-nav').style.display = 'flex';

  ensureReviewControlsExist();
  buildYearNav();
  updateTimerDisplay();
  startTimer();
  loadQuestion();
  saveSessionToLocalStorage();
  fetchAndRenderSidebarToppers();
  showToastAlert(`Restarting quiz for ${CBTState.studentNameVal || 'student'}!`);
};

window.openNotesAndOneShot = function() {
  triggerVerifyModal('resources');
};

window.handleSectionProgression = () => (CBTState.currentYearIndex < CBTState.sections.length - 1) ? executeProgressionAdvance() : showFinalCumulativeEvaluation();

function showFinalCumulativeEvaluation() {
  cancelAutoAdvance(); clearSessionLocalStorage();
  if ($('capture-scorecard-frame')) $('capture-scorecard-frame').style.display = 'none';
  if ($('cumulative-matrix-container')) {
    $('cumulative-matrix-container').style.display = 'block'; $('cumulative-matrix-container').scrollIntoView({ behavior: 'smooth' });
  }
}

function executeProgressionAdvance() {
  cancelAutoAdvance();
  if (CBTState.currentYearIndex + 1 < CBTState.sections.length) {
    CBTState.currentYearIndex++;
    CBTState.currentQuestion = CBTState.sections[CBTState.currentYearIndex].start;
    if ($('result-screen')) $('result-screen').style.display = 'none';
    if ($('quiz-screen')) $('quiz-screen').style.display = 'block';
    if ($('unified-nav')) $('unified-nav').style.display = 'flex';
    buildYearNav(); updateTimerDisplay(); loadQuestion();
  } else showFinalCumulativeEvaluation();
}

/* ==========================================================================
   SECTION 12: RESOURCE VERIFICATION MODAL & FEEDBACK SHOWCASE
   ========================================================================== */
function triggerVerifyModal(type) {
  const modal = $('verify-resource-modal'), heading = $('verify-modal-heading'), text = $('verify-modal-text'), actionBtn = $('verify-proceed-action-btn');
  if (!modal) return;
  modal.style.display = 'flex';
  if (type === 'yt') {
    CBTState.activeResourceUrl = getYoutubeUrl();
    if (heading) heading.innerText = "Watch Video Lesson?";
    if (text) text.innerText = "Open educational video tutorial in a new tab?";
    if (actionBtn) { actionBtn.innerText = "Watch Video"; actionBtn.onclick = () => { window.open(CBTState.activeResourceUrl, '_blank'); closeVerifyModal(); }; }
  } else if (type === 'notes') {
    CBTState.activeResourceUrl = getNotesUrl();
    if (heading) heading.innerText = "Open Study Notes?";
    if (text) text.innerText = "Open study notes in a new tab while keeping your exam active?";
    if (actionBtn) { actionBtn.innerText = "Open Notes"; actionBtn.onclick = () => { window.open(CBTState.activeResourceUrl, '_blank'); closeVerifyModal(); }; }
  } else if (type === 'resources') {
    CBTState.activeResourceUrl = getYoutubeUrl();
    if (heading) heading.innerText = "Study Notes & OneShot Video";
    if (text) text.innerText = "Open educational revision video and notes in a new tab?";
    if (actionBtn) { actionBtn.innerText = "Open Resources"; actionBtn.onclick = () => { if (CBTState.activeResourceUrl && CBTState.activeResourceUrl !== "#") window.open(CBTState.activeResourceUrl, '_blank'); closeVerifyModal(); }; }
  } else if (type === 'back') {
    if (heading) heading.innerText = "Leave Exam Session?";
    if (text) text.innerText = "Are you sure you want to go back? Your current progress is saved.";
    if (actionBtn) { actionBtn.innerText = "Leave"; actionBtn.onclick = () => { closeVerifyModal(); goPageBack(); }; }
  }
}
window.triggerVerifyModal = triggerVerifyModal;
window.closeVerifyModal = () => { if ($('verify-resource-modal')) $('verify-resource-modal').style.display = 'none'; };
window.goToHome = () => triggerVerifyModal('back');

function triggerFeedbackSectionAnimation() {
  const container = $('cbt-interactive-feedback-wrapper');
  if (container && !container.classList.contains('section-entered')) container.classList.add('section-entered');
  if (!CBTState.hasFetchedFeedback) { CBTState.hasFetchedFeedback = true; fetchFeedbackSubmissions(); }
}

function setupFeedbackSectionObserver() {
  const container = $('cbt-interactive-feedback-wrapper');
  if (!container) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { triggerFeedbackSectionAnimation(); observer.unobserve(entry.target); } });
  }, { rootMargin: "150px 0px", threshold: 0.05 });
  observer.observe(container);
}

function triggerSlowMotionStarsAnimation() {
  if (CBTState.hasAnimatedStars || !CBTState.feedbackRating) return;
  CBTState.hasAnimatedStars = true;
  document.querySelectorAll('#fb-stars-group .fb-star').forEach((star, index) => {
    setTimeout(() => {
      star.classList.add('auto-pulse', 'active');
      setTimeout(() => { star.classList.remove('auto-pulse'); setFeedbackRating(CBTState.feedbackRating, false); }, 400);
    }, index * 140);
  });
}

function setupStarScrollObserver() {
  const target = $('feedback-rating-section');
  if (!target) return;
  new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) triggerSlowMotionStarsAnimation(); }); }, { threshold: 0.25 }).observe(target);
}

window.handleStarHover = function(e, starVal) {
  const rect = e.currentTarget.getBoundingClientRect(), isLeftHalf = (e.clientX - rect.left) < (rect.width / 2);
  previewStars(isLeftHalf ? (starVal - 0.5) : starVal);
};

window.handleStarClick = function(e, starVal) {
  const rect = e.currentTarget.getBoundingClientRect(), isLeftHalf = (e.clientX - rect.left) < (rect.width / 2);
  setFeedbackRating(isLeftHalf ? (starVal - 0.5) : starVal, true);
};

window.previewStars = function(rating) {
  document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => {
    const val = parseInt(s.getAttribute('data-val'), 10);
    s.classList.remove('hovered', 'hovered-half');
    if (val < Math.ceil(rating)) s.classList.add('hovered');
    else if (val === Math.ceil(rating)) s.classList.add(rating % 1 !== 0 ? 'hovered-half' : 'hovered');
  });
};

window.resetStarsPreview = function() {
  document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => s.classList.remove('hovered', 'hovered-half'));
  setFeedbackRating(CBTState.feedbackRating, false);
};

window.setFeedbackRating = function(rating, manual) {
  CBTState.feedbackRating = Number(rating) || 0;
  if (CBTState.feedbackRating > 0) {
    document.querySelector('.fb-row2-left')?.classList.remove('field-error');
  }
  document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => {
    const val = parseInt(s.getAttribute('data-val'), 10);
    s.classList.remove('half-active', 'active', 'hovered', 'hovered-half');
    if (CBTState.feedbackRating > 0) {
      if (val < Math.ceil(CBTState.feedbackRating)) s.classList.add('active');
      else if (val === Math.ceil(CBTState.feedbackRating)) s.classList.add(CBTState.feedbackRating % 1 !== 0 ? 'half-active' : 'active');
    }
  });
};

window.updateFbCharCount = textarea => { if ($('fb-char-counter')) $('fb-char-counter').innerText = `${textarea.value.length}/500`; };

window.toggleFeedbackPill = radioInput => {
  CBTState.feedbackCategory = radioInput.value;
  document.querySelector('.fb-type-selection-wrapper')?.classList.remove('field-error');
  document.querySelectorAll('.fb-radio-pill-exact').forEach(pill => pill.classList.remove('active'));
  radioInput.closest('.fb-radio-pill-exact')?.classList.add('active');
};

function clearFeedbackFieldErrors() {
  document.querySelector('.fb-input-wrapper-embedded')?.classList.remove('field-error');
  document.querySelector('.fb-row2-left')?.classList.remove('field-error');
  document.querySelector('.fb-type-selection-wrapper')?.classList.remove('field-error');
}

function resetFeedbackForm() {
  CBTState.feedbackRating = 0;
  CBTState.feedbackCategory = "";
  const msgEl = $('feedback-user-message');
  if (msgEl) {
    msgEl.value = "";
    updateFbCharCount(msgEl);
  }
  setFeedbackRating(0);
  document.querySelectorAll('.fb-radio-pill-exact').forEach(pill => pill.classList.remove('active'));
  document.querySelectorAll('input[name="fb-category"]').forEach(radio => { radio.checked = false; });
  clearFeedbackFieldErrors();
}

window.submitUserFeedback = async function() {
  const msgEl = $('feedback-user-message');
  const rawMessage = msgEl ? msgEl.value.trim() : "";
  const inputWrap = msgEl ? msgEl.closest('.fb-input-wrapper-embedded') : null;
  const ratingWrap = document.querySelector('.fb-row2-left');
  const typeWrap = document.querySelector('.fb-type-selection-wrapper');

  let hasError = false;

  // 1. Textarea Validation + Tactile Shake
  if (!rawMessage) {
    hasError = true;
    if (inputWrap) {
      inputWrap.classList.remove('field-error');
      void inputWrap.offsetWidth;
      inputWrap.classList.add('field-error');
    }
  }

  // 2. Star Rating Validation + Tactile Shake
  if (!CBTState.feedbackRating || CBTState.feedbackRating <= 0) {
    hasError = true;
    if (ratingWrap) {
      ratingWrap.classList.remove('field-error');
      void ratingWrap.offsetWidth;
      ratingWrap.classList.add('field-error');
    }
  }

  // 3. Category Type Validation + Tactile Shake
  if (!CBTState.feedbackCategory) {
    hasError = true;
    if (typeWrap) {
      typeWrap.classList.remove('field-error');
      void typeWrap.offsetWidth;
      typeWrap.classList.add('field-error');
    }
  }

  if (hasError) {
    showToastAlert("Please complete the highlighted required fields.");
    if (!rawMessage && msgEl) msgEl.focus();
    return;
  }

  const btn = $('btn-save-feedback'), sendIcon = $('fb-send-icon'), spinIcon = $('fb-spin-icon'), btnLabel = $('fb-btn-label');
  if (btn) {
    btn.disabled = true; btn.classList.add('saving-active');
    if (sendIcon) sendIcon.style.display = 'none';
    if (spinIcon) spinIcon.style.display = 'inline-block';
    if (btnLabel) btnLabel.innerText = "Saving...";
  }

  const payload = {
    chapter: getTestName(),
    studentClass: CBTState.studentClassVal || "Class XII",
    category: CBTState.feedbackCategory,
    name: CBTState.studentNameVal || "",
    rating: `${CBTState.feedbackRating} Stars`,
    message: rawMessage
  };

  const showSuccessBadge = () => {
    if (btn) { btn.classList.remove('saving-active'); btn.classList.add('success-active'); }
    if (spinIcon) spinIcon.style.display = 'none';
    if (sendIcon) sendIcon.style.display = 'none';
    if (btnLabel) btnLabel.innerHTML = `Response Submitted`;
    resetFeedbackForm();
    setTimeout(() => {
      if (btn) { btn.disabled = false; btn.classList.remove('success-active'); }
      if (sendIcon) sendIcon.style.display = 'inline-block';
      if (spinIcon) spinIcon.style.display = 'none';
      if (btnLabel) btnLabel.innerText = "Submit Response";
    }, 2400);
  };

  try {
    await fetch(getFeedbackScriptURL(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    showSuccessBadge(); await fetchFeedbackSubmissions();
  } catch (err) { showSuccessBadge(); }
};

async function fetchFeedbackSubmissions() {
  const scriptURL = getFeedbackScriptURL();
  if (!scriptURL) return;
  try {
    const res = await fetch(scriptURL), json = await res.json();
    if (json?.status === "success" && Array.isArray(json.data)) {
      const currentChapter = getTestName().trim().toLowerCase();
      const filtered = json.data.filter(item => { const c = (item.chapter || "").trim().toLowerCase(); return c === currentChapter || c === "n/a" || c === ""; });
      CBTState.feedbackDataStore = filtered;
      renderSubmissionsShowcase(filtered);
    }
  } catch (err) {}
}

function renderSubmissionsShowcase(dataList) {
  const countApprovedEl = $('count-approved-badge'), countPendingEl = $('count-pending-badge');
  const streamApproved = $('stream-approved-cards'), streamPending = $('stream-pending-cards'), viewMoreWrap = $('ssc-view-more-wrap');
  const approved = dataList.filter(item => (item.status || "").trim().toLowerCase() === "approved");
  const pending = dataList.filter(item => (item.status || "").trim().toLowerCase() !== "approved");
  if (countApprovedEl) countApprovedEl.innerText = approved.length;
  if (countPendingEl) countPendingEl.innerText = pending.length;
  const maxInitial = CBTState.isExpandedSubmissions ? 9999 : 20;
  const approvedToShow = approved.slice(0, maxInitial), pendingToShow = pending.slice(0, maxInitial);
  if (viewMoreWrap) {
    viewMoreWrap.style.display = approved.length > 20 ? 'block' : 'none';
    if ($('lbl-load-more-text')) $('lbl-load-more-text').innerText = CBTState.isExpandedSubmissions ? 'Show Less ↑' : 'View More Responses (20+) ↓';
  }
  const buildStars = ratingRaw => {
    const num = parseFloat(ratingRaw) || 5;
    let starsStr = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(num)) starsStr += `<svg class="ssc-star-svg filled" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
      else if (i === Math.ceil(num) && num % 1 !== 0) starsStr += `<svg class="ssc-star-svg" style="fill:url(#half-fill-grad);stroke:url(#half-stroke-grad);" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
      else starsStr += `<svg class="ssc-star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    }
    return `<div class="ssc-appr-stars">${starsStr}</div>`;
  };
  const BOT_AVATAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="1.5" fill="#15803d"></circle><line x1="12" y1="5.5" x2="12" y2="8"></line><rect x="4" y="8" width="16" height="12" rx="4" fill="#ffffff"></rect><ellipse cx="8.5" cy="13.5" rx="1.5" ry="2" fill="#1e3a8a"></ellipse><ellipse cx="15.5" cy="13.5" rx="1.5" ry="2" fill="#1e3a8a"></ellipse><line x1="10" y1="17.5" x2="14" y2="17.5"></line></svg>`;
  if (streamApproved) {
    streamApproved.innerHTML = approved.length === 0 ? `<div class="ssc-empty-note">No approved comments yet for this topic.</div>` : approvedToShow.map(item => {
      const studentName = escapeHTML(item.name || ''), firstLetter = studentName ? studentName.charAt(0).toUpperCase() : 'U';
      return `<div class="ssc-approved-image1-card"><div class="ssc-appr-header-row"><div class="ssc-appr-user-meta"><div class="ssc-appr-avatar-blue">${firstLetter}</div><span class="ssc-appr-name">${studentName}</span><span class="ssc-appr-class-tag">${escapeHTML(item.studentClass || 'Class 12')}</span><span class="ssc-appr-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHTML(item.timestamp || '')}</span></div><div class="ssc-appr-right-hud">${buildStars(item.rating)}<button type="button" class="ssc-dots-menu-btn" title="Options"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg></button></div></div><div class="ssc-appr-body-thread"><div class="ssc-thread-line-track"><div class="ssc-thread-stem"></div><div class="ssc-thread-node-dot"></div></div><div class="ssc-appr-content-area"><div class="ssc-appr-user-bubble">${escapeHTML(item.message || '')}</div><div class="ssc-appr-instructor-row"><div class="ssc-inst-top-bar"><div class="ssc-inst-profile"><div class="ssc-inst-bot-avatar">${BOT_AVATAR_SVG}</div><span class="ssc-inst-name">Rohit Singh</span><span class="ssc-admin-tag-pill">Admin</span></div><span class="ssc-inst-date">${escapeHTML(item.replyDate || item.timestamp || '')}</span></div><div class="ssc-inst-reply-bubble">👍 ${escapeHTML(item.reply || 'Thank you!')}</div></div></div></div></div>`;
    }).join('');
  }
  if (streamPending) {
    streamPending.innerHTML = pending.length === 0 ? `<div class="ssc-empty-note">No pending reviews.</div>` : pendingToShow.map(item => {
      const studentName = escapeHTML(item.name || ''), firstLetter = studentName ? studentName.charAt(0).toUpperCase() : 'U';
      return `<div class="ssc-pending-image6-card"><div class="ssc-pending-top-row"><div class="ssc-pending-user-info"><div class="ssc-pending-avatar-cyan">${firstLetter}</div><span class="ssc-pending-name">${studentName}</span><span class="ssc-pending-class-tag">${escapeHTML(item.studentClass || 'Class 12')}</span><span class="ssc-pending-date"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHTML(item.timestamp || '')}</span></div><div class="ssc-pending-badge-pill"><span>⏳</span><span>Pending</span></div></div><div class="ssc-pending-blur-content">${escapeHTML(item.message || 'Student response undergoing moderation.')}</div></div>`;
    }).join('');
  }
}

window.toggleAllSubmissions = function() {
  CBTState.isExpandedSubmissions = !CBTState.isExpandedSubmissions;
  renderSubmissionsShowcase(CBTState.feedbackDataStore);
};

/* ==========================================================================
   SECTION 13: DOM CONTENT LOADED INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const activeName = getTestName(), chNum = getChapterNumber(), weight = getChapterWeightage();
  if ($('header-ch-num')) $('header-ch-num').innerText = `Ch ${chNum}`;
  if ($('header-ch-title')) $('header-ch-title').innerText = activeName;
  if ($('header-weight-text')) $('header-weight-text').innerText = weight;
  document.querySelectorAll('#welcome-step-1 .topic-text, #modal-resume .topic-text').forEach(node => { node.innerText = activeName; });

  const timerBox = $('timer-box');
  if (timerBox) {
    timerBox.addEventListener('dblclick', () => {
      if (CBTState.isTimerFrozen) { CBTState.isTimerFrozen = false; timerBox.classList.remove('timer-frozen'); }
    });
  }

  ensureSectionSelectionModalExists();
  ensureReviewControlsExist();
  syncMarkingLabelsInDOM();

  // Reset feedback section so no values are pre-selected by default
  resetFeedbackForm();

  // Real-time error clearing when user begins typing feedback
  $('feedback-user-message')?.addEventListener('input', () => {
    $('feedback-user-message')?.closest('.fb-input-wrapper-embedded')?.classList.remove('field-error');
  });

  setupStarScrollObserver();
  setupFeedbackSectionObserver();
  setupMobileGestures();
  placeActionMatrix();
  setupDetailsFieldValidation();

  const saved = getSavedSession();
  if (saved) {
    CBTState.pendingRestoreData = saved;
    if ($('modal-resume')) $('modal-resume').style.display = 'flex';
  } else if ($('modal-welcome')) {
    $('modal-welcome').style.display = 'flex';
  }

  await loadQuestionsFromSheet();
  await fetchAndRenderSidebarToppers();

  const eyes = document.querySelectorAll('.desktop-eyes .eye-ball'), pupils = document.querySelectorAll('.desktop-eyes .pupil');
  document.addEventListener('mousemove', e => {
    if (window.innerWidth <= 640) return;
    eyes.forEach((eye, index) => {
      const pupil = pupils[index];
      if (!pupil) return;
      const rect = eye.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, angle = Math.atan2(dy, dx);
      const maxRadius = (rect.width / 2) - (pupil.offsetWidth / 2) - 1.5, distance = Math.min(Math.hypot(dx, dy) / 10, maxRadius);
      pupil.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
    });
  });

  const scheduleBlink = () => {
    setTimeout(() => {
      if (window.innerWidth > 640) {
        eyes.forEach(eye => { eye.style.transform = 'scaleY(0.06)'; setTimeout(() => { eye.style.transform = 'scaleY(1)'; }, 110); });
      }
      scheduleBlink();
    }, 3000 + Math.random() * 4000);
  };
  scheduleBlink();
});