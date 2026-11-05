import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WhatsAppAIConfig } from '@Database/Table/WhatsApp/WhatsAppAIConfig.entity';
import { WhatsAppMessage } from '@Database/Table/WhatsApp/WhatsAppMessage.entity';
import { redactSecrets } from '@Helper/Redact';
import { WhatsAppService } from './WhatsApp.service';
import { WhatsAppAIService } from './WhatsAppAI.service';

/** `created_by_id` stamped on a follow-up: it is also how we know "the last message is already a follow-up". */
export const FOLLOWUP_MARKER = 'ai_followup';
const PER_TENANT_PER_TICK = 20; // rate limit: never burst-send

const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);

/**
 * Automatic follow-up. The tenant decides EVERYTHING on the Brain page: on/off, how many minutes of silence, the text.
 * A follow-up is sent only when ALL of these are true (each one is tenant-scoped):
 *   - the tenant turned follow-ups on AND wrote a follow-up message (empty text = nothing is ever sent)
 *   - AI is on and the mode is not "manual"
 *   - the LAST message of the conversation is an AI reply the customer has not answered for `delay` minutes
 *   - the customer wrote inside the last 24 h (WhatsApp only allows free text inside that window)
 *   - not a human takeover, not opted out (STOP), WhatsApp is connected
 *   - no follow-up was already sent for this silence (one per silence, never a drip)
 *
 * Switched OFF unless WA_FOLLOWUP_SCHEDULER=true, so deploying this never starts messaging real customers by surprise.
 * No database change is needed: the state is read from wa_conversation / wa_message.
 */
@Injectable()
export class WhatsAppFollowupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppFollowupService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly whatsApp: WhatsAppService, private readonly ai: WhatsAppAIService) {}

  onModuleInit() {
    if (process.env.WA_FOLLOWUP_SCHEDULER !== 'true') return;
    const every = Number(process.env.WA_FOLLOWUP_INTERVAL_MS) || 60_000;
    this.timer = setInterval(() => this.runOnce().catch((e) => this.logger.warn(`follow-up pass failed: ${redactSecrets(e?.message)}`)), every);
    this.logger.log(`WhatsApp follow-up scheduler ON (every ${Math.round(every / 1000)}s)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass over every tenant. Returns how many follow-ups were sent (used by the tests). */
  async runOnce(): Promise<{ sent: number; tenants: number }> {
    if (this.running) return { sent: 0, tenants: 0 };
    this.running = true;
    let sent = 0;
    try {
      const configs = await WhatsAppAIConfig.find({ where: { status: true } });
      let tenants = 0;
      for (const cfg of configs) {
        if (!cfg.tenant_id || cfg.tenant_id === 'default' || cfg.tenant_id === 'all') continue;
        if (!cfg.auto_followup_enabled || !(cfg.followup_message || '').trim()) continue;
        if (cfg.is_ai_enabled === false || cfg.ai_mode === 'manual') continue;
        tenants++;
        sent += await this.runForTenant(cfg);
      }
      return { sent, tenants };
    } finally {
      this.running = false;
    }
  }

  private async runForTenant(cfg: WhatsAppAIConfig): Promise<number> {
    const tenant = cfg.tenant_id;
    const wa = await this.whatsApp.getConfig(tenant).catch(() => null);
    if (!wa || !wa.access_token || !wa.phone_number_id) return 0; // not connected (or disconnected): nothing can go out

    const delay = Math.min(Math.max(Number(cfg.followup_delay_minutes) || 60, 1), 1380);
    // Every condition below is pinned to this tenant_id.
    const rows = rowsOf(
      await WhatsAppMessage.query(
        `SELECT c.id AS conversation_id, c.customer_phone, c.customer_name
           FROM wa_conversation c
           JOIN LATERAL (
             SELECT m.direction, m.is_ai_generated, m.created_by_id, m.created_on
               FROM wa_message m
              WHERE m.conversation_id = c.id AND m.tenant_id = $1
              ORDER BY m.created_on DESC LIMIT 1
           ) last ON TRUE
          WHERE c.tenant_id = $1
            AND c.status = true
            AND COALESCE(c.conversation_status, 'open') NOT IN ('human_takeover', 'opted_out', 'closed', 'resolved')
            AND last.direction = 'outbound'
            AND last.is_ai_generated = true
            AND COALESCE(last.created_by_id, '') <> $2
            AND last.created_on <= now() - make_interval(mins => $3)
            AND (SELECT max(i.created_on) FROM wa_message i WHERE i.conversation_id = c.id AND i.tenant_id = $1 AND i.direction = 'inbound')
                > now() - interval '24 hours'
          ORDER BY last.created_on ASC
          LIMIT ${PER_TENANT_PER_TICK}`,
        [tenant, FOLLOWUP_MARKER, delay]
      )
    );
    if (!rows.length) return 0;

    const companyName = await this.ai.companyName(tenant);
    let sent = 0;
    for (const r of rows) {
      const text = this.ai.renderFollowup(cfg, { name: r.customer_name, company: companyName });
      if (!text) continue;
      try {
        await this.whatsApp.sendMessage({ to: r.customer_phone, text, conversation_id: r.conversation_id } as any, FOLLOWUP_MARKER, true, tenant);
        sent++;
        this.logger.log(`📨 [FOLLOW-UP] tenant=${tenant} conversation=${r.conversation_id} sent after ${delay} min of silence`);
      } catch (e: any) {
        // a failing send is recorded on the integration status by WhatsAppService; we try again on the next pass
        this.logger.warn(`follow-up for ${tenant}/${r.conversation_id} not sent: ${redactSecrets(e?.message)}`);
      }
    }
    return sent;
  }
}
