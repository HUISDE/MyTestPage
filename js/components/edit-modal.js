/**
 * 编辑模态框组件
 * 用于修正译文的弹窗，显示辅助信息
 * 依赖：API, Toast, CONFIG
 */
const EditModal = (() => {
  let editingId = null;
  let currentUser = null;
  let onSavedCallback = null;

  const LONG_TEXT_THRESHOLD = 80;

  function init(onSaved) {
    onSavedCallback = onSaved;
    bindEvents();
  }

  function setUser(user) {
    currentUser = user;
  }

  async function open(id) {
    try {
      const item = await API.getTrademarkDetail(id);
      if (currentUser && currentUser.role === 'reviewer') { openAsReviewer(item); return; }

      if (item.status === 'reviewed') { Toast.show('已审核的商标不能修改', 'warning'); return; }
      if (item.assignedTo && item.assignedTo !== currentUser?.username) { Toast.show('该任务已分配给其他员工，无法编辑', 'error'); return; }

      editingId = id;
      populateText('modalSourceText', item.sourceText, true);
      document.getElementById('modalClass').textContent = item.class || '—';
      populateText('modalMachineTrans', item.machineTranslation || '', true);
      document.getElementById('modalCorrectedInput').value = item.correctedTranslation || '';
      document.getElementById('modalCorrectedInput').disabled = false;

      const matchBlock = document.getElementById('modalMatchBlock');
      if (item.matchText && item.matchText.trim()) { matchBlock.style.display = 'block'; document.getElementById('modalMatchText').textContent = item.matchText; }
      else { matchBlock.style.display = 'none'; }

      renderRefsAndLogs(item.references, item.reviewLogs);

      document.getElementById('rejectCommentGroup').style.display = 'none';
      document.getElementById('modalSave').style.display = '';
      document.getElementById('modalSave').textContent = '💾 保存修正';
      document.getElementById('modalCancel').textContent = '取消';

      const textarea = document.getElementById('modalCorrectedInput');
      textarea.className = (item.sourceText?.length > LONG_TEXT_THRESHOLD || item.machineTranslation?.length > LONG_TEXT_THRESHOLD) ? 'long-input' : '';

      document.getElementById('editModal').classList.add('open');
    } catch (err) { Toast.show('获取数据失败: ' + err.message, 'error'); }
  }

  function openAsReviewer(item) {
    editingId = item.id;
    populateText('modalSourceText', item.sourceText, true);
    document.getElementById('modalClass').textContent = item.class || '—';
    populateText('modalMachineTrans', item.machineTranslation || '', true);
    document.getElementById('modalCorrectedInput').value = item.correctedTranslation || '';
    document.getElementById('modalCorrectedInput').disabled = true;

    const matchBlock = document.getElementById('modalMatchBlock');
    if (item.matchText && item.matchText.trim()) { matchBlock.style.display = 'block'; document.getElementById('modalMatchText').textContent = item.matchText; }
    else { matchBlock.style.display = 'none'; }

    renderRefsAndLogs(item.references, item.reviewLogs);

    // 显示驳回意见输入框
    document.getElementById('rejectCommentGroup').style.display = 'block';
    document.getElementById('modalRejectComment').value = '';

    const isCorrected = item.status === 'corrected';
    document.getElementById('modalSave').style.display = isCorrected ? '' : 'none';
    document.getElementById('modalSave').textContent = '✅ 审核通过';
    document.getElementById('modalCancel').textContent = '↩️ 驳回';

    document.getElementById('editModal').classList.add('open');
  }

  function renderRefsAndLogs(references, reviewLogs) {
    const refSection = document.getElementById('modalRefSection');
    const refList = document.getElementById('modalRefList');
    let html = '';

    if (references && references.length > 0) {
      html += references.map(ref => {
        const cls = ref.class ? `<span class="ref-class">${escapeHtml(String(ref.class))}</span>` : '';
        const src = ref.src ? `<div class="ref-src">原文: ${escapeHtml(ref.src)}</div>` : '';
        const dest = ref.dest ? `<div class="ref-dest">译文: ${escapeHtml(ref.dest)}</div>` : '';
        return `<div class="ref-item">${cls}${src}${dest}</div>`;
      }).join('');
    }

    if (reviewLogs && reviewLogs.length > 0) {
      html += reviewLogs.map(log => {
        const actionIcon = log.action === 'rejected' ? '↩️' : '✅';
        const actionLabel = log.action === 'rejected' ? '驳回' : '审核通过';
        const commentHtml = log.comment ? `<div style="color:#92400e;font-style:italic;margin-top:4px;">意见: ${escapeHtml(log.comment)}</div>` : '';
        return `<div class="ref-item" style="border-left:3px solid ${log.action === 'rejected' ? '#ef4444' : '#10b981'};">
          <span style="font-size:11px;color:#94a3b8;">${log.createdAt ? formatTime(log.createdAt) : ''}</span>
          ${actionIcon} <strong>${actionLabel}</strong> by ${escapeHtml(log.reviewerUsername || '')}
          ${commentHtml}
        </div>`;
      }).join('');
    }

    if (html) { refSection.style.display = 'block'; refList.innerHTML = html; }
    else { refSection.style.display = 'none'; }
  }

  function populateText(elementId, text, autoClass) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text || '—';
    if (autoClass && text && text.length > LONG_TEXT_THRESHOLD) el.classList.add('long-text');
    else el.classList.remove('long-text');
  }

  function close() {
    document.getElementById('editModal').classList.remove('open');
    document.getElementById('modalCorrectedInput').disabled = false;
    document.getElementById('rejectCommentGroup').style.display = 'none';
    document.getElementById('modalRejectComment').value = '';
    editingId = null;
  }

  async function save() {
    if (editingId === null) return;
    if (currentUser && currentUser.role === 'reviewer') { await approveItem(); return; }

    const newTranslation = document.getElementById('modalCorrectedInput').value.trim();
    if (!newTranslation) { Toast.show('请输入修正译文', 'warning'); return; }
    try {
      await API.saveCorrection(editingId, newTranslation);
      close();
      Toast.show('✅ 修正已保存', 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) { Toast.show(err.message, 'error'); close(); if (onSavedCallback) onSavedCallback(); }
  }

  async function approveItem() {
    if (!currentUser || currentUser.role !== 'reviewer') return;
    try {
      await API.reviewTrademark(editingId);
      close();
      Toast.show('🏅 已审核通过', 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) { Toast.show(err.message, 'error'); }
  }

  async function rejectItem() {
    if (!currentUser || currentUser.role !== 'reviewer') return;
    const comment = document.getElementById('modalRejectComment').value.trim();
    try {
      await API.rejectTrademark(editingId, comment);
      close();
      Toast.show('↩️ 已驳回', 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) { Toast.show(err.message, 'error'); }
  }

  async function review(id) {
    if (!currentUser || currentUser.role !== 'reviewer') { Toast.show('只有审核员可以审核', 'error'); return; }
    try {
      const item = await API.getTrademarkDetail(id);
      if (item.status === 'reviewed') { Toast.show('该条目已审核', 'info'); return; }
      if (!item.correctedTranslation) { Toast.show('请先修正译文再审核', 'warning'); return; }
      if (!confirm(`确认审核通过 ID=${item.id} 的译文？`)) return;
      await API.reviewTrademark(id);
      Toast.show(`🏅 ID=${item.id} 已审核通过`, 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) { Toast.show(err.message, 'error'); }
  }

  function bindEvents() {
    document.getElementById('modalClose').addEventListener('click', close);
    document.getElementById('modalCancel').addEventListener('click', () => {
      if (currentUser && currentUser.role === 'reviewer') rejectItem();
      else close();
    });
    document.getElementById('modalSave').addEventListener('click', save);
    document.getElementById('editModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });
    document.getElementById('modalCorrectedInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function escapeHtml(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function formatTime(isoStr) { if (!isoStr) return ''; try { return new Date(isoStr).toLocaleString('zh-CN'); } catch (_) { return isoStr; } }

  return { init, setUser, open, close, save, review };
})();