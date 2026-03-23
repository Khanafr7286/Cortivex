import type {
  PipelineDefinition,
  PipelineNode,
  PipelineConnection,
  ExecutionRecord,
  Insight,
  MeshClaim,
  MeshConflict,
  MeshEvent,
  NodeType,
  NodeCategory,
  Suggestion,
  NodeStatus,
} from './types';

// ============================================
// NODE TYPE CATALOG
// ============================================

export const nodeTypeCatalog: NodeType[] = [
  // Quality
  { id: 'code-reviewer', name: 'Code Reviewer', category: 'quality', icon: 'Eye', description: 'Deep code review with style, logic, and best-practice analysis', avgCost: 0.82, avgRuntime: 180, defaultModel: 'claude-sonnet-4' },
  { id: 'lint-fixer', name: 'Lint Fixer', category: 'quality', icon: 'Wrench', description: 'Auto-fix linting issues across the codebase', avgCost: 0.15, avgRuntime: 45, defaultModel: 'claude-haiku-3.5' },
  { id: 'type-checker', name: 'Type Checker', category: 'quality', icon: 'CheckCircle', description: 'Verify and improve TypeScript type annotations', avgCost: 0.35, avgRuntime: 90, defaultModel: 'claude-sonnet-4' },

  // Security
  { id: 'security-scanner', name: 'Security Scanner', category: 'security', icon: 'Shield', description: 'Scan for vulnerabilities, injections, and auth issues', avgCost: 0.95, avgRuntime: 240, defaultModel: 'claude-opus-4' },
  { id: 'dependency-auditor', name: 'Dep Auditor', category: 'security', icon: 'Package', description: 'Audit dependencies for known CVEs and license issues', avgCost: 0.20, avgRuntime: 60, defaultModel: 'claude-haiku-3.5' },
  { id: 'secret-detector', name: 'Secret Detector', category: 'security', icon: 'Key', description: 'Find hardcoded secrets, API keys, and credentials', avgCost: 0.12, avgRuntime: 30, defaultModel: 'claude-haiku-3.5' },

  // Testing
  { id: 'test-generator', name: 'Test Generator', category: 'testing', icon: 'FlaskConical', description: 'Generate comprehensive unit and integration tests', avgCost: 0.75, avgRuntime: 200, defaultModel: 'claude-sonnet-4' },
  { id: 'test-runner', name: 'Test Runner', category: 'testing', icon: 'Play', description: 'Execute test suites and report coverage', avgCost: 0.05, avgRuntime: 120, defaultModel: 'claude-haiku-3.5' },
  { id: 'mutation-tester', name: 'Mutation Tester', category: 'testing', icon: 'Bug', description: 'Run mutation testing to verify test quality', avgCost: 0.45, avgRuntime: 300, defaultModel: 'claude-sonnet-4' },

  // DevOps
  { id: 'ci-optimizer', name: 'CI Optimizer', category: 'devops', icon: 'Workflow', description: 'Optimize CI/CD pipeline configuration', avgCost: 0.30, avgRuntime: 60, defaultModel: 'claude-sonnet-4' },
  { id: 'docker-analyzer', name: 'Docker Analyzer', category: 'devops', icon: 'Container', description: 'Analyze and optimize Dockerfiles and compose configs', avgCost: 0.25, avgRuntime: 45, defaultModel: 'claude-sonnet-4' },

  // Docs
  { id: 'doc-generator', name: 'Doc Generator', category: 'docs', icon: 'FileText', description: 'Generate API docs, JSDoc, and README updates', avgCost: 0.55, avgRuntime: 150, defaultModel: 'claude-sonnet-4' },
  { id: 'changelog-writer', name: 'Changelog Writer', category: 'docs', icon: 'ScrollText', description: 'Auto-generate changelogs from git history', avgCost: 0.18, avgRuntime: 40, defaultModel: 'claude-haiku-3.5' },

  // Refactoring
  { id: 'refactor-engine', name: 'Refactor Engine', category: 'refactoring', icon: 'Layers', description: 'Automated code refactoring with pattern detection', avgCost: 1.20, avgRuntime: 300, defaultModel: 'claude-opus-4' },
  { id: 'dead-code-remover', name: 'Dead Code Remover', category: 'refactoring', icon: 'Trash2', description: 'Detect and remove unreachable/dead code', avgCost: 0.22, avgRuntime: 60, defaultModel: 'claude-sonnet-4' },

  // Analysis
  { id: 'complexity-analyzer', name: 'Complexity Analyzer', category: 'analysis', icon: 'BarChart3', description: 'Cyclomatic complexity and maintainability analysis', avgCost: 0.28, avgRuntime: 75, defaultModel: 'claude-sonnet-4' },
  { id: 'architecture-reviewer', name: 'Architecture Reviewer', category: 'analysis', icon: 'Network', description: 'Review overall architecture patterns and coupling', avgCost: 1.50, avgRuntime: 360, defaultModel: 'claude-opus-4' },

  // Orchestration (SWARM-inspired)
  { id: 'swarm-coordinator', name: 'Swarm Coordinator', category: 'orchestration', icon: 'Network', description: 'Bootstrap and orchestrate a distributed SWARM cluster', avgCost: 0.50, avgRuntime: 30, defaultModel: 'claude-sonnet-4' },
  { id: 'task-decomposer', name: 'Task Decomposer', category: 'orchestration', icon: 'Layers', description: 'Break complex work into atomic parallel tasks', avgCost: 0.40, avgRuntime: 45, defaultModel: 'claude-sonnet-4' },
  { id: 'knowledge-curator', name: 'Knowledge Curator', category: 'orchestration', icon: 'Eye', description: 'Shared knowledge graph to prevent duplicate work', avgCost: 0.60, avgRuntime: 60, defaultModel: 'claude-sonnet-4' },
  { id: 'agent-monitor', name: 'Agent Monitor', category: 'orchestration', icon: 'BarChart3', description: 'Health watchdog with auto-respawn and cost tracking', avgCost: 0.10, avgRuntime: 15, defaultModel: 'claude-haiku-3.5' },
  { id: 'consensus-manager', name: 'Consensus Manager', category: 'orchestration', icon: 'Shield', description: 'Raft-style leader election for multi-node clusters', avgCost: 0.30, avgRuntime: 20, defaultModel: 'claude-sonnet-4' },
  { id: 'pipeline-generator', name: 'Pipeline Generator', category: 'orchestration', icon: 'Workflow', description: 'Generate pipeline YAML from natural language', avgCost: 0.40, avgRuntime: 30, defaultModel: 'claude-sonnet-4' },
  { id: 'mesh-resolver', name: 'Mesh Resolver', category: 'orchestration', icon: 'Network', description: 'Resolve file conflicts between concurrent agents', avgCost: 0.50, avgRuntime: 60, defaultModel: 'claude-sonnet-4' },
];

