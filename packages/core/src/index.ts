// Types
export type {
  PipelineDefinition,
  NodeDefinition,
  NodeType,
  NodeCategory,
  PipelineStatus,
  NodeStatus,
  PipelineRun,
  NodeRunState,
  ExecuteOptions,
  MeshClaim,
  MeshConflict,
  MeshState,
  ExecutionRecord,
  NodeResult,
  RepoContext,
  Insight,
  InsightAction,
  PipelineEvent,
  PipelineEventType,
  StreamMessage,
  PipelineTemplate,
  AggregateStats,
} from './types.js';

// Node Registry
export { NodeRegistry, nodeRegistry, NODE_TYPES } from './nodes/registry.js';

// Pipeline
export { PipelineLoader } from './pipeline/loader.js';
export type { PipelineInfo, ValidationResult } from './pipeline/loader.js';
export { PipelineExecutor } from './pipeline/executor.js';
export type { ExecutorEvents } from './pipeline/executor.js';
export { NodeRunner } from './pipeline/node-runner.js';
export type { NodeRunContext } from './pipeline/node-runner.js';

// Mesh
export { MeshManager } from './mesh/manager.js';

// Learning
export { HistoryRecorder } from './learning/recorder.js';
export { LearningEngine } from './learning/engine.js';
export { PatternExtractor } from './learning/extractor.js';
export { InsightApplier } from './learning/applier.js';
export type { AppliedChange } from './learning/applier.js';

// Pipeline utilities
export { generatePipeline } from './pipeline/generator.js';
export {
  parsePipeline,
  serializePipelineYaml,
  serializePipelineJson,
} from './pipeline/parser.js';
export { PipelineStore } from './pipeline/store.js';

// Mesh (singleton)
export { MeshCoordinator } from './mesh/coordinator.js';

// Export formats
export { exportToN8n } from './export/n8n.js';
