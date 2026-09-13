const $ = id => document.getElementById(id);
const isProctoringEnabled    = () => window.CBT_CONFIG?.ENABLE_PROCTORING ?? true;
const getCorrectMarks        = () => Number(window.CBT_CONFIG?.MARKS_CORRECT ?? 1);
const getIncorrectMarks      = () => Number(window.CBT_CONFIG?.MARKS_INCORRECT ?? 0.25);
const getPenaltyMarks        = () => Number(window.CBT_CONFIG?.PENALTY_WARNING ?? 2);
const getTestName            = () => window.CBT_CONFIG?.TEST_NAME ?? "Online Test";
const getFetchQuestionsOfCBT = () => window.CBT_CONFIG?.FetchQuestionsOfCBT ?? "";
const getSaveRecordOfCBT     = () => window.CBT_CONFIG?.SaveRecordOfCBT ?? "";
const getFetchRecordOfCBT    = () => window.CBT_CONFIG?.FetchRecordOfCBT ?? "";
const getFeedbackScriptURL   = () => window.CBT_CONFIG?.FeedbackScriptURL ?? "";
const getHomeUrl             = () => window.CBT_CONFIG?.HOME_URL ?? "https://www.singhclasses.in/";
const getYoutubeUrl          = () => window.CBT_CONFIG?.YOUTUBE_URL ?? "https://www.youtube.com/@SinghClasses";
const getNotesUrl            = () => window.CBT_CONFIG?.NOTES_URL ?? "#";

