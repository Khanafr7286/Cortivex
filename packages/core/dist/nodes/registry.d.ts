import type { NodeType } from '../types.js';
declare const NODE_TYPES: NodeType[];
export declare class NodeRegistry {
    private readonly types;
    constructor();
    get(id: string): NodeType | undefined;
    getOrThrow(id: string): NodeType;
    has(id: string): boolean;
    listAll(): NodeType[];
    listIds(): string[];
    listByCategory(category: NodeType['category']): NodeType[];
    search(query: string): NodeType[];
    getCategories(): NodeType['category'][];
}
export declare const nodeRegistry: NodeRegistry;
export { NODE_TYPES };
//# sourceMappingURL=registry.d.ts.map