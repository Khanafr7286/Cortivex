/**
 * Input validation helpers for the Cortivex HTTP server.
 * Extracted to avoid circular imports between index.ts and route modules.
 */
/**
 * Validate that a string matches an expected pattern.
 * Returns the sanitized string or throws an error.
 */
export function validateInput(value, pattern, fieldName, maxLength = 256) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
    }
    if (!pattern.test(value)) {
        throw new Error(`${fieldName} contains invalid characters`);
    }
    return value;
}
/** Validate a pipeline name: alphanumeric, hyphens, underscores, max 64 chars */
export function validatePipelineName(name) {
    return validateInput(name, /^[a-zA-Z0-9_-]+$/, 'Pipeline name', 64);
}
/** Validate an agent ID: alphanumeric, hyphens, underscores, dots, max 128 chars */
export function validateAgentId(id) {
    return validateInput(id, /^[a-zA-Z0-9._-]+$/, 'Agent ID', 128);
}
//# sourceMappingURL=validation.js.map