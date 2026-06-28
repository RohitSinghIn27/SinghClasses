let toastTimer;

/**
 * Dispatches active visual system alerts/toasts
 * @param {string} msg 
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/**
 * Generic system tap handler for dynamic upcoming paths
 * @param {Event} event 
 */
function handleSystemClick(event) {
  event.preventDefault();
  event.stopPropagation();
  showToast('Coming soon. Thank you for your patience! 🚀');
}

const loadedCards = new Set();

/**
 * Handles drawer mechanics for modular items evaluation tracking
 * @param {HTMLElement} topContentElement 
 */
function toggleCardDrawer(topContentElement) {
  const card = topContentElement.closest('.chapter-card');
  if (!card) return;
  
  const wasExpanded = card.classList.contains('expanded');
  
  document.querySelectorAll('.chapter-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });

  if (!wasExpanded) {
    card.classList.add('expanded');
    
    // Trigger 2-second fetching animation on first load
    if (!loadedCards.has(card)) {
        const drawer = card.querySelector('.subtopics-drawer');
        
        const loader = document.createElement('div');
        loader.className = 'drawer-loader';
        loader.innerHTML = `<div class="spinner"></div><span>Fetching subtopics...</span>`;
        
        drawer.appendChild(loader);
        drawer.classList.add('loading');
        
        setTimeout(() => {
            drawer.classList.remove('loading');
            loader.remove(); 
            loadedCards.add(card);
        }, 2000);
    }
  } else {
      card.classList.remove('expanded');
  }
}

/**
 * Paper dynamic navigation switcher leveraging standard attribute manipulation
 * @param {string} paperNum 
 * @param {HTMLElement} cardElement 
 */
function switchPaper(paperNum, cardElement) {
  const p1 = document.getElementById('paper-1-content');
  const p2 = document.getElementById('paper-2-content');
  
  if (p1 && p2) {
    if (paperNum === '1') {
      p1.setAttribute('data-active', 'true');
      p2.setAttribute('data-active', 'false');
    } else {
      p1.setAttribute('data-active', 'false');
      p2.setAttribute('data-active', 'true');
    }
    sessionStorage.setItem('activePaper', paperNum);
  }
  
  document.querySelectorAll('.paper-card-btn').forEach(b => b.classList.remove('active'));
  
  if (cardElement) {
    cardElement.classList.add('active');
  } else {
    const backupButton = document.getElementById('card-p' + paperNum);
    if (backupButton) backupButton.classList.add('active');
  }
}

/**
 * Section sub-navigation engine inside modules selection layouts with storage tracking
 * @param {string} sec 
 * @param {HTMLElement} btn 
 */
function switchSection(sec, btn) {
  // Array updated to include 'D' and 'E' to support the newly added sections in the HTML
  ['A', 'B', 'C', 'D', 'E'].forEach(s => {
    const el = document.getElementById('section-' + s);
    if(el) {
        el.style.display = s === sec ? '' : 'none';
    }
  });
  
  sessionStorage.setItem('activeSection', sec);
  
  // Sync all tabs across the UI so they update correctly regardless of which section is currently active
  document.querySelectorAll('.section-tabs button').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${sec}'`)) {
      b.classList.add('active');
    }
  });
}

/**
 * Search and content matching parsing filtering algorithms 
 */
function filterModules() {
  const searchInput = document.getElementById('moduleSearch');
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase().trim();
  const cards = document.querySelectorAll('.chapter-card');
  
  cards.forEach(card => {
    const chapterNameEl = card.querySelector('.chapter-name');
    if (!chapterNameEl) return;
    
    const chapterName = chapterNameEl.textContent.toLowerCase();
    const subtopics = card.querySelectorAll('.subtopic-item-card');
    
    if (query === '') {
      card.style.display = '';
      subtopics.forEach(sub => sub.style.display = 'flex');
      return;
    }
    
    const chapterMatches = chapterName.includes(query);
    let matchingSubtopicsCount = 0;
    
    subtopics.forEach(sub => {
      const labelEl = sub.querySelector('.subtopic-label-text');
      if (!labelEl) return;

      const subText = labelEl.textContent.toLowerCase();
      if (subText.includes(query)) {
        sub.style.display = 'flex';
        matchingSubtopicsCount++;
      } else {
        sub.style.display = 'none';
      }
    });
    
    if (chapterMatches || matchingSubtopicsCount > 0) {
      card.style.display = '';
      if (matchingSubtopicsCount > 0) {
        card.classList.add('expanded');
      } else if (chapterMatches && matchingSubtopicsCount === 0) {
        subtopics.forEach(sub => sub.style.display = 'flex');
      }
    } else {
      card.style.display = 'none';
      card.classList.remove('expanded');
    }
  });
}

/**
 * Count metrics execution engine
 * @param {HTMLElement} el 
 * @param {number} target 
 */
function countUp(el, target) {
  let n = 0, step = Math.ceil(target / 60);
  const t = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n.toLocaleString() + (el.dataset.suffix || '');
    if (n >= target) clearInterval(t);
  }, 16);
}

// Initial system activation configuration hooks
document.addEventListener("DOMContentLoaded", () => {
    // Session-gated counter restricts repeat cycles for single students
    const statsAlreadyCounted = sessionStorage.getItem('statsCounted');
    
    document.querySelectorAll('.stat-num-text').forEach(el => {
      const targetValue = parseInt(el.textContent.replace(/\D/g, ''));
      if (statsAlreadyCounted) {
        el.textContent = targetValue.toLocaleString() + (el.dataset.suffix || '');
      } else {
        countUp(el, targetValue);
      }
    });

    if (!statsAlreadyCounted) {
      sessionStorage.setItem('statsCounted', 'true');
    }

    // Restore user context paper states seamlessly on refresh
    const activePaperSelection = sessionStorage.getItem('activePaper') || '1';
    switchPaper(activePaperSelection, document.getElementById('card-p' + activePaperSelection));

    const activeSectionSelection = sessionStorage.getItem('activeSection');
    if (activeSectionSelection) {
      switchSection(activeSectionSelection, null);
    }

    // Setup Debounced Search and Clear functionality
    let filterTimeout;
    const searchInput = document.getElementById('moduleSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(filterModules, 150); 
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            filterModules(); 
            searchInput.focus();
        });
    }
});