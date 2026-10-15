/* ==========================================================================
   PLANNER & ANALYTICS CLIENT ENGINE (plan.js)
   Read-only Topics • Live Google Sheets Sync • No Keyloggers • No Mock Data
   ========================================================================== */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyG4UFan_caa9X-ol9OCXVm6e5F-0zH2d1ioAHSYGuLBjw5pzNKZ54CsyVviQ8mWDeW/exec';

const TEMPLATE_VERSION = '2026.10_live_readonly';
const STORAGE_KEY_PLANNER = 'singhPlanner_core_v2';
const STORAGE_KEY_ATTENDANCE = 'singhPlanner_attendance_v2';

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
  todos: [],
  collapsedTodoCategories: {},
  sentLog: {}
};

let attendanceStore = {};
let lastCheckedDate = toISO(new Date());

let currentAttBatchId = null;
let currentAttBatchTitle = '';
let currentAttTaskId = null;
let currentAttTargetDate = toISO(new Date());
let attWeekBaseDate = toISO(new Date());
let syncInFlight = false;

/* ================= REUSABLE UTILITIES & HELPERS ================= */
function toISO(dateObj) {
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoStr, num) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + num));
}

function getDayName(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const idx = new Date(y, m - 1, d).getDay();
  return DAYS[idx === 0 ? 6 : idx - 1];
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

function normalizeBatchId(name) {
  return 'b_' + (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSectionStats(prefix, done, total, totalHrs) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  setText(`${prefix}DoneCount`, done);
  setText(`${prefix}TotalCount`, total);
  setText(`${prefix}Pct`, `${pct}%`);
  setText(`${prefix}SecTotal`, `${totalHrs.toFixed(2)} hrs`);
  setText(`${prefix}SecMeta`, `${done} of ${total} completed`);
  const bar = document.getElementById(`${prefix}ProgressBar`);
  if (bar) bar.style.width = `${pct}%`;
}

/* ================= REUSABLE UI BUILDERS (IMAGE 1 SPEC) ================= */
function buildSessionCell(index) {
  return `
    <td class="py-2.5 px-3 text-center col-cb">
      <div class="hidden sm:inline-flex items-center gap-1.5 justify-center">
        <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200">${index}</span>
      </div>
      <div class="sm:hidden flex items-center gap-2 w-full">
        <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-base shrink-0">${index}</span>
        <div class="text-left min-w-0">
          <span class="block text-[8.5px] font-bold text-slate-400 uppercase tracking-tight leading-tight">SESSION</span>
          <span class="block text-xs font-black text-slate-900 leading-tight mt-0.5">${index}</span>
        </div>
      </div>
    </td>`;
}

function buildTimeCell(timeStr, status) {
  const isLive = status === 'active';
  const isUpcoming = status === 'upcoming';
  const range = parseTimeRange(timeStr);
  const parts = range.formatted.split('-');
  const sTime = parts[0] ? parts[0].trim() : timeStr;
  const eTime = parts[1] ? parts[1].trim() : '';

  return `
    <td class="py-2.5 px-3 text-left col-tm">
      <div class="hidden sm:flex items-center gap-1.5">
        ${isLive ? '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-pulse"></span>LIVE</span>' : ''}
        ${isUpcoming ? '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm mr-1">NEXT</span>' : ''}
        <span class="font-extrabold text-slate-800 text-xs">${escapeHtml(timeStr)}</span>
      </div>
      <div class="sm:hidden flex items-center gap-2 w-full">
        <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg style="width:16px;height:16px;" class="text-slate-900 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="text-left min-w-0 leading-tight">
          <span class="block text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">TIME</span>
          <span class="block text-[10px] font-black text-slate-900 whitespace-nowrap">${escapeHtml(sTime)}</span>
          ${eTime ? `<span class="block text-[9px] font-bold text-slate-500 whitespace-nowrap">to ${escapeHtml(eTime)}</span>` : ''}
        </div>
      </div>
    </td>`;
}

function buildTopicCell(topic, isFree = false) {
  const cleanTopic = (topic || '').trim();
  if (isFree || !cleanTopic || cleanTopic === '—') {
    return `<td class="py-2.5 px-3 text-left col-tpc"><span class="text-slate-300 font-bold">—</span></td>`;
  }
  return `
    <td class="py-2.5 px-3 text-left col-tpc">
      <div class="hidden sm:block">
        <span class="inline-block px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-lg text-blue-600 font-bold text-xs select-text cursor-default">
          ${escapeHtml(cleanTopic)}
        </span>
      </div>
      <div class="sm:hidden flex items-center gap-2 w-full">
        <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <svg style="width:16px;height:16px;" class="fill-blue-600" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm3 9H8v-2h8v2zm0-4H8v-2h8v2z"/></svg>
        </div>
        <div class="text-left min-w-0">
          <span class="block text-[8.5px] font-bold text-slate-400 uppercase tracking-tight leading-tight">TOPIC</span>
          <span class="block text-[10.5px] font-bold text-blue-600 leading-tight line-clamp-2 mt-0.5 select-text">${escapeHtml(cleanTopic)}</span>
        </div>
      </div>
    </td>`;
}

function buildVenueCell(venue) {
  return `
    <td class="py-2.5 px-3 text-center col-ven">
      <span class="bg-slate-100 text-slate-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-slate-200">
        ${escapeHtml(venue || 'Center')}
      </span>
    </td>`;
}

/* Image 1 Spec: 3-Dot Speech Bubble Green Button */
function buildReminderCell(slotId, isTuition, sentAt) {
  if (!isTuition) {
    return `<td class="py-2.5 px-3 text-center col-act"><span class="text-slate-300 font-bold">—</span></td>`;
  }
  return `
    <td class="py-2.5 px-3 text-center col-act">
      <button onclick="openAttendanceModal('${slotId}', this)" type="button" class="inline-flex items-center justify-center gap-1.5 ${sentAt ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-[#00875a] hover:bg-[#00734d] text-white border-transparent'} border font-black px-3.5 py-1.5 rounded-xl text-xs transition active:scale-95 shadow-sm">
        <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4C2.89543 4 2 4.89543 2 6V15C2 16.1046 2.89543 17 4 17H6V20.5C6 20.85 6.4 21.08 6.7 20.88L11.5 17H20C21.1046 17 22 16.1046 22 15V6C22 4.89543 21.1046 4 20 4H4ZM7.5 11.5C8.05228 11.5 8.5 11.0523 8.5 10.5C8.5 9.94772 8.05228 9.5 7.5 9.5C6.94772 9.5 6.5 9.94772 6.5 10.5C6.5 11.0523 6.94772 11.5 7.5 11.5ZM12 11.5C12.5523 11.5 13 11.0523 13 10.5C13 9.94772 12.5523 9.5 12 9.5C11.4477 9.5 11 9.94772 11 10.5C11 11.0523 11.4477 11.5 12 11.5ZM16.5 11.5C17.0523 11.5 17.5 11.0523 17.5 10.5C17.5 9.94772 17.0523 9.5 16.5 9.5C15.9477 9.5 15.5 9.94772 15.5 10.5C15.5 11.0523 15.9477 11.5 16.5 11.5Z"/>
        </svg>
        <span>${sentAt ? `✓ Sent ${sentAt}` : 'Msg'}</span>
      </button>
    </td>`;
}

/* Image 1 Spec: 3-Student Silhouette Silhouette + Rounded Pill */
function buildStudentsCell(count, isTuition) {
  if (!isTuition) {
    return `<td class="py-2.5 px-3 text-center col-nos"><span class="text-slate-400 text-xs italic">Self</span></td>`;
  }
  return `
    <td class="py-2.5 px-3 text-center col-nos">
      <div class="hidden sm:inline-flex flex-col items-center justify-center gap-1">
        <svg class="w-8 h-6 shrink-0" viewBox="0 0 36 26" fill="none" aria-hidden="true">
          <circle cx="10" cy="8.5" r="4" fill="#60a5fa" />
          <path d="M3 20.5C3 17 6 15 10 15C11.8 15 13.3 15.7 14.4 16.8C13.5 17.9 13 19.3 13 20.5H3Z" fill="#60a5fa" />
          <circle cx="26" cy="8.5" r="4" fill="#60a5fa" />
          <path d="M33 20.5C33 17 30 15 26 15C24.2 15 22.7 15.7 21.6 16.8C22.5 17.9 23 19.3 23 20.5H33Z" fill="#60a5fa" />
          <circle cx="18" cy="7.5" r="5" fill="#1d4ed8" />
          <path d="M9.5 21C9.5 16.8 13.3 14 18 14C22.7 14 26.5 16.8 26.5 21H9.5Z" fill="#1d4ed8" />
        </svg>
        <span class="bg-blue-50 text-blue-700 font-extrabold text-[11px] px-3 py-0.5 rounded-full border border-blue-200/90 shadow-xs whitespace-nowrap">
          ${count} students
        </span>
      </div>
      <div class="sm:hidden flex items-center gap-2 w-full">
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 fill-blue-700" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </div>
        <div class="text-left min-w-0">
          <span class="block text-[8.5px] font-bold text-slate-400 uppercase tracking-tight leading-tight">STUDENTS</span>
          <span class="block text-xs font-black text-blue-700 leading-tight mt-0.5">${count} students</span>
        </div>
      </div>
    </td>`;
}

/* Image 1 Spec: Minimal Circular Clock Icon + Bold Duration */
function buildDurationCell(hrs) {
  return `
    <td class="py-2.5 px-3 text-center col-dur">
      <div class="hidden sm:inline-flex flex-col items-center justify-center gap-1">
        <svg class="w-6 h-6 text-slate-700 fill-none stroke-current stroke-[2.75]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5"></circle>
          <polyline points="12 7 12 12 15.5 14"></polyline>
        </svg>
        <span class="text-xs font-black text-slate-900 whitespace-nowrap">${formatDuration(hrs)}</span>
      </div>
      <div class="sm:hidden flex items-center gap-2 w-full">
        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <svg style="width:16px;height:16px;" class="text-emerald-700 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="2" x2="12" y2="5"></line><line x1="10" y1="2" x2="14" y2="2"></line><line x1="17.5" y1="7.5" x2="19.5" y2="5.5"></line></svg>
        </div>
        <div class="text-left min-w-0">
          <span class="block text-[8.5px] font-bold text-slate-400 uppercase tracking-tight leading-tight">DURATION</span>
          <span class="block text-xs font-black text-slate-900 leading-tight mt-0.5">${formatDuration(hrs)}</span>
        </div>
      </div>
    </td>`;
}

function renderEmptyState(tbody, cols, message) {
  tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}" class="py-6 px-4 text-center text-xs font-semibold text-slate-500">${message}</td></tr>`;
}

/* ================= LIVE APPS SCRIPT SYNC ================= */
async function fetchFromAppsScript(showFeedback = true) {
  if (syncInFlight || !APPS_SCRIPT_URL) return;
  if (showFeedback) showToast('Pulling live data from Google Sheets...', 'info');

  syncInFlight = true;
  try {
    const fetchUrl = `${APPS_SCRIPT_URL}?action=getAll&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === 'success') {
      let syncedItems = [];
      if (data.timetables) {
        state.timetables = {
          school: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.school || {}),
          tuition: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.tuition || {}),
          study: Object.assign({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }, data.timetables.study || {}),
        };
        syncedItems.push('Timetables');
      }
      if (data.rosters) {
        state.rosters = data.rosters;
        syncedItems.push('Rosters');
      }
      if (data.todos && Array.isArray(data.todos)) {
        state.todos = data.todos;
        syncedItems.push('To-Do List');
      }

      saveState();
      ensureDayPopulated(state.activeDateStr);
      renderAll();
      renderTodoList();

      if (!sessionStorage.getItem('planner_todo_modal_opened') && state.todos.length > 0) {
        sessionStorage.setItem('planner_todo_modal_opened', 'true');
        setTimeout(() => openTodoModal(), 300);
      }

      if (showFeedback) {
        showToast(`Pulled ${syncedItems.join(' & ')} successfully!`, 'success');
      }
    } else {
      throw new Error(data.message || 'Error from Google Apps Script');
    }
  } catch (err) {
    console.error('Fetch Error:', err);
    if (showFeedback) showToast(`Pull failed: ${err.message}`, 'error');
  } finally {
    syncInFlight = false;
  }
}

/* ================= TO-DO LIST ENGINE ================= */
const TODO_CATEGORIES = [
  { key: 'Today', icon: '☀️', bg: 'bg-[#fffbeb]', border: 'border-[#fef08a]' },
  { key: 'Tomorrow', icon: '📅', bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]' },
  { key: 'Important', icon: '★', bg: 'bg-[#fef2f2]', border: 'border-[#fecdd3]' }
];

function toggleTodoCategory(catKey) {
  state.collapsedTodoCategories = state.collapsedTodoCategories || {};
  state.collapsedTodoCategories[catKey] = !state.collapsedTodoCategories[catKey];
  saveState();
  renderTodoList();
}

async function toggleTodoItem(todoId) {
  const item = state.todos.find(t => t.id === todoId);
  if (!item) return;

  item.completed = !item.completed;
  saveState();
  renderTodoList();

  if (item.rowIndex && APPS_SCRIPT_URL) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateTodo',
          rowIndex: item.rowIndex,
          completed: item.completed
        })
      });
    } catch (e) {
      console.warn('Todo status sync failed:', e);
    }
  }
}

function openTodoModal() {
  ensureTodoModalDOM();
  renderTodoList();
  const modal = document.getElementById('todoModal');
  if (modal) modal.classList.remove('hidden');
}

function closeTodoModal() {
  const modal = document.getElementById('todoModal');
  if (modal) modal.classList.add('hidden');
}

function renderTodoList() {
  const container = document.getElementById('todoContainer');
  if (!container) return;

  if (!state.todos || state.todos.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center">
        <div class="inline-block p-3 rounded-full bg-slate-100 text-slate-400 mb-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-xs font-bold text-slate-500">No tasks in sheet yet</p>
      </div>`;
    return;
  }

  container.innerHTML = TODO_CATEGORIES.map(cat => {
    const items = state.todos.filter(t => t.category.toLowerCase() === cat.key.toLowerCase());
    const isCollapsed = !!(state.collapsedTodoCategories && state.collapsedTodoCategories[cat.key]);

    const itemsHtml = items.map(item => `
      <div onclick="toggleTodoItem('${item.id}')" class="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50/80 cursor-pointer transition select-none group border-b border-slate-100 last:border-none">
        <div class="todo-check-box ${item.completed ? 'checked' : ''}">
          ${item.completed ? '<svg class="w-3.5 h-3.5 fill-none stroke-current stroke-[3]" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </div>
        <span class="todo-task-title text-xs sm:text-[13px] font-semibold leading-snug select-none ${item.completed ? 'done' : 'text-slate-800'}">
          ${escapeHtml(item.text)}
        </span>
      </div>
    `).join('');

    return `
      <div class="rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden bg-white mb-3">
        <div onclick="toggleTodoCategory('${cat.key}')" class="${cat.bg} ${cat.border} border-b px-4 py-2.5 flex items-center justify-between cursor-pointer select-none">
          <div class="flex items-center gap-2">
            <span class="text-sm shrink-0 leading-none">${cat.icon}</span>
            <h4 class="text-xs sm:text-[13px] font-black text-slate-900">${cat.key} <span class="font-bold text-slate-500">(${items.length})</span></h4>
          </div>
          <button type="button" aria-label="Toggle ${cat.key}" class="w-6 h-6 flex items-center justify-center text-slate-600 transition">
            <svg class="todo-card-chevron w-4 h-4 stroke-current stroke-2 fill-none ${isCollapsed ? 'collapsed' : ''}" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
        </div>
        <div class="${isCollapsed ? 'hidden' : 'block'} divide-y divide-slate-100">
          ${itemsHtml || '<div class="p-3 text-center text-xs text-slate-400 italic">No tasks in this section</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function ensureTodoModalDOM() {
  if (document.getElementById('todoModal')) return;

  const modalDiv = document.createElement('div');
  modalDiv.id = 'todoModal';
  modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 hidden';
  modalDiv.setAttribute('role', 'dialog');
  modalDiv.setAttribute('aria-modal', 'true');
  modalDiv.onclick = (e) => { if (e.target === modalDiv) closeTodoModal(); };
  modalDiv.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
      <div class="px-4 py-3 bg-[#07152b] text-white flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
            <svg class="w-4 h-4 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </div>
          <div>
            <h3 class="text-sm font-black text-white leading-tight">TO-DO LIST</h3>
            <p class="text-[10px] text-slate-300 font-medium">Daily Tasks &amp; Priorities</p>
          </div>
        </div>
        <button onclick="closeTodoModal()" type="button" aria-label="Close" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95">
          <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="p-3.5 overflow-y-auto flex-1 bg-[#f8fafc]" id="todoContainer"></div>
    </div>
  `;
  document.body.appendChild(modalDiv);
}

function ensureHeaderTodoButtons() {
  ['#schoolClassesSec header', '#tuitionStudySec header'].forEach(selector => {
    const hdr = document.querySelector(selector);
    if (!hdr || hdr.querySelector('.btn-todo-list')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.onclick = openTodoModal;
    btn.className = 'btn-todo-list';
    btn.setAttribute('aria-label', 'Open To-Do List');
    btn.innerHTML = `
      <svg class="w-4 h-4 text-[#07152b] fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
        <rect x="3" y="4" width="4" height="4" rx="1"></rect>
        <line x1="10" y1="6" x2="20" y2="6"></line>
        <rect x="3" y="10" width="4" height="4" rx="1"></rect>
        <line x1="10" y1="12" x2="20" y2="12"></line>
        <rect x="3" y="16" width="4" height="4" rx="1"></rect>
        <line x1="10" y1="18" x2="20" y2="18"></line>
      </svg>
      <span>To-Do List</span>
      <svg class="w-3.5 h-3.5 text-[#07152b] fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;

    const statsBadge = hdr.querySelector('.bg-\\[\\#07152b\\]');
    if (statsBadge) {
      hdr.insertBefore(btn, statsBadge);
    } else {
      hdr.appendChild(btn);
    }
  });
}

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
    } catch (e) {}
  }

  if (rawAtt) {
    try {
      const parsedAtt = JSON.parse(rawAtt);
      if (parsedAtt && typeof parsedAtt === 'object') attendanceStore = parsedAtt;
    } catch (e) {}
  }

  pruneOldTasks(15);
  ensureDayPopulated(state.activeDateStr);
  renderAll();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY_PLANNER, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceStore));
  } catch (err) {
    showToast('Storage quota exceeded', 'error');
  }
}

function pruneOldTasks(keepDays = 15) {
  const limitISO = toISO(new Date(Date.now() - keepDays * 86400000));
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
  if (!state.days[dateStr]) state.days[dateStr] = { school: [], tuition_study: [] };

  const existing = state.days[dateStr];
  const schMap = new Map((existing.school || []).map(t => [t.slotId, t]));
  const tuiMap = new Map((existing.tuition_study || []).map(t => [t.slotId, t]));

  // School Slots
  const schSlots = (state.timetables.school && state.timetables.school[dName]) || [];
  state.days[dateStr].school = schSlots.map((slot, idx) => {
    const ex = schMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    const isFree = /\bfree\b/i.test(slot.task) || (slot.mode && slot.mode.toLowerCase() === 'free');
    const isLab = /\blab\b/i.test(slot.task) || (slot.mode && slot.mode.toLowerCase() === 'lab');
    return {
      slotId: slot.id,
      periodNum: slot.period || (idx + 1),
      time: slot.time,
      hrs: isFree ? 0 : range.hrs,
      cat: 'School',
      task: slot.task || (isFree ? 'FREE' : 'School Class'),
      mode: isFree ? 'Free' : (isLab ? 'Lab' : 'Class'),
      topic: slot.topic || '',
      completed: ex ? !!ex.completed : false,
      isFree,
      isLab
    };
  });

  // Tuition Slots
  const tuiSlots = (state.timetables.tuition && state.timetables.tuition[dName]) || [];
  const populatedTuition = tuiSlots.map((slot, idx) => {
    const ex = tuiMap.get(slot.id);
    const range = parseTimeRange(slot.time);
    const bId = slot.batchId || normalizeBatchId(slot.task);
    return {
      slotId: slot.id,
      sno: slot.sno || (idx + 1),
      batchId: bId,
      time: slot.time,
      hrs: range.hrs,
      cat: 'Tuition',
      task: slot.task,
      venue: slot.venue || 'Sant Nagar / Online',
      topic: slot.topic || '',
      completed: ex ? !!ex.completed : false
    };
  });

  // Study Slots
  const stdSlots = (state.timetables.study && state.timetables.study[dName]) || [];
  const populatedStudy = stdSlots.map((slot, idx) => {
    const ex = tuiMap.get(slot.id);
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

  state.days[dateStr].tuition_study = [...populatedTuition, ...populatedStudy];
}

/* ================= TABLE RENDERING LOGIC ================= */
function renderAll() {
  renderSchoolTable();
  renderTuitionTable();
  updatePrintDate();
}

function updatePrintDate() {
  const [y, m, d] = state.activeDateStr.split('-');
  const dt = new Date(y, m - 1, d);
  setText('headerDateStr', dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
}

function renderSchoolTable() {
  const sTbody = document.getElementById('schoolBody');
  sTbody.innerHTML = '';
  const dayData = state.days[state.activeDateStr] || { school: [], tuition_study: [] };

  if (!dayData.school.length) {
    renderEmptyState(sTbody, 6, `No school classes scheduled for ${getDayName(state.activeDateStr)}`);
    updateSectionStats('school', 0, 0, 0);
    return;
  }

  dayData.school.forEach((item, idx) => {
    const status = getTimeStatus(item.time, state.activeDateStr);
    let rowClass = 'hover:bg-slate-50/80';
    if (item.completed) rowClass = 'bg-emerald-50/20';
    else if (status === 'active') rowClass = 'active-period-row';
    else if (status === 'upcoming') rowClass = 'bg-amber-50/40';

    const tr = document.createElement('tr');
    tr.className = `border-b border-slate-200 transition ${rowClass}`;
    tr.innerHTML = `
      ${buildSessionCell(idx + 1)}
      ${buildTimeCell(item.time, status)}
      <td class="py-2.5 px-3 text-left col-cls" ${item.isFree ? '' : `onclick="toggleTaskDone('${item.slotId}', 'school')"`}>
        <span class="px-3 py-1 rounded-lg font-black text-xs ${item.isFree ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200/80'} ${item.completed ? 'line-through opacity-60' : ''}">
          ${escapeHtml(item.task)}
        </span>
      </td>
      ${buildTopicCell(item.topic, item.isFree)}
      <td class="py-2.5 px-3 text-center col-mode">
        <span class="inline-block text-[10.5px] font-black px-2 py-0.5 rounded-lg border ${item.isFree ? 'bg-amber-50 text-amber-800 border-amber-200' : (item.isLab ? 'bg-cyan-50 text-cyan-800 border-cyan-200' : 'bg-blue-50 text-blue-800 border-blue-200')}">
          ${item.mode.toUpperCase()}
        </span>
      </td>
      ${buildDurationCell(item.hrs)}
    `;
    sTbody.appendChild(tr);
  });

  const sTot = dayData.school.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const sDone = dayData.school.filter(i => i.completed && !i.isFree).length;
  const sCount = dayData.school.filter(i => !i.isFree).length;
  updateSectionStats('school', sDone, sCount, sTot);
}

function renderTuitionTable() {
  const tTbody = document.getElementById('tuitionStudyBody');
  tTbody.innerHTML = '';
  const dayData = state.days[state.activeDateStr] || { school: [], tuition_study: [] };

  if (!dayData.tuition_study.length) {
    renderEmptyState(tTbody, 8, `No tuition or study tasks scheduled for ${getDayName(state.activeDateStr)}`);
    updateSectionStats('tuition', 0, 0, 0);
    return;
  }

  dayData.tuition_study.forEach((item, idx) => {
    const status = getTimeStatus(item.time, state.activeDateStr);
    const isTuition = item.cat === 'Tuition';
    const bId = item.batchId || normalizeBatchId(item.task);
    const count = (state.rosters[bId] || []).length;
    const sentAt = isTuition ? (state.sentLog && state.sentLog[`${state.activeDateStr}|${item.slotId}`]) : null;

    let rowClass = 'hover:bg-slate-50/80';
    if (item.completed) rowClass = 'bg-emerald-50/20';
    else if (status === 'active') rowClass = 'active-period-row';
    else if (status === 'upcoming') rowClass = 'bg-amber-50/40';

    const tr = document.createElement('tr');
    tr.className = `border-b border-slate-200 transition ${rowClass}`;
    tr.innerHTML = `
      ${buildSessionCell(item.sno || (idx + 1))}
      ${buildTimeCell(item.time, status)}
      <td class="py-2.5 px-3 text-left col-cls" onclick="toggleTaskDone('${item.slotId}', 'tuition_study')">
        <span class="font-black text-slate-900 text-xs ${item.completed ? 'line-through text-slate-400' : ''}">
          ${escapeHtml(item.task)}
        </span>
      </td>
      ${buildVenueCell(item.venue)}
      ${buildTopicCell(item.topic, !isTuition)}
      ${buildReminderCell(item.slotId, isTuition, sentAt)}
      ${buildStudentsCell(count, isTuition)}
      ${buildDurationCell(item.hrs)}
    `;
    tTbody.appendChild(tr);
  });

  const tTot = dayData.tuition_study.reduce((acc, i) => acc + (Number.isFinite(i.hrs) ? i.hrs : 0), 0);
  const tDone = dayData.tuition_study.filter(i => i.completed).length;
  updateSectionStats('tuition', tDone, dayData.tuition_study.length, tTot);
}

function toggleTaskDone(slotId, sec) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData || !dayData[sec]) return;
  const item = dayData[sec].find(i => i.slotId === slotId);
  if (item) {
    item.completed = !item.completed;
    saveState();
    renderAll();
  }
}

function jumpToday() {
  state.activeDateStr = toISO(new Date());
  ensureDayPopulated(state.activeDateStr);
  saveState();
  renderAll();
}

function shiftDay(dir) {
  state.activeDateStr = addDays(state.activeDateStr, dir);
  ensureDayPopulated(state.activeDateStr);
  saveState();
  renderAll();
}

/* ================= ATTENDANCE ENGINE ================= */
function getWeekDays(refDateStr) {
  const [y, m, d] = refDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diffToMon = dt.getDay() === 0 ? -6 : 1 - dt.getDay();
  const monDate = new Date(y, m - 1, d + diffToMon);
  return Array.from({ length: 7 }, (_, i) => toISO(new Date(monDate.getFullYear(), monDate.getMonth(), monDate.getDate() + i)));
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

  container.innerHTML = getWeekDays(attWeekBaseDate).map(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const isSelected = dateStr === currentAttTargetDate;
    const activeClass = isSelected
      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
      : 'bg-[#0c1f38] text-slate-300 hover:text-white hover:bg-slate-700/80 border-slate-700/70';

    return `
      <button type="button" onclick="selectAttDate('${dateStr}')" class="flex flex-col items-center justify-center px-1.5 py-0.5 rounded-md text-center border transition min-w-[38px] sm:min-w-[42px] min-h-[26px] ${activeClass}">
        <span class="text-[8px] font-bold leading-tight ${isSelected ? 'text-slate-950' : 'text-slate-400'}">${dt.toLocaleDateString('en-US', { weekday: 'short' })}</span>
        <span class="text-[9.5px] font-black leading-tight whitespace-nowrap">${dt.getDate()} ${dt.toLocaleDateString('en-US', { month: 'short' })}</span>
      </button>`;
  }).join('');
}

function openAttendanceModal(slotId, triggerElement = null) {
  const dayData = state.days[state.activeDateStr];
  if (!dayData) return;
  const item = dayData.tuition_study.find(i => i.slotId === slotId);
  if (!item) return;

  currentAttTaskId = slotId;
  currentAttBatchId = item.batchId || normalizeBatchId(item.task);
  currentAttBatchTitle = item.task;
  currentAttTargetDate = state.activeDateStr;
  attWeekBaseDate = state.activeDateStr;

  setText('attBatchTitle', currentAttBatchTitle);
  document.getElementById('attendanceModal').classList.remove('hidden');

  renderAttCalendar();
  renderAttendanceList();
  fetchAttendanceFromSheet(currentAttTargetDate, currentAttBatchId);
}

function closeAttendanceModal() {
  document.getElementById('attendanceModal').classList.add('hidden');
}

function renderAttendanceList() {
  const container = document.getElementById('attStudentList');
  const roster = state.rosters[currentAttBatchId] || [];
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
          <button onclick="setStudentStatus('${escapeHtml(student)}', 'P')" type="button" class="px-2 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">P</button>
          <button onclick="setStudentStatus('${escapeHtml(student)}', 'A')" type="button" class="px-2 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] ${status === 'A' ? 'bg-accentRed text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">A</button>
          <button onclick="setStudentStatus('${escapeHtml(student)}', 'L')" type="button" class="px-1.5 py-0 text-[10.5px] font-black rounded-md transition min-h-[24px] ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}">Late</button>
        </div>
      </div>`;
  }).join('');

  const pct = roster.length > 0 ? Math.round((pCount / roster.length) * 100) : 0;
  setText('attStatsCounter', `${pCount} Present / ${roster.length} Total`);
  const bar = document.getElementById('attStatsBar');
  if (bar) bar.style.width = `${pct}%`;
  setText('attPctBadge', `${pct}%`);
}

function setStudentStatus(student, status) {
  if (!attendanceStore[currentAttTargetDate]) attendanceStore[currentAttTargetDate] = {};
  if (!attendanceStore[currentAttTargetDate][currentAttBatchId]) attendanceStore[currentAttTargetDate][currentAttBatchId] = {};
  attendanceStore[currentAttTargetDate][currentAttBatchId][student] = status;
  saveState();
  renderAttendanceList();
}

function markAllAttendance(status) {
  const roster = state.rosters[currentAttBatchId] || [];
  if (!attendanceStore[currentAttTargetDate]) attendanceStore[currentAttTargetDate] = {};
  if (!attendanceStore[currentAttTargetDate][currentAttBatchId]) attendanceStore[currentAttTargetDate][currentAttBatchId] = {};
  roster.forEach(st => attendanceStore[currentAttTargetDate][currentAttBatchId][st] = status);
  saveState();
  renderAttendanceList();
}

async function pushAttendanceToSheet() {
  if (!APPS_SCRIPT_URL || !currentAttBatchId || !currentAttTargetDate) return;
  const dayAtt = (attendanceStore[currentAttTargetDate] && attendanceStore[currentAttTargetDate][currentAttBatchId]) || {};
  const records = Object.keys(dayAtt).filter(n => ['P', 'A', 'L'].includes(dayAtt[n])).map(n => ({ name: n, status: dayAtt[n] }));
  if (!records.length) return;

  const dayData = state.days[state.activeDateStr];
  const item = dayData ? dayData.tuition_study.find(i => i.slotId === currentAttTaskId) : null;
  const topic = item ? (item.topic || '') : '';

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveAttendance',
        date: currentAttTargetDate,
        section: 'tuition',
        batchId: currentAttBatchId,
        className: currentAttBatchTitle,
        topic: topic,
        records
      })
    });
  } catch (err) {
    console.warn('Attendance sync failed:', err);
  }
}

