import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import { PipelineLoader } from '@cortivex/core';
const CORTIVEX_DIR = '.cortivex';
const DIRS = [
    CORTIVEX_DIR,
    join(CORTIVEX_DIR, 'pipelines'),
    join(CORTIVEX_DIR, 'history'),
    join(CORTIVEX_DIR, 'mesh'),
    join(CORTIVEX_DIR, 'insights'),
];
export async function initCommand(options) {
    const cwd = process.cwd();
    const cortivexDir = join(cwd, CORTIVEX_DIR);
    // Check if already initialized
    if (!options.force) {
        try {
            await access(cortivexDir);
            console.log(chalk.yellow('  Cortivex is already initialized in this directory.'));
            console.log(chalk.gray('  Use --force to reinitialize.'));
            return;
        }
        catch {
            // Not initialized — proceed
        }
    }
    console.log('');
    console.log(chalk.bold.cyan('  Initializing Cortivex...'));
    console.log('');
    // Create directory structure
    for (const dir of DIRS) {
        const fullPath = join(cwd, dir);
        await mkdir(fullPath, { recursive: true });
        console.log(chalk.green('  +') + chalk.gray(` ${dir}/`));
    }
    // Write built-in pipeline templates as YAML files
    const loader = new PipelineLoader(cwd);
    const templates = loader.listTemplates();
    for (const template of templates) {
        const yamlContent = serializePipelineYaml(template.pipeline);
        const filePath = join(cwd, CORTIVEX_DIR, 'pipelines', `${template.id}.yaml`);
        await writeFile(filePath, yamlContent, 'utf-8');
        console.log(chalk.green('  +') +
            chalk.gray(` ${CORTIVEX_DIR}/pipelines/${template.id}.yaml`));
    }
    // Write .gitignore for mesh directory
    const gitignorePath = join(cwd, CORTIVEX_DIR, 'mesh', '.gitignore');
    await writeFile(gitignorePath, '*.json\n*.tmp\n', 'utf-8');
    console.log(chalk.green('  +') + chalk.gray(` ${CORTIVEX_DIR}/mesh/.gitignore`));
    // Write config file
    const configPath = join(cwd, CORTIVEX_DIR, 'config.json');
    const config = {
        version: '1.0.0',
        defaultModel: 'claude-sonnet-4-20250514',
        failureStrategy: 'stop',
        maxRetries: 1,
        parallelism: 4,
        timeout: 900,
        server: {
            port: 3939,
        },
        dashboard: {
            port: 4200,
        },
    };
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(chalk.green('  +') + chalk.gray(` ${CORTIVEX_DIR}/config.json`));
    // Create Claude skills directory
    const skillsDir = join(cwd, '.claude', 'skills', 'cortivex');
    await mkdir(skillsDir, { recursive: true });
    const skillContent = `---
name: Cortivex Pipeline Runner
description: Run and manage AI agent pipelines with Cortivex
---

# Cortivex Pipeline Runner

You can use the Cortivex CLI to run AI agent pipelines on this project.

## Available Commands

- \`cortivex run <pipeline>\` — Run a pipeline (e.g., \`cortivex run full-review\`)
- \`cortivex list\` — List available pipelines and templates
- \`cortivex create <name>\` — Create a new pipeline from a description
- \`cortivex insights\` — View learned patterns from past executions
- \`cortivex mesh\` — View current mesh coordination state

## Built-in Pipeline Templates

- **full-review** — Comprehensive code review with security, bug hunting, and auto-fix
- **quick-fix** — Fast review and lint fix
- **security-audit** — Deep security analysis and remediation
- **test-suite** — Generate unit and E2E tests
- **ts-migration** — Convert JavaScript to TypeScript
- **docs-generator** — Generate documentation and API specs
- **ci-setup** — Set up GitHub Actions CI/CD
- **refactor** — Architecture analysis and deep refactoring

## Custom Pipelines

Create custom pipelines by adding YAML files to \`.cortivex/pipelines/\`. See existing templates for the format.
`;
    await writeFile(join(skillsDir, 'pipeline-runner.md'), skillContent, 'utf-8');
    console.log(chalk.green('  +') +
        chalk.gray(' .claude/skills/cortivex/pipeline-runner.md'));
    // Create MCP server configuration
    const mcpConfigDir = join(cwd, '.claude');
    await mkdir(mcpConfigDir, { recursive: true });
    const mcpConfigPath = join(mcpConfigDir, 'mcp.json');
    let mcpConfig = {};
    try {
        const { readFile } = await import('node:fs/promises');
        const existing = await readFile(mcpConfigPath, 'utf-8');
        mcpConfig = JSON.parse(existing);
    }
    catch {
        // No existing config
    }
    const mcpServers = mcpConfig['mcpServers'] ?? {};
    mcpServers['cortivex'] = {
        command: 'cortivex',
        args: ['serve', '--mcp'],
        env: {},
    };
    mcpConfig['mcpServers'] = mcpServers;
    await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
    console.log(chalk.green('  +') + chalk.gray(' .claude/mcp.json (cortivex server added)'));
    console.log('');
    console.log(chalk.bold.green('  Cortivex initialized successfully!'));
    console.log('');
    console.log(chalk.gray('  Next steps:'));
    console.log(chalk.white('    cortivex list') +
        chalk.gray('        — see available pipelines'));
    console.log(chalk.white('    cortivex run full-review') +
        chalk.gray(' — run your first pipeline'));
    console.log(chalk.white('    cortivex run --dry-run') +
        chalk.gray('   — preview without executing'));
    console.log('');
}
function serializePipelineYaml(pipeline) {
    let yaml = '';
    yaml += `name: ${pipeline.name}\n`;
    yaml += `version: "${pipeline.version}"\n`;
    yaml += `description: "${pipeline.description}"\n`;
    yaml += `tags: [${pipeline.tags.map((t) => `"${t}"`).join(', ')}]\n`;
    yaml += `estimated_cost: "${pipeline.estimated_cost}"\n`;
    yaml += `estimated_duration: "${pipeline.estimated_duration}"\n`;
    yaml += `nodes:\n`;
    for (const node of pipeline.nodes) {
        yaml += `  - id: ${node.id}\n`;
        yaml += `    type: ${node.type}\n`;
        if (node.depends_on && node.depends_on.length > 0) {
            yaml += `    depends_on: [${node.depends_on.map((d) => `"${d}"`).join(', ')}]\n`;
        }
        if (node.condition) {
            yaml += `    condition: "${node.condition}"\n`;
        }
        if (node.config) {
            yaml += `    config:\n`;
            for (const [key, value] of Object.entries(node.config)) {
                yaml += `      ${key}: ${JSON.stringify(value)}\n`;
            }
        }
    }
    return yaml;
}
//# sourceMappingURL=init.js.map