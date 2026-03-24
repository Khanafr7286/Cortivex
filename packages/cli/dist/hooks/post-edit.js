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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
function loadModifications(meshDir) {
    const modPath = join(meshDir, 'modifications.json');
    if (!existsSync(modPath)) {
        return { modifications: [] };
    }
    try {
        const raw = readFileSync(modPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return { modifications: [] };
    }
}
function saveModifications(meshDir, data) {
    const modPath = join(meshDir, 'modifications.json');
    try {
        mkdirSync(dirname(modPath), { recursive: true });
        writeFileSync(modPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch {
        // Non-critical — do not block the session on write failure
    }
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
        const result = { continue: true };
        process.stdout.write(JSON.stringify(result));
        return;
    }
    const cwd = process.cwd();
    const meshDir = join(cwd, '.cortivex', 'mesh');
    // Record the modification
    const modifications = loadModifications(meshDir);
    const entry = {
        file: resolve(filePath),
        tool: input.tool ?? 'unknown',
        timestamp: new Date().toISOString(),
        sessionId: input.session_id ?? 'unknown',
    };
    modifications.modifications.push(entry);
    // Keep only the last 500 entries to prevent unbounded growth
    if (modifications.modifications.length > 500) {
        modifications.modifications = modifications.modifications.slice(-500);
    }
    saveModifications(meshDir, modifications);
    const result = { continue: true };
    process.stdout.write(JSON.stringify(result));
}
main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
});
//# sourceMappingURL=post-edit.js.map