/* ==========================================================================
   CONFIG & STATE ENGINE
   ========================================================================== */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzm4iBslm1kCUUstcD3n8kMRCoulq_M40bayLw_OLCaRcGntkT4ZMot_ipK5zBgmreEAw/exec';
const APPS_SCRIPT_SECRET_TOKEN = 'singh_planner_secure_2026';

const TEMPLATE_VERSION = '2026.7_premium_edtech';
const STORAGE_KEY_PLANNER = 'singhPlanner_core_v2';
const STORAGE_KEY_ATTENDANCE = 'singhPlanner_attendance_v2';
const STORAGE_KEY_RESCUE = 'singhPlanner_rescue_backup_v2';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_TIMETABLES = {
  school: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
  tuition: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
  study: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }
};

let state = {
  templateVersion: TEMPLATE_VERSION,
  activeDateStr: toISO(new Date()),
  days: {},
  timetables: JSON.parse(JSON.stringify(EMPTY_TIMETABLES)),
  rosters: {},
  lastBackup: null,
  sentLog: {},
  rosterEdits: []
};

let attendanceStore = {};
let lastCheckedDate = toISO(new Date());

let currentAttBatchId = null;
let currentAttBatchTitle = '';
let currentAttTaskId = null;
let currentAttTargetDate = toISO(new Date());
let attWeekBaseDate = toISO(new Date());
let lastDeletedStudent = null;
let activeModalTrigger = null;
let syncInFlight = false;

/* ================= APPS SCRIPT PULL ENGINE ================= */
function logRosterEdit(op, batchId, name) {
  state.rosterEdits = state.rosterEdits || [];
  state.rosterEdits.push({ op, batchId, name });
}

function mergeRosterFromSheet(sheetRosters) {
  const result = {};
  Object.keys(sheetRosters).forEach(b => { result[b] = [...sheetRosters[b]]; });
  const kept = [];
  (state.rosterEdits || []).forEach(e => {
    const list = result[e.batchId] || (result[e.batchId] = []);
    const inSheet = list.includes(e.name);
    if (e.op === 'add' && !inSheet) {
      list.push(e.name);
      kept.push(e);
    } else if (e.op === 'remove' && inSheet) {
      result[e.batchId] = list.filter(n => n !== e.name);
      kept.push(e);
    }
  });
  state.rosterEdits = kept;
  return result;
}

