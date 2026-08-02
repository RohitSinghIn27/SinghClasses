document.addEventListener("DOMContentLoaded", () => {
  // Reset scroll position on page load
  window.scrollTo(0, 0);
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) window.scrollTo(0, 0);
  });

  // =======================================
  // MOBILE HAMBURGER MENU CONTROLLER
  // =======================================
  const hamburgerToggle = document.getElementById("hamburgerToggle");
  const navMenu = document.getElementById("nav-menu");

  // Prevent duplicate listener binding if script.js and dashboard.js are both loaded
  if (hamburgerToggle && navMenu && !hamburgerToggle.dataset.navInitialized) {
    hamburgerToggle.dataset.navInitialized = "true";
    hamburgerToggle.classList.add("hamburger-toggle");
    navMenu.classList.add("main-navigation");

    hamburgerToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpening = !hamburgerToggle.classList.contains("open");
      hamburgerToggle.classList.toggle("open", isOpening);
      navMenu.classList.toggle("open", isOpening);
      hamburgerToggle.setAttribute("aria-expanded", isOpening ? "true" : "false");
    });

    // Close menu when clicking any nav link
    document.querySelectorAll(".nav-link, .main-navigation a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburgerToggle.classList.remove("open");
        navMenu.classList.remove("open");
        hamburgerToggle.setAttribute("aria-expanded", "false");
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!hamburgerToggle.contains(e.target) && !navMenu.contains(e.target)) {
        hamburgerToggle.classList.remove("open");
        navMenu.classList.remove("open");
        hamburgerToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // =======================================
  // CURRENT YEAR UPDATE
  // =======================================
  const yr = document.getElementById("current-year");
  if (yr) yr.textContent = new Date().getFullYear();

  // =======================================
  // TESTIMONIAL SLIDER
  // =======================================
  const slides = document.querySelectorAll(".testimonial-slide");
  const track = document.getElementById("testimonialTrack");
  const dotsContainer = document.getElementById("sliderDots");

  if (slides.length && track) {
    let currentIdx = 0;
    let slideInterval = null;

    const updateSliderDOM = () => {
      slides.forEach((slide, idx) => slide.classList.toggle("active", idx === currentIdx));
      const dots = document.querySelectorAll(".slider-dot");
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIdx);
        dot.setAttribute("aria-selected", idx === currentIdx ? "true" : "false");
      });
    };

    const advanceSlide = () => {
      currentIdx = (currentIdx + 1) % slides.length;
      updateSliderDOM();
    };

    const regressSlide = () => {
      currentIdx = (currentIdx - 1 + slides.length) % slides.length;
      updateSliderDOM();
    };

    const startAutoplay = () => {
      slideInterval = setInterval(advanceSlide, 6000);
    };

    const restartAutoplay = () => {
      if (slideInterval) clearInterval(slideInterval);
      startAutoplay();
    };

    const jumpToSlide = (index) => {
      currentIdx = index;
      updateSliderDOM();
      restartAutoplay();
    };

    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      slides.forEach((_, idx) => {
        const dot = document.createElement("button");
        dot.className = "slider-dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Go to testimonial slide ${idx + 1}`);
        dot.setAttribute("aria-selected", idx === 0 ? "true" : "false");
        if (idx === 0) dot.classList.add("active");
        dot.addEventListener("click", () => jumpToSlide(idx));
        dotsContainer.appendChild(dot);
      });
    }

    document.getElementById("nextSlideBtn")?.addEventListener("click", () => {
      advanceSlide();
      restartAutoplay();
    });

    document.getElementById("prevSlideBtn")?.addEventListener("click", () => {
      regressSlide();
      restartAutoplay();
    });

    startAutoplay();
    track.addEventListener("mouseenter", () => clearInterval(slideInterval));
    track.addEventListener("mouseleave", () => startAutoplay());
  }

  // =======================================
  // DYNAMIC FABRIC CANVAS ANIMATION
  // =======================================
  const initDynamicFabric = (target, forceLight = false) => {
    const targetEl = document.querySelector(target);
    if (!targetEl) return;

    let canvas, wrapper;
    if (targetEl.tagName.toLowerCase() === "canvas") {
      canvas = targetEl;
      wrapper = targetEl.parentElement;
    } else {
      wrapper = targetEl;
      canvas = wrapper.querySelector("canvas.sc-canvas-bg, canvas.sc-canvas-bg-layer");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "sc-canvas-bg-layer";
        canvas.style.cssText =
          "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;";
        wrapper.insertBefore(canvas, wrapper.firstChild);
      }
    }

    if (window.getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }

    const ctx = canvas.getContext("2d");
    let w = 0,
      h = 0,
      dots = [],
      cursor = { x: -2000, y: -2000 };

    const resizeCanvas = () => {
      w = canvas.width = wrapper.offsetWidth || wrapper.clientWidth;
      h = canvas.height = wrapper.offsetHeight || wrapper.clientHeight;
      dots = [];
      if (w > 0 && h > 0) {
        const density = Math.min(Math.floor((w * h) / 30000), 20) || 15;
        for (let i = 0; i < density; i++) {
          dots.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            r: Math.random() * 0.8 + 0.3
          });
        }
      }
    };

    new ResizeObserver(resizeCanvas).observe(wrapper);

    wrapper.addEventListener("mousemove", (e) => {
      const box = wrapper.getBoundingClientRect();
      cursor.x = e.clientX - box.left;
      cursor.y = e.clientY - box.top;
    });
    wrapper.addEventListener("mouseleave", () => (cursor.x = cursor.y = -2000));

    const runLoop = () => {
      if (!w || !h) return requestAnimationFrame(runLoop);
      ctx.clearRect(0, 0, w, h);

      const cBase = forceLight ? "rgba(13,148,136,0.20)" : "rgba(13,148,136,0.35)";
      const cLink = forceLight ? "rgba(13,148,136,0.08)" : "rgba(13,148,136,0.12)";
      const cHigh = forceLight ? "rgba(13,148,136,0.80)" : "rgba(13,148,136,0.95)";

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if ((dots[i].x - dots[j].x) ** 2 + (dots[i].y - dots[j].y) ** 2 < 6400) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = cLink;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      dots.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2,
          size = p.r,
          color = cBase;

        if (cDist < 16900) {
          size = p.r + (1 - Math.sqrt(cDist) / 130) * 3;
          color = cHigh;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.strokeStyle = cLink;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      requestAnimationFrame(runLoop);
    };

    runLoop();
  };

  const canvasTargets = [
    ".header-container",
    ".sc-hero-box",
    "#scHeroTop",
    "#scParticleCanvas1",
    "#scParticleCanvas2",
    "#canvasA",
    "#canvasB",
    "#canvasC",
    "#canvasBottom",
    ".classes-section",
    ".playlists-section",
    ".results-section",
    ".sc-subscribe-banner-green",
    "#scSubscribeBanner"
  ];

  canvasTargets.forEach((target) => initDynamicFabric(target, false));
  initDynamicFabric(".teacher-section", true);

  // =======================================
  // FLOATING HUD ACTIONS & DARK MODE
  // =======================================
  const themeBtn = document.querySelector(".theme-toggle-btn") || document.getElementById("scDarkModeBtn");
  const shareBtn = document.querySelector(".share-action-btn") || document.getElementById("scShareBtn");
  const scrollTopBtn = document.querySelector(".scroll-top-btn") || document.getElementById("scScrollToggleBtn");

  if (localStorage.getItem("sc-theme") === "dark") {
    document.body.classList.add("dark-mode");
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      localStorage.setItem("sc-theme", isDark ? "dark" : "light");
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: window.location.href });
        } catch (err) {
          if (err.name !== "AbortError") console.log("Share failed:", err);
        }
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert("URL copied to clipboard!"))
          .catch(() => {});
      }
    });
  }

  if (scrollTopBtn) {
    const checkScroll = () => {
      if (window.scrollY > 150) {
        scrollTopBtn.classList.remove("sc-point-down");
      } else {
        scrollTopBtn.classList.add("sc-point-down");
      }
    };

    window.addEventListener("scroll", checkScroll);
    checkScroll();

    scrollTopBtn.addEventListener("click", () => {
      if (window.scrollY > 150) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    });
  }
});

