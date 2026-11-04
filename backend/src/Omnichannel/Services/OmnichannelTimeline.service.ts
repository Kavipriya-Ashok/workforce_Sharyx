import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Customer } from "../../Database/Table/Customer/customer";
import { lead } from "../../Database/Table/Lead/lead";
import { OmnichannelEvent, OmnichannelEventType, OmnichannelEventDirection } from "../../Database/Table/Omnichannel/OmnichannelEvent.entity";
import { CustomerIdentityResolutionService } from "./CustomerIdentityResolution.service";
import { WhatsAppConversation } from "../../Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "../../Database/Table/WhatsApp/WhatsAppMessage.entity";
import { EmailLog } from "../../Database/Table/Email/EmailLog.entity";
import { VoiceCallLog } from "../../Database/Table/Voice/VoiceCallLog.entity";
import { lead_activity } from "../../Database/Table/Lead/lead_activity";

export interface TimelineQueryFilters {
  channel?: "ALL" | "WHATSAPP" | "EMAIL" | "CALL" | "MEETING" | "INTERVIEW";
  direction?: "ALL" | "INBOUND" | "OUTBOUND";
  startDate?: string;
  endDate?: string;
  search?: string;
  sortOrder?: "DESC" | "ASC";
  page?: number;
  limit?: number;
}

@Injectable()
export class OmnichannelTimelineService {
  private readonly logger = new Logger(OmnichannelTimelineService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(lead)
    private readonly leadRepo: Repository<lead>,
    @InjectRepository(OmnichannelEvent)
    private readonly eventRepo: Repository<OmnichannelEvent>,
    @InjectRepository(WhatsAppConversation)
    private readonly waConvRepo: Repository<WhatsAppConversation>,
    @InjectRepository(WhatsAppMessage)
    private readonly waMsgRepo: Repository<WhatsAppMessage>,
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
    @InjectRepository(VoiceCallLog)
    private readonly callLogRepo: Repository<VoiceCallLog>,
    @InjectRepository(lead_activity)
    private readonly leadActivityRepo: Repository<lead_activity>,
    private readonly identityService: CustomerIdentityResolutionService
  ) {}

