# 全系统质量审核 · 2026-10-20

## 修复复核 · 2026-10-20

以下更新取代下文“初次审核”记录中的旧状态：

- 全量回归：`npm test` **1655/1655 通过**；此前 9 项失败已消除。聚焦于这些失败的 70 项契约测试也通过。
- `npm run lint -- --no-cache`、正式 `npm run typecheck` 与 `git diff --check` 均通过。`tsconfig.json` 已收窄到 `src/` 和必要的 Next 生成类型，`outputs/` 历史副本不再污染检查。
- 使用 `.env.test.local` 中的测试 Supabase 公共配置执行 `npm run build`，Next.js production build 成功，生成 117 个静态页/路由项。构建仍有 `fonteditor-core/woff2/woff2.js` 的 critical-dependency 警告及 102/250 KiB 序列化缓存提示；这不是编译失败，本轮未改导出字体栈。
- 重复的手机筛选 CSS 已合并；Workspace Updates 弹层现在从手机顶栏 safe area 下方开始，并为 desktop/mobile 分开计算可用高度。
- 员工安全面板现在展示认证提供方的最近登录时间；无值显示 “Not available”。
- `PRODUCT.md` 和 schema map 已记录：迁移 367 **源码已审核**，但没有声称它已应用到任何数据库。
- 当前仍未核实：新 HEAD 的 Vercel Preview 状态、Production 别名版本、Production Supabase 的实际迁移状态。本机 Chromium 几何审核仍受沙箱启动限制，因此修复没有真实设备截图验收。

修复范围涉及源码、测试和文档；尚未提交或推送本轮修复。

## 范围与证据

本次审核覆盖 Next.js 应用源码、Supabase 迁移目录、Vercel 发布信息、自动化测试与共享 UI 规则。代码基线为分支 `codex/system-quality-verification`，HEAD `357ec623`。目录当前包含 130 个 App Router 页面、365 个迁移 SQL 文件和 561 个测试文件。

执行结果：

- `npm run lint -- --no-cache`：通过。
- 只检查 `src/` 的 TypeScript：通过。该检查使用 `/tmp/seri-bako-tsconfig.json` 排除 `outputs/` 历史工作副本。
- `npm test`：1655 项中 1646 通过、9 失败。
- `git diff --check`：通过。
- `impeccable` layout detector：无自动检测结果。此扫描不能替代页面浏览器验收。
- `npm run build`：未进入 Next.js build；仓库 `prebuild` 因本地缺少 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 停止。
- `scripts/audit-control-geometry.cjs`：未完成；Playwright Chromium 在当前 macOS 沙箱启动时被系统拒绝（`bootstrap_check_in ... Permission denied`）。
- Vercel：用户截图确认 commit `c344513` 的 Preview 构建失败；错误是每日记录数组元素缺少 React `key`，以及 `top-bar.tsx` 未使用导入。两处已在 `357ec623` 修复。审核期间 Vercel 部署列表 API 返回 403，环境没有 Vercel CLI，因此无法核实 `357ec623` 的最新 Preview 是否 READY。
- Supabase：本次没有连接生产数据库或执行迁移。生产 schema、迁移 367 的执行状态都不能从本地文件推断。

## 健康分数

| 维度 | 分数 | 证据摘要 |
|---|---:|---|
| 可访问性 | 3/4 | 静态检查与大部分交互契约通过；本次无法运行真实浏览器/辅助技术验收。 |
| 性能 | 3/4 | 现有 read-path 契约大多通过；缺少本轮生产数据下的真实性能剖析。 |
| 响应式布局 | 2/4 | 9 项回归失败中包含移动布局契约；几何扫描无法在沙箱启动。 |
| 主题与样式治理 | 2/4 | CSS 所有权测试发现 3 处重复规则；部分控件/面板半径契约不一致。 |
| 设计反模式 | 3/4 | 自动布局扫描没有发现命中项；仍需真实页面检查确认层级、密度和安全区。 |
| **合计** | **13/20** | **可接受，但当前不能据此宣告发布就绪。** |

分数是基于可取得的静态证据和测试结果，不代表完整 WCAG 认证、生产 SLA 或已部署状态。

## 严重问题

### [已修复 · 初审 P1] 全量测试门禁为红，且测试契约落后于当前界面

