# Extract Design System from Website

Extract a design system from any website and integrate it into your codebase. This skill enables you to replicate the visual style of existing websites by extracting design tokens (colors, typography, spacing, shadows, borders, etc.).

## When to Use

Use this skill when:
- The user wants to replicate the visual style of a specific website
- You need to extract design tokens from an existing site
- Creating a new application with a design system inspired by another product
- Migrating or unifying styling to match a reference design
- Building UI components that need to match an external design language

## Prerequisites

- Access to the `computerUse` subagent for visiting websites
- The target website must be publicly accessible

## Workflow

### Step 1: Analyze the Target Website

Use the `computerUse` subagent to visit the target website and systematically extract design information.

**Prompt template for computerUse:**
```
Visit {website_url} and extract the design system. I need you to:

1. **Colors**: 
   - Open DevTools (F12 or Cmd+Option+I)
   - Navigate through the site and identify:
     - Primary/secondary brand colors
     - Background colors (light/dark variants)
     - Text colors (primary, secondary, muted, disabled)
     - Border/stroke colors
     - Status colors (success, warning, error, info)
     - Accent/highlight colors
   - Take screenshots of key UI elements showing the color palette

2. **Typography**:
   - Identify font families used (headings, body, code)
   - Extract font sizes (h1-h6, body text, small text, captions)
   - Note font weights used
   - Line heights
   - Letter spacing if notable

3. **Spacing**:
   - Common padding/margin values
   - Gap sizes in layouts
   - Container widths/max-widths

4. **Borders & Radius**:
   - Border widths
   - Border radius values (buttons, cards, inputs, modals)

5. **Shadows**:
   - Box shadows used on cards, dropdowns, modals
   - Text shadows if any

6. **Transitions/Animations**:
   - Common transition durations
   - Easing functions used

Take screenshots of:
- The main homepage
- A page with forms/inputs
- Any modals or dropdowns
- Navigation elements
- Cards or list items

Use DevTools to inspect specific elements and note their CSS values.
```

### Step 2: Document Extracted Values

After the computerUse subagent returns with the extracted information, organize it into a structured format:

```typescript
// Example extracted design system structure
const extractedDesignSystem = {
  name: "source-website-name",
  
  colors: {
    // Brand
    primary: "#5E6AD2",
    primaryHover: "#4E5BC2",
    
    // Backgrounds
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F9FAFB",
    bgTertiary: "#F3F4F6",
    bgInverse: "#111827",
    
    // Text
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    textDisabled: "#D1D5DB",
    textInverse: "#FFFFFF",
    
    // Borders
    borderPrimary: "#E5E7EB",
    borderSecondary: "#D1D5DB",
    borderFocus: "#5E6AD2",
    
    // Status
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: "12px",
      sm: "13px",
      base: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
  },
  
  radius: {
    none: "0",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    full: "9999px",
  },
  
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  
  transitions: {
    duration: {
      fast: "100ms",
      normal: "150ms",
      slow: "300ms",
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
};
```

### Step 3: Detect Project Type and Choose Integration Approach

Analyze the codebase to determine the best integration approach. Check for these patterns:

#### Detection Checklist

1. **Check for Tailwind CSS**:
   ```bash
   # Look for tailwind config files
   find . -name "tailwind.config.*" -type f
   ```

2. **Check for CSS-in-JS libraries**:
   ```bash
   # Look for styled-components, emotion, etc.
   grep -r "styled-components\|@emotion\|@stitches" package.json
   ```

3. **Check for CSS Modules**:
   ```bash
   # Look for .module.css or .module.scss files
   find . -name "*.module.css" -o -name "*.module.scss" | head -5
   ```

4. **Check for SCSS/Sass**:
   ```bash
   # Look for existing SCSS variables files
   find . -name "_variables.scss" -o -name "_tokens.scss" | head -5
   ```

5. **Check for existing design token systems**:
   ```bash
   # Look for design token files
   find . -name "*tokens*" -o -name "*theme*" | grep -E "\.(ts|js|json|css|scss)$" | head -10
   ```

### Step 4: Generate Design System Files

Based on the detected project type, generate the appropriate files.

---

#### Option A: CSS Custom Properties (Universal - Works Everywhere)

Create a CSS file with custom properties that can be imported into any project:

