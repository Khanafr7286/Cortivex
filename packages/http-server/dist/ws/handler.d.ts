/**
 * WebSocket handler — streams pipeline execution events in real-time.
 *
 * Events:
 *   node:start, node:progress, node:complete, node:failed,
 *   pipeline:complete, mesh:claim, mesh:release, mesh:conflict
 */
import { WebSocketServer } from 'ws';
import type { Server as HttpServer } from 'node:http';
import type { PipelineExecutor } from '@cortivex/core';
/**
 * Attach a WebSocket server to an existing HTTP server.
 * Handles connection lifecycle and broadcasts.
 */
export declare function createWebSocketHandler(httpServer: HttpServer): WebSocketServer;
/**
 * Broadcast an event to all connected WebSocket clients.
 */
export declare function broadcast(event: string, data: Record<string, unknown>): void;
/**
 * Wire up a PipelineExecutor to broadcast events over WebSocket.
 */
export declare function attachExecutorEvents(executor: PipelineExecutor): void;
/**
 * Get the count of connected clients.
 */
export declare function getClientCount(): number;
//# sourceMappingURL=handler.d.ts.map