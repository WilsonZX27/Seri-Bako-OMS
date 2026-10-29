# 第二批16项 — 生产计划 / 考勤 / RO Management

基于昨晚候选 `fc435c52f0fbba2b3f3f35dda88af7a3096203786a440e1bf5d195b281dd3af0` 在独立目录 `/tmp/oms-followup16-20261028` 继续。原冻结98文件候选不改；本轮代码没有混入昨晚Preview。

## 昨晚候选的 Preview 发布

用户本轮明确答复“指先发布 Preview”后，通过这台Mac已有Vercel CLI登录会话发布到原Seri Bako项目；没有再登录OMS、push代码、升级依赖或改变Production。连接器团队授权后仍返回404，CLI以团队/项目ID重新核对目标并成功发布。官方CLI65.4.0仅缓存到临时目录。

- URL：https://seri-bako-oms-official-pld5vlx91-seribako.vercel.app
- 部署ID：`dpl_GWPGBnbBci9f3FwN1rSba9aYrAsw`
- 环境：Preview，状态Ready；CLI返回productionUrl=null，inspect明确target=preview。
- 来源：昨晚候选SHA如上；原47f54c5基线，工作快照4f1286d。未伪称这些本地改动是远端Git commit，未改旧的9.2.156版本标签。
- 通过官方保护访问路径GET `/login`：HTTP200，Operations Management System标题、password输入存在。保护仍开启，没有获取Owner会话或打开实际业务页验收。
- 未执行主题/维修SQL、自动编号、compact、初始化、真实数据修改或工资运行。原报告“未部署”是冻结时状态；本条记录后续获批的Preview发布，不改变原候选源码/补丁哈希。

## 本轮16项逐条对应

本轮截图为本机3429运行实际组件、合成查询、写入阻断的页面，标明LOCAL TEST；不能代替生产或Preview的Owner验收。遵循Impeccable、Karpathy Guidelines、Apple Design、UI/UX Pro Max及现有OMS设计契约；不换字体、不增加依赖、不重新设计整个系统。

|原ID|处理|证据/边界|
|---|---|---|
|1|生产数量行：计算摘要对齐，移除空白filler列，分店数量获得有效宽度|planning-rows-1440.jpg；多分店仍保留内部横向滚动。|
|2|Demand/Trays/Unallocated使用固定事实组，手工/产量解释在调整入口，不堆叠提示|同图；tray yield留在数值title与既有evidence/调整流程，没有改变计算。|
|3|不逐行显示原因输入；改为按需原因弹窗，并可一次应用共用原因|planning-shared-reason-1440.jpg、planning-quantity-reason-390.jpg；实际应用13项缺失原因后该组消失；再改一项数量出现单独原因入口。只修改本机合成草稿，未Save。既有解释/数量不覆盖；服务端逐行reason校验保留。|
|4|桌面Actual标签只放表头|attendance-1440.jpg；实际值粗体、计划值次级，手机卡片保留独立可理解的字段标签。|
|5|桌面Scheduled标签只放表头|同上。|
|6|Approved放RO/OT表头，不在每行重复|同上，保持批准值与待审批值区别。|
|7|RO放表头，不在每行重复|同上，不改RO预留或使用值。|
|8|动作组贴最右|同上；auto布局/右侧sticky动作单元格，内容区不再给动作固定22%宽度。|
|9|共享Button在已有aria-label缺title时自动给原生hover说明；具体动作补说明|考勤Eye/Report/Adjust/OT的title和accessible name可读；共享SSR测试验证显式描述优先。不是新自绘tooltip，也未宣称检查过所有遗留非Button控件。触屏保留可访问名称。|
|10|考勤右栏不放Time-off balance管理|attendance-1440/820/430/390；includeComp:false跳过该页不再使用的员工目录/账本读取；RO表仍用权威balance/available RPC。|
|11|更正行分成身份/原因和状态/动作两组|ro-corrections-1440.jpg、430；Approve/Reject同组，不挤成孤立一行。|
|12|只有一页时隐藏考勤翻页器|3条合成记录的四宽图无分页；真实多页仍保留。这里是考勤staff-day列表，不是工资计算分页；未改变People workbook导出或工资金额。|
|13|Details移出right rail，自动打开焦点受控弹窗|attendance-detail-1440/390；关闭/Escape清除detail参数并保留筛选/页码，焦点回View details。继续沿用原受权限约束的服务端详情读取，非新缓存/API。员工摘要“View full attendance”先关原生摘要框，避免覆盖新弹窗。|
|14|时间紧凑不挤：时间一行/合理两行，重复文字去除|attendance-1440.jpg；列表显示分钟，完整秒数保留title/详情，late/early/OT差值及工作时长保留秒。|
|15|没有OT不保留空图标位置|同图合成第一行有OT、后两行无OT；每行动作组右端一致。|
|16|RO更正审核移到RO Management|ro-corrections-1440.jpg；复用原comp-time决定API及comp_time.approve，没有新写接口/权限grant。新只读pending查询绑定company、当前授权员工页、分店、pending，最多50条并有总数提示；不假称全公司无分页队列。|

## 验证与实际限制

- 本轮最终源码2048项测试通过（0失败/跳过），包含共用原因不可变/只补缺失、RO拒绝/公司/分店/员工/50条边界、考勤不读已移动RO数据、报告/RO组件模式、Button说明优先级。其余为既有回归与源码契约，不能等同2048个浏览器端到端场景。
- 最终typecheck、lint、full build、diff whitespace检查通过；对应日志在logs。使用Node24.21.0和本机合成Supabase占位配置；未把其当成生产RLS/性能证明。
- 浏览器实际运行：生产行与单独/共用原因对话框；考勤390/430/820/1440不出现整页横向溢出；RO430/1440；详情390/1440；Escape焦点返回；有/无OT动作对齐。没有实际提交考勤、审批RO、保存计划、上传/导出文件或重算生产数据。
- 原生title说明在可访问DOM/SSR检查，不是截图能证明的系统原生tooltip浮层显示测试；非Button遗留入口未全面盘点。
- 本轮仅本地候选；上线URL仍是昨晚98文件候选。本轮没有发布、push或覆盖旧候选。
- S1薪资/Excel仍独立，不把本批表格视觉修复说成工资金额修复；外部转达的workbook诊断不混入这个冻结包或读写真实考勤。

## 实际截图

![生产表格](screenshots/planning-rows-1440.jpg)

![考勤表格](screenshots/attendance-1440.jpg)

## 源拥有者

- 生产：production-planning-allocation-table/workspace/review-checks 与 lib/production-planning/shared-reason，局部worksheet CSS。
- 考勤：attendance/review/page、attendance-detail-dialog、employee-attendance-summary；原scope/detail读取保留。
- RO：people/ro/page、queries/ro-management、ActualAttendancePanel sections；不改原决定API。
- 全局说明规则：ui/Button 的title/aria-label fallback，无新前端依赖。
- 交付包含 incremental.patch（仅对昨晚候选）与 cumulative.patch（对原47f54c5基线）。先核对各自基线，不要将两份补丁连续应用。它们只做git apply --check验证，没有自动改回原项目。
