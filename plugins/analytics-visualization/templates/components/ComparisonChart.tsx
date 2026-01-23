/**
 * Comparison Bar Chart Component
 * 
 * Use for side-by-side comparisons between two groups (A/B testing, benchmarks).
 */

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  COLORS,
  CHART_STYLES,
  COMMON_CHART_OPTIONS,
  formatLabel,
} from "@/lib/chart-constants";
import { buildComparisonData, type SortType } from "@/lib/data-utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ComparisonData {
  category: string;
  count: number;
}

export interface ComparisonChartProps {
  /** Title of the chart */
  title: string;
  /** Data for group A */
  dataA: ComparisonData[];
  /** Data for group B */
  dataB: ComparisonData[];
  /** Label for group A */
  labelA: string;
  /** Label for group B */
  labelB: string;
  /** How to sort the categories */
  sortType?: SortType;
  /** Whether to show as percentages (default) or raw counts */
  showAsPercentage?: boolean;
  /** Color for group A */
  colorA?: string;
  /** Color for group B */
  colorB?: string;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Pixels per category row */
  pixelsPerRow?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ComparisonBarChart = ({
  title,
  dataA,
  dataB,
  labelA,
  labelB,
  sortType = "count",
  showAsPercentage = true,
  colorA = COLORS.greenPrimary,
  colorB = COLORS.bluePrimary,
  minHeight = 400,
  pixelsPerRow = 60,
}: ComparisonChartProps) => {
  // Handle empty data
  if ((!dataA || dataA.length === 0) && (!dataB || dataB.length === 0)) {
    return (
      <div className="flex items-center justify-center h-[400px] text-[var(--color-theme-text-tertiary)]">
        No data available
      </div>
    );
  }

  // Build aligned comparison data
  const { labels, countsA, countsB, totalA, totalB } = buildComparisonData({
    dataA,
    dataB,
    sortType,
  });

  // Convert to percentages if needed
  const valuesA = showAsPercentage
    ? countsA.map((count) => (totalA > 0 ? (count / totalA) * 100 : 0))
    : countsA;

  const valuesB = showAsPercentage
    ? countsB.map((count) => (totalB > 0 ? (count / totalB) * 100 : 0))
    : countsB;

  // Calculate dynamic height
  const chartHeight = Math.max(minHeight, labels.length * pixelsPerRow);

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      height: chartHeight,
      backgroundColor: "transparent",
      animation: false,
    },
    title: COMMON_CHART_OPTIONS.title(title),
    xAxis: {
      categories: labels.map(formatLabel),
      labels: {
        style: CHART_STYLES.text.tertiary,
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: showAsPercentage ? "Percentage (%)" : "Count",
        style: CHART_STYLES.text.tertiary,
      },
      labels: {
        style: CHART_STYLES.text.tertiary,
        formatter: function () {
          return showAsPercentage ? `${this.value}%` : `${this.value}`;
        },
      },
    },
    plotOptions: {
      bar: {
        animation: false,
        borderWidth: 0,
        groupPadding: 0.1,
        pointPadding: 0.05,
        dataLabels: {
          enabled: true,
          style: {
            ...CHART_STYLES.text.secondary,
            fontSize: "10px",
          },
          formatter: function () {
            return showAsPercentage
              ? `${(this.y ?? 0).toFixed(1)}%`
              : `${this.y}`;
          },
        },
      },
    },
    series: [
      {
        name: labelA,
        type: "bar",
        color: colorA,
        data: valuesA,
      },
      {
        name: labelB,
        type: "bar",
        color: colorB,
        data: valuesB,
      },
    ],
    legend: {
      ...COMMON_CHART_OPTIONS.legend,
      enabled: true,
    },
    tooltip: {
      ...COMMON_CHART_OPTIONS.tooltip,
      shared: true,
      formatter: function () {
        const points = this.points || [];
        let html = `<b>${formatLabel(String(this.x))}</b><br/>`;

        points.forEach((point, index) => {
          const rawCount = index === 0 ? countsA[this.point.index] : countsB[this.point.index];
          const value = point.y ?? 0;

          html += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: `;
          if (showAsPercentage) {
            html += `<b>${value.toFixed(1)}%</b> (${rawCount} total)<br/>`;
          } else {
            html += `<b>${value}</b><br/>`;
          }
        });

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
import { ComparisonBarChart } from "@/components/charts/ComparisonChart";

// A/B test comparison
<ComparisonBarChart
  title="Feature Usage: Control vs Test"
  dataA={[
    { category: "feature_a", count: 150 },
    { category: "feature_b", count: 120 },
    { category: "feature_c", count: 80 },
  ]}
  dataB={[
    { category: "feature_a", count: 180 },
    { category: "feature_b", count: 100 },
    { category: "feature_c", count: 120 },
  ]}
  labelA="Control Group"
  labelB="Test Group"
/>

// Sort by difference (highlight biggest changes)
<ComparisonBarChart
  title="Before vs After"
  dataA={beforeData}
  dataB={afterData}
  labelA="Before"
  labelB="After"
  sortType="difference"
/>

// Show raw counts instead of percentages
<ComparisonBarChart
  title="Team Comparison"
  dataA={teamAData}
  dataB={teamBData}
  labelA="Team A"
  labelB="Team B"
  showAsPercentage={false}
/>

// Custom colors
<ComparisonBarChart
  title="Success vs Failure"
  dataA={successData}
  dataB={failureData}
  labelA="Success"
  labelB="Failure"
  colorA="#22c55e"
  colorB="#ef4444"
/>
*/

export default ComparisonBarChart;