async function fetchAttendanceFromSheet(dateStr, batchId) {
  if (!APPS_SCRIPT_URL || !dateStr || !batchId) return;
  try {
    const url = `${APPS_SCRIPT_URL}?action=getAttendance&date=${encodeURIComponent(dateStr)}&batch=${encodeURIComponent(batchId)}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    if (data.status === 'success' && data.attendance) {
      attendanceStore[dateStr] = attendanceStore[dateStr] || {};
      attendanceStore[dateStr][batchId] = Object.assign({}, attendanceStore[dateStr][batchId] || {}, data.attendance);
      saveState();
      if (dateStr === currentAttTargetDate && batchId === currentAttBatchId) renderAttendanceList();
    }
  } catch (err) {}
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
  dispatchWhatsAppMessage(item);
}

function dispatchWhatsAppMessage(item) {
  const range = parseTimeRange(item.time);
  const parts = range.formatted.split('-');
  const startTime = parts[0]?.trim() || item.time;
  const endTime = parts[1]?.trim() || '';

  const message = `
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
⏰*Gentle Reminder*
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
🏛️ *${getDayName(state.activeDateStr)}’s* ${item.task}
📍 *Venue:* ${item.venue || 'Sant Nagar / Online'}
⏰ *Time:* *${startTime}* to *${endTime}*
📚 *Topic:* ${item.topic || 'Class Session'}
*=•=•=•=•=•=•=•=•==•=•=•=•=•=•=•=•=*
🌐 *Visit:* www.SinghClasses.in`;

  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message.trim())}`, '_blank');
  state.sentLog = state.sentLog || {};
  state.sentLog[`${state.activeDateStr}|${item.slotId}`] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  saveState();
  renderAll();
  closeAttendanceModal();
  showToast('Reminder sent & attendance saved', 'success');
}

/* ================= MODALS & NAVIGATION ================= */
function setPlannerView(view) {
  const sSec = document.getElementById('schoolClassesSec');
  const tSec = document.getElementById('tuitionStudySec');
  if (sSec) sSec.style.display = (view === 'school' || view === 'all') ? 'block' : 'none';
  if (tSec) tSec.style.display = (view === 'tuition' || view === 'all') ? 'block' : 'none';
}

function handleNavClick(view, btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  setPlannerView(view);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-accentRed' : (type === 'success' ? 'bg-emerald-600' : 'bg-brandNavy');
  toast.className = `${bg} text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto transition transform duration-200 border border-white/10`;
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ================= LIFECYCLE & INITIAL LOAD ================= */
window.addEventListener('load', () => {
  loadState();
  setPlannerView('school');
  ensureTodoModalDOM();
  ensureHeaderTodoButtons();

  fetchFromAppsScript(false);

  setInterval(() => {
    const now = new Date();
    setText('headerTimeStr', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, 30000);
});
