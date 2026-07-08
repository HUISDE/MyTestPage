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
let currentSort = { sortBy: 'id', sortOrder: 'ASC' };
const PAGE_SIZE = CONFIG.PAGE_SIZE;
const USER_KEY = CONFIG.USER_KEY;

// ===== 页面切换 =====

function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
  LoginPage.render('loginPage', handleLoginSuccess);
}

function handleLoginSuccess(user) {
  currentUser = user;
  showApp();
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');
  applyUserToShell();
  applyUserToComponents();
  loadData();
}

function applyUserToShell() {
  if (!currentUser) return;
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = currentUser.name;
  const roleLabels = { admin: '超级管理员', reviewer: '审核员', employee: '译员' };
  document.getElementById('userRoleTag').textContent = roleLabels[currentUser.role] || currentUser.role;
}

function applyUserToComponents() {
  if (!currentUser) return;
  DataTable.setUser(currentUser);
  EditModal.setUser(currentUser);

  // 仅译员可见任务领取面板
  if (currentUser.role === 'employee') {
    ClaimPanel.setVisible(true);
  } else {
    ClaimPanel.setVisible(false);
  }
}

// ===== Tab 切换 =====

function bindTabSwitching() {
  const tabNav = document.getElementById('tabNav');
  if (!tabNav) return;
  tabNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    tabNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(btn.dataset.tab);
    if (panel) panel.classList.add('active');
    if (btn.dataset.tab === 'tab-workspace') loadData();
  });
}

// ===== 数据加载 =====

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
    if (currentUser?.role === 'employee' && stats.claimable !== undefined) {
      ClaimPanel.update(stats.claimable);
    }
    DataTable.render(listResult);
  } catch (err) {
    Toast.show('加载数据失败: ' + err.message, 'error');
  }
}

// ===== 退出登录 =====

function bindLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('确认退出登录？')) {
      try { await API.logout(); } catch (_) { /* ignore */ }
      API.clearToken();
      sessionStorage.removeItem(USER_KEY);
      currentUser = null;
      showLogin();
      Toast.show('已安全退出', 'info');
    }
  });
}

// ===== 初始化 =====

async function initApp() {
  ClaimPanel.init('claimPanel', () => { DataTable.resetPage(); loadData(); });

  Toolbar.init({
    onSearch: () => { DataTable.resetPage(); loadData(); },
    onFilter: () => { DataTable.resetPage(); loadData(); },
    onRefresh: loadData,
    onSort: (params) => { currentSort = params; DataTable.resetPage(); loadData(); }
  });

  DataTable.init({
    onEdit: (id) => EditModal.open(id),
    onReview: (id) => EditModal.review(id),
    onPageChange: loadData
  });

  EditModal.init(() => { DataTable.resetPage(); loadData(); });
  bindLogout();
  bindTabSwitching();

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