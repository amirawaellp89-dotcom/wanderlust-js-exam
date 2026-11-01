import BaseView from './BaseView.js';
import { escapeHtml, formatDate, toISO } from '../utils/helpers.js';

const CATEGORIES = ['music', 'sports', 'arts'];

const NAMES = {
  music: ['Jazz Night Live', 'Rock Festival', 'Symphony Orchestra', 'Electronic Dance Party', 'Blues Concert', 'World Music Celebration', 'Indie Band Showcase', 'Hip Hop Night'],
  sports: ['Football Match', 'Basketball Game', 'Tennis Tournament', 'Ice Hockey Night', 'Rugby Championship', 'Marathon Race', 'Boxing Championship', 'Soccer Derby'],
  arts: ['Theatre Play', 'Ballet Performance', 'Comedy Show', 'Opera Night', 'Art Exhibition', 'Stand-up Comedy', 'Film Festival', 'Dance Recital'],
};
const VENUES = {
  music: ['Music Hall', 'Concert Arena', 'Live House', 'Amphitheater', 'Jazz Club'],
  sports: ['Sports Stadium', 'Arena', 'Olympic Center', 'Athletic Complex', 'Sports Park'],
  arts: ['Theatre', 'Opera House', 'Cultural Center', 'Art Gallery', 'Playhouse'],
};
// default images per category (also used when an event has no picture)
const IMAGES = {
  music: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=250&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934-aba008cd3e95?w=400&h=250&fit=crop',
  arts: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=250&fit=crop',
  default: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=250&fit=crop',
};

export default class EventsView extends BaseView {
  constructor(app) {
    super(app, {
      id: 'events',
      path: '/events',
      title: 'Events',
      subtitle: 'Concerts, sports and more',
      badge: { city: true },
    });
    this.events = [];
  }

  async init() {
    this.$content = document.getElementById('events-content');
    this.$content.addEventListener('click', (e) => {
      const ticket = e.target.closest('.btn-buy-ticket');
      if (ticket && ticket.getAttribute('href') === '#') {
        e.preventDefault();
        return this.ui.toast('Ticket link not available', 'info');
      }
      const btn = e.target.closest('.event-card-save, .btn-event');
      if (btn) this.toggleSave(Number(btn.closest('.event-card').dataset.index), btn.closest('.event-card'));
    });
  }

  async render() {
    this.renderSelectionBadge(this.badge);
    const sel = this.store.getSelection();
    if (!sel) return this.renderNoSelection(this.$content);

    const city = (sel.city || sel.name).replace(' (Capital)', '');
    this.setHeaderText(`Discover concerts, sports, theatre and more in ${city}`);
    this.ui.showLoading('Loading events...');
    try {
      const raw = await this.api.getEvents({ city, countryCode: sel.code });
      // request failed -> mock events (as the guide says); no events found -> empty state
      this.events = !raw?.length ? this.mockEvents(city) : raw.map((e) => this.fromApi(e));
      this.renderCards(sel);
    } finally {
      this.ui.hideLoading();
    }
  }

  // Ticketmaster event -> our simple event object
  fromApi(e) {
    const category = e.classifications?.[0]?.segment?.name || 'Event';
    const venue = e._embedded?.venues?.[0];
    const image = e.images?.find((i) => i.width > 300) || e.images?.[0];
    return {
      id: e.id,
      name: e.name,
      category,
      date: e.dates?.start?.localDate || '',
      time: e.dates?.start?.localTime?.slice(0, 5) || '',
      venue: venue?.name || 'TBA',
      city: venue?.city?.name || '',
      image: image?.url || IMAGES[category.toLowerCase()] || IMAGES.default,
      url: e.url || '#',
    };
  }

  // fallback when the API request fails (same idea as the demo)
  mockEvents(city) {
    const seed = [...city].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return Array.from({ length: 8 }, (_, d) => {
      const category = CATEGORIES[(d + seed) % 3];
      const date = new Date();
      date.setDate(date.getDate() + ((d + seed) % 14) + 1);
      return {
        id: `mock-${d}-${seed}`,
        name: `${NAMES[category][(d + seed) % NAMES[category].length]} in ${city}`,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        date: toISO(date),
        time: `${18 + (d % 4)}:00`,
        venue: `${city} ${VENUES[category][(d + seed) % VENUES[category].length]}`,
        city,
        image: IMAGES[category],
        url: '#',
      };
    });
  }

  dateLabel(ev) {
    if (!ev.date) return 'Date to be announced';
    return formatDate(ev.date, { month: 'short', day: 'numeric', year: 'numeric' }) + (ev.time ? ` at ${ev.time}` : '');
  }

  planId(sel, ev) {
    return `event:${sel.code}:${ev.id}`;
  }

  renderCards(sel) {
    if (!this.events.length) {
      return this.renderMessage(this.$content, {
        icon: 'fa-ticket',
        title: 'No Events Found',
        text: 'No events found for this location',
      });
    }

    this.$content.innerHTML = this.events.map((ev, i) => {
      const saved = this.plans.has(this.planId(sel, ev));
      return `
        <div class="event-card" data-index="${i}">
          <div class="event-card-image">
            <img src="${escapeHtml(ev.image)}" alt="${escapeHtml(ev.name)}" loading="lazy">
            <span class="event-card-category">${escapeHtml(ev.category)}</span>
            <button class="event-card-save ${saved ? 'saved' : ''}">${this.heartIcon(saved)}</button>
          </div>
          <div class="event-card-body">
            <h3>${escapeHtml(ev.name)}</h3>
            <div class="event-card-info">
              <div><i class="fa-regular fa-calendar"></i>${escapeHtml(this.dateLabel(ev))}</div>
              <div><i class="fa-solid fa-location-dot"></i>${escapeHtml(ev.venue)}${ev.city ? `, ${escapeHtml(ev.city)}` : ''}</div>
            </div>
            <div class="event-card-footer">
              <button class="btn-event">${this.heartIcon(saved)} ${saved ? 'Saved' : 'Save'}</button>
              <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="btn-buy-ticket"><i class="fa-solid fa-ticket"></i> Buy Tickets</a>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  toggleSave(index, card) {
    const sel = this.store.getSelection();
    const ev = this.events[index];
    if (!sel || !ev) return;

    const added = this.plans.toggle({
      id: this.planId(sel, ev),
      type: 'event',
      title: ev.name,
      subtitle: ev.category,
      dateLabel: this.dateLabel(ev),
      location: `${ev.venue}${ev.city ? `, ${ev.city}` : ''}`,
      countryCode: sel.code,
    });
    const heart = card.querySelector('.event-card-save');
    heart.classList.toggle('saved', added);
    heart.innerHTML = this.heartIcon(added);
    card.querySelector('.btn-event').innerHTML = `${this.heartIcon(added)} ${added ? 'Saved' : 'Save'}`;
    this.ui.toast(added ? 'Saved to My Plans' : 'Removed from My Plans', added ? 'success' : 'info');
  }
}
