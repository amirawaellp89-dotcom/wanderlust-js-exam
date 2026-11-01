import { escapeHtml, flagUrl } from '../utils/helpers.js';

// Parent of every view. Each view controls the <section id="{id}-view"> that exists in index.html.
export default class BaseView {
  constructor(app, { id, path, aliases = [], title, subtitle, badge = {} }) {
    this.app = app;
    this.id = id;
    this.path = path;
    this.aliases = aliases;
    this.title = title;
    this.subtitle = subtitle;
    this.badge = badge; // which parts of the selection show in the header badge
    this.initialized = false;
  }

  get section() { return document.getElementById(`${this.id}-view`); }
  get store() { return this.app.store; }
  get api() { return this.app.api; }
  get plans() { return this.app.plans; }
  get ui() { return this.app.ui; }

  // called by the Router every time the view is opened
  async enter() {
    if (!this.initialized) {
      this.initialized = true;
      await this.init();
    }
    await this.render();
  }

  async init() {}                                   // one-time setup (bind events)
  async render() { this.renderSelectionBadge(this.badge); } // refresh content
  leave() {}                                        // cleanup (timers...)

  // ----- shared UI helpers -----
  heartIcon(saved) {
    return saved ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
  }

  setHeaderText(text) {
    const p = this.section.querySelector('.view-header-content p');
    if (p) p.textContent = text;
  }

  renderSelectionBadge({ city = false, year = false } = {}) {
    const box = this.section.querySelector('.view-header-selection');
    if (!box) return;
    const sel = this.store.getSelection();
    box.style.display = 'flex';

    if (!sel) {
      box.innerHTML = `<div class="no-selection-message"><i class="fa-solid fa-circle-info"></i><span>No destination selected</span></div>`;
      return;
    }
    box.innerHTML = `
      <div class="current-selection-badge">
        <img src="${flagUrl(sel.code)}" alt="${escapeHtml(sel.name)}" class="selection-flag">
        <span>${escapeHtml(sel.name)}</span>
        ${city && (sel.city || sel.capital) ? `<span class="selection-city">${escapeHtml(sel.city || sel.capital)}</span>` : ''}
        ${year ? `<span class="selection-year">${sel.year}</span>` : ''}
      </div>`;
  }

  renderMessage(container, { icon, title, text, button = false }) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid ${icon}"></i></div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
        ${button ? '<button class="btn-primary" data-view="dashboard"><i class="fa-solid fa-compass"></i> Start Exploring</button>' : ''}
      </div>`;
  }

  renderNoSelection(container) {
    this.renderMessage(container, {
      icon: 'fa-earth-americas',
      title: 'No destination selected',
      text: 'Choose a country, city and year from the Dashboard first.',
      button: true,
    });
  }

  renderError(container, text = 'Something went wrong. Please try again.') {
    this.renderMessage(container, { icon: 'fa-triangle-exclamation', title: 'Oops!', text });
  }
}
