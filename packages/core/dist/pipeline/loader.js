import { readFile, readdir, access } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { nodeRegistry } from '../nodes/registry.js';
/** Pipeline name pattern: alphanumeric, hyphens, underscores only, max 64 chars */
const PIPELINE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
/**
 * Sanitize a pipeline name to prevent path traversal and injection.
 * Throws if the name contains invalid characters.
 */
function sanitizePipelineName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Pipeline name must be a non-empty string');
    }
    if (name.length > 64) {
        throw new Error('Pipeline name must not exceed 64 characters');
    }
    if (!PIPELINE_NAME_PATTERN.test(name)) {
        throw new Error('Pipeline name may only contain alphanumeric characters, hyphens, and underscores');
    }
    return name;
}
const CORTIVEX_DIR = '.cortivex';
const PIPELINES_DIR = 'pipelines';
const BUILT_IN_TEMPLATES = [
    {
        id: 'full-review',
        name: 'Full Code Review',
        description: 'Comprehensive code review with security scanning, bug hunting, auto-fixing, and test generation.',
        tags: ['review', 'security', 'testing'],
        pipeline: {
            name: 'full-review',
            version: '1.0.0',
            description: 'Full code review pipeline with security, bug hunting, fixes, and tests',
            tags: ['review', 'security', 'testing'],
            estimated_cost: '$0.50',
            estimated_duration: '15 min',
            nodes: [
                { id: 'review', type: 'code-reviewer' },
                { id: 'security', type: 'security-scanner' },
                { id: 'bugs', type: 'bug-hunter' },
                { id: 'fix', type: 'auto-fixer', depends_on: ['review', 'security', 'bugs'] },
                { id: 'tests', type: 'test-generator', depends_on: ['fix'] },
                { id: 'run-tests', type: 'test-runner', depends_on: ['tests'] },
                { id: 'pr', type: 'pr-creator', depends_on: ['run-tests'], condition: 'run-tests.success' },
            ],
        },
    },
    {
        id: 'quick-fix',
        name: 'Quick Fix',
        description: 'Fast review and auto-fix pipeline for small changes.',
        tags: ['review', 'fix', 'fast'],
        pipeline: {
            name: 'quick-fix',
            version: '1.0.0',
            description: 'Quick code review and auto-fix',
            tags: ['review', 'fix'],
            estimated_cost: '$0.20',
            estimated_duration: '5 min',
            nodes: [
                { id: 'review', type: 'code-reviewer' },
                { id: 'lint', type: 'lint-fixer' },
                { id: 'fix', type: 'auto-fixer', depends_on: ['review', 'lint'] },
            ],
        },
    },
    {
        id: 'security-audit',
        name: 'Security Audit',
        description: 'Deep security analysis with vulnerability scanning, dependency audit, and auto-remediation.',
        tags: ['security', 'audit', 'compliance'],
        pipeline: {
            name: 'security-audit',
            version: '1.0.0',
            description: 'Security-focused pipeline with deep vulnerability analysis',
            tags: ['security', 'audit'],
            estimated_cost: '$0.35',
            estimated_duration: '10 min',
            nodes: [
                { id: 'security', type: 'security-scanner' },
                { id: 'deps', type: 'dependency-updater' },
                { id: 'fix', type: 'auto-fixer', depends_on: ['security'] },
                { id: 'recheck', type: 'security-scanner', depends_on: ['fix', 'deps'], config: { scope: 'changed-files' } },
            ],
        },
    },
    {
        id: 'test-suite',
        name: 'Test Suite Generator',
        description: 'Generates unit tests, integration tests, and E2E tests for the project.',
        tags: ['testing', 'coverage'],
        pipeline: {
            name: 'test-suite',
            version: '1.0.0',
            description: 'Generate comprehensive test coverage',
            tags: ['testing'],
            estimated_cost: '$0.30',
            estimated_duration: '10 min',
            nodes: [
                { id: 'analyze', type: 'architect-analyzer' },
                { id: 'unit-tests', type: 'test-generator', depends_on: ['analyze'] },
                { id: 'e2e-tests', type: 'e2e-test-writer', depends_on: ['analyze'] },
                { id: 'run', type: 'test-runner', depends_on: ['unit-tests', 'e2e-tests'] },
            ],
        },
    },
    {
        id: 'ts-migration',
        name: 'TypeScript Migration',
        description: 'Converts a JavaScript project to TypeScript with proper types and strict mode.',
        tags: ['typescript', 'migration', 'refactoring'],
        pipeline: {
            name: 'ts-migration',
            version: '1.0.0',
            description: 'Migrate JavaScript to TypeScript',
            tags: ['typescript', 'migration'],
            estimated_cost: '$0.60',
            estimated_duration: '20 min',
            nodes: [
                { id: 'analyze', type: 'architect-analyzer' },
                { id: 'migrate', type: 'type-migrator', depends_on: ['analyze'] },
                { id: 'lint', type: 'lint-fixer', depends_on: ['migrate'] },
                { id: 'tests', type: 'test-runner', depends_on: ['lint'] },
                { id: 'docs', type: 'doc-writer', depends_on: ['migrate'] },
            ],
        },
    },
    {
        id: 'docs-generator',
        name: 'Documentation Generator',
        description: 'Generates comprehensive documentation including API docs, architecture diagrams, and developer guides.',
        tags: ['docs', 'api', 'architecture'],
        pipeline: {
            name: 'docs-generator',
            version: '1.0.0',
            description: 'Generate project documentation',
            tags: ['docs'],
            estimated_cost: '$0.25',
            estimated_duration: '8 min',
            nodes: [
                { id: 'arch', type: 'architect-analyzer' },
                { id: 'api', type: 'api-designer', depends_on: ['arch'] },
                { id: 'explain', type: 'code-explainer', depends_on: ['arch'] },
                { id: 'docs', type: 'doc-writer', depends_on: ['api', 'explain'] },
                { id: 'changelog', type: 'changelog-writer' },
            ],
        },
    },
    {
        id: 'ci-setup',
        name: 'CI/CD Setup',
        description: 'Sets up GitHub Actions CI/CD with tests, linting, security scanning, and deployment.',
        tags: ['ci', 'devops', 'github-actions'],
        pipeline: {
            name: 'ci-setup',
            version: '1.0.0',
            description: 'Set up CI/CD pipeline',
            tags: ['ci', 'devops'],
            estimated_cost: '$0.15',
            estimated_duration: '5 min',
            nodes: [
                { id: 'analyze', type: 'architect-analyzer' },
                { id: 'ci', type: 'ci-generator', depends_on: ['analyze'] },
                { id: 'docs', type: 'doc-writer', depends_on: ['ci'], config: { scope: 'ci-only' } },
            ],
        },
    },
    {
        id: 'refactor',
        name: 'Deep Refactor',
        description: 'Analyzes architecture, applies refactoring patterns, updates tests, and generates a changelog.',
        tags: ['refactoring', 'architecture', 'cleanup'],
        pipeline: {
            name: 'refactor',
            version: '1.0.0',
            description: 'Deep refactoring with architectural analysis',
            tags: ['refactoring', 'cleanup'],
            estimated_cost: '$0.50',
            estimated_duration: '15 min',
            nodes: [
                { id: 'arch', type: 'architect-analyzer' },
                { id: 'perf', type: 'performance-profiler' },
                { id: 'refactor', type: 'refactor-agent', depends_on: ['arch', 'perf'] },
                { id: 'lint', type: 'lint-fixer', depends_on: ['refactor'] },
                { id: 'tests', type: 'test-runner', depends_on: ['lint'] },
                { id: 'changelog', type: 'changelog-writer', depends_on: ['tests'] },
            ],
        },
    },
];
export class PipelineLoader {
    baseDir;
    constructor(baseDir = process.cwd()) {
        this.baseDir = baseDir;
    }
    get pipelinesDir() {
        return join(this.baseDir, CORTIVEX_DIR, PIPELINES_DIR);
    }
    async load(name) {
        // First check built-in templates
        const template = BUILT_IN_TEMPLATES.find((t) => t.id === name);
        if (template) {
            return structuredClone(template.pipeline);
        }
        // Sanitize pipeline name to prevent path traversal
        const safeName = sanitizePipelineName(name);
        // Then check user pipelines
        const filePath = join(this.pipelinesDir, `${safeName}.yaml`);
        // Path traversal prevention: verify resolved path stays within pipelinesDir
        const resolvedBase = resolve(this.pipelinesDir);
        const resolvedFile = resolve(filePath);
        if (!resolvedFile.startsWith(resolvedBase)) {
            throw new Error('Invalid pipeline name: path traversal detected');
        }
        try {
            await access(filePath);
        }
        catch {
            const ymlPath = join(this.pipelinesDir, `${safeName}.yml`);
            const resolvedYml = resolve(ymlPath);
            if (!resolvedYml.startsWith(resolvedBase)) {
                throw new Error('Invalid pipeline name: path traversal detected');
            }
            try {
                await access(ymlPath);
                const content = await readFile(ymlPath, 'utf-8');
                return this.loadFromString(content);
            }
            catch {
                throw new Error(`Pipeline "${safeName}" not found. Checked:\n  - Built-in templates\n  - ${filePath}\n  - ${ymlPath}\n\nRun "cortivex list" to see available pipelines.`);
            }
        }
        const content = await readFile(filePath, 'utf-8');
        return this.loadFromString(content);
    }
    loadFromString(yamlContent) {
        // Use maxAliasCount to prevent alias expansion attacks (YAML bombs)
        const parsed = parseYaml(yamlContent, { maxAliasCount: 100 });
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid pipeline YAML: expected an object at the root level.');
        }
        const pipeline = parsed;
        const definition = {
            name: String(pipeline['name'] ?? 'unnamed'),
            version: String(pipeline['version'] ?? '1.0.0'),
            description: String(pipeline['description'] ?? ''),
            tags: Array.isArray(pipeline['tags']) ? pipeline['tags'].map(String) : [],
            estimated_cost: String(pipeline['estimated_cost'] ?? 'unknown'),
            estimated_duration: String(pipeline['estimated_duration'] ?? 'unknown'),
            nodes: [],
        };
        const rawNodes = pipeline['nodes'];
        if (!Array.isArray(rawNodes)) {
            throw new Error('Invalid pipeline YAML: "nodes" must be an array.');
        }
        for (const rawNode of rawNodes) {
            if (!rawNode || typeof rawNode !== 'object') {
                throw new Error('Invalid pipeline YAML: each node must be an object.');
            }
            const node = rawNode;
            if (!node['id'] || !node['type']) {
                throw new Error('Invalid pipeline YAML: each node must have "id" and "type" fields.');
            }
            const nodeDef = {
                id: String(node['id']),
                type: String(node['type']),
            };
            if (Array.isArray(node['depends_on'])) {
                nodeDef.depends_on = node['depends_on'].map(String);
            }
            if (node['condition'] !== undefined) {
                nodeDef.condition = String(node['condition']);
            }
            if (node['config'] && typeof node['config'] === 'object') {
                nodeDef.config = node['config'];
            }
            definition.nodes.push(nodeDef);
        }
        return definition;
    }
    validate(pipeline) {
        const errors = [];
        const warnings = [];
        // Check required fields
        if (!pipeline.name || pipeline.name.trim() === '') {
            errors.push('Pipeline must have a "name" field.');
        }
        if (!pipeline.nodes || pipeline.nodes.length === 0) {
            errors.push('Pipeline must have at least one node.');
        }
        // Check node IDs are unique
        const nodeIds = new Set();
        for (const node of pipeline.nodes) {
            if (nodeIds.has(node.id)) {
                errors.push(`Duplicate node ID: "${node.id}".`);
            }
            nodeIds.add(node.id);
        }
        // Check node types exist
        for (const node of pipeline.nodes) {
            if (!nodeRegistry.has(node.type)) {
                errors.push(`Node "${node.id}" references unknown type "${node.type}". Available types: ${nodeRegistry.listIds().join(', ')}`);
            }
        }
        // Check dependencies reference existing nodes
        for (const node of pipeline.nodes) {
            if (node.depends_on) {
                for (const dep of node.depends_on) {
                    if (!nodeIds.has(dep)) {
                        errors.push(`Node "${node.id}" depends on "${dep}", which does not exist in the pipeline.`);
                    }
                }
            }
        }
        // Check for circular dependencies (DAG validation)
        const cycleError = this.detectCycle(pipeline.nodes);
        if (cycleError) {
            errors.push(cycleError);
        }
        // Warnings
        const nodesWithoutDeps = pipeline.nodes.filter((n) => !n.depends_on || n.depends_on.length === 0);
        if (nodesWithoutDeps.length > 3) {
            warnings.push(`${nodesWithoutDeps.length} nodes have no dependencies and will run in parallel. Ensure this is intentional.`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    detectCycle(nodes) {
        const adjacency = new Map();
        for (const node of nodes) {
            adjacency.set(node.id, node.depends_on ?? []);
        }
        const visited = new Set();
        const inStack = new Set();
        const dfs = (nodeId, path) => {
            if (inStack.has(nodeId)) {
                const cycleStart = path.indexOf(nodeId);
                const cycle = [...path.slice(cycleStart), nodeId].join(' -> ');
                return `Circular dependency detected: ${cycle}`;
            }
            if (visited.has(nodeId)) {
                return null;
            }
            visited.add(nodeId);
            inStack.add(nodeId);
            path.push(nodeId);
            const deps = adjacency.get(nodeId) ?? [];
            for (const dep of deps) {
                const result = dfs(dep, [...path]);
                if (result)
                    return result;
            }
            inStack.delete(nodeId);
            return null;
        };
        for (const node of nodes) {
            const result = dfs(node.id, []);
            if (result)
                return result;
        }
        return null;
    }
    async listPipelines() {
        const results = [];
        // Built-in templates
        for (const template of BUILT_IN_TEMPLATES) {
            results.push({
                name: template.id,
                description: template.description,
                source: 'built-in',
                tags: template.tags,
                nodeCount: template.pipeline.nodes.length,
            });
        }
        // User pipelines
        try {
            await access(this.pipelinesDir);
            const files = await readdir(this.pipelinesDir);
            const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
            for (const file of yamlFiles) {
                try {
                    const content = await readFile(join(this.pipelinesDir, file), 'utf-8');
                    const pipeline = this.loadFromString(content);
                    results.push({
                        name: basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml'),
                        description: pipeline.description,
                        source: 'user',
                        tags: pipeline.tags,
                        nodeCount: pipeline.nodes.length,
                    });
                }
                catch {
                    results.push({
                        name: basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml'),
                        description: '(invalid YAML)',
                        source: 'user',
                        tags: [],
                        nodeCount: 0,
                    });
                }
            }
        }
        catch {
            // No pipelines directory — that's fine
        }
        return results;
    }
    listTemplates() {
        return structuredClone(BUILT_IN_TEMPLATES);
    }
    getTemplate(id) {
        return BUILT_IN_TEMPLATES.find((t) => t.id === id);
    }
}
//# sourceMappingURL=loader.js.map