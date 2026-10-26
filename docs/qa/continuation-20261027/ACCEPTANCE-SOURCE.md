# 下午全部要求：统一验收总账（尚未完整交付）

本表按本线程可见原始用户文字/图片及已有逐条证据整理。重号使用批次区分。未看到的原评论不猜测；未验不标通过。分步实施只为安全与验证，最终统一交付，a24c42bf不单独宣称完成/上Production。

## 当前证据与候选
- 当前生产基线证据链已匹配：父任务实看CurrentProduction截图，immutable域名ekpfk0hfg与保存dpl_8KgvwrEpb3GoBB4p3k5NFJaex4N2一致，映射源SHA61ec3f11c20eec0e8df0a522baa26dbc21b63024。不是从相邻Preview行推断SHA。
- 154 Preview cd8e78616b653690ed9df20fa4d4449ccc17f1cb：真实32样本结果PARTIAL，后来另报卡片回退，不可推广。
- 综合旧本地0f6177ef65a93141e296df7ff0ecc765ae7bc0c2：含业务候选及早期UI。不能整包发布，含用户拒绝的共享扁平化基础。
- 5e41b307a7bf37e89f6876c6c2878f0053e75654：移除375可执行入口，仍不是最终统一候选。
- 独立构件a24c42bf9ca2b9d13eeeacf036bfda4a0aa7e0cf：基于61ec，只有3源文件+2测试，完整build与27相关检查通过；本地PR四宽16样本、Checklist四宽单/多地点8样本。真实Preview未验。仅构件。
- 原工作区4项越界共享未提交改动继续隔离，绝不直接合入：design-system-v2.css、right-console.tsx、console-action-link.tsx、visual153-shared-regression.test.js。

状态说明：L=仅本地有实现/验证；P=旧Preview有限证据；O=未解决/缺证据。所有行最终都要在同一统一候选回填，不沿用旧SHA直接闭单。

## A. 明确业务与最初6条反馈
|ID|用户要求|代码/证据状态|DB依赖及授权|未验/阻塞/交付条件|
|---|---|---|---|---|
|A1|NGTeco一分钟内重复打卡自动忽略，避免30秒下班|L：371+TS规范化，保留raw；旧隔离验证|371已明确批准；尚无执行成功记录；仅指定DB任务执行|确认边界60秒、连续密集打卡、跨批次/顺序、跨日班次；生产postflight和新导入路径验证，不能历史重算；未生效|
|A2|Attendance workbook有的有OT有的没有，解释并一致导出|L：approved-only结果与legend；0:00=无已批准OT结果（可能无OT或未批），blank=证据不足/无计算结果|相关计算依赖371；没有授权改变OT审批规则或历史重算|同一候选测试无OT/未批/已批/缺勤数据不足等实际导出，原用户workbook具体差异未逐例核对；不能凭legend称根因全解|
|A3/原Comment1|Dashboard内容使用浅字|L：dashboard-workspace次要信息颜色|无DB；既有UI修复授权|从旧综合候选精确抽取，保持原卡片/层级，原图和真实页面核对|
|A4/原Comment2|Manager开放Items/SKU Master|L：372仅指定公司items.view|372已批准，SeriBako公司3b104582-f8cb-4a4d-867f-b99e5ffc6486；不授予create/update|生产未执行；真实Manager只读列表及拒绝写权限未验，Owner页面不可代替|
|A5/原Comment3|OutletDaily数字居中|L：outlet-daily-record-form数字样式|无DB|按原字段/原图抽取，所有相关宽度与输入行为验证，原草稿不动|
|A6/原Comment4|员工Active使用statusbullet|L：staffidentity/status呈现|无DB|保持原位置/设计；真实profile状态样本未验，不触发账号变动|
|A7/原Comment5|Sign-in staffoverview与Overview同设计、email与顺序一致|L：共享身份facts|无DB|需从旧候选局部提取，保留原卡片；不能带入全局console扁平化；真实字段/缺值对照|
|A8/原Comment6|PackagingStock加入其他store并调整balance|L：373及独立store/ledgerUI；用户明确选收货/领用/盘点调整、保留流水原因|373已批准：各公司Owner仅本公司，无预填库存/初始化|未执行；RLS/ACL/backup依赖postflight、实际Owner/他公司拒绝边界及审批后的最小业务验收仍待安排，不能把隔离库当生产|

