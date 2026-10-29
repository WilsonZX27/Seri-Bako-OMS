# OMS 商业化细节修复候选 — 本地验收交付

本批完成本地界面修复、公司配色预览和独立部署配置基础，并逐条回填原55项批注。**没有上线，没有修改真实单据、资产、账户、工资或权限。不能据此声称全部商业化准备完成。**

## 固定来源

- 来源：Preview156 `47f54c5bdc5dd1a2b3651827cf2224ee8a841c31`，原目录 `/tmp/oms-continuation-isolated-20261027`。交付前重核2,375个基线文件，漂移0，HEAD未变。
- 本地隔离源码：`/tmp/oms-commercial-polish-20261028`，初始快照提交 `4f1286d8e2de4d3d6c1e3594b5ca75ca8c72fb3b`。源仓库缺失Git树，因此没有修复/reset源仓库，而是用完整工作文件建立本地快照。
- 版本标签仍为基线9.2.156；这不是已发布新版本。未触碰旧的dirty128项目。没有提交、push、PR、部署或Supabase生产SQL。
- 交付包的 `CANDIDATE-MANIFEST.json` 记录最终变更文件SHA256、补丁SHA256、基线及验证结果；以此识别候选，不以截图数量识别候选。

## 实际改动

共用组件修复了outline透明边框冲突、显式三动作对话框被两列fallback覆盖、phone primary48px、标题左/数量右和共享file控件。资产、检查、维修、包装、People、PO/调拨、Dashboard各页据此整理卡片、序号、分隔、字体、截断和动作区域。窄屏沿用现有共享console/disclosure；没有用全局宽度硬覆盖每页。

Low-stock只在Search时查询，支持先多选再一次加入右栏购物篮。数量/UOM、权限、分店、idempotency仍由原服务端动作校验；缺供应商不能创建。恢复本地篮子之前禁用准备操作，避免首击被hydration覆盖。两个合成物料加入、刷新仍保留，手机主操作48px；没有Create PR。资产搜索沿用共同UnifiedListHeader并恢复清晰框线。供应商匹配沿用已包含在Preview156的修复基线，本批没有拿真实PR做匹配写入，也不把基线修复说成已经改变正式站。

Owner公司配色支持原生调色、预设、预览、默认恢复；从主色派生交互/高光/disabled tokens，极端主色自动保证文字对比度。danger/warning/success保留可识别语义。公司ID来自认证actor，保存沿用company.update+Owner及RLS；旧schema只预览不能保存。SSR与portal使用同一主题，未保存真实公司配色。

独立部署基础去掉公共fallback、PWA/认证和部分导出元数据的Seri Bako硬编码，合法公司名/Logo仍按公司读取。实际产品/资产名字及历史编号不改。管理邮件改为显式公司/发送人/站点/pilot配置，保留现有角色和单一pilot限制；配置缺失时不查询或发邮件。**上线前必须补齐环境配置，否则会暂停该邮件任务。** 这不是行业规则全面泛化或基础设施交付。

## 图证

这些是运行实际组件的**本机合成页面截图**，页面有LOCAL TEST标记，queries为合成数据，业务actions阻断。原图已人工参照；没有自动像素差分，也没有认证Preview/Production验收。四个核心页面（Dashboard、Asset detail、Assets register、Low-stock）覆盖390/430/820/1440，另有1180横屏调拨与Dashboard；该范围内未见整页横向溢出。这不是所有页面的全断点认证。

![资产详情1440](screenshots/asset-detail-1440.jpg)

![公司紫色预览1440](screenshots/company-purple-1440.jpg)

手机[搜索](screenshots/assets-register-390.jpg)、[购物篮48px](screenshots/low-stock-basket-390.jpg)、[三个动作同排](screenshots/planning-unsaved-390.jpg)、[检查异常延续](screenshots/checklist-carried-fault-430.jpg)。完整逐项图证、源拥有者和边界见 [55项表](ANNOTATIONS.md)。

