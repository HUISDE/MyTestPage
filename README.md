# 商标翻译校对系统

基于 Web 的商标翻译校对工作流系统，支持译员修正、审核员审核/驳回、任务领取分配等完整流程。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JS（无框架），组件化模块架构 |
| 后端 | Node.js + Express (MySQL) |
| 数据库 | MySQL 8.x (`192.168.0.167:3306`) |
| 认证 | JWT Token |

## 项目结构

```
MyTestPage/                         # 前端项目
├── index.html                      # 主入口 (Tab视图骨架)
├── css/
│   ├── base.css                    # CSS变量、全局重置、动画
│   ├── login.css                   # 登录页 (渐变背景+装饰圆)
│   ├── layout.css                  # 顶部导航、主布局
│   ├── components.css              # 统计卡片、表格、模态框、Toast等
│   └── responsive.css              # 响应式适配
├── js/
│   ├── config.js                   # API地址、状态常量/图标
│   ├── utils.js                    # 向后兼容工具库
│   ├── api.js                      # 后端接口封装
│   ├── app.js                      # 主入口 (初始化、Tab切换、组件协调)
│   └── components/
│       ├── toast.js                # Toast提示组件
│       ├── login-page.js           # 登录页组件
│       ├── stats-grid.js           # 统计卡片 (译员/审核员双套)
│       ├── claim-panel.js          # 任务领取面板
│       ├── toolbar.js              # 搜索/筛选/排序工具栏
│       ├── data-table.js           # 数据表格 (分页+操作)
│       └── edit-modal.js           # 编辑/审核模态框

backend/                            # 后端项目
├── src/
│   ├── app.js                      # Express 启动配置
│   ├── data/
│   │   └── database.js             # MySQL 连接池 + 数据操作
│   ├── middleware/
│   │   └── auth.js                 # JWT 认证 + 角色验证中间件
│   └── routes/
│       ├── auth.js                 # 登录/登出/用户信息
│       ├── trademarks.js           # 商标CRUD + 审核/驳回
│       └── tasks.js                # 任务领取
├── migrate_reviewer.js             # 数据库迁移脚本 (reviewer角色)
├── reset_db.js                     # 数据库重置脚本
└── verify_db.js                    # 数据库验证脚本
```

## 数据库表结构

### `trademarks` (商标数据)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 主键 |
| task_id | INT | 批次/件ID（预留） |
| class | VARCHAR | 领域类型 (科技电子/商业服务等) |
| source_text | TEXT | 原文 |
| machine_translation | TEXT | 机器翻译译文 |
| match_text | TEXT | 高度匹配结果（可空） |
| corrected_translation | TEXT | 人工修正译文 |
| status | ENUM(pending,corrected,reviewed,rejected) | 状态 |
| assigned_to | VARCHAR(50) | 受让人 |
| corrected_by | VARCHAR(50) | 修正人 |
| reviewed_by | VARCHAR(50) | 审核人 |
| *_at | TIMESTAMP | 各操作时间戳 |

### `translation_references` (翻译参考)
| 字段 | 说明 |
|------|------|
| id, class, trademark_id, src, dest | 参考译文条目 |

### `review_logs` (审核记录)
| 字段 | 说明 |
|------|------|
| id, trademark_id, reviewer_username, action(approved/rejected), comment, created_at | 审核日志 |

### `users` (用户)
| 字段 | 说明 |
|------|------|
| id, username, password, name, role(admin/employee/reviewer), created_by | 用户信息 |

## 状态流转

```
pending (导入) → 译员领取 → pending (已分配)
    → 译员修正 → corrected
        → 审核员审核通过 → reviewed
        → 审核员驳回 → rejected → 译员可重新领取修正 → corrected...
```

## 角色权限

| 功能 | 译员(employee) | 审核员(reviewer) |
|------|:---:|:---:|
| 可见数据 | 分配给自己 | 全部（pending除外） |
| 任务领取 | ✅ | ❌ |
| 修正译文 | ✅ | ❌ |
| 查看详情 | ✅ | ✅ |
| 审核通过 | ❌ | ✅ |
| 驳回+意见 | ❌ | ✅ |
| 统计数据 | 个人任务状态 | 全局待审核/个人通过/驳回 |

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 当前用户
- `POST /api/auth/logout` - 登出

### 商标数据
- `GET /api/trademarks` - 列表 (分页+搜索+筛选+排序)
- `GET /api/trademarks/stats` - 统计数据 (按角色返回不同内容)
- `GET /api/trademarks/:id` - 详情 (含references + reviewLogs)
- `PUT /api/trademarks/:id/correction` - 保存修正
- `PUT /api/trademarks/:id/review` - 审核通过
- `PUT /api/trademarks/:id/reject` - 驳回

### 任务领取
- `GET /api/tasks/claimable-count` - 可领取任务数
- `POST /api/tasks/claim` - 领取任务

## 部署说明

### 前端
```bash
# 修改 js/config.js 中的 API_BASE_URL 为实际后端地址
# 用任意静态服务器打开 index.html
python -m http.server 8080
```

### 后端
```bash
cd backend
npm install
node src/app.js   # 默认端口 3000
```

### 演示账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 译员 | employee | 123456 |
| 审核员 | admin (李主管) | 123456 |
| 审核员2 | reviewer2 (王审核) | 123456 |

## 前端架构说明

- **组件化**：每个界面模块独立为一个 JS 组件，在 `js/components/` 下
- **CSS 变量**：20+ 个 CSS 自定义属性统一主题色/圆角/阴影
- **Tab 视图**：任务概览与工作区两个可切换面板
- **双角色统计**：译员和审核员使用不同的统计卡片网格
- **自适应编辑框**：内容超过 80 字符的商标自动扩展输入区域
- **驳回意见**：模态框内嵌输入框，不使用浏览器弹窗

## 许可证

MIT License