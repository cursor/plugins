/**
 * Stacked Area Chart Component
 * 
 * Use for showing trends over time with composition breakdown.
 */

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  COLOR_ARRAY,
  CHART_STYLES,
  COMMON_CHART_OPTIONS,
  formatLabel,
  formatDateLabel,
} from "@/lib/chart-constants";

// =============================================================================
// TYPES
// =============================================================================

export interface DailyCategoryData {
  date: string;
  category: string;
  count: number;
}

export interface StackedAreaChartProps {
  /** Array of daily category data */
  data: DailyCategoryData[];
  /** Chart title */
  title?: string;
  /** Y-axis title */
  yAxisTitle?: string;
  /** Maximum number of categories to show (others aggregated) */
  maxCategories?: number;
  /** Height of the chart in pixels */
  height?: number;
  /** Custom color mapping for categories */
  colorMap?: Record<string, string>;
  /** Whether to show the legend */
  showLegend?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DailyCategoriesChart = ({
  data,
  title = "Daily Trend",
  yAxisTitle = "Count",
  maxCategories = 7,
  height = 350,
  colorMap,
  showLegend = true,
}: StackedAreaChartProps) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-[var(--color-theme-text-tertiary)]">
        No data available
      </div>
    );
  }

  // Get unique sorted dates
  const days = [...new Set(data.map((d) => d.date))].sort();

  // Get top categories by total count
  const categoryTotals = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.count;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCategories)
    .map(([cat]) => cat);

  // Build series for each category
  const series: Highcharts.SeriesOptionsType[] = topCategories.map(
    (category, index) => ({
      name: formatLabel(category),
      type: "area" as const,
      data: days.map(
        (day) =>
          data.find((d) => d.date === day && d.category === category)?.count || 0
      ),
      color: colorMap?.[category] ?? COLOR_ARRAY[index % COLOR_ARRAY.length],
    })
  );

  const options: Highcharts.Options = {
    chart: {
      type: "area",
      height,
      backgroundColor: "transparent",
      animation: false,
    },
    title: title ? COMMON_CHART_OPTIONS.title(title) : { text: undefined },
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
        fillOpacity: 0.8,
      },
    },
    series,
    legend: {
      ...COMMON_CHART_OPTIONS.legend,
      enabled: showLegend,
    },
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      shared: true,
      formatter: function () {
        const points = this.points || [];
        const total = points.reduce((sum, p) => sum + (p.y ?? 0), 0);

        let html = `<b>${this.x}</b><br/>`;
        points.forEach((point) => {
          const pct = total > 0 ? ((point.y ?? 0) / total) * 100 : 0;
          html += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}</b> (${pct.toFixed(1)}%)<br/>`;
        });
        html += `<b>Total: ${total}</b>`;

        return html;
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
import { DailyCategoriesChart } from "@/components/charts/StackedAreaChart";
import { filterDailyLowPercentage } from "@/lib/data-utils";

// Basic usage
<DailyCategoriesChart
  data={[
    { date: "2024-12-01", category: "write_code", count: 100 },
    { date: "2024-12-01", category: "ask", count: 50 },
    { date: "2024-12-02", category: "write_code", count: 120 },
    { date: "2024-12-02", category: "ask", count: 60 },
    // ...
  ]}
  title="Daily Activity by Category"
  yAxisTitle="Conversations"
/>

// With filtering (remove outliers)
const filteredData = filterDailyLowPercentage(rawData, 1);
<DailyCategoriesChart data={filteredData} />

// Limit categories
<DailyCategoriesChart
  data={data}
  maxCategories={5}
  showLegend={true}
/>
*/

export default DailyCategoriesChart;
