document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  window.addEventListener("pageshow", () => window.scrollTo(0, 0));

  // 1. IMAGE PROTECTION & SCREENSHOT DEFENSE
  const toggleImgBlur = (blur) => {
    document.querySelectorAll("img").forEach((i) => i.classList.toggle("img-blur-protected", blur));
  };

  // Prevent right-click context menu on images and UI (except contact details)
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".selectable-contact")) return;
    e.preventDefault();
  });

  // Anti-Screenshot & Shortcut Protection
  document.addEventListener("keydown", (e) => {
    // PrintScreen trigger
    if (e.key === "PrintScreen") {
      toggleImgBlur(true);
      navigator.clipboard?.writeText("");
      setTimeout(() => toggleImgBlur(false), 2500);
      return;
    }

    // Common inspection, save, and print shortcuts (Ctrl/Cmd + P, S, U, I, J)
    if ((e.ctrlKey || e.metaKey) && ["p", "s", "u", "i", "j"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      toggleImgBlur(true);
      setTimeout(() => toggleImgBlur(false), 2000);
      return;
    }

    // Selective Copy: Allow only phone, email, or address
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      const sel = window.getSelection();
      const anchorNode = sel?.anchorNode;
      const parent = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
      if (!parent?.closest(".selectable-contact")) {
        e.preventDefault();
        toggleImgBlur(true);
        setTimeout(() => toggleImgBlur(false), 1500);
      }
    }
  });

  // Windows PrintScreen keyup fallback (in case keydown is consumed by the OS)
  window.addEventListener("keyup", (e) => {
    if (e.key === "PrintScreen") {
      toggleImgBlur(true);
      navigator.clipboard?.writeText("");
      setTimeout(() => toggleImgBlur(false), 2500);
    }
  });

  // Snipping Tool / OS Screen Capture Detection:
  // Whenever Snipping Tool, Mac Grab, or an overlay steals focus, blur all images immediately
  window.addEventListener("blur", () => {
    toggleImgBlur(true);
  });

  // Restore image clarity immediately when user refocuses or returns to the window
  window.addEventListener("focus", () => {
    toggleImgBlur(false);
  });
  window.addEventListener("pageshow", () => {
    toggleImgBlur(false);
  });

  // Tab hidden or window minimized
  document.addEventListener("visibilitychange", () => {
    toggleImgBlur(document.hidden);
  });

  // Disallow copying anything outside .selectable-contact
  document.addEventListener("copy", (e) => {
    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode;
    const parent = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode?.parentElement : anchorNode;
    if (!parent?.closest(".selectable-contact")) {
      e.preventDefault();
      toggleImgBlur(true);
      setTimeout(() => toggleImgBlur(false), 1500);
    }
  });

  // 2. CURSOR SPARKLE TRAIL
  (function initCursorSparkles() {
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth), h = (canvas.height = window.innerHeight), lastX = 0, lastY = 0, isRunning = false;
    window.addEventListener("resize", () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });

    const particles = [], colors = ["#0F1E3D", "#1E3A8A", "#F59E0B", "#DC2626", "#FFFFFF"];
    window.addEventListener("mousemove", (e) => {
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 6) {
        for (let i = 0; i < (Math.random() < 0.4 ? 2 : 1); i++) {
          particles.push({
            x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 - 0.3,
            size: Math.random() * 2.2 + 1, color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1, decay: Math.random() * 0.02 + 0.015, rotation: Math.random() * Math.PI, vRot: (Math.random() - 0.5) * 0.1
          });
        }
        lastX = e.clientX; lastY = e.clientY;
        if (!isRunning) { isRunning = true; requestAnimationFrame(animate); }
      }
    });

    function animate() {
      if (!particles.length) { ctx.clearRect(0, 0, w, h); isRunning = false; return; }
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; p.rotation += p.vRot;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha; ctx.fillStyle = ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          ctx.lineTo(Math.cos((j * Math.PI) / 2) * p.size, Math.sin((j * Math.PI) / 2) * p.size);
          ctx.quadraticCurveTo(0, 0, Math.cos(((j + 1) * Math.PI) / 2) * p.size * 0.3, Math.sin(((j + 1) * Math.PI) / 2) * p.size * 0.3);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      requestAnimationFrame(animate);
    }
  })();

  // 3. NAVIGATION & HAMBURGER MENU
  const hamburger = document.getElementById("hamburgerToggle"), navMenu = document.getElementById("nav-menu");
  if (hamburger && navMenu) {
    const toggle = (state) => {
      const open = state ?? !navMenu.classList.contains("open");
      hamburger.classList.toggle("open", open); navMenu.classList.toggle("open", open);
      hamburger.setAttribute("aria-expanded", String(open));
    };
    hamburger.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    document.querySelectorAll(".nav-link").forEach((l) => l.addEventListener("click", () => toggle(false)));
    document.addEventListener("click", (e) => (!hamburger.contains(e.target) && !navMenu.contains(e.target)) && toggle(false));
  }

  // 4. DYNAMIC YEAR
  const yr = document.getElementById("current-year");
  if (yr) yr.textContent = new Date().getFullYear();

  // 5. FABRIC CANVAS BACKGROUND
  const initDynamicFabric = (sel) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.querySelector(sel);
    if (!el) return;
    const cvs = document.createElement("canvas");
    cvs.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    el.insertBefore(cvs, el.firstChild);
    const ctx = cvs.getContext("2d");
    let w = 0, h = 0, dots = [], cur = { x: -2000, y: -2000 }, active = false, animId = null;

    new ResizeObserver(() => {
      w = cvs.width = el.offsetWidth; h = cvs.height = el.offsetHeight; dots = [];
      for (let i = 0, d = Math.min(Math.floor((w * h) / 60000), 8) || 5; i < d; i++) {
        dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: Math.random() * 0.8 + 0.3 });
      }
    }).observe(el);

    el.addEventListener("mousemove", (e) => { const b = el.getBoundingClientRect(); cur.x = e.clientX - b.left; cur.y = e.clientY - b.top; });
    el.addEventListener("mouseleave", () => (cur.x = cur.y = -2000));

    function loop() {
      if (!active || !w || !h) { animId = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if ((dots[i].x - dots[j].x) ** 2 + (dots[i].y - dots[j].y) ** 2 < 6400) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = "rgba(15, 30, 61, 0.08)"; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      dots.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dist = (cur.x - p.x) ** 2 + (cur.y - p.y) ** 2;
        let size = p.r, color = "rgba(30, 58, 138, 0.25)";
        if (dist < 16900) {
          size += (1 - Math.sqrt(dist) / 130) * 3; color = "rgba(220, 38, 38, 0.85)";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cur.x, cur.y);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.35)"; ctx.lineWidth = 1.1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      });
      animId = requestAnimationFrame(loop);
    }

    new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      cancelAnimationFrame(animId);
      if (active) animId = requestAnimationFrame(loop);
    }, { threshold: 0.05 }).observe(el);
  };
  [".mentorship-courses-section", ".playlists-section", ".results-section", ".testimonials-page-wrapper"].forEach(initDynamicFabric);
});

