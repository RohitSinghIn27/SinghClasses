const $ = id => document.getElementById(id);
const getCorrectMarks = () => window.CBT_CONFIG?.MARKS_CORRECT ?? 5;
const getIncorrectMarks = () => window.CBT_CONFIG?.MARKS_INCORRECT ?? 1;
const getPenaltyMarks = () => window.CBT_CONFIG?.PENALTY_WARNING ?? 2;
const getFetchQuestionsOfCBT = () => window.CBT_CONFIG?.FetchQuestionsOfCBT ?? window.CBT_CONFIG?.SHEET_API_URL ?? "";
const getSaveRecordOfCBT = () => window.CBT_CONFIG?.SaveRecordOfCBT ?? window.CBT_CONFIG?.FORM_SAVE_URL ?? "";
const getFetchRecordOfCBT = () => window.CBT_CONFIG?.FetchRecordOfCBT ?? window.CBT_CONFIG?.TOPPER_API_URL ?? "";
const getTestName = () => window.CBT_CONFIG?.TEST_NAME ?? "Quiz";
const getHomeUrl = () => window.CBT_CONFIG?.HOME_URL ?? "https://www.singhclasses.in/";
const getYoutubeUrl = () => window.CBT_CONFIG?.YOUTUBE_URL ?? "https://www.youtube.com/@SinghClasses";
const isProctoringEnabled = () => window.CBT_CONFIG?.ENABLE_PROCTORING ?? true;

const ICON_ALERT = `<svg class="sc-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

let listExamPapers = [], isQuestionsLoading = false, questions = [], sections = [], currentYearIndex = 0, currentQuestion = 0;
let studentNameVal = "", studentClassVal = "", studentSectionVal = "", schoolNameVal = "", studentName = "";
let userAnswers = [], visitedQuestions = [], lockedAnswers = [], sectionTimes = [];
let timerInterval, isTimerPaused = true, securityWarnings = 0, isExamActive = false, currentFilter = 'all', globalFormPayload = null;
let activeResourceUrl = "", blurDwellTimer = null, lastWT = 0, lastSpacePressTime = 0;
let sectionToppersFetched = [];

function getFormattedTimestamp() {
  const now = new Date();
  const pad = n => (n < 10 ? '0' + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function getStorageKey() { return `cbt_session_${getTestName().replace(/\s+/g, '_')}_${studentNameVal.replace(/\s+/g, '_')}`; }

function saveSessionToLocalStorage() { if (!isExamActive || !studentNameVal) return; try { const payload = { currentYearIndex, currentQuestion, userAnswers, visitedQuestions, lockedAnswers, sectionTimes, securityWarnings, questions, sections, sectionsData: sections.map(s => ({ submitted: s.submitted, timeSpent: s.timeSpent })), studentNameVal, studentClassVal, studentSectionVal, schoolNameVal, studentName, sectionToppersFetched }; localStorage.setItem(getStorageKey(), JSON.stringify(payload)); } catch (e) { console.warn("Failed to save session to localStorage:", e); } }

function clearSessionLocalStorage() { if (!studentNameVal) return; try { localStorage.removeItem(getStorageKey()); } catch (e) { console.warn("Failed to clear localStorage:", e); } }

function preloadQuestionImages() { listExamPapers.forEach(paper => { (paper.questions || []).forEach(q => { if (q.image) { const img = new Image(); img.src = q.image; } }); }); }

function toggleFilterSlider() { const w = document.querySelector('.filter-slider-wrapper'); if (w) w.classList.toggle('active'); }
document.addEventListener('click', e => { const w = document.querySelector('.filter-slider-wrapper'); if (w && !w.contains(e.target)) w.classList.remove('active'); });

function escapeHTML(str) { return str == null ? "" : str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>"); }
function getVerbatim(obj, keys, fallback = "") { for (let k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; } return fallback; }

function resolveCorrectText(rawValue, optionsArray) { if (rawValue == null || rawValue === "") return optionsArray[0] || ""; let v = rawValue.toString().trim(); let textMatch = optionsArray.find(opt => opt !== null && opt !== undefined && opt.toString().trim().toLowerCase() === v.toLowerCase()); if (textMatch !== undefined) return textMatch.toString(); let letter = v.toLowerCase(); if (['a', 'b', 'c', 'd', 'e'].includes(letter)) { let idx = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[letter]; if (idx < optionsArray.length) return optionsArray[idx].toString(); } const n = parseInt(v); return (!isNaN(n) && n >= 0 && n < optionsArray.length) ? optionsArray[n].toString() : (optionsArray[0] ? optionsArray[0].toString() : ""); }

function textToIndex(correctText, optionsArray) { let idx = optionsArray.findIndex(opt => opt !== null && opt !== undefined && opt.toString().trim().toLowerCase() === correctText.toLowerCase()); return idx !== -1 ? idx : 0; }

async function loadQuestionsFromSheet(retries = 3) {
  if (isQuestionsLoading || listExamPapers.length > 0) return;
  isQuestionsLoading = true;

  let baseUrl = getFetchQuestionsOfCBT();
  if (!baseUrl) {
    isQuestionsLoading = false;
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(baseUrl, { method: "GET", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty response.");
      
      if (raw[0] && Array.isArray(raw[0].questions)) {
        listExamPapers = raw.map(paper => ({
          title: getVerbatim(paper, ['title', 'Title', 'sectiontitle', 'SectionTitle'], "Section"),
          year: getVerbatim(paper, ['year', 'Year', 'section', 'Section'], "Set"),
          questions: (paper.questions || []).map(q => {
            let rawOpts = Array.isArray(q.options) ? q.options : [getVerbatim(q, ['optiona', 'OptionA', 'option1', '0'], ""), getVerbatim(q, ['optionb', 'OptionB', 'option2', '1'], ""), getVerbatim(q, ['optionc', 'OptionC', 'option3', '2'], ""), getVerbatim(q, ['optiond', 'OptionD', 'option4', '3'], "")];
            let cleanOpts = rawOpts.map(o => (o !== null && o !== undefined ? o : "").toString());
            let rawCorrect = getVerbatim(q, ['correctIndex', 'correct', 'answer', 'ans', '4'], "A");
            return {
              text: getVerbatim(q, ['text', 'Text', 'question', 'Question'], "").toString(),
              tag: getVerbatim(q, ['tag', 'Tag', 'info', 'Info'], "").toString(),
              options: cleanOpts,
              image: getVerbatim(q, ['image', 'Image', 'imageurl'], "").toString(),
              correctAnswerText: resolveCorrectText(rawCorrect, cleanOpts)
            };
          }).filter(q => q.text !== "")
        }));
      } else {
        const sectionsMap = {};
        raw.forEach(row => {
          const r = {};
          Object.keys(row).forEach(k => {
            r[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
          });
          let sectionLabel = getVerbatim(r, ['section', 'year', 'set'], "Section A").toString().trim();
          let sectionTitle = getVerbatim(r, ['sectiontitle', 'title', 'label'], sectionLabel).toString().trim();
          let qText = getVerbatim(r, ['question', 'questions', 'questiontext', 'text', 'q'], null);
          if (qText === null || qText === "") return;
          let qTag = getVerbatim(r, ['tag', 'info', 'metadata'], "").toString();
          let qImg = getVerbatim(r, ['image', 'imageurl', 'img'], "").toString();
          const options = [getVerbatim(r, ['optiona', 'option1', 'a'], ""), getVerbatim(r, ['optionb', 'option2', 'b'], ""), getVerbatim(r, ['optionc', 'option3', 'c'], ""), getVerbatim(r, ['optiond', 'option4', 'd'], "")].map(o => o.toString());
          let rawCorrect = getVerbatim(r, ['correct', 'correctanswer', 'correctindex', 'answer', 'ans'], "A");
          let correctAnswerText = resolveCorrectText(rawCorrect, options);
          if (!sectionsMap[sectionLabel]) sectionsMap[sectionLabel] = { title: sectionTitle, year: sectionLabel, questions: [] };
          sectionsMap[sectionLabel].questions.push({ text: qText.toString(), tag: qTag, options, correctAnswerText, image: qImg });
        });
        listExamPapers = Object.values(sectionsMap);
      }
      
      if (listExamPapers.length > 0 && !listExamPapers.every(p => p.questions.length === 0)) {
        preloadQuestionImages();
        isQuestionsLoading = false;
        return;
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} to fetch questions failed:`, err);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, 800));
      }
    } 
  }
  isQuestionsLoading = false;
}