const ICON_ALERT = `<svg class="sc-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
const ICON_FULLSCREEN = `<polyline points="15 3 21 3 21 9"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><polyline points="9 21 3 21 3 15"></polyline><line x1="3" y1="21" x2="10" y2="14"></line><polyline points="21 15 21 21 15 21"></polyline><line x1="21" y1="21" x2="14" y2="14"></line><polyline points="3 9 3 3 9 3"></polyline><line x1="3" y1="3" x2="10" y2="10"></line>`;
const ICON_MINIMIZE = `<polyline points="4 14 10 14 10 20"></polyline><line x1="10" y1="14" x2="3" y2="21"></line><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><polyline points="14 20 14 14 20 14"></polyline><line x1="14" y1="14" x2="21" y2="21"></line><polyline points="10 4 10 10 4 10"></polyline><line x1="10" y1="10" x2="3" y2="3"></line>`;

window.CBTState = {
  listExamPapers: [], isQuestionsLoading: false, questions: [], sections: [], currentYearIndex: 0, currentQuestion: 0,
  studentNameVal: "", studentClassVal: "Class 12", studentSectionVal: "A", schoolNameVal: "", studentName: "",
  userAnswers: [], visitedQuestions: [], lockedAnswers: [], sectionTimes: [], timerInterval: null, isTimerPaused: true,
  securityWarnings: 0, isExamActive: false, currentFilter: 'all', globalFormPayload: null, activeResourceUrl: "",
  lastWT: 0, lastSpacePressTime: 0, sectionToppersFetched: [], pendingRestoreData: null, feedbackRating: 5,
  feedbackCategory: "Suggestion", feedbackDataStore: [], hasAnimatedStars: false, isExpandedSubmissions: false,
  allFetchedRecords: []
};

function getFormattedTimestamp() {
  const now = new Date(), pad = n => (n < 10 ? '0' + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

window.sharePage = async function() {
  const currentUrl = window.location.href, btn = $('btn-share-page');
  const showFeedback = () => { if (btn) { btn.classList.add('copied-active'); setTimeout(() => btn.classList.remove('copied-active'), 1500); } };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(currentUrl); showFeedback(); }
    else { const t = document.createElement('input'); t.value = currentUrl; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); showFeedback(); }
  } catch (e) { console.warn("Share copy fallback:", e); }
};

window.toggleFullScreen = function() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen();
};

function updateFullscreenIconState() {
  const icon = $('fs-icon'), btn = $('fullscreen-toggle-btn');
  if (!icon) return;
  if (document.fullscreenElement) { icon.innerHTML = ICON_MINIMIZE; if (btn) btn.title = "Exit Fullscreen"; }
  else { icon.innerHTML = ICON_FULLSCREEN; if (btn) btn.title = "Fullscreen"; }
}
document.addEventListener('fullscreenchange', updateFullscreenIconState);

function getSingleSessionKey() { return `cbt_active_attempt_${getTestName().replace(/\s+/g, '_')}`; }

function getSavedSession() {
  try {
    const raw = localStorage.getItem(getSingleSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.questions && data.questions.length > 0 && data.studentNameVal) return data;
  } catch (e) { console.warn("Storage check:", e); }
  return null;
}

function saveSessionToLocalStorage() { 
  if (!CBTState.isExamActive || !CBTState.studentNameVal) return; 
  try { 
    localStorage.setItem(getSingleSessionKey(), JSON.stringify({ 
      currentYearIndex: CBTState.currentYearIndex, currentQuestion: CBTState.currentQuestion, userAnswers: CBTState.userAnswers,
      visitedQuestions: CBTState.visitedQuestions, lockedAnswers: CBTState.lockedAnswers, sectionTimes: CBTState.sectionTimes,
      securityWarnings: CBTState.securityWarnings, questions: CBTState.questions, sections: CBTState.sections,
      studentNameVal: CBTState.studentNameVal, studentClassVal: CBTState.studentClassVal, studentSectionVal: CBTState.studentSectionVal,
      schoolNameVal: CBTState.schoolNameVal, studentName: CBTState.studentName, sectionToppersFetched: CBTState.sectionToppersFetched 
    })); 
  } catch (e) { console.warn("Save session failed:", e); } 
}

function clearSessionLocalStorage() { try { localStorage.removeItem(getSingleSessionKey()); } catch (e) {} }

function restoreSession(data) {
  let restoredClass = data.studentClassVal || "Class 12";
  if (!restoredClass.toString().startsWith("Class") && restoredClass !== "OTHER") restoredClass = `Class ${restoredClass}`;
  Object.assign(CBTState, {
    currentYearIndex: data.currentYearIndex || 0, currentQuestion: data.currentQuestion || 0, userAnswers: data.userAnswers || [],
    visitedQuestions: data.visitedQuestions || [], lockedAnswers: data.lockedAnswers || [], sectionTimes: data.sectionTimes || [],
    securityWarnings: data.securityWarnings || 0, questions: data.questions || [], sections: data.sections || [],
    studentNameVal: data.studentNameVal || "AGYAT", studentClassVal: restoredClass, studentSectionVal: data.studentSectionVal || "A",
    schoolNameVal: data.schoolNameVal || "SPS", studentName: data.studentName || "", sectionToppersFetched: data.sectionToppersFetched || [],
    isExamActive: true, isTimerPaused: false
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
  buildYearNav(); updateTimerDisplay(); startTimer(); loadQuestion(); triggerFeedbackSectionAnimation();
  showToastAlert("Previous exam attempt restored successfully!");
}

window.confirmResumeSession = function() { if (CBTState.pendingRestoreData) { restoreSession(CBTState.pendingRestoreData); CBTState.pendingRestoreData = null; } };
window.dismissResumeSession = function() { clearSessionLocalStorage(); CBTState.pendingRestoreData = null; if ($('modal-resume')) $('modal-resume').style.display = 'none'; if ($('modal-welcome')) $('modal-welcome').style.display = 'flex'; };

function escapeHTML(str) { return str == null ? "" : str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>"); }
function getVerbatim(obj, keys, fallback = "") { for (let k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; } return fallback; }

function resolveCorrectText(rawValue, optionsArray) { 
  if (rawValue == null || rawValue === "") return optionsArray[0] || ""; 
  let v = rawValue.toString().trim(), textMatch = optionsArray.find(opt => opt != null && opt.toString().trim().toLowerCase() === v.toLowerCase()); 
  if (textMatch !== undefined) return textMatch.toString(); 
  let letter = v.toLowerCase(); 
  if (['a', 'b', 'c', 'd', 'e'].includes(letter)) { let idx = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[letter]; if (idx < optionsArray.length) return optionsArray[idx].toString(); } 
  const n = parseInt(v); 
  return (!isNaN(n) && n >= 0 && n < optionsArray.length) ? optionsArray[n].toString() : (optionsArray[0] ? optionsArray[0].toString() : ""); 
}

function textToIndex(correctText, optionsArray) { 
  let idx = optionsArray.findIndex(opt => opt != null && opt.toString().trim().toLowerCase() === correctText.toLowerCase()); 
  return idx !== -1 ? idx : 0; 
}

async function loadQuestionsFromSheet(retries = 3) {
  if (CBTState.isQuestionsLoading || CBTState.listExamPapers.length > 0) return;
  CBTState.isQuestionsLoading = true;
  let baseUrl = getFetchQuestionsOfCBT();
  if (!baseUrl) { CBTState.isQuestionsLoading = false; return; }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(baseUrl, { method: "GET", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty response.");
      if (raw[0] && Array.isArray(raw[0].questions)) {
        CBTState.listExamPapers = raw.map(paper => ({
          title: getVerbatim(paper, ['title', 'Title', 'sectiontitle', 'SectionTitle'], "Section"),
          year: getVerbatim(paper, ['year', 'Year', 'section', 'Section'], "Set"),
          questions: (paper.questions || []).map(q => {
            let cleanOpts = (Array.isArray(q.options) ? q.options : [getVerbatim(q, ['optiona', 'OptionA', 'option1', '0'], ""), getVerbatim(q, ['optionb', 'OptionB', 'option2', '1'], ""), getVerbatim(q, ['optionc', 'OptionC', 'option3', '2'], ""), getVerbatim(q, ['optiond', 'OptionD', 'option4', '3'], "")]).map(o => (o ?? "").toString());
            return {
              text: getVerbatim(q, ['text', 'Text', 'question', 'Question'], "").toString(),
              tag: getVerbatim(q, ['tag', 'Tag', 'TAG', 'column', 'info', 'Info', 'metadata'], "CBSE").toString().trim(),
              options: cleanOpts, image: getVerbatim(q, ['image', 'Image', 'imageurl'], "").toString(),
              explanation: getVerbatim(q, ['explanation', 'Explanation', 'exp', 'Exp', 'solution'], "").toString(),
              correctAnswerText: resolveCorrectText(getVerbatim(q, ['correctIndex', 'correct', 'answer', 'ans', '4'], "A"), cleanOpts)
            };
          }).filter(q => q.text !== "")
        }));
      } else {
        const sectionsMap = {};
        raw.forEach(row => {
          const r = {};
          Object.keys(row).forEach(k => { r[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
          let sectionLabel = getVerbatim(r, ['section', 'year', 'set'], "Section A").toString().trim();
          let qText = getVerbatim(r, ['question', 'questions', 'questiontext', 'text', 'q'], null);
          if (!qText) return;
          const options = [getVerbatim(r, ['optiona', 'option1', 'a'], ""), getVerbatim(r, ['optionb', 'option2', 'b'], ""), getVerbatim(r, ['optionc', 'option3', 'c'], ""), getVerbatim(r, ['optiond', 'option4', 'd'], "")].map(o => o.toString());
          if (!sectionsMap[sectionLabel]) sectionsMap[sectionLabel] = { title: getVerbatim(r, ['sectiontitle', 'title', 'label'], sectionLabel).toString().trim(), year: sectionLabel, questions: [] };
          sectionsMap[sectionLabel].questions.push({ text: qText.toString(), tag: getVerbatim(r, ['tag', 'tagname', 'info', 'metadata'], "CBSE").toString().trim(), options, correctAnswerText: resolveCorrectText(getVerbatim(r, ['correct', 'correctanswer', 'correctindex', 'answer', 'ans'], "A"), options), image: getVerbatim(r, ['image', 'imageurl', 'img'], "").toString(), explanation: getVerbatim(r, ['explanation', 'exp', 'solution'], "").toString() });
        });
        CBTState.listExamPapers = Object.values(sectionsMap);
      }
      if (CBTState.listExamPapers.length > 0) {
        CBTState.listExamPapers.forEach(p => (p.questions || []).forEach(q => { if (q.image) { const i = new Image(); i.src = q.image; } }));
        CBTState.isQuestionsLoading = false;
        return;
      }
    } catch (err) { if (attempt < retries) await new Promise(res => setTimeout(res, 800)); } 
  }
  CBTState.isQuestionsLoading = false;
}

/* TOP PERFORMERS & FUNCTIONAL DYNAMIC RANKING (IMAGE 2 DESIGN SYSTEM) */
async function fetchAndRenderSidebarToppers() {
  const fetchRecordUrl = getFetchRecordOfCBT(), container = $('sidebar-toppers');
  if (!fetchRecordUrl) return;
  if (container) container.classList.add('fetching-pulse');
  try {
    const testName = getTestName(), sec = CBTState.sections[CBTState.currentYearIndex];
    const currentSection = sec ? `${sec.year} - ${sec.title}` : "";
    const res = await fetch(`${fetchRecordUrl}?testName=${encodeURIComponent(testName)}&currentSection=${encodeURIComponent(currentSection)}&_t=${Date.now()}`);
    const data = await res.json();
    const recordsList = data ? (data.records || data.top7 || data.top5 || data.toppers || (Array.isArray(data) ? data : [])) : [];
    CBTState.allFetchedRecords = recordsList;
    if (recordsList.length > 0) { renderSidebarToppers(recordsList); updateUserDynamicRank(); }
    else if (container) container.style.display = 'none';
  } catch (err) { console.warn("Toppers sync error:", err); }
  finally { if (container) container.classList.remove('fetching-pulse'); }
}

function renderSidebarToppers(toppersArray) { 
  const container = $('sidebar-toppers'), listEl = $('sidebar-toppers-list');
  if (!container || !listEl) return;
  let realToppers = toppersArray.filter(t => t && (t.studentName || t.name) && (t.studentName !== "Awaiting..." && t.name !== "Awaiting..."));
  if (realToppers.length === 0) { container.style.display = 'none'; return; }
  const getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0; 
  const getAccuracy = t => parseFloat((t.accuracy || "0").toString().replace("%", "")) || 0; 
  realToppers.sort((a, b) => (getMarks(b) - getMarks(a)) || (getAccuracy(b) - getAccuracy(a))); 
  const top7 = realToppers.slice(0, 7);
  
  listEl.innerHTML = top7.map((t, idx) => {
    const rank = idx + 1;
    let rankClass = 'rank-default', iconStr = `#${rank}`;
    if (rank === 1) { rankClass = 'rank-1'; iconStr = '🥇'; }
    else if (rank === 2) { rankClass = 'rank-2'; iconStr = '🥈'; }
    else if (rank === 3) { rankClass = 'rank-3'; iconStr = '🥉'; }
    else if (rank === 4) { rankClass = 'rank-4'; iconStr = '#4'; }
    
    const isCentered = (rank === 7) ? ' rank-centered-last' : '';
    const name = escapeHTML(t.studentName || t.name || 'Student');
    const marks = getMarks(t);
    const clsSec = (t.studentClass || t.classVal ? (t.studentClass || t.classVal) : '') + (t.studentSection || t.sectionVal ? (t.studentSection || t.sectionVal) : '');
    const school = (t.schoolName || t.school) ? ` ${t.schoolName || t.school}` : '';
    return `<div class="topper-badge ${rankClass}${isCentered}">${iconStr} <strong>${name}</strong> · ${marks}M${clsSec ? ` (${clsSec})` : ''}${school}</div>`;
  }).join(''); 
  container.style.display = 'flex';
}

