/**
 * API 请求层
 * 所有后端接口调用集中管理，便于维护
 * 
 * 依赖：CONFIG (config.js)
 */
const API = (() => {
  const BASE_URL = CONFIG.API_BASE_URL;
  const TOKEN_KEY = CONFIG.TOKEN_KEY;

  // ===== 内部工具函数 =====
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  async function request(method, path, body = null) {
    const url = `${BASE_URL}${path}`;
    const options = { method, headers: authHeaders() };
    if (body !== null) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || '请求失败');
    }
    return data.data;
  }

  // ===== 公共接口 =====
  return {
    // Token 管理
    getToken,
    setToken,
    clearToken,
    getAuthHeaders: authHeaders,

    // === 认证 ===
    async login(username, password) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '登录失败');
      return data.data;
    },

    async getMe() {
      return await request('GET', '/auth/me');
    },

    async logout() {
      return await request('POST', '/auth/logout');
    },

    // === 商标数据 ===
    async getTrademarks(page = 1, pageSize = 10, search = '', status = 'all') {
      const params = new URLSearchParams({ page, pageSize, search, status });
      return await request('GET', `/trademarks?${params}`);
    },

    async getStats() {
      return await request('GET', '/trademarks/stats');
    },

    async getTrademarkDetail(id) {
      return await request('GET', `/trademarks/${id}`);
    },

    async saveCorrection(id, correctedTranslation) {
      return await request('PUT', `/trademarks/${id}/correction`, { correctedTranslation });
    },

    async reviewTrademark(id) {
      return await request('PUT', `/trademarks/${id}/review`);
    },

    // === 任务领取 ===
    async getClaimableCount() {
      return await request('GET', '/tasks/claimable-count');
    },

    async claimTasks(count) {
      return await request('POST', '/tasks/claim', { count });
    }
  };
})();