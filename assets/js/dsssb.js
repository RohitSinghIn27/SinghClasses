let toastTimer;

/**
 * Dispatches active visual system alerts/toasts
 * @param {string} msg 
 */
function showToast(msg) {
  const t = document.getElementById('toast');
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

/**
 * Handles drawer mechanics for modular items evaluation tracking
 * @param {HTMLElement} topContentElement 
 */
function toggleCardDrawer(topContentElement) {
  const card = topContentElement.closest('.chapter-card');
  const wasExpanded = card.classList.contains('expanded');
  
  document.querySelectorAll('.chapter-card.expanded').forEach(c => {
    c.classList.remove('expanded');
  });

  if (!wasExpanded) {
    card.classList.add('expanded');
  }
}

/**
 * Paper dynamic navigation state switcher
 * @param {string} paperNum 
 * @param {HTMLElement} cardElement 
 */
function switchPaper(paperNum, cardElement) {
  const p1 = document.getElementById('paper-1-content');
  const p2 = document.getElementById('paper-2-content');
  
  if (paperNum === '1') {
    p1.style.display = 'block';
    p2.style.display = 'none';
  } else {
    p1.style.display = 'none';
    p2.style.display = 'block';
  }
  
  document.querySelectorAll('.paper-card-btn').forEach(b => b.classList.remove('active'));
  cardElement.classList.add('active');
}

/**
 * Section sub-navigation engine inside modules selection layouts
 * @param {string} sec 
 * @param {HTMLElement} btn 
 */
function switchSection(sec, btn) {
  ['A','B','C'].forEach(s => {
    const el = document.getElementById('section-' + s);
    if(el) el.style.display = s === sec ? '' : 'none';
  });
  
  document.querySelectorAll('.section-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
}

/**
 * Search and content matching parsing filtering algorithms 
 */
function filterModules() {
  const query = document.getElementById('moduleSearch').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.chapter-card');
  
  cards.forEach(card => {
    const chapterName = card.querySelector('.chapter-name').textContent.toLowerCase();
    const subtopics = card.querySelectorAll('.subtopic-item-card');
    
    if (query === '') {
      card.style.display = '';
      card.classList.remove('expanded');
      subtopics.forEach(sub => sub.style.display = 'flex');
      return;
    }
    
    let chapterMatches = chapterName.includes(query);
    let matchingSubtopicsCount = 0;
    
    subtopics.forEach(sub => {
      const subText = sub.querySelector('.subtopic-label-text').textContent.toLowerCase();
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
document.querySelectorAll('.stat-num-text').forEach(el =>
  countUp(el, parseInt(el.textContent.replace(/\D/g, '')))
);