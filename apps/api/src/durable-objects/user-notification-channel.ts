import { DurableObject } from "cloudflare:workers";
import type { Env } from "../index";

/**
 * One instance per user, routed via `env.USER_CHANNEL.idFromName(userId)`.
 * A client opens a WebSocket to this to get live bell updates; the backend
 * pushes to it via `pushNotification()` — called as a Durable Object RPC
 * method (not a client-facing endpoint) whenever `notify.ts` (Phase 8)
 * creates a `notification` row, so the bell updates without a page refresh.
 *
 * Skeleton only (Phase 7 of docs/social-features.md) — the actual
 * `notifyUser()` helper and its wiring into existing actions (building
 * shared, new chat message) land with the notifications backend (Phase 8).
 */
export class UserNotificationChannel extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade request", { status: 426 });
    }

    // `WebSocketPair` declares fixed `0`/`1` properties (not an array), so
    // this isn't subject to noUncheckedIndexedAccess the way
    // `Object.values(pair)` would be.
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // Phase 8+: also update user.lastSeenAt here (docs/social-features.md's
    // chat presence design) — needs a @yres/db client constructed from
    // env.DATABASE_URL, not wired yet since this is the infra skeleton only.
    ws.close(code, reason);
  }

  /** Called via RPC from notify.ts (Phase 8): `env.USER_CHANNEL.get(id).pushNotification(payload)`. */
  async pushNotification(payload: unknown): Promise<void> {
    const message = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(message);
    }
  }
}
