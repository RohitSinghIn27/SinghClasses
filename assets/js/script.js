document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  window.addEventListener("pageshow", () => window.scrollTo(0, 0));

  // 1. COMPLETE RIGHT CLICK DISABLE & STRICT IMAGE-ONLY BLUR PROTECTION
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  const blurImages = () => document.querySelectorAll("img").forEach((i) => i.classList.add("img-blur-protected"));
  const unblurImages = () => document.querySelectorAll("img").forEach((i) => i.classList.remove("img-blur-protected"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "PrintScreen" || (e.ctrlKey && ["c", "p", "s", "u", "i", "j"].includes(e.key.toLowerCase())) || (e.metaKey && ["c", "p", "s", "u", "i", "j"].includes(e.key.toLowerCase()))) {
      blurImages();
      if (e.key === "PrintScreen") { navigator.clipboard?.writeText(""); setTimeout(unblurImages, 3000); }
    }
  });
  document.addEventListener("keyup", (e) => { if (e.key === "PrintScreen") blurImages(); });
  document.addEventListener("copy", blurImages);
  window.addEventListener("blur", blurImages);
  window.addEventListener("focus", unblurImages);
  document.addEventListener("visibilitychange", () => { if (document.hidden) blurImages(); else unblurImages(); });

  // 2. CURSOR SPARKLE TRAIL
  (function initCursorSparkles() {
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth), h = (canvas.height = window.innerHeight);
    window.addEventListener("resize", () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
    const particles = [], colors = ["#e04d2d", "#f2b824", "#ffffff", "#13386b"];
    let lastX = 0, lastY = 0;
    
    window.addEventListener("mousemove", (e) => {
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 6) {
        for (let i = 0, count = Math.random() < 0.4 ? 2 : 1; i < count; i++) {
          particles.push({ x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 - 0.3, size: Math.random() * 2.2 + 1, color: colors[Math.floor(Math.random() * colors.length)], alpha: 1, decay: Math.random() * 0.02 + 0.015, rotation: Math.random() * Math.PI, vRot: (Math.random() - 0.5) * 0.1 });
        }
        lastX = e.clientX; lastY = e.clientY;
      }
    });

    function drawStar(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.lineTo(Math.cos((i * Math.PI) / 2) * p.size, Math.sin((i * Math.PI) / 2) * p.size); ctx.quadraticCurveTo(0, 0, Math.cos(((i + 1) * Math.PI) / 2) * p.size * 0.3, Math.sin(((i + 1) * Math.PI) / 2) * p.size * 0.3); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    (function animate() {
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; p.rotation += p.vRot;
        if (p.alpha <= 0) particles.splice(i, 1); else drawStar(p);
      }
      requestAnimationFrame(animate);
    })();
  })();

  // 3. NAVIGATION & HAMBURGER MENU
  const hamburgerToggle = document.getElementById("hamburgerToggle"), navMenu = document.getElementById("nav-menu");
  if (hamburgerToggle && navMenu) {
    const toggleMenu = (state) => {
      const isOpen = state !== undefined ? state : !navMenu.classList.contains("open");
      hamburgerToggle.classList.toggle("open", isOpen); navMenu.classList.toggle("open", isOpen);
      hamburgerToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };
    hamburgerToggle.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
    document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => toggleMenu(false)));
    document.addEventListener("click", (e) => { if (!hamburgerToggle.contains(e.target) && !navMenu.contains(e.target)) toggleMenu(false); });
  }

  // 4. DYNAMIC YEAR
  const currentYearElem = document.getElementById("current-year");
  if (currentYearElem) currentYearElem.textContent = new Date().getFullYear();

  // 5. DYNAMIC FABRIC CANVAS BACKGROUND
  const initDynamicFabric = (selector) => {
    const wrapper = document.querySelector(selector); if (!wrapper) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    wrapper.insertBefore(canvas, wrapper.firstChild);
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dots = [], cursor = { x: -2000, y: -2000 };

    new ResizeObserver(() => {
      w = canvas.width = wrapper.offsetWidth; h = canvas.height = wrapper.offsetHeight; dots = [];
      for (let i = 0, density = Math.min(Math.floor((w * h) / 60000), 8) || 5; i < density; i++) {
        dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: Math.random() * 0.8 + 0.3 });
      }
    }).observe(wrapper);

    wrapper.addEventListener("mousemove", (e) => { const box = wrapper.getBoundingClientRect(); cursor.x = e.clientX - box.left; cursor.y = e.clientY - box.top; });
    wrapper.addEventListener("mouseleave", () => (cursor.x = cursor.y = -2000));

    (function loop() {
      if (!w || !h) return requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if ((dots[i].x - dots[j].x) ** 2 + (dots[i].y - dots[j].y) ** 2 < 6400) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.strokeStyle = "rgba(224,77,45,0.12)"; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      dots.forEach((p) => {
        p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
        const cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2;
        let size = p.r, color = "rgba(224,77,45,0.35)";
        if (cDist < 16900) {
          size = p.r + (1 - Math.sqrt(cDist) / 130) * 3; color = "rgba(224,77,45,0.95)";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cursor.x, cursor.y); ctx.strokeStyle = "rgba(224,77,45,0.25)"; ctx.lineWidth = 1.1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      });
      requestAnimationFrame(loop);
    })();
  };
  [".classes-section", ".playlists-section", ".results-section", ".teacher-section"].forEach(initDynamicFabric);
});

