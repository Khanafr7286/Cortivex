/**
 * cortivex_knowledge — Query the shared knowledge graph from execution history.
 */
import { HistoryRecorder } from '@cortivex/core';
export async function knowledgeTool(input) {
    const recorder = new HistoryRecorder();
    const history = await recorder.getHistory();
    const limit = input.limit ?? 50;
    // Build knowledge entries from execution history
    const entries = [];
    for (const record of history) {
        for (const node of record.nodeResults) {
            // Filter by nodeType if specified
            if (input.nodeType && node.nodeType !== input.nodeType)
                continue;
            // Filter by query if specified
            if (input.query) {
                const q = input.query.toLowerCase();
                if (!node.nodeId.toLowerCase().includes(q) && !node.nodeType.toLowerCase().includes(q))
                    continue;
            }
            entries.push({
                type: node.nodeType,
                summary: `${node.nodeId}: ${node.success ? 'passed' : 'failed'} ($${node.cost.toFixed(3)}, ${node.duration.toFixed(1)}s)`,
                pipeline: record.pipeline,
                success: node.success,
                cost: node.cost,
                timestamp: record.timestamp,
            });
        }
    }
    // Collect unique node types
    const nodeTypes = [...new Set(entries.map((e) => e.type))];
    const sections = [];
    sections.push([
        `Knowledge Graph${input.query ? ` (query: "${input.query}")` : ''}:`,
        `  Total Entries: ${entries.length}`,
        `  Node Types: ${nodeTypes.join(', ') || 'none'}`,
        `  Source: ${history.length} execution records`,
    ].join('\n'));
    const limited = entries.slice(0, limit);
    if (limited.length > 0) {
        const entryLines = limited.map((e) => [
            `  - [${e.type}] ${e.summary}`,
            `    Pipeline: ${e.pipeline} | ${e.timestamp}`,
        ].join('\n'));
        sections.push(`Entries (${limited.length}${entries.length > limit ? ` of ${entries.length}` : ''}):\n${entryLines.join('\n')}`);
    }
    else {
        sections.push('Entries: none\n' +
            '  No knowledge entries found. Run pipelines to populate the knowledge graph.');
    }
    return {
        content: [{ type: 'text', text: sections.join('\n\n') }],
    };
}
//# sourceMappingURL=knowledge.js.map