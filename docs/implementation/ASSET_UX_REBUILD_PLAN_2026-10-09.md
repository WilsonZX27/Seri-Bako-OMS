# Asset Management 重做计划 · 2026-10-09

## Final asset interface checkpoint — v9.2.102 deployed, 2026-10-09

Formal system.seribako.com.my is on v9.2.102. Migration 339 remains applied; no business rows changed during subsequent UI releases. All 1,464 regressions passed and the hosted build completed type/lint checks. Daily Checklist filters now precede a compact status register, progress follows the selected location, and historical inspections are collapsed. Its final five-width screenshots show no root or table overflow and fully visible Inspect links. Phone submission remains fixed; the tablet toolbar stays fixed above navigation after scrolling at 820/1143px. Earlier v9.2.99 sticky-toolbar verification failed and is superseded. Both original photos opened after the privacy migration. Evidence and exact limits are in docs/qa/ASSET_SCOPE_UX_2026-10-09.md. Human visual approval, keyboard overlap and real business submission are not claimed; Penang confirmed configuration remains separate.


## 正式发布核验 — 2026-10-09 v9.2.98

339 已在正式 Supabase 项目执行，配套部署 dpl_8Nergf2V4zx62ZJkGBEDjEr3sBm1 已提升至 system.seribako.com.my。员工、经理及主管均受所属／获授权门店限制；Overview 与 Maintenance 限 Super Admin、Manager、Supervisor。Super Admin 保留公司范围访问。

正式迁移后 13 张资产业务表的行数及整行指纹全部与冻结快照相符：445 个编号、已知数量 2,080、31 项未知数量，21,988 条历史检查与 2 份已验证附件均保留。八种现有角色身份的线上 SQL 只读验证通过：门店范围、完整历史范围、管理功能限制、原始字段与私人 Storage 隔离、直接写入拒绝。这不是八个独立浏览器登录验收。

预览实际登录后检查了 390／430／820／1143／1440 五个概览宽度，根页面无横向溢出，两张趋势图均为 200px。实际验证桌面右 Console、ALMA 筛选返回 73 项及名称排序、紧凑维修队列、ALMA 检查完整载入 73 项、手机全部勾选／撤销、异常展开和未保存丢弃保护；390px 提交栏固定。正式域名已确认 v9.2.98 与资产数量。截图保存于 outputs/asset-migration-private/2026-10-09/rework-339/。

未宣称完成项：正式检查提交被自动审批阻止，以免测试写入真实业务记录；提交负载与数据库生命周期由隔离测试覆盖。独立员工浏览器会话、每个明细在每个宽度的交互及键盘遮挡尚待完整验收。Penang 厨师长确认资料仍未齐，不应将发布当作整个三批计划收口。原先 v9.2.97 和未应用 339 的记载作为历史阶段保留，以本段为最新状态。


本地进度（未发布）：339 独立权限迁移已通过嵌入式 PostgreSQL 演练，员工检查改用独立摘要；模拟角色不能替代正式身份验收。检查表已有完整门店加载、全部检查、撤销、异常保留、折叠输入及共享底部提交动作。Overview 已恢复共享右栏并限制初始地点展示及趋势高度。真实浏览器验收、历史字段/附件隔离、筛选排序和管理队列仍待完成。339 尚未应用到正式数据库，代码尚未部署。

状态：现有资产数据迁移与切换已经完成；界面被用户拒收，视觉与操作验收重新打开。已有数据对账结果不等同于界面验收。此文件为实施计划，不代表以下改动已经发布。

后续本地进度：资产列表增加可访问门店选择与编号/名称排序，分页保留条件；选中不可访问地点在查询资产之前拒绝。资产及维修采用共享 Table 的桌面表格和手机紧凑行，维修原始明细移至详情页。手机页签改为当前页面及展开切换菜单。这些改动尚需真实 PostgREST 关联查询、各宽度截图与操作验收，未发布。

## 依据

遵循仓库 DESIGN.md、apple-design 技能及现有 OMS 组件。参考用户提供的旧系统：紧凑管理概览、全部正常快捷操作、异常才展开、固定底部提交。采用成熟产品的清晰导航与检查结果模式，不另造视觉系统。

- Apple 导航约定：https://developer.apple.com/design/human-interface-guidelines/tab-bars
- MaintainX 手机检查与备注/照片：https://www.getmaintainx.com/use-cases/checklists-and-inspections
- MaintainX 检查结果统计：https://help.getmaintainx.com/completed-with-inspection-check-report

## 第一批：门店与角色隔离

权限采用角色、公司、OMS 授权门店三重校验。员工只能访问本人获授权门店的资产、持有量、检查及附件；不能通过更换 URL、资产编号、地点编号或直接调用接口读取其他门店。Manager、Supervisor 仍受已授权门店限制，Super Admin 按现有 OMS 公司范围管理。Event 不向普通门店员工开放。