export const nodeTypesByCategory: Record<NodeCategory, NodeType[]> = {
  quality: nodeTypeCatalog.filter((n) => n.category === 'quality'),
  security: nodeTypeCatalog.filter((n) => n.category === 'security'),
  testing: nodeTypeCatalog.filter((n) => n.category === 'testing'),
  devops: nodeTypeCatalog.filter((n) => n.category === 'devops'),
  docs: nodeTypeCatalog.filter((n) => n.category === 'docs'),
  refactoring: nodeTypeCatalog.filter((n) => n.category === 'refactoring'),
  analysis: nodeTypeCatalog.filter((n) => n.category === 'analysis'),
  orchestration: nodeTypeCatalog.filter((n) => n.category === 'orchestration'),
};

// ============================================
// HELPER: create a pipeline node
// ============================================

function makeNode(
  id: string,
  typeId: string,
  position: { x: number; y: number },
  overrides?: Partial<PipelineNode>,
): PipelineNode {
  const nodeType = nodeTypeCatalog.find((nt) => nt.id === typeId)!;
  return {
    id,
    typeId,
    name: nodeType.name,
    category: nodeType.category,
    icon: nodeType.icon,
    position,
    model: nodeType.defaultModel,
    temperature: 0.3,
    instructions: '',
    dependsOn: [],
    condition: '',
    status: 'idle',
    progress: 0,
    output: '',
    duration: 0,
    cost: 0,
    tokensUsed: 0,
    filesModified: [],
    ...overrides,
  };
}

function makeConnection(
  sourceId: string,
  targetId: string,
): PipelineConnection {
  return {
    id: `${sourceId}->${targetId}`,
    sourceId,
    targetId,
    animated: false,
  };
}

// ============================================
// DEMO PIPELINES
// ============================================

const prReviewPipeline: PipelineDefinition = {
  name: 'pr-review',
  description: 'Comprehensive PR review pipeline with security, quality, and documentation checks',
  nodes: [
    makeNode('lint', 'lint-fixer', { x: 80, y: 120 }),
    makeNode('types', 'type-checker', { x: 80, y: 320 }),
    makeNode('secrets', 'secret-detector', { x: 400, y: 40 }),
    makeNode('security', 'security-scanner', { x: 400, y: 240 }, { dependsOn: ['lint', 'secrets'] }),
    makeNode('review', 'code-reviewer', { x: 400, y: 440 }, { dependsOn: ['lint', 'types'] }),
    makeNode('tests', 'test-generator', { x: 720, y: 140 }, { dependsOn: ['security', 'review'] }),
    makeNode('docs', 'doc-generator', { x: 720, y: 380 }, { dependsOn: ['review'] }),
    makeNode('changelog', 'changelog-writer', { x: 1040, y: 260 }, { dependsOn: ['tests', 'docs'] }),
  ],
  connections: [
    makeConnection('lint', 'security'),
    makeConnection('secrets', 'security'),
    makeConnection('lint', 'review'),
    makeConnection('types', 'review'),
    makeConnection('security', 'tests'),
    makeConnection('review', 'tests'),
    makeConnection('review', 'docs'),
    makeConnection('tests', 'changelog'),
    makeConnection('docs', 'changelog'),
  ],
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-20T14:30:00Z',
};

const securityAuditPipeline: PipelineDefinition = {
  name: 'security-audit',
  description: 'Deep security audit for production-ready applications',
  nodes: [
    makeNode('deps', 'dependency-auditor', { x: 80, y: 80 }),
    makeNode('secrets', 'secret-detector', { x: 80, y: 300 }),
    makeNode('scanner', 'security-scanner', { x: 420, y: 190 }, { dependsOn: ['deps', 'secrets'], model: 'claude-opus-4' }),
    makeNode('arch', 'architecture-reviewer', { x: 760, y: 80 }, { dependsOn: ['scanner'] }),
    makeNode('report', 'doc-generator', { x: 760, y: 300 }, { dependsOn: ['scanner'], instructions: 'Generate security report in markdown format' }),
  ],
  connections: [
    makeConnection('deps', 'scanner'),
    makeConnection('secrets', 'scanner'),
    makeConnection('scanner', 'arch'),
    makeConnection('scanner', 'report'),
  ],
  createdAt: '2026-02-15T08:00:00Z',
  updatedAt: '2026-03-18T11:00:00Z',
};

const fullTestSuitePipeline: PipelineDefinition = {
  name: 'full-test-suite',
  description: 'End-to-end test generation and validation with mutation testing',
  nodes: [
    makeNode('complexity', 'complexity-analyzer', { x: 80, y: 180 }),
    makeNode('testgen', 'test-generator', { x: 420, y: 60 }, { dependsOn: ['complexity'] }),
    makeNode('refactor', 'refactor-engine', { x: 420, y: 300 }, { dependsOn: ['complexity'] }),
    makeNode('runner', 'test-runner', { x: 760, y: 60 }, { dependsOn: ['testgen'] }),
    makeNode('mutation', 'mutation-tester', { x: 760, y: 300 }, { dependsOn: ['testgen', 'refactor'] }),
    makeNode('dead-code', 'dead-code-remover', { x: 1100, y: 180 }, { dependsOn: ['runner', 'mutation'] }),
  ],
  connections: [
    makeConnection('complexity', 'testgen'),
    makeConnection('complexity', 'refactor'),
    makeConnection('testgen', 'runner'),
    makeConnection('testgen', 'mutation'),
    makeConnection('refactor', 'mutation'),
    makeConnection('runner', 'dead-code'),
    makeConnection('mutation', 'dead-code'),
  ],
  createdAt: '2026-03-10T09:00:00Z',
  updatedAt: '2026-03-21T16:00:00Z',
};

const devTeamPipeline: PipelineDefinition = {
  name: 'dev-team',
  description: 'Software engineering team — Architect designs, Developer builds, Tester validates, Reviewer approves',
  nodes: [
    makeNode('architect', 'architecture-reviewer', { x: 80, y: 150 }, { name: 'Architect', model: 'claude-sonnet-4' }),
    makeNode('developer', 'code-reviewer', { x: 400, y: 150 }, { name: 'Developer', model: 'claude-sonnet-4', dependsOn: ['architect'] }),
    makeNode('tester', 'test-generator', { x: 720, y: 150 }, { name: 'Tester', model: 'claude-sonnet-4', dependsOn: ['developer'] }),
    makeNode('reviewer', 'code-reviewer', { x: 1040, y: 150 }, { name: 'Reviewer', model: 'claude-sonnet-4', dependsOn: ['tester'] }),
  ],
  connections: [
    makeConnection('architect', 'developer'),
    makeConnection('developer', 'tester'),
    makeConnection('tester', 'reviewer'),
  ],
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-22T16:00:00Z',
};

