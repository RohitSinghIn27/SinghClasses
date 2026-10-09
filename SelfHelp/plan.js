/* ==========================================================================
   CONFIGURATION & STATE (ZERO DEFAULT VALUES)
   ========================================================================== */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzc0DmgsKIJwK8upyKUjK6hYhly_yKLdALZufu516D-BE0MpSItexJ46jXCLz1rEkb2/exec';

const TEMPLATE_VERSION = '2026.3_clean';
const STORAGE_KEY_PLANNER = 'singhPlanner_core_v2';
const STORAGE_KEY_ATTENDANCE = 'singhPlanner_attendance_v2';
const STORAGE_KEY_RESCUE = 'singhPlanner_rescue_backup_v2';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Pure empty structure without hardcoded demo/default entries
const EMPTY_TIMETABLES = {
  school: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
  tuition: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
  study: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }
};

let state = {
  templateVersion: TEMPLATE_VERSION,
  activeDateStr: toISO(new Date()),
  viewMondayStr: getMondayISO(new Date()),
  days: {},
  timetables: JSON.parse(JSON.stringify(EMPTY_TIMETABLES)),
  rosters: {},
  lastBackup: null
};

let attendanceStore = {};
let currentPlannerView = 'school';
let studentMasterView = 'cards';
let charts = {};
let editMode = { school: false, tuition: false, study: false };
let lastCheckedDate = toISO(new Date());

let currentAttBatchId = null;
let currentAttBatchTitle = '';
let currentAttTaskId = null;
let currentAttTargetDate = toISO(new Date());
let lastDeletedStudent = null;

