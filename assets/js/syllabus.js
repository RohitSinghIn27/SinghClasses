document.addEventListener('DOMContentLoaded', function() {
  // 1. Dynamic Footer Year
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2. Centralized SVG Icons
  const CARD_ICONS = {
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    oneshot: `<svg viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="4" width="17" height="16" rx="3.5" fill="currentColor"/><path d="M18 9.5L24.2 5.8C24.8 5.4 25.5 5.9 25.5 6.6V17.4C25.5 18.1 24.8 18.6 24.2 18.2L18 14.5V9.5Z" fill="currentColor"/><polygon points="7.5,8.3 7.5,15.7 13.8,12" fill="#ffffff"/></svg>`,
    notes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line></svg>`,
    pro: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3H18L22 9L12 21L2 9L6 3Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 9H22" stroke="#bae6fd" stroke-width="1.5"/><path d="M12 21L8 9L10 3" stroke="#bae6fd" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 21L16 9L14 3" stroke="#0284c7" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    pyq: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><rect x="8" y="6" width="13" height="16" rx="2"></rect><line x1="11.5" y1="11" x2="17.5" y2="11"></line><line x1="11.5" y1="14.5" x2="17.5" y2="14.5"></line><line x1="11.5" y1="18" x2="15" y2="18"></line></svg>`,
    pyqs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path><rect x="8" y="6" width="13" height="16" rx="2"></rect><line x1="11.5" y1="11" x2="17.5" y2="11"></line><line x1="11.5" y1="14.5" x2="17.5" y2="14.5"></line><line x1="11.5" y1="18" x2="15" y2="18"></line></svg>`,
    mcq: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><circle cx="9" cy="12" r="1" fill="currentColor"></circle><line x1="12.5" y1="12" x2="16.5" y2="12"></line><circle cx="9" cy="16" r="1" fill="currentColor"></circle><line x1="12.5" y1="16" x2="16.5" y2="16"></line></svg>`,
    dpp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7"></path><path d="M14 2v6h6"></path><line x1="8" y1="11" x2="14" y2="11"></line><line x1="8" y1="15" x2="12" y2="15"></line><path d="M18.5 14.5a1.8 1.8 0 0 1 2.5 2.5L16 22l-3.5 1 1-3.5 5-5z"></path></svg>`,
    roadmap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"></path></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" ry="2.5"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`
  };

  const toast = document.getElementById('scToast');
  let toastTimeout;
  function showToast(msg) {
    if (toast) {
      toast.innerText = msg;
      toast.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
    }
  }

  // 3. Format Unit Badge Left Pill
  document.querySelectorAll('.sc-unit-badge').forEach(badge => {
    const firstSpan = badge.querySelector('span:first-child');
    if (!firstSpan || firstSpan.querySelector('.sc-badge-hl')) return;

    const rawText = firstSpan.textContent.trim();
    if (rawText.includes('·') || rawText.includes('•')) {
      const parts = rawText.split(/[·•]/);
      const prefix = parts[0].trim();
      const suffix = parts.slice(1).join('·').trim();
      firstSpan.innerHTML = `<span class="sc-badge-hl">${prefix}</span><span class="sc-badge-dot">•</span><span>${suffix}</span>`;
    } else {
      firstSpan.innerHTML = `<span class="sc-badge-hl">${rawText}</span>`;
    }
  });

  // 4. Prepend SVG icons & append chevron badges
  document.querySelectorAll('.sc-card-links a').forEach(link => {
    link.querySelectorAll('svg:not(.sc-svg-icon svg):not(.sc-btn-arrow svg)').forEach(el => el.remove());

    if (link.querySelector('.sc-svg-icon')) return;
    const text = link.textContent.trim();
    const key = text.toLowerCase().replace(/[\s_-]+/g, '');

    let icon =
      CARD_ICONS[key] ||
      CARD_ICONS[text.toLowerCase()] ||
      (link.classList.contains('sc-btn-oneshot') ? CARD_ICONS.oneshot : '') ||
      (link.classList.contains('sc-btn-pro') ? CARD_ICONS.pro : '') ||
      (link.classList.contains('sc-btn-pyq') ? CARD_ICONS.pyq : '') ||
      (link.classList.contains('sc-btn-mcq') ? CARD_ICONS.mcq : '') ||
      (link.classList.contains('sc-btn-dpp') ? CARD_ICONS.dpp : '') ||
      (link.classList.contains('sc-btn-notes') ? CARD_ICONS.notes : '') ||
      (text === 'Download Now' ? CARD_ICONS.download : CARD_ICONS.notes);

    link.innerHTML = `
      <span class="sc-svg-icon">${icon}</span>
      <span class="sc-btn-label">${text}</span>
      <span class="sc-btn-arrow" aria-hidden="true">${CARD_ICONS.chevronRight}</span>
    `;
  });

  // 5. Generate Donut SVG
  function generateDonutSVG(data, total, centerText) {
    if (total === 0) return '';
    let svg = `<svg viewBox="-2 -2 104 104" style="width:100%;height:100%;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.05));">`;
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

  // 6. Section-Wise Resource Availability Calculation & Legend Generator
  function initResourceAvailability() {
    const allLinks = document.querySelectorAll('.sc-custom-card .sc-card-links a');
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isReady = href && href !== '#' && href.trim() !== '';
      if (!isReady) {
        link.classList.add('sc-locked');
        link.setAttribute('aria-disabled', 'true');
        let iconSpan = link.querySelector('.sc-svg-icon');
        if (!iconSpan) {
          iconSpan = document.createElement('span');
          iconSpan.className = 'sc-svg-icon';
          link.insertBefore(iconSpan, link.firstChild);
        }
        iconSpan.innerHTML = CARD_ICONS.lock;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showToast('🚧 Coming Soon: This study resource is currently being prepared.');
        });
      }
    });

    let targetSections = document.querySelectorAll('.sc-column[data-count-to-content="true"]');
    if (targetSections.length === 0) targetSections = document.querySelectorAll('.sc-column');

    const SECTION_PALETTE = ['#0649B8', '#D97706', '#059669', '#6D28D9', '#DC2626', '#0284C7'];
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
      label: 'Coming Soon',
      color: '#94A3B8',
      count: totalLockedLinks,
      perc: Math.round((totalLockedLinks / totalTrackedLinks) * 100) || 0
    });

    const overallPerc = Math.round((totalReadyLinks / totalTrackedLinks) * 100) || 0;

    const pieContainer = document.getElementById('dynamic-pie-container');
    const legendContainer = document.getElementById('dynamic-pie-legend');
    const subtitleEl = document.getElementById('mp-subtitle-custom');
    const overallBarFill = document.getElementById('sc-overall-bar-fill');

    if (pieContainer && legendContainer && subtitleEl) {
      subtitleEl.textContent = `${totalReadyLinks} of ${totalTrackedLinks} Live`;
      if (overallBarFill) overallBarFill.style.width = `${overallPerc}%`;
      pieContainer.innerHTML = generateDonutSVG(pieData, totalTrackedLinks, overallPerc);

      legendContainer.innerHTML = pieData.map(d => `
        <div class="sc-legend-item">
          <div class="sc-legend-left">
            <span class="sc-legend-dot" style="background:${d.color};"></span>
            <span class="sc-legend-label ${d.label === 'Coming Soon' ? 'sc-legend-muted' : 'sc-legend-active'}">${d.label}</span>
          </div>
          <span class="sc-legend-val ${d.label === 'Coming Soon' ? 'sc-legend-muted' : 'sc-legend-active'}">${d.count} (${d.perc}%)</span>
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

  initResourceAvailability();

  // 7. Video Modal Intercept
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
          btnWatch.focus();
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

  // 8. Hero Tabs Smooth Scroll
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

  // 9. Mobile Navigation Hamburger Menu Toggle
  const hamburgerBtn = document.getElementById('hamburgerToggle');
  const navMenu = document.getElementById('nav-menu');
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', function() {
      navMenu.classList.toggle('open');
      const isExpanded = navMenu.classList.contains('open');
      hamburgerBtn.setAttribute('aria-expanded', isExpanded);
    });
  }

  // 10. Reusable CBT Button Component
  function buildCBTButtonHTML(href = '#', highlight = 'Attempt the CBT', text = 'of CBSE Objective Questions') {
    const targetAttr = href && href !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `
      <div class="sc-cbt-wrapper">
        <a href="${href}" class="sc-cbt-btn"${targetAttr}>
          <span class="sc-cbt-doc-icon" aria-hidden="true">
            <svg width="24" height="26" viewBox="0 0 32 34" fill="none">
              <path d="M4 4C4 2.34315 5.34315 1 7 1H19L26 8V27C26 28.6569 24.6569 30 23 30H7C5.34315 30 4 28.6569 4 27V4Z" fill="#ffffff"/>
              <path d="M19 1L26 8H21C19.8954 8 19 7.10457 19 6V1Z" fill="#BFDBFE"/>
              <rect x="8" y="12" width="12" height="2" rx="1" fill="#0649B8"/>
              <rect x="8" y="16" width="12" height="2" rx="1" fill="#0649B8"/>
              <rect x="8" y="20" width="8" height="2" rx="1" fill="#0649B8"/>
              <circle cx="24" cy="26" r="7" fill="#F5C400"/>
              <path d="M21.2 26.2L23.1 28.1L26.8 24.2" stroke="#061B4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="sc-cbt-label">
            <strong class="sc-cbt-highlight">${highlight}</strong>
            <span class="sc-cbt-subtext">${text}</span>
          </span>
          <span class="sc-cbt-divider" aria-hidden="true"></span>
          <span class="sc-cbt-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
        </a>
      </div>
    `;
  }

  function initCBTButtons() {
    document.querySelectorAll('.sc-cbt-section').forEach(section => {
      const href = section.getAttribute('data-cbt-href') || '#';
      const highlight = section.getAttribute('data-cbt-highlight') || 'Attempt the CBT';
      const text = section.getAttribute('data-cbt-text') || 'of CBSE Objective Questions';

      if (!section.querySelector('.sc-cbt-btn')) {
        section.innerHTML = buildCBTButtonHTML(href, highlight, text);
      }

      const btn = section.querySelector('.sc-cbt-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          const currentHref = btn.getAttribute('href');
          if (!currentHref || currentHref === '#' || currentHref.trim() === '') {
            e.preventDefault();
            showToast('🚧 Coming Soon: This study resource is currently being prepared.');
          }
        });
      }
    });
  }

  window.renderCBTButton = function(targetSelector, options = {}) {
    const container = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
    if (!container) return;
    const section = document.createElement('div');
    section.className = 'sc-cbt-section';
    section.setAttribute('data-cbt-href', options.href || '#');
    section.setAttribute('data-cbt-highlight', options.highlight || 'Attempt the CBT');
    section.setAttribute('data-cbt-text', options.text || 'of CBSE Objective Questions');
    container.appendChild(section);
    initCBTButtons();
  };

  initCBTButtons();
});