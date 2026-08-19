# Changelog

All notable changes to this plugin are documented here.

## Unreleased

## 1.1.0 - 2026-08-19

- Pinned the deterministic scanner to `agent-compatibility@0.1.7`.
- Added an executable scanner guard that validates the pinned version, scanned path, output shape, and Cloudflare Worker classification signals.
- Added a fail-closed result synthesizer as the sole owner of score validation, degraded states, and 70/30 arithmetic.
- Made the synthesizer reject missing evidence, mismatched targets, and stateful results without isolated execution provenance.
- Made startup and validation writable only inside isolated copies, with deploy, migration, credential, and paid-test boundaries.
- Added explicit target, budget, mutation, and evidence handoffs for every subagent.
- Changed specialist output to structured JSON with command outcomes and evidence.
- Added contract and fixture tests plus CI coverage for agent, skill, and helper-script changes.

## 1.0.0 - 2026-03-25

- Added the full compatibility pass with deterministic, startup, validation, and docs-reliability reviews.
- Added the 70/30 deterministic and workflow score model.
- Added marketplace metadata and usage documentation.
