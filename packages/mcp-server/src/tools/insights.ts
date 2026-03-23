/**
 * cortivex_insights — Get learning insights from past pipeline executions.
 */
import { LearningEngine, HistoryRecorder } from '@cortivex/core';

export interface InsightsInput {
  pipeline?: string;
}

export async function insightsTool(input: InsightsInput): Promise<{ content: Array<{ type: string; text: string }> }> {
  const recorder = new HistoryRecorder();
  const stats = await recorder.getStats();
  const insights = LearningEngine.getInsights(input.pipeline);

  const sections: string[] = [];

  // Stats summary
  sections.push([
    `Execution Statistics${input.pipeline ? ` (pipeline: ${input.pipeline})` : ''}:`,
    `  Total Runs: ${stats.totalRuns}`,
    `  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`,
    `  Average Cost: $${stats.averageCost.toFixed(4)}`,
    `  Total Cost: $${stats.totalCost.toFixed(4)}`,
    `  Average Duration: ${stats.averageDuration.toFixed(1)}s`,
    `  Most Used Pipeline: ${stats.mostUsedPipeline}`,
    `  Most Expensive Node: ${stats.mostExpensiveNode}`,
    `  Least Reliable Node: ${stats.leastReliableNode}`,
  ].join('\n'));

  // Insights
  if (insights.length > 0) {
    const insightLines = insights
      .sort((a, b) => b.confidence - a.confidence)
      .map((i) => {
        const confidence = `${(i.confidence * 100).toFixed(0)}%`;
        const action = i.action.replace(/_/g, ' ');
        return [
          `  [${confidence} confidence] ${i.description}`,
          `    Pattern: ${i.pattern}`,
          `    Suggested Action: ${action}`,
          `    Based on: ${i.basedOnRuns} runs`,
          `    Discovered: ${i.discoveredAt}`,
        ].join('\n');
      });
    sections.push(`Learning Insights (${insights.length}):\n${insightLines.join('\n\n')}`);
  } else {
    sections.push(
      'Learning Insights: none yet\n' +
      '  Run more pipelines to generate insights. The learning engine ' +
      'analyzes execution patterns across runs to surface cost optimizations, ' +
      'reliability improvements, and performance recommendations.',
    );
  }

  return {
    content: [{ type: 'text', text: sections.join('\n\n') }],
  };
}
