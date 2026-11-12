/**
 * SinghClasses — Reusable Projects Page Engine (Modular Architecture)
 */
(function () {
  'use strict';

  /* ========================================================================
     1. Page-Specific Project Catalog Data (Injected via HTML)
     ======================================================================== */
  const PROJECTS_DATA = Array.isArray(window.SC_PROJECTS_DATA)
    ? window.SC_PROJECTS_DATA
    : [];

  /* ========================================================================
     2. Reusable SVG Icon Templates
     ======================================================================== */
  const TechIcons = {
    Python: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#38bdf8" d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.42 3.35-3.42h5.766s3.24.052 3.24-3.148V3.202S18.28 0 11.914 0zM8.708 1.85c.578 0 1.046.47 1.046 1.048 0 .578-.468 1.047-1.046 1.047-.579 0-1.047-.469-1.047-1.047 0-.578.468-1.048 1.047-1.048z"/>
        <path fill="#fbbf24" d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121S24 18.211 24 12.031c0-6.18-3.403-5.96-3.403-5.96h-2.03v2.867s.109 3.42-3.35 3.42H9.451s-3.24-.052-3.24 3.148v5.292S5.72 24 12.086 24zm3.206-1.85c-.578 0-1.046-.47-1.046-1.048 0-.578.468-1.047 1.046-1.047.579 0 1.047.469 1.047 1.047 0 .578-.468 1.048-1.047 1.048z"/>
      </svg>`,
    MySQL: `
      <svg viewBox="0 0 24 24" fill="#60a5fa" aria-hidden="true">
        <path d="M12 2C6.48 2 2 3.79 2 6v2c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zm0 12c-5.52 0-10-1.79-10-4v3c0 2.21 4.48 4 10 4s10-1.79 10-4v-3c0 2.21-4.48 4-10 4zm0 5c-5.52 0-10-1.79-10-4v3c0 2.21 4.48 4 10 4s10-1.79 10-4v-3c0 2.21-4.48 4-10 4z"/>
      </svg>`,
    Pandas: `
      <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <line x1="6" y1="4" x2="6" y2="20"/>
        <line x1="12" y1="7" x2="12" y2="17"/>
        <line x1="18" y1="4" x2="18" y2="20"/>
      </svg>`,
    CSV: `
      <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>`
  };

  /* ========================================================================
     3. Project Card Renderer Module
     ======================================================================== */
  const ProjectCatalogModule = {
    createTechPills(techList) {
      if (!Array.isArray(techList)) return '';
      return techList
        .map(
          (name) => `
            <span class="sc-flip-tech-pill">
              ${TechIcons[name] || ''}
              ${name}
            </span>`
        )
        .join('');
    },

    createCardElement(project) {
      const article = document.createElement('article');
      article.className = 'sc-custom-card';
      article.setAttribute('data-category', project.category);

      const techAltLabel = Array.isArray(project.tech) ? project.tech.join(' ') : 'Python';

      article.innerHTML = `
        <div class="sc-unit-badge">
          <span>Project ${project.number}</span>
          <span class="sc-badge-category sc-cat-${project.category}" title="Category: ${project.categoryLabel}">
            ${project.categoryLabel}
          </span>
        </div>

        <div class="sc-card-media">
          <div class="sc-card-media-img">
            <img src="${project.image}" alt="${project.title} ${techAltLabel} Project" loading="lazy">
          </div>
          <span class="sc-media-info-cue" aria-hidden="true">ⓘ</span>
          <div class="sc-card-media-flip">
            <div class="sc-flip-info-wrap">
              <span class="sc-flip-eyebrow">Key Modules</span>
              <p class="sc-flip-desc">${project.summary}</p>
            </div>
            <div class="sc-flip-tech-row" aria-label="Technologies used">
              ${this.createTechPills(project.tech)}
            </div>
          </div>
        </div>

        <div class="sc-card-body">
          <h3>${project.title}</h3>
        </div>

        <div class="sc-card-links">
          <a href="${project.pdfUrl}" target="_blank" rel="noopener noreferrer" class="sc-btn-notes">
            Download Project PDF
          </a>
        </div>
      `;

      // Support tap-to-flip on touch devices without making the card a download link
      const mediaArea = article.querySelector('.sc-card-media');
      if (mediaArea) {
        mediaArea.addEventListener('click', function () {
          article.classList.toggle('is-flipped');
        });
      }

      return article;
    },

    render() {
      const grid = document.getElementById('scProjectsGrid');
      const hubCard = document.getElementById('scStudentHubCard');
      if (!grid || !PROJECTS_DATA.length) return;

      const fragment = document.createDocumentFragment();
      PROJECTS_DATA.forEach((project) => {
        fragment.appendChild(this.createCardElement(project));
      });

      if (hubCard) {
        grid.insertBefore(fragment, hubCard);
      } else {
        grid.appendChild(fragment);
      }
    }
  };

  /* ========================================================================
     4. Category Filter Module
     ======================================================================== */
  const CategoryFilterModule = {
    init() {
      const filterChips = document.querySelectorAll('.sc-filter-chip');
      if (!filterChips.length) return;

      filterChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const selectedCategory = chip.getAttribute('data-filter');
          const cards = document.querySelectorAll('#scProjectsGrid > .sc-custom-card:not(.sc-connect-card)');

          filterChips.forEach((btn) => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
          });

          chip.classList.add('active');
          chip.setAttribute('aria-selected', 'true');

          cards.forEach((card) => {
            const matches = selectedCategory === 'all' || card.getAttribute('data-category') === selectedCategory;
            card.classList.toggle('sc-card-hidden', !matches);
          });
        });
      });
    }
  };

  /* ========================================================================
     5. Mobile Navigation Module
     ======================================================================== */
  const MobileNavModule = {
    init() {
      const hamburgerBtn = document.getElementById('hamburgerToggle');
      const navMenu = document.getElementById('nav-menu');
      if (!hamburgerBtn || !navMenu || hamburgerBtn.dataset.scBound) return;

      hamburgerBtn.dataset.scBound = 'true';
      hamburgerBtn.addEventListener('click', function () {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!isExpanded));
        navMenu.classList.toggle('open', !isExpanded);
      });
    }
  };

  /* ========================================================================
     6. Student Hub Modal Module
     ======================================================================== */
  const StudentHubModalModule = {
    currentMode: 'share',

    modeConfig: {
      share: {
        tabId: 'tabBtnShare',
        techValue: 'Python + MySQL',
        titleLabel: 'Project Title *',
        titlePlaceholder: 'e.g., Library Management System',
        detailsLabel: 'Drive / GitHub Link or Brief Project Note *',
        detailsPlaceholder: 'Paste your Google Drive / GitHub link or describe your project features...',
        waHeader: '📤 *Project Submission for SinghClasses.in*'
      },
      custom: {
        tabId: 'tabBtnCustom',
        techValue: 'Custom Project Request',
        titleLabel: 'Preferred Topic / Domain *',
        titlePlaceholder: 'e.g., Hotel Booking or Hospital System',
        detailsLabel: 'Custom Project Requirements *',
        detailsPlaceholder: 'Mention required Python modules, MySQL tables, or school guidelines...',
        waHeader: '💡 *Custom Class 12 Project Request - SinghClasses.in*'
      },
      viva: {
        tabId: 'tabBtnViva',
        techValue: 'Project Report / Viva Help',
        titleLabel: 'Project Name / Error Topic *',
        titlePlaceholder: 'e.g., MySQL Connector Error / Viva Prep',
        detailsLabel: 'Describe Your Viva Doubt or Code Error *',
        detailsPlaceholder: 'Describe your Python–MySQL error, project file format doubt, or viva question...',
        waHeader: '🎓 *Class 12 Project Viva & Doubt Help - SinghClasses.in*'
      }
    },

    setMode(mode) {
      const config = this.modeConfig[mode] || this.modeConfig.share;
      this.currentMode = mode in this.modeConfig ? mode : 'share';

      ['tabBtnShare', 'tabBtnCustom', 'tabBtnViva'].forEach((id) => {
        const tab = document.getElementById(id);
        if (!tab) return;
        const isSelected = id === config.tabId;
        tab.classList.toggle('active', isSelected);
        tab.setAttribute('aria-selected', String(isSelected));
      });

      const selectTech = document.getElementById('scProjectTech');
      const lblTitle = document.getElementById('lblProjectTitle');
      const inputTitle = document.getElementById('scProjectTitle');
      const lblDetails = document.getElementById('lblProjectDetails');
      const inputDetails = document.getElementById('scProjectDetails');

      if (selectTech) selectTech.value = config.techValue;
      if (lblTitle) lblTitle.textContent = config.titleLabel;
      if (inputTitle) inputTitle.placeholder = config.titlePlaceholder;
      if (lblDetails) lblDetails.textContent = config.detailsLabel;
      if (inputDetails) inputDetails.placeholder = config.detailsPlaceholder;
    },

    buildPayload() {
      const name = (document.getElementById('scStudentName')?.value || '').trim() || 'Student';
      const stdClass = document.getElementById('scStudentClass')?.value || 'Class 12 CS (083)';
      const title = (document.getElementById('scProjectTitle')?.value || '').trim() || 'Not Specified';
      const tech = document.getElementById('scProjectTech')?.value || 'Python + MySQL';
      const details = (document.getElementById('scProjectDetails')?.value || '').trim() || 'N/A';
      const header = (this.modeConfig[this.currentMode] || this.modeConfig.share).waHeader;

      return [
        header,
        `• *Name:* ${name}`,
        `• *Class:* ${stdClass}`,
        `• *Topic / Title:* ${title}`,
        `• *Category:* ${tech}`,
        `• *Details:* ${details}`
      ].join('\n');
    },

    init() {
      const modal = document.getElementById('scProjectConnectModal');
      const closeBtn = document.getElementById('scCloseConnectModal');
      const btnWA = document.getElementById('scSendWhatsApp');
      if (!modal) return;

      document.querySelectorAll('[data-connect-mode]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.setMode(btn.getAttribute('data-connect-mode'));
          modal.classList.add('active');
        });
      });

      document.querySelectorAll('.sc-cm-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          this.setMode(tab.getAttribute('data-tab'));
        });
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          modal.classList.remove('active');
        }
      });

      if (btnWA) {
        btnWA.addEventListener('click', () => {
          const waUrl = `https://wa.me/918800873871?text=${encodeURIComponent(this.buildPayload())}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        });
      }
    }
  };

  /* ========================================================================
     7. Bootstrap Application
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    MobileNavModule.init();
    ProjectCatalogModule.render();
    CategoryFilterModule.init();
    StudentHubModalModule.init();
  });
})();