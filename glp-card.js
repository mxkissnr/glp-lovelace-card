const GLP_CARD_VERSION = '2.0.0';

// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function safeUrl(url) {
  if (!url) return null;
  try { const u = new URL(url); return (u.protocol==='http:'||u.protocol==='https:') ? url : null; }
  catch { return null; }
}

function parseTs(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') return new Date(val > 1e10 ? val : val * 1000);
  return new Date(val);
}

function downsample(arr, maxPts) {
  if (!arr || arr.length <= maxPts) return arr || [];
  const step = Math.ceil(arr.length / maxPts);
  const out  = arr.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function svgPoints(arr, vmin, vmax, W, H) {
  if (!arr || arr.length < 2) return null;
  const range = vmax - vmin || 1;
  return arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * W;
    const y = H - 2 - ((Math.max(vmin, Math.min(vmax, v)) - vmin) / range) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function buildShotChart(pres, temp, wt) {
  const W = 300, H = 60;
  const p = downsample(pres || [], 150);
  const t = downsample(temp || [], 150);
  const w = downsample(wt   || [], 150);
  const polyline = (pts, color) => pts
    ? `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';
  const grid = [25, 50, 75].map(pct =>
    `<line x1="0" y1="${(H * pct / 100).toFixed(1)}" x2="${W}" y2="${(H * pct / 100).toFixed(1)}" stroke="rgba(255,255,255,.06)" stroke-width="0.5"/>`
  ).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;border-radius:8px;overflow:hidden" preserveAspectRatio="none">
    <rect width="${W}" height="${H}" fill="rgba(255,255,255,.03)"/>
    ${grid}
    ${polyline(svgPoints(t, 700, 1050, W, H), '#f59e0b')}
    ${polyline(svgPoints(w, 0,   500,  W, H), '#22c55e')}
    ${polyline(svgPoints(p, 0,   120,  W, H), '#ef4444')}
  </svg>`;
}

function buildLiveChart(dp) {
  return buildShotChart(dp.pressure || [], dp.temperature || [], dp.shotWeight || dp.weight || []);
}

// ─── styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  :host {
    --glp-bg:     var(--card-background-color, #1c1c1e);
    --glp-border: var(--divider-color, rgba(255,255,255,.1));
    --glp-text:   var(--primary-text-color, #f5f5f5);
    --glp-sub:    var(--secondary-text-color, #8e8e93);
    --glp-accent: #ef4444;
    --glp-green:  #22c55e;
    --glp-amber:  #f59e0b;
    --glp-surface: rgba(255,255,255,.05);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .card {
    background: var(--glp-bg);
    border-radius: 12px;
    padding: 16px;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--glp-text);
    overflow: hidden;
    user-select: none;
  }

  /* ── header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: .9rem;
    font-weight: 600;
    color: var(--glp-sub);
    letter-spacing: .03em;
  }
  .title svg { opacity: .6; flex-shrink: 0; }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--glp-border);
    flex-shrink: 0;
  }
  .status-dot.online  { background: var(--glp-green); box-shadow: 0 0 8px var(--glp-green); }
  .status-dot.brewing { background: var(--glp-accent); animation: pulse 1.2s infinite; }
  .status-dot.error   { background: var(--glp-accent); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ── power button ── */
  .power-btn {
    background: none;
    border: 1.5px solid var(--glp-border);
    border-radius: 10px;
    padding: 8px 12px;
    min-height: 40px;
    cursor: pointer;
    color: var(--glp-sub);
    display: flex;
    align-items: center;
    transition: color .15s, border-color .15s, background .15s;
    touch-action: manipulation;
  }
  .power-btn:active { background: var(--glp-surface); }
  .power-btn.is-on  { color: var(--glp-green); border-color: rgba(34,197,94,.35); }
  .power-btn.is-off { color: var(--glp-sub); }
  .off-label { font-size: .75rem; color: var(--glp-sub); letter-spacing: .02em; }
  .card.collapsed .header { margin-bottom: 0; }

  /* ── tabs ── */
  .tab-bar {
    display: flex;
    gap: 3px;
    margin-bottom: 14px;
    background: rgba(255,255,255,.06);
    border-radius: 10px;
    padding: 3px;
  }
  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    border-radius: 8px;
    padding: 8px 0;
    min-height: 38px;
    color: var(--glp-sub);
    font-family: inherit;
    font-size: .78rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s, color .15s;
    touch-action: manipulation;
    letter-spacing: .01em;
  }
  .tab-btn.active {
    background: var(--glp-bg);
    color: var(--glp-text);
    box-shadow: 0 1px 4px rgba(0,0,0,.3);
  }

  /* ── swipe area ── */
  .swipe-target { touch-action: pan-y; }

  /* ── dot navigation ── */
  .nav-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .nav-arrow {
    background: none;
    border: 1.5px solid var(--glp-border);
    border-radius: 8px;
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    cursor: pointer;
    color: var(--glp-text);
    font-size: 1.1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color .15s, background .15s;
    touch-action: manipulation;
  }
  .nav-arrow:active:not([disabled]) { background: var(--glp-surface); }
  .nav-arrow[disabled] { opacity: .2; cursor: default; pointer-events: none; }
  .nav-dots {
    display: flex;
    gap: 5px;
    align-items: center;
    flex: 1;
    justify-content: center;
    padding: 4px 0;
  }
  .nav-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,.2);
    transition: background .2s, transform .2s;
    flex-shrink: 0;
  }
  .nav-dot.active {
    background: var(--glp-text);
    transform: scale(1.4);
  }
  .nav-ts {
    font-size: .7rem;
    color: var(--glp-sub);
    text-align: center;
    margin-bottom: 8px;
    opacity: .8;
  }

  /* ── shot info ── */
  .shot-profile {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .shot-coffee {
    font-size: .78rem;
    color: var(--glp-sub);
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── stats grid ── */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 7px;
    margin-bottom: 12px;
  }
  .stat {
    background: var(--glp-surface);
    border-radius: 10px;
    padding: 9px 8px;
    text-align: center;
  }
  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.1;
  }
  .stat-label {
    font-size: .65rem;
    color: var(--glp-sub);
    margin-top: 3px;
    letter-spacing: .02em;
  }
  .score-value     { color: var(--glp-green); }
  .score-value.mid { color: var(--glp-amber); }
  .score-value.low { color: var(--glp-accent); }

  /* ── chart ── */
  .live-chart { margin-bottom: 6px; }
  .chart-legend {
    display: flex;
    gap: 14px;
    justify-content: center;
    margin-top: 4px;
    margin-bottom: 8px;
  }
  .chart-legend span {
    font-size: .67rem;
    color: var(--glp-sub);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .chart-legend span::before {
    content: '';
    display: inline-block;
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }
  .l-pres::before { background: #ef4444; }
  .l-temp::before { background: #f59e0b; }
  .l-wt::before   { background: #22c55e; }

  /* ── profile picker ── */
  .profile-picker { margin-bottom: 12px; }
  .profile-current-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--glp-surface);
    border: 1.5px solid var(--glp-border);
    border-radius: 10px;
    padding: 10px 14px;
    min-height: 44px;
    cursor: pointer;
    color: var(--glp-text);
    font-family: inherit;
    font-size: .88rem;
    font-weight: 600;
    touch-action: manipulation;
    transition: border-color .15s, background .15s;
  }
  .profile-current-btn:active { background: rgba(255,255,255,.08); }
  .profile-current-btn.open   { border-color: rgba(255,255,255,.25); border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
  .profile-label-small { font-size: .65rem; color: var(--glp-sub); font-weight: 400; letter-spacing: .03em; }
  .profile-current-name { flex: 1; text-align: left; margin-top: 1px; }
  .profile-chevron { color: var(--glp-sub); font-size: .75rem; margin-left: 8px; transition: transform .2s; }
  .profile-chevron.open { transform: rotate(180deg); }
  .profile-opts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
    background: var(--glp-surface);
    border: 1.5px solid rgba(255,255,255,.2);
    border-top: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }
  .profile-opt {
    background: rgba(255,255,255,.06);
    border: 1.5px solid var(--glp-border);
    border-radius: 20px;
    padding: 6px 14px;
    min-height: 34px;
    cursor: pointer;
    color: var(--glp-text);
    font-family: inherit;
    font-size: .8rem;
    font-weight: 500;
    touch-action: manipulation;
    transition: background .15s, border-color .15s;
    white-space: nowrap;
  }
  .profile-opt:active  { background: rgba(255,255,255,.12); }
  .profile-opt.active  {
    background: rgba(239,68,68,.15);
    border-color: rgba(239,68,68,.5);
    color: #ef4444;
    font-weight: 700;
  }

  /* ── banners ── */
  .brewing-banner {
    background: rgba(239,68,68,.1);
    border: 1.5px solid rgba(239,68,68,.3);
    border-radius: 10px;
    padding: 8px 14px;
    font-size: .82rem;
    font-weight: 600;
    color: var(--glp-accent);
    text-align: center;
    margin-bottom: 10px;
    letter-spacing: .04em;
  }
  .steam-banner {
    background: rgba(245,158,11,.08);
    border: 1.5px solid rgba(245,158,11,.25);
    border-radius: 10px;
    padding: 7px 14px;
    font-size: .82rem;
    font-weight: 600;
    color: var(--glp-amber);
    text-align: center;
    margin-bottom: 12px;
  }
  .water-low {
    background: rgba(239,68,68,.07);
    border: 1.5px solid rgba(239,68,68,.2);
    border-radius: 10px;
    padding: 6px 14px;
    font-size: .78rem;
    font-weight: 600;
    color: var(--glp-accent);
    text-align: center;
    margin-bottom: 12px;
  }
  .live-stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    gap: 6px;
    margin-bottom: 12px;
  }
  .live-stat {
    background: rgba(239,68,68,.06);
    border: 1.5px solid rgba(239,68,68,.15);
    border-radius: 10px;
    padding: 8px;
    text-align: center;
  }
  .live-stat .stat-value { font-size: .92rem; }

  /* ── preheat ── */
  .preheat-section { margin-bottom: 12px; }
  .preheat-ready {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: rgba(34,197,94,.08); border: 1.5px solid rgba(34,197,94,.3);
    color: #22c55e; border-radius: 10px; padding: 10px 14px;
    font-size: .85rem; font-weight: 600; letter-spacing: .03em;
  }
  .preheat-warming { display: flex; flex-direction: column; gap: 5px; }
  .preheat-warming-label {
    display: flex; justify-content: space-between; align-items: center;
    font-size: .75rem; color: var(--glp-sub);
  }
  .preheat-bar-bg {
    height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden;
  }
  .preheat-bar-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    transition: width .8s ease;
  }

  /* ── maintenance ── */
  .maint-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .maint-row {
    display: flex; flex-direction: column; gap: 5px;
    background: var(--glp-surface); border-radius: 10px; padding: 10px 12px;
  }
  .maint-row-top { display: flex; align-items: center; gap: 8px; }
  .maint-name {
    flex: 1; font-size: .82rem; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .maint-pill {
    font-size: .65rem; font-weight: 700; padding: 2px 9px;
    border-radius: 10px; white-space: nowrap;
  }
  .maint-pill.ok    { color: #22c55e; background: rgba(34,197,94,.12); }
  .maint-pill.soon  { color: #f59e0b; background: rgba(245,158,11,.12); }
  .maint-pill.due   { color: #ef4444; background: rgba(239,68,68,.12); }
  .maint-pill.never { color: var(--glp-sub); background: rgba(255,255,255,.07); }
  .maint-sub { font-size: .68rem; color: var(--glp-sub); }
  .maint-bar-bg { height: 3px; background: rgba(255,255,255,.07); border-radius: 2px; overflow: hidden; }
  .maint-bar { height: 100%; border-radius: 2px; }
  .maint-bar.ok    { background: #22c55e; }
  .maint-bar.soon  { background: #f59e0b; }
  .maint-bar.due   { background: #ef4444; }
  .maint-bar.never { background: rgba(255,255,255,.15); }
  .maint-section-label {
    font-size: .67rem; color: var(--glp-sub); font-weight: 600;
    letter-spacing: .07em; text-transform: uppercase; margin-top: 2px;
  }

  /* ── footer ── */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: .72rem;
    color: var(--glp-sub);
    border-top: 1px solid var(--glp-border);
    padding-top: 10px;
    margin-top: 4px;
    gap: 8px;
  }
  .footer a { color: var(--glp-sub); text-decoration: none; }
  .footer a:hover { color: var(--glp-text); }
  .footer-center { flex: 1; text-align: center; }

  /* ── misc ── */
  .unavailable {
    color: var(--glp-sub); font-size: .85rem;
    text-align: center; padding: 16px 0;
  }

  /* ── touch-specific: larger targets on coarse-pointer devices ── */
  @media (pointer: coarse) {
    .card { padding: 16px 14px; }
    .nav-arrow { min-width: 44px; min-height: 44px; border-radius: 10px; font-size: 1.25rem; }
    .nav-dot   { width: 7px; height: 7px; }
    .tab-btn   { min-height: 44px; font-size: .82rem; }
    .profile-current-btn { min-height: 48px; font-size: .9rem; }
    .profile-opt { min-height: 40px; padding: 8px 16px; font-size: .85rem; }
    .power-btn { min-height: 44px; padding: 10px 14px; }
    .stat { padding: 10px 8px; }
    .stat-value { font-size: 1.05rem; }
  }
`;

// ─── card element ──────────────────────────────────────────────────────────────

class GlpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._profileInteracting = false;
    this._profileOpen  = false;
    this._shotIndex    = 0;
    this._recentShots  = [];
    this._lastLatestId = null;
    this._activeTab    = 'shot';
    // Persist switch entity across page loads — once found, keep it even when
    // machine_status sensor goes unavailable (which clears HA attributes).
    this._switchEntity = localStorage.getItem('glp_switch_entity') || null;
  }

  // ── event bindings ───────────────────────────────────────────────────────

  _bindPowerBtn() {
    const btn = this.shadowRoot.querySelector('[data-action="toggle-switch"]');
    if (!btn) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (this._hass && this._switchEntity)
        this._hass.callService('switch', 'toggle', { entity_id: this._switchEntity });
    });
  }

  _bindProfilePicker() {
    const toggle = this.shadowRoot.querySelector('[data-action="toggle-profile"]');
    if (toggle) {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        this._profileOpen = !this._profileOpen;
        this._profileInteracting = this._profileOpen;
        this._render();
      });
    }
    this.shadowRoot.querySelectorAll('[data-profile-opt]').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        const val = e.currentTarget.dataset.profileOpt;
        if (this._hass) {
          const entityId = this._resolvePrefix().replace(/^sensor\./, 'select.') + 'profile';
          this._hass.callService('select', 'select_option', { entity_id: entityId, option: val });
        }
        this._profileOpen = false;
        this._profileInteracting = false;
        this._render();
      });
    });
  }

  _bindTabBtns() {
    this.shadowRoot.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.dataset.tab;
        if (tab !== this._activeTab) { this._activeTab = tab; this._render(); }
      });
    });
  }

  _bindNavBtns() {
    this.shadowRoot.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', e => {
        this._navShot(e.currentTarget.dataset.nav);
      });
    });
  }

  _bindSwipe() {
    const el = this.shadowRoot.querySelector('.swipe-target');
    if (!el) return;
    let sx = 0, sy = 0;
    el.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (this._profileOpen) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      // swipe right → newer shot (next), swipe left → older (prev)
      this._navShot(dx > 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  _navShot(dir) {
    const max = this._recentShots.length - 1;
    if (dir === 'prev' && this._shotIndex < max) { this._shotIndex++; this._render(); }
    if (dir === 'next' && this._shotIndex > 0)   { this._shotIndex--; this._render(); }
  }

  // ── HA interface ─────────────────────────────────────────────────────────

  setConfig(config) {
    this._config = { glp_url: null, title: 'Gaggiuino', ...config };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._profileInteracting) this._render();
  }

  // ── entity helpers ───────────────────────────────────────────────────────

  _resolvePrefix() {
    if (this._config.entity_prefix) return this._config.entity_prefix;
    const found = Object.keys(this._hass.states)
      .find(id => id.endsWith('_machine_status') &&
        this._hass.states[id].attributes.friendly_name?.toLowerCase().includes('gaggiuino'));
    if (found) return found.replace(/machine_status$/, '');
    const fallback = Object.keys(this._hass.states).find(id => id.endsWith('_machine_status'));
    return fallback ? fallback.replace(/machine_status$/, '') : 'sensor.gaggiuino_local_profiler_';
  }

  _s(suffix) { return this._hass.states[this._resolvePrefix() + suffix]; }

  _val(suffix, fallback = '—') {
    const s = this._s(suffix);
    return s && s.state !== 'unknown' && s.state !== 'unavailable' ? s.state : fallback;
  }

  _num(suffix, decimals = 1, fallback = '—') {
    const v = this._val(suffix, null);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n.toFixed(decimals);
  }

  _reltime(suffix) {
    const s = this._s(suffix);
    if (!s || s.state === 'unknown' || s.state === 'unavailable') return null;
    const diff = Math.round((Date.now() - new Date(s.state).getTime()) / 60000);
    if (diff < 1) return 'gerade eben';
    if (diff < 60) return `vor ${diff} Min`;
    const h = Math.round(diff / 60);
    if (h < 24) return `vor ${h} Std`;
    return `vor ${Math.round(h / 24)} Tagen`;
  }

  // ── maintenance ──────────────────────────────────────────────────────────

  static MAINT_TASKS = [
    ['maintenance_descaling',    'Entkalken',          '🧪'],
    ['maintenance_backflush',    'Backflush',          '🔄'],
    ['maintenance_group_head',   'Gruppenkopf',        '🚿'],
    ['maintenance_gaskets',      'Dichtungen & Siebe', '⭕'],
    ['maintenance_water_filter', 'Wasserfilter',       '💧'],
  ];

  _maintAvailable() {
    return GlpCard.MAINT_TASKS.some(([suffix]) => this._s(suffix))
      || !!this._s('maintenance_grinders');
  }

  _maintAnyDue() {
    if (GlpCard.MAINT_TASKS.some(([suffix]) => this._s(suffix)?.state === 'due')) return true;
    return this._s('maintenance_grinders')?.state === 'due';
  }

  _buildMaintHtml() {
    const pills = { ok: '✓ OK', soon: 'Bald fällig', due: '⚠ Fällig', never: 'Nie erledigt' };
    const row = (icon, name, status, pct, daysSince, shotsSince) => {
      const cls  = pills[status] ? status : 'never';
      const pctW = Math.max(0, Math.min(100, Math.round((parseFloat(pct) || 0) * 100)));
      const sub  = [
        daysSince != null ? (daysSince === 0 ? 'heute' : `vor ${daysSince} Tagen`) : null,
        shotsSince != null && shotsSince > 0 ? `${shotsSince} Shots` : null,
      ].filter(Boolean).join(' · ');
      return `<div class="maint-row">
        <div class="maint-row-top">
          <span>${icon}</span>
          <span class="maint-name">${esc(name)}</span>
          <span class="maint-pill ${cls}">${pills[status] || '—'}</span>
        </div>
        ${sub ? `<div class="maint-sub">${esc(sub)}</div>` : ''}
        <div class="maint-bar-bg"><div class="maint-bar ${cls}" style="width:${pctW}%"></div></div>
      </div>`;
    };
    const rows = GlpCard.MAINT_TASKS.map(([suffix, name, icon]) => {
      const s = this._s(suffix);
      if (!s || s.state === 'unavailable' || s.state === 'unknown') return '';
      const a = s.attributes || {};
      return row(icon, name, s.state, a.pct, a.days_since, a.shots_since);
    }).filter(Boolean);
    const gAttrs = this._s('maintenance_grinders')?.attributes || {};
    const gRows  = Object.entries(gAttrs)
      .filter(([, v]) => v && typeof v === 'object' && 'status' in v)
      .map(([name, v]) => row('⚙️', name, v.status, v.pct, v.days_since, v.shots_since));
    if (!rows.length && !gRows.length)
      return `<div class="unavailable">Keine Wartungsdaten verfügbar</div>`;
    return `<div class="maint-list">
      ${rows.join('')}
      ${gRows.length ? `<div class="maint-section-label">Mühlen</div>${gRows.join('')}` : ''}
    </div>`;
  }

  // ── render ───────────────────────────────────────────────────────────────

  _render() {
    if (!this._hass || !this._config) return;

    const prefix    = this._resolvePrefix();
    const bsPrefix  = prefix.replace(/^sensor\./, 'binary_sensor.');
    const selPrefix = prefix.replace(/^sensor\./, 'select.');

    // ── machine off? (cached switch entity) ──────────────────────────────
    // machine_status attributes are empty when the sensor is unavailable,
    // so we persist the switch entity in localStorage to survive page reloads
    // when the machine is already off on first load.
    const resolvedSwitch = this._config.switch_entity
      || this._s('machine_status')?.attributes?.switch_entity
      || null;
    if (resolvedSwitch && resolvedSwitch !== this._switchEntity) {
      this._switchEntity = resolvedSwitch;
      localStorage.setItem('glp_switch_entity', resolvedSwitch);
    }
    const switchState = this._switchEntity ? this._hass.states[this._switchEntity] : null;
    const machineOff  = !!(this._switchEntity && (switchState?.state === 'off' || switchState?.state === 'unavailable'));

    const _powerBtn = this._switchEntity ? `
      <button class="power-btn ${machineOff ? 'is-off' : 'is-on'}" data-action="toggle-switch"
              title="${machineOff ? 'Einschalten' : 'Ausschalten'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.28 1.09-4.3 2.58-5.42L6.17 5.17A8.932 8.932 0 0 0 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9A8.932 8.932 0 0 0 17.83 5.17z"/>
        </svg>
      </button>` : '';

    const _titleHtml = `
      <div class="title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 21v-2h2V3h14v2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v6h2v2H2zm4-2h8V5H6v14zm10-6h2V7h-2v6z"/>
        </svg>
        ${esc(this._config.title)}
      </div>`;

    if (machineOff) {
      this._profileOpen = false;
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <ha-card>
          <div class="card collapsed">
            <div class="header">
              ${_titleHtml}
              <div class="header-right">
                <span class="off-label">Aus</span>
                ${_powerBtn}
              </div>
            </div>
          </div>
        </ha-card>`;
      this._bindPowerBtn();
      return;
    }

    // ── recent shots ──────────────────────────────────────────────────────
    const machineStatusEnt = this._s('machine_status');
    const freshShots = machineStatusEnt?.attributes?.recent_shots;
    if (Array.isArray(freshShots) && freshShots.length > 0) {
      const latestId = freshShots[0]?.id;
      if (latestId !== undefined && latestId !== this._lastLatestId) {
        this._lastLatestId = latestId;
        this._shotIndex    = 0;
      }
      this._recentShots = freshShots;
    }
    if (this._shotIndex >= this._recentShots.length)
      this._shotIndex = Math.max(0, this._recentShots.length - 1);

    const totalShots = this._recentShots.length;
    const shotObj    = (this._shotIndex > 0 && this._shotIndex < totalShots)
      ? this._recentShots[this._shotIndex] : null;

    // ── brewing ───────────────────────────────────────────────────────────
    const brewingEnt     = this._hass.states[bsPrefix + 'brewing'];
    const brewing        = brewingEnt?.state === 'on';
    const liveDatapoints = brewingEnt?.attributes?.datapoints || null;
    const liveProfile    = brewingEnt?.attributes?.profile_name || null;
    const steamOn        = !!(this._hass.states[bsPrefix + 'steam_switch']?.state === 'on');
    const tArr           = liveDatapoints?.timeInShot;
    const elapsedSec     = tArr?.length ? Math.round(tArr[tArr.length - 1] / 10) : null;

    // ── shot data ─────────────────────────────────────────────────────────
    const profile  = shotObj?.profile  ?? this._val('last_shot_profile',    null);
    const coffee   = shotObj?.coffee   ?? this._val('last_shot_coffee',     null);
    const duration = shotObj != null
      ? (shotObj.duration != null ? shotObj.duration.toFixed(1) : null)
      : this._num('last_shot_duration', 1, null);
    const weight = shotObj != null
      ? (shotObj.yield_g  != null ? shotObj.yield_g.toFixed(1)  : null)
      : this._num('last_shot_yield',    1, null);
    const ratio = shotObj != null
      ? (shotObj.ratio    != null ? shotObj.ratio.toFixed(2)    : null)
      : this._num('last_shot_brew_ratio', 2, null);
    const pressure = shotObj != null
      ? (shotObj.pressure != null ? shotObj.pressure.toFixed(2) : null)
      : this._num('last_shot_avg_pressure', 2, null);
    const rating = shotObj != null
      ? (shotObj.rating || null)
      : (() => { const v = parseInt(this._val('last_shot_rating', null)); return (!isNaN(v) && v >= 1 && v <= 5) ? v : null; })();

    // ── temps & live ──────────────────────────────────────────────────────
    const temp        = this._num('machine_temperature',        1, null);
    const targetTemp  = this._num('machine_target_temperature', 1, null);
    const livePressure = this._num('machine_live_pressure', 1, null);
    const liveWeight   = this._num('machine_live_weight',   1, null);
    const waterLevel   = (() => {
      const v = parseFloat(this._val('machine_water_level', null));
      return isNaN(v) ? null : Math.round(v);
    })();

    // ── preheat ───────────────────────────────────────────────────────────
    const preheatReady     = (() => {
      const s = this._hass.states[bsPrefix + 'preheat_ready'];
      return s ? s.state === 'on' : null;
    })();
    const preheatRemaining = parseFloat(this._val('preheat_remaining', null));
    const preheatElapsed   = parseFloat(this._val('preheat_elapsed',   null));
    const preheatTotal     = (isNaN(preheatRemaining) || isNaN(preheatElapsed))
      ? null : preheatElapsed + preheatRemaining;
    const preheatPct       = (preheatTotal && preheatTotal > 0)
      ? Math.min(1, preheatElapsed / preheatTotal) : null;
    const preheatMinLeft   = isNaN(preheatRemaining) ? null : Math.ceil(preheatRemaining / 60);

    // ── profile picker ────────────────────────────────────────────────────
    const profileEntity  = this._hass.states[selPrefix + 'profile'];
    const profileOptions = profileEntity?.attributes?.options || null;
    const currentProfile = (profileEntity?.state && profileEntity.state !== 'unavailable')
      ? profileEntity.state : null;
    const profileAvailable = Array.isArray(profileOptions) && profileOptions.length > 0;

    // ── status + misc ─────────────────────────────────────────────────────
    const status   = this._val('machine_status', null);
    const dotClass = brewing ? 'brewing' : status === 'online' ? 'online' : status === 'error' ? 'error' : '';
    const today    = this._val('shots_today', '—');
    const syncTime = this._reltime('last_sync');
    const glpUrl   = safeUrl(this._config.glp_url);

    // ── maintenance tab ───────────────────────────────────────────────────
    const maintAvailable = this._maintAvailable();
    if (brewing && this._activeTab === 'maint') this._activeTab = 'shot';
    const showMaint  = maintAvailable && !brewing && this._activeTab === 'maint';
    const tabBarHtml = maintAvailable && !brewing ? `
      <div class="tab-bar">
        <button class="tab-btn${!showMaint ? ' active' : ''}" data-tab="shot">☕ Shot</button>
        <button class="tab-btn${showMaint ? ' active' : ''}" data-tab="maint">🔧 Wartung${this._maintAnyDue() ? ' ⚠' : ''}</button>
      </div>` : '';

    // ── dot nav ───────────────────────────────────────────────────────────
    const showNav = !brewing && !showMaint && totalShots > 1;
    let navHtml = '';
    if (showNav) {
      const dots = this._recentShots.slice(0, 10).map((_, i) =>
        `<span class="nav-dot${i === this._shotIndex ? ' active' : ''}"></span>`
      ).join('');
      const prevDis = this._shotIndex >= totalShots - 1 ? ' disabled' : '';
      const nextDis = this._shotIndex <= 0              ? ' disabled' : '';
      let tsLine = '';
      if (shotObj?.ts) {
        const d = parseTs(shotObj.ts);
        if (d && !isNaN(d))
          tsLine = `<div class="nav-ts">${d.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'2-digit'})} ${d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}</div>`;
      }
      navHtml = `
        <div class="nav-wrap">
          <button class="nav-arrow" data-nav="next"${nextDis}>‹</button>
          <div class="nav-dots">${dots}</div>
          <button class="nav-arrow" data-nav="prev"${prevDis}>›</button>
        </div>${tsLine}`;
    }

    // ── profile picker HTML ───────────────────────────────────────────────
    const profileHtml = !brewing && !showMaint && profileAvailable ? `
      <div class="profile-picker">
        <button class="profile-current-btn${this._profileOpen ? ' open' : ''}" data-action="toggle-profile">
          <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px">
            <span class="profile-label-small">Profil</span>
            <span class="profile-current-name">${esc(currentProfile || '—')}</span>
          </div>
          <span class="profile-chevron${this._profileOpen ? ' open' : ''}">▾</span>
        </button>
        ${this._profileOpen ? `<div class="profile-opts">
          ${profileOptions.map(p => `
            <button class="profile-opt${p === currentProfile ? ' active' : ''}" data-profile-opt="${esc(p)}">${esc(p)}</button>
          `).join('')}
        </div>` : ''}
      </div>` : '';

    // ── stats ─────────────────────────────────────────────────────────────
    const statTiles = [
      duration   !== null ? { v: `${duration}s`,   l: 'Dauer' }   : null,
      weight     !== null ? { v: `${weight}g`,      l: 'Ausbeute' } : null,
      ratio      !== null ? { v: `1:${ratio}`,      l: 'Ratio' }   : null,
      pressure   !== null ? { v: `${pressure}b`,    l: 'Druck Ø' } : null,
      temp       !== null ? { v: `${temp}°`,        l: 'Temp' }    : null,
      targetTemp !== null ? { v: `${targetTemp}°`,  l: 'Ziel' }    : null,
    ].filter(Boolean);

    const ratingHtml = (() => {
      if (!rating || rating < 1 || rating > 5) return '';
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const cls   = rating >= 4 ? 'score-value' : rating >= 3 ? 'score-value mid' : 'score-value low';
      return `<div class="stat"><div class="stat-value ${cls}" style="font-size:.85rem">${stars}</div><div class="stat-label">Bewertung</div></div>`;
    })();

    // ── charts ────────────────────────────────────────────────────────────
    const chartLegend = `<div class="chart-legend">
      <span class="l-pres">Druck</span>
      <span class="l-temp">Temp</span>
      <span class="l-wt">Gewicht</span>
    </div>`;
    const liveSvgHtml = brewing && liveDatapoints
      ? `<div class="live-chart">${buildLiveChart(liveDatapoints)}${chartLegend}</div>` : '';
    const histDp = !brewing && this._recentShots.length > 0
      ? this._recentShots[this._shotIndex]?.dp || null : null;
    const histSvgHtml = histDp
      ? `<div class="live-chart">${buildShotChart(histDp.p||[],histDp.t||[],histDp.w||[])}${chartLegend}</div>` : '';

    const liveStatsHtml = brewing && (temp !== null || livePressure !== null || liveWeight !== null)
      ? `<div class="live-stats">
          ${temp         !== null ? `<div class="live-stat"><div class="stat-value">${temp}°</div><div class="stat-label">Temp</div></div>` : ''}
          ${livePressure !== null ? `<div class="live-stat"><div class="stat-value">${livePressure}b</div><div class="stat-label">Druck</div></div>` : ''}
          ${liveWeight   !== null ? `<div class="live-stat"><div class="stat-value">${liveWeight}g</div><div class="stat-label">Gewicht</div></div>` : ''}
        </div>` : '';

    const waterBadge = waterLevel !== null
      ? `<span class="footer-center">💧 ${waterLevel}%</span>`
      : '<span class="footer-center"></span>';

    // ── assemble ──────────────────────────────────────────────────────────
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="card">

          <div class="header">
            ${_titleHtml}
            <div class="header-right">
              <div class="status-dot ${dotClass}"></div>
              ${_powerBtn}
            </div>
          </div>

          ${tabBarHtml}

          ${steamOn && !brewing ? `<div class="steam-banner">☁️ Dampfmodus</div>` : ''}

          ${waterLevel !== null && waterLevel < 20
            ? `<div class="water-low">💧 Wasser fast leer (${waterLevel}%)</div>` : ''}

          ${!brewing && !showMaint && preheatReady !== null ? `
            <div class="preheat-section">
              ${preheatReady
                ? `<div class="preheat-ready">☕ Brühbereit</div>`
                : preheatPct !== null ? `
                  <div class="preheat-warming">
                    <div class="preheat-warming-label">
                      <span>🔥 Aufheizen …</span>
                      <span>${preheatMinLeft !== null ? `${preheatMinLeft} min` : ''}</span>
                    </div>
                    <div class="preheat-bar-bg">
                      <div class="preheat-bar-fill" style="width:${Math.round(preheatPct * 100)}%"></div>
                    </div>
                  </div>` : ''}
            </div>` : ''}

          ${profileHtml}

          <div class="swipe-target">
            ${brewing ? `
              <div class="brewing-banner">⏳ Bezug läuft${elapsedSec !== null ? ` … ${elapsedSec}s` : ' …'}</div>
              ${liveProfile ? `<div class="shot-profile" style="margin-bottom:8px">${esc(liveProfile)}</div>` : ''}
              ${liveSvgHtml}
              ${liveStatsHtml}
            ` : showMaint ? this._buildMaintHtml() : `
              ${navHtml}
              ${profile
                ? `<div class="shot-profile">${esc(profile)}</div>
                   ${coffee ? `<div class="shot-coffee">☕ ${esc(coffee)}</div>` : '<div style="margin-bottom:12px"></div>'}`
                : `<div class="unavailable">Noch kein Shot aufgezeichnet</div>`}
              ${statTiles.length ? `
                <div class="stats">
                  ${ratingHtml}
                  ${statTiles.map(s => `<div class="stat"><div class="stat-value">${s.v}</div><div class="stat-label">${s.l}</div></div>`).join('')}
                </div>` : ''}
              ${histSvgHtml}
            `}
          </div>

          <div class="footer">
            <span>Heute: ${today} Shot${today !== '1' ? 's' : ''}</span>
            ${waterBadge}
            <span style="text-align:right">
              ${syncTime ? `Sync ${syncTime}` : ''}
              ${glpUrl ? `${syncTime ? ' · ' : ''}<a href="${glpUrl}" target="_blank">GLP ↗</a>` : ''}
            </span>
          </div>

        </div>
      </ha-card>
    `;

    this._bindPowerBtn();
    this._bindProfilePicker();
    this._bindTabBtns();
    this._bindNavBtns();
    this._bindSwipe();
  }

  getCardSize() { return 3; }

  static getConfigElement() { return document.createElement('glp-card-editor'); }

  static getStubConfig() {
    return { entity_prefix: 'sensor.gaggiuino_local_profiler_' };
  }
}

customElements.define('glp-card', GlpCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:             'glp-card',
  name:             'GLP Shot Card',
  description:      'Shows the last espresso shot from Gaggiuino Local Profiler',
  preview:          false,
  documentationURL: 'https://github.com/mxkissnr/glp-lovelace-card',
});

console.info(`%c GLP-CARD %c v${GLP_CARD_VERSION} `, 'background:#ef4444;color:#fff;padding:2px 4px;border-radius:3px 0 0 3px', 'background:#1c1c1e;color:#ef4444;padding:2px 4px;border-radius:0 3px 3px 0');
