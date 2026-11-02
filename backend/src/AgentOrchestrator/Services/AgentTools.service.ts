import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { CalendarHelper } from "../../WhatsApp/Helpers/CalendarHelper";
import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";

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

  constructor(
    private readonly events: EventEmitter2,
    private readonly openingsService: JobOpeningsService
  ) {}

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
        case "get_open_roles": {
          const { shortSummary, promptBlock } = await this.openingsService.formatOpenRolesForPrompt(
            state.tenant_id || "default"
          );
          return {
            ok: true,
            note: promptBlock || shortSummary,
          };
        }
        case "get_available_slots": {
          const slots = await this.openingsService.getAvailableSlots(state.tenant_id || "default", 4);
          return {
            ok: true,
            note: `Available interview slots (Mon-Sat, 10 AM - 6 PM IST): ${slots.join(" | ")}`,
          };
        }
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
      const cleanPhone = state.customer_phone.replace(/[^\d]/g, "");
      const withPlus = "+" + cleanPhone;
      let l = await lead.findOne({ where: { phone: state.customer_phone } });
      if (!l) l = await lead.findOne({ where: { phone: withPlus } });
      if (!l) l = await lead.findOne({ where: { phone: cleanPhone } });
      if (l) {
        state.lead_id = l.id;
        return l;
      }
    }
    if (state.customer_email) {
      const l = await lead.findOne({ where: { email: state.customer_email } });
      if (l) {
        state.lead_id = l.id;
        return l;
      }
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
    [
      "name",
      "email",
      "phone",
      "company",
      "current_company",
      "role",
      "job_title",
      "applied_role",
      "experience",
      "total_experience",
      "relevant_experience",
      "employment_status",
      "relieving_date",
      "current_ctc",
      "expected_ctc",
      "ctc_basis",
      "relocation",
      "preferred_location",
      "location",
      "notice_period",
      "preferred_slot",
      "resume_url",
    ].forEach((k) => inputs[k] !== undefined && inputs[k] !== null && inputs[k] !== "" && (slots[k] = inputs[k]));
    if (inputs.location && !slots.preferred_location) slots.preferred_location = inputs.location;
    if (inputs.role && !slots.applied_role) slots.applied_role = inputs.role;
    if (inputs.applied_role && !slots.role) slots.role = inputs.applied_role;
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
      l.company_name = inputs.company || inputs.current_company || null;
      l.source = state.channel === "whatsapp" ? LeadSource.WHATSAPP : LeadSource.EMAIL;
      l.lead_status = LeadStatus.NEW;
      l.score = inputs.email && (inputs.company || inputs.current_company) ? 80 : 65;
      l.created_by_id = "ai_agent";
      l.created_on = new Date();
    } else {
      if (inputs.name && (!l.name || /^\+?\d+$/.test(l.name) || l.name === "New Inbound Lead" || l.name === "Candidate")) {
        l.name = inputs.name;
      }
      if (inputs.email) l.email = inputs.email;
      if (inputs.phone && !l.phone) l.phone = inputs.phone;
      if (inputs.company || inputs.current_company) l.company_name = inputs.company || inputs.current_company;
      if (inputs.email && (inputs.company || inputs.current_company)) l.score = Math.max(l.score || 0, 80);
    }

    // Persist all 14 Candidate / Recruitment fields whenever present (REC-001 to REC-040)
    const isCand = Boolean(
      inputs.is_candidate ||
      state.active_agent === "recruitment" ||
      slots.role ||
      slots.job_title ||
      slots.applied_role ||
      slots.total_experience ||
      slots.experience ||
      slots.employment_status ||
      slots.expected_ctc ||
      slots.resume_url
    );
    if (isCand) {
      l.is_candidate = true;
      if (!l.candidate_stage || l.candidate_stage === "new") {
        l.candidate_stage = "screening";
      }
      const roleVal = inputs.role || inputs.job_title || inputs.applied_role || slots.role || slots.job_title || slots.applied_role;
      if (roleVal) l.job_title = String(roleVal);

      const totExp = inputs.total_experience ?? inputs.experience ?? slots.total_experience ?? slots.experience;
      if (totExp !== undefined) {
        const num = parseFloat(String(totExp).replace(/[^\d.]/g, ""));
        if (!isNaN(num)) l.total_experience = num;
      }
      const relExp = inputs.relevant_experience ?? slots.relevant_experience;
      if (relExp !== undefined) {
        const num = parseFloat(String(relExp).replace(/[^\d.]/g, ""));
        if (!isNaN(num)) l.relevant_experience = num;
      }
      const empStatus = inputs.employment_status || slots.employment_status;
      if (empStatus) {
        const s = String(empStatus).toLowerCase();
        l.employment_status = s.includes("reliev") ? "relieved" : s.includes("notice") || s.includes("serv") ? "notice" : "working";
      }
      const relDate = inputs.relieving_date || slots.relieving_date;
      if (relDate) {
        const dmy = String(relDate).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        const d = dmy
          ? new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10))
          : new Date(relDate);
        if (!isNaN(d.getTime())) l.relieving_date = d;
      }
      const parseCtcAmount = (rawVal: any): number | null => {
        if (rawVal === undefined || rawVal === null) return null;
        const str = String(rawVal).toLowerCase();
        if (str === "not disclosed") return null;
        const num = parseFloat(str.replace(/[^\d.]/g, ""));
        if (isNaN(num)) return null;
        if (/crore|cr\b/i.test(str) && num < 100) return num * 10000000;
        if (/lakh|lac|lpa\b/i.test(str) && num < 1000) return num * 100000;
        return num;
      };
      const curCtc = parseCtcAmount(inputs.current_ctc ?? slots.current_ctc);
      if (curCtc !== null) l.current_ctc = curCtc;
      const expCtc = parseCtcAmount(inputs.expected_ctc ?? slots.expected_ctc);
      if (expCtc !== null) l.expected_ctc = expCtc;
      if (inputs.ctc_basis || slots.ctc_basis) {
        l.ctc_basis = String(inputs.ctc_basis || slots.ctc_basis).toLowerCase().includes("month") ? "monthly" : "annual";
      }
      if (inputs.relocation || slots.relocation || inputs.preferred_location || slots.preferred_location) {
        const r = String(inputs.relocation || slots.relocation || "yes").toLowerCase();
        l.relocation = r.startsWith("n") ? "no" : r.startsWith("c") ? "conditional" : "yes";
      }
      if (inputs.preferred_slot || slots.preferred_slot) {
        l.preferred_interview_slot = String(inputs.preferred_slot || slots.preferred_slot);
      }
      if (inputs.resume_url || slots.resume_url) {
        l.resume_url = String(inputs.resume_url || slots.resume_url);
      }
      l.custom_fields = {
        ...(l.custom_fields || {}),
        recruitment_profile: {
          ...((l.custom_fields as any)?.recruitment_profile || {}),
          ...slots,
          updated_at: new Date().toISOString(),
        },
      };
    }

    l.updated_on = new Date();
    await l.save();
    state.lead_id = l.id;

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
      };
    }

    if (
      inputs.phone &&
      state.collected_slots?.appointment?.meet_url &&
      !state.collected_slots?.voice_confirmation_dispatched
    ) {
      const appt = state.collected_slots.appointment;
      const isIntv = appt.type === "interview" || l.is_candidate;
      state.collected_slots = { ...(state.collected_slots || {}), voice_confirmation_dispatched: true };
      this.events.emit("voice.call.requested", {
        tenantId: state.tenant_id || "default",
        phone: inputs.phone,
        customerName: state.customer_name || l.name || "Customer",
        reason: `${isIntv ? "Interview" : "Demo"} scheduled for ${appt.slot || "upcoming slot"}`,
        leadId: l.id,
        agentKey: isIntv ? "recruitment" : "sales",
        scheduledType: isIntv ? "interview" : "demo",
        meetingSlot: appt.slot,
        meetUrl: appt.meet_url,
      });
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
    const rawSlot = inputs.slot || "Monday 11:00 AM";
    const type = (inputs.type || "demo").toLowerCase();
    const isInterview = type === "interview" || agentName.toLowerCase().includes("recruitment");
    const label = isInterview ? "Interview" : type === "consultation" ? "Consultation" : "Demo";
    const who = state.customer_name || state.customer_phone || state.customer_email || "Candidate";

    // TASK 3: Server-side slot validation (Mon-Sat, 10:00 AM - 6:00 PM IST, no Sundays, no 12 AM, no past times)
    const validation = await this.openingsService.validateInterviewSlot(rawSlot, state.tenant_id || "default");
    if (!validation.valid) {
      const slotList = (validation.availableSlots || []).map((s) => `• *${s}*`).join("\n");
      return {
        ok: false,
        note: `Invalid slot "${rawSlot}": ${validation.reason}`,
        appendText: `⚠️ ${validation.reason}\n\nHere are our next available ${label.toLowerCase()} slots (Monday to Saturday, 10:00 AM – 6:00 PM IST):\n${slotList}\n\nWhich of these slots works best for you?`,
      };
    }

    const slot = validation.formattedSlot || rawSlot;
    const meet = await CalendarHelper.createGoogleMeetRoom(`Sharyx ${label} - ${who}`, slot);
    const meeting = { slot, type: isInterview ? "interview" : type, mode: inputs.mode || "ONLINE", meet_url: meet.meetUrl, booked_at: new Date().toISOString() };
    state.collected_slots = { ...(state.collected_slots || {}), appointment: meeting };

    if (state.channel === "whatsapp" && state.conversation_ref) {
      const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
      if (conv) {
        conv.meeting_info = { slot, meet_url: meet.meetUrl, scheduled_at: meeting.booked_at };
        await conv.save();
      }
    }

    // Default: Check if recipient email is known to trigger automatic email dispatch
    let leadRec = await this.getLead(state);
    let recipientEmail = inputs.email || state.customer_email || leadRec?.email;
    if (recipientEmail && (recipientEmail.includes("example.com") || !recipientEmail.includes("@"))) {
      recipientEmail = null;
    }
    if (recipientEmail && !state.customer_email) {
      state.customer_email = recipientEmail;
    }

    if (!leadRec) {
      leadRec = new lead();
      leadRec.tenant_id = state.tenant_id || "default";
      leadRec.name = state.customer_name || "Candidate";
      leadRec.phone = state.customer_phone || null;
      leadRec.email = recipientEmail || state.customer_email || null;
      leadRec.source = LeadSource.WHATSAPP;
      leadRec.lead_status = LeadStatus.NEW;
      leadRec.created_by_id = "ai_agent";
      leadRec.created_on = new Date();
      await leadRec.save();
      state.lead_id = leadRec.id;
    }

    // If it is a job candidate / interview, update the lead record into a full candidate!
    if (leadRec) {
      if (isInterview) {
        leadRec.is_candidate = true;
        leadRec.candidate_stage = "scheduled";
        leadRec.interview_link = meet.meetUrl;
        leadRec.preferred_interview_slot = slot;
        const chosenRole =
          inputs.role ||
          state.collected_slots?.role ||
          state.collected_slots?.applied_role ||
          state.collected_slots?.job_title;
        if (chosenRole) {
          leadRec.job_title = String(chosenRole);
        }
        if (state.collected_slots?.experience || state.collected_slots?.total_experience) {
          const rawExp = String(state.collected_slots?.experience || state.collected_slots?.total_experience).replace(/[^\d.]/g, "");
          const numExp = parseFloat(rawExp);
          if (!isNaN(numExp)) leadRec.total_experience = numExp;
        }
        if (state.collected_slots?.relevant_experience) {
          const rawRelExp = String(state.collected_slots.relevant_experience).replace(/[^\d.]/g, "");
          const numRelExp = parseFloat(rawRelExp);
          if (!isNaN(numRelExp)) leadRec.relevant_experience = numRelExp;
        }
        if (state.collected_slots?.employment_status) {
          const s = String(state.collected_slots.employment_status).toLowerCase();
          leadRec.employment_status = s.includes("reliev") ? "relieved" : s.includes("notice") || s.includes("serv") ? "notice" : "working";
        }
        if (state.collected_slots?.relocation || state.collected_slots?.preferred_location) {
          const r = String(state.collected_slots.relocation || "yes").toLowerCase();
          leadRec.relocation = r.startsWith("n") ? "no" : r.startsWith("c") ? "conditional" : "yes";
        }
        if (state.collected_slots?.resume_url) {
          leadRec.resume_url = state.collected_slots.resume_url;
        }
        if (validation.dateObj) {
          leadRec.interview_date = validation.dateObj;
        }
        leadRec.custom_fields = {
          ...(leadRec.custom_fields || {}),
          recruitment_profile: {
            ...((leadRec.custom_fields as any)?.recruitment_profile || {}),
            ...(state.collected_slots || {}),
            role: chosenRole || leadRec.job_title,
            preferred_location: state.collected_slots?.preferred_location || state.collected_slots?.location || undefined,
            interview_slot: slot,
            interview_link: meet.meetUrl,
            updated_at: new Date().toISOString(),
          },
        };
      }

      if (recipientEmail && !leadRec.email) {
        leadRec.email = recipientEmail;
      }
      leadRec.updated_on = new Date();
      await leadRec.save();
    }

    await this.logActivity(
      state,
      `📅 ${label} booked`,
      `${slot} | ${meet.meetUrl}${recipientEmail ? ` | Confirmation sent to ${recipientEmail}` : ""}`,
      agentName
    );

    const roleLabel = isInterview
      ? inputs.role || state.collected_slots?.role || state.collected_slots?.applied_role || state.collected_slots?.job_title || leadRec?.job_title || "Open Role"
      : null;
    const slotWithTz = /IST|GMT/i.test(slot) ? slot : `${slot} IST (GMT+5:30)`;
    const targetPhone = inputs.phone || state.customer_phone || leadRec?.phone;

    if (recipientEmail || targetPhone) {
      this.events.emit(AGENT_OUTCOME_EVENT, {
        tenantId: state.tenant_id,
        channel: state.channel,
        outcome: isInterview ? "Interview Scheduled" : `${label} Booked`,
        event: isInterview ? "interview_booked" : "appointment_booked",
        phone: targetPhone,
        email: recipientEmail,
        leadName: state.customer_name || leadRec?.name,
        meetUrl: meet.meetUrl,
        summary: `${label}${roleLabel ? ` (${roleLabel})` : ""} booked for ${slotWithTz}${recipientEmail ? ` (emailed to ${recipientEmail})` : ""}`,
        agentName,
      } as AgentOutcomeEvent);
    }

    // Automatically trigger confirmation / follow-up Voice Call with full WhatsApp & Email summary
    if (targetPhone) {
      state.collected_slots = { ...(state.collected_slots || {}), voice_confirmation_dispatched: true };
      this.events.emit("voice.call.requested", {
        tenantId: state.tenant_id || "default",
        phone: targetPhone,
        customerName: state.customer_name || leadRec?.name || "Customer",
        reason: `${label}${roleLabel ? ` for ${roleLabel}` : ""} scheduled for ${slotWithTz}`,
        leadId: leadRec?.id || state.lead_id,
        agentKey: isInterview ? "recruitment" : "sales",
        scheduledType: isInterview ? "interview" : "demo",
        meetingSlot: slotWithTz,
        meetUrl: meet.meetUrl,
        appliedRole: roleLabel || undefined,
        customVariables: {
          applied_role: roleLabel || undefined,
          meeting_slot: slotWithTz,
          meet_url: meet.meetUrl,
          channel: state.channel,
          discussion_points: isInterview
            ? `Confirming interview attendance for ${roleLabel || "open position"} on ${slotWithTz}. Google Meet: ${meet.meetUrl}. Addressing candidate questions.`
            : `Confirming demo session on ${slotWithTz}. Google Meet: ${meet.meetUrl}.`,
        },
      });
    }

    return {
      ok: true,
      note: `${label} booked for ${slotWithTz}, meet ${meet.meetUrl}${recipientEmail ? `, confirmation emailed to ${recipientEmail}` : ""}`,
      appendText: recipientEmail
        ? `${roleLabel ? `💼 Role: *${roleLabel}*\n` : ""}🗓️ Date & Time: *${slotWithTz}*\n🎥 Google Meet: ${meet.meetUrl}\n✉️ Invitation sent to your email (*${recipientEmail}*)!\n\n📞 Same-day WhatsApp & voice reminders are scheduled.`
        : `${roleLabel ? `💼 Role: *${roleLabel}*\n` : ""}🗓️ Date & Time: *${slotWithTz}*\n🎥 Google Meet: ${meet.meetUrl}\n\n✉️ What is your email address so I can send the calendar invitation directly to your inbox?\n\n📞 Same-day WhatsApp & voice reminders are scheduled.`,
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
    const leadRec = await this.getLead(state);
    if (leadRec && leadRec.is_candidate) {
      leadRec.candidate_stage = "screening";
      leadRec.custom_fields = {
        ...(leadRec.custom_fields || {}),
        interview_cancelled_at: new Date().toISOString(),
        cancel_reason: inputs.reason || "Candidate requested cancellation",
      };
      await leadRec.save().catch(() => null);
    }
    await this.logActivity(state, "📅 Appointment cancelled", `${prev?.slot || ""} ${inputs.reason || ""}`, agentName);
    return { ok: true, note: "appointment cancelled; HR notified and rescheduling offered" };
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
      return {
        ok: false,
        note: "Missing customer phone number for voice call",
        appendText: "Could you please share your phone number with country code (e.g. +91) so our Sales Agent can call you immediately? 📱",
      };
    }

    this.events.emit("voice.call.requested", {
      tenantId: state.tenant_id,
      phone: targetPhone,
      customerName: inputs.name || inputs.customer_name || state.customer_name || "Customer",
      reason: inputs.reason || inputs.inquiry || "Customer requested to speak with a sales agent",
      leadId: state.lead_id,
      agentKey: inputs.agentKey || "sales",
    });

    await this.logActivity(
      state,
      "📞 AI Sales Call Dispatched",
      `Dispatched outbound Sales AI phone call to ${targetPhone}. Reason: ${inputs.reason || "Customer requested sales phone call"}`,
      agentName
    );

    return {
      ok: true,
      note: `Sales voice call dispatched to ${targetPhone}`,
      appendText: `📞 I've just initiated an outbound telephone call to your number (*${targetPhone}*). Please pick up your phone in a moment — our AI Sales Specialist is dialing!`,
    };
  }
}
