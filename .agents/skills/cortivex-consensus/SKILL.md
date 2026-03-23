---
name: cortivex-consensus
version: 1.0.0
description: Raft-style leader election for multi-node Cortivex clusters using ConsensusManager nodes
category: orchestration
tags: [consensus, raft, leader-election, multi-node, cluster, fault-tolerance]
author: Cortivex
requires: [cortivex MCP server]
capabilities: [leader-election, term-management, quorum-tracking, split-brain-prevention]
---

# Cortivex Consensus Protocol

This skill covers how ConsensusManager nodes enable Raft-style leader election in multi-node Cortivex clusters. Leader election ensures that exactly one coordinator is making scheduling decisions at any time, preventing conflicting task assignments and split-brain scenarios.

## Overview

When running Cortivex pipelines across multiple nodes (separate machines or separate processes), the nodes must agree on which one is the leader. The ConsensusManager node implements a simplified Raft protocol to achieve this:

- Exactly one node is elected **leader** and coordinates all task scheduling
- All other nodes are **followers** that accept work from the leader
- If the leader fails, a new election occurs automatically
- A **term** number tracks each leadership epoch to prevent stale commands

## When to Use

- Running Cortivex agents on more than one machine or process
- Pipelines where multiple SwarmCoordinator instances must agree on a single source of truth
- Fault-tolerant deployments where leader failure should not halt the pipeline
- Environments where you need to scale horizontally by adding more Cortivex nodes
- Any scenario where two agents could both attempt to act as coordinator simultaneously

You do NOT need consensus for:

- Single-node pipelines (the lone node is automatically the leader)
- Simple DAG pipelines without SwarmCoordinator nodes
- Pipelines with a fixed, non-redundant coordinator

## How It Works

### Node Roles

| Role | Responsibilities |
|------|-----------------|
| **Leader** | Schedules tasks, sends heartbeats to followers, replicates state |
| **Follower** | Accepts task assignments from leader, votes in elections |
| **Candidate** | Temporary state during an election; requests votes from peers |

### Election Flow

```
1. A follower has not received a heartbeat from the leader within the
   election timeout (default: 2000ms, randomized to prevent ties)
2. The follower becomes a Candidate and increments the term to T+1
3. The Candidate votes for itself and sends RequestVote RPCs to all peers
4. If the Candidate receives votes from a majority of nodes, it becomes
   Leader at term T+1
5. The new Leader sends an immediate heartbeat to all followers to
   establish authority and suppress further elections
6. Followers that receive the heartbeat at term T+1 accept the new leader
```

### Quorum Requirements

| Cluster Size | Majority (Quorum) | Tolerated Failures |
|--------------|--------------------|--------------------|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

A cluster of 3 nodes is the minimum for meaningful fault tolerance. Use odd numbers to avoid tie elections.

## Pipeline Configuration

### Single-Node (Development)

In a single-node setup, no explicit ConsensusManager is needed. The SwarmCoordinator automatically assumes leadership:

```yaml
name: single-node-pipeline
version: "1.0"
description: Single coordinator, no consensus needed
nodes:
  - id: coordinator
    type: SwarmCoordinator
    config:
      pool_size: 3
      runtime: auto
```

### Multi-Node Cluster

For multi-node deployments, add a ConsensusManager node to each pipeline instance and configure peers:

```yaml
name: clustered-pipeline
version: "1.0"
description: Three-node cluster with Raft consensus
orchestration:
  mode: cluster
  node_id: node-1
  peers:
    - id: node-2
      address: 192.168.1.12:9100
    - id: node-3
      address: 192.168.1.13:9100

nodes:
  - id: consensus
    type: ConsensusManager
    config:
      election_timeout_ms: 2000
      heartbeat_interval_ms: 500
      max_election_rounds: 10
      quorum_size: auto

  - id: coordinator
    type: SwarmCoordinator
    depends_on: [consensus]
    config:
      pool_size: 2
      runtime: auto
      leader_only: true

  - id: monitor
    type: AgentMonitor
    depends_on: [coordinator]
    config:
      auto_recovery: true
```

Start each node with its identity:

