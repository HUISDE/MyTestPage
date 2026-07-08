/**
 * 系统配置文件
 *
 * ===== 部署前修改 =====
 * 将 API_BASE_URL 改为实际的服务器地址
 * 例如: http://192.168.1.100:3000/api 或 https://api.example.com/api
 * =====
 */
const CONFIG = {
  // API 接口基地址（部署时修改此项）
  API_BASE_URL: 'http://localhost:3000/api',

  // Token 在 localStorage 中的存储键名
  TOKEN_KEY: 'trademark_token',

  // 用户信息在 sessionStorage 中的存储键名
  USER_KEY: 'trademark_user',

  // 每页显示条数
  PAGE_SIZE: 10,

  // 状态常量（与后端一致）
  STATUS: {
    PENDING: 'pending',       // 待修正（默认初始状态）
    CORRECTED: 'corrected',   // 已修正
    REVIEWED: 'reviewed',     // 已审核
    REJECTED: 'rejected'      // 已驳回
  },

  // 状态标签映射
  STATUS_LABEL: {
    pending: '待修正',
    corrected: '已修正',
    reviewed: '已审核',
    rejected: '已驳回'
  },

  // 状态图标映射
  STATUS_ICON: {
    pending: '⏳',
    corrected: '📝',
    reviewed: '✅',
    rejected: '↩️'
  }
};