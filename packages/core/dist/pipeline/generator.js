import { nodeRegistry } from '../nodes/registry.js';
const KEYWORD_MAPPINGS = [
    // Code quality
    { keywords: ['review', 'code review', 'check code', 'inspect', 'audit code'], nodeType: 'code-reviewer', priority: 1 },
    { keywords: ['lint', 'linting', 'format', 'formatting', 'style', 'prettier', 'eslint'], nodeType: 'lint-fixer', priority: 2 },
    { keywords: ['bug', 'bugs', 'hunt bugs', 'find bugs'], nodeType: 'bug-hunter', priority: 2 },
    // Security
    { keywords: ['security', 'vulnerability', 'vulnerabilities', 'cve', 'owasp', 'scan for security', 'secure', 'injection', 'xss', 'csrf'], nodeType: 'security-scanner', priority: 1 },
    // Fixing
    { keywords: ['fix', 'repair', 'patch', 'resolve', 'auto-fix', 'autofix', 'fix bugs', 'fix issues', 'correct'], nodeType: 'auto-fixer', priority: 3 },
    // Testing
    { keywords: ['test', 'tests', 'testing', 'unit test', 'integration test', 'coverage', 'spec', 'jest', 'mocha', 'vitest'], nodeType: 'test-runner', priority: 4 },
    { keywords: ['generate tests', 'write tests', 'create tests', 'add tests'], nodeType: 'test-generator', priority: 3 },
    { keywords: ['e2e', 'end to end', 'playwright', 'cypress', 'browser test'], nodeType: 'e2e-test-writer', priority: 4 },
    // Pull requests / Git
    { keywords: ['pr', 'pull request', 'merge request', 'create pr', 'open pr', 'submit pr'], nodeType: 'pr-creator', priority: 5 },
    // Migration
    { keywords: ['migrate', 'migration', 'typescript', 'ts', 'convert to typescript', 'add types', 'type safety'], nodeType: 'type-migrator', priority: 2 },
    // Dependencies
    { keywords: ['dependency', 'dependencies', 'update deps', 'upgrade', 'npm update', 'outdated', 'renovate', 'dependabot'], nodeType: 'dependency-updater', priority: 1 },
    // Documentation
    { keywords: ['document', 'documentation', 'docs', 'readme', 'jsdoc', 'tsdoc', 'comment', 'annotate'], nodeType: 'doc-writer', priority: 4 },
    { keywords: ['explain', 'explanation', 'onboarding', 'understand code'], nodeType: 'code-explainer', priority: 4 },
    { keywords: ['changelog', 'release notes', 'change log'], nodeType: 'changelog-writer', priority: 5 },
    // Refactoring
    { keywords: ['refactor', 'restructure', 'reorganize', 'clean up', 'cleanup', 'simplify', 'improve structure', 'decouple'], nodeType: 'refactor-agent', priority: 3 },
    // Performance / Analysis
    { keywords: ['performance', 'perf', 'optimize', 'optimise', 'speed', 'fast', 'slow', 'bottleneck', 'memory', 'cpu', 'profile', 'benchmark'], nodeType: 'performance-profiler', priority: 2 },
    { keywords: ['architecture', 'architect', 'coupling', 'circular dependency', 'module structure'], nodeType: 'architect-analyzer', priority: 2 },
    // API
    { keywords: ['api', 'endpoint', 'rest', 'graphql', 'openapi', 'swagger', 'route', 'controller', 'generate api'], nodeType: 'api-designer', priority: 3 },
    // Database
    { keywords: ['database', 'db', 'migration script', 'schema migration', 'sql', 'prisma', 'sequelize'], nodeType: 'database-migrator', priority: 3 },
    // CI/CD
    { keywords: ['github actions', 'gitlab ci', 'ci config', 'ci/cd config', 'workflow yaml'], nodeType: 'ci-generator', priority: 5 },
    // Deployment
    { keywords: ['deploy', 'deployment', 'ship', 'release', 'publish', 'docker', 'kubernetes', 'k8s'], nodeType: 'ci-generator', priority: 5 },
];
const PIPELINE_PATTERNS = [
    {
        trigger: ['full review', 'complete review', 'comprehensive review', 'thorough review'],
        name: 'Comprehensive Code Review',
        description: 'Full code review with security scanning, linting, and performance analysis',
        nodes: [
            { type: 'lint-fixer' },
            { type: 'code-reviewer', depends_on: ['lint-fixer-1'] },
            { type: 'security-scanner', depends_on: ['lint-fixer-1'] },
            { type: 'performance-profiler', depends_on: ['code-reviewer-1'] },
        ],
    },
    {
        trigger: ['ci', 'continuous integration', 'ci/cd', 'build pipeline'],
        name: 'CI/CD Pipeline',
        description: 'Continuous integration pipeline with linting, testing, and CI config generation',
        nodes: [
            { type: 'lint-fixer' },
            { type: 'test-runner', depends_on: ['lint-fixer-1'] },
            { type: 'security-scanner', depends_on: ['lint-fixer-1'] },
            { type: 'ci-generator', depends_on: ['test-runner-1', 'security-scanner-1'] },
        ],
    },
    {
        trigger: ['modernize', 'upgrade codebase', 'bring up to date'],
        name: 'Codebase Modernization',
        description: 'Update dependencies, migrate to TypeScript, and refactor code',
        nodes: [
            { type: 'dependency-updater' },
            { type: 'type-migrator', depends_on: ['dependency-updater-1'] },
            { type: 'refactor-agent', depends_on: ['type-migrator-1'] },
            { type: 'test-runner', depends_on: ['refactor-agent-1'] },
        ],
    },
    {
        trigger: ['ship it', 'prepare release', 'get ready to deploy'],
        name: 'Release Preparation',
        description: 'Full review, tests, and PR creation for release',
        nodes: [
            { type: 'lint-fixer' },
            { type: 'test-runner', depends_on: ['lint-fixer-1'] },
            { type: 'security-scanner', depends_on: ['lint-fixer-1'] },
            { type: 'pr-creator', depends_on: ['test-runner-1', 'security-scanner-1'] },
        ],
    },
    {
        trigger: ['fix and test', 'find and fix', 'review and fix'],
        name: 'Review, Fix, and Test',
        description: 'Review code, auto-fix issues, then run tests to verify',
        nodes: [
            { type: 'code-reviewer' },
            { type: 'auto-fixer', depends_on: ['code-reviewer-1'] },
            { type: 'test-runner', depends_on: ['auto-fixer-1'] },
        ],
    },
];
// ── Generator ────────────────────────────────────────────────────────
/**
 * Generate a pipeline definition from a natural language description.
 */
