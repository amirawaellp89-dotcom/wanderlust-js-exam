// Small pure helpers shared across the app

export const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

export const flagEmoji = (code) =>
  [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

export const flagUrl = (code, width = 40) => `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;

// "2026-01-25" -> local Date (avoids timezone shifting)
export const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatDate = (str, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) =>
  parseDate(str).toLocaleDateString('en-US', opts);

export const formatNumber = (n) => Number(n).toLocaleString('en-US');

export const capitalize = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
