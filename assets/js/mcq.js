// SHEET_API_URL, FORM_SAVE_URL, and HOME_URL are declared in the HTML file above this script.

const $ = id => document.getElementById(id),
    MC = 5,
    MI = 1,
    PW = 2;
$('welcome-correct-lbl').innerText = `+${MC} Correct`;
$('welcome-incorrect-lbl').innerText = `-${MI} Incorrect`;

// SVG Icon Definitions to replace emojis
const ICON_SUN = `<svg class="sc-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const ICON_MOON = `<svg class="sc-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
const ICON_ALERT = `<svg class="sc-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
 
const arOpts = [
  "Both A and R are true and R is the correct explanation for A.",
  "Both A and R are true and R is not the correct explanation for A.",
  "A is True but R is False.",
  "A is False but R is True.",
  "Both A and R are False."
];

let listExamPapers = [];

async function loadQuestionsFromSheet() {
    try {
        const response = await fetch(SHEET_API_URL);
        const raw = await response.json();

        if (!Array.isArray(raw) || raw.length === 0) {
            throw new Error("Empty or invalid response from Apps Script.");
        }

        if (raw[0] && Array.isArray(raw[0].questions)) {
            listExamPapers = raw.map(paper => ({
                title: paper.title || paper.Title || paper.sectiontitle || paper.SectionTitle || "Section",
                year: paper.year || paper.Year || paper.section || paper.Section || "Set",
                questions: (paper.questions || []).map(q => ({
                    text: q.text || q.Text || q.question || q.Question || "",
                    tag: q.tag || q.Tag || q.info || q.Info || "",
                    options: Array.isArray(q.options) ? q.options :
                        [q.optiona || q.OptionA || q.option1 || "", q.optionb || q.OptionB || q.option2 || "",
                             q.optionc || q.OptionC || q.option3 || "", q.optiond || q.OptionD || q.option4 || ""],
                    correctIndex: (() => {
                        let v = (q.correctIndex != null ? q.correctIndex : q.correct != null ? q.correct : 0).toString().trim().toLowerCase();
                        if (['a', 'b', 'c', 'd'].includes(v)) return {
                            'a': 0, 'b': 1, 'c': 2, 'd': 3
                        } [v];
                        const n = parseInt(v);
                        return isNaN(n) ? 0 : (n >= 1 ? n - 1 : n);
                    })()
                }))
            }));
        } else {
            const sectionsMap = {};

            raw.forEach(row => {
                const r = {};
                Object.keys(row).forEach(k => {
                    r[k.toLowerCase().trim()] = row[k];
                });

                const sectionLabel = (r['section'] || r['year'] || r['set'] || "Section A").toString().trim();
                const sectionTitle = (r['sectiontitle'] || r['title'] || r['label'] || sectionLabel).toString().trim();
                const qText = (r['question'] || r['text'] || r['q'] || "").toString().trim();
                const qTag = (r['tag'] || r['info'] || r['metadata'] || "").toString().trim();

                if (!qText) return;

                const options = [
                    (r['optiona'] || r['option1'] || r['a'] || "").toString().trim(),
                    (r['optionb'] || r['option2'] || r['b'] || "").toString().trim(),
                    (r['optionc'] || r['option3'] || r['c'] || "").toString().trim(),
                    (r['optiond'] || r['option4'] || r['d'] || "").toString().trim(),
                ].filter(o => o !== "");

                let ciRaw = (r['correct'] || r['correctindex'] || r['answer'] || r['ans'] || "A").toString().trim().toLowerCase();
                let ci;
                if (['a', 'b', 'c', 'd', 'e'].includes(ciRaw)) {
                    ci = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 } [ciRaw];
                } else {
                    ci = parseInt(ciRaw);
                    if (ci >= 1 && ci <= options.length) ci = ci - 1;
                }
                if (isNaN(ci) || ci < 0 || ci >= options.length) ci = 0;

                if (!sectionsMap[sectionLabel]) {
                    sectionsMap[sectionLabel] = {
                        title: sectionTitle,
                        year: sectionLabel,
                        questions: []
                    };
                }
                sectionsMap[sectionLabel].questions.push({
                    text: qText,
                    tag: qTag,
                    options,
                    correctIndex: ci
                });
            });

            listExamPapers = Object.values(sectionsMap);
        }

        if (listExamPapers.length === 0 || listExamPapers.every(p => p.questions.length === 0)) {
            throw new Error(
                "No questions found. Check that Row 1 of your sheet has exactly these headers:\n" +
                "Section | SectionTitle | Question | OptionA | OptionB | OptionC | OptionD | Correct"
            );
        }

    } catch (err) {
        console.error("Failed to load questions from sheet:", err);
        alert("Could not load questions.\n\nError: " + err.message);
    }
}


let questions = [], sections = [], studentName = "", currentYearIndex = 0, currentQuestion = 0;
let userAnswers = [], visitedQuestions = [], lockedAnswers = [], sectionTimes = [];
let timerInterval, isTimerPaused = true, securityWarnings = 0, isExamActive = false, currentFilter = 'all', globalFormPayload = null;

function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function showToastAlert(m) {
    let t = $('custom-alert-toast'), txt = $('custom-alert-text');
    if (t && txt) {
        txt.innerHTML = `${ICON_ALERT} ${m}`;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 4000);
    }
}

window.toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    let isDark = document.body.classList.contains('dark-mode');
    let headerBtn = $('header-theme-toggle');
    
    if (isDark) {
        if (headerBtn) headerBtn.innerHTML = `${ICON_SUN} Light Mode`;
        localStorage.setItem('theme', 'dark');
    } else {
        if (headerBtn) headerBtn.innerHTML = `${ICON_MOON} Dark Mode`;
        localStorage.setItem('theme', 'light');
    }
    
    if (isExamActive && sections.length > 0) buildYearNav();
};

document.addEventListener('click', e => {
    let m = $('modal-security');
    if (m && m.style.display === 'flex') closeSecurityModal();
});

window.addEventListener('scroll', () => {
    let bar = $("scProgressBar");
    let st = document.documentElement.scrollTop || document.body.scrollTop;
    let sh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (bar) bar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + "%";
});

const mt = $('scMenuToggle'), mm = $('scMobileMenu');
if (mt && mm) {
    mt.addEventListener('click', () => {
        mm.classList.toggle('show-mobile-menu');
        mt.innerHTML = mm.classList.contains('show-mobile-menu') ? '✕' : '☰';
    });
}

const ym = $('yearMenuToggle'), yc = $('year-nav-container');
if (ym && yc) {
    ym.addEventListener('click', () => {
        yc.classList.toggle('show-year-menu');
        ym.innerHTML = yc.classList.contains('show-year-menu') ? '✕' : '☰';
    });
}

window.onload = async () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if ($('header-theme-toggle')) $('header-theme-toggle').innerHTML = `${ICON_SUN} Light Mode`;
    }

    $('modal-welcome').style.display = 'flex';
    $('student-name-input').placeholder = "Loading questions...";
    const startBtn = document.querySelector('.modal-btn-success');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = "Loading...";
    }

    await loadQuestionsFromSheet();

    $('student-name-input').placeholder = "e.g. Rohit Singh | SinghClasses";
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = "Start Mock Test";
    }
    setTimeout(() => $('student-name-input').focus(), 100);

    initParticleCanvas('quiz-screen', 'canvasCBT', 12, 90);
    initParticleCanvas('quiz-screen', 'canvasPalette', 6, 70);
    initParticleCanvas('bottomSection', 'canvasBottom', 40, 75);
};

// Security Measures
['contextmenu', 'copy', 'cut', 'dragstart'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

document.addEventListener('keyup', e => {
    if (e.key === 'PrintScreen') {
        try { navigator.clipboard.writeText(''); } catch (err) {}
        if (isExamActive && !isTimerPaused) applySecurityPenalty();
    }
});

document.addEventListener('keydown', e => {
    let k = e.key.toLowerCase(), ic = e.ctrlKey || e.metaKey, is = e.shiftKey;
    if (e.key === 'F12' || e.keyCode === 123 || (ic && is && ['i', 'j', 'c'].includes(k)) || (ic && ['u', 'p', 's', 'r'].includes(k)) || e.key === 'F5') {
        e.preventDefault();
        if (isExamActive && !isTimerPaused) applySecurityPenalty();
        return false;
    }
});

document.addEventListener('keydown', e => {
    if (!isExamActive || isTimerPaused) return;
    let s = sections[currentYearIndex], k = e.key.toLowerCase(), isl = lockedAnswers[currentQuestion] || s.submitted;

    if (!isl) {
        if (['1', '2', '3', '4'].includes(k)) {
            e.preventDefault();
            saveAnswer(parseInt(k) - 1);
        } else if (['a', 'b', 'c', 'd', 'e'].includes(k)) {
            e.preventDefault();
            saveAnswer({ 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 } [k]);
        } else if (k === 'backspace' || k === 'delete') {
            e.preventDefault();
            clearResponse();
        }
    }
    if (k === 'enter') {
        e.preventDefault();
        if (!s.submitted && currentQuestion === s.end - 1) showSubmitModal();
        else if (!s.submitted || currentQuestion < s.end - 1) nextQuestion();
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden' && isExamActive && !isTimerPaused) applySecurityPenalty();
});

window.addEventListener("blur", () => {
    if (isExamActive && !isTimerPaused) applySecurityPenalty();
});

window.addEventListener("beforeunload", e => {
    if (isExamActive && !sections[currentYearIndex].submitted) {
        let s = sections[currentYearIndex], c = 0, ic = 0, l = 0, sc = 0, tot = s.end - s.start;
        for (let i = s.start; i < s.end; i++) {
            if (userAnswers[i] !== null) {
                if (btoa("sc_ans_" + userAnswers[i]) === questions[i].answer) { c++; sc += MC; } 
                else { ic++; sc -= MI; }
            } else l++;
        }
        sc = Math.max(0, sc - (securityWarnings * PW));

        let p = new URLSearchParams();
        p.append("entry.784284433", studentName + " (Reload Dropout)");
        p.append("entry.222087888", s.year + " - " + s.title);
        p.append("entry.942833858", sc + " / " + (tot * MC));
        p.append("entry.930216015", c);
        p.append("entry.323768159", ic);
        p.append("entry.1388315739", l);
        p.append("entry.1858729095", securityWarnings);
        p.append("entry.1240634167", Math.floor(s.timeSpent / 60) + "m " + (s.timeSpent % 60) + "s");
        navigator.sendBeacon(FORM_SAVE_URL, p);

        e.preventDefault();
        e.returnValue = "Are you sure you want to exit? Progress will be lost.";
        return e.returnValue;
    }
});

let lastWT = 0;

function applySecurityPenalty() {
    if (Date.now() - lastWT < 1000) return;
    lastWT = Date.now();
    securityWarnings++;
    $('warning-count-display').innerText = `Total Warnings: ${securityWarnings} (Penalty: -${securityWarnings * PW} Marks)`;
    $('modal-security').style.display = 'flex';
    document.querySelector('.sc-widget-container').classList.add('sc-blur-active');
    isTimerPaused = true;
    updatePalette();
}

window.closeSecurityModal = () => {
    $('modal-security').style.display = 'none';
    document.querySelector('.sc-widget-container').classList.remove('sc-blur-active');
    isTimerPaused = false;
};

$('student-name-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') beginExam();
});

window.buildYearNav = () => {
    let c = $('year-nav-container');
    if (!c) return;
    c.innerHTML = '';
    if ($('current-paper-label') && sections[currentYearIndex]) {
        $('current-paper-label').innerHTML = `<span>${sections[currentYearIndex].year}</span>${sections[currentYearIndex].title}`;
    }

    sections.forEach((p, idx) => {
        let t = document.createElement('div');
        t.className = `year-tab ${idx === currentYearIndex ? 'active' : ''}`;
        t.innerHTML = `<span style="font-size:.7em;text-transform:uppercase;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-lbl);font-weight:600;">${p.year}</span><span style="font-size:.95em;font-weight:700;color:var(--tab-${idx === currentYearIndex ? 'active' : 'inactive'}-val);">${p.title}</span>`;
        t.onclick = () => {
            if (sections[idx].submitted || idx === currentYearIndex) {
                currentYearIndex = idx;
                currentQuestion = sections[idx].start;
                if (c && c.classList.contains('show-year-menu')) {
                    c.classList.remove('show-year-menu');
                    if ($('yearMenuToggle')) $('yearMenuToggle').innerHTML = '☰';
                }
                buildYearNav();
                updateTimerDisplay();
                loadQuestion();
            } else {
                showToastAlert("Submit the current section to unlock this one");
            }
        };
        c.appendChild(t);
    });
};

window.beginExam = () => {
    let v = $('student-name-input').value.trim();
    studentName = v === "" ? "Candidate" : v;
    $('modal-welcome').style.display = 'none';
    questions = []; sections = []; let qt = 0;

    listExamPapers.forEach((p, idx) => {
        let st = qt;
        let sq = p.questions.map(q => {
            let mo = q.options.map((o, i) => ({ t: o, org: i }));
            shuffleArray(mo);
            return {
                q: q.text,
                tag: q.tag || "",
                o: mo.map(o => o.t),
                a: btoa("sc_ans_" + mo.findIndex(o => o.org === q.correctIndex))
            };
        });
        shuffleArray(sq);
        sq.forEach(q => { questions.push({ question: q.q, options: q.o, answer: q.a, tag: q.tag }); qt++; });
        sections.push({ index: idx, title: p.title, year: p.year, start: st, end: qt, submitted: false, timeSpent: 0 });
    });

    userAnswers = new Array(questions.length).fill(null);
    visitedQuestions = new Array(questions.length).fill(false);
    lockedAnswers = new Array(questions.length).fill(false);
    sectionTimes = sections.map(s => (s.end - s.start) * 60);

    currentYearIndex = 0; currentQuestion = sections[0].start;
    $('quiz-screen').style.display = 'block';
    $('unified-nav').style.display = 'flex';
    isExamActive = true; isTimerPaused = false;

    buildYearNav(); updateTimerDisplay(); startTimer(); loadQuestion();
};

function updateTimerDisplay() {
    let t = sectionTimes[currentYearIndex], m = Math.floor(t / 60), s = t % 60;
    let el = $('time-left'), b = $('timer-box');
    if (el) el.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (b) {
        b.className = sections[currentYearIndex].submitted ?
            (el && (el.innerText = "Locked"), 'timer') :
            (t > 0 && t <= 60 ? 'timer danger' : (t > 60 && t <= 120 ? 'timer warning' : 'timer'));
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (isTimerPaused || !isExamActive || sections[currentYearIndex].submitted) return;
        if (sectionTimes[currentYearIndex] > 0) {
            sectionTimes[currentYearIndex]--;
            sections[currentYearIndex].timeSpent++;
        }
        updateTimerDisplay();
        if (sectionTimes[currentYearIndex] <= 0) autoLockAndSubmitSection();
    }, 1000);
}

function autoLockAndSubmitSection() {
    isTimerPaused = true;
    let m = $('modal-timeout');
    if (m) m.style.display = 'flex';
    setTimeout(() => {
        if (m) m.style.display = 'none';
        processSectionSubmission();
    }, 2000);
}

window.loadQuestion = () => {
    let c = $('question-content');
    if (c) {
        c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in');
    }

    visitedQuestions[currentQuestion] = true;
    let s = sections[currentYearIndex], qy = currentQuestion - s.start, tot = s.end - s.start;
    let pc = tot > 1 ? (qy / (tot - 1)) * 100 : 100;
    
    if ($('section-header-title')) $('section-header-title').innerText = `${s.year}: ${s.title}`;
    $('exam-progress').style.width = `${pc}%`;
    $('q-number').innerText = `Question ${qy + 1} of ${tot}`;
    $('q-text').innerHTML = `<span style="font-weight:800;color:var(--q-num-color);margin-right:6px;">Q${qy + 1}.</span>` + questions[currentQuestion].question;

    let currentTag = questions[currentQuestion].tag || "";
    let tagEl = $('q-tag');
    if (tagEl) {
        if (currentTag) {
            tagEl.innerText = currentTag;
            tagEl.style.display = 'inline-flex';
        } else {
            tagEl.style.display = 'none';
        }
    }

    let ol = $('q-options');
    ol.innerHTML = '';
    let isL = lockedAnswers[currentQuestion] || s.submitted;
    let lt = ['A', 'B', 'C', 'D', 'E'];
    let ci = parseInt(atob(questions[currentQuestion].answer).replace("sc_ans_", ""));

    questions[currentQuestion].options.forEach((opt, i) => {
        let cls = "";
        if (isL && userAnswers[currentQuestion] !== null) {
            cls = "disabled-label" + (i === ci ? " correct-answer" : (userAnswers[currentQuestion] === i ? " wrong-answer" : ""));
        } else if (userAnswers[currentQuestion] === i) {
            cls = "selected";
        }
        ol.innerHTML += `<li><label class="${cls}"><input type="radio" name="option" value="${i}" ${userAnswers[currentQuestion] === i ? "checked" : ""} ${isL ? "disabled" : ""} onclick="saveAnswer(${i})"><span class="option-letter">${lt[i]}</span><span class="option-text">${opt}</span></label></li>`;
    });

    let kh = $('keyboard-hints');
    if (kh) {
        kh.style.display = 'none';
    }

    // Toggle Sidebar-configured Hints Box (exclusively displayed at question index 1)
    let skh = $('sidebar-keyboard-hints');
    if (skh) {
        skh.style.display = (qy === 1) ? 'flex' : 'none';
    }

    $('btn-prev').disabled = currentQuestion === s.start;
    $('btn-clear').disabled = userAnswers[currentQuestion] === null || isL;

    let nb = $('btn-next');
    nb.classList.remove('highlight-submit');
    if (s.submitted) {
        nb.innerText = "Next Question"; nb.disabled = currentQuestion === s.end - 1; nb.onclick = nextQuestion;
    } else if (currentQuestion === s.end - 1) {
        nb.innerText = "Submit Section"; nb.classList.add('highlight-submit'); nb.onclick = showSubmitModal;
    } else {
        nb.innerText = "Save & Next"; nb.onclick = nextQuestion;
    }
    updatePalette();
};

window.saveAnswer = i => {
    if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return;
    userAnswers[currentQuestion] = i;
    $('btn-clear').disabled = false;
    loadQuestion();
};

window.clearResponse = () => {
    if (lockedAnswers[currentQuestion] || sections[currentYearIndex].submitted) return;
    userAnswers[currentQuestion] = null;
    loadQuestion();
};

window.nextQuestion = () => {
    if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true;
    if (currentQuestion < sections[currentYearIndex].end - 1) currentQuestion++;
    loadQuestion();
};

window.prevQuestion = () => {
    if (currentQuestion > sections[currentYearIndex].start) currentQuestion--;
    loadQuestion();
};

window.jumpToQuestion = i => { currentQuestion = i; loadQuestion(); };

window.filterPalette = t => {
    currentFilter = t;
    document.querySelectorAll('.interactive-legend .legend-item').forEach(e => e.classList.remove('active-filter'));
    $('filter-' + t).classList.add('active-filter');
    updatePalette();
};

function updatePalette() {
    let s = sections[currentYearIndex], g = $('palette-grid');
    if (!g) return;
    g.innerHTML = '';
    let rc = 0, wc = 0, sc = 0;
    let allAnswered = true;

    for (let i = s.start; i < s.end; i++) {
        if (userAnswers[i] === null) {
            allAnswered = false;
        }

        if (userAnswers[i] !== null && (lockedAnswers[i] || s.submitted)) {
            if (btoa("sc_ans_" + userAnswers[i]) === questions[i].answer) { rc++; sc += MC; } 
            else { wc++; sc -= MI; }
        }

        let cls = visitedQuestions[i] ? (userAnswers[i] !== null ? 'answered' : 'not-answered') : 'unvisited';
        let iw = (s.submitted || lockedAnswers[i]) && userAnswers[i] !== null && btoa("sc_ans_" + userAnswers[i]) !== questions[i].answer;
        let dsp = iw ? 'wrong' : cls;
        let flt = false;

        if (currentFilter !== 'all') {
            if (currentFilter === 'answered' && cls !== 'answered' && dsp !== 'wrong') flt = true;
            else if (currentFilter === 'not-answered' && cls !== 'not-answered') flt = true;
            else if (currentFilter === 'unvisited' && cls !== 'unvisited') flt = true;
        }

        g.innerHTML += `<div class="palette-btn ${dsp}${i === currentQuestion ? ' current-question' : ''}${flt ? ' filtered-out' : ''}" onclick="jumpToQuestion(${i})">${(i - s.start) + 1}${iw ? `<div style="position:absolute;top:-3px;right:-3px;background:var(--container-bg);color:var(--color-wrong);border:1px solid var(--color-wrong);border-radius:50%;width:14px;height:14px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:5;">✕</div>` : ''}</div>`;
    }

    let mainSubmitBtn = $('main-section-submit-btn');
    if (mainSubmitBtn) {
        if (allAnswered) {
            mainSubmitBtn.classList.add('all-answered');
        } else {
            mainSubmitBtn.classList.remove('all-answered');
        }
    }

    let statRight = $('stat-right'), statWrong = $('stat-wrong'), statScore = $('stat-score');
    let prevR = statRight.innerText, prevW = statWrong.innerText, prevS = statScore.innerText;
    
    statRight.innerText = rc;
    statWrong.innerText = wc;
    statScore.innerText = sc - (securityWarnings * PW);

    if (prevR != rc) { statRight.classList.remove('stat-pop'); void statRight.offsetWidth; statRight.classList.add('stat-pop'); }
    if (prevW != wc) { statWrong.classList.remove('stat-pop'); void statWrong.offsetWidth; statWrong.classList.add('stat-pop'); }
    if (prevS != sc - (securityWarnings * PW)) { statScore.classList.remove('stat-pop'); void statScore.offsetWidth; statScore.classList.add('stat-pop'); }
}

window.showSubmitModal = () => {
    if (userAnswers[currentQuestion] !== null && !sections[currentYearIndex].submitted) lockedAnswers[currentQuestion] = true;
    let u = 0;
    for (let i = sections[currentYearIndex].start; i < sections[currentYearIndex].end; i++) {
        if (!visitedQuestions[i]) u++;
    }
    if (u > 0) showToastAlert(`${u} Question(s) still pending pls check`);
    if ($('submit-modal-text')) $('submit-modal-text').innerText = `Are you sure you want to submit your responses for ${sections[currentYearIndex].year}?`;
    isTimerPaused = true;
    $('modal-submit').style.display = 'flex';
};

window.closeSubmitModal = () => {
    $('modal-submit').style.display = 'none';
    isTimerPaused = false;
};

window.confirmSubmitExam = () => {
    $('modal-submit').style.display = 'none';
    isTimerPaused = false;
    processSectionSubmission();
};

window.downloadScorecardAsImage = () => {
    let f = $('capture-scorecard-frame');
    if (!f) return;
    showToastAlert("Compiling high-resolution scorecard canvas frame...");
    html2canvas(f, {
        useCORS: true,
        scale: 2,
        backgroundColor: document.body.classList.contains('dark-mode') ? '#121212' : '#f4f6f9'
    }).then(c => {
        let a = document.createElement('a');
        a.download = `${studentName}_Scorecard_${sections[currentYearIndex].year.replace(/\s+/g, '_')}.png`;
        a.href = c.toDataURL('image/png');
        a.click();
        showToastAlert("Scorecard image compiled and saved successfully!");
    }).catch(err => showToastAlert("Image rendering error. Please re-attempt."));
};

function processSectionSubmission() {
    if (!lockedAnswers[currentQuestion] && userAnswers[currentQuestion] !== null) lockedAnswers[currentQuestion] = true;
    let sec = sections[currentYearIndex];
    sec.submitted = true;
    for (let i = sec.start; i < sec.end; i++) lockedAnswers[i] = true;

    $('quiz-screen').style.display = 'none';
    $('unified-nav').style.display = 'none';
    $('sc-global-footer-banner').style.display = 'none';
    $('result-screen').style.display = 'block';

    $('rs-dynamic-greeting').innerText = `Great effort ${studentName.split(" | ")[0].split(" ")[0]}`;
    $('lbl-dash-name').innerText = studentName;
    $('lbl-dash-date-node').innerText = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    $('lbl-dash-time-node').innerText = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let rC = 0, rI = 0, rL = 0, aS = 0, cM = 0, cT = 0, pQ = 0, tg = $('table-body-matrix-target');
    if (tg) {
        tg.innerHTML = '';
        sections.forEach(s => {
            if (s.index > currentYearIndex) return;
            let sC = 0, sI = 0, sL = 0, sS = 0, sT = s.end - s.start, sM = sT * MC;
            cM += sM; cT += s.timeSpent; pQ += sT;

            for (let i = s.start; i < s.end; i++) {
                if (userAnswers[i] !== null) {
                    if (btoa("sc_ans_" + userAnswers[i]) === questions[i].answer) { sC++; if (s.submitted) { rC++; sS += MC; } } 
                    else { sI++; if (s.submitted) { rI++; sS -= MI; } }
                } else {
                    sL++; if (s.submitted) rL++;
                }
            }
            if (!s.submitted) sL = sT; else aS += sS;
            let pR = sM > 0 && sS > 0 ? ((sS / sM) * 100).toFixed(0) : 0;
            if (!s.submitted) pR = 0;

            let pillBg = s.submitted && sS > 0 ? 'var(--badge-pass-bg)' : 'var(--badge-fail-bg)';
            let pillText = s.submitted && sS > 0 ? 'var(--badge-pass-text)' : 'var(--badge-fail-text)';

            tg.innerHTML += `<tr><td>${s.year} - ${s.title}</td><td>${sM}</td><td>${s.submitted ? sC : '-'}</td><td>${s.submitted ? sI : '-'}</td><td>${sL}</td><td><span class="badge-pct-pill" style="background:${pillBg};color:${pillText};">${s.submitted ? pR : 0}%</span></td><td>${Math.floor(s.timeSpent / 60)}m ${s.timeSpent % 60}s</td></tr>`;
        });

        aS = Math.max(0, aS - (securityWarnings * PW));
        let fP = cM > 0 ? Math.round((aS / cM) * 100) : 0;

        $('lbl-dash-max-marks').innerText = cM;
        $('lbl-dash-obtained-marks').innerText = aS;
        $('lbl-dash-attempted').innerText = `${rC + rI}`;
        $('lbl-dash-incorrect').innerText = `${rI}`;
        $('lbl-dash-unattempted').innerText = `${rL}`;

        let tm = Math.floor(cT / 60), ts = cT % 60;
        $('lbl-dash-time').innerText = `${tm}m ${ts}s`;

        $('lbl-radial-score-pct').innerText = `${fP}%`;
        $('lbl-radial-obtained-val').innerText = aS;
        $('lbl-radial-obtained-pct').innerText = `${fP}%`;
        $('lbl-radial-rem-val').innerText = cM - aS;
        $('lbl-radial-rem-pct').innerText = `${100 - fP}%`;

        if ($('lbl-radial-max-1')) $('lbl-radial-max-1').innerText = cM;
        if ($('lbl-radial-max-2')) $('lbl-radial-max-2').innerText = cM;
        if ($('mob-val-total')) $('mob-val-total').innerText = cM;
        if ($('mob-val-attempted')) $('mob-val-attempted').innerText = rC + rI;
        if ($('mob-val-incorrect')) $('mob-val-incorrect').innerText = rI;
        if ($('mob-val-unattempted')) $('mob-val-unattempted').innerText = rL;
        if ($('mob-val-score')) $('mob-val-score').innerText = `${aS} / ${cM}`;
        if ($('mob-val-percent')) $('mob-val-percent').innerText = `${fP}%`;
        if ($('mob-val-warnings')) $('mob-val-warnings').innerText = securityWarnings;
        if ($('lbl-dash-warning')) $('lbl-dash-warning').innerText = securityWarnings; // Added to fix desktop quick info panel
        if ($('mob-val-time')) $('mob-val-time').innerText = `${tm}m ${ts}s`;
        
        let ringNode = $('radial-bar-fill-node');
        if (ringNode) {
            ringNode.style.strokeDashoffset = 282.74 - (282.74 * fP) / 100;
            let ringColor = fP >= 70 ? 'var(--color-correct)' : (fP >= 40 ? 'var(--color-warning)' : 'var(--color-danger)');
            ringNode.style.stroke = ringColor;
        }

        tg.innerHTML += `<tr class="total-sum-row"><td>Cumulative Total</td><td>${cM}</td><td>${rC}</td><td>${rI}</td><td>${rL}</td><td><span class="badge-pct-pill" style="background:var(--badge-total-bg);color:var(--badge-total-text);">${fP}%</span></td><td>${tm}m ${ts}s</td></tr>`;

        globalFormPayload = new URLSearchParams();
        globalFormPayload.append("entry.784284433", studentName);
        globalFormPayload.append("entry.222087888", sec.year + " - " + sec.title);
        globalFormPayload.append("entry.942833858", aS + " / " + cM);
        globalFormPayload.append("entry.930216015", rC);
        globalFormPayload.append("entry.323768159", rI);
        globalFormPayload.append("entry.1388315739", rL);
        globalFormPayload.append("entry.1858729095", securityWarnings);
        globalFormPayload.append("entry.1240634167", tm + "m " + ts + "s");
    }

    let b = $('btn-dashboard-main-trigger');
    if (b) {
        b.disabled = false;
        b.style.opacity = '1';
        b.innerHTML = currentYearIndex === sections.length - 1 ? `Finish Exam Evaluation` : `Proceed to Next Section`;
    }
}

window.handleSectionProgression = () => {
    let b = $('btn-dashboard-main-trigger');
    if (!b || b.disabled) return;
    b.disabled = true;
    b.innerHTML = `💾 Auto-Saving Results...`;

    fetch(FORM_SAVE_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: globalFormPayload ? globalFormPayload.toString() : ""
    }).then(() => {
        showToastAlert("Please wait while we save your result");
        executeProgressionAdvance();
    }).catch(() => {
        executeProgressionAdvance();
    });
};

function executeProgressionAdvance() {
    if (currentYearIndex + 1 < sections.length) {
        currentYearIndex++;
        currentQuestion = sections[currentYearIndex].start;
        $('result-screen').style.display = 'none';
        $('quiz-screen').style.display = 'block';
        $('unified-nav').style.display = 'flex';
        $('sc-global-footer-banner').style.display = 'block';
        buildYearNav(); updateTimerDisplay(); loadQuestion();
    } else {
        showToastAlert("Assessment fully complete! Final calculations locked down.");
        let b = $('btn-dashboard-main-trigger');
        if (b) {
            b.disabled = true; b.style.opacity = '0.5'; b.innerText = "Evaluation Completed";
        }
    }
}

window.goToHome = () => window.location.href = HOME_URL;

function initParticleCanvas(cid, canid, pct, cdist) {
    let c = $(cid), can = $(canid);
    if (!c || !can) return;
    let ctx = can.getContext('2d'), w, h, pa = [];

    let res = () => { w = c.offsetWidth; h = c.offsetHeight; can.width = w; can.height = h; };
    new ResizeObserver(res).observe(c); res();

    class P {
        constructor() {
            this.x = Math.random() * w; this.y = Math.random() * h;
            this.vx = (Math.random() - .5) * .8; this.vy = (Math.random() - .5) * .8;
            this.r = 1.5;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            let particleColor = getComputedStyle(document.body).getPropertyValue('--canvas-particle-color').trim() || 'rgba(21,104,69,0.4)';
            ctx.fillStyle = particleColor; ctx.fill();
        }
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
                    let isDark = document.body.classList.contains('dark-mode');
                    ctx.strokeStyle = isDark ? `rgba(74,222,128,${.25 - (d / cdist) * .25})` : `rgba(21,104,69,${.25 - (d / cdist) * .25})`;
                    ctx.lineWidth = 1; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(anim);
    };
    anim();
}