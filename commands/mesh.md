---
name: mesh
description: Query and manage mesh coordination state between concurrent agents
---

View and manage the Cortivex mesh coordination layer.

## Usage

### Check mesh state:
```
/mesh status
```

### View active claims:
```
/mesh claims
```

### Check for conflicts:
```
/mesh conflicts
```

### Clean up stale claims:
```
/mesh cleanup
```

## What mesh coordination does:
- Agents claim files before editing to prevent conflicts
- Claims are stored as JSON files in .cortivex/mesh/
- Conflict detection when two agents try to claim the same file
- Automatic cleanup of stale claims (30+ minutes old)
- MeshResolver node handles conflict resolution strategies
- Zero infrastructure required -- works on any filesystem
