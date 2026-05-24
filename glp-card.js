const GLP_CARD_VERSION = '1.0.1';

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
  }
  .footer a {
    color: var(--glp-sub);
    text-decoration: none;
    font-size: .75rem;
  }
  .footer a:hover { color: var(--glp-text); }
  .brewing-banner {
    background: rgba(239,68,68,.12);
    border: 1px solid rgba(239,68,68,.35);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: .82rem;
    font-weight: 600;
    color: var(--glp-accent);
    text-align: center;
    margin-bottom: 12px;
    letter-spacing: .04em;
  }
  .unavailable {
    color: var(--glp-sub);
    font-size: .85rem;
    text-align: center;
    padding: 12px 0;
  }
`;

class GlpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = {
      entity_prefix: 'sensor.gaggiuino_local_profiler_',
      glp_url: null,
      title: 'Gaggiuino',
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _s(suffix) {
    const id = this._config.entity_prefix.replace(/sensor\.$/, '') + suffix;
    return this._hass.states[id];
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

    const status   = this._val('machine_status', null);
    const brewing  = (() => {
      const id = this._config.entity_prefix.replace(/sensor\.$/, 'binary_sensor.') + 'brewing';
      const s  = this._hass.states[id];
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

    const dotClass = brewing ? 'brewing' : status === 'online' ? 'online' : status === 'error' ? 'error' : '';

    const scoreClass = score !== null
      ? score >= 80 ? 'score-value' : score >= 60 ? 'score-value mid' : 'score-value low'
      : 'score-value';

    const stats = [
      duration  !== null ? { v: `${duration}s`, l: 'Dauer' }   : null,
      weight    !== null ? { v: `${weight}g`,   l: 'Ausbeute' } : null,
      ratio     !== null ? { v: `1:${ratio}`,   l: 'Ratio' }    : null,
      pressure  !== null ? { v: `${pressure}b`, l: 'Druck Ø' }  : null,
    ].filter(Boolean);

    const glpUrl = this._config.glp_url;

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="card">
          <div class="header">
            <div class="title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21v-2h2V3h14v2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v6h2v2H2zm4-2h8V5H6v14zm10-6h2V7h-2v6z"/>
              </svg>
              ${this._config.title}
            </div>
            <div class="status-dot ${dotClass}"></div>
          </div>

          ${brewing ? `<div class="brewing-banner">⏳ Bezug läuft …</div>` : ''}

          ${profile ? `
            <div class="shot-profile">${profile}</div>
            ${coffee ? `<div class="shot-coffee">☕ ${coffee}</div>` : '<div style="margin-bottom:12px"></div>'}
          ` : `<div class="unavailable">Noch kein Shot aufgezeichnet</div>`}

          ${stats.length ? `
            <div class="stats">
              ${score !== null ? `<div class="stat"><div class="stat-value ${scoreClass}">${score}</div><div class="stat-label">Score</div></div>` : ''}
              ${stats.map(s => `<div class="stat"><div class="stat-value">${s.v}</div><div class="stat-label">${s.l}</div></div>`).join('')}
            </div>
          ` : ''}

          <div class="footer">
            <span>Heute: ${today} Shot${today !== '1' ? 's' : ''}</span>
            ${syncTime ? `<span>Sync ${syncTime}</span>` : ''}
            ${glpUrl ? `<a href="${glpUrl}" target="_blank">GLP öffnen ↗</a>` : ''}
          </div>
        </div>
      </ha-card>
    `;
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
