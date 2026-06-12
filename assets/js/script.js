document.addEventListener("DOMContentLoaded", () => {
  const yr = document.getElementById('current-year');
  if (yr) yr.textContent = new Date().getFullYear();

  const dmBtn = document.getElementById('darkModeToggle');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  dmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  const copyToClipboardFallback = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); return true; } 
    catch (err) { return false; } 
    finally { textArea.remove(); }
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
    track.addEventListener('mouseenter', () => clearInterval(slideInterval));
    track.addEventListener('mouseleave', () => startAutoplay());
  }

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
        dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: Math.random() * 0.8 + 0.3 });
      }
    }).observe(wrapper);

    wrapper.addEventListener('mousemove', e => {
      const box = wrapper.getBoundingClientRect();
      cursor.x = e.clientX - box.left; cursor.y = e.clientY - box.top;
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
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = cLink; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      dots.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2, size = p.r, color = cBase;
        if (cDist < 16900) {
          size = p.r + ((1 - Math.sqrt(cDist) / 130) * 3); color = cHigh;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cursor.x, cursor.y);
          ctx.strokeStyle = cLink; ctx.lineWidth = 1.1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      });
      requestAnimationFrame(runLoop);
    };
    runLoop();
  };
  
  ['.header-container', '.classes-section', '.playlists-section', '.results-section'].forEach(s => initDynamicFabric(s, false));
  initDynamicFabric('.teacher-section', true);
});

document.addEventListener('contextmenu', function(e) { if (e.target.tagName === 'IMG') e.preventDefault(); });

