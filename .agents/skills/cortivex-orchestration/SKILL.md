---
name: cortivex-orchestration
version: 1.0.0
description: Orchestrate multi-agent pipelines with SwarmCoordinator and AgentMonitor nodes for leader election, health monitoring, and auto-recovery
category: orchestration
tags: [orchestration, multi-agent, swarm, lifecycle, health-monitoring, auto-recovery]
author: Cortivex
requires: [cortivex MCP server]
capabilities: [agent-orchestration, health-monitoring, auto-recovery, leader-election, scaling]
slash_commands:
  - name: cortivex run
    description: Run a pipeline with orchestration nodes
    usage: /cortivex run <pipeline-name> [--agents <count>] [--monitor] [--verbose]
  - name: cortivex serve
    description: Start a persistent orchestration server for long-running pipelines
    usage: /cortivex serve --port <port> [--agents <count>] [--runtime <mode>]
  - name: cortivex status
    description: Check health and status of all orchestrated agents
    usage: /cortivex status [<run-id>] [--agents] [--health]
---

# Cortivex Multi-Agent Orchestration

You are an orchestration controller that manages multi-agent Cortivex pipelines. This skill covers how to use SwarmCoordinator and AgentMonitor nodes to run parallel agent workloads with leader election, health monitoring, and automatic recovery.

## Overview

Standard Cortivex pipelines execute nodes sequentially or in simple parallel DAGs. Orchestration extends this by introducing coordination primitives that allow agents to self-organize, monitor each other, and recover from failures without manual intervention.

The two primary orchestration node types are:

- **SwarmCoordinator** -- Manages a pool of worker agents, assigns tasks from a shared queue, elects a leader for coordination, and handles scaling.
- **AgentMonitor** -- Continuously tracks agent health via heartbeats, token consumption, and progress signals. Triggers recovery actions when agents stall or die.

## When to Use

- Running more than 3 agents in parallel against the same repository
- Long-running pipelines (over 10 minutes) where agent failures are likely
- Workloads that require dynamic task assignment rather than fixed DAG ordering
- Pipelines where agents share state and need a coordinator to prevent conflicts
- Situations requiring automatic recovery when agents crash or exhaust their context window

## How It Works

### Orchestration Lifecycle

```
Phase 1: Bootstrap
  SwarmCoordinator starts, elects itself leader (single-node) or runs election (multi-node)
  AgentMonitor begins heartbeat tracking

Phase 2: Agent Pool
  SwarmCoordinator spawns the configured number of worker agents
  Each agent registers with the monitor and begins accepting tasks

Phase 3: Task Distribution
  SwarmCoordinator pulls tasks from the pipeline queue
  Tasks are assigned to idle agents based on priority and agent capability

Phase 4: Monitoring
  AgentMonitor checks heartbeats every 15 seconds
  Token consumption is tracked per agent
  Stalled agents are flagged after 2 missed heartbeats (30s)

Phase 5: Recovery
  Dead agents are removed from the pool
  Their in-progress tasks are requeued with status "ready"
  A replacement agent is spawned if the pool drops below the configured minimum

Phase 6: Completion
  When all tasks reach "done" status, the coordinator collects results
  AgentMonitor produces a health report
  Pipeline returns aggregated output
```

### Agent States

| State | Meaning | Monitor Action |
|-------|---------|----------------|
| `idle` | Agent is registered and waiting for work | None -- agent is healthy |
| `working` | Agent is actively processing a task | Track progress and token usage |
| `stalled` | Agent missed 2+ heartbeats while working | Send ping; if no response in 15s, mark dead |
| `dead` | Agent process terminated or unresponsive | Requeue tasks, spawn replacement |
| `rotating` | Agent is near context limit, finishing current task | Do not assign new tasks; replace after completion |

### Token Budget Management

| Token Range | Status | Coordinator Action |
|-------------|--------|--------------------|
| 0 -- 50K | Healthy | Normal task assignment |
| 50K -- 80K | Caution | Assign only short tasks |
| 80K -- 95K | Warning | Finish current task, then rotate agent |
| 95K+ | Critical | Kill agent, requeue task, spawn replacement |

## Pipeline Configuration

### Basic Orchestrated Pipeline