```css
/* design-tokens.css */
:root {
  /* ===== Colors ===== */
  
  /* Brand */
  --color-primary: #5E6AD2;
  --color-primary-hover: #4E5BC2;
  --color-primary-active: #3E4BB2;
  
  /* Backgrounds */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F9FAFB;
  --color-bg-tertiary: #F3F4F6;
  --color-bg-inverse: #111827;
  --color-bg-hover: #F3F4F6;
  --color-bg-active: #E5E7EB;
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-text-disabled: #D1D5DB;
  --color-text-inverse: #FFFFFF;
  
  /* Borders */
  --color-border-primary: #E5E7EB;
  --color-border-secondary: #D1D5DB;
  --color-border-focus: #5E6AD2;
  
  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  
  /* ===== Typography ===== */
  
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.8125rem;  /* 13px */
  --font-size-base: 0.875rem; /* 14px */
  --font-size-lg: 1rem;       /* 16px */
  --font-size-xl: 1.125rem;   /* 18px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* ===== Spacing ===== */
  
  --space-0: 0;
  --space-px: 1px;
  --space-0-5: 0.125rem; /* 2px */
  --space-1: 0.25rem;    /* 4px */
  --space-1-5: 0.375rem; /* 6px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  
  /* ===== Border Radius ===== */
  
  --radius-none: 0;
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;
  
  /* ===== Shadows ===== */
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  /* ===== Transitions ===== */
  
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 300ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #111827;
    --color-bg-secondary: #1F2937;
    --color-bg-tertiary: #374151;
    --color-bg-hover: #1F2937;
    --color-bg-active: #374151;
    
    --color-text-primary: #F9FAFB;
    --color-text-secondary: #D1D5DB;
    --color-text-muted: #9CA3AF;
    --color-text-disabled: #6B7280;
    
    --color-border-primary: #374151;
    --color-border-secondary: #4B5563;
  }
}

/* Manual dark mode class alternative */
.dark {
  --color-bg-primary: #111827;
  --color-bg-secondary: #1F2937;
  --color-bg-tertiary: #374151;
  --color-bg-hover: #1F2937;
  --color-bg-active: #374151;
  
  --color-text-primary: #F9FAFB;
  --color-text-secondary: #D1D5DB;
  --color-text-muted: #9CA3AF;
  --color-text-disabled: #6B7280;
  
  --color-border-primary: #374151;
  --color-border-secondary: #4B5563;
}
```

---

#### Option B: Tailwind CSS Configuration

