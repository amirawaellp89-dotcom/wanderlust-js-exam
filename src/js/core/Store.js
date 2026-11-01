// Holds the user's current selection (country / city / year) in memory only.
// It is kept while moving between pages, but a refresh or a new visit starts empty.
// (Saved plans are different: they stay in localStorage, see PlansManager.)
export default class Store {
  static KEY = 'wanderlust:selection';

  #selection = null;
  #listeners = new Set();

  constructor() {
    // older versions saved the selection in the browser: remove it so it can't come back
    try {
      localStorage.removeItem(Store.KEY);
      sessionStorage.removeItem(Store.KEY);
    } catch { /* storage unavailable */ }
  }

  getSelection() {
    return this.#selection;
  }

  hasSelection() {
    return Boolean(this.#selection);
  }

  setSelection(selection) {
    this.#selection = { ...selection };
    this.#notify();
  }

  clear() {
    this.#selection = null;
    this.#notify();
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #notify() {
    this.#listeners.forEach((fn) => fn(this.#selection));
  }
}