// Reliable helper to safely run DOM initialization across mobile/desktop
function runOnDOMReady(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

runOnDOMReady(() => {
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

  if (hamburgerToggle && navMenu && !hamburgerToggle.dataset.navInitialized) {
    hamburgerToggle.dataset.navInitialized = "true";

    const toggleMenu = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const isOpening = !hamburgerToggle.classList.contains("open");
      hamburgerToggle.classList.toggle("open", isOpening);
      navMenu.classList.toggle("open", isOpening);
      hamburgerToggle.setAttribute("aria-expanded", isOpening ? "true" : "false");
    };

    hamburgerToggle.addEventListener("click", toggleMenu);

    // Close menu when clicking any nav link
    const navLinks = navMenu.querySelectorAll("a");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        hamburgerToggle.classList.remove("open");
        navMenu.classList.remove("open");
        hamburgerToggle.setAttribute("aria-expanded", "false");
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        navMenu.classList.contains("open") &&
        !hamburgerToggle.contains(e.target) &&
        !navMenu.contains(e.target)
      ) {
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
    "#scSubscribeBanner"
  ];

  canvasTargets.forEach((target) => initDynamicFabric(target, false));

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