---
name: invoices
description: Review outstanding and overdue invoices with chase suggestions.
---

# Invoices

Review all outstanding invoices and provide actionable follow-up recommendations.

## Steps

1. **Get all invoices** using `get_invoices` with `status: "all"` to get the full picture.

2. **Segment the invoices**:
   - **Overdue** — past due date, not yet paid
   - **Outstanding** — sent but not yet due
   - **Draft** — created but not sent
   - **Recently paid** — paid in the last 7 days (for context)

3. **For overdue invoices**, calculate:
   - How many days overdue
   - Total overdue amount
   - Which clients owe the most

4. **Generate chase recommendations**:
   - 1-7 days overdue: gentle reminder
   - 8-14 days overdue: firm follow-up
   - 15-30 days overdue: phone call recommended
   - 30+ days overdue: formal demand / consider escalation

5. **Cash flow impact**: Calculate total expected income from outstanding invoices and when it should arrive.

## Output Format

```
## Invoice Summary

### Overview
Outstanding: £X,XXX (X invoices)
Overdue: £X,XXX (X invoices)
Draft: X invoices to send

### Overdue Invoices
| Client | Amount | Due Date | Days Overdue | Action |
|--------|--------|----------|-------------|--------|
| [client] | £X,XXX | [date] | [X] days | [recommendation] |

### Outstanding (not yet due)
| Client | Amount | Due Date | Days Until Due |
|--------|--------|----------|---------------|
| [client] | £X,XXX | [date] | [X] days |

### Expected Cash Flow
Next 7 days: £X,XXX
Next 30 days: £X,XXX

### Suggested Actions
1. [Specific chase actions for overdue invoices]
```

## Chase Email Tips

When suggesting chase actions, keep it professional:
- Reference the invoice number and amount
- Assume good intent (they may have missed it)
- Offer to resend the invoice
- Provide payment details again for convenience
- For persistent non-payers, mention late payment interest rights (Late Payment of Commercial Debts Act: 8% + Bank of England base rate)