// SWARM Orchestration pipeline — leader election + knowledge coordination
const swarmOrchestrationPipeline: PipelineDefinition = {
  name: 'swarm-orchestration',
  description: 'Distributed multi-agent orchestration with leader election, knowledge sharing, and health monitoring',
  nodes: [
    makeNode('coordinator', 'swarm-coordinator', { x: 80, y: 180 }, { name: 'Swarm Coordinator' }),
    makeNode('decomposer', 'task-decomposer', { x: 400, y: 80 }, { name: 'Task Decomposer', dependsOn: ['coordinator'] }),
    makeNode('monitor', 'agent-monitor', { x: 400, y: 280 }, { name: 'Agent Monitor', dependsOn: ['coordinator'] }),
    makeNode('consensus', 'consensus-manager', { x: 720, y: 80 }, { name: 'Consensus Manager', dependsOn: ['decomposer'] }),
    makeNode('curator', 'knowledge-curator', { x: 720, y: 280 }, { name: 'Knowledge Curator', dependsOn: ['decomposer', 'monitor'] }),
    makeNode('resolver', 'mesh-resolver', { x: 1040, y: 180 }, { name: 'Mesh Resolver', dependsOn: ['consensus', 'curator'] }),
  ],
  connections: [
    makeConnection('coordinator', 'decomposer'),
    makeConnection('coordinator', 'monitor'),
    makeConnection('decomposer', 'consensus'),
    makeConnection('decomposer', 'curator'),
    makeConnection('monitor', 'curator'),
    makeConnection('consensus', 'resolver'),
    makeConnection('curator', 'resolver'),
  ],
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-22T16:00:00Z',
};

// Documentation refresh pipeline
const docRefreshPipeline: PipelineDefinition = {
  name: 'doc-refresh',
  description: 'Analyze codebase and regenerate all documentation with API docs and changelog',
  nodes: [
    makeNode('analyze', 'architecture-reviewer', { x: 80, y: 160 }, { name: 'Architecture Analyzer' }),
    makeNode('docs', 'doc-generator', { x: 420, y: 60 }, { name: 'Doc Generator', dependsOn: ['analyze'] }),
    makeNode('changelog', 'changelog-writer', { x: 420, y: 260 }, { name: 'Changelog Writer', dependsOn: ['analyze'] }),
    makeNode('pr', 'ci-optimizer', { x: 760, y: 160 }, { name: 'PR Creator', dependsOn: ['docs', 'changelog'] }),
  ],
  connections: [
    makeConnection('analyze', 'docs'),
    makeConnection('analyze', 'changelog'),
    makeConnection('docs', 'pr'),
    makeConnection('changelog', 'pr'),
  ],
  createdAt: '2026-03-15T08:00:00Z',
  updatedAt: '2026-03-22T12:00:00Z',
};

// Bug hunt pipeline
const bugHuntPipeline: PipelineDefinition = {
  name: 'bug-hunt',
  description: 'Systematic bug detection with automated fixes and regression test generation',
  nodes: [
    makeNode('scan', 'security-scanner', { x: 80, y: 160 }, { name: 'Vulnerability Scan' }),
    makeNode('review', 'code-reviewer', { x: 420, y: 60 }, { name: 'Code Review', dependsOn: ['scan'] }),
    makeNode('fix', 'lint-fixer', { x: 420, y: 260 }, { name: 'Auto Fixer', dependsOn: ['scan'] }),
    makeNode('test', 'test-generator', { x: 760, y: 160 }, { name: 'Test Generator', dependsOn: ['review', 'fix'] }),
  ],
  connections: [
    makeConnection('scan', 'review'),
    makeConnection('scan', 'fix'),
    makeConnection('review', 'test'),
    makeConnection('fix', 'test'),
  ],
  createdAt: '2026-03-12T14:00:00Z',
  updatedAt: '2026-03-22T10:00:00Z',
};

export const demoPipelines: PipelineDefinition[] = [
  devTeamPipeline,
  prReviewPipeline,
  securityAuditPipeline,
  fullTestSuitePipeline,
  swarmOrchestrationPipeline,
  docRefreshPipeline,
  bugHuntPipeline,
];

// ============================================
// EXECUTION HISTORY (50 runs)
// ============================================

function generateHistory(): ExecutionRecord[] {
  const records: ExecutionRecord[] = [];
  const baseDate = new Date('2026-02-20T10:00:00Z');

  for (let i = 0; i < 50; i++) {
    const runDate = new Date(baseDate.getTime() + i * 6 * 3600 * 1000);
    const isEarly = i < 10;
    const isMid = i >= 10 && i < 30;

    // Show improvement over time
    const successBase = isEarly ? 0.6 : isMid ? 0.78 : 0.92;
    const success = Math.random() < successBase;

    const costBase = isEarly ? 3.5 : isMid ? 2.8 : 2.1;
    const cost = costBase + (Math.random() - 0.5) * 1.2;

    const durationBase = isEarly ? 420 : isMid ? 340 : 260;
    const duration = durationBase + (Math.random() - 0.5) * 120;

    const pipelineNames = ['pr-review', 'security-audit', 'full-test-suite', 'swarm-orchestration'];

    records.push({
      id: `run-${i + 1}`,
      pipelineName: pipelineNames[i % 4],
      runNumber: i + 1,
      timestamp: runDate.toISOString(),
      duration: Math.max(60, duration),
      cost: Math.max(0.5, cost),
      tokensUsed: Math.round(cost * 40000 + Math.random() * 10000),
      success,
      nodesRun: success ? 8 : Math.floor(Math.random() * 5) + 2,
      nodesFailed: success ? 0 : Math.floor(Math.random() * 2) + 1,
      filesModified: success ? Math.floor(Math.random() * 15) + 3 : Math.floor(Math.random() * 5),
    });
  }

  return records;
}

export const demoHistory: ExecutionRecord[] = generateHistory();

// ============================================
// INSIGHTS
// ============================================

