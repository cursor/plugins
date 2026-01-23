# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-01-23

### Added
- Initial release of Website Design System Extraction plugin
- `extract-design-system` skill for extracting design tokens from websites
- `design-system-extractor` agent for systematic token extraction
- `design-tokens` rule for design token best practices
- Support for multiple output formats:
  - CSS Custom Properties
  - Tailwind CSS configuration
  - TypeScript design tokens
  - SCSS variables
  - JSON (Style Dictionary compatible)
- Dark mode extraction support
- Comprehensive documentation and examples
- MIT License

### Features
- Extracts colors, typography, spacing, borders, shadows, and transitions
- Auto-detects project styling approach
- Generates framework-appropriate token files
- Provides usage documentation with examples
