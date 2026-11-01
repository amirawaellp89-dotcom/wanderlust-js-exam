import BaseView from './BaseView.js';
import { escapeHtml, parseDate, formatDate } from '../utils/helpers.js';

export default class HolidaysView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'holidays',
      path: '/holidays',
      title: 'Holidays',
      subtitle: 'Browse public holidays and plan trips around them',
      badge: { year: true },
    });
    this.holidays = [];
  }

  async init() {
    this.$content = document.getElementById('holidays-content');
    this.$content.addEventListener('click', (e) => {
      const btn = e.target.closest('.holiday-action-btn');
      if (btn) this.toggleSave(Number(btn.dataset.index), btn);
    });
  }

  async render() {
    this.renderSelectionBadge(this.badge);
    const sel = this.store.getSelection();
    if (!sel) return this.renderNoSelection(this.$content);

    this.setHeaderText(`Browse public holidays for ${sel.name} and plan your trips around them`);
    this.ui.showLoading('Loading holidays...');
    try {
      this.holidays = await this.api.getHolidays(sel.year, sel.code);
      this.renderCards(sel);
    } catch {
      this.renderError(this.$content, 'Could not load holidays for this country and year.');
    } finally {
      this.ui.hideLoading();
    }
  }

  planId(sel, h) {
    return `holiday:${sel.code}:${h.date}`;
  }

  renderCards(sel) {
    if (!this.holidays.length) {
      return this.renderMessage(this.$content, {
        icon: 'fa-calendar-xmark',
        title: 'No holidays found',
        text: `No public holidays available for ${sel.name} in ${sel.year}.`,
      });
    }

    this.$content.innerHTML = this.holidays.map((h, i) => {
      const d = parseDate(h.date);
      const saved = this.plans.has(this.planId(sel, h));
      return `
        <div class="holiday-card">
          <div class="holiday-card-header">
            <div class="holiday-date-box">
              <span class="day">${d.getDate()}</span>
              <span class="month">${d.toLocaleDateString('en-US', { month: 'short' })}</span>
            </div>
            <button class="holiday-action-btn ${saved ? 'saved' : ''}" data-index="${i}" title="Save to My Plans">
              ${this.heartIcon(saved)}
            </button>
          </div>
          <h3>${escapeHtml(h.localName)}</h3>
          <p class="holiday-name">${escapeHtml(h.name)}</p>
          <div class="holiday-card-footer">
            <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${formatDate(h.date)}</span>
            <div class="holiday-types">
              ${(h.types || ['Public']).slice(0, 2).map((t) => `<span class="holiday-type-badge">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  toggleSave(index, btn) {
    const sel = this.store.getSelection();
    const h = this.holidays[index];
    if (!sel || !h) return;

    const added = this.plans.toggle({
      id: this.planId(sel, h),
      type: 'holiday',
      title: h.name,
      subtitle: h.localName,
      dateLabel: formatDate(h.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      location: sel.name,
      countryCode: sel.code,
    });
    btn.classList.toggle('saved', added);
    btn.innerHTML = this.heartIcon(added);
    this.ui.toast(added ? 'Saved to My Plans' : 'Removed from My Plans', added ? 'success' : 'info');
  }
}