Overview、Maintenance 工作区及其统计/管理接口，仅允许 super_admin、manager、outlet_supervisor。普通员工默认进入本店 Daily Checklist，不接收全公司概览数据。多店人员只显示获授权门店选择器；单店人员直接显示门店名称。

检查异常报告与维修管理权限拆分：员工可以提交本店检查异常，管理人员处理维修队列。不可为了报告异常重新开放 Maintenance 工作区。资产有多地点持有量时，仅返回当前授权地点的数量和相关记录，不能以可见资产编号为理由暴露其他地点历史、附件或数量。

落实到页面、查询、Server Action、SQL RPC、RLS、Storage/签名附件路线；不以隐藏 tab 代替权限控制。审查历史 JSON 原始字段，防止带回其他地点内容。新增限制通过独立迁移实施，保留现有其他模块权限。

验收：真实角色授权测试与 SQL 隔离测试覆盖跨店读取、统计、历史、附件、写入及直接 URL。管理角色可用性与员工报告异常同时通过。

## 第二批：先重做员工手机检查

流程：进入本店 → 查看今天检查 → 点“全部正常” → 修改异常 → 底部提交。

“全部正常”是用户主动操作，不在打开页面时自动登记检查。覆盖本店完整清单，包括超过 50 件的门店；保留已填写异常，允许撤销。每项默认只展示编号、名称、登记数量及状态。点击单项展开状态选择；异常才显示备注及所需附件输入。实际点算数量为独立可选操作，正常状态不能冒充实际点算，未知不变零。

提交栏复用 OMS 任务操作区，检查模式底部显示已检查/总数、异常数和 Submit Checklist，避免与全局底栏叠放。安全区、软键盘与列表底部预留空间必须正确。提交前检查完整度和异常说明；保存期间防重复；失败保留输入；离开保留未保存保护。提交成功显示门店、日期、提交人和结果。

手机侧边距目标 16px，触控至少 44px。正常项目采用约 80–100px 的紧凑行，名称过长允许自然增高；不为每项常驻四个输入。首屏可见门店、日期、快捷操作和数件资产，任何滚动位置都能提交。

## 第三批：管理工作区与资产列表

Overview：首屏回答“哪里未检查、哪里有问题、哪些维修待处理”。顶部紧凑门店/日期筛选与四个关键指标：待检查门店、异常资产、开放维修、在途调拨。资产总数和数量明确区分，未知数量保留说明。

桌面复用 WorkspaceGrid 和右侧 Console。主区并列放门店检查进度、待处理维修、紧凑资产分布；右栏放当前门店/日期、管理操作与选中记录信息。分布先显示有限条目并提供全部地点入口。趋势图放次级区域，绘图区目标 160–200px、面板总高不超过 280px；检查 SVG 实际渲染高度及父容器，解决无限拉长。无记录使用短空状态，不能显示零异常假象。

手机管理概览：四项指标按 2×2 展示，优先列待处理事项，长分布和趋势按需进入。导航采用稳定的当前页面入口与页面选择，不能把五个标签挤进一行。不同角色拥有稳定的各自入口集合。

Assets：搜索、授权门店、类别/状态与排序组成紧凑工具栏，数量靠近筛选，注册按钮保留自然宽度。桌面用清晰表头与对齐列：编号/名称、类别、地点、数量、状态；支持门店、名称、编号排序。手机用紧凑资产行，点开详情。普通员工的门店范围锁定。

Maintenance：仅管理角色。默认待处理队列，提供授权门店、状态、优先级筛选；桌面紧凑表格，手机简短队列。选择记录进入详情/右栏，原始字段与完整更新历史按需展开。异常色只用于需要处理的状态。

Checklist 管理页：日期与门店筛选在顶部，展示门店完成/未完成/闭店状态；临时闭店为管理操作，Event 无活动不计漏检。历史与当天待办分开，删除重复搜索、空分页与巨大空状态。

## 验收与发布

先完成手机检查与桌面概览可操作预览，按本计划逐项核对，再完善其他工作区。分批回归与发布，保留界面回退版本。不得重新导入资产或在正式系统加入测试记录。

390、430、820、1143、1440 宽度分别截图和操作：检查首屏层级、边距、文字溢出、图表实际高度、右栏、键盘、底部动作和焦点。无横向溢出只是其中一项。手机无需滚到列表末端才能提交；桌面概览无需穿过整页地点长列表才能看到待办。

验证全部正常覆盖完整门店、异常保留、未知与零、草稿恢复、重复提交、日期校验、跨店隔离、角色入口、附件权限；回归现有调拨及采购、库存、生产、考勤、门店记录。原编号、逐地点数量、历史关联、附件、迁移批次必须保持一致。

更新 PRODUCT.md、DESIGN.md、权限矩阵与验收记录。完成标准是实际视觉及流程验收通过，不能以部署成功、测试数量或根页面不溢出替代。
