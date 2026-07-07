/**
 * 商标翻译校对系统 - 主应用逻辑
 * 
 * 依赖：CONFIG (config.js), API (api.js), Utils (utils.js)
 * 全局状态：currentUser, currentPage
 */

// ===== 全局状态 =====
let currentUser = null;
let currentPage = 1;
const PAGE_SIZE = CONFIG.PAGE_SIZE;
const USER_KEY = CONFIG.USER_KEY;
const STATUS_LABEL = { pending: '待修正', corrected: '已修正', reviewed: '已审核' };

// ===== 渲染函数 =====

/** 渲染统计卡片 */
function renderStats(stats) {
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statPending').textContent = stats.pending;
  document.getElementById('statCorrected').textContent = stats.corrected;
  document.getElementById('statReviewed').textContent = stats.reviewed;

  const claimable = stats.claimable;
  document.getElementById('claimableCount').textContent = claimable;
  document.getElementById('claimBadge').textContent = claimable;
  const claimBtn = document.getElementById('claimBtn');
  claimBtn.disabled = claimable === 0;
  document.getElementById('claimInput').max = claimable || 1;
  if (parseInt(document.getElementById('claimInput').value) > claimable) {
    document.getElementById('claimInput').value = Math.min(claimable, 1);
  }
}

/** 渲染表格 */
function renderTable(result) {
  const tbody = document.getElementById('tableBody');
  const { items, total, page, pageSize, totalPages } = result;
  currentPage = page;

  const isAdmin = currentUser && currentUser.role === 'admin';
  document.getElementById('assigneeHeader').style.display = isAdmin ? 'table-cell' : 'none';

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无匹配的商标数据</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = items.map((item, idx) => {
      const globalIdx = (page - 1) * pageSize + idx + 1;
      const statusLabel = STATUS_LABEL[item.status] || item.status;
      const isPending = item.status === 'pending';
      const isCorrected = item.status === 'corrected';

      const canEdit = (isPending || isCorrected) &&
        (!item.assignedTo || item.assignedTo === currentUser?.username);
      const canReview = currentUser && currentUser.role === 'admin' && (isPending || isCorrected);

      const correctedDisplay = item.correctedTranslation || '';
      const correctedClass = correctedDisplay ? '' : 'empty';
      const correctedText = correctedDisplay || '未修正';

      let assigneeDisplay = '';
      if (isAdmin) {
        if (item.assignedTo) {
          const isSelf = item.assignedTo === currentUser?.username;
          assigneeDisplay = `<span class="assignee-tag ${isSelf ? 'self' : ''}">${Utils.escapeHtml(item.assignedTo)}</span>`;
        } else {
          assigneeDisplay = `<span class="assignee-tag unassigned">—</span>`;
        }
      }

      return `
        <tr>
          <td style="color:#94a3b8;font-weight:500;">${globalIdx}</td>
          <td class="brand-name">${Utils.escapeHtml(item.brandName)}</td>
          <td><span class="brand-class">${item.class}</span></td>
          <td>${Utils.escapeHtml(item.sourceText)}</td>
          <td class="machine-trans" title="${Utils.escapeHtml(item.machineTranslation)}">${Utils.escapeHtml(item.machineTranslation)}</td>
          <td class="corrected-trans ${correctedClass}" title="${Utils.escapeHtml(correctedDisplay)}">${Utils.escapeHtml(correctedText)}</td>
          <td><span class="status-badge ${item.status}"><span class="dot"></span>${statusLabel}</span></td>
          <td style="${isAdmin ? '' : 'display:none;'}">${assigneeDisplay}</td>
          <td class="time-text">${Utils.formatTime(item.createdAt)}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon edit ${!canEdit ? 'disabled' : ''}" data-id="${item.id}" title="修正译文">✏️</button>
              ${canReview ? `<button class="btn-icon review" data-id="${item.id}" title="审核通过">✔️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 分页信息
  document.getElementById('pageInfo').textContent = `共 ${total} 条，第 ${page}/${totalPages} 页`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= totalPages;

  const pageNumbers = document.getElementById('pageNumbers');
  let pagesHtml = '';
  const showPages = 5;
  let startPage = Math.max(1, page - Math.floor(showPages / 2));
  let endPage = Math.min(totalPages, startPage + showPages - 1);
  if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1);
  for (let i = startPage; i <= endPage; i++) {
    pagesHtml += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  pageNumbers.innerHTML = pagesHtml;

  // 绑定分页事件
  document.querySelectorAll('#pageNumbers button').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (p !== currentPage) { currentPage = p; loadData(); }
    });
  });
  document.getElementById('prevPage').onclick = () => {
    if (currentPage > 1) { currentPage--; loadData(); }
  };
  document.getElementById('nextPage').onclick = () => {
    if (currentPage < totalPages) { currentPage++; loadData(); }
  };

  // 绑定操作按钮
  tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
    if (!btn.classList.contains('disabled')) {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    }
  });
  tbody.querySelectorAll('.btn-icon.review').forEach(btn => {
    btn.addEventListener('click', () => reviewItem(parseInt(btn.dataset.id)));
  });
}

// ===== 核心业务逻辑 =====

/** 加载数据（并行请求统计 + 列表） */
async function loadData() {
  try {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const [stats, listResult] = await Promise.all([
      API.getStats(),
      API.getTrademarks(currentPage, PAGE_SIZE, search, status)
    ]);
    renderStats(stats);
    renderTable(listResult);
  } catch (err) {
    Utils.showToast('加载数据失败: ' + err.message, 'error');
  }
}

