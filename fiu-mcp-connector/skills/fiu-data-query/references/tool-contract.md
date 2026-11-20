# 工具与参数参考

## MCP 工具

| 工具 | 用途 |
| --- | --- |
| describe_tool | 查询模块及 endpoint 的参数、默认值、枚举和有效组合 |
| search | 证券名称或代码解析；必填 key:string，无默认值 |
| quote_spot | 基础及扩展行情 |
| quote_intraday | 分时、盘口及逐笔数据 |
| quote_kline | K线历史 |
| quote_derivatives_hk | 港股衍生品行情 |
| quote_us_options | 美股期权链及行情 |
| market_overview | 市场概况、交易状态 |
| market_ranking | 市场排行 |
| market_flow | 资金流 |
| market_structure | 行业、板块和市场结构 |
| market_position_cost | 持仓成本等市场统计 |
| f10_profile | 公司资料 |
| f10_financials | 财务报表和关键指标 |
| f10_business_governance | 主营构成、管理层与治理 |
| shareholding_structure | 股本及股东结构 |
| shareholding_institution | 机构持仓 |
| shareholding_fund_broker | 基金及经纪商持仓 |
| fund_data | 基金/ETF 查询 |
| stock_connect | 沪深港通 |
| ipo | 新股发行及上市信息 |
| bond_basic | 债券基础资料 |
| bond_analytics | 债券分析数据 |
| fiu_news | 新闻查询及详情 |
| financial_calendar | 财经日历 |
| macro_economics | 宏观经济数据 |
| company_announcements | 上市公司公告 |
| reference | 参考码表 |

## 参数获取与约束

业务模块的 endpoint:string 必填，无默认值；params:object 中的条件按 endpoint 和市场确定。所有模块的完整参数通过 describe_tool 获取，不从相似接口推断。市场枚举并非每个模块都通用。

调用 describe_tool 仅传必填的 toolNames:string[]，一次 1–5 个模块或 endpoint，获取完整参数原文、类型、必填条件、默认值、枚举、有效组合、示例及已有响应说明。已知 endpoint 时优先直接查询。示例：

```json
{
  "toolNames": [
    "quote_spot",
    "get_quote"
  ]
}
```

高频参数的明确约束如下；未列默认值的字段请读取 schema，不自行补值。

| 场景 | 字段 | 类型 | 必填与默认值 |
| --- | --- | --- | --- |
| search | key | string | 必填，无默认值 |
| get_quote 股票示例 | market、assetType | string | 显式提供 HK、stock；其他资产组合查 schema |
| get_quote 股票示例 | symbols | string[] | 示例提供非空证券数组 |
| 扩展行情 | quoteType | string | 需要扩展字段时传 extended；股票支持 HK、US、CN、JP |
| 行情时间模式 | timeMode | integer | 可选；0 实时，1 延时，默认 0 |
| get_kline | symbol、period | string | 示例提供 AAPL.us、1d；完整枚举查 schema |
| get_kline | limit | integer | 请求条数上限，默认 100，范围 1～500；实际条数取决于下游，不自动补页 |
| get_financial_statement | market、symbol、statementType | string | 显式提供；statementType 为 income/balance/cash |
| 财务报告期 | reportType | string 或 integer | 可选；不传不限制该筛选条件，枚举见 SKILL.md |
| get_company_profile | market、symbol | string | 必填；不传 dataType 或 symbols |
| 基金分页 | page、page_size | integer | page 从 0 开始；page_size 默认 50，最大 200 |
| 财经日历搜索 | date、keyword | string | 至少提供这两个条件，其余筛选见 schema |

## 典型请求

### 证券搜索

调用 search：

```json
{
  "key": "腾讯"
}
```

### 基础及扩展行情

调用 quote_spot；基础行情不需指定 quoteType，扩展行情示例：

```json
{
  "endpoint": "get_quote",
  "params": {
    "market": "HK",
    "assetType": "stock",
    "symbols": [
      "00700.hk"
    ],
    "quoteType": "extended",
    "timeMode": 0
  }
}
```

### 日K线

调用 quote_kline：

```json
{
  "endpoint": "get_kline",
  "params": {
    "market": "US",
    "assetType": "stock",
    "symbol": "AAPL.us",
    "period": "1d",
    "limit": 60,
    "timeMode": 0
  }
}
```

### 财务报表

调用 f10_financials：

```json
{
  "endpoint": "get_financial_statement",
  "params": {
    "market": "CN",
    "symbol": "600519.sh",
    "statementType": "income",
    "reportType": 6
  }
}
```

### 公司资料

调用 f10_profile：

```json
{
  "endpoint": "get_company_profile",
  "params": {
    "market": "HK",
    "symbol": "00700.hk"
  }
}
```

### 基金与其他模块

