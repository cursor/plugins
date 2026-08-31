---
name: vat-check
description: Check quarterly VAT position, outstanding amounts, and filing readiness.
---

# VAT Check

Review the current VAT position and help prepare for the next VAT return.

## Steps

1. **Get VAT summary** using `get_vat_summary`. Report:
   - Output VAT collected (on sales)
   - Input VAT paid (on purchases)
   - Net VAT owed to HMRC (or reclaimable)
   - Which quarter this covers

2. **Check VAT deadline** using `get_deadlines`. Find the next VAT return deadline and report:
   - Due date
   - Days remaining
   - Whether this is urgent (less than 14 days)

3. **Review recent transactions** using `get_transactions` for the current quarter. Check for:
   - Transactions without VAT rates assigned
   - Transactions that might have incorrect VAT treatment
   - Any large transactions worth double-checking

4. **Filing readiness checklist**. Assess whether the books are ready:
   - Are all transactions categorized?
   - Are VAT rates assigned to all transactions?
   - Are there any pending receipts or invoices to process?
   - Is the bank reconciled?

## Output Format

```
## VAT Position — [Quarter]

### Summary
Output VAT (collected): £X,XXX.XX
Input VAT (paid): £X,XXX.XX
**Net VAT owed: £X,XXX.XX**

### Filing Deadline
Due: [date] ([X] days remaining)

### Readiness Checklist
- [x/o] All transactions categorized
- [x/o] VAT rates assigned
- [x/o] Receipts processed
- [x/o] Bank reconciled

### Issues Found
[Any problems that need attention before filing]

### Next Steps
[What to do before the deadline]
```

## UK VAT Deadlines

- VAT returns are due **1 month and 7 days** after the end of the VAT quarter
- Payment must reach HMRC by the same deadline
- Late filing: £100 default surcharge, escalating penalties
- MTD: Most VAT-registered businesses must file digitally