- **位置：** `tests/`；失败详情见本文件“失败测试清单”。
- **影响：** `npm test` 当前不能作为绿色发布门禁。失败混合了真实缺陷、CSS 冲突、版本记录遗漏和按旧 JSX 字符串写的脆弱断言，团队无法快速区分回归与测试过期。
- **标准：** 发布回归门禁应反映当前行为契约，失败必须有明确责任归属。
- **建议：** 先修复真实缺陷并更新过期断言，再要求全量测试通过。不要为了让测试变绿而恢复旧布局。

### [部分完成 · 初审 P1] 发布状态、产品记录和迁移目录没有形成同一个已核验快照

- **位置：** `PRODUCT.md:1-12`、`PRODUCT.md:38-45`、`supabase/migrations/367_seasonal_products.sql`、Vercel Preview。
- **影响：** 产品记录写着迁移审核至 366、应用 v9.2.107 尚未发布；仓库已有迁移 367。近期 Preview 对 `c344513` 失败；`357ec623` 的最新 Preview 状态未知。当前不能确认代码、数据库 schema 与部署版本是否一致。
- **建议：** 先取得 `357ec623` 的 Vercel Ready 结果，再核对并记录迁移 367 的审批/执行状态、应用版本和生产别名。不得将本地迁移文件视为已在 Supabase 执行。

## 详细发现

### [已修复 · 初审 P2] 设计 CSS 存在重复规则所有权

- **位置：** `src/app/design-system-v2.css:1188,1197,1201` 与 `:2973,2978,2986`。
- **类别：** 主题与响应式布局。
- **影响：** 手机筛选栏的同一组选择器分散在两个 media block 中；测试报告三个 selector 的定义重复。后续改一处而漏另一处会导致页面看起来像“改了但没生效”，也增加级联覆盖和回归概率。
- **证据：** `tests/css-authority-contract.test.js` 的“canonical design layer has one rule owner per selector and media scope”失败。
- **建议：** 将这组手机筛选规则归并到一个明确的媒体区块，保留单一规则所有者。

### [已修复 · 初审 P2] 员工安全面板查询了最近登录时间，却没有把它呈现给操作者

- **位置：** `src/server/queries/foundation.ts:187-199`、`src/components/staff-security-panel.tsx:22-44`。
- **类别：** 功能完整性 / 可操作性。
- **影响：** 查询层已经读取 `auth_last_sign_in_at`，但安全面板没有显示 “Last sign-in”。管理员无法从这个面板确认账号最近是否成功登录。
- **证据：** `tests/staff-masterlist-ui-feedback-2026-09-15.test.js` 中“staff activity uses the authentication provider's latest successful sign-in”失败。
- **建议：** 在员工安全面板显示格式化后的认证提供方登录时间；空值应写明从未登录或不可用，不能伪装成日期。

### [已修复 · 初审 P2] TypeScript 默认范围包含历史输出副本

- **位置：** `tsconfig.json:29-40`。
- **类别：** 工程质量 / 发布可靠性。
- **影响：** `include` 使用根目录 `**/*.ts` 和 `**/*.tsx`，只排除了 `node_modules`。仓库里的 `outputs/` 历史代码副本被纳入 `npm run typecheck`，造成与当前源码无关的旧类型错误。用临时配置只检查 `src/` 可通过，但常规团队命令仍会产生噪音。
- **建议：** 收窄正式配置的 include 到当前源码与必要生成类型；把历史快照排除在编译范围外。

### [已修复代码 · 初审 P2] 顶部更新弹层使用固定 top 值，未跟随 iPhone 安全区

- **位置：** `src/components/layout/top-bar-activity-menu.tsx:109`；`src/components/layout/top-bar.tsx:27`。
- **类别：** 响应式 / 可访问性。
- **影响：** 顶栏高度包含 `env(safe-area-inset-top)`，弹层却固定 `top-12`。在有刘海/动态岛的设备上，面板起点可能落入顶栏安全区并覆盖标题或通知按钮；当前几何脚本没能启动，因此该风险尚未通过真实设备截图确认。
- **建议：** 以实际顶栏下缘定位弹层，并在窄屏和不同 safe-area 值下验证可见区域与焦点顺序。

### [已修复 · 初审 P2] 失败测试中的布局断言依赖旧组件字符串

