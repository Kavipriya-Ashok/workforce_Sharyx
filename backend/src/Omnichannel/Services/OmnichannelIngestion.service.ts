import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer, CustomerStatus, CustomerTier } from "../../Database/Table/Customer/customer";
import { lead } from "../../Database/Table/Lead/lead";
import { OmnichannelConversation } from "../../Database/Table/Omnichannel/OmnichannelConversation.entity";
import { OmnichannelMessage } from "../../Database/Table/Omnichannel/OmnichannelMessage.entity";
import { OmnichannelCall } from "../../Database/Table/Omnichannel/OmnichannelCall.entity";
import { OmnichannelActivityLog } from "../../Database/Table/Omnichannel/OmnichannelActivityLog.entity";
import { OmnichannelCommunication } from "../../Database/Table/Omnichannel/OmnichannelCommunication.entity";
import {
  WhatsAppIncomingWebhookDto,
  EmailIncomingWebhookDto,
  CallIncomingWebhookDto,
} from "../Dto/Omnichannel.dto";
import { OmnichannelSummarizerService } from "./OmnichannelSummarizer.service";
import { OmnichannelRealtimeService } from "./OmnichannelRealtime.service";

@Injectable()
export class OmnichannelIngestionService {
  private readonly logger = new Logger(OmnichannelIngestionService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(lead)
    private readonly leadRepo: Repository<lead>,
    @InjectRepository(OmnichannelConversation)
    private readonly convRepo: Repository<OmnichannelConversation>,
    @InjectRepository(OmnichannelMessage)
    private readonly msgRepo: Repository<OmnichannelMessage>,
    @InjectRepository(OmnichannelCall)
    private readonly callRepo: Repository<OmnichannelCall>,
    @InjectRepository(OmnichannelActivityLog)
    private readonly activityRepo: Repository<OmnichannelActivityLog>,
    @InjectRepository(OmnichannelCommunication)
    private readonly commsRepo: Repository<OmnichannelCommunication>,
    private readonly summarizer: OmnichannelSummarizerService,
    private readonly realtime: OmnichannelRealtimeService
  ) {}

  /**
   * Find or auto-create Customer based on phone and/or email
   */
  async findOrCreateCustomer(params: {
    phone?: string;
    email?: string;
    name?: string;
    tenantId?: string;
  }): Promise<Customer> {
    const tenantId = params.tenantId || "default";
    let customer: Customer | null = null;

    // Normalize phone number (remove spaces/dashes)
    const normalizedPhone = params.phone ? params.phone.replace(/[\s\-()]/g, "") : undefined;
    const normalizedEmail = params.email ? params.email.trim().toLowerCase() : undefined;

    // 1. Try match by phone first
    if (normalizedPhone) {
      customer = await this.customerRepo.findOne({
        where: [
          { phone: normalizedPhone, tenant_id: tenantId },
          { phone: params.phone, tenant_id: tenantId },
        ],
      });
    }

    // 2. Try match by email
    if (!customer && normalizedEmail) {
      customer = await this.customerRepo.findOne({
        where: { email: normalizedEmail, tenant_id: tenantId },
      });
    }

    // 3. If found, update missing contact info if available
    if (customer) {
      let updated = false;
      if (!customer.phone && normalizedPhone) {
        customer.phone = normalizedPhone;
        updated = true;
      }
      if (!customer.email && normalizedEmail) {
        customer.email = normalizedEmail;
        updated = true;
      }
      if (params.name && (!customer.name || customer.name === "Anonymous" || customer.name === customer.phone)) {
        customer.name = params.name;
        updated = true;
      }
      if (updated) {
        await this.customerRepo.save(customer);
      }
      return customer;
    }

    // 4. Auto-create new customer
    const displayName = params.name || normalizedPhone || normalizedEmail || "New Customer";
    const newCustomer = this.customerRepo.create({
      tenant_id: tenantId,
      name: displayName,
      phone: normalizedPhone || "",
      email: normalizedEmail || "",
      customer_status: CustomerStatus.ACTIVE,
      tier: CustomerTier.STARTER,
      total_spend: 0,
      currency: "INR",
    });

    const saved = await this.customerRepo.save(newCustomer);
    this.logger.log(`[CUSTOMER AUTO-CREATED] ID: ${saved.id}, Name: ${saved.name}, Phone: ${saved.phone}, Email: ${saved.email}`);

    // Log activity
    await this.activityRepo.save({
      tenant_id: tenantId,
      customer_id: saved.id,
      conversation_id: null,
      type: "customer_created",
      detail: `Customer ${saved.name} was auto-created via omnichannel intake.`,
      timestamp: new Date(),
    });

    return saved;
  }

