import BaseView from './BaseView.js';
import { escapeHtml, toISO } from '../utils/helpers.js';

export default class SunTimesView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'sun-times',
      path: '/sun-times',
      title: 'Sun Times',
      subtitle: 'Sunrise and sunset for your destination',
      badge: { city: true },
    });
  }

  async init() {
    this.$content = document.getElementById('sun-times-content');
  }

  async render() {
    this.renderSelectionBadge(this.badge);
    const sel = this.store.getSelection();
    if (!sel) return this.renderNoSelection(this.$content);

    const place = sel.city || sel.capital || sel.name;
    this.ui.showLoading('Loading sun times...');
    try {
      const { lat, lon } = await this.api.getLocation(sel);
      const today = new Date();
      // the weather call gives us the UTC offset of the place (it is cached if already used)
      const [sun, weather] = await Promise.all([
        this.api.getSunTimes(lat, lon, toISO(today)),
        this.api.getWeather(lat, lon),
      ]);
      this.renderSun(sun, weather.utc_offset_seconds, place, today);
    } catch {
      this.renderError(this.$content, 'Could not load sun times for this location.');
    } finally {
      this.ui.hideLoading();
    }
  }

  renderSun(sun, offsetSeconds, place, today) {
    // API times are UTC -> shift them to the local time of the place
    const local = (iso) =>
      new Date(Date.parse(iso) + offsetSeconds * 1000).toLocaleTimeString('en-US', {
        timeZone: 'UTC', hour: '2-digit', minute: '2-digit',
      });

    const seconds = Number(sun.day_length);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const dark = 86400 - seconds;
    const pct = ((seconds / 86400) * 100).toFixed(1);

    const card = (cls, icon, label, time, sub) => `
      <div class="sun-time-card ${cls}">
        <div class="icon"><i class="fa-solid ${icon}"></i></div>
        <div class="label">${label}</div>
        <div class="time">${time}</div>
        <div class="sub-label">${sub}</div>
      </div>`;

    this.$content.innerHTML = `
      <div class="sun-main-card">
        <div class="sun-main-header">
          <div class="sun-location">
            <h2><i class="fa-solid fa-location-dot"></i> ${escapeHtml(place)}</h2>
            <p>Sun times for your selected location</p>
          </div>
          <div class="sun-date-display">
            <div class="date">${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div class="day">${today.toLocaleDateString('en-US', { weekday: 'long' })}</div>
          </div>
        </div>
        <div class="sun-times-grid">
          ${card('dawn', 'fa-moon', 'Dawn', local(sun.civil_twilight_begin), 'Civil Twilight')}
          ${card('sunrise', 'fa-sun', 'Sunrise', local(sun.sunrise), 'Golden Hour Start')}
          ${card('noon', 'fa-sun', 'Solar Noon', local(sun.solar_noon), 'Sun at Highest')}
          ${card('sunset', 'fa-sun', 'Sunset', local(sun.sunset), 'Golden Hour End')}
          ${card('dusk', 'fa-moon', 'Dusk', local(sun.civil_twilight_end), 'Civil Twilight')}
          ${card('daylight', 'fa-hourglass-half', 'Day Length', `${h}h ${m}m`, 'Total Daylight')}
        </div>
      </div>

      <div class="day-length-card">
        <h3><i class="fa-solid fa-chart-pie"></i> Daylight Distribution</h3>
        <div class="day-progress">
          <div class="day-progress-bar"><div class="day-progress-fill" style="width: ${pct}%"></div></div>
        </div>
        <div class="day-length-stats">
          <div class="day-stat"><div class="value">${h}h ${m}m</div><div class="label">Daylight</div></div>
          <div class="day-stat"><div class="value">${pct}%</div><div class="label">of 24 Hours</div></div>
          <div class="day-stat"><div class="value">${Math.floor(dark / 3600)}h ${Math.floor((dark % 3600) / 60)}m</div><div class="label">Darkness</div></div>
        </div>
      </div>`;
  }
}
