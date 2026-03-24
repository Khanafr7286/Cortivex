import type { NodeType, NodeCategory } from './types';

// Node type definitions for the pipeline editor palette.
// These are metadata about available node types, not demo data.

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

  // Orchestration
  { id: 'swarm-coordinator', name: 'Swarm Coordinator', category: 'orchestration', icon: 'Network', description: 'Bootstrap and orchestrate a distributed agent cluster', avgCost: 0.50, avgRuntime: 30, defaultModel: 'claude-sonnet-4' },
  { id: 'task-decomposer', name: 'Task Decomposer', category: 'orchestration', icon: 'Layers', description: 'Break complex work into atomic parallel tasks', avgCost: 0.40, avgRuntime: 45, defaultModel: 'claude-sonnet-4' },
  { id: 'knowledge-curator', name: 'Knowledge Curator', category: 'orchestration', icon: 'Eye', description: 'Shared knowledge graph to prevent duplicate work', avgCost: 0.60, avgRuntime: 60, defaultModel: 'claude-sonnet-4' },
  { id: 'agent-monitor', name: 'Agent Monitor', category: 'orchestration', icon: 'BarChart3', description: 'Health watchdog with auto-respawn and cost tracking', avgCost: 0.10, avgRuntime: 15, defaultModel: 'claude-haiku-3.5' },
  { id: 'consensus-manager', name: 'Consensus Manager', category: 'orchestration', icon: 'Shield', description: 'Leader election for multi-node clusters', avgCost: 0.30, avgRuntime: 20, defaultModel: 'claude-sonnet-4' },
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
