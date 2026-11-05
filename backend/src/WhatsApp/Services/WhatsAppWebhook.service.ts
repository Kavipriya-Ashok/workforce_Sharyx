import { isBareGreeting } from "@Helper/MessageTemplate";
import { Injectable, Logger } from "@nestjs/common";
import { markDegraded, markFailed, noteSuccess } from "@Service/Integrations/IntegrationStatus";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { ProcessedMessage } from "@Database/Table/WhatsApp/ProcessedMessage.entity";
import { WhatsAppAIService } from "./WhatsAppAI.service";
import { WhatsAppService } from "./WhatsApp.service";
import { createHmac, timingSafeEqual } from "crypto";

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);
  private static readonly processedMetaIds = new Set<string>();
  private static readonly phoneQueues = new Map<string, Promise<any>>();


  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly aiService: WhatsAppAIService,
    private readonly events: EventEmitter2
  ) {}

  async verifyHandshake(mode: string, token: string, challenge: string): Promise<string | null> {
    if (mode !== "subscribe" || !token) return null;
    // The verify token is per tenant (random, generated when the tenant connects WhatsApp).
    const tenantConfig = await this.whatsAppService.getConfigByVerifyToken(token);
    if (tenantConfig) {
      void noteSuccess(tenantConfig.tenant_id, "whatsapp_webhook", "Meta webhook verified");
      return challenge;
    }
    // Optional platform-wide token from the environment; there is NO hardcoded default.
    const platformToken = process.env.META_WA_VERIFY_TOKEN;
    if (platformToken && token === platformToken) return challenge;
    return null;
  }

  /**
   * Verifies X-Hub-Signature-256 = "sha256=" + HMAC_SHA256(rawBody, appSecret).
   * The app secret is the owning tenant's own (whatsapp_config.app_secret) or the platform's META_APP_SECRET.
   * WA_SIGNATURE_MODE=log (default) only logs a mismatch; =enforce rejects.
   */
  async checkSignature(rawBody: Buffer | undefined, header: string | undefined, body: any): Promise<{ ok: boolean; reason?: string }> {
    const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const cfg = phoneNumberId ? await this.whatsAppService.getConfigByPhoneNumberId(phoneNumberId) : null;
    const secret = (cfg?.app_secret || process.env.META_APP_SECRET || "").trim();
    if (!secret) {
      if (cfg) void markDegraded(cfg.tenant_id, "whatsapp_webhook", "WEBHOOK_NO_SECRET", "Messages arrive, but they cannot be verified because no Meta App Secret is saved. Add it so fake messages are rejected.");
      return { ok: false, reason: "no app secret configured for this number" };
    }
    if (!header || !header.startsWith("sha256=")) return { ok: false, reason: "missing X-Hub-Signature-256 header" };
    if (!rawBody) return { ok: false, reason: "raw body unavailable" };
    const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex"));
    const got = Buffer.from(header);
    const ok = expected.length === got.length && timingSafeEqual(expected, got);
    if (cfg) {
      if (ok) void noteSuccess(cfg.tenant_id, "whatsapp_webhook", "Receiving messages from Meta");
      else void markFailed(cfg.tenant_id, "whatsapp_webhook", "WEBHOOK_SIGNATURE", "Messages from Meta failed the signature check. The App Secret saved here is probably wrong; copy it again from your Meta app.");
    }
    return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
  }

  async processIncomingWebhook(body: any) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const metadata = value?.metadata;
      const myPhoneNumber = metadata?.display_phone_number || "system";

      // TENANT ROUTING: the receiving business number (phone_number_id) identifies the owning tenant.
      // Events for numbers nobody has connected are dropped - never processed under a shared bucket.
      const tenantConfig = await this.whatsAppService.getConfigByPhoneNumberId(metadata?.phone_number_id);
      if (!tenantConfig) {
        this.logger.warn(`Ignoring WhatsApp event for unregistered phone_number_id=${metadata?.phone_number_id}`);
        return { status: "unknown_phone_number_id" };
      }
      const tenantId = tenantConfig.tenant_id;

      // 0. Handle Meta Delivery Receipts (sent -> delivered -> read)
      if (value?.statuses && value.statuses.length > 0) {
        const statusEvent = value.statuses[0];
        const metaMsgId = statusEvent.id;
        const newStatus = statusEvent.status; // 'sent', 'delivered', 'read', 'failed'

        const existingMsg = await WhatsAppMessage.findOne({
          where: { meta_message_id: metaMsgId, tenant_id: tenantId },
        });
        if (existingMsg) {
          existingMsg.delivery_status = newStatus;
          await existingMsg.save();
          this.logger.log(`WhatsApp message receipt updated: ${metaMsgId} -> ${newStatus}`);
        }
        return { status: "receipt_updated" };
      }

      if (!message) {
        return { status: "no_message" };
      }

      const senderPhone = message.from;
      const messageType = message.type || "text";
      let messageText = messageType === "text" ? message.text?.body : `[Media message: ${messageType}]`;
      const metaMessageId = message.id;

      // 1. Atomic Idempotency Check (in-memory + processed_messages table + WhatsAppMessage table)
      if (metaMessageId) {
        if (WhatsAppWebhookService.processedMetaIds.has(metaMessageId)) {
          this.logger.log(`⚠️ [DUPLICATE IGNORED] Message ID already in memory set: ${metaMessageId}`);
          return { status: "duplicate_ignored" };
        }
        WhatsAppWebhookService.processedMetaIds.add(metaMessageId);
        if (WhatsAppWebhookService.processedMetaIds.size > 2000) {
          const first = WhatsAppWebhookService.processedMetaIds.values().next().value;
          if (first) WhatsAppWebhookService.processedMetaIds.delete(first);
        }

        try {
          const insertRes = await WhatsAppMessage.query(
            `INSERT INTO processed_messages (wamid, sender_phone, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (wamid) DO NOTHING RETURNING wamid`,
            [metaMessageId, senderPhone]
          );
          if (!Array.isArray(insertRes) || insertRes.length === 0) {
            this.logger.log(`⚠️ [DUPLICATE IGNORED] wamid already in processed_messages table: ${metaMessageId}`);
            return { status: "duplicate_ignored" };
          }
        } catch (dbDedupErr: any) {
          // Fallback check on WhatsAppMessage if table is still initializing
          const existingMsg = await WhatsAppMessage.findOne({
            where: { meta_message_id: metaMessageId },
          });
          if (existingMsg) {
            this.logger.log(`⚠️ [DUPLICATE IGNORED] Message ID already in WhatsAppMessage: ${metaMessageId}`);
            return { status: "duplicate_ignored" };
          }
        }
      }

      // 2. Per-Candidate Sequential Lock / Queue so two messages from the same number are processed in strict order
      const cleanPhoneKey = (senderPhone || "unknown").replace(/\D/g, "").slice(-10) || senderPhone;
      const previousTask = WhatsAppWebhookService.phoneQueues.get(cleanPhoneKey) || Promise.resolve();

      const nextTask = previousTask
        .catch(() => {})
        .then(() =>
          this.processSingleCandidateMessage({
            value,
            message,
            senderPhone,
            myPhoneNumber,
            messageType,
            messageText,
            metaMessageId,
            tenantId,
          })
        );

      WhatsAppWebhookService.phoneQueues.set(cleanPhoneKey, nextTask);
      try {
        return await nextTask;
      } finally {
        if (WhatsAppWebhookService.phoneQueues.get(cleanPhoneKey) === nextTask) {
          WhatsAppWebhookService.phoneQueues.delete(cleanPhoneKey);
        }
      }
    } catch (err: any) {
      this.logger.error("Error processing incoming WhatsApp webhook:", err.message);
      return { status: "error", error: err.message };
    }
  }

  private async processSingleCandidateMessage(params: {
    value: any;
    message: any;
    senderPhone: string;
    myPhoneNumber: string;
    messageType: string;
    messageText: string;
    metaMessageId: string;
    tenantId: string;
  }) {
    const { value, message, senderPhone, myPhoneNumber, messageType, metaMessageId, tenantId } = params;
    let { messageText } = params;
    try {

      // Detect PDF Resume or Document Attachment
      let isPdfAttachment = false;
      let docFilename = "";
      if (messageType === "document") {
        const doc = message.document;
        docFilename = doc?.filename || "resume.pdf";
        const mime = doc?.mime_type || "";
        isPdfAttachment = mime.includes("pdf") || docFilename.toLowerCase().endsWith(".pdf");
        if (isPdfAttachment) {
          messageText = `[Candidate uploaded resume PDF: "${docFilename}"]`;
        } else {
          messageText = `[Candidate uploaded non-PDF document: "${docFilename}"]`;
        }
      } else if (messageType === "image") {
        messageText = `[Candidate uploaded an image instead of a PDF resume]`;
      }

      this.logger.log(`💬 [WHATSAPP RECEIVED] From: ${senderPhone} | Type: ${messageType} | Content: "${messageText}"`);

      // 1. Find or create Lead / Candidate in CRM (auto-detect placement/job/interview inquiries)
      const customerProfileName = value?.contacts?.[0]?.profile?.name || senderPhone;
      const isCandidateInquiry =
        isPdfAttachment ||
        /\b(placement|job|interview|vacancy|hiring|career|internship|fresher|resume|cv|ctc|recruitment|role|opening|apply|application)\b/i.test(
          messageText || ""
        );
      let existingLead: any = null;
      try {
        existingLead = await lead.findOne({
          where: { phone: senderPhone, status: true, tenant_id: tenantId },
        });
        if (!existingLead) {
          existingLead = new lead();
          existingLead.name = customerProfileName;
          existingLead.phone = senderPhone;
          existingLead.source = LeadSource.WHATSAPP;
          existingLead.lead_status = LeadStatus.NEW;
          existingLead.is_candidate = isCandidateInquiry;
          if (isCandidateInquiry) {
            existingLead.candidate_stage = isPdfAttachment ? "screening" : "new";
          }
          existingLead.score = 65;
          existingLead.notes = `Inquired on WhatsApp: "${messageText}"`;
          existingLead.tenant_id = tenantId;
          existingLead.created_by_id = "whatsapp_webhook";
          existingLead.created_on = new Date();
          await existingLead.save();

          const act = new lead_activity();
          act.lead_id = existingLead.id;
          act.activity_type = "WHATSAPP";
          act.title = isCandidateInquiry ? "Placement / Candidate WhatsApp Inquiry" : "WhatsApp Inbound Inquiry";
          act.description = messageText;
          act.performer_name = customerProfileName;
          act.tenant_id = tenantId;
          act.created_by_id = "webhook";
          act.created_on = new Date();
          await act.save();
        } else {
          if (isCandidateInquiry && !existingLead.is_candidate) {
            existingLead.is_candidate = true;
            existingLead.candidate_stage = existingLead.candidate_stage || "screening";
          }
          existingLead.last_contacted_at = new Date();

          // Auto-extract candidate profile fields from incoming message or attachment
          if (isPdfAttachment) {
            existingLead.is_candidate = true;
            existingLead.resume_url = docFilename;
            existingLead.candidate_stage = "screening";
          }
          const expMatch = messageText.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)(?:\s*(?:of)?\s*exp)?/i);
          if (expMatch) {
            existingLead.is_candidate = true;
            existingLead.total_experience = parseFloat(expMatch[1]);
            existingLead.relevant_experience = parseFloat(expMatch[1]);
          }
          const noticeMatch = messageText.match(/(\d+)\s*days?\s*notice/i) || messageText.match(/serving\s*(\d+)\s*days/i);
          if (noticeMatch) {
            existingLead.is_candidate = true;
            existingLead.employment_status = `Notice (${noticeMatch[1]} days)`;
          } else if (/serving\s*notice/i.test(messageText)) {
            existingLead.is_candidate = true;
            existingLead.employment_status = "Serving Notice";
          } else if (/relieved|immediate/i.test(messageText)) {
            existingLead.is_candidate = true;
            existingLead.employment_status = "Relieved / Immediate";
          }
          const currentCtcMatch = messageText.match(/current\s*(?:ctc)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
          if (currentCtcMatch) {
            existingLead.is_candidate = true;
            existingLead.current_ctc = parseFloat(currentCtcMatch[1]);
          }
          const expectedCtcMatch = messageText.match(/expected\s*(?:ctc)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
          if (expectedCtcMatch) {
            existingLead.is_candidate = true;
            existingLead.expected_ctc = parseFloat(expectedCtcMatch[1]);
          }
          if (/okay\s*to\s*relocate|willing\s*to\s*relocate|open\s*to\s*relocat|relocate\s*to/i.test(messageText)) {
            existingLead.is_candidate = true;
            existingLead.relocation = "Yes (Open to relocate)";
          }
          const emailMatch = messageText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) {
            existingLead.email = emailMatch[1].trim();
          }
          const roleMatch = messageText.match(/(?:role|position|interested in|for)\s*(?:is|as)?\s*[:*]?\s*(backend developer|frontend developer|ai solutions engineer|business development executive|full stack developer)/i)
            || messageText.match(/^(backend developer|frontend developer|ai solutions engineer|business development executive)$/i);
          if (roleMatch) {
            existingLead.is_candidate = true;
            existingLead.job_title = roleMatch[1].trim();
          }

          await existingLead.save();

          const act = new lead_activity();
          act.lead_id = existingLead.id;
          act.activity_type = "WHATSAPP";
          act.title = "WhatsApp Message";
          act.description = messageText;
          act.performer_name = customerProfileName;
          act.tenant_id = tenantId;
          act.created_by_id = "webhook";
          act.created_on = new Date();
          await act.save();
        }
      } catch (leadErr: any) {
        this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
      }

      // 2. Find or create conversation (one per tenant + customer number)
      let conversation = await WhatsAppConversation.findOne({
        where: { customer_phone: senderPhone, tenant_id: tenantId },
      });
      let isNewConversation = false;
      if (!conversation) {
        isNewConversation = true; // first time THIS tenant hears from THIS number => the tenant's first message applies
        conversation = new WhatsAppConversation();
        conversation.tenant_id = tenantId;
        conversation.customer_phone = senderPhone;
        conversation.customer_name = customerProfileName;
        conversation.lead_id = existingLead?.id || null;
        conversation.conversation_status = "open";
        conversation.created_by_id = "webhook";
        conversation.created_on = new Date();
      } else if (existingLead?.id && !conversation.lead_id) {
        conversation.lead_id = existingLead.id;
      }
      conversation.last_message_text = messageText;
      conversation.last_message_at = new Date();
      conversation.unread_count = (conversation.unread_count || 0) + 1;
      conversation.updated_on = new Date();
      await conversation.save();

      // 2. Save inbound message
      const inboundMsg = new WhatsAppMessage();
      inboundMsg.conversation_id = conversation.id;
      inboundMsg.tenant_id = tenantId;
      inboundMsg.sender_phone = senderPhone;
      inboundMsg.recipient_phone = myPhoneNumber;
      inboundMsg.direction = "inbound";
      inboundMsg.message_type = messageType;
      inboundMsg.message_text = messageText;
      inboundMsg.meta_message_id = metaMessageId;
      inboundMsg.delivery_status = "delivered";
      inboundMsg.is_ai_generated = false;
      inboundMsg.created_by_id = "webhook";
      inboundMsg.created_on = new Date();
      await inboundMsg.save();

      // 2b. This tenant's AI settings (everything below is written by the tenant on the Brain page).
      const aiCfg = await this.aiService.getConfig(tenantId);

      // 2c. Opt-out / opt-in. Exact whole-message words only ("bus stop" never unsubscribes anyone), remembered per
      //     conversation (= per tenant + number) so the bot AND the follow-up scheduler stay silent afterwards.
      if (conversation.conversation_status === "opted_out") {
        if (this.aiService.isStartWord(messageText)) {
          conversation.conversation_status = "open";
          await conversation.save();
          return { status: "opted_in" };
        }
        return { status: "opted_out_silent" };
      }
      if (this.aiService.isStopWord(aiCfg, messageText)) {
        conversation.conversation_status = "opted_out";
        conversation.updated_on = new Date();
        await conversation.save();
        this.logger.log(`🔕 [OPT-OUT] tenant=${tenantId} conversation=${conversation.id} opted out; bot and follow-ups stay silent`);
        return { status: "opted_out" };
      }

      // 3. Check for Active Human Takeover (Human in the loop)
      if (conversation.conversation_status === "human_takeover") {
        this.logger.log(`🛑 [HUMAN TAKEOVER] Conversation ${conversation.id} (${senderPhone}) is currently handled by a human agent. Bot auto-reply suppressed.`);
        return { status: "human_takeover_active" };
      }

      // 3b. The tenant switched the bot off (AI mode "manual" or AI disabled): stay completely silent.
      if (!aiCfg || aiCfg.is_ai_enabled === false || aiCfg.ai_mode === "manual") {
        return { status: "bot_silent" };
      }

      // 4. Trigger AI auto-reply (Text messages and Resume/Document attachments)
      if (messageType === "text" || messageType === "document" || messageType === "image") {
        // The tenant's FIRST MESSAGE for a brand-new customer (text typed on the Brain page, {name}/{company} filled in).
        const firstMessage = isNewConversation
          ? this.aiService.renderFirstMessage(aiCfg, { name: customerProfileName, company: await this.aiService.companyName(tenantId) })
          : "";
        const onlyGreeted = !!firstMessage && messageType === "text" && isBareGreeting(messageText);

        this.logger.log(`🧠 [AI ENGINE] Processing 7-layer context for ${senderPhone}...`);
        const res = onlyGreeted
          ? null // "hi" carries no question: the first message alone is the answer (and saves an LLM call)
          : await this.aiService.generateResponse(messageText, senderPhone, tenantId, conversation.id, {
              customerName: customerProfileName,
              leadId: existingLead?.id,
            });

        const announcement = typeof res === "object" ? res?.announcement : null;
        let aiReply = typeof res === "object" ? res?.reply : (typeof res === "string" ? res : null);

        // Enforce strictly ONE outbound reply per inbound message (TASK 1)
        if (!aiReply && announcement) {
          aiReply = announcement;
        }

        // First message + answer travel together as ONE message, so the one-reply rule still holds.
        if (firstMessage) {
          aiReply = aiReply ? `${firstMessage}\n\n${aiReply}` : firstMessage;
        }

        if (aiReply) {
          this.logger.log(`🤖 [AI AUTO-REPLY] Replying to ${senderPhone}: "${aiReply}"`);
          try {
            await this.whatsAppService.sendMessage(
              {
                to: senderPhone,
                text: aiReply,
                conversation_id: conversation.id,
              },
              "ai_copilot",
              true,
              tenantId
            );
            this.logger.log(`✅ [AI AUTO-REPLY DISPATCHED] Successfully sent WhatsApp reply to ${senderPhone}`);
          } catch (sendErr: any) {
            this.logger.error(`❌ [WHATSAPP SEND FAILED] Could not deliver message to ${senderPhone}: ${sendErr.message}`);
          }
        } else {
          this.logger.warn(`⚠️ [AI ENGINE] No reply was generated for ${senderPhone}`);
        }
      }

      return { status: "processed" };
    } catch (err: any) {
      this.logger.error("Error processing incoming WhatsApp webhook:", err.message);
      return { status: "error", error: err.message };
    }
  }
}
