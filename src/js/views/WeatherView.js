import BaseView from './BaseView.js';
import { escapeHtml, parseDate } from '../utils/helpers.js';

// Open-Meteo weather codes -> label / Font Awesome icon / hero card theme
const WEATHER_CODES = [
  [[0], 'Clear sky', 'fa-sun', 'sunny'],
  [[1], 'Mainly clear', 'fa-sun', 'sunny'],
  [[2], 'Partly cloudy', 'fa-cloud-sun', 'cloudy'],
  [[3], 'Overcast', 'fa-cloud', 'cloudy'],
  [[45, 48], 'Fog', 'fa-smog', 'foggy'],
  [[51, 53, 55, 56, 57], 'Drizzle', 'fa-cloud-rain', 'rainy'],
  [[61, 63, 65, 66, 67], 'Rain', 'fa-cloud-showers-heavy', 'rainy'],
  [[71, 73, 75, 77], 'Snow', 'fa-snowflake', 'snowy'],
  [[80, 81, 82], 'Rain showers', 'fa-cloud-showers-heavy', 'rainy'],
  [[85, 86], 'Snow showers', 'fa-snowflake', 'snowy'],
  [[95, 96, 99], 'Thunderstorm', 'fa-cloud-bolt', 'stormy'],
];

export default class WeatherView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'weather',
      path: '/weather',
      title: 'Weather',
      subtitle: '7-day forecast for your destination',
      badge: { city: true },
    });
  }

  async init() {
    this.$content = document.getElementById('weather-content');
  }

  describe(code) {
    const row = WEATHER_CODES.find(([codes]) => codes.includes(code));
    return row ? { label: row[1], icon: row[2], theme: row[3] } : { label: 'Unknown', icon: 'fa-cloud', theme: 'default' };
  }

  async render() {
    this.renderSelectionBadge(this.badge);
    const sel = this.store.getSelection();
    if (!sel) return this.renderNoSelection(this.$content);

    const place = sel.city || sel.capital || sel.name;
    this.setHeaderText(`Check 7-day weather forecasts for ${place}`);
    this.ui.showLoading('Loading weather...');
    try {
      const { lat, lon } = await this.api.getLocation(sel);
      const data = await this.api.getWeather(lat, lon);
      this.renderWeather(data, place);
    } catch {
      this.renderError(this.$content, 'Could not load the weather for this location.');
    } finally {
      this.ui.hideLoading();
    }
  }

  renderWeather(data, place) {
    const { current: cur, hourly, daily } = data;
    const now = this.describe(cur.weather_code);
    const round = (n) => Math.round(n);
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const today = parseDate(cur.time.slice(0, 10)).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const hero = `
      <div class="weather-hero-card weather-${now.theme}">
        <div class="weather-hero-bg"></div>
        <div class="weather-hero-content">
          <div class="weather-location">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeHtml(place)}</span>
            <span class="weather-time">${today}</span>
          </div>
          <div class="weather-hero-main">
            <div class="weather-hero-left">
              <div class="weather-hero-icon"><i class="fa-solid ${now.icon}"></i></div>
              <div class="weather-hero-temp">
                <span class="temp-value">${round(cur.temperature_2m)}</span><span class="temp-unit">°C</span>
              </div>
            </div>
            <div class="weather-hero-right">
              <div class="weather-condition">${now.label}</div>
              <div class="weather-feels">Feels like ${round(cur.apparent_temperature)}°C</div>
              <div class="weather-high-low">
                <span class="high"><i class="fa-solid fa-arrow-up"></i> ${round(daily.temperature_2m_max[0])}°</span>
                <span class="low"><i class="fa-solid fa-arrow-down"></i> ${round(daily.temperature_2m_min[0])}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const detail = (cls, icon, label, value, extra = '') => `
      <div class="weather-detail-card">
        <div class="detail-icon ${cls}"><i class="fa-solid ${icon}"></i></div>
        <div class="detail-info"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>
        ${extra}
      </div>`;

    const uv = cur.uv_index ?? daily.uv_index_max[0] ?? 0;
    const [uvCls, uvText] = uv < 3 ? ['low', 'Low'] : uv < 6 ? ['moderate', 'Moderate'] : uv < 8 ? ['high', 'High'] : uv < 11 ? ['very-high', 'Very High'] : ['extreme', 'Extreme'];
    const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((cur.wind_direction_10m || 0) / 45) % 8];

    const details = `
      <div class="weather-details-grid">
        ${detail('humidity', 'fa-droplet', 'Humidity', `${round(cur.relative_humidity_2m)}%`,
          `<div class="detail-bar"><div class="detail-bar-fill" style="width: ${round(cur.relative_humidity_2m)}%"></div></div>`)}
        ${detail('wind', 'fa-wind', 'Wind', `${round(cur.wind_speed_10m)} km/h`, `<div class="detail-extra">Direction: ${compass}</div>`)}
        ${detail('uv', 'fa-sun', 'UV Index', round(uv), `<div><span class="uv-level ${uvCls}">${uvText}</span></div>`)}
        ${detail('precip', 'fa-cloud-rain', 'Precipitation', `${daily.precipitation_probability_max[0] ?? 0}%`,
          `<div class="detail-extra">${daily.precipitation_sum[0] ?? 0}mm expected</div>`)}
        <div class="weather-detail-card sunrise-sunset">
          <div class="sun-times-visual">
            <div class="sun-time sunrise"><i class="fa-solid fa-sun"></i><span class="sun-label">Sunrise</span><span class="sun-value">${fmtTime(daily.sunrise[0])}</span></div>
            <div class="sun-arc"><div class="sun-arc-path"></div></div>
            <div class="sun-time sunset"><i class="fa-solid fa-moon"></i><span class="sun-label">Sunset</span><span class="sun-value">${fmtTime(daily.sunset[0])}</span></div>
          </div>
        </div>
      </div>`;

    // next 12 hours (the first card is "Now")
    const nowHour = cur.time.slice(0, 13);
    const start = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) > nowHour));
    const hours = [`
      <div class="hourly-item now">
        <span class="hourly-time">Now</span>
        <div class="hourly-icon"><i class="fa-solid ${now.icon}"></i></div>
        <span class="hourly-temp">${round(cur.temperature_2m)}°</span>
      </div>`];
    for (let i = start; i < Math.min(start + 11, hourly.time.length); i++) {
      const info = this.describe(hourly.weather_code[i]);
      const prob = hourly.precipitation_probability[i];
      hours.push(`
        <div class="hourly-item">
          <span class="hourly-time">${new Date(hourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
          <div class="hourly-icon"><i class="fa-solid ${info.icon}"></i></div>
          <span class="hourly-temp">${round(hourly.temperature_2m[i])}°</span>
          ${prob >= 20 ? `<span class="hourly-precip"><i class="fa-solid fa-droplet"></i>${prob}%</span>` : ''}
        </div>`);
    }

    const days = daily.time.map((date, i) => {
      const d = parseDate(date);
      const info = this.describe(daily.weather_code[i]);
      const prob = daily.precipitation_probability_max[i];
      return `
        <div class="forecast-day ${i === 0 ? 'today' : ''}">
          <div class="forecast-day-name">
            <span class="day-label">${i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span class="day-date">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div class="forecast-icon"><i class="fa-solid ${info.icon}"></i></div>
          <div class="forecast-temps">
            <span class="temp-max">${round(daily.temperature_2m_max[i])}°</span>
            <span class="temp-min">${round(daily.temperature_2m_min[i])}°</span>
          </div>
          <div class="forecast-precip">${prob >= 10 ? `<i class="fa-solid fa-droplet"></i><span>${prob}%</span>` : ''}</div>
        </div>`;
    }).join('');

    this.$content.innerHTML = `
      ${hero}
      ${details}
      <div class="weather-section">
        <h3 class="weather-section-title"><i class="fa-solid fa-clock"></i> Hourly Forecast</h3>
        <div class="hourly-scroll">${hours.join('')}</div>
      </div>
      <div class="weather-section">
        <h3 class="weather-section-title"><i class="fa-solid fa-calendar-week"></i> 7-Day Forecast</h3>
        <div class="forecast-list">${days}</div>
      </div>`;
  }
}