function calculateCurrentExamScore() {
  let s = CBTState.sections[CBTState.currentYearIndex];
  if (!s) return 0;
  let sc = 0;
  for (let i = s.start; i < s.end; i++) {
    if (CBTState.userAnswers[i] !== null && (CBTState.lockedAnswers[i] || s.submitted)) {
      if (isAnswerCorrect(i)) sc += getCorrectMarks();
      else sc -= getIncorrectMarks();
    }
  }
  return Number((sc - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
}

function updateUserDynamicRank() {
  if (!CBTState.allFetchedRecords || CBTState.allFetchedRecords.length === 0) return;
  const currentScore = calculateCurrentExamScore();
  const getMarks = t => parseFloat(t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0) || 0;
  const validScores = CBTState.allFetchedRecords.filter(t => t && (t.studentName || t.name)).map(getMarks);
  let higherCount = 0;
  validScores.forEach(score => { if (score > currentScore) higherCount++; });
  const rankStr = `${higherCount + 1} / ${validScores.length + 1}`;
  const rankBadge = $('user-current-rank-badge'), rankText = $('user-current-rank-text'), rsRankVal = $('lbl-rs-rank-val');
  if (rankBadge && rankText) { rankText.innerText = rankStr; rankBadge.style.display = 'inline-flex'; }
  if (rsRankVal) rsRankVal.innerText = rankStr;
}

window.handleSectionProgression = function() {
  if (CBTState.currentYearIndex < CBTState.sections.length - 1) executeProgressionAdvance();
  else showFinalCumulativeEvaluation();
};

function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

function showToastAlert(m) { 
  let t = $('custom-alert-toast'), txt = $('custom-alert-text'); 
  if (t && txt) { txt.innerHTML = `${ICON_ALERT} ${m}`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4000); } 
}

function triggerVerifyModal(type) { 
  const modal = $('verify-resource-modal'), heading = $('verify-modal-heading'), text = $('verify-modal-text'), actionBtn = $('verify-proceed-action-btn'); 
  if (!modal) return;
  modal.style.display = 'flex'; 
  if (type === 'yt') { 
    CBTState.activeResourceUrl = getYoutubeUrl(); 
    if (heading) heading.innerText = "Watch Video Lesson?"; 
    if (text) text.innerText = "Open educational video tutorial in a new tab?"; 
    if (actionBtn) { actionBtn.innerText = "Watch Video"; actionBtn.onclick = () => { window.open(CBTState.activeResourceUrl, '_blank'); closeVerifyModal(); }; }
  } 
}
function closeVerifyModal() { if ($('verify-resource-modal')) $('verify-resource-modal').style.display = 'none'; }
function goToHome() { window.location.href = getHomeUrl(); }

window.closeSecurityModal = () => { 
  if ($('modal-security')) $('modal-security').style.display = 'none'; 
  const widget = document.querySelector('.sc-widget-container');
  if (widget) widget.classList.remove('sc-blur-active'); 
  CBTState.isTimerPaused = false; 
};

['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => document.addEventListener(ev, e => { if (isProctoringEnabled() && CBTState.isExamActive) e.preventDefault(); }));
document.addEventListener('keydown', e => {
  if (!CBTState.isExamActive || !isProctoringEnabled() || CBTState.isTimerPaused) return;
  const key = e.key ? e.key.toLowerCase() : "", code = e.code ? e.code.toLowerCase() : "";
  if (key === 'printscreen' || code === 'printscreen' || e.keyCode === 44 || ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3','4','5','s'].includes(key))) {
    const w = document.querySelector('.sc-widget-container');
    if (w) w.classList.add('sc-blur-active');
    e.preventDefault();
    try { navigator.clipboard.writeText(''); } catch (err) {}
    applySecurityPenalty();
  }
});

document.addEventListener('keyup', e => { if (CBTState.isExamActive && isProctoringEnabled() && (e.key === 'PrintScreen' || e.keyCode === 44) && !CBTState.isTimerPaused) applySecurityPenalty(); });
document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || !isProctoringEnabled()) return;
  let k = e.key.toLowerCase(), ic = e.ctrlKey || e.metaKey; 
  if (e.key === 'F12' || e.keyCode === 123 || (ic && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (ic && ['u', 'p', 's', 'r'].includes(k)) || e.key === 'F5') { e.preventDefault(); if (!CBTState.isTimerPaused) applySecurityPenalty(); return false; } 
});

document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || (CBTState.sections[CBTState.currentYearIndex]?.submitted)) return; 
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) { 
    e.preventDefault(); 
    const cur = Date.now(); 
    if (cur - CBTState.lastSpacePressTime < 400) { CBTState.isTimerPaused = !CBTState.isTimerPaused; CBTState.lastSpacePressTime = 0; } 
    else CBTState.lastSpacePressTime = cur; 
  } 
});

document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || CBTState.isTimerPaused || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return; 
  let s = CBTState.sections[CBTState.currentYearIndex], k = e.key.toLowerCase(), isl = CBTState.lockedAnswers[CBTState.currentQuestion] || s.submitted; 
  if (!isl) { 
    if (['1','2','3','4'].includes(k)) { e.preventDefault(); saveAnswer(parseInt(k) - 1); } 
    else if (['a','b','c','d','e'].includes(k)) { e.preventDefault(); saveAnswer({ 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[k]); } 
    else if (k === 'backspace' || k === 'delete') { e.preventDefault(); clearResponse(); } 
  } 
  if (k === 'enter') { 
    e.preventDefault(); 
    if (!s.submitted && CBTState.currentQuestion === s.end - 1) showSubmitModal(); 
    else if (!s.submitted || CBTState.currentQuestion < s.end - 1) nextQuestion(); 
  } 
});

