/**
 * 任务领取面板组件
 * 渲染领取任务的交互面板，仅员工可见
 * 依赖：API, Toast
 */
const ClaimPanel = (() => {
  let onClaimCallback = null;

  /**
   * @param {string} containerId
   * @param {function} onClaim - 领取成功后回调
   */
  function init(containerId, onClaim) {
    onClaimCallback = onClaim;
    bindEvents();
  }

  /**
   * 显示/隐藏面板
   * @param {boolean} visible
   */
  function setVisible(visible) {
    const panel = document.getElementById('claimPanel');
    if (panel) panel.style.display = visible ? 'flex' : 'none';
  }

  /**
   * 更新可领取数量及按钮状态
   * @param {number} claimable
   */
  function update(claimable) {
    document.getElementById('claimableCount').textContent = claimable;
    document.getElementById('claimBadge').textContent = claimable;
    const claimBtn = document.getElementById('claimBtn');
    claimBtn.disabled = claimable === 0;
    document.getElementById('claimInput').max = claimable || 1;
    if (parseInt(document.getElementById('claimInput').value) > claimable) {
      document.getElementById('claimInput').value = Math.min(claimable, 1);
    }
  }

  function bindEvents() {
    const claimBtn = document.getElementById('claimBtn');
    const claimInput = document.getElementById('claimInput');

    if (claimBtn) {
      claimBtn.addEventListener('click', async () => {
        const input = document.getElementById('claimInput');
        let count = parseInt(input.value) || 1;
        if (count < 1) count = 1;
        if (count === 0) {
          Toast.show('没有可领取的任务', 'warning');
          return;
        }
        await handleClaim(count);
      });
    }

    if (claimInput) {
      claimInput.addEventListener('change', function () {
        let val = parseInt(this.value) || 1;
        const max = parseInt(this.max) || 99;
        if (val < 1) val = 1;
        if (val > max) val = max;
        this.value = val;
      });
    }
  }

  async function handleClaim(count) {
    try {
      const result = await API.claimTasks(count);
      Toast.show(`✅ ${result.message}`, 'success');
      if (onClaimCallback) onClaimCallback();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  return { init, setVisible, update };
})();