## B. 新增5条员工/排班反馈
|ID|要求|状态|DB/授权|剩余|
|---|---|---|---|---|
|B1|辞职lastworkingday、disable、delete复杂，关系清楚|L：0f的说明/状态呈现及禁用账号下动作整理|纯呈现可做；实际离职/禁用/删除不在本任务执行授权；不改Auth策略|统一入口/说明须按原布局对照，说明动作不等于自动联动；不可用真实员工做验证|
|B2|删除失败banner设计奇怪|L：明确错误及单一提示责任|无DB|从旧候选抽取原设计范围，失败/未知结果保护、原图实屏核对|
|B3|同一错误重复渲染两次|L：global-action-toast/页面单一显示|无DB|同一候选错误/成功/刷新路径验证；不能真实删除来制造错误|
|B4|跨店员工Gurney已有排班没带来，导致fulltime不能publish|L：374外店真实记录与validator局部修改，已对过实际PaidEL基线|374已批准；保留PaidEL/原授权、禁止伪造缺勤或历史重算|未执行；新RPC+validator postflight、跨店shift/OFF/EL/版本/权限真实只读状态验证；真实发布班表未授权|
|B5|notification点进指定店schedule初次空白，刷新才有|L：branch/week/revisionkey与导航合成验证|显示部分无新DB；完整跨店客户端依赖374|真实notification目标/首次导航未验，不能以手输URL或刷新替代；不标记通知已读作测试|

## C. 154新增7条回退（原设计优先）
|ID|要求|状态|DB/授权|剩余|
|---|---|---|---|---|
|C1|PR040SupplierNotassigned导致Matchitem不能用|O：根因UI无canonicalSupplier即空选项、历史resolver也要求唯一supplier；375只是提案|375未专项批准；既有371–374不覆盖|当前生产resolver/schema/ACL预检未做；actor/角色/跨店fallback/并发/旧resolver端到端覆盖不足；不能用notavailable占位称完成|
|C2|PR右栏按钮混合对齐|L：a24保留0c的本页事务区居中，不动更多菜单|无DB|四宽本地通过；真实PR各审批状态原图验收待做|
|C3|PR/new每组独立卡片丢失|生产153基线原卡片保留；154flatten导致回退|无DB|最终统一候选不得带入flatten；真实new页与用户参考图核对；不能只凭共享class闭单|
|C4|PR044商品重复序号/SKU/价格/两句库存文案过嘈杂|L：a24的0c紧凑序号去重、库存详情折叠、单句未知历史；原次要SKU和权限受控单价保留|无DB|需用户原图同状态确认层级是否满足；不改数量/UOM/价格业务值|
|C5|GRNSummary卡片丢失|153原卡片保留，a24未改共享组件|无DB|本地四宽summary有证据；真实GRN原页面对照待做|
|C6|ODRActions/Completed/Outstanding独立卡片丢失|153原分组保留，a24未改共享组件|无DB|本地四宽空列表+summary；真实记录/原图验收未完成|
|C7|手机Checklist选KwanKee@Publika搜索/筛选区域无框|L：a24单地点span被SearchControl装饰为搜索图标+文字，border0复现；一行页面条件补框|无DB|仅合成单/多地点8样本；实际KwanKee单地点范围及原图像素对照未完成。先前日期框样本不算此项通过|

