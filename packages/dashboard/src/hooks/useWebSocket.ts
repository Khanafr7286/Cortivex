import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSEvent } from '@/lib/types';

interface UseWebSocketOptions {
  url?: string;
  onEvent?: (event: WSEvent) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastEvent: WSEvent | null;
  reconnectAttempts: number;
}

const DEFAULT_URL = 'ws://localhost:3939/ws';
const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

export function useWebSocket({
  url = DEFAULT_URL,
  onEvent,
  enabled = true,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        console.log('[WS] Connected to', url);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WSEvent = JSON.parse(event.data);
          setLastEvent(parsed);
          onEventRef.current?.(parsed);
        } catch {
          console.warn('[WS] Failed to parse message:', event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Exponential backoff reconnect
        setReconnectAttempts((prev) => {
          const next = prev + 1;
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, next - 1),
            MAX_RECONNECT_DELAY,
          );
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${next})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
          return next;
        });
      };

      ws.onerror = (error) => {
        console.warn('[WS] Error:', error);
      };
    } catch {
      console.warn('[WS] Failed to create WebSocket connection');
    }
  }, [url, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, lastEvent, reconnectAttempts };
}