/* ================= APPS SCRIPT CLOUD FETCH ENGINE ================= */
async function fetchFromAppsScript(showFeedback = true) {
  if (!APPS_SCRIPT_URL) {
    if (showFeedback) showToast('Missing APPS_SCRIPT_URL', 'error');
    return;
  }

  if (showFeedback) showToast('Syncing data from Google Sheets...', 'info');

  try {
    const fetchUrl = `${APPS_SCRIPT_URL}?action=getAll&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.status === 'success') {
      let syncedItems = [];

      // 1. Sync master timetables directly from Google Sheet
      if (data.timetables && typeof data.timetables === 'object') {
        state.timetables = {
          school: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.school || {}),
          tuition: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.tuition || {}),
          study: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.study || {})
        };
        syncedItems.push('Timetables');
      }

      // 2. Sync student rosters directly from Google Sheet
      if (data.rosters && typeof data.rosters === 'object') {
        state.rosters = data.rosters;
        syncedItems.push('Rosters');
      }

      saveState();
      ensureDayPopulated(state.activeDateStr);
      renderAll();

      if (showFeedback) {
        const titleSuffix = data.spreadsheetTitle ? ` from "${data.spreadsheetTitle}"` : '';
        showToast(`Synced ${syncedItems.join(' & ')}${titleSuffix} successfully!`, 'success');
      }
    } else {
      throw new Error(data.message || 'Error reported from Apps Script');
    }
  } catch (err) {
    console.error('Apps Script Sync Error:', err);
    if (showFeedback) showToast(`Sync failed: ${err.message}`, 'error');
  }
}

/* ================= DATE / TIME UTILITIES ================= */
function toISO(dateObj) {
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayISO(refDate) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toISO(d);
}

function addDays(isoStr, num) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + num);
  return toISO(dt);
}

function getDayName(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const idx = new Date(y, m - 1, d).getDay();
  return DAYS[idx === 0 ? 6 : idx - 1];
}

function formatShortDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.getDate()} ${dt.toLocaleDateString('en-US', { month: 'short' })}`;
}

function formatFullDisplayDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${String(dt.getDate()).padStart(2, '0')} ${dt.toLocaleDateString('en-US', { month: 'short' })} ${dt.getFullYear()}`;
}

function formatWeekRange(mondayIso) {
  const sundayIso = addDays(mondayIso, 6);
  const [y] = sundayIso.split('-');
  return `${formatShortDate(mondayIso)} - ${formatShortDate(sundayIso)} ${y}`;
}

function parseMinutes(t, fallbackMod) {
  let c = t.toUpperCase().replace(/\s+/g, '');
  let mod = c.includes('PM') ? 'PM' : (c.includes('AM') ? 'AM' : fallbackMod);
  let p = c.replace('AM', '').replace('PM', '');
  let [h, min] = p.split(':').map(Number);
  if (isNaN(h)) return 0;
  if (isNaN(min)) min = 0;
  if (mod === 'PM' && h !== 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function parseTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return { valid: false, startMin: 99999, endMin: 99999, durationMin: 0, hrs: 0, formatted: '' };
  }
  const m = timeStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
  if (m) {
    let s = m[1].trim(), e = m[2].trim();
    let emod = e.toUpperCase().includes('PM') ? 'PM' : (e.toUpperCase().includes('AM') ? 'AM' : 'PM');
    let smod = s.toUpperCase().includes('AM') ? 'AM' : (s.toUpperCase().includes('PM') ? 'PM' : emod);
    let sm = parseMinutes(s, smod);
    let em = parseMinutes(e, emod);
    if (!s.toUpperCase().includes('AM') && !s.toUpperCase().includes('PM') && sm > em && em <= 780) {
      sm = parseMinutes(s, 'AM');
    }
    if (em < sm) em += 1440;
    const durMin = em - sm;
    return {
      valid: true,
      startMin: sm,
      endMin: em,
      durationMin: durMin,
      hrs: parseFloat((durMin / 60).toFixed(2)),
      formatted: `${s} - ${e}`
    };
  }
  return { valid: false, startMin: 99999, endMin: 99999, durationMin: 0, hrs: 0, formatted: timeStr.trim() };
}

function getTimeStatus(timeStr, dateStr) {
  if (dateStr !== toISO(new Date())) return 'normal';
  const range = parseTimeRange(timeStr);
  if (!range.valid) return 'normal';
  const now = new Date();
  const curM = now.getHours() * 60 + now.getMinutes();
  if (curM >= range.startMin && curM <= range.endMin) return 'active';
  if (curM > range.endMin) return 'past';
  return 'upcoming';
}

function parseSchoolTask(taskStr) {
  const raw = taskStr || '';
  const isFree = /\bfree\b/i.test(raw);
  const isLab = /\blab\b/i.test(raw);
  let name = raw.replace(/\blab\b/gi, '').replace(/\bfree\b/gi, '').trim();
  if (!name) name = isFree ? 'Free Period' : 'School Class';
  return { name, isLab, isFree };
}

function normalizeBatchId(name) {
  return 'b_' + (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
}

/* ================= APPDATA INTERFACE ================= */
const AppData = {
  getAllBatches() {
    const batchMap = new Map();
    Object.keys(state.rosters || {}).forEach(batchId => {
      batchMap.set(batchId, {
        batchId,
        title: this.getBatchDisplayName(batchId),
        students: [...(state.rosters[batchId] || [])],
        scheduledDays: new Set()
      });
    });

    DAYS.forEach(day => {
      (state.timetables.tuition[day] || []).forEach(slot => {
        const bId = slot.batchId || normalizeBatchId(slot.task);
        if (!batchMap.has(bId)) {
          batchMap.set(bId, {
            batchId: bId,
            title: slot.task || this.getBatchDisplayName(bId),
            students: [...(state.rosters[bId] || [])],
            scheduledDays: new Set()
          });
        }
        const b = batchMap.get(bId);
        b.scheduledDays.add(day);
        if (slot.task && (!b.title || b.title === bId)) {
          b.title = slot.task;
        }
      });
    });

    return Array.from(batchMap.values()).map(b => ({
      ...b,
      daysArray: Array.from(b.scheduledDays)
    }));
  },

  getBatchDisplayName(batchId) {
    for (const d of DAYS) {
      const slot = (state.timetables.tuition[d] || []).find(s => (s.batchId || normalizeBatchId(s.task)) === batchId);
      if (slot && slot.task) return slot.task;
    }
    return batchId.replace(/^b_/, '').replace(/_/g, ' ').toUpperCase();
  },

  getRoster(batchId) {
    if (!state.rosters[batchId]) state.rosters[batchId] = [];
    return state.rosters[batchId];
  },

  addStudent(batchId, studentName) {
    const clean = (studentName || '').trim();
    if (!clean) return { success: false, message: 'Name cannot be blank' };
    if (!state.rosters[batchId]) state.rosters[batchId] = [];
    if (state.rosters[batchId].includes(clean)) {
      return { success: false, message: 'Student already exists in this batch' };
    }
    state.rosters[batchId].push(clean);
    this.saveAndNotify(`Added "${clean}" to roster`);
    return { success: true };
  },

  renameStudent(batchId, oldName, newName) {
    const cleanNew = (newName || '').trim();
    if (!cleanNew) return { success: false, message: 'New name cannot be blank' };
    if (!state.rosters[batchId]) return { success: false, message: 'Batch not found' };

    const idx = state.rosters[batchId].indexOf(oldName);
    if (idx === -1) return { success: false, message: 'Student not found in batch' };

    state.rosters[batchId][idx] = cleanNew;

    Object.keys(attendanceStore).forEach(dateStr => {
      if (attendanceStore[dateStr] && attendanceStore[dateStr][batchId]) {
        if (attendanceStore[dateStr][batchId][oldName] !== undefined) {
          attendanceStore[dateStr][batchId][cleanNew] = attendanceStore[dateStr][batchId][oldName];
          delete attendanceStore[dateStr][batchId][oldName];
        }
      }
    });

    this.saveAndNotify(`Renamed "${oldName}" to "${cleanNew}"`);
    return { success: true };
  },

  removeStudent(batchId, studentName) {
    if (!state.rosters[batchId]) return;
    lastDeletedStudent = { batchId, name: studentName };
    state.rosters[batchId] = state.rosters[batchId].filter(s => s !== studentName);
    this.saveAndNotify(`Removed "${studentName}"`);
    showToastWithUndo(`Removed ${studentName}`, () => {
      if (lastDeletedStudent) {
        state.rosters[lastDeletedStudent.batchId].push(lastDeletedStudent.name);
        AppData.saveAndNotify(`Restored "${lastDeletedStudent.name}"`);
      }
    });
  },

  createBatch(batchTitle) {
    const title = (batchTitle || '').trim();
    if (!title) return { success: false, message: 'Batch title is required' };
    const bId = normalizeBatchId(title);
    if (state.rosters[bId]) return { success: false, message: 'Batch ID already exists' };
    state.rosters[bId] = [];
    this.saveAndNotify(`Batch "${title}" created`);
    return { success: true, batchId: bId };
  },

  getStudentAttendanceStats(batchId, studentName) {
    let totalPresent = 0, totalAbsent = 0, totalRecords = 0;
    Object.keys(attendanceStore).forEach(dateStr => {
      const dayBatch = attendanceStore[dateStr]?.[batchId];
      if (dayBatch && dayBatch[studentName]) {
        totalRecords++;
        if (dayBatch[studentName] === 'P') totalPresent++;
        if (dayBatch[studentName] === 'A') totalAbsent++;
      }
    });
    return { totalPresent, totalAbsent, totalRecords };
  },

  saveAndNotify(toastMsg = null) {
    saveState();
    renderAll();
    if (toastMsg) showToast(toastMsg, 'success');
  }
};

/* ================= STORAGE MANAGEMENT ================= */
function loadState() {
  const rawPlanner = localStorage.getItem(STORAGE_KEY_PLANNER);
  const rawAtt = localStorage.getItem(STORAGE_KEY_ATTENDANCE);

  if (rawPlanner) {
    try {
      const parsed = JSON.parse(rawPlanner);
      if (parsed && typeof parsed === 'object') {
        state = Object.assign(state, parsed);
      }
    } catch (err) {
      localStorage.setItem(STORAGE_KEY_RESCUE, rawPlanner);
      showToast('Initialized clean state', 'info');
    }
  }

  if (rawAtt) {
    try {
      const parsedAtt = JSON.parse(rawAtt);
      if (parsedAtt && typeof parsedAtt === 'object') attendanceStore = parsedAtt;
    } catch (err) {}
  }

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }

  // Backup banner auto-check (triggers if >7 days since last JSON export)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (!state.lastBackup || (Date.now() - state.lastBackup > sevenDays)) {
    const nudge = document.getElementById('backupNudgeBanner');
    if (nudge) nudge.classList.remove('hidden');
  }

  pruneOldTasks(15);
  ensureDayPopulated(state.activeDateStr);
  saveState();
  renderAll();
}

function saveState() {
  try {
    pruneOldTasks(15);
    localStorage.setItem(STORAGE_KEY_PLANNER, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceStore));
  } catch (err) {
    showToast('Storage quota exceeded! Export backup soon.', 'error');
  }
}

function pruneOldTasks(keepDays = 15) {
  if (!state.days) return;
  const now = new Date();
  const limitISO = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - keepDays));
  Object.keys(state.days).forEach(dateStr => {
    if (dateStr < limitISO) delete state.days[dateStr];
  });
}

function ensureDayPopulated(dateStr) {
  const dName = getDayName(dateStr);
  const limitISO = toISO(new Date(Date.now() - 15 * 86400000));
  if (dateStr < limitISO) return;

  if (!state.days[dateStr]) {
    state.days[dateStr] = { school: [], tuition_study: [] };
  }

  const existing = state.days[dateStr];
  const daySchoolMap = new Map((existing.school || []).map(t => [t.slotId || t.task, t]));
  const dayTuitionMap = new Map((existing.tuition_study || []).map(t => [t.slotId || t.task, t]));

  const schSlots = (state.timetables.school && state.timetables.school[dName]) || [];
  const populatedSchool = schSlots.map(slot => {
    const ex = daySchoolMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    const pInfo = parseSchoolTask(slot.task);
    return {
      slotId: slot.id,
      time: slot.time,
      hrs: pInfo.isFree ? 0 : range.hrs,
      cat: 'School',
      task: slot.task,
      topic: ex && ex.topicEdited ? ex.topic : slot.topic || '',
      topicEdited: ex ? !!ex.topicEdited : false,
      completed: ex ? !!ex.completed : false,
      isFree: pInfo.isFree,
      isLab: pInfo.isLab
    };
  });

  const tuiSlots = (state.timetables.tuition && state.timetables.tuition[dName]) || [];
  const populatedTuition = tuiSlots.map(slot => {
    const ex = dayTuitionMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    return {
      slotId: slot.id,
      batchId: slot.batchId || normalizeBatchId(slot.task),
      time: slot.time,
      hrs: range.hrs,
      cat: 'Tuition',
      task: slot.task,
      topic: ex && ex.topicEdited ? ex.topic : slot.topic || '',
      topicEdited: ex ? !!ex.topicEdited : false,
      completed: ex ? !!ex.completed : false
    };
  });

  const stdSlots = (state.timetables.study && state.timetables.study[dName]) || [];
  const populatedStudy = stdSlots.map(slot => {
    const ex = dayTuitionMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    return {
      slotId: slot.id,
      time: slot.time,
      hrs: range.hrs,
      cat: 'Study',
      task: slot.task,
      topic: '',
      completed: ex ? !!ex.completed : false
    };
  });

  state.days[dateStr].school = populatedSchool;
  state.days[dateStr].tuition_study = [...populatedTuition, ...populatedStudy];
}

function reloadDayFromTimetable(dateStr) {
  if (state.days[dateStr]) delete state.days[dateStr];
  ensureDayPopulated(dateStr);
  AppData.saveAndNotify(`Reset ${getDayName(dateStr)} from template`);
}

function getPreviousClassDate(batchId, refDateStr) {
  if (!batchId || !refDateStr) return addDays(refDateStr, -1);
  for (let i = 1; i <= 7; i++) {
    const candDate = addDays(refDateStr, -i);
    const dName = getDayName(candDate);
    const ttSlots = (state.timetables && state.timetables.tuition && state.timetables.tuition[dName]) || [];
    const inTimetable = ttSlots.some(s => (s.batchId || normalizeBatchId(s.task)) === batchId);
    const hasAtt = attendanceStore[candDate]?.[batchId] && Object.keys(attendanceStore[candDate][batchId]).length > 0;
    if (inTimetable || hasAtt) return candDate;
  }
  return addDays(refDateStr, -1);
}

/* ================= STATS & ANALYTICS ================= */
function calculateWeeklyStats() {
  const totals = { school: 0, tuition: 0, study: 0 };
  let completedCount = 0, totalCount = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = addDays(state.viewMondayStr, i);
    const dayData = state.days[curDate];
    if (dayData) {
      [...(dayData.school || []), ...(dayData.tuition_study || [])].forEach(item => {
        const hrs = Number.isFinite(item.hrs) ? item.hrs : 0;
        if (!item.isFree) {
          if (item.cat === 'School') totals.school += hrs;
          if (item.cat === 'Tuition') totals.tuition += hrs;
          if (item.cat === 'Study') totals.study += hrs;
          totalCount++;
          if (item.completed) completedCount++;
        }
      });
    } else {
      const dName = DAYS[i];
      ((state.timetables.school && state.timetables.school[dName]) || []).forEach(s => {
        const range = parseTimeRange(s.time);
        const p = parseSchoolTask(s.task);
        if (!p.isFree) { totals.school += range.hrs; totalCount++; }
      });
      ((state.timetables.tuition && state.timetables.tuition[dName]) || []).forEach(s => {
        totals.tuition += parseTimeRange(s.time).hrs;
        totalCount++;
      });
      ((state.timetables.study && state.timetables.study[dName]) || []).forEach(s => {
        totals.study += parseTimeRange(s.time).hrs;
        totalCount++;
      });
    }
  }

  document.getElementById('totalSchool').textContent = totals.school.toFixed(1);
  document.getElementById('totalTuition').textContent = totals.tuition.toFixed(1);
  document.getElementById('totalStudy').textContent = totals.study.toFixed(1);

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  document.getElementById('completedCount').textContent = completedCount;
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('progressPercent').textContent = `${pct}%`;

  const ring = document.getElementById('progressRing');
  if (ring) {
    ring.setAttribute('stroke-dasharray', `${pct}, 100`);
    ring.setAttribute('class', pct === 100 && totalCount > 0 ? 'text-emerald-500' : (pct > 0 ? 'text-blue-500' : 'text-slate-300'));
  }
}

function updateAnalytics() {
  let plannedCat = { School: 0, Tuition: 0, Study: 0 };
  let doneCat = { School: 0, Tuition: 0, Study: 0 };
  let dailyPlanned = [], dailyDone = [], dailyPct = [], labels = [];
  let grandPlanned = 0, grandDone = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = addDays(state.viewMondayStr, i);
    const dName = DAYS[i];
    labels.push(`${dName} ${curDate.slice(8)}`);

    let dayPlan = 0, dayDone = 0;
    const dayData = state.days[curDate];

    if (dayData) {
      [...(dayData.school || []), ...(dayData.tuition_study || [])].forEach(t => {
        const h = Number.isFinite(t.hrs) ? t.hrs : 0;
        if (!t.isFree) {
          dayPlan += h;
          plannedCat[t.cat] = (plannedCat[t.cat] || 0) + h;
          if (t.completed) {
            dayDone += h;
            doneCat[t.cat] = (doneCat[t.cat] || 0) + h;
          }
        }
      });
    } else {
      ((state.timetables.school && state.timetables.school[dName]) || []).forEach(s => {
        const p = parseSchoolTask(s.task);
        if (!p.isFree) {
          const h = parseTimeRange(s.time).hrs;
          dayPlan += h; plannedCat.School += h;
        }
      });
      ((state.timetables.tuition && state.timetables.tuition[dName]) || []).forEach(s => {
        const h = parseTimeRange(s.time).hrs;
        dayPlan += h; plannedCat.Tuition += h;
      });
      ((state.timetables.study && state.timetables.study[dName]) || []).forEach(s => {
        const h = parseTimeRange(s.time).hrs;
        dayPlan += h; plannedCat.Study += h;
      });
    }

    dailyPlanned.push(parseFloat(dayPlan.toFixed(2)));
    dailyDone.push(parseFloat(dayDone.toFixed(2)));
    dailyPct.push(dayPlan > 0 ? Math.round((dayDone / dayPlan) * 100) : 0);
    grandPlanned += dayPlan;
    grandDone += dayDone;
  }

  const overallRate = grandPlanned > 0 ? Math.round((grandDone / grandPlanned) * 100) : 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
      <span class="text-xs font-bold uppercase text-slate-400">Total Planned</span>
      <div class="text-xl font-black text-slate-800 mt-0.5">${grandPlanned.toFixed(1)} hrs</div>
    </div>
    <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
      <span class="text-xs font-bold uppercase text-slate-400">Total Done</span>
      <div class="text-xl font-black text-blue-600 mt-0.5">${grandDone.toFixed(1)} hrs</div>
    </div>
    <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
      <span class="text-xs font-bold uppercase text-slate-400">Completion Rate</span>
      <div class="text-xl font-black text-emerald-600 mt-0.5">${overallRate}%</div>
    </div>`;

  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#64748b';
  Chart.defaults.font.size = 11;

  if (charts.cat) charts.cat.destroy();
  charts.cat = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: ['School', 'Tuition', 'Study'],
      datasets: [{ data: [plannedCat.School, plannedCat.Tuition, plannedCat.Study], backgroundColor: ['#2563eb', '#f97316', '#8b5cf6'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  if (charts.comp) charts.comp.destroy();
  charts.comp = new Chart(document.getElementById('completionChart'), {
    type: 'bar',
    data: {
      labels: ['School', 'Tuition', 'Study'],
      datasets: [
        { label: 'Planned (h)', data: [plannedCat.School, plannedCat.Tuition, plannedCat.Study], backgroundColor: '#cbd5e1', borderRadius: 4 },
        { label: 'Done (h)', data: [doneCat.School, doneCat.Tuition, doneCat.Study], backgroundColor: ['#2563eb', '#f97316', '#8b5cf6'], borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Planned (h)', data: dailyPlanned, borderColor: '#94a3b8', borderDash: [4, 4], tension: 0.3, fill: false },
        { label: 'Done (h)', data: dailyDone, borderColor: '#2563eb', tension: 0.3, fill: true, backgroundColor: 'rgba(37,99,235,0.08)' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  if (charts.compTrend) charts.compTrend.destroy();
  charts.compTrend = new Chart(document.getElementById('completionTrendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Completion %', data: dailyPct, borderColor: '#10b981', tension: 0.3, fill: true, backgroundColor: 'rgba(16,185,129,0.08)' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

/* ================= RENDERING ================= */
function renderAll() {
  renderSidebarDaySelector();
  renderTables();
  calculateWeeklyStats();
  renderTimetables();
  renderStudentsMaster();
  updatePrintDate();
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function updatePrintDate() {
  const [y, m, d] = state.activeDateStr.split('-');
  const dt = new Date(y, m - 1, d);
  const target = document.getElementById('headerDateStr');
  if (target) target.textContent = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function renderSidebarDaySelector() {
  const today = toISO(new Date());
  const container = document.getElementById('sidebarDayGrid');
  const sunRowContainer = document.getElementById('sidebarSundayRow');
  if (!container) return;

  container.innerHTML = DAYS.slice(0, 6).map((dName, i) => {
    const dIso = addDays(state.viewMondayStr, i);
    const dNum = dIso.split('-')[2];
    const isActive = dIso === state.activeDateStr;
    const isToday = dIso === today;

    let cardClasses = 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-800';
    if (isActive) cardClasses = 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm';
    else if (isToday) cardClasses = 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold';

    return `
      <button onclick="selectDate('${dIso}')" class="h-10 rounded-xl px-2 py-1 flex items-center gap-1.5 transition active:scale-95 text-left ${cardClasses} min-h-[40px]">
        <div class="flex flex-col leading-none min-w-0">
          <span class="text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-slate-500'}">${dName}</span>
          <span class="text-xs font-black mt-0.5">${dNum}</span>
        </div>
      </button>`;
  }).join('');

  if (sunRowContainer) {
    const sunIso = addDays(state.viewMondayStr, 6);
    const sunNum = sunIso.split('-')[2];
    const isSunActive = sunIso === state.activeDateStr;

    let sunClasses = 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950';
    if (isSunActive) sunClasses = 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm';

    sunRowContainer.innerHTML = `
      <div class="mt-1.5">
        <button onclick="selectDate('${sunIso}')" class="w-full h-9 rounded-xl px-2.5 py-1 flex items-center justify-between text-left border transition active:scale-95 ${sunClasses} min-h-[38px]">
          <span class="text-[10px] font-black uppercase tracking-wider">SUNDAY</span>
          <span class="text-xs font-black">${sunNum}</span>
        </button>
        <div class="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5">
          <button onclick="checkAllToday()" class="py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 font-bold text-xs rounded-xl transition active:scale-95 min-h-[36px]">Check All</button>
          <button onclick="clearTodayChecks()" class="py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition active:scale-95 min-h-[36px]">Clear All</button>
        </div>
      </div>`;
  }

  const lbl = document.getElementById('sidebarWeekLabel');
  if (lbl) lbl.textContent = formatWeekRange(state.viewMondayStr);
}

function selectDate(isoStr) {
  state.activeDateStr = isoStr;
  ensureDayPopulated(isoStr);
  saveState();
  renderTables();
  calculateWeeklyStats();
  renderSidebarDaySelector();
  updatePrintDate();
}

function shiftWeek(dir) {
  state.viewMondayStr = addDays(state.viewMondayStr, dir * 7);
  renderSidebarDaySelector();
}

function jumpToday() {
  const t = toISO(new Date());
  state.activeDateStr = t;
  state.viewMondayStr = getMondayISO(new Date());
  ensureDayPopulated(t);
  saveState();
  renderAll();
}

/* ================= TABLES ================= */
function renderTables() {
  const limitISO = toISO(new Date(Date.now() - 15 * 86400000));
  const isArchived = state.activeDateStr < limitISO;
  const dayData = state.days[state.activeDateStr] || { school: [], tuition_study: [] };

  // School
  const sTbody = document.getElementById('schoolBody');
  sTbody.innerHTML = '';
  if (isArchived) {
    sTbody.innerHTML = `<tr class="empty-row"><td colspan="4" class="py-6 px-4 text-center text-xs font-bold text-slate-400">No record available (Date is older than 15 days)</td></tr>`;
  } else if (!dayData.school.length) {
    sTbody.innerHTML = `<tr class="empty-row"><td colspan="4" class="py-6 px-4 text-center text-xs font-semibold text-slate-400">No school classes scheduled for ${getDayName(state.activeDateStr)}</td></tr>`;
  } else {
    dayData.school.forEach(item => {
      const isLive = getTimeStatus(item.time, state.activeDateStr) === 'active';
      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-100 transition ${item.completed ? 'bg-emerald-50/20' : (isLive ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50/80')}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTaskDone('${item.slotId}', 'school')" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer min-h-[20px] min-w-[20px]">
        </td>
        <td class="py-2.5 px-3 text-left col-tm whitespace-nowrap text-xs font-semibold text-slate-600">
          ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
          ${escapeHtml(item.time)}
        </td>
        <td class="py-2.5 px-3 text-left col-tk">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs sm:text-sm font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.task)}</span>
              ${item.isFree ? '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">FREE</span>' : (item.isLab ? '<span class="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-1.5 py-0.5 rounded">LAB</span>' : '')}
            </div>
            ${!item.isFree ? `
              <div class="flex items-center gap-1.5 mt-0.5 text-xs">
                <span class="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 cursor-pointer font-medium" onclick="editTopicPrompt('${item.slotId}', 'school')">
                  📚 Topic: <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
                </span>
              </div>` : ''}
          </div>
        </td>
        <td class="py-2.5 px-3 text-right col-hr whitespace-nowrap text-xs font-semibold text-slate-600">
          ${Number(item.hrs).toFixed(2)} hrs
        </td>`;
      sTbody.appendChild(tr);
    });
  }

  const sTot = dayData.school.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const sDone = dayData.school.filter(i => i.completed && !i.isFree).length;
  const sCount = dayData.school.filter(i => !i.isFree).length;
  document.getElementById('schoolSecTotal').textContent = `${sTot.toFixed(2)} hrs`;
  document.getElementById('schoolSecMeta').textContent = `${sDone} of ${sCount} completed`;

  // Tuition & Study
  const tTbody = document.getElementById('tuitionStudyBody');
  tTbody.innerHTML = '';
  if (isArchived) {
    tTbody.innerHTML = `<tr class="empty-row"><td colspan="5" class="py-6 px-4 text-center text-xs font-bold text-slate-400">No record available (Date is older than 15 days)</td></tr>`;
  } else if (!dayData.tuition_study.length) {
    tTbody.innerHTML = `<tr class="empty-row"><td colspan="5" class="py-6 px-4 text-center text-xs font-semibold text-slate-400">No tuition or study tasks scheduled for ${getDayName(state.activeDateStr)}</td></tr>`;
  } else {
    dayData.tuition_study.forEach(item => {
      const isLive = getTimeStatus(item.time, state.activeDateStr) === 'active';
      const isTuition = item.cat === 'Tuition';
      const bId = item.batchId || normalizeBatchId(item.task);
      const studentCount = (state.rosters[bId] || []).length;

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-100 transition ${item.completed ? 'bg-emerald-50/20' : (isLive ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50/80')}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTaskDone('${item.slotId}', 'tuition_study')" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer min-h-[20px] min-w-[20px]">
        </td>
        <td class="py-2.5 px-3 text-left col-tm whitespace-nowrap text-xs font-semibold text-slate-600">
          ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
          ${escapeHtml(item.time)}
        </td>
        <td class="py-2.5 px-3 text-left col-tk">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs sm:text-sm font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.task)}</span>
                ${isTuition ? `<span class="bg-slate-100 text-slate-600 font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-200">${studentCount} students</span>` : ''}
              </div>
              ${isTuition ? `
                <div class="flex items-center gap-1.5 mt-0.5 text-xs">
                  <span class="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 cursor-pointer font-medium" onclick="editTopicPrompt('${item.slotId}', 'tuition_study')">
                    📚 Topic: <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
                  </span>
                </div>` : ''}
            </div>
            ${isTuition ? `
              <div class="flex items-center gap-1">
                <button onclick="openAttendanceModal('${item.slotId}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition active:scale-95 shadow-sm min-h-[34px]">
                  <i data-lucide="send" class="w-3.5 h-3.5"></i>
                  <span>WhatsApp</span>
                </button>
              </div>` : ''}
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-cat whitespace-nowrap">
          <span class="cat-pill ${item.cat}">${item.cat}</span>
        </td>
        <td class="py-2.5 px-3 text-right col-hr whitespace-nowrap text-xs font-semibold text-slate-600">
          ${Number(item.hrs).toFixed(2)} hrs
        </td>`;
      tTbody.appendChild(tr);
    });
  }

  const tTot = dayData.tuition_study.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const tDone = dayData.tuition_study.filter(i => i.completed).length;
  const tCount = dayData.tuition_study.length;
  document.getElementById('tuitionSecTotal').textContent = `${tTot.toFixed(2)} hrs`;
  document.getElementById('tuitionSecMeta').textContent = `${tDone} of ${tCount} completed`;
}

function toggleTaskDone(slotId, sec) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData || !dayData[sec]) return;
  const item = dayData[sec].find(i => i.slotId === slotId);
  if (item) {
    item.completed = !item.completed;
    AppData.saveAndNotify();
  }
}

function editTopicPrompt(slotId, sec) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData || !dayData[sec]) return;
  const item = dayData[sec].find(i => i.slotId === slotId);
  if (!item) return;

  showActionModal({
    title: 'Edit Topic',
    msg: `Enter topic for "${item.task}":`,
    hasInput: true,
    inputVal: item.topic || '',
    onConfirm: (val) => {
      item.topic = val.trim();
      item.topicEdited = true;
      AppData.saveAndNotify('Topic updated');
    }
  });
}

function checkAllToday() {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const prevCompletedState = JSON.stringify(dayData);
  [...(dayData.school || []), ...(dayData.tuition_study || [])].forEach(i => i.completed = true);
  saveState();
  renderAll();
  showToastWithUndo('All tasks checked', () => {
    state.days[state.activeDateStr] = JSON.parse(prevCompletedState);
    AppData.saveAndNotify('Checks reverted');
  });
}

function clearTodayChecks() {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const prevCompletedState = JSON.stringify(dayData);
  [...(dayData.school || []), ...(dayData.tuition_study || [])].forEach(i => i.completed = false);
  saveState();
  renderAll();
  showToastWithUndo('All tasks cleared', () => {
    state.days[state.activeDateStr] = JSON.parse(prevCompletedState);
    AppData.saveAndNotify('Checks reverted');
  });
}

/* ================= STUDENTS MASTER ================= */
function setStudentMasterView(mode) {
  studentMasterView = mode;
  const cards = document.getElementById('studentBatchCardsContainer');
  const dir = document.getElementById('studentDirectoryContainer');
  const btnC = document.getElementById('btnViewCards');
  const btnD = document.getElementById('btnViewDirectory');

  if (mode === 'cards') {
    cards.classList.remove('hidden');
    dir.classList.add('hidden');
    btnC.className = 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white transition min-h-[32px]';
    btnD.className = 'px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition min-h-[32px]';
  } else {
    cards.classList.add('hidden');
    dir.classList.remove('hidden');
    btnD.className = 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white transition min-h-[32px]';
    btnC.className = 'px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition min-h-[32px]';
  }
  renderStudentsMaster();
}

function renderStudentsMaster() {
  const batches = AppData.getAllBatches();
  const searchInput = document.getElementById('studentMasterSearch');
  const query = (searchInput?.value || '').toLowerCase().trim();

  let totalBatches = batches.length;
  let totalEnrollments = 0;
  let allStudentNamesSet = new Set();

  batches.forEach(b => {
    totalEnrollments += b.students.length;
    b.students.forEach(s => allStudentNamesSet.add(s.toLowerCase()));
  });

  const statsRow = document.getElementById('studentsMasterStats');
  if (statsRow) {
    statsRow.innerHTML = `
      <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
        <span class="text-[10px] font-bold uppercase text-slate-400">Total Batches</span>
        <div class="text-xl font-black text-slate-800 mt-0.5">${totalBatches}</div>
      </div>
      <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
        <span class="text-[10px] font-bold uppercase text-slate-400">Total Enrolled</span>
        <div class="text-xl font-black text-emerald-600 mt-0.5">${totalEnrollments}</div>
      </div>
      <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
        <span class="text-[10px] font-bold uppercase text-slate-400">Unique Students</span>
        <div class="text-xl font-black text-blue-600 mt-0.5">${allStudentNamesSet.size}</div>
      </div>
      <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
        <span class="text-[10px] font-bold uppercase text-slate-400">Avg Batch Size</span>
        <div class="text-xl font-black text-orange-500 mt-0.5">${totalBatches > 0 ? (totalEnrollments / totalBatches).toFixed(1) : '0'}</div>
      </div>`;
  }

  const filteredBatches = batches.filter(b => {
    if (!query) return true;
    if (b.title.toLowerCase().includes(query)) return true;
    if (b.batchId.toLowerCase().includes(query)) return true;
    return b.students.some(s => s.toLowerCase().includes(query));
  });

  const cardsContainer = document.getElementById('studentBatchCardsContainer');
  if (cardsContainer) {
    cardsContainer.innerHTML = filteredBatches.map(b => {
      const daysBadges = b.daysArray.map(d => `<span class="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px]">${d}</span>`).join(' ') || '<span class="text-slate-400 text-[10px] italic">Not scheduled</span>';

      return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-xs font-black text-slate-900 truncate">${escapeHtml(b.title)}</h3>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">${daysBadges}</div>
              </div>
              <span class="bg-emerald-100 text-emerald-800 text-xs font-black px-2 py-0.5 rounded-full shrink-0">
                ${b.students.length}
              </span>
            </div>

            <div class="p-3 space-y-1.5 max-h-56 overflow-y-auto">
              ${b.students.length === 0 ? '<div class="text-xs text-slate-400 italic py-2 text-center">No students enrolled yet</div>' : ''}
              ${b.students.map((student, idx) => {
                const stats = AppData.getStudentAttendanceStats(b.batchId, student);
                const encStudent = encodeURIComponent(student);
                return `
                  <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-xs">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="text-slate-400 font-bold text-[10px] w-4 text-center">${idx + 1}</span>
                      <span class="font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600" onclick="promptRenameStudent('${b.batchId}', decodeURIComponent('${encStudent}'))">
                        ${escapeHtml(student)}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        ${stats.totalPresent}P / ${stats.totalRecords}
                      </span>
                      <button onclick="promptRenameStudent('${b.batchId}', decodeURIComponent('${encStudent}'))" class="p-1 text-slate-400 hover:text-blue-600" title="Edit name">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="AppData.removeStudent('${b.batchId}', decodeURIComponent('${encStudent}'))" class="p-1 text-slate-400 hover:text-rose-600" title="Remove student">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <div class="p-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center gap-1.5">
            <input type="text" id="addStInput_${b.batchId}" placeholder="Add student..." class="flex-1 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 min-h-[34px]" onkeydown="if(event.key==='Enter') addStudentFromCard('${b.batchId}')">
            <button onclick="addStudentFromCard('${b.batchId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition min-h-[34px]">Add</button>
          </div>
        </div>`;
    }).join('');
  }

  const dirBody = document.getElementById('studentDirectoryBody');
  if (dirBody) {
    let rowIdx = 1;
    let tableRows = [];

    filteredBatches.forEach(b => {
      b.students.forEach(student => {
        const stats = AppData.getStudentAttendanceStats(b.batchId, student);
        const encStudent = encodeURIComponent(student);
        tableRows.push(`
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-3 text-slate-400 font-bold">${rowIdx++}</td>
            <td class="py-2.5 px-3 font-bold text-slate-900 cursor-pointer hover:text-blue-600" onclick="promptRenameStudent('${b.batchId}', decodeURIComponent('${encStudent}'))">
              ${escapeHtml(student)}
            </td>
            <td class="py-2.5 px-3 font-semibold text-slate-600">${escapeHtml(b.title)}</td>
            <td class="py-2.5 px-3">
              <span class="text-xs font-medium text-slate-500">${b.daysArray.join(', ') || 'N/A'}</span>
            </td>
            <td class="py-2.5 px-3 text-center">
              <span class="bg-slate-100 text-slate-700 font-bold text-xs px-2 py-0.5 rounded-full border border-slate-200">
                ${stats.totalPresent} Present / ${stats.totalRecords} Logs
              </span>
            </td>
            <td class="py-2.5 px-3 text-right">
              <button onclick="promptRenameStudent('${b.batchId}', decodeURIComponent('${encStudent}'))" class="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded text-xs font-bold mr-1">Rename</button>
              <button onclick="AppData.removeStudent('${b.batchId}', decodeURIComponent('${encStudent}'))" class="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded text-xs font-bold">Remove</button>
            </td>
          </tr>`);
      });
    });

    dirBody.innerHTML = tableRows.length === 0 ? `<tr><td colspan="6" class="py-8 text-center text-xs font-semibold text-slate-400">No student records match your query</td></tr>` : tableRows.join('');
  }

  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function addStudentFromCard(batchId) {
  const input = document.getElementById(`addStInput_${batchId}`);
  if (!input) return;
  const res = AppData.addStudent(batchId, input.value);
  if (res.success) input.value = '';
  else showToast(res.message, 'error');
}

function promptRenameStudent(batchId, oldName) {
  showActionModal({
    title: 'Rename Student',
    msg: `Change name for "${oldName}". Attendance logs migrate automatically:`,
    hasInput: true,
    inputVal: oldName,
    onConfirm: (newName) => {
      const res = AppData.renameStudent(batchId, oldName, newName);
      if (!res.success) showToast(res.message, 'error');
    }
  });
}

function promptCreateNewBatch() {
  showActionModal({
    title: 'Create New Batch',
    msg: 'Enter Batch Title (e.g. "Class XII CS – Morning Batch"):',
    hasInput: true,
    inputVal: '',
    onConfirm: (title) => {
      const res = AppData.createBatch(title);
      if (!res.success) showToast(res.message, 'error');
    }
  });
}

/* ================= ATTENDANCE & WHATSAPP ================= */
function openAttendanceModal(slotId) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const item = dayData.tuition_study.find(i => i.slotId === slotId);
  if (!item) return;

  currentAttTaskId = slotId;
  currentAttBatchId = item.batchId || normalizeBatchId(item.task);
  currentAttBatchTitle = item.task;

  const prevDate = getPreviousClassDate(currentAttBatchId, state.activeDateStr);
  currentAttTargetDate = prevDate;

  document.getElementById('attBatchTitle').textContent = `Attendance: ${currentAttBatchTitle}`;
  document.getElementById('attendanceModal').classList.remove('hidden');

  updateAttDateButtons();
  renderAttendanceList();
}

function closeAttendanceModal() {
  document.getElementById('attendanceModal').classList.add('hidden');
}

function switchAttDate(mode) {
  currentAttTargetDate = (mode === 'previous')
    ? getPreviousClassDate(currentAttBatchId, state.activeDateStr)
    : state.activeDateStr;
  updateAttDateButtons();
  renderAttendanceList();
}

function updateAttDateButtons() {
  const prevDate = getPreviousClassDate(currentAttBatchId, state.activeDateStr);
  const btnP = document.getElementById('btnDatePrevious');
  const btnT = document.getElementById('btnDateToday');

  btnP.textContent = `Previous Class (${formatShortDate(prevDate)})`;
  btnT.textContent = `Today (${formatShortDate(state.activeDateStr)})`;

  if (currentAttTargetDate === prevDate) {
    btnP.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-orange-400 bg-orange-100 text-orange-900 shadow-sm min-h-[36px]';
    btnT.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 min-h-[36px]';
  } else {
    btnT.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-400 bg-blue-100 text-blue-900 shadow-sm min-h-[36px]';
    btnP.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 min-h-[36px]';
  }

  const hasPrevAtt = attendanceStore[prevDate]?.[currentAttBatchId] && Object.keys(attendanceStore[prevDate][currentAttBatchId]).length > 0;
  const banner = document.getElementById('attPrevWarningBanner');
  if (banner) {
    if (!hasPrevAtt && currentAttTargetDate === prevDate) banner.classList.remove('hidden');
    else banner.classList.add('hidden');
  }
}

function renderAttendanceList() {
  const container = document.getElementById('attStudentList');
  const roster = AppData.getRoster(currentAttBatchId);
  const dayAtt = (attendanceStore[currentAttTargetDate] && attendanceStore[currentAttTargetDate][currentAttBatchId]) || {};

  let pCount = 0;
  container.innerHTML = roster.map(student => {
    const status = dayAtt[student] || null;
    if (status === 'P' || status === 'L') pCount++;

    return `
      <div class="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition">
        <span class="text-xs font-bold text-slate-800 truncate pr-2">${escapeHtml(student)}</span>
        <div class="flex items-center gap-1.5 shrink-0" data-student-row="${escapeHtml(student)}">
          <button data-action="status" data-val="P" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}">P</button>
          <button data-action="status" data-val="A" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}">A</button>
          <button data-action="status" data-val="L" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}">Late</button>
          <button data-action="delete" class="text-slate-300 hover:text-rose-500 p-1 rounded min-h-[34px] min-w-[34px] flex items-center justify-center" title="Remove student">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('attStatsCounter').textContent = `${pCount} Present / ${roster.length} Total`;
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

document.getElementById('attStudentList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const row = btn.closest('[data-student-row]');
  if (!row) return;
  const student = row.getAttribute('data-student-row');
  const action = btn.getAttribute('data-action');

  if (action === 'status') {
    const val = btn.getAttribute('data-val');
    setStudentStatus(student, val);
  } else if (action === 'delete') {
    AppData.removeStudent(currentAttBatchId, student);
    renderAttendanceList();
  }
});

function setStudentStatus(student, status) {
  if (!attendanceStore[currentAttTargetDate]) attendanceStore[currentAttTargetDate] = {};
  if (!attendanceStore[currentAttTargetDate][currentAttBatchId]) attendanceStore[currentAttTargetDate][currentAttBatchId] = {};
  attendanceStore[currentAttTargetDate][currentAttBatchId][student] = status;
  saveState();
  renderAttendanceList();
}

function markAllAttendance(status) {
  const roster = AppData.getRoster(currentAttBatchId);
  if (!attendanceStore[currentAttTargetDate]) attendanceStore[currentAttTargetDate] = {};
  if (!attendanceStore[currentAttTargetDate][currentAttBatchId]) attendanceStore[currentAttTargetDate][currentAttBatchId] = {};
  roster.forEach(st => attendanceStore[currentAttTargetDate][currentAttBatchId][st] = status);
  saveState();
  renderAttendanceList();
}

function addStudentFromModal() {
  const input = document.getElementById('newStudentInput');
  const name = input.value.trim();
  if (!name) return;
  const res = AppData.addStudent(currentAttBatchId, name);
  if (res.success) {
    setStudentStatus(name, 'P');
    input.value = '';
    renderAttendanceList();
  } else {
    showToast(res.message, 'error');
  }
}

function saveAttendanceOnly() {
  saveState();
  closeAttendanceModal();
  showToast('Attendance recorded', 'success');
}

function confirmAttendanceAndLaunchWhatsApp() {
  saveState();
  const dayData = state.days[state.activeDateStr];
  const item = dayData ? dayData.tuition_study.find(i => i.slotId === currentAttTaskId) : null;
  if (!item) {
    closeAttendanceModal();
    return;
  }

  if (!item.topic || !item.topic.trim()) {
    showActionModal({
      title: 'Topic Required',
      msg: `Please enter today's topic for "${item.task}" before sending:`,
      hasInput: true,
      inputVal: '',
      onConfirm: (tVal) => {
        item.topic = tVal.trim();
        item.topicEdited = true;
        saveState();
        renderTables();
        dispatchWhatsAppMessage(item);
      }
    });
  } else {
    dispatchWhatsAppMessage(item);
  }
}

function dispatchWhatsAppMessage(item) {
  let cleanSubject = (item.task || 'Class').trim();
  if (/^(IX|X|XI|XII)\b/i.test(cleanSubject) && !/^Class\b/i.test(cleanSubject)) {
    cleanSubject = 'Class ' + cleanSubject;
  }
  cleanSubject = cleanSubject.replace(/SantNagar/gi, 'Sant Nagar');

  let venue = 'Sant Nagar';
  if (/sics/i.test(cleanSubject)) venue = 'SICS';
  else if (/skillyards/i.test(cleanSubject)) venue = 'SkillYards';
  else if (/home\s*tuition/i.test(cleanSubject)) venue = 'Home Visit';
  else if (/vidya/i.test(cleanSubject)) venue = 'Vidya Home';
  else if (/kriti|kirti/i.test(cleanSubject)) venue = 'Private Coaching';

  const range = parseTimeRange(item.time);
  let startTime = range.formatted.split('-')[0]?.trim() || '';
  let endTime = range.formatted.split('-')[1]?.trim() || '';

  const isToday = state.activeDateStr === toISO(new Date());
  const dayHeader = isToday ? 'Today’s' : `${getDayName(state.activeDateStr)}’s`;

  const prevDate = getPreviousClassDate(currentAttBatchId, state.activeDateStr);
  const formattedBackDate = formatFullDisplayDate(prevDate);
  const includeAbsentees = document.getElementById('includeAbsenteeToggle')?.checked;

  let absentStudents = [];
  if (includeAbsentees && attendanceStore[prevDate]?.[currentAttBatchId]) {
    const attMap = attendanceStore[prevDate][currentAttBatchId];
    Object.keys(attMap).forEach(st => {
      if (attMap[st] === 'A') absentStudents.push(st);
    });
  }

  let absentSectionText = '';
  if (absentStudents.length > 0) {
    const listText = absentStudents.map((st, i) => `- ${i + 1}. ${st}`).join('\n');
    absentSectionText = `\n*=✦=✦=✦=✦=✦=✦=✦==✦=✦=✦=✦=*\n⚠️ _*Absent students on ${formattedBackDate}:*_\n${listText}\n*=✦=✦=✦=✦=✦=✦=✦==✦=✦=✦=✦=*`;
  }

  const message = `
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
⏰*Gentle Reminder*
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
🏛️ *${dayHeader}* ${cleanSubject}
📍 *Venue:* ${venue}
⏰ *Time:* *${startTime}* to *${endTime}*
📚 *Topic:* ${item.topic.trim()}
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
🌐 *Visit:* www.SinghClasses.in
*=✦=✦=✦=✦=✦=✦=✦==✦=✦=✦=✦=*${absentSectionText ? '\n' + absentSectionText.trim() : ''}`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message.trim())}`;
  window.open(url, '_blank');

  closeAttendanceModal();
  showToast('WhatsApp launched & attendance saved', 'success');
}

/* ================= TIMETABLE MASTER EDITOR ================= */
function renderTimetables() {
  const renderGrid = (type, obj) => DAYS.map(d => {
    return `
      <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div class="px-3 py-1.5 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-700">${d}</div>
        <div class="p-2 space-y-1.5">
          ${((obj && obj[d]) || []).map((slot, i) => editMode[type] ? `
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
              <div class="flex items-center gap-1">
                <input type="text" class="w-full text-xs font-semibold p-1 border rounded bg-white tt-time-${type}-${d}" data-idx="${i}" value="${escapeHtml(slot.time)}" placeholder="Time Range">
                <button onclick="deleteTemplateSlot('${type}','${d}',${i})" class="text-rose-500 hover:text-rose-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <input type="text" class="w-full text-xs font-bold p-1 border rounded bg-white tt-task-${type}-${d}" data-idx="${i}" value="${escapeHtml(slot.task)}" placeholder="Class / Subject">
              ${type !== 'study' ? `<input type="text" class="w-full text-xs font-medium p-1 border rounded bg-white tt-topic-${type}-${d}" data-idx="${i}" value="${escapeHtml(slot.topic || '')}" placeholder="Default Topic">` : ''}
            </div>` : `
            <div class="p-1.5 border-b border-slate-100 last:border-none flex items-center justify-between text-xs">
              <div>
                <div class="font-bold text-slate-900">${escapeHtml(slot.task)}</div>${slot.topic ? `<div class="text-[10px] text-blue-600 font-semibold">${escapeHtml(slot.topic)}</div>` : ''}
                <div class="text-[10px] text-slate-500">${escapeHtml(slot.time)}</div>
              </div>
              <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">${parseTimeRange(slot.time).hrs}h</span>
            </div>`).join('')}
          ${editMode[type] ? `<button onclick="addNewTemplateSlot('${type}','${d}')" class="w-full py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-300 min-h-[34px]">+ Add Period</button>` : ''}
          ${(!editMode[type] && (!obj || !obj[d] || obj[d].length === 0)) ? '<div class="text-xs p-1 text-slate-400 italic">No classes scheduled</div>' : ''}
        </div>
      </div>`;
  }).join('');

  document.getElementById('schoolTimetable').innerHTML = renderGrid('school', state.timetables.school);
  document.getElementById('tuitionTimetable').innerHTML = renderGrid('tuition', state.timetables.tuition);
  document.getElementById('studyTimetable').innerHTML = renderGrid('study', state.timetables.study);

  ['school', 'tuition', 'study'].forEach(t => {
    const btn = document.getElementById(`btnEdit${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      btn.textContent = editMode[t] ? 'Save Changes' : `Edit ${t.charAt(0).toUpperCase() + t.slice(1)}`;
      btn.className = editMode[t]
        ? 'text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white min-h-[34px]'
        : 'text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 min-h-[34px]';
    }
  });

  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function syncCurrentTimetableInputs(t) {
  if (!editMode[t]) return;
  const obj = state.timetables[t];
  DAYS.forEach(d => {
    const times = document.querySelectorAll(`.tt-time-${t}-${d}`);
    const tasks = document.querySelectorAll(`.tt-task-${t}-${d}`);
    const topics = document.querySelectorAll(`.tt-topic-${t}-${d}`);
    const oldSlots = obj[d] || [];
    const newSlots = [];

    times.forEach((el, idx) => {
      const timeVal = el.value.trim();
      const taskVal = tasks[idx] ? tasks[idx].value.trim() : '';
      const topicVal = topics[idx] ? topics[idx].value.trim() : '';

      if (timeVal || taskVal) {
        const oldSlot = oldSlots[idx];
        const oldId = oldSlot?.id;
        
        let assignedBatchId = undefined;
        if (t === 'tuition') {
          // If the task name has not changed, retain previous batchId; otherwise normalize from taskVal
          if (oldSlot && oldSlot.task === taskVal && oldSlot.batchId) {
            assignedBatchId = oldSlot.batchId;
          } else {
            assignedBatchId = normalizeBatchId(taskVal);
          }
          if (assignedBatchId && !state.rosters[assignedBatchId]) {
            state.rosters[assignedBatchId] = [];
          }
        }

        newSlots.push({
          id: oldId || (t.slice(0, 3) + '_' + Math.random().toString(36).slice(2, 7)),
          batchId: assignedBatchId,
          time: timeVal,
          task: taskVal,
          topic: topicVal
        });
      }
    });
    obj[d] = newSlots;
  });
}

function toggleEditMode(t) {
  if (editMode[t]) {
    syncCurrentTimetableInputs(t);
    editMode[t] = false;
    saveState();
    ensureDayPopulated(state.activeDateStr);
    renderAll();
    showToast(`${t.toUpperCase()} schedule saved locally`, 'success');
  } else {
    editMode[t] = true;
    renderTimetables();
  }
}

function addNewTemplateSlot(t, d) {
  syncCurrentTimetableInputs(t);
  if (!state.timetables[t][d]) state.timetables[t][d] = [];
  const uniqueBatchId = 'b_' + Math.random().toString(36).slice(2, 8);
  state.timetables[t][d].push({
    id: t.slice(0, 3) + '_' + Math.random().toString(36).slice(2, 7),
    batchId: t === 'tuition' ? uniqueBatchId : undefined,
    time: '04:00 PM - 05:00 PM',
    task: 'New Session',
    topic: ''
  });
  renderTimetables();
}

function deleteTemplateSlot(t, d, i) {
  syncCurrentTimetableInputs(t);
  state.timetables[t][d].splice(i, 1);
  renderTimetables();
}

function promptResetTimetableDefaults() {
  showActionModal({
    title: 'Clear Timetables',
    msg: 'Clear all schedule templates to blank? Click Cloud Sync afterwards if you want to re-download from Google Sheets.',
    onConfirm: () => {
      state.timetables = JSON.parse(JSON.stringify(EMPTY_TIMETABLES));
      saveState();
      ensureDayPopulated(state.activeDateStr);
      renderAll();
      showToast('Timetables cleared to blank', 'info');
    }
  });
}

/* ================= SECTION FILTERS & MODALS ================= */
function setPlannerView(view) {
  currentPlannerView = view;
  const sSec = document.getElementById('schoolClassesSec');
  const tSec = document.getElementById('tuitionStudySec');
  const pS = document.getElementById('pillBtnSchool');
  const pT = document.getElementById('pillBtnTuition');
  const pA = document.getElementById('pillBtnAll');

  [pS, pT, pA].forEach(b => b.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:bg-slate-100 min-h-[34px]');

  if (view === 'school') {
    sSec.style.display = 'block';
    tSec.style.display = 'none';
    pS.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white min-h-[34px]';
  } else if (view === 'tuition') {
    sSec.style.display = 'none';
    tSec.style.display = 'block';
    pT.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-orange-600 text-white min-h-[34px]';
  } else {
    sSec.style.display = 'block';
    tSec.style.display = 'block';
    pA.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-800 text-white min-h-[34px]';
  }
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabId === 'analytics') setTimeout(updateAnalytics, 60);
  if (tabId === 'timetables') renderTimetables();
  if (tabId === 'students') renderStudentsMaster();
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function handleNavClick(view, btn) {
  switchTab('planner', btn);
  setPlannerView(view);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-rose-600' : (type === 'success' ? 'bg-emerald-600' : 'bg-slate-900');
  toast.className = `${bg} text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto transition transform duration-200`;
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function showToastWithUndo(msg, onUndo) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'bg-slate-900 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-3 pointer-events-auto';
  toast.innerHTML = `
    <span>${escapeHtml(msg)}</span>
    <button class="bg-amber-400 hover:bg-amber-300 text-slate-900 px-2 py-1 rounded font-black text-[11px] min-h-[28px]">Undo</button>`;
  toast.querySelector('button').onclick = () => {
    onUndo();
    toast.remove();
  };
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function showActionModal({ title, msg, hasInput = false, inputVal = '', onConfirm }) {
  const modal = document.getElementById('actionModal');
  const titleEl = document.getElementById('actionModalTitle');
  const msgEl = document.getElementById('actionModalMsg');
  const inputContainer = document.getElementById('actionModalInputContainer');
  const inputEl = document.getElementById('actionModalInput');
  const confirmBtn = document.getElementById('actionModalConfirmBtn');
  const cancelBtn = document.getElementById('actionModalCancelBtn');

  titleEl.textContent = title;
  msgEl.textContent = msg;

  if (hasInput) {
    inputContainer.classList.remove('hidden');
    inputEl.value = inputVal;
  } else {
    inputContainer.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  if (hasInput) inputEl.focus();

  const cleanup = () => modal.classList.add('hidden');
  cancelBtn.onclick = cleanup;
  confirmBtn.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm(hasInput ? inputEl.value : true);
  };
}

/* ================= IMPORT / EXPORT ================= */
function exportBackup() {
  state.lastBackup = Date.now();
  saveState();
  const payload = {
    version: TEMPLATE_VERSION,
    exportedAt: new Date().toISOString(),
    planner: state,
    attendance: attendanceStore
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `singhPlanner_backup_${toISO(new Date())}.json`;
  a.click();
  showToast('Planner backup downloaded', 'success');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.result);
      if (!data || (!data.planner && !data.timetables)) throw new Error('Invalid schema');

      showActionModal({
        title: 'Confirm Backup Import',
        msg: 'Importing will replace your current schedule and student rosters. Continue?',
        onConfirm: () => {
          if (data.planner) {
            state = Object.assign(state, data.planner);
            if (data.attendance) attendanceStore = data.attendance;
          } else {
            state.timetables = data.timetables;
            if (data.days) state.days = data.days;
          }
          saveState();
          ensureDayPopulated(state.activeDateStr);
          renderAll();
          showToast('Backup restored successfully!', 'success');
        }
      });
    } catch (err) {
      showToast('Selected file is not a valid planner backup', 'error');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function triggerPrint() {
  window.print();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ================= INITIALIZATION ================= */
window.addEventListener('load', () => {
  loadState();

  // Background fetch strictly from Google Sheets
  if (APPS_SCRIPT_URL) {
    fetchFromAppsScript(false);
  }

  const updateClock = () => {
    const now = new Date();
    const timeEl = document.getElementById('headerTimeStr');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const curISO = toISO(now);
    if (curISO !== lastCheckedDate) {
      lastCheckedDate = curISO;
      state.activeDateStr = curISO;
      state.viewMondayStr = getMondayISO(now);
      ensureDayPopulated(curISO);
      saveState();
      renderAll();
    }
  };

  updateClock();
  setInterval(updateClock, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updateClock();
  });
});