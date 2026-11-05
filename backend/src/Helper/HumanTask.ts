import { Logger } from "@nestjs/common";
import { Like } from "typeorm";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";

const logger = new Logger("HumanTask");

/**
 * "A person must do this" - recorded WITHOUT a new table (a real tasks/notifications table comes with the Phase 1 migration):
 *   1. the lead gets a `lead_activity` of type TASK (title + reason), visible on the lead's timeline;
 *   2. the WhatsApp conversation is flagged `needs_human` so it shows up in the Live Chat inbox
 *      (never overwrites human_takeover / opted_out / closed / resolved).
 * Every query is pinned to the tenant. Never throws: a failing bookkeeping step must not hide the original problem.
 */
export async function createHumanTask(opts: {
  tenantId: string;
  phone?: string | null;
  leadId?: string | null;
  title: string;
  reason: string;
  source: string; // e.g. "outcome_trigger"
  metadata?: Record<string, any>;
}): Promise<{ lead_activity: boolean; conversation_flagged: boolean }> {
  const res = { lead_activity: false, conversation_flagged: false };
  const digits = (opts.phone || "").replace(/\D/g, "");
  try {
    let leadId = opts.leadId || null;
    if (!leadId && digits) {
      const l = await lead.findOne({ where: { phone: Like(`%${digits.slice(-10)}`), tenant_id: opts.tenantId } }).catch(() => null);
      leadId = l?.id || null;
    }
    if (leadId) {
      const a = new lead_activity();
      a.lead_id = leadId;
      a.tenant_id = opts.tenantId;
      a.activity_type = "TASK";
      a.title = opts.title.slice(0, 250);
      a.description = opts.reason;
      a.metadata = { ...(opts.metadata || {}), source: opts.source, state: "open" };
      a.performer_name = "System";
      a.created_on = new Date();
      await a.save();
      res.lead_activity = true;
    }
  } catch (e: any) {
    logger.warn(`could not write the lead task for ${opts.tenantId}: ${e?.message}`);
  }
  try {
    if (digits) {
      const conv = await WhatsAppConversation.findOne({ where: { customer_phone: digits, tenant_id: opts.tenantId } });
      if (conv && !["human_takeover", "opted_out", "closed", "resolved"].includes(conv.conversation_status || "")) {
        conv.conversation_status = "needs_human";
        conv.updated_on = new Date();
        await conv.save();
        res.conversation_flagged = true;
      }
    }
  } catch (e: any) {
    logger.warn(`could not flag the conversation for ${opts.tenantId}: ${e?.message}`);
  }
  logger.warn(`[HUMAN TASK] tenant=${opts.tenantId} ${opts.title} - ${opts.reason}`);
  return res;
}
