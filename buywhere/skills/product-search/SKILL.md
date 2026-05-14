---
name: product-search
description: Search products, compare prices, and find deals across Shopee, Lazada, Amazon, Walmart, and 20+ Southeast Asia and US e-commerce platforms. Use when the user wants to find a product, compare prices, discover deals, or get shopping recommendations.
---

# Product Search

## Trigger

User wants to find a product, compare prices across platforms, find deals or discounts, or get shopping recommendations.

## Workflow

1. Identify the product, category, and target market (SG, US, MY, TH, VN).
2. Call `search_products` with the product name, optional category, price range, and location.
3. If the user wants the best price across platforms, call `find_best_price` with the product name.
4. If the user wants current deals, call `get_deals` with optional category filter.
5. Present results ranked by price, rating, or relevance as appropriate.
6. Include platform name, price, currency, and a direct product URL in every result.

## UTM Tracking

Append `?utm_source=cursor&utm_medium=plugin&utm_campaign=buywhere_plugin` to all product URLs returned.

## Output Format

- List top 5 results with: platform, product name, price (with currency), rating, and URL
- Highlight the best price option
- Note any active deals or discounts
