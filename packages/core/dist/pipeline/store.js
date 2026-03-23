/**
 * PipelineStore — persists and retrieves pipeline definitions from
 * the .cortivex/pipelines/ directory.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { parsePipeline, serializePipelineYaml } from './parser.js';
const CORTIVEX_DIR = '.cortivex';
const PIPELINES_DIR = 'pipelines';
const TEMPLATES_DIR = 'templates';
// ── Built-in templates ───────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
    {
        name: 'code-review',
        version: '1.0.0',
        description: 'Standard code review with linting and security scan',
        tags: ['quality', 'security'],
        estimated_cost: '$0.22',
        estimated_duration: '~135s',
        nodes: [
            { id: 'linter-1', type: 'Linter', config: {} },
            { id: 'code-reviewer-1', type: 'CodeReviewer', depends_on: ['linter-1'], config: {} },
            { id: 'security-scanner-1', type: 'SecurityScanner', depends_on: ['linter-1'], config: {} },
        ],
    },
    {
        name: 'fix-and-test',
        version: '1.0.0',
        description: 'Auto-fix issues then run tests',
        tags: ['quality', 'testing'],
        estimated_cost: '$0.26',
        estimated_duration: '~210s',
        nodes: [
            { id: 'code-reviewer-1', type: 'CodeReviewer', config: {} },
            { id: 'auto-fixer-1', type: 'AutoFixer', depends_on: ['code-reviewer-1'], config: {} },
            { id: 'test-runner-1', type: 'TestRunner', depends_on: ['auto-fixer-1'], config: {} },
        ],
    },
    {
        name: 'ship-it',
        version: '1.0.0',
        description: 'Full review, test, and PR creation pipeline',
        tags: ['quality', 'testing', 'devops'],
        estimated_cost: '$0.32',
        estimated_duration: '~180s',
        nodes: [
            { id: 'linter-1', type: 'Linter', config: {} },
            { id: 'test-runner-1', type: 'TestRunner', depends_on: ['linter-1'], config: {} },
            { id: 'security-scanner-1', type: 'SecurityScanner', depends_on: ['linter-1'], config: {} },
            { id: 'pr-creator-1', type: 'PRCreator', depends_on: ['test-runner-1', 'security-scanner-1'], config: {} },
        ],
    },
    {
        name: 'typescript-migration',
        version: '1.0.0',
        description: 'Migrate JavaScript project to TypeScript',
        tags: ['refactoring', 'quality'],
        estimated_cost: '$0.37',
        estimated_duration: '~300s',
        nodes: [
            { id: 'dependency-updater-1', type: 'DependencyUpdater', config: {} },
            { id: 'type-migrator-1', type: 'TypeMigrator', depends_on: ['dependency-updater-1'], config: {} },
            { id: 'linter-1', type: 'Linter', depends_on: ['type-migrator-1'], config: {} },
            { id: 'test-runner-1', type: 'TestRunner', depends_on: ['linter-1'], config: {} },
        ],
    },
];
// ── Store class ──────────────────────────────────────────────────────
export class PipelineStore {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir ?? process.cwd();
    }
    get pipelinesPath() {
        return join(this.baseDir, CORTIVEX_DIR, PIPELINES_DIR);
    }
    get templatesPath() {
        return join(this.baseDir, CORTIVEX_DIR, TEMPLATES_DIR);
    }
    /**
     * Ensure the .cortivex/pipelines/ directory exists.
     */
    async ensureDir() {
        await mkdir(this.pipelinesPath, { recursive: true });
    }
    /**
     * Save a pipeline definition to disk.
     */
    async save(pipeline) {
        await this.ensureDir();
        const filename = `${pipeline.name}.yaml`;
        const filepath = join(this.pipelinesPath, filename);
        const yaml = serializePipelineYaml(pipeline);
        await writeFile(filepath, yaml, 'utf-8');
        return filepath;
    }
    /**
     * Load a pipeline by name.
     */
    async load(name) {
        // Check saved pipelines
        const yamlPath = join(this.pipelinesPath, `${name}.yaml`);
        const jsonPath = join(this.pipelinesPath, `${name}.json`);
        if (existsSync(yamlPath)) {
            const raw = await readFile(yamlPath, 'utf-8');
            return parsePipeline(raw);
        }
        if (existsSync(jsonPath)) {
            const raw = await readFile(jsonPath, 'utf-8');
            return parsePipeline(raw);
        }
        // Check built-in templates
        const template = BUILT_IN_TEMPLATES.find((t) => t.name === name);
        if (template) {
            return template;
        }
        throw new Error(`Pipeline "${name}" not found`);
    }
    /**
     * Load a pipeline from a raw YAML / JSON string.
     */
    loadFromString(raw) {
        return parsePipeline(raw);
    }
    /**
     * List saved pipelines.
     */
    async listSaved() {
        await this.ensureDir();
        const results = [];
        try {
            const files = await readdir(this.pipelinesPath);
            for (const file of files) {
                if (file.endsWith('.yaml') || file.endsWith('.json')) {
                    try {
                        const raw = await readFile(join(this.pipelinesPath, file), 'utf-8');
                        const pipeline = parsePipeline(raw);
                        results.push({
                            name: pipeline.name,
                            description: pipeline.description,
                            path: join(this.pipelinesPath, file),
                        });
                    }
                    catch {
                        // Skip unparseable files
                    }
                }
            }
        }
        catch {
            // Directory may not exist
        }
        return results;
    }
    /**
     * List built-in templates.
     */
    listTemplates() {
        return BUILT_IN_TEMPLATES.map((t) => ({
            name: t.name,
            description: t.description,
            tags: t.tags,
        }));
    }
    /**
     * List all pipelines (saved + templates).
     */
    async listAll() {
        const saved = await this.listSaved();
        const templates = this.listTemplates();
        const results = [];
        for (const s of saved) {
            results.push({ name: s.name, description: s.description, source: 'saved' });
        }
        for (const t of templates) {
            // Skip if a saved pipeline overrides a template
            if (!results.some((r) => r.name === t.name)) {
                results.push({ name: t.name, description: t.description, source: 'template' });
            }
        }
        return results;
    }
}
//# sourceMappingURL=store.js.map