/**
 * Post-Edit Hook — PostToolUse (Edit|Write)
 *
 * Records file modifications in the mesh state and knowledge graph
 * after an edit or write operation completes. This keeps the mesh
 * aware of which files have been touched during the session.
 *
 * Claude Code passes the hook context as JSON on stdin.
 * Expected input shape:
 *   { event: "PostToolUse", tool: string, data: { file_path?: string, ... } }
 */
export {};
//# sourceMappingURL=post-edit.d.ts.map