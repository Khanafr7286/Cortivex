---
name: run
description: Run a Cortivex pipeline by name or generate one from a description
---

Run a Cortivex AI agent pipeline. You can specify a pipeline name (from templates or saved pipelines) or describe what you want in natural language.

## Usage

### Run a named pipeline:
```
/run pr-review
/run security-audit
/run full-test-suite
```

### Run with natural language:
```
/run Review this PR for security issues and generate tests
/run Scan for vulnerabilities and fix them
/run Refactor the auth module and update docs
```

## What happens:
1. Cortivex loads the pipeline definition (YAML) or generates one from your description
2. The DAG executor resolves node dependencies and execution order
3. Each node spawns a specialized Claude agent with expert system prompts
4. Agents coordinate via mesh protocol to prevent file conflicts
5. Results stream in real-time via WebSocket to the dashboard
6. Execution history is recorded for the learning engine to optimize future runs

## Available templates:
- pr-review, security-audit, full-test-suite, js-to-typescript
- bug-hunt, refactor-module, performance-audit, api-design
- coverage-boost, documentation-refresh, onboarding-guide
- nightly-review, dependency-update, changelog-release, pre-release-check
