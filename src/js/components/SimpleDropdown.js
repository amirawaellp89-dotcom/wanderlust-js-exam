import Dropdown from './Dropdown.js';
import { escapeHtml } from '../utils/helpers.js';

// Simple list (no search) used for City and Year
export default class SimpleDropdown extends Dropdown {
  static CLASSES = {
    wrapper: 'simple-select-wrapper',
    trigger: 'simple-select-trigger',
    dropdown: 'simple-select-dropdown',
    option: 'simple-select-option',
  };

  triggerHtml() {
    return `${this.icon ? `<i class="fa-solid ${this.icon} select-icon"></i>` : ''}
            <span class="selected-text placeholder"></span>
            <i class="fa-solid fa-chevron-down arrow"></i>`;
  }

  optionHtml(o) {
    return `<div class="simple-select-option" data-value="${escapeHtml(o.value)}"><span>${escapeHtml(o.label)}</span></div>`;
  }
}
