const chapterElement = document.getElementById('current-chapter');
const iframe = document.getElementById('pdf-frame');
const loadingOverlay = document.getElementById('loading-overlay');
const ytBtn = document.getElementById('yt-trigger-btn');
const ytModal = document.getElementById('yt-modal');
const toast = document.getElementById('status-toast');
const motivationEl = document.getElementById('motivation-text');

let studySeconds = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadSelectedPDF();
  checkYTLinkState();
  initCanvasParticles();
  initTrackingEyes();
});

// Smart Back Navigation
function handleBackNavigation(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (window.history.length > 1 && document.referrer && !document.referrer.toLowerCase().includes('index of')) {
    window.history.back();
  } else {
    window.location.href = '../index.html';
  }
}

// PDF Loader
function loadSelectedPDF() {
  const fileId = chapterElement?.getAttribute('data-drive-id');
  if (fileId) {
    loadingOverlay.style.visibility = 'visible';
    loadingOverlay.style.opacity = '1';
    iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
  }
}

function hideLoader() {
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.visibility = 'hidden';
  }, 400);
}

function downloadPDF() {
  const fileId = chapterElement?.getAttribute('data-drive-id');
  if (fileId) {
    window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
  }
}

// Fullscreen API Utilities (Manual Trigger Only)
function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function requestAppFullscreen() {
  const el = document.documentElement;
  const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (requestMethod) {
    return requestMethod.call(el);
  }
  return Promise.reject(new Error("Fullscreen unsupported"));
}

function exitAppFullscreen() {
  const exitMethod = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (exitMethod) {
    return exitMethod.call(document);
  }
}

function toggleFullScreen() {
  if (!isFullscreenActive()) {
    requestAppFullscreen().catch(err => {
      console.warn("Fullscreen toggle:", err.message);
    });
  } else {
    exitAppFullscreen();
  }
}

function updateFullscreenIconUI() {
  const expandIcon = document.getElementById('fs-expand-icon');
  const compressIcon = document.getElementById('fs-compress-icon');
  const fsBtn = document.getElementById('fullscreen-btn');

  if (isFullscreenActive()) {
    expandIcon?.classList.add('hidden');
    compressIcon?.classList.remove('hidden');
    fsBtn?.setAttribute('title', 'Exit Fullscreen');
  } else {
    expandIcon?.classList.remove('hidden');
    compressIcon?.classList.add('hidden');
    fsBtn?.setAttribute('title', 'Enter Fullscreen');
  }
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
  document.addEventListener(evt, updateFullscreenIconUI);
});

// YouTube Modal Controls
function checkYTLinkState() {
  const ytLink = chapterElement?.getAttribute('data-yt-link')?.trim();
  if (!ytLink || ytLink === '#') {
    ytBtn?.classList.add('mild');
  }
}

function handleYTClick() {
  const ytLink = chapterElement?.getAttribute('data-yt-link')?.trim();
  if (ytLink && ytLink !== '#') {
    ytModal?.classList.add('active');
  } else {
    showToast();
  }
}

function closeYTModal() {
  ytModal?.classList.remove('active');
}

function proceedToYT() {
  const ytLink = chapterElement?.getAttribute('data-yt-link')?.trim();
  if (ytLink) window.open(ytLink, '_blank');
  closeYTModal();
}

function showToast() {
  toast?.classList.add('show');
  setTimeout(() => toast?.classList.remove('show'), 3500);
}

// Timer & Motivation Text
function updateTimer() {
  studySeconds++;
  const hrs = Math.floor(studySeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((studySeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (studySeconds % 60).toString().padStart(2, '0');
  const timeString = `${hrs}:${mins}:${secs}`;

  document.querySelectorAll('.timer-display').forEach(el => {
    el.textContent = timeString;
  });

  if (motivationEl) {
    if (studySeconds === 60) motivationEl.textContent = "Warming up! 🔥";
    else if (studySeconds === 300) motivationEl.textContent = "Great focus! 🧠";
    else if (studySeconds === 600) motivationEl.textContent = "10 minutes in! ⭐";
    else if (studySeconds === 1200) motivationEl.textContent = "20 mins! Keep going! 💪";
    else if (studySeconds === 1800) motivationEl.textContent = "Half an hour! Crushing it! ⚡";
    else if (studySeconds === 2700) motivationEl.textContent = "45 mins! Almost an hour! 🎯";
    else if (studySeconds === 3600) motivationEl.textContent = "1 Hour complete! Stretch time! 🧘‍♂️";
  }
}
setInterval(updateTimer, 1000);

// Eye Tracking: Pre-calculated eye centers prevent getBoundingClientRect layout thrashing on mousemove
function initTrackingEyes() {
  const trackedItems = [];

  document.querySelectorAll('.tracking-eyes-container').forEach(container => {
    const eyes = container.querySelectorAll('.eye-ball');
    const pupils = container.querySelectorAll('.pupil');

    eyes.forEach((eye, index) => {
      const pupil = pupils[index];
      if (pupil) {
        trackedItems.push({ eye, pupil, cx: 0, cy: 0, maxRadius: 0 });
      }
    });

    const blink = () => {
      eyes.forEach(eye => {
        eye.style.transform = 'scaleY(0.08)';
        setTimeout(() => { eye.style.transform = 'scaleY(1)'; }, 120);
      });
    };

    const scheduleBlink = () => {
      setTimeout(() => {
        blink();
        scheduleBlink();
      }, 3000 + Math.random() * 4000);
    };

    scheduleBlink();
  });

  function updateEyeGeometry() {
    trackedItems.forEach(item => {
      const rect = item.eye.getBoundingClientRect();
      item.cx = rect.left + rect.width / 2;
      item.cy = rect.top + rect.height / 2;
      item.maxRadius = (rect.width / 2) - (item.pupil.offsetWidth / 2) - 1.5;
    });
  }

  updateEyeGeometry();
  window.addEventListener('resize', updateEyeGeometry);
  window.addEventListener('scroll', updateEyeGeometry, { passive: true });

  window.addEventListener('mousemove', (e) => {
    trackedItems.forEach(item => {
      const dx = e.clientX - item.cx;
      const dy = e.clientY - item.cy;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(Math.hypot(dx, dy) / 10, item.maxRadius);

      item.pupil.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
    });
  });
}

// Particle Background Canvas: Pauses rAF execution when window is inactive
function initCanvasParticles() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, particles = [];
  let animId = null;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 25; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  function startAnimation() {
    if (!animId) {
      draw();
    }
  }

  function stopAnimation() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  startAnimation();
}