// =======================================
// CBSE RESULTS WIDGET
// =======================================
(function () {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbx_qbyL831Rtr-dG5mNLRYz5LajWvVtgSv4xBO9pWX2TAZ74qNWf33Bdf1NtivHyfM8/exec";

  function initCbseWidget() {
    fetchGoogleSheetData();
  }

  async function fetchGoogleSheetData() {
    const track = document.getElementById("cbseSliderTrack");
    if (!track) return;

    if (API_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") {
      track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:#ef4444; animation:none;">Please replace API_URL with your Web App URL.</div></div>`;
      return;
    }

    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      buildSlides(data);
    } catch (error) {
      console.error("Error fetching CBSE data:", error);
      track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:#ef4444; animation:none;">Error loading data. Check console.</div></div>`;
    }
  }

  function buildSlides(studentData) {
    const track = document.getElementById("cbseSliderTrack");
    if (!track) return;

    track.innerHTML = "";
    studentData.forEach((student, index) => {
      const picKey =
        Object.keys(student).find((key) => key.toLowerCase().includes("picture")) || "CandidatePicture";
      let rawPic = student[picKey] || "";
      rawPic = rawPic.replace(/['"“”\n\r]/g, "").trim();
      const isLocalAsset = rawPic.includes("assets/");
      const isSupportedUrl = isLocalAsset || rawPic.startsWith("http");
      const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        student.Name || "Student"
      )}&background=ffffff&color=584ddb&size=150`;
      const finalImageSrc = isSupportedUrl ? rawPic : fallbackAvatar;
      const crossOriginPolicy = isLocalAsset ? "" : 'crossorigin="anonymous"';
      const marksNum = parseInt(student.Marks) || 0;

      const slideHTML = `<div class="slide-wrapper ${index === 0 ? "active" : ""}"><div class="report-card"><div class="main-content"><div class="profile-card"><div class="avatar-wrap"><div class="avatar-arc"></div><img src="${finalImageSrc}" alt="Candidate Picture" class="avatar-img" ${crossOriginPolicy} onerror="this.onerror=null; this.src='${fallbackAvatar}';"></div><h2 class="profile-name">${student.Name || "--"}</h2><div class="profile-pill">${student.Batch || "--"}</div></div><div class="right-col"><div class="stats-grid"><div class="stat-box"><div class="icon-box icon-blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3" ry="3"></rect><circle cx="12" cy="10" r="2"></circle><line x1="9" y1="15" x2="15" y2="15"></line></svg></div><div class="stat-details"><div class="stat-title">Roll Number</div><div class="stat-val">${student.RollNumber || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" ry="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg></div><div class="stat-details"><div class="stat-title">Subject</div><div class="stat-val">${student.Subject || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 10"></path><path d="M14 4H10"></path><path d="M4 12V22"></path><path d="M20 12V22"></path><rect x="8" y="10" width="8" height="12"></rect><rect x="2" y="14" width="6" height="8"></rect><rect x="16" y="14" width="6" height="8"></rect><path d="M10 22V18h4v4"></path></svg></div><div class="stat-details"><div class="stat-title">School</div><div class="stat-val">${student.School || "--"}</div></div></div><div class="stat-box"><div class="icon-box icon-yellow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg></div><div class="stat-details"><div class="stat-title">Mode of Class</div><div class="mode-toggles">${(student.Mode || "").toLowerCase() === "online" ? `<span class="mode-inactive">Offline</span><span class="mode-active"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Online</span>` : `<span class="mode-active"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Offline</span><span class="mode-inactive">Online</span>`}</div></div></div></div><div class="score-card"><div class="donut-chart" data-score="${marksNum}"><div class="donut-inner"><span class="score-num">0</span></div></div><div class="score-details"><div class="score-title">Marks Obtained out of 100</div><div class="score-grade">--</div><div class="progress-track"><div class="progress-fill"></div></div></div></div></div></div><div class="testimonial-unit"><div class="test-content"><div class="test-avatar">${student.Tname || "--"}</div><div class="test-body-wrap"><div class="quote-mark quote-mark-open">"</div><p class="test-text">${student.Testimonial || "--"}</p><div class="quote-mark quote-mark-close">"</div></div></div></div></div></div>`;
      track.innerHTML += slideHTML;
    });

    setTimeout(() => {
      initializeAllScores();
      initReportSlider();
    }, 100);
  }

  function initializeAllScores() {
    document.querySelectorAll("#cbse-results-widget .slide-wrapper").forEach((wrapper) => {
      const donutChart = wrapper.querySelector(".donut-chart");
      if (!donutChart) return;
      let marks = parseInt(donutChart.getAttribute("data-score"), 10) || 0;
      marks = Math.max(0, Math.min(100, marks));
      let gradeText = "",
        colorHex = "";
      if (marks >= 90) {
        gradeText = "A+ Grade";
        colorHex = "#16a34a";
      } else if (marks >= 80) {
        gradeText = "A Grade";
        colorHex = "#2563eb";
      } else if (marks >= 70) {
        gradeText = "B+ Grade";
        colorHex = "#ca8a04";
      } else if (marks >= 60) {
        gradeText = "B Grade";
        colorHex = "#ea580c";
      } else {
        gradeText = "C Grade";
        colorHex = "#dc2626";
      }

      const scoreNumEl = wrapper.querySelector(".score-num");
      const scoreGradeEl = wrapper.querySelector(".score-grade");
      if (scoreNumEl) {
        scoreNumEl.innerText = marks;
        scoreNumEl.style.color = colorHex;
      }
      if (scoreGradeEl) {
        scoreGradeEl.innerText = gradeText;
      }

      setTimeout(() => {
        donutChart.style.background = `conic-gradient(${colorHex} 0% ${marks}%, var(--border-color) ${marks}% 100%)`;
        const progressBar = wrapper.querySelector(".progress-fill");
        if (progressBar) {
          progressBar.style.width = `${marks}%`;
          progressBar.style.backgroundColor = colorHex;
        }
      }, 50);
    });
  }

  function initReportSlider() {
    const track = document.getElementById("cbseSliderTrack");
    const slides = document.querySelectorAll("#cbse-results-widget .slide-wrapper");
    const dotsContainer = document.getElementById("cbseDotsContainer");

    if (!dotsContainer || !track) return;

    dotsContainer.innerHTML = "";
    if (slides.length <= 1) return;

    let currentIndex = 0,
      slideInterval;

    dotsContainer.innerHTML = `<button class="slider-arrow prev-arrow" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button><div class="slider-dots-line-wrapper"><div class="slider-dots-line"></div><div class="slider-dots-inner"></div></div><button class="slider-arrow next-arrow" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;

    const innerDots = dotsContainer.querySelector(".slider-dots-inner");
    if (!innerDots) return;

    slides.forEach((_, index) => {
      const dot = document.createElement("div");
      dot.classList.add("slider-dot");
      if (index === 0) dot.classList.add("active");
      dot.addEventListener("click", () => {
        goToSlide(index);
        resetInterval();
      });
      innerDots.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll(".slider-dot");
    const prevBtn = dotsContainer.querySelector(".prev-arrow");
    const nextBtn = dotsContainer.querySelector(".next-arrow");

    function goToSlide(index) {
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((s) => s.classList.remove("active"));
      dots.forEach((d) => d.classList.remove("active"));
      slides[index].classList.add("active");
      dots[index].classList.add("active");
      currentIndex = index;
    }

    function nextSlide() {
      goToSlide((currentIndex + 1) % slides.length);
    }

    function prevSlide() {
      goToSlide((currentIndex - 1 + slides.length) % slides.length);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        prevSlide();
        resetInterval();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        nextSlide();
        resetInterval();
      });
    }

    function startInterval() {
      slideInterval = setInterval(nextSlide, 6000);
    }

    function resetInterval() {
      clearInterval(slideInterval);
      startInterval();
    }

    startInterval();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCbseWidget);
  } else {
    initCbseWidget();
  }
})();

// =======================================
// PAGE PROTECTION & UTILITIES
// =======================================

// Disable context menu
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

// Blur page content when window loses focus
window.addEventListener("blur", () => {
  document.body.style.filter = "blur(15px)";
});

window.addEventListener("focus", () => {
  document.body.style.filter = "none";
});

// Clear clipboard on PrintScreen release
window.addEventListener("keyup", (e) => {
  if (e.key === "PrintScreen") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("").catch(() => {});
    }
    alert("Screenshots are disabled to protect proprietary content.");
  }
});