export const demoInsights: Insight[] = [
  {
    id: 'ins-1',
    action: 'reorder',
    pattern: 'Security-first review catches 3x more issues on auth-heavy repos',
    description: 'Running SecurityScanner before CodeReviewer results in significantly more actionable findings when the PR touches authentication or authorization code.',
    confidence: 0.94,
    basedOnRuns: 28,
    discoveredAt: '2026-03-15T10:00:00Z',
    impact: '+40% issue detection rate',
    category: 'security',
  },
  {
    id: 'ins-2',
    action: 'substitute_model',
    pattern: 'Haiku achieves same lint-fix quality as Sonnet at 80% less cost',
    description: 'For LintFixer nodes, Claude Haiku 3.5 produces identical fixes to Sonnet in 95% of cases. Switching saves $0.67 per run with no quality loss.',
    confidence: 0.91,
    basedOnRuns: 42,
    discoveredAt: '2026-03-12T14:00:00Z',
    impact: '-60% cost per lint pass',
    category: 'quality',
  },
  {
    id: 'ins-3',
    action: 'skip_node',
    pattern: 'Dead code removal unnecessary on repos with <1000 LOC',
    description: 'DeadCodeRemover consistently finds zero issues on smaller codebases. Skipping it saves time and cost without affecting quality.',
    confidence: 0.87,
    basedOnRuns: 15,
    discoveredAt: '2026-03-10T09:00:00Z',
    impact: '-22s avg runtime',
    category: 'refactoring',
  },
  {
    id: 'ins-4',
    action: 'add_node',
    pattern: 'Adding TypeChecker before CodeReviewer reduces review iterations by 50%',
    description: 'When TypeChecker runs first and fixes type errors, the subsequent CodeReviewer produces significantly fewer false-positive suggestions.',
    confidence: 0.89,
    basedOnRuns: 31,
    discoveredAt: '2026-03-08T16:00:00Z',
    impact: '-50% review iterations',
    category: 'quality',
  },
  {
    id: 'ins-5',
    action: 'adjust_temperature',
    pattern: 'Lower temperature (0.1) for SecurityScanner reduces false positives by 35%',
    description: 'SecurityScanner with temperature 0.1 is more precise in vulnerability detection while maintaining the same recall rate.',
    confidence: 0.93,
    basedOnRuns: 36,
    discoveredAt: '2026-03-05T11:00:00Z',
    impact: '-35% false positives',
    category: 'security',
  },
  {
    id: 'ins-6',
    action: 'reorder',
    pattern: 'Parallel lint + type-check saves 40% vs sequential execution',
    description: 'LintFixer and TypeChecker have no data dependency. Running them in parallel reduces total pipeline duration significantly.',
    confidence: 0.96,
    basedOnRuns: 45,
    discoveredAt: '2026-03-02T13:00:00Z',
    impact: '-45s avg runtime',
    category: 'quality',
  },
  {
    id: 'ins-7',
    action: 'substitute_model',
    pattern: 'Opus provides 20% better architecture reviews but 5x the cost',
    description: 'For ArchitectureReviewer nodes, Claude Opus finds deeper architectural issues. Consider using Opus only for critical production repos.',
    confidence: 0.85,
    basedOnRuns: 18,
    discoveredAt: '2026-02-28T08:00:00Z',
    impact: '+20% finding depth',
    category: 'analysis',
  },
  {
    id: 'ins-8',
    action: 'modify_prompt',
    pattern: 'Adding "focus on error handling" to TestGenerator increases coverage by 15%',
    description: 'Tests generated with explicit error-handling focus achieve significantly higher branch coverage on try/catch blocks.',
    confidence: 0.88,
    basedOnRuns: 22,
    discoveredAt: '2026-02-25T15:00:00Z',
    impact: '+15% branch coverage',
    category: 'testing',
  },
  {
    id: 'ins-9',
    action: 'reorder',
    pattern: 'Parallel execution with SwarmCoordinator reduces pipeline time by 40%',
    description: 'Distributing tasks across 5 SWARM agents with TaskDecomposer enables true parallel execution, cutting total pipeline duration from 420s to 252s on average.',
    confidence: 0.95,
    basedOnRuns: 32,
    discoveredAt: '2026-03-18T10:00:00Z',
    impact: '-40% pipeline duration',
    category: 'orchestration',
  },
  {
    id: 'ins-10',
    action: 'add_node',
    pattern: 'AgentMonitor auto-respawn prevents 95% of pipeline failures',
    description: 'Adding AgentMonitor with 90-second health checks and auto-respawn reduced pipeline failures from 22% to 1.1%. Dead agents are replaced within 5 seconds.',
    confidence: 0.97,
    basedOnRuns: 48,
    discoveredAt: '2026-03-16T14:00:00Z',
    impact: '-95% failure rate',
    category: 'orchestration',
  },
  {
    id: 'ins-11',
    action: 'skip_node',
    pattern: 'KnowledgeCurator prevents 60% duplicate analysis across agents',
    description: 'Shared knowledge graph deduplicates findings in real-time. Without it, 3+ agents frequently re-discover the same issues, wasting tokens and time.',
    confidence: 0.92,
    basedOnRuns: 36,
    discoveredAt: '2026-03-14T09:00:00Z',
    impact: '-60% duplicate work',
    category: 'orchestration',
  },
  {
    id: 'ins-12',
    action: 'substitute_model',
    pattern: 'ConsensusManager leader election stabilizes multi-agent coordination',
    description: 'Raft-style leader election with ConsensusManager eliminates split-brain scenarios. Leaderless runs had 3x more merge conflicts and 45% longer resolution times.',
    confidence: 0.90,
    basedOnRuns: 25,
    discoveredAt: '2026-03-12T11:00:00Z',
    impact: '-70% merge conflicts',
    category: 'orchestration',
  },
  {
    id: 'ins-13',
    action: 'adjust_temperature',
    pattern: 'MeshResolver priority-based strategy resolves 92% of conflicts automatically',
    description: 'Setting MeshResolver to priority-based mode (leader wins) auto-resolves most file conflicts without human intervention. Timestamp-based mode only resolves 61%.',
    confidence: 0.93,
    basedOnRuns: 40,
    discoveredAt: '2026-03-10T16:00:00Z',
    impact: '+92% auto-resolution',
    category: 'orchestration',
  },
];

// ============================================
// MESH STATE
// ============================================

export const demoMeshClaims: MeshClaim[] = [
  {
    agentId: 'agent-coordinator',
    agentName: 'SwarmCoordinator',
    nodeType: 'orchestration',
    files: ['src/pipeline/swarm.ts', 'src/pipeline/config.ts'],
    claimedAt: '2026-03-22T10:28:00Z',
    status: 'active',
    action: 'Bootstrapping SWARM cluster (5 agents)',
    role: 'coordinator',
    tokensUsed: 8500,
  },
  {
    agentId: 'agent-consensus',
    agentName: 'ConsensusManager',
    nodeType: 'orchestration',
    files: ['src/pipeline/leader.ts', 'src/pipeline/raft.ts'],
    claimedAt: '2026-03-22T10:28:30Z',
    status: 'active',
    action: 'Elected node-alpha as leader (term 3)',
    role: 'coordinator',
    tokensUsed: 4200,
  },
  {
    agentId: 'node-alpha',
    agentName: 'Agent-Alpha',
    nodeType: 'quality',
    files: ['src/auth/login.ts', 'src/auth/session.ts', 'src/auth/middleware.ts'],
    claimedAt: '2026-03-22T10:30:00Z',
    status: 'active',
    action: 'Reviewing authentication flow (leader)',
    role: 'leader',
    tokensUsed: 45800,
  },
  {
    agentId: 'node-beta-2',
    agentName: 'Agent-Beta-2',
    nodeType: 'security',
    files: ['src/api/routes.ts', 'src/api/middleware.ts', 'src/auth/session.ts'],
    claimedAt: '2026-03-22T10:33:15Z',
    status: 'conflict',
    action: 'Scanning for injections (respawned)',
    role: 'follower',
    tokensUsed: 12300,
  },
  {
    agentId: 'node-gamma',
    agentName: 'Agent-Gamma',
    nodeType: 'testing',
    files: ['src/utils/helpers.ts', 'src/utils/validators.ts', 'tests/helpers.test.ts', 'tests/auth.test.ts'],
    claimedAt: '2026-03-22T10:32:00Z',
    status: 'active',
    action: 'Generating tests (+3 rebalanced tasks)',
    role: 'follower',
    tokensUsed: 38900,
  },
  {
    agentId: 'node-delta',
    agentName: 'Agent-Delta',
    nodeType: 'docs',
    files: ['docs/API.md', 'README.md', 'CHANGELOG.md'],
    claimedAt: '2026-03-22T10:32:30Z',
    status: 'active',
    action: 'Generating documentation updates',
    role: 'follower',
    tokensUsed: 22100,
  },
  {
    agentId: 'agent-monitor',
    agentName: 'AgentMonitor',
    nodeType: 'orchestration',
    files: ['src/pipeline/health.ts', 'src/pipeline/metrics.ts'],
    claimedAt: '2026-03-22T10:28:15Z',
    status: 'active',
    action: 'Health watchdog — monitoring 5 agents',
    role: 'monitor',
    tokensUsed: 3100,
  },
  {
    agentId: 'agent-curator',
    agentName: 'KnowledgeCurator',
    nodeType: 'orchestration',
    files: ['src/pipeline/knowledge.ts', 'src/pipeline/dedup.ts'],
    claimedAt: '2026-03-22T10:34:00Z',
    status: 'active',
    action: 'Merged 12 findings from 3 agents',
    role: 'coordinator',
    tokensUsed: 18600,
  },
];

