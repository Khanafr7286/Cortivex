/**
 * Pre-Edit Hook — PreToolUse (Edit|Write)
 *
 * Checks mesh ownership before a file edit is performed.
 * If another agent has an active claim on the file, the hook
 * blocks the edit to prevent conflicts between concurrent agents.
 *
 * Claude Code passes the hook context as JSON on stdin.
 * Expected input shape:
 *   { event: "PreToolUse", tool: string, data: { file_path?: string, ... } }
 */
export {};
//# sourceMappingURL=pre-edit.d.ts.map