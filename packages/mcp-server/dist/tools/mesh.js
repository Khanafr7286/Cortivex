/**
 * cortivex_mesh — Query the mesh coordination state.
 */
import { MeshManager } from '@cortivex/core';
export async function meshTool() {
    const mesh = new MeshManager();
    const state = await mesh.query();
    const sections = [];
    // Active claims
    const activeClaims = state.claims.filter((c) => c.status === 'active');
    if (activeClaims.length > 0) {
        const claimLines = activeClaims.map((c) => {
            const files = c.files.length > 3
                ? `${c.files.slice(0, 3).join(', ')} (+${c.files.length - 3} more)`
                : c.files.join(', ');
            return `  - Agent ${c.agentId} (node: ${c.nodeId})\n    Files: ${files}\n    Since: ${c.claimedAt}`;
        });
        sections.push(`Active File Claims (${activeClaims.length}):\n${claimLines.join('\n')}`);
    }
    else {
        sections.push('Active File Claims: none\n  No agents currently have file claims.');
    }
    // Active agents (derived from claims)
    const agentIds = new Set(activeClaims.map((c) => c.agentId));
    if (agentIds.size > 0) {
        const agentLines = [...agentIds].map((id) => {
            const agentClaims = activeClaims.filter((c) => c.agentId === id);
            const totalFiles = agentClaims.reduce((s, c) => s + c.files.length, 0);
            return `  - ${id}: ${agentClaims.length} claims, ${totalFiles} files`;
        });
        sections.push(`Active Agents (${agentIds.size}):\n${agentLines.join('\n')}`);
    }
    else {
        sections.push('Active Agents: none');
    }
    // Conflicts
    if (state.conflicts.length > 0) {
        const conflictLines = state.conflicts.map((c) => `  - ${c.file}: claimed by ${c.claimedBy}, also requested by ${c.requestedBy} (${c.timestamp})`);
        sections.push(`Conflicts (${state.conflicts.length}):\n${conflictLines.join('\n')}`);
    }
    else {
        sections.push('Conflicts: none');
    }
    // File ownership map
    const fileOwners = new Map();
    for (const claim of activeClaims) {
        for (const file of claim.files) {
            fileOwners.set(file, claim.agentId);
        }
    }
    if (fileOwners.size > 0) {
        const ownerLines = [...fileOwners.entries()]
            .slice(0, 20)
            .map(([file, agent]) => `  ${file} -> ${agent}`);
        const moreStr = fileOwners.size > 20 ? `\n  ... and ${fileOwners.size - 20} more` : '';
        sections.push(`File Ownership Map:\n${ownerLines.join('\n')}${moreStr}`);
    }
    sections.push(`Last Cleanup: ${state.lastCleanup}`);
    return {
        content: [{ type: 'text', text: sections.join('\n\n') }],
    };
}
//# sourceMappingURL=mesh.js.map