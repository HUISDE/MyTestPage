/**
 * Toast 提示组件
 * 全局可用，不依赖任何模块
 */
const Toast = (() => {
  function show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    toast.innerHTML = `
      <span>${icons[type] || 'ℹ️'}</span>
      <span>${escapeHtml(message)}</span>
      <button class="toast-close">×</button>
    `;

    container.appendChild(toast);

    const close = () => { if (toast.parentNode) toast.remove(); };
    toast.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, duration);

    while (container.children.length > 3) {
      container.firstChild.remove();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { show };
})();