  /**
   * Find or auto-create Lead based on phone and/or email
   */
  async findOrCreateLead(params: {
    phone?: string;
    email?: string;
    name?: string;
    tenantId?: string;
  }): Promise<lead> {
    const tenantId = params.tenantId || "default";
    let leadRecord: lead | null = null;
    const normalizedPhone = params.phone ? params.phone.replace(/[\s\-()]/g, "") : undefined;
    const normalizedEmail = params.email ? params.email.trim().toLowerCase() : undefined;

    if (normalizedPhone) {
      leadRecord = await this.leadRepo.findOne({
        where: [
          { phone: normalizedPhone, tenant_id: tenantId },
          { phone: params.phone, tenant_id: tenantId },
        ],
      });
    }

    if (!leadRecord && normalizedEmail) {
      leadRecord = await this.leadRepo.findOne({
        where: { email: normalizedEmail, tenant_id: tenantId },
      });
    }

    if (!leadRecord) {
      const displayName = params.name || normalizedPhone || normalizedEmail || "New Lead";
      leadRecord = await this.leadRepo.save(
        this.leadRepo.create({
          tenant_id: tenantId,
          name: displayName,
          phone: normalizedPhone,
          email: normalizedEmail,
          lead_status: "NEW",
        })
      );
      this.logger.log(`[LEAD AUTO-CREATED] ID: ${leadRecord.id}, Name: ${leadRecord.name}`);
    }

    return leadRecord;
  }

  /**
   * Find existing open conversation or create a new one for this channel & customer
   */
  async findOrCreateConversation(params: {
    customerId: string;
    channel: "whatsapp" | "email" | "call";
    providerThreadId?: string;
    tenantId?: string;
  }): Promise<{ conversation: OmnichannelConversation; isNew: boolean }> {
    const tenantId = params.tenantId || "default";

    // Check for open/pending conversation on this channel
    let conversation = await this.convRepo.findOne({
      where: {
        customer_id: params.customerId,
        channel: params.channel,
        tenant_id: tenantId,
      },
      order: { last_activity_at: "DESC" },
    });

    // If existing conversation is resolved or doesn't exist, create a new conversation
    if (!conversation || conversation.conversation_status === "resolved") {
      conversation = this.convRepo.create({
        tenant_id: tenantId,
        customer_id: params.customerId,
        channel: params.channel,
        conversation_status: "new",
        summary: `New ${params.channel} interaction initiated`,
        last_activity_at: new Date(),
        provider_thread_id: params.providerThreadId || null,
      });
      conversation = await this.convRepo.save(conversation);
      return { conversation, isNew: true };
    }

    // If reopen needed from pending
    if (conversation.conversation_status === "pending") {
      conversation.conversation_status = "open";
    }
    conversation.last_activity_at = new Date();
    if (params.providerThreadId && !conversation.provider_thread_id) {
      conversation.provider_thread_id = params.providerThreadId;
    }
    await this.convRepo.save(conversation);

    return { conversation, isNew: false };
  }

