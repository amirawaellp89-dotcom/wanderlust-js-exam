import BaseView from './BaseView.js';
import { parseDate, toISO } from '../utils/helpers.js';

// Countries whose weekend is Friday + Saturday
const FRI_SAT = new Set(['EG', 'SA', 'IL', 'IQ', 'JO', 'KW', 'QA', 'BH', 'OM', 'DZ', 'LY', 'YE', 'SY']);

export default class LongWeekendsView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'long-weekends',
      path: '/long-weekends',
      title: 'Long Weekends',
      subtitle: 'Find the perfect mini-trip windows',
      badge: { year: true },
    });
    this.items = [];
  }

  async init() {
    this.$content = document.getElementById('lw-content');
    this.$content.addEventListener('click', (e) => {
      const btn = e.target.closest('.holiday-action-btn');
      if (btn) this.toggleSave(Number(btn.dataset.index), btn);
    });
  }

  async render() {
    this.renderSelectionBadge(this.badge);
    const sel = this.store.getSelection();
    if (!sel) return this.renderNoSelection(this.$content);

    this.setHeaderText(`Find holidays near weekends in ${sel.name} - perfect for mini-trips!`);
    this.ui.showLoading('Finding long weekends...');
    try {
      const [items, holidays] = await Promise.all([
        this.api.getLongWeekends(sel.year, sel.code),
        this.api.getHolidays(sel.year, sel.code),
      ]);
      this.items = items;
      this.holidayDates = new Set(holidays.map((h) => h.date));
      this.renderCards(sel);
    } catch {
      this.renderError(this.$content, 'Could not load long weekends for this country and year.');
    } finally {
      this.ui.hideLoading();
    }
  }

  planId(sel, lw) {
    return `longweekend:${sel.code}:${lw.startDate}`;
  }

  rangeLabel(lw) {
    const start = parseDate(lw.startDate);
    const end = parseDate(lw.endDate);
    const f = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${f(start)} - ${f(end)}, ${end.getFullYear()}`;
  }

  daysVisual(lw, sel) {
    const weekend = FRI_SAT.has(sel.code) ? [5, 6] : [6, 0];
    const days = [];
    for (let d = parseDate(lw.startDate); d <= parseDate(lw.endDate); d.setDate(d.getDate() + 1)) {
      const cls = this.holidayDates.has(toISO(d)) ? 'holiday' : weekend.includes(d.getDay()) ? 'weekend' : '';
      days.push(`
        <div class="lw-day ${cls}">
          <span class="name">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <span class="num">${d.getDate()}</span>
        </div>`);
    }
    return days.join('');
  }

  renderCards(sel) {
    if (!this.items.length) {
      return this.renderMessage(this.$content, {
        icon: 'fa-umbrella-beach',
        title: 'No long weekends found',
        text: `No long weekends available for ${sel.name} in ${sel.year}.`,
      });
    }

    this.$content.innerHTML = this.items.map((lw, i) => {
      const saved = this.plans.has(this.planId(sel, lw));
      const bridge = lw.needBridgeDays;
      return `
        <div class="lw-card">
          <div class="lw-card-header">
            <span class="lw-badge"><i class="fa-solid fa-calendar-days"></i> ${lw.dayCount} Days</span>
            <button class="holiday-action-btn ${saved ? 'saved' : ''}" data-index="${i}" title="Save to My Plans">
              ${this.heartIcon(saved)}
            </button>
          </div>
          <h3>Long Weekend #${i + 1}</h3>
          <div class="lw-dates"><i class="fa-regular fa-calendar"></i> ${this.rangeLabel(lw)}</div>
          ${bridge === 0
            ? '<div class="lw-info-box success"><i class="fa-solid fa-check-circle"></i> No extra days off needed!</div>'
            : `<div class="lw-info-box warning"><i class="fa-solid fa-info-circle"></i> Requires taking ${bridge} bridge day${bridge > 1 ? 's' : ''} off</div>`}
          <div class="lw-days-visual">${this.daysVisual(lw, sel)}</div>
        </div>`;
    }).join('');
  }

  toggleSave(index, btn) {
    const sel = this.store.getSelection();
    const lw = this.items[index];
    if (!sel || !lw) return;

    const added = this.plans.toggle({
      id: this.planId(sel, lw),
      type: 'longweekend',
      title: `Long Weekend (${lw.dayCount} days)`,
      subtitle: lw.needBridgeDays === 0 ? 'No extra days off needed' : `Needs ${lw.needBridgeDays} bridge day(s)`,
      dateLabel: this.rangeLabel(lw),
      location: sel.name,
      countryCode: sel.code,
    });
    btn.classList.toggle('saved', added);
    btn.innerHTML = this.heartIcon(added);
    this.ui.toast(added ? 'Saved to My Plans' : 'Removed from My Plans', added ? 'success' : 'info');
  }
}
