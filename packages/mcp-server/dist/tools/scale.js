/**
 * cortivex_scale — Report and configure agent pool sizing for pipeline execution.
 *
 * The pool size is a configuration value stored in .cortivex/config.json.
 * The PipelineExecutor reads this at runtime to determine max parallelism.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
export async function scaleTool(input) {
    if (input.poolSize === undefined || input.poolSize === null) {
        return {
            content: [{
                    type: 'text',
                    text: 'Error: poolSize is required. Specify the desired number of concurrent agents.',
                }],
        };
    }
    if (typeof input.poolSize !== 'number' || input.poolSize < 1) {
        return {
            content: [{
                    type: 'text',
                    text: 'Error: poolSize must be a positive integer (minimum 1).',
                }],
        };
    }
    if (input.poolSize > 20) {
        return {
            content: [{
                    type: 'text',
                    text: 'Error: poolSize cannot exceed 20. Higher values risk excessive API costs and rate limits.',
                }],
        };
    }
    // Read current config
    const configDir = join(process.cwd(), '.cortivex');
    const configPath = join(configDir, 'config.json');
    let config = {};
    try {
        const raw = await readFile(configPath, 'utf-8');
        config = JSON.parse(raw);
    }
    catch {
        // Config doesn't exist yet
    }
    const poolConfig = config['pool'] ?? {};
    const previous = input.nodeType
        ? poolConfig[input.nodeType] ?? poolConfig['default'] ?? 4
        : poolConfig['default'] ?? 4;
    // Update config
    if (input.nodeType) {
        poolConfig[input.nodeType] = input.poolSize;
    }
    else {
        poolConfig['default'] = input.poolSize;
    }
    config['pool'] = poolConfig;
    // Write config
    await mkdir(configDir, { recursive: true });
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    const scope = input.nodeType ? ` for node type "${input.nodeType}"` : ' (global)';
    return {
        content: [{
                type: 'text',
                text: [
                    `Agent pool size updated${scope}:`,
                    `  Previous: ${previous}`,
                    `  New: ${input.poolSize}`,
                    ``,
                    `Saved to .cortivex/config.json. Takes effect on next pipeline run.`,
                ].join('\n'),
            }],
    };
}
//# sourceMappingURL=scale.js.map