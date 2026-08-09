/**
 * Interactive CBT Test Engine Module Workspace
 * Test-Wise & Section-Wise Live Sync with Client-Side Sorting Engine
 * Includes Auto-Save LocalStorage Recovery & Question Image Preloading
 */

const $ = id => document.getElementById(id);
const getCorrectMarks = () => window.CBT_CONFIG?.MARKS_CORRECT ?? 5;
const getIncorrectMarks = () => window.CBT_CONFIG?.MARKS_INCORRECT ?? 1;
const getPenaltyMarks = () => window.CBT_CONFIG?.PENALTY_WARNING ?? 2;
const getSheetApiUrl = () => window.CBT_CONFIG?.SHEET_API_URL ?? "";
const getFormSaveUrl = () => window.CBT_CONFIG?.FORM_SAVE_URL ?? "";
const getTopperApiUrl = () => window.CBT_CONFIG?.TOPPER_API_URL ?? "";
const getTestName = () => window.CBT_CONFIG?.TEST_NAME ?? "Quiz";
const getHomeUrl = () => window.CBT_CONFIG?.HOME_URL ?? "https://www.singhclasses.in/";
const getYoutubeUrl = () => window.CBT_CONFIG?.YOUTUBE_URL ?? "https://www.youtube.com/@SinghClasses";