export function generatePipeline(name, description) {
    const lower = description.toLowerCase();
    // 1. Check for known pipeline patterns first
    for (const pattern of PIPELINE_PATTERNS) {
        if (pattern.trigger.some((t) => lower.includes(t))) {
            return buildPipelineFromPattern(name, description, pattern);
        }
    }
    // 2. Fall back to keyword matching
    const matchedTypes = matchKeywords(lower);
    if (matchedTypes.length === 0) {
        // Default pipeline: review + test
        matchedTypes.push('code-reviewer', 'test-runner');
    }
    return buildPipelineFromTypes(name, description, matchedTypes);
}
/**
 * Match keywords in text to node types.  Returns unique types sorted
 * by the priority in which they should appear in the pipeline.
 */
function matchKeywords(text) {
    const scored = new Map();
    for (const mapping of KEYWORD_MAPPINGS) {
        for (const kw of mapping.keywords) {
            if (text.includes(kw)) {
                const existing = scored.get(mapping.nodeType) ?? Infinity;
                scored.set(mapping.nodeType, Math.min(existing, mapping.priority));
            }
        }
    }
    return [...scored.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([type]) => type);
}
/**
 * Build a pipeline definition from a known pattern.
 */
function buildPipelineFromPattern(name, description, pattern) {
    const typeCounts = new Map();
    const nodes = pattern.nodes.map((n) => {
        const count = (typeCounts.get(n.type) ?? 0) + 1;
        typeCounts.set(n.type, count);
        const id = `${n.type}-${count}`;
        const meta = nodeRegistry.get(n.type);
        return {
            id,
            type: n.type,
            depends_on: n.depends_on,
            config: {
                model: meta?.defaultModel ?? 'claude-sonnet-4-20250514',
            },
        };
    });
    const totalCost = nodes.reduce((sum, n) => {
        const meta = nodeRegistry.get(n.type);
        return sum + (meta?.avgCost ?? 0.05);
    }, 0);
    const maxDuration = Math.max(...nodes.map((n) => nodeRegistry.get(n.type)?.avgDuration ?? 60));
    return {
        name,
        version: '1.0.0',
        description: description || pattern.description,
        tags: extractTags(nodes),
        estimated_cost: `$${totalCost.toFixed(2)}`,
        estimated_duration: `~${maxDuration}s`,
        nodes,
    };
}
/**
 * Build a pipeline definition from a list of node types.
 * Automatically creates a linear dependency chain.
 */
function buildPipelineFromTypes(name, description, types) {
    const typeCounts = new Map();
    let prevId;
    const nodes = types.map((type) => {
        const count = (typeCounts.get(type) ?? 0) + 1;
        typeCounts.set(type, count);
        const id = `${type}-${count}`;
        const meta = nodeRegistry.get(type);
        const node = {
            id,
            type,
            depends_on: prevId ? [prevId] : undefined,
            config: {
                model: meta?.defaultModel ?? 'claude-sonnet-4-20250514',
            },
        };
        prevId = id;
        return node;
    });
    const totalCost = nodes.reduce((sum, n) => {
        const meta = nodeRegistry.get(n.type);
        return sum + (meta?.avgCost ?? 0.05);
    }, 0);
    const totalDuration = nodes.reduce((sum, n) => {
        const meta = nodeRegistry.get(n.type);
        return sum + (meta?.avgDuration ?? 60);
    }, 0);
    return {
        name,
        version: '1.0.0',
        description,
        tags: extractTags(nodes),
        estimated_cost: `$${totalCost.toFixed(2)}`,
        estimated_duration: `~${totalDuration}s`,
        nodes,
    };
}
// ── Helpers ──────────────────────────────────────────────────────────
function extractTags(nodes) {
    const tags = new Set();
    for (const n of nodes) {
        const meta = nodeRegistry.get(n.type);
        if (meta) {
            tags.add(meta.category);
        }
    }
    return [...tags];
}
//# sourceMappingURL=generator.js.map