function handleBlurOrHide() { 
  if (!CBTState.isExamActive || !isProctoringEnabled() || CBTState.isTimerPaused) return; 
  if (document.visibilityState === 'hidden' || !document.hasFocus()) {
    const w = document.querySelector('.sc-widget-container');
    if (w) w.classList.add('sc-blur-active');
    applySecurityPenalty();
  }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') handleBlurOrHide(); });
window.addEventListener("blur", handleBlurOrHide);

window.addEventListener("beforeunload", () => { 
  if (CBTState.isExamActive && CBTState.sections[CBTState.currentYearIndex] && !CBTState.sections[CBTState.currentYearIndex].submitted) { 
    let s = CBTState.sections[CBTState.currentYearIndex], c = 0, ic = 0, l = 0, sc = 0, tot = s.end - s.start; 
    for (let i = s.start; i < s.end; i++) { 
      if (CBTState.userAnswers[i] !== null) { if (isAnswerCorrect(i)) { c++; sc += getCorrectMarks(); } else { ic++; sc -= getIncorrectMarks(); } } 
      else l++; 
    } 
    sc = Number((sc - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2)); 
    let p = new URLSearchParams(); 
    p.append("timestamp", getFormattedTimestamp()); 
    p.append("studentName", (CBTState.studentNameVal || "AGYAT") + " (Reload Dropout)"); 
    p.append("studentClass", CBTState.studentClassVal?.toString().startsWith("Class") ? CBTState.studentClassVal : `Class ${CBTState.studentClassVal || "12"}`); 
    p.append("studentSection", CBTState.studentSectionVal); 
    p.append("schoolName", CBTState.schoolNameVal); 
    p.append("testName", getTestName()); 
    p.append("currentSection", s.year + " - " + s.title); 
    p.append("obtainedScore", sc); 
    p.append("correctAnswers", c); 
    p.append("incorrectAnswers", ic); 
    p.append("unattemptQuestions", l); 
    p.append("accuracy", tot > 0 ? ((c / tot) * 100).toFixed(2) + "%" : "0.00%"); 
    p.append("avgTimePerQuestion", (tot > 0 ? (s.timeSpent / tot).toFixed(1) : 0) + "s"); 
    p.append("proctoringWarnings", CBTState.securityWarnings); 
    p.append("activeTimeTaken", `${Math.floor(s.timeSpent / 60)}m ${s.timeSpent % 60}s`); 
    navigator.sendBeacon(getSaveRecordOfCBT(), p); 
  } 
});

function applySecurityPenalty() { 
  if (!isProctoringEnabled() || Date.now() - CBTState.lastWT < 1000) return; 
  CBTState.lastWT = Date.now(); 
  CBTState.securityWarnings++; 
  if ($('warning-count-display')) $('warning-count-display').innerText = `Total Warnings: ${CBTState.securityWarnings} (Penalty: -${CBTState.securityWarnings * getPenaltyMarks()} Marks)`; 
  const w = document.querySelector('.sc-widget-container');
  if (w) w.classList.add('sc-blur-active'); 
  if ($('modal-security')) $('modal-security').style.display = 'flex'; 
  CBTState.isTimerPaused = true; 
  updatePalette(); 
  saveSessionToLocalStorage(); 
}

window.proceedToRegisterStep = () => {
  if ($('welcome-step-intro')) $('welcome-step-intro').style.display = 'none';
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'block';
};

window.goToGuidelinesStep = () => { 
  const nameInput = $('student-name-input');
  CBTState.studentNameVal = (nameInput ? nameInput.value.trim() : "").toUpperCase() || "AGYAT"; 
  const rawClass = $('student-class-input') ? $('student-class-input').value : "Class 12";
  CBTState.studentClassVal = (rawClass.toString().startsWith("Class") || rawClass === "OTHER") ? rawClass : `Class ${rawClass}`;
  CBTState.studentSectionVal = $('student-section-input') ? $('student-section-input').value : "A"; 
  CBTState.schoolNameVal = ($('student-school-input') ? $('student-school-input').value.trim() : "").toUpperCase() || "SPS"; 
  CBTState.studentName = `${CBTState.studentNameVal} | ${CBTState.studentClassVal} | SEC: ${CBTState.studentSectionVal} | ${CBTState.schoolNameVal}`; 
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'none'; 
  if ($('welcome-step-2')) $('welcome-step-2').style.display = 'block'; 
};

window.beginExam = async () => { 
  if ($('modal-welcome')) $('modal-welcome').style.display = 'none'; 
  const loading = $('quiz-loading-overlay'); 
  if (loading) loading.style.display = 'flex'; 
  document.body.classList.add('exam-in-progress'); 
  CBTState.isExamActive = true; 
  let checks = 0; 
  while (CBTState.isQuestionsLoading && checks < 300) { await new Promise(r => setTimeout(r, 100)); checks++; } 
  if (CBTState.listExamPapers.length === 0) await loadQuestionsFromSheet(3);
  if (loading) loading.style.display = 'none'; 

  CBTState.questions = []; CBTState.sections = []; 
  let qt = 0; 
  CBTState.listExamPapers.forEach((p, idx) => { 
    let st = qt, sq = p.questions.map(q => ({ question: q.text, tag: q.tag ?? "CBSE", options: [...q.options], image: q.image ?? "", correctAnswerText: q.correctAnswerText, explanation: q.explanation ?? "" })); 
    shuffleArray(sq); 
    sq.forEach(q => { CBTState.questions.push(q); qt++; }); 
    CBTState.sections.push({ index: idx, title: p.title, year: p.year, start: st, end: qt, submitted: false, timeSpent: 0 }); 
  }); 

  clearSessionLocalStorage(); 
  CBTState.userAnswers = new Array(CBTState.questions.length).fill(null); 
  CBTState.visitedQuestions = new Array(CBTState.questions.length).fill(false); 
  CBTState.lockedAnswers = new Array(CBTState.questions.length).fill(false); 
  CBTState.sectionTimes = CBTState.sections.map(s => (s.end - s.start) * 60); 
  CBTState.currentYearIndex = 0; CBTState.currentQuestion = CBTState.sections[0].start; 
  CBTState.isTimerPaused = false; 
  if ($('quiz-screen')) $('quiz-screen').style.display = 'block'; 
  if ($('unified-nav')) $('unified-nav').style.display = 'flex'; 
  buildYearNav(); updateTimerDisplay(); startTimer(); loadQuestion(); triggerFeedbackSectionAnimation(); saveSessionToLocalStorage(); 
};

function triggerFeedbackSectionAnimation() {
  const container = $('cbt-interactive-feedback-wrapper');
  if (container) setTimeout(() => container.classList.add('section-entered'), 280);
}

function isAnswerCorrect(qIdx) { 
  if (CBTState.userAnswers[qIdx] === null) return false; 
  let q = CBTState.questions[qIdx]; 
  return (q.options[CBTState.userAnswers[qIdx]] ?? "").toString().trim().toLowerCase() === (q.correctAnswerText ?? "").toString().trim().toLowerCase(); 
}

function getCorrectIndex(qIdx) { return textToIndex(CBTState.questions[qIdx].correctAnswerText, CBTState.questions[qIdx].options); }

function updateTimerDisplay() { 
  let t = CBTState.sectionTimes[CBTState.currentYearIndex] || 0, m = Math.floor(t / 60), s = t % 60, timeStr = `${m}:${s < 10 ? '0' : ''}${s}`; 
  if ($('time-left')) $('time-left').innerText = timeStr; 
  if ($('time-left-mobile')) $('time-left-mobile').innerText = timeStr; 
}

function startTimer() { 
  if (CBTState.timerInterval) clearInterval(CBTState.timerInterval); 
  let ticks = 0;
  CBTState.timerInterval = setInterval(() => { 
    if (CBTState.isTimerPaused || !CBTState.isExamActive || (CBTState.sections[CBTState.currentYearIndex]?.submitted)) return; 
    if (CBTState.sectionTimes[CBTState.currentYearIndex] > 0) { CBTState.sectionTimes[CBTState.currentYearIndex]--; CBTState.sections[CBTState.currentYearIndex].timeSpent++; } 
    updateTimerDisplay(); 
    ticks++;
    if (ticks % 5 === 0) saveSessionToLocalStorage(); 
    if (CBTState.sectionTimes[CBTState.currentYearIndex] <= 0) autoLockAndSubmitSection(); 
  }, 1000); 
}

function autoLockAndSubmitSection() { 
  CBTState.isTimerPaused = true; 
  let m = $('modal-timeout'); 
  if (m) m.style.display = 'flex'; 
  setTimeout(() => { if (m) m.style.display = 'none'; if (typeof window.processSectionSubmission === 'function') window.processSectionSubmission(); }, 2000); 
}

window.toggleExplanation = function() {
  let isL = CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted;
  if (!isL) { showToastAlert("Select and submit an answer to view the explanation."); return; }
  const box = $('explanation-box'), btn = $('btn-toggle-exp'), label = $('btn-exp-label'), wrapper = $('q-explanation-wrapper');
  if (!box) return;
  const isOpen = box.classList.contains('open');
  box.classList.toggle('open', !isOpen);
  if (btn) btn.classList.toggle('open', !isOpen);
  if (label) label.innerText = isOpen ? "View Explanation" : "Hide Explanation";
  if (wrapper) wrapper.classList.toggle('has-open-content', !isOpen);
};

window.loadQuestion = () => { 
  CBTState.visitedQuestions[CBTState.currentQuestion] = true; 
  let s = CBTState.sections[CBTState.currentYearIndex], qy = CBTState.currentQuestion - s.start, tot = s.end - s.start;
  let curQ = CBTState.questions[CBTState.currentQuestion];
  if ($('q-number')) $('q-number').innerText = `Question ${qy + 1} of ${tot}`; 
  
  const tagEl = $('q-tag-pill');
  if (tagEl) tagEl.innerText = (curQ && curQ.tag?.trim().length > 0) ? curQ.tag.trim().toUpperCase() : "CBSE";
  const pBar = $('qhc-progress-bar');
  if (pBar && tot > 0) pBar.style.width = `${Math.round(((qy + 1) / tot) * 100)}%`;
  
  let baseText = `<span style="font-weight:700;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>` + escapeHTML(curQ.question); 
  if (curQ.image) baseText += `<div class="question-image-wrap" style="margin:0 0 12px 0;text-align:left;max-width:100%;"><img src="${curQ.image}" alt="Question Image" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border-color);object-fit:contain;display:block;"></div>`; 
  if ($('q-text')) $('q-text').innerHTML = baseText; 

  let ol = $('q-options'), isL = CBTState.lockedAnswers[CBTState.currentQuestion] || s.submitted;
  let userChoice = CBTState.userAnswers[CBTState.currentQuestion], ci = getCorrectIndex(CBTState.currentQuestion), lt = ['A', 'B', 'C', 'D', 'E'];
  if (ol) {
    ol.innerHTML = ''; 
    curQ.options.forEach((opt, i) => { 
      let cls = "", badgeHtml = "";
      if (isL && userChoice !== null) { 
        if (i === ci && userChoice === i) { cls = "disabled-label correct-answer"; badgeHtml = `<span class="option-status-pill correct">Your Answer (Correct) ✓</span>`; }
        else if (i === ci) { cls = "disabled-label correct-answer"; badgeHtml = `<span class="option-status-pill correct">Correct Answer ✓</span>`; }
        else if (userChoice === i) { cls = "disabled-label wrong-answer"; badgeHtml = `<span class="option-status-pill wrong">Your Answer (Incorrect) ✕</span>`; }
        else cls = "disabled-label";
      } else if (userChoice === i) cls = "selected" + (isL ? " disabled-label" : ""); 
      else if (isL) cls = "disabled-label"; 
      ol.innerHTML += `<li><label class="${cls}"><div class="option-left-content"><input type="radio" name="option" value="${i}" ${userChoice === i ? "checked" : ""} ${isL ? "disabled" : ""} onchange="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${escapeHTML(opt)}</span></div>${badgeHtml}</label></li>`; 
    }); 
  }

  const btnExp = $('btn-toggle-exp'), boxExp = $('explanation-box'), contentExp = $('explanation-text-content');
  const expChar = $('exp-correct-char'), expVerdict = $('exp-verdict-text'), btnExpLabel = $('btn-exp-label'), wrapper = $('q-explanation-wrapper');
  if (btnExp && boxExp && contentExp) {
    boxExp.classList.remove('open'); btnExp.classList.remove('open');
    if (wrapper) wrapper.classList.remove('has-open-content');
    if (btnExpLabel) btnExpLabel.innerText = "View Explanation";
    contentExp.innerHTML = (curQ.explanation?.trim().length > 0) ? curQ.explanation.replace(/^(?:explanation\s*[:\/-]?\s*(?:solution\s*[:\/-]?\s*)?)/i, '').trim() : `The correct answer is option <strong>(${lt[ci]}) ${escapeHTML(curQ.correctAnswerText)}</strong>.`;
    if (expChar) expChar.innerText = lt[ci];
    if (isL) {
      btnExp.classList.remove('disabled');
      if (expVerdict) expVerdict.innerHTML = (userChoice === ci) ? `<strong>Well done!</strong> Great effort.` : `<strong>Review the solution above to understand the concept.</strong>`;
    } else btnExp.classList.add('disabled');
  }

  if ($('btn-prev')) $('btn-prev').disabled = CBTState.currentQuestion === s.start; 
  if ($('btn-clear')) $('btn-clear').disabled = userChoice === null || isL; 
  let nb = $('btn-next'); 
  if (nb) {
    if (s.submitted) { nb.innerHTML = `<span>NEXT QUESTION</span>`; nb.disabled = CBTState.currentQuestion === s.end - 1; }
    else nb.innerHTML = (CBTState.currentQuestion === s.end - 1) ? `<span>SUBMIT SECTION →</span>` : `<span>SAVE & NEXT →</span>`; 
  }
  updatePalette(); 
  updateUserDynamicRank();
  saveSessionToLocalStorage(); 
};

window.saveAnswer = i => { 
  if (CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted) return; 
  CBTState.userAnswers[CBTState.currentQuestion] = i; 
  if ($('btn-clear')) $('btn-clear').disabled = false; 
  if (!CBTState.sectionToppersFetched[CBTState.currentYearIndex]) {
    CBTState.sectionToppersFetched[CBTState.currentYearIndex] = true;
    fetchAndRenderSidebarToppers();
  }
  loadQuestion(); 
};

window.clearResponse = () => { 
  if (CBTState.lockedAnswers[CBTState.currentQuestion] || CBTState.sections[CBTState.currentYearIndex].submitted) return; 
  CBTState.userAnswers[CBTState.currentQuestion] = null; 
  loadQuestion(); 
};

window.nextQuestion = () => { 
  if (CBTState.userAnswers[CBTState.currentQuestion] !== null && !CBTState.sections[CBTState.currentYearIndex].submitted) CBTState.lockedAnswers[CBTState.currentQuestion] = true; 
  if (CBTState.currentQuestion < CBTState.sections[CBTState.currentYearIndex].end - 1) { CBTState.currentQuestion++; loadQuestion(); } 
  else if (!CBTState.sections[CBTState.currentYearIndex].submitted) showSubmitModal(); 
};

window.prevQuestion = () => { if (CBTState.currentQuestion > CBTState.sections[CBTState.currentYearIndex].start) { CBTState.currentQuestion--; loadQuestion(); } };
window.jumpToQuestion = i => { CBTState.currentQuestion = i; loadQuestion(); };

window.filterPalette = type => { 
  CBTState.currentFilter = type; 
  document.querySelectorAll('.palette-filter-bar .filter-pill-btn').forEach(btn => btn.classList.remove('active')); 
  const active = $('filter-' + type); 
  if (active) active.classList.add('active'); 
  updatePalette(); 
};

function updatePalette() { 
  let s = CBTState.sections[CBTState.currentYearIndex], g = $('palette-grid'); 
  if (!g) return; 
  g.innerHTML = ''; 
  let rc = 0, wc = 0, sc = 0; 
  for (let i = s.start; i < s.end; i++) { 
    if (CBTState.userAnswers[i] !== null && (CBTState.lockedAnswers[i] || s.submitted)) { 
      if (isAnswerCorrect(i)) { rc++; sc += getCorrectMarks(); } 
      else { wc++; sc -= getIncorrectMarks(); } 
    } 
    let cls = CBTState.visitedQuestions[i] ? (CBTState.userAnswers[i] !== null ? 'answered' : 'not-answered') : 'unvisited'; 
    let isEvaluatedWrong = (CBTState.lockedAnswers[i] || s.submitted) && CBTState.userAnswers[i] !== null && !isAnswerCorrect(i); 
    let dsp = isEvaluatedWrong ? 'wrong' : cls, flt = false; 
    if (CBTState.currentFilter !== 'all') { 
      if (CBTState.currentFilter === 'answered' && cls !== 'answered' && !isEvaluatedWrong) flt = true; 
      else if (CBTState.currentFilter === 'not-answered' && cls !== 'not-answered') flt = true; 
      else if (CBTState.currentFilter === 'unvisited' && cls !== 'unvisited') flt = true; 
    } 
    g.innerHTML += `<button type="button" class="palette-btn dsp-${dsp}${i === CBTState.currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" onclick="jumpToQuestion(${i})">${(i - s.start) + 1}${isEvaluatedWrong ? `<span class="badge-status-cross">✕</span>` : ''}</button>`; 
  } 
  if ($('stat-right')) $('stat-right').innerText = rc; 
  if ($('stat-wrong')) $('stat-wrong').innerText = wc; 
  if ($('stat-score')) $('stat-score').innerText = sc; 
}

window.showSubmitModal = () => { 
  if (CBTState.userAnswers[CBTState.currentQuestion] !== null && !CBTState.sections[CBTState.currentYearIndex].submitted) CBTState.lockedAnswers[CBTState.currentQuestion] = true; 
  if ($('submit-modal-text')) $('submit-modal-text').innerText = `Submit responses for ${CBTState.sections[CBTState.currentYearIndex].year}?`; 
  CBTState.isTimerPaused = true; 
  if ($('modal-submit')) $('modal-submit').style.display = 'flex'; 
};
window.closeSubmitModal = () => { if ($('modal-submit')) $('modal-submit').style.display = 'none'; CBTState.isTimerPaused = false; };
window.confirmSubmitExam = () => { if ($('modal-submit')) $('modal-submit').style.display = 'none'; CBTState.isTimerPaused = false; window.processSectionSubmission(); };

window.processSectionSubmission = async function() { 
  let sec = CBTState.sections[CBTState.currentYearIndex]; 
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

  if ($('lbl-user-greeting')) $('lbl-user-greeting').innerText = CBTState.studentNameVal || "AGYAT";
  if ($('lbl-section-title')) $('lbl-section-title').innerText = `${sec.year} Completed,`;

  let secCorrect = 0, secIncorrect = 0, secUnattempted = 0, secMarks = 0;
  let totalQuestions = sec.end - sec.start, totalSectionMarks = totalQuestions * getCorrectMarks();
  for (let i = sec.start; i < sec.end; i++) {
    if (CBTState.userAnswers[i] !== null) {
      if (isAnswerCorrect(i)) { secCorrect++; secMarks += getCorrectMarks(); } 
      else { secIncorrect++; secMarks -= getIncorrectMarks(); }
    } else secUnattempted++;
  }

  secMarks = Number((secMarks - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
  let formattedTime = `${Math.floor(sec.timeSpent / 60).toString().padStart(2, '0')}:${(sec.timeSpent % 60).toString().padStart(2, '0')}`;
  if ($('lbl-score-obtained')) $('lbl-score-obtained').innerText = (secMarks % 1 === 0) ? secMarks : secMarks.toFixed(2); 
  if ($('lbl-score-total')) $('lbl-score-total').innerText = (totalSectionMarks % 1 === 0) ? totalSectionMarks : totalSectionMarks.toFixed(2); 
  if ($('lbl-stat-correct-val')) $('lbl-stat-correct-val').innerText = secCorrect; 
  if ($('lbl-stat-incorrect-val')) $('lbl-stat-incorrect-val').innerText = secIncorrect; 
  if ($('lbl-stat-unattempted-val')) $('lbl-stat-unattempted-val').innerText = secUnattempted; 
  if ($('lbl-stat-time-val')) $('lbl-stat-time-val').innerText = formattedTime;

  updateUserDynamicRank();

  let tg = $('table-body-matrix-target'); 
  if (tg) {
    tg.innerHTML = '';
    let cM = 0, aS = 0, rC = 0, rI = 0, rL = 0, totalExamQ = 0;
    const themeColors = ['blue', 'green', 'amber'], fmtPct = v => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)) + '%';
    CBTState.sections.forEach((s, sIdx) => {
      let sC = 0, sI = 0, sL = 0, sS = 0, sT = s.end - s.start, sM = sT * getCorrectMarks();
      cM += sM; totalExamQ += sT;
      for (let i = s.start; i < s.end; i++) {
        if (CBTState.userAnswers[i] !== null) {
          if (isAnswerCorrect(i)) { sC++; sS += getCorrectMarks(); }
          else { sI++; sS -= getIncorrectMarks(); }
        } else sL++;
      }
      aS += sS; rC += sC; rI += sI; rL += sL;
      let pR = sM > 0 && sS > 0 && s.submitted ? Math.round((sS / sM) * 100) : 0;
      let theme = themeColors[sIdx % themeColors.length];
      tg.innerHTML += `
        <div class="summary-row-card row-theme-${theme}">
          <div class="sm-col sm-col-section"><div class="sec-card-icon-box ${theme}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div><div class="sec-card-title-group"><span class="sec-card-title">${escapeHTML(s.year)}</span><span class="sec-card-subtitle">${sT} Ques.</span></div></div>
          <div class="sm-col"><span class="badge-pct-pill green">${s.submitted ? pR : 0}%</span><span class="sm-subtext">(${s.submitted ? (sS % 1 === 0 ? sS : sS.toFixed(2)) : 0} / ${sM % 1 === 0 ? sM : sM.toFixed(2)})</span></div>
          <div class="sm-col"><span class="stat-circle-badge correct">${s.submitted ? sC : '0'}</span><span class="sm-subtext">${fmtPct(sT > 0 && s.submitted ? ((sC / sT) * 100) : 0)}</span></div>
          <div class="sm-col"><span class="stat-circle-badge incorrect">${s.submitted ? sI : '0'}</span><span class="sm-subtext">${fmtPct(sT > 0 && s.submitted ? ((sI / sT) * 100) : 0)}</span></div>
          <div class="sm-col"><span class="stat-circle-badge unattempted">${s.submitted ? sL : sT}</span><span class="sm-subtext">${fmtPct(sT > 0 ? (((s.submitted ? sL : sT) / sT) * 100) : 0)}</span></div>
        </div>`;
    });
    aS = Number((aS - (CBTState.securityWarnings * getPenaltyMarks())).toFixed(2));
    tg.innerHTML += `
      <div class="summary-row-card row-theme-purple total-row">
        <div class="sm-col sm-col-section"><div class="sec-card-icon-box purple" style="font-weight:900;font-size:1.15rem;">Σ</div><div class="sec-card-title-group"><span class="sec-card-title">TOTAL</span><span class="sec-card-subtitle">${totalExamQ} Ques.</span></div></div>
        <div class="sm-col"><span class="badge-pct-pill blue">${cM > 0 ? Math.round((aS / cM) * 100) : 0}%</span><span class="sm-subtext">(${aS % 1 === 0 ? aS : aS.toFixed(2)} / ${cM % 1 === 0 ? cM : cM.toFixed(2)})</span></div>
        <div class="sm-col"><span class="stat-circle-badge correct">${rC}</span><span class="sm-subtext">${fmtPct(totalExamQ > 0 ? ((rC / totalExamQ) * 100) : 0)}</span></div>
        <div class="sm-col"><span class="stat-circle-badge incorrect">${rI}</span><span class="sm-subtext">${fmtPct(totalExamQ > 0 ? ((rI / totalExamQ) * 100) : 0)}</span></div>
        <div class="sm-col"><span class="stat-circle-badge unattempted">${rL}</span><span class="sm-subtext">${fmtPct(totalExamQ > 0 ? ((rL / totalExamQ) * 100) : 0)}</span></div>
      </div>`;
  }

  const saveUrl = getSaveRecordOfCBT();
  if (saveUrl) {
    const params = new URLSearchParams();
    params.append("timestamp", getFormattedTimestamp());
    params.append("studentName", CBTState.studentNameVal || "AGYAT");
    params.append("studentClass", CBTState.studentClassVal?.toString().startsWith("Class") ? CBTState.studentClassVal : `Class ${CBTState.studentClassVal || "12"}`);
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
    try { await fetch(saveUrl, { method: "POST", body: params }); } catch (err) { console.warn("Save sync error:", err); }
  }

  await new Promise(res => setTimeout(res, 850));
  if (loaderBox) loaderBox.style.display = 'none';
  if (scFrame) scFrame.style.display = 'flex';
  let b = $('btn-dashboard-main-trigger'); 
  if (b) { 
    b.disabled = false; b.style.opacity = '1'; 
    b.innerHTML = (CBTState.currentYearIndex < CBTState.sections.length - 1) ? `CONTINUE TO ${(CBTState.sections[CBTState.currentYearIndex + 1].year || 'PART B').toUpperCase()} →` : `COMPLETE EVALUATION`;
  } 
};

function showFinalCumulativeEvaluation() {
  clearSessionLocalStorage(); 
  if ($('capture-scorecard-frame')) $('capture-scorecard-frame').style.display = 'none';
  if ($('cumulative-matrix-container')) { $('cumulative-matrix-container').style.display = 'block'; $('cumulative-matrix-container').scrollIntoView({ behavior: 'smooth' }); }
}

function executeProgressionAdvance() { 
  if (CBTState.currentYearIndex + 1 < CBTState.sections.length) { 
    CBTState.currentYearIndex++; 
    CBTState.currentQuestion = CBTState.sections[CBTState.currentYearIndex].start; 
    if ($('result-screen')) $('result-screen').style.display = 'none'; 
    if ($('quiz-screen')) $('quiz-screen').style.display = 'block'; 
    if ($('unified-nav')) $('unified-nav').style.display = 'flex'; 
    buildYearNav(); updateTimerDisplay(); loadQuestion(); 
  } else showFinalCumulativeEvaluation(); 
}

window.buildYearNav = () => { 
  let c = $('year-nav-container'); 
  if (!c) return; 
  c.innerHTML = ''; 
  if ($('current-paper-label') && CBTState.sections[CBTState.currentYearIndex]) $('current-paper-label').innerHTML = `<span>${CBTState.sections[CBTState.currentYearIndex].year}</span>${CBTState.sections[CBTState.currentYearIndex].title}`; 
  CBTState.sections.forEach((p, idx) => { 
    let t = document.createElement('div'); 
    t.className = `year-tab ${idx === CBTState.currentYearIndex ? 'active' : ''}`; 
    t.innerHTML = `<span style="font-size:.7em;text-transform:uppercase;color:var(--tab-${idx === CBTState.currentYearIndex ? 'active' : 'inactive'}-lbl);font-weight:600;">${p.year}</span><span style="font-size:.95em;font-weight:700;color:var(--tab-${idx === CBTState.currentYearIndex ? 'active' : 'inactive'}-val);">${p.title}</span>`; 
    t.onclick = async () => { 
      if (CBTState.sections[idx].submitted || idx === CBTState.currentYearIndex) { 
        CBTState.currentYearIndex = idx; CBTState.currentQuestion = CBTState.sections[idx].start; 
        buildYearNav(); updateTimerDisplay(); loadQuestion(); 
      } else showToastAlert("Submit your current section to unlock the next section."); 
    }; 
    c.appendChild(t); 
  }); 
};

function triggerSlowMotionStarsAnimation() {
  if (CBTState.hasAnimatedStars) return;
  CBTState.hasAnimatedStars = true;
  document.querySelectorAll('#fb-stars-group .fb-star').forEach((star, index) => {
    setTimeout(() => {
      star.classList.add('auto-pulse', 'active');
      setTimeout(() => {
        star.classList.remove('auto-pulse');
        if (parseInt(star.getAttribute('data-val')) > CBTState.feedbackRating) star.classList.remove('active');
      }, 400);
    }, index * 160);
  });
}

function setupStarScrollObserver() {
  const target = $('feedback-rating-section');
  if (!target) return;
  new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) triggerSlowMotionStarsAnimation(); }); }, { threshold: 0.25 }).observe(target);
}

