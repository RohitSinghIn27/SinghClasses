let parsedQuestionBank = {
    mcqs: [],
    vsas: [],
    sas: [],
    cases: []
}; 

// Helper to format backticks to lavender code snippets
function formatText(text) {
    if (!text) return '';
    return text.replace(/`([^`]+)`/g, '<span class="code-snippet">$1</span>');
}

// Helper to shuffle arrays randomly
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
 
// --- 2. DATA FETCHING (AppScript / Excel Integration) ---
async function loadQuestionsFromSheet() {
    if (!FETCH_API_URL) {
        console.error("Missing AppScript URL.");
        document.getElementById('start-btn').innerText = "Configuration Error";
        return;
    }

    try {
        const response = await fetch(FETCH_API_URL);
        const data = await response.json();

        // Helper to strip spaces and underscores for foolproof matching
        const cleanKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');

        data.forEach(row => {
            let keys = Object.keys(row);
            
            // Foolproof Key Matching
            let qTypeKey = keys.find(k => cleanKey(k).includes('type'));
            let qTextKey = keys.find(k => cleanKey(k).includes('question'));
            
            let opt1Key = keys.find(k => cleanKey(k).includes('optiona') || cleanKey(k).includes('assertion'));
            let opt2Key = keys.find(k => cleanKey(k).includes('optionb') || cleanKey(k).includes('reason'));
            let opt3Key = keys.find(k => cleanKey(k).includes('optionc'));
            let opt4Key = keys.find(k => cleanKey(k).includes('optiond'));
            
            let marksKey = keys.find(k => cleanKey(k) === 'marks' || cleanKey(k).includes('marks'));

            if (!qTypeKey || !qTextKey) return;

            let qType = String(row[qTypeKey] || '').trim().toUpperCase();
            let qText = formatText(row[qTextKey] || '');
            let marks = row[marksKey] || '';

            if (qType === 'MCQ') {
                parsedQuestionBank.mcqs.push({
                    q: qText,
                    type: "mcq",
                    marks: marks,
                    options: [
                        formatText(row[opt1Key]),
                        formatText(row[opt2Key]),
                        formatText(row[opt3Key]),
                        formatText(row[opt4Key])
                    ]
                });
            } else if (qType === 'ASSERTION-REASON' || qType === 'ASSERTION REASON') {
                parsedQuestionBank.mcqs.push({
                    q: "Evaluate the given Assertion and Reason:",
                    type: "assertion",
                    marks: marks,
                    assertion: formatText(row[opt1Key] || 'Assertion missing'),
                    reason: formatText(row[opt2Key] || 'Reason missing')
                });
            } else if (qType === 'VSA') {
                parsedQuestionBank.vsas.push({ q: qText, marks: marks });
            } else if (qType === 'SA') {
                parsedQuestionBank.sas.push({ q: qText, marks: marks });
            } else if (qType === 'CASE STUDY QUESTION' || qType === 'CASE STUDY') {
                parsedQuestionBank.cases.push({
                    context: qText,
                    subs: []
                });
            } else if (qType === 'CASE STUDY SUB PART' || qType === 'SUB PART') {
                if (parsedQuestionBank.cases.length > 0) {
                    parsedQuestionBank.cases[parsedQuestionBank.cases.length - 1].subs.push({
                        text: qText,
                        marks: marks
                    });
                }
            }
        });

        // SHUFFLE AND LIMIT QUESTIONS
        if (typeof LIMIT_MCQ !== 'undefined') parsedQuestionBank.mcqs = shuffleArray(parsedQuestionBank.mcqs).slice(0, LIMIT_MCQ);
        if (typeof LIMIT_VSA !== 'undefined') parsedQuestionBank.vsas = shuffleArray(parsedQuestionBank.vsas).slice(0, LIMIT_VSA);
        if (typeof LIMIT_SA !== 'undefined') parsedQuestionBank.sas = shuffleArray(parsedQuestionBank.sas).slice(0, LIMIT_SA);
        if (typeof LIMIT_CASE !== 'undefined') parsedQuestionBank.cases = shuffleArray(parsedQuestionBank.cases).slice(0, LIMIT_CASE);

        if (parsedQuestionBank.mcqs.length === 0 && parsedQuestionBank.vsas.length === 0 && parsedQuestionBank.sas.length === 0 && parsedQuestionBank.cases.length === 0) {
            document.getElementById('start-btn').innerText = "Data Format Error";
            document.getElementById('exam-container').innerHTML = '<div style="text-align: center; padding: 50px; color: #DC2626; font-weight: bold;">Error: No questions loaded.</div>';
            return;
        }

        const startBtn = document.getElementById('start-btn');
        startBtn.innerText = "Start Test";
        startBtn.disabled = false;

    } catch (error) {
        console.error("Error loading questions from Google Sheets:", error);
        document.getElementById('start-btn').innerText = "Network Error";
    }
}
// --- 3. INITIALIZATION & UI EFFECTS ---
document.addEventListener("DOMContentLoaded", () => {
    initTrackingEyes();
    document.getElementById('modal-container').style.display = 'flex';
    document.getElementById('start-btn').disabled = true;

    loadQuestionsFromSheet();
});

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}

// --- 4. EXAM LOGIC & MODALS ---
let examActive = false;
let tabSwitchCount = 0;
let timeLeft = 30 * 60;
let timerInterval;

function startExam() {
    let nameInput = document.getElementById('candidate-name').value.trim();
    if (!nameInput) {
        nameInput = "Student";
    }

    document.getElementById('start-modal').classList.remove('active-modal');
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    generatePaper();
    updateTimerDisplay();
    startTimer();
    examActive = true;
}

function openConfirmModal() {
    if (!examActive) return;
    document.getElementById('modal-container').style.display = 'flex';
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active-modal'));
    document.getElementById('confirm-modal').classList.add('active-modal');
}

function closeConfirmModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('confirm-modal').classList.remove('active-modal');
}

function closeSecurityModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('security-modal').classList.remove('active-modal');
}

// --- YOUTUBE CUSTOM MODAL LOGIC ---
function openYTModal() {
    document.getElementById('modal-container').style.display = 'flex';
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active-modal'));
    document.getElementById('yt-confirm-modal').classList.add('active-modal');
}

function closeYTModal() {
    document.getElementById('modal-container').style.display = 'none';
    document.getElementById('yt-confirm-modal').classList.remove('active-modal');
}

function proceedToYouTube() {
    closeYTModal();
    window.open('https://youtu.be/IZyZDC7Q3iw', '_blank');
}

// --- 5. EXAM GENERATION ---
function generatePaper() {
    let qCounter = 1;

    let html = `
    <div class="exam-section" style="padding-bottom: 0;">
        <div class="question-block" style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--primary-blue); margin-bottom: 16px; font-weight: 800; text-align: center; font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid var(--bond-border); padding-bottom: 8px;">General Instructions</h3>
            <ol style="margin-left: 24px; color: #334155; line-height: 1.8; font-size: 0.95rem; font-weight: 600;">
                <li>This question paper comprises four sections: <strong>A, B, C, and D</strong>.</li>
                <li><strong>Section A</strong> consists of Objective Type / Assertion-Reason questions.</li>
                <li><strong>Section B</strong> consists of Very Short Answer questions.</li>
                <li><strong>Section C</strong> consists of Short Answer questions.</li>
                <li><strong>Section D</strong> consists of Case-Based questions.</li>
                <li>All questions are compulsory. Read the scenarios carefully before answering.</li>
                <li>There is no negative marking for incorrect answers.</li>
            </ol>
        </div>
    </div>`;

    if (parsedQuestionBank.mcqs.length > 0) {
        html += `<div id="sec-a" class="exam-section">
            <div class="section-header"><span class="section-title-text">Section A: Objective Type</span></div>`;

        parsedQuestionBank.mcqs.forEach(q => {
            let mks = q.marks ? `[${q.marks}]` : '';
            if (q.type === "mcq") {
                html += `<div class="question-block"><div class="question-header"><div class="q-num">Q${qCounter}.</div><div class="q-text">${q.q}</div><div class="q-marks">${mks}</div></div>
                    <ul class="options-list">
                        <li class="option-item">A) ${q.options[0]}</li><li class="option-item">B) ${q.options[1]}</li>
                        <li class="option-item">C) ${q.options[2]}</li><li class="option-item">D) ${q.options[3]}</li>
                    </ul></div>`;
            } else {
                html += `<div class="question-block"><div class="question-header"><div class="q-num">Q${qCounter}.</div><div class="q-text">${q.q}</div><div class="q-marks">${mks}</div></div>
                    <div class="assertion-box"><strong>Assertion (A):</strong> ${q.assertion}<br><br><strong>Reason (R):</strong> ${q.reason}</div></div>`;
            }
            qCounter++;
        });
        html += `</div>`;
    }

    if (parsedQuestionBank.vsas.length > 0) {
        html += `<div id="sec-b" class="exam-section"><div class="section-header"><span class="section-title-text">Section B: Very Short Answer</span></div>`;
        parsedQuestionBank.vsas.forEach(q => {
            let mks = q.marks ? `[${q.marks}]` : '';
            html += `<div class="question-block"><div class="question-header"><div class="q-num">Q${qCounter}.</div><div class="q-text">${q.q}</div><div class="q-marks">${mks}</div></div></div>`;
            qCounter++;
        });
        html += `</div>`;
    }

    if (parsedQuestionBank.sas.length > 0) {
        html += `<div id="sec-c" class="exam-section"><div class="section-header"><span class="section-title-text">Section C: Short Answer</span></div>`;
        parsedQuestionBank.sas.forEach(q => {
            let mks = q.marks ? `[${q.marks}]` : '';
            html += `<div class="question-block"><div class="question-header"><div class="q-num">Q${qCounter}.</div><div class="q-text">${q.q}</div><div class="q-marks">${mks}</div></div></div>`;
            qCounter++;
        });
        html += `</div>`;
    }

    if (parsedQuestionBank.cases.length > 0) {
        html += `<div id="sec-d" class="exam-section"><div class="section-header"><span class="section-title-text">Section D: Case-Based</span></div>`;
        parsedQuestionBank.cases.forEach(cs => {
            html += `<div class="question-block"><div class="question-header"><div class="q-num">Q${qCounter}.</div><div class="q-text">Read the scenario:</div><div class="q-marks"></div></div>
                <div class="assertion-box" style="margin-left:0;">${cs.context}</div><div class="sub-questions">`;
            cs.subs.forEach(sub => {
                let mks = sub.marks ? `[${sub.marks}]` : '';
                html += `<div class="sub-question"><div style="flex:1">${sub.text}</div><div class="q-marks">${mks}</div></div>`;
            });
            html += `</div></div>`;
            qCounter++;
        });
        html += `</div>`;
    }

    document.getElementById('exam-container').innerHTML = html;
}

// --- 6. TIMER & SUBMISSION ---
const motivationEl = document.getElementById('motivation-text');

function updateTimerDisplay() {
    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;
    let finalStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    
    document.getElementById('study-timer').innerText = finalStr;
    document.getElementById('dynamic-mobile-header').setAttribute('data-time-val', finalStr);

    if (timeLeft === 25 * 60) motivationEl.textContent = "Great focus! 🧠";
    else if (timeLeft === 15 * 60) motivationEl.textContent = "Halfway there! ⚡";
    else if (timeLeft === 5 * 60) motivationEl.textContent = "5 Mins left! Wrap up! ⚠️";
    else if (timeLeft <= 60) motivationEl.textContent = "Final minute! 🚨";
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            alert("Time is Up! Your test is being auto-submitted.");
            processSubmission();
        }
    }, 1000);
}

function processSubmission() {
    clearInterval(timerInterval);
    examActive = false; 
    closeConfirmModal();

    let totalSecondsTaken = (30 * 60) - timeLeft;
    let m = Math.floor(totalSecondsTaken / 60);
    let s = totalSecondsTaken % 60;
    let timeTakenStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);

    let studentName = document.getElementById('candidate-name').value.trim() || "Student";
    let feedback = document.getElementById('student-feedback').value.trim() || "-";

    const payload = {
        "Timestamp": new Date().toISOString(),
        "Student Name": studentName,
        "Proctoring": "Active",
        "WarningsActive": tabSwitchCount.toString(),
        "Time Taken": timeTakenStr,
        "Doubt and Feedback": feedback
    };

    const formData = new FormData();
    for (let key in payload) {
        formData.append(key, payload[key]);
    }

    fetch(SUBMIT_API_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors" 
    })
    .then(() => console.log("Test data pushed."))
    .catch(error => console.error("Error submitting test:", error));

    // UI Update: Hide specific items
    document.getElementById('exam-scroll-wrap').style.display = 'none';
    const submitBtn = document.getElementById('submit-test-btn');
    if (submitBtn) submitBtn.style.display = 'none';

    document.getElementById('study-timer').innerText = "Done";
    document.getElementById('dynamic-mobile-header').setAttribute('data-time-val', 'Done');
    document.getElementById('motivation-text').innerText = "";
    
    // Bypass Thank You Message - Show Question Bank directly
    let successScreen = document.getElementById('success-screen');
    successScreen.style.display = 'flex';

    let reviewWrap = document.getElementById('review-wrap');
    reviewWrap.innerHTML = ''; 

    let reviewContainer = document.createElement('div');
    reviewContainer.className = 'test-scroll-container';
    reviewContainer.style.marginTop = '20px';
    reviewContainer.style.marginBottom = '40px';
    reviewContainer.style.textAlign = 'left';
    
    let reviewTitle = document.createElement('h2');
    reviewTitle.innerText = "Question Bank Review";
    reviewTitle.style.textAlign = 'center';
    reviewTitle.style.padding = '20px';
    reviewTitle.style.color = 'var(--primary-blue)';
    reviewTitle.style.borderBottom = '2px dashed var(--bond-border)';
    reviewContainer.appendChild(reviewTitle);

    let originalExam = document.getElementById('exam-container');
    let examClone = originalExam.cloneNode(true);
    
    if (examClone.firstElementChild && examClone.firstElementChild.querySelector('h3')) {
        examClone.firstElementChild.remove();
    }
    
    reviewContainer.appendChild(examClone);
    
    let homeBtn = document.createElement('button');
    homeBtn.className = 'm-btn m-btn-primary';
    homeBtn.style.margin = '20px auto';
    homeBtn.style.width = '200px';
    homeBtn.innerText = 'Return Home';
    homeBtn.onclick = () => window.location.href = HOME_URL;
    
    reviewWrap.appendChild(reviewContainer);
    reviewWrap.appendChild(homeBtn);
}

// --- 7. STRICT SECURITY ---
document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('visibilitychange', () => {
    if (document.hidden && examActive) {
        tabSwitchCount++;
        document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active-modal'));
        document.getElementById('warning-count-display').innerText = `Total Warnings: ${tabSwitchCount}`;
        document.getElementById('modal-container').style.display = 'flex';
        document.getElementById('security-modal').classList.add('active-modal');
    }
});

// --- 8. TRACKING EYES ENGINE ---
function initTrackingEyes() {
    const eyeContainers = document.querySelectorAll('.tracking-eyes-container');
    eyeContainers.forEach(container => {
        const eyes = container.querySelectorAll('.eye-ball');
        const pupils = container.querySelectorAll('.pupil');

        document.addEventListener('mousemove', (e) => {
            eyes.forEach((eye, index) => {
                const pupil = pupils[index];
                if (!pupil) return;
                const rect = eye.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = e.clientX - cx;
                const dy = e.clientY - cy;
                const angle = Math.atan2(dy, dx);
                const maxRadius = (rect.width / 2) - (pupil.offsetWidth / 2) - 1.5;
                const distance = Math.min(Math.hypot(dx, dy) / 10, maxRadius);
                pupil.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
            });
        });

        const blink = () => {
            eyes.forEach(eye => {
                eye.style.transform = 'scaleY(0.06)';
                setTimeout(() => eye.style.transform = 'scaleY(1)', 110);
            });
        };

        const scheduleBlink = () => {
            setTimeout(() => {
                blink();
                scheduleBlink();
            }, 3000 + Math.random() * 4000);
        };
        scheduleBlink();
    });
}