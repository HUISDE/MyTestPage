/**
 * 统计卡片组件
 * 支持译员和审核员双套卡片
 */
const StatsGrid = (() => {
  /**
   * @param {object} stats - API stats 返回
   * @param {string} role - 当前角色
   */
  function render(stats, role) {
    const empGrid = document.getElementById('statsEmployee');
    const rvGrid = document.getElementById('statsReviewer');

    if (role === 'reviewer') {
      // 审核员卡片
      if (empGrid) empGrid.style.display = 'none';
      if (rvGrid) rvGrid.style.display = 'grid';
      document.getElementById('rvToReview').textContent = stats.toReview ?? 0;
      document.getElementById('rvApproved').textContent = stats.approvedByMe ?? 0;
      document.getElementById('rvRejected').textContent = stats.rejectedByMe ?? 0;
      document.getElementById('rvTotal').textContent = stats.total ?? 0;
    } else {
      // 译员卡片
      if (rvGrid) rvGrid.style.display = 'none';
      if (empGrid) empGrid.style.display = 'grid';
      document.getElementById('statPending').textContent = stats.pending ?? 0;
      document.getElementById('statCorrected').textContent = stats.corrected ?? 0;
      document.getElementById('statReviewed').textContent = stats.reviewed ?? 0;
      document.getElementById('statRejected').textContent = stats.rejected ?? 0;
      document.getElementById('statTotalEmp').textContent = stats.total ?? 0;

      // 可领取数量
      if (stats.claimable !== undefined) {
        const el = document.getElementById('claimableCount');
        if (el) el.textContent = stats.claimable;
      }
    }
    return stats;
  }

  return { render };
})();