```
# Node 1
cortivex serve --port 9100 --node-id node-1 \
  --peers "node-2@192.168.1.12:9100,node-3@192.168.1.13:9100"

# Node 2
cortivex serve --port 9100 --node-id node-2 \
  --peers "node-1@192.168.1.11:9100,node-3@192.168.1.13:9100"

# Node 3
cortivex serve --port 9100 --node-id node-3 \
  --peers "node-1@192.168.1.11:9100,node-2@192.168.1.12:9100"
```

### Verifying the Cluster

After all nodes start, verify that a leader has been elected and all nodes agree:

```
cortivex_cluster({
  action: "status"
})
```

Expected output:

```json
{
  "cluster_size": 3,
  "leader": "node-1",
  "term": 1,
  "status": "healthy",
  "nodes": [
    { "id": "node-1", "role": "leader",   "term": 1, "last_heartbeat": "2s ago" },
    { "id": "node-2", "role": "follower", "term": 1, "last_heartbeat": "1s ago" },
    { "id": "node-3", "role": "follower", "term": 1, "last_heartbeat": "1s ago" }
  ]
}
```

All nodes must report the same `leader` and `term`. If they disagree, see Troubleshooting below.

## Handling Node Failures

### Leader Failure

When the leader node goes down:

1. Followers stop receiving heartbeats
2. After the election timeout, the first follower to time out becomes a Candidate
3. The Candidate requests votes and, with a majority, becomes the new Leader
4. The new Leader takes over task scheduling
5. In-progress tasks on the dead leader's agents are requeued

Recovery time is typically under 5 seconds.

### Follower Failure

When a follower node goes down:

1. The Leader stops receiving acknowledgments from that follower
2. The Leader continues operating as long as a quorum remains
3. Tasks assigned to agents on the dead follower are requeued
4. When the follower recovers, it rejoins and catches up

### Network Partition (Split Brain)

If the network splits the cluster into two groups:

- The group with a **majority** continues operating normally and can elect a leader
- The group with a **minority** cannot form a quorum and halts scheduling
- When the partition heals, minority nodes rejoin and accept the majority's state

This prevents conflicting task assignments across partitions.

## ConsensusManager Node Reference

```yaml
- id: consensus
  type: ConsensusManager
  config:
    election_timeout_ms: 2000           # base timeout before starting election
    election_timeout_jitter_ms: 1000    # randomized jitter added to timeout
    heartbeat_interval_ms: 500          # leader heartbeat frequency
    max_election_rounds: 10             # give up after this many failed elections
    quorum_size: auto                   # auto = (cluster_size / 2) + 1
    persist_state: true                 # persist term and vote to disk
    state_directory: .cortivex/raft/    # directory for persistent state
    log_elections: true                 # log election events for debugging
```

## Troubleshooting

### No Leader Elected

Symptoms: All nodes report `role: candidate` or `role: follower` with no leader.

Causes and fixes:

- **Insufficient quorum** -- Ensure a majority of nodes are running and reachable. A 3-node cluster needs at least 2 nodes.
- **Incorrect peer addresses** -- Verify the `--peers` flag on each node points to the correct addresses and ports.
- **Firewall blocking** -- Ensure the ports used for peer communication are open between all nodes.
- **Simultaneous startup** -- Stagger node startup by 1-2 seconds to reduce election ties.

### Frequent Re-Elections

Symptoms: The term number increments rapidly; different nodes keep becoming leader.

Causes and fixes:

- **Network instability** -- Packet loss causes missed heartbeats. Increase `heartbeat_interval_ms` and `election_timeout_ms`.
- **Overloaded nodes** -- High CPU usage delays heartbeat processing. Reduce agent count or add resources.
- **Clock skew** -- Large time differences between nodes can cause timeout miscalculations. Synchronize clocks with NTP.

### Split Brain Detected

Symptoms: Two nodes both claim to be leader at different terms.

Resolution: This is expected during a transient partition. The node with the lower term will step down when it receives a heartbeat from the higher-term leader. If both persist, check network connectivity between all nodes.

## Quick Reference

