const GLP_CARD_VERSION = '2.6.0';

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
    const y = H - 3 - ((Math.max(vmin, Math.min(vmax, v)) - vmin) / range) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function autoRange(arr, type) {
  if (!arr || arr.length === 0) return [0, 1];
  const max = Math.max(...arr);
  if (type === 'temp')     return max > 200 ? [700, 1050] : [70, 105];
  if (type === 'pressure') return max > 20  ? [0,   120]  : [0,  12];
  return                          max > 100 ? [0,   500]  : [0,  50];
}

function buildShotChart(pres, temp, wt) {
  const W = 300, H = 72;
  const p = downsample(pres || [], 150);
  const t = downsample(temp || [], 150);
  const w = downsample(wt   || [], 150);
  const [pMin, pMax] = autoRange(p, 'pressure');
  const [tMin, tMax] = autoRange(t, 'temp');
  const [wMin, wMax] = autoRange(w, 'weight');
  const poly = (pts, color) => pts
    ? `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" filter="url(#g${color.replace('#','')})"/>`
    : '';
  const defGlow = (id) =>
    `<filter id="g${id}" x="-20%" y="-20%" width="140%" height="140%">
       <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
       <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"
      style="display:block;border-radius:10px;overflow:hidden" preserveAspectRatio="none">
    <defs>
      ${defGlow('ef4444')}
      ${defGlow('f59e0b')}
      ${defGlow('22c55e')}
    </defs>
    <rect width="${W}" height="${H}" fill="rgba(255,255,255,.03)"/>
    <line x1="0" y1="${H*0.33}" x2="${W}" y2="${H*0.33}" stroke="rgba(255,255,255,.04)" stroke-width="0.5"/>
    <line x1="0" y1="${H*0.66}" x2="${W}" y2="${H*0.66}" stroke="rgba(255,255,255,.04)" stroke-width="0.5"/>
    ${poly(svgPoints(w, wMin, wMax, W, H), '#22c55e')}
    ${poly(svgPoints(p, pMin, pMax, W, H), '#ef4444')}
    ${poly(svgPoints(t, tMin, tMax, W, H), '#f59e0b')}
  </svg>`;
}

function buildLiveChart(dp) {
  return buildShotChart(dp.pressure || [], dp.temperature || [], dp.shotWeight || dp.weight || []);
}

