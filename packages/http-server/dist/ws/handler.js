/**
 * WebSocket handler — streams pipeline execution events in real-time.
 *
 * Events:
 *   node:start, node:progress, node:complete, node:failed,
 *   pipeline:complete, mesh:claim, mesh:release, mesh:conflict
 */
import { WebSocketServer, WebSocket } from 'ws';
const clients = new Set();
/**
 * Attach a WebSocket server to an existing HTTP server.
 * Handles connection lifecycle and broadcasts.
 */
export function createWebSocketHandler(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress ?? 'unknown';
        console.log(`[WS] Client connected from ${clientIp}`);
        clients.add(ws);
        // Send a welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            data: { message: 'Connected to Cortivex real-time event stream' },
            timestamp: new Date().toISOString(),
        }));
        ws.on('close', () => {
            clients.delete(ws);
            console.log(`[WS] Client disconnected from ${clientIp}`);
        });
        ws.on('error', (err) => {
            console.error(`[WS] Error from ${clientIp}:`, err.message);
            clients.delete(ws);
        });
        // Handle incoming messages (ping/pong, subscription management)
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({
                        type: 'pong',
                        data: {},
                        timestamp: new Date().toISOString(),
                    }));
                }
            }
            catch {
                // Ignore malformed messages
            }
        });
    });
    return wss;
}
/**
 * Broadcast an event to all connected WebSocket clients.
 */
export function broadcast(event, data) {
    const message = JSON.stringify({
        type: event,
        data,
        timestamp: new Date().toISOString(),
    });
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            }
            catch {
                // Remove broken connections
                clients.delete(client);
            }
        }
    }
}
/**
 * Wire up a PipelineExecutor to broadcast events over WebSocket.
 */
export function attachExecutorEvents(executor) {
    executor.on('pipeline:start', (runId, pipeline) => {
        broadcast('pipeline:start', { runId, pipeline });
    });
    executor.on('pipeline:complete', (run) => {
        broadcast('pipeline:complete', {
            runId: run.id,
            pipeline: run.pipeline,
            status: run.status,
            totalCost: run.totalCost,
            totalTokens: run.totalTokens,
            duration: run.completedAt
                ? Date.parse(run.completedAt) - Date.parse(run.startedAt)
                : 0,
        });
    });
    executor.on('pipeline:failed', (run, error) => {
        broadcast('pipeline:failed', {
            runId: run.id,
            pipeline: run.pipeline,
            status: run.status,
            error,
        });
    });
    executor.on('node:start', (nodeId, nodeType) => {
        broadcast('node:start', { nodeId, nodeType });
    });
    executor.on('node:progress', (nodeId, progress, message) => {
        broadcast('node:progress', {
            nodeId,
            progress,
            line: message ? { type: 'stdout', text: String(message) } : undefined,
        });
    });
    executor.on('node:complete', (nodeId, state) => {
        broadcast('node:complete', {
            nodeId,
            duration: state.startedAt && state.completedAt
                ? Date.parse(state.completedAt) - Date.parse(state.startedAt)
                : 0,
            cost: state.cost,
            tokens: state.tokens,
        });
    });
    executor.on('node:failed', (nodeId, error) => {
        broadcast('node:failed', { nodeId, error });
    });
    executor.on('mesh:claim', (agentId, files) => {
        broadcast('mesh:claim', { agentId, files });
    });
    executor.on('mesh:release', (agentId) => {
        broadcast('mesh:release', { agentId });
    });
    executor.on('mesh:conflict', (file, claimedBy) => {
        broadcast('mesh:conflict', { file, claimedBy });
    });
}
/**
 * Get the count of connected clients.
 */
export function getClientCount() {
    return clients.size;
}
//# sourceMappingURL=handler.js.map