Extend the Tailwind config with extracted values:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5E6AD2',
          hover: '#4E5BC2',
          active: '#3E4BB2',
        },
        background: {
          primary: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
          inverse: '#111827',
        },
        foreground: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          disabled: '#D1D5DB',
          inverse: '#FFFFFF',
        },
        border: {
          primary: '#E5E7EB',
          secondary: '#D1D5DB',
          focus: '#5E6AD2',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.75rem' }],
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '150ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

#### Option C: TypeScript Design Tokens

Create a TypeScript module for type-safe design tokens:

```typescript
// design-tokens.ts

export const colors = {
  primary: {
    DEFAULT: '#5E6AD2',
    hover: '#4E5BC2',
    active: '#3E4BB2',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    inverse: '#111827',
    hover: '#F3F4F6',
    active: '#E5E7EB',
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    disabled: '#D1D5DB',
    inverse: '#FFFFFF',
  },
  border: {
    primary: '#E5E7EB',
    secondary: '#D1D5DB',
    focus: '#5E6AD2',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

export const radius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const transitions = {
  duration: {
    fast: '100ms',
    normal: '150ms',
    slow: '300ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Export combined tokens
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
} as const;

export type DesignTokens = typeof tokens;
```

---

#### Option D: SCSS Variables

Create SCSS variables for projects using Sass:

```scss
// _design-tokens.scss

// ===== Colors =====

// Brand
$color-primary: #5E6AD2;
$color-primary-hover: #4E5BC2;
$color-primary-active: #3E4BB2;

// Backgrounds
$color-bg-primary: #FFFFFF;
$color-bg-secondary: #F9FAFB;
$color-bg-tertiary: #F3F4F6;
$color-bg-inverse: #111827;
$color-bg-hover: #F3F4F6;
$color-bg-active: #E5E7EB;

// Text
$color-text-primary: #111827;
$color-text-secondary: #6B7280;
$color-text-muted: #9CA3AF;
$color-text-disabled: #D1D5DB;
$color-text-inverse: #FFFFFF;

// Borders
$color-border-primary: #E5E7EB;
$color-border-secondary: #D1D5DB;
$color-border-focus: #5E6AD2;

// Status
$color-success: #10B981;
$color-warning: #F59E0B;
$color-error: #EF4444;
$color-info: #3B82F6;

// ===== Typography =====

$font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

$font-size-xs: 0.75rem;
$font-size-sm: 0.8125rem;
$font-size-base: 0.875rem;
$font-size-lg: 1rem;
$font-size-xl: 1.125rem;
$font-size-2xl: 1.5rem;
$font-size-3xl: 1.875rem;
$font-size-4xl: 2.25rem;

$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

$line-height-tight: 1.25;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;

// ===== Spacing =====

$space-0: 0;
$space-px: 1px;
$space-0-5: 0.125rem;
$space-1: 0.25rem;
$space-1-5: 0.375rem;
$space-2: 0.5rem;
$space-3: 0.75rem;
$space-4: 1rem;
$space-5: 1.25rem;
$space-6: 1.5rem;
$space-8: 2rem;
$space-10: 2.5rem;
$space-12: 3rem;
$space-16: 4rem;

// ===== Border Radius =====

$radius-none: 0;
$radius-sm: 0.25rem;
$radius-md: 0.375rem;
$radius-lg: 0.5rem;
$radius-xl: 0.75rem;
$radius-2xl: 1rem;
$radius-full: 9999px;

// ===== Shadows =====

$shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
$shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
$shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
$shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

// ===== Transitions =====

$duration-fast: 100ms;
$duration-normal: 150ms;
$duration-slow: 300ms;
$easing-default: cubic-bezier(0.4, 0, 0.2, 1);
$easing-in: cubic-bezier(0.4, 0, 1, 1);
$easing-out: cubic-bezier(0, 0, 0.2, 1);
$easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);

// ===== Maps for programmatic access =====

$colors: (
  'primary': $color-primary,
  'primary-hover': $color-primary-hover,
  'bg-primary': $color-bg-primary,
  'bg-secondary': $color-bg-secondary,
  'text-primary': $color-text-primary,
  'text-secondary': $color-text-secondary,
  'border-primary': $color-border-primary,
  'success': $color-success,
  'warning': $color-warning,
  'error': $color-error,
  'info': $color-info,
);

$spacing: (
  '0': $space-0,
  '1': $space-1,
  '2': $space-2,
  '3': $space-3,
  '4': $space-4,
  '6': $space-6,
  '8': $space-8,
);
```

---

#### Option E: JSON Design Tokens (Style Dictionary Compatible)

Create JSON tokens compatible with tools like Style Dictionary:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "extracted-design-system",
  "version": "1.0.0",
  "source": "https://example.com",
  "tokens": {
    "color": {
      "primary": {
        "value": "#5E6AD2",
        "type": "color",
        "description": "Primary brand color"
      },
      "primary-hover": {
        "value": "#4E5BC2",
        "type": "color"
      },
      "background": {
        "primary": { "value": "#FFFFFF", "type": "color" },
        "secondary": { "value": "#F9FAFB", "type": "color" },
        "tertiary": { "value": "#F3F4F6", "type": "color" },
        "inverse": { "value": "#111827", "type": "color" }
      },
      "text": {
        "primary": { "value": "#111827", "type": "color" },
        "secondary": { "value": "#6B7280", "type": "color" },
        "muted": { "value": "#9CA3AF", "type": "color" },
        "disabled": { "value": "#D1D5DB", "type": "color" }
      },
      "border": {
        "primary": { "value": "#E5E7EB", "type": "color" },
        "secondary": { "value": "#D1D5DB", "type": "color" },
        "focus": { "value": "#5E6AD2", "type": "color" }
      },
      "status": {
        "success": { "value": "#10B981", "type": "color" },
        "warning": { "value": "#F59E0B", "type": "color" },
        "error": { "value": "#EF4444", "type": "color" },
        "info": { "value": "#3B82F6", "type": "color" }
      }
    },
    "typography": {
      "font-family": {
        "sans": { "value": "'Inter', -apple-system, sans-serif", "type": "fontFamily" },
        "mono": { "value": "'JetBrains Mono', monospace", "type": "fontFamily" }
      },
      "font-size": {
        "xs": { "value": "0.75rem", "type": "dimension" },
        "sm": { "value": "0.8125rem", "type": "dimension" },
        "base": { "value": "0.875rem", "type": "dimension" },
        "lg": { "value": "1rem", "type": "dimension" },
        "xl": { "value": "1.125rem", "type": "dimension" },
        "2xl": { "value": "1.5rem", "type": "dimension" },
        "3xl": { "value": "1.875rem", "type": "dimension" },
        "4xl": { "value": "2.25rem", "type": "dimension" }
      },
      "font-weight": {
        "normal": { "value": "400", "type": "fontWeight" },
        "medium": { "value": "500", "type": "fontWeight" },
        "semibold": { "value": "600", "type": "fontWeight" },
        "bold": { "value": "700", "type": "fontWeight" }
      }
    },
    "spacing": {
      "1": { "value": "0.25rem", "type": "dimension" },
      "2": { "value": "0.5rem", "type": "dimension" },
      "3": { "value": "0.75rem", "type": "dimension" },
      "4": { "value": "1rem", "type": "dimension" },
      "6": { "value": "1.5rem", "type": "dimension" },
      "8": { "value": "2rem", "type": "dimension" }
    },
    "radius": {
      "sm": { "value": "0.25rem", "type": "dimension" },
      "md": { "value": "0.375rem", "type": "dimension" },
      "lg": { "value": "0.5rem", "type": "dimension" },
      "xl": { "value": "0.75rem", "type": "dimension" }
    },
    "shadow": {
      "sm": { "value": "0 1px 2px 0 rgb(0 0 0 / 0.05)", "type": "shadow" },
      "md": { "value": "0 4px 6px -1px rgb(0 0 0 / 0.1)", "type": "shadow" },
      "lg": { "value": "0 10px 15px -3px rgb(0 0 0 / 0.1)", "type": "shadow" }
    }
  }
}
```

### Step 5: Create Usage Documentation

Generate inline documentation showing how to use the extracted design system:

```markdown
# {Design Name} Design System

