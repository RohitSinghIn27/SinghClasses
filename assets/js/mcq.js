/* =========================================================================
   CBT Engine - Configuration Getters (Reads directly from window.CBT_CONFIG)
   ========================================================================= */
const $ = id => document.getElementById(id);

const isProctoringEnabled    = () => window.CBT_CONFIG?.ENABLE_PROCTORING ?? true;
const getCorrectMarks        = () => Number(window.CBT_CONFIG?.MARKS_CORRECT ?? 5);
const getIncorrectMarks      = () => Number(window.CBT_CONFIG?.MARKS_INCORRECT ?? 1);
const getPenaltyMarks        = () => Number(window.CBT_CONFIG?.PENALTY_WARNING ?? 2);
const getTestName            = () => window.CBT_CONFIG?.TEST_NAME ?? "Online Test";
const getFetchQuestionsOfCBT = () => window.CBT_CONFIG?.FetchQuestionsOfCBT ?? window.CBT_CONFIG?.SHEET_API_URL ?? "";
const getSaveRecordOfCBT     = () => window.CBT_CONFIG?.SaveRecordOfCBT ?? window.CBT_CONFIG?.FORM_SAVE_URL ?? "";
const getFetchRecordOfCBT    = () => window.CBT_CONFIG?.FetchRecordOfCBT ?? window.CBT_CONFIG?.TOPPER_API_URL ?? "";
const getHomeUrl             = () => window.CBT_CONFIG?.HOME_URL ?? "https://www.singhclasses.in/";
const getYoutubeUrl          = () => window.CBT_CONFIG?.YOUTUBE_URL ?? "https://www.youtube.com/@SinghClasses";
const getNotesUrl            = () => window.CBT_CONFIG?.NOTES_URL ?? "#";

const ICON_ALERT = `<svg class="sc-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

/* Dedicated CBT State Management Object */
window.CBTState = {
  listExamPapers: [],
  isQuestionsLoading: false,
  questions: [],
  sections: [],
  currentYearIndex: 0,
  currentQuestion: 0,
  studentNameVal: "",
  studentClassVal: "12",
  studentSectionVal: "A",
  schoolNameVal: "",
  studentName: "",
  userAnswers: [],
  visitedQuestions: [],
  lockedAnswers: [],
  sectionTimes: [],
  timerInterval: null,
  isTimerPaused: true,
  securityWarnings: 0,
  isExamActive: false,
  currentFilter: 'all',
  globalFormPayload: null,
  activeResourceUrl: "",
  blurDwellTimer: null,
  lastWT: 0,
  lastSpacePressTime: 0,
  sectionToppersFetched: [],
  pendingRestoreData: null
};

function getFormattedTimestamp() {
  const now = new Date();
  const pad = n => (n < 10 ? '0' + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/* Single-Record Scoped LocalStorage Key based on dynamic TEST_NAME */
function getSingleSessionKey() {
  return `cbt_active_attempt_${getTestName().replace(/\s+/g, '_')}`;
}

function getSavedSession() {
  try {
    const raw = localStorage.getItem(getSingleSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.questions && data.questions.length > 0 && data.studentNameVal) {
      return data;
    }
  } catch (e) {
    console.warn("Storage check note:", e);
  }
  return null;
}

function saveSessionToLocalStorage() { 
  if (!CBTState.isExamActive || !CBTState.studentNameVal) return; 
  try { 
    const payload = { 
      currentYearIndex: CBTState.currentYearIndex, 
      currentQuestion: CBTState.currentQuestion, 
      userAnswers: CBTState.userAnswers, 
      visitedQuestions: CBTState.visitedQuestions, 
      lockedAnswers: CBTState.lockedAnswers, 
      sectionTimes: CBTState.sectionTimes, 
      securityWarnings: CBTState.securityWarnings, 
      questions: CBTState.questions, 
      sections: CBTState.sections, 
      studentNameVal: CBTState.studentNameVal, 
      studentClassVal: CBTState.studentClassVal, 
      studentSectionVal: CBTState.studentSectionVal, 
      schoolNameVal: CBTState.schoolNameVal, 
      studentName: CBTState.studentName, 
      sectionToppersFetched: CBTState.sectionToppersFetched 
    }; 
    localStorage.setItem(getSingleSessionKey(), JSON.stringify(payload)); 
  } catch (e) { 
    console.warn("Failed to save session to localStorage:", e); 
  } 
}

function clearSessionLocalStorage() { 
  try { 
    localStorage.removeItem(getSingleSessionKey()); 
  } catch (e) { 
    console.warn("Failed to clear localStorage:", e); 
  } 
}

function restoreSession(data) {
  Object.assign(CBTState, {
    currentYearIndex: data.currentYearIndex || 0,
    currentQuestion: data.currentQuestion || 0,
    userAnswers: data.userAnswers || [],
    visitedQuestions: data.visitedQuestions || [],
    lockedAnswers: data.lockedAnswers || [],
    sectionTimes: data.sectionTimes || [],
    securityWarnings: data.securityWarnings || 0,
    questions: data.questions || [],
    sections: data.sections || [],
    studentNameVal: data.studentNameVal || "",
    studentClassVal: data.studentClassVal || "12",
    studentSectionVal: data.studentSectionVal || "A",
    schoolNameVal: data.schoolNameVal || "SPS",
    studentName: data.studentName || "",
    sectionToppersFetched: data.sectionToppersFetched || [],
    isExamActive: true,
    isTimerPaused: false
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

  buildYearNav();
  updateTimerDisplay();
  startTimer();
  loadQuestion();
  showToastAlert("Previous exam attempt restored successfully!");
}

window.confirmResumeSession = function() {
  if (CBTState.pendingRestoreData) {
    restoreSession(CBTState.pendingRestoreData);
    CBTState.pendingRestoreData = null;
  }
};

window.dismissResumeSession = function() {
  clearSessionLocalStorage();
  CBTState.pendingRestoreData = null;
  if ($('modal-resume')) $('modal-resume').style.display = 'none';
  if ($('modal-welcome')) $('modal-welcome').style.display = 'flex';
};

function preloadQuestionImages() { 
  CBTState.listExamPapers.forEach(paper => { 
    (paper.questions || []).forEach(q => { 
      if (q.image) { 
        const img = new Image(); 
        img.src = q.image; 
      } 
    }); 
  }); 
}

function escapeHTML(str) { return str == null ? "" : str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>"); }
function getVerbatim(obj, keys, fallback = "") { for (let k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; } return fallback; }

function resolveCorrectText(rawValue, optionsArray) { 
  if (rawValue == null || rawValue === "") return optionsArray[0] || ""; 
  let v = rawValue.toString().trim(); 
  let textMatch = optionsArray.find(opt => opt !== null && opt !== undefined && opt.toString().trim().toLowerCase() === v.toLowerCase()); 
  if (textMatch !== undefined) return textMatch.toString(); 
  let letter = v.toLowerCase(); 
  if (['a', 'b', 'c', 'd', 'e'].includes(letter)) { 
    let idx = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[letter]; 
    if (idx < optionsArray.length) return optionsArray[idx].toString(); 
  } 
  const n = parseInt(v); 
  return (!isNaN(n) && n >= 0 && n < optionsArray.length) ? optionsArray[n].toString() : (optionsArray[0] ? optionsArray[0].toString() : ""); 
}

function textToIndex(correctText, optionsArray) { 
  let idx = optionsArray.findIndex(opt => opt !== null && opt !== undefined && opt.toString().trim().toLowerCase() === correctText.toLowerCase()); 
  return idx !== -1 ? idx : 0; 
}

async function loadQuestionsFromSheet(retries = 3) {
  if (CBTState.isQuestionsLoading || CBTState.listExamPapers.length > 0) return;
  CBTState.isQuestionsLoading = true;

  let baseUrl = getFetchQuestionsOfCBT();
  if (!baseUrl) {
    CBTState.isQuestionsLoading = false;
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(baseUrl, { method: "GET", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty response.");
      
      if (raw[0] && Array.isArray(raw[0].questions)) {
        CBTState.listExamPapers = raw.map(paper => ({
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
        CBTState.listExamPapers = Object.values(sectionsMap);
      }
      
      if (CBTState.listExamPapers.length > 0 && !CBTState.listExamPapers.every(p => p.questions.length === 0)) {
        preloadQuestionImages();
        CBTState.isQuestionsLoading = false;
        return;
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} to fetch questions failed:`, err);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, 800));
      }
    } 
  }
  CBTState.isQuestionsLoading = false;
}

