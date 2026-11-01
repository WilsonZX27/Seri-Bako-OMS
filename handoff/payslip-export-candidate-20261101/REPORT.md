# 工资单Excel／PDF最小候选 — 未发布

Base167：`6c8f0822cdf183bc5a4b39ec1e0d0ce6c88bd588`；分支`review/people-20261101`，工作树`/tmp/oms-people-review-20261101`。本补丁独立于People v3、时长包、金额SQL验证包和168。旧“金额导出不存在”是本候选实现前的状态，本候选补齐单张工资单金额Excel／PDF，不能据此宣称已上线。

## 实现结果

在现有Payslips每张有效快照下加入原生Download Excel／PDF链接；草稿按钮明确draft。新增`GET /api/people/payslips/export?id=<uuid>&version=<positive integer>&format=xlsx|pdf`。每次按当前会话读取一个指定工资单，不支持客户端指定员工／公司范围，不做全公司导出或扩大名册访问。

金额来自现有People录入的收入／扣款快照；先以整数分验证各行及总额完全一致，再导出。Excel只有收入SUM、扣款SUM、净额相减三条固定公式，并有正确缓存与auto/fullCalc标记。输入、计算、结果独立标示；不存在OT、PPH、Short Hours时长×费率算法。用户姓名／ID／label都作为文本，`=HYPERLINK(...)`不会变成公式或外部链接。币种沿现有MYR，拒绝空值、非有限值、三位小数和不一致快照，不把未知金额当0；显式0与负净额可正确保留。

Excel/PDF保留员工record ID与StaffCode（含00068前导0）、公司、期间完整日期、工资单ID、版本、当前状态、生成／批准／发布时间；offset时间先规范为UTC再标注，已有+08:00回归。Outstanding明确来自已批准的attendance confirmation快照，异常与原日期同一行，不推导金额或支付余额。PDF草稿有DRAFT未批准标题和水印；批准／发布状态清楚；长文件重复章节／列头，签名区只在最后一页底部。签名栏全空，审批时间不是签名。Excel末尾也留空白签名区，并明确离线编辑不更新／批准OMS快照。

## 授权与版本边界

- 复用现有createClient（publishable key＋当前cookies）及350已有RLS，没有服务角色客户端、SQL／grant／角色／membership变更。
- 先requireActiveTenantActor，再使用已有attestation_people('payroll.payslip.manage')。权限读取失败503，绝不降级为更广读取。
- 所有查询绑定actor.companyId；普通员工再绑定actor.staffId及released，且返回后重复校验。People仅导出原有可读的当前draft／approved／released。Superseded拒绝；旧version409；未授权／不见记录404；不泄露别人的状态／金额。
- 关联confirmation的公司／员工／ID、approved状态、期间、金额总额及批准时间也校验；异常快照409。请求不存在staff/company override功能。
- `private, no-store`、nosniff、附件文件名仅稳定UUID／版本／状态。GET只读，不调用保存／批准／发布RPC。重复下载不写业务数据；发布后不可改沿既有工资流程，本候选不修改它。
- 依赖现有350工资单／确认表及attestation_people读取能力。安装缺失或ACL不可用会拒绝并报不可用，不绕开。已核查仓库session客户端、RLS和授权定义；未新查生产数据库定义。

## 已完成验证

1. Node22.23.4：**31项独立候选＋基线相关测试通过，0失败**（tests-final.log）。包含本人／他人／跨公司／People draft、版本变化与superseded、权限失败／会话失效、异常金额／日期／币种／零、无客户端范围覆盖、重复GET不写RPC、公式注入与多语言PDF。该31项命令不依赖先前补丁新增的测试文件。
2. Node22 lint、typecheck、最终build通过；build-final.log、lint-final.log、typecheck-final.log。build用显式合成localhost Supabase URL/key，仅编译，不连生产；仍有原有fonteditor-core动态依赖warning。首次final-build少传公共环境而被preflight挡住，随后带合成环境的最终build已通过，不是代码失败。
3. 真正Microsoft Excel打开`synthetic-released.xlsx`无修复提示→Calculate→另存`synthetic-released-excel-recalculated.xlsx`，三条公式和988.05缓存正确。离线C12从0.30改0.40，再Calculate／保存`synthetic-released-excel-edited.xlsx`，净额988.15；关闭重新打开正常。未修改OMS，未改Excel全局计算设置，当前会话提示手动计算所以明确执行Calculate。六份XLSX的XML/CRC、文字注入、ID／日期／币种／0空值／签名栏及缓存断言通过（xlsx-result.json）。
4. 实际组件＋当前build CSS的localhost harness，以合成identity/query adapters运行实际导出GET；真实原生链接下载`http-released.xlsx`和`http-draft.pdf`。390/820/1440无横向溢出；员工仅见已发布下载，draft404；旧版本／superseded409。截图`workspace-390/820/1440.png`、`employee-390.png`；ui-result.json。不是完整登录／RLS HTTP链或正式角色验收。初始独立bundle缺Next注入的process环境及harness固定高度已仅在测试壳修正，非应用代码问题。
5. released／approved／draft／长PDF生成＋实际文字／金额／坐标解码核对通过（pdf-result.json）；包括长样例全部31日期的Outstanding同y断言；988.05一致；draft水印；最后页空签名区。长样例50金额行＋31日期为5页，所有文本坐标在页面内。QuickLook实际渲染已查看`synthetic-released.pdf.png`、`synthetic-draft.pdf.png`、`synthetic-long-last-page-final.png`。
6. 独立只读finish review给出局部候选ship、无阻挡项，见REVIEW.md。共享设计文件未改；没有生产接受／部署批准含义。

