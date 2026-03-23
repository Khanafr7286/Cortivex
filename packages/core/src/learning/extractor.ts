import { v4 as uuidv4 } from 'uuid';
import type {
  ExecutionRecord,
  Insight,
  InsightAction,
  NodeResult,
} from '../types.js';
import { HistoryRecorder } from './recorder.js';

const MIN_RUNS_FOR_INSIGHT = 3;
const HIGH_CONFIDENCE_THRESHOLD = 0.8;

interface GroupedResults {
  pipeline: string;
  language: string;
  nodeType: string;
  results: NodeResult[];
  executions: ExecutionRecord[];
}

export class PatternExtractor {
  private readonly recorder: HistoryRecorder;

  constructor(baseDir: string = process.cwd()) {
    this.recorder = new HistoryRecorder(baseDir);
  }

  /**
   * Analyze all execution history and extract actionable insights.
   */
  async analyze(): Promise<Insight[]> {
    const history = await this.recorder.getHistory();

    if (history.length < MIN_RUNS_FOR_INSIGHT) {
      return [];
    }

    const insights: Insight[] = [];

    // Group by pipeline, language, and node type
    const groups = this.groupExecutions(history);

    // Analyze each group for patterns
    insights.push(...this.findOrderPatterns(history));
    insights.push(...this.findModelSubstitutions(groups));
    insights.push(...this.findSkipPatterns(groups));
    insights.push(...this.findReliabilityPatterns(groups));
    insights.push(...this.findCostOptimizations(groups));
    insights.push(...this.findContextualPatterns(history));

    // Sort by confidence descending
    insights.sort((a, b) => b.confidence - a.confidence);

    return insights;
  }

  /**
   * Group executions by pipeline, language, and node type for analysis.
   */
  private groupExecutions(history: ExecutionRecord[]): GroupedResults[] {
    const groups = new Map<string, GroupedResults>();

    for (const record of history) {
      for (const nodeResult of record.nodeResults) {
        const language = record.repoContext.languages[0] ?? 'unknown';
        const key = `${record.pipeline}:${language}:${nodeResult.nodeType}`;

        if (!groups.has(key)) {
          groups.set(key, {
            pipeline: record.pipeline,
            language,
            nodeType: nodeResult.nodeType,
            results: [],
            executions: [],
          });
        }

        const group = groups.get(key)!;
        group.results.push(nodeResult);
        if (!group.executions.includes(record)) {
          group.executions.push(record);
        }
      }
    }

    return Array.from(groups.values());
  }

