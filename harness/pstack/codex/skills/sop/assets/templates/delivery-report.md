## 交付报告

<!--
The last section of the writer's final handoff — the handoff after which no
approved phase remains, or the one that stops the task as blocked. The writer
writes it; the orchestrator sends scripts/extract-delivery-report.py's output
VERBATIM. The script appends the reviewer's verdict line; the writer never
writes the review result itself. The human reads only this block and does not
open the task directory. On task completion, the orchestrator closes idle agents
via scripts/herdr-agent.py close --task-dir <task-dir> --idle.

Same writing rules as the gate packet (from ste-zh, MIT, github.com/dualface/ste-zh):
result first, one fact per sentence, plain words, 未确认 for anything not
checked, no ID or section the human cannot look up.

Hard limits (scripts/extract-delivery-report.py): the six ### sections below, in
this order; ≤ 30 lines; ≤ 1500 characters; each line ≤ 120 characters.
- 结论: one line, starting with one status word —
  已完成 / 无需改动 / 部分完成 / 阻塞 / 失败 — then the scope. 已完成 never means
  verified. 无需改动 = investigated, nothing to change (not reproduced, not a
  defect, already fixed elsewhere); say which, and how it was checked.
- 验证: every line starts with 已验证 / 未验证 / 失败 / 未确认, then the check
  and its result. A required check that failed or did not run means the
  结论 cannot be 已完成 or 无需改动. A change a person sees with no real
  before-and-after capture is 部分完成 (SKILL.md §6).
- 没做 and 要你决定: the line 无 when empty. 要你决定 follows the gate-packet
  rules (D-n, 卡住：…, numbered options, recommendation first).
-->

### 结论
<已完成 | 无需改动 | 部分完成 | 阻塞 | 失败>：<完成范围，一句话>

### 改了什么
- 改前：<原来的行为>
- 改后：<现在的行为>

### 验证
- 已验证：<检查> — <结果>
- 未验证：<没跑的检查> — <原因>

### 没做
- <没做的事> — <原因；没有就写 无>

### 要你决定
无

### 怎么撤回
- <一句话：撤回的办法和影响范围>
