import { describe, it, expect } from 'vitest';
import { nodeRegistry, NodeRegistry } from '../nodes/registry.js';
import type { NodeCategory } from '../types.js';

describe('nodeRegistry', () => {
  describe('get()', () => {
    it('returns a node type by ID', () => {
      const node = nodeRegistry.get('code-reviewer');
      expect(node).toBeDefined();
      expect(node!.id).toBe('code-reviewer');
      expect(node!.name).toBe('CodeReviewer');
      expect(node!.category).toBe('quality');
    });

    it('returns undefined for an unknown ID', () => {
      const node = nodeRegistry.get('non-existent-node');
      expect(node).toBeUndefined();
    });
  });

  describe('getOrThrow()', () => {
    it('returns the node type for a valid ID', () => {
      const node = nodeRegistry.getOrThrow('security-scanner');
      expect(node.id).toBe('security-scanner');
      expect(node.category).toBe('security');
    });

    it('throws for an unknown ID', () => {
      expect(() => nodeRegistry.getOrThrow('does-not-exist')).toThrow(
        /Unknown node type: "does-not-exist"/
      );
    });

    it('includes available types in the error message', () => {
      try {
        nodeRegistry.getOrThrow('invalid');
        // Should not reach here
        expect.unreachable('Expected getOrThrow to throw');
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain('code-reviewer');
        expect(message).toContain('security-scanner');
      }
    });
  });

  describe('listByCategory()', () => {
    it('filters nodes correctly by category', () => {
      const qualityNodes = nodeRegistry.listByCategory('quality');
      expect(qualityNodes.length).toBeGreaterThan(0);

      for (const node of qualityNodes) {
        expect(node.category).toBe('quality');
      }
    });

    it('returns an empty array for an unused category', () => {
      // Use a category value that won't match any node
      const nodes = nodeRegistry.listByCategory(
        'nonexistent' as NodeCategory
      );
      expect(nodes).toEqual([]);
    });

    it('returns different nodes for different categories', () => {
      const qualityNodes = nodeRegistry.listByCategory('quality');
      const securityNodes = nodeRegistry.listByCategory('security');

      const qualityIds = qualityNodes.map((n) => n.id);
      const securityIds = securityNodes.map((n) => n.id);

      // No overlap between quality and security
      for (const id of securityIds) {
        expect(qualityIds).not.toContain(id);
      }
    });

    it('includes known nodes in the correct category', () => {
      const testingNodes = nodeRegistry.listByCategory('testing');
      const testingIds = testingNodes.map((n) => n.id);

      expect(testingIds).toContain('test-generator');
      expect(testingIds).toContain('test-runner');
    });
  });

  describe('getCategories()', () => {
    it('returns all categories that exist in the registry', () => {
      const categories = nodeRegistry.getCategories();

      expect(categories).toContain('quality');
      expect(categories).toContain('security');
      expect(categories).toContain('testing');
      expect(categories).toContain('devops');
      expect(categories).toContain('docs');
      expect(categories).toContain('refactoring');
      expect(categories).toContain('analysis');
      expect(categories).toContain('orchestration');
    });

    it('returns unique categories (no duplicates)', () => {
      const categories = nodeRegistry.getCategories();
      const unique = new Set(categories);
      expect(categories.length).toBe(unique.size);
    });

    it('has a category for every node in the registry', () => {
      const categories = new Set(nodeRegistry.getCategories());
      const allNodes = nodeRegistry.listAll();

      for (const node of allNodes) {
        expect(categories.has(node.category)).toBe(true);
      }
    });
  });

  describe('additional coverage', () => {
    it('has() returns true for existing IDs and false for unknown IDs', () => {
      expect(nodeRegistry.has('code-reviewer')).toBe(true);
      expect(nodeRegistry.has('fake-node')).toBe(false);
    });

    it('listAll() returns all registered node types', () => {
      const all = nodeRegistry.listAll();
      expect(all.length).toBeGreaterThan(10);

      // Each node should have required fields
      for (const node of all) {
        expect(node.id).toBeTruthy();
        expect(node.name).toBeTruthy();
        expect(node.category).toBeTruthy();
      }
    });

    it('listIds() returns all IDs as strings', () => {
      const ids = nodeRegistry.listIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('code-reviewer');
      expect(ids).toContain('auto-fixer');
    });

    it('search() finds nodes by name, id, description, or category', () => {
      const results = nodeRegistry.search('security');
      expect(results.length).toBeGreaterThan(0);

      // Should find the security scanner at minimum
      const ids = results.map((n) => n.id);
      expect(ids).toContain('security-scanner');
    });
  });
});
