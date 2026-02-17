---
name: parallel-worktrees
description: Set up parallel coding sessions using git worktrees for zero dead time. Use when blocked on tests, builds, or wanting to try multiple approaches.
---

# Parallel Worktrees

Set up parallel sessions using git worktrees. Zero dead time.

## Trigger

Use when waiting on tests, long builds, or exploring multiple approaches simultaneously.

## Workflow

1. Show current worktrees: `git worktree list`
2. Create worktree for the task:
   - Feature: `git worktree add ../project-feat feature-branch`
   - Bugfix: `git worktree add ../project-fix bugfix-branch`
   - Exploration: `git worktree add ../project-exp -b experiment`
3. Each worktree runs its own session independently.
4. When done: `git worktree remove ../project-feat`

## When to Use

| Scenario | Action |
|----------|--------|
| Tests running | Start feature in worktree |
| Long build | Debug in parallel |
| Exploring approaches | Compare 2-3 simultaneously |
