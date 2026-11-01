import Dropdown from './Dropdown.js';
import { escapeHtml, flagUrl } from '../utils/helpers.js';

// Searchable country list with flag images
export default class CountryDropdown extends Dropdown {
  static CLASSES = {
    wrapper: 'custom-select-wrapper',
    trigger: 'custom-select-trigger',
    dropdown: 'custom-select-dropdown',
    option: 'custom-select-option',
  };

  triggerHtml() {
    return `<span class="flag"></span>
            <span class="selected-text placeholder"></span>
            <i class="fa-solid fa-chevron-down arrow"></i>`;
  }

  dropdownHtml() {
    return `<div class="custom-select-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search countries..." autocomplete="off">
            </div>
            <div class="custom-select-options"></div>`;
  }

  listElement() {
    return this.root.querySelector('.custom-select-options');
  }

  optionHtml(o) {
    const search = escapeHtml(`${o.label} ${o.value}`.toLowerCase());
    return `
      <div class="custom-select-option" data-value="${escapeHtml(o.value)}" data-search="${search}">
        <img class="flag-img" src="${flagUrl(o.value)}" alt="" loading="lazy">
        <span class="country-name">${escapeHtml(o.label)}</span>
        <span class="country-code">${escapeHtml(o.value)}</span>
      </div>`;
  }

  updateTriggerExtra(current) {
    this.trigger.querySelector('.flag').innerHTML = current
      ? `<img src="${flagUrl(current.value)}" alt="">`
      : '';
  }

  bindEvents() {
    super.bindEvents();
    this.search = this.root.querySelector('input');
    this.search.addEventListener('input', () => this.filter(this.search.value));
  }

  onOpen() {
    this.search.value = '';
    this.filter('');
    this.search.focus();
  }

  filter(query) {
    const q = query.trim().toLowerCase();
    let visible = 0;
    this.list.querySelectorAll(`.${this.classes.option}[data-value]`).forEach((el) => {
      const match = el.dataset.search.includes(q);
      el.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    const none = this.list.querySelector('.no-results');
    if (none) none.style.display = visible ? 'none' : '';
  }
}
