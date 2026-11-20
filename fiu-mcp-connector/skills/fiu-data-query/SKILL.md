---
name: fiu-data-query
description: FIU 金融事实数据查询；用于行情、K线、财务、公司资料、持股、基金、债券、期权、IPO、新闻、公告和宏观数据，不用于投资建议或下单。
---

# FIU 金融数据查询

通过 Cursor 已连接的 FIU MCP 查询金融事实。已知代码直接使用最窄 endpoint；未知证券调用 `search`，全球基金使用 `fund_data.search_funds`。存在多个上市地或同名候选时先确认证券主体。

## 授权前置条件

使用插件配置的 `fiu-finance-data` 原生 MCP 工具。用户先设置 `FIU_API_KEY` 环境变量，只填写令牌本身，不包含 `Bearer` 前缀或引号。Cursor 通过 `mcp.json` 将它注入 `Authorization` 请求头。

不要读取本机配置寻找凭证，不索要或记录 Token，不把凭证写入业务参数、对话、结果或日志。认证失败时请用户检查环境变量和 FIU 授权；权限不足时如实说明服务返回的权限限制。

## 查询流程

1. 确认市场、资产类型、标的、日期范围、频率和所需字段。
2. 先读 [调用参考](references/tool-contract.md) 选择模块。工具描述和 `describe_tool` 是完整参数、必填条件、类型、默认值和枚举的依据。
3. `search` 直接传入对象中的 `key` 字符串。业务模块传 `endpoint` 字符串和 `params` 对象。不要把搜索包装为业务 endpoint。
4. 仅在参数或分支不明确时使用 `describe_tool`；独立查询可以并行，避免重复检索与无关调用。
5. 按[调用参考](references/tool-contract.md)检查状态、列序、时间、币种和报告期，返回用户所需的核心数据。

## 查询边界

证券代码优先复用搜索返回的完整后缀；已有后缀与 `market` 冲突时先修正。常用市场为 HK、US、CN、JP；债券使用 GLOBAL；其他组合以 schema 为准。

三大报表 `reportType` 按市场选择：HK 为 F/I/P/Q1-Q4；US 为 FY/I1/I2/Q1-Q4；CN 为 1/6/9/12/99。结合 `coverMonths`、`periodScope` 和 `periodDescription` 区分单季与累计，不用自然月猜测美股财季。

全球基金返回的 `fundid` / `fundclassid` 分别用于 `fund_id` / `fund_class_id`。新闻不能替代上市公司公告，公告使用 `company_announcements`。字段、默认值和分页不得猜测。

## 高风险操作与确认

本插件提供只读数据查询，没有下单、转账、交易授权或账户管理能力。用户要求这些操作时说明能力边界，不得借助外部命令代为执行。下载或导出到用户指定位置时如需覆盖已有文件，先确认覆盖范围。

只进行数据检索、字段整理及有明确标注的客观计算；不生成个性化投资建议、评级、收益保证或买卖结论。保留 `null` 和数据缺失，不补造来源、时间、单位、会计准则或重述信息。
