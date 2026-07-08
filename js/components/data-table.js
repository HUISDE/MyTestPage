/**
 * 数据表格组件
 * 负责商标列表的表格渲染、分页、操作按钮绑定
 * 依赖：API, Toast, CONFIG
 */
const DataTable = (() => {
  let currentUser = null;
  let currentPage = 1;
  let totalPages = 1;

  // 回调
  let onEditCallback = null;
  let onReviewCallback = null;
  let onPageChangeCallback = null;

  /**
   * @param {object} callbacks
   * @param {function} callbacks.onEdit - 编辑/查看按钮点击 (id)
   * @param {function} callbacks.onReview - 审核按钮点击 (id)
   * @param {function} callbacks.onPageChange - 分页变化 (page)
   */
  function init(callbacks) {
    onEditCallback = callbacks.onEdit;
    onReviewCallback = callbacks.onReview;
    onPageChangeCallback = callbacks.onPageChange;
  }

  function setUser(user) {
    currentUser = user;
  }

  function getCurrentPage() {
    return currentPage;
  }

  function resetPage() {
    currentPage = 1;
  }

  function render(result) {
    const { items, total, page, pageSize, totalPages: tp } = result;
    currentPage = page;
    totalPages = tp;

    const isReviewer = currentUser && currentUser.role === 'reviewer';
    const isEmployee = currentUser && currentUser.role === 'employee';
    // 审核员隐藏受让人列
    document.getElementById('assigneeHeader').style.display = isReviewer ? 'none' : 'table-cell';

    const tbody = document.getElementById('tableBody');
    const colSpan = isReviewer ? 6 : 7;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}"><div class="empty-state"><div class="empty-icon">📭</div><p>暂无匹配的商标数据</p></div></td></tr>`;
    } else {
      tbody.innerHTML = items.map((item) => {
        const statusIcon = CONFIG.STATUS_ICON[item.status] || '❓';
        const statusTitle = CONFIG.STATUS_LABEL[item.status] || item.status;
        const isPendingOrRejected = item.status === 'pending' || item.status === 'rejected';
        const isCorrected = item.status === 'corrected';

        // 编辑权限：译员可编辑 pending/rejected 且未分配或分配给自己
        const canEdit = isEmployee && (isPendingOrRejected || isCorrected) &&
          (!item.assignedTo || item.assignedTo === currentUser?.username);

        // 审核权限：审核员可审核 corrected 状态
        const canReview = isReviewer && isCorrected;

        // 查看权限：审核员可查看所有，译员可查看自己的
        const canView = isReviewer || (isEmployee && item.assignedTo === currentUser?.username);

        const correctedDisplay = item.correctedTranslation || '';
        const correctedClass = correctedDisplay ? '' : 'empty';
        const correctedText = correctedDisplay || '未修正';

        let actionHtml = '';
        if (isReviewer) {
          actionHtml = `<button class="btn-icon edit" data-id="${item.id}" title="查看详情">📋</button>`;
          if (canReview) {
            actionHtml += `<button class="btn-icon review" data-id="${item.id}" title="审核通过">✅</button>`;
          }
        } else {
          if (canEdit) {
            actionHtml += `<button class="btn-icon edit" data-id="${item.id}" title="修正译文">✏️</button>`;
          }
          if (canReview) {
            actionHtml += `<button class="btn-icon review" data-id="${item.id}" title="审核通过">✅</button>`;
          }
        }

        if (!actionHtml) actionHtml = '<span style="color:#cbd5e1;">—</span>';

        // 审核员隐藏受让人列
        const assigneeCell = isReviewer ? '' : `<td>${item.assignedTo ? `<span class="assignee-tag">${escapeHtml(item.assignedTo)}</span>` : `<span class="assignee-tag unassigned">—</span>`}</td>`;

        return `
          <tr>
            <td class="source-text" title="${escapeHtml(item.sourceText)}">${escapeHtml(item.sourceText)}</td>
            <td class="machine-trans" title="${escapeHtml(item.machineTranslation)}">${escapeHtml(item.machineTranslation)}</td>
            <td class="corrected-trans ${correctedClass}" title="${escapeHtml(correctedDisplay)}">${escapeHtml(correctedText)}</td>
            <td>${item.class ? `<span class="brand-class">${escapeHtml(String(item.class))}</span>` : '—'}</td>
            <td class="status-icon-cell" title="${statusTitle}">${statusIcon}</td>
            ${assigneeCell}
            <td><div class="action-btns">${actionHtml}</div></td>
          </tr>
        `;
      }).join('');
    }

    renderPagination(total, page, tp);
    bindActionButtons();
  }

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

    pageNumbers.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p !== currentPage) { currentPage = p; if (onPageChangeCallback) onPageChangeCallback(p); }
      });
    });

    document.getElementById('prevPage').onclick = () => { if (currentPage > 1) { currentPage--; if (onPageChangeCallback) onPageChangeCallback(currentPage); } };
    document.getElementById('nextPage').onclick = () => { if (currentPage < totalPages) { currentPage++; if (onPageChangeCallback) onPageChangeCallback(currentPage); } };
  }

  function bindActionButtons() {
    const tbody = document.getElementById('tableBody');
    tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
      btn.addEventListener('click', () => { if (onEditCallback) onEditCallback(parseInt(btn.dataset.id)); });
    });
    tbody.querySelectorAll('.btn-icon.review').forEach(btn => {
      btn.addEventListener('click', () => { if (onReviewCallback) onReviewCallback(parseInt(btn.dataset.id)); });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, setUser, getCurrentPage, resetPage, render };
})();