```yaml
name: orchestrated-review
version: "1.0"
description: Multi-agent code review with health monitoring
orchestration:
  mode: swarm
  min_agents: 2
  max_agents: 5
  auto_scale: true

nodes:
  - id: coordinator
    type: SwarmCoordinator
    config:
      pool_size: 3
      runtime: auto
      task_strategy: priority-queue
      heartbeat_interval_seconds: 15
      heartbeat_timeout_seconds: 30
      token_rotation_threshold: 80000
      on_agent_death: respawn
      on_all_complete: collect_results

  - id: monitor
    type: AgentMonitor
    depends_on: [coordinator]
    config:
      check_interval_seconds: 15
      stall_threshold_seconds: 60
      token_alert_threshold: 80000
      auto_recovery: true
      report_on_complete: true

  - id: security_scan
    type: SecurityScanner
    depends_on: [coordinator]
    config:
      scan_depth: deep
      managed_by: coordinator

  - id: code_review
    type: CodeReviewer
    depends_on: [coordinator]
    config:
      review_scope: changed_files
      managed_by: coordinator

  - id: bug_hunt
    type: BugHunter
    depends_on: [coordinator]
    config:
      hunt_scope: changed_files
      managed_by: coordinator

  - id: collect
    type: Orchestrator
    depends_on: [security_scan, code_review, bug_hunt]
    config:
      strategy: fan-in
      collect_results: true
```

### Long-Running Server Mode

For pipelines that run continuously or handle streaming workloads, use `cortivex serve`:

```yaml
name: continuous-review-server
version: "1.0"
description: Persistent review server that processes incoming tasks
orchestration:
  mode: server
  port: 9100
  min_agents: 2
  max_agents: 8
  idle_timeout_minutes: 30

nodes:
  - id: coordinator
    type: SwarmCoordinator
    config:
      pool_size: 3
      runtime: auto
      task_strategy: priority-queue
      accept_external_tasks: true
      api_endpoint: /api/tasks

  - id: monitor
    type: AgentMonitor
    depends_on: [coordinator]
    config:
      check_interval_seconds: 10
      auto_recovery: true
      metrics_endpoint: /api/metrics
```

Start the server:

```
cortivex serve --port 9100 --agents 3 --runtime auto
```

Submit tasks to the running server:

```
cortivex_run({
  pipeline: "continuous-review-server",
  params: {
    task: "Review PR #42",
    priority: 8
  }
})
```

## Running Orchestrated Pipelines

### Using MCP Tools

```
cortivex_run({
  pipeline: "orchestrated-review",
  repo: "/path/to/repo",
  options: {
    verbose: true,
    max_parallel: 5,
    timeout_minutes: 30,
    on_failure: "retry"
  }
})
```

### Using CLI

```
/cortivex run orchestrated-review --repo /path/to/repo --agents 3 --monitor --verbose
```

### Monitoring an Orchestrated Run

```
/cortivex status ctx-a1b2c3 --agents --health
```

Output:

```
Pipeline: orchestrated-review (run_id: ctx-a1b2c3)
Mode: swarm | Leader: agent-coordinator-1
============================================
Agent Pool (3/5):
  agent-worker-1   [WORKING]  task: security_scan   tokens: 12,400  health: OK
  agent-worker-2   [WORKING]  task: code_review      tokens: 34,200  health: OK
  agent-worker-3   [IDLE]     waiting for task        tokens: 8,100   health: OK

Tasks:
  [1/4] SecurityScanner    [RUNNING]   assigned to: agent-worker-1
  [2/4] CodeReviewer       [RUNNING]   assigned to: agent-worker-2
  [3/4] BugHunter          [READY]     next assignment: agent-worker-3
  [4/4] Orchestrator       [WAITING]   depends on: 1, 2, 3

Monitor:
  Heartbeats: all responding (last check: 3s ago)
  Deaths: 0 | Recoveries: 0 | Rotations: 0
  Total tokens: 54,700 | Estimated cost: $0.014
```

## Recovery Scenarios

### Agent Death

When an agent process terminates unexpectedly:

1. AgentMonitor detects missed heartbeats (30s timeout)
2. Agent is marked `dead` in the registry
3. In-progress task is set back to `ready` status
4. SwarmCoordinator spawns a replacement agent
5. Replacement agent picks up the requeued task
6. A `recovery` event is broadcast to all nodes

### Context Window Exhaustion

When an agent approaches its token limit:

1. AgentMonitor detects token usage above the rotation threshold
2. Agent is marked `rotating` -- no new tasks are assigned
3. Agent completes its current task
4. Agent is gracefully terminated
5. A fresh agent is spawned in its place

