# Analytics Visualization Plugin

Build beautiful, consistent analytics charts and dashboards using Highcharts with a curated design system.

## Installation

```bash
agent install analytics-visualization
```

## Features

- **Curated Color Palette**: Nord-inspired colors optimized for data visualization
- **Semantic Color Mappings**: Pre-defined colors for complexity, severity, and categorical data
- **Chart Components**: Ready-to-use patterns for pie, bar, area, and heatmap charts
- **Shared Styling**: Consistent typography, tooltips, and legends across all charts
- **Data Utilities**: Filtering, formatting, and transformation helpers

## Quick Start

### 1. Install Dependencies

```bash
npm install highcharts highcharts-react-official
```

### 2. Copy Design System Constants

Copy the design system from `templates/utils/chart-constants.ts` to your project:

```typescript
import { COLORS, CHART_STYLES, COMMON_CHART_OPTIONS } from "@/lib/chart-constants";
```

### 3. Use Chart Components

Reference the chart templates in `templates/components/` or use the skill to generate custom charts.

## Color Palette

```
┌─────────────────────────────────────────────────────────────┐
│  GREEN        │  BLUE         │  CYAN         │  NEUTRAL    │
├───────────────┼───────────────┼───────────────┼─────────────┤
│  ■ #005C42    │  ■ #055180    │  ■ #1E5563    │  ■ fg var   │
│  ■ #1F8A65    │  ■ #3C7CAB    │  ■ #4C7F8C    │  ■ bg var   │
│  ■ #96C2AC    │               │  ■ #A2BBC2    │             │
├───────────────┴───────────────┴───────────────┴─────────────┤
│  YELLOW       │  ORANGE       │  MAGENTA                    │
├───────────────┼───────────────┼─────────────────────────────┤
│  ■ #A16900    │  ■ #A33900    │  ■ #89045E                  │
│               │  ■ #DB704B    │  ■ #D06BA6                  │
│               │  ■ #FCD4C7    │                             │
└───────────────┴───────────────┴─────────────────────────────┘
```

## Chart Types

| Chart Type | Best For | Template |
|:-----------|:---------|:---------|
| **Donut Pie** | Category distribution, composition | `PieChart.tsx` |
| **Horizontal Bar** | Rankings, long category labels | `BarChart.tsx` |
| **Stacked Area** | Time series with composition | `StackedAreaChart.tsx` |
| **Dual-Axis Column** | Volume + percentage over time | `DualAxisChart.tsx` |
| **Comparison Bar** | A/B testing, group comparisons | `ComparisonChart.tsx` |
| **Contribution Heatmap** | Activity patterns over time | `HeatmapChart.tsx` |

## Components

| Component | Description |
|:----------|:------------|
| **Rules** | Highcharts best practices and patterns |
| **Agents** | Chart builder agent for generating visualizations |
| **Skills** | Full analytics visualization skill guide |
| **Templates** | Ready-to-use React/TypeScript components |

## Directory Structure

```
analytics-visualization/
├── .cursor/
│   └── plugin.json           # Plugin manifest
├── rules/
│   ├── highcharts-patterns.mdc
│   └── chart-accessibility.mdc
├── agents/
│   └── chart-builder.md
├── skills/
│   └── analytics-visualization/
│       └── SKILL.md
├── templates/
│   ├── components/           # React chart components
│   │   ├── PieChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── StackedAreaChart.tsx
│   │   └── ...
│   └── utils/                # Shared utilities
│       ├── chart-constants.ts
│       └── data-utils.ts
├── hooks/
│   └── hooks.json
├── mcp.json
├── LICENSE
├── CHANGELOG.md
└── README.md
```

## Usage Examples

### Basic Pie Chart

```typescript
import { CategoryPieChart } from "@/components/charts/PieChart";

<CategoryPieChart
  data={[
    { category: "write_code", count: 450 },
    { category: "ask_question", count: 280 },
    { category: "plan", count: 170 },
  ]}
  title="User Intent Distribution"
/>
```

### Time Series Chart

```typescript
import { DailyCategoriesChart } from "@/components/charts/StackedAreaChart";

<DailyCategoriesChart
  data={dailyData}
  title="Daily Activity by Category"
  yAxisTitle="Conversations"
/>
```

### Comparison Chart

```typescript
import { ComparisonBarChart } from "@/components/charts/ComparisonChart";

<ComparisonBarChart
  dataA={controlGroup}
  dataB={testGroup}
  labelA="Control"
  labelB="Test"
  title="A/B Test Results"
/>
```

## Semantic Color Mappings

### Complexity (Low → High)

```typescript
COMPLEXITY_COLORS = {
  trivial: greenPrimary,     // ■ Easy
  simple: greenSecondary,    // ■ 
  moderate: yellowPrimary,   // ■ Medium
  complex: orangeSecondary,  // ■ 
  very_complex: orangePrimary // ■ Hard
}
```

### Intent Categories

```typescript
INTENT_COLORS = {
  Plan: bluePrimary,          // ■ Planning
  Ask: cyanPrimary,           // ■ Questions
  "Task Automation": yellowPrimary, // ■ Automation
  "Write Code": greenPrimary  // ■ Coding
}
```

## Best Practices

1. **Always use transparent backgrounds** - Charts inherit page/card backgrounds
2. **Limit pie chart categories** - 7 or fewer for readability
3. **Filter outliers** - Remove items under 1% for LLM classification data
4. **Use semantic colors** - Match colors to data meaning (complexity, severity)
5. **Handle empty states** - Always show meaningful empty state UI
6. **Disable animation in production** - Use `animation: false` for performance

## Related Skills

- `analytics-visualization` - Full chart building guide

## License

MIT
