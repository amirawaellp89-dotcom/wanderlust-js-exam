import BaseView from './BaseView.js';
import { escapeHtml } from '../utils/helpers.js';

const TYPE_LABELS = { holiday: 'Holiday', event: 'Event', longweekend: 'Long Weekend' };

export default class PlansView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'my-plans',
      path: '/plans',
      aliases: ['/my-plans'],
      title: 'My Plans',
      subtitle: 'Your saved holidays, events, and long weekends',
    });
    this.filter = 'all';
  }

  async init() {
    this.$content = document.getElementById('plans-content');

    document.querySelectorAll('.plan-filter').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.render();
      })
    );

    document.getElementById('clear-all-plans-btn').addEventListener('click', () => this.clearAll());

    this.$content.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-plan-remove');
      if (btn) this.remove(btn.dataset.id);
    });
  }

  async render() {
    const all = this.plans.getAll();
    this.updateCounts();
    document.querySelectorAll('.plan-filter').forEach((b) =>
      b.classList.toggle('active', b.dataset.filter === this.filter)
    );

    if (!all.length) {
      return this.renderMessage(this.$content, {
        icon: 'fa-heart-crack',
        title: 'No Saved Plans Yet',
        text: 'Start exploring and save holidays, events, or long weekends you like!',
        button: true,
      });
    }

    const list = this.filter === 'all' ? all : all.filter((p) => p.type === this.filter);
    if (!list.length) {
      return this.renderMessage(this.$content, {
        icon: 'fa-heart-crack',
        title: 'Nothing here yet',
        text: 'You have no saved plans in this category.',
      });
    }

    this.$content.innerHTML = list
      .sort((a, b) => b.savedAt - a.savedAt)
      .map((p) => this.card(p))
      .join('');
  }

  card(p) {
    return `
      <div class="plan-card">
        <span class="plan-card-type ${p.type}">${TYPE_LABELS[p.type] || p.type}</span>
        <div class="plan-card-content">
          <h4>${escapeHtml(p.title)}</h4>
          <div class="plan-card-details">
            ${p.dateLabel ? `<div><i class="fa-regular fa-calendar"></i> ${escapeHtml(p.dateLabel)}</div>` : ''}
            ${p.location ? `<div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.location)}</div>` : ''}
            ${p.subtitle && p.subtitle !== p.title ? `<div><i class="fa-solid fa-circle-info"></i> ${escapeHtml(p.subtitle)}</div>` : ''}
          </div>
          <div class="plan-card-actions">
            <button class="btn-plan-remove" data-id="${escapeHtml(p.id)}"><i class="fa-solid fa-trash"></i> Remove</button>
          </div>
        </div>
      </div>`;
  }

  updateCounts() {
    const set = (id, n) => { document.getElementById(id).textContent = n; };
    set('filter-all-count', this.plans.count());
    set('filter-holiday-count', this.plans.count('holiday'));
    set('filter-event-count', this.plans.count('event'));
    set('filter-lw-count', this.plans.count('longweekend'));
  }

  remove(id) {
    this.plans.remove(id);
    this.render();
    this.ui.toast('Removed from My Plans', 'info');
  }

  async clearAll() {
    if (!this.plans.count()) return this.ui.toast('You have no saved plans', 'info');
    const ok = await this.ui.confirm('Clear all plans?', 'This will remove every saved plan.', 'Yes, clear all');
    if (!ok) return;
    this.plans.clear();
    this.render();
  }
}
