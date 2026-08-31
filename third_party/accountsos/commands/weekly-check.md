---
name: weekly-check
description: Full weekly financial review — balance, transactions, deadlines, VAT position, invoices, and DLA.
---

# Weekly Financial Check

Run a comprehensive review of the business finances. Use the AccountsOS tools to gather all data, then present a clear summary.

## Steps

1. **Get current balance** using `get_balance`. Report the current balance and any pending amounts.

2. **Get this week's transactions** using `get_transactions` with `from_date` set to 7 days ago. Summarize:
   - Total income received
   - Total expenses paid
   - Net position for the week
   - Any large or unusual transactions worth flagging

3. **Check upcoming deadlines** using `get_deadlines`. Highlight:
   - Anything due in the next 14 days (urgent)
   - Anything due in the next 30 days (upcoming)
   - Include the deadline type and exact due date

4. **Get VAT position** using `get_vat_summary`. Report:
   - Current VAT owed or reclaimable
   - Which quarter this covers
   - When the VAT return is due

5. **Check invoices** using `get_invoices`. Report:
   - Total outstanding amount
   - Any overdue invoices (with how many days overdue)
   - Suggest chasing any invoices overdue by more than 7 days

6. **Check DLA balance** using `get_dla_balance`. Report:
   - Current Director's Loan Account balance
   - Whether the account is overdrawn (company owes director or director owes company)
   - Flag any S455 tax risk if DLA is overdrawn at year-end

## Output Format

Present as a clean weekly summary with sections. Use GBP currency. Flag anything that needs attention with clear action items at the end.

Example structure:

```
## Weekly Finance Summary — [date range]

### Balance
Current: £X,XXX.XX

### This Week
Income: £X,XXX | Expenses: £X,XXX | Net: +/- £X,XXX
[Notable transactions]

### Deadlines
[Urgent and upcoming deadlines]

### VAT Position
[Current quarter VAT status]

### Invoices
[Outstanding and overdue summary]

### Director's Loan
[DLA balance and any warnings]

### Action Items
1. [Things that need attention]
```