// Multi-Key Prop Extractor
const extractProp = (obj, ...props) => {
  if (!obj || typeof obj !== "object") return "";
  const keys = Object.keys(obj);
  for (const prop of props) {
    const cleanProp = prop.toLowerCase().replace(/[\s_-]/g, "");
    const foundKey = keys.find((k) => {
      const cleanKey = k.toLowerCase().replace(/[\s_-]/g, "");
      return cleanKey === cleanProp || cleanKey.includes(cleanProp);
    });
    if (foundKey && obj[foundKey] !== undefined && String(obj[foundKey]).trim() !== "") {
      return String(obj[foundKey]).trim();
    }
  }
  return "";
};

// LocalStorage Cache Manager
const GAS_CACHE = {
  TTL: 3600 * 1000,
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < this.TTL) return parsed.data;
    } catch { return null; }
    return null;
  },
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {}
  }
};

// 6. CBSE RESULT WIDGET
(function initCBSEWidget() {
  const API_URL = "https://script.google.com/macros/s/AKfycbzuLWc_ECzT-aTvGZDYjH--_YEGgwxXYqb3Y02JTLXRBgqsrktFoqi8VeW7VpbXF_Gh9g/exec";
  const CACHE_KEY = "sc_cbse_results_v6";

  let activeTimer = null;

  const cached = GAS_CACHE.get(CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length) {
    buildSlides(cached);
  }

  async function fetchData() {
    const track = document.getElementById("cbseSliderTrack");
    if (!track) return;
    try {
      const fetchUrl = `${API_URL}${API_URL.includes("?") ? "&" : "?"}_nocache=${Date.now()}`;
      const res = await fetch(fetchUrl, { redirect: "follow" });
      const json = await res.json();
      
      let list = [];
      if (Array.isArray(json)) {
        list = json;
      } else if (json && typeof json === "object") {
        list = json.data || json.records || json.results || json.result || Object.values(json);
      }

      if (Array.isArray(list) && list.length) {
        if (!cached || JSON.stringify(list) !== JSON.stringify(cached)) {
          GAS_CACHE.set(CACHE_KEY, list);
          buildSlides(list);
        }
      } else if (!cached) {
        track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:var(--red-cta);">No result records found.</div></div>`;
      }
    } catch {
      if (!cached) {
        track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:var(--red-cta);">Error loading results from server.</div></div>`;
      }
    }
  }

  function buildSlides(data) {
    const track = document.getElementById("cbseSliderTrack");
    if (!track) return;

    const records = data.filter((s) => extractProp(s, "Name", "StudentName", "CandidateName", "Student"));
    if (!records.length) return;

    const offlineSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 10h16M12 2l8 5H4l8-5zM6 10v11M10 10v11M14 10v11M18 10v11"/></svg>`;
    const onlineSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;
    const miniOfflineSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 10h16M12 2l8 5H4l8-5zM6 10v11M10 10v11M14 10v11M18 10v11"/></svg>`;
    const miniOnlineSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;

    track.style.transform = "translateX(0%)";
    track.innerHTML = records.map((s, idx) => {
      const name = extractProp(s, "Name", "StudentName", "CandidateName", "Student");
      const marks = parseInt(extractProp(s, "Marks", "Score"), 10) || 0;
      const isOnline = extractProp(s, "Mode").toLowerCase() === "online";
      const rawPic = extractProp(s, "CandidatePicture", "Picture", "Image").replace(/['"“”\n\r]/g, "");
      const tname = extractProp(s, "Tname") || name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "SC";
      
      const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#0F1E3D"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="42" font-weight="700">${tname}</text></svg>`;
      const fallbackPlaceholder = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgFallback)))}`;
      const img = rawPic.includes("assets/") || rawPic.startsWith("http") ? rawPic : fallbackPlaceholder;
      const test = extractProp(s, "Testimonial", "Review");
      const batch = extractProp(s, "Batch", "Session");

      return `
        <div class="slide-wrapper ${idx === 0 ? "active" : ""}">
          <div class="report-card">
            <div class="main-content">
              <div class="profile-card">
                <div class="avatar-wrap"><img src="${img}" alt="${name}" class="avatar-img" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackPlaceholder}';"></div>
                <h3 class="profile-name">${name}</h3>
                ${batch ? `<div class="profile-pill">${batch}</div>` : ""}
              </div>
              <div class="right-col">
                <div class="stats-grid">
                  <div class="stat-box">
                    <div class="icon-box icon-navy">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"></rect><circle cx="12" cy="10" r="2"></circle><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </div>
                    <div class="stat-details"><div class="stat-title">Roll Number</div><div class="stat-val">${extractProp(s, "RollNumber", "RollNo")}</div></div>
                  </div>
                  <div class="stat-box">
                    <div class="icon-box icon-red">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
                    </div>
                    <div class="stat-details"><div class="stat-title">Subject</div><div class="stat-val">${extractProp(s, "Subject", "Course")}</div></div>
                  </div>

                  <div class="stat-box">
                    <div class="icon-box icon-yellow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21h18"></path>
                        <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"></path>
                        <path d="M16 10h3a2 2 0 0 1 2 2v9"></path>
                        <path d="M8 7h4"></path>
                        <path d="M8 11h4"></path>
                        <path d="M8 15h4"></path>
                        <path d="M8 19h4"></path>
                      </svg>
                    </div>
                    <div class="stat-details"><div class="stat-title">School</div><div class="stat-val" title="${extractProp(s, "School")}">${extractProp(s, "School")}</div></div>
                  </div>

                  <div class="stat-box">
                    <div class="icon-box icon-navy">
                      ${isOnline ? onlineSvg : offlineSvg}
                    </div>
                    <div class="stat-details">
                      <div class="stat-title">Mode</div>
                      <div class="mode-toggles">
                        <span class="${isOnline ? "mode-inactive" : "mode-active"}">${miniOfflineSvg} Offline</span>
                        <span class="${isOnline ? "mode-active" : "mode-inactive"}">${miniOnlineSvg} Online</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="score-card">
                  <div class="donut-chart" data-score="${marks}"><div class="donut-inner"><span class="score-num">${marks}</span></div></div>
                  <div class="score-details"><div class="score-title">Marks Obtained out of 100</div><div class="score-grade"></div><div class="progress-track"><div class="progress-fill"></div></div></div>
                </div>
              </div>
            </div>
            ${test ? `<div class="testimonial-unit"><div class="test-content"><div class="test-avatar">${tname}</div><div class="test-body-wrap"><div class="quote-mark">"</div><p class="test-text">${test}</p><div class="quote-mark">"</div></div></div></div>` : ""}
          </div>
        </div>`;
    }).join("");

    setTimeout(() => {
      document.querySelectorAll("#cbse-results-widget .slide-wrapper").forEach((wrap) => {
        const donut = wrap.querySelector(".donut-chart");
        if (!donut) return;
        const marks = Math.max(0, Math.min(100, parseInt(donut.dataset.score, 10) || 0));
        const color = marks >= 90 ? "#1E3A8A" : marks >= 80 ? "#DC2626" : marks >= 70 ? "#F59E0B" : "#0F1E3D";
        donut.style.background = `conic-gradient(${color} 0% ${marks}%, var(--border-color) ${marks}% 100%)`;
        wrap.querySelector(".score-num").style.color = color;
        wrap.querySelector(".score-grade").innerText = marks >= 90 ? "A+ Grade" : marks >= 80 ? "A Grade" : marks >= 70 ? "B+ Grade" : "B Grade";
        const fill = wrap.querySelector(".progress-fill");
        fill.style.width = `${marks}%`; fill.style.backgroundColor = color;
      });

      const slides = document.querySelectorAll("#cbse-results-widget .slide-wrapper");
      const ctrl = document.getElementById("cbseDotsContainer");
      if (!ctrl) return;
      
      clearInterval(activeTimer);
      if (slides.length <= 1) {
        ctrl.innerHTML = "";
        return;
      }

      ctrl.innerHTML = `
        <button class="slider-arrow prev-arrow" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
        <div class="slider-dots-line-wrapper">
          <div class="slider-dots-line"></div>
          <div class="slider-dots-inner">${Array.from(slides).map((_, i) => `<div class="slider-dot ${i === 0 ? "active" : ""}"></div>`).join("")}</div>
        </div>
        <button class="slider-arrow next-arrow" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;

      let curr = 0;
      const dots = ctrl.querySelectorAll(".slider-dot");
      const goTo = (idx) => {
        curr = (idx + slides.length) % slides.length;
        track.style.transform = `translateX(-${curr * 100}%)`;
        slides.forEach((s, i) => s.classList.toggle("active", i === curr));
        dots.forEach((d, i) => d.classList.toggle("active", i === curr));
      };
      const restart = () => { 
        clearInterval(activeTimer); 
        activeTimer = setInterval(() => goTo(curr + 1), 6000); 
      };

      ctrl.querySelector(".prev-arrow").onclick = () => { goTo(curr - 1); restart(); };
      ctrl.querySelector(".next-arrow").onclick = () => { goTo(curr + 1); restart(); };
      dots.forEach((d, i) => (d.onclick = () => { goTo(i); restart(); }));
      restart();
    }, 60);
  }

  const resultsEl = document.querySelector(".results-section");
  if (resultsEl && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchData();
        obs.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    obs.observe(resultsEl);
  } else {
    fetchData();
  }
})();

