/**
 * Horizontal Bar Chart Component
 * 
 * Use for comparing discrete categories, rankings, or data with long labels.
 */

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  COLOR_ARRAY,
  CHART_STYLES,
  COMMON_CHART_OPTIONS,
  formatLabel,
} from "@/lib/chart-constants";

// =============================================================================
// TYPES
// =============================================================================

export interface BarChartData {
  category: string;
  count: number;
}

export interface BarChartProps {
  /** Array of category and count data */
  data: BarChartData[];
  /** Chart title */
  title?: string;
  /** Label for the data series */
  seriesName?: string;
  /** Maximum number of categories to display */
  maxCategories?: number;
  /** Whether to show percentage labels */
  showPercentages?: boolean;
  /** Custom color mapping for categories */
  colorMap?: Record<string, string>;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Pixels per bar for dynamic height calculation */
  pixelsPerBar?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CategoriesBarChart = ({
  data,
  title,
  seriesName = "Count",
  maxCategories = 12,
  showPercentages = true,
  colorMap,
  minHeight = 300,
  pixelsPerBar = 28,
}: BarChartProps) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--color-theme-text-tertiary)]">
        No data available
      </div>
    );
  }

  // Sort by count and limit to max categories
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCategories);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Calculate dynamic height based on number of bars
  const chartHeight = Math.max(minHeight, sortedData.length * pixelsPerBar);

  // Prepare colors
  const colors = sortedData.map((item, index) =>
    colorMap?.[item.category] ?? COLOR_ARRAY[index % COLOR_ARRAY.length]
  );

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      height: chartHeight,
      backgroundColor: "transparent",
      animation: false,
    },
    title: title ? COMMON_CHART_OPTIONS.title(title) : { text: undefined },
    xAxis: {
      categories: sortedData.map((d) => formatLabel(d.category)),
      labels: {
        style: CHART_STYLES.text.tertiary,
      },
    },
    yAxis: {
      ...COMMON_CHART_OPTIONS.yAxis(seriesName),
      min: 0,
      title: { text: undefined },
    },
    plotOptions: {
      bar: {
        animation: false,
        borderWidth: 0,
        dataLabels: {
          enabled: showPercentages,
          style: CHART_STYLES.text.secondary,
          formatter: function () {
            const pct = total > 0 ? ((this.y ?? 0) / total) * 100 : 0;
            return `${pct.toFixed(1)}%`;
          },
        },
        colorByPoint: true,
        colors,
      },
    },
    series: [
      {
        name: seriesName,
        type: "bar",
        data: sortedData.map((d) => d.count),
      },
    ],
    legend: { enabled: false },
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      formatter: function () {
        const pct = total > 0 ? ((this.y ?? 0) / total) * 100 : 0;
        return `<b>${this.x}</b><br/>${seriesName}: <b>${this.y}</b> (${pct.toFixed(1)}%)`;
      },
    },
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
import { CategoriesBarChart } from "@/components/charts/BarChart";
import { COMPLEXITY_COLORS } from "@/lib/chart-constants";

// Basic usage
<CategoriesBarChart
  data={[
    { category: "feature_request", count: 150 },
    { category: "bug_fix", count: 120 },
    { category: "documentation", count: 80 },
    { category: "refactoring", count: 50 },
  ]}
  title="Task Types"
  seriesName="Tasks"
/>

// With semantic colors
<CategoriesBarChart
  data={complexityData}
  title="Task Complexity"
  colorMap={COMPLEXITY_COLORS}
/>

// Without percentages
<CategoriesBarChart
  data={data}
  showPercentages={false}
  maxCategories={5}
/>
*/

export default CategoriesBarChart;
