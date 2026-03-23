/**
 * Input validation helpers for the Cortivex HTTP server.
 * Extracted to avoid circular imports between index.ts and route modules.
 */
/**
 * Validate that a string matches an expected pattern.
 * Returns the sanitized string or throws an error.
 */
export declare function validateInput(value: string, pattern: RegExp, fieldName: string, maxLength?: number): string;
/** Validate a pipeline name: alphanumeric, hyphens, underscores, max 64 chars */
export declare function validatePipelineName(name: string): string;
/** Validate an agent ID: alphanumeric, hyphens, underscores, dots, max 128 chars */
export declare function validateAgentId(id: string): string;
//# sourceMappingURL=validation.d.ts.map