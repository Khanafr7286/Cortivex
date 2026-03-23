# Skill Reference

Cortivex ships 15 Claude Code skills organized into three tiers: Core, Coordination, and Advanced. Each skill is a self-contained operational manual averaging 600+ lines of structured guidance. Unlike typical skills that provide simple instruction lists, every Cortivex skill includes reasoning protocols, anti-pattern tables, grounding rules, and Advanced Capabilities sections with MCP tool examples, YAML configurations, and JSON schemas.

All skill files live in `.agents/skills/<skill-name>/SKILL.md` within the Cortivex repository.

---

## How Skills Activate

Skills activate automatically in Claude Code based on context detection. You do not need to invoke them by name. When you ask Claude Code to "review my PR," the cortivex-pipeline skill detects the intent, selects the pr-review template, builds the agent DAG, and executes it. The skills operate in the background while you interact with natural language.

After running `cortivex install-skills`, the skill files are copied to your project's `.agents/skills/` directory. Claude Code reads them at session start and uses them when the context matches.

---

## How to Read a Skill File

Every SKILL.md file follows a consistent structure:

### Frontmatter

The YAML block at the top of each file contains metadata:

```yaml
---
name: cortivex-pipeline
description: Build and run AI agent pipelines
version: 1.0
category: core
---
```

### Overview

A brief explanation of what the skill does and when it activates. This section establishes the skill's scope and purpose.

### How It Works

The operational core of the skill. This section contains step-by-step instructions, configuration references, and behavioral rules. It defines exactly what the agent should do when the skill activates.

### Reasoning Protocol

A structured decision framework that forces step-by-step thinking before action. Reasoning protocols prevent the agent from jumping to conclusions or skipping analysis steps. They typically take the form of ordered checklists with conditions and branching logic.

### Anti-Pattern Tables

Tables of common mistakes with WRONG and RIGHT examples showing exactly what fails and why. These tables serve as guardrails, catching the most frequent error modes before they happen. Each entry includes a description of the failure mode and a concrete code or behavior example.

### Grounding Rules

Rules for when the situation is uncertain or ambiguous. Grounding rules define fallback behavior, conservative defaults, and escalation paths. They prevent the agent from guessing when it should ask or stop.

### Best Practices

Additional guidance that improves quality but is not strictly required. Best practices capture patterns learned from repeated execution.

---

## Core Pipeline Skills

These five skills form the foundation. They handle pipeline creation, agent selection, task decomposition, template management, and self-learning.

### cortivex-pipeline

**Category:** Core | **Lines:** 549

Build and run AI agent pipelines that decompose complex tasks into coordinated agent workflows. This is the foundation skill that powers `cortivex run` and `cortivex create` commands. Defines the full pipeline lifecycle from YAML definition through validation, planning, execution, result collection, and learning.

**Key capabilities:**
- Pipeline YAML parsing and DAG validation
- Node execution with dependency ordering and parallel scheduling
- Dry-run cost estimation
- Result aggregation and summary generation
- Integration with the learning engine for post-run optimization

**Skill file:** `.agents/skills/cortivex-pipeline/SKILL.md`

---

### cortivex-nodes

**Category:** Core | **Lines:** 1,036

Complete reference for all 20+ agent node types with configurations, model recommendations, cost baselines, and usage guidance. Includes a decision tree for selecting the right node type.

**Key capabilities:**
- Node type catalog with per-type configuration schemas
- Model selection guidance (Sonnet for deep reasoning, Haiku for mechanical tasks at lower cost)
- Cost baselines and duration estimates per node type
- Decision tree for matching tasks to the correct node type

**Skill file:** `.agents/skills/cortivex-nodes/SKILL.md`

---

### cortivex-templates

**Category:** Core | **Lines:** 313

Reference for 15 built-in pipeline templates covering PR review, security audit, test generation, TypeScript migration, documentation, and more. Each template lists its nodes, estimated cost, and estimated duration.

**Key capabilities:**
- Template catalog with descriptions, node counts, costs, and durations
- Template selection guidance based on task type
- Parameter documentation for each template
- Customization instructions for modifying templates

**Skill file:** `.agents/skills/cortivex-templates/SKILL.md`

---

### cortivex-task-decomposition

**Category:** Core | **Lines:** 418

Breaks complex requests into atomic tasks with dependency ordering, priority assignment (1-10), and cost estimation. Produces a task queue that feeds directly into the SwarmCoordinator or pipeline DAG.

**Key capabilities:**
- Natural language to task list conversion
- Dependency graph construction
- Priority assignment with configurable weights
- Cost estimation per task based on historical data
- Task queue serialization for pipeline consumption

**Skill file:** `.agents/skills/cortivex-task-decomposition/SKILL.md`

---

### cortivex-learn

**Category:** Core | **Lines:** 492

Self-learning system that records execution metrics, detects optimization patterns, and applies high-confidence insights automatically. Pipelines get measurably better over time.

**Key capabilities:**
- Six insight types: reorder, substitute_model, skip_node, add_node, adjust_config, adjust_timeout
- Confidence scoring from 0.0 to 1.0 (auto-apply threshold at 0.80+)
- Contradiction detection with confidence decay (archived below 0.20)
- Cross-run pattern analysis
- Aggregate statistics tracking (success rate, cost, duration trends)

**Skill file:** `.agents/skills/cortivex-learn/SKILL.md`

---

## Coordination Skills

These five skills handle the distributed systems layer: file coordination, conflict resolution, agent orchestration, leader election, and shared knowledge.

