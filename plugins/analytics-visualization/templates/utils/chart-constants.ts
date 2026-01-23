/**
 * Analytics Visualization Design System
 * 
 * Shared constants for Highcharts-based analytics visualizations.
 * Copy this file to your project (e.g., src/lib/chart-constants.ts)
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Nord-inspired color palette optimized for data visualization.
 * Use these colors for consistent styling across all charts.
 */
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
  
  // Theme-aware colors (use CSS variables for light/dark mode support)
  neutralPrimary: "var(--color-theme-fg)",
  neutralSecondary: "var(--color-theme-bg-card)",
} as const;

/**
 * Ordered color array for automatic color assignment in multi-series charts.
 * Colors are ordered for visual distinction when displayed adjacent to each other.
 */
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
] as const;

// =============================================================================
// SEMANTIC COLOR MAPPINGS
// =============================================================================

/**
 * Colors for complexity/difficulty levels.
 * Green (easy) → Yellow (medium) → Orange (hard)
 */
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

/**
 * Colors for guidance/specificity levels.
 * Similar to complexity: green (minimal) → orange (very high)
 */
export const GUIDANCE_LEVEL_COLORS: Record<string, string> = {
  minimal: COLORS.greenPrimary,
  low: COLORS.greenSecondary,
  moderate: COLORS.yellowPrimary,
  medium: COLORS.yellowPrimary,
  high: COLORS.orangeSecondary,
  very_high: COLORS.orangePrimary,
};

/**
 * Colors for intent categories.
 * Categorical data without inherent ordering.
 */
export const INTENT_COLORS: Record<string, string> = {
  Plan: COLORS.bluePrimary,
  Ask: COLORS.cyanPrimary,
  "Task Automation": COLORS.yellowPrimary,
  "Write Code": COLORS.greenPrimary,
};

/**
 * Colors for status indicators.
 */
export const STATUS_COLORS: Record<string, string> = {
  success: COLORS.greenPrimary,
  warning: COLORS.yellowPrimary,
  error: COLORS.orangePrimary,
  info: COLORS.bluePrimary,
  neutral: COLORS.cyanSecondary,
};

// =============================================================================
// CHART STYLING
// =============================================================================

/**
 * Shared text styles for chart labels, titles, and legends.
 * Uses CSS variables for theme support.
 */
export const CHART_STYLES = {
  text: {
    primary: {
      color: "var(--color-theme-text-primary)",
      fontWeight: "500" as const,
    },
    secondary: {
      color: "var(--color-theme-text-secondary)",
      fontWeight: "400" as const,
    },
    tertiary: {
      color: "var(--color-theme-text-tertiary)",
      fontWeight: "400" as const,
    },
  },
  fonts: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
} as const;

/**
 * Common Highcharts configuration options.
 * Spread these into your chart options for consistent styling.
 */
export const COMMON_CHART_OPTIONS = {
  /**
   * Generate title options with consistent styling.
   */
  title: (text: string) => ({
    text,
    style: {
      ...CHART_STYLES.text.primary,
      fontSize: "14px",
    },
  }),

  /**
   * X-axis configuration with proper label styling.
   */
  xAxis: {
    labels: {
      style: CHART_STYLES.text.tertiary,
    },
    lineColor: "var(--color-theme-border-secondary)",
    tickColor: "var(--color-theme-border-secondary)",
  },

  /**
   * Generate Y-axis options with title and label styling.
   */
  yAxis: (title: string) => ({
    title: {
      text: title,
      style: CHART_STYLES.text.tertiary,
    },
    labels: {
      style: CHART_STYLES.text.tertiary,
    },
    gridLineColor: "var(--color-theme-border-tertiary)",
  }),

  /**
   * Tooltip configuration with themed background and text.
   */
  tooltip: {
    backgroundColor: "var(--color-theme-bg-popover)",
    borderColor: "var(--color-theme-border-secondary)",
    borderRadius: 8,
    style: {
      ...CHART_STYLES.text.secondary,
      fontSize: "12px",
    },
  },

  /**
   * Legend configuration with consistent item styling.
   */
  legend: {
    itemStyle: {
      ...CHART_STYLES.text.secondary,
      fontSize: "12px",
    },
    itemHoverStyle: {
      color: "var(--color-theme-text-primary)",
    },
  },

  /**
   * Always disable Highcharts branding credits.
   */
  credits: {
    enabled: false,
  },

  /**
   * Default plot options with animation disabled.
   */
  plotOptions: {
    series: {
      animation: false,
    },
    column: {
      borderWidth: 0,
    },
    bar: {
      borderWidth: 0,
    },
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert snake_case or kebab-case to Title Case.
 * @example formatLabel("write_code") → "Write Code"
 */
export const formatLabel = (str: string): string => {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Format a date string for chart axis labels.
 * @example formatDateLabel("2024-12-08") → "Dec 8"
 */
export const formatDateLabel = (dateStr: string): string => {
  // Parse as local date to avoid timezone issues
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Format a date string for tooltip display (more detailed).
 * @example formatDateTooltip("2024-12-08") → "December 8, 2024"
 */
export const formatDateTooltip = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Get a color for a category, with fallback to the color array.
 */
export const getCategoryColor = (
  category: string,
  colorMap: Record<string, string>,
  index: number
): string => {
  return colorMap[category] || COLOR_ARRAY[index % COLOR_ARRAY.length];
};
