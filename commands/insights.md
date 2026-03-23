---
name: insights
description: Show learned patterns and optimization suggestions from pipeline execution history
---

View what Cortivex has learned from your pipeline executions.

## Usage

```
/insights
/insights --category cost
/insights --category reliability
/insights --category performance
```

## What it shows:
- Patterns detected from execution history (cost, reliability, performance, ordering)
- Confidence scores for each insight
- Actionable suggestions (reorder nodes, substitute models, skip unnecessary nodes)
- Before/after comparison (first 10 runs vs last 10 runs)
- Total cost savings achieved

## Example insights:
- "Haiku achieves same lint quality as Sonnet at 80% less cost" (confidence: 94%)
- "Running SecurityScanner before CodeReviewer catches 40% more issues" (confidence: 91%)
- "Skipping dead-code-remover on repos under 1000 LOC saves 22s avg" (confidence: 87%)
