# 本地验收交付：考勤规则与页面恢复

本批从 `ccf25ea9` 开始，工作分支 `codex/oms-integration-20261013`。只使用独立本地数据库和合成账户；没有推送、部署、生产迁移或真实业务写入。

## 本次行为

- 四次打卡为上班、休息开始、休息结束、下班。实际工时是两段工作时间之和，正常休息不计入工时或 Short Hours。已有全职普通计薪上限与兼职半小时规则保留，实际工时与计薪工时分别保存。
- 重复、缺失、顺序错误或额外打卡保留异常，实际／计薪工时不自动推算，OT 候选为零；跨午夜正确计算。已有导入去重规则保留。
- Short Hours 为迟到加早退，并以班次跨度封顶，保留已有 grace，不增加罚款或扣款规则。
- OT 候选与已批准 OT 分开显示，待 People 审批用提示色和文字表达。保留半小时向下取整、禁止自行审批、RO 单次入账和重复审批拒绝。
- 工资或 OT 单独调整不会清除员工已签考勤；未发布工资草稿会因计算变化失效。打卡内容更正使旧考勤确认失效。已入账 OT 的日期须先处理对应 RO，不能直接改打卡而留下不匹配入账。
- PPH 当前留空；Triple Pay 的业务含义是总计 3 倍，本批没有启用乘数或推算金额。
- 错误页 Retry 改为重新加载当前地址。实测 `router.refresh()` 加 `reset()` 仍会保留错误，故采用完整读取恢复。发生读取故障时保留明确错误提示，不显示假空列表。

## 导出范围

`/api/attendance/export` 只接受 `format=xlsx`。单门店返回 XLSX，多门店为 XLSX 的 ZIP。

XLSX 的四次打卡净工时、Approved OT、待审批提示、Short Hours 与空白 PPH 已同步。工时与打卡证据不一致时留空，不能用两次打卡公式补算。日期、跨月周范围、公式缓存和汇总已有回归。

**没有考勤 PDF 导出接口，因此本次不能标记 PDF 完成或通过。** XLSX 的 A4 打印设置不是 PDF 实测。

## 已验证证据

- 1,603 项测试通过，0 失败；TypeScript、Lint、Node 22 生产构建通过。日志：`/tmp/oms-policy-full-tests.log`、`/tmp/oms-policy-types.log`、`/tmp/oms-policy-lint.log`、`/tmp/oms-policy-build.log`。
- `tests/sql/attendance-four-punch-local.sql` 在事务内创建合成数据并 ROLLBACK：净工时、迟到加早退、跨午夜原班次 OT 基准、重复／缺失／顺序／额外打卡、空白 PPH、审批保留签名并使工资草稿失效、RO 单次记账、重复拒绝、审计更正、工资单独调整、时间更正失效签名。日志：`/tmp/oms-four-punch-db.log`。
- 9 个读取失败／恢复页面：Items、采购单详情、采购申请详情、Documents 详情、采购退货详情、Production Jobs、Production Planning、AP Aging、Cash Flow。前五项及 AP 使用 Retry；Jobs／Planning 使用重新载入。证据：`outputs/qa/component-states/read-recovery.json`。
- 代表截图：`outputs/qa/component-states/read-error-_purchase_orders__id_.png`、`read-error-_items.png`、`read-error-_supplier_invoices_aging.png`。截图为 390px 合成数据环境。
- 关键源文件 SHA256：`outputs/qa/component-states/policy-source-hashes.json`。上一批整体布局矩阵仍见 `OMS_INTEGRATION_UI_MATRIX_2026-10-13.json`；不能把旧矩阵当成本批所有业务状态的新验收。

## 尚未完成／不能外推

- 本批不是生产验收；真实员工映射、真实工作簿、生产导出、真实签名与工资流程由生产验证任务负责。
- 此次事务回归没有重新覆盖所有角色组合和多会话并发；此前 350/351 的发布工资保护测试不能代替 352 全部并发复验。
- 已入账 OT 的 RO 对账后更正流程，仍需业务端到端验收；本批验证了拦截，不自动冲销任何余额。
- 完整考勤 PDF、实体手机／打印机、填满历史的预测图、所有自定义弹窗、全部表单后端报错和值保留仍有未覆盖状态。无效输入拦截不等于后端提交验收。
- 独立 351→352 复验及补充表单检查结果见下方后续记录。

## 独立复验与补充表单结果

在 `oms-integration-replay-20261014` 确认原迁移 ledger 最大值为 351，随后应用 352，退出码 0；完整事务回归再次退出 0，四组 PASS，最后 ROLLBACK。通过直接 psql 验证，未伪造 ledger 的 352 记录；本次不是重新从零执行全部历史迁移。

8 个补充表单的无效值与输入保留检查通过：Asset Transfer、Outlet Daily Record、Recipe、Stock Count、Stock Transfer、Stock Wastage、Supplier Item、UOM Conversion。只验证前端约束与 reportValidity，不等于后端提交／错误恢复或业务规则验收；Stock Count 的自定义提交处理也不能由原生 validity 检查替代。

可随检查点审阅的证据在 [evidence/2026-10-14](evidence/2026-10-14)：源文件摘要、独立迁移与四组数据库通过记录、9 个读取恢复结果、8 个表单结果和四张代表截图。所有截图和结果使用合成数据。

未覆盖项目仍包含前述真实资料与权限验收、352 多会话并发、完整 RO 对账后更正、PDF、所有后端表单错误状态、自定义弹窗、填满历史的预测图及实体设备；不能将本次两个补测项解释为整个系统只剩两个问题。
