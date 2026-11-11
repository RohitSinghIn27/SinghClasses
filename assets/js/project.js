document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('scProjectConnectModal');
  const closeBtn = document.getElementById('scCloseConnectModal');
  const tabShare = document.getElementById('tabBtnShare');
  const tabQuery = document.getElementById('tabBtnQuery');
  const lblDetails = document.getElementById('lblProjectDetails');
  const inputDetails = document.getElementById('scProjectDetails');
  const btnWA = document.getElementById('scSendWhatsApp');

  let currentMode = 'share';

  function setModalMode(mode) {
    currentMode = mode;
    if (mode === 'share') {
      tabShare.classList.add('active');
      tabShare.setAttribute('aria-selected', 'true');
      tabQuery.classList.remove('active');
      tabQuery.setAttribute('aria-selected', 'false');
      lblDetails.textContent = 'Drive / GitHub Link or Brief Project Note *';
      inputDetails.placeholder = 'Paste your Google Drive / GitHub link or describe your project features...';
    } else {
      tabQuery.classList.add('active');
      tabQuery.setAttribute('aria-selected', 'true');
      tabShare.classList.remove('active');
      tabShare.setAttribute('aria-selected', 'false');
      lblDetails.textContent = 'Describe Your Project Query / Viva Doubt *';
      inputDetails.placeholder = 'Describe your error, MySQL connectivity issue, custom topic request, or viva question...';
    }
  }

  document.querySelectorAll('[data-connect-mode]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setModalMode(this.getAttribute('data-connect-mode'));
      modal.classList.add('active');
    });
  });

  tabShare.addEventListener('click', function () { setModalMode('share'); });
  tabQuery.addEventListener('click', function () { setModalMode('query'); });

  closeBtn.addEventListener('click', function () {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('active');
  });

  function buildPayload() {
    const name = document.getElementById('scStudentName').value.trim() || 'Student';
    const stdClass = document.getElementById('scStudentClass').value;
    const title = document.getElementById('scProjectTitle').value.trim() || 'Not Specified';
    const tech = document.getElementById('scProjectTech').value;
    const details = document.getElementById('scProjectDetails').value.trim() || 'N/A';
    const header = currentMode === 'share'
      ? '📤 *Project Submission for SinghClasses.in*'
      : '💬 *Class 12 Project Query - SinghClasses.in*';

    return (
      header + '\n' +
      '• *Name:* ' + name + '\n' +
      '• *Class:* ' + stdClass + '\n' +
      '• *Project Title:* ' + title + '\n' +
      '• *Category:* ' + tech + '\n' +
      '• *Details:* ' + details
    );
  }

  btnWA.addEventListener('click', function () {
    const text = buildPayload();
    const waUrl = 'https://wa.me/918800873871?text=' + encodeURIComponent(text);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  });
});