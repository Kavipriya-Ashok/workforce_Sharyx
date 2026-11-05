import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";

export interface RealtimeEvent {
  event:
    | "conversation_created"
    | "conversation_updated"
    | "message_received"
    | "call_logged"
    | "status_changed"
    | "communication_added";
  data: any;
  timestamp: string;
}

@Injectable()
export class OmnichannelRealtimeService {
  private readonly logger = new Logger(OmnichannelRealtimeService.name);
  // Each SSE client is bound to ONE tenant (taken from its JWT). "all" is Super Admin only.
  private clients: Map<Response, string> = new Map();

  registerClient(res: Response, tenantId: string) {
    this.clients.set(res, tenantId);
    this.logger.log(`[SSE] Client connected. Total active SSE clients: ${this.clients.size}`);

    // Send initial handshake ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`);

    res.on("close", () => {
      this.clients.delete(res);
      this.logger.log(`[SSE] Client disconnected. Remaining SSE clients: ${this.clients.size}`);
    });
  }

  broadcast(event: RealtimeEvent["event"], data: any, tenantId?: string) {
    // Resolve which tenant owns this event. If it cannot be determined the event is only
    // delivered to Super Admin "all" listeners (fail closed) - never to other tenants.
    const owner: string | undefined =
      tenantId ??
      data?.tenant_id ??
      data?.communication?.tenant_id ??
      data?.event?.tenant_id ??
      data?.message?.tenant_id ??
      data?.call?.tenant_id;

    const payload: RealtimeEvent = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const sseMessage = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const [client, clientTenant] of this.clients) {
      if (clientTenant !== "all" && clientTenant !== owner) continue;
      try {
        client.write(sseMessage);
      } catch (err: any) {
        this.logger.warn(`Failed to write to SSE client: ${err?.message}`);
        this.clients.delete(client);
      }
    }
  }
}

