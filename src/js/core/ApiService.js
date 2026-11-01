// All network calls live here. Responses are cached in memory per session.
export default class ApiService {
  static NAGER = 'https://date.nager.at/api/v3';
  static REST_COUNTRIES = 'https://restcountries.com/v3.1';
  static OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
  static SUN_API = 'https://api.sunrise-sunset.org/json';
  static RATES = 'https://v6.exchangerate-api.com/v6';
  static RATES_FALLBACK = 'https://open.er-api.com/v6/latest'; // free, no key (used if the first one fails)
  // API keys used by the demo / course material
  static EXCHANGE_KEY = '805842951e5953ad31497176';
  // restcountries.com v3.1 was retired -> same data from the open "mledoze/countries" dataset (no key, CORS ok)
  static COUNTRIES_DATA = [
    'https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json',
    'https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json',
  ];
  static GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'; // capital coordinates + timezone
  static TICKETMASTER = 'https://app.ticketmaster.com/discovery/v2/events.json';
  static TICKETMASTER_KEY = 'VwECw2OiAzxVzIqnwmKJUG41FbeXJk1y';

  #cache = new Map();

  async #request(url, options = {}, retries = 1) {
    const key = url + (options.body || '');
    if (this.#cache.has(key)) return this.#cache.get(key);

    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null; // some endpoints answer 204 / empty
      this.#cache.set(key, data);
      return data;
    } catch (err) {
      if (retries > 0) return this.#request(url, options, retries - 1);
      console.error('API failed:', url, err);
      throw err;
    }
  }

  getCountries() {
    return this.#request(`${ApiService.NAGER}/AvailableCountries`);
  }

  async #allCountries() {
    let lastError;
    for (const url of ApiService.COUNTRIES_DATA) {
      try {
        const data = await this.#request(url, {}, 0);
        if (Array.isArray(data) && data.length) return data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Countries data unavailable');
  }

  async #geocode(name, countryCode) {
    if (!name) return null;
    try {
      const params = new URLSearchParams({ name, count: '1', language: 'en', format: 'json', countryCode });
      const data = await this.#request(`${ApiService.GEOCODING}?${params}`);
      return data?.results?.[0] || null;
    } catch {
      return null;
    }
  }

  // "Europe/Zurich" -> "UTC+01:00" (the format DashboardView.parseOffset understands)
  #utcLabel(timeZone) {
    if (!timeZone) return null;
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName');
      return part ? part.value.replace('GMT', 'UTC') : null;
    } catch {
      return null;
    }
  }

  // Returns a country object shaped like the old restcountries v3.1 response,
  // so the views do not need to change. Fields the dataset lacks show as "—".
  async getCountry(code) {
    const wanted = String(code).toUpperCase();
    const all = await this.#allCountries();
    const c = all.find((x) => x.cca2 === wanted || x.cca3 === wanted);
    if (!c) throw new Error(`Country not found: ${code}`);

    const capital = Array.isArray(c.capital) ? c.capital : c.capital ? [c.capital] : [];
    const place = await this.#geocode(capital[0], c.cca2);

    return {
      ...c,
      capital,
      continents: c.continents || (c.region ? [c.region] : []),
      capitalInfo: { latlng: place ? [place.latitude, place.longitude] : c.latlng || null },
      timezones: [this.#utcLabel(place?.timezone) || 'UTC'],
      maps: { googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name.common)}` },
    };
  }

  async getHolidays(year, code) {
    return (await this.#request(`${ApiService.NAGER}/PublicHolidays/${year}/${code}`)) || [];
  }

  async getLongWeekends(year, code) {
    return (await this.#request(`${ApiService.NAGER}/LongWeekend/${year}/${code}`)) || [];
  }

  getWeather(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset',
      timezone: 'auto',
      forecast_days: '7',
    });
    return this.#request(`${ApiService.OPEN_METEO}?${params}`);
  }

  // coordinates of the selected city (the capital is used when no city was chosen)
  async getLocation(sel) {
    if (sel.cityLat != null && sel.cityLon != null) return { lat: sel.cityLat, lon: sel.cityLon };
    const country = await this.getCountry(sel.code);
    const latlng = country.capitalInfo?.latlng;
    if (!latlng) throw new Error('Could not determine city location');
    return { lat: latlng[0], lon: latlng[1] };
  }

  async getSunTimes(lat, lon, date) {
    const params = new URLSearchParams({ lat, lng: lon, date, formatted: '0' });
    const data = await this.#request(`${ApiService.SUN_API}?${params}`);
    if (data?.status !== 'OK') throw new Error('Sun times unavailable');
    return data.results;
  }

  async getRates(base = 'USD') {
    try {
      return await this.#request(`${ApiService.RATES}/${ApiService.EXCHANGE_KEY}/latest/${base}`);
    } catch {
      return this.#request(`${ApiService.RATES_FALLBACK}/${base}`);
    }
  }

  // returns the events ([] when there are none) or null when the request fails
  async getEvents({ city, countryCode, segmentId = '' }) {
    try {
      const params = new URLSearchParams({
        apikey: ApiService.TICKETMASTER_KEY, city, countryCode, size: '20',
      });
      if (segmentId) params.set('segmentId', segmentId);
      const data = await this.#request(`${ApiService.TICKETMASTER}?${params}`);
      return data?._embedded?.events || [];
    } catch {
      return null;
    }
  }
}