| Operation | Command / MCP Tool | Description |
|-----------|-------------------|-------------|
| Start cluster node | `cortivex serve --node-id X --peers "..."` | Join or form a cluster |
| Check cluster status | `cortivex_cluster({ action: "status" })` | View leader, term, and node roles |
| Force election | `cortivex_cluster({ action: "force_election" })` | Trigger a new election (testing only) |
| Step down leader | `cortivex_cluster({ action: "step_down" })` | Current leader voluntarily yields |
| View election log | `/cortivex status --elections` | See election history and term progression |
| Add node to cluster | Update `--peers` and restart nodes | Cluster membership change |
| Remove node | Stop the node; remaining nodes continue | Automatic if quorum maintained |

## Reasoning Protocol

Before configuring or troubleshooting consensus, reason through:

1. **Do I actually need consensus?** If only one Cortivex process is running, skip ConsensusManager entirely. Single-node pipelines are automatically leader.
2. **Is my cluster size odd?** Even-numbered clusters risk tie elections. Always use 3, 5, or 7 nodes.
3. **Are all peers reachable?** Before diagnosing election failures, verify network connectivity between all nodes first. Most consensus failures are network failures.
4. **Is the problem transient or persistent?** A single failed election is normal (network jitter). Persistent failure (10+ rounds) indicates a configuration or infrastructure issue.
5. **Am I solving the right problem?** Consensus handles leader election, not task coordination. For file-level coordination, use cortivex-mesh instead.

## Anti-Patterns

| Anti-Pattern | Consequence | Correct Approach |
|-------------|------------|-----------------|
| 2-node cluster | No fault tolerance; one failure = no quorum | Use 3 nodes minimum for meaningful consensus |
| Same election timeout on all nodes | Increases probability of tie elections | Cortivex adds random jitter automatically; do not override with fixed values |
| Disabling `persist_state` in production | Nodes lose term/vote state on restart, causing unnecessary re-elections | Always persist state in production |
| Ignoring term number mismatches | Indicates split-brain or stale leader | Investigate immediately; the higher-term leader is authoritative |
| Manual leader assignment | Bypasses the election protocol, risks split-brain | Use `force_election` only for testing; let the protocol elect naturally |
| Running consensus over the public internet | High latency causes heartbeat timeouts and constant re-elections | Use a private network or increase timeout values significantly |

**WRONG:**
```yaml
# Even cluster size with short timeouts
orchestration:
  mode: cluster
  node_count: 4                    # even = tie risk
nodes:
  - id: consensus
    type: ConsensusManager
    config:
      election_timeout_ms: 500     # too short for real networks
      heartbeat_interval_ms: 100   # generates excessive traffic
```

**RIGHT:**
```yaml
# Odd cluster size with reasonable timeouts
orchestration:
  mode: cluster
  node_count: 3
nodes:
  - id: consensus
    type: ConsensusManager
    config:
      election_timeout_ms: 2000
      heartbeat_interval_ms: 500
      persist_state: true
```

## Grounding Rules

- **Cannot determine the current leader:** Run `cortivex_cluster({ action: "status" })` on each node. The node reporting `role: leader` at the highest term is the true leader.
- **Nodes disagree on who is leader:** This is a transient state during elections. Wait for one heartbeat interval. If disagreement persists beyond 10 seconds, check network connectivity.
- **Leader elected but agents are not receiving tasks:** Verify the SwarmCoordinator has `leader_only: true` and `depends_on: [consensus]`. The coordinator must wait for consensus before scheduling.
- **Unsure whether to add more nodes:** Adding nodes increases fault tolerance but also increases election time and heartbeat traffic. 3 nodes handles most production scenarios. Scale to 5 only if you need to tolerate 2 simultaneous failures.

## Advanced Capabilities

Advanced consensus features for hardened production deployments.

### Byzantine Fault Tolerance Configuration

BFT handles nodes that behave arbitrarily, including sending conflicting messages. Requires 3f + 1 nodes to tolerate f Byzantine faults (e.g., 7 nodes for 2 faulty). Configure via `cortivex_consensus_configure`:

```json
{
  "method": "cortivex_consensus_configure",
  "params": {
    "cluster_id": "prod-cluster-01",
    "byzantine_fault_tolerance": {
      "enabled": true, "max_faulty_nodes": 2,
      "signature_scheme": "ed25519", "message_authentication": true,
      "view_change_timeout_ms": 5000
    }
  }
}
```

Response:

