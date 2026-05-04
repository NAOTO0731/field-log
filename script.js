// ==================== MINI CHART (SVG, no external deps) ====================
class Chart {
  constructor(el, cfg) {
    this._el = el;
    this._cfg = cfg;
    this._svg = null;
    this._render();
  }
  destroy() {
    if (this._svg && this._svg.parentNode) this._svg.parentNode.removeChild(this._svg);
    if (this._el) this._el.style.display = '';
  }
  _render() {
    const { type, data } = this._cfg;
    const parent = this._el.parentNode;
    this._el.style.display = 'none';

    const labels = data.labels || [];
    const datasets = data.datasets || [];
    const hasLegend = datasets.length > 1;

    const VW = 420, VH = 200;
    const ML = 36, MR = 8, MT = hasLegend ? 28 : 12, MB = 50;
    const cW = VW - ML - MR, cH = VH - MT - MB;

    let maxVal = 0;
    datasets.forEach(ds => ds.data.forEach(v => { if ((v || 0) > maxVal) maxVal = v || 0; }));
    maxVal = maxVal > 0 ? maxVal * 1.12 : 1;

    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, txt) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (txt !== undefined) el.textContent = txt;
      return el;
    };

    const svg = mk('svg', { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: 'none' });
    svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
    this._svg = svg;

    const g = mk('g', { transform: `translate(${ML},${MT})` });
    svg.appendChild(g);

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const y = cH * (1 - i / yTicks);
      const v = maxVal * i / yTicks;
      g.appendChild(mk('line', { x1: 0, y1: y, x2: cW, y2: y, stroke: '#e2e8f0', 'stroke-width': 0.8 }));
      const vStr = v >= 10 ? Math.round(v) : v.toFixed(1);
      g.appendChild(mk('text', { x: -4, y: y + 3.5, 'font-size': 9, fill: '#94a3b8', 'text-anchor': 'end' }, vStr));
    }

    if (type === 'bar') {
      const n = datasets.length;
      const groupW = cW / Math.max(labels.length, 1);
      const totalBarW = groupW * 0.78;
      const barW = totalBarW / n;

      labels.forEach((lbl, li) => {
        const gx = li * groupW + groupW * 0.11;
        datasets.forEach((ds, di) => {
          const v = ds.data[li] || 0;
          const bH = Math.max(0, (v / maxVal) * cH);
          g.appendChild(mk('rect', {
            x: gx + di * barW, y: cH - bH,
            width: Math.max(1, barW - 1), height: bH,
            fill: ds.backgroundColor || '#60a5fa', rx: 2
          }));
        });

        const skip = Math.ceil(labels.length / 14);
        if (li % skip === 0) {
          const tx = li * groupW + groupW / 2;
          g.appendChild(mk('text', {
            x: 0, y: 0,
            transform: `translate(${tx},${cH + 8}) rotate(38)`,
            'font-size': 8.5, fill: '#64748b', 'text-anchor': 'start'
          }, lbl));
        }
      });

    } else if (type === 'line') {
      const n = labels.length;
      datasets.forEach(ds => {
        const pts = labels.map((_, li) => {
          const x = n > 1 ? (li / (n - 1)) * cW : cW / 2;
          const y = cH - ((ds.data[li] || 0) / maxVal) * cH;
          return [x, y];
        });
        const ptStr = pts.map(([x, y]) => `${x},${y}`).join(' ');

        if (ds.fill !== false && ds.backgroundColor) {
          const first = pts[0], last = pts[pts.length - 1];
          g.appendChild(mk('polygon', {
            points: `${first[0]},${cH} ${ptStr} ${last[0]},${cH}`,
            fill: ds.backgroundColor
          }));
        }

        g.appendChild(mk('polyline', {
          points: ptStr, fill: 'none',
          stroke: ds.borderColor || '#ef4444',
          'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
        }));

        if (n <= 24) {
          pts.forEach(([x, y]) => {
            g.appendChild(mk('circle', { cx: x, cy: y, r: 3, fill: ds.borderColor || '#ef4444' }));
          });
        }
      });

      const skip = Math.ceil(labels.length / 14);
      labels.forEach((lbl, li) => {
        if (li % skip !== 0) return;
        const n2 = labels.length;
        const x = n2 > 1 ? (li / (n2 - 1)) * cW : cW / 2;
        g.appendChild(mk('text', {
          x: 0, y: 0,
          transform: `translate(${x},${cH + 8}) rotate(38)`,
          'font-size': 8.5, fill: '#64748b', 'text-anchor': 'start'
        }, lbl));
      });
    }

    g.appendChild(mk('line', { x1: 0, y1: 0, x2: 0, y2: cH, stroke: '#cbd5e1', 'stroke-width': 1 }));
    g.appendChild(mk('line', { x1: 0, y1: cH, x2: cW, y2: cH, stroke: '#cbd5e1', 'stroke-width': 1 }));

    if (hasLegend) {
      let lx = ML;
      datasets.forEach(ds => {
        const color = ds.backgroundColor || ds.borderColor || '#60a5fa';
        svg.appendChild(mk('rect', { x: lx, y: 5, width: 9, height: 9, fill: color, rx: 2 }));
        svg.appendChild(mk('text', { x: lx + 12, y: 13, 'font-size': 9, fill: '#475569' }, ds.label || ''));
        lx += 14 + (ds.label || '').length * 5.5 + 10;
      });
    }

    parent.appendChild(svg);
  }
}

