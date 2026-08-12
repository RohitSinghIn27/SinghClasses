function runOnDOMReady(fn) { 
  if (document.readyState !== "loading") fn(); 
  else document.addEventListener("DOMContentLoaded", fn); 
}

runOnDOMReady(() => {
  window.scrollTo(0, 0);
  const hamburgerToggle = document.getElementById("hamburgerToggle"), 
        navMenu = document.getElementById("nav-menu");

  if (hamburgerToggle && navMenu && !hamburgerToggle.dataset.navInitialized) {
    hamburgerToggle.dataset.navInitialized = "true";
    const toggleMenu = (e) => { 
      if (e) { e.preventDefault(); e.stopPropagation(); } 
      const isOpening = !hamburgerToggle.classList.contains("open"); 
      hamburgerToggle.classList.toggle("open", isOpening); 
      navMenu.classList.toggle("open", isOpening); 
      hamburgerToggle.setAttribute("aria-expanded", isOpening ? "true" : "false"); 
    };
    hamburgerToggle.addEventListener("click", toggleMenu);
    navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { 
      hamburgerToggle.classList.remove("open"); 
      navMenu.classList.remove("open"); 
      hamburgerToggle.setAttribute("aria-expanded", "false"); 
    }));
    document.addEventListener("click", (e) => { 
      if (navMenu.classList.contains("open") && !hamburgerToggle.contains(e.target) && !navMenu.contains(e.target)) { 
        hamburgerToggle.classList.remove("open"); 
        navMenu.classList.remove("open"); 
        hamburgerToggle.setAttribute("aria-expanded", "false"); 
      } 
    });
  }

  const yr = document.getElementById("current-year");
  if (yr) yr.textContent = new Date().getFullYear();

  const initDynamicFabric = (target) => {
    const wrapper = document.querySelector(target);
    if (!wrapper || wrapper.dataset.fabricInited) return;
    wrapper.dataset.fabricInited = "true";
    let canvas = wrapper.querySelector("canvas");
    if (!canvas) { canvas = document.createElement("canvas"); wrapper.insertBefore(canvas, wrapper.firstChild); }
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;";
    if (window.getComputedStyle(wrapper).position === "static") wrapper.style.position = "relative";

    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dots = [], cursor = { x: -2000, y: -2000 };

    const resizeCanvas = () => {
      w = wrapper.clientWidth; h = wrapper.clientHeight; canvas.width = w; canvas.height = h; dots = [];
      if (w > 0 && h > 0) {
        const density = Math.min(Math.floor((w * h) / 60000), 8) || 5;
        for (let i = 0; i < density; i++) dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: Math.random() * 0.8 + 0.3 });
      }
    };

    new ResizeObserver(resizeCanvas).observe(wrapper);
    wrapper.addEventListener("mousemove", (e) => { const box = wrapper.getBoundingClientRect(); cursor.x = e.clientX - box.left; cursor.y = e.clientY - box.top; });
    wrapper.addEventListener("mouseleave", () => (cursor.x = cursor.y = -2000));

    const runLoop = () => {
      if (!w || !h) return requestAnimationFrame(runLoop);
      ctx.clearRect(0, 0, w, h);
      const cBase = "rgba(224,77,45,0.35)", cLink = "rgba(224,77,45,0.12)", cHigh = "rgba(224,77,45,0.95)";
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if ((dots[i].x - dots[j].x) ** 2 + (dots[i].y - dots[j].y) ** 2 < 6400) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.strokeStyle = cLink; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      dots.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2, size = p.r, color = cBase;
        if (cDist < 16900) {
          size = p.r + (1 - Math.sqrt(cDist) / 130) * 3; color = cHigh;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cursor.x, cursor.y); ctx.strokeStyle = cLink; ctx.lineWidth = 1.1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      });
      requestAnimationFrame(runLoop);
    };
    runLoop();
  };

  [".sc-hero-box", ".sc-subscribe-card"].forEach((target) => initDynamicFabric(target));
});