import { readFile, writeFile, readdir, unlink, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const CORTIVEX_DIR = '.cortivex';
const MESH_DIR = 'mesh';
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
/** Agent ID pattern: alphanumeric, hyphens, underscores, dots only */
const AGENT_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
/**
 * Sanitize an agent ID before using it in file paths.
 * Prevents path traversal and injection attacks.
 */
function sanitizeAgentId(agentId) {
    if (!agentId || typeof agentId !== 'string') {
        throw new Error('Agent ID must be a non-empty string');
    }
    if (agentId.length > 128) {
        throw new Error('Agent ID must not exceed 128 characters');
    }
    if (!AGENT_ID_PATTERN.test(agentId)) {
        throw new Error('Agent ID may only contain alphanumeric characters, hyphens, underscores, and dots');
    }
    return agentId;
}
export class MeshManager {
    meshDir;
    constructor(baseDir = process.cwd()) {
        this.meshDir = join(baseDir, CORTIVEX_DIR, MESH_DIR);
    }
    /**
     * Claim files for an agent. Writes a JSON file atomically.
     */
    async claim(agentId, nodeId, pipelineRunId, files) {
        // Sanitize agentId before using in file paths
        const safeAgentId = sanitizeAgentId(agentId);
        await this.ensureDir();
        const now = new Date().toISOString();
        const claim = {
            agentId: safeAgentId,
            nodeId,
            pipelineRunId,
            files,
            status: 'active',
            claimedAt: now,
            lastUpdate: now,
        };
        // Atomic write: write to temp file then rename
        const targetPath = join(this.meshDir, `${safeAgentId}.json`);
        const tempPath = join(this.meshDir, `${safeAgentId}.${randomUUID()}.tmp`);
        const data = JSON.stringify(claim, null, 2);
        await writeFile(tempPath, data, 'utf-8');
        try {
            await rename(tempPath, targetPath);
        }
        catch {
            // On Windows, rename fails if target exists — remove then retry
            try {
                await unlink(targetPath);
            }
            catch {
                // Target didn't exist, that's fine
            }
            await rename(tempPath, targetPath);
        }
        return claim;
    }
    /**
     * Release a claim by removing the agent's claim file.
     */
    async release(agentId) {
        const safeAgentId = sanitizeAgentId(agentId);
        const filePath = join(this.meshDir, `${safeAgentId}.json`);
        try {
            await unlink(filePath);
        }
        catch {
            // File might not exist — that's fine
        }
    }
    /**
     * Query all active mesh claims.
     */
    async query() {
        await this.ensureDir();
        const claims = [];
        const conflicts = [];
        try {
            const files = await readdir(this.meshDir);
            const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.endsWith('.tmp'));
            for (const file of jsonFiles) {
                try {
                    const content = await readFile(join(this.meshDir, file), 'utf-8');
                    const claim = JSON.parse(content);
                    if (claim.status === 'active') {
                        claims.push(claim);
                    }
                }
                catch {
                    // Invalid or corrupt file — skip
                }
            }
            // Detect conflicts: files claimed by multiple agents
            const fileMap = new Map();
            for (const claim of claims) {
                for (const file of claim.files) {
                    const existingClaimer = fileMap.get(file);
                    if (existingClaimer && existingClaimer !== claim.agentId) {
                        conflicts.push({
                            file,
                            claimedBy: existingClaimer,
                            requestedBy: claim.agentId,
                            timestamp: new Date().toISOString(),
                        });
                    }
                    else {
                        fileMap.set(file, claim.agentId);
                    }
                }
            }
        }
        catch {
            // Directory might not exist yet
        }
        return {
            claims,
            conflicts,
            lastCleanup: new Date().toISOString(),
        };
    }
    /**
     * Check if any of the given files are already claimed by another agent.
     * Returns the first conflict found, or null if no conflicts.
     */
    async checkConflict(files) {
        const state = await this.query();
        for (const claim of state.claims) {
            for (const file of files) {
                if (claim.files.includes(file)) {
                    return {
                        file,
                        claimedBy: claim.agentId,
                        requestedBy: 'pending',
                        timestamp: new Date().toISOString(),
                    };
                }
            }
        }
        return null;
    }
    /**
     * Remove claims older than the stale threshold (default: 30 minutes).
     */
    async cleanup() {
        await this.ensureDir();
        let removed = 0;
        try {
            const files = await readdir(this.meshDir);
            const now = Date.now();
            for (const file of files) {
                if (!file.endsWith('.json')) {
                    // Remove temp files
                    if (file.endsWith('.tmp')) {
                        try {
                            await unlink(join(this.meshDir, file));
                            removed++;
                        }
                        catch {
                            // Temp file already removed by another process
                        }
                    }
                    continue;
                }
                try {
                    const content = await readFile(join(this.meshDir, file), 'utf-8');
                    const claim = JSON.parse(content);
                    const claimedAt = new Date(claim.claimedAt).getTime();
                    if (now - claimedAt > STALE_THRESHOLD_MS) {
                        await unlink(join(this.meshDir, file));
                        removed++;
                    }
                }
                catch {
                    // Invalid file — remove it
                    try {
                        await unlink(join(this.meshDir, file));
                        removed++;
                    }
                    catch {
                        // File already removed or locked by another process
                    }
                }
            }
        }
        catch {
            // Directory doesn't exist yet
        }
        return removed;
    }
    /**
     * Update the status of an existing claim.
     */
    async updateStatus(agentId, status) {
        const safeAgentId = sanitizeAgentId(agentId);
        const filePath = join(this.meshDir, `${safeAgentId}.json`);
        try {
            const content = await readFile(filePath, 'utf-8');
            const claim = JSON.parse(content);
            claim.status = status;
            claim.lastUpdate = new Date().toISOString();
            await writeFile(filePath, JSON.stringify(claim, null, 2), 'utf-8');
        }
        catch (error) {
            // Claim file may not exist if agent was already released
            console.error(`Failed to update mesh claim status for agent "${safeAgentId}":`, error instanceof Error ? error.message : error);
        }
    }
    /**
     * Get a specific agent's claim.
     */
    async getClaim(agentId) {
        const safeAgentId = sanitizeAgentId(agentId);
        const filePath = join(this.meshDir, `${safeAgentId}.json`);
        try {
            const content = await readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            // Claim file doesn't exist or is unreadable
            return null;
        }
    }
    async ensureDir() {
        try {
            await mkdir(this.meshDir, { recursive: true });
        }
        catch {
            // Already exists
        }
    }
}
//# sourceMappingURL=manager.js.map