## 最终检查

最后一次运行时代码修改后：

|检查|结果|日志|
|---|---|---|
|npm test|2040通过，0失败/跳过|[tests](logs/oms-commercial-tests-final.log)|
|npm run typecheck|退出0|[types](logs/oms-commercial-typecheck.log)|
|npm run lint|退出0|[lint](logs/oms-commercial-lint.log)|
|npm run build|退出0，121静态页生成|[build](logs/oms-commercial-build-final.log)|
|git diff --check|通过|manifest记录|
|维修隔离Postgres|10组行为通过|[DB](logs/oms-commercial-repair-db.log)、[结果](REPAIR-ISOLATED-RESULTS.json)|
|主题隔离Postgres|nullable兼容/8无效JSON/合法主题/他公司不变/reset/使用前结构回退通过|[DB](logs/oms-commercial-theme-db.log)|

本机Node24.21.0，package目标Node22；发布前仍需目标Node22检查。本次build使用本机合成Supabase URL/公开占位key，没有生产凭证。现有fonteditor-core动态依赖警告及webpack大字符串缓存提示仍在，未做不相关升级。测试包括组件/动作/路由合成行为，也包括源码契约；2040不等于2040条线上端到端场景。

维修使用无网络、无宿主端口、tmpfs的自有临时Postgres。8个并发不同故障→1单7进展，6同键重试→1追加；公司/分店/实际holding、受限地点最小flag、状态不重置、关闭后新建/竞争重开、旧重复记录不改、恢复函数/owner/search_path/ACL并保留追加历史均通过。授权helper是合成替身，不能替代正式RLS/ACL验证。客户端仅endpoint缺失才兼容旧端，权限拒绝/不确定写失败不走重试旁路。

## 明确未完成/启用门槛

1. **#26导入第三步**：统一了summary字体，只有首步实图；遵守不上传，未走Workbook notices/Review第三步视觉流程。#27接受的modal设计保留。
2. **#47编号**：OFF。自动编号、compact、初始化及实际取号均未执行；公司/位数/尾号/并发计划须独立验证。
3. **#53维修线上治理**：新版guard/v2提案本地通过，但正式库未装；loaded-page分组不等于全库去重，旧重复单没有合并/关闭/删除。生产启用前须读新鲜定义/ACL/owner/search_path/trigger/dependency，精确比对漂移并准备适用恢复包。SQL开头主动RAISE，防误安装。新写入后不能通过删表/历史合并假装回滚。
4. **C1配色持久化**：nullable主题列提案未安装，旧schema Save禁用；不需要放宽公司权限。先验证真实读写策略与audit，再启用。
5. **S1薪资/Excel**：主聊天转达已更正为需要薪资，不重复询问这个方向；当前未恢复入口/敏感grant，也未修复工资金额。源码316撤销敏感RPC/grants，实际线上是否安装未知；现有People workbook是考勤时长输入，有公式XML/重算flag，未证明用户受影响文件在Excel引擎计算正确。仍缺具体导出入口/脱敏workbook/预期公式与实时ACL。见[专项](SALARY-EXCEL-AUDIT.md)。
6. **商业上线**：独立客户环境、Auth/Storage/RLS、在线并发/latency/query plan、目标Node22及邮件配置尚需独立记录。行业专属forecast规则及审批模板是预留设计，不是已开放客制化功能。见[配置契约](COMMERCIAL-CONFIGURATION.md)。

## 使用交付包

`source.patch`及`source-files/`只针对上述47f54c5基线。先核对manifest/基线和本地未提交文件，再由工程聊天整合；本聊天没有自动apply回原项目。提案SQL与UI补丁分开审阅，绝不能直接移除RAISE在正式库运行。包内不含.env、凭证、node_modules、真实业务导出。`fixture-source/`保留可复验的合成夹具；本机3428页面可继续查看，不连接生产。截图/报告回传原工程聊天，不等于批准发布。
