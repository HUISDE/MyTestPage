/**
 * 管理后台组件
 * 职责：用户管理、角色/语种展示、译员工作量概览。
 */
const AdminPage = (() => {
    let root = null;
    let meta = { roles: [], languages: [] };
    let users = [];
    let workers = [];
    let onUsersChanged = null;

    function init(rootId, callbacks = {}) {
        root = document.getElementById(rootId);
        onUsersChanged = callbacks.onUsersChanged || null;
        if (root) renderShell();
    }

    async function load() {
        if (!root) return;
        try {
            const [metaRes, userRes, workerRes] = await Promise.all([
                API.getAdminMeta(),
                API.getAdminUsers(),
                API.getWorkerStats()
            ]);
            meta = metaRes || { roles: [], languages: [] };
            users = userRes || [];
            workers = workerRes || [];
            render();
            if (onUsersChanged) onUsersChanged(users);
        } catch (err) {
            Toast.show('加载管理后台失败: ' + err.message, 'error');
        }
    }

    function renderShell() {
        root.innerHTML = `
      <div class="admin-layout">
        <section class="admin-card admin-create-card">
          <div class="section-title"><span>👤 新建用户</span><button class="btn-refresh" id="adminReloadBtn">刷新</button></div>
          <form id="adminCreateForm" class="admin-form">
            <input name="username" placeholder="用户名" required />
            <input name="name" placeholder="显示名称" required />
            <input name="password" type="password" placeholder="初始密码" required />
            <select name="role" id="adminRoleSelect" required></select>
            <select name="status"><option value="active">启用</option><option value="disabled">停用</option></select>
            <div class="language-picker" id="adminLanguagePicker"></div>
            <button class="btn btn-primary" type="submit">创建用户</button>
          </form>
        </section>
        <section class="admin-card">
          <div class="section-title">📈 译员工作量</div>
          <div id="workerStats" class="worker-stats"></div>
        </section>
      </div>
      <section class="admin-card">
        <div class="section-title">🧑‍💼 用户与权限</div>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>用户名</th><th>姓名</th><th>角色</th><th>状态</th><th>语种</th><th>操作</th></tr></thead><tbody id="adminUserRows"></tbody></table></div>
      </section>`;
        bindShellEvents();
    }

    function render() {
        renderRoleOptions();
        renderLanguagePicker();
        renderWorkers();
        renderUsers();
    }

    function renderRoleOptions() {
        const select = document.getElementById('adminRoleSelect');
        if (!select) return;
        select.innerHTML = (meta.roles || []).map(r => `<option value="${escapeHtml(r.role_code)}">${escapeHtml(r.role_name || r.role_code)}</option>`).join('');
    }

    function renderLanguagePicker() {
        const box = document.getElementById('adminLanguagePicker');
        if (!box) return;
        const languages = meta.languages || [];
        box.innerHTML = languages.length
            ? languages.map(l => `<label><input type="checkbox" name="lanIds" value="${escapeHtml(l.id)}"> ${escapeHtml(l.lan_name || `${l.source_lang || ''}-${l.target_lang || ''}`)}</label>`).join('')
            : '<span class="muted">暂无语种限制配置</span>';
    }

    function renderWorkers() {
        const box = document.getElementById('workerStats');
        if (!box) return;
        if (!workers.length) {
            box.innerHTML = '<div class="empty-mini">暂无译员统计</div>';
            return;
        }
        box.innerHTML = workers.map(w => `
      <div class="worker-card">
        <div><strong>${escapeHtml(w.name || w.username)}</strong><span>${escapeHtml(w.username)}</span></div>
        <p>待审 ${Number(w.corrected || 0)} · 通过 ${Number(w.reviewed || 0)} · 驳回 ${Number(w.rejected || 0)} · 总分配 ${Number(w.assignedTotal || 0)}</p>
      </div>`).join('');
    }

    function renderUsers() {
        const tbody = document.getElementById('adminUserRows');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => {
            const disabled = u.status === 'disabled';
            return `<tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.name || '')}</td>
        <td><span class="role-chip">${escapeHtml(u.role_name || u.role)}</span></td>
        <td><span class="status-chip ${disabled ? 'disabled' : 'active'}">${disabled ? '停用' : '启用'}</span></td>
        <td>${escapeHtml(u.languages || '未授权')}</td>
        <td><button class="btn-text admin-toggle-status" data-id="${u.id}" data-status="${disabled ? 'active' : 'disabled'}">${disabled ? '启用' : '停用'}</button></td>
      </tr>`;
        }).join('');

        tbody.querySelectorAll('.admin-toggle-status').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await API.updateAdminUser(btn.dataset.id, { status: btn.dataset.status });
                    Toast.show('用户状态已更新', 'success');
                    await load();
                } catch (err) {
                    Toast.show(err.message, 'error');
                }
            });
        });
    }

    function bindShellEvents() {
        root.querySelector('#adminReloadBtn')?.addEventListener('click', load);
        root.querySelector('#adminCreateForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const lanIds = [...form.querySelectorAll('input[name="lanIds"]:checked')].map(input => Number(input.value));
            const payload = {
                username: fd.get('username'),
                name: fd.get('name'),
                password: fd.get('password'),
                role: fd.get('role'),
                status: fd.get('status'),
                lanIds
            };
            try {
                await API.createAdminUser(payload);
                Toast.show('用户创建成功', 'success');
                form.reset();
                await load();
            } catch (err) {
                Toast.show(err.message, 'error');
            }
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    return { init, load };
})();