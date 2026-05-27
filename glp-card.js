const GLP_CARD_VERSION = '1.7.0';

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function safeUrl(url) {
  if (!url) return null;
  try { const u = new URL(url); return (u.protocol==='http:'||u.protocol==='https:') ? url : null; }
  catch { return null; }
}

const STYLES = `
  :host {
    --glp-bg:        var(--card-background-color, #1c1c1e);
    --glp-border:    var(--divider-color, #3a3a3c);
    --glp-text:      var(--primary-text-color, #f5f5f5);
    --glp-sub:       var(--secondary-text-color, #8e8e93);
    --glp-accent:    #ef4444;
    --glp-green:     #22c55e;
    --glp-amber:     #f59e0b;
  }
  .card {
    background: var(--glp-bg);
    border-radius: 12px;
    padding: 16px 18px;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--glp-text);
    overflow: hidden;
  }
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
    font-size: .95rem;
    font-weight: 600;
    color: var(--glp-sub);
    letter-spacing: .03em;
  }
  .title svg { opacity: .7; }
  .status-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    background: var(--glp-sub);
    flex-shrink: 0;
  }
  .status-dot.online  { background: var(--glp-green); box-shadow: 0 0 6px var(--glp-green); }
  .status-dot.brewing { background: var(--glp-accent); animation: pulse 1.2s infinite; }
  .status-dot.error   { background: var(--glp-accent); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  .shot-profile {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .shot-coffee {
    font-size: .8rem;
    color: var(--glp-sub);
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat {
    background: var(--ha-card-background, rgba(255,255,255,.04));
    border-radius: 8px;
    padding: 8px 10px;
    text-align: center;
  }
  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.1;
  }
  .stat-label {
    font-size: .68rem;
    color: var(--glp-sub);
    margin-top: 2px;
  }
  .score-value { color: var(--glp-green); }
  .score-value.mid { color: var(--glp-amber); }
  .score-value.low { color: var(--glp-accent); }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: .75rem;
    color: var(--glp-sub);
    border-top: 1px solid var(--glp-border);
    padding-top: 10px;
    margin-top: 2px;
    gap: 8px;
  }
  .footer a {
    color: var(--glp-sub);
    text-decoration: none;
    font-size: .75rem;
  }
  .footer a:hover { color: var(--glp-text); }
  .footer-center { flex: 1; text-align: center; }

  .brewing-banner {
    background: rgba(239,68,68,.12);
    border: 1px solid rgba(239,68,68,.35);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: .82rem;
    font-weight: 600;
    color: var(--glp-accent);
    text-align: center;
    margin-bottom: 10px;
    letter-spacing: .04em;
  }
  .live-stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    gap: 6px;
    margin-bottom: 12px;
  }
  .live-stat {
    background: rgba(239,68,68,.07);
    border: 1px solid rgba(239,68,68,.18);
    border-radius: 8px;
    padding: 6px 8px;
    text-align: center;
  }
  .live-stat .stat-value { font-size: .95rem; }

  .steam-banner {
    background: rgba(245,158,11,.1);
    border: 1px solid rgba(245,158,11,.3);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: .82rem;
    font-weight: 600;
    color: var(--glp-amber);
    text-align: center;
    margin-bottom: 12px;
    letter-spacing: .04em;
  }
  .water-low {
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.25);
    border-radius: 8px;
    padding: 5px 12px;
    font-size: .78rem;
    font-weight: 600;
    color: var(--glp-accent);
    text-align: center;
    margin-bottom: 12px;
  }

  .unavailable {
    color: var(--glp-sub);
    font-size: .85rem;
    text-align: center;
    padding: 12px 0;
  }
  .preheat-section {
    margin-bottom: 12px;
  }
  .preheat-ready {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3);
    color: #22c55e; border-radius: 8px; padding: 8px 12px;
    font-size: .85rem; font-weight: 600; letter-spacing: .03em;
  }
  .preheat-warming { display: flex; flex-direction: column; gap: 4px; }
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
  .profile-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .profile-label {
    font-size: .75rem;
    color: var(--glp-sub);
    white-space: nowrap;
  }
  .profile-select {
    flex: 1;
    min-width: 0;
    background: var(--ha-card-background, rgba(255,255,255,.06));
    border: 1px solid var(--glp-border);
    border-radius: 8px;
    color: var(--glp-text);
    font-family: inherit;
    font-size: .85rem;
    padding: 5px 8px;
    cursor: pointer;
  }
  .profile-select:focus { outline: none; border-color: rgba(255,255,255,.3); }

  .header-right { display: flex; align-items: center; gap: 8px; }
  .power-btn {
    background: none;
    border: 1px solid var(--glp-border);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--glp-sub);
    display: flex; align-items: center;
    transition: color .15s, border-color .15s;
  }
  .power-btn:hover { color: var(--glp-text); border-color: rgba(255,255,255,.25); }
  .power-btn.is-on  { color: var(--glp-green); border-color: rgba(34,197,94,.3); }
  .power-btn.is-off { color: var(--glp-sub); }
  .off-label { font-size: .75rem; color: var(--glp-sub); letter-spacing: .02em; }
  .card.collapsed .header { margin-bottom: 0; }
`;

class GlpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._profileInteracting = false;
  }

  _bindProfileSelect() {
    const sel = this.shadowRoot.querySelector('[data-action="select-profile"]');
    if (!sel) return;
    sel.addEventListener('focus',  () => { this._profileInteracting = true; });
    sel.addEventListener('blur',   () => { this._profileInteracting = false; });
    sel.addEventListener('change', e => {
      this._profileInteracting = false;
      if (this._hass) {
        const prefix = this._resolvePrefix();
        const entityId = prefix.replace(/^sensor\./, 'select.') + 'profile';
        this._hass.callService('select', 'select_option', {
          entity_id: entityId,
          option: e.target.value,
        });
      }
    });
  }

  _bindPowerBtn() {
    const btn = this.shadowRoot.querySelector('[data-action="toggle-switch"]');
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (this._hass && this._switchEntity)
          this._hass.callService('switch', 'toggle', { entity_id: this._switchEntity });
      });
    }
  }

  setConfig(config) {
    this._config = {
      glp_url: null,
      title: 'Gaggiuino',
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._profileInteracting) this._render();
  }

  _resolvePrefix() {
    if (this._config.entity_prefix) return this._config.entity_prefix;
    const found = Object.keys(this._hass.states)
      .find(id => id.endsWith('_machine_status') && this._hass.states[id].attributes.friendly_name?.toLowerCase().includes('gaggiuino'));
    if (found) return found.replace(/machine_status$/, '');
    // fallback: any entity ending in _machine_status (single integration assumed)
    const fallback = Object.keys(this._hass.states).find(id => id.endsWith('_machine_status'));
    return fallback ? fallback.replace(/machine_status$/, '') : 'sensor.gaggiuino_local_profiler_';
  }

  _s(suffix) {
    const prefix = this._resolvePrefix();
    return this._hass.states[prefix + suffix];
  }

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

  _render() {
    if (!this._hass || !this._config) return;

    this._switchEntity = this._config.switch_entity
      || this._s('machine_status')?.attributes?.switch_entity
      || null;
    const switchEntity = this._switchEntity;
    const switchState  = switchEntity ? this._hass.states[switchEntity] : null;
    const machineOff   = !!(switchEntity && (switchState?.state === 'off' || switchState?.state === 'unavailable'));

    const _powerBtn = switchEntity ? `
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

    const prefix  = this._resolvePrefix();
    const bsPrefix = prefix.replace(/^sensor\./, 'binary_sensor.');
    const selPrefix = prefix.replace(/^sensor\./, 'select.');

    const status   = this._val('machine_status', null);
    const brewing  = (() => {
      const s = this._hass.states[bsPrefix + 'brewing'];
      return s && s.state === 'on';
    })();
    const steamOn  = (() => {
      const s = this._hass.states[bsPrefix + 'steam_switch'];
      return s && s.state === 'on';
    })();

    const profile  = this._val('last_shot_profile', null);
    const coffee   = this._val('last_shot_coffee', null);
    const score    = this._num('last_shot_score', 0, null);
    const duration = this._num('last_shot_duration', 1, null);
    const weight   = this._num('last_shot_yield', 1, null);
    const ratio    = this._num('last_shot_brew_ratio', 2, null);
    const pressure = this._num('last_shot_avg_pressure', 2, null);
    const today    = this._val('shots_today', '—');
    const syncTime = this._reltime('last_sync');

    const temp       = this._num('machine_temperature',        1, null);
    const targetTemp = this._num('machine_target_temperature', 1, null);

    // Live machine sensors (5 s — machine coordinator)
    const livePressure = this._num('machine_live_pressure', 1, null);
    const liveWeight   = this._num('machine_live_weight',   1, null);
    const waterLevel   = (() => {
      const v = parseFloat(this._val('machine_water_level', null));
      return isNaN(v) ? null : Math.round(v);
    })();

    const preheatReady = (() => {
      const s = this._hass.states[bsPrefix + 'preheat_ready'];
      return s ? s.state === 'on' : null;
    })();
    const preheatRemaining = parseFloat(this._val('preheat_remaining', null));
    const preheatElapsed   = parseFloat(this._val('preheat_elapsed',   null));
    const preheatTotal     = isNaN(preheatRemaining) || isNaN(preheatElapsed) ? null : preheatElapsed + preheatRemaining;
    const preheatPct       = preheatTotal && preheatTotal > 0 ? Math.min(1, preheatElapsed / preheatTotal) : null;
    const preheatMinLeft   = isNaN(preheatRemaining) ? null : Math.ceil(preheatRemaining / 60);

    // Profile select — use prefix resolver, not hardcoded entity ID
    const profileEntity   = this._hass.states[selPrefix + 'profile'];
    const profileOptions  = profileEntity?.attributes?.options || null;
    const currentProfile  = profileEntity?.state && profileEntity.state !== 'unavailable' ? profileEntity.state : null;
    const profileAvailable = Array.isArray(profileOptions) && profileOptions.length > 0;

    const dotClass = brewing ? 'brewing' : status === 'online' ? 'online' : status === 'error' ? 'error' : '';

    const scoreClass = score !== null
      ? score >= 80 ? 'score-value' : score >= 60 ? 'score-value mid' : 'score-value low'
      : 'score-value';

    const stats = [
      duration   !== null ? { v: `${duration}s`,   l: 'Dauer' }   : null,
      weight     !== null ? { v: `${weight}g`,      l: 'Ausbeute' } : null,
      ratio      !== null ? { v: `1:${ratio}`,      l: 'Ratio' }    : null,
      pressure   !== null ? { v: `${pressure}b`,    l: 'Druck Ø' }  : null,
      temp       !== null ? { v: `${temp}°`,        l: 'Temp' }     : null,
      targetTemp !== null ? { v: `${targetTemp}°`,  l: 'Ziel' }     : null,
    ].filter(Boolean);

    const glpUrl = safeUrl(this._config.glp_url);

    // Live stats shown during brewing
    const liveStatsHtml = brewing && (temp !== null || livePressure !== null || liveWeight !== null) ? `
      <div class="live-stats">
        ${temp         !== null ? `<div class="live-stat"><div class="stat-value">${temp}°</div><div class="stat-label">Temp</div></div>` : ''}
        ${livePressure !== null ? `<div class="live-stat"><div class="stat-value">${livePressure}b</div><div class="stat-label">Druck</div></div>` : ''}
        ${liveWeight   !== null ? `<div class="live-stat"><div class="stat-value">${liveWeight}g</div><div class="stat-label">Gewicht</div></div>` : ''}
      </div>` : '';

    // Water level footer badge
    const waterBadge = waterLevel !== null
      ? `<span class="footer-center">💧 ${waterLevel}%</span>`
      : '<span class="footer-center"></span>';

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

          ${steamOn && !brewing ? `<div class="steam-banner">☁️ Dampfmodus</div>` : ''}

          ${waterLevel !== null && waterLevel < 20 ? `<div class="water-low">💧 Wasser fast leer (${waterLevel}%)</div>` : ''}

          ${!brewing && preheatReady !== null ? `
            <div class="preheat-section">
              ${preheatReady ? `
                <div class="preheat-ready">☕ Brühbereit</div>
              ` : preheatPct !== null ? `
                <div class="preheat-warming">
                  <div class="preheat-warming-label">
                    <span>🔥 Aufheizen …</span>
                    <span>${preheatMinLeft !== null ? `${preheatMinLeft} min` : ''}</span>
                  </div>
                  <div class="preheat-bar-bg">
                    <div class="preheat-bar-fill" style="width:${Math.round(preheatPct * 100)}%"></div>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${!brewing && profileAvailable ? `
            <div class="profile-row">
              <span class="profile-label">Profil</span>
              <select class="profile-select" data-action="select-profile">
                ${profileOptions.map(p => `<option value="${esc(p)}"${p === currentProfile ? ' selected' : ''}>${esc(p)}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${brewing ? `<div class="brewing-banner">⏳ Bezug läuft …</div>${liveStatsHtml}` : ''}

          ${profile ? `
            <div class="shot-profile">${esc(profile)}</div>
            ${coffee ? `<div class="shot-coffee">☕ ${esc(coffee)}</div>` : '<div style="margin-bottom:12px"></div>'}
          ` : `<div class="unavailable">Noch kein Shot aufgezeichnet</div>`}

          ${stats.length ? `
            <div class="stats">
              ${score !== null ? `<div class="stat"><div class="stat-value ${scoreClass}">${score}</div><div class="stat-label">Score</div></div>` : ''}
              ${stats.map(s => `<div class="stat"><div class="stat-value">${s.v}</div><div class="stat-label">${s.l}</div></div>`).join('')}
            </div>
          ` : ''}

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
    this._bindProfileSelect();
  }

  getCardSize() { return 3; }

  static getConfigElement() {
    return document.createElement('glp-card-editor');
  }

  static getStubConfig() {
    return { entity_prefix: 'sensor.gaggiuino_local_profiler_' };
  }
}

customElements.define('glp-card', GlpCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'glp-card',
  name:        'GLP Shot Card',
  description: 'Shows the last espresso shot from Gaggiuino Local Profiler',
  preview:     false,
  documentationURL: 'https://github.com/mxkissnr/glp-lovelace-card',
});

console.info(`%c GLP-CARD %c v${GLP_CARD_VERSION} `, 'background:#ef4444;color:#fff;padding:2px 4px;border-radius:3px 0 0 3px', 'background:#1c1c1e;color:#ef4444;padding:2px 4px;border-radius:0 3px 3px 0');
