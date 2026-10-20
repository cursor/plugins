---
name: agentic-coding-workflow-expert
description: "Expert guide for AI-assisted coding workflows — agentic code generation, multi-agent code swarms, self-healing CI/CD, automated PR review, spec-to-code pipelines, codebase knowledge graphs, and human-in-the-loop approval gates / Panduan ahli untuk workflow pengkodean berbasis AI — generasi kode agentic, code swarm multi-agen, CI/CD self-healing, review PR otomatis, pipeline spec-to-code, knowledge graph codebase, dan gate persetujuan human-in-the-loop."
author: "Roedy Rustam"
version: "4.3.0"
---

# Agentic Coding Workflow Expert

## 1. Agentic Code Generation Patterns / Pola Generasi Kode Agentic

Implement autonomous code generation workflows.
Implementasikan workflow pembuatan kode otonom.

### Core Patterns / Pola Inti:
1. **Single-file vs Multi-file Generation:**
   - Single-file: Isolate scope, update specific modules.
   - Multi-file: Coordinate state across files, ensure API contract consistency.
2. **Context-Aware Completion:** Query codebase knowledge graph for semantic context before generating.
3. **Ghost Text / Inline Suggestion:** Provide real-time snippet integration paths.
4. **Plan → Implement → Verify → Refine:** Always loop through planning, writing, testing, and iterating.

### Code Example: Multi-file Generation Workflow

```typescript
// workflow-generator.ts
interface GenerationTask {
  plan: string;
  files: string[];
}

class AgenticGenerator {
  async execute(task: GenerationTask) {
    console.log(`[PLAN] Executing: ${task.plan}`);
    const generatedFiles = await this.generateFiles(task.files);
    
    for (const file of generatedFiles) {
      const isValid = await this.verify(file);
      if (!isValid) {
        await this.refine(file);
      }
    }
  }

  private async generateFiles(files: string[]) {
    // Generate code with multi-file context awareness
    return files.map(f => ({ name: f, content: "// generated code" }));
  }

  private async verify(file: any) {
    // Run linter and tests
    return true; 
  }

  private async refine(file: any) {
    // Apply fixes based on verification failures
  }
}
```

## 2. Multi-Agent Code Swarms / Swarm Kode Multi-Agen

Coordinate multiple specialized agents for complex engineering tasks.
Koordinasikan beberapa agen khusus untuk tugas rekayasa yang kompleks.

### Swarm Architecture:
- **Fan-out:** Dispatch tasks to Frontend Agent, Backend Agent, Test Agent, and Review Agent.
- **Shared Workspace:** Utilize branched git worktrees for isolated, parallel development.
- **Director Agent:** Resolve conflicts, validate coherence across boundaries, merge branches.

### Code Example: TypeScript Swarm Orchestration

```typescript
// swarm-orchestrator.ts
enum AgentRole {
  FRONTEND, BACKEND, TEST, REVIEW, DIRECTOR
}

class SwarmDirector {
  async orchestrate(featureSpec: string) {
    // Fan-out
    const feTask = this.dispatch(AgentRole.FRONTEND, featureSpec);
    const beTask = this.dispatch(AgentRole.BACKEND, featureSpec);
    
    await Promise.all([feTask, beTask]);
    
    // Testing and Review
    const testResults = await this.dispatch(AgentRole.TEST, "Run integration tests");
    const reviewStatus = await this.dispatch(AgentRole.REVIEW, "Review cross-boundary changes");
    
    if (reviewStatus.approved) {
      await this.mergeWorktrees();
    } else {
      await this.resolveConflicts();
    }
  }

  private async dispatch(role: AgentRole, context: string) {
    // Send task to specific agent queue
    return { approved: true };
  }

  private async mergeWorktrees() {}
  private async resolveConflicts() {}
}
```

## 3. Spec-to-Code Pipeline / Pipeline Spec-to-Code

Transform natural language specifications into tested implementation.
Ubah spesifikasi bahasa alami menjadi implementasi yang teruji.

### Pipeline Steps:
1. **PRD to Test Cases (TDD):** Extract acceptance criteria, generate unit/integration tests first.
2. **Implementation:** Write code to satisfy generated tests.
3. **Validation:** Run tests, enforce coverage thresholds.

### Code Example: Spec-to-Test-to-Code

```python
# spec_pipeline.py
def run_spec_to_code(prd_text: str):
    # 1. Extract and Generate Tests
    criteria = extract_acceptance_criteria(prd_text)
    tests = generate_tests_from_criteria(criteria)
    
    # 2. Implement
    implementation = generate_code_to_pass(tests)
    
    # 3. Validate
    result = run_tests(implementation, tests)
    if not result.passed:
        implementation = refine_code(implementation, result.errors)
        
    return implementation

def extract_acceptance_criteria(text): return []
def generate_tests_from_criteria(criteria): return []
def generate_code_to_pass(tests): return ""
def run_tests(code, tests): return type('Result', (), {'passed': True, 'errors': []})
def refine_code(code, errors): return code
```

