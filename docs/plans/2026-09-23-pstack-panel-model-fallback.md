# Pstack Panel Model Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Grok from pstack's default multi-agent panels and ensure unavailable panel models do not block the parent workflow.

**Architecture:** Keep the two configured default panel models, Opus and GPT-5.6 Sol. For Arena, retry unavailable candidates with an available configured model, then inherit the parent; if an independent cross-judge still cannot start, the parent completes synthesis and records the limitation. Interrogate uses the same retry chain.

**Tech Stack:** Markdown skill and setup guidance.

---

### Task 1: Update panel defaults

**Files:**
- Modify: `pstack/skills/setup-pstack/SKILL.md`
- Modify: `pstack/skills/arena/SKILL.md`
- Modify: `pstack/skills/architect/SKILL.md`
- Modify: `pstack/skills/interrogate/SKILL.md`

Remove Grok from the four setup panel lists, Arena runner and judge defaults, Architect runner defaults, and Interrogate reviewer table. Keep separate code and swarm model defaults unchanged.

### Task 2: Add model-spawn recovery guidance

For Arena candidate and cross-judge calls, retry an unavailable model with another available configured panel model; if none can be selected, omit the model to inherit the parent. If independent judge startup still fails, have the parent finish synthesis and record that no independent judge ran. Apply the same fallback chain in Interrogate so one invalid reviewer does not block the review.

### Task 3: Verify the written defaults and recovery paths

Inspect the diff and run a focused content check confirming no default panel contains Grok, non-panel Grok defaults remain intact, and all panel spawn paths describe a parent-inheriting final fallback.