  /**
   * Find patterns where reordering nodes improves success rate.
   */
  private findOrderPatterns(history: ExecutionRecord[]): Insight[] {
    const insights: Insight[] = [];

    // Group by pipeline
    const pipelineRuns = new Map<string, ExecutionRecord[]>();
    for (const record of history) {
      const runs = pipelineRuns.get(record.pipeline) ?? [];
      runs.push(record);
      pipelineRuns.set(record.pipeline, runs);
    }

    for (const [pipeline, runs] of pipelineRuns.entries()) {
      if (runs.length < MIN_RUNS_FOR_INSIGHT) continue;

      // Check if security-first ordering correlates with higher success
      const securityFirstRuns = runs.filter((r) => {
        const nodeTypes = r.nodeResults.map((n) => n.nodeType);
        const securityIdx = nodeTypes.findIndex((t) =>
          t.includes('security')
        );
        const reviewIdx = nodeTypes.findIndex((t) => t.includes('review'));
        return securityIdx >= 0 && reviewIdx >= 0 && securityIdx < reviewIdx;
      });

      const reviewFirstRuns = runs.filter((r) => {
        const nodeTypes = r.nodeResults.map((n) => n.nodeType);
        const securityIdx = nodeTypes.findIndex((t) =>
          t.includes('security')
        );
        const reviewIdx = nodeTypes.findIndex((t) => t.includes('review'));
        return securityIdx >= 0 && reviewIdx >= 0 && reviewIdx < securityIdx;
      });

      if (
        securityFirstRuns.length >= 2 &&
        reviewFirstRuns.length >= 2
      ) {
        const securityFirstSuccess =
          securityFirstRuns.filter((r) => r.success).length /
          securityFirstRuns.length;
        const reviewFirstSuccess =
          reviewFirstRuns.filter((r) => r.success).length /
          reviewFirstRuns.length;

        if (securityFirstSuccess > reviewFirstSuccess + 0.1) {
          insights.push({
            id: uuidv4(),
            pattern: 'security-first-order',
            description: `Running security scanner before code reviewer in "${pipeline}" correlates with ${Math.round(securityFirstSuccess * 100)}% success rate vs ${Math.round(reviewFirstSuccess * 100)}%`,
            confidence: Math.min(
              securityFirstSuccess,
              securityFirstRuns.length / (securityFirstRuns.length + 2)
            ),
            basedOnRuns: securityFirstRuns.length + reviewFirstRuns.length,
            action: 'reorder' as InsightAction,
            details: {
              pipeline,
              suggestedOrder: ['security-scanner', 'code-reviewer'],
              securityFirstSuccessRate: securityFirstSuccess,
              reviewFirstSuccessRate: reviewFirstSuccess,
            },
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return insights;
  }

  /**
   * Find opportunities to substitute expensive models with cheaper ones
   * without losing quality.
   */
  private findModelSubstitutions(groups: GroupedResults[]): Insight[] {
    const insights: Insight[] = [];

    // Group results by node type across all models
    const nodeTypeModels = new Map<
      string,
      Map<string, { success: number; total: number; avgCost: number }>
    >();

    for (const group of groups) {
      for (const result of group.results) {
        if (!nodeTypeModels.has(group.nodeType)) {
          nodeTypeModels.set(group.nodeType, new Map());
        }
        const modelMap = nodeTypeModels.get(group.nodeType)!;

        if (!modelMap.has(result.model)) {
          modelMap.set(result.model, { success: 0, total: 0, avgCost: 0 });
        }
        const stats = modelMap.get(result.model)!;
        stats.total++;
        if (result.success) stats.success++;
        stats.avgCost =
          (stats.avgCost * (stats.total - 1) + result.cost) / stats.total;
      }
    }

    for (const [nodeType, modelMap] of nodeTypeModels.entries()) {
      const models = Array.from(modelMap.entries());

      // Find if a cheaper model has similar success rate to the expensive one
      for (let i = 0; i < models.length; i++) {
        for (let j = i + 1; j < models.length; j++) {
          const [modelA, statsA] = models[i];
          const [modelB, statsB] = models[j];

          if (statsA.total < 2 || statsB.total < 2) continue;

          const rateA = statsA.success / statsA.total;
          const rateB = statsB.success / statsB.total;

          // Check if cheaper model has comparable success rate
          const cheaper =
            statsA.avgCost < statsB.avgCost ? modelA : modelB;
          const expensive =
            statsA.avgCost < statsB.avgCost ? modelB : modelA;
          const cheaperStats =
            statsA.avgCost < statsB.avgCost ? statsA : statsB;
          const expensiveStats =
            statsA.avgCost < statsB.avgCost ? statsB : statsA;
          const cheaperRate =
            statsA.avgCost < statsB.avgCost ? rateA : rateB;
          const expensiveRate =
            statsA.avgCost < statsB.avgCost ? rateB : rateA;

          if (
            cheaperRate >= expensiveRate - 0.05 &&
            cheaperStats.avgCost < expensiveStats.avgCost * 0.7
          ) {
            const savings =
              ((expensiveStats.avgCost - cheaperStats.avgCost) /
                expensiveStats.avgCost) *
              100;

            insights.push({
              id: uuidv4(),
              pattern: 'model-substitution',
              description: `For "${nodeType}", ${cheaper} achieves ${Math.round(cheaperRate * 100)}% success rate (vs ${Math.round(expensiveRate * 100)}% for ${expensive}) at ${Math.round(savings)}% lower cost`,
              confidence: Math.min(
                cheaperRate,
                (cheaperStats.total + expensiveStats.total) /
                  (cheaperStats.total + expensiveStats.total + 4)
              ),
              basedOnRuns: cheaperStats.total + expensiveStats.total,
              action: 'substitute_model' as InsightAction,
              details: {
                nodeType,
                currentModel: expensive,
                suggestedModel: cheaper,
                costSavings: `${Math.round(savings)}%`,
                currentSuccessRate: expensiveRate,
                suggestedSuccessRate: cheaperRate,
              },
              discoveredAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return insights;
  }

  /**
   * Find nodes that can be skipped in certain contexts.
   */
  private findSkipPatterns(groups: GroupedResults[]): Insight[] {
    const insights: Insight[] = [];

    for (const group of groups) {
      if (group.results.length < MIN_RUNS_FOR_INSIGHT) continue;

      // Check if a node always produces empty/trivial output for certain contexts
      const emptyOutputs = group.results.filter(
        (r) => r.success && r.cost < 0.01
      );

      if (
        emptyOutputs.length / group.results.length >
        HIGH_CONFIDENCE_THRESHOLD
      ) {
        insights.push({
          id: uuidv4(),
          pattern: 'skip-trivial-node',
          description: `"${group.nodeType}" consistently produces minimal output for ${group.language} projects in "${group.pipeline}" — consider skipping`,
          confidence:
            emptyOutputs.length / group.results.length,
          basedOnRuns: group.results.length,
          action: 'skip_node' as InsightAction,
          details: {
            nodeType: group.nodeType,
            pipeline: group.pipeline,
            language: group.language,
            trivialRunPercentage:
              (emptyOutputs.length / group.results.length) * 100,
          },
          discoveredAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  /**
   * Find nodes with consistent failure patterns.
   */
  private findReliabilityPatterns(groups: GroupedResults[]): Insight[] {
    const insights: Insight[] = [];

    for (const group of groups) {
      if (group.results.length < MIN_RUNS_FOR_INSIGHT) continue;

      const failureRate =
        group.results.filter((r) => !r.success).length /
        group.results.length;

      if (failureRate > 0.3) {
        // Analyze common error patterns
        const errors = group.results
          .filter((r) => r.error)
          .map((r) => r.error!);

        const errorGroups = new Map<string, number>();
        for (const error of errors) {
          // Normalize error messages for grouping
          const normalized = error
            .replace(/\d+/g, 'N')
            .replace(/"[^"]*"/g, '"..."')
            .slice(0, 100);
          errorGroups.set(
            normalized,
            (errorGroups.get(normalized) ?? 0) + 1
          );
        }

        const topError = [...errorGroups.entries()].sort(
          (a, b) => b[1] - a[1]
        )[0];

        insights.push({
          id: uuidv4(),
          pattern: 'high-failure-rate',
          description: `"${group.nodeType}" fails ${Math.round(failureRate * 100)}% of the time for ${group.language} projects in "${group.pipeline}"${topError ? `. Common error: ${topError[0]}` : ''}`,
          confidence: Math.min(
            failureRate,
            group.results.length / (group.results.length + 2)
          ),
          basedOnRuns: group.results.length,
          action: 'skip_node' as InsightAction,
          details: {
            nodeType: group.nodeType,
            pipeline: group.pipeline,
            language: group.language,
            failureRate: failureRate * 100,
            commonErrors: Object.fromEntries(errorGroups),
          },
          discoveredAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  /**
   * Find cost optimization opportunities.
   */
  private findCostOptimizations(groups: GroupedResults[]): Insight[] {
    const insights: Insight[] = [];

    for (const group of groups) {
      if (group.results.length < MIN_RUNS_FOR_INSIGHT) continue;

      const avgCost =
        group.results.reduce((sum, r) => sum + r.cost, 0) /
        group.results.length;

      const avgDuration =
        group.results.reduce((sum, r) => sum + r.duration, 0) /
        group.results.length;

      // Check if node is disproportionately expensive relative to pipeline
      for (const exec of group.executions) {
        const totalCost = exec.totalCost;
        if (totalCost > 0 && avgCost / totalCost > 0.5) {
          insights.push({
            id: uuidv4(),
            pattern: 'cost-hotspot',
            description: `"${group.nodeType}" consumes ${Math.round((avgCost / totalCost) * 100)}% of total pipeline cost ($${avgCost.toFixed(3)} avg) in "${group.pipeline}"`,
            confidence: Math.min(
              0.9,
              group.results.length / (group.results.length + 2)
            ),
            basedOnRuns: group.results.length,
            action: 'substitute_model' as InsightAction,
            details: {
              nodeType: group.nodeType,
              pipeline: group.pipeline,
              avgCost: avgCost.toFixed(3),
              avgDuration: avgDuration.toFixed(1),
              costPercentage: ((avgCost / totalCost) * 100).toFixed(1),
            },
            discoveredAt: new Date().toISOString(),
          });
          break; // Only one insight per group for this pattern
        }
      }
    }

    return insights;
  }

  /**
   * Find patterns specific to repo context (language, framework, auth, etc.).
   */
  private findContextualPatterns(history: ExecutionRecord[]): Insight[] {
    const insights: Insight[] = [];

    // Group by whether repo has auth
    const authRuns = history.filter((r) => r.repoContext.hasAuth);
    const noAuthRuns = history.filter((r) => !r.repoContext.hasAuth);

    if (authRuns.length >= MIN_RUNS_FOR_INSIGHT) {
      const authSuccessRate =
        authRuns.filter((r) => r.success).length / authRuns.length;

      // Check if security scanner runs improve success rate for auth repos
      const authWithSecurity = authRuns.filter((r) =>
        r.nodeResults.some((n) => n.nodeType.includes('security'))
      );
      const authWithoutSecurity = authRuns.filter(
        (r) => !r.nodeResults.some((n) => n.nodeType.includes('security'))
      );

      if (
        authWithSecurity.length >= 2 &&
        authWithoutSecurity.length >= 2
      ) {
        const withSecRate =
          authWithSecurity.filter((r) => r.success).length /
          authWithSecurity.length;
        const withoutSecRate =
          authWithoutSecurity.filter((r) => r.success).length /
          authWithoutSecurity.length;

        if (withSecRate > withoutSecRate + 0.15) {
          insights.push({
            id: uuidv4(),
            pattern: 'auth-needs-security',
            description: `Repos with authentication have ${Math.round(withSecRate * 100)}% success rate when security scanner is included vs ${Math.round(withoutSecRate * 100)}% without`,
            confidence: Math.min(
              withSecRate,
              (authWithSecurity.length + authWithoutSecurity.length) /
                (authWithSecurity.length +
                  authWithoutSecurity.length +
                  4)
            ),
            basedOnRuns:
              authWithSecurity.length + authWithoutSecurity.length,
            action: 'add_node' as InsightAction,
            details: {
              suggestedNode: 'security-scanner',
              condition: 'repo has authentication',
              withSecuritySuccessRate: withSecRate,
              withoutSecuritySuccessRate: withoutSecRate,
            },
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    // Check framework-specific patterns
    const frameworkRuns = new Map<string, ExecutionRecord[]>();
    for (const record of history) {
      const framework = record.repoContext.framework ?? 'none';
      const runs = frameworkRuns.get(framework) ?? [];
      runs.push(record);
      frameworkRuns.set(framework, runs);
    }

    for (const [framework, runs] of frameworkRuns.entries()) {
      if (framework === 'none' || runs.length < MIN_RUNS_FOR_INSIGHT)
        continue;

      const successRate =
        runs.filter((r) => r.success).length / runs.length;
      const overallRate =
        history.filter((r) => r.success).length / history.length;

      if (successRate < overallRate - 0.15) {
        insights.push({
          id: uuidv4(),
          pattern: 'framework-difficulty',
          description: `${framework} projects have ${Math.round(successRate * 100)}% success rate vs ${Math.round(overallRate * 100)}% overall — may need additional configuration`,
          confidence: Math.min(
            0.8,
            runs.length / (runs.length + 3)
          ),
          basedOnRuns: runs.length,
          action: 'add_node' as InsightAction,
          details: {
            framework,
            frameworkSuccessRate: successRate,
            overallSuccessRate: overallRate,
          },
          discoveredAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }
}
