import BaseView from './BaseView.js';
import CountryDropdown from '../components/CountryDropdown.js';
import SimpleDropdown from '../components/SimpleDropdown.js';
import CITIES from '../data/cities.js';
import { escapeHtml, flagUrl, formatNumber, capitalize } from '../utils/helpers.js';

export default class DashboardView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'dashboard',
      path: '/',
      aliases: ['/dashboard'],
      title: 'Dashboard',
      subtitle: 'Welcome back! Ready to plan your next adventure?',
    });
    this.countries = [];
    this.cityCoords = {}; // city name -> { lat, lon }
    this.tzOffset = null; // minutes
    this.clockTimer = null;
  }

  async init() {
    this.$country = document.getElementById('global-country');
    this.$city = document.getElementById('global-city');
    this.$year = document.getElementById('global-year');
    this.$search = document.getElementById('global-search-btn');
    this.$clear = document.getElementById('clear-selection-btn');
    this.$selected = document.getElementById('selected-destination');
    this.$info = document.getElementById('dashboard-country-info');

    // the static Egypt/Cairo options of index.html are replaced by API data
    this.$country.innerHTML = '<option value="">Select Country</option>';
    this.$city.innerHTML = '<option value="">Select City</option>';

    const cityLabel = this.$city.closest('.form-group').querySelector('label');
    if (cityLabel?.lastChild?.nodeType === Node.TEXT_NODE) cityLabel.lastChild.textContent = ' City (Optional)';

    this.countryDropdown = new CountryDropdown(this.$country, {
      placeholder: 'Select Country',
      noResultsText: 'No countries found',
    });
    this.cityDropdown = new SimpleDropdown(this.$city, {
      placeholder: 'Select City',
      emptyText: 'No city data available',
      noResultsText: 'No city data available',
      icon: 'fa-city',
      clearable: true,
    });
    this.yearDropdown = new SimpleDropdown(this.$year, { icon: 'fa-calendar' });

    this.$country.addEventListener('change', async () => {
      this.updatePreview();
      await this.loadCities(this.$country.value);
      this.updatePreview();
    });
    this.$city.addEventListener('change', () => this.updatePreview());
    this.$search.addEventListener('click', () => this.applySelection());
    this.$clear.addEventListener('click', () => this.clearSelection());
    this.$info.addEventListener('click', (e) => {
      const tag = e.target.closest('.border-tag');
      if (tag) this.selectNeighbor(tag.dataset.code);
    });

    await this.loadCountries();

    const sel = this.store.getSelection();
    if (sel) await this.restoreSelection(sel);
    else {
      this.showEmptyState();
      this.loadDefaultHolidayStat();
    }
  }

  // "Holidays This Year" before any selection: US holidays of the current year (like the demo)
  async loadDefaultHolidayStat() {
    try {
      const list = await this.api.getHolidays(new Date().getFullYear(), 'US');
      this.setStat('stat-holidays', list.length);
    } catch { /* keep the static number */ }
  }

  async render() {
    if (this.tzOffset !== null && this.store.hasSelection()) this.startClock();
    this.setStat('stat-saved', this.plans.count());
  }

  leave() {
    this.stopClock();
  }

  // ---------- data loading ----------
  async loadCountries() {
    this.ui.showLoading('Loading countries...');
    try {
      const list = await this.api.getCountries();
      this.countries = [...list].sort((a, b) => a.name.localeCompare(b.name));
      this.$country.innerHTML =
        '<option value="">Select Country</option>' +
        this.countries.map((c) => `<option value="${c.countryCode}">${escapeHtml(c.name)}</option>`).join('');
      this.countryDropdown.refresh();
    } catch {
      this.ui.toast('Could not load the countries list', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }

  countryName(code) {
    return this.countries.find((c) => c.countryCode === code)?.name || code;
  }

  // Cities (with coordinates) exist for the demo's countries. Any other country
  // falls back to its capital, when the API gives the capital's coordinates.
  async loadCities(code, preselect = '') {
    this.cityCoords = {};
    const setEmpty = (text) => {
      this.cityDropdown.emptyText = text;
      this.cityDropdown.noResultsText = text;
    };
    const show = (list, selected = '') => {
      this.$city.innerHTML =
        '<option value="">Select City</option>' +
        list.map((c) => `<option value="${escapeHtml(c.value)}">${escapeHtml(c.text)}</option>`).join('');
      this.$city.value = selected;
      setEmpty(code ? 'No city data available' : 'Select a country first');
      this.cityDropdown.refresh();
    };

    if (!code) return show([]);

    const known = CITIES[code];
    if (known) {
      known.forEach((c) => { this.cityCoords[c.name] = { lat: c.lat, lon: c.lon }; });
      return show(known.map((c) => ({ value: c.name, text: c.name })), preselect);
    }

    this.$city.innerHTML = '<option value="">Select City</option>';
    setEmpty('Loading capital city...');
    this.cityDropdown.refresh();

    const capital = await this.getCapital(code);
    if (this.$country.value !== code) return; // user already changed the country
    if (!capital) return show([]);

    this.cityCoords[capital.name] = { lat: capital.lat, lon: capital.lon };
    show([{ value: capital.name, text: `${capital.name} (Capital)` }], capital.name);
  }

  async getCapital(code) {
    try {
      const c = await this.api.getCountry(code);
      const latlng = c?.capitalInfo?.latlng;
      return latlng ? { name: c.capital?.[0] || 'Capital', lat: latlng[0], lon: latlng[1] } : null;
    } catch {
      return null;
    }
  }

  selectedCityLabel() {
    return this.$city.value ? this.$city.selectedOptions[0].textContent : '';
  }

  async restoreSelection(sel) {
    this.countryDropdown.setValue(sel.code);
    this.yearDropdown.setValue(String(sel.year));
    await this.loadCities(sel.code, (sel.city || '').replace(' (Capital)', ''));
    try {
      const [country, holidays] = await Promise.all([
        this.api.getCountry(sel.code),
        this.api.getHolidays(sel.year, sel.code),
      ]);
      this.renderSelected(sel);
      this.renderCountryInfo(country);
      this.setStat('stat-holidays', holidays.length);
    } catch {
      this.showEmptyState();
    }
  }

  async applySelection() {
    const code = this.$country.value;
    if (!code) return this.ui.toast('Please select a country first', 'warning');

    const year = Number(this.$year.value);
    let city = this.selectedCityLabel();
    let coords = this.$city.value ? this.cityCoords[this.$city.value] : null;

    this.ui.showLoading('Exploring your destination...');
    try {
      const [country, holidays] = await Promise.all([
        this.api.getCountry(code),
        this.api.getHolidays(year, code),
      ]);
      // no city chosen: use the capital (needs its coordinates)
      const capitalCoords = country.capitalInfo?.latlng;
      if (!coords && capitalCoords) {
        city = `${country.capital?.[0] || 'Capital'} (Capital)`;
        coords = { lat: capitalCoords[0], lon: capitalCoords[1] };
      }
      const sel = {
        code,
        name: country.name.common,
        city,
        cityLat: coords?.lat ?? null,
        cityLon: coords?.lon ?? null,
        year,
      };
      this.store.setSelection(sel);
      this.renderSelected(sel);
      this.renderCountryInfo(country);
      this.setStat('stat-holidays', holidays.length);
      this.ui.toast(`Exploring ${sel.name}`, 'success');
    } catch {
      this.ui.toast('Could not load this destination. Please try again.', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }

  async selectNeighbor(cca3) {
    try {
      const c = await this.api.getCountry(cca3);
      if (!this.countries.some((x) => x.countryCode === c.cca2)) {
        return this.ui.toast(`${c.name.common} is not available`, 'info');
      }
      this.countryDropdown.setValue(c.cca2);
      await this.loadCities(c.cca2);
      await this.applySelection();
    } catch {
      this.ui.toast('Could not load this country', 'error');
    }
  }

  clearSelection() {
    this.store.clear();
    this.countryDropdown.setValue('');
    this.loadCities('');
    this.setStat('stat-holidays', 0);
    this.showEmptyState();
    this.ui.toast('Selection cleared', 'info');
  }

  // ---------- rendering ----------
  setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // shows the chosen country right away (before pressing Explore)
  updatePreview() {
    const code = this.$country.value;
    if (!code) {
      this.$selected.classList.add('hidden');
      return;
    }
    this.renderSelected({ code, name: this.countryName(code), city: this.selectedCityLabel() });
  }

  renderSelected(sel) {
    this.$selected.classList.remove('hidden');
    const flag = document.getElementById('selected-country-flag');
    flag.src = flagUrl(sel.code, 80);
    flag.alt = sel.name;
    document.getElementById('selected-country-name').textContent = sel.name;
    document.getElementById('selected-city-name').textContent = sel.city ? `• ${sel.city}` : '';
  }

  showEmptyState() {
    this.stopClock();
    this.tzOffset = null;
    this.$selected.classList.add('hidden');
    this.$info.innerHTML = `
      <div class="country-info-placeholder">
        <div class="placeholder-icon"><i class="fa-solid fa-earth-americas"></i></div>
        <p>Select a country to view detailed information</p>
      </div>`;
  }

  renderCountryInfo(c) {
    const show = (v, fn = (x) => x) => (v === undefined || v === null || v === '' ? '—' : escapeHtml(fn(v)));

    const calling = c.idd?.root
      ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '')
      : undefined;
    const tz = c.timezones?.[0] || 'UTC';
    this.tzOffset = this.parseOffset(tz);

    const details = [
      ['fa-building-columns', 'Capital', show(c.capital?.join(', '))],
      ['fa-users', 'Population', show(c.population, formatNumber)],
      ['fa-ruler-combined', 'Area', show(c.area, (a) => `${formatNumber(a)} km²`)],
      ['fa-globe', 'Continent', show(c.continents?.[0])],
      ['fa-phone', 'Calling Code', show(calling)],
      ['fa-car', 'Driving Side', show(c.car?.side, capitalize)],
      ['fa-calendar-week', 'Week Starts', show(c.startOfWeek, capitalize)],
    ];

    const currencies = Object.entries(c.currencies || {}).map(
      ([code, v]) => `${v.name} (${code}${v.symbol ? ' ' + v.symbol : ''})`
    );
    const languages = Object.values(c.languages || {});
    const borders = c.borders || [];
    const tags = (list, extra = '') =>
      list.length
        ? list.map((t) => `<span class="extra-tag ${extra}" data-code="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('')
        : '<span class="extra-tag">—</span>';

    this.$info.innerHTML = `
      <div class="dashboard-country-header">
        <img src="${flagUrl(c.cca2, 160)}" alt="${escapeHtml(c.name.common)}" class="dashboard-country-flag">
        <div class="dashboard-country-title">
          <h3>${escapeHtml(c.name.common)}</h3>
          <p class="official-name">${escapeHtml(c.name.official)}</p>
          <span class="region"><i class="fa-solid fa-location-dot"></i> ${show(c.region)} • ${show(c.subregion)}</span>
        </div>
      </div>

      <div class="dashboard-local-time">
        <div class="local-time-display">
          <i class="fa-solid fa-clock"></i>
          <span class="local-time-value" id="country-local-time">--:--:--</span>
          <span class="local-time-zone">${escapeHtml(tz)}</span>
        </div>
      </div>

      <div class="dashboard-country-grid">
        ${details.map(([icon, label, value]) => `
          <div class="dashboard-country-detail">
            <i class="fa-solid ${icon}"></i>
            <span class="label">${label}</span>
            <span class="value">${value}</span>
          </div>`).join('')}
      </div>

      <div class="dashboard-country-extras">
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-coins"></i> Currency</h4>
          <div class="extra-tags">${tags(currencies)}</div>
        </div>
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-language"></i> Languages</h4>
          <div class="extra-tags">${tags(languages)}</div>
        </div>
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
          <div class="extra-tags">${tags(borders, 'border-tag')}</div>
        </div>
      </div>

      ${c.maps?.googleMaps ? `
      <div class="dashboard-country-actions">
        <a href="${escapeHtml(c.maps.googleMaps)}" target="_blank" rel="noopener" class="btn-map-link">
          <i class="fa-solid fa-map"></i> View on Google Maps
        </a>
      </div>` : ''}`;

    this.startClock();
  }

  // ---------- local clock of the selected country ----------
  parseOffset(tz) {
    const m = /UTC([+-])(\d{2}):?(\d{2})?/.exec(tz);
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
  }

  startClock() {
    this.stopClock();
    const tick = () => {
      const el = document.getElementById('country-local-time');
      if (!el || this.tzOffset === null) return;
      const shifted = new Date(Date.now() + this.tzOffset * 60000);
      el.textContent = shifted.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: true });
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  stopClock() {
    clearInterval(this.clockTimer);
    this.clockTimer = null;
  }
}