export const demoMeshConflicts: MeshConflict[] = [
  {
    id: 'conflict-1',
    file: 'src/auth/session.ts',
    agents: ['node-alpha', 'node-beta-2'],
    resolvedAt: '2026-03-22T10:34:30Z',
    resolution: 'MeshResolver applied priority-based merge (leader Agent-Alpha wins)',
  },
  {
    id: 'conflict-2',
    file: 'src/api/routes.ts',
    agents: ['node-beta-2', 'node-gamma'],
    resolvedAt: null,
    resolution: null,
  },
  {
    id: 'conflict-3',
    file: 'src/auth/middleware.ts',
    agents: ['node-alpha', 'node-beta-2'],
    resolvedAt: '2026-03-22T10:35:00Z',
    resolution: 'MeshResolver merged changes (no overlapping edits)',
  },
];

export const demoMeshEvents: MeshEvent[] = [
  // SWARM bootstrap & leader election
  { id: 'evt-1', type: 'broadcast', agentName: 'SwarmCoordinator', file: '*', timestamp: '2026-03-22T10:28:00Z', details: 'SWARM cluster bootstrap initiated — spawning 5 agents' },
  { id: 'evt-2', type: 'broadcast', agentName: 'ConsensusManager', file: '*', timestamp: '2026-03-22T10:28:10Z', details: 'Leader election started (Raft term 3)' },
  { id: 'evt-3', type: 'broadcast', agentName: 'ConsensusManager', file: '*', timestamp: '2026-03-22T10:28:15Z', details: 'Quorum achieved (3/5 nodes) — node-alpha elected leader' },
  { id: 'evt-4', type: 'claim', agentName: 'AgentMonitor', file: 'src/pipeline/health.ts', timestamp: '2026-03-22T10:28:15Z', details: 'Health watchdog active — monitoring 5 agents (90s timeout)' },
  { id: 'evt-5', type: 'broadcast', agentName: 'TaskDecomposer', file: '*', timestamp: '2026-03-22T10:28:30Z', details: 'Decomposed pipeline into 12 atomic tasks across 5 agents' },

  // Agent file claims
  { id: 'evt-6', type: 'claim', agentName: 'Agent-Alpha', file: 'src/auth/login.ts', timestamp: '2026-03-22T10:30:00Z', details: 'Claimed for code review (leader)' },
  { id: 'evt-7', type: 'claim', agentName: 'Agent-Alpha', file: 'src/auth/session.ts', timestamp: '2026-03-22T10:30:01Z', details: 'Claimed for code review' },
  { id: 'evt-8', type: 'claim', agentName: 'Agent-Beta', file: 'src/api/routes.ts', timestamp: '2026-03-22T10:30:30Z', details: 'Claimed for security scan' },
  { id: 'evt-9', type: 'claim', agentName: 'Agent-Gamma', file: 'src/utils/helpers.ts', timestamp: '2026-03-22T10:32:00Z', details: 'Claimed for test generation' },
  { id: 'evt-10', type: 'claim', agentName: 'Agent-Delta', file: 'docs/API.md', timestamp: '2026-03-22T10:32:30Z', details: 'Claimed for documentation generation' },
  { id: 'evt-11', type: 'claim', agentName: 'Agent-Epsilon', file: 'src/auth/middleware.ts', timestamp: '2026-03-22T10:32:45Z', details: 'Claimed for refactoring' },

  // Node death & auto-respawn
  { id: 'evt-12', type: 'broadcast', agentName: 'AgentMonitor', file: '*', timestamp: '2026-03-22T10:33:00Z', details: 'ALERT: Agent-Beta unresponsive (90s timeout exceeded)' },
  { id: 'evt-13', type: 'broadcast', agentName: 'SwarmCoordinator', file: '*', timestamp: '2026-03-22T10:33:05Z', details: 'Auto-respawned replacement agent Agent-Beta-2' },
  { id: 'evt-14', type: 'claim', agentName: 'Agent-Beta-2', file: 'src/api/routes.ts', timestamp: '2026-03-22T10:33:15Z', details: 'Reclaimed dead agent tasks (respawned)' },

  // Task rebalancing
  { id: 'evt-15', type: 'broadcast', agentName: 'TaskDecomposer', file: '*', timestamp: '2026-03-22T10:33:20Z', details: 'Reassigned 3 tasks from dead Agent-Beta to Agent-Gamma' },
  { id: 'evt-16', type: 'claim', agentName: 'Agent-Gamma', file: 'tests/auth.test.ts', timestamp: '2026-03-22T10:33:25Z', details: 'Accepted rebalanced task: auth test generation' },

  // Conflicts from concurrent edits
  { id: 'evt-17', type: 'conflict', agentName: 'Agent-Beta-2', file: 'src/auth/session.ts', timestamp: '2026-03-22T10:34:00Z', details: 'Conflict with Agent-Alpha — concurrent edits on session.ts' },
  { id: 'evt-18', type: 'broadcast', agentName: 'MeshResolver', file: 'src/auth/session.ts', timestamp: '2026-03-22T10:34:30Z', details: 'Resolved conflict on src/auth/session.ts (priority-based: leader wins)' },
  { id: 'evt-19', type: 'conflict', agentName: 'Agent-Beta-2', file: 'src/api/routes.ts', timestamp: '2026-03-22T10:34:45Z', details: 'Conflict with Agent-Gamma — overlapping security + test edits' },
  { id: 'evt-20', type: 'broadcast', agentName: 'MeshResolver', file: 'src/auth/middleware.ts', timestamp: '2026-03-22T10:35:00Z', details: 'Resolved conflict on middleware.ts (non-overlapping merge)' },

  // Knowledge sync
  { id: 'evt-21', type: 'broadcast', agentName: 'KnowledgeCurator', file: '*', timestamp: '2026-03-22T10:35:30Z', details: 'Merged 12 findings from 3 agents — deduplicated 4 redundant entries' },
  { id: 'evt-22', type: 'broadcast', agentName: 'ConsensusManager', file: '*', timestamp: '2026-03-22T10:35:45Z', details: 'Consensus vote passed: approve merged findings (3/5 nodes)' },

  // Releases and completion
  { id: 'evt-23', type: 'release', agentName: 'Agent-Gamma', file: 'tests/helpers.test.ts', timestamp: '2026-03-22T10:36:00Z', details: 'Tests written, releasing lock' },
  { id: 'evt-24', type: 'release', agentName: 'Agent-Alpha', file: 'src/auth/login.ts', timestamp: '2026-03-22T10:36:30Z', details: 'Review complete, releasing lock' },
  { id: 'evt-25', type: 'release', agentName: 'Agent-Delta', file: 'docs/API.md', timestamp: '2026-03-22T10:37:00Z', details: 'Documentation generated, releasing lock' },
  { id: 'evt-26', type: 'broadcast', agentName: 'SwarmCoordinator', file: '*', timestamp: '2026-03-22T10:38:00Z', details: 'Pipeline complete — 5 agents, 12 tasks, 2 conflicts resolved, 0 failures' },
];

