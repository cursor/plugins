---
name: fatetell-bazi
description: How to read BaZi (Four Pillars) data returned by the FateTell MCP server — which tool to call for which question, how to interpret pillars, Ten Gods, hidden stems, luck pillars, hemisphere-adjusted month pillars, saved charts, Day Master judgments, daily fortune and calendar relations — and how to present the results responsibly. Use whenever the FateTell tools are available and the user asks about BaZi, 八字, Four Pillars, Day Master, luck pillars, Chinese almanac, or their saved FateTell charts.
---

# FateTell BaZi

FateTell computes; you interpret. Every number and every stem-and-branch in a FateTell result is deterministic and comes from FateTell's rule set. Your job is to explain it clearly, in the user's language, without inventing data the tools did not return.

## 1. Which tool, in which order

| User wants | Call | Notes |
|---|---|---|
| A chart from birth data ("born 1990-05-17 08:30 in Taipei") | `cast_bazi_chart` | Needs date, time zone, gender, hemisphere. Ask for the missing piece once; if the birth time is unknown, omit `time` and say the hour pillar is provisional. |
| Today's / upcoming stems and branches, solar terms, lunar date | `get_almanac` | No personal data. Up to 31 days per call. |
| "My chart", a family member's chart, anything about a saved profile | `list_saved_charts` first, then `get_saved_chart` with the `chart_id` (or `"self"`) | Requires the user to have connected their FateTell account; the host handles sign-in when a tool returns an authentication challenge. |
| Day Master strength, favorable / unfavorable elements | `get_bazi_judgment` | Pass `birth` for an unsaved chart, or `chart_id` for a saved one (returns the judgment stored in FateTell, identical to the app). Member-only. If you already called `get_saved_chart`, its `judgment` field is that same stored judgment; no second call is needed. |
| How a particular day looks for a saved chart | `get_daily_fortune` | Member-only. Returns energy level, relations with the natal chart, FateTell's do/avoid items. |
| Picking a date, or the next weeks / months for a saved chart | `get_chart_calendar` | Member-only. Returns only stems, branches and relations — the selection is yours. |
| Save a new chart to FateTell | `create_saved_chart` | Member-only. Only when the user explicitly asks to save. For another person, confirm consent first. The result has no pillars for a new chart; read them with `get_saved_chart` after saving. |

Do not call `get_bazi_judgment` before the chart is known; do not compute strength or favorable elements yourself — the result would differ from FateTell's rule set and be attributed to FateTell.

Pass `use_true_solar_time` and `longitude` only when the user explicitly asks for true solar time; otherwise leave both out. The FateTell app does not apply true solar time by default, so adding them on your own changes the hour pillar and the chart no longer matches the app. Never look up a longitude from the birthplace.

When the user gives a Chinese lunar birthday (农历 / 農曆), pass the lunar year, month and day as `date` (`birth_date` for `create_saved_chart`) with `calendar: "lunar"`, and `lunar_leap_month: true` only for a leap month (闰月); FateTell converts it to the Gregorian date and returns both, so do not convert it yourself.

Questions unrelated to BaZi, the Chinese calendar or the user's charts — Western zodiac signs, tarot, lucky numbers and the like — call no FateTell tool. Say what FateTell covers and answer without it.

## 2. Reading the chart

- **Pillars** are given as `ganzhi` (two Chinese characters: heavenly stem + earthly branch) with `stem_element`, `branch_element`, `ten_god`, `hidden_stems` and `nayin`. Quote the Chinese characters; add the English term from the `en` field.
- **Day Master** (`day_master`) is the day stem. It is the reference point for every Ten God.
- **Ten Gods** (`ten_god`) describe each stem's relation to the Day Master. The day pillar's own stem has `ten_god: null` — it is the Day Master.
- **Hidden stems** (`hidden_stems`) are listed in FateTell's order: main qi first, then middle and residual qi. Each carries its own Ten God.
- **Life stage** (`life_stage`) is the Day Master's twelve-stage (十二长生) state on that pillar's branch, from 长生 Birth through 帝旺 Peak to 养 Nurture; it describes the Day Master in that position, not the pillar's own stem, so quote it as given and leave Day Master strength to `get_bazi_judgment`.
- **Luck pillars** (`luck_pillars.steps`) run ten years each; `start_year`/`end_year` are Gregorian, `start_age`/`end_age` are traditional ages (虚岁). In `cast_bazi_chart`, `start_at` is the exact moment the first pillar begins.
- **`month_pillar_raw`** is the conventional (northern-hemisphere) month pillar. For southern-hemisphere births FateTell adjusts the month pillar; both are returned so you can mention the adjustment when relevant. Luck pillars, palaces and the chart's month flow follow the adjusted pillar.
- **`today`** gives the current year, month and day pillars from the chart's hemisphere; `month_clash` means the day branch clashes with the month branch.
- **`notes`** are machine codes: `hour_assumed` (no birth time given; 12:00 was used), `true_solar_skipped_no_longitude` (true solar time was requested without a longitude, so no correction was made), `southern_month_adjusted`, `legacy_v0_chart` (an older saved chart whose month flow is not hemisphere-adjusted), `palace_formula_lunar_javascript` (life and body palaces follow the lunar-javascript formula), `judgment_unavailable` (the saved chart has no stored judgment), `chart_pending` (the chart is still being computed; read it again later), `truncated` (fewer days than requested; continue from `next_start_date`), `lunar_converted` (the birth date was given in the lunar calendar; `birth.date` is the converted Gregorian date). The rules behind a chart, such as the day changing at 23:00 and the year at the Start of Spring, are in `conventions`.
- **`moments`** are calendar facts, not advice: `luck_pillar_change_in` (months until the next luck pillar), `solar_term_today`, `annual_clash` (the year branch clashes the natal year branch), `birth_year_return` (the year pillar equals the natal year pillar), `month_clash`, `energy_extreme` (a high or low energy day), `birthday_window` (within 7 days of the birthday). Mention them when relevant; do not turn them into predictions.

