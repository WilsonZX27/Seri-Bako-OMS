# 原27条＋新增11条：验收状态与工程交接

基线：实际登录稳定别名v9.2.139，Owner WILSON，公司范围。日期2026-10-23 Asia/Kuala_Lumpur。固定基址：https://seri-bako-oms-official-git-codex-ui-followup-13-424f18-seribako.vercel.app 。Git SHA dc3b822245d3cb1c4e9f599690c4b91250853638为此前Vercel核对来源；本次页脚再次确认139。用户明确本聊天只读，原工程聊天唯一代码写入方，并授权将本清单交给原工程聊天。

计数：已修17，未修16，未测5（38个批注编号，重复项仍分别列出，不是38个独立根因）。已修仅覆盖该行列明的可见样本/版本；特别O6/O18等注明最近证据版本，历史通过不冒充139全量复测。未测不等于已修，也不等于确定未实现。原27条“全部完成”状态：否。

## 本轮优先顺序与验收门槛

1. Daily桌面视图：N1。1440显示可读桌面表格，不再把旧1536断点当用户认可；利用主画布有效宽度做表格列重排/宽度分配，避免仅提前断点重新造成裁切。390/820保持各自可读布局，1180需明确桌面/平板选择，不能出现双显。
2. Daily数量与四列：N2–5、N7。数量输入72px宽、触控44px高；手机/平板饮料四数量一行，重复说明提为一次或移除冗余；计数恢复同轨。不要全站统一72px，更不能改变数据、计算、必填或保存链。截图复测390/820/1180/1440，键盘焦点不被遮挡。
3. 资产自动编号：O16/N11。现有Document Sequences与注册事务接通，不能用前端max+1或页面预览提前消耗。并发、重试、回滚、历史导入ID/编辑语义必须隔离测试；本聊天不真实注册或消耗编号。
4. 多资产转移：O5/N10。Request Details(From/To/date/reason)+Request Items两卡，合法资产多选、逐项数量/移除、统一请求及审批/dispatch/receive链。不能只把单资产列表改成checkbox而下游仍只处理首项。写入/权限/事务隔离测试由工程完成，验收聊天只读界面。
5. 随后修N8/N9 Dashboard内容与样式、O6图标、O11/13/26通知摘要；追查N6真实submitted_by语义。O10/O25/O27与O8未测范围保留。

## 状态定义

已修=当前或明确标注最近版本的实际可见样本满足该项，保留未覆盖限制；未修=当前/最近确切证据仍不符；未测=没有充分运行证据。不得将1793工程测试或Ready当作38项验收通过。每次后续发布只更新实际复测行，写上新版本/URL/视口/截图，未复测的行保留原证据版本。

## 原27条

