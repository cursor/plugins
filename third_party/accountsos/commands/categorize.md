---
name: categorize
description: Bulk review and categorize uncategorized transactions.
---

# Categorize Transactions

Find uncategorized transactions and work through them systematically, applying AI-suggested categories.

## Steps

1. **Get uncategorized transactions** using `get_transactions`. Look for transactions without a category assigned.

2. **Get available categories** using `list_categories` for both `expense` and `income` types.

3. **For each uncategorized transaction**, use `categorize_transaction` to get the AI suggestion. Present:
   - Transaction date and description
   - Amount and direction (in/out)
   - AI-suggested category and confidence score

4. **Apply categories**:
   - High confidence (>80%): Apply automatically and report what was done
   - Medium confidence (50-80%): Present the suggestion and ask the user to confirm
   - Low confidence (<50%): Present the top 2-3 options and ask the user to choose

5. **Use `update_transaction`** to apply the chosen category to each transaction.

6. **Summary**: Report how many transactions were categorized, broken down by auto-applied vs user-confirmed.

## Output Format

```
## Transaction Categorization

Found [X] uncategorized transactions.

### Auto-categorized (high confidence)
- [date] [description] £XX.XX -> [category] (XX% confidence)
- [date] [description] £XX.XX -> [category] (XX% confidence)

### Needs your input
1. [date] [description] £XX.XX
   Suggested: [category] (XX% confidence)
   Other options: [category 2], [category 3]
   -> Which category?

### Summary
- Auto-categorized: X transactions
- User-confirmed: X transactions
- Remaining: X transactions
```

## Category Guidance

When reviewing AI suggestions, consider:
- **Office costs vs Equipment**: items under £1,000 are typically office costs; over £1,000 may be capital expenditure
- **Travel vs Subsistence**: transport costs are travel; food/drink during travel is subsistence
- **Client entertaining vs Staff welfare**: meals with clients are entertaining (not tax-deductible); meals with staff can be welfare (deductible under £150/head)
- **Software vs Professional services**: subscription tools are software; one-off consultancy is professional services
- **Marketing vs General admin**: paid ads and PR are marketing; business cards and stationery are admin