async function fetchAndRenderSidebarToppers() {
  const fetchRecordUrl = getFetchRecordOfCBT(), container = $('sidebar-toppers');
  if (!fetchRecordUrl) return;
  if (container) container.classList.add('fetching-pulse');
  try {
    const testName = getTestName();
    const sec = sections[currentYearIndex];
    const currentSection = sec ? `${sec.year} - ${sec.title}` : "";
    const url = `${fetchRecordUrl}?testName=${encodeURIComponent(testName)}&currentSection=${encodeURIComponent(currentSection)}&_t=${Date.now()}`;
    const res = await fetch(url);
    const data = await res.json();
    const recordsList = data ? (data.records || data.top7 || data.top5 || data.toppers || (Array.isArray(data) ? data : [])) : [];
    if (recordsList.length > 0) renderSidebarToppers(recordsList);
    else if (container) container.style.display = 'none';
  } catch (err) {
    console.warn("Sidebar toppers sync note:", err);
  } finally {
    if (container) container.classList.remove('fetching-pulse');
  } 
}

window.handleSectionProgression = function() { 
  if (currentYearIndex < sections.length - 1) {
    executeProgressionAdvance();
  } else {
    showFinalCumulativeEvaluation();
  }
};

function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

function showToastAlert(m) { let t = $('custom-alert-toast'), txt = $('custom-alert-text'); if (t && txt) { txt.innerHTML = `${ICON_ALERT} ${m}`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4000); } }

function triggerVerifyModal(type) { const modal = $('verify-resource-modal'), icon = $('verify-card-icon'), heading = $('verify-modal-heading'), text = $('verify-modal-text'), actionBtn = $('verify-proceed-action-btn'), driveId = $('current-chapter') ? $('current-chapter').getAttribute('data-drive-id') : ""; modal.style.display = 'flex'; if (type === 'pdf') { activeResourceUrl = `https://drive.google.com/file/d/${driveId}/preview`; icon.className = "verify-modal-icon pdf-style"; icon.innerHTML = `<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`; heading.innerText = "Open Chapter Study Material?"; text.innerText = "You are going to view the embedded revision lecture notes inside your student drive space."; actionBtn.className = "v-btn v-btn-pdf"; actionBtn.innerText = "Open Notes"; } else if (type === 'yt') { activeResourceUrl = getYoutubeUrl(); icon.className = "verify-modal-icon yt-style"; icon.innerHTML = `<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`; heading.innerText = "Watch the Video Lesson?"; text.innerText = "Choose to continue onward if you are ready to launch the One Shot educational lecture window streams."; actionBtn.className = "v-btn v-btn-yt"; actionBtn.innerText = "Watch Video"; } actionBtn.onclick = () => { window.open(activeResourceUrl, '_blank'); closeVerifyModal(); }; }