  /**
   * Ingest WhatsApp Incoming Message
   */
  async ingestWhatsAppMessage(dto: WhatsAppIncomingWebhookDto, tenantId = "default") {
    // 1. Idempotency Check
    if (dto.provider_message_id) {
      const existing = await this.msgRepo.findOne({
        where: { provider_message_id: dto.provider_message_id, tenant_id: tenantId },
      });
      if (existing) {
        this.logger.warn(`[IDEMPOTENCY] WhatsApp message ${dto.provider_message_id} already ingested. Skipping duplicate.`);
        return { duplicate: true, messageId: existing.id };
      }
    }

    // 2. Customer resolution / auto-creation
    const customer = await this.findOrCreateCustomer({
      phone: dto.from_phone,
      name: dto.customer_name,
      tenantId,
    });

    // 3. Conversation resolution
    const { conversation, isNew } = await this.findOrCreateConversation({
      customerId: customer.id,
      channel: "whatsapp",
      providerThreadId: dto.from_phone,
      tenantId,
    });

    // 4. Generate one-line description
    const summary = await this.summarizer.generateOneLineSummary({
      channel: "whatsapp",
      content: dto.body,
      customerName: customer.name,
    });

    // Update conversation summary
    conversation.summary = summary;
    conversation.last_activity_at = new Date();
    await this.convRepo.save(conversation);

    // 5. Persist normalized message
    const message = this.msgRepo.create({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      direction: "in",
      body: dto.body,
      attachments: dto.attachments || [],
      delivery_status: "delivered",
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      provider_message_id: dto.provider_message_id || null,
      sender_info: dto.from_phone,
      metadata: dto.metadata || null,
    });
    const savedMsg = await this.msgRepo.save(message);

    // 6. Record activity log
    await this.activityRepo.save({
      tenant_id: tenantId,
      customer_id: customer.id,
      conversation_id: conversation.id,
      type: "incoming_message",
      detail: `WhatsApp message received from ${customer.name}: "${dto.body.slice(0, 100)}"`,
      timestamp: new Date(),
    });

    // 6.5. Record in communications for Lead timeline
    try {
      const leadRecord = await this.findOrCreateLead({
        phone: dto.from_phone,
        name: dto.customer_name,
        tenantId,
      });
      await this.commsRepo.save(
        this.commsRepo.create({
          tenant_id: tenantId,
          lead_id: leadRecord.id,
          channel: "whatsapp",
          direction: "inbound",
          description: summary || (dto.body.length > 100 ? `${dto.body.slice(0, 100)}...` : dto.body),
          content: {
            body: dto.body,
            attachments: dto.attachments || [],
            thread_replies: [
              {
                sender: leadRecord.name,
                body: dto.body,
                timestamp: new Date().toISOString(),
              },
            ],
          },
          occurred_at: dto.timestamp ? new Date(dto.timestamp) : new Date(),
          status: "delivered",
          provider_id: dto.provider_message_id || null,
        })
      );
    } catch (e) {
      this.logger.error(`Error saving lead communication for WhatsApp: ${e.message}`);
    }

    // 7. Realtime broadcast
    this.realtime.broadcast("message_received", {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: "whatsapp",
      message: savedMsg,
      summary,
    });

    return {
      success: true,
      conversationId: conversation.id,
      messageId: savedMsg.id,
      customerId: customer.id,
      summary,
    };
  }

  /**
   * Ingest Email Incoming Message
   */
  async ingestEmailMessage(dto: EmailIncomingWebhookDto, tenantId = "default") {
    // 1. Idempotency Check
    if (dto.provider_message_id) {
      const existing = await this.msgRepo.findOne({
        where: { provider_message_id: dto.provider_message_id, tenant_id: tenantId },
      });
      if (existing) {
        this.logger.warn(`[IDEMPOTENCY] Email ${dto.provider_message_id} already ingested. Skipping duplicate.`);
        return { duplicate: true, messageId: existing.id };
      }
    }

    // 2. Customer resolution / auto-creation
    const customer = await this.findOrCreateCustomer({
      email: dto.from_email,
      name: dto.customer_name,
      tenantId,
    });

    // 3. Conversation resolution
    const { conversation } = await this.findOrCreateConversation({
      customerId: customer.id,
      channel: "email",
      providerThreadId: dto.thread_id || dto.from_email,
      tenantId,
    });

    // 4. Generate one-line description
    const summary = await this.summarizer.generateOneLineSummary({
      channel: "email",
      content: dto.body,
      subject: dto.subject,
      customerName: customer.name,
    });

    conversation.summary = summary;
    conversation.last_activity_at = new Date();
    await this.convRepo.save(conversation);

    // 5. Persist normalized message
    const message = this.msgRepo.create({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      direction: "in",
      subject: dto.subject,
      body: dto.body,
      attachments: dto.attachments || [],
      delivery_status: "delivered",
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      provider_message_id: dto.provider_message_id || null,
      sender_info: dto.from_email,
      metadata: dto.metadata || null,
    });
    const savedMsg = await this.msgRepo.save(message);

    // 6. Record activity log
    await this.activityRepo.save({
      tenant_id: tenantId,
      customer_id: customer.id,
      conversation_id: conversation.id,
      type: "incoming_message",
      detail: `Email received from ${customer.name} - Subject: "${dto.subject}"`,
      timestamp: new Date(),
    });

    // 6.5. Record in communications for Lead timeline
    try {
      const leadRecord = await this.findOrCreateLead({
        email: dto.from_email,
        name: dto.customer_name,
        tenantId,
      });
      await this.commsRepo.save(
        this.commsRepo.create({
          tenant_id: tenantId,
          lead_id: leadRecord.id,
          channel: "email",
          direction: "inbound",
          description: summary || `${dto.subject}: ${dto.body.slice(0, 80)}`,
          content: {
            subject: dto.subject,
            from: dto.from_email,
            to: dto.to_email,
            body: dto.body,
            attachments: dto.attachments || [],
          },
          occurred_at: dto.timestamp ? new Date(dto.timestamp) : new Date(),
          status: "delivered",
          provider_id: dto.provider_message_id || null,
        })
      );
    } catch (e) {
      this.logger.error(`Error saving lead communication for Email: ${e.message}`);
    }

    // 7. Realtime broadcast
    this.realtime.broadcast("message_received", {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: "email",
      message: savedMsg,
      summary,
    });

    return {
      success: true,
      conversationId: conversation.id,
      messageId: savedMsg.id,
      customerId: customer.id,
      summary,
    };
  }