// ============================================
// SUGGESTIONS
// ============================================

export const demoSuggestions: Suggestion[] = [
  {
    id: 'sug-1',
    type: 'cost_optimization',
    title: 'Switch LintFixer to Haiku',
    description: 'Use Claude Haiku 3.5 for LintFixer — saves 60% cost with identical fix quality based on 42 runs.',
    impact: '-$0.67/run',
    basedOnRuns: 42,
    confidence: 0.91,
  },
  {
    id: 'sug-2',
    type: 'quality_improvement',
    title: 'Add SecurityScanner before CodeReviewer',
    description: 'On auth-heavy repos, running SecurityScanner first increases issue detection by 40%.',
    impact: '+40% detection',
    basedOnRuns: 28,
    confidence: 0.94,
  },
  {
    id: 'sug-3',
    type: 'speed_improvement',
    title: 'Parallelize lint + type-check',
    description: 'LintFixer and TypeChecker have no dependencies. Running them in parallel saves ~45 seconds.',
    impact: '-45s runtime',
    basedOnRuns: 45,
    confidence: 0.96,
  },
  {
    id: 'sug-4',
    type: 'cost_optimization',
    title: 'Skip DeadCodeRemover on small repos',
    description: 'Repositories under 1000 LOC never have dead code findings. Skip this node to save time and cost.',
    impact: '-$0.22/run',
    basedOnRuns: 15,
    confidence: 0.87,
  },
  {
    id: 'sug-5',
    type: 'speed_improvement',
    title: 'Enable SwarmCoordinator for large pipelines',
    description: 'Pipelines with 6+ nodes benefit from SWARM orchestration. Distributing across 5 agents cuts total runtime by 40% with TaskDecomposer parallelization.',
    impact: '-40% runtime',
    basedOnRuns: 32,
    confidence: 0.95,
  },
  {
    id: 'sug-6',
    type: 'quality_improvement',
    title: 'Add AgentMonitor health watchdog',
    description: 'AgentMonitor with 90-second heartbeat and auto-respawn prevents 95% of pipeline failures from dead agents. Average respawn time is under 5 seconds.',
    impact: '-95% failures',
    basedOnRuns: 48,
    confidence: 0.97,
  },
  {
    id: 'sug-7',
    type: 'cost_optimization',
    title: 'Enable KnowledgeCurator deduplication',
    description: 'KnowledgeCurator shared graph prevents agents from re-analyzing the same code regions. Saves 60% redundant token usage across multi-agent runs.',
    impact: '-60% waste',
    basedOnRuns: 36,
    confidence: 0.92,
  },
  {
    id: 'sug-8',
    type: 'quality_improvement',
    title: 'Use ConsensusManager for conflict resolution',
    description: 'Raft-style leader election via ConsensusManager eliminates split-brain merge conflicts. Priority-based resolution auto-handles 92% of file conflicts.',
    impact: '-70% conflicts',
    basedOnRuns: 25,
    confidence: 0.90,
  },
];

// ============================================
// LIVE EXECUTION SIMULATOR
// ============================================

interface SimCallbacks {
  onNodeStart: (nodeId: string) => void;
  onNodeProgress: (nodeId: string, progress: number, line?: { type: string; text: string }) => void;
  onNodeComplete: (nodeId: string, result: { duration: number; cost: number; tokens: number; filesModified: string[] }) => void;
  onPipelineComplete: () => void;
}