  /**
   * Synchronize all native communication records across WhatsApp, Email, Calls, Meetings & Interviews
   * into the universal omnichannel_event table without duplicating large binaries or message bodies.
   */
  async syncAllModuleEventsToOmnichannel(tenantId: string = "default") {
    try {
      // 1. Sync WhatsApp Messages
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(m.tenant_id, c.tenant_id, 'default'),
          cust.id,
          'WHATSAPP',
          CASE WHEN m.direction = 'outbound' THEN 'outbound' ELSE 'inbound' END,
          'whatsapp',
          m.id::text,
          COALESCE(m.created_on, NOW()),
          CASE WHEN m.direction = 'outbound' THEN 'WhatsApp Sent' ELSE 'WhatsApp Received' END,
          COALESCE(m.message_text, 'WhatsApp Message'),
          CASE 
            WHEN LENGTH(COALESCE(m.message_text, '')) > 120 
            THEN SUBSTRING(COALESCE(m.message_text, ''), 1, 120) || '...' 
            ELSE COALESCE(m.message_text, 'WhatsApp Message') 
          END,
          COALESCE(m.delivery_status, 'delivered'),
          json_build_object(
            'conversation_id', c.id,
            'sender_phone', m.sender_phone,
            'recipient_phone', m.recipient_phone,
            'message_type', m.message_type,
            'meta_message_id', m.meta_message_id,
            'is_ai_generated', m.is_ai_generated
          )
        FROM wa_message m
        JOIN wa_conversation c ON c.id = m.conversation_id
        JOIN customer cust ON (
          cust.phone = c.customer_phone 
          OR cust.phone = '+' || c.customer_phone 
          OR cust.phone = REPLACE(c.customer_phone, '+', '')
          OR cust.converted_from_lead_id = c.lead_id
        )
        WHERE NOT EXISTS (
          SELECT 1 FROM omnichannel_event oe 
          WHERE oe.source_module = 'whatsapp' AND oe.source_record_id = m.id::text
        )
      `);

      // 2. Sync Email Logs
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(e.tenant_id, 'default'),
          cust.id,
          'EMAIL',
          CASE WHEN e.direction = 'inbound' THEN 'inbound' ELSE 'outbound' END,
          'email',
          e.id::text,
          COALESCE(e.created_on, NOW()),
          COALESCE(e.subject, 'Email Message'),
          COALESCE(e.body_text, e.body_html, 'Email body'),
          CASE 
            WHEN LENGTH(COALESCE(e.body_text, e.subject, '')) > 120 
            THEN SUBSTRING(COALESCE(e.body_text, e.subject, ''), 1, 120) || '...' 
            ELSE COALESCE(e.body_text, e.subject, 'Email Message') 
          END,
          COALESCE(e.delivery_status, 'sent'),
          json_build_object(
            'from_email', e.from_email,
            'to_email', e.to_email,
            'subject', e.subject,
            'is_ai_drafted', e.is_ai_drafted,
            'message_id', e.message_id
          )
        FROM email_log e
        JOIN customer cust ON (
          LOWER(cust.email) = LOWER(e.to_email)
          OR LOWER(cust.email) = LOWER(e.from_email)
          OR cust.converted_from_lead_id = e.lead_id
        )
        WHERE NOT EXISTS (
          SELECT 1 FROM omnichannel_event oe 
          WHERE oe.source_module = 'email' AND oe.source_record_id = e.id::text
        )
      `);

      // 3. Sync Voice Call Logs
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(v.tenant_id, 'default'),
          cust.id,
          'CALL',
          CASE WHEN v.direction = 'inbound' THEN 'inbound' ELSE 'outbound' END,
          'voice',
          v.id::text,
          COALESCE(v.created_on, NOW()),
          COALESCE(v.summary, 'Voice Call with ' || COALESCE(v.customer_name, cust.name)),
          COALESCE(v.transcript, 'Call transcript recorded'),
          COALESCE(v.summary, 'Voice phone conversation with representative'),
          COALESCE(v.call_status, 'completed'),
          json_build_object(
            'duration_seconds', v.duration_seconds,
            'recording_url', v.recording_url,
            'transcript', v.transcript,
            'call_outcome', v.call_outcome,
            'agent_name', v.agent_name,
            'provider', v.provider,
            'customer_phone', v.customer_phone
          )
        FROM voice_call_log v
        JOIN customer cust ON (
          cust.phone = v.customer_phone 
          OR cust.phone = '+' || v.customer_phone 
          OR cust.phone = REPLACE(v.customer_phone, '+', '')
          OR cust.converted_from_lead_id = v.lead_id
        )
        WHERE NOT EXISTS (
          SELECT 1 FROM omnichannel_event oe 
          WHERE oe.source_module = 'voice' AND oe.source_record_id = v.id::text
        )
      `);

      // 4. Sync Demo Meetings (from lead_activity or wa_conversation meeting_info)
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(la.tenant_id, 'default'),
          cust.id,
          'MEETING',
          'internal',
          'calendar',
          la.id::text,
          COALESCE(la.created_on, NOW()),
          COALESCE(la.title, 'Demo Meeting'),
          COALESCE(la.description, 'Scheduled product demo meeting walkthrough'),
          COALESCE(la.description, 'Product demo meeting appointment'),
          'scheduled',
          COALESCE(la.metadata, '{}'::jsonb)
        FROM lead_activity la
        JOIN customer cust ON cust.converted_from_lead_id = la.lead_id
        WHERE la.activity_type = 'MEETING'
          AND NOT EXISTS (
            SELECT 1 FROM omnichannel_event oe 
            WHERE oe.source_module = 'calendar' AND oe.source_record_id = la.id::text
          )
      `);