// 7. TESTIMONIALS MODULE
(function initTestimonialsModule() {
  const API_URL = "https://script.google.com/macros/s/AKfycbzReACnRQ6liOLCFUCKESRhjTBgTalEWI2TKc_Xm6DIKMLoKGgfVNTH9tEoQz9eIjG7Kg/exec";
  const CACHE_KEY = "sc_testimonials_cache_v2";
  const TOTAL_SLOTS = 6;
  const COLORS = ["#0F1E3D", "#DC2626", "#F59E0B", "#1E3A8A", "#B91C1C", "#D97706", "#2563EB", "#991B1B"];

  let grid, pool = [], rawData = [], activeSlots = [], hovered = [], timer = null, hist = [];

  const relTime = (str) => {
    if (!str) return "";
    const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(...str.split("-").map((v, i) => (i === 1 ? v - 1 : +v))) : new Date(str);
    if (isNaN(d.getTime())) return str;
    const min = Math.floor((Date.now() - d.getTime()) / 60000), hr = Math.floor(min / 60), days = Math.floor(hr / 24);
    if (days <= 0) return min < 1 ? "just now" : hr < 1 ? `${min}m ago` : `${hr}h ago`;
    return days === 1 ? "1 day ago" : days < 7 ? `${days} days ago` : days < 30 ? `${Math.floor(days / 7)} weeks ago` : days < 365 ? `${Math.floor(days / 30)} months ago` : `${Math.floor(days / 365)} years ago`;
  };

  const normCat = (cat) => {
    const c = String(cat || "").toLowerCase().replace(/[\s\-_]/g, "");
    if (c.includes("google")) return "google_review";
    if (c.includes("12") || c.includes("xii")) return "class12";
    if (c.includes("11") || c.includes("xi")) return "class11";
    if (c.includes("9") || c.includes("10") || c.includes("ix") || c.includes("ai")) return "class9_10";
    if (c.includes("cuet")) return "cuet";
    if (c.includes("high") || c.includes("college") || c.includes("bca") || c.includes("mca") || c.includes("ugc") || c.includes("dsssb")) return "higher_ed";
    return c;
  };

  const badgeHtml = (item) => item.category === "google_review" || !item.video
    ? `<div class="t-badge badge-google"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Google Review</span></div>`
    : `<div class="t-badge badge-youtube" title="${item.video}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg><span>${item.video}</span></div>`;

  const cardHtml = (item, color) => `
    <div class="t-gutter"></div>
    <div class="t-body">
      <div class="t-header-line">
        <div class="t-author-group"><div class="t-avatar" style="--c:${color}">${item.initials}</div><div class="t-name" title="${item.name}">${item.name}</div></div>
        <div class="t-meta-inline">${badgeHtml(item)}</div>
      </div>
      <div class="t-quote-box">
        <div class="t-quote-wrapper">
          <p class="t-quote"><span class="t-quote-content">${item.text}</span>${item.time ? `<span class="t-time-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${item.time}</span>` : ""}</p>
        </div>
      </div>
    </div>`;

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = ""; activeSlots = [];
    if (!pool.length) { grid.innerHTML = `<div class="testimonials-error">No reviews available for this category.</div>`; return; }

    const count = Math.min(TOTAL_SLOTS, pool.length);
    for (let i = 0; i < count; i++) {
      const item = pool[i], color = COLORS[i % COLORS.length];
      activeSlots.push(item);
      const card = document.createElement("article");
      card.className = "t-card"; card.id = `review-slot-${i}`; card.setAttribute("tabindex", "0"); card.innerHTML = cardHtml(item, color);
      const toggle = () => card.classList.toggle("expanded");
      card.onclick = toggle;
      card.onkeydown = (e) => ["Enter", " "].includes(e.key) && (e.preventDefault(), toggle());
      card.onmouseenter = () => (hovered[i] = true);
      card.onmouseleave = () => (hovered[i] = false);
      grid.appendChild(card);
    }
  }

  function rotateSingle() {
    if (pool.length <= activeSlots.length) return;
    const candidates = activeSlots.map((_, i) => i).filter((i) => {
      const el = document.getElementById(`review-slot-${i}`);
      return el && !hovered[i] && !el.classList.contains("expanded") && !hist.includes(i);
    });
    const idx = (candidates.length ? candidates : activeSlots.map((_, i) => i))[Math.floor(Math.random() * (candidates.length || activeSlots.length))];
    hist.push(idx); if (hist.length > 3) hist.shift();

    const available = pool.filter((p) => !activeSlots.some((a) => a.name === p.name && a.text === p.text));
    if (!available.length) return;
    const next = available[Math.floor(Math.random() * available.length)], card = document.getElementById(`review-slot-${idx}`);
    if (!card) return;

    card.style.opacity = "0"; card.style.transform = "scale(0.97) translateY(2px)";
    setTimeout(() => {
      activeSlots[idx] = next; card.innerHTML = cardHtml(next, COLORS[idx % COLORS.length]);
      card.style.opacity = "1"; card.style.transform = "scale(1) translateY(0)";
      card.classList.remove("shimmer-active"); void card.offsetWidth; card.classList.add("shimmer-active");
      setTimeout(() => card.classList.remove("shimmer-active"), 900);
    }, 350);
  }

  function setFilter(cat) {
    pool = (cat === "all" ? [...rawData] : rawData.filter((r) => r.category === cat)).sort(() => Math.random() - 0.5);
    hist = []; renderGrid();
    clearInterval(timer);
    if (pool.length > TOTAL_SLOTS) timer = setInterval(rotateSingle, 4500);
  }

  function parseReviews(list) {
    return list.map((item) => {
      const name = extractProp(item, "Name", "StudentName", "Author");
      return {
        name, initials: extractProp(item, "Initials") || name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "SC",
        time: relTime(extractProp(item, "Time") || extractProp(item, "Date")),
        category: normCat(extractProp(item, "Category")), video: extractProp(item, "Video"), text: extractProp(item, "Text", "Review")
      };
    }).filter((i) => i.name && i.text);
  }

  window.handleSheetReviews = (json) => {
    const list = Array.isArray(json) ? json : json?.data || [];
    if (list.length) {
      GAS_CACHE.set(CACHE_KEY, list);
      rawData = parseReviews(list);
      setFilter("all");
    }
  };

  grid = document.getElementById("reviewsGrid");
  document.querySelectorAll(".testimonials-tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".testimonials-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active"); setFilter(tab.dataset.filter);
    };
  });

  const cachedReviews = GAS_CACHE.get(CACHE_KEY);
  if (cachedReviews && Array.isArray(cachedReviews) && cachedReviews.length) {
    rawData = parseReviews(cachedReviews);
    setFilter("all");
  }

  function fetchLiveReviews() {
    const script = document.createElement("script");
    script.src = `${API_URL}?callback=handleSheetReviews`;
    script.onerror = () => fetch(API_URL).then((r) => r.json()).then(window.handleSheetReviews).catch(() => {
      if (!cachedReviews && grid) grid.innerHTML = `<div class="testimonials-error">Failed to load verified reviews.</div>`;
    });
    document.body.appendChild(script);
  }

  const testSec = document.querySelector(".testimonials-page-wrapper");
  if (testSec && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchLiveReviews();
        obs.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    obs.observe(testSec);
  } else {
    fetchLiveReviews();
  }
})();