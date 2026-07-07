# GitHub Pages 发布说明

这是一个纯静态前端项目，可以直接发布到 GitHub Pages。

## 1. 发布方式

推荐使用仓库的 `main` 分支配合 GitHub Pages。

在 GitHub 仓库中：

1. `Settings` -> `Pages`
2. `Build and deployment`
3. `Source` 选择 `Deploy from a branch`
4. `Branch` 选择 `main`，目录选择 `/root`

如果你想保留历史部署，也可以改用 `gh-pages` 分支。

## 2. 后端地址

这个前端目前通过 `js/config.js` 读取 API 地址。

默认值还是 `http://localhost:3000/api`，所以上线前你需要把：

`js/config.js`

里的 `API_BASE_URL` 改成真实可访问的后端地址，例如：

```js
window.APP_CONFIG.API_BASE_URL = 'https://api.example.com/api';
```

如果后端还没单独部署，GitHub Pages 上页面可以打开，但登录和数据接口不会工作。

## 3. 后续更新界面

以后更新这个页面时，直接修改本仓库里的 `index.html`、`css/style.css`、`js/*.js`，然后重新推送到 GitHub。

GitHub Pages 会自动重新部署，不需要额外手工发布。

## 4. 本地预览

在项目根目录直接用静态服务器打开即可，例如：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080/`。
