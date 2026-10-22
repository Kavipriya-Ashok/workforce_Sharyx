import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { CalendarHelper } from "../../WhatsApp/Helpers/CalendarHelper";

export interface AgentToolCall {
  name: string;
  inputs?: Record<string, any>;
}

export interface ToolResult {
  ok: boolean;
  /** Text appended to the customer reply (e.g. Meet link). */
  appendText?: string;
  /** Short note fed back into memory. */
  note: string;
}

export const AGENT_OUTCOME_EVENT = "agent.outcome";

export interface AgentOutcomeEvent {
  tenantId: string;
  channel: string;
  outcome: string; // 'Demo Booked' | 'Interview Booked' | 'Hot Lead' | 'Ticket Created' ...
  event: string; // trigger_event for campaign matching
  phone?: string;
  email?: string;
  leadName?: string;
  meetUrl?: string;
  summary?: string;
  agentName?: string;
}

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(private readonly events: EventEmitter2) {}

  async execute(
    tool: AgentToolCall,
    state: ConversationAgentState,
    agentKey: string,
    agentName: string
  ): Promise<ToolResult> {
    const inputs = tool.inputs || {};
    try {
      switch (tool.name) {
        case "capture_contact":
          return await this.captureContact(inputs, state);
        case "send_brochure":
          return {
            ok: true,
            note: "brochure shared",
            appendText: process.env.BROCHURE_URL ? `📄 Brochure: ${process.env.BROCHURE_URL}` : undefined,
          };
        case "qualify_lead":
          return await this.qualifyLead(inputs, state, agentName);
        case "notify_sales_team":
          return await this.notifySales(inputs, state, agentName);
        case "book_appointment":
          return await this.bookAppointment(inputs, state, agentName);
        case "email_meeting_link":
        case "send_meeting_link_email":
          return await this.emailMeetingLink(inputs, state, agentName);
        case "cancel_appointment":
          return await this.cancelAppointment(inputs, state, agentName);
        case "create_ticket":
          return await this.createTicket(inputs, state, agentName);
        case "transfer_to_human":
          return await this.transferToHuman(inputs, state, agentName);
        case "dispatch_voice_call":
        case "call_lead":
        case "request_phone_call":
          return await this.dispatchVoiceCall(inputs, state, agentName);
        default:
          return { ok: false, note: `unknown tool ${tool.name}` };
      }
    } catch (err: any) {
      this.logger.error(`Tool ${tool.name} failed: ${err.message}`);
      return { ok: false, note: `${tool.name} failed` };
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async getLead(state: ConversationAgentState): Promise<lead | null> {
    if (state.lead_id) {
      const l = await lead.findOne({ where: { id: state.lead_id } });
      if (l) return l;
    }
    if (state.customer_phone) {
      const l = await lead.findOne({ where: { phone: state.customer_phone, status: true } });
      if (l) return l;
    }
    if (state.customer_email) {
      return await lead.findOne({ where: { email: state.customer_email, status: true } });
    }
    return null;
  }

  private async logActivity(state: ConversationAgentState, title: string, description: string, performer: string) {
    if (!state.lead_id) return;
    try {
      const act = new lead_activity();
      act.lead_id = state.lead_id;
      act.activity_type = state.channel === "email" ? "EMAIL" : "WHATSAPP";
      act.title = title;
      act.description = description;
      act.performer_name = performer;
      act.tenant_id = state.tenant_id;
      act.created_by_id = "ai_agent";
      act.created_on = new Date();
      await act.save();
    } catch (err: any) {
      this.logger.warn(`Activity log failed: ${err.message}`);
    }
  }

  // ── tools ────────────────────────────────────────────────────────────────
  private async captureContact(inputs: any, state: ConversationAgentState): Promise<ToolResult> {
    const slots = { ...(state.collected_slots || {}) };
    ["name", "email", "phone", "company"].forEach((k) => inputs[k] && (slots[k] = inputs[k]));
    state.collected_slots = slots;
    if (inputs.name) state.customer_name = inputs.name;
    if (inputs.email && !state.customer_email) state.customer_email = inputs.email;
    if (inputs.phone && !state.customer_phone) state.customer_phone = inputs.phone;

    let l = await this.getLead(state);
    const isNewLead = !l;
    if (!l) {
      l = new lead();
      l.tenant_id = state.tenant_id || "default";
      l.name = inputs.name || state.customer_name || "New Inbound Lead";
      l.email = inputs.email || state.customer_email || null;
      l.phone = inputs.phone || state.customer_phone || null;
      l.company_name = inputs.company || null;
      l.source = state.channel === "whatsapp" ? LeadSource.WHATSAPP : LeadSource.EMAIL;
      l.lead_status = LeadStatus.NEW;
      l.score = inputs.email && inputs.company ? 80 : 65;
      l.created_by_id = "ai_agent";
      l.created_on = new Date();
      await l.save();
      state.lead_id = l.id;
    } else {
      if (inputs.name && (!l.name || /^\+?\d+$/.test(l.name))) l.name = inputs.name;
      if (inputs.email) l.email = inputs.email;
      if (inputs.phone && !l.phone) l.phone = inputs.phone;
      if (inputs.company) l.company_name = inputs.company;
      if (inputs.email && inputs.company) l.score = Math.max(l.score || 0, 80);
      l.updated_on = new Date();
      await l.save();
      state.lead_id = l.id;
    }

    await this.logActivity(
      state,
      isNewLead ? "🎯 Lead Created in CRM" : "👤 Lead Details Updated",
      `Name: ${l.name || "-"} | Email: ${l.email || "-"} | Company: ${l.company_name || "-"} | Phone: ${l.phone || "-"}`,
      "Receptionist"
    );

    // If an email address was captured/confirmed:
    if (inputs.email || (state.customer_email && !state.collected_slots?.welcome_email_sent)) {
      const confirmedEmail = inputs.email || state.customer_email;
      state.collected_slots = { ...(state.collected_slots || {}), welcome_email_sent: true };

      // Check if a Google Meet room has already been booked for this customer
      let appointmentSlot = state.collected_slots?.appointment?.slot;
      let appointmentMeetUrl = state.collected_slots?.appointment?.meet_url;
      if (!appointmentMeetUrl && state.channel === "whatsapp" && state.conversation_ref) {
        try {
          const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
          if (conv?.meeting_info?.meet_url) {
            appointmentMeetUrl = conv.meeting_info.meet_url;
            appointmentSlot = conv.meeting_info.slot;
          }
        } catch {}
      }

      if (appointmentMeetUrl) {
        // Automatically dispatch Google Meet calendar invite email!
        this.events.emit(AGENT_OUTCOME_EVENT, {
          tenantId: state.tenant_id,
          channel: state.channel,
          outcome: "Demo Booked",
          event: "appointment_booked",
          phone: state.customer_phone || l.phone,
          email: confirmedEmail,
          leadName: state.customer_name || l.name,
          meetUrl: appointmentMeetUrl,
          summary: `Meeting invitation emailed to ${confirmedEmail} for ${appointmentSlot || "Scheduled Session"}`,
          agentName: "Appointment Desk",
        } as AgentOutcomeEvent);

        this.logger.log(`🎯 [MEET INVITE SENT TO EMAIL] ${l.name} (${confirmedEmail}) -> ${appointmentMeetUrl}`);
        return {
          ok: true,
          note: `Contact captured and Google Meet invitation emailed to ${confirmedEmail}`,
          appendText: `✉️ I've sent the Google Meet invitation directly to your email (*${confirmedEmail}*)!\n\n🗓️ Slot: ${appointmentSlot || "Scheduled Session"}\n🎥 Join: ${appointmentMeetUrl}`,
        };
      }

      this.events.emit(AGENT_OUTCOME_EVENT, {
        tenantId: state.tenant_id,
        channel: state.channel,
        outcome: "Email Confirmed",
        event: "email_confirmed",
        phone: state.customer_phone || l.phone,
        email: confirmedEmail,
        leadName: state.customer_name || l.name,
        company: inputs.company || l.company_name,
        summary: `Lead registered via ${state.channel}: ${l.name} (${confirmedEmail})`,
        agentName: "Receptionist",
      } as AgentOutcomeEvent);

      this.logger.log(`🎯 [LEAD CAPTURED & SYNCED TO ADMIN] ${l.name} (${confirmedEmail}) | Company: ${l.company_name || "N/A"}`);
      return {
        ok: true,
        note: `Contact captured and synced to CRM: ${l.name} (${confirmedEmail})`,
        appendText: `✉️ A confirmation has been registered for your email (*${confirmedEmail}*)!`,
      };
    }

    this.logger.log(`🎯 [LEAD CAPTURED & SYNCED TO ADMIN] ${l.name} | Phone: ${l.phone || "N/A"}`);
    return { ok: true, note: `contact captured and synced to CRM: ${JSON.stringify(inputs)}` };
  }

  private async qualifyLead(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    state.collected_slots = { ...(state.collected_slots || {}), qualification: { ...(state.collected_slots?.qualification || {}), ...inputs } };
    const l = await this.getLead(state);
    if (l) {
      const level = String(inputs.interest_level || "").toLowerCase();
      if (level === "hot") {
        l.lead_status = LeadStatus.QUALIFIED;
        l.score = Math.max(l.score || 0, 85);
      } else if (level === "warm") {
        if (l.lead_status === LeadStatus.NEW) l.lead_status = LeadStatus.CONTACTED;
        l.score = Math.max(l.score || 0, 70);
      } else if (level === "cold") {
        l.score = Math.min(l.score || 50, 40);
      }
      l.custom_fields = { ...(l.custom_fields || {}), ai_qualification: state.collected_slots.qualification };
      l.updated_on = new Date();
      await l.save();
    }
    await this.logActivity(state, "AI Lead Qualification", JSON.stringify(inputs), agentName);
    return { ok: true, note: `lead qualified (${inputs.interest_level || "updated"})` };
  }

  private async notifySales(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    state.collected_slots = { ...(state.collected_slots || {}), sales_notified: true };
    await this.logActivity(
      state,
      `🔥 Sales team alerted (${inputs.priority || "normal"})`,
      inputs.reason || "Customer requested sales contact",
      agentName
    );
    this.events.emit(AGENT_OUTCOME_EVENT, {
      tenantId: state.tenant_id,
      channel: state.channel,
      outcome: "Hot Lead",
      event: "hot_lead",
      phone: state.customer_phone,
      email: state.customer_email,
      leadName: state.customer_name,
      summary: inputs.reason,
      agentName,
    } as AgentOutcomeEvent);
    this.logger.log(`🔥 [SALES ALERT] ${state.customer_name || state.customer_phone || state.customer_email}: ${inputs.reason}`);
    return { ok: true, note: "sales team notified" };
  }

  private async bookAppointment(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    const slot = inputs.slot || "Tomorrow 10:00 AM";
    const type = (inputs.type || "demo").toLowerCase();
    const label = type === "interview" ? "Interview" : type === "consultation" ? "Consultation" : "Demo";
    const who = state.customer_name || state.customer_phone || state.customer_email || "Customer";

    const meet = await CalendarHelper.createGoogleMeetRoom(`Sharyx ${label} - ${who}`, slot);
    const meeting = { slot, type, mode: inputs.mode || "ONLINE", meet_url: meet.meetUrl, booked_at: new Date().toISOString() };
    state.collected_slots = { ...(state.collected_slots || {}), appointment: meeting };

    if (state.channel === "whatsapp" && state.conversation_ref) {
      const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
      if (conv) {
        conv.meeting_info = { slot, meet_url: meet.meetUrl, scheduled_at: meeting.booked_at };
        await conv.save();
      }
    }

    // Default: Check if recipient email is known to trigger automatic email dispatch
    const leadRec = await this.getLead(state);
    const recipientEmail = inputs.email || state.customer_email || leadRec?.email;
    if (recipientEmail && !state.customer_email) {
      state.customer_email = recipientEmail;
    }

    await this.logActivity(state, `📅 ${label} booked`, `${slot} | ${meet.meetUrl}${recipientEmail ? ` | Confirmation sent to ${recipientEmail}` : ""}`, agentName);
    
    if (recipientEmail) {
      this.events.emit(AGENT_OUTCOME_EVENT, {
        tenantId: state.tenant_id,
        channel: state.channel,
        outcome: `${label} Booked`,
        event: "appointment_booked",
        phone: state.customer_phone,
        email: recipientEmail,
        leadName: state.customer_name,
        meetUrl: meet.meetUrl,
        summary: `${label} booked for ${slot} (emailed to ${recipientEmail})`,
        agentName,
      } as AgentOutcomeEvent);
    }

    return {
      ok: true,
      note: `${label} booked for ${slot}, meet ${meet.meetUrl}${recipientEmail ? `, confirmation emailed to ${recipientEmail}` : ""}`,
      appendText: recipientEmail
        ? `🗓️ ${slot}\n🎥 Google Meet: ${meet.meetUrl}\n✉️ Invitation sent to your email (*${recipientEmail}*)!`
        : `🗓️ ${slot}\n🎥 Google Meet: ${meet.meetUrl}\n\n✉️ What is your email address so I can send the calendar invitation directly to your inbox?`,
    };
  }

  private async emailMeetingLink(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    const leadRec = await this.getLead(state);
    const email = inputs.email || state.customer_email || leadRec?.email;
    const name = state.customer_name || leadRec?.name || "Customer";
    const slot = inputs.slot || state.collected_slots?.appointment?.slot || "Tomorrow 10:00 AM";

    if (!email) {
      return {
        ok: false,
        note: "Email address not provided. Ask customer for their email address so the meeting link can be sent.",
        appendText: "Could you please share your email address so I can send the meeting link directly to your inbox? ✉️",
      };
    }

    state.customer_email = email;
    if (leadRec && !leadRec.email) {
      leadRec.email = email;
      leadRec.updated_on = new Date();
      await leadRec.save();
    }

    // Get or create Google Meet link
    let meetUrl = state.collected_slots?.appointment?.meet_url;
    if (!meetUrl) {
      const meet = await CalendarHelper.createGoogleMeetRoom(`Sharyx Session - ${name}`, slot);
      meetUrl = meet.meetUrl;
      state.collected_slots = {
        ...(state.collected_slots || {}),
        appointment: { slot, type: "demo", mode: "ONLINE", meet_url: meetUrl, booked_at: new Date().toISOString() },
      };
    }

    await this.logActivity(state, "✉️ Meeting Link Emailed", `Sent Google Meet link (${meetUrl}) to ${email}`, agentName);

    // Emit event so OutcomeTriggerService delivers the meeting invitation email immediately
    this.events.emit(AGENT_OUTCOME_EVENT, {
      tenantId: state.tenant_id,
      channel: state.channel,
      outcome: "Demo Booked",
      event: "appointment_booked",
      phone: state.customer_phone,
      email,
      leadName: name,
      meetUrl,
      summary: `Meeting link emailed to ${email} for ${slot}`,
      agentName,
    } as AgentOutcomeEvent);

    this.logger.log(`✉️ [MEETING LINK EMAILED] ${name} (${email}) -> ${meetUrl}`);

    return {
      ok: true,
      note: `Meeting link emailed to ${email}`,
      appendText: `✉️ I've sent the Google Meet invitation directly to your email (*${email}*)!\n\n🗓️ Slot: ${slot}\n🎥 Join: ${meetUrl}`,
    };
  }

  private async cancelAppointment(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    const prev = state.collected_slots?.appointment;
    const slots = { ...(state.collected_slots || {}) };
    delete slots.appointment;
    state.collected_slots = slots;
    if (state.channel === "whatsapp" && state.conversation_ref) {
      const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
      if (conv) {
        conv.meeting_info = null as any;
        await conv.save();
      }
    }
    await this.logActivity(state, "📅 Appointment cancelled", `${prev?.slot || ""} ${inputs.reason || ""}`, agentName);
    return { ok: true, note: "appointment cancelled" };
  }

  private async createTicket(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
    const tickets = [...(state.collected_slots?.tickets || []), { id: ticketId, ...inputs, created_at: new Date().toISOString() }];
    state.collected_slots = { ...(state.collected_slots || {}), tickets };
    await this.logActivity(state, `🛟 Support ticket ${ticketId} (${inputs.priority || "normal"})`, inputs.issue || "", agentName);
    return { ok: true, note: `ticket ${ticketId} created`, appendText: `🎫 Ticket ID: ${ticketId}` };
  }

  private async transferToHuman(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    state.human_takeover = true;
    if (state.channel === "whatsapp" && state.conversation_ref) {
      const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
      if (conv) {
        conv.conversation_status = "waiting_human";
        await conv.save();
      }
    }
    await this.logActivity(state, "👨‍💼 Transferred to human", inputs.reason || "", agentName);
    return { ok: true, note: "transferred to human" };
  }

  private async dispatchVoiceCall(inputs: any, state: ConversationAgentState, agentName: string): Promise<ToolResult> {
    const targetPhone = inputs.phone || inputs.phone_number || state.customer_phone;
    if (!targetPhone) {
      return { ok: false, note: "Missing customer phone number for voice call" };
    }

    this.events.emit("voice.call.requested", {
      tenantId: state.tenant_id,
      phone: targetPhone,
      customerName: inputs.name || inputs.customer_name || state.customer_phone,
      reason: inputs.reason || inputs.inquiry || "Customer requested live phone support",
      leadId: state.lead_id,
    });

    await this.logActivity(
      state,
      "📞 AI Phone Call Requested",
      `Dispatched outbound AI call to ${targetPhone}. Reason: ${inputs.reason || "Direct conversation"}`,
      agentName
    );

    return {
      ok: true,
      note: `Voice call dispatched to ${targetPhone}`,
      appendText: `📞 I've just scheduled an outbound call to ${targetPhone}. Our AI representative will ring your phone shortly!`,
    };
  }
}
