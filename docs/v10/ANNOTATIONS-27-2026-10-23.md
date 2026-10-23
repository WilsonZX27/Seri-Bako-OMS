# New user annotations: engineering status

Original27items are user-authored9.2.132annotations; current9.2.133read-onlyOwner reproduction independently confirmed this batch. Reviewer report `/private/tmp/oms-preview-next-batch-evidence-20261023/REPORT.md` preserves URLs/viewports/images and confirms no business writes.

9.2.134candidate implemented #1,#2,#3,#4,#11,#12,#13,#18,#25,#26,#27. All11remain pending exactnewPreview visualretest, no fixture/build-only closure. #18deterministic sourcecontract reproduced beforefix but actualserverstack unavailable; must prove actualchecklistnowloads. Remaining #5,#6,#7,#8,#9,#10,#14,#15,#16,#17,#19,#20,#21,#22,#23,#24 are open. #5/#10/#16businesscapabilities remain separatelyinvestigated, no migrations/grants/businesswrites authorised here.

9.2.133fouroriginalvisibledefects remainPASSonlycoveredOwner390/820/1440 plusDaily1535/1536. Actualoverflow/error/otherroles/lifecycle/performance exclusions remain. Engineeringtasksolewriter, localreviewerreadonly. No claimfullv10complete.

## Preserved original acceptance handoff

# OMS 27条批注：工程交接与验收要求

归属：用户已明确“本聊天只整理验收要求，由原工程聊天修复”。本文件不授权部署，不代表修复完成。本聊天不修改源码/Git/数据库，不主动向其他聊天发送消息。

源码定位基线：9.2.133 `d26eac3c36a712253911e690eb297f12e446adfb`，目录 `/private/tmp/oms-preview-acceptance-20261023`，只读核对时clean。批注来自旧9.2.132 Preview `https://seri-bako-oms-official-m0afeqwna-seribako.vercel.app`，不能作为9.2.133缺陷全部仍存在的证明。新版本实际渲染待工程方提供并保持合法登录会话后复核。

## 通用要求

- 保留现有OMS品牌、语义颜色、权限、租户/分店隔离与审批；复用现有PR/共享组件，不另建一套设计系统。
- 用户明确要求相关待办/列表内容font-weight:400；不把此意见擅自扩成全站标题、警告、表单全部取消层级。
- 文字省略必须保留确认完整业务身份的可达方式；不能隐藏关键状态/数量/验证/不确定结果提示。
- 下拉框在每种响应式布局采用明确、有界且一致的宽度；不能无限拉伸，也不能在390下机械固定大宽度造成溢出。沿用已有36px细指针桌面/44px触控契约。
- 视口390×900、820×1180、1440×900；维护页额外1180×820；批注原430×932补测手机拥挤情况。
- 所有弹层验证初始焦点、Tab/Shift+Tab、可见焦点、Escape、焦点返回及底部导航遮挡。读业务数据使用现有合法角色，不冒充或扩大权限。
- Preview验收不提交业务表单、不强制真实会话过期、不重试保存。多资产、编号、余额更正的写入正确性需工程方用隔离测试证明。未安全验证的生命周期/bfcache明确记未测。

## 逐条标准与源码owner