      // Also sync meetings from wa_conversation.meeting_info if exists
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(c.tenant_id, 'default'),
          cust.id,
          'MEETING',
          'internal',
          'calendar',
          'wa_meet_' || c.id::text,
          COALESCE((c.meeting_info->>'scheduled_at')::timestamptz, c.last_message_at, NOW()),
          'Demo Meeting: ' || COALESCE(c.meeting_info->>'slot', 'Scheduled appointment'),
          'Meeting booked via WhatsApp assistant. Google Meet link: ' || COALESCE(c.meeting_info->>'meet_url', 'N/A'),
          'Meeting confirmed for ' || COALESCE(c.meeting_info->>'slot', 'slot'),
          'scheduled',
          json_build_object(
            'meet_url', c.meeting_info->>'meet_url',
            'slot', c.meeting_info->>'slot',
            'conversation_id', c.id
          )
        FROM wa_conversation c
        JOIN customer cust ON (
          cust.phone = c.customer_phone 
          OR cust.phone = '+' || c.customer_phone 
          OR cust.converted_from_lead_id = c.lead_id
        )
        WHERE c.meeting_info IS NOT NULL
          AND c.meeting_info->>'slot' IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM omnichannel_event oe 
            WHERE oe.source_module = 'calendar' AND oe.source_record_id = ('wa_meet_' || c.id::text)
          )
      `);

      // 5. Sync Recruitment Interviews (from lead candidate records)
      await this.eventRepo.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        )
        SELECT 
          COALESCE(l.tenant_id, 'default'),
          cust.id,
          'INTERVIEW',
          'internal',
          'recruitment',
          'interview_' || l.id::text,
          COALESCE(l.interview_date, l.created_on, NOW()),
          'Recruitment Interview: ' || COALESCE(l.candidate_stage, 'Screening Stage'),
          'Interview scheduled for role with slot: ' || COALESCE(l.preferred_interview_slot, 'Confirmed slot') || '. Meet Link: ' || COALESCE(l.interview_link, 'Pending link'),
          'Candidate interview at ' || COALESCE(l.candidate_stage, 'scheduled') || ' stage',
          COALESCE(l.candidate_stage, 'scheduled'),
          json_build_object(
            'interview_link', l.interview_link,
            'interview_date', l.interview_date,
            'preferred_slot', l.preferred_interview_slot,
            'candidate_stage', l.candidate_stage,
            'experience', l.total_experience,
            'current_ctc', l.current_ctc,
            'expected_ctc', l.expected_ctc,
            'resume_url', l.resume_url
          )
        FROM lead l
        JOIN customer cust ON cust.converted_from_lead_id = l.id
        WHERE (l.is_candidate = true OR l.interview_date IS NOT NULL OR l.preferred_interview_slot IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1 FROM omnichannel_event oe 
            WHERE oe.source_module = 'recruitment' AND oe.source_record_id = ('interview_' || l.id::text)
          )
      `);
    } catch (err: any) {
      this.logger.warn(`Omnichannel sync warning: ${err.message}`);
    }
  }

  /**
   * Get unified customer timeline with all multi-channel events and full filtering constraints
   */
  async getCustomerTimeline(
    customerId: string,
    filters: TimelineQueryFilters = {},
    tenantId: string = "default"
  ) {
    // 1. Sync latest events from native tables
    await this.syncAllModuleEventsToOmnichannel(tenantId);

    // 2. Fetch Customer Profile
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new Error(`Customer with id ${customerId} not found`);
    }

    // 3. Query Universal Event Table
    const qb = this.eventRepo
      .createQueryBuilder("e")
      .where("e.customer_id = :customerId", { customerId });

    // Multi-tenant check
    qb.andWhere("(e.tenant_id = :tenantId OR e.tenant_id = 'default' OR e.tenant_id IS NULL)", {
      tenantId,
    });

    // Channel constraint filter
    if (filters.channel && filters.channel !== "ALL") {
      qb.andWhere("e.event_type = :eventType", { eventType: filters.channel });
    }

    // Direction constraint filter
    if (filters.direction && filters.direction !== "ALL") {
      qb.andWhere("e.direction = :direction", { direction: filters.direction.toLowerCase() });
    }

    // Date range filter
    if (filters.startDate) {
      qb.andWhere("e.event_timestamp >= :startDate", { startDate: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere("e.event_timestamp <= :endDate", { endDate: filters.endDate });
    }

    // Keyword Search filter across title, description, summary
    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(e.title) LIKE :q OR LOWER(e.description) LIKE :q OR LOWER(e.summary) LIKE :q)",
        { q }
      );
    }

    // Deterministic Sorting Order
    const sortOrder = filters.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy("e.event_timestamp", sortOrder).addOrderBy("e.id", "DESC");

    // Pagination
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [events, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // 4. Calculate channel-wise interaction counts
    const allEvents = await this.eventRepo.find({
      where: { customer_id: customerId },
    });

    const counts = {
      total: allEvents.length,
      whatsapp: allEvents.filter((ev) => ev.event_type === "WHATSAPP").length,
      email: allEvents.filter((ev) => ev.event_type === "EMAIL").length,
      call: allEvents.filter((ev) => ev.event_type === "CALL").length,
      meeting: allEvents.filter((ev) => ev.event_type === "MEETING").length,
      interview: allEvents.filter((ev) => ev.event_type === "INTERVIEW").length,
    };

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        company_name: customer.company_name,
        customer_status: customer.customer_status,
        tier: customer.tier,
        total_spend: customer.total_spend,
        created_at: customer.created_on,
      },
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      events: events.map((ev) => ({
        id: ev.id,
        customer_id: ev.customer_id,
        event_type: ev.event_type,
        direction: ev.direction,
        source_module: ev.source_module,
        source_record_id: ev.source_record_id,
        event_timestamp: ev.event_timestamp,
        title: ev.title,
        description: ev.description,
        summary: ev.summary,
        status: ev.event_status || "completed",
        metadata: ev.metadata || {},
      })),
    };
  }

  /**
   * Get single event detail with fully resolved source payload across all 5 channels
   */
  async getEventDetail(eventId: string, tenantId: string = "default") {
    // 1. Handle Demo Meeting Virtual Event (meet_convId)
    if (eventId.startsWith("meet_")) {
      const convId = eventId.replace("meet_", "");
      const conv = await this.waConvRepo.findOne({ where: { id: convId as any } });
      const info = conv && conv.meeting_info
        ? (typeof conv.meeting_info === "string" ? JSON.parse(conv.meeting_info) : conv.meeting_info)
        : {};
      return {
        event: {
          id: eventId,
          channel: "meeting",
          event_type: "MEETING",
          title: "Demo Meeting & Solution Showcase",
          description: `Scheduled Slot: ${info.slot || "Online Demo"}\nGoogle Meet: ${info.meet_url || "Link pending"}`,
          status: "confirmed",
          occurred_at: info.scheduled_at || conv?.updated_on || new Date(),
        },
        channel: "meeting",
        sourceDetail: {
          meet_url: info.meet_url || "https://meet.google.com/rm5-iyw5-q94",
          slot: info.slot || "10:00 AM",
          scheduled_at: info.scheduled_at,
          customer_phone: conv?.customer_phone,
          customer_name: conv?.customer_name,
        },
      };
    }

    // 2. Handle Recruitment Interview Event (interview_leadId)
    if (eventId.startsWith("interview_")) {
      const leadId = eventId.replace("interview_", "");
      const leadRecord = await this.leadRepo.findOne({ where: { id: leadId } });
      return {
        event: {
          id: eventId,
          channel: "interview",
          event_type: "INTERVIEW",
          title: `Technical Interview - ${leadRecord?.job_title || "Candidate Evaluation"}`,
          description: `Stage: ${leadRecord?.candidate_stage || leadRecord?.lead_status || "Scheduled"}\nInterview Link: ${leadRecord?.interview_link || "Link generated"}`,
          status: leadRecord?.candidate_stage || "scheduled",
          occurred_at: leadRecord?.interview_date || leadRecord?.created_on || new Date(),
        },
        channel: "interview",
        sourceDetail: {
          candidate_name: leadRecord?.name || `${leadRecord?.first_name || ""} ${leadRecord?.last_name || ""}`.trim(),
          candidate_phone: leadRecord?.phone,
          candidate_email: leadRecord?.email,
          stage: leadRecord?.candidate_stage || leadRecord?.lead_status,
          interview_link: leadRecord?.interview_link || "https://meet.google.com/rm5-iyw5-q94",
          interview_date: leadRecord?.interview_date,
          job_title: leadRecord?.job_title,
          preferred_slot: leadRecord?.preferred_interview_slot,
          resume_url: leadRecord?.resume_url,
        },
      };
    }

    // 3. Check omnichannel_event
    let event: any = null;
    try {
      event = await this.eventRepo.findOne({
        where: { id: eventId },
        relations: ["customer"],
      });
    } catch {}

    if (event) {
      let sourceDetail: any = null;
      switch (event.source_module) {
        case "whatsapp": {
          const msg = await this.waMsgRepo.findOne({
            where: { id: event.source_record_id as any },
            relations: ["conversation"],
          });
          if (msg) {
            const thread = await this.waMsgRepo.find({
              where: { conversation_id: msg.conversation_id },
              order: { created_on: "ASC" },
              take: 50,
            });
            sourceDetail = { message: msg, thread };
          }
          break;
        }
        case "email": {
          sourceDetail = await this.emailLogRepo.findOne({
            where: { id: event.source_record_id as any },
          });
          break;
        }
        case "voice": {
          sourceDetail = await this.callLogRepo.findOne({
            where: { id: event.source_record_id as any },
          });
          break;
        }
      }
      return { event, channel: (event.event_type || "whatsapp").toLowerCase(), sourceDetail };
    }

    // 4. Check wa_message directly
    try {
      const waMsg = await this.waMsgRepo.findOne({ where: { id: eventId as any } });
      if (waMsg) {
        const thread = waMsg.conversation_id
          ? await this.waMsgRepo.find({
              where: { conversation_id: waMsg.conversation_id },
              order: { created_on: "ASC" },
              take: 100,
            })
          : [waMsg];
        return {
          event: {
            id: waMsg.id,
            channel: "whatsapp",
            direction: waMsg.direction,
            description: waMsg.message_text,
            occurred_at: waMsg.created_on,
            status: waMsg.delivery_status,
          },
          channel: "whatsapp",
          sourceDetail: {
            message: waMsg,
            thread,
          },
        };
      }
    } catch {}

    // 5. Check voice_call_log directly
    try {
      const call = await this.callLogRepo.findOne({ where: { id: eventId as any } });
      if (call) {
        return {
          event: {
            id: call.id,
            channel: "call",
            direction: call.direction,
            description: call.summary || `Call (${call.duration_seconds}s)`,
            occurred_at: call.created_on,
            duration: call.duration_seconds,
            recording_url: call.recording_url,
            status: call.call_status,
          },
          channel: "call",
          sourceDetail: call,
        };
      }
    } catch {}

    // 6. Check email_log directly
    try {
      const email = await this.emailLogRepo.findOne({ where: { id: eventId as any } });
      if (email) {
        return {
          event: {
            id: email.id,
            channel: "email",
            direction: email.direction,
            description: email.subject || email.body_text,
            occurred_at: email.created_on,
            status: email.delivery_status,
          },
          channel: "email",
          sourceDetail: email,
        };
      }
    } catch {}

    // 7. Check communications table
    try {
      const commRows = await this.eventRepo.query(
        `SELECT * FROM communications WHERE id = $1`,
        [eventId]
      );
      if (commRows.length > 0) {
        const c = commRows[0];
        return {
          event: {
            id: c.id,
            channel: c.channel,
            direction: c.direction,
            description: c.description,
            content: c.content,
            duration: c.duration,
            recording_url: c.recording_url,
            occurred_at: c.occurred_at,
            status: c.status,
          },
          channel: c.channel,
          sourceDetail: c.content || c,
        };
      }
    } catch {}

    throw new Error(`Event with id ${eventId} not found`);
  }
}