|编号|状态|要求/判定|证据与复现入口|源码 owner|
|---|---|---|---|---|
|O1|已修|Dashboard五项真实待办|139 /dashboard，1440；dashboard-1440.jpg|src/server/queries/dashboard.ts；src/components/dashboard-workspace.tsx|
|O2|已修|维修/PR正文与元信息400，排列已有统一；新增删除备注/参考色另列N8/N9|139 /dashboard 1440；priority-measurements.json|src/components/dashboard-workspace.tsx|
|O3|已修|CK @ ALMA样板字重400|同O2|src/components/dashboard-workspace.tsx|
|O4|已修|PR供应商/项数/金额/位置/人员/日期400，金额另读叶节点确认400|139 /dashboard 1440；dashboard-1440.jpg|src/components/dashboard-workspace.tsx|
|O5|未修|转移仍445资产选择列表，非Request Details/Request Items两卡多选|139 /asset-management/transfers/new 1440；transfer-new-1440.jpg|src/app/(app)/asset-management/transfers/new/page.tsx；src/components/asset-transfer-form.tsx；src/server/actions/assets.ts；transfer RPC链|
|O6|未修|GR未全面复用PR图标元信息行|136 /goods-receivings 390/820；../oms-preview-acceptance-evidence-9.2.136/gr-390.jpg；139未重新复测|src/app/(app)/goods-receivings/page.tsx；src/components/ui/table.tsx|
|O7|已修|Today不重复数字日期，历史日期保留|137三尺寸复测；139 Daily首行复核；daily-desktop-1440.jpg|src/app/(app)/outlet-daily-records/page.tsx|
|O8|未测|Daily/Asset/Profile样本已有共享图标tabs，但“别页全部使用”未做完整调用方覆盖|137/139样本报告，不泛化全站|src/components/ui/workspace-tabs.tsx；各workspace导航调用方|
|O9|已修|Profile tabs共享样式、44px图标链接|139四尺寸；../oms-preview-acceptance-evidence-9.2.139/profile-tabs-390.jpg及报告|src/app/(app)/people/[id]/page.tsx；WorkspaceTabs|
|O10|未测|集中time-off balance入口/审批未专项验证，不能称已接通|原用户截图与需求；没有新的集中入口验收证据|src/app/(app)/people/page.tsx；src/app/(app)/people/[id]/page.tsx；attendance correction/API|
|O11|未修|通知仍重复Repair needs attention及长解释，未达简写要求|139 /dashboard updates1440；updates-1440.jpg、updates-ax.txt|src/components/layout/top-bar-activity-menu.tsx|
|O12|已修|通知标题全大写REPAIR NEEDS ATTENTION等|139 updates1440；updates-ax.txt|src/components/layout/top-bar-activity-menu.tsx|
|O13|未修|pending/通知优化不能只以标题大写关闭，摘要重复仍在|同O11；需统一验收修复后分区/密度|src/components/layout/top-bar-activity-menu.tsx|
|O14|已修|账户菜单12px共享圆角；Enter/Escape返回|139 820/1180/1440；../oms-preview-acceptance-evidence-9.2.139/menu-open-1440.jpg|src/components/layout/account-menu.tsx；popover CSS token|
|O15|已修|维护窄队列当前分页文字完整/可达，href保留view/sort/page；非默认筛选scope未测|139维护四尺寸样本；../oms-preview-acceptance-evidence-9.2.139/maintenance-tail-1440.jpg|src/components/sortable-table.tsx；asset-management/page.tsx|
|O16|未修|Asset ID仍空白必填，验证提示Enter the Asset ID|139 /asset-management/assets/new 1440；asset-id-1440.jpg|src/components/asset-master-form.tsx；src/server/actions/assets.ts；Document Sequences/注册RPC|
|O17|已修|Registration details/General/Purchase三独立卡，note位于第一卡|139四尺寸；../oms-preview-acceptance-evidence-9.2.139/asset-new-1440.jpg|src/components/asset-master-form.tsx|
|O18|已修|checklist已正常显示13locations/126inspections，原error不复现；不保证后续异常链|136三尺寸；../oms-preview-acceptance-evidence-9.2.136/checklist-1440.jpg；139未复跑|asset-management/page.tsx；src/server/queries/assets.ts|
|O19|已修|820/1180计数和筛选同轨，无原计数单独大空白|139维护四尺寸报告/geometry|asset-management/page.tsx；UnifiedListHeader/scoped CSS|
|O20|已修|同断点两框等宽有界：820约180×44、1180 256×44、1440 128×36；非全尺寸固定同一宽|139 geometry；手机抽屉内部未测|同O19|
|O21|已修|tablet主tabs与右轨同起点；desktop按共享PageHeader层级，不宣称全局同顶|139 820/1180/1440截图报告|workspace-layout.tsx；asset-management/page.tsx|
|O22|已修|维护长名+ID分行，名称完整title，真实样本不再被状态挤成几个字|139四尺寸维护截图/geometry|asset-workspace-lists.tsx；asset-management/page.tsx；design-system-v2.css|
|O23|已修|队列不随详情等高，分页后空白1px|139 820/1180/1440 geometry；原1180约149px已消失|sb-maintenance-split CSS；asset-management/page.tsx|
|O24|已修|手机Total/Outstanding/Processed/Cancelled四列|139 390×844，4×85.5px；maintenance-390样本|asset-management/page.tsx；design-system-v2.css|
|O25|未测|手机通知末项底部可达/短横屏完整focus环未对当前139专项复测；不得沿用旧fail当新pass|133曾有底部遮挡；需139 390/430及短横屏重测|top-bar-activity-menu.tsx；updates height/scroll CSS|
|O26|未修|同O11/13，通知默认内容仍长且重复|139 updates-1440.jpg|top-bar-activity-menu.tsx|
|O27|未测|手机More已出现My attendance/payslips，但新版本实际到本人页面未完成专项复测|137 More样本与139 More截图；仅href存在不能关闭|src/components/layout/mobile-app-navigation.tsx；account-menu.tsx|

## 新增11条

