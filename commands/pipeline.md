---
name: pipeline
description: Create, list, or export Cortivex pipelines
---

Manage Cortivex AI agent pipelines.

## Usage

### Create a pipeline from description:
```
/pipeline create "Review code quality, scan for security issues, generate missing tests"
```

### List available pipelines:
```
/pipeline list
/pipeline list --templates
```

### Export a pipeline:
```
/pipeline export pr-review --format yaml
/pipeline export pr-review --format n8n
```

### Show pipeline details:
```
/pipeline show pr-review
```

## Pipeline creation:
When you create a pipeline from a description, Cortivex:
1. Analyzes your intent using 65+ keyword mappings
2. Selects appropriate node types from the 27 available
3. Builds a dependency DAG with optimal parallelism
4. Estimates cost and duration
5. Outputs valid YAML you can save and reuse
