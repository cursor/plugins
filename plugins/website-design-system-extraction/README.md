# Website Design System Extraction

Extract design systems from any website and integrate design tokens into your codebase. This plugin enables you to replicate the visual style of existing websites by extracting colors, typography, spacing, shadows, borders, and more.

## Installation

```bash
cursor plugins install website-design-system-extraction
```

## Features

- **Comprehensive Extraction**: Extract colors, typography, spacing, shadows, borders, and transitions
- **Multiple Output Formats**: Generate CSS custom properties, Tailwind config, TypeScript tokens, SCSS variables, or JSON
- **Dark Mode Support**: Automatically capture light and dark mode variants
- **Framework Agnostic**: Works with any CSS framework or styling approach
- **Design System Agent**: Specialized agent for systematic design token extraction

## Quick Start

1. Install the plugin
2. Ask Cursor to extract a design system:

```
Extract the design system from linear.app and create CSS custom properties for my project
```

Or be more specific:

```
Extract the color palette and typography from stripe.com and add it to my Tailwind config
```

## Components

| Component | Description |
|:----------|:------------|
| **Skills** | `extract-design-system` - Main skill for extracting and integrating design tokens |
| **Agents** | `design-system-extractor` - Specialized agent for systematic extraction |
| **Rules** | `design-tokens` - Best practices for working with design tokens |

## Supported Output Formats

### CSS Custom Properties
Universal format that works with any project:
```css
:root {
  --color-primary: #5E6AD2;
  --color-bg-primary: #FFFFFF;
  --font-family-sans: 'Inter', sans-serif;
}
```

### Tailwind CSS
Extend your Tailwind configuration:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#5E6AD2',
      }
    }
  }
}
```

### TypeScript Tokens
Type-safe design tokens:
```typescript
export const colors = {
  primary: { DEFAULT: '#5E6AD2', hover: '#4E5BC2' }
} as const;
```

### SCSS Variables
For Sass/SCSS projects:
```scss
$color-primary: #5E6AD2;
$font-family-sans: 'Inter', sans-serif;
```

### JSON (Style Dictionary)
Compatible with design token tools:
```json
{
  "color": {
    "primary": { "value": "#5E6AD2", "type": "color" }
  }
}
```

## What Gets Extracted

| Category | Tokens |
|:---------|:-------|
| **Colors** | Primary, secondary, backgrounds, text, borders, status colors |
| **Typography** | Font families, sizes, weights, line heights, letter spacing |
| **Spacing** | Padding, margin, gap scales |
| **Borders** | Border widths, radius values |
| **Shadows** | Box shadows for cards, dropdowns, modals |
| **Transitions** | Durations, easing functions |

## Example Workflow

1. **Request extraction**:
   ```
   Extract the design system from notion.so
   ```

2. **The agent will**:
   - Visit the website using browser automation
   - Inspect elements with DevTools
   - Extract precise CSS values
   - Document both light and dark modes
   - Take reference screenshots

3. **Generate output**:
   - Auto-detect your project's styling approach
   - Create appropriately formatted token files
   - Provide usage documentation

## Popular Sites to Extract From

| Website | Style |
|:--------|:------|
| linear.app | Clean, minimal, purple accent |
| notion.so | Warm, readable, generous spacing |
| stripe.com | Gradients, depth, polished |
| vercel.com | Dark mode, high contrast |
| github.com | Familiar, functional |
| figma.com | Playful, colorful, rounded |
| raycast.com | Dark, macOS native feel |

## Tips

1. **Be specific**: Mention which tokens you need (colors only, typography, etc.)
2. **Specify format**: Tell the agent which output format you prefer
3. **Mention dark mode**: Request both light and dark mode extraction
4. **Existing system**: If you have an existing design system, mention where it lives

## Directory Structure

```
website-design-system-extraction/
├── .cursor/
│   └── plugin.json        # Plugin manifest
├── agents/
│   └── design-system-extractor.md
├── skills/
│   └── extract-design-system/
│       └── SKILL.md
├── rules/
│   └── design-tokens.mdc
├── hooks/
│   └── hooks.json
├── mcp.json
├── extensions/
├── LICENSE
├── CHANGELOG.md
└── README.md
```

## License

MIT
