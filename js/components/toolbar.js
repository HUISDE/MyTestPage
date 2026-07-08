/**
 * 工具栏组件
 * 搜索框 + 状态筛选 + 刷新按钮
 * 依赖：Toast
 */
const Toolbar = (() => {
  let onSearchCallback = null;
  let onFilterCallback = null;
  let onRefreshCallback = null;
  let searchTimer = null;

  /**
   * @param {object} callbacks
   * @param {function} callbacks.onSearch - 搜索文本变化
   * @param {function} callbacks.onFilter - 状态筛选变化
   * @param {function} callbacks.onRefresh - 点击刷新
   */
  function init(callbacks) {
    onSearchCallback = callbacks.onSearch;
    onFilterCallback = callbacks.onFilter;
    onRefreshCallback = callbacks.onRefresh;
    bindEvents();
  }

  function bindEvents() {
    // 搜索（300ms 防抖）
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          if (onSearchCallback) onSearchCallback();
        }, 300);
      });
    }

    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        if (onFilterCallback) onFilterCallback();
      });
    }

    // 刷新
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (onRefreshCallback) {
          onRefreshCallback();
        }
        Toast.show('数据已刷新', 'info');
      });
    }
  }

  /** 获取当前搜索文本 */
  function getSearch() {
    const el = document.getElementById('searchInput');
    return el ? el.value : '';
  }

  /** 获取当前筛选状态 */
  function getStatus() {
    const el = document.getElementById('statusFilter');
    return el ? el.value : 'all';
  }

  return { init, getSearch, getStatus };
})();