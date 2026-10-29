# 55 项批注验收表 — 2026-10-28

基线 Preview156 `47f54c5bdc5dd1a2b3651827cf2224ee8a841c31`；本地候选，没有发布。截图是实际页面/组件在本机运行的合成查询夹具，标注 LOCAL TEST，业务写入被阻断；不是正式站或登录 Preview 的图。已人工参照用户原图，没有自动像素差分。

“本地已验”只覆盖所列状态，不代表线上通过。截图数量不代表验收项数。screenshots 链接在交付包内可打开。DOM 测量见 [browser-checks.json](screenshots/browser-checks.json)：较早 basket44px 由最后 `basket-restored-final-390` 48px 取代；隐藏值被浏览器脱敏，未绕过或声称已检查隐藏 payload。

|ID|要求/拥有者|证据与状态|
|---|---|---|
|1|单号600；dashboard-workspace/CSS|本地已验：[1440](screenshots/dashboard-1440.jpg)、[820](screenshots/dashboard-820.jpg)，computed weight600，仅单号范围。|
|2|余量说明自然宽度；planning-surplus|本地已验：[1440](screenshots/planning-surplus-1440.jpg)，缩句/去 max-w-prose，窄屏允许必要换行。|
|3|余量列表；planning-surplus|本地已验：同图13产品，宽屏两列数量右对齐；分配逻辑不变。|
|4|维修标题左/数右；AssetSectionHeading|本地已验：[Overview](screenshots/assets-overview-1440.jpg)。|
|5|检查详情；asset-workspace-lists|本地已验：[展开](screenshots/inspection-expanded-1440.jpg)，日期/作者/数量紧凑；raw ID 留在 audit。|
|6|复用 heading/更新规范|本地已验：[检查](screenshots/inspections-1440.jpg)，PRODUCT/DESIGN 已更新；不宣称遍历全系统每个标题。|
|7|资产号中性文字；checklist|本地已验：[1440](screenshots/checklist-1440.jpg)。|
|8|删检查介绍句；checklist|本地已验：同图。|
|9|Record setup 独立卡；checklist|本地已验：[430](screenshots/checklist-empty-430.jpg)，Branch/date/bulk 同卡，资产检查另卡。|
|10|检查任务层级；checklist|本地已验：[1440](screenshots/checklist-1440.jpg)、[异常延续](screenshots/checklist-carried-fault-430.jpg)、[地点受限](screenshots/checklist-restricted-390.jpg)；默认当日0勾选，不自动完成检查。|
|11|删 separate repair 说明；location page|本地已验：[1440](screenshots/checklist-1440.jpg)，保留实际维修入口。|
|12|删解释空隙；location page|本地已验：同图，删重复文字及 margin。|
|13|横屏 role/scope 横排；dashboard|本地已验：[1180](screenshots/dashboard-1180.jpg)，flex-wrap 适应更窄容器。|
|14|作者/日期靠右；byline CSS|本地已验：[820](screenshots/dashboard-820.jpg)、[1180](screenshots/dashboard-1180.jpg)。|
|15|平板/电脑信息顺序；dashboard|本地已验：[820](screenshots/dashboard-820.jpg)、[1440](screenshots/dashboard-1440.jpg)、[390](screenshots/dashboard-390.jpg)。|
|16|一排3按钮；planning/dialog CSS|本地已验：[390](screenshots/planning-unsaved-390.jpg)、[1440](screenshots/planning-unsaved-1440.jpg)；合成设置修改后真实切页，3按钮同y/48px，Cancel保留编辑；未保存。|
|17|资产详情 right rail；WorkspaceGrid|本地已验：[1440](screenshots/asset-detail-1440.jpg)、[820](screenshots/asset-detail-820.jpg)，手机共用console。|
|18|短内容两列；asset detail|本地已验：同图；[390](screenshots/asset-detail-390.jpg)单列。|
|19|长 updater 省略；daily CSS|本地已验：[430](screenshots/daily-records-430.jpg)，clientWidth90/scrollWidth315、ellipsis/nowrap，完整值留title。|
|20|Mark-read图标；activity-menu|本地已验：[430](screenshots/updates-430.jpg)，glyph16px、触摸44px；没有标读。|
|21|Packaging分区；store-summary|本地已验：[1440](screenshots/packaging-1440.jpg)、[390](screenshots/packaging-390.jpg)，表格明确记录覆盖率，unknown不算0。|
|22|Store导航按钮；store-summary|本地已验：同图，house Button替代裸hyperlink。|
|23|按钮边框；shared buttonVariants|本地已验：同图，cn解决透明/outline冲突；DOM1px solid非透明，新增共享回归。|
|24|Calendar不放New requirement|本地已验：[1440](screenshots/compliance-calendar-1440.jpg)。|
|25|Compliance Settings管理|本地已验：[390](screenshots/compliance-settings-390.jpg)；retire/inactive保留历史，action合成测试覆盖company/权限/type/subject/module；未实际add/retire。|
|26|Importer disclosure字号|**部分**：两个summary统一text-sm/font-semibold，源码/回归过。仅[首步](screenshots/schedule-import-390.jpg)图；未上传，第三步Workbook notices/Review无图证。|
|27|保持已满意importer|保持/首步本地已验：[390](screenshots/schedule-import-390.jpg)，没有重设计shell；未上传、导入或发布班表，后续流程未线上验收。|
|28|Attendance层级；actual-panel|本地已验：[空staff-day390](screenshots/attendance-report-empty-390.jpg)，label/help12px、去重复说明、保留schedule入口；未填报实际时间。|
|29|附件动作上下排；document-panels|本地已验：[390](screenshots/documents-390.jpg)，合成附件，未下载/删除。|
|30|PO索引/明显分隔；PO detail|本地已验：[820](screenshots/po-lines-820.jpg)，两个合成物料独立卡/序号。|
|31|PO数量顺序；PO detail|本地已验：同图Ordered/Received/Cancelled/Pending事实组，读模型不变。|
|32|调拨查询/结果分卡|本地已验：[1180](screenshots/stock-transfer-list-1180.jpg)，空列表也分开。|
|33|调拨顶齐；new transfer|本地已验：[1180](screenshots/stock-transfer-top-1180.jpg)，setupTop=railTop=178；隐藏字段不再触发space-y。|
|34|宽行共用数量表头；stock forms|本地已验：[1180](screenshots/stock-transfer-lines-1180.jpg)、[1440](screenshots/stock-transfer-lines-1440.jpg)；手机保留可映射label。|
|35|调拨索引；stock forms|本地已验：同图两条合成选择；未保存/提交。|
|36|Movement标签缩短|本地已验：[1440](screenshots/stock-transactions-1440.jpg)，显示Count/full title；存储类型不变，其他长标签限定单元格。|
|37|Movement top-align|本地已验：同图12个td computed vertical-align=top。|
|38|Low-stock显式Search；UnifiedListHeader|本地已验：输入below quantity时URL不变，按Search后才带below_qty=10；[1440](screenshots/low-stock-1440.jpg)。此调用autoSubmit=false，其他默认不变。|
|39|多选加入购物篮；LowStockPrForm|本地已验：[1440](screenshots/low-stock-basket-1440.jpg)、[390](screenshots/low-stock-basket-390.jpg)，两项批量加入/刷新恢复；hydration前禁操作防首击丢失；未Create PR。|
|40|右栏篮子；WorkspaceGrid|本地已验：同图；手机共用disclosure、最终主按钮48px；服务端权限/branch/UOM仍权威。|
|41|删重复basket banner|本地已验：[1440](screenshots/low-stock-1440.jpg)，单一来源列表；[缺supplier390](screenshots/basket-missing-supplier-390.jpg)禁创建；无业务提交。|
|42|删Privacy文案；People overview|本地已验：[1440](screenshots/people-overview-1440.jpg)；只改说明。薪资后续更正单列S1，本项不等于薪资入口/Excel修复。|
|43|细分割线；People overview|本地已验：同图两月合成记录，次级分隔1px。|
|44|简短inclusive-date说明|本地已验：[820](screenshots/people-employment-820.jpg)，日期/登录/排班语义不变。|
|45|共用file控件；People compliance|本地已验：[1440](screenshots/people-compliance-1440.jpg)，ComplianceFileInput与服务端4MB一致；未选择/上传。|
|46|去test-profile cleanup入口|本地已验：[430](screenshots/people-security-430.jpg)；只移入口，未删员工/改账号，backend保留。|
|47|自动编号启用|**暂停**：保持OFF/手填唯一ID；未取号/compact/初始化。公司、位数、最大尾号/并发分配须单独验证。|
|48|共用资产search|本地已验：[390](screenshots/assets-register-390.jpg)、[430](screenshots/assets-register-430.jpg)、[820](screenshots/assets-register-820.jpg)、[1440](screenshots/assets-register-1440.jpg)；框线可见，保留单一query owner。|
|49|Unknown处理指引|本地已验：[列表1440](screenshots/assets-register-1440.jpg)指向资产页核对/确认；[详情](screenshots/asset-detail-1440.jpg)保留既有权限动作；未更改数量。|
|50|Checked/chevron对齐|本地已验：[检查](screenshots/inspections-1440.jpg)、[展开](screenshots/inspection-expanded-1440.jpg)，状态bullet/独立chevron。|
|51|维修历史分区|本地已验：[1440](screenshots/maintenance-1440.jpg)、[下半页](screenshots/maintenance-attachments-1440.jpg)，两条历史独立边框、紧凑facts/raw audit。|
|52|Attachments标题/数对齐|本地已验：[1440](screenshots/maintenance-attachments-1440.jpg)，AssetSectionHeading，0在最右。|
|53|一资产一未关闭维修单|**部分/待启用**：[1440](screenshots/maintenance-1440.jpg)仅分组当前分页旧单，原记录/链接/分页保留。新版SQL隔离验证10组（8并发→1单7进展、6同键→1追加、跨地点最小提示、重开/恢复），见[结果](REPAIR-ISOLATED-RESULTS.json)。正式SQL未安装，历史重复未合并/关闭/删除，线上规则未完成。|
|54|Report problem按钮|本地已验：[1440](screenshots/asset-detail-1440.jpg)，右栏outline按钮；手机共用console。|
|55|Asset detail分组|本地已验：[390](screenshots/asset-detail-390.jpg)、[430](screenshots/asset-detail-430.jpg)、[820](screenshots/asset-detail-820.jpg)、[1440](screenshots/asset-detail-1440.jpg)，读/编辑/历史分区，短卡两列；未保存。|

## 新增要求，保留原55项ID

|ID|要求|状态/证据|
|---|---|---|
|C1|Owner设置公司统一配色|本地已验，保存待schema启用：[紫色1440](screenshots/company-purple-1440.jpg)、[390](screenshots/company-purple-390.jpg)。极端主色对比度/Owner/company/auth/旧schema/audit失败有合成测试；隔离DB验证JSON约束/恢复。没有保存真实配色。|
|C2|独立部署/去公司硬编码|局部实现：泛化public/PWA/auth fallback、导出元数据；公司scoped branding保留。邮件需显式公司配置并有合成测试，没发邮件。行业专属规则/全量性能/目标Node22环境仍待验，见配置文档。|
|S1|薪资入口/Excel自动计算|调查完成、修复阻塞：主聊天转达需保留薪资的更正，不再询问方向；缺受影响workbook/导出入口/金额公式、正式敏感RPC/ACL快照。仅验证考勤时长公式XML，未验证工资金额或Excel引擎重算；见[专项](SALARY-EXCEL-AUDIT.md)。|
