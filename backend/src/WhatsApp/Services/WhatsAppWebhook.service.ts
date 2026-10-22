import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { WhatsAppAIService } from "./WhatsAppAI.service";
import { WhatsAppService } from "./WhatsApp.service";

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly aiService: WhatsAppAIService
  ) {}

  async verifyHandshake(mode: string, token: string, challenge: string): Promise<string | null> {
    const config = await this.whatsAppService.getConfig();
    const expectedToken = config?.verify_token || process.env.META_WA_VERIFY_TOKEN || "sharyx_verify_token_secure";

    if (mode === "subscribe" && token === expectedToken) {
      return challenge;
    }
    return null;
  }

  async processIncomingWebhook(body: any) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const metadata = value?.metadata;
      const myPhoneNumber = metadata?.display_phone_number || "system";

      // 0. Handle Meta Delivery Receipts (sent -> delivered -> read)
      if (value?.statuses && value.statuses.length > 0) {
        const statusEvent = value.statuses[0];
        const metaMsgId = statusEvent.id;
        const newStatus = statusEvent.status; // 'sent', 'delivered', 'read', 'failed'

        const existingMsg = await WhatsAppMessage.findOne({
          where: { meta_message_id: metaMsgId },
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
      const messageText = messageType === "text" ? message.text?.body : `[Media message: ${messageType}]`;
      const metaMessageId = message.id;

      this.logger.log(`💬 [WHATSAPP RECEIVED] From: ${senderPhone} | Text: "${messageText}"`);

      // 1. Find or create Lead in CRM
      const customerProfileName = value?.contacts?.[0]?.profile?.name || senderPhone;
      let existingLead: any = null;
      try {
        existingLead = await lead.findOne({
          where: { phone: senderPhone, status: true },
        });
        if (!existingLead) {
          existingLead = new lead();
          existingLead.name = customerProfileName;
          existingLead.phone = senderPhone;
          existingLead.source = LeadSource.WHATSAPP;
          existingLead.lead_status = LeadStatus.NEW;
          existingLead.score = 65;
          existingLead.notes = `Inquired on WhatsApp: "${messageText}"`;
          existingLead.tenant_id = "default";
          existingLead.created_by_id = "whatsapp_webhook";
          existingLead.created_on = new Date();
          await existingLead.save();

          const act = new lead_activity();
          act.lead_id = existingLead.id;
          act.activity_type = "WHATSAPP";
          act.title = "WhatsApp Inbound Inquiry";
          act.description = messageText;
          act.performer_name = customerProfileName;
          act.tenant_id = "default";
          act.created_by_id = "webhook";
          act.created_on = new Date();
          await act.save();
        } else {
          existingLead.last_contacted_at = new Date();
          await existingLead.save();

          const act = new lead_activity();
          act.lead_id = existingLead.id;
          act.activity_type = "WHATSAPP";
          act.title = "WhatsApp Message";
          act.description = messageText;
          act.performer_name = customerProfileName;
          act.tenant_id = existingLead.tenant_id || "default";
          act.created_by_id = "webhook";
          act.created_on = new Date();
          await act.save();
        }
      } catch (leadErr: any) {
        this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
      }

      // 2. Find or create conversation
      let conversation = await WhatsAppConversation.findOne({
        where: { customer_phone: senderPhone },
      });
      if (!conversation) {
        conversation = new WhatsAppConversation();
        conversation.tenant_id = "default";
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
      inboundMsg.tenant_id = "default";
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

      // 3. Trigger AI auto-reply with 7-Layer Prompt Stacking Pipeline
      if (messageType === "text") {
        this.logger.log(`🧠 [AI ENGINE] Processing 7-layer context for ${senderPhone}...`);
        const aiReply = await this.aiService.generateResponse(messageText, senderPhone, "default", conversation.id, {
          customerName: customerProfileName,
          leadId: existingLead?.id,
        });
        if (aiReply) {
          this.logger.log(`🤖 [AI AUTO-REPLY] Replying to ${senderPhone}: "${aiReply}"`);
          await this.whatsAppService.sendMessage(
            {
              to: senderPhone,
              text: aiReply,
              conversation_id: conversation.id,
            },
            "ai_copilot",
            true
          );
        }
      }

      return { status: "processed" };
    } catch (err: any) {
      this.logger.error("Error processing incoming WhatsApp webhook:", err.message);
      return { status: "error", error: err.message };
    }
  }
}