const ICON_ALERT = `<svg class="sc-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

let listExamPapers = [], isQuestionsLoading = true, questions = [], sections = [], currentYearIndex = 0, currentQuestion = 0;
let studentNameVal = "", studentClassVal = "", studentSectionVal = "", schoolNameVal = "", studentName = "";
let userAnswers = [], visitedQuestions = [], lockedAnswers = [], sectionTimes = [];
let timerInterval, isTimerPaused = true, securityWarnings = 0, isExamActive = false, currentFilter = 'all', globalFormPayload = null;
let activeResourceUrl = "", blurDwellTimer = null, lastWT = 0, lastSpacePressTime = 0;

function getStorageKey() { return `cbt_session_${getTestName().replace(/\s+/g, '_')}_${studentNameVal.replace(/\s+/g, '_')}`; }

function saveSessionToLocalStorage() {
    if (!isExamActive || !studentNameVal) return;
    try {
        const payload = {
            currentYearIndex, currentQuestion, userAnswers, visitedQuestions, lockedAnswers, sectionTimes, securityWarnings,
            sectionsData: sections.map(s => ({ submitted: s.submitted, timeSpent: s.timeSpent })),
            studentNameVal, studentClassVal, studentSectionVal, schoolNameVal, studentName
        };
        localStorage.setItem(getStorageKey(), JSON.stringify(payload));
    } catch (e) { console.warn("Failed to save session to localStorage:", e); }
}

function clearSessionLocalStorage() {
    if (!studentNameVal) return;
    try { localStorage.removeItem(getStorageKey()); } catch (e) { console.warn("Failed to clear localStorage:", e); }
}

function preloadQuestionImages() {
    listExamPapers.forEach(paper => {
        (paper.questions || []).forEach(q => {
            if (q.image) {
                const img = new Image();
                img.src = q.image;
            }
        });
    });
}

function toggleFilterSlider() { const w = document.querySelector('.filter-slider-wrapper'); if (w) w.classList.toggle('active'); }
document.addEventListener('click', e => { const w = document.querySelector('.filter-slider-wrapper'); if (w && !w.contains(e.target)) w.classList.remove('active'); });

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

function textToIndex(correctText, optionsArray) { let idx = optionsArray.findIndex(opt => opt !== null && opt !== undefined && opt.toString().trim().toLowerCase() === correctText.toLowerCase()); return idx !== -1 ? idx : 0; }

async function loadQuestionsFromSheet() {
    try {
        const url = getSheetApiUrl();
        if (!url) throw new Error("Google Apps Script Endpoint URL destination string not initialized.");
        const response = await fetch(url);
        const raw = await response.json();
        if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty or invalid response from Apps Script.");
        if (raw[0] && Array.isArray(raw[0].questions)) {
            listExamPapers = raw.map(paper => ({
                title: getVerbatim(paper, ['title', 'Title', 'sectiontitle', 'SectionTitle'], "Section"),
                year: getVerbatim(paper, ['year', 'Year', 'section', 'Section'], "Set"),
                questions: (paper.questions || []).map(q => {
                    let rawOpts = Array.isArray(q.options) ? q.options : [getVerbatim(q, ['optiona', 'OptionA', 'option1', '0'], ""), getVerbatim(q, ['optionb', 'OptionB', 'option2', '1'], ""), getVerbatim(q, ['optionc', 'OptionC', 'option3', '2'], ""), getVerbatim(q, ['optiond', 'OptionD', 'option4', '3'], "")];
                    let cleanOpts = rawOpts.map(o => (o !== null && o !== undefined ? o : "").toString());
                    let rawCorrect = getVerbatim(q, ['correctIndex', 'correct', 'answer', 'ans', '4'], "A");
                    return { text: getVerbatim(q, ['text', 'Text', 'question', 'Question'], "").toString(), tag: getVerbatim(q, ['tag', 'Tag', 'info', 'Info'], "").toString(), options: cleanOpts, image: getVerbatim(q, ['image', 'Image', 'imageurl'], "").toString(), correctAnswerText: resolveCorrectText(rawCorrect, cleanOpts) };
                }).filter(q => q.text !== "")
            }));
        } else {
            const sectionsMap = {};
            raw.forEach(row => {
                const r = {}; Object.keys(row).forEach(k => { r[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
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
        if (listExamPapers.length === 0 || listExamPapers.every(p => p.questions.length === 0)) throw new Error("No questions found.");
        isQuestionsLoading = false;
        preloadQuestionImages();
    } catch (err) { console.error("Failed to load questions from sheet:", err); alert("Could not load questions.\n\nError: " + err.message); }
}

function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

function showToastAlert(m) {
    let t = $('custom-alert-toast'), txt = $('custom-alert-text');
    if (t && txt) { txt.innerHTML = `${ICON_ALERT} ${m}`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4000); }
}

function triggerVerifyModal(type) {
    const modal = $('verify-resource-modal'), icon = $('verify-card-icon'), heading = $('verify-modal-heading'), text = $('verify-modal-text'), actionBtn = $('verify-proceed-action-btn'), driveId = $('current-chapter').getAttribute('data-drive-id');
    modal.style.display = 'flex';
    if (type === 'pdf') {
        activeResourceUrl = `https://drive.google.com/file/d/${driveId}/preview`;
        icon.className = "verify-modal-icon pdf-style";
        icon.innerHTML = `<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`;
        heading.innerText = "Open Chapter Study Material?"; text.innerText = "You are going to view the embedded revision lecture notes inside your student drive space.";
        actionBtn.className = "v-btn v-btn-pdf"; actionBtn.innerText = "Open Notes";
    } else if (type === 'yt') {
        activeResourceUrl = getYoutubeUrl();
        icon.className = "verify-modal-icon yt-style";
        icon.innerHTML = `<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
        heading.innerText = "Watch the Video Lesson?"; text.innerText = "Choose to continue onward if you are ready to launch the One Shot educational lecture window streams.";
        actionBtn.className = "v-btn v-btn-yt"; actionBtn.innerText = "Watch Video";
    }
    actionBtn.onclick = () => { window.open(activeResourceUrl, '_blank'); closeVerifyModal(); };
}

function closeVerifyModal() { $('verify-resource-modal').style.display = 'none'; }
function toggleFullScreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(err => console.error(err.message)); }
function goToHome() { window.location.href = getHomeUrl(); }

window.closeSecurityModal = () => { $('modal-security').style.display = 'none'; document.querySelector('.sc-widget-container').classList.remove('sc-blur-active'); isTimerPaused = false; };
document.addEventListener('click', e => { let m = $('modal-security'); if (m && m.style.display === 'flex') closeSecurityModal(); });

window.addEventListener('scroll', () => { let bar = $("scProgressBar"), st = document.documentElement.scrollTop || document.body.scrollTop, sh = document.documentElement.scrollHeight - document.documentElement.clientHeight; if (bar) bar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + "%"; });

const ym = $('yearMenuToggle'), yc = $('year-nav-container');
if (ym && yc) ym.addEventListener('click', e => { e.stopPropagation(); yc.classList.toggle('show-year-menu'); ym.innerHTML = yc.classList.contains('show-year-menu') ? '✕' : '☰'; });

window.goToGuidelinesStep = () => {
    studentNameVal = $('student-name-input').value.trim().toUpperCase() || "GOKU";
    studentClassVal = $('student-class-input').value || "10";
    studentSectionVal = $('student-section-input').value || "A";
    schoolNameVal = $('student-school-input').value.trim().toUpperCase() || "SPS";
    studentName = `${studentNameVal} | CLASS: ${studentClassVal} | SEC: ${studentSectionVal} | ${schoolNameVal}`;
    $('welcome-step-1').style.display = 'none'; $('welcome-step-2').style.display = 'block';
};

window.goToLoginStep = () => { $('welcome-step-2').style.display = 'none'; $('welcome-step-1').style.display = 'block'; };

window.onload = () => {
    $('welcome-correct-lbl').innerText = `+${getCorrectMarks()} Correct`;
    $('welcome-incorrect-lbl').innerText = `-${getIncorrectMarks()} Incorrect`;
    $('modal-welcome').style.display = 'flex';
    setTimeout(() => { const input = $('student-name-input'); if (input) input.focus(); }, 100);
    ['student-name-input', 'student-school-input'].forEach(id => { const el = $(id); if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') goToGuidelinesStep(); }); });
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

['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
document.addEventListener('keyup', e => { if (e.key === 'PrintScreen') { try { navigator.clipboard.writeText(''); } catch (err) {} if (isExamActive && !isTimerPaused) applySecurityPenalty(); } });

document.addEventListener('keydown', e => {
    if (!isExamActive || (sections[currentYearIndex] && sections[currentYearIndex].submitted)) return;
    if (e.code === 'Space') {
        e.preventDefault(); const currentTime = Date.now(), timeDifference = currentTime - lastSpacePressTime;
        if (timeDifference > 0 && timeDifference < 400) { isTimerPaused = !isTimerPaused; lastSpacePressTime = 0; } else { lastSpacePressTime = currentTime; }
    }
});

document.addEventListener('keydown', e => {
    let k = e.key.toLowerCase(), ic = e.ctrlKey || e.metaKey, is = e.shiftKey;
    if (e.key === 'F12' || e.keyCode === 123 || (ic && is && ['i', 'j', 'c'].includes(k)) || (ic && ['u', 'p', 's', 'r'].includes(k)) || e.key === 'F5') {
        e.preventDefault(); if (isExamActive && !isTimerPaused) applySecurityPenalty(); return false;
    }
});

document.addEventListener('keydown', e => {
    if (!isExamActive || isTimerPaused) return;
    let s = sections[currentYearIndex], k = e.key.toLowerCase(), isl = lockedAnswers[currentQuestion] || s.submitted;
    if (!isl) {
        if (['1', '2', '3', '4'].includes(k)) { e.preventDefault(); saveAnswer(parseInt(k) - 1); }
        else if (['a', 'b', 'c', 'd', 'e'].includes(k)) { e.preventDefault(); saveAnswer({ 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 }[k]); }
        else if (k === 'backspace' || k === 'delete') { e.preventDefault(); clearResponse(); }
    }
    if (k === 'enter') {
        e.preventDefault();
        if (!s.submitted && currentQuestion === s.end - 1) showSubmitModal();
        else if (!s.submitted || currentQuestion < s.end - 1) nextQuestion();
    }
});

function handleBlurOrHide() {
    if (!isExamActive || isTimerPaused) return;
    if (blurDwellTimer) clearTimeout(blurDwellTimer);
    blurDwellTimer = setTimeout(() => {
        if ((document.visibilityState === 'hidden' || !document.hasFocus()) && isExamActive && !isTimerPaused) applySecurityPenalty();
    }, 2500);
}

function handleFocusOrShow() { if (blurDwellTimer) { clearTimeout(blurDwellTimer); blurDwellTimer = null; } }

document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'hidden') handleBlurOrHide(); else handleFocusOrShow(); });
window.addEventListener("blur", handleBlurOrHide);
window.addEventListener("focus", handleFocusOrShow);

window.addEventListener("beforeunload", e => {
    if (isExamActive && !sections[currentYearIndex].submitted) {
        let s = sections[currentYearIndex], c = 0, ic = 0, l = 0, sc = 0, tot = s.end - s.start;
        for (let i = s.start; i < s.end; i++) {
            if (userAnswers[i] !== null) { if (isAnswerCorrect(i)) { c++; sc += getCorrectMarks(); } else { ic++; sc -= getIncorrectMarks(); } } else l++;
        }
        sc = Math.max(0, sc - (securityWarnings * getPenaltyMarks()));
        let accStr = tot > 0 ? ((c / tot) * 100).toFixed(2) + "%" : "0.00%", tm = Math.floor(s.timeSpent / 60), ts = s.timeSpent % 60, avgTimeSec = (tot > 0 ? (s.timeSpent / tot).toFixed(1) : 0) + "s";
        let p = new URLSearchParams();
        p.append("studentName", studentNameVal + " (Reload Dropout)"); p.append("studentClass", studentClassVal); p.append("studentSection", studentSectionVal); p.append("schoolName", schoolNameVal);
        p.append("testName", getTestName()); p.append("currentSection", s.year + " - " + s.title); p.append("obtainedScore", sc); p.append("correctAnswers", c); p.append("incorrectAnswers", ic);
        p.append("unattemptQuestions", l); p.append("accuracy", accStr); p.append("avgTimePerQuestion", avgTimeSec); p.append("proctoringWarnings", securityWarnings); p.append("activeTimeTaken", `${tm}m ${ts}s`);
        navigator.sendBeacon(getFormSaveUrl(), p);
    }
});

function applySecurityPenalty() {
    if (Date.now() - lastWT < 1000) return;
    lastWT = Date.now(); securityWarnings++;
    $('warning-count-display').innerText = `Total Warnings: ${securityWarnings} (Penalty: -${securityWarnings * getPenaltyMarks()} Marks)`;
    $('modal-security').style.display = 'flex';
    document.querySelector('.sc-widget-container').classList.add('sc-blur-active');
    isTimerPaused = true; updatePalette(); saveSessionToLocalStorage();
}

window.buildYearNav = () => {
    let c = $('year-nav-container'); if (!c) return; c.innerHTML = '';
    if ($('current-paper-label') && sections[currentYearIndex]) $('current-paper-label').innerHTML = `<span>${sections[currentYearIndex].year}</span>${sections[sections[currentYearIndex].index].title}`;
    sections.forEach((p, idx) => {
        let t = document.createElement('div'); t.className = `year-tab ${idx === currentYearIndex ? 'active' : ''}`;
        t.innerHTML = `<span style="font-size:.7em;text-transform:uppercase;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-lbl);font-weight:600;">${p.year}</span><span style="font-size:.95em;font-weight:700;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-val);">${p.title}</span>`;
        t.onclick = () => {
            if (sections[idx].submitted || idx === currentYearIndex) {
                currentYearIndex = idx; currentQuestion = sections[idx].start;
                if (c && c.classList.contains('show-year-menu')) { c.classList.remove('show-year-menu'); if ($('yearMenuToggle')) $('yearMenuToggle').innerHTML = '☰'; }
                buildYearNav(); updateTimerDisplay(); loadQuestion(); fetchAndRenderSidebarToppers(); saveSessionToLocalStorage();
            } else { showToastAlert("Submit the current section to unlock this one"); }
        };
        c.appendChild(t);
    });
};

function isAnswerCorrect(qIdx) {
    if (userAnswers[qIdx] === null) return false;
    let q = questions[qIdx];
    return (q.options[userAnswers[qIdx]] ?? "").toString().trim().toLowerCase() === (q.correctAnswerText ?? "").toString().trim().toLowerCase();
}

function getCorrectIndex(qIdx) { return textToIndex(questions[qIdx].correctAnswerText, questions[qIdx].options); }

async function fetchAndRenderSidebarToppers() {
    const topperUrl = getTopperApiUrl(), container = $('sidebar-toppers');
    if (!topperUrl) return;
    if (container) container.classList.add('fetching-pulse');
    try {
        const testName = getTestName(), sec = sections[currentYearIndex], currentSection = sec ? `${sec.year} - ${sec.title}` : "";
        const url = `${topperUrl}?testName=${encodeURIComponent(testName)}&currentSection=${encodeURIComponent(currentSection)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.top5) renderSidebarToppers(data.top5);
    } catch (err) { console.warn("Sidebar toppers sync note:", err); }
    finally { if (container) container.classList.remove('fetching-pulse'); }
}

