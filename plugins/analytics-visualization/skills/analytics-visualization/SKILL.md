# Analytics Visualization Skill

Build charts and visualizations for admin dashboards using Highcharts with a consistent design system.

## When to Use

- Creating new analytics charts or dashboards
- Adding metrics visualizations to existing pages
- Building comparison views for user/group analytics
- Implementing time-series data displays
- Creating distribution/composition charts

## Prerequisites

- React and TypeScript project
- Install Highcharts: `npm install highcharts highcharts-react-official`
- Copy design constants from `templates/utils/chart-constants.ts`

## Design System

### Color Palette

The color system uses a Nord-inspired palette optimized for data visualization:

```typescript
export const COLORS = {
  // Primary colors for main data series
  greenPrimary: "#005C42",    // Primary positive/success data
  greenSecondary: "#1F8A65",  // Secondary positive data
  greenTertiary: "#96C2AC",   // Tertiary positive data
  
  bluePrimary: "#055180",     // Primary comparison/info data
  blueSecondary: "#3C7CAB",   // Secondary comparison data
  
  cyanPrimary: "#1E5563",     // Alternative category color
  cyanSecondary: "#4C7F8C",
  cyanTertiary: "#A2BBC2",
  
  yellowPrimary: "#A16900",   // Warning/medium severity
  
  orangePrimary: "#A33900",   // High severity/complexity
  orangeSecondary: "#DB704B",
  orangeTertiary: "#FCD4C7",
  
  magentaPrimary: "#89045E",  // Accent color
  magentaSecondary: "#D06BA6",
  
  neutralPrimary: "var(--color-theme-fg)",
  neutralSecondary: "var(--color-theme-bg-card)",
};

// Use this array for automatic color assignment in multi-series charts
export const COLOR_ARRAY = [
  COLORS.greenPrimary,
  COLORS.greenSecondary,
  COLORS.greenTertiary,
  COLORS.bluePrimary,
  COLORS.blueSecondary,
  COLORS.cyanPrimary,
  COLORS.cyanSecondary,
  COLORS.yellowPrimary,
  COLORS.orangeSecondary,
  COLORS.orangePrimary,
  COLORS.magentaPrimary,
  COLORS.magentaSecondary,
  COLORS.cyanTertiary,
  COLORS.orangeTertiary,
];
```

### Semantic Color Mappings

For data with inherent meaning (like complexity or severity), use semantic color mappings:

```typescript
// Complexity: green (low) → orange (high)
export const COMPLEXITY_COLORS: Record<string, string> = {
  trivial: COLORS.greenPrimary,
  simple: COLORS.greenSecondary,
  low: COLORS.greenSecondary,
  moderate: COLORS.yellowPrimary,
  medium: COLORS.yellowPrimary,
  complex: COLORS.orangeSecondary,
  high: COLORS.orangeSecondary,
  very_complex: COLORS.orangePrimary,
};

// Guidance/specificity levels
export const GUIDANCE_LEVEL_COLORS: Record<string, string> = {
  minimal: COLORS.greenPrimary,
  low: COLORS.greenSecondary,
  moderate: COLORS.yellowPrimary,
  medium: COLORS.yellowPrimary,
  high: COLORS.orangeSecondary,
  very_high: COLORS.orangePrimary,
};

// Intent categories (categorical - no inherent order)
export const INTENT_COLORS: Record<string, string> = {
  Plan: COLORS.bluePrimary,
  Ask: COLORS.cyanPrimary,
  "Task Automation": COLORS.yellowPrimary,
  "Write Code": COLORS.greenPrimary,
};
```

### Chart Styling Constants

```typescript
// Text styling
CHART_STYLES.text.primary   // Main text: var(--color-theme-text-secondary)
CHART_STYLES.text.secondary // Secondary text
CHART_STYLES.text.tertiary  // Muted text: var(--color-theme-text-tertiary)

// Common chart options (use spread syntax)
COMMON_CHART_OPTIONS.title(text)     // Chart title styling
COMMON_CHART_OPTIONS.xAxis           // X-axis with proper label styling
COMMON_CHART_OPTIONS.yAxis(text)     // Y-axis with title and label styling
COMMON_CHART_OPTIONS.tooltip         // Tooltip background and text styling
COMMON_CHART_OPTIONS.legend          // Legend item styling
COMMON_CHART_OPTIONS.credits         // { enabled: false } - always disable
COMMON_CHART_OPTIONS.plotOptions     // Animation disabled, standard column options
```

