/* ==========================================================================
   CONFIG & CLIENT-SIDE STATE ENGINE
   ========================================================================== */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjkicMk3BpVYLChh6YdcnrYDmh2Pd4x40FDAIguSNbjOWjuqzQuZz0_V5DLQ6IpeEY/exec';
const APPS_SCRIPT_SECRET_TOKEN = 'singh_planner_secure_2026';

const TEMPLATE_VERSION = '2026.5_unified_cols';
const STORAGE_KEY_PLANNER = 'singhPlanner_core_v2';
const STORAGE_KEY_ATTENDANCE = 'singhPlanner_attendance_v2';
const STORAGE_KEY_RESCUE = 'singhPlanner_rescue_backup_v2';
const STORAGE_KEY_LAST_SYNC = 'singhPlanner_last_sync_time';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
let lastCheckedDate = toISO(new Date());

let currentAttBatchId = null;
let currentAttBatchTitle = '';
let currentAttTaskId = null;
let currentAttTargetDate = toISO(new Date());
let lastDeletedStudent = null;
let activeModalTrigger = null;

/* ================= APPS SCRIPT PULL ENGINE (AUTHENTICATED) ================= */
async function fetchFromAppsScript(showFeedback = true) {
  if (!APPS_SCRIPT_URL) {
    if (showFeedback) showToast('Missing APPS_SCRIPT_URL', 'error');
    return;
  }

  const syncBtn = document.getElementById('cloudSyncBtn');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.classList.add('opacity-70', 'cursor-not-allowed');
  }

  if (showFeedback) showToast('Pulling data from Google Sheets...', 'info');

  try {
    const fetchUrl = `${APPS_SCRIPT_URL}?action=getAll&token=${encodeURIComponent(APPS_SCRIPT_SECRET_TOKEN)}&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.status === 'success') {
      let syncedItems = [];

      if (data.timetables && typeof data.timetables === 'object') {
        state.timetables = {
          school: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.school || {}),
          tuition: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.tuition || {}),
          study: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.study || {})
        };
        syncedItems.push('Timetables');
      }

      if (data.rosters && typeof data.rosters === 'object') {
        state.rosters = data.rosters;
        syncedItems.push('Rosters');
      }

      const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, syncTime);

      saveState();
      ensureDayPopulated(state.activeDateStr);
      renderAll();

      if (showFeedback) {
        const titleSuffix = data.spreadsheetTitle ? ` from "${data.spreadsheetTitle}"` : '';
        showToast(`Pulled ${syncedItems.join(' & ')}${titleSuffix} successfully!`, 'success');
      }
    } else {
      throw new Error(data.message || 'Error reported from Google Apps Script');
    }
  } catch (err) {
    console.error('Apps Script Fetch Error:', err);
    if (showFeedback) showToast(`Pull failed: ${err.message}`, 'error');
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
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
  if (curM < range.startMin && curM >= range.startMin - 30) return 'upcoming';
  if (curM > range.endMin) return 'past';
  return 'normal';
}

function parseSchoolTask(taskStr, explicitMode = null) {
  const raw = taskStr || '';
  const isFree = /\bfree\b/i.test(raw) || (explicitMode && explicitMode.toLowerCase() === 'free');
  const isLab = /\blab\b/i.test(raw) || (explicitMode && explicitMode.toLowerCase() === 'lab');
  let name = raw.replace(/\blab\b/gi, '').replace(/\bfree\b/gi, '').trim();
  if (!name) name = isFree ? 'FREE' : 'School Class';
  const mode = isFree ? 'Free' : (isLab ? 'Lab' : 'Class');
  return { name, mode, isLab, isFree };
}

function parseTuitionTask(taskStr, explicitVenue = null) {
  let raw = (taskStr || '').trim();
  let venue = explicitVenue || 'Sant Nagar';
  let batchName = raw;

  if (!explicitVenue && raw.includes('–')) {
    const parts = raw.split('–');
    batchName = parts[0].trim();
    venue = parts[1].trim();
  } else if (!explicitVenue && raw.includes('-')) {
    const parts = raw.split('-');
    batchName = parts[0].trim();
    venue = parts[1].trim();
  }

  if (!explicitVenue) {
    if (/sics/i.test(raw)) venue = 'SICS';
    else if (/skillyards/i.test(raw)) venue = 'SkillYards';
    else if (/home\s*tuition/i.test(raw)) venue = 'Home Visit';
    else if (/vidya/i.test(raw)) venue = 'Vidya Home';
  }

  return { batchName, venue };
}

function normalizeBatchId(name) {
  return 'b_' + (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
}

/* ================= APPDATA INTERFACE ================= */
const AppData = {

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

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (!state.lastBackup || (Date.now() - state.lastBackup > sevenDays)) {
    const banner = document.getElementById('backupNudgeBanner');
    if (banner) banner.classList.remove('hidden');
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

  // School Population
  const schSlots = (state.timetables.school && state.timetables.school[dName]) || [];
  const populatedSchool = schSlots.map((slot, idx) => {
    const ex = daySchoolMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    const pInfo = parseSchoolTask(slot.task, slot.mode);
    return {
      slotId: slot.id,
      periodNum: slot.period || (idx + 1),
      time: slot.time,
      hrs: pInfo.isFree ? 0 : range.hrs,
      cat: 'School',
      task: pInfo.name,
      mode: pInfo.mode,
      topic: ex && ex.topicEdited ? ex.topic : slot.topic || '',
      topicEdited: ex ? !!ex.topicEdited : false,
      completed: ex ? !!ex.completed : false,
      isFree: pInfo.isFree,
      isLab: pInfo.isLab
    };
  });

  // Tuition Population
  const tuiSlots = (state.timetables.tuition && state.timetables.tuition[dName]) || [];
  const populatedTuition = tuiSlots.map((slot, idx) => {
    const ex = dayTuitionMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    const tInfo = parseTuitionTask(slot.task, slot.venue);
    return {
      slotId: slot.id,
      sno: slot.sno || (idx + 1),
      batchId: slot.batchId || normalizeBatchId(tInfo.batchName),
      time: slot.time,
      hrs: range.hrs,
      cat: 'Tuition',
      task: tInfo.batchName,
      venue: tInfo.venue,
      topic: ex && ex.topicEdited ? ex.topic : slot.topic || '',
      topicEdited: ex ? !!ex.topicEdited : false,
      completed: ex ? !!ex.completed : false
    };
  });

  // Study Population
  const stdSlots = (state.timetables.study && state.timetables.study[dName]) || [];
  const populatedStudy = stdSlots.map((slot, idx) => {
    const ex = dayTuitionMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    return {
      slotId: slot.id,
      sno: slot.sno || (populatedTuition.length + idx + 1),
      time: slot.time,
      hrs: range.hrs,
      cat: 'Study',
      task: slot.task || 'Self Study',
      venue: 'Self Study',
      topic: '',
      completed: ex ? !!ex.completed : false
    };
  });

  state.days[dateStr].school = populatedSchool;
  state.days[dateStr].tuition_study = [...populatedTuition, ...populatedStudy];
}

function reloadDayFromTimetable(dateStr) {
  const previousData = state.days[dateStr] ? JSON.parse(JSON.stringify(state.days[dateStr])) : null;
  if (state.days[dateStr]) delete state.days[dateStr];
  ensureDayPopulated(dateStr);
  saveState();
  renderAll();

  showToastWithUndo(`Reset ${getDayName(dateStr)} from template`, () => {
    if (previousData) {
      state.days[dateStr] = previousData;
      AppData.saveAndNotify(`Restored ${getDayName(dateStr)} state`);
    }
  });
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
function calculateDailyStats() {
  const totals = { school: 0, tuition: 0, study: 0 };
  let completedCount = 0, totalCount = 0;

  const curDate = state.activeDateStr;
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
    const dName = getDayName(curDate);
    ((state.timetables.school && state.timetables.school[dName]) || []).forEach(s => {
      const range = parseTimeRange(s.time);
      const p = parseSchoolTask(s.task, s.mode);
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

  document.getElementById('totalSchool').textContent = totals.school.toFixed(1);
  document.getElementById('totalTuition').textContent = totals.tuition.toFixed(1);
  document.getElementById('totalStudy').textContent = totals.study.toFixed(1);

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  document.getElementById('completedCount').textContent = completedCount;
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('progressPercent').textContent = `${pct}% complete`;

}

// Kept so existing calls (renderAll, selectDate) still work
function calculateWeeklyStats() {
  calculateDailyStats();
}

/* ================= RENDERING ================= */
function renderAll() {
  renderSidebarDaySelector();
  renderTables();
  calculateWeeklyStats();
  updatePrintDate();
}

function updatePrintDate() {
  const [y, m, d] = state.activeDateStr.split('-');
  const dt = new Date(y, m - 1, d);
  const target = document.getElementById('headerDateStr');
  if (target) target.textContent = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function renderSidebarDaySelector() {
  const label = document.getElementById('dailyDateLabel');
  if (!label) return;
  const [y, m, d] = state.activeDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  label.textContent = `${getDayName(state.activeDateStr)}, ${String(d).padStart(2, '0')} ${dt.toLocaleDateString('en-US', { month: 'short' })} ${y}`;
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

function jumpToday() {
  const t = toISO(new Date());
  state.activeDateStr = t;
  state.viewMondayStr = getMondayISO(new Date());
  ensureDayPopulated(t);
  saveState();
  renderAll();
}

function shiftDay(dir) {
  state.activeDateStr = addDays(state.activeDateStr, dir);
  const [y, m, d] = state.activeDateStr.split('-').map(Number);
  state.viewMondayStr = getMondayISO(new Date(y, m - 1, d));
  ensureDayPopulated(state.activeDateStr);
  saveState();
  renderAll();
}

/* ================= TABLES & PERIOD HIGHLIGHTING ================= */
function renderTables() {
  const limitISO = toISO(new Date(Date.now() - 15 * 86400000));
  const isArchived = state.activeDateStr < limitISO;
  const dayData = state.days[state.activeDateStr] || { school: [], tuition_study: [] };

  // 1. School: [Period, Time, Class, TopicName, Mode (Lab/Class), Duration]
  const sTbody = document.getElementById('schoolBody');
  sTbody.innerHTML = '';
  if (isArchived) {
    sTbody.innerHTML = `<tr class="empty-row"><td colspan="6" class="py-6 px-4 text-center text-xs font-bold text-slate-500">No record available (Date is older than 15 days)</td></tr>`;
  } else if (!dayData.school.length) {
    sTbody.innerHTML = `<tr class="empty-row"><td colspan="6" class="py-6 px-4 text-center text-xs font-semibold text-slate-500">No school classes scheduled for ${getDayName(state.activeDateStr)}</td></tr>`;
  } else {
    dayData.school.forEach((item, idx) => {
      const status = getTimeStatus(item.time, state.activeDateStr);
      const isLive = status === 'active';
      const isUpcoming = status === 'upcoming';

      let rowClass = 'hover:bg-slate-50/80';
      if (item.completed) rowClass = 'bg-emerald-50/20';
      else if (isLive) rowClass = 'active-period-row';
      else if (isUpcoming) rowClass = 'bg-amber-50/40';

      let modeBadge = '';
      if (item.isFree) {
        modeBadge = `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">FREE</span>`;
      } else if (item.isLab) {
        modeBadge = `<span class="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-200">LAB</span>`;
      } else {
        modeBadge = `<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">CLASS</span>`;
      }

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-100 transition ${rowClass}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <div class="inline-flex items-center gap-1.5 justify-center">
            ${item.isFree ? '<span class="text-slate-300 font-bold">—</span>' : `
              <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTaskDone('${item.slotId}', 'school')" aria-label="Mark period done" class="cursor-pointer">
            `}
            <span class="text-[11px] font-bold text-slate-500">${idx + 1}</span>
                      </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tm">
          ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
          ${isUpcoming ? '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1">NEXT</span>' : ''}
          ${escapeHtml(item.time)}
        </td>
        <td class="py-2.5 px-3 text-left col-cls">
          <span class="${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.task)}</span>
        </td>
        <td class="py-2.5 px-3 text-left col-tpc">
          ${!item.isFree ? `
            <span onclick="editTopicPrompt('${item.slotId}', 'school')">
              📚 Topic: <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
            </span>` : '<span class="text-slate-300 font-bold">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-center col-mode">
          ${modeBadge}
        </td>
        <td class="py-2.5 px-3 text-right col-dur">
          ${Number(item.hrs).toFixed(2)} hrs
        </td>`;
      sTbody.appendChild(tr);
    });
  }

  const sTot = dayData.school.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const sDone = dayData.school.filter(i => i.completed && !i.isFree).length;
  const sCount = dayData.school.filter(i => !i.isFree).length;
  const sPct = sCount > 0 ? Math.round((sDone / sCount) * 100) : 0;
  
  document.getElementById('schoolSecTotal').textContent = `${sTot.toFixed(2)} hrs`;
  document.getElementById('schoolSecMeta').textContent = `${sDone} of ${sCount} completed`;
  const sBar = document.getElementById('schoolProgressBar');
  if (sBar) sBar.style.width = `${sPct}%`;

  // 2. Tuition: [Sno, Time, BatchName, Venue, Topic, Action(msg), noofstudents, Duration]
  const tTbody = document.getElementById('tuitionStudyBody');
  tTbody.innerHTML = '';
  if (isArchived) {
    tTbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="py-6 px-4 text-center text-xs font-bold text-slate-500">No record available (Date is older than 15 days)</td></tr>`;
  } else if (!dayData.tuition_study.length) {
    tTbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="py-6 px-4 text-center text-xs font-semibold text-slate-500">No tuition or study tasks scheduled for ${getDayName(state.activeDateStr)}</td></tr>`;
  } else {
    dayData.tuition_study.forEach((item, idx) => {
      const status = getTimeStatus(item.time, state.activeDateStr);
      const isLive = status === 'active';
      const isUpcoming = status === 'upcoming';
      const isTuition = item.cat === 'Tuition';
      const bId = item.batchId || normalizeBatchId(item.task);
      const studentCount = (state.rosters[bId] || []).length;
      const countLabel = `${studentCount} ${studentCount === 1 ? 'student' : 'students'}`;

      let rowClass = 'hover:bg-slate-50/80';
      if (item.completed) rowClass = 'bg-emerald-50/20';
      else if (isLive) rowClass = 'active-period-row';
      else if (isUpcoming) rowClass = 'bg-amber-50/40';

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-100 transition ${rowClass}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <div class="inline-flex items-center gap-1.5 justify-center">
            <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTaskDone('${item.slotId}', 'tuition_study')" aria-label="Mark task done" class="cursor-pointer">
            <span class="text-[11px] font-bold text-slate-500">${item.sno || (idx + 1)}</span>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tm">
          ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
          ${isUpcoming ? '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1">NEXT</span>' : ''}
          ${escapeHtml(item.time)}
        </td>
        <td class="py-2.5 px-3 text-left col-cls">
          <span class="${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.task)}</span>
        </td>
        <td class="py-2.5 px-3 text-center col-ven">
          <span class="bg-slate-100 text-slate-700 font-semibold text-[11px] px-2 py-0.5 rounded border border-slate-200">${escapeHtml(item.venue || 'Center')}</span>
        </td>
        <td class="py-2.5 px-3 text-left col-tpc">
          ${isTuition ? `
            <span onclick="editTopicPrompt('${item.slotId}', 'tuition_study')">
              📚 Topic: <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
            </span>` : '<span class="text-slate-300 font-bold">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-center col-act">
          ${isTuition ? `
            <button onclick="openAttendanceModal('${item.slotId}', this)" type="button" aria-label="Mark Attendance and send reminder for ${escapeHtml(item.task)}" class="bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95">
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Msg</span>
            </button>` : '<span class="text-slate-300 font-bold">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-center col-nos">
          ${isTuition ? `<span class="bg-blue-50 text-blue-700 font-bold text-[10.5px] px-2 py-0.5 rounded border border-blue-200">${countLabel}</span>` : '<span class="text-slate-400 text-[10.5px] italic">Self</span>'}
        </td>
        <td class="py-2.5 px-3 text-right col-dur">
          ${Number(item.hrs).toFixed(2)} hrs
        </td>`;
      tTbody.appendChild(tr);
    });
  }

  const tTot = dayData.tuition_study.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const tDone = dayData.tuition_study.filter(i => i.completed).length;
  const tCount = dayData.tuition_study.length;
  const tPct = tCount > 0 ? Math.round((tDone / tCount) * 100) : 0;
  
  document.getElementById('tuitionSecTotal').textContent = `${tTot.toFixed(2)} hrs`;
  document.getElementById('tuitionSecMeta').textContent = `${tDone} of ${tCount} completed`;
  const tBar = document.getElementById('tuitionProgressBar');
  if (tBar) tBar.style.width = `${tPct}%`;
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

