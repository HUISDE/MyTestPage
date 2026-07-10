/**
 * 应用壳层组件
 * 职责：
 * 1. 管理侧边导航与视图切换态
 * 2. 管理页面头部文案与操作按钮
 * 3. 渲染用户身份信息与概览辅助信息
 */
const AppShell = (() => {
    let onNavigate = null;
    let onLogout = null;
    let onPrimaryAction = null;
    let onSecondaryAction = null;

    function init(callbacks = {}) {
        onNavigate = callbacks.onNavigate || null;
        onLogout = callbacks.onLogout || null;
        onPrimaryAction = callbacks.onPrimaryAction || null;
        onSecondaryAction = callbacks.onSecondaryAction || null;
        bindEvents();
    }

    function bindEvents() {
        document.querySelector('.side-nav-links')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.side-nav-link');
            if (!btn || !onNavigate) return;
            onNavigate(btn.dataset.view);
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (onLogout) onLogout();
        });

        document.getElementById('headerPrimaryBtn')?.addEventListener('click', () => {
            if (onPrimaryAction) onPrimaryAction();
        });

        document.getElementById('headerSecondaryBtn')?.addEventListener('click', () => {
            if (onSecondaryAction) onSecondaryAction();
        });
    }

    function setUser(user) {
        if (!user) return;
        const roleLabels = { admin: '管理员', reviewer: '审核员', employee: '译员' };
        const roleLabel = roleLabels[user.role] || user.role;

        setText('sideUserAvatar', (user.name || user.username || 'U').charAt(0).toUpperCase());
        setText('sideUserName', user.name || user.username || '未知用户');
        setText('sideUserRole', roleLabel);
        setText('overviewWelcomeRole', roleLabel);
        setText('overviewGreetingTitle', `欢迎回来`);
    }

    function toggleAdminNav(visible) {
        const adminBtn = document.getElementById('adminNavBtn');
        if (adminBtn) adminBtn.style.display = visible ? 'flex' : 'none';
    }

    function switchView(viewId, meta = {}, actions = {}) {
        document.querySelectorAll('.side-nav-link').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        document.querySelectorAll('.app-view').forEach((view) => {
            view.classList.toggle('active', view.id === viewId);
        });

        setText('viewTag', meta.tag || '工作台');
        setText('shellTitle', meta.title || '商标翻译校对');
        setText('shellDescription', meta.description || '');

        setActionButton('headerPrimaryBtn', actions.primaryText, actions.primaryVisible !== false);
        setActionButton('headerSecondaryBtn', actions.secondaryText, actions.secondaryVisible !== false);
    }

    function setHeroMetrics(metrics = []) {
        const normalized = [0, 1, 2].map(index => metrics[index] || { label: '—', value: '0' });
        normalized.forEach((item, index) => {
            setText(`heroMetric${index + 1}Label`, item.label);
            setText(`heroMetric${index + 1}Value`, item.value);
        });
    }


    function setOverviewDescription(text) {
        setText('overviewGreetingText', text || '');
    }

    function setActionButton(id, text, visible) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.style.display = visible ? 'inline-flex' : 'none';
        if (text) btn.textContent = text;
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    return {
        init,
        setUser,
        toggleAdminNav,
        switchView,
        setHeroMetrics,
        setOverviewDescription
    };
})();