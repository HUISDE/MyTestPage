/**
 * 编辑模态框组件
 * 用于修正译文的弹窗
 * 依赖：API, Toast
 */
const EditModal = (() => {
  let editingId = null;
  let currentUser = null;
  let onSavedCallback = null;

  /**
   * @param {function} onSaved - 保存成功后回调
   */
  function init(onSaved) {
    onSavedCallback = onSaved;
    bindEvents();
  }

  function setUser(user) {
    currentUser = user;
  }

  /** 打开编辑弹窗 */
  async function open(id) {
    try {
      const item = await API.getTrademarkDetail(id);

      if (item.status === 'reviewed') {
        Toast.show('已审核的商标不能修改', 'warning');
        return;
      }
      if (item.assignedTo && item.assignedTo !== currentUser?.username) {
        Toast.show('该任务已分配给其他员工，无法编辑', 'error');
        return;
      }

      editingId = id;
      document.getElementById('modalBrandName').textContent = item.brandName;
      document.getElementById('modalSourceText').textContent = item.sourceText;
      document.getElementById('modalMachineTrans').textContent = item.machineTranslation;
      document.getElementById('modalCorrectedInput').value = item.correctedTranslation || '';
      document.getElementById('editModal').classList.add('open');
    } catch (err) {
      Toast.show('获取数据失败: ' + err.message, 'error');
    }
  }

  /** 关闭弹窗 */
  function close() {
    document.getElementById('editModal').classList.remove('open');
    editingId = null;
  }

  /** 保存修正 */
  async function save() {
    if (editingId === null) return;
    const newTranslation = document.getElementById('modalCorrectedInput').value.trim();
    if (!newTranslation) {
      Toast.show('请输入修正译文', 'warning');
      return;
    }
    try {
      await API.saveCorrection(editingId, newTranslation);
      close();
      Toast.show('✅ 修正已保存', 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) {
      Toast.show(err.message, 'error');
      close();
      if (onSavedCallback) onSavedCallback();
    }
  }

  /** 审核通过 */
  async function review(id) {
    if (!currentUser || currentUser.role !== 'admin') {
      Toast.show('只有管理员可以审核', 'error');
      return;
    }
    try {
      const item = await API.getTrademarkDetail(id);
      if (item.status === 'reviewed') {
        Toast.show('该条目已审核', 'info');
        return;
      }
      if (!item.correctedTranslation) {
        Toast.show('请先修正译文再审核', 'warning');
        return;
      }
      if (!confirm(`确认审核通过「${item.brandName}」的译文？`)) return;
      await API.reviewTrademark(id);
      Toast.show(`🏅 「${item.brandName}」已审核通过`, 'success');
      if (onSavedCallback) onSavedCallback();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  function bindEvents() {
    document.getElementById('modalClose').addEventListener('click', close);
    document.getElementById('modalCancel').addEventListener('click', close);
    document.getElementById('modalSave').addEventListener('click', save);

    // 点击遮罩关闭
    document.getElementById('editModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    // Ctrl+Enter 保存
    document.getElementById('modalCorrectedInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    });

    // Escape 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  return { init, setUser, open, close, save, review };
})();