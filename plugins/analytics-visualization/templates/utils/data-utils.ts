/**
 * Data Transformation Utilities
 * 
 * Helper functions for preparing data for analytics visualizations.
 * Copy this file to your project (e.g., src/lib/data-utils.ts)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DailyCategory {
  date: string;
  category: string;
  count: number;
}

export interface ComparisonData {
  labels: string[];
  countsA: number[];
  countsB: number[];
  totalA: number;
  totalB: number;
}

// =============================================================================
// FILTERING
// =============================================================================

/**
 * Filter out low-percentage items from categorical data.
 * Useful for removing noise from LLM classification results.
 * 
 * @param data - Array of items with a count property
 * @param thresholdPercent - Minimum percentage to include (default: 1%)
 * @returns Filtered array with items above the threshold
 * 
 * @example
 * const filtered = filterLowPercentage(data, 1);
 * // Removes items that are less than 1% of total
 */
export function filterLowPercentage<T extends { count: number }>(
  data: T[],
  thresholdPercent: number = 1
): T[] {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return data;
  
  const minCount = total * (thresholdPercent / 100);
  return data.filter((item) => item.count >= minCount);
}

/**
 * Filter daily time-series data by aggregated category totals.
 * Removes categories that are below the threshold when summed across all dates.
 * 
 * @param data - Array of daily category data
 * @param thresholdPercent - Minimum percentage to include (default: 1%)
 * @returns Filtered array with only significant categories
 */
export function filterDailyLowPercentage(
  data: DailyCategory[],
  thresholdPercent: number = 1
): DailyCategory[] {
  // Aggregate counts by category
  const categoryTotals = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.count;
    return acc;
  }, {});

  // Calculate total and threshold
  const grandTotal = Object.values(categoryTotals).reduce((sum, c) => sum + c, 0);
  if (grandTotal === 0) return data;
  
  const minCount = grandTotal * (thresholdPercent / 100);

  // Get categories that meet the threshold
  const significantCategories = new Set(
    Object.entries(categoryTotals)
      .filter(([, count]) => count >= minCount)
      .map(([category]) => category)
  );

  // Filter original data
  return data.filter((row) => significantCategories.has(row.category));
}

// =============================================================================
// AGGREGATION
// =============================================================================

/**
 * Aggregate daily data into category totals.
 * 
 * @param data - Array of daily category data
 * @returns Array of category counts, sorted by count descending
 */
export function aggregateByCategory(data: DailyCategory[]): CategoryCount[] {
  const totals = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.count;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get the top N categories by count, with optional "Other" aggregation.
 * 
 * @param data - Array of category counts
 * @param limit - Maximum number of categories to return
 * @param includeOther - Whether to aggregate remaining items into "Other"
 * @returns Top categories with optional "Other" category
 */
export function getTopCategories(
  data: CategoryCount[],
  limit: number = 7,
  includeOther: boolean = true
): CategoryCount[] {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, limit);

  if (includeOther && sorted.length > limit) {
    const otherCount = sorted
      .slice(limit)
      .reduce((sum, d) => sum + d.count, 0);
    
    if (otherCount > 0) {
      top.push({ category: "Other", count: otherCount });
    }
  }

  return top;
}

// =============================================================================
// COMPARISON DATA
// =============================================================================

export type SortType = "count" | "alphabetical" | "difference";

export interface BuildComparisonDataInput {
  dataA: CategoryCount[];
  dataB: CategoryCount[];
  sortType?: SortType;
}

/**
 * Build aligned data arrays for comparison charts.
 * Ensures both groups have the same categories in the same order.
 * 
 * @param input - Two datasets to compare and sort type
 * @returns Aligned labels and count arrays for both groups
 */
export function buildComparisonData({
  dataA,
  dataB,
  sortType = "count",
}: BuildComparisonDataInput): ComparisonData {
  // Get all unique categories from both datasets
  const allCategories = new Set([
    ...dataA.map((d) => d.category),
    ...dataB.map((d) => d.category),
  ]);

  // Create lookup maps
  const mapA = new Map(dataA.map((d) => [d.category, d.count]));
  const mapB = new Map(dataB.map((d) => [d.category, d.count]));

  // Convert to array for sorting
  let labels = [...allCategories];

  // Sort based on type
  switch (sortType) {
    case "count":
      // Sort by combined count (highest first)
      labels.sort((a, b) => {
        const sumA = (mapA.get(a) || 0) + (mapB.get(a) || 0);
        const sumB = (mapA.get(b) || 0) + (mapB.get(b) || 0);
        return sumB - sumA;
      });
      break;
    case "difference":
      // Sort by absolute difference between groups
      labels.sort((a, b) => {
        const diffA = Math.abs((mapA.get(a) || 0) - (mapB.get(a) || 0));
        const diffB = Math.abs((mapA.get(b) || 0) - (mapB.get(b) || 0));
        return diffB - diffA;
      });
      break;
    case "alphabetical":
    default:
      labels.sort();
  }

  // Build aligned arrays
  const countsA = labels.map((cat) => mapA.get(cat) || 0);
  const countsB = labels.map((cat) => mapB.get(cat) || 0);
  const totalA = countsA.reduce((sum, c) => sum + c, 0);
  const totalB = countsB.reduce((sum, c) => sum + c, 0);

  return { labels, countsA, countsB, totalA, totalB };
}

// =============================================================================
// TIME SERIES
// =============================================================================

/**
 * Get unique sorted dates from time-series data.
 */
export function getUniqueDates(data: DailyCategory[]): string[] {
  return [...new Set(data.map((d) => d.date))].sort();
}

/**
 * Get unique categories from data, sorted by total count.
 */
export function getUniqueCategories(data: DailyCategory[]): string[] {
  const totals = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.count;
    return acc;
  }, {});

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([category]) => category);
}

/**
 * Fill in missing date/category combinations with zero values.
 * Ensures consistent data for time-series charts.
 */
export function fillMissingDates(
  data: DailyCategory[],
  dates: string[],
  categories: string[]
): DailyCategory[] {
  const existing = new Set(data.map((d) => `${d.date}|${d.category}`));
  const filled = [...data];

  for (const date of dates) {
    for (const category of categories) {
      const key = `${date}|${category}`;
      if (!existing.has(key)) {
        filled.push({ date, category, count: 0 });
      }
    }
  }

  return filled.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.category.localeCompare(b.category);
  });
}

// =============================================================================
// PERCENTAGE CALCULATIONS
// =============================================================================

/**
 * Convert count data to percentages.
 */
export function toPercentages(data: CategoryCount[]): (CategoryCount & { percentage: number })[] {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  return data.map((d) => ({
    ...d,
    percentage: total > 0 ? (d.count / total) * 100 : 0,
  }));
}

/**
 * Calculate percentage change between two values.
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format a number with thousands separators.
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Format a number as a compact string.
 * @example formatCompact(1234567) → "1.2M"
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a percentage with specified decimal places.
 * @example formatPercent(0.1234) → "12.3%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
