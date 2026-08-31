---
name: deadlines
description: Overview of all filing deadlines with penalty warnings and countdown.
---

# Filing Deadlines

Show all upcoming filing deadlines with countdown timers and penalty information.

## Steps

1. **Get all deadlines** using `get_deadlines` with `include_completed: false`.

2. **Get company info** using the `accountsos://company` resource to understand the company's financial year-end and VAT registration status.

3. **Sort and categorize** the deadlines:
   - **Overdue** — past due date (flag immediately)
   - **Urgent** — due within 14 days
   - **Upcoming** — due within 30 days
   - **Future** — due beyond 30 days

4. **Add penalty context** for each deadline type (see penalty reference below).

## Output Format

```
## Filing Deadlines — [Company Name]

### Overdue
[Any missed deadlines with penalty implications]

### Urgent (next 14 days)
[Deadline] — [Type] — due [date] ([X] days)
  Penalty if missed: [details]

### Upcoming (next 30 days)
[Deadlines with less urgency]

### Future
[Deadlines further out]

### Calendar Summary
[Next 3 months of key dates]
```

## UK Filing Penalty Reference

### Corporation Tax Return (CT600)
- Due: **12 months** after the end of the accounting period
- Payment due: **9 months and 1 day** after the period ends
- Late filing penalties:
  - 1 day late: £100
  - 3 months late: another £100
  - 6 months late: HMRC estimates tax + 10% penalty
  - 12 months late: further 10% of unpaid tax

### Annual Accounts (Companies House)
- Due: **9 months** after the financial year-end (private company)
- Late filing penalties:
  - Up to 1 month: £150
  - 1-3 months: £375
  - 3-6 months: £750
  - Over 6 months: £1,500
- Penalties double if late two years running

### VAT Return
- Due: **1 month and 7 days** after the VAT quarter ends
- Late filing: default surcharge system
  - First default: surcharge period (no financial penalty)
  - 2nd default: 2% of VAT owed
  - 3rd: 5%, 4th: 10%, 5th+: 15%

### Confirmation Statement (Companies House)
- Due: **at least once every 12 months** from incorporation or last filing
- No grace period — £5,000 fine and possible strike-off
- Filing fee: £13 online, £40 paper

### Self Assessment (if applicable)
- Paper return: 31 October following the tax year
- Online return: 31 January following the tax year
- Late filing: £100 immediately, escalating after 3 months