/* ================= ATTENDANCE & WHATSAPP ================= */
function openAttendanceModal(slotId, triggerElement = null) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const item = dayData.tuition_study.find(i => i.slotId === slotId);
  if (!item) return;

  activeModalTrigger = triggerElement || document.activeElement;
  currentAttTaskId = slotId;
  currentAttBatchId = item.batchId || normalizeBatchId(item.task);
  currentAttBatchTitle = item.task;

  const prevDate = getPreviousClassDate(currentAttBatchId, state.activeDateStr);
  currentAttTargetDate = prevDate;

  document.getElementById('attBatchTitle').textContent = `Attendance: ${currentAttBatchTitle}`;
  const modal = document.getElementById('attendanceModal');
  modal.classList.remove('hidden');

  updateAttDateButtons();
  renderAttendanceList();
}

function closeAttendanceModal() {
  const modal = document.getElementById('attendanceModal');
  modal.classList.add('hidden');
  if (activeModalTrigger && typeof activeModalTrigger.focus === 'function') {
    activeModalTrigger.focus();
    activeModalTrigger = null;
  }
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
    btnT.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 min-h-[36px]';
  } else {
    btnT.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-400 bg-blue-100 text-blue-900 shadow-sm min-h-[36px]';
    btnP.className = 'px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 min-h-[36px]';
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
          <button data-action="status" data-val="P" type="button" aria-label="Mark ${escapeHtml(student)} Present" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}">P</button>
          <button data-action="status" data-val="A" type="button" aria-label="Mark ${escapeHtml(student)} Absent" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}">A</button>
          <button data-action="status" data-val="L" type="button" aria-label="Mark ${escapeHtml(student)} Late" class="px-2.5 py-1 text-xs font-black rounded-lg transition min-h-[34px] min-w-[34px] ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}">Late</button>
          <button data-action="delete" type="button" class="text-slate-400 hover:text-rose-500 p-1 rounded min-h-[34px] min-w-[34px] flex items-center justify-center" title="Remove student" aria-label="Remove ${escapeHtml(student)}">
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('attStatsCounter').textContent = `${pCount} Present / ${roster.length} Total`;
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

  let venue = item.venue || 'Sant Nagar';
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
  showToast('Reminder sent & attendance saved', 'success');
}