// ─── styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  :host {
    --bg:      #111113;
    --surface: rgba(255,255,255,.055);
    --s2:      rgba(255,255,255,.09);
    --border:  rgba(255,255,255,.07);
    --text:    #f2f2f7;
    --sub:     #8e8e93;
    --accent:  #ff3b30;
    --green:   #30d158;
    --amber:   #ffd60a;
    --shadow:  0 2px 16px rgba(0,0,0,.5);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

  .card {
    background: linear-gradient(150deg, #1c1b22 0%, #111113 55%, #0f1012 100%);
    border-radius: 16px;
    padding: 18px 16px 14px;
    font-family: var(--paper-font-body1_-_font-family, -apple-system, sans-serif);
    color: var(--text);
    overflow: hidden;
    user-select: none;
    box-shadow: var(--shadow);
  }

  /* ── header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: .78rem;
    font-weight: 600;
    color: var(--sub);
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .title svg { opacity: .5; flex-shrink: 0; }
  .header-right { display: flex; align-items: center; gap: 8px; }

  /* status dot */
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,.15); flex-shrink: 0;
  }
  .status-dot.online  {
    background: var(--green);
    box-shadow: 0 0 0 3px rgba(48,209,88,.18), 0 0 10px rgba(48,209,88,.4);
  }
  .status-dot.brewing {
    background: var(--accent);
    box-shadow: 0 0 0 3px rgba(255,59,48,.2), 0 0 12px rgba(255,59,48,.5);
    animation: pulse 1.1s ease-in-out infinite;
  }
  .status-dot.error { background: var(--accent); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }

  /* power button */
  .power-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 7px 12px;
    min-height: 38px;
    cursor: pointer;
    color: var(--sub);
    display: flex; align-items: center;
    transition: all .15s;
    touch-action: manipulation;
  }
  .power-btn:active { background: var(--s2); }
  .power-btn.is-on  { color: var(--green); border-color: rgba(48,209,88,.3); }
  .off-label { font-size: .72rem; color: var(--sub); letter-spacing: .04em; }
  .card.collapsed .header { margin-bottom: 0; }

  /* ── tab bar ── */
  .tab-bar {
    display: flex; gap: 3px;
    background: rgba(255,255,255,.05);
    border-radius: 12px; padding: 3px;
    margin-bottom: 16px;
  }
  .tab-btn {
    flex: 1; background: none; border: none; border-radius: 9px;
    padding: 8px 0; min-height: 36px;
    color: var(--sub);
    font-family: inherit; font-size: .76rem; font-weight: 600;
    cursor: pointer; transition: all .2s;
    touch-action: manipulation; letter-spacing: .01em;
  }
  .tab-btn.active {
    background: rgba(255,255,255,.1);
    color: var(--text);
    box-shadow: 0 1px 6px rgba(0,0,0,.4);
  }

  /* ── swipe target ── */
  .swipe-target { touch-action: pan-y; position: relative; overflow: hidden; }
  .swipe-content { /* animation target — see _navShotAnimated() */ }

  /* ── shot hero ── */
  .shot-hero {
    margin-bottom: 14px;
  }
  .shot-profile {
    font-size: 1.45rem;
    font-weight: 800;
    letter-spacing: -.02em;
    line-height: 1.15;
    margin-bottom: 3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .shot-meta {
    display: flex; align-items: center; gap: 8px;
    font-size: .76rem; color: var(--sub);
    overflow: hidden;
  }
  .shot-drink {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 6px;
    padding: 1px 7px;
    font-size: .65rem; font-weight: 600;
    letter-spacing: .04em;
    white-space: nowrap; flex-shrink: 0;
  }
  .shot-coffee {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── nav ── */
  .nav-row {
    display: flex; align-items: center;
    gap: 8px; margin-bottom: 12px;
  }
  .nav-arrow {
    background: none; border: none;
    padding: 0; width: 32px; height: 32px;
    cursor: pointer; color: rgba(255,255,255,.35);
    font-size: 1.35rem; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    transition: color .15s; touch-action: manipulation; flex-shrink: 0;
  }
  .nav-arrow:active:not([disabled]) { color: var(--text); }
  .nav-arrow[disabled] { opacity: .12; cursor: default; pointer-events: none; }
  .nav-dots {
    flex: 1; display: flex; gap: 5px;
    align-items: center; justify-content: center;
  }
  .nav-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,.18);
    flex-shrink: 0;
  }
  .nav-dot.active {
    width: 18px; border-radius: 3px;
    background: var(--text);
  }
  .nav-dot.active.changed {
    animation: dot-grow .22s cubic-bezier(.34,1.56,.64,1) both;
  }
  @keyframes dot-grow {
    from { width: 5px; border-radius: 50%; opacity: .4; }
    to   { width: 18px; border-radius: 3px; opacity: 1; }
  }
  .nav-ts {
    font-size: .67rem; color: var(--sub);
    text-align: center; margin-top: -6px; margin-bottom: 10px; opacity: .7;
  }

  /* ── hero metric trio ── */
  .metric-trio {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 8px;
  }
  .metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 10px 10px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .metric-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
  }
  .metric-num {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1;
    margin-bottom: 2px;
  }
  .metric-unit {
    font-size: .58rem;
    font-weight: 600;
    color: var(--sub);
    letter-spacing: .08em;
    text-transform: uppercase;
    display: inline;
    vertical-align: super;
    margin-left: 1px;
  }
  .metric-label {
    font-size: .6rem;
    color: var(--sub);
    letter-spacing: .06em;
    text-transform: uppercase;
    margin-top: 4px;
    font-weight: 500;
  }
  /* no semantic color on metric numbers — all neutral white */

  /* secondary stats */
  .stats-secondary {
    display: flex; gap: 8px; margin-bottom: 12px;
  }
  .stat-pill {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 6px;
  }
  .stat-pill-label {
    font-size: .62rem; color: var(--sub);
    letter-spacing: .05em; text-transform: uppercase; font-weight: 500;
  }
  .stat-pill-value {
    font-size: .92rem; font-weight: 700; letter-spacing: -.02em;
  }

  /* rating stars */
  .rating-row {
    display: flex; justify-content: center; align-items: center; gap: 3px;
    margin-bottom: 12px;
  }
  .star { font-size: 1rem; opacity: .2; }
  .star.on { opacity: 1; }
  .star.on.high  { color: var(--green); }
  .star.on.mid   { color: var(--amber); }
  .star.on.low   { color: var(--accent); }

  /* ── chart ── */
  .chart-wrap {
    margin-bottom: 6px;
    border-radius: 10px;
    overflow: hidden;
  }
  .chart-legend {
    display: flex; gap: 16px; justify-content: center;
    margin-top: 8px; margin-bottom: 10px;
  }
  .chart-legend span {
    font-size: .63rem; color: var(--sub);
    display: flex; align-items: center; gap: 5px; letter-spacing: .03em;
  }
  .chart-legend span::before {
    content: ''; display: inline-block;
    width: 16px; height: 2px; border-radius: 1px;
  }
  .l-pres::before { background: #ef4444; }
  .l-temp::before { background: #f59e0b; }
  .l-wt::before   { background: #22c55e; }

  /* ── profile picker ── */
  /* live machine panel */
  .live-machine { margin-bottom: 14px; }
  .lm-head {
    display: flex; align-items: center; gap: 6px;
    font-size: .6rem; letter-spacing: .06em; text-transform: uppercase;
    color: var(--sub); margin-bottom: 6px;
  }
  .lm-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--green); box-shadow: 0 0 0 0 rgba(48,209,88,.55);
    animation: lm-pulse 2s ease-out infinite;
  }
  @keyframes lm-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(48,209,88,.5); }
    70%  { box-shadow: 0 0 0 6px rgba(48,209,88,0); }
    100% { box-shadow: 0 0 0 0 rgba(48,209,88,0); }
  }
  .lm-tiles { display: flex; gap: 8px; }
  .lm-tile {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 9px 6px; text-align: center;
  }
  .lm-tile.warming { border-color: rgba(255,214,10,.35); }
  .lm-val { font-size: 1.4rem; font-weight: 700; color: var(--text); letter-spacing: -.02em; line-height: 1.1; }
  .lm-tile.warming .lm-val { color: var(--amber); }
  .lm-unit { font-size: .58rem; color: var(--sub); margin-left: 1px; font-weight: 500; }
  .lm-lbl { font-size: .58rem; color: var(--sub); margin-top: 2px; letter-spacing: .02em; }

  .profile-picker { margin-bottom: 14px; }
  .profile-current-btn {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px;
    min-height: 46px;
    cursor: pointer; color: var(--text);
    font-family: inherit; font-size: .88rem; font-weight: 600;
    display: flex; align-items: center; justify-content: space-between;
    touch-action: manipulation; transition: all .15s;
  }
  .profile-current-btn:active { background: var(--s2); }
  .profile-current-btn.open {
    border-color: rgba(255,255,255,.18);
    border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;
  }
  .profile-label-small { font-size: .58rem; color: var(--sub); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
  .profile-current-name { flex: 1; text-align: left; }
  .profile-chevron {
    color: var(--sub); font-size: .8rem; margin-left: 8px;
    transition: transform .2s; opacity: .6;
  }
  .profile-chevron.open { transform: rotate(180deg); }
  .profile-opts {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 10px 12px 12px;
    background: var(--surface);
    border: 1px solid rgba(255,255,255,.15);
    border-top: none;
    border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;
  }
  .profile-opt {
    background: rgba(255,255,255,.06); border: 1px solid var(--border);
    border-radius: 20px; padding: 7px 16px; min-height: 34px;
    cursor: pointer; color: var(--text);
    font-family: inherit; font-size: .8rem; font-weight: 500;
    touch-action: manipulation; transition: all .15s; white-space: nowrap;
  }
  .profile-opt:active { background: rgba(255,255,255,.12); }
  .profile-opt.active {
    background: rgba(255,59,48,.15);
    border-color: rgba(255,59,48,.45); color: var(--accent); font-weight: 700;
  }

  /* ── banners ── */
  .brewing-banner {
    background: rgba(255,59,48,.1);
    border: 1px solid rgba(255,59,48,.25);
    border-radius: 12px; padding: 10px 16px;
    font-size: .85rem; font-weight: 700; color: var(--accent);
    text-align: center; margin-bottom: 12px; letter-spacing: .04em;
  }
  .steam-banner {
    background: rgba(255,214,10,.07);
    border: 1px solid rgba(255,214,10,.2);
    border-radius: 12px; padding: 8px 14px;
    font-size: .82rem; font-weight: 600; color: var(--amber);
    text-align: center; margin-bottom: 12px;
  }
  .water-low {
    background: rgba(255,59,48,.07);
    border: 1px solid rgba(255,59,48,.18);
    border-radius: 12px; padding: 7px 14px;
    font-size: .78rem; font-weight: 600; color: var(--accent);
    text-align: center; margin-bottom: 12px;
  }

  /* live brewing stats */
  .live-stats {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 8px;
    margin-bottom: 12px;
  }
  .live-stat {
    background: rgba(255,59,48,.07);
    border: 1px solid rgba(255,59,48,.15);
    border-radius: 12px; padding: 10px 8px; text-align: center;
  }
  .live-stat .metric-num { font-size: 1.3rem; }

  /* ── preheat ── */
  .preheat-ready {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: rgba(48,209,88,.08); border: 1px solid rgba(48,209,88,.25);
    color: var(--green); border-radius: 12px; padding: 11px 16px;
    font-size: .88rem; font-weight: 700; letter-spacing: .04em; margin-bottom: 14px;
  }
  .preheat-warming { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .preheat-warming-label {
    display: flex; justify-content: space-between;
    font-size: .72rem; color: var(--sub);
  }
  .preheat-bar-bg { height: 3px; background: rgba(255,255,255,.07); border-radius: 2px; overflow: hidden; }
  .preheat-bar-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, var(--amber), var(--accent));
    transition: width .8s ease;
  }

  /* ── maintenance ── */
  .maint-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .maint-row {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 12px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .maint-row-top { display: flex; align-items: center; gap: 8px; }
  .maint-name { flex: 1; font-size: .82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .maint-pill { font-size: .62rem; font-weight: 700; padding: 2px 9px; border-radius: 10px; white-space: nowrap; }
  .maint-pill.ok    { color: var(--green); background: rgba(48,209,88,.12); }
  .maint-pill.soon  { color: var(--amber); background: rgba(255,214,10,.12); }
  .maint-pill.due   { color: var(--accent); background: rgba(255,59,48,.12); }
  .maint-pill.never { color: var(--sub); background: rgba(255,255,255,.07); }
  .maint-sub { font-size: .67rem; color: var(--sub); }
  .maint-bar-bg { height: 2px; background: rgba(255,255,255,.07); border-radius: 1px; overflow: hidden; }
  .maint-bar { height: 100%; border-radius: 1px; }
  .maint-bar.ok    { background: var(--green); }
  .maint-bar.soon  { background: var(--amber); }
  .maint-bar.due   { background: var(--accent); }
  .maint-bar.never { background: rgba(255,255,255,.12); }
  .maint-section-label { font-size: .62rem; color: var(--sub); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-top: 4px; }

  /* ── footer ── */
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    font-size: .68rem; color: var(--sub);
    border-top: 1px solid rgba(255,255,255,.05);
    padding-top: 10px; margin-top: 6px; gap: 8px;
  }
  .footer-item { display: flex; align-items: center; gap: 4px; }
  .footer a { color: var(--sub); text-decoration: none; }
  .footer a:hover { color: var(--text); }

  /* ── misc ── */
  .unavailable {
    color: var(--sub); font-size: .85rem;
    text-align: center; padding: 20px 0; opacity: .6;
  }
  .no-shot { text-align: center; padding: 20px 0; }
  .no-shot-label { font-size: .82rem; color: var(--sub); margin-bottom: 4px; }
  .no-shot-hint  { font-size: .68rem; color: rgba(255,255,255,.2); }

  /* ── touch targets ── */
  @media (pointer: coarse) {
    .card { padding: 16px 14px 12px; }
    .nav-arrow { width: 40px; height: 40px; font-size: 1.5rem; }
    .tab-btn   { min-height: 44px; }
    .profile-current-btn { min-height: 50px; }
    .profile-opt { min-height: 40px; padding: 9px 18px; }
    .power-btn { min-height: 42px; }
    .metric-num { font-size: 1.9rem; }
  }
`;

// ─── card ──────────────────────────────────────────────────────────────────────

class GlpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._profileInteracting = false;
    this._profileOpen  = false;
    this._animating     = false;
    this._shotIndex     = 0;
    this._prevShotIndex = -1;
    this._recentShots   = [];
    this._lastLatestId  = null;
    this._activeTab    = 'shot';
    this._switchEntity = localStorage.getItem('glp_switch_entity') || null;
  }

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
      btn.addEventListener('pointerdown', e => {
        if (btn.hasAttribute('disabled')) return;
        e.preventDefault();
        this._navShot(btn.dataset.nav);
      });
    });
  }

  _bindSwipe() {
    const el = this.shadowRoot.querySelector('.swipe-target');
    if (!el) return;
    let sx = 0, sy = 0;
    el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (this._profileOpen) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      this._navShot(dx > 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  _navShot(dir) {
    if (this._animating) return;               // ignore nav while an animation is in flight
    const max = this._recentShots.length - 1;
    if (dir === 'prev' && this._shotIndex < max) this._navShotAnimated(dir, this._shotIndex + 1);
    if (dir === 'next' && this._shotIndex > 0)   this._navShotAnimated(dir, this._shotIndex - 1);
  }

  _navShotAnimated(dir, newIndex) {
    const oldContent = this.shadowRoot.querySelector('.swipe-content');
    const oldClone   = oldContent ? oldContent.cloneNode(true) : null;

    // Guard set hass() from re-rendering (and wiping the animation) until it finishes
    this._animating = true;
    this._shotIndex = newIndex;
    this._render();

    const newSwipe   = this.shadowRoot.querySelector('.swipe-target');
    const newContent = this.shadowRoot.querySelector('.swipe-content');
    if (!oldClone || !newSwipe || !newContent) { this._animating = false; return; }

    // prev = going to older shot → new content enters from right, old exits left
    const enterX = dir === 'prev' ? '36px' : '-36px';
    const exitX  = dir === 'prev' ? '-36px' : '36px';

    // Old clone: absolute overlay on top of new content, aligned to top
    oldClone.style.cssText = 'position:absolute;top:0;left:0;right:0;pointer-events:none;z-index:2;';
    newSwipe.appendChild(oldClone);

    // New content starts slightly offset and faded
    newContent.style.transform = `translateX(${enterX})`;
    newContent.style.opacity   = '0';

    const T = 'transform .22s cubic-bezier(.25,.46,.45,.94), opacity .18s ease-out';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      newContent.style.transition = T;
      newContent.style.transform  = 'translateX(0)';
      newContent.style.opacity    = '1';
      oldClone.style.transition   = T;
      oldClone.style.transform    = `translateX(${exitX})`;
      oldClone.style.opacity      = '0';
      setTimeout(() => {
        if (oldClone.parentNode) oldClone.remove();
        ['transform', 'transition', 'opacity'].forEach(p => newContent.style.removeProperty(p));
        this._animating = false;
      }, 250);
    }));
  }

  setConfig(config) { this._config = { title: 'Gaggiuino', ...config }; }

  set hass(hass) {
    this._hass = hass;
    if (!this._profileInteracting && !this._animating) this._render();
  }

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

  _num(suffix, decimals = 1, fallback = null) {
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
    return h < 24 ? `vor ${h} Std` : `vor ${Math.round(h/24)} Tagen`;
  }

  static MAINT_TASKS = [
    ['maintenance_descaling',    'Entkalken',          '🧪'],
    ['maintenance_backflush',    'Backflush',          '🔄'],
    ['maintenance_group_head',   'Gruppenkopf',        '🚿'],
    ['maintenance_gaskets',      'Dichtungen & Siebe', '⭕'],
    ['maintenance_water_filter', 'Wasserfilter',       '💧'],
  ];

  _maintAvailable() {
    return GlpCard.MAINT_TASKS.some(([s]) => this._s(s)) || !!this._s('maintenance_grinders');
  }
  _maintAnyDue() {
    return GlpCard.MAINT_TASKS.some(([s]) => this._s(s)?.state === 'due')
      || this._s('maintenance_grinders')?.state === 'due';
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

  _render() {
    if (!this._hass || !this._config) return;

    const prefix    = this._resolvePrefix();
    const bsPrefix  = prefix.replace(/^sensor\./, 'binary_sensor.');
    const selPrefix = prefix.replace(/^sensor\./, 'select.');

    // switch entity
    const resolvedSwitch = this._config.switch_entity
      || this._s('machine_status')?.attributes?.switch_entity || null;
    if (resolvedSwitch && resolvedSwitch !== this._switchEntity) {
      this._switchEntity = resolvedSwitch;
      localStorage.setItem('glp_switch_entity', resolvedSwitch);
    }
    const switchState = this._switchEntity ? this._hass.states[this._switchEntity] : null;
    const machineOff  = !!(this._switchEntity &&
      (switchState?.state === 'off' || switchState?.state === 'unavailable'));

    const _powerBtn = this._switchEntity ? `
      <button class="power-btn ${machineOff ? 'is-off' : 'is-on'}" data-action="toggle-switch"
              title="${machineOff ? 'Einschalten' : 'Ausschalten'}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.28 1.09-4.3 2.58-5.42L6.17 5.17A8.932 8.932 0 0 0 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9A8.932 8.932 0 0 0 17.83 5.17z"/>
        </svg>
      </button>` : '';

    // ── machine off ──────────────────────────────────────────────────────────
    if (machineOff) {
      this._profileOpen = false;
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <ha-card><div class="card collapsed">
          <div class="header">
            <div class="title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21v-2h2V3h14v2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v6h2v2H2zm4-2h8V5H6v14zm10-6h2V7h-2v6z"/>
              </svg>
              ${esc(this._config.title)}
            </div>
            <div class="header-right">
              <span class="off-label">Aus</span>${_powerBtn}
            </div>
          </div>
        </div></ha-card>`;
      this._bindPowerBtn();
      return;
    }

    // ── recent shots ─────────────────────────────────────────────────────────
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
    const shotObj    = (this._shotIndex < totalShots) ? this._recentShots[this._shotIndex] : null;

    // ── brewing ──────────────────────────────────────────────────────────────
    const brewingEnt     = this._hass.states[bsPrefix + 'brewing'];
    const brewing        = brewingEnt?.state === 'on';
    const liveDatapoints = brewingEnt?.attributes?.datapoints || null;
    const liveProfile    = brewingEnt?.attributes?.profile_name || null;
    const steamOn        = this._hass.states[bsPrefix + 'steam_switch']?.state === 'on';
    const tArr           = liveDatapoints?.timeInShot;
    const elapsedSec     = tArr?.length ? Math.round(tArr[tArr.length - 1] / 10) : null;

    // ── shot values ───────────────────────────────────────────────────────────
    const profile    = shotObj?.profile    ?? this._val('last_shot_profile', null);
    const coffee     = shotObj?.coffee     ?? this._val('last_shot_coffee',  null);
    const drinkType  = shotObj?.drink_type ?? null;
    const duration = shotObj != null
      ? (shotObj.duration != null ? shotObj.duration.toFixed(1) : null)
      : this._num('last_shot_duration', 1);
    const weight = shotObj != null
      ? (shotObj.yield_g  != null ? shotObj.yield_g.toFixed(1)  : null)
      : this._num('last_shot_yield', 1);
    const ratio = shotObj != null
      ? (shotObj.ratio    != null ? shotObj.ratio.toFixed(2)    : null)
      : this._num('last_shot_brew_ratio', 2);
    const pressure = shotObj != null
      ? (shotObj.pressure != null ? shotObj.pressure.toFixed(1) : null)
      : this._num('last_shot_avg_pressure', 1);
    const rating = shotObj != null
      ? (shotObj.rating || null)
      : (() => { const v = parseInt(this._val('last_shot_rating', null)); return (!isNaN(v) && v >= 1 && v <= 5) ? v : null; })();

    // ── live / machine ───────────────────────────────────────────────────────
    const temp        = this._num('machine_temperature', 1);
    const targetTemp  = this._num('machine_target_temperature', 1);
    const livePressure = this._num('machine_live_pressure', 1);
    const liveWeight   = this._num('machine_live_weight', 1);
    const waterLevel   = (() => {
      const v = parseFloat(this._val('machine_water_level', null));
      return isNaN(v) ? null : Math.round(v);
    })();

    // ── preheat ───────────────────────────────────────────────────────────────
    const preheatReady   = this._hass.states[bsPrefix + 'preheat_ready']?.state === 'on';
    const preheatHasEnt  = !!this._hass.states[bsPrefix + 'preheat_ready'];
    const preheatRem     = parseFloat(this._val('preheat_remaining', null));
    const preheatEl      = parseFloat(this._val('preheat_elapsed',   null));
    const preheatTotal   = (!isNaN(preheatRem) && !isNaN(preheatEl)) ? preheatEl + preheatRem : null;
    const preheatPct     = preheatTotal ? Math.min(1, preheatEl / preheatTotal) : null;
    const preheatMinLeft = isNaN(preheatRem) ? null : Math.ceil(preheatRem / 60);

    // ── profile picker ────────────────────────────────────────────────────────
    const profileEntity  = this._hass.states[selPrefix + 'profile'];
    const profileOptions = profileEntity?.attributes?.options || null;
    const currentProfile = (profileEntity?.state && profileEntity.state !== 'unavailable')
      ? profileEntity.state : null;
    const profileAvailable = Array.isArray(profileOptions) && profileOptions.length > 0;

    // ── status ────────────────────────────────────────────────────────────────
    const status   = this._val('machine_status', null);
    const dotClass = brewing ? 'brewing' : status === 'online' ? 'online' : status === 'error' ? 'error' : '';
    const today    = this._val('shots_today', '—');
    const syncTime = this._reltime('last_sync');
    const glpUrl   = safeUrl(this._config.glp_url);

    // ── maintenance ───────────────────────────────────────────────────────────
    const maintAvailable = this._maintAvailable();
    if (brewing && this._activeTab === 'maint') this._activeTab = 'shot';
    const showMaint  = maintAvailable && !brewing && this._activeTab === 'maint';

    const tabBarHtml = maintAvailable && !brewing ? `
      <div class="tab-bar">
        <button class="tab-btn${!showMaint ? ' active':''}" data-tab="shot">☕ Shot</button>
        <button class="tab-btn${showMaint ? ' active':''}" data-tab="maint">🔧 Wartung${this._maintAnyDue() ? ' ⚠':''}</button>
      </div>` : '';

    // ── nav dots ──────────────────────────────────────────────────────────────
    const indexChanged = this._shotIndex !== this._prevShotIndex;
    this._prevShotIndex = this._shotIndex;
    const showNav = !brewing && !showMaint && totalShots > 1;
    let navHtml = '';
    if (showNav) {
      const dots = this._recentShots.slice(0, 10).map((_, i) => {
        const active = i === this._shotIndex;
        return `<span class="nav-dot${active ? ` active${indexChanged ? ' changed' : ''}` : ''}"></span>`;
      }).join('');
      const prevDis = this._shotIndex >= totalShots - 1 ? ' disabled' : '';
      const nextDis = this._shotIndex <= 0             ? ' disabled' : '';
      let tsLine = '';
      if (this._shotIndex > 0 && shotObj?.ts) {
        const d = parseTs(shotObj.ts);
        if (d && !isNaN(d))
          tsLine = `<div class="nav-ts">${d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'})} ${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>`;
      }
      navHtml = `
        <div class="nav-row">
          <button class="nav-arrow" data-nav="next"${nextDis}>‹</button>
          <div class="nav-dots">${dots}</div>
          <button class="nav-arrow" data-nav="prev"${prevDis}>›</button>
        </div>${tsLine}`;
    }

    // ── profile picker html ───────────────────────────────────────────────────
    const profilePickerHtml = !brewing && !showMaint && profileAvailable ? `
      <div class="profile-picker">
        <button class="profile-current-btn${this._profileOpen?' open':''}" data-action="toggle-profile">
          <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px">
            <span class="profile-label-small">Profil</span>
            <span class="profile-current-name">${esc(currentProfile || '—')}</span>
          </div>
          <span class="profile-chevron${this._profileOpen?' open':''}">▾</span>
        </button>
        ${this._profileOpen ? `<div class="profile-opts">
          ${profileOptions.map(p =>
            `<button class="profile-opt${p===currentProfile?' active':''}" data-profile-opt="${esc(p)}">${esc(p)}</button>`
          ).join('')}
        </div>` : ''}
      </div>` : '';

    // ── hero metrics ──────────────────────────────────────────────────────────
    const ratingHtml = (() => {
      if (!rating || rating < 1 || rating > 5) return '';
      const cls = rating >= 4 ? 'high' : rating >= 3 ? 'mid' : 'low';
      const stars = Array.from({length:5}, (_,i) =>
        `<span class="star${i < rating ? ` on ${cls}` : ''}">★</span>`).join('');
      return `<div class="rating-row">${stars}</div>`;
    })();

    const metricTrioHtml = (() => {
      const tiles = [
        duration ? { num: duration,      unit: 's', label: 'Dauer'   } : null,
        weight   ? { num: weight,        unit: 'g', label: 'Ausbeute'} : null,
        ratio    ? { num: `1:${ratio}`,  unit: '',  label: 'Ratio'   } : null,
      ].filter(Boolean);
      if (!tiles.length) return '';
      return `<div class="metric-trio">
        ${tiles.map(t => `
          <div class="metric-card">
            <div class="metric-num">${esc(t.num)}${t.unit ? `<span class="metric-unit">${t.unit}</span>` : ''}</div>
            <div class="metric-label">${t.label}</div>
          </div>`).join('')}
      </div>`;
    })();

    const secondaryHtml = (() => {
      const pills = [
        pressure   !== null ? { label: 'Druck Ø',  val: `${pressure} bar` }  : null,
        temp       !== null ? { label: 'Temp',      val: `${temp}°` }         : null,
        targetTemp !== null ? { label: 'Ziel',      val: `${targetTemp}°` }   : null,
      ].filter(Boolean);
      if (!pills.length) return '';
      return `<div class="stats-secondary">
        ${pills.map(p => `
          <div class="stat-pill">
            <span class="stat-pill-label">${p.label}</span>
            <span class="stat-pill-value">${esc(p.val)}</span>
          </div>`).join('')}
      </div>`;
    })();

    // ── chart ──────────────────────────────────────────────────────────────────
    const chartLegend = `<div class="chart-legend">
      <span class="l-pres">Druck</span>
      <span class="l-temp">Temp</span>
      <span class="l-wt">Gewicht</span>
    </div>`;

    const liveSvgHtml = brewing && liveDatapoints
      ? `<div class="chart-wrap">${buildLiveChart(liveDatapoints)}</div>${chartLegend}` : '';

    const histDp = !brewing && shotObj?.dp || null;
    const histSvgHtml = histDp
      ? `<div class="chart-wrap">${buildShotChart(histDp.p||[],histDp.t||[],histDp.w||[])}</div>${chartLegend}` : '';

    // ── live brewing stats ──────────────────────────────────────────────────
    const liveStatsHtml = brewing && (temp||livePressure||liveWeight)
      ? `<div class="live-stats">
          ${temp         !== null ? `<div class="live-stat"><div class="metric-num">${temp}°</div><div class="metric-label">Temp</div></div>` : ''}
          ${livePressure !== null ? `<div class="live-stat"><div class="metric-num">${livePressure}<span class="metric-unit">b</span></div><div class="metric-label">Druck</div></div>` : ''}
          ${liveWeight   !== null ? `<div class="live-stat"><div class="metric-num">${liveWeight}<span class="metric-unit">g</span></div><div class="metric-label">Gewicht</div></div>` : ''}
        </div>` : '';

    // ── live machine panel (static, shown when on & not brewing) ──────────────
    const lmTiles = [
      temp !== null ? {
        val: temp, unit: '°',
        lbl: targetTemp !== null ? `Temp · Ziel ${targetTemp}°` : 'Temp',
        warm: targetTemp !== null && parseFloat(temp) < parseFloat(targetTemp) - 1,
      } : null,
      livePressure !== null ? { val: livePressure, unit: ' bar', lbl: 'Druck' } : null,
      liveWeight   !== null ? { val: liveWeight,   unit: ' g',   lbl: 'Waage' } : null,
    ].filter(Boolean);
    const liveMachineHtml = (!brewing && !showMaint && lmTiles.length) ? `
      <div class="live-machine">
        <div class="lm-head"><span class="lm-live-dot"></span>Maschine live</div>
        <div class="lm-tiles">
          ${lmTiles.map(t => `
            <div class="lm-tile${t.warm ? ' warming' : ''}">
              <div class="lm-val">${esc(String(t.val))}<span class="lm-unit">${t.unit}</span></div>
              <div class="lm-lbl">${esc(t.lbl)}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    // ── preheat html ─────────────────────────────────────────────────────────
    const preheatHtml = !brewing && !showMaint && preheatHasEnt ? (
      preheatReady
        ? `<div class="preheat-ready">☕ Brühbereit</div>`
        : preheatPct !== null ? `
          <div class="preheat-warming">
            <div class="preheat-warming-label">
              <span>🔥 Aufheizen …</span>
              <span>${preheatMinLeft !== null ? `${preheatMinLeft} min` : ''}</span>
            </div>
            <div class="preheat-bar-bg">
              <div class="preheat-bar-fill" style="width:${Math.round(preheatPct*100)}%"></div>
            </div>
          </div>` : ''
    ) : '';

    // ── shot section ─────────────────────────────────────────────────────────
    const shotSectionHtml = !brewing && !showMaint ? `
      ${profile
        ? `<div class="shot-hero">
            <div class="shot-profile">${esc(profile)}</div>
            <div class="shot-meta">
              ${drinkType ? `<span class="shot-drink">${esc(drinkType)}</span>` : ''}
              ${coffee    ? `<span class="shot-coffee">☕ ${esc(coffee)}</span>` : ''}
            </div>
          </div>`
        : `<div class="no-shot">
            <div class="no-shot-label">Noch kein Shot aufgezeichnet</div>
            <div class="no-shot-hint">Shots werden automatisch synchronisiert</div>
          </div>`}
      ${ratingHtml}
      ${metricTrioHtml}
      ${secondaryHtml}
      ${histSvgHtml}
    ` : '';

    // ── footer ───────────────────────────────────────────────────────────────
    const footerHtml = `
      <div class="footer">
        <span class="footer-item">☕ ${today} heute</span>
        ${waterLevel !== null ? `<span class="footer-item">💧 ${waterLevel}%</span>` : '<span></span>'}
        <span class="footer-item">
          ${syncTime ? `${syncTime}` : ''}
          ${glpUrl ? `${syncTime ? ' · ' : ''}<a href="${glpUrl}" target="_blank">GLP ↗</a>` : ''}
        </span>
      </div>`;

    // ── assemble ──────────────────────────────────────────────────────────────
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card><div class="card">

        <div class="header">
          <div class="title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21v-2h2V3h14v2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v6h2v2H2zm4-2h8V5H6v14zm10-6h2V7h-2v6z"/>
            </svg>
            ${esc(this._config.title)}
          </div>
          <div class="header-right">
            <div class="status-dot ${dotClass}"></div>
            ${_powerBtn}
          </div>
        </div>

        ${tabBarHtml}
        ${steamOn && !brewing ? `<div class="steam-banner">☁️ Dampfmodus</div>` : ''}
        ${waterLevel !== null && waterLevel < 20 ? `<div class="water-low">💧 Wasser fast leer (${waterLevel}%)</div>` : ''}
        ${preheatHtml}
        ${profilePickerHtml}
        ${liveMachineHtml}
        ${navHtml}

        <div class="swipe-target">
          <div class="swipe-content">
            ${brewing ? `
              <div class="brewing-banner">⏳ Bezug läuft${elapsedSec !== null ? ` · ${elapsedSec}s` : ' …'}</div>
              ${liveProfile ? `<div class="shot-hero" style="margin-bottom:12px"><div class="shot-profile">${esc(liveProfile)}</div></div>` : ''}
              ${liveSvgHtml}
              ${liveStatsHtml}
            ` : showMaint ? this._buildMaintHtml() : shotSectionHtml}
          </div>
        </div>

        ${footerHtml}

      </div></ha-card>`;

    this._bindPowerBtn();
    this._bindProfilePicker();
    this._bindTabBtns();
    this._bindNavBtns();
    this._bindSwipe();
  }

  getCardSize() { return 3; }
  static getConfigElement() { return document.createElement('glp-card-editor'); }
  static getStubConfig() { return { entity_prefix: 'sensor.gaggiuino_local_profiler_' }; }
}

customElements.define('glp-card', GlpCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'glp-card', name: 'GLP Shot Card',
  description: 'Shows the last espresso shot from Gaggiuino Local Profiler',
  preview: false,
  documentationURL: 'https://github.com/mxkissnr/glp-lovelace-card',
});

console.info(
  `%c GLP-CARD %c v${GLP_CARD_VERSION} `,
  'background:#ff3b30;color:#fff;padding:2px 4px;border-radius:3px 0 0 3px',
  'background:#111113;color:#ff3b30;padding:2px 4px;border-radius:0 3px 3px 0'
);
