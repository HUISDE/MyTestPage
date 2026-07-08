/**
 * 商标翻译校对系统 - 主入口
 *
 * 职责：
 *   1. 应用初始化（认证检测、自动登录恢复）
 *   2. 页面切换（登录 ↔ 主应用）
 *   3. 组件协调（连接各独立组件）
 *
 * 依赖：CONFIG, API, Toast, LoginPage, StatsGrid, ClaimPanel,
 *       Toolbar, DataTable, EditModal
 */

// ===== 全局状态 =====
let currentUser = null;
const PAGE_SIZE = CONFIG.PAGE_SIZE;
const USER_KEY = CONFIG.USER_KEY;

// ===== 页面切换 =====

/** 显示登录页 */
function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
  LoginPage.render('loginPage', handleLoginSuccess);
}

/** 登录成功回调 */
function handleLoginSuccess(user) {
  currentUser = user;
  showApp();
}

/** 显示主应用 */
function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');
  applyUserToShell();
  applyUserToComponents();
  loadData();
}

/** 更新导航栏用户信息 */
function applyUserToShell() {
  if (!currentUser) return;
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRoleTag').textContent =
    currentUser.role === 'admin' ? '管理员' : '员工';
}

/** 将用户透传给各组件并做权限控制 */
function applyUserToComponents() {
  if (!currentUser) return;

  // 数据表格
  DataTable.setUser(currentUser);

  // 编辑 / 审核模态框
  EditModal.setUser(currentUser);

  // 任务领取面板：仅员工可见
  ClaimPanel.setVisible(currentUser.role === 'employee');
}

// ===== 数据加载（组件协调） =====

async function loadData() {
  try {
    const search = Toolbar.getSearch();
    const status = Toolbar.getStatus();
    const page = DataTable.getCurrentPage();

    const [stats, listResult] = await Promise.all([
      API.getStats(),
      API.getTrademarks(page, PAGE_SIZE, search, status)
    ]);

    // 统计卡片
    StatsGrid.render(stats);

    // 任务领取面板状态更新
    if (stats.claimable !== undefined) {
      ClaimPanel.update(stats.claimable);
    }

    // 数据表格
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

// ===== 应用初始化 =====

async function initApp() {
  // 初始化各组件回调
  ClaimPanel.init('claimPanel', () => { DataTable.resetPage(); loadData(); });

  Toolbar.init({
    onSearch: () => { DataTable.resetPage(); loadData(); },
    onFilter: () => { DataTable.resetPage(); loadData(); },
    onRefresh: loadData
  });

  DataTable.init({
    onEdit: (id) => EditModal.open(id),
    onReview: (id) => EditModal.review(id),
    onPageChange: loadData
  });

  EditModal.init(() => { DataTable.resetPage(); loadData(); });
  bindLogout();

  // 自动登录检测
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

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  console.log('📦 商标翻译校对系统 v5 (组件化解耦) 已启动。');
  console.log(`   API 地址: ${CONFIG.API_BASE_URL}`);
});