// "My Plans" – everything is stored in LocalStorage (no endpoints).
export default class PlansManager {
  static KEY = 'wanderlust:plans';

  #plans = [];
  #listeners = new Set();

  constructor() {
    this.#plans = this.#read();
  }

  getAll(type = 'all') {
    return type === 'all' ? [...this.#plans] : this.#plans.filter((p) => p.type === type);
  }

  count(type = 'all') {
    return this.getAll(type).length;
  }

  has(id) {
    return this.#plans.some((p) => p.id === id);
  }

  add(plan) {
    if (this.has(plan.id)) return false;
    this.#plans.push({ ...plan, savedAt: Date.now() });
    this.#write();
    return true;
  }

  remove(id) {
    this.#plans = this.#plans.filter((p) => p.id !== id);
    this.#write();
  }

  // returns true if the plan was added, false if it was removed
  toggle(plan) {
    if (this.has(plan.id)) {
      this.remove(plan.id);
      return false;
    }
    this.add(plan);
    return true;
  }

  clear() {
    this.#plans = [];
    this.#write();
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #read() {
    try {
      const data = JSON.parse(localStorage.getItem(PlansManager.KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  #write() {
    try {
      localStorage.setItem(PlansManager.KEY, JSON.stringify(this.#plans));
    } catch { /* storage unavailable */ }
    this.#listeners.forEach((fn) => fn(this.getAll()));
  }
}
