document.addEventListener('DOMContentLoaded', function() {
  
  // --- Centralized Reusable SVG Icons Config Variable ---
  const CARD_ICONS = {
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    oneshot: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    notes: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    pro: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 12 22 2 8.5"></polygon></svg>`,
    pyq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    mcq: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    dpp: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    details: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
  };

  // Prepend SVG icons dynamically based on link text definitions
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

  // --- 1. COMING SOON TOAST & LOCK LOGIC ---
  const allLinks = document.querySelectorAll('.sc-widget-container a');
  const toast = document.getElementById('scToast');
  let toastTimeout;

  allLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      if (!href || href === '#' || href.trim() === '') {
          // Grey out link & Lock Icon
          link.classList.add('sc-locked');
          const iconSpan = link.querySelector('.sc-svg-icon');
          if (iconSpan) {
              // Replace with Lock SVG
              iconSpan.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
          }

          // Toast Click Event
          link.addEventListener('click', function(e) {
              e.preventDefault(); 
              toast.classList.add('show');
              clearTimeout(toastTimeout);
              toastTimeout = setTimeout(() => {
                  toast.classList.remove('show');
              }, 3000);
          });
      }
  });

  // --- 2. VIDEO CONFIRMATION MODAL ---
  const videoModal = document.getElementById('scVideoModal');
  const btnStay = document.getElementById('scModalStay');
  const btnWatch = document.getElementById('scModalWatch');
  let currentVideoUrl = '';

  document.querySelectorAll('.sc-btn-oneshot').forEach(link => {
      link.addEventListener('click', function(e) {
          const href = this.getAttribute('href');
          
          // Ensure it's a valid link and NOT locked
          if (href && href !== '#' && href.trim() !== '' && !this.classList.contains('sc-locked')) {
              e.preventDefault();
              currentVideoUrl = href;
              videoModal.classList.add('show');
          }
      });
  });

  btnStay.addEventListener('click', () => {
      videoModal.classList.remove('show');
      currentVideoUrl = '';
  });

  btnWatch.addEventListener('click', () => {
      if (currentVideoUrl) {
          window.open(currentVideoUrl, '_blank');
          videoModal.classList.remove('show');
          currentVideoUrl = '';
      }
  });


  // --- 3. FLOATING ACTIONS LOGIC ---
  const shareBtn = document.getElementById('scShareBtn');
  const scrollBtn = document.getElementById('scScrollToggleBtn');

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url: window.location.href }); } 
        catch (err) { console.log('Error sharing:', err); }
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => { alert('Link copied to clipboard!'); });
      }
    });
  }

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
        ctx.fillStyle = 'rgba(21, 104, 69, 0.4)';
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
            ctx.strokeStyle = `rgba(21, 104, 69, ${0.25 - (dist/connectionDistance) * 0.25})`;
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
            ctx.strokeStyle = `rgba(21, 104, 69, ${0.35 - (dist/100) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  initParticleCanvas('colA', 'canvasA', 35, 60);
  initParticleCanvas('colB', 'canvasB', 35, 60);
  initParticleCanvas('colC', 'canvasC', 35, 60);
  initParticleCanvas('bottomSection', 'canvasBottom', 40, 75);
});