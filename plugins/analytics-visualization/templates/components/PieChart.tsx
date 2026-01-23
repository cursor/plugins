/**
 * Donut Pie Chart Component
 * 
 * Use for showing composition/distribution of a whole.
 * Best with 2-7 categories.
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

export interface PieChartData {
  category: string;
  count: number;
}

export interface PieChartProps {
  /** Array of category and count data */
  data: PieChartData[];
  /** Chart title displayed above the chart */
  title?: string;
  /** Height of the chart in pixels */
  height?: number;
  /** Custom color mapping for categories (optional) */
  colorMap?: Record<string, string>;
  /** Whether to show data labels */
  showLabels?: boolean;
  /** Inner size for donut effect (e.g., "50%") */
  innerSize?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CategoryPieChart = ({
  data,
  title = "Distribution",
  height = 300,
  colorMap,
  showLabels = true,
  innerSize = "50%",
}: PieChartProps) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--color-theme-text-tertiary)]">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Prepare chart data with colors and percentages
  const chartData = data
    .map((item, index) => ({
      name: formatLabel(item.category),
      y: item.count,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0",
      color: colorMap?.[item.category] ?? COLOR_ARRAY[index % COLOR_ARRAY.length],
    }))
    .sort((a, b) => b.y - a.y);

  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      height,
      backgroundColor: "transparent",
      animation: false,
    },
    title: { text: undefined },
    plotOptions: {
      pie: {
        animation: false,
        innerSize,
        allowPointSelect: true,
        cursor: "pointer",
        borderWidth: 2,
        borderColor: "var(--color-theme-bg)",
        dataLabels: {
          enabled: showLabels,
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
    series: [
      {
        name: "Count",
        type: "pie",
        data: chartData,
      },
    ],
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      pointFormat: "{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>",
    },
    credits: COMMON_CHART_OPTIONS.credits,
  };

  return (
    <div>
      {title && (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span
            className="text-base font-medium"
            style={{ color: "var(--color-theme-text-primary)" }}
          >
            {title}
          </span>
        </div>
      )}
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
import { CategoryPieChart } from "@/components/charts/PieChart";
import { INTENT_COLORS } from "@/lib/chart-constants";

// Basic usage
<CategoryPieChart
  data={[
    { category: "write_code", count: 450 },
    { category: "ask_question", count: 280 },
    { category: "plan", count: 170 },
    { category: "automation", count: 100 },
  ]}
  title="User Intent Distribution"
/>

// With semantic colors
<CategoryPieChart
  data={intentData}
  title="Intent Distribution"
  colorMap={INTENT_COLORS}
/>
*/

export default CategoryPieChart;