## Chart Type Selection Guide

| Data Type | Recommended Chart | Alternative |
|-----------|-------------------|-------------|
| Category distribution (static) | Donut Pie Chart | Horizontal Bar |
| Category comparison (ranked) | Horizontal Bar Histogram | Vertical Bar |
| Time series (single metric) | Line Chart | Area Chart |
| Time series (stacked categories) | Stacked Area Chart | Stacked Column |
| Volume + percentage over time | Dual-axis Column + Line | Separate charts |
| A/B comparison (percentages) | Grouped Horizontal Bar | Side-by-side Pie |
| Activity over year | GitHub Heatmap | Calendar view |
| Ordinal data (low→high) | Horizontal Bar (sorted) | Pie with semantic colors |

## Implementation Patterns

### Pie Charts (Donut Style)

**Use when:**
- Showing composition/distribution of a whole
- Comparing parts to a whole (percentages)
- 2-7 categories (too many makes it hard to read)
- Data represents a snapshot, not trends

```typescript
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { COLORS, COLOR_ARRAY, CHART_STYLES, COMMON_CHART_OPTIONS, formatLabel } from "@/lib/chart-constants";

interface PieChartProps {
  data: { category: string; count: number }[];
  title?: string;
}

export const CategoryPieChart = ({ data, title = "Distribution" }: PieChartProps) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data
    .map((item, index) => ({
      name: formatLabel(item.category),
      y: item.count,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0",
      color: COLOR_ARRAY[index % COLOR_ARRAY.length],
    }))
    .sort((a, b) => b.y - a.y);

  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      height: 300,
      backgroundColor: "transparent",
      animation: false,
    },
    title: { text: undefined },
    plotOptions: {
      pie: {
        animation: false,
        innerSize: "50%",
        allowPointSelect: true,
        cursor: "pointer",
        borderWidth: 2,
        borderColor: "var(--color-theme-bg)",
        dataLabels: {
          enabled: true,
          format: "{point.name}: {point.percentage:.1f}%",
          style: {
            ...CHART_STYLES.text.secondary,
            fontSize: "11px",
            textOutline: "none",
          },
          distance: 15,
        },
      },
    },
    series: [{ name: "Count", type: "pie", data: chartData }],
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      pointFormat: "{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>",
    },
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <span className="text-base font-medium" style={{ color: "var(--color-theme-text-primary)" }}>
          {title}
        </span>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
```

### Bar/Histogram Charts

**Use when:**
- Comparing discrete categories
- Showing rankings or sorted data
- Categories have long labels (horizontal bars work better)
- Need to show exact values with data labels

```typescript
interface HistogramProps {
  data: { category: string; count: number }[];
  title?: string;
  seriesName?: string;
}

export const CategoriesHistogram = ({ data, title = "Categories", seriesName = "Count" }: HistogramProps) => {
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 12);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      height: Math.max(300, sortedData.length * 28),
      backgroundColor: "transparent",
      animation: false,
    },
    title: { text: undefined },
    xAxis: {
      categories: sortedData.map((d) => formatLabel(d.category)),
      labels: { style: CHART_STYLES.text.tertiary },
    },
    yAxis: {
      ...COMMON_CHART_OPTIONS.yAxis("Count"),
      min: 0,
      title: { text: undefined },
    },
    plotOptions: {
      bar: {
        animation: false,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          style: CHART_STYLES.text.secondary,
          formatter: function () {
            const pct = total > 0 ? ((this.y ?? 0) / total) * 100 : 0;
            return `${pct.toFixed(1)}%`;
          },
        },
        colorByPoint: true,
        colors: COLOR_ARRAY,
      },
    },
    series: [{ name: seriesName, type: "bar", data: sortedData.map((d) => d.count) }],
    legend: { enabled: false },
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      pointFormat: `<b>{point.y}</b> ${seriesName.toLowerCase()}`,
    },
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};
```