```json
{
  "status": "ok", "cluster_id": "prod-cluster-01",
  "bft_mode": "active", "required_cluster_size": 7,
  "current_cluster_size": 7, "signature_scheme": "ed25519"
}
```

### Consensus Protocol Selection

Select a protocol based on latency, throughput, and fault-tolerance needs.

```yaml
orchestration:
  mode: cluster
  node_id: node-1
  consensus_protocol:
    type: bft-raft  # Options: raft | multi-paxos | bft-raft | fast-paxos
    parameters:
      round_trip_estimate_ms: 10
      batch_size: 50
      pipeline_enabled: true
      pre_vote_enabled: true
      lease_based_reads: true
      snapshot_threshold: 10000
      compression: lz4
```

When `pre_vote_enabled` is true, candidates send a pre-vote before incrementing their term, preventing disruptive elections from partitioned nodes rejoining with inflated terms.

### Quorum Management & Dynamic Membership

Dynamic membership allows nodes to join or leave without downtime. Quorum policy schema:

```json
{
  "quorum_policy": {
    "mode": "joint-consensus",
    "auto_scaling": { "enabled": true, "min_nodes": 3, "max_nodes": 9, "cooldown_seconds": 60 },
    "membership_change": { "max_concurrent_changes": 1, "require_caught_up": true, "caught_up_threshold_ms": 1000 }
  }
}
```

The `mode` field accepts `strict-majority`, `weighted`, `flexible`, or `joint-consensus`. Only one membership change should be in-flight at a time. The `require_caught_up` flag ensures a joining node has replicated the log before gaining voting rights.

### Split-Brain Detection & Recovery

The `cortivex_consensus_heal` tool reconciles divergent state after a partition heals by rolling back uncommitted entries on stale nodes.

```json
{
  "method": "cortivex_consensus_heal",
  "params": {
    "cluster_id": "prod-cluster-01", "action": "detect_and_recover",
    "recovery_strategy": "rollback-to-quorum",
    "force_step_down_stale_leaders": true, "dry_run": false
  }
}
```

Response:

```json
{
  "status": "healed", "cluster_id": "prod-cluster-01",
  "authoritative_partition": ["node-1", "node-2", "node-3"],
  "stale_partition": ["node-4", "node-5"],
  "actions_taken": [
    { "node": "node-4", "action": "rolled_back", "entries_removed": 12 },
    { "node": "node-5", "action": "stepped_down", "previous_role": "leader" },
    { "node": "node-5", "action": "resynced", "entries_replicated": 347 }
  ],
  "unified_term": 14, "unified_leader": "node-1"
}
```

Always run with `"dry_run": true` first in production to preview the recovery plan.

### Leader Election Optimization

Tune election timeouts and heartbeat intervals to balance failover speed against stability. Election configuration schema:

```json
{
  "election_config": {
    "base_timeout_ms": 2000,
    "jitter_range_ms": 1000,
    "heartbeat_interval_ms": 500,
    "max_election_rounds": 10,
    "pre_vote_enabled": true,
    "priority_election": { "enabled": false, "node_priorities": {} },
    "leader_stickiness": { "enabled": false, "bonus_ms": 500 }
  }
}
```

All integer fields have minimums: `base_timeout_ms` >= 500, `jitter_range_ms` >= 100, `heartbeat_interval_ms` >= 50. Apply optimized settings via TypeScript:

```typescript
import { CortivexConsensus } from "@cortivex/consensus";

const consensus = new CortivexConsensus({
  clusterId: "prod-cluster-01",
  electionConfig: {
    baseTimeoutMs: 1500,
    jitterRangeMs: 750,
    heartbeatIntervalMs: 400,
    maxElectionRounds: 8,
    preVoteEnabled: true,
    priorityElection: {
      enabled: true,
      nodePriorities: { "node-1": 10, "node-2": 5, "node-3": 5 },
    },
    leaderStickiness: { enabled: true, bonusMs: 300 },
  },
});
```

The `heartbeat_interval_ms` must be significantly less than `base_timeout_ms` (recommended ratio: at least 1:3). Priority election biases leadership toward higher-priority nodes. Leader stickiness adds a timeout bonus to the current leader, reducing unnecessary re-elections from transient jitter.
