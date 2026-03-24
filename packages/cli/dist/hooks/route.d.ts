/**
 * Route Hook — UserPromptSubmit
 *
 * Inspects the user's prompt to detect pipeline-related intent.
 * If the prompt matches known pipeline keywords, outputs a suggestion
 * to route the task to the appropriate Cortivex pipeline.
 *
 * Claude Code passes the hook context as JSON on stdin.
 * Expected input shape:
 *   { event: "UserPromptSubmit", data: { prompt: string } }
 */
export {};
//# sourceMappingURL=route.d.ts.map