// 6. CBSE RESULT WIDGET API FETCH & SLIDER
(function () {
  const API_URL = "https://script.google.com/macros/s/AKfycbx_qbyL831Rtr-dG5mNLRYz5LajWvVtgSv4xBO9pWX2TAZ74qNWf33Bdf1NtivHyfM8/exec";
  
  async function fetchGoogleSheetData() {
    const track = document.getElementById("cbseSliderTrack"); if (!track) return;
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      buildSlides(data);
    } catch {
      track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:#ef4444;">Error loading data.</div></div>`;
    }
  }

  function buildSlides(studentData) {
    const track = document.getElementById("cbseSliderTrack"); 
    if (!track) return;
    track.innerHTML = "";
    studentData.forEach((student, index) => {
      const picKey = Object.keys(student).find((k) => k.toLowerCase().includes("picture")) || "CandidatePicture";
      const rawPic = (student[picKey] || "").replace(/['"“”\n\r]/g, "").trim();
      const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.Name || "Student")}&background=e04d2d&color=ffffff&size=150`;
      const finalImageSrc = rawPic.includes("assets/") || rawPic.startsWith("http") ? rawPic : fallbackAvatar;
      const marksNum = parseInt(student.Marks, 10) || 0;
      const isOnline = (student.Mode || "").toLowerCase() === "online";

      track.innerHTML += `<div class="slide-wrapper ${index === 0 ? "active" : ""}"><div class="report-card"><div class="main-content"><div class="profile-card"><div class="avatar-wrap"><img src="${finalImageSrc}" alt="Candidate Picture" class="avatar-img" onerror="this.onerror=null; this.src='${fallbackAvatar}';"></div><h2 class="profile-name">${student.Name || "--"}</h2><div class="profile-pill">${student.Batch || "--"}</div></div><div class="right-col"><div class="stats-grid"><div class="stat-box"><div class="icon-box icon-blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="3"></rect><circle cx="12" cy="10" r="2"></circle><line x1="9" y1="15" x2="15" y2="15"></line></svg></div><div class="stat-details"><div class="stat-title">Roll Number</div><div class="stat-val">${student.RollNumber || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg></div><div class="stat-details"><div class="stat-title">Subject</div><div class="stat-val">${student.Subject || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8"></path><rect x="8" y="10" width="8" height="12"></rect></svg></div><div class="stat-details"><div class="stat-title">School</div><div class="stat-val">${student.School || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-yellow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg></div><div class="stat-details"><div class="stat-title">Mode</div><div class="mode-toggles"><span class="${isOnline ? "mode-inactive" : "mode-active"}">Offline</span><span class="${isOnline ? "mode-active" : "mode-inactive"}">Online</span></div></div></div></div><div class="score-card"><div class="donut-chart" data-score="${marksNum}"><div class="donut-inner"><span class="score-num">0</span></div></div><div class="score-details"><div class="score-title">Marks Obtained out of 100</div><div class="score-grade">--</div><div class="progress-track"><div class="progress-fill"></div></div></div></div></div></div><div class="testimonial-unit"><div class="test-content"><div class="test-avatar">${student.Tname || "--"}</div><div class="test-body-wrap"><div class="quote-mark">"</div><p class="test-text">${student.Testimonial || "--"}</p><div class="quote-mark">"</div></div></div></div></div></div>`;
    });
    setTimeout(() => { initializeAllScores(); initReportSlider(); }, 100);
  }

  function initializeAllScores() {
    document.querySelectorAll("#cbse-results-widget .slide-wrapper").forEach((wrapper) => {
      const donutChart = wrapper.querySelector(".donut-chart"); if (!donutChart) return;
      const marks = Math.max(0, Math.min(100, parseInt(donutChart.getAttribute("data-score"), 10) || 0));
      const gradeText = marks >= 90 ? "A+ Grade" : marks >= 80 ? "A Grade" : marks >= 70 ? "B+ Grade" : marks >= 60 ? "B Grade" : "C Grade";
      const colorHex = marks >= 90 ? "#e04d2d" : marks >= 80 ? "#13386b" : marks >= 70 ? "#f2b824" : "#525b68";
      const scoreNum = wrapper.querySelector(".score-num"), progressBar = wrapper.querySelector(".progress-fill");
      
      scoreNum.innerText = marks; scoreNum.style.color = colorHex; wrapper.querySelector(".score-grade").innerText = gradeText;
      setTimeout(() => {
        donutChart.style.background = `conic-gradient(${colorHex} 0% ${marks}%, var(--border-color) ${marks}% 100%)`;
        progressBar.style.width = `${marks}%`; progressBar.style.backgroundColor = colorHex;
      }, 50);
    });
  }

  function initReportSlider() {
    const track = document.getElementById("cbseSliderTrack"), slides = document.querySelectorAll("#cbse-results-widget .slide-wrapper"), dotsContainer = document.getElementById("cbseDotsContainer");
    if (!dotsContainer || !track) return;
    dotsContainer.innerHTML = ""; if (slides.length <= 1) return;
    let currentIndex = 0, slideInterval;
    
    dotsContainer.innerHTML = `<button class="slider-arrow prev-arrow" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button><div class="slider-dots-line-wrapper"><div class="slider-dots-line"></div><div class="slider-dots-inner"></div></div><button class="slider-arrow next-arrow" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
    const innerDots = dotsContainer.querySelector(".slider-dots-inner");
    
    slides.forEach((_, index) => {
      const dot = document.createElement("div"); dot.classList.add("slider-dot"); if (index === 0) dot.classList.add("active");
      dot.addEventListener("click", () => { goToSlide(index); resetInterval(); });
      innerDots.appendChild(dot);
    });
    
    const dots = dotsContainer.querySelectorAll(".slider-dot");
    function goToSlide(index) {
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((s) => s.classList.remove("active")); dots.forEach((d) => d.classList.remove("active"));
      slides[index].classList.add("active"); dots[index].classList.add("active"); currentIndex = index;
    }

    dotsContainer.querySelector(".prev-arrow").addEventListener("click", () => { goToSlide((currentIndex - 1 + slides.length) % slides.length); resetInterval(); });
    dotsContainer.querySelector(".next-arrow").addEventListener("click", () => { goToSlide((currentIndex + 1) % slides.length); resetInterval(); });
    
    function startInterval() { slideInterval = setInterval(() => goToSlide((currentIndex + 1) % slides.length), 6000); }
    function resetInterval() { clearInterval(slideInterval); startInterval(); }
    startInterval();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);
  else fetchGoogleSheetData();
})();

// 7. YOUTUBE & GOOGLE REVIEWS TESTIMONIAL MODULE
(function initReviewsModule() {
  const APPS_SCRIPT_BASE_URL = "https://script.google.com/macros/s/AKfycbwFiDDgh-1rIDD0Ba-uzVjsMYKnKxR-3b44vxKe-kUOaUo8-Js68WvMMZd7uII3u9Ze4g/exec";
  const TOTAL_SLOTS = 8;
  let grid, filterButtons;

  let rawCommentsData = [];
  let currentFilter = 'all';
  let currentFilteredPool = [];
  let activeSlots = [];
  let isHovered = new Array(TOTAL_SLOTS).fill(false);
  let rotationIntervalId = null;
  let recentSlotHistory = [];

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function calculateRelativeTime(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();

    let targetDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-');
      targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      targetDate = new Date(str);
    }

    if (isNaN(targetDate.getTime())) return str;

    const now = new Date();
    const diffMs = now.getTime() - targetDate.getTime();
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffDays === 0) {
      if (diffHr < 1) return diffMin < 1 ? 'just now' : `${diffMin}m ago`;
      return `${diffHr}h ago`;
    }
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 5) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
  }

  function normalizeCategory(cat) {
    if (!cat) return 'class12';
    const clean = String(cat).toLowerCase().replace(/[\s\-_]/g, '');

    if (clean.includes('google')) return 'google_review';
    if (clean.includes('12') || clean.includes('classxii') || clean === 'xii') return 'class12';
    if (clean.includes('11') || clean.includes('classxi') || clean === 'xi') return 'class11';
    if (clean.includes('cuet')) return 'cuet';
    if (clean.includes('high') || clean.includes('college') || clean.includes('btech') || clean.includes('bca') || clean.includes('web')) return 'higher_ed';

    return clean;
  }

  function processIncomingData(items) {
    return items.map(item => {
      const rawName = String(item.name || '').trim();
      const rawInitials = String(item.initials || '').trim() || 
        (rawName ? rawName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US');
      
      const rawDate = item.time || item.date || '';
      const rawCat = item.category || '';
      const rawVideo = String(item.video || 'Computer Science Lecture').trim();
      const rawText = String(item.text || '').trim();

      return {
        name: rawName,
        initials: rawInitials,
        formattedTime: calculateRelativeTime(rawDate),
        category: normalizeCategory(rawCat),
        video: rawVideo,
        text: rawText
      };
    }).filter(item => item.name && item.text);
  }

  function applyFilter(category) {
    let pool = [];
    if (category === 'all') {
      pool = [...rawCommentsData];
    } else {
      pool = rawCommentsData.filter(c => c.category === category);
    }

    currentFilteredPool = shuffle(pool);
    recentSlotHistory = [];
    renderGrid();
    restartRotator();
  }

  function renderCardContent(item, isYellow) {
    const avatarClass = isYellow ? 'avatar-yellow-card' : 'avatar-white-card';
    const pillClass = isYellow ? 'pill-yellow-card' : 'pill-white-card';
    const timeClass = isYellow ? 'time-yellow-card' : 'time-white-card';
    const commentClass = isYellow ? 'comment-yellow-card' : 'comment-white-card';

    const isGoogleReview = item.category === 'google_review';

    const iconSvg = isGoogleReview 
      ? `<div style="width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,0.9); box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 1.5px;">
          <svg style="width: 100%; height: 100%;" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
        </div>`
      : `<div style="width: 14px; height: 14px; border-radius: 4px; background: rgba(220, 38, 38, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg style="width: 10px; height: 10px; color: #dc2626; fill: currentColor;" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>`;

    return `
      <div class="review-card-top">
        <div class="review-avatar ${avatarClass}">
          ${item.initials}
        </div>
        <div class="review-user-info">
          <div class="review-user-row">
            <span class="review-user-name">${item.name}</span>
            <span class="review-time ${timeClass}">${item.formattedTime}</span>
          </div>
          <div class="review-source-pill ${pillClass}">
            ${iconSvg}
            <span class="review-source-title">${item.video}</span>
          </div>
        </div>
      </div>
      <p class="review-comment-body ${commentClass}">
        "${item.text}"
      </p>
    `;
  }

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = '';
    activeSlots = [];

    if (currentFilteredPool.length === 0) {
      grid.innerHTML = `
        <div class="reviews-error-state">
          No testimonials available for this category yet.
        </div>
      `;
      return;
    }

    const slotCount = Math.min(TOTAL_SLOTS, currentFilteredPool.length);

    for (let i = 0; i < slotCount; i++) {
      const item = currentFilteredPool[i];
      activeSlots.push(item);

      const isYellow = (Math.floor(i / 4) + (i % 4)) % 2 === 0;
      const themeClass = isYellow ? 'theme-yellow' : 'theme-white';

      const cardElem = document.createElement('div');
      cardElem.className = `review-card ${themeClass}`;
      cardElem.id = `review-slot-${i}`;
      cardElem.innerHTML = renderCardContent(item, isYellow);

      cardElem.addEventListener('click', () => {
        cardElem.classList.toggle('is-expanded');
      });

      cardElem.addEventListener('mouseenter', () => { isHovered[i] = true; });
      cardElem.addEventListener('mouseleave', () => { isHovered[i] = false; });

      grid.appendChild(cardElem);
    }
  }

  function cycleSingleCard() {
    if (currentFilteredPool.length <= activeSlots.length) return;

    const slotCount = activeSlots.length;
    const eligibleSlots = [];

    for (let i = 0; i < slotCount; i++) {
      const cardElem = document.getElementById(`review-slot-${i}`);
      if (cardElem && !isHovered[i] && !cardElem.classList.contains('is-expanded')) {
        if (!recentSlotHistory.includes(i)) {
          eligibleSlots.push(i);
        }
      }
    }

    const slotCandidates = eligibleSlots.length > 0 ? eligibleSlots : Array.from({length: slotCount}, (_, i) => i);
    const chosenSlotIndex = slotCandidates[Math.floor(Math.random() * slotCandidates.length)];

    recentSlotHistory.push(chosenSlotIndex);
    if (recentSlotHistory.length > Math.floor(slotCount / 2)) {
      recentSlotHistory.shift();
    }

    const availableItems = currentFilteredPool.filter(poolItem => 
      !activeSlots.some(active => active.name === poolItem.name && active.video === poolItem.video)
    );

    if (availableItems.length === 0) return;

    const newItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    const card = document.getElementById(`review-slot-${chosenSlotIndex}`);
    if (!card) return;

    const isYellow = (Math.floor(chosenSlotIndex / 4) + (chosenSlotIndex % 4)) % 2 === 0;

    card.style.opacity = '0';
    card.style.transform = 'scale(0.97) translateY(2px)';

    setTimeout(() => {
      activeSlots[chosenSlotIndex] = newItem;
      card.innerHTML = renderCardContent(newItem, isYellow);

      card.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';

      card.classList.remove('shimmer-active');
      void card.offsetWidth;
      card.classList.add('shimmer-active');

      setTimeout(() => {
        card.classList.remove('shimmer-active');
      }, 900);
    }, 350);
  }

  function restartRotator() {
    if (rotationIntervalId) clearInterval(rotationIntervalId);
    if (currentFilteredPool.length > TOTAL_SLOTS) {
      rotationIntervalId = setInterval(cycleSingleCard, 4200);
    }
  }

  function showErrorMessage() {
    if (rotationIntervalId) clearInterval(rotationIntervalId);
    if (!grid) return;
    grid.innerHTML = `
      <div class="reviews-error-state" style="flex-direction: column;">
        <svg style="width: 32px; height: 32px; color: rgba(217, 119, 6, 0.8); margin-bottom: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p style="font-weight: 700; color: #374151;">Currently unable to fetch reviews.</p>
        <p style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Please check back in a moment.</p>
      </div>
    `;
  }

  // JSONP Global Callback Function
  window.handleSheetReviews = function(json) {
    if (json && json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
      rawCommentsData = processIncomingData(json.data);
      applyFilter('all');
    } else {
      showErrorMessage();
    }
  };

  function loadTestimonials() {
    grid = document.getElementById('reviewsGrid');
    filterButtons = document.querySelectorAll('.reviews-filter-btn');

    if (!grid) return;

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (rawCommentsData.length === 0) return;
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.category;
        applyFilter(currentFilter);
      });
    });

    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_BASE_URL}?callback=handleSheetReviews&_t=${Date.now()}`;
    script.onerror = function() {
      showErrorMessage();
    };
    document.body.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadTestimonials);
  } else {
    loadTestimonials();
  }
})();