async function fetchAndRenderSidebarToppers() {
  const fetchRecordUrl = getFetchRecordOfCBT(), container = $('sidebar-toppers');
  if (!fetchRecordUrl) return;
  if (container) container.classList.add('fetching-pulse');
  try {
    const testName = getTestName();
    const sec = CBTState.sections[CBTState.currentYearIndex];
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
  if (CBTState.currentYearIndex < CBTState.sections.length - 1) {
    executeProgressionAdvance();
  } else {
    showFinalCumulativeEvaluation();
  }
};

function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

function showToastAlert(m) { 
  let t = $('custom-alert-toast'), txt = $('custom-alert-text'); 
  if (t && txt) { 
    txt.innerHTML = `${ICON_ALERT} ${m}`; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 4000); 
  } 
}

function triggerVerifyModal(type) { 
  const modal = $('verify-resource-modal'), icon = $('verify-card-icon'), heading = $('verify-modal-heading'), text = $('verify-modal-text'), actionBtn = $('verify-proceed-action-btn'), driveId = $('current-chapter') ? $('current-chapter').getAttribute('data-drive-id') : ""; 
  if (!modal) return;
  modal.style.display = 'flex'; 
  if (type === 'pdf') { 
    CBTState.activeResourceUrl = getNotesUrl(); 
    if (icon) {
      icon.className = "verify-modal-icon pdf-style"; 
      icon.innerHTML = `<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`; 
    }
    if (heading) heading.innerText = "Open Chapter Revision Notes?"; 
    if (text) text.innerText = "You are going to view the chapter lecture notes inside a new tab."; 
    if (actionBtn) {
      actionBtn.className = "v-btn v-btn-pdf"; 
      actionBtn.innerText = "Open Notes"; 
    }
  } else if (type === 'yt') { 
    CBTState.activeResourceUrl = getYoutubeUrl(); 
    if (icon) {
      icon.className = "verify-modal-icon yt-style"; 
      icon.innerHTML = `<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`; 
    }
    if (heading) heading.innerText = "Watch the Video Lesson?"; 
    if (text) text.innerText = "Choose to continue onward if you are ready to launch the educational lecture video."; 
    if (actionBtn) {
      actionBtn.className = "v-btn v-btn-yt"; 
      actionBtn.innerText = "Watch Video"; 
    }
  } 
  if (actionBtn) {
    actionBtn.onclick = () => { 
      window.open(CBTState.activeResourceUrl, '_blank'); 
      closeVerifyModal(); 
    }; 
  }
}

function closeVerifyModal() { 
  if ($('verify-resource-modal')) $('verify-resource-modal').style.display = 'none'; 
}

function toggleFullScreen() { 
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(err => console.error(err.message)); 
}

function goToHome() { 
  window.location.href = getHomeUrl(); 
}

function openNotesTab() {
  window.open(getNotesUrl(), '_blank');
}

window.closeSecurityModal = () => { 
  if ($('modal-security')) $('modal-security').style.display = 'none'; 
  const widget = document.querySelector('.sc-widget-container');
  if (widget) widget.classList.remove('sc-blur-active'); 
  CBTState.isTimerPaused = false; 
};

window.addEventListener('scroll', () => { 
  let bar = $("scProgressBar"), st = document.documentElement.scrollTop || document.body.scrollTop, sh = document.documentElement.scrollHeight - document.documentElement.clientHeight; 
  if (bar) bar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + "%"; 
});

document.addEventListener("DOMContentLoaded", () => { 
  const ym = $('yearMenuToggle'), yc = $('year-nav-container'); 
  if (ym && yc) { 
    ym.addEventListener('click', e => { 
      e.stopPropagation(); 
      yc.classList.toggle('show-year-menu'); 
      ym.innerHTML = yc.classList.contains('show-year-menu') ? '✕' : '☰'; 
    }); 
  } 
});

window.goToGuidelinesStep = () => { 
  CBTState.studentNameVal = ($('student-name-input') ? $('student-name-input').value.trim() : "").toUpperCase() || "AGYAT"; 
  CBTState.studentClassVal = $('student-class-input') ? $('student-class-input').value : "12"; 
  CBTState.studentSectionVal = $('student-section-input') ? $('student-section-input').value : "A"; 
  CBTState.schoolNameVal = ($('student-school-input') ? $('student-school-input').value.trim() : "").toUpperCase() || "SPS"; 
  CBTState.studentName = `${CBTState.studentNameVal} | CLASS: ${CBTState.studentClassVal} | SEC: ${CBTState.studentSectionVal} | ${CBTState.schoolNameVal}`; 
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'none'; 
  if ($('welcome-step-2')) $('welcome-step-2').style.display = 'block'; 
};

window.goToLoginStep = () => { 
  if ($('welcome-step-2')) $('welcome-step-2').style.display = 'none'; 
  if ($('welcome-step-1')) $('welcome-step-1').style.display = 'block'; 
};

