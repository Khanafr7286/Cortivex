// ============================================
// CORTIVEX TYPE DEFINITIONS
// ============================================

export type NodeCategory =
  | 'quality'
  | 'security'
  | 'testing'
  | 'devops'
  | 'docs'
  | 'refactoring'
  | 'analysis'
  | 'orchestration';

export type NodeStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ViewType = 'editor' | 'execution' | 'learning' | 'mesh' | 'knowledge' | 'timeline' | 'metrics';

export interface Position {
  x: number;
  y: number;
}

// ============================================
// PIPELINE TYPES
// ============================================

export interface NodeType {
  id: string;
  name: string;
  category: NodeCategory;
  icon: string;
  description: string;
  avgCost: number;
  avgRuntime: number; // seconds
  defaultModel: string;
}

export interface PipelineNode {
  id: string;
  typeId: string;
  name: string;
  category: NodeCategory;
  icon: string;
  position: Position;
  model: string;
  temperature: number;
  instructions: string;
  dependsOn: string[];
  condition: string;
  status: NodeStatus;
  progress: number;
  output: string;
  duration: number;
  cost: number;
  tokensUsed: number;
}

export interface PipelineConnection {
  id: string;
  sourceId: string;
  targetId: string;
  animated: boolean;
}

export interface PipelineDefinition {
  name: string;
  description: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineRun {
  id: string;
  pipelineName: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  totalCost: number;
  totalDuration: number;
  totalTokens: number;
  currentNodeId: string | null;
}

// ============================================
// MESH TYPES
// ============================================

export type AgentRole = 'leader' | 'follower' | 'coordinator' | 'monitor' | 'dead' | 'candidate';

export interface MeshClaim {
  agentId: string;
  agentName: string;
  nodeType: NodeCategory;
  files: string[];
  claimedAt: string;
  status: 'active' | 'waiting' | 'conflict';
  action: string;
  role?: AgentRole;
  tokensUsed?: number;
}

export interface MeshConflict {
  id: string;
  file: string;
  agents: string[];
  resolvedAt: string | null;
  resolution: string | null;
}

export interface MeshEvent {
  id: string;
  type: string;
  agentId?: string;
  agentName: string;
  details: string;
  file?: string;
  files?: string[];
  timestamp: string;
}

// ============================================
// LEARNING TYPES
// ============================================

export type InsightAction =
  | 'reorder'
  | 'substitute_model'
  | 'skip_node'
  | 'add_node'
  | 'adjust_temperature'
  | 'modify_prompt';

export interface Insight {
  id: string;
  action: InsightAction;
  pattern: string;
  description: string;
  confidence: number;
  basedOnRuns: number;
  discoveredAt: string;
  impact: string;
  category: NodeCategory;
}

export interface ExecutionRecord {
  id: string;
  pipelineName: string;
  runNumber: number;
  timestamp: string;
  duration: number;
  cost: number;
  tokensUsed: number;
  success: boolean;
  nodesRun: number;
  nodesFailed: number;
  filesModified: number;
}

export interface LearningMetrics {
  successRate: number;
  avgCost: number;
  avgDuration: number;
  totalRuns: number;
  costSaved: number;
  timeSaved: number;
}

// ============================================
// SUGGESTION TYPES
// ============================================

export interface Suggestion {
  id: string;
  type: 'cost_optimization' | 'quality_improvement' | 'speed_improvement';
  title: string;
  description: string;
  impact: string;
  basedOnRuns: number;
  confidence: number;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

export interface WSEvent {
  type: string; // Allow any event type for extensibility (swarm:*, node:*, etc.)
  data: Record<string, unknown>;
  timestamp: string;
}

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  quality: '#4F8EF7',
  security: '#E05C5C',
  testing: '#3DD68C',
  devops: '#E8A44A',
  docs: '#a78bfa',
  refactoring: '#22d3ee',
  analysis: '#7B6EF6',
  orchestration: '#E8A44A',
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  quality: 'Quality',
  security: 'Security',
  testing: 'Testing',
  devops: 'DevOps',
  docs: 'Documentation',
  refactoring: 'Refactoring',
  analysis: 'Analysis',
  orchestration: 'Orchestration',
};

export const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', cost: 0.003 },
  { value: 'claude-opus-4', label: 'Claude Opus 4', cost: 0.015 },
  { value: 'claude-haiku-3.5', label: 'Claude Haiku 3.5', cost: 0.00025 },
  { value: 'gpt-4o', label: 'GPT-4o', cost: 0.005 },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 0.00015 },
] as const;
