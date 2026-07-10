/**
 * 商标翻译校对系统 - 主入口
 *
 * 职责：
 *   1. 应用初始化（认证检测、自动登录恢复）
 *   2. 页面切换（登录 ↔ 主应用）
 *   3. Tab 切换（任务概览 ↔ 工作区）
 *   4. 组件协调（连接各独立组件）
 *
 * 依赖：CONFIG, API, Toast, LoginPage, StatsGrid, ClaimPanel,
 *       Toolbar, DataTable, EditModal
 */

// ===== 全局状态 =====
let currentUser = null;
let currentView = 'overviewView';
let currentSort = { sortBy: 'id', sortOrder: 'ASC' };
let adminUsers = [];
const PAGE_SIZE = CONFIG.PAGE_SIZE;
const USER_KEY = CONFIG.USER_KEY;
const FILTER_KEY = CONFIG.WORKSPACE_FILTER_KEY;

const VIEW_META = {
  overviewView: {
    tag: '任务概览',
    title: '任务概览',
    description: ''
  },
  workspaceView: {
    tag: '翻译工作台',
    title: '翻译工作台',
    description: ''
  },
  adminView: {
    tag: '管理后台',
    title: '管理后台',
    description: ''
  }
};

// ===== 页面切换 =====

function showLogin() {
  document.body.classList.remove('app-authenticated');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
  LoginPage.render('loginPage', handleLoginSuccess);
}

function handleLoginSuccess(user) {
  currentUser = user;
  showApp();
}

function showApp() {
  document.body.classList.add('app-authenticated');
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');
  applyUserToShell();
  applyUserToComponents();
  restoreWorkspaceFilters();
  switchView('overviewView', { forceLoad: true });
}

function applyUserToShell() {
  if (!currentUser) return;
  AppShell.setUser(currentUser);
  AppShell.toggleAdminNav(currentUser.role === 'admin');
}

function applyUserToComponents() {
  if (!currentUser) return;
  DataTable.setUser(currentUser);
  EditModal.setUser(currentUser);
  Toolbar.setUserRole(currentUser.role);

  const assignBox = document.getElementById('assignBox');
  const selectHeader = document.getElementById('selectHeader');
  if (assignBox) assignBox.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
  if (selectHeader) selectHeader.style.display = currentUser.role === 'admin' ? 'table-cell' : 'none';
  ClaimPanel.setVisible(currentUser.role === 'employee');
}

function switchView(viewId, options = {}) {
  if (!currentUser) return;
  if (viewId === 'adminView' && currentUser.role !== 'admin') return;

  currentView = viewId;
  AppShell.switchView(viewId, VIEW_META[viewId], getViewActions(viewId));

  if (viewId === 'adminView') {
    AdminPage.load();
    return;
  }

  if (viewId === 'overviewView' || viewId === 'workspaceView' || options.forceLoad) {
    loadData();
  }
}

function getViewActions(viewId) {
  if (viewId === 'overviewView') {
    return {
      primaryText: '进入工作区',
      secondaryText: currentUser?.role === 'admin' ? '前往管理后台' : '刷新概览',
      primaryVisible: true,
      secondaryVisible: true
    };
  }

  if (viewId === 'workspaceView') {
    return {
      primaryText: '刷新工作台',
      secondaryText: '返回概览',
      primaryVisible: true,
      secondaryVisible: true
    };
  }

  return {
    primaryText: '刷新后台',
    secondaryText: '查看工作区',
    primaryVisible: true,
    secondaryVisible: true
  };
}

function handlePrimaryAction() {
  if (currentView === 'overviewView') {
    switchView('workspaceView');
    return;
  }

  if (currentView === 'workspaceView') {
    loadData();
    Toast.show('工作台已刷新', 'info');
    return;
  }

  AdminPage.load();
  Toast.show('管理后台已刷新', 'info');
}

function handleSecondaryAction() {
  if (currentView === 'overviewView') {
    if (currentUser?.role === 'admin') {
      switchView('adminView');
    } else {
      loadData();
      Toast.show('概览已刷新', 'info');
    }
    return;
  }

  if (currentView === 'workspaceView') {
    switchView('overviewView');
    return;
  }

  switchView('workspaceView');
}

function refreshAssignOptions(users = adminUsers) {
  adminUsers = users || [];
  const select = document.getElementById('assignUserSelect');
  if (!select) return;
  const employees = adminUsers.filter(u => u.role === 'employee' && u.status !== 'disabled');
  select.innerHTML = '<option value="">选择译员</option>' + employees.map(u => `<option value="${u.id}">${u.name || u.username} (${u.username})</option>`).join('');
}

function bindAssignTasks() {
  const btn = document.getElementById('assignSelectedBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const assigneeId = document.getElementById('assignUserSelect')?.value;
    const ids = DataTable.getSelectedIds();
    if (!assigneeId) { Toast.show('请选择译员', 'warning'); return; }
    if (!ids.length) { Toast.show('请先勾选要分配的任务', 'warning'); return; }
    try {
      const result = await API.assignTasks(assigneeId, ids);
      Toast.show(`已分配 ${result.assignedCount || ids.length} 个任务`, 'success');
      DataTable.clearSelected();
      loadData();
      AdminPage.load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  });
}

