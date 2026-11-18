## Gate packet

<!--
The last section of every plan. The writer writes it; the orchestrator sends
scripts/extract-gate-packet.py's output VERBATIM. The human reads only this
block, often on a phone, and does not open the plan or any other file. Every
line must be understandable without them.

The human decides outcomes, not implementation. Ask only what the human can
judge from behavior, risk, cost, or time. Where a code goes, which file, which
pattern: decide it yourself and say so in the plan body, not here.

Writing (from ste-zh, MIT, github.com/dualface/ste-zh):
- Key information first. One fact per sentence. Short sentences.
- Words the human may not know: say what they mean in plain words, or leave them out.
- Unknown facts: write 未确认 and how it will be confirmed. No 可能/大概/应该是.
- Never cite an ID or a section that is not defined in this block (D-7 from an
  earlier round, "F 冻结的用例", §4.2). Say it in one sentence instead.

Hard limits (scripts/extract-gate-packet.py): the five ### sections below, in
this order; ≤ 30 lines; ≤ 1500 characters; each line ≤ 120 characters.
要你决定 is either the line 无 or one or more D-n items. Each D-n names the
phase it holds (卡住：…) — a choice that holds nothing is not a decision: put it
under 默认做法. Each D-n has ≥ 2 numbered options; option 1 is the
recommendation, marked （推荐）, and every option says what happens — after —.
When there is a D-n, 批准后 has a 不等回复 line: the phases no D-n holds, which
the orchestrator starts while you wait for the reply (or 无). A decision holds
only its phase.
The last line is the reply line.
-->

### 问题
<一句话：用户能看到的现象，或要达成的目标>

### 要改什么
- 改前：<现在的行为>
- 改后：<改完的行为>
- 影响：<谁、哪些页面或服务会变；哪些不变>
- 未确认：<会改变你判断的未知，以及怎么确认；没有就删掉这一行>

### 要你决定
**D-1 <一句话的问题>**（卡住：<阶段 n>）
1. <选项>（推荐）— <选了会怎样>
2. <选项> — <选了会怎样>

### 默认做法（不回复即照做）
- <writer 会这样做的选择；你可以否决；没有就写 无>

### 批准后
- 不等回复：<不受任何 D-n 影响、现在就开始的阶段；没有就写 无；要你决定是 无 时删掉这一行>
- 会做：<阶段与动作>
- 不会做：<提交、发布、部署、改数据，或其他以后另批的事>

回复：按推荐 / D-1 选 <n> / 改：<哪里> / 不批准