Extracted from: {website_url}
Date: {extraction_date}

## Quick Start

### CSS Custom Properties

Import the CSS file and use variables:

\`\`\`css
@import 'design-tokens.css';

.button {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  transition: background-color var(--duration-fast) var(--easing-default);
}

.button:hover {
  background-color: var(--color-primary-hover);
}
\`\`\`

### Tailwind CSS

Use the extended classes:

\`\`\`jsx
<button className="bg-primary text-foreground-inverse px-4 py-2 rounded-md font-sans text-base hover:bg-primary-hover transition-colors duration-fast">
  Click me
</button>
\`\`\`

### TypeScript

Import tokens directly:

\`\`\`typescript
import { colors, typography, spacing } from './design-tokens';

const buttonStyles = {
  backgroundColor: colors.primary.DEFAULT,
  color: colors.text.inverse,
  padding: \`\${spacing[2]} \${spacing[4]}\`,
  fontFamily: typography.fontFamily.sans,
};
\`\`\`
```

### Step 6: Test the Integration

1. **Build verification** - Ensure no compilation errors
2. **Visual verification** - Use computerUse to create a test component and verify it matches the source website
3. **Cross-check colors** - Compare extracted colors side-by-side with the source

## Tips for Better Extraction

1. **Check for CSS custom properties**: Many modern sites define their design tokens as CSS variables. Look in DevTools under `:root` or `body` element styles.

2. **Look for design system documentation**: Some sites publish their design systems (e.g., Primer for GitHub, Polaris for Shopify).

3. **Inspect multiple pages**: Colors and styles may vary across different sections.

4. **Note both light and dark modes**: If the site supports both, extract values for each.

5. **Check font loading**: Look at the Network tab to identify web fonts being loaded.

6. **Consider accessibility**: Note contrast ratios and ensure extracted colors meet WCAG guidelines.

## Common Design Systems to Extract

| Website | Known For |
|---------|-----------|
| linear.app | Clean, minimal, purple accent, compact |
| notion.so | Warm, readable, generous spacing |
| stripe.com | Gradients, depth, polished |
| vercel.com | Dark mode, high contrast, modern |
| tailwindcss.com | Documentation clarity, accessible |
| github.com | Familiar, functional, dark/light themes |
| figma.com | Playful, colorful, rounded |
| raycast.com | Dark, keyboard-focused, macOS native feel |