function closeVerifyModal() { $('verify-resource-modal').style.display = 'none'; }
function toggleFullScreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(err => console.error(err.message)); }
function goToHome() { window.location.href = getHomeUrl(); }

window.closeSecurityModal = () => { $('modal-security').style.display = 'none'; document.querySelector('.sc-widget-container').classList.remove('sc-blur-active'); isTimerPaused = false; };

window.addEventListener('scroll', () => { let bar = $("scProgressBar"), st = document.documentElement.scrollTop || document.body.scrollTop, sh = document.documentElement.scrollHeight - document.documentElement.clientHeight; if (bar) bar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + "%"; });

document.addEventListener("DOMContentLoaded", () => { const ym = $('yearMenuToggle'), yc = $('year-nav-container'); if (ym && yc) { ym.addEventListener('click', e => { e.stopPropagation(); yc.classList.toggle('show-year-menu'); ym.innerHTML = yc.classList.contains('show-year-menu') ? '✕' : '☰'; }); } });

window.goToGuidelinesStep = () => { studentNameVal = $('student-name-input').value.trim().toUpperCase() || "AGYAT"; studentClassVal = $('student-class-input').value || "12"; studentSectionVal = $('student-section-input').value || "A"; schoolNameVal = $('student-school-input').value.trim().toUpperCase() || "SPS"; studentName = `${studentNameVal} | CLASS: ${studentClassVal} | SEC: ${studentSectionVal} | ${schoolNameVal}`; $('welcome-step-1').style.display = 'none'; $('welcome-step-2').style.display = 'block'; };

window.goToLoginStep = () => { $('welcome-step-2').style.display = 'none'; $('welcome-step-1').style.display = 'block'; };

window.onload = async () => { 
  const activeTestName = getTestName(); 
  const chapterCapsule = $('current-chapter'); if (chapterCapsule) chapterCapsule.innerText = activeTestName; 
  const topicTextNode = document.querySelector('.topic-text'); if (topicTextNode) topicTextNode.innerText = activeTestName; 
  $('welcome-correct-lbl').innerText = `+${getCorrectMarks()} Correct`; 
  $('welcome-incorrect-lbl').innerText = `-${getIncorrectMarks()} Incorrect`; 
  $('modal-welcome').style.display = 'flex'; 
  
  ['student-name-input', 'student-school-input'].forEach(id => { 
    const el = $(id); 
    if (el) {
      el.addEventListener('focus', () => loadQuestionsFromSheet());
      el.addEventListener('input', () => loadQuestionsFromSheet());
      el.addEventListener('keypress', e => { if (e.key === 'Enter') goToGuidelinesStep(); }); 
    }
  }); 

  loadQuestionsFromSheet(); 

  const contentEl = $('question-content'); 
  if (contentEl) { 
    let tx = 0, ty = 0; 
    contentEl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true }); 
    contentEl.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > Math.abs(dy) + 30) { if (dx < -40) nextQuestion(); if (dx > 40) prevQuestion(); } }, { passive: true }); 
  } 
  initParticleCanvas('quiz-screen', 'canvasCBT', 12, 90); 
  initParticleCanvas('quiz-screen', 'canvasPalette', 6, 70); 
};

['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => {
  document.addEventListener(ev, e => {
    if (isProctoringEnabled() && isExamActive) e.preventDefault();
  });
});

document.addEventListener('keydown', e => {
  if (!isExamActive || !isProctoringEnabled() || isTimerPaused) return;

  const key = e.key ? e.key.toLowerCase() : "";
  const code = e.code ? e.code.toLowerCase() : "";
  const isPrintScreen = key === 'printscreen' || code === 'printscreen' || e.keyCode === 44;
  const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && (key === '3' || key === '4' || key === '5');
  const isWinSnipping = (e.metaKey || e.shiftKey) && (key === 's' && e.shiftKey);

  if (isPrintScreen || isMacScreenshot || isWinSnipping) {
    const widget = document.querySelector('.sc-widget-container');
    if (widget) widget.classList.add('sc-blur-active');
    
    e.preventDefault();
    try { navigator.clipboard.writeText(''); } catch (err) {}
    applySecurityPenalty();
    return false;
  }
});

document.addEventListener('keyup', e => { 
  if (!isExamActive || !isProctoringEnabled()) return;
  if (e.key === 'PrintScreen' || e.keyCode === 44) { 
    try { navigator.clipboard.writeText(''); } catch (err) {} 
    if (!isTimerPaused) applySecurityPenalty(); 
  } 
});

document.addEventListener('keydown', e => { if (!isExamActive || (sections[currentYearIndex] && sections[currentYearIndex].submitted)) return; if (e.code === 'Space') { e.preventDefault(); const currentTime = Date.now(), timeDifference = currentTime - lastSpacePressTime; if (timeDifference > 0 && timeDifference < 400) { isTimerPaused = !isTimerPaused; lastSpacePressTime = 0; } else { lastSpacePressTime = currentTime; } } });

document.addEventListener('keydown', e => { 
  if (!isExamActive || !isProctoringEnabled()) return;
  let k = e.key.toLowerCase(), ic = e.ctrlKey || e.metaKey, is = e.shiftKey; 
  if (e.key === 'F12' || e.keyCode === 123 || (ic && is && ['i', 'j', 'c'].includes(k)) || (ic && ['u', 'p', 's', 'r'].includes(k)) || e.key === 'F5') { 
    e.preventDefault(); 
    if (!isTimerPaused) applySecurityPenalty(); 
    return false; 
  } 
});

