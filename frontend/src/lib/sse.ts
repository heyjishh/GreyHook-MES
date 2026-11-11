import type { MachineStatusUpdateEvent } from "@/types/api";

const SSE_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const RECONNECT_DELAY_MS = 5_000;
const STALE_TIMEOUT_MS = 70_000;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth_token");
}

export interface SSEConnection {
  close: () => void;
}

export function createMachineStatusStream(
  factoryId: string,
  onUpdate: (event: MachineStatusUpdateEvent) => void,
  onError?: (error: Event) => void
): SSEConnection {
  let eventSource: EventSource | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let staleTimer: ReturnType<typeof setTimeout> | null = null;

  function resetStaleTimer() {
    if (staleTimer !== null) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      if (!closed) {
        eventSource?.close();
        eventSource = null;
        scheduleReconnect();
      }
    }, STALE_TIMEOUT_MS);
  }

  function scheduleReconnect() {
    if (closed) return;
    reconnectTimer = setTimeout(() => {
      if (!closed) connect();
    }, RECONNECT_DELAY_MS);
  }

  function connect(): void {
    if (closed) return;

    const token = getToken();
    const url = new URL(`${SSE_BASE}/sse/machines/${factoryId}/status`);
    if (token) url.searchParams.set("token", token);

    eventSource = new EventSource(url.toString());
    resetStaleTimer();

    eventSource.onmessage = (event: MessageEvent<string>) => {
      resetStaleTimer();
      try {
        const parsed = JSON.parse(event.data) as MachineStatusUpdateEvent;
        onUpdate(parsed);
      } catch {
      }
    };

    eventSource.onerror = (error: Event) => {
      if (onError) onError(error);
      eventSource?.close();
      eventSource = null;
      if (staleTimer !== null) { clearTimeout(staleTimer); staleTimer = null; }
      scheduleReconnect();
    };
  }

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (staleTimer !== null) { clearTimeout(staleTimer); staleTimer = null; }
      if (eventSource) { eventSource.close(); eventSource = null; }
    },
  };
}