### Stacked Area Charts (Time Series)

**Use when:**
- Showing trends over time
- Displaying composition changes over time
- Multiple categories that sum to a meaningful total
- Need to see both individual category trends and total

```typescript
interface DailyChartProps {
  data: { date: string; category: string; count: number }[];
  title?: string;
  yAxisTitle?: string;
}

export const DailyCategoriesChart = ({ data, title = "Daily Trend", yAxisTitle = "Count" }: DailyChartProps) => {
  const days = [...new Set(data.map((d) => d.date))].sort();

  // Get top categories by total count
  const categoryTotals = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.count;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([cat]) => cat);

  const series: Highcharts.SeriesOptionsType[] = topCategories.map((category, index) => ({
    name: formatLabel(category),
    type: "area" as const,
    data: days.map((day) => data.find((d) => d.date === day && d.category === category)?.count || 0),
    color: COLOR_ARRAY[index % COLOR_ARRAY.length],
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "area",
      height: 350,
      backgroundColor: "transparent",
      animation: false,
    },
    title: {
      text: title,
      style: { ...CHART_STYLES.text.primary, fontSize: "14px" },
    },
    xAxis: {
      ...COMMON_CHART_OPTIONS.xAxis,
      categories: days.map(formatDateLabel),
    },
    yAxis: {
      ...COMMON_CHART_OPTIONS.yAxis(yAxisTitle),
      min: 0,
    },
    plotOptions: {
      area: {
        animation: false,
        stacking: "normal",
        lineWidth: 1,
        lineColor: "transparent",
        marker: { enabled: false },
      },
    },
    series,
    legend: { ...COMMON_CHART_OPTIONS.legend, enabled: true },
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      shared: true,
    },
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};
```

### Comparison Bar Charts

**Use when:**
- Comparing two groups (A vs B)
- Side-by-side percentage comparisons
- Benchmark comparisons

```typescript
interface ComparisonBarChartProps {
  title: string;
  dataA: { category: string; count: number }[];
  dataB: { category: string; count: number }[];
  labelA: string;
  labelB: string;
  sortType?: "count" | "alphabetical";
}

export const ComparisonBarChart = ({
  title,
  dataA,
  dataB,
  labelA,
  labelB,
  sortType = "count",
}: ComparisonBarChartProps) => {
  const { labels, countsA, countsB, totalA, totalB } = buildComparisonData({ dataA, dataB, sortType });

  const percentagesA = countsA.map((count) => (totalA > 0 ? (count / totalA) * 100 : 0));
  const percentagesB = countsB.map((count) => (totalB > 0 ? (count / totalB) * 100 : 0));

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      height: Math.max(400, labels.length * 60),
      backgroundColor: "transparent",
      animation: false,
    },
    title: {
      text: title,
      style: { ...CHART_STYLES.text.primary, fontSize: "14px" },
    },
    xAxis: {
      categories: labels,
      labels: { style: CHART_STYLES.text.tertiary },
    },
    yAxis: {
      min: 0,
      title: { text: "Percentage (%)" },
      labels: { style: CHART_STYLES.text.tertiary },
    },
    plotOptions: {
      bar: {
        animation: false,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          format: "{y:.1f}%",
          style: CHART_STYLES.text.secondary,
        },
      },
    },
    series: [
      {
        name: labelA,
        type: "bar",
        color: COLORS.greenPrimary,
        data: percentagesA,
      },
      {
        name: labelB,
        type: "bar",
        color: COLORS.bluePrimary,
        data: percentagesB,
      },
    ],
    legend: { ...COMMON_CHART_OPTIONS.legend, enabled: true },
    tooltip: COMMON_CHART_OPTIONS.tooltip,
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};
```

### GitHub-Style Contribution Heatmap

