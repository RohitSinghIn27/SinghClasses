document.addEventListener('DOMContentLoaded', function() {
  
  // --- Centralized Reusable SVG Icons ---
  const CARD_ICONS = {
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    oneshot: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    notes: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    pro: `<span style="font-size: 13px; font-style: normal; display: inline-block;">💎</span>`,
    pyq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    mcq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    dpp: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    details: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
  };

  const toast = document.getElementById('scToast');
  let toastTimeout;

  function showToast(message) {
    if (toast) {
      toast.innerText = message;
      toast.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  // Prepend SVG icons dynamically
  document.querySelectorAll('.sc-card-links a').forEach(link => {
    const textLabel = link.textContent.trim();
    let markup = '';

    if (textLabel === "Download Now") markup = CARD_ICONS.download;
    else if (textLabel === "OneShot") markup = CARD_ICONS.oneshot;
    else if (textLabel === "Notes") markup = CARD_ICONS.notes;
    else if (textLabel === "Pro") markup = CARD_ICONS.pro;
    else if (textLabel === "PYQs") markup = CARD_ICONS.pyq;
    else if (textLabel === "MCQ") markup = CARD_ICONS.mcq;
    else if (textLabel === "DPP") markup = CARD_ICONS.dpp;
    else if (textLabel === "Details") markup = CARD_ICONS.details;

    if (markup) {
      link.innerHTML = `<span class="sc-svg-icon">${markup}</span> ${textLabel}`;
    }
  });

  // --- 1. COMING SOON TOAST & NEW DONUT CHART ---
  function initPieChartReadiness() {
    // UPDATED SELECTOR: Strictly target only links inside your dynamic resource cards.
    const allLinks = document.querySelectorAll('.sc-custom-card .sc-card-links a');
    let totalLinks = allLinks.length;
    
    if (totalLinks === 0) return; // Exit if no links are present to avoid NaN errors
    
    let counts = { u1: 0, u2: 0, u3: 0, other: 0, locked: 0 };
    let readyTotal = 0;

    // Dynamically calculate based entirely on the length of actual rendered nodes
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isReady = href && href !== '#' && href.trim() !== '';
      
      if (!isReady) {
        counts.locked++;
        link.classList.add('sc-locked');
        const iconSpan = link.querySelector('.sc-svg-icon');
        if (iconSpan) {
            iconSpan.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        }
        link.addEventListener('click', function(e) {
            e.preventDefault(); 
            showToast('🚧 We are currently preparing this material. Coming soon!');
        });
      } else {
        readyTotal++;
        const parentCard = link.closest('.sc-custom-card');
        const badge = parentCard ? parentCard.querySelector('.sc-unit-badge') : null;
        const badgeText = badge ? badge.textContent.toUpperCase() : '';

        if (badgeText.includes('UNIT III') || badgeText.includes('UNIT 3')) counts.u3++;
        else if (badgeText.includes('UNIT II') || badgeText.includes('UNIT 2')) counts.u2++;
        else if (badgeText.includes('UNIT I') || badgeText.includes('UNIT 1')) counts.u1++;
        else counts.other++;
      }
    });

    const overallPerc = Math.round((readyTotal / totalLinks) * 100) || 0;

    const pieData = [
      { label: 'Unit I', color: '#2563eb', count: counts.u1, perc: Math.round((counts.u1 / totalLinks) * 100) },
      { label: 'Unit II', color: '#65a30d', count: counts.u2, perc: Math.round((counts.u2 / totalLinks) * 100) },
      { label: 'Unit III', color: '#ea580c', count: counts.u3, perc: Math.round((counts.u3 / totalLinks) * 100) },
      { label: 'Others', color: '#9333ea', count: counts.other, perc: Math.round((counts.other / totalLinks) * 100) },
      { label: 'Remaining', color: '#cbd5e1', count: counts.locked, perc: Math.round((counts.locked / totalLinks) * 100) }
    ];

    // Helper to generate SVG Donut Chart
    function generateDonutSVG(data, total, centerText) {
      if (total === 0) return '';
      let svg = `<svg viewBox="-2 -2 104 104" style="width: 100%; height: 100%; display: block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.06));">`;
      let startAngle = -Math.PI / 2;
      
      data.forEach(slice => {
          if (slice.count === 0) return;
          let sliceAngle = (slice.count / total) * 2 * Math.PI;
          let endAngle = startAngle + sliceAngle;
          
          let x1 = 50 + 50 * Math.cos(startAngle);
          let y1 = 50 + 50 * Math.sin(startAngle);
          let x2 = 50 + 50 * Math.cos(endAngle);
          let y2 = 50 + 50 * Math.sin(endAngle);
          
          let largeArc = sliceAngle > Math.PI ? 1 : 0;
          
          if (slice.count === total) {
              svg += `<circle cx="50" cy="50" r="50" fill="${slice.color}" />`;
          } else {
              svg += `<path d="M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${slice.color}" class="sc-pie-slice" />`;
          }
          
          // Outer text percentage
          if (slice.perc > 8) {
             let midAngle = startAngle + sliceAngle / 2;
             let tx = 50 + 40 * Math.cos(midAngle);
             let ty = 50 + 40 * Math.sin(midAngle);
             svg += `<text x="${tx}" y="${ty}" fill="#ffffff" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central">${slice.perc}</text>`;
          }
          
          startAngle = endAngle;
      });

      // Hollow Center & Center Text with Label
      svg += `<circle cx="50" cy="50" r="28" class="sc-donut-center" />`;
      svg += `<text x="50" y="44" class="sc-donut-text-perc" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">${centerText}%</text>`;
      svg += `<text x="50" y="58" class="sc-donut-text-label" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">READY</text>`;
     
      svg += `</svg>`;
      return svg;
    }

    const pieContainer = document.getElementById('dynamic-pie-container');
    const legendContainer = document.getElementById('dynamic-pie-legend');
    const subtitleEl = document.getElementById('mp-subtitle-custom');
    
    if (pieContainer && legendContainer && subtitleEl) {
        subtitleEl.textContent = `${readyTotal} of ${totalLinks}`;
        pieContainer.innerHTML = generateDonutSVG(pieData, totalLinks, overallPerc);
        
        let legendHTML = '';
        pieData.forEach(d => {
            if(d.count > 0 || d.label === 'Remaining') { // Only render if relevant or locked
                let colorCls = d.label === 'Remaining' ? 'sc-legend-muted' : 'sc-legend-active';
                legendHTML += `
                  <div class="sc-legend-item">
                    <div class="sc-legend-left">
                      <span class="sc-legend-dot" style="background:${d.color};"></span>
                      <span class="sc-legend-label ${colorCls}">${d.label}</span>
                    </div>
                    <span class="sc-legend-val ${colorCls}">${d.count} (${d.perc}%)</span>
                  </div>
                `;
            }
        });
        legendContainer.innerHTML = legendHTML;
    }

    // Calculate per-section progress and append bar
    const columns = document.querySelectorAll('.sc-column');
    columns.forEach(col => {
        const colLinks = col.querySelectorAll('.sc-custom-card .sc-card-links a');
        if (colLinks.length === 0) return;
        
        let colReady = 0;
        colLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && href.trim() !== '') {
                colReady++;
            }
        });
        
        const colPerc = Math.round((colReady / colLinks.length) * 100) || 0;
        const title = col.querySelector('.sc-section-title');
        
        if (title && !col.querySelector('.sc-section-progress-track')) {
            const track = document.createElement('div');
            track.className = 'sc-section-progress-track';
            const fill = document.createElement('div');
            fill.className = 'sc-section-progress-fill';
            fill.style.width = colPerc + '%';
            track.appendChild(fill);
            
            // Insert after title
            title.parentNode.insertBefore(track, title.nextSibling);
        }
    });
  }

  initPieChartReadiness();

  // --- 2. VIDEO CONFIRMATION MODAL ---
  const videoModal = document.getElementById('scVideoModal');
  const btnStay = document.getElementById('scModalStay');
  const btnWatch = document.getElementById('scModalWatch');
  let currentVideoUrl = '';

  document.querySelectorAll('.sc-btn-oneshot').forEach(link => {
      link.addEventListener('click', function(e) {
          const href = this.getAttribute('href');
          if (href && href !== '#' && href.trim() !== '' && !this.classList.contains('sc-locked')) {
              if (videoModal) {
                  e.preventDefault();
                  currentVideoUrl = href;
                  videoModal.classList.add('show');
              }
          }
      });
  });

  if (btnStay && videoModal) {
      btnStay.addEventListener('click', () => {
          videoModal.classList.remove('show');
          currentVideoUrl = '';
      });
  }

  if (btnWatch && videoModal) {
      btnWatch.addEventListener('click', () => {
          if (currentVideoUrl) {
              window.open(currentVideoUrl, '_blank');
              videoModal.classList.remove('show');
              currentVideoUrl = '';
          }
      });
  }

  // --- 3. FLOATING ACTIONS LOGIC ---
  const shareBtn = document.getElementById('scShareBtn');
  const scrollBtn = document.getElementById('scScrollToggleBtn');
  const darkModeBtn = document.getElementById('scDarkModeBtn');

  // Dark Mode Logic
  if (darkModeBtn) {
    const sunIcon = darkModeBtn.querySelector('.sc-sun-icon');
    const moonIcon = darkModeBtn.querySelector('.sc-moon-icon');

    if (localStorage.getItem('sc-theme') === 'dark') {
      document.body.classList.add('sc-dark-mode');
      if(sunIcon && moonIcon) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    }

    darkModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('sc-dark-mode');
      
      if (document.body.classList.contains('sc-dark-mode')) {
        localStorage.setItem('sc-theme', 'dark');
        if(sunIcon && moonIcon) { sunIcon.style.display = 'block'; moonIcon.style.display = 'none'; }
      } else {
        localStorage.setItem('sc-theme', 'light');
        if(sunIcon && moonIcon) { sunIcon.style.display = 'none'; moonIcon.style.display = 'block'; }
      }
    });
  }

  // Share Logic
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const isDesktop = (window.innerWidth > 768 && !('ontouchstart' in window) && !navigator.maxTouchPoints);

      if (isDesktop) {
        navigator.clipboard.writeText(window.location.href).then(() => { 
          showToast('URL Copied! Ready to paste.'); 
        }).catch(() => {
          showToast('Unable to copy URL automatically.');
        });
      } else {
        if (navigator.share) {
          try { await navigator.share({ title: document.title, url: window.location.href }); } 
          catch (err) { console.log('Error sharing:', err); }
        } else {
          navigator.clipboard.writeText(window.location.href).then(() => { 
            showToast('URL Copied! Ready to paste.'); 
          });
        }
      }
    });
  }

  // Scroll to Top/Bottom
  if (scrollBtn) {
    const checkScroll = () => {
      if (window.scrollY > 150) scrollBtn.classList.remove('sc-point-down');
      else scrollBtn.classList.add('sc-point-down');
    };

    window.addEventListener('scroll', checkScroll);
    checkScroll(); 

    scrollBtn.addEventListener('click', () => {
      if (window.scrollY > 150) window.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  // --- 4. PARTICLE CANVAS INITIALIZATION ---
  function initParticleCanvas(containerId, canvasId, particleCount, connectionDistance) {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId);
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };

    function resizeCanvas() {
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    container.addEventListener('mousemove', function(e) {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    container.addEventListener('mouseleave', function() {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.8; 
        this.vy = (Math.random() - 0.5) * 0.8; 
        this.radius = 1.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (document.body.classList.contains('sc-dark-mode')) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        } else {
            ctx.fillStyle = 'rgba(21, 104, 69, 0.4)';
        }
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        for (let j = i + 1; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x;
          let dy = particles[i].y - particles[j].y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            if (document.body.classList.contains('sc-dark-mode')) {
                ctx.strokeStyle = `rgba(148, 163, 184, ${0.25 - (dist/connectionDistance) * 0.25})`;
            } else {
                ctx.strokeStyle = `rgba(21, 104, 69, ${0.25 - (dist/connectionDistance) * 0.25})`;
            }
            
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        
        if (mouse.x !== null && mouse.y !== null) {
          let dx = particles[i].x - mouse.x;
          let dy = particles[i].y - mouse.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            
            if (document.body.classList.contains('sc-dark-mode')) {
                ctx.strokeStyle = `rgba(148, 163, 184, ${0.35 - (dist/100) * 0.35})`;
            } else {
                ctx.strokeStyle = `rgba(21, 104, 69, ${0.35 - (dist/100) * 0.35})`;
            }
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  try {
      initParticleCanvas('colA', 'canvasA', 35, 60);
      initParticleCanvas('colB', 'canvasB', 35, 60);
      initParticleCanvas('colC', 'canvasC', 35, 60);
      initParticleCanvas('bottomSection', 'canvasBottom', 40, 75);
  } catch(e) {}

  // --- 5. IN-CARD NAV (Scroll without tracking position) ---
  const navLinks = document.querySelectorAll('.sc-hero-tab');
  if (navLinks.length > 0) {
      navLinks.forEach(link => {
          link.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Remove active class from all, add to clicked
              navLinks.forEach(l => l.classList.remove('active'));
              this.classList.add('active');

              const targetId = this.getAttribute('href').substring(1);
              const targetSection = document.getElementById(targetId);
              if (targetSection) {
                  const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - 20;
                  window.scrollTo({
                      top: targetPosition,
                      behavior: 'smooth'
                  });
              }
          });
      });
  }
});