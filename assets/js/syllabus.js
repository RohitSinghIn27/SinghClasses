document.addEventListener('DOMContentLoaded', function() {
  // 1. Dynamic Footer Year
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2. Centralized SVG Icons (Roadmap enhanced with Tailwind CSS utilities)
const CARD_ICONS = {
    download: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    oneshot: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    notes: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    pro: `<span style="font-size: 11px; line-height: 1; display: inline-block;">💎</span>`,
    pyq: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    pyqs: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
roadmap: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"></path></svg>`,    lock: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
  };

  const toast = document.getElementById('scToast');
  let toastTimeout;
  function showToast(msg) {
    if (toast) {
      toast.innerText = msg;
      toast.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  // 3. Prepend SVG icons dynamically (Cleans up any manual inline SVGs to prevent duplicates)
  document.querySelectorAll('.sc-card-links a').forEach(link => {
    link.querySelectorAll('svg:not(.sc-svg-icon svg)').forEach(el => el.remove());

    if (link.querySelector('.sc-svg-icon')) return;
    const text = link.textContent.trim();
    const key = text.toLowerCase().replace(/[\s_-]+/g, '');

    let icon = CARD_ICONS[key] || CARD_ICONS[text.toLowerCase()] || (text === "Download Now" ? CARD_ICONS.download : '');
    if (icon) {
      link.innerHTML = `<span class="sc-svg-icon">${icon}</span><span>${text}</span>`;
    }
  });

  // 4. Generate Donut SVG
  function generateDonutSVG(data, total, centerText) {
    if (total === 0) return '';
    let svg = `<svg viewBox="-2 -2 104 104" style="width:100%;height:100%;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.06));">`;
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

      svg += slice.count === total 
        ? `<circle cx="50" cy="50" r="50" fill="${slice.color}" />`
        : `<path d="M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${slice.color}" class="sc-pie-slice" />`;

      startAngle = endAngle;
    });

    svg += `<circle cx="50" cy="50" r="28" class="sc-donut-center" />
            <text x="50" y="44" class="sc-donut-text-perc" text-anchor="middle" dominant-baseline="central">${centerText}%</text>
            <text x="50" y="58" class="sc-donut-text-label" text-anchor="middle" dominant-baseline="central">READY</text>
            </svg>`;
    return svg;
  }

  // 5. Section-Wise Readiness Calculation & Legend Generator
  function initPieChartReadiness() {
    const allLinks = document.querySelectorAll('.sc-custom-card .sc-card-links a');
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isReady = href && href !== '#' && href.trim() !== '';
      if (!isReady) {
        link.classList.add('sc-locked');
        let iconSpan = link.querySelector('.sc-svg-icon');
        if (!iconSpan) {
          iconSpan = document.createElement('span');
          iconSpan.className = 'sc-svg-icon';
          link.insertBefore(iconSpan, link.firstChild);
        }
        iconSpan.innerHTML = CARD_ICONS.lock;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showToast('🚧 We are currently preparing this material. Coming soon!');
        });
      }
    });

    let targetSections = document.querySelectorAll('.sc-column[data-count-to-content="true"]');
    if (targetSections.length === 0) targetSections = document.querySelectorAll('.sc-column');

    const SECTION_PALETTE = ['#2563eb', '#ca8a04', '#ea580c', '#9333ea', '#059669', '#0284c7'];
    let pieData = [];
    let totalTrackedLinks = 0;
    let totalReadyLinks = 0;
    let totalLockedLinks = 0;

    targetSections.forEach((section, idx) => {
      const titleEl = section.querySelector('.sc-section-title');
      let rawTitle = titleEl ? titleEl.textContent.trim() : `Section ${idx + 1}`;
      
      let match = rawTitle.match(/Section\s+[A-Z0-9]+/i);
      let sectionLabel = match ? match[0] : (rawTitle.split(/[:|•]/)[0].trim() || `Section ${idx + 1}`);

      const secLinks = section.querySelectorAll('.sc-custom-card .sc-card-links a');
      let secReady = 0;
      let secLocked = 0;

      secLinks.forEach(l => {
        const href = l.getAttribute('href');
        if (href && href !== '#' && href.trim() !== '') {
          secReady++;
        } else {
          secLocked++;
        }
      });

      totalTrackedLinks += secLinks.length;
      totalReadyLinks += secReady;
      totalLockedLinks += secLocked;

      pieData.push({
        label: sectionLabel,
        color: SECTION_PALETTE[idx % SECTION_PALETTE.length],
        count: secReady
      });
    });

    if (totalTrackedLinks === 0) return;

    pieData.forEach(d => {
      d.perc = Math.round((d.count / totalTrackedLinks) * 100) || 0;
    });

    pieData.push({
      label: 'Pending',
      color: '#64748b',
      count: totalLockedLinks,
      perc: Math.round((totalLockedLinks / totalTrackedLinks) * 100) || 0
    });

    const overallPerc = Math.round((totalReadyLinks / totalTrackedLinks) * 100) || 0;

    const pieContainer = document.getElementById('dynamic-pie-container');
    const legendContainer = document.getElementById('dynamic-pie-legend');
    const subtitleEl = document.getElementById('mp-subtitle-custom');

    if (pieContainer && legendContainer && subtitleEl) {
      subtitleEl.textContent = `${totalReadyLinks} of ${totalTrackedLinks}`;
      pieContainer.innerHTML = generateDonutSVG(pieData, totalTrackedLinks, overallPerc);

      legendContainer.innerHTML = pieData.map(d => `
        <div class="sc-legend-item">
          <div class="sc-legend-left">
            <span class="sc-legend-dot" style="background:${d.color};"></span>
            <span class="sc-legend-label ${d.label === 'Pending' ? 'sc-legend-muted' : 'sc-legend-active'}">${d.label}</span>
          </div>
          <span class="sc-legend-val ${d.label === 'Pending' ? 'sc-legend-muted' : 'sc-legend-active'}">${d.count} (${d.perc}%)</span>
        </div>
      `).join('');
    }

    document.querySelectorAll('.sc-column').forEach(col => {
      const colLinks = col.querySelectorAll('.sc-custom-card .sc-card-links a');
      if (colLinks.length === 0) return;

      let colReady = 0;
      colLinks.forEach(l => {
        const href = l.getAttribute('href');
        if (href && href !== '#' && href.trim() !== '') colReady++;
      });

      const track = col.querySelector('.sc-section-progress-track .sc-section-progress-fill');
      if (track) track.style.width = `${Math.round((colReady / colLinks.length) * 100)}%`;
    });
  }

  initPieChartReadiness();

  // 6. Video Modal Intercept
  const videoModal = document.getElementById('scVideoModal');
  const btnStay = document.getElementById('scModalStay');
  const btnWatch = document.getElementById('scModalWatch');
  let currentVideoUrl = '';

  const isVideoUrl = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com'));

  document.querySelectorAll('.sc-btn-oneshot').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#' && !this.classList.contains('sc-locked') && isVideoUrl(href)) {
        if (videoModal) {
          e.preventDefault();
          currentVideoUrl = href;
          videoModal.classList.add('show');
        }
      }
    });
  });

  const closeModal = () => { if (videoModal) videoModal.classList.remove('show'); currentVideoUrl = ''; };
  if (videoModal) videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeModal(); });
  if (btnStay) btnStay.addEventListener('click', closeModal);
  if (btnWatch) btnWatch.addEventListener('click', () => {
    if (currentVideoUrl) {
      window.open(currentVideoUrl, '_blank');
      closeModal();
    }
  });

  // 7. Hero Tabs Smooth Scroll
  const navTabs = document.querySelectorAll('.sc-hero-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href?.startsWith('#') && href.length > 1) {
        navTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const target = document.getElementById(href.substring(1));
        if (target) {
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
        }
      }
    });
  });

  // 8. Mobile Navigation Hamburger Menu Toggle
  const hamburgerBtn = document.getElementById('hamburgerToggle');
  const navMenu = document.getElementById('nav-menu');
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', function() {
      navMenu.classList.toggle('open');
      const isExpanded = navMenu.classList.contains('open');
      hamburgerBtn.setAttribute('aria-expanded', isExpanded);
    });
  }

  // 9. Ambient Canvas Particles
  ['canvasA', 'canvasB', 'canvasC', 'canvasD', 'canvasBottom'].forEach(id => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };

    const init = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 16000) || 10;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 1,
          dx: (Math.random() - 0.5) * 0.35,
          dy: (Math.random() - 0.5) * 0.35,
          a: Math.random() * 0.25 + 0.1
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 116, 139, ${p.a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();

    window.addEventListener('resize', () => {
      cancelAnimationFrame(animId);
      resize();
      init();
      draw();
    });
  });
});