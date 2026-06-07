/**
 * SinghClasses Sub-Portal & Frontend Core Interactivity Engine
 * Architecture Framework: Consolidated Native Vanilla ECMAScript
 */
document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 01. CORE DOM INITS, UTILS & STRUCTURAL LAYOUT HANDLERS
  // ==========================================================================
  
  // Dynamic Footer Copyright Year Setup
  const yearContainer = document.getElementById('current-year');
  if (yearContainer) yearContainer.textContent = new Date().getFullYear();

  // Unified Toast Elements References
  const scToast = document.getElementById('scToast');
  const globalToast = document.getElementById('toast-notification');
  let toastTimeout;

  /**
   * Helper function to show notifications uniformly across multiple toast variations
   */
  const triggerToastNotification = (targetElement, message = null, delay = 3000) => {
    if (!targetElement) return;
    if (message) targetElement.innerHTML = message;
    
    targetElement.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      targetElement.classList.remove('show');
    }, delay);
  };

  // --- COMING SOON TOAST LOGIC ---
  const allLinks = document.querySelectorAll('a');
  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // TRIGGER TOAST IF: Link is empty, is exactly "#", or points to an unbuilt folder page
    if (!href || href === '#' || href.trim() === '') {
      link.addEventListener('click', function(e) {
        e.preventDefault(); // Prevents layout jumping or blank view routing
        
        // Prioritize targeted scToast framework if element exists, fall back to global notification module
        if (scToast) {
          triggerToastNotification(scToast, "🚧 We are currently preparing this material. Coming soon!", 3000);
        } else if (globalToast) {
          triggerToastNotification(globalToast, "🚧 Coming soon!", 2500);
        }
      });
    }
  });

  // --- Mobile Menu Toggle Handler ---
  const menuToggle = document.getElementById('scMenuToggle');
  const mobileMenu = document.getElementById('scMobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function() {
      mobileMenu.classList.toggle('show-mobile-menu');
      menuToggle.innerHTML = mobileMenu.classList.contains('show-mobile-menu') ? '✕' : '☰';
    });
  }

  // ==========================================================================
  // 02. FLOATING ACTION HUD SYSTEMS (SCROLL, RECONCILIATION & SHARING)
  // ==========================================================================

  // Dark & Light Mode Theme Toggle Logic
  const dmBtn = document.getElementById('darkModeToggle');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  dmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  // Integrated Native Share API & Fallback Systems
  const initShareEngine = (btnId) => {
    document.getElementById(btnId)?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: window.location.href });
        } catch (err) {
          console.log('Error sharing page context:', err);
        }
      } else {
        // Fallback clipboard logic
        navigator.clipboard.writeText(window.location.href).then(() => {
          if (globalToast) {
            triggerToastNotification(globalToast, "📋 URL link copied to clipboard!", 2500);
          } else if (scToast) {
            triggerToastNotification(scToast, "Link copied to clipboard!", 3000);
          } else {
            alert('Link copied to clipboard!');
          }
        });
      }
    });
  };
  // Wire up action triggers to share routines cleanly
  initShareEngine('sharePageToggle');
  initShareEngine('scShareBtn');

  // Unified Scroll Handling: HUD Parallax Adjustments & Direction Toggles
  const scrollBtn = document.getElementById('scScrollToggleBtn');
  const scrollTopAction = document.getElementById('scrollTopAction');
  const footerNode = document.querySelector('.site-footer');
  const hudBar = document.querySelector('.floating-action-hud');

  // Scroll to Top action handlers
  scrollTopAction?.addEventListener('click', (e) => {
    e.preventDefault(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Floating Action Button logic for page context flips
  if (scrollBtn) {
    const checkScrollState = () => {
      if (window.scrollY > 150) {
        scrollBtn.classList.remove('sc-point-down');
      } else {
        scrollBtn.classList.add('sc-point-down');
      }
    };
    window.addEventListener('scroll', checkScrollState, { passive: true });
    checkScrollState(); // Inital state check on load

    scrollBtn.addEventListener('click', () => {
      if (window.scrollY > 150) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  // Animation layout tick engine to tracking floating state bounds above footer limits
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

  // ==========================================================================
  // 03. TESTIMONIAL SLIDER IMPLEMENTATION MODULE
  // ==========================================================================
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

  // ==========================================================================
  // 04. UNIFIED BACKGROUND CANVAS PARTICLES FABRIC ENGINE
  // ==========================================================================
  const initDynamicFabric = (selector, isPremium = false, forceLight = false, customCanvasId = null) => {
    const wrapper = document.getElementById(selector) || document.querySelector(selector); 
    if (!wrapper) return;
    
    // Check if targeted custom placeholder canvas markup exists, otherwise generate dynamically
    let canvas = customCanvasId ? document.getElementById(customCanvasId) : null;
    const dynamicallyGenerated = !canvas;

    if (dynamicallyGenerated) {
      canvas = document.createElement('canvas');
      canvas.className = 'sc-canvas-bg-layer';
      canvas.style.cssText = isPremium ? '' : 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;';
      wrapper.insertBefore(canvas, wrapper.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [], cursor = { x: -2000, y: -2000 };

    // Unified configurations matching logic variations between layouts
    let connectionDistance = isPremium ? 8500 : 6400; 
    let mouseRadius = isPremium ? 18000 : 16900;

    new ResizeObserver(() => {
      w = canvas.width = wrapper.offsetWidth; 
      h = canvas.height = wrapper.offsetHeight; 
      dots = [];
      
      // Determine density and speed vectors based on premium structure flags
      const density = isPremium ? (Math.min(Math.floor((w * h) / 48000), 24) || 12) : (Math.min(Math.floor((w * h) / 30000), 20) || 15);
      const velocity = isPremium ? 0.55 : 1.2;
      
      for (let i = 0; i < density; i++) {
        dots.push({
          x: Math.random() * w, 
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * velocity, 
          vy: (Math.random() - 0.5) * velocity,
          r: Math.random() * (isPremium ? 0.7 : 0.8) + 0.3
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
      
      // Compute responsive particle and alignment path color gradients
      const cBase = isPremium ? (dark ? 'rgba(255,255,255,0.18)' : 'rgba(13,148,136,0.18)') : (lightTheme ? 'rgba(255,255,255,0.35)' : 'rgba(13,148,136,0.35)');
      const cLink = isPremium ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(13,148,136,0.04)') : (lightTheme ? 'rgba(255,255,255,0.12)' : 'rgba(13,148,136,0.12)');
      const cInt = isPremium ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(13,148,136,0.08)') : cLink;
      const cHigh = lightTheme ? 'rgba(255,255,255,0.95)' : 'rgba(13,148,136,0.95)';

      // Linear spatial connection tracking passes
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          let dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, dSq = dx * dx + dy * dy;
          if (dSq < connectionDistance) {
            ctx.beginPath(); 
            ctx.moveTo(dots[i].x, dots[i].y); 
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = cLink; 
            ctx.lineWidth = isPremium ? 0.6 : 0.8; 
            ctx.stroke();
          }
        }
      }

      // Re-render spatial mapping coordinates & structural tracking parameters
      dots.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy;
        
        if (p.x < 0 || p.x > w) p.vx *= -1; 
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        let cx = cursor.x - p.x, cy = cursor.y - p.y, cDist = cx * cx + cy * cy;
        let size = p.r, color = cBase;

        if (cDist < mouseRadius) {
          if (!isPremium) { 
            let f = (1 - Math.sqrt(cDist) / 130); 
            size = p.r + (f * 3); 
            color = cHigh; 
          }
          ctx.beginPath(); 
          ctx.moveTo(p.x, p.y); 
          ctx.lineTo(cursor.x, cursor.y);
          ctx.strokeStyle = cInt; 
          ctx.lineWidth = isPremium ? 0.8 : 1.1; 
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
  
  // Invoke global instances across core design sections smoothly
  ['.header-container', '.classes-section', '.playlists-section', '.results-section'].forEach(s => initDynamicFabric(s, false, false));
  initDynamicFabric('.teacher-section', false, true);
  initDynamicFabric('#learningZoneSector', true, false);
  initDynamicFabric('#billboardZoneSector', true, false);

  // Hook legacy script canvas hooks into unified particle loop configuration parameters safely
  initDynamicFabric('scHeroTop', false, false, 'scParticleCanvas1');
  initDynamicFabric('scSubscribeBanner', false, false, 'scParticleCanvas2');
});