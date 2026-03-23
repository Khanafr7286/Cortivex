import { describe, it, expect } from 'vitest';
import { PipelineExecutor } from '../pipeline/executor.js';
import type { NodeDefinition, PipelineDefinition } from '../types.js';

function makeNode(id: string, deps: string[] = []): NodeDefinition {
  return {
    id,
    type: 'code-reviewer',
    depends_on: deps.length > 0 ? deps : undefined,
  };
}

function makePipeline(
  nodes: NodeDefinition[],
  name = 'test-pipeline'
): PipelineDefinition {
  return {
    name,
    version: '1.0.0',
    description: 'Test pipeline',
    tags: ['test'],
    estimated_cost: '$0.10',
    estimated_duration: '1m',
    nodes,
  };
}

describe('PipelineExecutor', () => {
  describe('resolveExecutionOrder()', () => {
    it('performs correct topological sort for a linear chain', () => {
      const executor = new PipelineExecutor();
      const nodes = [
        makeNode('a'),
        makeNode('b', ['a']),
        makeNode('c', ['b']),
      ];

      const batches = executor.resolveExecutionOrder(nodes);

      // a first, then b, then c (three batches)
      expect(batches).toHaveLength(3);
      expect(batches[0].map((n) => n.id)).toEqual(['a']);
      expect(batches[1].map((n) => n.id)).toEqual(['b']);
      expect(batches[2].map((n) => n.id)).toEqual(['c']);
    });

    it('groups independent nodes into the same batch', () => {
      const executor = new PipelineExecutor();
      const nodes = [
        makeNode('a'),
        makeNode('b'),
        makeNode('c', ['a', 'b']),
      ];

      const batches = executor.resolveExecutionOrder(nodes);

      // a and b can run in parallel, then c
      expect(batches).toHaveLength(2);
      const firstBatchIds = batches[0].map((n) => n.id).sort();
      expect(firstBatchIds).toEqual(['a', 'b']);
      expect(batches[1].map((n) => n.id)).toEqual(['c']);
    });

    it('handles a diamond dependency pattern', () => {
      const executor = new PipelineExecutor();
      // Diamond: a -> b, a -> c, b -> d, c -> d
      const nodes = [
        makeNode('a'),
        makeNode('b', ['a']),
        makeNode('c', ['a']),
        makeNode('d', ['b', 'c']),
      ];

      const batches = executor.resolveExecutionOrder(nodes);

      expect(batches).toHaveLength(3);
      expect(batches[0].map((n) => n.id)).toEqual(['a']);
      const middleBatchIds = batches[1].map((n) => n.id).sort();
      expect(middleBatchIds).toEqual(['b', 'c']);
      expect(batches[2].map((n) => n.id)).toEqual(['d']);
    });

    it('handles a single node with no dependencies', () => {
      const executor = new PipelineExecutor();
      const nodes = [makeNode('a')];

      const batches = executor.resolveExecutionOrder(nodes);

      expect(batches).toHaveLength(1);
      expect(batches[0].map((n) => n.id)).toEqual(['a']);
    });

    it('detects circular dependencies and throws', () => {
      const executor = new PipelineExecutor();
      // a -> b -> c -> a (cycle)
      const nodes = [
        makeNode('a', ['c']),
        makeNode('b', ['a']),
        makeNode('c', ['b']),
      ];

      expect(() => executor.resolveExecutionOrder(nodes)).toThrow(
        /circular dependency/i
      );
    });

    it('detects a self-referencing dependency and throws', () => {
      const executor = new PipelineExecutor();
      const nodes = [makeNode('a', ['a'])];

      expect(() => executor.resolveExecutionOrder(nodes)).toThrow(
        /circular dependency/i
      );
    });
  });

  describe('dryRun option', () => {
    it('returns estimated costs without executing real nodes', async () => {
      const executor = new PipelineExecutor();

      const pipeline = makePipeline([
        makeNode('review'),
        makeNode('fix', ['review']),
      ]);

      const run = await executor.execute(pipeline, { dryRun: true });

      expect(run.status).toBe('completed');
      // In dry run mode, each node gets its avgCost from the registry
      // and no actual execution happens
      for (const node of run.nodes) {
        expect(node.status).toBe('completed');
        expect(node.output).toMatch(/\[DRY RUN\]/);
      }
      // totalCost should be the sum of estimated costs
      expect(run.totalCost).toBeGreaterThan(0);
    });

    it('resolves execution order during dry run', async () => {
      const executor = new PipelineExecutor();

      const pipeline = makePipeline([
        makeNode('a'),
        makeNode('b'),
        makeNode('c', ['a', 'b']),
      ]);

      const run = await executor.execute(pipeline, { dryRun: true });

      expect(run.status).toBe('completed');
      expect(run.nodes).toHaveLength(3);

      // Verify batch info is in the output
      const nodeC = run.nodes.find((n) => n.nodeId === 'c');
      expect(nodeC).toBeDefined();
      expect(nodeC!.output).toContain('batch 2');
    });
  });
});
