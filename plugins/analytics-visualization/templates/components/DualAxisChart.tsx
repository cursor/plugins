/**
 * Dual-Axis Column + Line Chart Component
 * 
 * Use for showing volume (bars) alongside a percentage/rate (line) over time.
 */

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  COLORS,
  CHART_STYLES,
  COMMON_CHART_OPTIONS,
  formatDateLabel,
} from "@/lib/chart-constants";

// =============================================================================
// TYPES
// =============================================================================

export interface DualAxisData {
  date: string;
  volume: number;
  rate: number;
}

export interface DualAxisChartProps {
  /** Array of data with date, volume, and rate */
  data: DualAxisData[];
  /** Chart title */
  title?: string;
  /** Label for volume bars */
  volumeLabel?: string;
  /** Label for rate line */
  rateLabel?: string;
  /** Y-axis title for volume (left axis) */
  volumeAxisTitle?: string;
  /** Y-axis title for rate (right axis) */
  rateAxisTitle?: string;
  /** Color for volume bars */
  volumeColor?: string;
  /** Color for rate line */
  rateColor?: string;
  /** Height of the chart */
  height?: number;
  /** Whether rate is a percentage (affects formatting) */
  rateIsPercentage?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DualAxisChart = ({
  data,
  title = "Volume and Rate Over Time",
  volumeLabel = "Volume",
  rateLabel = "Rate",
  volumeAxisTitle = "Volume",
  rateAxisTitle = "Rate (%)",
  volumeColor = COLORS.greenSecondary,
  rateColor = COLORS.bluePrimary,
  height = 400,
  rateIsPercentage = true,
}: DualAxisChartProps) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-[var(--color-theme-text-tertiary)]">
        No data available
      </div>
    );
  }

  // Sort by date
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const options: Highcharts.Options = {
    chart: {
      height,
      backgroundColor: "transparent",
      animation: false,
    },
    title: title ? COMMON_CHART_OPTIONS.title(title) : { text: undefined },
    xAxis: {
      ...COMMON_CHART_OPTIONS.xAxis,
      categories: sortedData.map((d) => formatDateLabel(d.date)),
    },
    yAxis: [
      {
        // Primary Y-axis (left) - Volume
        ...COMMON_CHART_OPTIONS.yAxis(volumeAxisTitle),
        min: 0,
      },
      {
        // Secondary Y-axis (right) - Rate
        title: {
          text: rateAxisTitle,
          style: {
            ...CHART_STYLES.text.tertiary,
            color: rateColor,
          },
        },
        labels: {
          style: CHART_STYLES.text.tertiary,
          formatter: function () {
            return rateIsPercentage ? `${this.value}%` : `${this.value}`;
          },
        },
        opposite: true,
        min: 0,
        max: rateIsPercentage ? 100 : undefined,
        gridLineWidth: 0,
      },
    ],
    plotOptions: {
      column: {
        animation: false,
        borderWidth: 0,
      },
      line: {
        animation: false,
        marker: {
          enabled: true,
          radius: 4,
        },
      },
    },
    series: [
      {
        name: volumeLabel,
        type: "column",
        yAxis: 0,
        data: sortedData.map((d) => d.volume),
        color: volumeColor,
      },
      {
        name: rateLabel,
        type: "line",
        yAxis: 1,
        data: sortedData.map((d) => d.rate),
        color: rateColor,
        lineWidth: 2,
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
        let html = `<b>${this.x}</b><br/>`;

        points.forEach((point) => {
          const isRate = point.series.name === rateLabel;
          const value = point.y ?? 0;
          const formatted = isRate && rateIsPercentage
            ? `${value.toFixed(1)}%`
            : value.toLocaleString();

          html += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${formatted}</b><br/>`;
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
import { DualAxisChart } from "@/components/charts/DualAxisChart";

// AI-assisted commits with acceptance rate
<DualAxisChart
  data={[
    { date: "2024-12-01", volume: 150, rate: 72.5 },
    { date: "2024-12-02", volume: 180, rate: 75.0 },
    { date: "2024-12-03", volume: 165, rate: 73.8 },
    // ...
  ]}
  title="AI-Assisted Commits"
  volumeLabel="Total Commits"
  rateLabel="AI Acceptance Rate"
  volumeAxisTitle="Commits"
  rateAxisTitle="Acceptance Rate (%)"
/>

// Sales volume and conversion rate
<DualAxisChart
  data={salesData}
  title="Sales Performance"
  volumeLabel="Orders"
  rateLabel="Conversion Rate"
  volumeColor="#22c55e"
  rateColor="#3b82f6"
/>

// Non-percentage rate (e.g., average)
<DualAxisChart
  data={data}
  title="Requests and Avg Response Time"
  volumeLabel="Requests"
  rateLabel="Avg Response Time (ms)"
  rateAxisTitle="Response Time (ms)"
  rateIsPercentage={false}
/>
*/

export default DualAxisChart;