/* Unified Window Load Handler (Populates Dynamic Text & Preloads Data) */
window.onload = async () => { 
  const activeTestName = getTestName(); 
  const chapterCapsule = $('current-chapter'); 
  if (chapterCapsule) chapterCapsule.innerText = activeTestName; 
  
  document.querySelectorAll('.topic-text').forEach(node => {
    node.innerText = activeTestName;
  });

  const correctLbl = $('welcome-correct-lbl');
  if (correctLbl) correctLbl.innerText = `+${getCorrectMarks()} Correct`; 
  
  const incorrectLbl = $('welcome-incorrect-lbl');
  if (incorrectLbl) incorrectLbl.innerText = `-${getIncorrectMarks()} Incorrect`; 

  /* Check Single-Session Data (Custom Resume Card Modal) */
  const savedData = getSavedSession();
  if (savedData) {
    CBTState.pendingRestoreData = savedData;
    const subtext = $('resume-modal-subtext');
    if (subtext) subtext.innerText = `A previous attempt for "${savedData.studentNameVal}" was found. Would you like to resume your session?`;
    if ($('modal-resume')) $('modal-resume').style.display = 'flex';
  } else {
    if ($('modal-welcome')) $('modal-welcome').style.display = 'flex';
  }
  
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
    contentEl.addEventListener('touchend', e => { 
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; 
      if (Math.abs(dx) > Math.abs(dy) + 30) { 
        if (dx < -40) nextQuestion(); 
        if (dx > 40) prevQuestion(); 
      } 
    }, { passive: true }); 
  } 
  initParticleCanvas('quiz-screen', 'canvasCBT', 12, 90); 
  initParticleCanvas('quiz-screen', 'canvasPalette', 6, 70); 
};

/* Begin Exam Flow */
window.beginExam = async () => { 
  const rawNameInput = $('student-name-input') ? $('student-name-input').value.trim() : ""; 
  CBTState.studentNameVal = rawNameInput.toUpperCase() || "AGYAT"; 
  CBTState.studentClassVal = $('student-class-input') ? $('student-class-input').value : "12"; 
  CBTState.studentSectionVal = $('student-section-input') ? $('student-section-input').value : "A"; 
  CBTState.schoolNameVal = ($('student-school-input') ? $('student-school-input').value.trim() : "").toUpperCase() || "SPS"; 
  CBTState.studentName = `${CBTState.studentNameVal} | CLASS: ${CBTState.studentClassVal} | SEC: ${CBTState.studentSectionVal} | ${CBTState.schoolNameVal}`; 
  
  if ($('modal-welcome')) $('modal-welcome').style.display = 'none'; 
  const loadingOverlay = $('quiz-loading-overlay'); 
  if (loadingOverlay) loadingOverlay.style.display = 'flex'; 
  document.body.classList.add('exam-in-progress'); 
  CBTState.isExamActive = true; 

  if (CBTState.isQuestionsLoading) { 
    let checks = 0; 
    while (CBTState.isQuestionsLoading && checks < 300) { 
      await new Promise(r => setTimeout(r, 100)); 
      checks++; 
    } 
  } 

  if (CBTState.listExamPapers.length === 0) {
    await loadQuestionsFromSheet(3);
  }

  if (loadingOverlay) loadingOverlay.style.display = 'none'; 

  if (CBTState.listExamPapers.length === 0) { 
    showToastAlert("Unable to sync questions. Retrying connection..."); 
    await new Promise(r => setTimeout(r, 1000));
    await loadQuestionsFromSheet(3);
    if (CBTState.listExamPapers.length === 0) {
      document.body.classList.remove('exam-in-progress');
      CBTState.isExamActive = false;
      if ($('modal-welcome')) $('modal-welcome').style.display = 'flex';
      alert("Network request timed out. Please check your internet connection and try starting again.");
      return;
    }
  } 

  CBTState.questions = []; 
  CBTState.sections = []; 
  let qt = 0; 
  CBTState.listExamPapers.forEach((p, idx) => { 
    let st = qt, sq = p.questions.map(q => { 
      let shuffledOptions = [...q.options]; 
      shuffleArray(shuffledOptions); 
      return { question: q.text, tag: q.tag ?? "", options: shuffledOptions, image: q.image ?? "", correctAnswerText: q.correctAnswerText }; 
    }); 
    shuffleArray(sq); 
    sq.forEach(q => { 
      CBTState.questions.push(q); 
      qt++; 
    }); 
    CBTState.sections.push({ index: idx, title: p.title, year: p.year, start: st, end: qt, submitted: false, timeSpent: 0 }); 
  }); 

  clearSessionLocalStorage(); 
  CBTState.userAnswers = new Array(CBTState.questions.length).fill(null); 
  CBTState.visitedQuestions = new Array(CBTState.questions.length).fill(false); 
  CBTState.lockedAnswers = new Array(CBTState.questions.length).fill(false); 
  CBTState.sectionTimes = CBTState.sections.map(s => (s.end - s.start) * 60); 
  CBTState.currentYearIndex = 0; 
  CBTState.currentQuestion = CBTState.sections[0].start; 

  /* Exam Active & Timer Running */
  CBTState.isTimerPaused = false; 
  if ($('quiz-screen')) $('quiz-screen').style.display = 'block'; 
  if ($('unified-nav')) $('unified-nav').style.display = 'flex'; 
  buildYearNav(); 
  updateTimerDisplay(); 
  startTimer(); 
  loadQuestion(); 
  saveSessionToLocalStorage(); 
};

/* Proctoring Listeners */
['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => {
  document.addEventListener(ev, e => {
    if (isProctoringEnabled() && CBTState.isExamActive) e.preventDefault();
  });
});

document.addEventListener('keydown', e => {
  if (!CBTState.isExamActive || !isProctoringEnabled() || CBTState.isTimerPaused) return;

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
  if (!CBTState.isExamActive || !isProctoringEnabled()) return;
  if (e.key === 'PrintScreen' || e.keyCode === 44) { 
    try { navigator.clipboard.writeText(''); } catch (err) {} 
    if (!CBTState.isTimerPaused) applySecurityPenalty(); 
  } 
});

document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || (CBTState.sections[CBTState.currentYearIndex] && CBTState.sections[CBTState.currentYearIndex].submitted)) return; 
  if (e.code === 'Space') { 
    e.preventDefault(); 
    const currentTime = Date.now(), timeDifference = currentTime - CBTState.lastSpacePressTime; 
    if (timeDifference > 0 && timeDifference < 400) { 
      CBTState.isTimerPaused = !CBTState.isTimerPaused; 
      CBTState.lastSpacePressTime = 0; 
    } else { 
      CBTState.lastSpacePressTime = currentTime; 
    } 
  } 
});

