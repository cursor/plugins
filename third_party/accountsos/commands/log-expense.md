---
name: log-expense
description: Quick expense logging with automatic categorization.
---

# Log Expense

Help the user quickly log a business expense. Extract the key details from their description, create the transaction, and auto-categorize it.

## Steps

1. **Parse the expense details** from the user's message. Extract:
   - Amount (in GBP)
   - Description of what was purchased
   - Date (default to today if not specified)
   - VAT rate if mentioned (default to 20% for standard-rated items)
   - Any project or contact to associate with

2. **Get available categories** using `list_categories` with `type: "expense"` to find the best match.

3. **Create the transaction** using `create_transaction` with:
   - `direction`: "out"
   - `date`: extracted or today
   - `description`: clear description of the expense
   - `amount`: the amount in GBP
   - `vat_rate`: 20 for standard, 0 for exempt, 5 for reduced rate
   - `category_id`: best matching category from the list

4. **Confirm to the user** what was logged, including:
   - Amount and description
   - Category assigned
   - VAT treatment
   - Date recorded

## Common UK Expense Categories

When matching expenses to categories, consider:
- **Travel**: trains, flights, taxis, parking, mileage
- **Meals & Entertainment**: client lunches, team meals (note: entertaining clients is not tax-deductible but should still be tracked)
- **Software & Subscriptions**: SaaS tools, hosting, domains
- **Office Costs**: supplies, furniture, equipment under £1,000
- **Professional Services**: accountant, lawyer, consultant fees
- **Marketing**: advertising, design, PR
- **Telephone & Internet**: phone bills, broadband

## VAT Quick Reference

- **20% (standard)**: most goods and services
- **5% (reduced)**: domestic energy, children's car seats
- **0% (zero-rated)**: food (most), books, children's clothing
- **Exempt**: insurance, finance, education, health

## Example

User says: "Coffee with Sarah from Acme, twelve pounds"

Log as:
- Amount: £12.00
- Description: "Coffee meeting — Sarah, Acme"
- Category: Meals & Entertainment
- VAT: 20%
- Date: today
