# Template Reference

Cortivex ships 15 pipeline templates. Each is a tested, ready-to-run YAML configuration that defines a directed acyclic graph (DAG) of specialized AI agent nodes. Templates cover common software engineering workflows from PR review to release preparation.

---

## Template Catalog

| Template | Description | Nodes | Est. Cost | Est. Duration |
|----------|-------------|-------|-----------|---------------|
| `pr-review` | Security scan, code review, auto-fix, test, PR update | 5 | $0.05 | ~3m |
| `security-audit` | Deep vulnerability scan, bug hunt, security report | 3 | $0.06 | ~4m |
| `full-test-suite` | Architecture analysis, unit tests, E2E tests, validation | 4 | $0.08 | ~5m |
| `js-to-typescript` | Analyze, migrate JS to TS, lint fix, test | 4 | $0.12 | ~8m |
| `bug-hunt` | Find bugs, auto-fix, generate regression tests, validate | 4 | $0.06 | ~5m |
| `refactor-module` | Analyze module, refactor structure, test, review | 4 | $0.08 | ~6m |
| `performance-audit` | Profile bottlenecks, auto-fix, validate with tests | 3 | $0.05 | ~4m |
| `api-design` | Analyze models, design API schema, generate tests, docs | 4 | $0.08 | ~6m |
| `coverage-boost` | Find coverage gaps, generate unit and E2E tests, validate | 4 | $0.08 | ~7m |
| `documentation-refresh` | Analyze architecture, generate explanations, update docs | 4 | $0.07 | ~5m |
| `onboarding-guide` | Analyze codebase, create explanations, write onboarding | 3 | $0.05 | ~4m |
| `nightly-review` | Scheduled security, quality, and bug scan with report | 4 | $0.05 | ~5m |
| `dependency-update` | Update packages, run tests, create PR | 3 | $0.03 | ~3m |
| `changelog-release` | Generate changelog, update docs, create release PR | 3 | $0.03 | ~2m |
| `pre-release-check` | Security scan, full tests, performance check, changelog | 4 | $0.06 | ~6m |

All template files are stored in `templates/<name>.yaml` within the Cortivex repository.

---

## Running a Template

From the command line:

```bash
cortivex run pr-review
```

With parameters:

```bash
cortivex run pr-review --param pr_number=42 --param fix_mode=comprehensive
```

With execution options:

```bash
cortivex run security-audit --dry-run
cortivex run full-test-suite --verbose
```

From inside Claude Code:

```
/cortivex run pr-review
/cortivex run security-audit --param scan_depth=deep
```

---

## Customizing a Template

To create a modified version of a built-in template:

1. Copy the template to your project's pipeline directory:

```bash
cp node_modules/cortivex/templates/pr-review.yaml .cortivex/pipelines/my-review.yaml
```

2. Edit the YAML file. You can change node types, add or remove nodes, adjust model selections, modify configuration parameters, or change the dependency graph.

3. Run your custom version:

```bash
cortivex run my-review
```

Cortivex checks `.cortivex/pipelines/` before the built-in template directory, so project-level pipelines take priority.

---

## Creating a Template from Natural Language

Generate a new pipeline from a plain English description:

```bash
cortivex create "scan for security issues, fix them, run tests, and create a PR" --save-as secure-fix
```

Cortivex analyzes the description to:

- Identify the appropriate node types (SecurityScanner, AutoFixer, TestRunner, PRCreator).
- Determine dependencies (auto-fix depends on scan results, tests depend on fixes).
- Select models (Sonnet for reasoning-heavy tasks, Haiku for mechanical tasks).
- Estimate cost and duration based on node type baselines.

The result is saved to `.cortivex/pipelines/secure-fix.yaml` and can be run immediately.

---

## Pipeline YAML Format

Every pipeline YAML file follows this structure:

```yaml
name: pipeline-name
version: "1.0"
description: What this pipeline does
tags: [relevant, tags]
estimated_cost: "$0.05"
estimated_duration: "3m"

params:
  param_name:
    type: string
    default: value
    description: What this parameter controls

nodes:
  - id: unique_node_id
    type: NodeType
    depends_on: []
    config:
      model: claude-sonnet-4-20250514
      key: value
    retry:
      max_attempts: 2
      backoff: fixed
      base_delay_seconds: 5
      retry_on: [timeout, transient_error]
```

### Top-Level Fields

- **name**: unique identifier for the pipeline.
- **version**: semantic version string.
- **description**: human-readable summary.
- **tags**: array of tags for categorization and search.
- **estimated_cost**: approximate API cost for a typical run.
- **estimated_duration**: approximate wall-clock time.
- **params**: optional named parameters with types, defaults, and descriptions. Referenced in node configs as `${params.param_name}`.

### Node Fields

- **id**: unique identifier within the pipeline.
- **type**: one of the 20+ agent node types (SecurityScanner, CodeReviewer, AutoFixer, TestRunner, PRCreator, BugHunter, DocWriter, and others).
- **depends_on**: array of node IDs that must complete before this node starts. An empty array means the node starts immediately.
- **config**: node-type-specific configuration including model selection.
- **retry**: optional retry policy with max attempts, backoff strategy (fixed, linear, exponential), base delay, and retry conditions.

Nodes with all dependencies satisfied run in parallel automatically. The pipeline engine validates the DAG at load time and rejects cycles or missing dependency references.
