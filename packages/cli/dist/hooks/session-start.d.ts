/**
 * Session Start Hook — SessionStart
 *
 * Initializes the Cortivex session when Claude Code starts.
 * Loads project configuration, verifies the .cortivex/ directory exists,
 * and prepares the mesh state for the session.
 *
 * Claude Code passes the hook context as JSON on stdin.
 * Expected input shape:
 *   { event: "SessionStart", data: { session_id?: string, cwd?: string } }
 */
export {};
//# sourceMappingURL=session-start.d.ts.map