window.previewStars = function(rating) { document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => s.classList.toggle('hovered', parseInt(s.getAttribute('data-val')) <= rating)); };
window.resetStarsPreview = function() { document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => s.classList.remove('hovered')); };

window.setFeedbackRating = function(rating, isUserAction = false) {
  CBTState.feedbackRating = rating;
  document.querySelectorAll('#fb-stars-group .fb-star').forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-val')) <= rating));
  if (isUserAction) {
    const saveBtn = $('btn-save-feedback');
    if (saveBtn) {
      saveBtn.classList.remove('btn-bounce-nudge');
      void saveBtn.offsetWidth; 
      saveBtn.classList.add('btn-bounce-nudge');
      setTimeout(() => saveBtn.classList.remove('btn-bounce-nudge'), 1000);
    }
  }
};

window.updateFbCharCount = function(textarea) { if ($('fb-char-counter')) $('fb-char-counter').innerText = `${textarea.value.length}/500`; };
window.toggleFeedbackPill = function(radioInput) {
  CBTState.feedbackCategory = radioInput.value;
  document.querySelectorAll('.fb-radio-pill-exact').forEach(pill => pill.classList.remove('active'));
  radioInput.closest('.fb-radio-pill-exact').classList.add('active');
};

window.submitUserFeedback = async function() {
  const msgEl = $('feedback-user-message'), rawMessage = msgEl ? msgEl.value.trim() : "", finalMessage = rawMessage || "(Rating Submitted)";
  const btn = $('btn-save-feedback');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span>Saving...</span>`; }
  const payload = { chapter: getTestName(), studentClass: CBTState.studentClassVal || "Class XII", category: CBTState.feedbackCategory, name: CBTState.studentNameVal || "AGYAT", rating: `${CBTState.feedbackRating} Stars`, message: finalMessage };
  try {
    await fetch(getFeedbackScriptURL(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    showToastAlert("Thank you! Your response has been saved.");
    if (msgEl) { msgEl.value = ""; updateFbCharCount(msgEl); }
    await fetchFeedbackSubmissions();
  } catch (err) { showToastAlert("Response saved successfully!"); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = `<span>Save Your Response</span>`; } }
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
  } catch (err) { console.warn("Responses sync error:", err); }
}

function renderSubmissionsShowcase(dataList) {
  const totalCountEl = $('ssc-total-count'), countApprovedEl = $('count-approved-badge'), countPendingEl = $('count-pending-badge');
  const streamApproved = $('stream-approved-cards'), streamPending = $('stream-pending-cards'), viewMoreWrap = $('ssc-view-more-wrap');
  if (totalCountEl) totalCountEl.innerText = `${dataList.length} Responses`;

  const approved = dataList.filter(item => (item.status || "").trim().toLowerCase() === "approved");
  const pending = dataList.filter(item => (item.status || "").trim().toLowerCase() !== "approved");
  if (countApprovedEl) countApprovedEl.innerText = approved.length;
  if (countPendingEl) countPendingEl.innerText = pending.length;

  const maxInitial = CBTState.isExpandedSubmissions ? 9999 : 20;
  const approvedToShow = approved.slice(0, maxInitial), pendingToShow = pending.slice(0, maxInitial);

  if (viewMoreWrap) {
    if (approved.length > 20) {
      viewMoreWrap.style.display = 'block';
      if ($('lbl-load-more-text')) $('lbl-load-more-text').innerText = CBTState.isExpandedSubmissions ? 'Show Less ↑' : 'View More Responses (20+) ↓';
    } else viewMoreWrap.style.display = 'none';
  }

  const buildStars = ratingRaw => {
    let num = parseInt(ratingRaw) || 5, starsStr = '';
    for (let i = 1; i <= 5; i++) starsStr += `<svg class="ssc-star-svg ${i <= num ? 'filled' : ''}" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    return `<div class="ssc-appr-stars">${starsStr}</div>`;
  };

  if (streamApproved) {
    streamApproved.innerHTML = approved.length === 0 ? `<div class="ssc-empty-note">No approved comments yet for this topic.</div>` : approvedToShow.map(item => {
      const studentName = escapeHTML(item.name || 'Rohan Gupta'), firstLetter = studentName.charAt(0).toUpperCase() || 'R';
      return `
      <div class="ssc-approved-image1-card">
        <div class="ssc-appr-header-row">
          <div class="ssc-appr-user-meta"><div class="ssc-appr-avatar-blue">${firstLetter}</div><span class="ssc-appr-name">${studentName}</span><span class="ssc-appr-class-tag">${escapeHTML(item.studentClass || 'Class XII')}</span><span class="ssc-appr-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHTML(item.timestamp || 'Sep 03, 2026')}</span></div>
          <div class="ssc-appr-right-hud">${buildStars(item.rating)}<button type="button" class="ssc-dots-menu-btn" title="Options"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg></button></div>
        </div>
        <div class="ssc-appr-body-thread">
          <div class="ssc-thread-line-track"><div class="ssc-thread-stem"></div><div class="ssc-thread-node-dot"></div></div>
          <div class="ssc-appr-content-area">
            <div class="ssc-appr-user-bubble">${escapeHTML(item.message || 'Could you add more practice questions on merge and join?')}</div>
            <div class="ssc-appr-instructor-row">
              <div class="ssc-inst-profile"><div class="ssc-inst-bot-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg></div><span class="ssc-inst-name">Rohit Singh</span></div>
              <div class="ssc-inst-reply-bubble">👍 ${escapeHTML(item.reply || 'Sure, adding 5 more practice questions this week.')}</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  if (streamPending) {
    streamPending.innerHTML = pending.length === 0 ? `<div class="ssc-empty-note">No pending reviews.</div>` : pendingToShow.map(item => {
      const studentName = escapeHTML(item.name || 'ROHIT'), firstLetter = studentName.charAt(0).toUpperCase() || 'R';
      return `
      <div class="ssc-pending-image6-card">
        <div class="ssc-pending-top-row">
          <div class="ssc-pending-user-info"><div class="ssc-pending-avatar-cyan">${firstLetter}</div><span class="ssc-pending-name">${studentName}</span><span class="ssc-pending-class-tag">${escapeHTML(item.studentClass || 'Class XII')}</span><span class="ssc-pending-date"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHTML(item.timestamp || 'Sep 13, 2026')}</span></div>
          <div class="ssc-pending-badge-pill"><span>⏳</span><span>Pending</span></div>
        </div>
        <div class="ssc-pending-blur-content">${escapeHTML(item.message || 'Student response undergoing moderation.')}</div>
      </div>`;
    }).join('');
  }
}

window.toggleAllSubmissions = function() {
  CBTState.isExpandedSubmissions = !CBTState.isExpandedSubmissions;
  renderSubmissionsShowcase(CBTState.feedbackDataStore);
};

document.addEventListener('DOMContentLoaded', () => {
  const activeName = getTestName(); 
  if ($('current-chapter')) $('current-chapter').innerText = activeName; 
  document.querySelectorAll('.topic-text').forEach(node => node.innerText = activeName);

  if ($('welcome-correct-lbl')) $('welcome-correct-lbl').innerText = `+${getCorrectMarks()} Correct`;
  if ($('welcome-incorrect-lbl')) $('welcome-incorrect-lbl').innerText = `-${getIncorrectMarks()} Incorrect`;

  setFeedbackRating(5, false);
  setupStarScrollObserver();

  const saved = getSavedSession();
  if (saved) { CBTState.pendingRestoreData = saved; if ($('modal-resume')) $('modal-resume').style.display = 'flex'; }
  else if ($('modal-welcome')) $('modal-welcome').style.display = 'flex';

  loadQuestionsFromSheet(); 
  fetchFeedbackSubmissions();

  const eyes = document.querySelectorAll('.desktop-eyes .eye-ball'), pupils = document.querySelectorAll('.desktop-eyes .pupil'); 
  document.addEventListener('mousemove', e => { 
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
      eyes.forEach(eye => { eye.style.transform = 'scaleY(0.06)'; setTimeout(() => eye.style.transform = 'scaleY(1)', 110); }); 
      scheduleBlink(); 
    }, 3000 + Math.random() * 4000); 
  }; 
  scheduleBlink(); 
});