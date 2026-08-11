document.addEventListener('DOMContentLoaded', function() {

  // Set current year dynamically in footer
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Centralized SVG Icons
  const CARD_ICONS = {
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    oneshot: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    notes: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    pro: `<span style="font-size: 13px; font-style: normal; display: inline-block;">💎</span>`,
    pyq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    mcq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 16 14"></polyline></svg>`,
    dpp: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    details: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
    lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
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
    if (link.querySelector('.sc-svg-icon')) return;

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

  // Donut SVG Generator
  function generateDonutSVG(data, total, centerText) {
    if (total === 0) return '';
    let svg = `<svg viewBox="-2 -2 104 104" style="width: 100%; height: 100%; display: block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.06));">`;
    let startAngle = -Math.PI / 2;

    data.forEach(slice => {
      if (slice.count === 0) return;
      let sliceAngle = (slice.count / total) * 2 * Math.PI;
      let endAngle = startAngle + sliceAngle;

      let x1 = (50 + 50 * Math.cos(startAngle)).toFixed(4);
      let y1 = (50 + 50 * Math.sin(startAngle)).toFixed(4);
      let x2 = (50 + 50 * Math.cos(endAngle)).toFixed(4);
      let y2 = (50 + 50 * Math.sin(endAngle)).toFixed(4);

      let largeArc = sliceAngle > Math.PI ? 1 : 0;

      if (slice.count === total) {
        svg += `<circle cx="50" cy="50" r="50" fill="${slice.color}" />`;
      } else {
        svg += `<path d="M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${slice.color}" class="sc-pie-slice" />`;
      }

      if (slice.perc > 8) {
        let midAngle = startAngle + sliceAngle / 2;
        let tx = (50 + 40 * Math.cos(midAngle)).toFixed(4);
        let ty = (50 + 40 * Math.sin(midAngle)).toFixed(4);
        svg += `<text x="${tx}" y="${ty}" fill="#ffffff" font-size="12" font-family="monospace" font-weight="bold" text-anchor="middle" dominant-baseline="central">${slice.perc}</text>`;
      }

      startAngle = endAngle;
    });

    svg += `<circle cx="50" cy="50" r="28" class="sc-donut-center" />`;
    svg += `<text x="50" y="44" class="sc-donut-text-perc" text-anchor="middle" dominant-baseline="central">${centerText}%</text>`;
    svg += `<text x="50" y="58" class="sc-donut-text-label" text-anchor="middle" dominant-baseline="central">READY</text>`;
    svg += `</svg>`;
    return svg;
  }

  // Calculate Progress and Fill Section Progress Lines
  function initPieChartReadiness() {
    const allLinks = document.querySelectorAll('.sc-custom-card .sc-card-links a');
    let totalLinks = allLinks.length;

    if (totalLinks === 0) return;

    let counts = { u1: 0, u2: 0, u3: 0, other: 0, locked: 0 };
    let readyTotal = 0;

    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isReady = href && href !== '#' && href.trim() !== '';

      if (!isReady) {
        counts.locked++;
        link.classList.add('sc-locked');
        let iconSpan = link.querySelector('.sc-svg-icon');
        if (!iconSpan) {
          iconSpan = document.createElement('span');
          iconSpan.className = 'sc-svg-icon';
          link.insertBefore(iconSpan, link.firstChild);
        }
        iconSpan.innerHTML = CARD_ICONS.lock;

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
      { label: 'Unit I', color: '#1f8a70', count: counts.u1, perc: Math.round((counts.u1 / totalLinks) * 100) },
      { label: 'Unit II', color: '#b8862f', count: counts.u2, perc: Math.round((counts.u2 / totalLinks) * 100) },
      { label: 'Unit III', color: '#ea580c', count: counts.u3, perc: Math.round((counts.u3 / totalLinks) * 100) },
      { label: 'Others', color: '#9333ea', count: counts.other, perc: Math.round((counts.other / totalLinks) * 100) },
      { label: 'Remaining', color: '#5b6178', count: counts.locked, perc: Math.round((counts.locked / totalLinks) * 100) }
    ];

    const pieContainer = document.getElementById('dynamic-pie-container');
    const legendContainer = document.getElementById('dynamic-pie-legend');
    const subtitleEl = document.getElementById('mp-subtitle-custom');

    if (pieContainer && legendContainer && subtitleEl) {
      subtitleEl.textContent = `${readyTotal} of ${totalLinks}`;
      pieContainer.innerHTML = generateDonutSVG(pieData, totalLinks, overallPerc);

      let legendHTML = '';
      pieData.forEach(d => {
        if (d.count > 0 || d.label === 'Remaining') {
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

    // Update the Section Progress Bars under Part A, Part B, and Part C Headers
    const columns = document.querySelectorAll('.sc-column');
    columns.forEach(col => {
      const colLinks = col.querySelectorAll('.sc-custom-card .sc-card-links a');
      if (colLinks.length === 0) return;

      let colReady = 0;
      colLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href.trim() !== '') colReady++;
      });

      const colPerc = Math.round((colReady / colLinks.length) * 100) || 0;
      const track = col.querySelector('.sc-section-progress-track');
      if (track) {
        const fill = track.querySelector('.sc-section-progress-fill');
        if (fill) {
          fill.style.width = colPerc + '%';
        }
      }
    });
  }

  initPieChartReadiness();

  // Video Modal Intercept
  const videoModal = document.getElementById('scVideoModal');
  const btnStay = document.getElementById('scModalStay');
  const btnWatch = document.getElementById('scModalWatch');
  let currentVideoUrl = '';

  function isVideoUrl(url) {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  }

  document.querySelectorAll('.sc-btn-oneshot').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#' && href.trim() !== '' && !this.classList.contains('sc-locked') && isVideoUrl(href)) {
        if (videoModal) {
          e.preventDefault();
          currentVideoUrl = href;
          videoModal.classList.add('show');
        }
      }
    });
  });

  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        videoModal.classList.remove('show');
        currentVideoUrl = '';
      }
    });
  }

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

  // Hero Navigation Smooth Scroll
  const navLinks = document.querySelectorAll('.sc-hero-tab');
  if (navLinks.length > 0) {
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');

        if (href && href.startsWith('#') && href.length > 1) {
          navLinks.forEach(l => l.classList.remove('active'));
          this.classList.add('active');

          const targetId = href.substring(1);
          const targetSection = document.getElementById(targetId);
          if (targetSection) {
            const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - 20;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
          }
        }
      });
    });
  }

  // Canvas Ambient Particle Animations
  const canvasIds = ['canvasA', 'canvasB', 'canvasC', 'canvasBottom'];
  canvasIds.forEach(id => {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    function resizeCanvas() {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }

    function initParticles() {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000) || 12;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4,
          alpha: Math.random() * 0.3 + 0.1
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 116, 139, ${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', () => {
      cancelAnimationFrame(animationFrameId);
      resizeCanvas();
      initParticles();
      animate();
    });
  });
});