## D. 早前10–20图证及已知遗漏追踪
这些图证在本线程有截图/元素，部分没有原评论文字。以下只保留可见主题和已有对应证据，不把猜测当用户指令。
|ID|图证/已知要求|状态/剩余|依赖/授权|
|---|---|---|---|
|D10|Pagenotfound/路由不可用|O：截图未提供失败目标完整路径与具体原评论；不能确定根因或宣称修复|先定位原链接/角色/路由，只读；不绕权|
|D11|通知“8 outlet requirements need attention”|旧154有菜单/路由相关修改，原精确评论缺失；真实点击目的地与文字/布局未闭单|无确认DB需求；不markread|
|D12|Maintenancequeue截图/重复卡片层级|旧154分隔行有P证据，但用户后续强调保留设计；原图/精确评论范围需保留，不能全局去卡片|仅点名区域，禁止把ConsoleSection全局扁平化重带回|
|D13|AssetActive改statusbullet（另有参考图）|L+P：154桌面50badge有限通过|无DB；最终SHA实屏仍需验|
|D14|列表筛选/search/count顺序与参考|旧154部分120pxcontrols通过；不能因此全站宽度全PASS|原指定列表/宽度对照；不强迫所有drawer使用120px|
|D15|日期26/10/2026完整显示|P：154四宽defaultdatewrapper120，有实际证据|无DB；最终候选需保留必要局部修复，不把它当C7|
|D16|Staffcode排序10...19,2的词典序|P：RO真实点击数字排序2,3,5,6,8,10通过|展示排序局部；不改staffcode/自动编号|
|D17|Employee/Staffcode列序|P：ROcodefirst；默认姓名排序本身不是缺陷|无DB，最终页核对|
|D18|Purchasingpipeline按Operationaloverview参考|P：154820/1440四counter；phone仍旧布局，不能称全宽相同|只按原指定页面参考，不重做其他dashboard|
|D19|MyWorkQueue按Inventoryactions参考|P：154wide5actionrows，phone未同一layout|原图指定范围；无DB|
|D20|使用中sessionexpired|L：仅提示分类区分重定向/暂时验证失败/明确失效；真实间歇原因仍O|不改timeout/signOutscope/Auth/权限；无真实fault制造授权|
|D-extra1|Employees筛选抽屉两列不齐|P发现430/820statusmax160；0f仅L修复|无DB，最终实际drawer验收|
|D-extra2|Audit附加compositeSource露UUID|P确认；0f仅L缩短，技术详情保留raw|无DB，最后实际合法inline记录核对，不采集原UUID|
|D-extra3|RO/PO客户端翻页数字仍旧值|P：154正常clientnavRO4/PO6已通过|无DB，最终同源回归，不能刷新掩盖|
|D-extra4|Employees嵌套边框/FAB尾行可达|旧合成+154有限P；全局flatten被否定|仅原Employees指定区域/原图核对，不扩大到所有卡片|
|D-extra5|自动编号OFF限制|仍OFF，不是此次隐含启用授权|不init/compact/历史改号；若要求启用须另列前置与批准|
|D-missing|早期Comment1–9完整原文（与A批重号不得混同）|当前上下文缺完整原批次1–9，不能宣称覆盖；需从原线程/原annotation清单核回|先复用已有记录，不先向用户重复询问；无法取到则保持缺证据|

## 统一访问与授权阻塞（最小集合）
1. Vercel合法连接对项目的实际访问：已有404/403，当前本端browsertool缺失。恢复后仅一次只读确认，才能准备Preview；不要绕过，不再要重复生产截图（基线链已足够）。
2. 真实Preview页面读取/合法Owner会话：必须用于最终整合SHA原图/原状态验收；其他角色权限不能用Owner替代。发布批准已存在，仍以Preview无阻断为前置，不重复索要同一批准。
3. DB唯一执行者01a1773e-e6b7-71df-9e09-3dc6981910e6的合法入口：371–374已有2026-10-26明确批准，不应再笼统索批；当前暂停/未执行，需父任务按统一范围恢复既定步骤并做freshdrift/postflight。原浏览器和本线程不得并发SQL。
4. 375：新增函数、execute授权及PRsupplier显式变更需要独立精确批准；原提案不是最终可执行包。先补生产纯SELECT元数据与本地正反/真实并发/匹配链路行为证据，再一次提交最终hash/作用范围/回滚限制给用户，不能让用户批准未完成方案。
5. 实际删除员工、禁用/离职生效、真实班表发布、真实库存调整/PR匹配提交、历史重算不从“统一交付”自动获得授权；可用合成行为验证，任何必要真实写另说明具体对象/动作。

## 不依赖外部访问的下一组工作边界
- 按本表将旧0f各点名修复逐项抽取进基于61ec的统一分支，先做依赖与原图范围审查，禁止整包cherry-pick含flatten变更；未有新统一候选，不称集成完成。
- 继续375独立提案：已发现仓库292允许manager_review的受控准备、293扩大legacy映射/UOM；不能拿236alone当当前规则。当前proposaladmin_review-only较窄，须清楚说明。branchfallback不得只因缺当前mapping就认定授权；最终方案需与实际resolver/branch权限共同校验。
- 原有375隔离测试仅helperstub单连接，覆盖有限；没有真实并发、完整existingresolver链路、真实staffrole归属验证，不能称完整行为通过。
- 跟踪以上所有未验项统一收口；未恢复外部访问也可做本地候选/行为验证，但不能替代线上生效证据。

## 本轮访问状态更正
本轮 cua.getState 成功，随后绑定用户既有 IAB tab2 读取 Vercel deployment list 成功。浏览器控制已恢复，不能继续声称工具缺失。页面列出8KgvwrEpb3GoBB4p3k5NFJaex4N2/ekpfk0hfg为Production、Ready，以及852NRvbguqQEJmRMrAzZS6VJimvf/d04jad5n9/cd8e786为Preview、Ready。这与已有截图/保存源码映射一致。未点击部署、推广、SQL或更改设置；连接器此前403仍是独立未解决状态，未重试。库存仅有另一个旧OMS Preview q85i2n60u标签，URL在login；没有据此推断154所有会话失效。实际新统一候选Preview尚未部署/验收。无需用户重复提供部署截图或重复连接浏览器。