## 补验：真实本地Auth／PostgREST／RLS（v2）

本次补验没有更改上述五个应用文件；已逐一对比上一交付证据包的source SHA256，完全相同。新增`verify-payslip-postgrest-local.cjs`直接启动现有构建的Next production服务，经真实middleware→Auth.getClaims/getUser→getCurrentProfile→requireActiveTenantActor→session createClient→新导出GET→PostgREST→现有RLS。没有替换身份函数、数据库client、query或服务返回数据。

既有本地角色环境：`oms-role-acceptance-db`、`oms-role-acceptance-20261021-auth-1`、`oms-role-acceptance-20261021-rest-1`。原Kong挂载配置文件已清理，因此使用仅loopback的短期字节转发器，通过既有容器wget访问现有Auth和PostgREST；没有新增容器、代理业务响应、SQL／grant或Auth配置。Kong配置／key-auth层本身不在此补验范围。转发器只允许GET及现有只读attestation_people RPC，不能用于HTTP业务写入。

使用现有本地测试密钥签发600秒、role=authenticated的合成JWT；现有Auth真实验证四个已存在合成user的sub。JWT和cookies仅存进程内存，Auth调用全部为GET，无密码登录、账号／refresh-session创建或持续凭据文件；未打印或保存密钥／JWT。所有服务及数据库别名先校验为指定本地环境。进程结束关闭自有Next／loopback服务，原容器不变。

为跨连接HTTP可见性，先确认三个合成期间无记录，再在现有表提交本次命名空间的合成结果／确认／工资快照：released、draft和故意金额不匹配各一份，均有真实既有审批函数产生的版本2。测试结束按随机run source_hash及精确ID清理工资、事件、确认、结果和刷新任务；`cleanup.json`核对同一run及results=0、confirmations=0、refreshJobs=0。工资／事件删除也受现有外键完整性约束。不是生产写入；没有改已有员工、角色或权限。

|真实Next导出请求|结果|
|---|---|
|员工本人released v2 Excel／PDF|200／200，实际文件姓名Synthetic staff、StaffCode UAT-staff、净额988.05正确|
|员工本人draft v2|404|
|同公司另一个员工读取该released|404|
|另一公司合成账号读取该released|404|
|People请求released旧v1|409|
|People请求金额明细／总额不匹配快照|409|
|People在原公司范围读取draft／released|200／200，draft文件明确未批准|

另外直接以真实JWT执行**导出route源码中的同一完整select投影**：员工与People都返回confirmation对象及staffs对象，full_name与staff_code均正确可读，无需ID回退。RLS原始查询：本人released1行、本人draft0行、同公司他人0行、跨公司0行，People可见本公司三份合成快照。所有导出请求后版本／状态保持不变。证据`postgrest/result.json`含实际HTTP矩阵、投影、关系结构及无token的服务调用trace，`postgrest/cleanup.json`证明精确清理；实际下载为`staff-released.xlsx/pdf`及`people-draft.xlsx`，已额外解析XLSX确认姓名、StaffCode和金额。

补验脚本在Node22实际运行通过且做语法检查；应用代码未变，沿用前述31项测试、lint/typecheck/build，不重复无变化全套。实际本地关系/RLS依赖缺口已关闭，未发现需要修复的导出代码问题。本地服务定义仍不等于生产定义或真实用户接受。

发布不可改／批准金额事件一致性还可参照同基线此前`handoff/payroll-money-20261101/sql.log`的真实隔离SQL回滚证据（未混进本补丁）：版本升级清除批准、旧版本和越级发布拒绝、released金额不可改、源工时锁及本人released RLS。新导出没有更改这些数据库函数。不能将两组局部证据合称真实生产工资全链验收。

## 本独立补丁全部文件

- `src/app/api/people/payslips/export/route.ts`
- `src/components/attendance/payslip-workspace.tsx`（仅加下载入口）
- `src/lib/attendance/payslip-export.ts`
- `src/lib/attendance/payslip-workbook.ts`
- `src/lib/attendance/payslip-pdf.ts`
- `tests/fixtures/payslip-export.cjs`
- `tests/payslip-export.test.js`
- `scripts/attendance/generate-payslip-export-local.cjs`
- `scripts/attendance/verify-payslip-export-ui-local.cjs`
- `scripts/attendance/verify-payslip-artifacts-local.py`
- `scripts/attendance/verify-payslip-pdf-local.cjs`
- `scripts/attendance/verify-payslip-postgrest-local.cjs`（v2新增真实本地链补验）
- `handoff/payslip-export-candidate-20261101/REPORT.md`
- `handoff/payslip-export-candidate-20261101/REVIEW.md`
- `handoff/payslip-export-candidate-20261101/verification.json`

## 集成与剩余验收

仅总整合合并／发布。无需安装SQL或新权限，无真实工资写入、工资审批、员工签名、外发、账号更改、167修复重跑或排班模板开发。没有更改release版本号或168内容。

本地真实Auth／Next／PostgREST读取及350/RLS嵌套staff元数据已经补验通过；总整合下一步是按既有正式授权会话做生产／候选只读下载及完整页面含导航／右栏／移动底栏验收，不再把本地查询关系当未验证。component壳与本地服务仍不能证明正式安装状态。若目标生产没有既有权限／表，导出会失败关闭，需要总整合处理原能力缺口，不可用service key或临时grant绕过。本候选已完成局部实现及本地实际服务验收，尚未上线；不承诺今天已正式收口。v2为累计15文件补丁；已应用v1时可只应用随交付的4文件补验delta，五个应用文件保持不变。