function renderSidebarToppers(top5Array) {
    const container = $('sidebar-toppers'), listEl = $('sidebar-toppers-list');
    if (!container || !listEl) return;
    let realToppers = top5Array.filter(t => t && t.name && t.name !== "Awaiting..." && t.score !== "-");
    if (realToppers.length === 0) { container.style.display = 'none'; return; }
    realToppers.sort((a, b) => {
        let scoreA = parseFloat(a.score) || 0, scoreB = parseFloat(b.score) || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        let accA = parseFloat((a.accuracy || "0").toString().replace("%", "")) || 0, accB = parseFloat((b.accuracy || "0").toString().replace("%", "")) || 0;
        return accB - accA;
    });
    listEl.innerHTML = realToppers.slice(0, 3).map((t, idx) => {
        const rank = idx + 1, medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : '🥉');
        const clsSec = (t.classVal && t.classVal !== '-' ? t.classVal : '') + (t.sectionVal && t.sectionVal !== '-' ? t.sectionVal : '');
        const school = t.school && t.school !== '-' ? ` ${t.school}` : '';
        return `<span class="topper-badge">${medal} <strong>${escapeHTML(t.name)}</strong> · ${t.score} Marks · ${clsSec}${school}</span>`;
    }).join(' ');
    container.style.display = 'flex';
}

