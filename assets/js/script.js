document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================
  // 1. UTILITIES & DATA INITS
  // ==========================================
  const yr = document.getElementById('current-year');
  if (yr) yr.textContent = new Date().getFullYear();

  const dmBtn = document.getElementById('darkModeToggle');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  dmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  // Fallback Copy Function
  const copyToClipboardFallback = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      textArea.remove();
    }
  };

  const initShareEngine = (btnId) => {
    document.getElementById(btnId)?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (navigator.share && window.location.protocol !== 'file:') {
        try { await navigator.share({ title: document.title, url: window.location.href }); } 
        catch (err) { console.log('Error sharing page context:', err); }
      } else {
        copyToClipboardFallback(window.location.href);
        alert('Page link copied to clipboard!');
      }
    });
  };
  initShareEngine('sharePageToggle');

  const scrollTopAction = document.getElementById('scrollTopAction');
  const footerNode = document.querySelector('.site-footer');
  const hudBar = document.querySelector('.floating-action-hud');

  scrollTopAction?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (footerNode && hudBar) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          let r = footerNode.getBoundingClientRect(), vh = window.innerHeight;
          hudBar.style.transform = (r.top < vh) ? `translateY(-${vh - r.top}px)` : 'translateY(0)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ==========================================
  // 2. SLIDER ENGINE RE-MAPPED FOR NEW UI
  // ==========================================
  const slides = document.querySelectorAll('.testimonial-slide');
  const track = document.getElementById('testimonialTrack');
  const dotsContainer = document.getElementById('sliderDots');

  if (slides.length && track) {
    let currentIdx = 0, slideInterval = null;
    
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      slides.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = 'slider-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to testimonial slide ${idx + 1}`);
        dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        if (idx === 0) dot.classList.add('active');
        dot.addEventListener('click', () => jumpToSlide(idx));
        dotsContainer.appendChild(dot);
      });
    }
    
    const dots = document.querySelectorAll('.slider-dot');
    const updateSliderDOM = () => {
      slides.forEach((slide, idx) => slide.classList.toggle('active', idx === currentIdx));
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIdx);
        dot.setAttribute('aria-selected', idx === currentIdx ? 'true' : 'false');
      });
    };
    
    const advanceSlide = () => { currentIdx = (currentIdx + 1) % slides.length; updateSliderDOM(); };
    const regressSlide = () => { currentIdx = (currentIdx - 1 + slides.length) % slides.length; updateSliderDOM(); };
    const jumpToSlide = (index) => { currentIdx = index; updateSliderDOM(); restartAutoplay(); };
    const startAutoplay = () => slideInterval = setInterval(advanceSlide, 6000);
    const restartAutoplay = () => { if (slideInterval) clearInterval(slideInterval); startAutoplay(); };
    
    document.getElementById('nextSlideBtn')?.addEventListener('click', () => { advanceSlide(); restartAutoplay(); });
    document.getElementById('prevSlideBtn')?.addEventListener('click', () => { regressSlide(); restartAutoplay(); });
    
    startAutoplay();
  }

  // ==========================================
  // 3. CANVAS DECOR ENGINE
  // ==========================================
  const initDynamicFabric = (selector, forceLight = false) => {
    const wrapper = document.querySelector(selector);
    if (!wrapper) return;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'sc-canvas-bg-layer';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;';
    wrapper.insertBefore(canvas, wrapper.firstChild);

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [], cursor = { x: -2000, y: -2000 };

    new ResizeObserver(() => {
      w = canvas.width = wrapper.offsetWidth;
      h = canvas.height = wrapper.offsetHeight;
      dots = [];
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
    }).observe(wrapper);

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
      
      const cBase = lightTheme ? 'rgba(255,255,255,0.35)' : 'rgba(13,148,136,0.35)';
      const cLink = lightTheme ? 'rgba(255,255,255,0.12)' : 'rgba(13,148,136,0.12)';
      const cHigh = lightTheme ? 'rgba(255,255,255,0.95)' : 'rgba(13,148,136,0.95)';

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

      dots.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2, size = p.r, color = cBase;

        if (cDist < 16900) {
          size = p.r + ((1 - Math.sqrt(cDist) / 130) * 3);
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
  
  ['.header-container', '.classes-section', '.playlists-section', '.results-section'].forEach(s => initDynamicFabric(s, false));
  initDynamicFabric('.teacher-section', true);
});

// Add to the slider section:
track.addEventListener('mouseenter', () => clearInterval(slideInterval));
track.addEventListener('mouseleave', () => startAutoplay());


document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