### Stalled Agent

When an agent stops making progress but has not crashed:

1. AgentMonitor detects no progress updates for the stall threshold period
2. A ping is sent to the agent
3. If the agent responds, monitoring continues
4. If no response within 15 seconds, the agent is treated as dead

## SwarmCoordinator Node Reference

```yaml
- id: coordinator
  type: SwarmCoordinator
  config:
    pool_size: 3                        # initial number of worker agents
    runtime: auto                       # auto | claude | sim
    task_strategy: priority-queue       # priority-queue | round-robin | least-loaded
    heartbeat_interval_seconds: 15      # how often agents send heartbeats
    heartbeat_timeout_seconds: 30       # seconds before agent is marked stalled
    token_rotation_threshold: 80000     # rotate agent when tokens exceed this
    min_pool_size: 1                    # minimum agents (auto-respawn below this)
    max_pool_size: 10                   # maximum agents (scaling cap)
    on_agent_death: respawn             # respawn | ignore | halt
    on_all_complete: collect_results    # collect_results | shutdown | idle
    task_timeout_seconds: 600           # per-task timeout
    cost_limit: 5.00                    # USD budget for the entire pool
```

## AgentMonitor Node Reference

```yaml
- id: monitor
  type: AgentMonitor
  depends_on: [coordinator]
  config:
    check_interval_seconds: 15          # health check frequency
    stall_threshold_seconds: 60         # seconds of no progress before stall alert
    token_alert_threshold: 80000        # alert when agent exceeds this
    auto_recovery: true                 # automatically handle dead agents
    report_on_complete: true            # produce health report when pipeline finishes
    metrics_endpoint: null              # expose metrics at this HTTP path (server mode)
    log_level: info                     # debug | info | warn | error
```

## Quick Reference

| Operation | MCP Tool / Command | Description |
|-----------|-------------------|-------------|
| Start orchestrated pipeline | `cortivex_run({ pipeline, options })` | Run with SwarmCoordinator managing agents |
| Start persistent server | `/cortivex serve --port 9100 --agents 3` | Long-running orchestration server |
| Check agent health | `/cortivex status --agents --health` | View agent pool and monitor state |
| Scale agents | `cortivex_scale({ run_id, agents: 5 })` | Adjust pool size during execution |
| Kill specific agent | `cortivex_agent({ action: "kill", agent_id })` | Remove agent from pool |
| Spawn additional agent | `cortivex_agent({ action: "spawn" })` | Add agent to pool |
| View recovery log | `/cortivex status --recoveries` | See agent deaths and recoveries |
| Stop orchestration | `/cortivex stop <run-id>` | Graceful shutdown of agent pool |

## Best Practices

1. **Start small** -- Begin with 2-3 agents and scale up after verifying the pipeline works correctly.
2. **Set cost limits** -- Always configure `cost_limit` on the SwarmCoordinator to prevent runaway spending.
3. **Use auto runtime** -- The `auto` runtime tries real Claude agents first and falls back to simulation, making pipelines portable between development and production.
4. **Monitor token usage** -- Agents near their context limit produce lower-quality output. Set `token_rotation_threshold` conservatively.
5. **Pair with mesh coordination** -- When orchestrated agents modify files, combine with the cortivex-mesh skill to prevent write conflicts.
6. **Test with simulation** -- Run pipelines with `--runtime sim` first to validate orchestration logic without incurring API costs.
7. **Set task timeouts** -- Configure `task_timeout_seconds` to prevent individual tasks from blocking the entire pool.

## Reasoning Protocol

Before configuring orchestration, reason through:

1. **How many agents do I actually need?** Start with 2-3. More agents means more coordination overhead, higher cost, and more potential for conflicts. Scale up only after validating the pipeline works.
2. **What is the expected task duration?** Short tasks (under 1 minute) benefit from more agents. Long tasks (over 5 minutes) benefit from fewer, more capable agents.
3. **What happens when an agent dies?** Verify that `on_agent_death: respawn` is configured and that requeued tasks will not produce duplicate work.
4. **Is token rotation configured correctly?** Agents near their context limit produce degraded output. Set `token_rotation_threshold` to 80% of the model's context window, not 100%.
5. **Do I need a persistent server or a one-shot pipeline?** Use `cortivex serve` for continuous workloads (CI webhooks, nightly scans). Use `cortivex run` for one-time tasks.

## Anti-Patterns