function updateTimerDisplay() {
    let t = sectionTimes[currentYearIndex], m = Math.floor(t / 60), s = t % 60, timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    let elDesktop = $('time-left'), elMobile = $('time-left-mobile');
    if (elDesktop) elDesktop.innerText = timeStr; if (elMobile) elMobile.innerText = timeStr;
    let bDesktop = $('timer-box'), bMobile = $('timer-box-mobile'), targetClass = 'timer', targetStyleColor = '';
    if (sections[currentYearIndex].submitted) {
        if (elDesktop) elDesktop.innerText = "Locked"; if (elMobile) elMobile.innerText = "Locked";
    } else {
        if (t > 0 && t <= 60) targetClass = 'timer danger'; else if (t > 60 && t <= 120) targetClass = 'timer warning';
        if (t < 30) targetStyleColor = 'var(--color-warning)';
    }
    [bDesktop, bMobile].forEach(b => { if (b) { b.className = targetClass; b.style.color = sections[currentYearIndex].submitted ? '' : targetStyleColor; } });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isTimerPaused || !isExamActive || sections[currentYearIndex].submitted) return;
        if (sectionTimes[currentYearIndex] > 0) { sectionTimes[currentYearIndex]--; sections[currentYearIndex].timeSpent++; }
        updateTimerDisplay(); saveSessionToLocalStorage();
        if (sectionTimes[currentYearIndex] <= 0) autoLockAndSubmitSection();
    }, 1000);
}

