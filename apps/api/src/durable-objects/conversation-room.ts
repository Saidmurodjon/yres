import { DurableObject } from "cloudflare:workers";
import type { Env } from "../index";

/**
 * One instance per chat conversation, routed via
 * `env.CONVERSATION_ROOM.idFromName(conversationId)`. Fan-out point for
 * that conversation's WebSocket connections — Postgres stays the single
 * source of truth (see docs/social-features.md); this class holds no state
 * that isn't reconstructable from the DB.
 *
 * Skeleton only (Phase 7 of docs/social-features.md) — accepts the
 * WebSocket upgrade via the Hibernation API so idle connections don't hold
 * the DO in memory. Message persistence, broadcast, typing/read events
 * land with the chat backend (Phase 10).
 */
export class ConversationRoom extends DurableObject<Env> {
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

  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
    // Phase 10: parse the incoming message, write it to Postgres via
    // @yres/db, then broadcast the persisted row to every other connected
    // socket in this room via this.ctx.getWebSockets().
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);
  }
}
