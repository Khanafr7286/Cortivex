/**
 * N8n export endpoint — converts Cortivex pipelines to n8n workflows.
 *
 * This is the same functionality as POST /api/pipeline/export/n8n in
 * the pipeline routes, but provided as a dedicated endpoint for clarity.
 * The pipeline route delegates to this module.
 */
import { Router } from 'express';
import { PipelineLoader, exportToN8n } from '@cortivex/core';
const router = Router();
/**
 * POST /api/export/n8n
 * Convert a Cortivex pipeline to n8n workflow JSON.
 *
 * Body: { pipeline: string }
 *   - pipeline: Name of a saved/template pipeline, or inline YAML/JSON.
 *
 * Response: Complete n8n workflow JSON ready to import.
 *
 * The generated workflow contains:
 *   - A manual trigger node
 *   - HTTP Request nodes for each pipeline node (pointing to localhost:3939)
 *   - A "Pipeline Complete" node
 *   - Proper connections preserving the DAG structure
 *   - Node colors matching Cortivex node types
 *   - Grid-based layout by dependency depth
 */
router.post('/', async (req, res) => {
    try {
        const { pipeline } = req.body;
        if (!pipeline) {
            res.status(400).json({
                error: 'Missing required field: pipeline',
                usage: 'POST /api/export/n8n with body { "pipeline": "pipeline-name-or-yaml" }',
            });
            return;
        }
        const loader = new PipelineLoader();
        let pipelineDef;
        try {
            pipelineDef = await loader.load(pipeline);
        }
        catch {
            // Pipeline not found by name — try parsing as inline YAML/JSON
            try {
                pipelineDef = loader.loadFromString(pipeline);
            }
            catch (parseErr) {
                res.status(404).json({
                    error: `Could not find or parse pipeline "${pipeline}"`,
                    details: parseErr instanceof Error ? parseErr.message : String(parseErr),
                });
                return;
            }
        }
        const n8nWorkflow = exportToN8n(pipelineDef);
        res.json({
            workflow: n8nWorkflow,
            pipeline: {
                name: pipelineDef.name,
                description: pipelineDef.description,
                nodeCount: pipelineDef.nodes.length,
            },
            instructions: {
                import: 'Copy the "workflow" object and import it into n8n via Settings > Import Workflow.',
                requirements: 'Ensure the Cortivex HTTP server is running on localhost:3939 before executing the workflow.',
                customize: 'You can modify the HTTP Request node parameters to point to a different Cortivex server URL.',
            },
        });
    }
    catch (err) {
        res.status(500).json({
            error: 'N8n export failed',
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
export default router;
//# sourceMappingURL=n8n-export.js.map