**Use when:**
- Showing activity patterns over a year
- Visualizing daily activity intensity
- User engagement/streak tracking

**Key features:**
- 365-day grid (7 rows for days of week × 52 weeks)
- 4-5 intensity levels using opacity variants of greenSecondary
- Tooltip with date and count details
- Auto-scroll to current date

## Data Transformation Utilities

### Filtering Low-Percentage Outliers

```typescript
export function filterLowPercentage<T extends { count: number }>(
  data: T[],
  thresholdPercent: number = 1
): T[] {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const minCount = total * (thresholdPercent / 100);
  return data.filter((item) => item.count >= minCount);
}
```

### Label Formatting

```typescript
// Convert snake_case to Title Case
export const formatLabel = (str: string): string => {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format date for chart labels (e.g., "Dec 8")
export const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
```

### Building Comparison Data

```typescript
interface BuildComparisonDataInput {
  dataA: { category: string; count: number }[];
  dataB: { category: string; count: number }[];
  sortType?: "count" | "alphabetical";
}

export const buildComparisonData = ({
  dataA,
  dataB,
  sortType = "count",
}: BuildComparisonDataInput) => {
  const allCategories = new Set([
    ...dataA.map((d) => d.category),
    ...dataB.map((d) => d.category),
  ]);

  const mapA = new Map(dataA.map((d) => [d.category, d.count]));
  const mapB = new Map(dataB.map((d) => [d.category, d.count]));

  let labels = [...allCategories];
  
  if (sortType === "count") {
    labels.sort((a, b) => {
      const sumA = (mapA.get(a) || 0) + (mapB.get(a) || 0);
      const sumB = (mapA.get(b) || 0) + (mapB.get(b) || 0);
      return sumB - sumA;
    });
  } else {
    labels.sort();
  }

  const countsA = labels.map((cat) => mapA.get(cat) || 0);
  const countsB = labels.map((cat) => mapB.get(cat) || 0);
  const totalA = countsA.reduce((sum, c) => sum + c, 0);
  const totalB = countsB.reduce((sum, c) => sum + c, 0);

  return { labels: labels.map(formatLabel), countsA, countsB, totalA, totalB };
};
```

## Component Patterns

### Chart Card Pattern

```typescript
import { Card } from "@/components/ui/card";

<Card className="p-3 sm:p-6">
  <ChartComponent data={data} title="Chart Title" />
</Card>
```

### View Mode Toggle

```typescript
export type ViewMode = "graph" | "pie";

<div className="flex items-center rounded-md border">
  <button onClick={() => setViewMode("graph")} className={viewMode === "graph" ? "active" : ""}>
    Graph
  </button>
  <button onClick={() => setViewMode("pie")} className={viewMode === "pie" ? "active" : ""}>
    Pie
  </button>
</div>

{viewMode === "graph" ? <DailyChart data={data} /> : <PieChart data={data} />}
```

### Empty States

```typescript
if (!data || data.length === 0) {
  return (
    <Card className="p-3 sm:p-6">
      <EmptyState
        title="No Data Available"
        description="No data found for the selected date range."
      />
    </Card>
  );
}
```

## Common Pitfalls

1. **Don't disable animation in dev**: Animation is disabled for production performance. Consider enabling for dev debugging.

2. **Always use transparent backgrounds**: `backgroundColor: "transparent"` allows charts to inherit the card/page background.

3. **Limit categories in pie charts**: More than 7 categories makes pie charts hard to read. Use "Other" aggregation or switch to bar chart.

4. **Use semantic colors consistently**: Always use COMPLEXITY_COLORS for complexity data, etc.

5. **Handle timezone correctly**: Use date parsing that avoids timezone shifts when displaying dates.

6. **Filter outliers before charting**: Always apply `filterLowPercentage()` to LLM classification data.

## Files Reference

After installing this plugin, copy these files to your project:

- `templates/utils/chart-constants.ts` → `src/lib/chart-constants.ts`
- `templates/utils/data-utils.ts` → `src/lib/data-utils.ts`
- `templates/components/*.tsx` → `src/components/charts/`