document.addEventListener('keydown', e => { if (!isExamActive || isTimerPaused) return; let s = sections[currentYearIndex], k = e.key.toLowerCase(), isl = lockedAnswers[currentQuestion] || s.submitted; if (!isl) { if (['1', '2', '3', '4'].includes(k)) { e.preventDefault(); saveAnswer(parseInt(k) - 1); } else if (['a', 'b', 'c', 'd', 'e'].includes(k)) { e.preventDefault(); saveAnswer({ 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[k]); } else if (k === 'backspace' || k === 'delete') { e.preventDefault(); clearResponse(); } } if (k === 'enter') { e.preventDefault(); if (!s.submitted && currentQuestion === s.end - 1) showSubmitModal(); else if (!s.submitted || currentQuestion < s.end - 1) nextQuestion(); } });

function handleBlurOrHide() { 
  if (!isExamActive || !isProctoringEnabled() || isTimerPaused) return; 
  if (document.visibilityState === 'hidden' || !document.hasFocus()) {
    const widget = document.querySelector('.sc-widget-container');
    if (widget) widget.classList.add('sc-blur-active');
    applySecurityPenalty();
  }
}

document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') handleBlurOrHide(); });
window.addEventListener("blur", handleBlurOrHide);

window.addEventListener("beforeunload", e => { if (isExamActive && sections[currentYearIndex] && !sections[currentYearIndex].submitted) { let s = sections[currentYearIndex], c = 0, ic = 0, l = 0, sc = 0, tot = s.end - s.start; for (let i = s.start; i < s.end; i++) { if (userAnswers[i] !== null) { if (isAnswerCorrect(i)) { c++; sc += getCorrectMarks(); } else { ic++; sc -= getIncorrectMarks(); } } else l++; } sc = Math.max(0, sc - (securityWarnings * getPenaltyMarks())); let accStr = tot > 0 ? ((c / tot) * 100).toFixed(2) + "%" : "0.00%", tm = Math.floor(s.timeSpent / 60), ts = s.timeSpent % 60, avgTimeSec = (tot > 0 ? (s.timeSpent / tot).toFixed(1) : 0) + "s"; const formattedTimestamp = getFormattedTimestamp(); let p = new URLSearchParams(); p.append("timestamp", formattedTimestamp); p.append("studentName", (studentNameVal || "AGYAT") + " (Reload Dropout)"); p.append("studentClass", studentClassVal); p.append("studentSection", studentSectionVal); p.append("schoolName", schoolNameVal); p.append("testName", getTestName()); p.append("currentSection", s.year + " - " + s.title); p.append("obtainedScore", sc); p.append("correctAnswers", c); p.append("incorrectAnswers", ic); p.append("unattemptQuestions", l); p.append("accuracy", accStr); p.append("avgTimePerQuestion", avgTimeSec); p.append("proctoringWarnings", securityWarnings); p.append("activeTimeTaken", `${tm}m ${ts}s`); navigator.sendBeacon(getSaveRecordOfCBT(), p); } });

function applySecurityPenalty() { 
  if (!isProctoringEnabled()) return;
  if (Date.now() - lastWT < 1000) return; 
  lastWT = Date.now(); 
  securityWarnings++; 
  $('warning-count-display').innerText = `Total Warnings: ${securityWarnings} (Penalty: -${securityWarnings * getPenaltyMarks()} Marks)`; 
  
  const widget = document.querySelector('.sc-widget-container');
  if (widget) widget.classList.add('sc-blur-active');
  
  $('modal-security').style.display = 'flex'; 
  isTimerPaused = true; 
  updatePalette(); 
  saveSessionToLocalStorage(); 
}

window.buildYearNav = () => { let c = $('year-nav-container'); if (!c) return; c.innerHTML = ''; if ($('current-paper-label') && sections[currentYearIndex]) $('current-paper-label').innerHTML = `<span>${sections[currentYearIndex].year}</span>${sections[sections[currentYearIndex].index].title}`; sections.forEach((p, idx) => { let t = document.createElement('div'); t.className = `year-tab ${idx === currentYearIndex ? 'active' : ''}`; t.innerHTML = `<span style="font-size:.7em;text-transform:uppercase;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-lbl);font-weight:600;">${p.year}</span><span style="font-size:.95em;font-weight:700;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-val);">${p.title}</span>`; t.onclick = async () => { if (sections[idx].submitted || idx === currentYearIndex) { currentYearIndex = idx; currentQuestion = sections[idx].start; if (c && c.classList.contains('show-year-menu')) { c.classList.remove('show-year-menu'); if ($('yearMenuToggle')) $('yearMenuToggle').innerHTML = '☰'; } buildYearNav(); updateTimerDisplay(); loadQuestion(); if (sections[idx].submitted && !sectionToppersFetched[idx]) { sectionToppersFetched[idx] = true; await fetchAndRenderSidebarToppers(); } saveSessionToLocalStorage(); } else { showToastAlert("Submit the current section to unlock this one"); } }; c.appendChild(t); }); };

function isAnswerCorrect(qIdx) { if (userAnswers[qIdx] === null) return false; let q = questions[qIdx]; return (q.options[userAnswers[qIdx]] ?? "").toString().trim().toLowerCase() === (q.correctAnswerText ?? "").toString().trim().toLowerCase(); }
function getCorrectIndex(qIdx) { return textToIndex(questions[qIdx].correctAnswerText, questions[qIdx].options); }

function renderSidebarToppers(toppersArray) { 
  const container = $('sidebar-toppers'), listEl = $('sidebar-toppers-list');
  if (!container || !listEl) return;
  
  let realToppers = toppersArray.filter(t => t && (t.studentName || t.name) && (t.studentName !== "Awaiting..." && t.name !== "Awaiting..."));
  if (realToppers.length === 0) { 
    container.style.display = 'none';
    return; 
  } 
  
  const getMarks = (t) => { 
    let val = t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0;
    return parseFloat(val) || 0; 
  }; 
  
  const getAccuracy = (t) => { 
    let val = (t.accuracy || "0").toString().replace("%", "");
    return parseFloat(val) || 0; 
  }; 
  
  realToppers.sort((a, b) => { 
    let scoreDiff = getMarks(b) - getMarks(a);
    if (scoreDiff !== 0) return scoreDiff;
    return getAccuracy(b) - getAccuracy(a);
  }); 
  
  const top7 = realToppers.slice(0, 7);
  
  listEl.innerHTML = top7.map((t, idx) => {
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));
    const name = escapeHTML(t.studentName || t.name || 'Student');
    const marks = getMarks(t);
    const clsVal = t.studentClass || t.classVal || '';
    const secVal = t.studentSection || t.sectionVal || '';
    const clsSec = (clsVal && clsVal !== '-' ? clsVal : '') + (secVal && secVal !== '-' ? secVal : '');
    const schoolVal = t.schoolName || t.school || '';
    const school = schoolVal && schoolVal !== '-' ? ` ${schoolVal}` : '';
    return `<span class="topper-badge">${medal} <strong>${name}</strong> · ${marks} Marks${clsSec ? ` · ${clsSec}` : ''}${school}</span>`;
  }).join(' '); 
  
  container.style.display = 'flex';
}