// ==================== STORAGE KEYS ====================
const LS_RECORDS   = 'field_log_records_v1';
const LS_ACTIVE    = 'field_log_active_v1';
const LS_FOLLOWUPS = 'field_log_followups_v1';

// ==================== STATE ====================
let sess = null;
let timerInt = null;
let timerStart = null;
let ratings = { cond: 3, app: 3 };
let lastSessId = null;
let charts = {};
let recRatings = { score: 5, pref: 3 };
let fuRatings  = { score: 5, pref: 3 };
let recType = null;

const F = {
  ap: 'approachCount',
  st: 'engagedCount',
  cv: 'conversationCount',
  co: 'contactCount',
  dt: 'planCount',
  cl: 'sameDayCount',
  nc: 'laterCount',
  rj: 'declinedCount'
};

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('inp-date').value = fmtDate(now);
  document.getElementById('inp-stime').value = fmtTime(now);
  setRating('cond', 3);
  setRating('app', 3);

  const saved = localStorage.getItem(LS_ACTIVE);
  if (saved) {
    sess = JSON.parse(saved);
    timerStart = new Date(sess._ts);
    startTimer();
    setBanner(true);
    updateDisplays();
  }
});

// ==================== UTILS ====================
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmtTime(d) {
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}
function uid() { return 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function getSessions()    { return JSON.parse(localStorage.getItem(LS_RECORDS)   || '[]'); }
function putSessions(arr) { localStorage.setItem(LS_RECORDS, JSON.stringify(arr)); }
function getFollowups()    { return JSON.parse(localStorage.getItem(LS_FOLLOWUPS) || '[]'); }
function putFollowups(arr) { localStorage.setItem(LS_FOLLOWUPS, JSON.stringify(arr)); }

function pct(num, den) {
  if (!den) return null;
  return (num / den * 100).toFixed(1);
}
function fmtPct(v) { return v !== null ? v + '%' : '—'; }

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - d) / 86400000));
}
function daysLabel(n) {
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return n + 'd ago';
}

function getSessionsSortedAsc() {
  return [...getSessions()].sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : (a._ts || '').localeCompare(b._ts || '');
  });
}
function getSessionNum(sessId) {
  const sorted = getSessionsSortedAsc();
  const idx = sorted.findIndex(s => s.id === sessId);
  return idx >= 0 ? idx + 1 : null;
}