未知全球基金时先调用 describe_tool 查询 fund_data 的 search_funds 参数，再搜索取得稳定 ID。其余模块按用途选择后用 describe_tool 查询目标 endpoint，随后以 endpoint + params 调用。此连接器只配置 /api/mcp/v2，不切换到独立基金服务。


## 工具集详细说明

Cursor 侧按数据域暴露模块工具。先按用户问题选择模块，再通过 endpoint 选择模块内的具体能力。不同模块的市场、参数、分页和返回结构不能互相套用。

| 数据域 | 模块职责 | 典型问题 | 模块入口 |
| --- | --- | --- | --- |
| 标的识别 | 将名称、简称、代码解析为稳定证券标识 | 这家公司代码是什么 | search |
| 实时行情 | 查询当前或最近可用的证券快照 | 当前价格、市值、涨跌幅是多少 | quote_spot |
| 盘中数据 | 查询分时、盘口、逐笔和成交明细 | 今天的分时和买卖盘如何 | quote_intraday |
| 历史行情 | 查询 K 线和历史价格 | 最近 60 根日 K 是什么 | quote_kline |
| 衍生品行情 | 查询港股衍生品和美股期权合约 | 期权链、到期日和行权价 | quote_derivatives_hk / quote_us_options |
| 市场概况 | 查询市场状态、指数和概览统计 | 今天是否开市 | market_overview |
| 市场排行 | 按涨跌、成交、换手等字段排序 | 今日涨幅榜有哪些 | market_ranking |
| 资金流 | 查询个股、行业或市场资金流 | 资金净流入多少 | market_flow |
| 市场结构 | 查询行业、板块及证券归属 | 股票属于哪个行业 | market_structure |
| 持仓成本 | 查询成本分布和持仓统计 | 持仓成本区间如何 | market_position_cost |
| 公司资料 | 查询公司静态资料和概况 | 总部、官网和主营是什么 | f10_profile |
| 财务数据 | 查询三大报表和财务指标 | 最新利润表、ROE 和 PE | f10_financials |
| 主营构成 | 查询业务分部收入、利润和占比 | 各业务收入占比多少 | f10_business_governance |
| 股本和持股 | 查询股本、股东及机构持仓 | 前十大股东是谁 | shareholding_* |
| 基金与 ETF | 查询基金识别、资料、净值、收益和持仓 | 某基金净值和费用是多少 | fund_data |
| 沪深港通 | 查询互联互通标的和交易数据 | 哪些股票属于港股通 | stock_connect |
| IPO | 查询新股发行、申购和上市 | 最近有哪些新股招股 | ipo |
| 债券 | 查询债券资料、估值、收益率和风险 | 债券何时到期、收益率如何 | bond_basic / bond_analytics |
| 新闻和公告 | 查询新闻、相关报道和上市公司公告 | 公司最近有什么消息 | fiu_news / company_announcements |
| 日历和宏观 | 查询经济事件及国家或市场指标 | 本周有哪些重要数据 | financial_calendar / macro_economics |
| 参考码表 | 查询市场、行业和类型编码 | 某个代码代表什么 | reference |

### 元工具和标的识别

describe_tool 仅接受 toolNames 数组，统一返回模块或 endpoint 的完整调用契约；模块包含全部 endpoint，不分页或截断。parameterBranches 的枚举和必填规则按条件适用，validCombinations 列出有效组合。内容过大返回 RESPONSE_TOO_LARGE，应减少名称或按单个 endpoint 查询。search 是顶层工具，直接传入 key 字符串对象，不传 endpoint 或 params。候选存在多个市场、ADR、权证或同名主体时先确认。基金标识使用 fund_data 的搜索能力。

### 行情模块

quote_spot 的 get_quote 查询基础和扩展行情，必须显式传 market；当前实际路由仅支持 HK/US/CN/JP 股票及 GLOBAL 债券，ETF、index、warrant 使用专用搜索、资料或衍生品 endpoint。证券代码应带 `.hk/.us/.sh/.sz/.jp` 后缀；重复或等价代码会在规范化后去重。CN 明确的指数代码不能按 stock 查询。search_security 不承接 GLOBAL 债券或基金搜索：债券使用 bond_basic.search_bond，基金使用 fund_data。HK index 的 date 可省略并默认今天，未指定 indexSeries 时合并 C/H/S/T 四个系列。扩展行情传 quoteType=extended，timeMode=0 为实时，1 为延时。quote_intraday 用于分时、盘口和逐笔，数据量较大时按 schema 限制时间或数量。quote_kline 的 get_kline 常用条件包括 market、assetType、symbol、period、limit、复权和 timeMode，市场对应枚举必须从 describe_tool 获取。