function autoLockAndSubmitSection() {
    isTimerPaused = true; let m = $('modal-timeout'); if (m) m.style.display = 'flex';
    setTimeout(() => { if (m) m.style.display = 'none'; processSectionSubmission(); }, 2000);
}

window.loadQuestion = () => {
    let c = $('question-content'); if (c) { c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in'); }
    visitedQuestions[currentQuestion] = true;
    let s = sections[currentYearIndex], qy = currentQuestion - s.start, tot = s.end - s.start, pc = tot > 1 ? (qy / (tot - 1)) * 100 : 100;
    if (window.innerWidth <= 768 && qy === 0 && c) { c.classList.remove('swipe-hint-animation'); void c.offsetWidth; c.classList.add('swipe-hint-animation'); }
    if ($('section-header-title')) $('section-header-title').innerText = `${s.year}: ${s.title}`;
    $('exam-progress').style.width = `${pc}%`; $('q-number').innerText = `Question ${qy + 1} of ${tot}`;
    let baseQuestionText = `<span style="font-weight:800;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>` + escapeHTML(questions[currentQuestion].question);
    if (questions[currentQuestion].image) baseQuestionText += `<div class="question-image-wrap" style="margin:0 0 12px 0;text-align:left;max-width:100%;display:flex;justify-content:flex-start;align-items:center;"><img src="${questions[currentQuestion].image}" alt="Image for Question ${qy + 1}" style="max-width:100%;max-height:220px;width:auto;height:auto;border-radius:8px;border:1px solid var(--border-color);box-shadow:0 4px 10px rgba(0,0,0,0.05);object-fit:contain;display:block;"></div>`;
    $('q-text').innerHTML = baseQuestionText;
    let currentTag = questions[currentQuestion].tag ?? "", tagEl = $('q-tag');
    if (tagEl) { if (currentTag) { tagEl.innerText = currentTag; tagEl.style.display = 'inline-flex'; } else { tagEl.style.display = 'none'; } }
    let ol = $('q-options'); ol.innerHTML = '';
    let isL = lockedAnswers[currentQuestion] || s.submitted, lt = ['A', 'B', 'C', 'D', 'E'], ci = getCorrectIndex(currentQuestion);

    questions[currentQuestion].options.forEach((opt, i) => {
        let cls = "";
        if (isL && userAnswers[currentQuestion] !== null) {
            cls = "disabled-label" + (i === ci ? " correct-answer" : (userAnswers[currentQuestion] === i ? " wrong-answer" : ""));
        } else if (userAnswers[currentQuestion] === i) {
            cls = "selected" + (isL ? " disabled-label" : "");
        } else if (isL) {
            cls = "disabled-label";
        }
        ol.innerHTML += `<li><label class="${cls}"><input type="radio" name="option" value="${i}" ${userAnswers[currentQuestion] === i ? "checked" : ""} ${isL ? "disabled" : ""} onclick="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${escapeHTML(opt)}</span></label></li>`;
    });

    let kh = $('keyboard-hints'); if (kh) kh.style.display = 'none';
    let skh = $('sidebar-keyboard-hints'); if (skh) skh.style.display = (qy === 1) ? 'flex' : 'none';
    $('btn-prev').disabled = currentQuestion === s.start;
    $('btn-clear').disabled = userAnswers[currentQuestion] === null || isL;
    let nb = $('btn-next'); nb.classList.remove('highlight-submit');
    if (s.submitted) {
        nb.innerHTML = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>NEXT QUESTION</span>`;
        nb.disabled = currentQuestion === s.end - 1; nb.onclick = nextQuestion;
    } else {
        if (currentQuestion === s.end - 1) {
            nb.innerHTML = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>SUBMIT SECTION</span>`;
            nb.classList.add('highlight-submit');
        } else {
            nb.innerHTML = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>SAVE & NEXT</span>`;
        }
        nb.onclick = nextQuestion;
    }
    updatePalette(); saveSessionToLocalStorage();
};

window.saveAnswer = i => { if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return; userAnswers[currentQuestion] = i; $('btn-clear').disabled = false; loadQuestion(); };
window.clearResponse = () => { if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return; userAnswers[currentQuestion] = null; loadQuestion(); };
window.nextQuestion = () => {
    if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true;
    if (currentQuestion < sections[currentYearIndex].end - 1) { currentQuestion++; loadQuestion(); } else if (!sections[currentYearIndex].submitted) showSubmitModal();
};
window.prevQuestion = () => { if (currentQuestion > sections[currentYearIndex].start) currentQuestion--; loadQuestion(); };
window.jumpToQuestion = i => { currentQuestion = i; loadQuestion(); };

window.filterPalette = t => {
    currentFilter = t; 
    document.querySelectorAll('.filter-slider-wrapper .legend-item').forEach(e => e.classList.remove('active-filter'));
    if ($('filter-' + t)) $('filter-' + t).classList.add('active-filter');
    if ($('mobile-filter-select')) $('mobile-filter-select').value = t;
    updatePalette();
};

function animateCount(el, target) {
    let current = parseInt(el.innerText) || 0; if (current === target) return;
    let start = current, duration = 300, startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp; let progress = timestamp - startTime, val = start + (target - start) * Math.min(progress / duration, 1);
        el.innerText = Math.round(val); if (progress < duration) requestAnimationFrame(step); else el.innerText = target;
    }
    requestAnimationFrame(step);
}

function updatePalette() {
    let s = sections[currentYearIndex], g = $('palette-grid'); if (!g) return;
    g.innerHTML = ''; let rc = 0, wc = 0, sc = 0, allAnswered = true;
    for (let i = s.start; i < s.end; i++) {
        if (userAnswers[i] === null) allAnswered = false;
        if (userAnswers[i] !== null && (lockedAnswers[i] || s.submitted)) {
            if (isAnswerCorrect(i)) { rc++; sc += getCorrectMarks(); } else { wc++; sc -= getIncorrectMarks(); }
        }
        let cls = visitedQuestions[i] ? (userAnswers[i] !== null ? 'answered' : 'not-answered') : 'unvisited';
        let iw = (lockedAnswers[i] || s.submitted) && userAnswers[i] !== null && !isAnswerCorrect(i);
        let dsp = iw ? 'wrong' : cls, flt = false;
        if (currentFilter !== 'all') {
            if (currentFilter === 'answered' && cls !== 'answered' && dsp !== 'wrong') flt = true;
            else if (currentFilter === 'not-answered' && cls !== 'not-answered') flt = true;
            else if (currentFilter === 'unvisited' && cls !== 'unvisited') flt = true;
        }
        let statusText = (s.submitted || lockedAnswers[i]) ? (isAnswerCorrect(i) ? "correct" : (userAnswers[i] !== null ? "incorrect" : "unanswered")) : (userAnswers[i] !== null ? "answered" : (visitedQuestions[i] ? "unanswered" : "unvisited"));
        let qNum = (i - s.start) + 1;
        g.innerHTML += `<button type="button" class="palette-btn dsp-${dsp}${i === currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" aria-label="Question ${qNum}, ${statusText}" onclick="jumpToQuestion(${i})">${qNum}${iw ? `<span style="position:absolute;top:-3px;right:-3px;background:var(--container-bg);color:var(--color-wrong);border:1px solid var(--color-wrong);border-radius:50%;width:14px;height:14px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:5;">✕</span>` : ''}</button>`;
    }
    let mainSubmitBtn = $('main-section-submit-btn');
    if (mainSubmitBtn) { if (allAnswered) mainSubmitBtn.classList.add('all-answered'); else mainSubmitBtn.classList.remove('all-answered'); }
    let statRight = $('stat-right'), statWrong = $('stat-wrong'), statScore = $('stat-score'), targetScore = sc - (securityWarnings * getPenaltyMarks());
    if (statRight) animateCount(statRight, rc); if (statWrong) animateCount(statWrong, wc); if (statScore) animateCount(statScore, targetScore);
}

window.showSubmitModal = () => {
    if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true;
    let u = 0; for (let i = sections[currentYearIndex].start; i < sections[currentYearIndex].end; i++) { if (!visitedQuestions[i]) u++; }
    if (u > 0) showToastAlert(`${u} Question(s) still pending pls check`);
    if ($('submit-modal-text')) $('submit-modal-text').innerText = `Are you sure you want to submit your responses for ${sections[currentYearIndex].year}?`;
    isTimerPaused = true; $('modal-submit').style.display = 'flex';
};

window.closeSubmitModal = () => { $('modal-submit').style.display = 'none'; isTimerPaused = false; };
window.confirmSubmitExam = () => { $('modal-submit').style.display = 'none'; isTimerPaused = false; processSectionSubmission(); };

window.downloadScorecardAsImage = () => {
    let f = $('capture-scorecard-frame'); if (!f) return;
    showToastAlert("Compiling scorecard frame...");
    html2canvas(f, { useCORS: true, scale: 2, backgroundColor: document.body.classList.contains('dark-mode') ? '#121212' : '#f4f6f9' }).then(c => {
        let a = document.createElement('a'); a.download = `${studentNameVal}_Scorecard_${sections[currentYearIndex].year.replace(/\s+/g, '_')}.png`;
        a.href = c.toDataURL('image/png'); a.click(); showToastAlert("Scorecard image compiled successfully!");
    }).catch(err => showToastAlert("Image rendering error. Please re-attempt."));
};

window.handleSectionProgression = () => {
    let b = $('btn-dashboard-main-trigger'); if (!b || b.disabled) return;
    b.disabled = true; b.innerHTML = `💾 Saving Results to Server...`;
    const saveUrl = getFormSaveUrl(), topperUrl = getTopperApiUrl(), params = new URLSearchParams();
    for (const key in globalFormPayload) params.append(key, globalFormPayload[key]);
    const saveRequest = saveUrl ? fetch(saveUrl, { method: "POST", body: params }).then(r => r.json()).catch(() => null) : Promise.resolve(null);
    const topperRequest = topperUrl ? fetch(topperUrl, { method: "POST", body: params }).then(r => r.json()).catch(() => null) : Promise.resolve(null);
    Promise.all([saveRequest, topperRequest]).then(([saveRes, topperRes]) => {
        showToastAlert("Saved to Google Sheets successfully!"); executeProgressionAdvance();
    }).catch(err => { console.warn("Sync warning:", err); showToastAlert("Proceeding forward..."); executeProgressionAdvance(); });
};

function executeProgressionAdvance() {
    if (currentYearIndex + 1 < sections.length) {
        currentYearIndex++; currentQuestion = sections[currentYearIndex].start;
        $('result-screen').style.display = 'none'; $('quiz-screen').style.display = 'block'; $('unified-nav').style.display = 'flex';
        buildYearNav(); updateTimerDisplay(); loadQuestion(); fetchAndRenderSidebarToppers(); saveSessionToLocalStorage();
    } else {
        clearSessionLocalStorage();
        showToastAlert("Assessment fully complete! Final calculations locked down.");
        let b = $('btn-dashboard-main-trigger'); if (b) { b.disabled = true; b.style.opacity = '0.5'; b.innerText = "Evaluation Completed"; }
    }
}

function initParticleCanvas(cid, canid, pct, cdist) {
    let c = $(cid), can = $(canid); if (!c || !can) return;
    let ctx = can.getContext('2d'), w, h, pa = [];
    let res = () => { w = c.offsetWidth; h = c.offsetHeight; can.width = w; can.height = h; };
    new ResizeObserver(res).observe(c); res();
    class P {
        constructor() { this.x = Math.random() * w; this.y = Math.random() * h; this.vx = (Math.random() - .5) * .8; this.vy = (Math.random() - .5) * .8; this.r = 1.5; }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > w) this.vx *= -1; if (this.y < 0 || this.y > h) this.vy *= -1; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-particle-color').trim() || 'rgba(21,104,69,0.4)'; ctx.fill(); }
    }
    for (let i = 0; i < pct; i++) pa.push(new P());
    let anim = () => {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < pa.length; i++) {
            pa[i].update(); pa[i].draw();
            for (let j = i + 1; j < pa.length; j++) {
                let d = Math.hypot(pa[i].x - pa[j].x, pa[i].y - pa[j].y);
                if (d < cdist) {
                    ctx.beginPath(); ctx.moveTo(pa[i].x, pa[i].y); ctx.lineTo(pa[j].x, pa[j].y);
                    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? `rgba(74,222,128,${.25 - (d / cdist) * .25})` : `rgba(21,104,69,${.25 - (d / cdist) * .25})`;
                    ctx.lineWidth = 1; ctx.stroke();
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
            const pupil = pupils[index]; if (!pupil) return;
            const rect = eye.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx, dy = e.clientY - cy, angle = Math.atan2(dy, dx);
            const maxRadius = (rect.width / 2) - (pupil.offsetWidth / 2) - 1.5, distance = Math.min(Math.hypot(dx, dy) / 10, maxRadius);
            pupil.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
        });
    });
    const scheduleBlink = () => {
        setTimeout(() => {
            eyes.forEach(eye => { eye.style.transform = 'scaleY(0.06)'; setTimeout(() => { eye.style.transform = 'scaleY(1)'; }, 110); });
            scheduleBlink();
        }, 3000 + Math.random() * 4000);
    };
    scheduleBlink();
});