// ==================== NAVIGATION ====================
function showScr(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('scr-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'log')      renderHistory();
  if (name === 'stats')    renderAnalytics();
  if (name === 'followup') renderFollowups();
}
function setBanner(on) {
  document.getElementById('banner-active').style.display = on ? 'block' : 'none';
  document.getElementById('nav-dot').style.display = on ? 'block' : 'none';
}

// ==================== RATINGS ====================
function setRating(type, val) {
  ratings[type] = val;
  document.querySelectorAll('#r-' + type + ' .rb').forEach((btn, i) => {
    btn.classList.toggle('sel', i + 1 === val);
  });
}

// ==================== SESSION START ====================
function startSession() {
  if (sess) {
    if (!confirm('A session is already active. Start a new one? (Current session will be discarded)')) return;
    clearInterval(timerInt);
  }
  const now = new Date();
  sess = {
    id: uid(),
    date: document.getElementById('inp-date').value || fmtDate(now),
    startTime: document.getElementById('inp-stime').value || fmtTime(now),
    endTime: null,
    durationMinutes: null,
    area: document.getElementById('inp-area').value.trim() || 'Unset',
    timeSlot: document.getElementById('inp-tslot').value,
    weather: document.getElementById('inp-weather').value,
    conditionScore: ratings.cond,
    appearanceScore: ratings.app,
    approachStyle: document.getElementById('inp-opener').value.trim() || 'Unset',
    goalNotes: document.getElementById('inp-goal').value,
    approachCount: 0, engagedCount: 0, conversationCount: 0, contactCount: 0,
    planCount: 0, sameDayCount: 0, laterCount: 0, declinedCount: 0,
    wentWell: '', toImprove: '', tryNext: '', stopDoing: '', notes: '',
    records: [],
    _ts: now.toISOString()
  };
  timerStart = now;
  localStorage.setItem(LS_ACTIVE, JSON.stringify(sess));
  updateDisplays();
  startTimer();
  setBanner(true);
  showScr('active');
}

// ==================== TIMER ====================
function startTimer() {
  clearInterval(timerInt);
  timerInt = setInterval(tickTimer, 1000);
  tickTimer();
}
function tickTimer() {
  if (!timerStart) return;
  const e = Math.floor((Date.now() - timerStart) / 1000);
  const h = Math.floor(e / 3600), m = Math.floor((e % 3600) / 60), s = e % 60;
  document.getElementById('timer').textContent =
    h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

// ==================== COUNTERS ====================
function inc(key) {
  if (!sess) return;
  sess[F[key]]++;
  persist();
  updateDisplays();
  if (navigator.vibrate) navigator.vibrate(25);
  if (key === 'cl') openRecordModal('Same Day');
}
function dec(key) {
  if (!sess) return;
  if (sess[F[key]] > 0) { sess[F[key]]--; persist(); updateDisplays(); }
}
function persist() { localStorage.setItem(LS_ACTIVE, JSON.stringify(sess)); }

function updateDisplays() {
  if (!sess) return;
  Object.keys(F).forEach(k => {
    const el = document.getElementById('c-' + k);
    if (el) el.textContent = sess[F[k]];
  });
  document.getElementById('hdr-ap').textContent = sess.approachCount;
  document.getElementById('ls-st').textContent = sess.engagedCount;
  document.getElementById('ls-cv').textContent = sess.conversationCount;
  document.getElementById('ls-co').textContent = sess.contactCount;
  document.getElementById('ls-dt').textContent = sess.planCount;
  document.getElementById('ls-cl').textContent = sess.sameDayCount;
  document.getElementById('ls-nc').textContent = sess.laterCount;
  document.getElementById('ls-rj').textContent = sess.declinedCount;
  document.getElementById('ls-io').textContent = sess.sameDayCount + sess.laterCount;
}

// ==================== SESSION END ====================
function endSession() {
  if (!sess) return;
  if (!confirm('End this session?')) return;
  clearInterval(timerInt);

  const now = new Date();
  sess.endTime = fmtTime(now);
  sess.durationMinutes = Math.max(1, Math.round((now - new Date(sess._ts)) / 60000));

  const all = getSessions();
  all.unshift(sess);
  putSessions(all);
  lastSessId = sess.id;

  const finished = { ...sess };
  sess = null;
  localStorage.removeItem(LS_ACTIVE);
  setBanner(false);
  showKpiModal(finished);
}

// ==================== KPI ====================
function calcKPI(s) {
  const ap = s.approachCount;
  const dh = (s.durationMinutes || 0) / 60;
  const io = s.sameDayCount + s.laterCount;
  return {
    duration:      (s.durationMinutes || 0) + 'min',
    apPerH:        dh > 0 ? (ap / dh).toFixed(1) : '—',
    engageRate:    fmtPct(pct(s.engagedCount, ap)),
    convRate:      fmtPct(pct(s.conversationCount, ap)),
    contactRate:   fmtPct(pct(s.contactCount, ap)),
    planRate:      fmtPct(pct(s.planCount, ap)),
    sameDayRate:   fmtPct(pct(s.sameDayCount, ap)),
    laterRate:     fmtPct(pct(s.laterCount, ap)),
    outcomeRate:   fmtPct(pct(io, ap)),
    declinedRate:  fmtPct(pct(s.declinedCount, ap)),
    contactToPlan: fmtPct(pct(s.planCount, s.contactCount)),
    planToResult:  fmtPct(pct(s.sameDayCount, s.planCount)),
    contactToLater:fmtPct(pct(s.laterCount, s.contactCount)),
    outcomePerH:   dh > 0 ? (io / dh).toFixed(2) : '—'
  };
}

function kpiItem(v, l, cls) {
  return `<div class="kpi-item ${cls || ''}"><div class="kpi-v">${v}</div><div class="kpi-l">${l}</div></div>`;
}

function showKpiModal(s) {
  const k = calcKPI(s);
  const io = s.sameDayCount + s.laterCount;
  document.getElementById('m-kpi-body').innerHTML = `
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px">${s.date} ${s.startTime}–${s.endTime} | ${escHtml(s.area)} | ${escHtml(s.timeSlot)}</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:var(--bg);border-radius:12px;padding:12px;margin-bottom:14px">
      <div style="text-align:center"><div style="font-size:24px;font-weight:800;color:#2563eb">${s.approachCount}</div><div style="font-size:10px;color:var(--muted)">Approach</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:800;color:#7c3aed">${s.engagedCount}</div><div style="font-size:10px;color:var(--muted)">Engaged</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:800;color:#16a34a">${s.contactCount}</div><div style="font-size:10px;color:var(--muted)">Contact</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:800;color:#dc2626">${io}</div><div style="font-size:10px;color:var(--muted)">Outcome</div></div>
    </div>
    <div class="kpi-grid">
      ${kpiItem(k.duration,'Duration')}${kpiItem(k.apPerH,'Approach/h')}
      ${kpiItem(k.engageRate,'Engage Rate')}${kpiItem(k.convRate,'Conv. Rate')}
      ${kpiItem(k.contactRate,'Contact Rate')}${kpiItem(k.planRate,'Plan Rate')}
      ${kpiItem(k.sameDayRate,'Same Day Rate')}${kpiItem(k.laterRate,'Later Rate')}
      ${kpiItem(k.outcomeRate,'Outcome Rate','kpi-highlight')}${kpiItem(k.declinedRate,'Declined Rate')}
      ${kpiItem(k.contactToPlan,'Contact→Plan')}${kpiItem(k.planToResult,'Plan→Result')}
      ${kpiItem(k.contactToLater,'Contact→Later')}${kpiItem(k.outcomePerH,'Outcome/h','kpi-success')}
    </div>`;
  openModal('m-kpi');
}

// ==================== REVIEW ====================
function openReflection() {
  closeModal('m-kpi');
  openModal('m-ref');
}
function saveRef() {
  if (!lastSessId) { closeModal('m-ref'); return; }
  const all = getSessions();
  const idx = all.findIndex(s => s.id === lastSessId);
  if (idx >= 0) {
    all[idx].wentWell  = document.getElementById('r-good').value;
    all[idx].toImprove = document.getElementById('r-bad').value;
    all[idx].tryNext   = document.getElementById('r-next').value;
    all[idx].stopDoing = document.getElementById('r-stop').value;
    all[idx].notes     = document.getElementById('r-memo').value;
    putSessions(all);
  }
  ['r-good','r-bad','r-next','r-stop','r-memo'].forEach(id => { document.getElementById(id).value = ''; });
  closeModal('m-ref');
  showScr('log');
}

// ==================== OUTCOME RECORD MODAL ====================
function openRecordModal(type) {
  if (!sess) return;
  recType = type;
  document.getElementById('m-record-title').textContent = type + ' — Outcome Record';
  ['rec-initial','rec-work','rec-bg','rec-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  setRecRating('score', 5);
  setRecRating('pref', 3);
  openModal('m-record');
}
function setRecRating(type, val) {
  recRatings[type] = val;
  const cls = type === 'score' ? '.rb10' : '.rb';
  document.querySelectorAll(`#cr-${type} ${cls}`).forEach((btn, i) => {
    btn.classList.toggle('sel', i + 1 === val);
  });
}
function saveRecord() {
  if (!sess) { closeModal('m-record'); return; }
  if (!sess.records) sess.records = [];
  sess.records.push({
    id: uid(),
    type: recType,
    score:      recRatings.score,
    preference: recRatings.pref,
    work:       document.getElementById('rec-work').value.trim(),
    background: document.getElementById('rec-bg').value.trim(),
    initial:    document.getElementById('rec-initial').value.trim().slice(0, 2),
    notes:      document.getElementById('rec-notes').value.trim(),
    createdAt:  new Date().toISOString()
  });
  persist();
  closeModal('m-record');
}

// ==================== MODAL HELPERS ====================
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ==================== HISTORY ====================
function renderHistory() {
  const all = getSessions();
  const sortedAsc = getSessionsSortedAsc();
  const el = document.getElementById('hist-list');
  if (!all.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">&#128203;</div><div class="empty-title">No records yet</div><div>Start a session from the Start tab</div></div>`;
    return;
  }
  el.innerHTML = '<div style="height:8px"></div>' + all.map(s => {
    const ap = s.approachCount;
    const io = s.sameDayCount + s.laterCount;
    const cR = fmtPct(pct(s.contactCount, ap));
    const iR = fmtPct(pct(io, ap));
    const rR = fmtPct(pct(s.declinedCount, ap));
    const dur = s.durationMinutes ? s.durationMinutes + 'min' : 'Active';
    const num = sortedAsc.findIndex(x => x.id === s.id) + 1;
    const recs = s.records && s.records.length ? s.records.length : 0;
    return `
      <div class="hist-item" onclick="showDetail('${s.id}')">
        <div class="hist-hdr">
          <div>
            <div class="hist-date">${s.date} <span style="font-size:12px;font-weight:600;color:var(--muted)">Session #${num}</span></div>
            <div class="hist-sub">${escHtml(s.area)} &middot; ${escHtml(s.timeSlot)} &middot; ${dur}</div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
            <span class="badge b-blue">Ap ${ap}</span>
            ${io > 0 ? `<span class="badge b-green">Out ${io}</span>` : ''}
            ${recs > 0 ? `<span class="badge b-pink">${recs} rec</span>` : ''}
            ${s.declinedCount > 0 ? `<span class="badge b-red">Dec ${s.declinedCount}</span>` : ''}
          </div>
        </div>
        <div class="hist-counts">
          <div class="hist-c"><div class="hist-cv">${s.engagedCount}</div><div class="hist-cl">Engaged</div></div>
          <div class="hist-c"><div class="hist-cv">${s.contactCount}</div><div class="hist-cl">Contact</div></div>
          <div class="hist-c"><div class="hist-cv">${s.planCount}</div><div class="hist-cl">Plan</div></div>
          <div class="hist-c"><div class="hist-cv">${s.sameDayCount}/${s.laterCount}</div><div class="hist-cl">S.Day/Later</div></div>
        </div>
        <div class="hist-rates">
          <span>Contact <strong>${cR}</strong></span>
          <span>Outcome <strong>${iR}</strong></span>
          <span>Declined <strong>${rR}</strong></span>
        </div>
      </div>`;
  }).join('') + '<div style="height:4px"></div>';
}

function showDetail(id) {
  const s = getSessions().find(x => x.id === id);
  if (!s) return;
  const k = calcKPI(s);
  const io = s.sameDayCount + s.laterCount;
  const hasRef = s.wentWell || s.toImprove || s.tryNext || s.stopDoing || s.notes;
  const num = getSessionNum(id);
  const recs = s.records || [];

  document.getElementById('m-detail-title').textContent = s.date + ' Session #' + num;
  document.getElementById('m-detail-body').innerHTML = `
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px">${s.startTime}–${s.endTime || 'Active'} | ${escHtml(s.timeSlot)} | ${escHtml(s.weather)} | ${daysLabel(daysSince(s.date))}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--bg);border-radius:8px;padding:8px;font-size:13px">Condition: <strong>${s.conditionScore}/5</strong></div>
      <div style="background:var(--bg);border-radius:8px;padding:8px;font-size:13px">Appearance: <strong>${s.appearanceScore}/5</strong></div>
      <div style="background:var(--bg);border-radius:8px;padding:8px;font-size:13px;grid-column:1/-1">Approach Style: <strong>${escHtml(s.approachStyle)}</strong></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
      ${[[s.approachCount,'Approach','#2563eb'],[s.engagedCount,'Engaged','#7c3aed'],[s.conversationCount,'Conv.','#0891b2'],[s.contactCount,'Contact','#16a34a'],[s.planCount,'Plan','#d97706'],[s.sameDayCount,'Same Day','#dc2626'],[s.laterCount,'Later','#db2777'],[s.declinedCount,'Declined','#475569']].map(([v,l,c])=>`<div style="text-align:center;background:var(--bg);border-radius:9px;padding:8px"><div style="font-size:20px;font-weight:800;color:${c}">${v}</div><div style="font-size:10px;color:var(--muted)">${l}</div></div>`).join('')}
    </div>
    <div class="kpi-grid" style="margin-bottom:14px">
      ${kpiItem(k.duration,'Duration')}${kpiItem(k.apPerH,'Approach/h')}
      ${kpiItem(k.engageRate,'Engage Rate')}${kpiItem(k.convRate,'Conv. Rate')}
      ${kpiItem(k.contactRate,'Contact Rate')}${kpiItem(k.planRate,'Plan Rate')}
      ${kpiItem(k.sameDayRate,'Same Day Rate')}${kpiItem(k.laterRate,'Later Rate')}
      ${kpiItem(k.outcomeRate,'Outcome Rate','kpi-highlight')}${kpiItem(k.declinedRate,'Declined Rate')}
      ${kpiItem(k.contactToPlan,'Contact→Plan')}${kpiItem(k.planToResult,'Plan→Result')}
      ${kpiItem(k.contactToLater,'Contact→Later')}${kpiItem(k.outcomePerH,'Outcome/h','kpi-success')}
    </div>
    ${recs.length ? `
    <hr class="divider">
    <div style="font-size:14px;font-weight:700;margin-bottom:10px">Outcome Records (${recs.length})</div>
    ${recs.map(c => renderRecordCard(c, false)).join('')}
    ` : ''}
    ${hasRef ? `
    <hr class="divider">
    <div style="font-size:14px;font-weight:700;margin-bottom:10px">Review</div>
    ${s.wentWell  ? `<div style="margin-bottom:8px;font-size:13px"><strong>&#9989; Went well:</strong><br>${escHtml(s.wentWell)}</div>`  : ''}
    ${s.toImprove ? `<div style="margin-bottom:8px;font-size:13px"><strong>&#10060; To improve:</strong><br>${escHtml(s.toImprove)}</div>` : ''}
    ${s.tryNext   ? `<div style="margin-bottom:8px;font-size:13px"><strong>&#129514; Try next:</strong><br>${escHtml(s.tryNext)}</div>`   : ''}
    ${s.stopDoing ? `<div style="margin-bottom:8px;font-size:13px"><strong>&#128683; Stop:</strong><br>${escHtml(s.stopDoing)}</div>`     : ''}
    ${s.notes     ? `<div style="margin-bottom:8px;font-size:13px"><strong>&#128161; Notes:</strong><br>${escHtml(s.notes)}</div>`        : ''}
    ` : ''}
    ${s.goalNotes ? `<hr class="divider"><div style="font-size:13px"><strong>Goal Notes:</strong><br>${escHtml(s.goalNotes)}</div>` : ''}
    <hr class="divider">
    <button class="btn btn-d" onclick="delSession('${s.id}')">Delete Session</button>`;
  openModal('m-detail');
}

function delSession(id) {
  if (!confirm('Delete this session? This cannot be undone.')) return;
  putSessions(getSessions().filter(s => s.id !== id));
  closeModal('m-detail');
  renderHistory();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ==================== EXPORT / IMPORT / CLEAR ====================
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: getSessions(),
    followups: getFollowups()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'field-log-' + fmtDate(new Date()) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('Import data? This will replace all current data.')) {
        event.target.value = '';
        return;
      }
      if (Array.isArray(data.sessions))  putSessions(data.sessions);
      if (Array.isArray(data.followups)) putFollowups(data.followups);
      event.target.value = '';
      renderHistory();
      alert('Import complete.');
    } catch (_) {
      alert('Invalid JSON file.');
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function clearData() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  localStorage.removeItem(LS_RECORDS);
  localStorage.removeItem(LS_FOLLOWUPS);
  renderHistory();
}

// ==================== FOLLOW-UP SCREEN ====================
function renderRecordCard(c, showSessInfo) {
  const typeBadge = c.type === 'Same Day'
    ? '<span class="badge b-blue">Same Day</span>'
    : '<span class="badge b-pink">Later</span>';
  const tags = [
    c.score      ? `Score: ${c.score}`       : null,
    c.preference ? `Pref: ${c.preference}/5` : null,
    c.work       || null,
    c.background || null,
    c.initial    ? `[${c.initial}]`           : null
  ].filter(Boolean);
  return `<div class="case-item" style="margin:0 0 10px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;color:var(--muted)">${showSessInfo && c.sessDate ? c.sessDate + ' Session #' + c.sessNum + ' (' + daysLabel(daysSince(c.sessDate)) + ')' : c.type + ' Record'}</div>
      ${typeBadge}
    </div>
    ${tags.length ? `<div class="case-tags">${tags.map(t => `<span class="case-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
    ${c.notes ? `<div style="font-size:13px;margin-top:8px;white-space:pre-wrap;line-height:1.5">${escHtml(c.notes)}</div>` : ''}
  </div>`;
}

function renderFollowups() {
  const sortedAsc = getSessionsSortedAsc();
  const sameDayRecs = [];
  sortedAsc.forEach((s, idx) => {
    if (s.records && s.records.length) {
      s.records.filter(c => c.type === 'Same Day').forEach(c =>
        sameDayRecs.push({ ...c, sessDate: s.date, sessNum: idx + 1 })
      );
    }
  });
  sameDayRecs.reverse();

  const laterRecs = [...getFollowups()].reverse();
  const el = document.getElementById('followup-list');

  if (!sameDayRecs.length && !laterRecs.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">&#128218;</div><div class="empty-title">No follow-up records</div><div>Tap Same Day counter or use "+ Later Result" to add records</div></div>`;
    return;
  }

  let html = '<div style="padding:0 12px">';
  html += `<div style="padding:12px 0 8px;font-size:15px;font-weight:700;color:#334155">Later Results (${laterRecs.length})</div>`;
  if (laterRecs.length) {
    html += laterRecs.map(c => renderFollowupCard(c)).join('');
  } else {
    html += '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">None yet — use "+ Later Result" to add</div>';
  }
  html += '<hr class="divider" style="margin:16px 0">';
  html += `<div style="padding:4px 0 8px;font-size:15px;font-weight:700;color:#334155">Same Day Records (${sameDayRecs.length})</div>`;
  if (sameDayRecs.length) {
    html += sameDayRecs.map(c => renderRecordCard(c, true)).join('');
  } else {
    html += '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">None yet</div>';
  }
  html += '</div><div style="height:8px"></div>';
  el.innerHTML = html;
}

function renderFollowupCard(c) {
  const tags = [
    c.score      ? `Score: ${c.score}`       : null,
    c.preference ? `Pref: ${c.preference}/5` : null,
    c.work       || null,
    c.background || null,
    c.initial    ? `[${c.initial}]`           : null
  ].filter(Boolean);
  return `<div class="case-item" style="margin:0 0 10px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:700">${c.completedDate} Completed</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">From: Session #${c.origSessNum} (${c.origSessDate} &middot; ${escHtml(c.origSessArea)})</div>
      </div>
      <span class="badge b-pink">Later</span>
    </div>
    ${tags.length ? `<div class="case-tags">${tags.map(t => `<span class="case-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
    ${c.notes ? `<div style="font-size:13px;margin-top:8px;white-space:pre-wrap;line-height:1.5">${escHtml(c.notes)}</div>` : ''}
  </div>`;
}

// ==================== ANALYTICS ====================
function renderAnalytics() {
  const all = getSessions();
  const el = document.getElementById('analytics-body');
  Object.values(charts).forEach(c => { try { c.destroy(); } catch (_) {} });
  charts = {};

  if (!all.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">&#128202;</div><div class="empty-title">No data yet</div><div>Record sessions to see analytics</div></div>`;
    return;
  }

  const sortedAsc = getSessionsSortedAsc();
  const total = sortedAsc.length;

  let lastSD = null;
  sortedAsc.forEach((s, idx) => {
    if (s.sameDayCount > 0) lastSD = { s, num: idx + 1 };
  });
  const fuAsc = getFollowups().sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const lastFu = fuAsc.length ? fuAsc[fuAsc.length - 1] : null;

  const mMap = {};
  sortedAsc.forEach(s => {
    const ym = s.date.slice(0, 7);
    if (!mMap[ym]) mMap[ym] = { ap: 0, io: 0, co: 0, sess: 0 };
    mMap[ym].ap   += s.approachCount;
    mMap[ym].io   += s.sameDayCount + s.laterCount;
    mMap[ym].co   += s.contactCount;
    mMap[ym].sess++;
  });
  const mLabels = Object.keys(mMap);

  const totalSameDay = sortedAsc.reduce((n, s) => n + (s.records ? s.records.filter(c => c.type === 'Same Day').length : 0), 0);
  const totalLater   = getFollowups().length;

  function trackerHtml(label, info) {
    if (!info) return `<div class="tracker-item"><div class="tracker-lbl">${label}</div><div class="tracker-val" style="color:var(--muted)">None</div></div>`;
    const ds = daysSince(info.s.date);
    return `<div class="tracker-item"><div class="tracker-lbl">${label}</div><div class="tracker-val">Session #${info.num}</div><div class="tracker-sub">${daysLabel(ds)} &middot; ${info.s.date}</div></div>`;
  }
  function fuTrackerHtml(label, comp) {
    if (!comp) return `<div class="tracker-item"><div class="tracker-lbl">${label}</div><div class="tracker-val" style="color:var(--muted)">None</div></div>`;
    const ds = daysSince(comp.completedDate);
    return `<div class="tracker-item"><div class="tracker-lbl">${label}</div><div class="tracker-val">Session #${comp.origSessNum}</div><div class="tracker-sub">${daysLabel(ds)} &middot; ${comp.completedDate}</div></div>`;
  }

  const monthlyRows = mLabels.slice().reverse().map(ym => {
    const m = mMap[ym];
    return `<tr><td>${ym}</td><td class="num">${m.sess}</td><td class="num">${m.ap}</td><td class="num">${m.co}</td><td class="num">${m.io}</td></tr>`;
  }).join('');

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Session Summary</div>
      <div class="tracker-grid">
        <div class="tracker-item" style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center">
          <div><div class="tracker-lbl">Total Sessions</div><div style="font-size:28px;font-weight:800;color:var(--primary)">${total}<span style="font-size:14px;font-weight:600;color:var(--muted)"> sessions</span></div></div>
          <div style="text-align:right"><div class="tracker-lbl">Same Day / Later</div><div style="font-size:22px;font-weight:800"><span style="color:#dc2626">${totalSameDay}</span><span style="color:var(--muted);font-size:16px"> / </span><span style="color:#db2777">${totalLater}</span><span style="font-size:12px;font-weight:600;color:var(--muted)"> records</span></div></div>
        </div>
        ${trackerHtml('Last Same Day', lastSD)}
        ${fuTrackerHtml('Last Later', lastFu)}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Monthly Summary</div>
      <div class="chart-wrap"><canvas id="ch-monthly"></canvas></div>
      <table class="mtable" style="margin-top:12px">
        <thead><tr><th>Month</th><th style="text-align:right">Sessions</th><th style="text-align:right">Approach</th><th style="text-align:right">Contact</th><th style="text-align:right">Outcome</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
      </table>
    </div>
    <div class="card"><div class="card-title">Daily Approach Count</div><div class="chart-wrap"><canvas id="ch-daily"></canvas></div></div>
    <div class="card"><div class="card-title">Weekly Approach Count</div><div class="chart-wrap"><canvas id="ch-weekly"></canvas></div></div>
    <div class="card"><div class="card-title">Contact &amp; Outcome Rate by Area</div><div class="chart-wrap"><canvas id="ch-area"></canvas></div></div>
    <div class="card"><div class="card-title">Contact &amp; Outcome Rate by Time Slot</div><div class="chart-wrap"><canvas id="ch-tslot"></canvas></div></div>
    <div class="card"><div class="card-title">Engage &amp; Contact Rate by Approach Style</div><div class="chart-wrap"><canvas id="ch-opener"></canvas></div></div>
    <div class="card"><div class="card-title">Condition Score vs Avg Contact Rate</div><div class="chart-wrap"><canvas id="ch-cond"></canvas></div></div>
    <div class="card"><div class="card-title">Appearance Score vs Avg Contact Rate</div><div class="chart-wrap"><canvas id="ch-app"></canvas></div></div>
    <div class="card"><div class="card-title">Declined Rate Trend</div><div class="chart-wrap"><canvas id="ch-rej"></canvas></div></div>
    <div style="height:8px"></div>`;

  requestAnimationFrame(() => buildCharts(sortedAsc, mMap, mLabels));
}

function groupBy(arr, key) {
  const m = {};
  arr.forEach(s => {
    const k = s[key] || 'Unknown';
    if (!m[k]) m[k] = { ap: 0, st: 0, co: 0, io: 0 };
    m[k].ap += s.approachCount;
    m[k].st += s.engagedCount;
    m[k].co += s.contactCount;
    m[k].io += s.sameDayCount + s.laterCount;
  });
  return m;
}
function avg(arr) { return arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0; }

function buildCharts(sorted, mMap, mLabels) {
  charts.monthly = new Chart(document.getElementById('ch-monthly'), {
    type: 'bar',
    data: { labels: mLabels, datasets: [
      { label: 'Approach', data: mLabels.map(ym => mMap[ym].ap), backgroundColor: '#60a5fa' },
      { label: 'Outcome',  data: mLabels.map(ym => mMap[ym].io), backgroundColor: '#f472b6' }
    ]}
  });

  charts.daily = new Chart(document.getElementById('ch-daily'), {
    type: 'bar',
    data: { labels: sorted.map(s => s.date.slice(5)), datasets: [
      { label: 'Approach', data: sorted.map(s => s.approachCount), backgroundColor: '#60a5fa' }
    ]}
  });

  const wMap = {};
  sorted.forEach(s => { const wk = getWeek(s.date); wMap[wk] = (wMap[wk] || 0) + s.approachCount; });
  charts.weekly = new Chart(document.getElementById('ch-weekly'), {
    type: 'bar',
    data: { labels: Object.keys(wMap), datasets: [
      { label: 'Weekly Approach', data: Object.values(wMap), backgroundColor: '#818cf8' }
    ]}
  });

  const aM = groupBy(sorted, 'area');
  const aL = Object.keys(aM);
  charts.area = new Chart(document.getElementById('ch-area'), {
    type: 'bar',
    data: { labels: aL, datasets: [
      { label: 'Contact Rate (%)', data: aL.map(a => +pct(aM[a].co, aM[a].ap) || 0), backgroundColor: '#34d399' },
      { label: 'Outcome Rate (%)', data: aL.map(a => +pct(aM[a].io, aM[a].ap) || 0), backgroundColor: '#f472b6' }
    ]}
  });

  const tM = groupBy(sorted, 'timeSlot');
  const tL = Object.keys(tM);
  charts.tslot = new Chart(document.getElementById('ch-tslot'), {
    type: 'bar',
    data: { labels: tL, datasets: [
      { label: 'Contact Rate (%)', data: tL.map(t => +pct(tM[t].co, tM[t].ap) || 0), backgroundColor: '#fbbf24' },
      { label: 'Outcome Rate (%)', data: tL.map(t => +pct(tM[t].io, tM[t].ap) || 0), backgroundColor: '#f87171' }
    ]}
  });

  const oM = groupBy(sorted, 'approachStyle');
  const oL = Object.keys(oM);
  charts.opener = new Chart(document.getElementById('ch-opener'), {
    type: 'bar',
    data: { labels: oL, datasets: [
      { label: 'Engage Rate (%)',  data: oL.map(o => +pct(oM[o].st, oM[o].ap) || 0), backgroundColor: '#a78bfa' },
      { label: 'Contact Rate (%)', data: oL.map(o => +pct(oM[o].co, oM[o].ap) || 0), backgroundColor: '#34d399' }
    ]}
  });

  const cMap = {}; for (let i = 1; i <= 5; i++) cMap[i] = [];
  sorted.forEach(s => { const r = pct(s.contactCount, s.approachCount); if (r !== null) cMap[s.conditionScore].push(+r); });
  charts.cond = new Chart(document.getElementById('ch-cond'), {
    type: 'bar',
    data: { labels: ['Cond.1','Cond.2','Cond.3','Cond.4','Cond.5'], datasets: [
      { label: 'Avg Contact Rate (%)', data: [1,2,3,4,5].map(i => avg(cMap[i])), backgroundColor: '#60a5fa' }
    ]}
  });

  const aScMap = {}; for (let i = 1; i <= 5; i++) aScMap[i] = [];
  sorted.forEach(s => { const r = pct(s.contactCount, s.approachCount); if (r !== null) aScMap[s.appearanceScore].push(+r); });
  charts.app = new Chart(document.getElementById('ch-app'), {
    type: 'bar',
    data: { labels: ['App.1','App.2','App.3','App.4','App.5'], datasets: [
      { label: 'Avg Contact Rate (%)', data: [1,2,3,4,5].map(i => avg(aScMap[i])), backgroundColor: '#f9a8d4' }
    ]}
  });

  charts.rej = new Chart(document.getElementById('ch-rej'), {
    type: 'line',
    data: { labels: sorted.map(s => s.date.slice(5)), datasets: [{
      label: 'Declined Rate (%)',
      data: sorted.map(s => +pct(s.declinedCount, s.approachCount) || 0),
      borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.12)', fill: true
    }]}
  });
}

// ==================== FOLLOW-UP MODAL ====================
function openFollowupModal() {
  const sortedAsc = getSessionsSortedAsc();
  if (!sortedAsc.length) {
    alert('No sessions yet. Record a session first.');
    return;
  }
  const sel = document.getElementById('fu-orig-sess');
  sel.innerHTML = [...sortedAsc].reverse().map((s, ri) => {
    const num = sortedAsc.length - ri;
    return `<option value="${s.id}">Session #${num} (${s.date} &middot; ${escHtml(s.area)})</option>`;
  }).join('');
  document.getElementById('fu-date').value = fmtDate(new Date());
  ['fu-initial','fu-work','fu-bg','fu-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  setFuRating('score', 5);
  setFuRating('pref', 3);
  openModal('m-followup');
}

function setFuRating(type, val) {
  fuRatings[type] = val;
  const cls = type === 'score' ? '.rb10' : '.rb';
  document.querySelectorAll(`#fr-${type} ${cls}`).forEach((btn, i) => {
    btn.classList.toggle('sel', i + 1 === val);
  });
}

function saveFollowup() {
  const sortedAsc = getSessionsSortedAsc();
  const sessId = document.getElementById('fu-orig-sess').value;
  const sessIdx = sortedAsc.findIndex(s => s.id === sessId);
  const origSess = sessIdx >= 0 ? sortedAsc[sessIdx] : null;
  const all = getFollowups();
  all.push({
    id: uid(),
    origSessId:   sessId,
    origSessNum:  sessIdx + 1,
    origSessDate: origSess ? origSess.date : '',
    origSessArea: origSess ? origSess.area : '',
    completedDate: document.getElementById('fu-date').value,
    score:      fuRatings.score,
    preference: fuRatings.pref,
    work:       document.getElementById('fu-work').value.trim(),
    background: document.getElementById('fu-bg').value.trim(),
    initial:    document.getElementById('fu-initial').value.trim().slice(0, 2),
    notes:      document.getElementById('fu-notes').value.trim(),
    createdAt:  new Date().toISOString()
  });
  putFollowups(all);
  closeModal('m-followup');
  renderFollowups();
}

function getWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}
