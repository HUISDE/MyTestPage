/**
 * 数据表格组件
 * 负责商标列表的表格渲染、分页、操作按钮绑定
 * 依赖：API, Toast
 */
const DataTable = (() => {
  const STATUS_LABEL = { pending: '待修正', corrected: '已修正', reviewed: '已审核' };

  let currentUser = null;
  let currentPage = 1;
  let totalPages = 1;

  // 回调
  let onEditCallback = null;
  let onReviewCallback = null;
  let onPageChangeCallback = null;

  /**
   * @param {object} callbacks
   * @param {function} callbacks.onEdit - 编辑按钮点击 (id)
   * @param {function} callbacks.onReview - 审核按钮点击 (id)
   * @param {function} callbacks.onPageChange - 分页变化 (page)
   */
  function init(callbacks) {
    onEditCallback = callbacks.onEdit;
    onReviewCallback = callbacks.onReview;
    onPageChangeCallback = callbacks.onPageChange;
  }

  /** 设置当前用户 */
  function setUser(user) {
    currentUser = user;
  }

  /** 获取当前页码 */
  function getCurrentPage() {
    return currentPage;
  }

  /** 重置到第一页 */
  function resetPage() {
    currentPage = 1;
  }

  /**
   * 渲染表格
   * @param {object} result - API 返回的分页对象 { items, total, page, pageSize, totalPages }
   */
  function render(result) {
    const { items, total, page, pageSize, totalPages: tp } = result;
    currentPage = page;
    totalPages = tp;

    const isAdmin = currentUser && currentUser.role === 'admin';
    document.getElementById('assigneeHeader').style.display = isAdmin ? 'table-cell' : 'none';

    const tbody = document.getElementById('tableBody');

    // 空状态
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
            assigneeDisplay = `<span class="assignee-tag ${isSelf ? 'self' : ''}">${escapeHtml(item.assignedTo)}</span>`;
          } else {
            assigneeDisplay = `<span class="assignee-tag unassigned">—</span>`;
          }
        }

        return `
          <tr>
            <td style="color:#94a3b8;font-weight:500;">${globalIdx}</td>
            <td class="brand-name">${escapeHtml(item.brandName)}</td>
            <td><span class="brand-class">${item.class}</span></td>
            <td>${escapeHtml(item.sourceText)}</td>
            <td class="machine-trans" title="${escapeHtml(item.machineTranslation)}">${escapeHtml(item.machineTranslation)}</td>
            <td class="corrected-trans ${correctedClass}" title="${escapeHtml(correctedDisplay)}">${escapeHtml(correctedText)}</td>
            <td><span class="status-badge ${item.status}"><span class="dot"></span>${statusLabel}</span></td>
            <td style="${isAdmin ? '' : 'display:none;'}">${assigneeDisplay}</td>
            <td class="time-text">${formatTime(item.createdAt)}</td>
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

    renderPagination(total, page, tp);
    bindActionButtons();
  }

  /** 渲染分页 */
  function renderPagination(total, page, tp) {
    document.getElementById('pageInfo').textContent = `共 ${total} 条，第 ${page}/${tp} 页`;
    document.getElementById('prevPage').disabled = page <= 1;
    document.getElementById('nextPage').disabled = page >= tp;

    const pageNumbers = document.getElementById('pageNumbers');
    const showPages = 5;
    let startPage = Math.max(1, page - Math.floor(showPages / 2));
    let endPage = Math.min(tp, startPage + showPages - 1);
    if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1);

    let html = '';
    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    pageNumbers.innerHTML = html;

    // 分页按钮事件
    pageNumbers.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p !== currentPage) {
          currentPage = p;
          if (onPageChangeCallback) onPageChangeCallback(p);
        }
      });
    });

    document.getElementById('prevPage').onclick = () => {
      if (currentPage > 1) { currentPage--; if (onPageChangeCallback) onPageChangeCallback(currentPage); }
    };
    document.getElementById('nextPage').onclick = () => {
      if (currentPage < totalPages) { currentPage++; if (onPageChangeCallback) onPageChangeCallback(currentPage); }
    };
  }

  /** 绑定操作按钮 */
  function bindActionButtons() {
    const tbody = document.getElementById('tableBody');
    tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
      if (!btn.classList.contains('disabled')) {
        btn.addEventListener('click', () => {
          if (onEditCallback) onEditCallback(parseInt(btn.dataset.id));
        });
      }
    });
    tbody.querySelectorAll('.btn-icon.review').forEach(btn => {
      btn.addEventListener('click', () => {
        if (onReviewCallback) onReviewCallback(parseInt(btn.dataset.id));
      });
    });
  }

  // ---- 工具函数 ----
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    try { return new Date(isoStr).toLocaleString('zh-CN'); } catch (_) { return isoStr; }
  }

  return { init, setUser, getCurrentPage, resetPage, render };
})();