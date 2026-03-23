import chalk from 'chalk';
import { PipelineLoader, PipelineExecutor, PatternExtractor, InsightApplier, } from '@cortivex/core';
export async function runCommand(pipelineName, options) {
    const cwd = process.cwd();
    const loader = new PipelineLoader(cwd);
    console.log('');
    console.log(chalk.bold.cyan(`  Running pipeline: ${pipelineName}`));
    // Load pipeline
    let pipeline;
    try {
        pipeline = await loader.load(pipelineName);
    }
    catch (error) {
        console.log('');
        console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
        console.log('');
        process.exit(1);
    }
    // Validate pipeline
    const validation = loader.validate(pipeline);
    if (!validation.valid) {
        console.log('');
        console.log(chalk.red('  Pipeline validation failed:'));
        for (const error of validation.errors) {
            console.log(chalk.red(`    - ${error}`));
        }
        console.log('');
        process.exit(1);
    }
    if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
            console.log(chalk.yellow(`  Warning: ${warning}`));
        }
    }
    // Apply learned insights if available
    if (options.learn !== false) {
        try {
            const extractor = new PatternExtractor(cwd);
            const insights = await extractor.analyze();
            if (insights.length > 0) {
                const applier = new InsightApplier();
                const { pipeline: optimized, changes } = applier.apply(pipeline, insights);
                const appliedChanges = changes.filter((c) => c.applied);
                if (appliedChanges.length > 0) {
                    console.log('');
                    console.log(chalk.magenta(`  Applied ${appliedChanges.length} learned optimization(s):`));
                    for (const change of appliedChanges) {
                        console.log(chalk.magenta(`    - ${change.description}`));
                    }
                    pipeline = optimized;
                }
            }
        }
        catch {
            // Learning is optional — proceed without it
        }
    }
    // Display pipeline info
    console.log(chalk.gray(`  Description: ${pipeline.description}`));
    console.log(chalk.gray(`  Nodes: ${pipeline.nodes.length}`));
    console.log(chalk.gray(`  Est. cost: ${pipeline.estimated_cost}`));
    console.log(chalk.gray(`  Est. duration: ${pipeline.estimated_duration}`));
    console.log('');
    if (options.dryRun) {
        console.log(chalk.yellow('  DRY RUN — no changes will be made'));
        console.log('');
    }
    // Create executor
    const executor = new PipelineExecutor(cwd);
    const nodeStates = new Map();
    // Set up event listeners for live output
    executor.on('node:start', (nodeId, nodeType) => {
        nodeStates.set(nodeId, 'running');
        printNodeStatus(nodeId, nodeType, 'running');
    });
    executor.on('node:progress', (nodeId, progress, message) => {
        printProgress(nodeId, progress, message);
    });
    executor.on('node:complete', (nodeId, state) => {
        nodeStates.set(nodeId, 'completed');
        printNodeComplete(nodeId, state);
    });
    executor.on('node:failed', (nodeId, error) => {
        nodeStates.set(nodeId, 'failed');
        printNodeFailed(nodeId, error);
    });
    executor.on('mesh:conflict', (file, claimedBy) => {
        console.log(chalk.yellow(`    Mesh conflict: "${file}" claimed by ${claimedBy}, waiting...`));
    });
    // Execute pipeline
    const startTime = Date.now();
    const run = await executor.execute(pipeline, {
        dryRun: options.dryRun,
        verbose: options.verbose,
        model: options.model,
        parallelism: options.parallel ? parseInt(options.parallel, 10) : 4,
        failureStrategy: options.strategy ?? 'stop',
        maxRetries: options.retries ? parseInt(options.retries, 10) : 1,
        targetDir: cwd,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    // Print summary
    printSummary(run, elapsed);
}
function printNodeStatus(nodeId, nodeType, status) {
    const icon = status === 'running' ? chalk.blue('>>>') : chalk.gray('---');
    console.log(`  ${icon} ${chalk.bold(nodeId)} ${chalk.gray(`(${nodeType})`)}`);
}
function printProgress(nodeId, progress, message) {
    const barWidth = 20;
    const filled = Math.round((progress / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = chalk.cyan('\u2588'.repeat(filled)) +
        chalk.gray('\u2591'.repeat(empty));
    process.stdout.write(`\r      ${bar} ${progress}% ${chalk.gray(message.slice(0, 40))}`);
    if (progress >= 100) {
        process.stdout.write('\n');
    }
}
function printNodeComplete(nodeId, state) {
    const costStr = state.cost > 0 ? chalk.gray(` $${state.cost.toFixed(3)}`) : '';
    const tokensStr = state.tokens > 0 ? chalk.gray(` ${state.tokens} tokens`) : '';
    const filesStr = state.filesModified.length > 0
        ? chalk.gray(` ${state.filesModified.length} files`)
        : '';
    console.log(`  ${chalk.green('\u2714')} ${chalk.bold(nodeId)} ${chalk.green('completed')}${costStr}${tokensStr}${filesStr}`);
}
function printNodeFailed(nodeId, error) {
    console.log(`  ${chalk.red('\u2718')} ${chalk.bold(nodeId)} ${chalk.red('failed')}`);
    console.log(chalk.red(`      ${error.slice(0, 200)}`));
}
function printSummary(run, elapsed) {
    console.log('');
    console.log(chalk.bold('  Pipeline Summary'));
    console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
    const statusColor = run.status === 'completed' ? chalk.green : chalk.red;
    console.log(`  Status:     ${statusColor(run.status.toUpperCase())}`);
    console.log(`  Duration:   ${chalk.white(elapsed + 's')}`);
    console.log(`  Total Cost: ${chalk.white('$' + run.totalCost.toFixed(3))}`);
    console.log(`  Tokens:     ${chalk.white(run.totalTokens.toLocaleString())}`);
    // Node breakdown
    const completed = run.nodes.filter((n) => n.status === 'completed').length;
    const failed = run.nodes.filter((n) => n.status === 'failed').length;
    const skipped = run.nodes.filter((n) => n.status === 'skipped').length;
    console.log(`  Nodes:      ${chalk.green(completed + ' completed')}${failed > 0 ? chalk.red(', ' + failed + ' failed') : ''}${skipped > 0 ? chalk.yellow(', ' + skipped + ' skipped') : ''}`);
    if (run.filesModified.length > 0) {
        console.log(`  Modified:   ${chalk.white(run.filesModified.length + ' files')}`);
        for (const file of run.filesModified.slice(0, 10)) {
            console.log(chalk.gray(`              ${file}`));
        }
        if (run.filesModified.length > 10) {
            console.log(chalk.gray(`              ... and ${run.filesModified.length - 10} more`));
        }
    }
    console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
    console.log(chalk.gray(`  Run ID: ${run.id}`));
    console.log('');
}
//# sourceMappingURL=run.js.map