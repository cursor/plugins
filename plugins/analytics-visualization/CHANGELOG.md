# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-23

### Added

- Initial release of the Analytics Visualization plugin
- **Color Palette**: Nord-inspired color system with 14 colors optimized for data visualization
- **Semantic Colors**: Pre-defined mappings for complexity, guidance levels, intents, and status
- **Chart Components**:
  - `PieChart` - Donut-style pie charts for composition/distribution
  - `BarChart` - Horizontal bar charts for rankings and comparisons
  - `StackedAreaChart` - Time series with category breakdown
  - `ComparisonChart` - Side-by-side A/B comparison bars
  - `DualAxisChart` - Volume columns with percentage line overlay
  - `HeatmapChart` - GitHub-style contribution heatmap
- **Utility Functions**:
  - `filterLowPercentage` - Remove outliers from classification data
  - `buildComparisonData` - Align data for comparison charts
  - `formatLabel` - Convert snake_case to Title Case
  - `formatDateLabel` - Format dates for chart axes
- **Rules**:
  - `highcharts-patterns.mdc` - Best practices for Highcharts configuration
  - `chart-accessibility.mdc` - Accessibility guidelines for visualizations
- **Agent**:
  - `chart-builder` - Specialized agent for generating chart components
- **Skill**:
  - `analytics-visualization` - Comprehensive guide for building charts

### Documentation

- Complete README with quick start guide
- Inline documentation in all template files
- Usage examples in every component