### cortivex-mesh

**Category:** Coordination | **Lines:** 489

Filesystem-based mesh protocol for multi-agent file coordination. Injected into every spawned agent. Defines the mandatory check-claim-work-release protocol with TTL expiration, conflict escalation, bulk operations, and directory-level claims.

**Key capabilities:**
- Check-claim-work-release file ownership protocol
- TTL-based claim expiration
- Conflict escalation to MeshResolver
- Bulk claim and release operations
- Directory-level claims for large refactors
- 12 JSON request/response examples

**Skill file:** `.agents/skills/cortivex-mesh/SKILL.md`

---

### cortivex-mesh-coordination

**Category:** Coordination | **Lines:** 411

Advanced conflict resolution with MeshResolver nodes. Handles multi-agent file conflicts that the basic mesh protocol cannot resolve automatically.

**Key capabilities:**
- Five conflict resolution strategies: priority-based, first-claim, preemption, file partitioning, serialized access
- Continuous deadlock detection
- Pre-allocation of file ownership for predictable access patterns
- Conflict history tracking and reporting

**Skill file:** `.agents/skills/cortivex-mesh-coordination/SKILL.md`

---

### cortivex-orchestration

**Category:** Coordination | **Lines:** 412

Multi-agent swarm orchestration with SwarmCoordinator and AgentMonitor nodes. Manages agent pools, task queues, health monitoring via heartbeats, token rotation, automatic respawn, and cost limits.

**Key capabilities:**
- Agent pool management with dynamic sizing
- Task queue with priority ordering
- Heartbeat-based health monitoring
- Automatic respawn of failed agents
- Token rotation for rate limit management
- Configurable cost limits per pipeline and per agent

**Skill file:** `.agents/skills/cortivex-orchestration/SKILL.md`

---

### cortivex-consensus

**Category:** Coordination | **Lines:** 322

Raft-style leader election for multi-node clusters. Ensures exactly one node coordinates task scheduling at any time.

**Key capabilities:**
- Leader election with terms, quorum, and heartbeats
- Automatic failover when the leader goes down
- Split-brain prevention
- Configurations for 3, 5, and 7-node clusters
- Heartbeat interval and election timeout tuning

**Skill file:** `.agents/skills/cortivex-consensus/SKILL.md`

---

### cortivex-knowledge

**Category:** Coordination | **Lines:** 353

Shared CRDT knowledge graphs across agents. Prevents duplicate work through content-hash deduplication and enables cross-agent synthesis via KnowledgeCurator nodes.

**Key capabilities:**
- Five knowledge node types for structured findings
- Seven edge types for relationships between findings
- CRDT-based conflict-free merging from concurrent agents
- Content-hash deduplication to prevent redundant analysis
- Cross-agent synthesis for combined insights

**Skill file:** `.agents/skills/cortivex-knowledge/SKILL.md`

---

## Advanced Skills

These five skills address specialized problems in multi-agent systems.

### cortivex-pipeline-debugger

**Category:** Advanced | **Lines:** 682

Step-through debugging for pipelines. Provides fine-grained control over pipeline execution for troubleshooting and development.

**Key capabilities:**
- Breakpoints on individual nodes
- Inspection of intermediate outputs between nodes
- Replay of failed nodes with modified inputs or different models
- Execution trace recording and visualization
- Step-over, step-into, and continue controls

**Skill file:** `.agents/skills/cortivex-pipeline-debugger/SKILL.md`

---

### cortivex-context-compression

**Category:** Advanced | **Lines:** 614

Solves context window exhaustion across agent handoffs. Compresses large agent outputs into structured summaries that preserve all actionable information.

**Key capabilities:**
- Three compression levels: lossless, lossy, digest
- Per-node-type compression profiles
- 50K-token to 2K-token compression while preserving actionable content
- Quality validation to ensure no critical information is lost
- Configurable compression thresholds

**Skill file:** `.agents/skills/cortivex-context-compression/SKILL.md`

---

### cortivex-drift-detection

**Category:** Advanced | **Lines:** 471

Detects when codebases drift from their intended state. Monitors architecture docs, pipeline configs, coverage targets, and dependency specifications.

**Key capabilities:**
- Five drift categories: architecture, configuration, coverage, documentation, dependency
- Severity-scored drift reports
- Baseline snapshots for comparison
- Trend analysis across multiple scans
- Automated remediation suggestions

**Skill file:** `.agents/skills/cortivex-drift-detection/SKILL.md`

---

### cortivex-agent-replay

**Category:** Advanced | **Lines:** 596

Records full agent execution traces and replays them with different inputs, models, or configurations for analysis and optimization.

**Key capabilities:**
- Full execution trace recording
- Replay with modified inputs, models, or configurations
- Side-by-side diff of two replay runs
- Time-travel to any execution point
- Pattern analysis across multiple traces

**Skill file:** `.agents/skills/cortivex-agent-replay/SKILL.md`

---

### cortivex-cross-repo

**Category:** Advanced | **Lines:** 495

Transfers learned insights across repositories through technology fingerprinting and similarity matching. Enables new projects to benefit from optimizations discovered in similar codebases.

**Key capabilities:**
- Technology fingerprinting for repository similarity matching
- Privacy-controlled insight sharing (anonymized before transfer)
- Local insights always override global
- Opt-in sharing model
- Cross-project pattern detection

**Skill file:** `.agents/skills/cortivex-cross-repo/SKILL.md`
