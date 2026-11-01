import Store from './core/Store.js';
import ApiService from './core/ApiService.js';
import UI from './core/UI.js';
import Router from './core/Router.js';
import PlansManager from './services/PlansManager.js';

import DashboardView from './views/DashboardView.js';
import HolidaysView from './views/HolidaysView.js';
import LongWeekendsView from './views/LongWeekendsView.js';
import EventsView from './views/EventsView.js';
import WeatherView from './views/WeatherView.js';
import CurrencyView from './views/CurrencyView.js';
import SunTimesView from './views/SunTimesView.js';
import PlansView from './views/PlansView.js';

class App {
  constructor() {
    // shared services, handed to every view
    this.store = new Store();
    this.api = new ApiService();
    this.plans = new PlansManager();
    this.ui = new UI();

    this.views = [
      new DashboardView(this),
      new HolidaysView(this),
      new EventsView(this),
      new WeatherView(this),
      new LongWeekendsView(this),
      new CurrencyView(this),
      new SunTimesView(this),
      new PlansView(this),
    ];

    this.router = new Router(this.views);
  }

  init() {
    this.bindSidebar();
    this.startClock();
    this.plans.subscribe(() => this.updatePlansCounters());
    this.updatePlansCounters();
    this.router.init();
  }

  bindSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = (open) => {
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('hidden', !open);
      overlay.classList.toggle('active', open);
    };
    document.getElementById('mobile-menu-btn').addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
    overlay.addEventListener('click', () => toggle(false));
    sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav-item')) toggle(false); });
  }

  startClock() {
    const el = document.getElementById('current-datetime');
    const tick = () => {
      el.textContent = new Date().toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    };
    tick();
    setInterval(tick, 30000);
  }

  updatePlansCounters() {
    const n = this.plans.count();
    const badge = document.getElementById('plans-count');
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
    document.getElementById('stat-saved').textContent = n;
  }
}

new App().init();