  /**
   * Ingest Telephony / Vapi / Phone Call Event
   */
  async ingestCallEvent(dto: CallIncomingWebhookDto, tenantId = "default") {
    // 1. Idempotency Check
    if (dto.provider_call_id) {
      const existing = await this.callRepo.findOne({
        where: { provider_call_id: dto.provider_call_id, tenant_id: tenantId },
      });
      if (existing) {
        this.logger.warn(`[IDEMPOTENCY] Call ${dto.provider_call_id} already ingested. Skipping duplicate.`);
        return { duplicate: true, callId: existing.id };
      }
    }

    // 2. Customer resolution / auto-creation
    const customer = await this.findOrCreateCustomer({
      phone: dto.phone_number,
      name: dto.customer_name,
      tenantId,
    });

    // 3. Conversation resolution
    const { conversation } = await this.findOrCreateConversation({
      customerId: customer.id,
      channel: "call",
      providerThreadId: dto.phone_number,
      tenantId,
    });

    // 4. Generate one-line description
    const summary = await this.summarizer.generateOneLineSummary({
      channel: "call",
      content: dto.transcript || dto.ai_summary || "",
      customerName: customer.name,
      callOutcome: dto.outcome || "completed",
    });

    conversation.summary = summary;
    conversation.last_activity_at = new Date();
    await this.convRepo.save(conversation);

    // 5. Persist normalized call record
    const call = this.callRepo.create({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      direction: dto.direction || "inbound",
      duration: dto.duration || 0,
      recording_url: dto.recording_url || null,
      transcript: dto.transcript || null,
      ai_summary: dto.ai_summary || null,
      outcome: dto.outcome || "completed",
      started_at: dto.started_at ? new Date(dto.started_at) : new Date(),
      ended_at: dto.ended_at ? new Date(dto.ended_at) : new Date(),
      provider_call_id: dto.provider_call_id || null,
      telephony_provider: dto.telephony_provider || "vapi",
      metadata: dto.metadata || null,
    });
    const savedCall = await this.callRepo.save(call);

    // 6. Record activity log
    await this.activityRepo.save({
      tenant_id: tenantId,
      customer_id: customer.id,
      conversation_id: conversation.id,
      type: "call_logged",
      detail: `Call recorded with ${customer.name} (${dto.direction || "inbound"}). Duration: ${dto.duration || 0}s, Outcome: ${dto.outcome || "completed"}.`,
      timestamp: new Date(),
    });

    // 6.5. Record in communications for Lead timeline
    try {
      const leadRecord = await this.findOrCreateLead({
        phone: dto.phone_number,
        name: dto.customer_name,
        tenantId,
      });
      await this.commsRepo.save(
        this.commsRepo.create({
          tenant_id: tenantId,
          lead_id: leadRecord.id,
          channel: "call",
          direction: dto.direction || "inbound",
          description: summary || (dto.transcript ? dto.transcript.slice(0, 100) : "Voice AI Call"),
          content: {
            transcript: dto.transcript,
            ai_summary: dto.ai_summary || summary,
            outcome: dto.outcome || "completed",
          },
          duration: dto.duration || null,
          recording_url: dto.recording_url || null,
          occurred_at: dto.ended_at ? new Date(dto.ended_at) : new Date(),
          status: dto.outcome || "answered",
          provider_id: dto.provider_call_id || null,
        })
      );
    } catch (e) {
      this.logger.error(`Error saving lead communication for Call: ${e.message}`);
    }

    // 7. Realtime broadcast
    this.realtime.broadcast("call_logged", {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: "call",
      call: savedCall,
      summary,
    });

    return {
      success: true,
      conversationId: conversation.id,
      callId: savedCall.id,
      customerId: customer.id,
      summary,
    };
  }
}

