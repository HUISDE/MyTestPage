/**
 * 登录页组件
 * 负责渲染登录表单并处理登录事件
 * 依赖：API, Toast
 */
const LoginPage = (() => {
  let onLoginSuccess = null;

  /**
   * 渲染登录页到指定容器
   * @param {string} containerId - 容器 DOM ID
   * @param {function} successCallback - 登录成功回调 (user)
   */
  function render(containerId, successCallback) {
    onLoginSuccess = successCallback;

    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="login-shell">
        <div class="login-card">
          <div class="logo-area">
            <div class="logo-icon">™</div>
            <h2>商标翻译校对系统</h2>
          </div>
          <form id="loginForm" autocomplete="off">
            <div class="form-group">
              <label for="loginUser">用户名</label>
              <input type="text" id="loginUser" placeholder="用户名" />
            </div>
            <div class="form-group">
              <label for="loginPass">密码</label>
              <input type="password" id="loginPass" placeholder="密码" />
            </div>
            <button type="submit" class="btn-primary">登 录</button>
            <div class="error-msg" id="loginError"></div>
          </form>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // 登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUser').value.trim();
      const password = document.getElementById('loginPass').value.trim();
      const errorEl = document.getElementById('loginError');

      try {
        const result = await API.login(username, password);
        errorEl.textContent = '';
        API.setToken(result.token);
        sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(result.user));
        Toast.show(`👋 欢迎回来，${result.user.name}！`, 'success');
        if (onLoginSuccess) onLoginSuccess(result.user);
      } catch (err) {
        errorEl.textContent = '❌ ' + err.message;
      }
    });
  }

  return { render };
})();