/* ================= SECTION FILTERS & MODALS ================= */
function setPlannerView(view) {
  currentPlannerView = view;
  const sSec = document.getElementById('schoolClassesSec');
  const tSec = document.getElementById('tuitionStudySec');
  if (sSec) sSec.style.display = (view === 'school' || view === 'all') ? 'block' : 'none';
  if (tSec) tSec.style.display = (view === 'tuition' || view === 'all') ? 'block' : 'none';
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }

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
  setTimeout(() => toast.remove(), 5000);
}

function showActionModal({ title, msg, hasInput = false, inputVal = '', onConfirm }) {
  const modal = document.getElementById('actionModal');
  const titleEl = document.getElementById('actionModalTitle');
  const msgEl = document.getElementById('actionModalMsg');
  const inputContainer = document.getElementById('actionModalInputContainer');
  const inputEl = document.getElementById('actionModalInput');
  const confirmBtn = document.getElementById('actionModalConfirmBtn');
  const cancelBtn = document.getElementById('actionModalCancelBtn');

  activeModalTrigger = document.activeElement;
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
  else confirmBtn.focus();

  const cleanup = () => {
    modal.classList.add('hidden');
    if (activeModalTrigger && typeof activeModalTrigger.focus === 'function') {
      activeModalTrigger.focus();
      activeModalTrigger = null;
    }
  };

  cancelBtn.onclick = cleanup;
  confirmBtn.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm(hasInput ? inputEl.value : true);
  };
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const actModal = document.getElementById('actionModal');
    const attModal = document.getElementById('attendanceModal');
    if (!actModal.classList.contains('hidden')) {
      actModal.classList.add('hidden');
      return;
    }
    if (!attModal.classList.contains('hidden')) {
      closeAttendanceModal();
    }
  }
});

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

function triggerPrint() {
  window.print();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ================= INITIALIZATION ================= */
window.addEventListener('load', () => {
  loadState();

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