- **位置：** `tests/annotation-2026-08-24-safety-contract.test.js`、`tests/field-operations-mobile-contract.test.js`、`tests/mobile-app-shell-contract.test.js`、`tests/performance-read-paths.test.js`。
- **类别：** 回归测试质量。
- **影响：** PR 元数据改成图标网格、每日记录改为字段数组渲染、导航函数新增提醒参数、TopBar 加入共享 activity promise 后，测试仍匹配旧 JSX 文本或直接以旧参数调用组件。它们失败不一定表示用户看到的行为错误，但会掩盖真实缺陷并阻碍变更。
- **证据：** “PR and Dashboard mobile rows…”, “outlet daily rows…”, “mobile web uses…”, “top-bar updates stay…”, “topbar shell renders…”五项失败。
- **建议：** 将这些断言改为可验证行为/数据契约；更新 mock 接口，不依赖无关的 className 或 JSX 字符串格式。

### [P3] 测试运行产生 Node 模块格式警告

- **位置：** `package.json` 及 `tests/*.js`、部分 `src/lib/*.ts`。
- **类别：** 性能 / 工具链。
- **影响：** Node 需要对带 ESM 语法的 `.js` 文件重新解析，导致大量重复警告并增加测试输出噪音；不阻断当前测试运行。
- **建议：** 明确测试文件的模块类型或统一测试模块扩展名，再检查源文件导入约定。

## 9 项失败测试

| 测试 | 审核判断 |
|---|---|
| PR and Dashboard mobile rows share a compact three-line operational composition | 旧版字符串断言与当前图标网格布局不一致；需更新行为契约并检查实际移动效果。 |
| canonical design layer has one rule owner per selector and media scope | **确认的 CSS 重复规则。** |
| schema documentation distinguishes its historical snapshot from repository migration authority | **迁移 367 有文件，但产品审核记录仍标记到 366。** |
| outlet daily rows retain the next operational step and wastage signal on phones | 旧版断言依赖静态 `<dt>` 文本；当前由数组映射渲染，测试未反映实际 DOM 文本。 |
| mobile web uses a permission-aware app shell without replacing desktop navigation | 导航函数新增可选 attention 参数后，旧正则仍要求两参数调用。 |
| top-bar updates stay within the dynamic viewport rather than relying on a fixed popover height | 旧断言要求 `100dvh-3.5rem`，当前代码是 `100dvh-5rem`；需以真实顶栏高度/安全区确定正确值。 |
| topbar shell renders without awaiting notification or workflow queries | harness 未传入新的 `activityPromise`，并按旧接口调用异步子组件。 |
| staff activity uses the authentication provider's latest successful sign-in | **确认的界面缺项：数据已查询但没有展示。** |
| staff permission and account panels use the shared Apple-style panel radius | 断言针对临时密码行的 radius token；需确认设计合同究竟要求 control radius 还是 panel radius。 |

## 正面发现

- 源码 ESLint 和隔离后的源码类型检查通过。
- 1655 项回归中 1646 项通过；数据隔离、附件授权、未知数量与零值语义、幂等处理等相关契约有较多通过证据。
- 生产构建环境脚本会在缺少 Supabase 公共配置时提前失败，避免构建出一个未配置的客户端。
- 本地 HEAD 为 `357ec623`，工作区干净；之前用户提供的 `c344513` React key 与未使用导入问题已经修复并推送。

## 建议处理顺序

1. **先恢复可观测发布门禁：**核实最新 Vercel Preview；修复全量测试红灯并去掉 `outputs/` 对 TypeScript 检查的污染。
2. **统一发布快照：**明确迁移 367 是否审批、执行；更新 `PRODUCT.md` 的 reviewed-through 与应用发布状态。
3. **修复已确认产品缺项：**显示员工最近登录时间；归并重复移动 CSS 规则；检查顶栏弹层对 safe area 的定位。
4. **做真实视口验收：**在 390/430/820/1143/1440 宽度检查高频表单、更新弹层、资产、每日记录、采购与生产计划；确认键盘、safe area、横向滚动和焦点路径。
5. **最后重跑全量门禁：**lint、typecheck、全部单测、Vercel Preview build；有 DB 变更时另在隔离 Supabase 上验证迁移，不以本地 SQL 文件替代线上 schema 核验。

## 当前发布结论

**本地修复后的代码门禁通过，但发布状态尚未核验。**全量测试 1655/1655 通过，lint、typecheck 与本地 production build 通过；最新 Vercel Preview 和 Production Supabase schema 未检查，真实浏览器验收仍受沙箱限制。本次未执行数据库迁移、未部署或更改生产数据。