async function fetchFromAppsScript(showFeedback = true) {
  if (syncInFlight) return;
  if (!APPS_SCRIPT_URL) {
    if (showFeedback) showToast('Missing APPS_SCRIPT_URL', 'error');
    return;
  }
  if (showFeedback) showToast('Pulling data from Google Sheets...', 'info');

  syncInFlight = true;
  try {
    const fetchUrl = `${APPS_SCRIPT_URL}?action=getAll&token=${encodeURIComponent(APPS_SCRIPT_SECRET_TOKEN)}&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
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
        state.rosters = mergeRosterFromSheet(data.rosters);
        syncedItems.push('Rosters');
      }
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
    syncInFlight = false;
  }
}

/* ================= DATE & TIME UTILITIES ================= */
function toISO(dateObj) {
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function formatDuration(hrs) {
  const mins = Math.round((Number(hrs) || 0) * 60);
  if (!mins) return '0 min';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m} min`;
}

function getSentTime(slotId) {
  return (state.sentLog && state.sentLog[state.activeDateStr + '|' + slotId]) || null;
}

function markSent(slotId) {
  state.sentLog = state.sentLog || {};
  state.sentLog[state.activeDateStr + '|' + slotId] =
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

/* ================= DATA ACCESS LAYER ================= */
const AppData = {
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
    logRosterEdit('add', batchId, clean);
    this.saveAndNotify(`Added "${clean}" to roster`);
    return { success: true };
  },
  removeStudent(batchId, studentName) {
    if (!state.rosters[batchId]) return;
    lastDeletedStudent = { batchId, name: studentName };
    state.rosters[batchId] = state.rosters[batchId].filter(s => s !== studentName);
    logRosterEdit('remove', batchId, studentName);
    this.saveAndNotify(`Removed "${studentName}"`);
    showToastWithUndo(`Removed ${studentName}`, () => {
      if (lastDeletedStudent) {
        state.rosters[lastDeletedStudent.batchId].push(lastDeletedStudent.name);
        state.rosterEdits = (state.rosterEdits || []).filter(e => !(e.op === 'remove' && e.batchId === lastDeletedStudent.batchId && e.name === lastDeletedStudent.name));
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

/* ================= LOCAL STORAGE ENGINE ================= */
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
  const now = new Date();
  const limitISO = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - keepDays));
  if (state.sentLog) {
    Object.keys(state.sentLog).forEach(k => {
      if (k.split('|')[0] < limitISO) delete state.sentLog[k];
    });
  }
  if (!state.days) return;
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

/* ================= PLANNER RENDERING & TABLE LOGIC ================= */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setSectionCounter(prefix, done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  setText(prefix + 'DoneCount', done);
  setText(prefix + 'TotalCount', total);
  setText(prefix + 'Pct', `${pct}%`);
}

function renderAll() {
  renderTables();
  updatePrintDate();
}

function updatePrintDate() {
  const [y, m, d] = state.activeDateStr.split('-');
  const dt = new Date(y, m - 1, d);
  const target = document.getElementById('headerDateStr');
  if (target) {
    target.textContent = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function jumpToday() {
  const t = toISO(new Date());
  state.activeDateStr = t;
  ensureDayPopulated(t);
  saveState();
  renderAll();
}

function shiftDay(dir) {
  state.activeDateStr = addDays(state.activeDateStr, dir);
  ensureDayPopulated(state.activeDateStr);
  saveState();
  renderAll();
}

function renderTables() {
  const limitISO = toISO(new Date(Date.now() - 15 * 86400000));
  const isArchived = state.activeDateStr < limitISO;
  const dayData = state.days[state.activeDateStr] || { school: [], tuition_study: [] };

  // 1. School Classes
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
        modeBadge = `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-lg border border-amber-200">☕ FREE</span>`;
      } else if (item.isLab) {
        modeBadge = `<span class="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 text-[11px] font-black px-2.5 py-1 rounded-lg border border-cyan-200">🧪 LAB</span>`;
      } else {
        modeBadge = `<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-lg border border-blue-200">👥 CLASS</span>`;
      }

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-200 transition ${rowClass}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <div class="hidden sm:inline-flex items-center gap-1.5 justify-center">
            ${item.isFree ? '<span class="text-slate-300 font-bold">—</span>' : ''}
            <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200">${idx + 1}</span>
          </div>
          <div class="sm:hidden flex items-center gap-2 w-full">
            <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">${idx + 1}</span>
            <div class="text-left">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">SESSION</span>
              <span class="block text-xs font-black text-slate-800">${idx + 1}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tm">
          <div class="hidden sm:flex items-center gap-1.5">
            ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
            ${isUpcoming ? '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1">NEXT</span>' : ''}
            <span class="font-extrabold text-slate-800 text-xs">${escapeHtml(item.time)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-2 w-full">
            <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">TIME</span>
              <span class="block text-[11px] font-black text-slate-800 truncate">${escapeHtml(item.time)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-cls" ${item.isFree ? '' : `onclick="toggleTaskDone('${item.slotId}', 'school')" title="Click to mark done or undo"`}>
          <div class="hidden sm:block">
            <span class="px-3 py-1 rounded-lg font-black text-xs ${item.isFree ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200/80'} ${item.completed ? 'line-through opacity-60' : ''}">
              ${escapeHtml(item.task)}
            </span>
          </div>
          <div class="sm:hidden flex items-center gap-2 w-full">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">CLASS</span>
              <span class="block text-xs font-black text-slate-900 truncate">${escapeHtml(item.task)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tpc">
          <div class="hidden sm:block">
            ${!item.isFree ? `
              <span onclick="editTopicPrompt('${item.slotId}', 'school')" class="inline-block px-3 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-blue-600 font-bold text-xs cursor-pointer shadow-sm transition">
                <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
              </span>` : '<span class="text-slate-300 font-bold">—</span>'}
          </div>
          <div class="sm:hidden flex items-center gap-2 w-full" onclick="editTopicPrompt('${item.slotId}', 'school')">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">TOPIC</span>
              <span class="block text-[11px] font-black text-blue-600 truncate">${escapeHtml(item.topic || 'List in Python')}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-mode">
          <div class="hidden sm:block">${modeBadge}</div>
          <div class="sm:hidden flex items-center gap-2 w-full">
            <div class="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M10 2v7.31L4.22 19.4A2 2 0 0 0 5.91 22h12.18a2 2 0 0 0 1.69-2.6L14 9.31V2z"></path></svg>
            </div>
            <div class="text-left">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">MODE</span>
              <span class="block text-[10px] font-black text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded border border-cyan-300">${item.mode || 'LAB'}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-dur">
          <div class="hidden sm:inline-block text-xs font-black text-slate-800">
            <span>${formatDuration(item.hrs)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-2 w-full">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 fill-none stroke-currentColor stroke-width-2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[9px] font-black text-slate-400 uppercase tracking-wider">DURATION</span>
              <span class="block text-xs font-black text-slate-800">${formatDuration(item.hrs)}</span>
            </div>
          </div>
        </td>`;
      sTbody.appendChild(tr);
    });
  }

  const sTot = dayData.school.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const sDone = dayData.school.filter(i => i.completed && !i.isFree).length;
  const sCount = dayData.school.filter(i => !i.isFree).length;
  const sPct = sCount > 0 ? Math.round((sDone / sCount) * 100) : 0;

  setSectionCounter('school', sDone, sCount);
  document.getElementById('schoolSecTotal').textContent = `${sTot.toFixed(2)} hrs`;
  document.getElementById('schoolSecMeta').textContent = `${sDone} of ${sCount} completed`;
  const sBar = document.getElementById('schoolProgressBar');
  if (sBar) sBar.style.width = `${sPct}%`;

  // 2. Tuition & Study
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
      const sentAt = isTuition ? getSentTime(item.slotId) : null;
      const attDate = isTuition ? getPreviousClassDate(bId, state.activeDateStr) : null;
      const attMarked = Object.keys((attDate && attendanceStore[attDate] && attendanceStore[attDate][bId]) || {}).length;
      const attLabel = attMarked ? `Att ${attMarked}/${studentCount}` : 'Att not marked';

      let rowClass = 'hover:bg-slate-50/80';
      if (item.completed) rowClass = 'bg-emerald-50/20';
      else if (isLive) rowClass = 'active-period-row';
      else if (isUpcoming) rowClass = 'bg-amber-50/40';

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-200 transition ${rowClass}`;
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center col-cb">
          <div class="hidden sm:inline-flex items-center gap-1.5 justify-center">
            <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200">${item.sno || (idx + 1)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line></svg>
            </div>
            <div class="text-left">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">SESSION</span>
              <span class="block text-xs font-black text-slate-800">${item.sno || (idx + 1)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tm">
          <div class="hidden sm:flex items-center gap-1.5">
            ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
            ${isUpcoming ? '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1">NEXT</span>' : ''}
            <span class="font-extrabold text-slate-800 text-xs">${escapeHtml(item.time)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">TIME</span>
              <span class="block text-[10px] font-black text-slate-800 truncate">${escapeHtml(item.time)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-cls" onclick="toggleTaskDone('${item.slotId}', 'tuition_study')" title="Click to mark done or undo">
          <div class="hidden sm:block">
            <span class="font-black text-slate-900 text-xs ${item.completed ? 'line-through text-slate-400' : ''}">${escapeHtml(item.task)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">CLASS</span>
              <span class="block text-[11px] font-black text-slate-900 truncate">${escapeHtml(item.task)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-ven">
          <div class="hidden sm:block">
            <span class="inline-block bg-slate-100 text-slate-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-slate-200">
              ${escapeHtml(item.venue || 'Center')}
            </span>
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">VENUE</span>
              <span class="block text-[10px] font-black text-slate-800 truncate">${escapeHtml(item.venue || 'Sant Nagar')}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-left col-tpc">
          <div class="hidden sm:block">
            ${isTuition ? `
              <span onclick="editTopicPrompt('${item.slotId}', 'tuition_study')" class="inline-block px-3 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-blue-600 font-bold text-xs cursor-pointer shadow-sm transition">
                <strong>${escapeHtml(item.topic || '+ Add topic')}</strong>
              </span>` : '<span class="text-slate-300 font-bold">—</span>'}
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full" onclick="editTopicPrompt('${item.slotId}', 'tuition_study')">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-currentColor stroke-width-2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">TOPIC</span>
              <span class="block text-[10px] font-black text-blue-600 truncate">${escapeHtml(item.topic || 'Database Concepts')}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-act">
          <div class="hidden sm:block">
            ${isTuition ? (sentAt ? `
              <button onclick="openAttendanceModal('${item.slotId}', this)" type="button" class="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition active:scale-95 px-3 py-1 rounded-lg text-xs font-black shadow-sm">
                ✓ Sent ${sentAt}
              </button>` : `
              <button onclick="openAttendanceModal('${item.slotId}', this)" type="button" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1 rounded-lg text-xs flex items-center justify-center gap-1.5 mx-auto transition active:scale-95 shadow-sm">
                <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span>Msg</span>
              </button>`) : '<span class="text-slate-300 font-bold">—</span>'}
          </div>
          <div class="sm:hidden w-full">
            <button onclick="openAttendanceModal('${item.slotId}', this)" type="button" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[10px] shadow-sm">
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span class="truncate">${sentAt ? 'Sent ' + sentAt : 'Send Reminder'}</span>
            </button>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-nos">
          <div class="hidden sm:block">
            ${isTuition ? `
              <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-black text-[11px] px-2.5 py-1 rounded-lg border border-blue-200">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                ${countLabel}
              </span>
              <div class="text-[10px] mt-0.5 ${attMarked ? 'text-slate-500 font-semibold' : 'text-accentRed font-black'}">${attLabel}</div>` : '<span class="text-slate-400 text-xs italic">Self</span>'}
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-rose-100 text-accentRed flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-currentColor stroke-width-2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">STUDENTS</span>
              <span class="block text-[10px] font-black text-blue-700 truncate">${countLabel}</span>
              <span class="block text-[9px] font-black ${attMarked ? 'text-slate-500' : 'text-accentRed'} truncate">${attLabel}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center col-dur">
          <div class="hidden sm:inline-block text-xs font-black text-slate-800">
            <span>${formatDuration(item.hrs)}</span>
          </div>
          <div class="sm:hidden flex items-center gap-1.5 w-full">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 fill-none stroke-currentColor stroke-width-2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="text-left min-w-0">
              <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">DURATION</span>
              <span class="block text-xs font-black text-slate-800">${formatDuration(item.hrs)}</span>
            </div>
          </div>
        </td>`;
      tTbody.appendChild(tr);
    });
  }

  const tTot = dayData.tuition_study.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const tDone = dayData.tuition_study.filter(i => i.completed).length;
  const tCount = dayData.tuition_study.length;
  const tPct = tCount > 0 ? Math.round((tDone / tCount) * 100) : 0;

  setSectionCounter('tuition', tDone, tCount);
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

/* ================= ATTENDANCE & 7-DAY CALENDAR ENGINE ================= */
function getWeekDays(refDateStr) {
  const [y, m, d] = refDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monDate = new Date(y, m - 1, d + diffToMon);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monDate.getFullYear(), monDate.getMonth(), monDate.getDate() + i);
    week.push(toISO(cur));
  }
  return week;
}

function shiftAttWeek(dir) {
  attWeekBaseDate = addDays(attWeekBaseDate, dir * 7);
  renderAttCalendar();
}

function selectAttDate(dateStr) {
  currentAttTargetDate = dateStr;
  renderAttCalendar();
  renderAttendanceList();
  fetchAttendanceFromSheet(currentAttTargetDate, currentAttBatchId);
}

function renderAttCalendar() {
  const container = document.getElementById('attDateCalendarStrip');
  if (!container) return;
  const weekDays = getWeekDays(attWeekBaseDate);
  const prevClassDate = getPreviousClassDate(currentAttBatchId, state.activeDateStr);

  container.innerHTML = weekDays.map(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = `${dt.getDate()} ${dt.toLocaleDateString('en-US', { month: 'short' })}`;
    const isSelected = dateStr === currentAttTargetDate;

    const activeClass = isSelected
      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
      : 'bg-[#0c1f38] text-slate-300 hover:text-white hover:bg-slate-700/80 border-slate-700/70';

    return `
      <button type="button" onclick="selectAttDate('${dateStr}')" 
        class="flex flex-col items-center justify-center px-1.5 py-0.5 rounded-md text-center border transition min-w-[38px] sm:min-w-[42px] min-h-[26px] ${activeClass}">
        <span class="text-[8px] font-bold leading-tight ${isSelected ? 'text-slate-950' : 'text-slate-400'}">${dayName}</span>
        <span class="text-[9.5px] font-black leading-tight whitespace-nowrap">${dateNum}</span>
      </button>
    `;
  }).join('');

  const hasPrevAtt = attendanceStore[prevClassDate]?.[currentAttBatchId] && Object.keys(attendanceStore[prevClassDate][currentAttBatchId]).length > 0;
  const banner = document.getElementById('attPrevWarningBanner');
  if (banner) {
    if (!hasPrevAtt && currentAttTargetDate === prevClassDate) banner.classList.remove('hidden');
    else banner.classList.add('hidden');
  }
}

function openAttendanceModal(slotId, triggerElement = null) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const item = dayData.tuition_study.find(i => i.slotId === slotId);
  if (!item) return;

  activeModalTrigger = triggerElement || document.activeElement;
  currentAttTaskId = slotId;
  currentAttBatchId = item.batchId || normalizeBatchId(item.task);
  currentAttBatchTitle = item.task;

  currentAttTargetDate = state.activeDateStr;
  attWeekBaseDate = state.activeDateStr;

  document.getElementById('attBatchTitle').textContent = currentAttBatchTitle;
  const modal = document.getElementById('attendanceModal');
  modal.classList.remove('hidden');

  renderAttCalendar();
  renderAttendanceList();
  fetchAttendanceFromSheet(currentAttTargetDate, currentAttBatchId);
}

function closeAttendanceModal() {
  const modal = document.getElementById('attendanceModal');
  modal.classList.add('hidden');
  if (activeModalTrigger && typeof activeModalTrigger.focus === 'function') {
    activeModalTrigger.focus();
    activeModalTrigger = null;
  }
}

function renderAttendanceList() {
  const container = document.getElementById('attStudentList');
  const roster = AppData.getRoster(currentAttBatchId);
  const dayAtt = (attendanceStore[currentAttTargetDate] && attendanceStore[currentAttTargetDate][currentAttBatchId]) || {};

  let pCount = 0;
  container.innerHTML = roster.map((student, idx) => {
    const status = dayAtt[student] || null;
    if (status === 'P' || status === 'L') pCount++;

    return `
      <div class="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
        <div class="flex items-center gap-1.5 min-w-0 pr-1">
          <span class="w-5 h-5 rounded bg-blue-50 text-blue-700 font-black text-[10px] flex items-center justify-center shrink-0 border border-blue-200/80">${idx + 1}</span>
          <span class="text-[11.5px] font-bold text-slate-800 truncate">${escapeHtml(student)}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0" data-student-row="${escapeHtml(student)}">
          <button data-action="status" data-val="P" type="button" aria-label="Mark ${escapeHtml(student)} Present" class="px-2 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] min-w-[24px] ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">P</button>
          <button data-action="status" data-val="A" type="button" aria-label="Mark ${escapeHtml(student)} Absent" class="px-2 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] min-w-[24px] ${status === 'A' ? 'bg-accentRed text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">A</button>
          <button data-action="status" data-val="L" type="button" aria-label="Mark ${escapeHtml(student)} Late" class="px-1.5 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] min-w-[28px] ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">Late</button>
        </div>
      </div>`;
  }).join('');

  const pct = roster.length > 0 ? Math.round((pCount / roster.length) * 100) : 0;
  document.getElementById('attStatsCounter').textContent = `${pCount} Present / ${roster.length} Total`;
  const bar = document.getElementById('attStatsBar');
  if (bar) bar.style.width = `${pct}%`;
  const pctBadge = document.getElementById('attPctBadge');
  if (pctBadge) pctBadge.textContent = `${pct}%`;
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

/* ================= ATTENDANCE SHEET SYNC ================= */
async function pushAttendanceToSheet() {
  if (!APPS_SCRIPT_URL || !currentAttBatchId || !currentAttTargetDate) return false;
  const dayAtt = (attendanceStore[currentAttTargetDate] && attendanceStore[currentAttTargetDate][currentAttBatchId]) || {};
  const records = Object.keys(dayAtt)
    .filter(n => ['P', 'A', 'L'].includes(dayAtt[n]))
    .map(n => ({ name: n, status: dayAtt[n] }));
  if (!records.length) return false;

  const dayData = state.days[state.activeDateStr];
  const item = dayData ? dayData.tuition_study.find(i => i.slotId === currentAttTaskId) : null;
  const topic = item ? (item.topic || '') : '';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveAttendance',
        token: APPS_SCRIPT_SECRET_TOKEN,
        date: currentAttTargetDate,
        section: 'tuition',
        batchId: currentAttBatchId,
        className: currentAttBatchTitle,
        topic: topic,
        records
      })
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Save failed');
    return true;
  } catch (err) {
    console.error('Attendance sync error:', err);
    showToast(`Sheet sync failed (${err.message}). Saved on this device only.`, 'error');
    return false;
  }
}

async function fetchAttendanceFromSheet(dateStr, batchId) {
  if (!APPS_SCRIPT_URL || !dateStr || !batchId) return;
  try {
    const url = `${APPS_SCRIPT_URL}?action=getAttendance&date=${encodeURIComponent(dateStr)}` +
      `&batch=${encodeURIComponent(batchId)}&token=${encodeURIComponent(APPS_SCRIPT_SECRET_TOKEN)}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    if (data.status !== 'success' || !data.attendance || !Object.keys(data.attendance).length) return;

    attendanceStore[dateStr] = attendanceStore[dateStr] || {};
    attendanceStore[dateStr][batchId] = Object.assign({}, attendanceStore[dateStr][batchId] || {}, data.attendance);
    saveState();

    if (dateStr === currentAttTargetDate && batchId === currentAttBatchId) {
      renderAttCalendar();
      renderAttendanceList();
    }
  } catch (err) {
    console.warn('Attendance load from sheet failed:', err);
  }
}

function saveAttendanceOnly() {
  saveState();
  pushAttendanceToSheet();
  closeAttendanceModal();
  showToast('Attendance recorded', 'success');
}

function confirmAttendanceAndLaunchWhatsApp() {
  saveState();
  pushAttendanceToSheet();
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

/* ================= WHATSAPP DISPATCH & REMINDERS ================= */
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
  markSent(item.slotId);
  saveState();
  renderTables();

  closeAttendanceModal();
  showToast('Reminder sent & attendance saved', 'success');
}

/* ================= MODALS, TOASTS & NAVIGATION ================= */
function setPlannerView(view) {
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
  const bg = type === 'error' ? 'bg-accentRed' : (type === 'success' ? 'bg-emerald-600' : 'bg-brandNavy');
  toast.className = `${bg} text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto transition transform duration-200 border border-white/10`;
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function showToastWithUndo(msg, onUndo) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'bg-brandNavy text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-3 pointer-events-auto border border-white/10';
  toast.innerHTML = `
    <span>${escapeHtml(msg)}</span>
    <button class="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg font-black text-[11px]">Undo</button>`;
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

/* ================= BACKUP, EXPORT & INITIALIZATION ================= */
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

const BACKGROUND_SYNC_MS = 5 * 60 * 1000;
const MIN_PULL_GAP_MS = 60 * 1000;
let lastPullAt = 0;

function backgroundPull(force = false) {
  if (!APPS_SCRIPT_URL) return;
  if (!force && Date.now() - lastPullAt < MIN_PULL_GAP_MS) return;
  lastPullAt = Date.now();
  fetchFromAppsScript(false);
}

window.addEventListener('load', () => {
  loadState();
  setPlannerView('school');

  backgroundPull(true);
  setInterval(() => backgroundPull(false), BACKGROUND_SYNC_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') backgroundPull(false);
  });
  window.addEventListener('online', () => backgroundPull(true));

  const updateClock = () => {
    const now = new Date();
    const timeEl = document.getElementById('headerTimeStr');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const curISO = toISO(now);
    if (curISO !== lastCheckedDate) {
      lastCheckedDate = curISO;
      state.activeDateStr = curISO;
      ensureDayPopulated(curISO);
      saveState();
      renderAll();
    }
  };

  updateClock();
  setInterval(updateClock, 30000);
});