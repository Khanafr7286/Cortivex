import type { NodeDefinition, NodeRunState, NodeType } from '../types.js';
import { EventEmitter } from 'eventemitter3';
export interface NodeRunContext {
    runId: string;
    targetDir: string;
    previousOutputs: Map<string, string>;
    model?: string;
    verbose?: boolean;
}
interface NodeRunnerEvents {
    progress: (nodeId: string, progress: number, message: string) => void;
    output: (nodeId: string, text: string) => void;
    cost: (nodeId: string, cost: number, tokens: number) => void;
}
export declare class NodeRunner extends EventEmitter<NodeRunnerEvents> {
    private readonly timeout;
    constructor(timeoutMs?: number);
    run(node: NodeDefinition, context: NodeRunContext): Promise<NodeRunState>;
    private isLightNode;
    runHeavyNode(node: NodeDefinition, nodeType: NodeType, context: NodeRunContext): Promise<NodeExecutionResult>;
    runLightNode(node: NodeDefinition, nodeType: NodeType, context: NodeRunContext): Promise<NodeExecutionResult>;
    runShellNode(node: NodeDefinition, nodeType: NodeType, context: NodeRunContext): Promise<NodeExecutionResult>;
    private buildPrompt;
    private sanitizeCommand;
    private parseCommand;
    private handleStreamMessage;
}
interface NodeExecutionResult {
    output: string;
    cost: number;
    tokens: number;
    filesModified: string[];
}
export {};
//# sourceMappingURL=node-runner.d.ts.map