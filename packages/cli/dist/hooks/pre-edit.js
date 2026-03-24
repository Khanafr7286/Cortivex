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
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
function loadMeshState(cwd) {
    const meshPath = join(cwd, '.cortivex', 'mesh', 'state.json');
    if (!existsSync(meshPath)) {
        return null;
    }
    try {
        const raw = readFileSync(meshPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function checkFileClaim(meshState, filePath, currentSessionId) {
    const normalizedPath = resolve(filePath);
    for (const claim of meshState.claims) {
        if (claim.status !== 'active')
            continue;
        // Skip claims from the current session
        if (currentSessionId && claim.agentId === currentSessionId)
            continue;
        for (const claimedFile of claim.files) {
            if (resolve(claimedFile) === normalizedPath) {
                return claim;
            }
        }
    }
    return null;
}
async function main() {
    let rawInput = '';
    try {
        rawInput = readFileSync(0, 'utf-8');
    }
    catch {
        process.exit(0);
    }
    if (!rawInput.trim()) {
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
        return;
    }
    let input;
    try {
        input = JSON.parse(rawInput);
    }
    catch {
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
        return;
    }
    const filePath = input.data?.file_path;
    if (!filePath) {
        // No file path in the tool call — allow it
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
        return;
    }
    const cwd = process.cwd();
    const meshState = loadMeshState(cwd);
    if (!meshState) {
        // No mesh state file — no claims to check
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
        return;
    }
    const conflictingClaim = checkFileClaim(meshState, filePath, input.session_id);
    if (conflictingClaim) {
        const result = {
            continue: false,
            reason: `File "${filePath}" is currently claimed by agent "${conflictingClaim.agentId}" (node: ${conflictingClaim.nodeId}, run: ${conflictingClaim.pipelineRunId}). Wait for the claim to be released or use "cortivex mesh --cleanup" to clear stale claims.`,
        };
        process.stdout.write(JSON.stringify(result));
    }
    else {
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
    }
}
main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
});
//# sourceMappingURL=pre-edit.js.map