#!/bin/bash
# Validate chart files follow design system patterns
# This is a placeholder script - customize for your needs

echo "Validating chart components..."

# Check for hardcoded colors (should use COLORS from chart-constants)
if grep -r "color: \"#" --include="*.tsx" --include="*.ts" ./src/components/charts 2>/dev/null; then
  echo "Warning: Found hardcoded colors. Consider using COLORS from chart-constants.ts"
fi

# Check for animation: true (should be false in production)
if grep -r "animation: true" --include="*.tsx" --include="*.ts" ./src/components/charts 2>/dev/null; then
  echo "Warning: Found animation: true. Consider disabling animation for production."
fi

echo "Chart validation complete."