function updateTimerDisplay() { let t = sectionTimes[currentYearIndex], m = Math.floor(t / 60), s = t % 60, timeStr = `${m}:${s < 10 ? '0' : ''}${s}`; let elDesktop = $('time-left'), elMobile = $('time-left-mobile'); if (elDesktop) elDesktop.innerText = timeStr; if (elMobile) elMobile.innerText = timeStr; let bDesktop = $('timer-box'), bMobile = $('timer-box-mobile'), targetClass = 'timer', targetStyleColor = ''; if (sections[currentYearIndex] && sections[currentYearIndex].submitted) { if (elDesktop) elDesktop.innerText = "Locked"; if (elMobile) elMobile.innerText = "Locked"; } else { if (t > 0 && t <= 60) targetClass = 'timer danger'; else if (t > 60 && t <= 120) targetClass = 'timer warning'; if (t < 30) targetStyleColor = 'var(--color-warning)'; } [bDesktop, bMobile].forEach(b => { if (b) { b.className = targetClass; b.style.color = (sections[currentYearIndex] && sections[currentYearIndex].submitted) ? '' : targetStyleColor; } }); }

function startTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { if (isTimerPaused || !isExamActive || (sections[currentYearIndex] && sections[currentYearIndex].submitted)) return; if (sectionTimes[currentYearIndex] > 0) { sectionTimes[currentYearIndex]--; sections[currentYearIndex].timeSpent++; } updateTimerDisplay(); saveSessionToLocalStorage(); if (sectionTimes[currentYearIndex] <= 0) autoLockAndSubmitSection(); }, 1000); }

function autoLockAndSubmitSection() { isTimerPaused = true; let m = $('modal-timeout'); if (m) m.style.display = 'flex'; setTimeout(() => { if (m) m.style.display = 'none'; if (typeof window.processSectionSubmission === 'function') window.processSectionSubmission(); }, 2000); }

