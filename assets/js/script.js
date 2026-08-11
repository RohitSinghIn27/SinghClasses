document.addEventListener('DOMContentLoaded', function() {
  // Respect user motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const TRIGGER_KEYWORD = 'lift'; // Keyword to trigger scrolling
  const SCROLL_SPEED = 1.2;       // Movement speed in pixels per frame
  const PAUSE_AT_BOTTOM = 1200;   // Pause duration at bottom before returning (ms)

  let typedBuffer = '';
  let scrollAnimationFrame = null;
  let isAutoScrolling = false;
  let direction = 'down';
  let measuredMaxScroll = 0;

  // 1. Capture keystrokes to detect when the user types "lift"
  document.addEventListener('keydown', function(e) {
    // Ignore keystrokes inside text inputs or editable areas
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
      return;
    }

    // Stop scrolling if the user presses any key while auto-scrolling
    if (isAutoScrolling) {
      stopAutoScroll();
      return;
    }

    // Append standard character keys to buffer
    if (e.key.length === 1) {
      typedBuffer += e.key.toLowerCase();
      
      // Limit buffer size to last 10 characters
      if (typedBuffer.length > 10) {
        typedBuffer = typedBuffer.slice(-10);
      }

      // Check if the typed sequence ends with "lift"
      if (typedBuffer.endsWith(TRIGGER_KEYWORD)) {
        typedBuffer = ''; // Reset buffer
        initiateLiftScroll();
      }
    }
  });

  // 2. Measure page height before any movement starts
  function measurePageHeight() {
    const totalContentHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const maxScrollablePixels = totalContentHeight - viewportHeight;

    console.log(`[Height Pre-Measurement] Content: ${totalContentHeight}px, Viewport: ${viewportHeight}px, Max Scroll: ${maxScrollablePixels}px`);
    return maxScrollablePixels;
  }

  // 3. Smooth animation step loop
  function autoScrollStep() {
    // Immediately stop if animation was cancelled or tab became hidden
    if (!isAutoScrolling || document.hidden) {
      stopAutoScroll();
      return;
    }

    const currentScroll = window.scrollY;

    if (direction === 'down') {
      if (currentScroll < measuredMaxScroll - 1) {
        window.scrollBy(0, SCROLL_SPEED);
        scrollAnimationFrame = requestAnimationFrame(autoScrollStep);
      } else {
        // Reached bottom: pause then reverse direction
        direction = 'up';
        setTimeout(() => {
          if (isAutoScrolling && !document.hidden) {
            scrollAnimationFrame = requestAnimationFrame(autoScrollStep);
          }
        }, PAUSE_AT_BOTTOM);
      }
    } else if (direction === 'up') {
      if (currentScroll > 1) {
        window.scrollBy(0, -SCROLL_SPEED);
        scrollAnimationFrame = requestAnimationFrame(autoScrollStep);
      } else {
        // Returned to top: complete the cycle
        stopAutoScroll();
      }
    }
  }

  // 4. Trigger scrolling procedure
  function initiateLiftScroll() {
    // Do not run if the tab is hidden
    if (document.hidden) return;

    // Measure page height before movement
    measuredMaxScroll = measurePageHeight();

    // Do not scroll if content fits entirely within screen
    if (measuredMaxScroll <= 10) return;

    isAutoScrolling = true;
    direction = 'down';
    scrollAnimationFrame = requestAnimationFrame(autoScrollStep);
  }

  // 5. Halt scrolling animation
  function stopAutoScroll() {
    isAutoScrolling = false;
    if (scrollAnimationFrame) {
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = null;
    }
  }

  // Interrupt scrolling if the user manually uses mouse or touch
  const interruptionEvents = ['mousedown', 'wheel', 'touchstart', 'click'];
  interruptionEvents.forEach(evt => {
    window.addEventListener(evt, () => {
      if (isAutoScrolling) {
        stopAutoScroll();
      }
    }, { passive: true });
  });

  // Handle Tab Visibility (Stop instantly when switching tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoScroll();
    }
  });
});

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

  // 5. DYNAMIC FABRIC CANVAS BACKGROUND (EXCLUDED NAV CONTAINER & REDUCED PARTICLE COUNT)
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
    const track = document.getElementById("cbseSliderTrack"); track.innerHTML = "";
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
