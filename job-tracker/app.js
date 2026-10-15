/* Job Tracker — state, calculations, rendering. See docs/SPEC.md. */
(function () {
  'use strict';

  // ---------- store ----------

  const KEY = 'jobtracker.v1';

  function defaults() {
    return {
      version: 1,
      settings: {
        jobTypes: [
          { code: 'NC', name: 'New Connect', hasLevels: true, keywords: ['NC'], hidden: false },
          { code: 'RC', name: 'Reconnect', hasLevels: true, keywords: ['RC'], hidden: false },
          { code: 'Rescue', name: 'Rescue', hasLevels: true, keywords: ['RESCUE'], hidden: false },
          { code: 'COS', name: 'Change of Service', hasLevels: false, keywords: ['COS'], hidden: false },
          { code: 'TC', name: 'Trouble Call', hasLevels: true, keywords: ['TC'], hidden: false },
        ],
        levels: [
          { name: 'Single', keywords: ['SP'] },
          { name: 'Double', keywords: ['DP'] },
          { name: 'Triple', keywords: ['TP'] },
        ],
        rates: {},
        charges: [],
      },
      jobs: [],
      expenses: [],
      meta: { lastBackup: null },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.error(e);
      return defaults();
    }
  }

  function migrate(d) {
    const base = defaults();
    d.settings = Object.assign(base.settings, d.settings || {});
    d.jobs = d.jobs || [];
    d.expenses = d.expenses || [];
    d.meta = Object.assign(base.meta, d.meta || {});
    d.version = 1;
    return d;
  }

  let db = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      alert('Could not save: ' + e.message);
    }
  }

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- helpers ----------

  const $ = sel => document.querySelector(sel);
  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const moneyRound = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmt = cents => money.format((cents || 0) / 100);
  const fmt0 = cents => moneyRound.format(Math.round((cents || 0) / 100));
  const toCents = v => {
    const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };
  const centsToInput = c => (c || c === 0) && c !== '' ? (c / 100).toFixed(2) : '';

  // ---------- dates (weeks start Sunday) ----------

  const pad = n => String(n).padStart(2, '0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => toISO(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; };
  const shortDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayLabel = iso => parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ---------- settings helpers ----------

  const typeOf = code => db.settings.jobTypes.find(t => t.code === code);
  const rateKey = (type, level) => {
    const t = typeOf(type);
    return t && !t.hasLevels ? type : `${type}|${level}`;
  };
  const rateFor = (type, level) => db.settings.rates[rateKey(type, level)];
  const jobLabel = j => {
    const t = typeOf(j.type);
    return t && t.hasLevels && j.level ? `${j.type} · ${j.level}` : (j.type || '?');
  };

  // ---------- calculations ----------

  function summarize(from, to) {
    const jobs = db.jobs.filter(j => j.date >= from && j.date <= to);
    const exps = db.expenses.filter(e => e.date >= from && e.date <= to);
    const gross = jobs.reduce((s, j) => s + (j.price || 0), 0);
    const weeks = new Set(jobs.map(j => toISO(weekStart(parseISO(j.date))))).size;

    let auto = 0;
    for (const c of db.settings.charges) {
      if (c.kind === 'percent') auto += Math.round(gross * (c.amount || 0) / 100);
      else if (c.kind === 'perJob') auto += (c.amount || 0) * jobs.length;
      else if (c.kind === 'weekly') auto += (c.amount || 0) * weeks;
    }
    const oneTime = exps.filter(e => e.kind === 'deduction').reduce((s, e) => s + e.amount, 0);
    const fuel = exps.filter(e => e.kind === 'fuel').reduce((s, e) => s + e.amount, 0);
    const gallons = exps.filter(e => e.kind === 'fuel').reduce((s, e) => s + (e.gallons || 0), 0);
    const deducted = auto + oneTime;
    const days = new Set(jobs.map(j => j.date)).size;

    const byType = {};
    for (const j of jobs) {
      const k = jobLabel(j);
      byType[k] = byType[k] || { count: 0, total: 0 };
      byType[k].count++;
      byType[k].total += j.price || 0;
    }
    return { jobs, exps, gross, deducted, auto, oneTime, fuel, gallons, net: gross - deducted - fuel, count: jobs.length, days, weeks, byType };
  }

  // ---------- UI state ----------

  let curWeek = weekStart(new Date());
  let view = 'week';
  let statsPeriod = 'thisWeek';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2500);
  }

  function render() {
    $('#view-week').hidden = view !== 'week';
    $('#view-stats').hidden = view !== 'stats';
    $('#btn-stats-label').textContent = view === 'stats' ? 'Week' : 'Stats';
    $('#btn-stats .ico').textContent = view === 'stats' ? '🗓' : '📊';
    if (view === 'week') renderWeek(); else renderStats();
  }

  // ---------- week view ----------

  function renderWeek() {
    const from = toISO(curWeek), toD = addDays(curWeek, 6), to = toISO(toD);
    const thisWeek = toISO(weekStart(new Date()));
    const lastWeek = toISO(addDays(weekStart(new Date()), -7));
    $('#week-title').textContent = from === thisWeek ? 'This week' : from === lastWeek ? 'Last week' : 'Week';
    $('#week-range').textContent = `${shortDate(curWeek)} – ${shortDate(toD)}`;
    $('#next-week').style.visibility = from >= thisWeek ? 'hidden' : 'visible';

    const s = summarize(from, to);
    $('#week-gross').textContent = fmt0(s.gross);
    $('#week-count').textContent = `${s.count} job${s.count === 1 ? '' : 's'} completed`;
    $('#week-deducted').textContent = s.deducted ? '−' + fmt0(s.deducted) : '$0';
    $('#week-fuel').textContent = s.fuel ? '−' + fmt0(s.fuel) : '$0';
    $('#week-net').textContent = fmt0(s.net);
    $('#week-net').className = s.net < 0 ? 'neg' : '';

    const lb = db.meta.lastBackup;
    const oldest = db.jobs.reduce((m, j) => (j.createdAt && j.createdAt < m ? j.createdAt : m), new Date().toISOString());
    const since = new Date(lb || oldest).getTime();
    $('#backup-banner').hidden = !(db.jobs.length && Date.now() - since > 14 * 864e5);

    const items = [
      ...s.jobs.map(j => ({ date: j.date, t: j.createdAt || '', kind: 'job', o: j })),
      ...s.exps.map(e => ({ date: e.date, t: e.createdAt || '', kind: 'exp', o: e })),
    ].sort((a, b) => (b.date + b.t).localeCompare(a.date + a.t));

    const list = $('#week-list');
    if (!items.length) {
      list.innerHTML = `<div class="empty">No jobs this week yet.<br>Tap <b>＋ Add</b> or <b>📷 Scan</b>.</div>`;
      return;
    }
    let html = '', curDay = null;
    for (const it of items) {
      if (it.date !== curDay) {
        curDay = it.date;
        const dayTotal = s.jobs.filter(j => j.date === curDay).reduce((a, j) => a + j.price, 0);
        html += `<div class="day"><span>${dayLabel(curDay)}</span><span>${fmt(dayTotal)}</span></div>`;
      }
      html += it.kind === 'job' ? jobRow(it.o) : expRow(it.o);
    }
    list.innerHTML = html;
  }

  function jobRow(j) {
    return `<button class="item" data-job="${esc(j.id)}">
      <div class="main">
        <div class="line1"><span class="badge">${esc(jobLabel(j))}</span>${j.jobId ? `<span>#${esc(j.jobId)}</span>` : ''}${j.timeWindow ? `<span class="muted small">${esc(j.timeWindow)}</span>` : ''}</div>
        ${j.address ? `<div class="addr">${esc(j.address)}</div>` : ''}
      </div>
      <div class="amt">${fmt(j.price)}</div>
    </button>`;
  }

  function expRow(e) {
    const isFuel = e.kind === 'fuel';
    const title = isFuel ? `⛽ Fuel${e.gallons ? ` · ${e.gallons} gal` : ''}` : `➖ ${esc(e.name || 'Deduction')}`;
    const sub = [e.jobId ? '#' + e.jobId : '', e.note].filter(Boolean).join(' · ');
    return `<button class="item" data-exp="${esc(e.id)}">
      <div class="main"><div class="line1">${title}</div>${sub ? `<div class="addr">${esc(sub)}</div>` : ''}</div>
      <div class="amt neg">−${fmt(e.amount)}</div>
    </button>`;
  }

  // ---------- stats view ----------

  const PERIODS = {
    thisWeek: ['This week', () => { const s = weekStart(new Date()); return [s, addDays(s, 6)]; }],
    lastWeek: ['Last week', () => { const s = addDays(weekStart(new Date()), -7); return [s, addDays(s, 6)]; }],
    thisMonth: ['This month', () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)]; }],
    lastMonth: ['Last month', () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; }],
    thisYear: ['This year', () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), new Date(n.getFullYear(), 11, 31)]; }],
    all: ['All time', () => [new Date(2000, 0, 1), new Date(2100, 0, 1)]],
  };

  function renderStats() {
    $('#stats-periods').innerHTML = Object.entries(PERIODS)
      .map(([k, [label]]) => `<button data-period="${k}" class="${k === statsPeriod ? 'on' : ''}">${label}</button>`).join('');
    const [a, b] = PERIODS[statsPeriod][1]();
    const s = summarize(toISO(a), toISO(b));

    const tiles = [
      ['Jobs', s.count],
      ['Earned', fmt(s.gross)],
      ['Deducted', `<span class="neg">−${fmt(s.deducted)}</span>`],
      ['Fuel', `<span class="neg">−${fmt(s.fuel)}</span>`],
      ['Net', `<span class="${s.net < 0 ? 'neg' : 'pos'}">${fmt(s.net)}</span>`],
      ['Avg / job', s.count ? fmt(Math.round(s.gross / s.count)) : '—'],
      ['Avg / work day', s.days ? fmt(Math.round(s.net / s.days)) : '—'],
      ['Gallons', s.gallons ? s.gallons.toFixed(1) : '—'],
    ];
    let html = `<div class="grid">${tiles.map(([k, v]) => `<div class="tile"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;

    const rows = Object.entries(s.byType).sort((x, y) => y[1].total - x[1].total);
    html += `<h2 class="section-title">By code</h2>`;
    html += rows.length
      ? `<table><tr><th>Code</th><th class="r">Jobs</th><th class="r">Total</th></tr>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${v.count}</td><td class="r">${fmt(v.total)}</td></tr>`).join('')}</table>`
      : `<div class="empty">No jobs in this period.</div>`;

    if (s.deducted) {
      html += `<h2 class="section-title">Deductions</h2><table>`;
      if (s.auto) html += `<tr><td>Automatic charges</td><td class="r">${fmt(s.auto)}</td></tr>`;
      const byName = {};
      s.exps.filter(e => e.kind === 'deduction').forEach(e => { byName[e.name || 'Other'] = (byName[e.name || 'Other'] || 0) + e.amount; });
      Object.entries(byName).forEach(([k, v]) => { html += `<tr><td>${esc(k)}</td><td class="r">${fmt(v)}</td></tr>`; });
      html += `</table>`;
    }

    // last 12 weeks, net
    const cur = weekStart(new Date());
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const ws = addDays(cur, -7 * i);
      weeks.push({ ws, s: summarize(toISO(ws), toISO(addDays(ws, 6))) });
    }
    const max = Math.max(1, ...weeks.map(w => w.s.net));
    html += `<h2 class="section-title">Net per week (last 12)</h2><div class="bars">${weeks.map((w, i) =>
      `<div class="bar ${i === 11 ? 'cur' : ''}" title="${shortDate(w.ws)}: ${fmt(w.s.net)}"><i style="height:${Math.max(0, w.s.net) / max * 100}%"></i><small>${w.ws.getMonth() + 1}/${w.ws.getDate()}</small></div>`).join('')}</div>`;

    $('#stats-body').innerHTML = html;
  }

  // ---------- sheets ----------

  function openSheet(id) { const d = $(id); if (!d.open) d.showModal(); }
  function closeSheet(id) { const d = $(id); if (d.open) d.close(); }
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) { d.close(); return; }
      // tap on the backdrop (outside the sheet box) closes it
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) d.close();
      }
    });
  });

  // ---------- job sheet ----------

  let editJob = null;     // job being edited, or a draft
  let afterJobSave = null;

  function visibleTypes() { return db.settings.jobTypes.filter(t => !t.hidden); }

  function openJob(job, opts = {}) {
    editJob = job ? { ...job } : { id: null, date: today(), type: null, level: null, jobId: '', address: '', price: null, notes: '', timeWindow: '' };
    afterJobSave = opts.after || null;
    $('#job-sheet-title').textContent = job && job.id ? 'Edit job' : 'Add job';
    $('#job-delete').hidden = !(job && job.id);
    $('#job-id').value = editJob.jobId || '';
    $('#job-date').value = editJob.date;
    $('#job-address').value = editJob.address || '';
    $('#job-time').value = editJob.timeWindow || '';
    $('#job-notes').value = editJob.notes || '';
    $('#job-price').value = centsToInput(editJob.price);
    $('#job-wo').textContent = editJob.woCode ? `Work-order code: ${editJob.woCode}` : '';
    $('#job-raw').hidden = !opts.raw;
    $('#job-raw pre').textContent = opts.raw || '';
    $('#job-scan-status').hidden = !opts.status;
    $('#job-scan-status').textContent = opts.status || '';
    renderJobPickers();
    checkDup();
    openSheet('#job-sheet');
  }

  function renderJobPickers() {
    const types = visibleTypes();
    if (editJob.type && !types.some(t => t.code === editJob.type) && typeOf(editJob.type)) types.push(typeOf(editJob.type));
    $('#job-types').innerHTML = types.map(t =>
      `<button type="button" data-type="${esc(t.code)}" class="${t.code === editJob.type ? 'on' : ''}">${esc(t.code)}</button>`).join('');
    const t = typeOf(editJob.type);
    const needLevel = !t || t.hasLevels;
    $('#job-levels-wrap').hidden = !needLevel;
    $('#job-levels').innerHTML = db.settings.levels.map(l =>
      `<button type="button" data-level="${esc(l.name)}" class="${l.name === editJob.level ? 'on' : ''}">${esc(l.name)}</button>`).join('');
    $('#job-types').classList.toggle('missing', !!editJob._tried && !editJob.type);
    $('#job-levels').classList.toggle('missing', !!editJob._tried && needLevel && !editJob.level);
  }

  function applyRate() {
    if (!editJob.type) return;
    const t = typeOf(editJob.type);
    if (t && t.hasLevels && !editJob.level) return;
    const r = rateFor(editJob.type, editJob.level);
    if (r !== undefined && r !== null) $('#job-price').value = centsToInput(r);
  }

  function checkDup() {
    const id = $('#job-id').value.trim();
    const dup = id && db.jobs.find(j => j.jobId === id && j.id !== editJob.id);
    $('#job-dup').hidden = !dup;
    if (dup) $('#job-dup').textContent = `Job #${id} is already saved (${dayLabel(dup.date)}).`;
  }

  $('#job-types').addEventListener('click', e => {
    const b = e.target.closest('[data-type]'); if (!b) return;
    editJob.type = b.dataset.type;
    if (!typeOf(editJob.type).hasLevels) editJob.level = null;
    renderJobPickers(); applyRate();
  });
  $('#job-levels').addEventListener('click', e => {
    const b = e.target.closest('[data-level]'); if (!b) return;
    editJob.level = b.dataset.level;
    renderJobPickers(); applyRate();
  });
  $('#job-id').addEventListener('input', checkDup);

  $('#job-form').addEventListener('submit', e => {
    e.preventDefault();
    const t = typeOf(editJob.type);
    if (!t || (t.hasLevels && !editJob.level)) {
      editJob._tried = true; renderJobPickers();
      return;
    }
    const now = new Date().toISOString();
    const job = {
      id: editJob.id || uid('j'),
      date: $('#job-date').value || today(),
      type: editJob.type,
      level: t.hasLevels ? editJob.level : null,
      jobId: $('#job-id').value.trim(),
      woCode: editJob.woCode || '',
      timeWindow: $('#job-time').value.trim(),
      address: $('#job-address').value.trim(),
      price: toCents($('#job-price').value),
      notes: $('#job-notes').value.trim(),
      source: editJob.source || 'manual',
      createdAt: editJob.createdAt || now,
      updatedAt: now,
    };
    const i = db.jobs.findIndex(j => j.id === job.id);
    if (i >= 0) db.jobs[i] = job; else db.jobs.push(job);
    save();
    closeSheet('#job-sheet');
    if (afterJobSave) { const f = afterJobSave; afterJobSave = null; f(job); return; }
    curWeek = weekStart(parseISO(job.date));
    render();
    toast(i >= 0 ? 'Job updated' : `Job saved · ${fmt(job.price)}`);
  });

  $('#job-delete').addEventListener('click', () => {
    if (!confirm('Delete this job?')) return;
    db.jobs = db.jobs.filter(j => j.id !== editJob.id);
    save(); closeSheet('#job-sheet'); render(); toast('Job deleted');
  });

  // ---------- expense sheet ----------

  let editExp = null;

  function openExp(exp) {
    editExp = exp ? { ...exp } : { id: null, kind: 'fuel', date: today(), amount: null };
    $('#exp-sheet-title').textContent = exp ? 'Edit expense' : 'Add expense';
    $('#exp-delete').hidden = !exp;
    $('#exp-amount').value = centsToInput(editExp.amount);
    $('#exp-date').value = editExp.date;
    $('#exp-gallons').value = editExp.gallons || '';
    $('#exp-note').value = editExp.note || '';
    $('#exp-jobid').value = editExp.jobId || '';
    $('#exp-name').value = editExp.name || '';
    const charges = db.settings.charges.filter(c => c.kind === 'oneTime');
    $('#exp-charge').innerHTML = charges.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${fmt(c.amount)})</option>`).join('') + `<option value="">Other…</option>`;
    $('#exp-charge').value = editExp.chargeId && charges.some(c => c.id === editExp.chargeId) ? editExp.chargeId : (exp ? '' : (charges[0] ? charges[0].id : ''));
    renderExpKind();
    if (!exp && editExp.kind === 'deduction') onChargePick();
    openSheet('#exp-sheet');
  }

  function renderExpKind() {
    document.querySelectorAll('#exp-kind button').forEach(b => b.classList.toggle('on', b.dataset.kind === editExp.kind));
    const ded = editExp.kind === 'deduction';
    $('#exp-ded-fields').hidden = !ded;
    $('#exp-gal-wrap').hidden = ded;
    $('#exp-name-wrap').hidden = !ded || !!$('#exp-charge').value;
  }

  function onChargePick() {
    const c = db.settings.charges.find(x => x.id === $('#exp-charge').value);
    if (c) { $('#exp-amount').value = centsToInput(c.amount); $('#exp-name').value = c.name; }
    renderExpKind();
  }

  $('#exp-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if (!b) return;
    editExp.kind = b.dataset.kind;
    renderExpKind();
    if (editExp.kind === 'deduction' && !editExp.id) onChargePick();
  });
  $('#exp-charge').addEventListener('change', onChargePick);

  $('#exp-form').addEventListener('submit', e => {
    e.preventDefault();
    const amount = toCents($('#exp-amount').value);
    if (amount <= 0) { $('#exp-amount').focus(); return; }
    const ded = editExp.kind === 'deduction';
    const charge = ded ? db.settings.charges.find(c => c.id === $('#exp-charge').value) : null;
    const now = new Date().toISOString();
    const exp = {
      id: editExp.id || uid('e'),
      kind: editExp.kind,
      date: $('#exp-date').value || today(),
      amount,
      note: $('#exp-note').value.trim(),
      createdAt: editExp.createdAt || now,
      updatedAt: now,
    };
    if (ded) {
      exp.chargeId = charge ? charge.id : null;
      exp.name = charge ? charge.name : ($('#exp-name').value.trim() || 'Deduction');
      exp.jobId = $('#exp-jobid').value.trim();
    } else {
      const g = parseFloat($('#exp-gallons').value);
      if (Number.isFinite(g)) exp.gallons = g;
    }
    const i = db.expenses.findIndex(x => x.id === exp.id);
    if (i >= 0) db.expenses[i] = exp; else db.expenses.push(exp);
    save();
    closeSheet('#exp-sheet');
    curWeek = weekStart(parseISO(exp.date));
    render();
    toast(i >= 0 ? 'Updated' : 'Saved');
  });

  $('#exp-delete').addEventListener('click', () => {
    if (!confirm('Delete this entry?')) return;
    db.expenses = db.expenses.filter(x => x.id !== editExp.id);
    save(); closeSheet('#exp-sheet'); render(); toast('Deleted');
  });

  // ---------- scan ----------

  $('#scan-take').addEventListener('click', () => $('#scan-camera').click());
  $('#scan-pick').addEventListener('click', () => $('#scan-file').click());
  ['#scan-camera', '#scan-file'].forEach(sel => $(sel).addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) runScan(f);
  }));

  async function runScan(file) {
    closeSheet('#scan-sheet');
    openJob(null, { status: 'Reading image… (first scan downloads the text reader, ~10 MB)' });
    const status = $('#job-scan-status');
    let text, found;
    try {
      ({ jobs: found, text } = await OCR.scan(file, db.settings, m => {
        if (m.status === 'recognizing text') status.textContent = `Reading text… ${Math.round(m.progress * 100)}%`;
        else if (m.status === 'second pass') status.textContent = 'Taking a closer look…';
        else if (m.status) status.textContent = m.status.charAt(0).toUpperCase() + m.status.slice(1) + '…';
      }));
    } catch (err) {
      status.textContent = 'Scan failed: ' + err.message;
      return;
    }
    if (!$('#job-sheet').open) return; // user closed it while reading
    if (found.length === 0) {
      status.textContent = 'No "Job #" found. Fill in by hand — recognized text is below.';
      $('#job-raw').hidden = false;
      $('#job-raw pre').textContent = text;
      return;
    }
    if (found.length === 1) {
      const f = found[0];
      openJob(draftFromScan(f), { raw: text, status: scanStatus(f) });
      applyRate();
      return;
    }
    closeSheet('#job-sheet');
    openReview(found, text);
  }

  function draftFromScan(f) {
    const t = typeOf(f.type);
    const level = t && t.hasLevels ? f.level : null;
    const r = f.type ? rateFor(f.type, level) : undefined;
    return {
      id: null, date: today(), type: f.type, level,
      jobId: f.jobId, address: f.address, timeWindow: f.timeWindow, woCode: f.woCode,
      price: r ?? null, notes: '', source: 'scan',
    };
  }

  function scanStatus(f) {
    const t = typeOf(f.type);
    const miss = [];
    if (!f.type) miss.push('job type');
    if ((!t || t.hasLevels) && !f.level) miss.push('level');
    if (!f.address) miss.push('address');
    return miss.length ? `Check the form — could not detect: ${miss.join(', ')}.` : 'Scanned. Check and tap Save.';
  }

  // review several jobs
  let review = [];

  function openReview(found, raw) {
    review = found.map(f => {
      const d = draftFromScan(f);
      d._dup = db.jobs.some(j => j.jobId === f.jobId);
      d._on = !d._dup;
      return d;
    });
    $('#review-date').value = today();
    $('#review-raw pre').textContent = raw;
    renderReview();
    openSheet('#review-sheet');
  }

  function renderReview() {
    $('#review-title').textContent = `Found ${review.length} jobs`;
    $('#review-list').innerHTML = review.map((d, i) => {
      const t = typeOf(d.type);
      const needLevel = !t || t.hasLevels;
      const levels = needLevel ? `<div class="seg ${d._on && !d.level ? 'missing' : ''}">${db.settings.levels.map(l =>
        `<button type="button" data-r="${i}" data-level="${esc(l.name)}" class="${l.name === d.level ? 'on' : ''}">${esc(l.name)}</button>`).join('')}</div>` : '';
      const types = `<div class="seg wrap ${d._on && !d.type ? 'missing' : ''}">${visibleTypes().map(tt =>
        `<button type="button" data-r="${i}" data-type="${esc(tt.code)}" class="${tt.code === d.type ? 'on' : ''}">${esc(tt.code)}</button>`).join('')}</div>`;
      return `<div class="rev">
        <input type="checkbox" data-r="${i}" data-check ${d._on ? 'checked' : ''}>
        <div class="main">
          <div class="line1"><b>#${esc(d.jobId)}</b>${d.woCode ? `<span class="muted small">${esc(d.woCode)}</span>` : ''}${d._dup ? '<span class="tag">already added</span>' : ''}<span style="margin-left:auto;font-weight:600">${d.price != null ? fmt(d.price) : '—'}</span></div>
          <div class="addr">${esc(d.address || 'no address found')}${d.timeWindow ? ' · ' + esc(d.timeWindow) : ''}</div>
          ${types}${levels}
        </div>
      </div>`;
    }).join('');
    const n = review.filter(d => d._on).length;
    $('#review-save').textContent = `Add ${n} selected`;
    $('#review-save').disabled = !n;
  }

  $('#review-list').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const d = review[+b.dataset.r];
    if (b.dataset.check !== undefined) d._on = b.checked;
    else if (b.dataset.type) { d.type = b.dataset.type; if (!typeOf(d.type).hasLevels) d.level = null; }
    else if (b.dataset.level) d.level = b.dataset.level;
    else return;
    const t = typeOf(d.type);
    if (t && (!t.hasLevels || d.level)) { const r = rateFor(d.type, d.level); d.price = r ?? null; }
    renderReview();
  });

  $('#review-form').addEventListener('submit', e => {
    e.preventDefault();
    const sel = review.filter(d => d._on);
    const bad = sel.find(d => { const t = typeOf(d.type); return !t || (t.hasLevels && !d.level); });
    if (bad) { alert(`Pick job type and level for #${bad.jobId}.`); return; }
    const date = $('#review-date').value || today();
    const now = new Date().toISOString();
    sel.forEach(d => {
      db.jobs.push({
        id: uid('j'), date, type: d.type, level: d.level, jobId: d.jobId, woCode: d.woCode,
        timeWindow: d.timeWindow, address: d.address, price: d.price || 0, notes: '',
        source: 'scan', createdAt: now, updatedAt: now,
      });
    });
    save();
    closeSheet('#review-sheet');
    curWeek = weekStart(parseISO(date));
    view = 'week';
    render();
    const missingPrice = sel.some(d => d.price == null);
    toast(`${sel.length} jobs added${missingPrice ? ' — some have no price, set it in Settings' : ''}`);
  });

  // ---------- settings ----------

  function openSettings() { renderSettings(); openSheet('#settings-sheet'); }

  function renderSettings() {
    const S = db.settings;
    // rates
    let h = `<div class="rate-row head"><span></span>${S.levels.map(l => `<span>${esc(l.name)}</span>`).join('')}</div>`;
    for (const t of S.jobTypes.filter(t => !t.hidden)) {
      if (t.hasLevels) {
        h += `<div class="rate-row"><span class="name">${esc(t.code)}</span>${S.levels.map(l =>
          `<input inputmode="decimal" placeholder="$" data-rate="${esc(t.code + '|' + l.name)}" value="${centsToInput(S.rates[t.code + '|' + l.name])}" aria-label="${esc(t.code + ' ' + l.name)} price">`).join('')}</div>`;
      } else {
        h += `<div class="rate-row"><span class="name">${esc(t.code)}</span><input inputmode="decimal" placeholder="$ flat price" data-rate="${esc(t.code)}" value="${centsToInput(S.rates[t.code])}" style="grid-column: span ${S.levels.length}" aria-label="${esc(t.code)} price"></div>`;
      }
    }
    $('#rates').innerHTML = h;

    // charges
    $('#charges').innerHTML = S.charges.length ? S.charges.map((c, i) => `<div class="set-row charge">
      <input data-ch="${i}" data-f="name" value="${esc(c.name)}" placeholder="Name">
      <select data-ch="${i}" data-f="kind">
        ${[['oneTime', 'One-time'], ['weekly', '$ / week'], ['perJob', '$ / job'], ['percent', '% of pay']].map(([v, l]) => `<option value="${v}" ${c.kind === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <input data-ch="${i}" data-f="amount" inputmode="decimal" value="${c.kind === 'percent' ? c.amount : centsToInput(c.amount)}" placeholder="${c.kind === 'percent' ? '%' : '$'}">
      <button type="button" class="del" data-ch-del="${i}" aria-label="Delete charge">✕</button>
    </div>`).join('') : `<p class="muted small">No charges yet.</p>`;

    // types
    $('#types').innerHTML = S.jobTypes.map((t, i) => {
      const used = db.jobs.some(j => j.type === t.code);
      return `<div class="set-row type">
        <b>${esc(t.code)}</b>
        <input data-ty="${i}" data-f="name" value="${esc(t.name)}" placeholder="Name">
        <button type="button" class="del" data-ty-del="${i}" ${used ? 'disabled title="Used by jobs — hide it instead"' : ''} aria-label="Delete type">✕</button>
        <div class="sub">
          <label class="chk"><input type="checkbox" data-ty="${i}" data-f="hasLevels" ${t.hasLevels ? 'checked' : ''}>Levels</label>
          <label class="chk"><input type="checkbox" data-ty="${i}" data-f="hidden" ${t.hidden ? 'checked' : ''}>Hidden</label>
          <input type="text" data-ty="${i}" data-f="keywords" value="${esc((t.keywords || []).join(', '))}" placeholder="scan words">
        </div>
      </div>`;
    }).join('');

    // levels
    $('#levels').innerHTML = S.levels.map((l, i) => `<div class="set-row level"><b>${esc(l.name)}</b>
      <input data-lv="${i}" value="${esc((l.keywords || []).join(', '))}" placeholder="e.g. SP"></div>`).join('');

    const lb = db.meta.lastBackup;
    $('#data-info').textContent = `${db.jobs.length} jobs, ${db.expenses.length} expenses saved on this device. Last backup: ${lb ? new Date(lb).toLocaleDateString() : 'never'}.`;
  }

  const splitWords = v => v.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

  $('#settings-sheet').addEventListener('change', e => {
    const el = e.target, S = db.settings;
    if (el.dataset.rate) {
      if (el.value.trim() === '') delete S.rates[el.dataset.rate];
      else S.rates[el.dataset.rate] = toCents(el.value);
      el.value = centsToInput(S.rates[el.dataset.rate]);
    } else if (el.dataset.ch !== undefined) {
      const c = S.charges[+el.dataset.ch], f = el.dataset.f;
      if (f === 'amount') c.amount = c.kind === 'percent' ? (parseFloat(el.value) || 0) : toCents(el.value);
      else if (f === 'kind') {
        const was = c.kind; c.kind = el.value;
        if ((was === 'percent') !== (c.kind === 'percent')) c.amount = 0;
        renderSettings();
      } else c[f] = el.value.trim();
    } else if (el.dataset.ty !== undefined) {
      const t = S.jobTypes[+el.dataset.ty], f = el.dataset.f;
      if (f === 'hasLevels' || f === 'hidden') { t[f] = el.checked; renderSettings(); }
      else if (f === 'keywords') t.keywords = splitWords(el.value);
      else t[f] = el.value.trim();
    } else if (el.dataset.lv !== undefined) {
      S.levels[+el.dataset.lv].keywords = splitWords(el.value);
    } else return;
    save();
    render();
  });

  $('#settings-sheet').addEventListener('click', e => {
    const S = db.settings;
    const chDel = e.target.closest('[data-ch-del]');
    const tyDel = e.target.closest('[data-ty-del]');
    if (chDel) {
      const c = S.charges[+chDel.dataset.chDel];
      if (!confirm(`Delete charge "${c.name || 'unnamed'}"? Deductions already logged stay.`)) return;
      S.charges.splice(+chDel.dataset.chDel, 1);
    } else if (tyDel) {
      const t = S.jobTypes[+tyDel.dataset.tyDel];
      if (!confirm(`Delete job type ${t.code}?`)) return;
      S.jobTypes.splice(+tyDel.dataset.tyDel, 1);
      Object.keys(S.rates).forEach(k => { if (k === t.code || k.startsWith(t.code + '|')) delete S.rates[k]; });
    } else if (e.target.id === 'add-charge') {
      S.charges.push({ id: uid('c'), name: '', kind: 'oneTime', amount: 0 });
    } else if (e.target.id === 'add-type') {
      const code = (prompt('Short code for the new job type (e.g. TC):') || '').trim();
      if (!code) return;
      if (typeOf(code)) { alert('That code already exists.'); return; }
      S.jobTypes.push({ code, name: code, hasLevels: true, keywords: [code.toUpperCase()], hidden: false });
    } else return;
    save(); renderSettings(); render();
  });

  // ---------- data import / export ----------

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

  const actions = {
    'export-json'() {
      db.meta.lastBackup = new Date().toISOString(); save();
      download(`job-tracker-backup-${today()}.json`, JSON.stringify(db, null, 2), 'application/json');
      render(); if ($('#settings-sheet').open) renderSettings();
    },
    'import-json'() { $('#import-file').click(); },
    'export-csv'() {
      const head = ['Date', 'Week start', 'Job ID', 'Type', 'Level', 'Work-order code', 'Time', 'Address', 'Price', 'Notes'];
      const rows = [...db.jobs].sort((a, b) => a.date.localeCompare(b.date)).map(j => [
        j.date, toISO(weekStart(parseISO(j.date))), j.jobId, j.type, j.level || '', j.woCode || '', j.timeWindow || '', j.address, (j.price / 100).toFixed(2), j.notes]);
      const exp = [...db.expenses].sort((a, b) => a.date.localeCompare(b.date)).map(e => [
        e.date, toISO(weekStart(parseISO(e.date))), e.jobId || '', e.kind === 'fuel' ? 'Fuel' : 'Deduction', '', e.name || '', '', '', (-e.amount / 100).toFixed(2), [e.gallons ? e.gallons + ' gal' : '', e.note].filter(Boolean).join(' ')]);
      download(`job-tracker-${today()}.csv`, [head, ...rows, ...exp].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
    },
    wipe() {
      if (!confirm('Delete ALL jobs, expenses and settings on this device? Export a backup first if unsure.')) return;
      if (!confirm('Are you sure? This cannot be undone.')) return;
      db = defaults(); save(); renderSettings(); render(); toast('All data deleted');
    },
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (b && actions[b.dataset.action]) actions[b.dataset.action]();
  });

  $('#import-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.jobs) || !data.settings) throw new Error('Not a Job Tracker backup file.');
      if (!confirm(`Replace current data with backup (${data.jobs.length} jobs, ${(data.expenses || []).length} expenses)?`)) return;
      db = migrate(data); save(); renderSettings(); render(); toast('Backup restored');
    } catch (err) { alert('Import failed: ' + err.message); }
  });

  // ---------- main wiring ----------

  $('#prev-week').addEventListener('click', () => { curWeek = addDays(curWeek, -7); render(); });
  $('#next-week').addEventListener('click', () => { curWeek = addDays(curWeek, 7); render(); });
  $('#open-settings').addEventListener('click', openSettings);
  $('#open-settings-2').addEventListener('click', openSettings);
  $('#btn-add').addEventListener('click', () => {
    const job = null;
    openJob(job);
    // when browsing a past week, default the date into that week
    const thisWs = toISO(weekStart(new Date()));
    if (toISO(curWeek) !== thisWs && view === 'week') $('#job-date').value = toISO(addDays(curWeek, 6));
  });
  $('#btn-fuel').addEventListener('click', () => openExp(null));
  $('#btn-scan').addEventListener('click', () => openSheet('#scan-sheet'));
  $('#btn-stats').addEventListener('click', () => { view = view === 'stats' ? 'week' : 'stats'; render(); window.scrollTo(0, 0); });
  $('#stats-periods').addEventListener('click', e => {
    const b = e.target.closest('[data-period]'); if (!b) return;
    statsPeriod = b.dataset.period; renderStats();
  });
  $('#week-list').addEventListener('click', e => {
    const j = e.target.closest('[data-job]');
    const x = e.target.closest('[data-exp]');
    if (j) openJob(db.jobs.find(o => o.id === j.dataset.job));
    else if (x) openExp(db.expenses.find(o => o.id === x.dataset.exp));
  });

  // refresh "This week" when the app is reopened on a new day
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  render();
  if (!Object.keys(db.settings.rates).length && !db.jobs.length) {
    setTimeout(() => toast('Start by setting your prices in ⚙ Settings'), 400);
  }
})();
