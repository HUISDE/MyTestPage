/**
 * 工具栏组件
 * 搜索框 + 状态筛选 + 排序 + 刷新按钮
 * 依赖：Toast
 */
const Toolbar = (() => {
  let onSearchCallback = null;
  let onFilterCallback = null;
  let onSortCallback = null;
  let onRefreshCallback = null;
  let searchTimer = null;

  /**
   * @param {object} callbacks
   * @param {function} callbacks.onSearch - 搜索文本变化
   * @param {function} callbacks.onFilter - 状态筛选变化
   * @param {function} callbacks.onSort - 排序参数变化 ({ sortBy, sortOrder })
   * @param {function} callbacks.onRefresh - 点击刷新
   */
  function init(callbacks) {
    onSearchCallback = callbacks.onSearch;
    onFilterCallback = callbacks.onFilter;
    onSortCallback = callbacks.onSort;
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

    // 排序字段
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', () => {
        if (onSortCallback) onSortCallback(getSortParams());
      });
    }

    // 排序方向
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
      sortOrder.addEventListener('change', () => {
        if (onSortCallback) onSortCallback(getSortParams());
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

  /** 获取当前排序参数 */
  function getSortParams() {
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    return {
      sortBy: sortBy ? sortBy.value : 'id',
      sortOrder: sortOrder ? sortOrder.value : 'ASC'
    };
  }

  return { init, getSearch, getStatus, getSortParams };
})();