quote_kline.get_jp_kline 仅支持 JP，market 默认 JP；symbol 与 symbols 至少填写一个，symbols 为非空数组，同时填写时 symbol 须包含在 symbols 中。describe 的 atLeastOneOf 为 ["symbol","symbols"]。limit 按每只证券计算，默认 20，范围 1～500。type 为整数枚举，默认 0；K线类型：0（日）、1（周）、2（月）、3（季）、4（年）、5（1分）、6（5分）、7（15分）、8（30分）、9（60分）、10（120分）、11（3分）、12（240分）。timeMode 为整数 0（实时）或 1（延时），默认 0。date：日周月季年 K 使用 yyyy-MM-dd，分钟 K 使用 yyyy-MM-dd HH:mm:ss；省略时查询最新 K 线。批量示例：`{"endpoint":"get_jp_kline","params":{"symbols":["6758.jp","7203.jp"],"type":0,"limit":2}}`。返回 meta/format/columns/columnNames/rows，数据固定为 amount、amountLast、change、changeRate、close、date、high、low、open、preClose、turnoverRate、volume、volumeLast 共 13 列，中文含义由 columnNames 按位置给出，缺失值为 null。证券代码规范化后去重并保留输入顺序。单只（含单元素数组）使用 meta.symbol；批量按 meta.symbols 顺序拼接，meta.rowCounts 给出各证券记录数（空结果为 0），meta.count 为总根数。

### 衍生品模块

quote_derivatives_hk 面向港股衍生品，quote_us_options 面向美股期权链和合约。调用前确认合约标识、到期日、行权价、方向、分页和行情类型；不能把普通股票参数直接复制到衍生品 endpoint。

### 市场和 F10 模块

market_overview 查询交易状态和概览；排行调用 market_ranking，endpoint 选择 get_hk_ranking、get_us_ranking、get_cn_ranking、get_jp_ranking，业务字段放入 params；market_flow 查询资金流；market_structure 查询行业和板块归属；market_position_cost 查询成本统计。rankType、flowType、排序字段和分页不是通用参数。

市场排行工具必填 `rankType:string`：港股 stock/industry/ipo/broker/market_premium；美股 stock/industry/ipo/etf；A股 stock/industry/ipo；日股 stock/hot_stock/industry。已知市场时，调用 `describe_tool`：`{"toolNames":["get_hk_ranking"]}`，获取该市场全部类型的参数与 oneOf 分支，无需先查工具集目录。parameters 是公共字段字典，variants 列出各类型允许字段 fields 及覆盖项 overrides；两者组合后是所选类型的契约，也可直接按 rankType 选择 oneOf 分支。枚举含义见 enumNames，未声明 required:true 表示可选。不要把股票排行参数用于行业或 ETF 周期排行。美股 IPO 和 ETF 周期排行没有分页参数。经纪商持仓排行仅港股，必须提供 symbol。

示例：调用 `market_ranking`，参数 `{"endpoint":"get_hk_ranking","params":{"rankType":"stock","marketBoard":"MAIN","pageSize":10}}`。顶层只填 endpoint 和 params，params 中不填 market；四个市场 endpoint 不作为独立 MCP 工具调用。输出为顶层 columns/columnNames/rows；columnNames 按位置解释字段，total 仅在接口提供时存在。参数错误时按当前 rankType 的 variants 修正；空数据不解释为零，不把接口故障解释为无匹配记录。沿用本 Skill 的认证前置条件，以上查询均为只读操作。

f10_profile 提供公司静态资料，f10_financials 提供 income、balance、cash 三类报表及关键指标，f10_business_governance 提供主营构成和治理资料。三市场 reportType 枚举不同，返回时结合 coverMonths 区分单季和累计。美股实际样本中的 Q9 在公开 Q3 筛选中结合 coverMonths=3 或 9 归类，不归入 Q4。

### 持股、基金、IPO 和债券

shareholding_structure 关注股本和股东结构，shareholding_institution 关注机构，shareholding_fund_broker 关注基金和券商。基金先搜索取得 fund_id 或 fund_class_id；份额级净值、收益和费用优先使用 fund_class_id，基金主体经理、持仓和风险优先使用 fund_id。ipo 用于发行和上市流程，bond_basic 用于静态条款，bond_analytics 用于估值、收益率和风险。

### 新闻、公告、日历、宏观和参考码表

fiu_news 用于新闻检索、主体新闻、详情和相关报道；company_announcements 专门用于上市公司公告，两者不能互相替代。financial_calendar 面向日期和事件，macro_economics 面向国家或市场指标。新闻标题和摘要不能证明公告事实、因果关系或投资影响。reference 用于解释市场、行业、资产类型和其他编码。

## 统一返回和错误恢复

成功有数据返回 resultStatus=ok；成功但无匹配返回 resultStatus=empty 并保留 emptyReason；参数、认证、权限、路由、网络、超时或下游失败返回 resultStatus=error。紧凑表的 columns、columnNames 和 rows 必须严格对齐，缺失值保留 null。认证错误重新配置连接器 Token，参数错误先查 describe_tool，可重试错误只按 retryable 有限重试。
