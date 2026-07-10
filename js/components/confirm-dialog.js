/**
 * 页面内确认弹框组件
 * 依赖：无
 */
const ConfirmDialog = (() => {
    let resolver = null;

    function open(options = {}) {
        const dialog = document.getElementById('confirmDialog');
        const title = document.getElementById('confirmTitle');
        const message = document.getElementById('confirmMessage');
        const icon = document.getElementById('confirmIcon');
        const cancelBtn = document.getElementById('confirmCancel');
        const okBtn = document.getElementById('confirmOk');

        title.textContent = options.title || '确认操作';
        message.textContent = options.message || '是否继续？';
        icon.textContent = options.variant === 'success' ? '✓' : '!';
        cancelBtn.textContent = options.cancelText || '取消';
        okBtn.textContent = options.confirmText || '确认';
        okBtn.className = `btn ${options.variant === 'success' ? 'btn-success' : 'btn-primary'}`;

        dialog.classList.add('open');

        return new Promise((resolve) => {
            resolver = resolve;
        });
    }

    function close(result) {
        const dialog = document.getElementById('confirmDialog');
        dialog.classList.remove('open');
        if (resolver) resolver(result);
        resolver = null;
    }

    function init() {
        document.getElementById('confirmCancel').addEventListener('click', () => close(false));
        document.getElementById('confirmOk').addEventListener('click', () => close(true));
        document.getElementById('confirmDialog').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) close(false);
        });
    }

    return { init, open };
})();