|编号|状态|要求/判定|证据与复现入口|源码 owner|
|---|---|---|---|---|
|N1|未修|Daily1440要电脑表格，不要compact卡片|139 /outlet-daily-records 1440；daily-desktop-1440.jpg；compactUntil=2xl|src/app/(app)/outlet-daily-records/page.tsx；ui/table.tsx|
|N2|未修|删除每行重复Saleable tomorrow说明；不能删除字段语义/可访问名称|139详情 /outlet-daily-records/386f135d-67ca-43ec-a946-b9da505ab591；同段8次|src/components/outlet-daily-record-form.tsx|
|N3|未修|该Daily数量输入统一72px，按既有响应式；保留触控高度，不全站改金额/日期|139余额宽390=164、820=241、1440=269；priority-measurements.json|src/components/outlet-daily-record-form.tsx；scoped CSS|
|N4|未修|平板饮料Qty Sent/Received/Qty Sold/Balance一行四列|139 820 daily-beverage-820.jpg，Balance仍下一行|同N3|
|N5|未修|手机同四列，每个数量输入72px，标签/产品名不挤入数值行|139 390 daily-beverage-390.jpg，Balance仍下一行|同N3|
|N6|未测|Submitted by System语义待追查，不把系统建立者等同实际提交人|139 Daily列表可见System；页面读submitted_by_name，query经actorDisplayName；实际身份来源未完整核验|outlet-daily-records/page.tsx；src/server/queries/outlet-daily-records.ts；actorDisplayName owner|
|N7|未修|Daily records计数回到同一筛选轨道，不再手机独占第二行|139 daily-mobile-390.jpg；以用户最新要求覆盖旧日期扩宽/计数次行方案|UnifiedListHeader/scoped Daily CSS|
|N8|未修|删除Dashboard维修项comment/问题描述Damaged: Damage等|139 dashboard-1440.jpg，文字仍在|src/components/dashboard-workspace.tsx|
|N9|未修|Dashboard选定正文颜色/字号用用户参考Qty sent/Pending样本，字重400已修不等于颜色字号完成|139维修正文11px rgb(19,38,31)；参考样本待工程提取真实token/复测，不自行全站改浅色|dashboard-workspace.tsx；Daily semantic typography tokens|
|N10|未修|仍要求PR式Request Details/Request Items两卡、多选资产转移|同O5，139 transfer-new-1440.jpg|同O5|
|N11|未修|自动Asset ID由Document Sequences事务分配|同O16，139 asset-id-1440.jpg|同O16|

## 本次精确优先证据

- Daily桌面：/outlet-daily-records，1440×900，daily-desktop-1440.jpg。手机筛选计数/System：390×844，daily-mobile-390.jpg。
- Daily详情：/outlet-daily-records/386f135d-67ca-43ec-a946-b9da505ab591，正常打开既有记录，只聚焦Spritzer Mineral Water closing balance按Tab，不输入。daily-beverage-{390,820,1440}.jpg；164/241/269px与重复说明8次见priority-measurements.json。
- Transfer：/asset-management/transfers/new，1440×900，transfer-new-1440.jpg及transfer-ax.txt。仍445records资产单选入口，未选任何资产。
- Asset ID：/asset-management/assets/new，1440×900，asset-id-1440.jpg。空白必填手填提示，未填写或注册。
- Dashboard：/dashboard，1440×900，dashboard-1440.jpg，正文400实际computed；删除comment与参考颜色/字号为独立未修要求。
- 通知：同Dashboard，仅Enter打开workspace updates、截图后Escape。updates-1440.jpg与updates-ax.txt；未点击Mark as read或任何通知业务链接。

已有详细证据：/private/tmp/oms-preview-acceptance-evidence-9.2.139/ACCEPTANCE.md（Asset/menu/profile），/private/tmp/oms-preview-acceptance-evidence-9.2.137/ACCEPTANCE.md（Today/forecast），/private/tmp/oms-preview-acceptance-evidence-9.2.136/ACCEPTANCE.md（多页smoke），/private/tmp/oms-preview-27-comments-acceptance-20261023.md（完整原始标准/owner）。

本轮未改源码、Git、数据库、设置或业务数据；未保存/提交/导入/消耗序列/部署。不以HTML生命周期夹具代替真实React保存或bfcache。截图与测量存本地，不向外部服务上传。恢复默认视口、保留已登录tab18。原工程聊天应据本清单继续修，不要求Wilson逐页重复QA；需要真实身份/写入授权的步骤明确单独处理。
