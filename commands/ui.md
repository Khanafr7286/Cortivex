---
name: ui
description: Start the Cortivex visual dashboard for pipeline design and execution monitoring
---

Launch the Cortivex visual dashboard.

## Usage

```
/ui
/ui --port 4200
```

## What it starts:
1. HTTP server on port 3939 (REST API + WebSocket)
2. Dashboard on port 4200 (React + Vite)
3. Opens browser to http://localhost:4200

## Dashboard views:
- Pipeline Editor -- drag nodes, connect ports, configure agents
- Live Execution -- real-time streaming terminal output per node
- Analytics -- cost, duration, success rate charts with learning insights
- Mesh Visualization -- file ownership treemap with conflict detection
- Knowledge Graph -- D3 force-directed graph of agent discoveries
- Timeline -- execution history with event feed