const terminalLines: Record<string, { type: string; text: string }[]> = {
  'code-reviewer': [
    { type: 'system', text: 'Initializing Code Reviewer agent...' },
    { type: 'progress', text: 'Analyzing 24 changed files...' },
    { type: 'stdout', text: 'src/auth/login.ts: Found potential null reference on line 42' },
    { type: 'stdout', text: 'src/api/routes.ts: Missing error boundary in async handler' },
    { type: 'stdout', text: 'src/utils/helpers.ts: Consider extracting to named constant' },
    { type: 'progress', text: 'Generating review summary...' },
    { type: 'cost', text: 'Tokens: 12,450 | Cost: $0.82' },
  ],
  'lint-fixer': [
    { type: 'system', text: 'Running ESLint + Prettier auto-fix...' },
    { type: 'stdout', text: 'Fixed 3 semicolons in src/auth/login.ts' },
    { type: 'stdout', text: 'Fixed 1 unused import in src/utils/helpers.ts' },
    { type: 'stdout', text: 'Reformatted 5 files to match style guide' },
    { type: 'cost', text: 'Tokens: 2,100 | Cost: $0.15' },
  ],
  'type-checker': [
    { type: 'system', text: 'Running TypeScript strict type analysis...' },
    { type: 'stdout', text: 'Checking 142 source files...' },
    { type: 'stderr', text: 'src/api/routes.ts(28,5): Type "string | undefined" not assignable to "string"' },
    { type: 'stdout', text: 'Auto-fixing with non-null assertion or optional chaining...' },
    { type: 'stdout', text: 'Fixed 2 type errors, 0 remaining' },
    { type: 'cost', text: 'Tokens: 5,200 | Cost: $0.35' },
  ],
  'security-scanner': [
    { type: 'system', text: 'Initializing deep security analysis...' },
    { type: 'progress', text: 'Scanning for SQL injection patterns...' },
    { type: 'progress', text: 'Scanning for XSS vulnerabilities...' },
    { type: 'stdout', text: 'WARN: Potential XSS in src/components/UserProfile.tsx line 67' },
    { type: 'progress', text: 'Scanning authentication flow...' },
    { type: 'stdout', text: 'INFO: Session token rotation looks correct' },
    { type: 'progress', text: 'Checking CORS configuration...' },
    { type: 'stdout', text: 'PASS: CORS properly configured for production origins' },
    { type: 'cost', text: 'Tokens: 18,200 | Cost: $0.95' },
  ],
  'secret-detector': [
    { type: 'system', text: 'Scanning for hardcoded secrets...' },
    { type: 'stdout', text: 'Checking .env patterns, API keys, JWT secrets...' },
    { type: 'stdout', text: 'PASS: No secrets found in source code' },
    { type: 'stdout', text: 'INFO: .gitignore correctly excludes .env files' },
    { type: 'cost', text: 'Tokens: 1,800 | Cost: $0.12' },
  ],
  'test-generator': [
    { type: 'system', text: 'Analyzing code coverage gaps...' },
    { type: 'progress', text: 'Generating tests for src/auth/login.ts...' },
    { type: 'stdout', text: 'Created 5 unit tests for loginHandler' },
    { type: 'progress', text: 'Generating tests for src/api/routes.ts...' },
    { type: 'stdout', text: 'Created 8 integration tests for API routes' },
    { type: 'stdout', text: 'Total: 13 new tests, estimated +23% coverage' },
    { type: 'cost', text: 'Tokens: 15,400 | Cost: $0.75' },
  ],
  'doc-generator': [
    { type: 'system', text: 'Generating documentation updates...' },
    { type: 'stdout', text: 'Updated JSDoc for 12 exported functions' },
    { type: 'stdout', text: 'Generated API reference for 3 new endpoints' },
    { type: 'stdout', text: 'Updated README.md with new setup instructions' },
    { type: 'cost', text: 'Tokens: 8,600 | Cost: $0.55' },
  ],
  'changelog-writer': [
    { type: 'system', text: 'Analyzing git log for changelog entries...' },
    { type: 'stdout', text: 'Found 7 conventional commits since last release' },
    { type: 'stdout', text: 'Generated CHANGELOG.md entry for v1.4.2' },
    { type: 'cost', text: 'Tokens: 2,800 | Cost: $0.18' },
  ],
  'dependency-auditor': [
    { type: 'system', text: 'Auditing 142 dependencies...' },
    { type: 'stdout', text: 'Checking npm audit database...' },
    { type: 'stdout', text: 'WARN: lodash@4.17.19 has known prototype pollution CVE' },
    { type: 'stdout', text: 'INFO: 141/142 dependencies clean' },
    { type: 'cost', text: 'Tokens: 3,200 | Cost: $0.20' },
  ],
  'complexity-analyzer': [
    { type: 'system', text: 'Computing cyclomatic complexity...' },
    { type: 'stdout', text: 'src/auth/login.ts: complexity 8 (moderate)' },
    { type: 'stdout', text: 'src/api/routes.ts: complexity 12 (high - consider refactoring)' },
    { type: 'stdout', text: 'Average complexity: 5.3 (good)' },
    { type: 'cost', text: 'Tokens: 4,100 | Cost: $0.28' },
  ],
  'refactor-engine': [
    { type: 'system', text: 'Detecting refactoring opportunities...' },
    { type: 'progress', text: 'Analyzing code duplication...' },
    { type: 'stdout', text: 'Found 3 duplicated blocks across 2 files' },
    { type: 'stdout', text: 'Extracting shared utility function...' },
    { type: 'stdout', text: 'Refactored: -45 lines, +1 shared helper' },
    { type: 'cost', text: 'Tokens: 22,000 | Cost: $1.20' },
  ],
  'test-runner': [
    { type: 'system', text: 'Executing test suite...' },
    { type: 'stdout', text: 'Running 87 tests...' },
    { type: 'stdout', text: '  PASS  src/auth/__tests__/login.test.ts (12 tests)' },
    { type: 'stdout', text: '  PASS  src/api/__tests__/routes.test.ts (23 tests)' },
    { type: 'stdout', text: '  PASS  src/utils/__tests__/helpers.test.ts (18 tests)' },
    { type: 'stdout', text: '87/87 passed | Coverage: 78.3%' },
    { type: 'cost', text: 'Tokens: 800 | Cost: $0.05' },
  ],
  'mutation-tester': [
    { type: 'system', text: 'Running mutation testing...' },
    { type: 'progress', text: 'Generating 150 mutants...' },
    { type: 'stdout', text: '142/150 mutants killed (94.7% mutation score)' },
    { type: 'stdout', text: '8 surviving mutants in src/utils/helpers.ts' },
    { type: 'cost', text: 'Tokens: 7,500 | Cost: $0.45' },
  ],
  'dead-code-remover': [
    { type: 'system', text: 'Scanning for unreachable code...' },
    { type: 'stdout', text: 'Found 2 unused exports in src/utils/legacy.ts' },
    { type: 'stdout', text: 'Removed 23 lines of dead code' },
    { type: 'cost', text: 'Tokens: 3,400 | Cost: $0.22' },
  ],
  'ci-optimizer': [
    { type: 'system', text: 'Analyzing CI/CD configuration...' },
    { type: 'stdout', text: 'Detected 2 parallelizable stages' },
    { type: 'stdout', text: 'Suggested: cache node_modules between jobs' },
    { type: 'cost', text: 'Tokens: 4,800 | Cost: $0.30' },
  ],
  'docker-analyzer': [
    { type: 'system', text: 'Analyzing Dockerfile...' },
    { type: 'stdout', text: 'Layer optimization: merge 3 RUN commands' },
    { type: 'stdout', text: 'Suggested multi-stage build for 40% smaller image' },
    { type: 'cost', text: 'Tokens: 3,900 | Cost: $0.25' },
  ],
  'architecture-reviewer': [
    { type: 'system', text: 'Analyzing project architecture...' },
    { type: 'progress', text: 'Building dependency graph...' },
    { type: 'stdout', text: 'Detected circular dependency: auth -> api -> auth' },
    { type: 'stdout', text: 'Coupling score: 0.34 (acceptable)' },
    { type: 'stdout', text: 'Recommended: Extract shared types to reduce coupling' },
    { type: 'cost', text: 'Tokens: 28,000 | Cost: $1.50' },
  ],
  'swarm-coordinator': [
    { type: 'system', text: 'Bootstrapping SWARM cluster...' },
    { type: 'progress', text: 'Spawning 5 agents (Alpha, Beta, Gamma, Delta, Epsilon)...' },
    { type: 'stdout', text: 'Agent-Alpha spawned [leader-candidate]' },
    { type: 'stdout', text: 'Agent-Beta spawned [worker]' },
    { type: 'stdout', text: 'Agent-Gamma spawned [worker]' },
    { type: 'stdout', text: 'Agent-Delta spawned [worker]' },
    { type: 'stdout', text: 'Agent-Epsilon spawned [worker]' },
    { type: 'stdout', text: 'SWARM cluster ready — 5 agents online' },
    { type: 'cost', text: 'Tokens: 8,000 | Cost: $0.50' },
  ],
  'task-decomposer': [
    { type: 'system', text: 'Decomposing pipeline into atomic tasks...' },
    { type: 'progress', text: 'Analyzing dependency graph...' },
    { type: 'stdout', text: 'Split pipeline into 12 atomic tasks' },
    { type: 'stdout', text: 'Assigned 3 tasks to Agent-Alpha (auth review)' },
    { type: 'stdout', text: 'Assigned 2 tasks to Agent-Beta (security scan)' },
    { type: 'stdout', text: 'Assigned 3 tasks to Agent-Gamma (test gen)' },
    { type: 'stdout', text: 'Assigned 2 tasks to Agent-Delta (docs)' },
    { type: 'stdout', text: 'Assigned 2 tasks to Agent-Epsilon (refactor)' },
    { type: 'cost', text: 'Tokens: 6,400 | Cost: $0.40' },
  ],
  'knowledge-curator': [
    { type: 'system', text: 'Initializing shared knowledge graph...' },
    { type: 'progress', text: 'Collecting findings from 3 agents...' },
    { type: 'stdout', text: 'Agent-Alpha: 5 findings (auth flow review)' },
    { type: 'stdout', text: 'Agent-Beta-2: 4 findings (security scan)' },
    { type: 'stdout', text: 'Agent-Gamma: 3 findings (test coverage gaps)' },
    { type: 'stdout', text: 'Deduplicated 4 redundant entries (XSS in session.ts found by 2 agents)' },
    { type: 'stdout', text: 'Merged knowledge graph: 12 unique findings, 8 entities' },
    { type: 'cost', text: 'Tokens: 9,600 | Cost: $0.60' },
  ],
  'agent-monitor': [
    { type: 'system', text: 'Health watchdog active — monitoring 5 agents...' },
    { type: 'stdout', text: 'Agent-Alpha: healthy (latency 12ms)' },
    { type: 'stderr', text: 'ALERT: Agent-Beta unresponsive (90s timeout exceeded)' },
    { type: 'stdout', text: 'Triggering auto-respawn for Agent-Beta...' },
    { type: 'stdout', text: 'Agent-Beta-2 spawned successfully (respawn took 4.2s)' },
    { type: 'stdout', text: 'All 5 agents healthy — cluster stable' },
    { type: 'cost', text: 'Tokens: 1,500 | Cost: $0.10' },
  ],
  'consensus-manager': [
    { type: 'system', text: 'Initiating Raft leader election (term 3)...' },
    { type: 'progress', text: 'Requesting votes from 5 nodes...' },
    { type: 'stdout', text: 'Vote received: Agent-Alpha -> Agent-Alpha (self)' },
    { type: 'stdout', text: 'Vote received: Agent-Gamma -> Agent-Alpha' },
    { type: 'stdout', text: 'Vote received: Agent-Delta -> Agent-Alpha' },
    { type: 'stdout', text: 'Quorum achieved (3/5 nodes) — Agent-Alpha elected leader' },
    { type: 'cost', text: 'Tokens: 4,800 | Cost: $0.30' },
  ],
  'mesh-resolver': [
    { type: 'system', text: 'Scanning for file conflicts across agents...' },
    { type: 'stderr', text: 'CONFLICT: src/auth/session.ts — Agent-Alpha vs Agent-Beta-2' },
    { type: 'stdout', text: 'Applying priority-based resolution (leader Agent-Alpha wins)' },
    { type: 'stdout', text: 'Resolved: src/auth/session.ts — merged with leader priority' },
    { type: 'stderr', text: 'CONFLICT: src/auth/middleware.ts — Agent-Alpha vs Agent-Beta-2' },
    { type: 'stdout', text: 'Resolved: src/auth/middleware.ts — non-overlapping merge' },
    { type: 'stdout', text: '2/3 conflicts resolved automatically, 1 pending review' },
    { type: 'cost', text: 'Tokens: 7,200 | Cost: $0.50' },
  ],
  'pipeline-generator': [
    { type: 'system', text: 'Generating pipeline YAML from description...' },
    { type: 'stdout', text: 'Parsed natural language input...' },
    { type: 'stdout', text: 'Generated 6-node SWARM pipeline configuration' },
    { type: 'stdout', text: 'Output: pipeline.yaml (validated)' },
    { type: 'cost', text: 'Tokens: 6,000 | Cost: $0.40' },
  ],
};

