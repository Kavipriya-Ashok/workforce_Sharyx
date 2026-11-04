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
  private clients: Set<Response> = new Set();

  registerClient(res: Response) {
    this.clients.add(res);
    this.logger.log(`[SSE] Client connected. Total active SSE clients: ${this.clients.size}`);

    // Send initial handshake ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`);

    res.on("close", () => {
      this.clients.delete(res);
      this.logger.log(`[SSE] Client disconnected. Remaining SSE clients: ${this.clients.size}`);
    });
  }

  broadcast(event: RealtimeEvent["event"], data: any) {
    const payload: RealtimeEvent = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const sseMessage = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(sseMessage);
      } catch (err: any) {
        this.logger.warn(`Failed to write to SSE client: ${err?.message}`);
        this.clients.delete(client);
      }
    }
  }
}