| # | 页面/问题 | 可验收结果 | 源码owner（相对上述项目根） |
|---|---|---|---|
| 1 | /dashboard 待办最多3项 | 有至少5个合法待办时展示最多5项；不足5项按真实数，不补假行；保留优先顺序与每项跳转 | src/server/queries/dashboard.ts:393；src/components/dashboard-workspace.tsx |
| 2 | /dashboard 维修待办粗细与PR排列不一致 | 维修与PR使用一致的身份/状态、内容、位置/人员/日期阅读顺序；相关正文与元信息400，无局部粗体残留 | src/components/dashboard-workspace.tsx |
| 3 | /dashboard CK @ ALMA是字重样板 | 以该元信息400为参照；核对computed font-weight，不用浅灰冒充细字 | 同上 |
| 4 | /dashboard PR摘要字重 | 供应商、项数、金额与元信息按用户选中区域统一400；不改金额数值/货币精度 | 同上 |
| 5 | /asset-management/transfers/new 单资产流程 | 默认呈现Request Details（From、To、date、reason）和Request Items两卡；能选择多个资产、逐项数量、移除行；复用PR行与控件。保存须有统一请求身份/明确逐项结果，不允许界面成功但只转一项 | src/app/(app)/asset-management/transfers/new/page.tsx；src/components/asset-transfer-form.tsx；src/server/actions/assets.ts:143；request_asset_transfer RPC及后续审批/发出/收货链 |
| 6 | /goods-receivings 图标元信息不统一 | 复用PR已有图标语义与行顺序，供应商/地点/来源单据/日期/数量可扫读；长名称和状态不互挤；审查同类采购列表调用，不任意向全站装饰性加图标 | src/app/(app)/goods-receivings/page.tsx；src/components/ui/table.tsx及相关采购列表 |
| 7 | /outlet-daily-records Today与日期重复 | 当record_date按Kuala Lumpur为今天时，显示Today且不重复数字日期；其他日期保留完整日期；排序和底层值不变 | src/app/(app)/outlet-daily-records/page.tsx（表格/compact两分支） |
| 8 | /outlet-daily-records 图标标签页样板 | 同级工作区导航复用现有图标+标签+选中态组件，尺寸/圆角一致；仅适用于相同导航层级，保留路由、权限与键盘 | src/components/outlet-daily-workspace-nav.tsx；src/components/ui/workspace-tabs.tsx；src/components/asset-workspace-navigation.tsx等实际调用 |
| 9 | /people/[id] 个人档案导航外框 | 与同级workspace tabs保持同一边框/圆角/留白；附图蓝色批注框不是产品边框，不可直接照描；先核对computed style | src/app/(app)/people/[id]/page.tsx:121；共享workspace tabs |
| 10 | /people/[id] 集中管理time-off balance | 提供有权限可发现的集中入口，跨员工查看余额及进入更正/审批，保留现有分钟单位、历史和审批；“一次过manage”不自动解释为无审批批量覆盖余额 | src/app/(app)/people/page.tsx；src/app/(app)/people/[id]/page.tsx:157；src/components/attendance/comp-time-correction-form.tsx；src/app/api/attendance/comp-time/route.ts |
| 11 | /people 通知内容太复杂 | 默认摘要短、行数一致；显示任务身份、关键状态和必要位置，冗余解释移至原详情；完整任务依然可达 | src/components/layout/top-bar-activity-menu.tsx |
| 12 | /people 通知抬头大写 | Repair request等任务标题视觉呈现全大写，文档号保留真实值；不改数据库内容 | 同上:128 |
| 13 | /people pending actions优化 | 与11/12合并修复；维修与PR摘要使用统一布局、字重和间距，不重复类型/说明/状态；计数与实际列表语义一致 | 同上 |
| 14 | /people 账户菜单直角 | 菜单使用既有popover圆角token，与其他浮层一致；验证实际圆角非批注框，保留点击外部关闭及键盘访问 | src/components/layout/account-menu.tsx；sb-popover-surface实际CSS owner |
| 15 | /asset-management 分页文案截断 | 窄split栏内页码/总数完整且简短；分页按钮不压缩正文，采用共享PaginationControls，不另造单页副本 | src/components/sortable-table.tsx:41；src/app/(app)/asset-management/page.tsx |
| 16 | /asset-management/assets/new 自动Asset ID | 新资产ID由Document Sequences管理，提交事务中分配下一个唯一编号，保留历史导入ID和编辑只读语义。预览编号不能提前消耗；并发和重试幂等由隔离测试验证 | src/components/asset-master-form.tsx:45；src/server/actions/assets.ts（create_asset_master）；src/app/(app)/document-sequences；序列及资产注册RPC |
| 17 | /asset-management/assets/new 三张卡 | 分成身份/初始登记、General、Purchase & warranty三张独立共享样式卡；Registration note保留且归属明确；验证、必填、隐藏字段、提交owner不丢 | src/components/asset-master-form.tsx；src/lib/asset-master.ts；src/components/asset-form-workspace.tsx |
| 18 | /asset-management?view=checklist 请求错误 | 在合法会话按原只读URL复现，记录请求/服务端错误与Reference 3691376504关联证据；修复根因后checklist正常或真实可恢复错误。不得把未知结果描述为已保存，也不点击Retry来重复可能的写入 | src/app/(app)/asset-management/page.tsx checklist分支；src/server/queries/assets.ts；真实异常栈指向的owner |
| 19 | /asset-management?view=maintenance 平板筛选异常 | 820首屏筛选条紧凑：计数不独占大片空白，location/status顺序稳定；无SSR/hydration跳动、重复隐藏控件或空白搜索占位 | src/components/common/UnifiedListHeader.tsx及module.css；src/app/(app)/asset-management/page.tsx:83；scoped CSS |
| 20 | 同上 下拉无限占宽 | 与通用有界宽度标准一致；两框在同一断点等宽，高度一致；长分店名称可查完整，不用全站!important覆盖其他表单 | 同上 |
| 21 | 同上 未置顶对齐 | 主画布与右面板按相同workspace起始基线对齐；说明导航/工具条与右轨的预期层级，避免逐页margin补丁 | src/components/layout/workspace-layout.tsx；src/app/(app)/asset-management/page.tsx |
| 22 | 同上1180横屏队列身份显示不全 | 调整行内信息顺序/响应式split，资产名称不被状态与优先级挤成仅几个字；保留地点、日期、选择态及详情可达；用真实长名验证 | src/components/asset-workspace-lists.tsx:32；src/app/design-system-v2.css:2579；maintenance详情布局 |
| 23 | 同上队列底部巨大空白 | 队列与分页按内容收尾，不被详情高度拉伸成空卡；不取消必要滚动/最大高度和当前项可见性 | .sb-maintenance-split stretch/absolute规则（design-system-v2.css:2579–2591）；recordContent |
| 24 | 同上手机统计2×2 | 390/430下Total、Outstanding、Processed、Cancelled一行四列；标签可换行但数值不截断，不靠缩小全局字体达成 | src/app/(app)/asset-management/page.tsx:85；design-system-v2.css:3103–3106（显式两列覆盖） |
| 25 | /purchase-requests 手机通知显示不全 | 通知层可滚至Activity log末项且点击可达，底部导航不能遮挡；在390×900/430×932及短横屏检查打开/滚动/关闭 | src/components/layout/top-bar-activity-menu.tsx；sb-workspace-updates高度/滚动/层级CSS |
| 26 | 同上 通知内容乱 | 与11–13同一个共享owner完成，不创建PR特例；分区和任务数量保留，默认摘要简短一致，避免重复维修问题、优先级和提示 | 同上 |
| 27 | /dashboard 手机无法访问My attendance/payslips | 手机账户/More入口有清楚可达的My attendance、My payslips链接；现有角色权限/个人范围不变；实际用手机导航到本人页面，不能仅断言href存在 | src/components/layout/mobile-app-navigation.tsx；src/components/layout/account-menu.tsx；src/components/layout/top-bar.tsx |

## 工程与验收顺序

1. 先定位并修复18的真实异常；避免用重试掩盖不确定结果。
2. 共享列表/通知/导航/筛选/分页/维护split统一修复，覆盖对应所有批注与调用方。
3. 多资产转移、自动编号、time-off集中管理按现有权限/事务/审计接通；这些是功能改变，需独立隔离测试，而非仅截图。
4. 对原27条逐项记录pass/fail/blocked，附版本SHA、实际URL、视口、复现步骤、前后截图与源码owner。相同根因可共用证据，编号不能遗漏。
5. 保留9.2.133四项定向复测门槛：完整手机日期/分店、计数次行和44px Filter；Daily 1440 compact及1535/1536无双显；Inventory入口先于图表且图表键盘保留；Due soon尾行无灰格。

当前状态：以上为验收要求及源码定位，未实施修复，未新做27项Preview复现；旧9.2.132截图只是用户提供的视觉证据。涉及新业务功能的最终行为应由工程说明并用隔离证据确认，不能从本清单推断数据库迁移已经执行。
