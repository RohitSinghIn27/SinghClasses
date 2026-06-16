document.addEventListener('DOMContentLoaded', () => {

  // --- Dynamic Current Year ---
  const yr = document.getElementById('current-year');
  if (yr) yr.textContent = new Date().getFullYear();

  // --- Dark Mode Logic ---
  const dmBtn = document.getElementById('darkModeToggle');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  
  if (dmBtn) {
    dmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
  }

  // --- Unified Share Engine ---
  const initShareEngine = (btnId) => {
    const btn = document.getElementById(btnId);
    if(btn) {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (navigator.share) {
          try { 
            await navigator.share({ title: document.title, url: window.location.href }); 
          } catch (err) { 
            console.log('Error sharing page context:', err); 
          }
        } else {
          navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
          });
        }
      });
    }
  };
  
  initShareEngine('sharePageToggle');

  // --- Smooth Scroll & Original Footer Collision Logic ---
  const scrollTopAction = document.getElementById('scrollTopAction');
  const footerNode = document.querySelector('.site-footer');
  // We target the entire wrapper so the particles slide up with the buttons!
  const hudWrapper = document.querySelector('.premium-hud-wrapper');

  if (scrollTopAction) {
    scrollTopAction.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Exact collision logic restored from original files
  if (footerNode && hudWrapper) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          let r = footerNode.getBoundingClientRect();
          let vh = window.innerHeight;
          // Slides the whole wrapper (buttons + particles) up when reaching the footer
          hudWrapper.style.transform = (r.top < vh) ? `translateY(-${vh - r.top}px)` : 'translateY(0)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --- Interactive Particle Canvas Fabric Engine ---
  const initDynamicFabric = (selector, canvasId, particleCount, connectionDistance, forceLight = false) => {
    const wrapper = document.querySelector(selector);
    const specificCanvas = document.getElementById(canvasId);
    
    if (!wrapper) return;
    
    let canvas = specificCanvas;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'sc-canvas-bg-layer';
      wrapper.insertBefore(canvas, wrapper.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [], cursor = { x: -2000, y: -2000 };

    const resizeObserver = new ResizeObserver(() => {
      w = canvas.width = wrapper.offsetWidth;
      h = canvas.height = wrapper.offsetHeight;
      dots = [];
      // If a specific particleCount is passed, use it. Otherwise calculate density.
      const density = particleCount || (Math.min(Math.floor((w * h) / 30000), 20) || 15);
      
      for (let i = 0; i < density; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          r: Math.random() * 0.8 + 0.3
        });
      }
    });
    resizeObserver.observe(wrapper);

    wrapper.addEventListener('mousemove', e => {
      const box = wrapper.getBoundingClientRect();
      cursor.x = e.clientX - box.left;
      cursor.y = e.clientY - box.top;
    });
    wrapper.addEventListener('mouseleave', () => cursor.x = cursor.y = -2000);

    const runLoop = () => {
      if (!w || !h) return requestAnimationFrame(runLoop);
      ctx.clearRect(0, 0, w, h);
      
      const dark = document.body.classList.contains('dark-mode');
      const lightTheme = forceLight || dark;
      
      const cBase = lightTheme ? 'rgba(255,255,255,0.35)' : 'rgba(21, 104, 69, 0.4)';
      const cLink = lightTheme ? 'rgba(255,255,255,0.12)' : 'rgba(21, 104, 69, 0.15)';
      const cHigh = lightTheme ? 'rgba(255,255,255,0.95)' : 'rgba(15, 76, 50, 0.8)';
      
      const connDist = connectionDistance || 80;

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          let dx = dots[i].x - dots[j].x;
          let dy = dots[i].y - dots[j].y;
          let distSq = dx * dx + dy * dy;
          
          if (distSq < (connDist * connDist)) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = cLink;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      dots.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2;
        let size = p.r;
        let color = cBase;

        if (cDist < 10000) {
          size = p.r + ((1 - Math.sqrt(cDist) / 100) * 2);
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
  
  // Initialize specific canvases
  initDynamicFabric('#scHeroTop', 'scParticleCanvas1', 20, 60);
  initDynamicFabric('#scSubscribeBanner', 'scParticleCanvas2', 15, 50);
  
  // Apply generalized dynamic fabric onto broader sections
  ['.header-container', '.classes-section', '.playlists-section', '.results-section'].forEach(s => initDynamicFabric(s, null, null, null, false));

  // NEW: Inject dynamic fabric exclusively into the HUD Wrapper!
  // I passed 12 particles and a short connection distance of 40 so it looks delicate.
  initDynamicFabric('#hudParticleWrapper', 'hudCanvas', 6, 20, false);

});