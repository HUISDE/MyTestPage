/**
 * 通用工具函数
 */
const Utils = (() => {
  return {
    /**
     * HTML 转义，防止 XSS
     */
    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /**
     * 格式化 ISO 时间为本地显示
     */
    formatTime(isoStr) {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        return d.toLocaleString('zh-CN');
      } catch (_) {
        return isoStr;
      }
    },

    /**
     * Toast 提示
     */
    showToast(message, type = 'info', duration = 3000) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      toast.innerHTML = `
        <span>${icons[type] || 'ℹ️'}</span>
        <span>${this.escapeHtml(message)}</span>
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
  };
})();