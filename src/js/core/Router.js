// History-API router: /weather, /plans ... without reloading the page.
// Each view owns a <section id="{id}-view"> that already exists in index.html.
export default class Router {
  constructor(views) {
    this.views = views;
    this.routes = new Map();
    views.forEach((v) => {
      this.routes.set(v.path, v);
      v.aliases.forEach((a) => this.routes.set(a, v));
    });
    this.current = null;
    this.basePath = '';
  }

  init() {
    this.basePath = this.#detectBasePath();

    window.addEventListener('popstate', () => this.resolve());

    // any element with data-view="..." navigates (sidebar links, buttons...)
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-view]');
      if (!el) return;
      e.preventDefault();
      this.goTo(el.dataset.view);
    });

    return this.resolve();
  }

  goTo(viewId) {
    const view = this.views.find((v) => v.id === viewId);
    return view ? this.navigate(view.path) : undefined;
  }

  navigate(path) {
    const target = this.basePath + path;
    if (location.pathname !== target) history.pushState({}, '', target);
    return this.resolve();
  }

  async resolve() {
    const path = this.#normalize(location.pathname);
    let view = this.routes.get(path);
    if (!view) {
      view = this.routes.get('/');
      history.replaceState({}, '', this.basePath + '/');
    }
    await this.#show(view);
  }

  async #show(view) {
    if (this.current && this.current !== view) this.current.leave();
    this.current = view;

    document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s === view.section));
    document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.view === view.id));
    document.getElementById('page-title').textContent = view.title;
    document.getElementById('page-subtitle').textContent = view.subtitle;
    document.title = `${view.title} | Wanderlust`;
    window.scrollTo({ top: 0 });

    await view.enter();
  }

  #normalize(pathname) {
    let p = pathname;
    if (this.basePath && p.startsWith(this.basePath)) p = p.slice(this.basePath.length);
    p = p.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return p || '/';
  }

  // Works even if the project is served from a sub-folder (e.g. /wanderlust/index.html)
  #detectBasePath() {
    const p = location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    for (const route of this.routes.keys()) {
      if (route !== '/' && p.endsWith(route)) return p.slice(0, -route.length);
    }
    return p;
  }
}