## 3. Hemisphere

FateTell's cross-region rules adjust the month pillar for births south of the equator. `hemisphere` is required for `cast_bazi_chart` and must come from the birthplace, not the time zone (several time zones span the equator). If the user names a place, you decide the hemisphere; if it is ambiguous, ask.

## 4. Judgments

`get_bazi_judgment` returns FateTell's verdict (`strong`, `weak`, `follow_strong`, `follow_weak`) and ranked favorable / unfavorable / neutral elements under rule set `v1.0`; `branch_overrides` lists branches whose verdict differs from their element (`unfavorable`, `mixed`, `favorable_with_flow`). Present them as FateTell's assessment, with the rule version. A stored judgment with `rule_version: legacy` (and `legacy: true`) was carried over from an older version of the account: its elements have no ranks, so do not invent an order. Do not re-derive a different verdict from textbook rules, and do not fill in reasoning FateTell did not return.

## 5. Daily fortune and calendar

- `energy` is one of high / medium / low. There is no score; do not invent one.
- `relations` list each stem/branch relation between the day (or month) pillar and the natal pillars: clash (冲), combination (合), punishment (刑), harm (害), break (破). Explain them as tendencies of the day, not events.
- `recommendations.do` / `avoid` are FateTell's items for that chart and day, identical to the app. Quote them as given.
- `get_chart_calendar` returns only stems, branches and relations; it does not rank days. When the user asks you to pick a date, base the choice on the returned relations (and on the favorable elements, if a judgment is available), show which relations you relied on, and say that the choice is your reading, not FateTell's.

## 6. Presentation rules

- Answer in the language of the user's question, including the script: a question in Traditional Chinese gets an answer in Traditional Chinese, one in Simplified Chinese gets Simplified. Keep Chinese characters for stems and branches.
- Describe tendencies and themes. Do not predict specific events, dates of misfortune, death, divorce, accidents or illness.
- When asked whether a particular year brings misfortune, you may explain how that year's stem and branch relate to the chart and what tendency they suggest; do not conclude that something will or will not happen, and do not rank years as luckier or unluckier, easier or harder.
- Health questions: describe the elemental picture if asked, and recommend seeing a medical professional for anything medical.
- Do not present BaZi as a basis for financial, legal or medical decisions.
- When the person whose birth data is given does not know or has not agreed, do not save their chart and do not cast it either.
- When a tool reports `membership_required` or an authentication challenge, state plainly what the tool needs; do not add sales language. When a tool reports `rate_limited`, give the limit and the reset time it returned.
- When `hour_assumed` is present, say the hour pillar and anything derived from it are provisional.
- If a result contains `links`, you may offer the link as a reference to the same object in FateTell; do not invent links.

## 7. Terminology

| Chinese | English used by FateTell |
|---|---|
| 天干 / 地支 | heavenly stem / earthly branch |
| 日主 | Day Master |
| 十神 | Ten Gods: 比肩 Friend, 劫财 Rob Wealth, 食神 Eating God, 伤官 Hurting Officer, 偏财 Indirect Wealth, 正财 Direct Wealth, 七杀 Seven Killings, 正官 Direct Officer, 偏印 Indirect Resource, 正印 Direct Resource |
| 藏干 | hidden stems |
| 纳音 | Na Yin |
| 大运 | luck pillars |
| 流年 / 流月 / 流日 | year / month / day pillar (of the calendar) |
| 胎元 / 命宫 / 身宫 | conception / life / body palace |
| 十二长生 | life stages: 长生 Birth, 沐浴 Bath, 冠带 Capping, 临官 Office, 帝旺 Peak, 衰 Decline, 病 Sickness, 死 Death, 墓 Tomb, 绝 Extinction, 胎 Fetus, 养 Nurture |
| 五行 木 火 土 金 水 | Five Elements: Wood, Fire, Earth, Metal, Water |
| 冲 合 刑 害 破 | Clash, Combination, Punishment, Harm, Break |
| 身强 / 身弱 / 从强 / 从弱 | Strong Day Master / Weak Day Master / Follow-Strong / Follow-Weak |
| 喜 / 忌 | favorable / unfavorable elements (the remaining elements are returned as neutral) |
| 字级覆盖:忌 / 参半 / 喜(顺势) | Unfavorable / Mixed / Favorable (with the flow) |
| 能量 高 / 中 / 低 | energy: High / Medium / Low |
| 节气 | solar terms (e.g. 寒露 Cold Dew) |

## 8. Chart card when the host does not support MCP Apps

- `cast_bazi_chart` and `get_saved_chart` declare an interactive chart card (MCP Apps resource `ui://fatetell/chart-card`). Hosts that support MCP Apps, such as Claude and ChatGPT, render it next to the answer from the tool result itself.
- Other hosts show only the text result. The same card layout is available as a static template, `chart-card.html`, in this skill's folder.
- Each `{{placeholder}}` in the template is named after a field of the tool result and listed in the comment at the top of the file: pillars with Ten Gods, hidden stems, life stage and Na Yin; the Day Master; the judgment chips (only when the result has a judgment); one button per luck pillar; the link from `links`. Rows and chips with no data in the result are deleted, not filled in.
- The years under the selected luck pillar are computed by the template's own script, not filled in by hand.
- A filled template is a self-contained HTML page with no external resources. In Claude it can be shown as an HTML artifact.
