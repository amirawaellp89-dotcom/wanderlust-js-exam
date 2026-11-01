import BaseView from './BaseView.js';
import CurrencyDropdown from '../components/CurrencyDropdown.js';
import CURRENCY_NAMES from '../data/currencies.js';
import { escapeHtml, flagUrl } from '../utils/helpers.js';

// [currency code, country code of its flag]
const POPULAR = [['EUR', 'eu'], ['GBP', 'gb'], ['EGP', 'eg'], ['AED', 'ae'], ['SAR', 'sa'], ['JPY', 'jp'], ['CAD', 'ca'], ['INR', 'in']];

const nameOf = (code) => CURRENCY_NAMES[code] || code;
const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default class CurrencyView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'currency',
      path: '/currency',
      title: 'Currency Converter',
      subtitle: 'Convert currencies with live exchange rates',
    });
    this.rates = null;
    this.updated = null;
  }

  async init() {
    this.$amount = document.getElementById('currency-amount');
    this.$from = document.getElementById('currency-from');
    this.$to = document.getElementById('currency-to');
    this.$result = document.getElementById('currency-result');
    this.$popular = document.getElementById('popular-currencies');

    this.ui.showLoading('Loading exchange rates...');
    try {
      const data = await this.api.getRates('USD');
      this.rates = data.rates || data.conversion_rates;
      this.updated = data.time_last_update_utc;
    } catch {
      this.ui.hideLoading();
      return this.ui.toast('Could not load exchange rates', 'error');
    }

    const codes = Object.keys(this.rates).sort();
    const options = codes.map((c) => `<option value="${c}">${escapeHtml(nameOf(c))}</option>`).join('');
    this.$from.innerHTML = options;
    this.$to.innerHTML = options;
    this.fromDropdown = new CurrencyDropdown(this.$from, { placeholder: 'Select' });
    this.toDropdown = new CurrencyDropdown(this.$to, { placeholder: 'Select' });
    this.fromDropdown.setValue('USD');
    this.toDropdown.setValue(await this.defaultTarget());

    document.getElementById('convert-btn').addEventListener('click', () => this.convert());
    document.getElementById('swap-currencies-btn').addEventListener('click', () => this.swap());
    this.$amount.addEventListener('input', () => this.convert());
    this.$from.addEventListener('change', () => this.convert());
    this.$to.addEventListener('change', () => this.convert());
    this.$popular.addEventListener('click', (e) => {
      const card = e.target.closest('.popular-currency-card');
      if (!card) return;
      this.toDropdown.setValue(card.dataset.code);
      this.convert();
    });

    this.ui.hideLoading();
    this.convert();
  }

  // the currency of the selected country (or EGP when nothing is selected)
  async defaultTarget() {
    const sel = this.store.getSelection();
    if (sel) {
      try {
        const country = await this.api.getCountry(sel.code);
        const code = Object.keys(country.currencies || {})[0];
        if (code && this.rates[code]) return code;
      } catch { /* use the default */ }
    }
    return 'EGP';
  }

  rate(from, to) {
    return this.rates[to] / this.rates[from];
  }

  convert() {
    if (!this.rates) return;
    const amount = parseFloat(this.$amount.value);
    const from = this.$from.value;
    const to = this.$to.value;
    if (!(amount >= 0) || !from || !to) return;

    const rate = this.rate(from, to);
    const updated = this.updated ? new Date(this.updated) : new Date();

    this.$result.innerHTML = `
      <div class="conversion-display">
        <div class="conversion-from"><span class="amount">${money(amount)}</span><span class="currency-code">${from}</span></div>
        <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
        <div class="conversion-to"><span class="amount">${money(amount * rate)}</span><span class="currency-code">${to}</span></div>
      </div>
      <div class="exchange-rate-info">
        <p>1 ${from} = ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${to}</p>
        <small>Last updated: ${updated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</small>
      </div>`;

    this.renderPopular(from);
  }

  // "Quick Convert": 1 unit of the From currency in the popular currencies
  renderPopular(from) {
    this.$popular.innerHTML = POPULAR.filter(([code]) => this.rates[code]).map(([code, flag]) => `
      <div class="popular-currency-card" data-code="${code}">
        <img src="${flagUrl(flag)}" alt="${code}" class="flag">
        <div class="info"><div class="code">${code}</div><div class="name">${escapeHtml(nameOf(code))}</div></div>
        <div class="rate">${this.rate(from, code).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
      </div>`).join('');
  }

  swap() {
    const from = this.$from.value;
    this.fromDropdown.setValue(this.$to.value);
    this.toDropdown.setValue(from);
    this.convert();
  }
}
