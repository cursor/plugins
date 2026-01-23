/**
 * GitHub-Style Contribution Heatmap Component
 * 
 * Use for showing activity patterns over a year (or custom period).
 * Displays a grid of daily activity with intensity coloring.
 */

import { useMemo, useRef, useEffect } from "react";
import { COLORS } from "@/lib/chart-constants";

// =============================================================================
// TYPES
// =============================================================================

export interface HeatmapData {
  date: string; // YYYY-MM-DD format
  count: number;
}

export interface HeatmapChartProps {
  /** Array of daily activity data */
  data: HeatmapData[];
  /** Title displayed above the heatmap */
  title?: string;
  /** Number of intensity levels (default: 5) */
  intensityLevels?: number;
  /** Base color for the heatmap */
  baseColor?: string;
  /** Show month labels */
  showMonthLabels?: boolean;
  /** Show day labels (S, M, T, W, T, F, S) */
  showDayLabels?: boolean;
  /** Cell size in pixels */
  cellSize?: number;
  /** Gap between cells in pixels */
  cellGap?: number;
  /** Auto-scroll to current date on mount */
  autoScrollToToday?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get intensity level (0-4) based on count and quartiles.
 */
function getIntensityLevel(count: number, maxCount: number, levels: number): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  
  const ratio = count / maxCount;
  const level = Math.ceil(ratio * (levels - 1));
  return Math.min(level, levels - 1);
}

/**
 * Generate color with opacity based on intensity level.
 */
function getIntensityColor(level: number, levels: number, baseColor: string): string {
  if (level === 0) return "var(--color-theme-bg-tertiary)";
  
  const opacity = 0.2 + (level / (levels - 1)) * 0.8;
  
  // Convert hex to RGB and apply opacity
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get the start of the week (Sunday) for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ContributionHeatmap = ({
  data,
  title = "Activity",
  intensityLevels = 5,
  baseColor = COLORS.greenSecondary,
  showMonthLabels = true,
  showDayLabels = true,
  cellSize = 12,
  cellGap = 3,
  autoScrollToToday = true,
}: HeatmapChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.count));
    return map;
  }, [data]);

  // Calculate max count for intensity scaling
  const maxCount = useMemo(() => {
    return Math.max(1, ...data.map((d) => d.count));
  }, [data]);

  // Generate the grid data (52 weeks × 7 days)
  const gridData = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    // Start from the beginning of the week one year ago
    const startDate = getWeekStart(oneYearAgo);
    const endDate = today;
    
    const weeks: { date: Date; count: number; level: number }[][] = [];
    let currentWeek: { date: Date; count: number; level: number }[] = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const count = dataMap.get(dateStr) || 0;
      const level = getIntensityLevel(count, maxCount, intensityLevels);
      
      currentWeek.push({
        date: new Date(current),
        count,
        level,
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [dataMap, maxCount, intensityLevels]);

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    gridData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: firstDayOfWeek.toLocaleDateString("en-US", { month: "short" }),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [gridData]);

  // Auto-scroll to today
  useEffect(() => {
    if (autoScrollToToday && containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [autoScrollToToday]);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const totalWidth = gridData.length * (cellSize + cellGap);
  const labelWidth = showDayLabels ? 20 : 0;

  return (
    <div className="space-y-2">
      {title && (
        <div
          className="text-sm font-medium"
          style={{ color: "var(--color-theme-text-primary)" }}
        >
          {title}
        </div>
      )}
      
      <div className="flex">
        {/* Day labels column */}
        {showDayLabels && (
          <div
            className="flex flex-col justify-between pr-2"
            style={{ height: 7 * (cellSize + cellGap) - cellGap }}
          >
            {dayLabels.map((label, i) => (
              <span
                key={i}
                className="text-xs leading-none"
                style={{
                  color: "var(--color-theme-text-tertiary)",
                  height: cellSize,
                  lineHeight: `${cellSize}px`,
                }}
              >
                {i % 2 === 1 ? label : ""}
              </span>
            ))}
          </div>
        )}

        {/* Scrollable grid container */}
        <div
          ref={containerRef}
          className="overflow-x-auto"
          style={{ maxWidth: "100%" }}
        >
          <div style={{ width: totalWidth }}>
            {/* Month labels */}
            {showMonthLabels && (
              <div
                className="relative mb-1"
                style={{ height: 16 }}
              >
                {monthLabels.map(({ label, weekIndex }, i) => (
                  <span
                    key={i}
                    className="absolute text-xs"
                    style={{
                      left: weekIndex * (cellSize + cellGap),
                      color: "var(--color-theme-text-tertiary)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Heatmap grid */}
            <div className="flex gap-[3px]">
              {gridData.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col gap-[3px]"
                >
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="rounded-sm cursor-pointer transition-transform hover:scale-110"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: getIntensityColor(
                          day.level,
                          intensityLevels,
                          baseColor
                        ),
                      }}
                      title={`${day.date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}: ${day.count} activities`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs">
        <span style={{ color: "var(--color-theme-text-tertiary)" }}>Less</span>
        {Array.from({ length: intensityLevels }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: cellSize - 2,
              height: cellSize - 2,
              backgroundColor: getIntensityColor(i, intensityLevels, baseColor),
            }}
          />
        ))}
        <span style={{ color: "var(--color-theme-text-tertiary)" }}>More</span>
      </div>
    </div>
  );
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
import { ContributionHeatmap } from "@/components/charts/HeatmapChart";

// Basic usage
<ContributionHeatmap
  data={[
    { date: "2024-12-01", count: 5 },
    { date: "2024-12-02", count: 12 },
    { date: "2024-12-03", count: 3 },
    // ... more daily data
  ]}
  title="Contribution Activity"
/>

// Custom color
<ContributionHeatmap
  data={activityData}
  title="User Engagement"
  baseColor="#3b82f6"
/>

// More intensity levels
<ContributionHeatmap
  data={data}
  intensityLevels={7}
  cellSize={10}
/>
*/

export default ContributionHeatmap;