/** 领取任务 */
async function claimTasks(count) {
  if (!currentUser || currentUser.role !== 'employee') {
    Utils.showToast('仅员工可以领取任务', 'error');
    return false;
  }
  try {
    const result = await API.claimTasks(count);
    Utils.showToast(`✅ ${result.message}`, 'success');
    await loadData();
    return true;
  } catch (err) {
    Utils.showToast(err.message, 'error');
    return false;
  }
}

// ===== 编辑模态框 =====
let editingId = null;

async function openEditModal(id) {
  try {
    const item = await API.getTrademarkDetail(id);
    if (item.status === 'reviewed') {
      Utils.showToast('已审核的商标不能修改', 'warning');
      return;
    }
    if (item.assignedTo && item.assignedTo !== currentUser?.username) {
      Utils.showToast('该任务已分配给其他员工，无法编辑', 'error');
      return;
    }
    editingId = id;
    document.getElementById('modalBrandName').textContent = item.brandName;
    document.getElementById('modalSourceText').textContent = item.sourceText;
    document.getElementById('modalMachineTrans').textContent = item.machineTranslation;
    document.getElementById('modalCorrectedInput').value = item.correctedTranslation || '';
    document.getElementById('editModal').classList.add('open');
  } catch (err) {
    Utils.showToast('获取数据失败: ' + err.message, 'error');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

async function saveCorrection() {
  if (editingId === null) return;
  const newTranslation = document.getElementById('modalCorrectedInput').value.trim();
  if (!newTranslation) {
    Utils.showToast('请输入修正译文', 'warning');
    return;
  }
  try {
    await API.saveCorrection(editingId, newTranslation);
    closeEditModal();
    Utils.showToast('✅ 修正已保存', 'success');
    await loadData();
  } catch (err) {
    Utils.showToast(err.message, 'error');
    closeEditModal();
    await loadData();
  }
}

// ===== 审核功能 =====
async function reviewItem(id) {
  if (!currentUser || currentUser.role !== 'admin') {
    Utils.showToast('只有管理员可以审核', 'error');
    return;
  }
  try {
    const item = await API.getTrademarkDetail(id);
    if (item.status === 'reviewed') {
      Utils.showToast('该条目已审核', 'info');
      return;
    }
    if (!item.correctedTranslation) {
      Utils.showToast('请先修正译文再审核', 'warning');
      return;
    }
    if (!confirm(`确认审核通过「${item.brandName}」的译文？`)) return;
    await API.reviewTrademark(id);
    Utils.showToast(`🏅 「${item.brandName}」已审核通过`, 'success');
    await loadData();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

// ===== 应用生命周期 =====

function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');

  if (currentUser) {
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRoleTag').textContent = currentUser.role === 'admin' ? '管理员' : '员工';

    const claimPanel = document.getElementById('claimPanel');
    if (currentUser.role === 'employee') {
      claimPanel.style.display = 'flex';
    } else {
      claimPanel.style.display = 'none';
    }
  }
  loadData();
}

async function initApp() {
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

// ===== 事件绑定（入口） =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // 登录
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    const errorEl = document.getElementById('loginError');
    try {
      const result = await API.login(username, password);
      errorEl.textContent = '';
      API.setToken(result.token);
      currentUser = result.user;
      sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
      showApp();
      Utils.showToast(`👋 欢迎回来，${result.user.name}！`, 'success');
    } catch (err) {
      errorEl.textContent = '❌ ' + err.message;
    }
  });

  // 退出
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('确认退出登录？')) {
      try { await API.logout(); } catch (_) { /* ignore */ }
      API.clearToken();
      sessionStorage.removeItem(USER_KEY);
      currentUser = null;
      showLogin();
      Utils.showToast('已安全退出', 'info');
    }
  });

  // 搜索（防抖）
  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentPage = 1; loadData(); }, 300);
  });

  // 状态筛选
  document.getElementById('statusFilter').addEventListener('change', () => {
    currentPage = 1;
    loadData();
  });

  // 刷新
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadData();
    Utils.showToast('数据已刷新', 'info');
  });

  // 领取任务
  document.getElementById('claimBtn').addEventListener('click', async () => {
    const input = document.getElementById('claimInput');
    let count = parseInt(input.value) || 1;
    if (count < 1) count = 1;
    if (count === 0) {
      Utils.showToast('没有可领取的任务', 'warning');
      return;
    }
    await claimTasks(count);
  });
  document.getElementById('claimInput').addEventListener('change', function() {
    let val = parseInt(this.value) || 1;
    const max = parseInt(this.max) || 99;
    if (val < 1) val = 1;
    if (val > max) val = max;
    this.value = val;
  });

  // 模态框
  document.getElementById('modalClose').addEventListener('click', closeEditModal);
  document.getElementById('modalCancel').addEventListener('click', closeEditModal);
  document.getElementById('modalSave').addEventListener('click', saveCorrection);
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('modalCorrectedInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveCorrection();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
  });

  // 点击演示账号快速填充
  document.querySelector('.demo-hint')?.addEventListener('click', (e) => {
    const text = e.target.textContent?.trim();
    if (text && (text.includes('employee') || text.includes('admin'))) {
      const parts = text.split('/');
      if (parts.length >= 2) {
        const user = parts[0].trim();
        const pass = parts[1].trim().replace(/\|.*$/, '').trim();
        document.getElementById('loginUser').value = user;
        document.getElementById('loginPass').value = pass;
      }
    }
  });

  console.log('📦 商标翻译校对系统 v4 (模块化) 已启动。');
  console.log(`   API 地址: ${CONFIG.API_BASE_URL}`);
});