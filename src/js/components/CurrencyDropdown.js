import CountryDropdown from './CountryDropdown.js';
import { escapeHtml } from '../utils/helpers.js';

// Searchable currency list (code + name). Reuses the search logic of CountryDropdown.
export default class CurrencyDropdown extends CountryDropdown {
  static CLASSES = {
    wrapper: 'currency-custom-select',
    trigger: 'currency-custom-trigger',
    dropdown: 'currency-custom-dropdown',
    option: 'currency-custom-option',
  };

  triggerHtml() {
    return `<span class="currency-code"></span>
            <span class="currency-name selected-text placeholder"></span>
            <i class="fa-solid fa-chevron-down arrow"></i>`;
  }

  dropdownHtml() {
    return `<div class="currency-custom-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search currency..." autocomplete="off">
            </div>
            <div class="currency-custom-options"></div>`;
  }

  listElement() {
    return this.root.querySelector('.currency-custom-options');
  }

  optionHtml(o) {
    const search = escapeHtml(`${o.value} ${o.label}`.toLowerCase());
    return `
      <div class="currency-custom-option" data-value="${escapeHtml(o.value)}" data-search="${search}">
        <span class="code">${escapeHtml(o.value)}</span>
        <span class="name">${escapeHtml(o.label)}</span>
      </div>`;
  }

  updateTriggerExtra(current) {
    this.trigger.querySelector('.currency-code').textContent = current ? current.value : '';
  }
}
