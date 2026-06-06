/**
 * SinghClasses Premium Frontend Interactivity Core Engine
 * Architecture Framework: Native Vanilla ECMAScript
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ------------------------------------------------------------------------
  // 01. TIME CALCULATION UTILITIES
  // ------------------------------------------------------------------------
  const initializeCopyrightYear = () => {
    const yearContainer = document.getElementById('current-year');
    if (yearContainer) {
      yearContainer.textContent = new Date().getFullYear();
    }
  };

  // ------------------------------------------------------------------------
  // 02. CAROUSEL TESTIMONIAL ENGINE
  // ------------------------------------------------------------------------
  const initializeTestimonialSlider = () => {
    const slides = document.querySelectorAll('.testimonial-slide');
    const track = document.getElementById('testimonialTrack');
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    const dotsContainer = document.getElementById('sliderDots');
    
    if (!slides.length || !track) return;

    let currentSlideIndex = 0;
    let slideInterval = null;
    const AUTOPLAY_DELAY = 6000;

    // Reset pagination structure to prevent double rendering cycles
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('slider-dot');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to testimonial slide ${index + 1}`);
        if (index === 0) {
          dot.classList.add('active');
          dot.setAttribute('aria-selected', 'true');
        } else {
          dot.setAttribute('aria-selected', 'false');
        }
        dot.addEventListener('click', () => jumpToSlide(index));
        dotsContainer.appendChild(dot);
      });
    }

    const dots = document.querySelectorAll('.slider-dot');

    const updateSliderDOM = () => {
      slides.forEach((slide, idx) => {
        if (idx === currentSlideIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      dots.forEach((dot, idx) => {
        if (idx === currentSlideIndex) {
          dot.classList.add('active');
          dot.setAttribute('aria-selected', 'true');
        } else {
          dot.classList.remove('active');
          dot.setAttribute('aria-selected', 'false');
        }
      });
    };

    const advanceSlide = () => {
      currentSlideIndex = (currentSlideIndex + 1) % slides.length;
      updateSliderDOM();
    };

    const regressSlide = () => {
      currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
      updateSliderDOM();
    };

    const jumpToSlide = (index) => {
      currentSlideIndex = index;
      updateSliderDOM();
      restartAutoplay();
    };

    const startAutoplay = () => {
      slideInterval = setInterval(advanceSlide, AUTOPLAY_DELAY);
    };

    const restartAutoplay = () => {
      if (slideInterval) {
        clearInterval(slideInterval);
      }
      startAutoplay();
    };

    // Event attachments with fallback parameters
    nextBtn?.addEventListener('click', () => { advanceSlide(); restartAutoplay(); });
    prevBtn?.addEventListener('click', () => { regressSlide(); restartAutoplay(); });

    startAutoplay();
  };

  // ------------------------------------------------------------------------
  // 03. DARK & LIGHT THEME SWAP MECHANISM
  // ------------------------------------------------------------------------
  const initializeThemeEngine = () => {
    const dmBtn = document.getElementById('darkModeToggle');
    if (!dmBtn) return;

    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
    
    dmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
  };

  // ------------------------------------------------------------------------
  // 04. BACKGROUND CANVAS PARTICLES GRAPH FABRIC
  // ------------------------------------------------------------------------
  const initParticles = (selector, defaultLightDot = false) => {
    const wrapper = document.querySelector(selector);
    if (!wrapper) return;
    
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;';
    wrapper.insertBefore(canvas, wrapper.firstChild);
    
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [], cursor = { x: -1000, y: -1000 };

    const resize = () => { 
      w = canvas.width = wrapper.offsetWidth; 
      h = canvas.height = wrapper.offsetHeight; 
    };
    
    // Clear array logic added to prevent infinite particle accumulation loops on layout change
    new ResizeObserver(() => {
      resize();
      dots = []; 
      const targetDensityCount = Math.min(Math.floor((w * h) / 30000), 20) || 15;
      for (let i = 0; i < targetDensityCount; i++) {
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
    wrapper.addEventListener('mouseleave', () => cursor.x = cursor.y = -1000);

    const runLoop = () => {
      if (!w || !h) return requestAnimationFrame(runLoop);
      ctx.clearRect(0, 0, w, h);
      
      const darkActive = document.body.classList.contains('dark-mode');
      const colBase = (defaultLightDot || darkActive) ? 'rgba(255,255,255,0.35)' : 'rgba(13,148,136,0.35)';
      const colHigh = (defaultLightDot || darkActive) ? 'rgba(255,255,255,0.95)' : 'rgba(13,148,136,0.95)';
      const colLink = (defaultLightDot || darkActive) ? 'rgba(255,255,255,0.12)' : 'rgba(13,148,136,0.12)';

      // Linear proximity mapping connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          let dx = dots[i].x - dots[j].x;
          let dy = dots[i].y - dots[j].y;
          if ((dx * dx + dy * dy) < 6400) { 
            ctx.beginPath(); 
            ctx.moveTo(dots[i].x, dots[i].y); 
            ctx.lineTo(dots[j].x, dots[j].y); 
            ctx.strokeStyle = colLink; 
            ctx.lineWidth = 0.8; 
            ctx.stroke(); 
          }
        }
      }
      
      dots.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1; 
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        let cx = cursor.x - p.x;
        let cy = cursor.y - p.y;
        let dist = cx * cx + cy * cy;
        let size = p.r;
        let color = colBase;

        if (dist < 16900) {
          let f = (1 - Math.sqrt(dist) / 130); 
          size = p.r + (f * 3); 
          color = colHigh;
          ctx.beginPath(); 
          ctx.moveTo(p.x, p.y); 
          ctx.lineTo(cursor.x, cursor.y); 
          ctx.strokeStyle = colLink; 
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

  const runAllGlobalFabricInstances = () => {
    ['.header-container', '.classes-section', '.playlists-section', '.results-section'].forEach(s => initParticles(s, false));
    initParticles('.teacher-section', true);
  };

  // ------------------------------------------------------------------------
  // 05. NATIVE WEB SHARE API EXECUTIONS
  // ------------------------------------------------------------------------
  const initializeShareAPI = () => {
    const toast = document.getElementById('toast-notification');
    
    document.getElementById('sharePageToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (navigator.share) { 
        navigator.share({ title: document.title, url: window.location.href })
                 .catch(err => console.log('Share operations ignored safely.'));
      } else {
        if (toast) {
          navigator.clipboard.writeText(window.location.href);
          toast.innerHTML = "📋 URL link copied to clipboard!"; 
          toast.classList.add('show');
          setTimeout(() => { toast.classList.remove('show'); }, 2500);
        }
      }
    });
  };

  // ------------------------------------------------------------------------
  // 06. FOOTER POSITION TRACKING OVERRIDES (SMOOTH PARALLAX PREVENTION)
  // ------------------------------------------------------------------------
  const initializeFloatingHUDPositioning = () => {
    const footerNode = document.querySelector('.site-footer');
    const bar = document.querySelector('.floating-action-hud');
    const scrollTopBtn = document.getElementById('scrollTopAction');
    
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (footerNode && bar) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            let r = footerNode.getBoundingClientRect();
            let vh = window.innerHeight;
            bar.style.transform = (r.top < vh) ? `translateY(-${vh - r.top}px)` : 'translateY(0)';
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }
  };

  // Run initialization routines
  initializeCopyrightYear();
  initializeTestimonialSlider();
  initializeThemeEngine();
  runAllGlobalFabricInstances();
  initializeShareAPI();
  initializeFloatingHUDPositioning();
});