document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || !isProctoringEnabled()) return;
  let k = e.key.toLowerCase(), ic = e.ctrlKey || e.metaKey, is = e.shiftKey; 
  if (e.key === 'F12' || e.keyCode === 123 || (ic && is && ['i', 'j', 'c'].includes(k)) || (ic && ['u', 'p', 's', 'r'].includes(k)) || e.key === 'F5') { 
    e.preventDefault(); 
    if (!CBTState.isTimerPaused) applySecurityPenalty(); 
    return false; 
  } 
});

document.addEventListener('keydown', e => { 
  if (!CBTState.isExamActive || CBTState.isTimerPaused) return; 
  let s = CBTState.sections[CBTState.currentYearIndex], k = e.key.toLowerCase(), isl = CBTState.lockedAnswers[CBTState.currentQuestion] || s.submitted; 
  if (!isl) { 
    if (['1', '2', '3', '4'].includes(k)) { 
      e.preventDefault(); 
      saveAnswer(parseInt(k) - 1); 
    } else if (['a', 'b', 'c', 'd', 'e'].includes(k)) { 
      e.preventDefault(); 
      saveAnswer({ 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[k]); 
    } else if (k === 'backspace' || k === 'delete') { 
      e.preventDefault(); 
      clearResponse(); 
    } 
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
    const widget = document.querySelector('.sc-widget-container');
    if (widget) widget.classList.add('sc-blur-active');
    applySecurityPenalty();
  }
}

document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') handleBlurOrHide(); });
window.addEventListener("blur", handleBlurOrHide);

window.addEventListener("beforeunload", e => { 
  if (CBTState.isExamActive && CBTState.sections[CBTState.currentYearIndex] && !CBTState.sections[CBTState.currentYearIndex].submitted) { 
    let s = CBTState.sections[CBTState.currentYearIndex], c = 0, ic = 0, l = 0, sc = 0, tot = s.end - s.start; 
    for (let i = s.start; i < s.end; i++) { 
      if (CBTState.userAnswers[i] !== null) { 
        if (isAnswerCorrect(i)) { c++; sc += getCorrectMarks(); } 
        else { ic++; sc -= getIncorrectMarks(); } 
      } else l++; 
    } 
    sc = Math.max(0, sc - (CBTState.securityWarnings * getPenaltyMarks())); 
    let accStr = tot > 0 ? ((c / tot) * 100).toFixed(2) + "%" : "0.00%", tm = Math.floor(s.timeSpent / 60), ts = s.timeSpent % 60, avgTimeSec = (tot > 0 ? (s.timeSpent / tot).toFixed(1) : 0) + "s"; 
    const formattedTimestamp = getFormattedTimestamp(); 
    let p = new URLSearchParams(); 
    p.append("timestamp", formattedTimestamp); 
    p.append("studentName", (CBTState.studentNameVal || "AGYAT") + " (Reload Dropout)"); 
    p.append("studentClass", CBTState.studentClassVal); 
    p.append("studentSection", CBTState.studentSectionVal); 
    p.append("schoolName", CBTState.schoolNameVal); 
    p.append("testName", getTestName()); 
    p.append("currentSection", s.year + " - " + s.title); 
    p.append("obtainedScore", sc); 
    p.append("correctAnswers", c); 
    p.append("incorrectAnswers", ic); 
    p.append("unattemptQuestions", l); 
    p.append("accuracy", accStr); 
    p.append("avgTimePerQuestion", avgTimeSec); 
    p.append("proctoringWarnings", CBTState.securityWarnings); 
    p.append("activeTimeTaken", `${tm}m ${ts}s`); 
    navigator.sendBeacon(getSaveRecordOfCBT(), p); 
  } 
});

function applySecurityPenalty() { 
  if (!isProctoringEnabled()) return;
  if (Date.now() - CBTState.lastWT < 1000) return; 
  CBTState.lastWT = Date.now(); 
  CBTState.securityWarnings++; 
  if ($('warning-count-display')) $('warning-count-display').innerText = `Total Warnings: ${CBTState.securityWarnings} (Penalty: -${CBTState.securityWarnings * getPenaltyMarks()} Marks)`; 
  
  const widget = document.querySelector('.sc-widget-container');
  if (widget) widget.classList.add('sc-blur-active'); 
  
  if ($('modal-security')) $('modal-security').style.display = 'flex'; 
  CBTState.isTimerPaused = true; 
  updatePalette(); 
  saveSessionToLocalStorage(); 
}

window.buildYearNav = () => { 
  let c = $('year-nav-container'); 
  if (!c) return; 
  c.innerHTML = ''; 
  if ($('current-paper-label') && CBTState.sections[CBTState.currentYearIndex]) {
    $('current-paper-label').innerHTML = `<span>${CBTState.sections[CBTState.currentYearIndex].year}</span>${CBTState.sections[CBTState.currentYearIndex].title}`; 
  }
  CBTState.sections.forEach((p, idx) => { 
    let t = document.createElement('div'); 
    t.className = `year-tab ${idx === CBTState.currentYearIndex ? 'active' : ''}`; 
    t.innerHTML = `<span style="font-size:.7em;text-transform:uppercase;color:var(--tab-${idx === CBTState.currentYearIndex ? 'active' : 'inactive'}-lbl);font-weight:600;">${p.year}</span><span style="font-size:.95em;font-weight:700;color:var(--tab-${idx === CBTState.currentYearIndex ? 'active' : 'inactive'}-val);">${p.title}</span>`; 
    t.onclick = async () => { 
      if (CBTState.sections[idx].submitted || idx === CBTState.currentYearIndex) { 
        CBTState.currentYearIndex = idx; 
        CBTState.currentQuestion = CBTState.sections[idx].start; 
        if (c && c.classList.contains('show-year-menu')) { 
          c.classList.remove('show-year-menu'); 
          if ($('yearMenuToggle')) $('yearMenuToggle').innerHTML = '☰'; 
        } 
        buildYearNav(); 
        updateTimerDisplay(); 
        loadQuestion(); 
        if (CBTState.sections[idx].submitted && !CBTState.sectionToppersFetched[idx]) { 
          CBTState.sectionToppersFetched[idx] = true; 
          await fetchAndRenderSidebarToppers(); 
        } 
        saveSessionToLocalStorage(); 
      } else { 
        showToastAlert("Submit the current section to unlock this one"); 
      } 
    }; 
    c.appendChild(t); 
  }); 
};

function isAnswerCorrect(qIdx) { 
  if (CBTState.userAnswers[qIdx] === null) return false; 
  let q = CBTState.questions[qIdx]; 
  return (q.options[CBTState.userAnswers[qIdx]] ?? "").toString().trim().toLowerCase() === (q.correctAnswerText ?? "").toString().trim().toLowerCase(); 
}

function getCorrectIndex(qIdx) { return textToIndex(CBTState.questions[qIdx].correctAnswerText, CBTState.questions[qIdx].options); }

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

function updateTimerDisplay() { 
  let t = CBTState.sectionTimes[CBTState.currentYearIndex] || 0, m = Math.floor(t / 60), s = t % 60, timeStr = `${m}:${s < 10 ? '0' : ''}${s}`; 
  let elDesktop = $('time-left'), elMobile = $('time-left-mobile'); 
  if (elDesktop) elDesktop.innerText = timeStr; 
  if (elMobile) elMobile.innerText = timeStr; 
  let bDesktop = $('timer-box'), bMobile = $('timer-box-mobile'), targetClass = 'timer', targetStyleColor = ''; 
  if (CBTState.sections[CBTState.currentYearIndex] && CBTState.sections[CBTState.currentYearIndex].submitted) { 
    if (elDesktop) elDesktop.innerText = "Locked"; 
    if (elMobile) elMobile.innerText = "Locked"; 
  } else { 
    if (t > 0 && t <= 60) targetClass = 'timer danger'; 
    else if (t > 60 && t <= 120) targetClass = 'timer warning'; 
    if (t < 30) targetStyleColor = 'var(--color-warning)'; 
  } 
  [bDesktop, bMobile].forEach(b => { 
    if (b) { 
      b.className = targetClass; 
      b.style.color = (CBTState.sections[CBTState.currentYearIndex] && CBTState.sections[CBTState.currentYearIndex].submitted) ? '' : targetStyleColor; 
    } 
  }); 
}

function startTimer() { 
  if (CBTState.timerInterval) clearInterval(CBTState.timerInterval); 
  CBTState.timerInterval = setInterval(() => { 
    if (CBTState.isTimerPaused || !CBTState.isExamActive || (CBTState.sections[CBTState.currentYearIndex] && CBTState.sections[CBTState.currentYearIndex].submitted)) return; 
    if (CBTState.sectionTimes[CBTState.currentYearIndex] > 0) { 
      CBTState.sectionTimes[CBTState.currentYearIndex]--; 
      CBTState.sections[CBTState.currentYearIndex].timeSpent++; 
    } 
    updateTimerDisplay(); 
    saveSessionToLocalStorage(); 
    if (CBTState.sectionTimes[CBTState.currentYearIndex] <= 0) autoLockAndSubmitSection(); 
  }, 1000); 
}

function autoLockAndSubmitSection() { 
  CBTState.isTimerPaused = true; 
  let m = $('modal-timeout'); 
  if (m) m.style.display = 'flex'; 
  setTimeout(() => { 
    if (m) m.style.display = 'none'; 
    if (typeof window.processSectionSubmission === 'function') window.processSectionSubmission(); 
  }, 2000); 
}

window.loadQuestion = () => { 
  let c = $('question-content'); 
  if (c) { 
    c.classList.remove('fade-in'); 
    void c.offsetWidth; 
    c.classList.add('fade-in'); 
  } 
  CBTState.visitedQuestions[CBTState.currentQuestion] = true; 
  let s = CBTState.sections[CBTState.currentYearIndex], qy = CBTState.currentQuestion - s.start, tot = s.end - s.start, pc = tot > 1 ? (qy / (tot - 1)) * 100 : 100; 
  if (window.innerWidth <= 768 && qy === 0 && c) { 
    c.classList.remove('swipe-hint-animation'); 
    void c.offsetWidth; 
    c.classList.add('swipe-hint-animation'); 
  } 
  if ($('section-header-title')) $('section-header-title').innerText = `${s.year}: ${s.title}`; 
  if ($('exam-progress')) $('exam-progress').style.width = `${pc}%`; 
  if ($('q-number')) $('q-number').innerText = `Question ${qy + 1} of ${tot}`; 
  let baseQuestionText = `<span style="font-weight:800;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>` + escapeHTML(CBTState.questions[CBTState.currentQuestion].question); 
  if (CBTState.questions[CBTState.currentQuestion].image) baseQuestionText += `<div class="question-image-wrap" style="margin:0 0 12px 0;text-align:left;max-width:100%;display:flex;justify-content:flex-start;align-items:center;"><img src="${CBTState.questions[CBTState.currentQuestion].image}" alt="Image for Question ${qy + 1}" style="max-width:100%;max-height:220px;width:auto;height:auto;border-radius:8px;border:1px solid var(--border-color);box-shadow:0 4px 10px rgba(0,0,0,0.05);object-fit:contain;display:block;"></div>`; 
  if ($('q-text')) $('q-text').innerHTML = baseQuestionText; 
  let currentTag = CBTState.questions[CBTState.currentQuestion].tag ?? "", tagEl = $('q-tag'); 
  if (tagEl) { 
    if (currentTag) { 
      tagEl.innerText = currentTag; 
      tagEl.style.display = 'inline-flex'; 
    } else { 
      tagEl.style.display = 'none'; 
    } 
  } 
  let ol = $('q-options'); 
  if (ol) {
    ol.innerHTML = ''; 
    let isL = CBTState.lockedAnswers[CBTState.currentQuestion] || s.submitted, lt = ['A', 'B', 'C', 'D', 'E'], ci = getCorrectIndex(CBTState.currentQuestion); 
    CBTState.questions[CBTState.currentQuestion].options.forEach((opt, i) => { 
      let cls = ""; 
      if (isL && CBTState.userAnswers[CBTState.currentQuestion] !== null) { 
        cls = "disabled-label" + (i === ci ? " correct-answer" : (CBTState.userAnswers[CBTState.currentQuestion] === i ? " wrong-answer" : "")); 
      } else if (CBTState.userAnswers[CBTState.currentQuestion] === i) { 
        cls = "selected" + (isL ? " disabled-label" : ""); 
      } else if (isL) { 
        cls = "disabled-label"; 
      } 
      ol.innerHTML += `<li><label class="${cls}"><input type="radio" name="option" value="${i}" ${CBTState.userAnswers[CBTState.currentQuestion] === i ? "checked" : ""} ${isL ? "disabled" : ""} onclick="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${escapeHTML(opt)}</span></label></li>`; 
    }); 
  }
  if ($('btn-prev')) $('btn-prev').disabled = CBTState.currentQuestion === s.start; 
  if ($('btn-clear')) $('btn-clear').disabled = CBTState.userAnswers[CBTState.currentQuestion] === null || isL; 
  let nb = $('btn-next'); 
  if (nb) {
    nb.classList.remove('highlight-submit'); 
    if (s.submitted) { 
      nb.innerHTML = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>NEXT QUESTION</span>`; 
      nb.disabled = CBTState.currentQuestion === s.end - 1; 
      nb.onclick = nextQuestion; 
    } else { 
      if (CBTState.currentQuestion === s.end - 1) { 
        nb.innerHTML = `<span>SUBMIT SECTION →</span>`; 
        nb.classList.add('highlight-submit'); 
      } else { 
        nb.innerHTML = `<span>SAVE & NEXT →</span>`; 
      } 
      nb.onclick = nextQuestion; 
    } 
  }
  updatePalette(); 
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
  if (CBTState.currentQuestion < CBTState.sections[CBTState.currentYearIndex].end - 1) { 
    CBTState.currentQuestion++; 
    loadQuestion(); 
  } else if (!CBTState.sections[CBTState.currentYearIndex].submitted) {
    showSubmitModal(); 
  }
};

window.prevQuestion = () => { 
  if (CBTState.currentQuestion > CBTState.sections[CBTState.currentYearIndex].start) {
    CBTState.currentQuestion--; 
    loadQuestion(); 
  }
};

window.jumpToQuestion = i => { 
  CBTState.currentQuestion = i; 
  loadQuestion(); 
};

window.filterPalette = type => { 
  CBTState.currentFilter = type; 
  document.querySelectorAll('.palette-filter-bar .filter-pill-btn').forEach(btn => btn.classList.remove('active')); 
  const activeBtn = $('filter-' + type); 
  if (activeBtn) activeBtn.classList.add('active'); 
  updatePalette(); 
};

function animateCount(el, target) { 
  let current = parseInt(el.innerText) || 0; 
  if (current === target) return; 
  let start = current, duration = 300, startTime = null; 
  function step(timestamp) { 
    if (!startTime) startTime = timestamp; 
    let progress = timestamp - startTime, val = start + (target - start) * Math.min(progress / duration, 1); 
    el.innerText = Math.round(val); 
    if (progress < duration) requestAnimationFrame(step); 
    else el.innerText = target; 
  } 
  requestAnimationFrame(step); 
}

function updatePalette() { 
  let s = CBTState.sections[CBTState.currentYearIndex], g = $('palette-grid'); 
  if (!g) return; 
  g.innerHTML = ''; 
  let rc = 0, wc = 0, sc = 0, allAnswered = true; 
  for (let i = s.start; i < s.end; i++) { 
    if (CBTState.userAnswers[i] === null) allAnswered = false; 
    if (CBTState.userAnswers[i] !== null && (CBTState.lockedAnswers[i] || s.submitted)) { 
      if (isAnswerCorrect(i)) { rc++; sc += getCorrectMarks(); } 
      else { wc++; sc -= getIncorrectMarks(); } 
    } 
    let cls = CBTState.visitedQuestions[i] ? (CBTState.userAnswers[i] !== null ? 'answered' : 'not-answered') : 'unvisited'; 
    let iw = (CBTState.lockedAnswers[i] || s.submitted) && CBTState.userAnswers[i] !== null && !isAnswerCorrect(i); 
    let dsp = iw ? 'wrong' : cls, flt = false; 
    if (CBTState.currentFilter !== 'all') { 
      if (CBTState.currentFilter === 'answered' && cls !== 'answered' && dsp !== 'wrong') flt = true; 
      else if (CBTState.currentFilter === 'not-answered' && cls !== 'not-answered') flt = true; 
      else if (CBTState.currentFilter === 'unvisited' && cls !== 'unvisited') flt = true; 
    } 
    let statusText = (s.submitted || CBTState.lockedAnswers[i]) ? (isAnswerCorrect(i) ? "correct" : (CBTState.userAnswers[i] !== null ? "incorrect" : "unanswered")) : (CBTState.userAnswers[i] !== null ? "answered" : (CBTState.visitedQuestions[i] ? "unanswered" : "unvisited")); 
    let qNum = (i - s.start) + 1; 
    g.innerHTML += `<button type="button" class="palette-btn dsp-${dsp}${i === CBTState.currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" aria-label="Question ${qNum}, ${statusText}" onclick="jumpToQuestion(${i})">${qNum}${iw ? `<span style="position:absolute;top:-3px;right:-3px;background:var(--container-bg);color:var(--color-wrong);border:1px solid var(--color-wrong);border-radius:50%;width:14px;height:14px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:5;">✕</span>` : ''}</button>`; 
  } 
  let mainSubmitBtn = $('main-section-submit-btn'); 
  if (mainSubmitBtn) { 
    if (allAnswered) mainSubmitBtn.classList.add('all-answered'); 
    else mainSubmitBtn.classList.remove('all-answered'); 
  } 
  let statRight = $('stat-right'), statWrong = $('stat-wrong'), statScore = $('stat-score'), targetScore = sc - (CBTState.securityWarnings * getPenaltyMarks()); 
  if (statRight) animateCount(statRight, rc); 
  if (statWrong) animateCount(statWrong, wc); 
  if (statScore) animateCount(statScore, targetScore); 
}

window.showSubmitModal = () => { 
  if (CBTState.userAnswers[CBTState.currentQuestion] !== null && !CBTState.sections[CBTState.currentYearIndex].submitted) CBTState.lockedAnswers[CBTState.currentQuestion] = true; 
  let u = 0; 
  for (let i = CBTState.sections[CBTState.currentYearIndex].start; i < CBTState.sections[CBTState.currentYearIndex].end; i++) { 
    if (!CBTState.visitedQuestions[i]) u++; 
  } 
  if (u > 0) showToastAlert(`${u} Question(s) still pending, please check.`); 
  if ($('submit-modal-text')) $('submit-modal-text').innerText = `Are you sure you want to submit your responses for ${CBTState.sections[CBTState.currentYearIndex].year}?`; 
  CBTState.isTimerPaused = true; 
  if ($('modal-submit')) $('modal-submit').style.display = 'flex'; 
};

window.closeSubmitModal = () => { 
  if ($('modal-submit')) $('modal-submit').style.display = 'none'; 
  CBTState.isTimerPaused = false; 
};

window.confirmSubmitExam = () => { 
  if ($('modal-submit')) $('modal-submit').style.display = 'none'; 
  CBTState.isTimerPaused = false; 
  if (typeof window.processSectionSubmission === 'function') window.processSectionSubmission(); 
};

window.processSectionSubmission = async function() { 
  if (!CBTState.lockedAnswers[CBTState.currentQuestion] && CBTState.userAnswers[CBTState.currentQuestion] !== null) {
    CBTState.lockedAnswers[CBTState.currentQuestion] = true; 
  }
  let sec = CBTState.sections[CBTState.currentYearIndex]; 
  sec.submitted = true; 
  for (let i = sec.start; i < sec.end; i++) {
    CBTState.lockedAnswers[i] = true; 
  }
  
  document.body.classList.remove('exam-in-progress'); 
  if ($('quiz-screen')) $('quiz-screen').style.display = 'none'; 
  if ($('unified-nav')) $('unified-nav').style.display = 'none'; 
  
  const resultScreen = $('result-screen');
  const loaderBox = $('processing-loader-box');
  const scorecardFrame = $('capture-scorecard-frame');
  const summaryCard = $('cumulative-matrix-container');

  if (resultScreen) resultScreen.style.display = 'block'; 
  if (loaderBox) loaderBox.style.display = 'flex';
  if (scorecardFrame) scorecardFrame.style.display = 'none';
  if (summaryCard) summaryCard.style.display = 'none';

  if ($('lbl-user-greeting')) $('lbl-user-greeting').innerText = CBTState.studentNameVal || "AGYAT";
  if ($('lbl-section-title')) $('lbl-section-title').innerText = `${sec.year} Completed,`;

  let nextSecName = (CBTState.currentYearIndex + 1 < CBTState.sections.length) ? (CBTState.sections[CBTState.currentYearIndex + 1].year || `Part ${CBTState.currentYearIndex + 2}`) : "";
  if ($('lbl-keep-going-msg')) $('lbl-keep-going-msg').innerText = nextSecName ? "Keep going." : "All sections complete!";

  const formattedTimestamp = getFormattedTimestamp(); 

  let secCorrect = 0, secIncorrect = 0, secUnattempted = 0, secMarks = 0;
  let totalQuestions = sec.end - sec.start;
  let totalSectionMarks = totalQuestions * getCorrectMarks();

  for (let i = sec.start; i < sec.end; i++) {
    if (CBTState.userAnswers[i] !== null) {
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

  secMarks = Math.max(0, secMarks - (CBTState.securityWarnings * getPenaltyMarks()));
  let timeMins = Math.floor(sec.timeSpent / 60);
  let timeSecs = sec.timeSpent % 60;
  let formattedTime = `${timeMins < 10 ? '0' : ''}${timeMins}:${timeSecs < 10 ? '0' : ''}${timeSecs}`;

  if ($('lbl-score-obtained')) $('lbl-score-obtained').innerText = secMarks; 
  if ($('lbl-score-total')) $('lbl-score-total').innerText = totalSectionMarks; 
  if ($('lbl-stat-correct-val')) $('lbl-stat-correct-val').innerText = secCorrect; 
  if ($('lbl-stat-incorrect-val')) $('lbl-stat-incorrect-val').innerText = secIncorrect; 
  if ($('lbl-stat-unattempted-val')) $('lbl-stat-unattempted-val').innerText = secUnattempted; 
  if ($('lbl-stat-time-val')) $('lbl-stat-time-val').innerText = formattedTime;

  /* Render Modern Section Cards Summary Matrix */
  let tg = $('table-body-matrix-target'); 
  if (tg) {
    tg.innerHTML = '';
    let cM = 0, aS = 0, rC = 0, rI = 0, rL = 0, totalExamQuestions = 0;
    
    const themeColors = ['blue', 'green', 'amber'];
    const fmtPct = val => (val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)) + '%';

    CBTState.sections.forEach((s, sIdx) => {
      let sC = 0, sI = 0, sL = 0, sS = 0, sT = s.end - s.start, sM = sT * getCorrectMarks();
      cM += sM;
      totalExamQuestions += sT;

      for (let i = s.start; i < s.end; i++) {
        if (CBTState.userAnswers[i] !== null) {
          if (isAnswerCorrect(i)) { sC++; sS += getCorrectMarks(); }
          else { sI++; sS -= getIncorrectMarks(); }
        } else { sL++; }
      }
      aS += sS; rC += sC; rI += sI; rL += sL;
      
      let pR = sM > 0 && sS > 0 ? Math.round((sS / sM) * 100) : 0;
      if (!s.submitted) pR = 0;

      let corPct = sT > 0 && s.submitted ? ((sC / sT) * 100) : 0;
      let incorPct = sT > 0 && s.submitted ? ((sI / sT) * 100) : 0;
      let unattPct = sT > 0 ? (((s.submitted ? sL : sT) / sT) * 100) : 0;

      let themeClass = themeColors[sIdx % themeColors.length];
      let iconSvg = sIdx === 0 
        ? `<svg class="sec-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="16" x2="15" y2="16"></line></svg>`
        : `<svg class="sec-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

      tg.innerHTML += `
        <div class="summary-row-card row-theme-${themeClass}">
          <div class="sm-col sm-col-section">
            <div class="sec-card-icon-box ${themeClass}">
              ${iconSvg}
            </div>
            <div class="sec-card-title-group">
              <span class="sec-card-title">${escapeHTML(s.year)}</span>
              <span class="sec-card-subtitle">${sT} Ques.</span>
            </div>
          </div>
          <div class="sm-col">
            <span class="badge-pct-pill green">${s.submitted ? pR : 0}%</span>
            <span class="sm-subtext">(${s.submitted ? sS : 0} / ${sT})</span>
          </div>
          <div class="sm-col">
            <span class="stat-circle-badge correct">${s.submitted ? sC : '0'}</span>
            <span class="sm-subtext">${fmtPct(corPct)}</span>
          </div>
          <div class="sm-col">
            <span class="stat-circle-badge incorrect">${s.submitted ? sI : '0'}</span>
            <span class="sm-subtext">${fmtPct(incorPct)}</span>
          </div>
          <div class="sm-col">
            <span class="stat-circle-badge unattempted">${s.submitted ? sL : sT}</span>
            <span class="sm-subtext">${fmtPct(unattPct)}</span>
          </div>
        </div>
      `;
    });

    aS = Math.max(0, aS - (CBTState.securityWarnings * getPenaltyMarks()));
    let fP = cM > 0 ? Math.round((aS / cM) * 100) : 0;

    let totCorPct = totalExamQuestions > 0 ? ((rC / totalExamQuestions) * 100) : 0;
    let totIncorPct = totalExamQuestions > 0 ? ((rI / totalExamQuestions) * 100) : 0;
    let totUnattPct = totalExamQuestions > 0 ? ((rL / totalExamQuestions) * 100) : 0;

    tg.innerHTML += `
      <div class="summary-row-card row-theme-purple total-row">
        <div class="sm-col sm-col-section">
          <div class="sec-card-icon-box purple" style="font-weight:900; font-size:1.15rem;">
            Σ
          </div>
          <div class="sec-card-title-group">
            <span class="sec-card-title">TOTAL</span>
            <span class="sec-card-subtitle">${totalExamQuestions} Ques.</span>
          </div>
        </div>
        <div class="sm-col">
          <span class="badge-pct-pill blue">${fP}%</span>
          <span class="sm-subtext">(${aS} / ${totalExamQuestions})</span>
        </div>
        <div class="sm-col">
          <span class="stat-circle-badge correct">${rC}</span>
          <span class="sm-subtext">${fmtPct(totCorPct)}</span>
        </div>
        <div class="sm-col">
          <span class="stat-circle-badge incorrect">${rI}</span>
          <span class="sm-subtext">${fmtPct(totIncorPct)}</span>
        </div>
        <div class="sm-col">
          <span class="stat-circle-badge unattempted">${rL}</span>
          <span class="sm-subtext">${fmtPct(totUnattPct)}</span>
        </div>
      </div>
    `;
  }

  CBTState.globalFormPayload = { 
    timestamp: formattedTimestamp, 
    studentName: CBTState.studentNameVal || "AGYAT", 
    studentClass: CBTState.studentClassVal, 
    studentSection: CBTState.studentSectionVal, 
    schoolName: CBTState.schoolNameVal, 
    testName: getTestName(), 
    currentSection: `${sec.year} - ${sec.title}`, 
    obtainedScore: secMarks, 
    correctAnswers: secCorrect, 
    incorrectAnswers: secIncorrect, 
    unattemptQuestions: secUnattempted, 
    accuracy: totalQuestions > 0 ? ((secCorrect / totalQuestions) * 100).toFixed(2) + "%" : "0.00%", 
    avgTimePerQuestion: totalQuestions > 0 ? (sec.timeSpent / totalQuestions).toFixed(1) + "s" : "0s", 
    proctoringWarnings: CBTState.securityWarnings, 
    activeTimeTaken: formattedTime 
  };

  const saveUrl = getSaveRecordOfCBT();
  if (saveUrl && CBTState.globalFormPayload) {
    const params = new URLSearchParams();
    for (const key in CBTState.globalFormPayload) {
      params.append(key, CBTState.globalFormPayload[key]);
    }
    try {
      await fetch(saveUrl, { method: "POST", body: params }).then(r => r.json()).catch(() => null);
      showToastAlert("Record saved to Google Sheets successfully!");
    } catch (err) {
      console.warn("Apps Script Save Sync Note:", err);
    }
  }

  if (loaderBox) loaderBox.style.display = 'none';
  if (scorecardFrame) scorecardFrame.style.display = 'flex';

  let b = $('btn-dashboard-main-trigger'); 
  if (b) { 
    b.disabled = false; 
    b.style.opacity = '1'; 
    if (CBTState.currentYearIndex < CBTState.sections.length - 1) {
      let nextLabel = CBTState.sections[CBTState.currentYearIndex + 1].year || `PART B`;
      b.innerHTML = `CONTINUE TO ${nextLabel.toUpperCase()} →`;
    } else {
      b.innerHTML = `COMPLETE EVALUATION`;
    }
  } 
};

function showFinalCumulativeEvaluation() {
  clearSessionLocalStorage(); 
  const scorecardFrame = $('capture-scorecard-frame');
  const summaryCard = $('cumulative-matrix-container');

  if (scorecardFrame) scorecardFrame.style.display = 'none';
  if (summaryCard) {
    summaryCard.style.display = 'block';
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function executeProgressionAdvance() { 
  if (CBTState.currentYearIndex + 1 < CBTState.sections.length) { 
    CBTState.currentYearIndex++; 
    CBTState.currentQuestion = CBTState.sections[CBTState.currentYearIndex].start; 
    if ($('result-screen')) $('result-screen').style.display = 'none'; 
    if ($('quiz-screen')) $('quiz-screen').style.display = 'block'; 
    if ($('unified-nav')) $('unified-nav').style.display = 'flex'; 
    buildYearNav(); 
    updateTimerDisplay(); 
    loadQuestion(); 
    saveSessionToLocalStorage(); 
  } else { 
    showFinalCumulativeEvaluation();
  } 
}

function initParticleCanvas(cid, canid, pct, cdist) { 
  let c = $(cid), can = $(canid); 
  if (!c || !can) return; 
  let ctx = can.getContext('2d'), w, h, pa = []; 
  let res = () => { 
    w = c.offsetWidth; 
    h = c.offsetHeight; 
    can.width = w; 
    can.height = h; 
  }; 
  new ResizeObserver(res).observe(c); 
  res(); 
  class P { 
    constructor() { 
      this.x = Math.random() * w; 
      this.y = Math.random() * h; 
      this.vx = (Math.random() - .5) * .8; 
      this.vy = (Math.random() - .5) * .8; 
      this.r = 1.5; 
    } 
    update() { 
      this.x += this.vx; 
      this.y += this.vy; 
      if (this.x < 0 || this.x > w) this.vx *= -1; 
      if (this.y < 0 || this.y > h) this.vy *= -1; 
    } 
    draw() { 
      ctx.beginPath(); 
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); 
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-particle-color').trim() || 'rgba(21,104,69,0.4)'; 
      ctx.fill(); 
    } 
  } 
  for (let i = 0; i < pct; i++) pa.push(new P()); 
  let anim = () => { 
    ctx.clearRect(0, 0, w, h); 
    for (let i = 0; i < pa.length; i++) { 
      pa[i].update(); 
      pa[i].draw(); 
      for (let j = i + 1; j < pa.length; j++) { 
        let d = Math.hypot(pa[i].x - pa[j].x, pa[i].y - pa[j].y); 
        if (d < cdist) { 
          ctx.beginPath(); 
          ctx.moveTo(pa[i].x, pa[i].y); 
          ctx.lineTo(pa[j].x, pa[j].y); 
          ctx.strokeStyle = document.body.classList.contains('dark-mode') ? `rgba(74,222,128,${.25 - (d / cdist) * .25})` : `rgba(21,104,69,${.25 - (d / cdist) * .25})`; 
          ctx.lineWidth = 1; 
          ctx.stroke(); 
        } 
      } 
    } 
    requestAnimationFrame(anim); 
  }; 
  anim(); 
}

document.addEventListener("DOMContentLoaded", () => { 
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
      eyes.forEach(eye => { 
        eye.style.transform = 'scaleY(0.06)'; 
        setTimeout(() => { 
          eye.style.transform = 'scaleY(1)'; 
        }, 110); 
      }); 
      scheduleBlink(); 
    }, 3000 + Math.random() * 4000); 
  }; 
  scheduleBlink(); 
});