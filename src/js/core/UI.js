// Loading overlay, toasts and confirm dialogs (SweetAlert2 is loaded globally in index.html)
export default class UI {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
    this.text = document.getElementById('loading-text');
    this.pending = 0;
  }

  showLoading(message = 'Loading...') {
    this.pending++;
    this.text.textContent = message;
    this.overlay.classList.remove('hidden');
  }

  hideLoading() {
    this.pending = Math.max(0, this.pending - 1);
    if (!this.pending) this.overlay.classList.add('hidden');
  }

  toast(message, type = 'success') {
    const icons = {
      success: 'fa-circle-check', error: 'fa-circle-xmark',
      info: 'fa-circle-info', warning: 'fa-triangle-exclamation',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span></span>
      <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`;
    el.querySelector('span').textContent = message;

    const remove = () => el.remove();
    el.querySelector('.toast-close').addEventListener('click', remove);
    document.getElementById('toast-container').appendChild(el);
    setTimeout(remove, 3000);
  }

  async confirm(title, text, confirmText = 'Yes') {
    const result = await window.Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      confirmButtonColor: '#dc2626',
    });
    return result.isConfirmed;
  }
}