// ==== INLINE EXTRACTED CBSE RESULTS WIDGET SCRIPT ====
(function() {
    const API_URL = 'https://script.google.com/macros/s/AKfycbx_qbyL831Rtr-dG5mNLRYz5LajWvVtgSv4xBO9pWX2TAZ74qNWf33Bdf1NtivHyfM8/exec'; 
    function initCbseWidget() { fetchGoogleSheetData(); }
    
    async function fetchGoogleSheetData() {
        const track = document.getElementById('cbseSliderTrack');
        if (API_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
            track.innerHTML = `<div class="loading-container"><div class="loading-text" style="color:#ef4444; animation:none;">Please replace API_URL with your Web App URL.</div></div>`; return;
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
        const track = document.getElementById('cbseSliderTrack'); 
        track.innerHTML = ''; 
        
        studentData.forEach((student, index) => {
            const picKey = Object.keys(student).find(key => key.toLowerCase().includes('picture')) || 'CandidatePicture';
            let rawPic = student[picKey] || "";
            
            // Clean the string entirely of quotes and extra spaces
            rawPic = rawPic.replace(/['"“”\n\r]/g, '').trim();
            
            const isLocalAsset = rawPic.includes('assets/');
            const isSupportedUrl = isLocalAsset || rawPic.startsWith('http');
            
            // Fallback UI Avatar generator
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.Name || 'Student')}&background=ffffff&color=584ddb&size=150`;
            const finalImageSrc = isSupportedUrl ? rawPic : fallbackAvatar;
            
            // Critical fix: If it's a local asset, DO NOT attach crossorigin="anonymous"
            const crossOriginPolicy = isLocalAsset ? '' : 'crossorigin="anonymous"';
            const marksNum = parseInt(student.Marks) || 0;
            
            // The image tag now includes an onerror handler so if the path fails, it visually recovers
            const slideHTML = `
            <div class="slide-wrapper ${index === 0 ? 'active' : ''}">
                <div class="report-card">
                    <div class="main-content">
                        <div class="profile-card">
                            <div class="avatar-wrap">
                                <div class="avatar-arc"></div>
                                <img src="${finalImageSrc}" alt="Candidate Picture" class="avatar-img" ${crossOriginPolicy} onerror="this.onerror=null; this.src='${fallbackAvatar}';">
                            </div>
                            <h2 class="profile-name">${student.Name || '--'}</h2>
                            <div class="profile-pill">${student.Batch || '--'}</div>
                        </div>
                        <div class="right-col">
                            <div class="stats-grid">
                                <div class="stat-box"><div class="icon-box icon-blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3" ry="3"></rect><circle cx="12" cy="10" r="2"></circle><line x1="9" y1="15" x2="15" y2="15"></line></svg></div><div class="stat-details"><div class="stat-title">Roll Number</div><div class="stat-val">${student.RollNumber || '--'}</div></div></div>
                                <div class="stat-box"><div class="icon-box icon-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" ry="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg></div><div class="stat-details"><div class="stat-title">Subject</div><div class="stat-val">${student.Subject || '--'}</div></div></div>
                                <div class="stat-box"><div class="icon-box icon-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 10"></path><path d="M14 4H10"></path><path d="M4 12V22"></path><path d="M20 12V22"></path><rect x="8" y="10" width="8" height="12"></rect><rect x="2" y="14" width="6" height="8"></rect><rect x="16" y="14" width="6" height="8"></rect><path d="M10 22V18h4v4"></path></svg></div><div class="stat-details"><div class="stat-title">School</div><div class="stat-val">${student.School || '--'}</div></div></div>
                                <div class="stat-box"><div class="icon-box icon-yellow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg></div><div class="stat-details"><div class="stat-title">Mode of Class</div><div class="mode-toggles">${(student.Mode || '').toLowerCase() === 'online' ? `<span class="mode-inactive">Offline</span><span class="mode-active"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Online</span>` : `<span class="mode-active"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Offline</span><span class="mode-inactive">Online</span>`}</div></div></div>
                            </div>
                            <div class="score-card">
                                <div class="donut-chart" data-score="${marksNum}"><div class="donut-inner"><span class="score-num">0</span></div></div>
                                <div class="score-details"><div class="score-title">Marks Obtained out of 100</div><div class="score-grade">--</div><div class="progress-track"><div class="progress-fill"></div></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="testimonial-unit"><div class="test-content"><div class="test-avatar">${student.Tname || '--'}</div><div class="test-body-wrap"><div class="quote-mark quote-mark-open">"</div><p class="test-text">${student.Testimonial || '--'}</p><div class="quote-mark quote-mark-close">"</div></div></div></div>
                </div>
            </div>`;
            track.innerHTML += slideHTML;
        });
        setTimeout(() => { initializeAllScores(); initReportSlider(); }, 100);
    }
    
    function initializeAllScores() {
        document.querySelectorAll('#cbse-results-widget .slide-wrapper').forEach(wrapper => {
            const donutChart = wrapper.querySelector('.donut-chart'); if(!donutChart) return;
            let marks = parseInt(donutChart.getAttribute('data-score'), 10) || 0; marks = Math.max(0, Math.min(100, marks));
            let gradeText = "", colorHex = "";
            if (marks >= 90) { gradeText = "A+ Grade"; colorHex = "#16a34a"; } else if (marks >= 80) { gradeText = "A Grade"; colorHex = "#2563eb"; } else if (marks >= 70) { gradeText = "B+ Grade"; colorHex = "#ca8a04"; } else if (marks >= 60) { gradeText = "B Grade"; colorHex = "#ea580c"; } else { gradeText = "C Grade"; colorHex = "#dc2626"; }
            wrapper.querySelector('.score-num').innerText = marks; wrapper.querySelector('.score-num').style.color = colorHex; wrapper.querySelector('.score-grade').innerText = gradeText;
            setTimeout(() => { donutChart.style.background = `conic-gradient(${colorHex} 0% ${marks}%, var(--border-color) ${marks}% 100%)`; const progressBar = wrapper.querySelector('.progress-fill'); progressBar.style.width = `${marks}%`; progressBar.style.backgroundColor = colorHex; }, 50);
        });
    }
    
    function initReportSlider() {
        const track = document.getElementById('cbseSliderTrack'); 
        const slides = document.querySelectorAll('#cbse-results-widget .slide-wrapper'); 
        const dotsContainer = document.getElementById('cbseDotsContainer'); 
        dotsContainer.innerHTML = ''; 
        if(slides.length <= 1) return; 
        
        let currentIndex = 0, slideInterval;
        
        dotsContainer.innerHTML = `
            <button class="slider-arrow prev-arrow" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div class="slider-dots-line-wrapper">
                <div class="slider-dots-line"></div>
                <div class="slider-dots-inner"></div>
            </div>
            <button class="slider-arrow next-arrow" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `;
        
        const innerDots = dotsContainer.querySelector('.slider-dots-inner');
        
        slides.forEach((_, index) => {
            const dot = document.createElement('div'); 
            dot.classList.add('slider-dot'); 
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => { goToSlide(index); resetInterval(); }); 
            innerDots.appendChild(dot);
        });
        
        const dots = dotsContainer.querySelectorAll('.slider-dot');
        const prevBtn = dotsContainer.querySelector('.prev-arrow');
        const nextBtn = dotsContainer.querySelector('.next-arrow');
        
        function goToSlide(index) { 
            track.style.transform = `translateX(-${index * 100}%)`; 
            slides.forEach(s => s.classList.remove('active')); 
            dots.forEach(d => d.classList.remove('active')); 
            slides[index].classList.add('active'); 
            dots[index].classList.add('active'); 
            currentIndex = index; 
        }
        function nextSlide() { goToSlide((currentIndex + 1) % slides.length); }
        function prevSlide() { goToSlide((currentIndex - 1 + slides.length) % slides.length); }
        
        prevBtn.addEventListener('click', () => { prevSlide(); resetInterval(); });
        nextBtn.addEventListener('click', () => { nextSlide(); resetInterval(); });
        
        function startInterval() { slideInterval = setInterval(nextSlide, 6000); } 
        function resetInterval() { clearInterval(slideInterval); startInterval(); }
        startInterval();
    }
    
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCbseWidget); else initCbseWidget();
})();

document.addEventListener('contextmenu', function(event) { 
    event.preventDefault(); 
});