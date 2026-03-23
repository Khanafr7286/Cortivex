#!/usr/bin/env node
/**
 * Validate that a string matches an expected pattern.
 * Returns the sanitized string or throws an error.
 */
export declare function validateInput(value: string, pattern: RegExp, fieldName: string, maxLength?: number): string;
/** Validate a pipeline name: alphanumeric, hyphens, underscores, max 64 chars */
export declare function validatePipelineName(name: string): string;
/** Validate an agent ID: alphanumeric, hyphens, underscores, dots, max 128 chars */
export declare function validateAgentId(id: string): string;
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export { app, httpServer };
//# sourceMappingURL=index.d.ts.map