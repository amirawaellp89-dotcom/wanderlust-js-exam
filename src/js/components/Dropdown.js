import { escapeHtml } from '../utils/helpers.js';

// Base class for the custom dropdowns. It wraps a native <select> (kept hidden),
// so the rest of the code can still read `select.value` and listen to "change".
// Sub-classes only decide how the trigger and the options look.
export default class Dropdown {
  // CSS class names, overridden by each sub-class
  static CLASSES = { wrapper: '', trigger: '', dropdown: '', option: '' };

  constructor(select, {
    placeholder = 'Select',
    emptyText = 'No options available',
    noResultsText = 'No results found',
    icon = '',
    disableWhenEmpty = false,
    clearable = false,
  } = {}) {
    this.select = select;
    this.placeholder = placeholder;
    this.emptyText = emptyText;
    this.noResultsText = noResultsText;
    this.icon = icon;
    this.disableWhenEmpty = disableWhenEmpty;
    this.clearable = clearable; // adds the placeholder as the first, selectable option

    this.select.classList.add('hidden');
    this.root = document.createElement('div');
    this.root.className = this.classes.wrapper;
    this.select.after(this.root);

    this.build();
    this.bindEvents();
    this.refresh();
  }

  get classes() { return this.constructor.CLASSES; }
  get value() { return this.select.value; }

  // options of the native <select> (the empty placeholder option is skipped)
  get options() {
    return [...this.select.options]
      .filter((o) => o.value !== '')
      .map((o) => ({ value: o.value, label: o.textContent.trim() }));
  }

  // ----- to be provided by sub-classes -----
  triggerHtml() { return ''; }
  dropdownHtml() { return ''; }
  listElement() { return this.dropdown; }
  optionHtml(option) { return `<div class="${this.classes.option}" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</div>`; }
  updateTriggerExtra() {}
  onOpen() {}

  // ----- shared behaviour -----
  build() {
    const c = this.classes;
    this.root.innerHTML = `
      <div class="${c.trigger}">${this.triggerHtml()}</div>
      <div class="${c.dropdown}">${this.dropdownHtml()}</div>`;
    this.trigger = this.root.querySelector(`.${c.trigger}`);
    this.dropdown = this.root.querySelector(`.${c.dropdown}`);
    this.list = this.listElement();
    this.label = this.trigger.querySelector('.selected-text');
  }

  bindEvents() {
    this.trigger.addEventListener('click', () => this.toggle());
    this.list.addEventListener('click', (e) => {
      const option = e.target.closest(`.${this.classes.option}[data-value]`);
      if (option) this.choose(option.dataset.value);
    });
    document.addEventListener('click', (e) => {
      if (!this.root.contains(e.target)) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  // rebuild the list from the native <select> (call it after changing its options)
  refresh() {
    const options = this.options;
    const head = this.clearable && options.length ? this.optionHtml({ value: '', label: this.placeholder }) : '';
    this.list.innerHTML =
      head +
      options.map((o) => this.optionHtml(o)).join('') +
      `<div class="${this.classes.option} no-results" style="display:${options.length ? 'none' : ''}">${escapeHtml(this.noResultsText)}</div>`;
    this.updateTrigger();
  }

  updateTrigger() {
    const options = this.options;
    const current = options.find((o) => o.value === this.select.value);

    this.label.textContent = current ? current.label : options.length ? this.placeholder : this.emptyText;
    this.label.classList.toggle('placeholder', !current);
    this.trigger.classList.toggle('disabled', this.disableWhenEmpty && options.length === 0);
    this.list.querySelectorAll(`.${this.classes.option}[data-value]`).forEach((el) =>
      el.classList.toggle('selected', el.dataset.value === this.select.value)
    );
    this.updateTriggerExtra(current);
  }

  // change the value from code (no "change" event)
  setValue(value) {
    this.select.value = value;
    this.updateTrigger();
  }

  // the user picked an option: update the <select> and fire "change"
  choose(value) {
    this.setValue(value);
    this.close();
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  toggle() {
    if (this.trigger.classList.contains('disabled')) return;
    this.dropdown.classList.contains('open') ? this.close() : this.open();
  }

  open() {
    this.trigger.classList.add('open');
    this.dropdown.classList.add('open');
    this.onOpen();
  }

  close() {
    this.trigger.classList.remove('open');
    this.dropdown.classList.remove('open');
  }
}
