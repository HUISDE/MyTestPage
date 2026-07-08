/**
 * 统计卡片组件
 * 渲染顶部4个统计数字卡片
 * 依赖：无（纯渲染）
 */
const StatsGrid = (() => {
  /**
   * @param {object} stats - { total, pending, corrected, reviewed, claimable }
   */
  function render(stats) {
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statCorrected').textContent = stats.corrected;
    document.getElementById('statReviewed').textContent = stats.reviewed;

    // 可领取数量（供 ClaimPanel 使用）
    if (stats.claimable !== undefined) {
      document.getElementById('claimableCount').textContent = stats.claimable;
    }
    return stats;
  }

  /** 仅更新可领取数量 */
  function updateClaimable(count) {
    document.getElementById('claimableCount').textContent = count;
  }

  return { render, updateClaimable };
})();