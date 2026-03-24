/**
 * Session End Hook — Stop
 *
 * Cleans up mesh claims held by the current session when it ends.
 * Releases any active file ownership claims so other agents are
 * no longer blocked, and records session metrics.
 *
 * Claude Code passes the hook context as JSON on stdin.
 * Expected input shape:
 *   { event: "Stop", data: { session_id?: string } }
 */
export {};
//# sourceMappingURL=session-end.d.ts.map