| Anti-Pattern | Consequence | Correct Approach |
|-------------|------------|-----------------|
| Pool size of 10+ agents | High cost, coordination overhead, diminishing returns | Start with 2-3; scale based on measured throughput |
| No cost limit | Runaway spending on agent spawning and retries | Always set `cost_limit` on SwarmCoordinator |
| `on_agent_death: ignore` in production | Dead agents leave orphaned tasks that never complete | Use `respawn` in production; `ignore` only for testing |
| Not pairing with AgentMonitor | No visibility into agent health; stalled agents go undetected | Always include AgentMonitor alongside SwarmCoordinator |
| No `managed_by: coordinator` on task nodes | Nodes execute as regular DAG instead of through the agent pool | Mark task nodes with `managed_by: coordinator` |
| Using real agents in development | Expensive debugging; wastes API credits | Use `--runtime sim` for development and testing |

**WRONG:**
```yaml
# Overpowered pool with no safety limits
nodes:
  - id: coordinator
    type: SwarmCoordinator
    config:
      pool_size: 10
      on_agent_death: ignore
      # no cost_limit
      # no token_rotation_threshold
```

**RIGHT:**
```yaml
nodes:
  - id: coordinator
    type: SwarmCoordinator
    config:
      pool_size: 3
      on_agent_death: respawn
      cost_limit: 2.00
      token_rotation_threshold: 80000
  - id: monitor
    type: AgentMonitor
    depends_on: [coordinator]
    config:
      auto_recovery: true
```

## Grounding Rules

- **Unsure about pool size:** Use `pool_size: 2` for pipelines with under 10 tasks. Use `pool_size: 3-5` for 10-50 tasks. Use `pool_size: 5+` only for 50+ tasks with measured throughput data.
- **Agent keeps dying:** Check if the task is too large for one agent session. If the agent hits its context limit, reduce task scope or lower `token_rotation_threshold`.
- **Pipeline seems slow despite multiple agents:** Check if tasks have false dependencies that force serial execution. Use `cortivex_tasks({ action: "status" })` to identify bottlenecks.
- **Cost exceeding estimates:** Check for agent respawn loops (agent dies, respawns, dies again). Set `max_pool_size` to cap total agents and investigate the root cause of agent failures.

## Advanced Capabilities

This section covers advanced orchestration features for production deployments that require fine-grained control over agent scaling, resource allocation, task prioritization, health-based routing, and cost management.

### Dynamic Agent Scaling Policies

Scaling policies allow the SwarmCoordinator to automatically adjust the agent pool size based on queue depth, agent utilization, or time-of-day schedules. Policies are evaluated every 30 seconds and constrained by `min_pool_size` and `max_pool_size`.

```yaml
orchestration:
  scaling_policies:
    - name: queue-depth-scaler
      trigger: queue_depth
      scale_up_threshold: 10
      scale_down_threshold: 2
      cooldown_seconds: 120
      increment: 1
    - name: utilization-scaler
      trigger: utilization_percent
      scale_up_threshold: 85
      scale_down_threshold: 30
      cooldown_seconds: 180
      increment: 2
```

Use the `cortivex_orchestrate_scale` MCP tool to apply scaling changes programmatically:

```json
{
  "tool": "cortivex_orchestrate_scale",
  "request": {
    "run_id": "ctx-a1b2c3",
    "action": "apply_policy",
    "policy": "queue-depth-scaler",
    "desired_count": 5,
    "reason": "queue depth exceeded threshold (14 pending tasks)"
  }
}
```

Response:

```json
{
  "status": "scaled",
  "previous_pool_size": 3,
  "new_pool_size": 5,
  "agents_spawned": ["agent-worker-4", "agent-worker-5"],
  "next_evaluation_at": "2026-03-23T10:05:30Z",
  "cooldown_remaining_seconds": 120
}
```

### Resource Quota Management

Resource quotas define per-agent and per-pipeline limits on token consumption, task count, and execution time. Quotas prevent a single agent or pipeline from monopolizing shared infrastructure.

```yaml
resource_quotas:
  per_agent:
    max_tokens_per_session: 90000
    max_tasks_per_session: 20
    max_execution_minutes: 60
    max_retries_per_task: 3
  per_pipeline:
    max_total_tokens: 500000
    max_concurrent_agents: 8
    max_wall_clock_minutes: 120
    max_task_queue_size: 200
  enforcement:
    on_quota_exceeded: suspend   # suspend | warn | terminate
    notify_on_threshold: 80      # percent of quota used before alert
    grace_period_seconds: 30     # time to finish current task after quota hit
```