## 4. Self-Healing CI/CD Pipelines / Pipeline CI/CD Self-Healing

Automate failure recovery in integration pipelines.
Otomatisasi pemulihan kegagalan dalam pipeline integrasi.

### Capabilities:
- **Detection:** Parse terminal output and stack traces from CI runners.
- **Root-Cause Analysis:** Pattern match common failure modes (e.g., missing dependencies, type errors).
- **Auto-Fix Generation:** Propose fixes with confidence scoring.
- **Rollback Safety:** Always create a fix branch; never push directly to `main`.

### Code Example: CI Failure Analyzer

```bash
#!/bin/bash
# ci-self-heal.sh

LOG_FILE="ci-output.log"
FAIL_PATTERN="ERR!"

if grep -q "$FAIL_PATTERN" "$LOG_FILE"; then
  echo "[CI] Failure detected. Triggering self-healing agent..."
  
  # Analyze logs and generate patch
  PATCH_FILE=$(agent-analyze-ci --log "$LOG_FILE")
  
  if [ -n "$PATCH_FILE" ]; then
    git checkout -b auto-fix-$(date +%s)
    git apply "$PATCH_FILE"
    git commit -m "chore(ci): auto-fix CI failure"
    git push origin HEAD
    echo "[CI] Fix pushed for review."
  else
    echo "[CI] Could not auto-fix. Escalating."
    exit 1
  fi
fi
```

## 5. Agentic Code Review / Review Kode Agentic

Perform deep, context-aware automated code reviews.
Lakukan review kode otomatis yang mendalam dan peka konteks.

### Review Dimensions:
- **Impact Analysis:** Summarize PRs and map cross-module impact.
- **Security:** Scan for CVEs, audit dependencies, flag unsafe patterns.
- **Performance:** Detect regressions in bundle size or runtime complexity (Big-O).
- **Style:** Enforce project-specific conventions.

### Code Example: Automated Review Checklist

```yaml
# review-rules.yml
rules:
  security:
    - detect_sql_injection
    - audit_package_json
  performance:
    - max_bundle_size_kb: 500
    - flag_nested_loops: true
  style:
    - enforce_strict_types
```

## 6. Codebase Knowledge Graph / Knowledge Graph Codebase

Build semantic graphs for contextual intelligence.
Bangun grafik semantik untuk kecerdasan kontekstual.

### Graph Components:
- **AST Parsing:** Extract nodes and relationships using tree-sitter.
- **Graph Topology:** Function call graphs, import trees, type hierarchies.
- **Semantic Search:** Embed codebase snippets for retrieval-augmented generation (RAG).
- **Incremental Updates:** Update graph only on changed files.

### Code Example: Building Graph with Tree-Sitter

```javascript
// graph-builder.js
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);

function buildASTGraph(sourceCode) {
  const tree = parser.parse(sourceCode);
  const graph = { nodes: [], edges: [] };
  
  // Traverse tree to extract function declarations and calls
  traverse(tree.rootNode, (node) => {
    if (node.type === 'function_declaration') {
      graph.nodes.push({ id: node.text, type: 'function' });
    }
    // Extract edges based on call expressions
  });
  
  return graph;
}

function traverse(node, callback) {
  callback(node);
  for (let i = 0; i < node.childCount; i++) {
    traverse(node.child(i), callback);
  }
}
```

## 7. Code Agent Memory & Learning / Memori & Pembelajaran Agen Kode

Persist context and learn from interactions.
Pertahankan konteks dan belajar dari interaksi.

### Memory Mechanics:
- **Per-Project Context:** Store conventions, architectural decisions, and patterns.
- **Correction Learning:** Log past mistakes and explicitly avoid them in future generation.
- **Session Persistence:** Utilize `session-memory-manager` to maintain state across agent runs.
- **Convention Extraction:** Automatically derive team style guidelines from existing codebase.

## 8. Human-in-the-Loop Code Gates / Gate Kode Human-in-the-Loop

Ensure safety with human oversight.
Pastikan keamanan dengan pengawasan manusia.

### Gate Mechanisms:
- **Confidence Threshold:** High confidence -> auto-apply. Low confidence -> request approval.
- **Diff Preview:** Present clear, annotated diffs with risk assessments.
- **Destructive Approvals:** Mandate human sign-off for DB migrations or breaking API changes.
- **Escalation:** Alert human developers when agent loop is stuck or oscillating.

## 9. Orchestration & Integration

Combine this skill with other vibes-plug modules for comprehensive workflows.
Gabungkan skill ini dengan modul vibes-plug lainnya untuk workflow yang komprehensif.

### Connected Skills:
- `multi-agent-orchestration`
- `autonomous-tdd-debugger`
- `coderabbit`
- `ci-cd-devops-architect`
- `scalability-clean-code`
- `session-memory-manager`
- `app-analyzer-optimizer`
- `brainstorming`
- `zero-to-prod-orchestrator`

## English
## Bahasa Indonesia


## Orchestration & Integration
- Connects to `zero-to-prod-orchestrator`
- Connects to `brainstorming`