window.loadQuestion = () => { let c = $('question-content'); if (c) { c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in'); } visitedQuestions[currentQuestion] = true; let s = sections[currentYearIndex], qy = currentQuestion - s.start, tot = s.end - s.start, pc = tot > 1 ? (qy / (tot - 1)) * 100 : 100; if (window.innerWidth <= 768 && qy === 0 && c) { c.classList.remove('swipe-hint-animation'); void c.offsetWidth; c.classList.add('swipe-hint-animation'); } if ($('section-header-title')) $('section-header-title').innerText = `${s.year}: ${s.title}`; $('exam-progress').style.width = `${pc}%`; $('q-number').innerText = `Question ${qy + 1} of ${tot}`; let baseQuestionText = `<span style="font-weight:800;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>` + escapeHTML(questions[currentQuestion].question); if (questions[currentQuestion].image) baseQuestionText += `<div class="question-image-wrap" style="margin:0 0 12px 0;text-align:left;max-width:100%;display:flex;justify-content:flex-start;align-items:center;"><img src="${questions[currentQuestion].image}" alt="Image for Question ${qy + 1}" style="max-width:100%;max-height:220px;width:auto;height:auto;border-radius:8px;border:1px solid var(--border-color);box-shadow:0 4px 10px rgba(0,0,0,0.05);object-fit:contain;display:block;"></div>`; $('q-text').innerHTML = baseQuestionText; let currentTag = questions[currentQuestion].tag ?? "", tagEl = $('q-tag'); if (tagEl) { if (currentTag) { tagEl.innerText = currentTag; tagEl.style.display = 'inline-flex'; } else { tagEl.style.display = 'none'; } } let ol = $('q-options'); ol.innerHTML = ''; let isL = lockedAnswers[currentQuestion] || s.submitted, lt = ['A', 'B', 'C', 'D', 'E'], ci = getCorrectIndex(currentQuestion); questions[currentQuestion].options.forEach((opt, i) => { let cls = ""; if (isL && userAnswers[currentQuestion] !== null) { cls = "disabled-label" + (i === ci ? " correct-answer" : (userAnswers[currentQuestion] === i ? " wrong-answer" : "")); } else if (userAnswers[currentQuestion] === i) { cls = "selected" + (isL ? " disabled-label" : ""); } else if (isL) { cls = "disabled-label"; } ol.innerHTML += `<li><label class="${cls}"><input type="radio" name="option" value="${i}" ${userAnswers[currentQuestion] === i ? "checked" : ""} ${isL ? "disabled" : ""} onclick="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${escapeHTML(opt)}</span></label></li>`; }); let kh = $('keyboard-hints'); if (kh) kh.style.display = 'none'; let skh = $('sidebar-keyboard-hints'); if (skh) skh.style.display = 'none'; $('btn-prev').disabled = currentQuestion === s.start; $('btn-clear').disabled = userAnswers[currentQuestion] === null || isL; let nb = $('btn-next'); nb.classList.remove('highlight-submit'); if (s.submitted) { nb.innerHTML = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>NEXT QUESTION</span>`; nb.disabled = currentQuestion === s.end - 1; nb.onclick = nextQuestion; } else { if (currentQuestion === s.end - 1) { nb.innerHTML = `<span>SUBMIT SECTION →</span>`; nb.classList.add('highlight-submit'); } else { nb.innerHTML = `<span>SAVE & NEXT →</span>`; } nb.onclick = nextQuestion; } updatePalette(); saveSessionToLocalStorage(); };

window.saveAnswer = i => { 
  if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return; 
  userAnswers[currentQuestion] = i; 
  $('btn-clear').disabled = false; 

  if (!sectionToppersFetched[currentYearIndex]) {
    sectionToppersFetched[currentYearIndex] = true;
    fetchAndRenderSidebarToppers();
  }

  loadQuestion(); 
};

window.clearResponse = () => { if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return; userAnswers[currentQuestion] = null; loadQuestion(); };
window.nextQuestion = () => { if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true; if (currentQuestion < sections[currentYearIndex].end - 1) { currentQuestion++; loadQuestion(); } else if (!sections[currentYearIndex].submitted) showSubmitModal(); };
window.prevQuestion = () => { if (currentQuestion > sections[currentYearIndex].start) currentQuestion--; loadQuestion(); };
window.jumpToQuestion = i => { currentQuestion = i; loadQuestion(); };

window.filterPalette = type => { 
  currentFilter = type; 
  document.querySelectorAll('.palette-filter-bar .filter-pill-btn').forEach(btn => btn.classList.remove('active')); 
  const activeBtn = $('filter-' + type); 
  if (activeBtn) activeBtn.classList.add('active'); 
  updatePalette(); 
};

function animateCount(el, target) { let current = parseInt(el.innerText) || 0; if (current === target) return; let start = current, duration = 300, startTime = null; function step(timestamp) { if (!startTime) startTime = timestamp; let progress = timestamp - startTime, val = start + (target - start) * Math.min(progress / duration, 1); el.innerText = Math.round(val); if (progress < duration) requestAnimationFrame(step); else el.innerText = target; } requestAnimationFrame(step); }

function updatePalette() { let s = sections[currentYearIndex], g = $('palette-grid'); if (!g) return; g.innerHTML = ''; let rc = 0, wc = 0, sc = 0, allAnswered = true; for (let i = s.start; i < s.end; i++) { if (userAnswers[i] === null) allAnswered = false; if (userAnswers[i] !== null && (lockedAnswers[i] || s.submitted)) { if (isAnswerCorrect(i)) { rc++; sc += getCorrectMarks(); } else { wc++; sc -= getIncorrectMarks(); } } let cls = visitedQuestions[i] ? (userAnswers[i] !== null ? 'answered' : 'not-answered') : 'unvisited'; let iw = (lockedAnswers[i] || s.submitted) && userAnswers[i] !== null && !isAnswerCorrect(i); let dsp = iw ? 'wrong' : cls, flt = false; if (currentFilter !== 'all') { if (currentFilter === 'answered' && cls !== 'answered' && dsp !== 'wrong') flt = true; else if (currentFilter === 'not-answered' && cls !== 'not-answered') flt = true; else if (currentFilter === 'unvisited' && cls !== 'unvisited') flt = true; } let statusText = (s.submitted || lockedAnswers[i]) ? (isAnswerCorrect(i) ? "correct" : (userAnswers[i] !== null ? "incorrect" : "unanswered")) : (userAnswers[i] !== null ? "answered" : (visitedQuestions[i] ? "unanswered" : "unvisited")); let qNum = (i - s.start) + 1; g.innerHTML += `<button type="button" class="palette-btn dsp-${dsp}${i === currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" aria-label="Question ${qNum}, ${statusText}" onclick="jumpToQuestion(${i})">${qNum}${iw ? `<span style="position:absolute;top:-3px;right:-3px;background:var(--container-bg);color:var(--color-wrong);border:1px solid var(--color-wrong);border-radius:50%;width:14px;height:14px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:5;">✕</span>` : ''}</button>`; } let mainSubmitBtn = $('main-section-submit-btn'); if (mainSubmitBtn) { if (allAnswered) mainSubmitBtn.classList.add('all-answered'); else mainSubmitBtn.classList.remove('all-answered'); } let statRight = $('stat-right'), statWrong = $('stat-wrong'), statScore = $('stat-score'), targetScore = sc - (securityWarnings * getPenaltyMarks()); if (statRight) animateCount(statRight, rc); if (statWrong) animateCount(statWrong, wc); if (statScore) animateCount(statScore, targetScore); }

window.showSubmitModal = () => { if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true; let u = 0; for (let i = sections[currentYearIndex].start; i < sections[currentYearIndex].end; i++) { if (!visitedQuestions[i]) u++; } if (u > 0) showToastAlert(`${u} Question(s) still pending, please check.`); if ($('submit-modal-text')) $('submit-modal-text').innerText = `Are you sure you want to submit your responses for ${sections[currentYearIndex].year}?`; isTimerPaused = true; $('modal-submit').style.display = 'flex'; };

window.closeSubmitModal = () => { $('modal-submit').style.display = 'none'; isTimerPaused = false; };
window.confirmSubmitExam = () => { $('modal-submit').style.display = 'none'; isTimerPaused = false; if (typeof window.processSectionSubmission === 'function') window.processSectionSubmission(); };

window.processSectionSubmission = async function() { 
  if (!lockedAnswers[currentQuestion] && userAnswers[currentQuestion] !== null) {
    lockedAnswers[currentQuestion] = true; 
  }
  let sec = sections[currentYearIndex]; 
  sec.submitted = true; 
  for (let i = sec.start; i < sec.end; i++) {
    lockedAnswers[i] = true; 
  }
  
  document.body.classList.remove('exam-in-progress'); 
  document.getElementById('quiz-screen').style.display = 'none'; 
  if (document.getElementById('unified-nav')) document.getElementById('unified-nav').style.display = 'none'; 
  
  const resultScreen = document.getElementById('result-screen');
  const loaderBox = document.getElementById('processing-loader-box');
  const scorecardFrame = document.getElementById('capture-scorecard-frame');
  const summaryCard = document.getElementById('cumulative-matrix-container');

  resultScreen.style.display = 'block'; 
  loaderBox.style.display = 'flex';
  scorecardFrame.style.display = 'none';
  if (summaryCard) summaryCard.style.display = 'none';

  document.getElementById('lbl-user-greeting').innerText = studentNameVal || "AGYAT";
  document.getElementById('lbl-section-title').innerText = `${sec.year} Completed,`;

  let nextSecName = (currentYearIndex + 1 < sections.length) ? (sections[currentYearIndex + 1].year || `Part ${currentYearIndex + 2}`) : "";
  document.getElementById('lbl-keep-going-msg').innerText = nextSecName ? "Keep going." : "All sections complete!";

  const formattedTimestamp = getFormattedTimestamp(); 

  let secCorrect = 0, secIncorrect = 0, secUnattempted = 0, secMarks = 0;
  let totalQuestions = sec.end - sec.start;
  let totalSectionMarks = totalQuestions * getCorrectMarks();

  for (let i = sec.start; i < sec.end; i++) {
    if (userAnswers[i] !== null) {
      if (isAnswerCorrect(i)) {
        secCorrect++;
        secMarks += getCorrectMarks();
      } else {
        secIncorrect++;
        secMarks -= getIncorrectMarks();
      }
    } else {
      secUnattempted++;
    }
  }

  secMarks = Math.max(0, secMarks - (securityWarnings * getPenaltyMarks()));
  let timeMins = Math.floor(sec.timeSpent / 60);
  let timeSecs = sec.timeSpent % 60;
  let formattedTime = `${timeMins < 10 ? '0' : ''}${timeMins}:${timeSecs < 10 ? '0' : ''}${timeSecs}`;

  document.getElementById('lbl-score-obtained').innerText = secMarks; 
  document.getElementById('lbl-score-total').innerText = totalSectionMarks; 
  document.getElementById('lbl-stat-correct-val').innerText = secCorrect; 
  document.getElementById('lbl-stat-incorrect-val').innerText = secIncorrect; 
  document.getElementById('lbl-stat-unattempted-val').innerText = secUnattempted; 
  document.getElementById('lbl-stat-time-val').innerText = formattedTime;

  let tg = document.getElementById('table-body-matrix-target'); 
  if (tg) {
    tg.innerHTML = '';
    let cM = 0, cT = 0, aS = 0, rC = 0, rI = 0, rL = 0;
    sections.forEach(s => {
      let sC = 0, sI = 0, sL = 0, sS = 0, sT = s.end - s.start, sM = sT * getCorrectMarks();
      cM += sM;
      cT += s.timeSpent;
      for (let i = s.start; i < s.end; i++) {
        if (userAnswers[i] !== null) {
          if (isAnswerCorrect(i)) { sC++; sS += getCorrectMarks(); }
          else { sI++; sS -= getIncorrectMarks(); }
        } else { sL++; }
      }
      aS += sS; rC += sC; rI += sI; rL += sL;
      let pR = sM > 0 && sS > 0 ? Math.round((sS / sM) * 100) : 0;
      if (!s.submitted) pR = 0;
      
      tg.innerHTML += `
        <tr>
          <td class="td-section">
            <div class="td-section-wrapper">
              <div class="section-blue-line"></div>
              <div class="section-text-group">
                <span class="sec-title-main">${escapeHTML(s.year)}</span>
                <span class="sec-subtitle">${sT} Ques.</span>
              </div>
            </div>
          </td>
          <td class="td-val-badge">
            <span class="badge-pct-pill green">${s.submitted ? pR : 0}%</span>
          </td>
          <td class="td-val-correct">${s.submitted ? sC : '-'}</td>
          <td class="td-val-incorrect">${s.submitted ? sI : '-'}</td>
          <td class="td-val-unattempted">${s.submitted ? sL : sT}</td>
        </tr>
      `;
    });
    aS = Math.max(0, aS - (securityWarnings * getPenaltyMarks()));
    let fP = cM > 0 ? Math.round((aS / cM) * 100) : 0;
    tg.innerHTML += `
      <tr class="total-sum-row">
        <td class="td-section">
          <div class="td-section-wrapper">
            <div class="sigma-icon-box">Σ</div>
            <div class="section-text-group">
              <span class="sec-title-main">Cumulative Total</span>
            </div>
          </div>
        </td>
        <td class="td-val-badge">
          <span class="badge-pct-pill blue">${fP}%</span>
        </td>
        <td class="td-val-correct">${rC}</td>
        <td class="td-val-incorrect">${rI}</td>
        <td class="td-val-unattempted">${rL}</td>
      </tr>
    `;
  }

  globalFormPayload = { 
    timestamp: formattedTimestamp, 
    studentName: studentNameVal || "AGYAT", 
    studentClass: studentClassVal, 
    studentSection: studentSectionVal, 
    schoolName: schoolNameVal, 
    testName: getTestName(), 
    currentSection: `${sec.year} - ${sec.title}`, 
    obtainedScore: secMarks, 
    correctAnswers: secCorrect, 
    incorrectAnswers: secIncorrect, 
    unattemptQuestions: secUnattempted, 
    accuracy: totalQuestions > 0 ? ((secCorrect / totalQuestions) * 100).toFixed(2) + "%" : "0.00%", 
    avgTimePerQuestion: totalQuestions > 0 ? (sec.timeSpent / totalQuestions).toFixed(1) + "s" : "0s", 
    proctoringWarnings: securityWarnings, 
    activeTimeTaken: formattedTime 
  };

  const saveUrl = getSaveRecordOfCBT();
  if (saveUrl && globalFormPayload) {
    const params = new URLSearchParams();
    for (const key in globalFormPayload) {
      params.append(key, globalFormPayload[key]);
    }
    try {
      await fetch(saveUrl, { method: "POST", body: params }).then(r => r.json()).catch(() => null);
      showToastAlert("Record saved to Google Sheets successfully!");
    } catch (err) {
      console.warn("Apps Script Save Sync Note:", err);
    }
  }

  loaderBox.style.display = 'none';
  scorecardFrame.style.display = 'flex';

  let b = document.getElementById('btn-dashboard-main-trigger'); 
  if (b) { 
    b.disabled = false; 
    b.style.opacity = '1'; 
    if (currentYearIndex < sections.length - 1) {
      let nextLabel = sections[currentYearIndex + 1].year || `PART B`;
      b.innerHTML = `CONTINUE TO ${nextLabel.toUpperCase()} →`;
    } else {
      b.innerHTML = `COMPLETE EVALUATION`;
    }
  } 
};

function showFinalCumulativeEvaluation() {
  const scorecardFrame = document.getElementById('capture-scorecard-frame');
  const summaryCard = document.getElementById('cumulative-matrix-container');

  if (scorecardFrame) scorecardFrame.style.display = 'none';
  if (summaryCard) {
    summaryCard.style.display = 'block';
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function executeProgressionAdvance() { 
  if (currentYearIndex + 1 < sections.length) { 
    currentYearIndex++; 
    currentQuestion = sections[currentYearIndex].start; 
    document.getElementById('result-screen').style.display = 'none'; 
    document.getElementById('quiz-screen').style.display = 'block'; 
    if (document.getElementById('unified-nav')) document.getElementById('unified-nav').style.display = 'flex'; 
    buildYearNav(); 
    updateTimerDisplay(); 
    loadQuestion(); 
    saveSessionToLocalStorage(); 
  } else { 
    showFinalCumulativeEvaluation();
  } 
}

function initParticleCanvas(cid, canid, pct, cdist) { let c = $(cid), can = $(canid); if (!c || !can) return; let ctx = can.getContext('2d'), w, h, pa = []; let res = () => { w = c.offsetWidth; h = c.offsetHeight; can.width = w; can.height = h; }; new ResizeObserver(res).observe(c); res(); class P { constructor() { this.x = Math.random() * w; this.y = Math.random() * h; this.vx = (Math.random() - .5) * .8; this.vy = (Math.random() - .5) * .8; this.r = 1.5; } update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > w) this.vx *= -1; if (this.y < 0 || this.y > h) this.vy *= -1; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-particle-color').trim() || 'rgba(21,104,69,0.4)'; ctx.fill(); } } for (let i = 0; i < pct; i++) pa.push(new P()); let anim = () => { ctx.clearRect(0, 0, w, h); for (let i = 0; i < pa.length; i++) { pa[i].update(); pa[i].draw(); for (let j = i + 1; j < pa.length; j++) { let d = Math.hypot(pa[i].x - pa[j].x, pa[i].y - pa[j].y); if (d < cdist) { ctx.beginPath(); ctx.moveTo(pa[i].x, pa[i].y); ctx.lineTo(pa[j].x, pa[j].y); ctx.strokeStyle = document.body.classList.contains('dark-mode') ? `rgba(74,222,128,${.25 - (d / cdist) * .25})` : `rgba(21,104,69,${.25 - (d / cdist) * .25})`; ctx.lineWidth = 1; ctx.stroke(); } } } requestAnimationFrame(anim); }; anim(); }

document.addEventListener("DOMContentLoaded", () => { const eyes = document.querySelectorAll('.desktop-eyes .eye-ball'), pupils = document.querySelectorAll('.desktop-eyes .pupil'); document.addEventListener('mousemove', e => { eyes.forEach((eye, index) => { const pupil = pupils[index]; if (!pupil) return; const rect = eye.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2; const dx = e.clientX - cx, dy = e.clientY - cy, angle = Math.atan2(dy, dx); const maxRadius = (rect.width / 2) - (pupil.offsetWidth / 2) - 1.5, distance = Math.min(Math.hypot(dx, dy) / 10, maxRadius); pupil.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`; }); }); const scheduleBlink = () => { setTimeout(() => { eyes.forEach(eye => { eye.style.transform = 'scaleY(0.06)'; setTimeout(() => { eye.style.transform = 'scaleY(1)'; }, 110); }); scheduleBlink(); }, 3000 + Math.random() * 4000); }; scheduleBlink(); });