// ===== 数据加载 =====

function getWorkspaceFilters() {
  const { sortBy, sortOrder } = Toolbar.getSortParams();
  return {
    search: Toolbar.getSearch(),
    status: Toolbar.getStatus(),
    sortBy,
    sortOrder
  };
}

function persistWorkspaceFilters() {
  localStorage.setItem(FILTER_KEY, JSON.stringify(getWorkspaceFilters()));
}

function restoreWorkspaceFilters() {
  let savedFilters = null;
  try {
    savedFilters = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null');
  } catch (_) {
    savedFilters = null;
  }

  const filters = {
    search: savedFilters?.search || '',
    status: savedFilters?.status || 'all',
    sortBy: savedFilters?.sortBy || 'id',
    sortOrder: savedFilters?.sortOrder || 'ASC'
  };
  Toolbar.setValues(filters);
  currentSort = { sortBy: filters.sortBy, sortOrder: filters.sortOrder };
}

async function loadData() {
  try {
    const search = Toolbar.getSearch();
    const status = Toolbar.getStatus();
    const page = DataTable.getCurrentPage();
    const { sortBy, sortOrder } = currentSort;

    const [stats, listResult] = await Promise.all([
      API.getStats(),
      API.getTrademarks(page, PAGE_SIZE, search, status, sortBy, sortOrder)
    ]);

    StatsGrid.render(stats, currentUser?.role || 'employee');
    updateOverviewSurface(stats);
    if (currentUser?.role === 'employee' && stats.claimable !== undefined) {
      ClaimPanel.update(stats.claimable);
    }
    DataTable.render(listResult);
  } catch (err) {
    Toast.show('加载数据失败: ' + err.message, 'error');
  }
}

function updateOverviewSurface(stats) {
  if (!currentUser) return;

  const roleConfigs = {
    employee: {
      description: '',
      metrics: [
        { label: '待修正', value: stats.pending ?? 0 },
        { label: '待审核', value: stats.corrected ?? 0 },
        { label: '可领取', value: stats.claimable ?? 0 }
      ]
    },
    reviewer: {
      description: '',
      metrics: [
        { label: '待审核', value: stats.toReview ?? 0 },
        { label: '已通过', value: stats.approvedByMe ?? 0 },
        { label: '已驳回', value: stats.rejectedByMe ?? 0 }
      ]
    },
    admin: {
      description: '',
      metrics: [
        { label: '总商标', value: stats.total ?? 0 },
        { label: '可分配', value: stats.claimable ?? stats.pending ?? 0 },
        { label: '待审核', value: stats.corrected ?? 0 }
      ]
    }
  };

  const config = roleConfigs[currentUser.role] || roleConfigs.employee;
  AppShell.setOverviewDescription(config.description);
  AppShell.setHeroMetrics(config.metrics);
}

// ===== 退出登录 =====

function bindLogout() {
  return async () => {
    if (confirm('确认退出登录？')) {
      try { await API.logout(); } catch (_) { /* ignore */ }
      API.clearToken();
      sessionStorage.removeItem(USER_KEY);
      currentUser = null;
      showLogin();
      Toast.show('已安全退出', 'info');
    }
  };
}

// ===== 初始化 =====

async function initApp() {
  ClaimPanel.init('claimPanel', () => { DataTable.resetPage(); loadData(); });

  AppShell.init({
    onNavigate: (viewId) => switchView(viewId),
    onPrimaryAction: handlePrimaryAction,
    onSecondaryAction: handleSecondaryAction,
    onLogout: bindLogout()
  });

  Toolbar.init({
    onSearch: () => { persistWorkspaceFilters(); DataTable.resetPage(); loadData(); },
    onFilter: () => { persistWorkspaceFilters(); DataTable.resetPage(); loadData(); },
    onRefresh: loadData,
    onSort: (params) => { currentSort = params; persistWorkspaceFilters(); DataTable.resetPage(); loadData(); }
  });

  DataTable.init({
    onEdit: (id) => EditModal.open(id),
    onReview: (id) => EditModal.review(id),
    onPageChange: loadData
  });

  AdminPage.init('adminPage', { onUsersChanged: refreshAssignOptions });

  ConfirmDialog.init();
  EditModal.init(() => { DataTable.resetPage(); loadData(); });
  bindAssignTasks();

  const savedUser = sessionStorage.getItem(USER_KEY);
  const savedToken = API.getToken();

  if (savedUser && savedToken) {
    try {
      const me = await API.getMe();
      currentUser = me;
      showApp();
      return;
    } catch (_) {
      API.clearToken();
      sessionStorage.removeItem(USER_KEY);
    }
  }
  showLogin();
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  console.log('📦 商标翻译校对系统 v7 (审核员角色 + 驳回) 已启动。');
  console.log(`   API 地址: ${CONFIG.API_BASE_URL}`);
});