When a quota is exceeded, the coordinator takes the configured enforcement action. The `suspend` action pauses new task assignment to the offending agent while allowing it to complete its current work. The `terminate` action immediately kills the agent and requeues its task.

### Priority Queue Configuration

Priority queues allow tasks to be ordered by urgency, type, or custom scoring functions. Tasks with higher priority values are dequeued first. When priorities are equal, tasks are processed in FIFO order.

```json
{
  "queue_config": {
    "type": "priority-queue",
    "max_size": 500,
    "priority_rules": [
      {
        "name": "critical-security",
        "match": { "task_type": "security_scan", "severity": "critical" },
        "priority": 100,
        "max_wait_seconds": 60
      },
      {
        "name": "standard-review",
        "match": { "task_type": "code_review" },
        "priority": 50,
        "max_wait_seconds": 300
      },
      {
        "name": "background-lint",
        "match": { "task_type": "linting" },
        "priority": 10,
        "max_wait_seconds": 900
      }
    ],
    "starvation_prevention": {
      "enabled": true,
      "boost_per_minute": 5,
      "max_boost": 80
    },
    "dead_letter": {
      "enabled": true,
      "max_retries": 3,
      "ttl_seconds": 3600
    }
  }
}
```

The `starvation_prevention` block ensures low-priority tasks are eventually processed by incrementing their effective priority over time. The `dead_letter` configuration moves repeatedly failing tasks out of the main queue after exhausting retries.

### Health-Based Routing and Load Balancing

Health-based routing directs incoming tasks to the most suitable agent based on real-time health signals, current load, and agent capabilities. The `cortivex_orchestrate_route` tool exposes routing decisions.

```typescript
interface RoutingConfig {
  strategy: "least-loaded" | "health-score" | "capability-match" | "round-robin";
  health_weights: {
    heartbeat_recency: number;   // 0-1, weight for time since last heartbeat
    token_headroom: number;      // 0-1, weight for remaining token budget
    error_rate: number;          // 0-1, weight for recent error frequency
    task_latency: number;        // 0-1, weight for average task completion time
  };
  thresholds: {
    min_health_score: number;    // agents below this are excluded from routing
    max_active_tasks: number;    // per-agent concurrency cap
    circuit_breaker_errors: number; // consecutive errors before agent is bypassed
  };
}
```

Request routing via MCP:

```json
{
  "tool": "cortivex_orchestrate_route",
  "request": {
    "run_id": "ctx-a1b2c3",
    "task_id": "task-security-42",
    "routing_strategy": "health-score",
    "required_capabilities": ["security_scan"],
    "exclude_agents": ["agent-worker-2"]
  }
}
```

Response:

```json
{
  "routed_to": "agent-worker-1",
  "health_score": 0.92,
  "token_headroom": 67600,
  "active_tasks": 1,
  "decision_reason": "highest health score among capable agents",
  "alternatives": [
    { "agent": "agent-worker-3", "health_score": 0.85, "reason": "lower token headroom" }
  ]
}
```

### Cost Budget Enforcement

Cost budget enforcement sets hard and soft spending limits at the pipeline and organization level. The coordinator tracks estimated costs in real time based on token usage and model pricing, and takes action when limits are approached or breached.

```json
{
  "cost_budget": {
    "pipeline_limit_usd": 5.00,
    "soft_limit_percent": 75,
    "hard_limit_percent": 100,
    "per_agent_limit_usd": 1.50,
    "tracking": {
      "model": "claude-sonnet",
      "input_cost_per_1k_tokens": 0.003,
      "output_cost_per_1k_tokens": 0.015
    },
    "on_soft_limit": {
      "action": "alert",
      "restrict_scaling": true,
      "disable_retries": false
    },
    "on_hard_limit": {
      "action": "halt_new_tasks",
      "drain_in_progress": true,
      "notify": ["pipeline_owner"]
    },
    "rollover": {
      "enabled": false,
      "period": "daily",
      "max_rollover_usd": 2.00
    }
  }
}
```

When the soft limit is reached, the coordinator stops scaling up the agent pool and sends an alert. When the hard limit is reached, no new tasks are dispatched; agents finish their current work and the pipeline enters a `budget_exhausted` state. Use `cortivex status --cost` to inspect real-time spending against configured budgets.