export function createLiveExecution(
  nodes: PipelineNode[],
  callbacks: SimCallbacks,
) {
  let currentIndex = 0;
  let currentProgress = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lineIndex = 0;
  let stopped = false;

  // Build execution order from dependencies
  const executionOrder = getExecutionOrder(nodes);

  function getExecutionOrder(nodes: PipelineNode[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    function visit(id: string) {
      if (visited.has(id)) return;
      const node = nodeMap.get(id);
      if (!node) return;
      for (const depId of node.dependsOn) {
        visit(depId);
      }
      visited.add(id);
      order.push(id);
    }

    for (const node of nodes) {
      visit(node.id);
    }
    return order;
  }

  function start() {
    if (executionOrder.length === 0) {
      callbacks.onPipelineComplete();
      return;
    }

    startNextNode();
  }

  function startNextNode() {
    if (stopped || currentIndex >= executionOrder.length) {
      if (!stopped) callbacks.onPipelineComplete();
      return;
    }

    const nodeId = executionOrder[currentIndex];
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      currentIndex++;
      startNextNode();
      return;
    }

    currentProgress = 0;
    lineIndex = 0;
    callbacks.onNodeStart(nodeId);

    const lines = terminalLines[node.typeId] || [
      { type: 'system', text: `Running ${node.name}...` },
      { type: 'stdout', text: 'Processing...' },
      { type: 'stdout', text: 'Done.' },
    ];

    const totalSteps = 20;
    let step = 0;

    intervalId = setInterval(() => {
      if (stopped) {
        if (intervalId) clearInterval(intervalId);
        return;
      }

      step++;
      currentProgress = Math.min(95, (step / totalSteps) * 100);

      // Emit terminal lines at certain progress points
      const lineThreshold = (lineIndex + 1) / lines.length;
      let line: { type: string; text: string } | undefined;
      if (currentProgress / 100 >= lineThreshold && lineIndex < lines.length) {
        line = lines[lineIndex];
        lineIndex++;
      }

      callbacks.onNodeProgress(nodeId, currentProgress, line);

      if (step >= totalSteps) {
        if (intervalId) clearInterval(intervalId);

        // Emit remaining lines
        while (lineIndex < lines.length) {
          callbacks.onNodeProgress(nodeId, 100, lines[lineIndex]);
          lineIndex++;
        }

        const nt = nodeTypeCatalog.find((t) => t.id === node.typeId);
        const baseCost = nt?.avgCost ?? 0.5;
        const baseDuration = nt?.avgRuntime ?? 120;

        // Generate realistic filesModified based on node type
        const simFileMap: Record<string, string[]> = {
          'lint-fixer': ['src/auth/login.ts', 'src/utils/helpers.ts'],
          'type-checker': ['src/api/routes.ts'],
          'code-reviewer': ['REVIEW.md'],
          'test-generator': ['tests/auth.test.ts', 'tests/routes.test.ts'],
          'doc-generator': ['docs/API.md', 'README.md'],
          'changelog-writer': ['CHANGELOG.md'],
          'security-scanner': ['SECURITY_REPORT.md'],
          'secret-detector': [],
        };
        const filesModified = simFileMap[node.typeId] || [`output/${node.typeId}.json`];

        callbacks.onNodeComplete(nodeId, {
          duration: baseDuration * (0.8 + Math.random() * 0.4),
          cost: baseCost * (0.9 + Math.random() * 0.2),
          tokens: Math.round(baseCost * 15000 + Math.random() * 5000),
          filesModified,
        });

        currentIndex++;
        setTimeout(() => startNextNode(), 300);
      }
    }, 150);
  }

  function tick() {
    // Manual tick — unused in timer-based mode
  }

  function stop() {
    stopped = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, tick, stop };
}
