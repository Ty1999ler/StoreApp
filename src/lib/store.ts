import { useEffect, useRef, useState } from "react";
import type { StoreState } from "../../shared/types";

const EMPTY: StoreState = {
  sessions: [],
  rooms: [],
  items: [],
  inventory: {},
  events: [],
};

/**
 * Polls GET /api/state once a second and returns the latest snapshot.
 * Every surface (customer, staff, room display) shares this so a change made
 * in one browser tab shows up in the others within ~1s.
 */
export function useStore(): {
  state: StoreState;
  refresh: () => void;
  loaded: boolean;
} {
  const [state, setState] = useState<StoreState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Manual one-shot fetch — used as a fallback and right after mutations.
  async function refresh() {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        setState(await res.json());
        setLoaded(true);
      }
    } catch {
      /* ignore — the socket will catch us up */
    }
  }

  useEffect(() => {
    let closed = false;
    let retry: number | undefined;

    function connect() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          setState(JSON.parse(ev.data));
          setLoaded(true);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 1000); // reconnect
      };
      ws.onerror = () => ws.close();
    }

    connect();
    refresh(); // immediate paint in case the socket is slow to open

    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  return { state, refresh, loaded };
}

const SESSION_KEY = "showroom.sessionId";

export function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function storeSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}
