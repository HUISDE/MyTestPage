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
├── migrate_to_trademark.js         # 正式迁移脚本（默认只读预检）
├── verify_trademark_migration.js   # 目标库完整性验证
└── test_migrated_workflows.js      # 临时隔离库写流程测试
```

## 数据库表结构

### `trademarks` (商标数据)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 主键 |
| task_id | INT | 批次/件ID（预留） |
| class | INT | NCL 分类 ID，关联 `class_table.id` |
| legacy_class | VARCHAR | 迁移前分类原值 |
| lan | INT | 语种 ID，关联 `lan_table.id` |
| source_text | TEXT | 原文 |
| machine_translation | TEXT | 机器翻译译文 |
| matched_translation | TEXT | 高度匹配结果（可空） |
| corrected_translation | TEXT | 人工修正译文 |
| status | ENUM(pending,corrected,reviewed,rejected,completed) | 工作流状态 |
| assigned_to | VARCHAR(50) | 受让人 |
| corrected_by | VARCHAR(50) | 修正人 |
| reviewed_by | VARCHAR(50) | 审核人 |
| *_at | DATETIME | 各操作时间戳 |

### `match_dict` (翻译参考)
| 字段 | 说明 |
|------|------|
| id, class, trademark_id, src, dest | 目标库既有参考译文条目 |

### `review_logs` (审核记录)
| 字段 | 说明 |
|------|------|
| id, trademark_id, reviewer_id, action(approved/rejected), comment, created_at | 规范化审核日志 |

### `operation_logs` (操作记录)
| 字段 | 说明 |
|------|------|
| id, operator_id, action, target_type, target_id, detail, created_at | 领取、分配、修正、审核和用户管理日志 |

### `users` (用户)
| 字段 | 说明 |
|------|------|
| id, username, password, name, role, role_id, status, created_by, created_at, updated_at | 用户信息；不使用旧 `user_table` |

### RBAC 与语种

- `roles`、`permissions`、`role_permissions` 保存角色权限关系。
- `lan_table` 只使用整数主键：1 中文、2 英文、3 法文、4 西班牙文，不使用 `lan_code`。
- `user_lans(user_id, lan_id, proficiency)` 保存用户语种授权。
- 非管理员没有语种授权时不可查看或领取任务；管理员不受语种过滤。

## 状态流转

```
pending (导入) → 译员领取 → pending (已分配)
    → 译员修正 → corrected
        → 审核员审核通过 → reviewed
        → 审核员驳回 → rejected → 译员可重新领取修正 → corrected...
```

## 角色权限

| 功能 | 管理员(admin) | 译员(employee) | 审核员(reviewer) |
|------|:---:|:---:|:---:|
| 可见数据 | 全量 | 本人任务+授权语种 | 待审核/驳回任务+授权语种 |
| 任务领取 | ❌ | ✅ | ❌ |
| 任务分配 | ✅ | ❌ | ❌ |
| 修正译文 | ❌ | ✅ | ❌ |
| 审核通过/驳回 | ❌ | ❌ | ✅ |
| 用户管理 | ✅ | ❌ | ❌ |

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
- `POST /api/tasks/assign` - 管理员分配任务

### 管理端
- `GET /api/admin/meta` - 角色、权限和语种元数据
- `GET /api/admin/users` - 用户列表
- `POST /api/admin/users` - 创建用户
- `PUT /api/admin/users/:id` - 更新用户

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
npm start         # 默认端口 3000，默认数据库 trademark
```

### 数据库迁移与验证

```bash
cd backend
npm run migrate:dry-run          # 只读预检
npm run migrate:verify           # 正式库完整性验证
npm run test:migrated-workflows  # 临时隔离库完整写流程测试
```

迁移实施和恢复锚点见 `backend/trademark_schema_migration_report.md`。`migrate:apply` 会写数据库，目标库已完成迁移，未经审批不要重复执行。

### 演示账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 译员 | employee | 123456 |
| 审核员 | reviewer | 123456 |
| 审核员2 | reviewer2 | 123456 |

## 前端架构说明

- **组件化**：每个界面模块独立为一个 JS 组件，在 `js/components/` 下
- **CSS 变量**：20+ 个 CSS 自定义属性统一主题色/圆角/阴影
- **Tab 视图**：任务概览与工作区两个可切换面板
- **双角色统计**：译员和审核员使用不同的统计卡片网格
- **自适应编辑框**：内容超过 80 字符的商标自动扩展输入区域
- **驳回意见**：模态框内嵌输入框，不使用浏览器弹窗

## 许可证

MIT License