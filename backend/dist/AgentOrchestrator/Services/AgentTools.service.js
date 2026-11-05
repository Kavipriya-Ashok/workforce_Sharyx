"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgentToolsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentToolsService = exports.AGENT_OUTCOME_EVENT = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const CalendarHelper_1 = require("../../WhatsApp/Helpers/CalendarHelper");
const JobOpenings_service_1 = require("../../Service/Lead/JobOpenings.service");
exports.AGENT_OUTCOME_EVENT = "agent.outcome";
let AgentToolsService = AgentToolsService_1 = class AgentToolsService {
    constructor(events, openingsService) {
        this.events = events;
        this.openingsService = openingsService;
        this.logger = new common_1.Logger(AgentToolsService_1.name);
    }
    async execute(tool, state, agentKey, agentName) {
        const inputs = tool.inputs || {};
        try {
            switch (tool.name) {
                case "capture_contact":
                    return await this.captureContact(inputs, state);
                case "get_open_roles": {
                    const { shortSummary, promptBlock } = await this.openingsService.formatOpenRolesForPrompt(state.tenant_id || "default");
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
        }
        catch (err) {
            this.logger.error(`Tool ${tool.name} failed: ${err.message}`);
            return { ok: false, note: `${tool.name} failed` };
        }
    }
    async getLead(state) {
        if (state.lead_id) {
            const l = await lead_1.lead.findOne({ where: { id: state.lead_id, tenant_id: state.tenant_id } });
            if (l)
                return l;
        }
        if (state.customer_phone) {
            const cleanPhone = state.customer_phone.replace(/[^\d]/g, "");
            const withPlus = "+" + cleanPhone;
            let l = await lead_1.lead.findOne({ where: { phone: state.customer_phone, tenant_id: state.tenant_id } });
            if (!l)
                l = await lead_1.lead.findOne({ where: { phone: withPlus, tenant_id: state.tenant_id } });
            if (!l)
                l = await lead_1.lead.findOne({ where: { phone: cleanPhone, tenant_id: state.tenant_id } });
            if (l) {
                state.lead_id = l.id;
                return l;
            }
        }
        if (state.customer_email) {
            const l = await lead_1.lead.findOne({ where: { email: state.customer_email, tenant_id: state.tenant_id } });
            if (l) {
                state.lead_id = l.id;
                return l;
            }
        }
        return null;
    }
    async logActivity(state, title, description, performer) {
        if (!state.lead_id)
            return;
        try {
            const act = new lead_activity_1.lead_activity();
            act.lead_id = state.lead_id;
            act.activity_type = state.channel === "email" ? "EMAIL" : "WHATSAPP";
            act.title = title;
            act.description = description;
            act.performer_name = performer;
            act.tenant_id = state.tenant_id;
            act.created_by_id = "ai_agent";
            act.created_on = new Date();
            await act.save();
        }
        catch (err) {
            this.logger.warn(`Activity log failed: ${err.message}`);
        }
    }
    async captureContact(inputs, state) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const slots = Object.assign({}, (state.collected_slots || {}));
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
        if (inputs.location && !slots.preferred_location)
            slots.preferred_location = inputs.location;
        if (inputs.role && !slots.applied_role)
            slots.applied_role = inputs.role;
        if (inputs.applied_role && !slots.role)
            slots.role = inputs.applied_role;
        state.collected_slots = slots;
        if (inputs.name)
            state.customer_name = inputs.name;
        if (inputs.email && !state.customer_email)
            state.customer_email = inputs.email;
        if (inputs.phone && !state.customer_phone)
            state.customer_phone = inputs.phone;
        let l = await this.getLead(state);
        const isNewLead = !l;
        if (!l) {
            l = new lead_1.lead();
            l.tenant_id = state.tenant_id || "default";
            l.name = inputs.name || state.customer_name || "New Inbound Lead";
            l.email = inputs.email || state.customer_email || null;
            l.phone = inputs.phone || state.customer_phone || null;
            l.company_name = inputs.company || inputs.current_company || null;
            l.source = state.channel === "whatsapp" ? lead_1.LeadSource.WHATSAPP : lead_1.LeadSource.EMAIL;
            l.lead_status = lead_1.LeadStatus.NEW;
            l.score = inputs.email && (inputs.company || inputs.current_company) ? 80 : 65;
            l.created_by_id = "ai_agent";
            l.created_on = new Date();
        }
        else {
            if (inputs.name && (!l.name || /^\+?\d+$/.test(l.name) || l.name === "New Inbound Lead" || l.name === "Candidate")) {
                l.name = inputs.name;
            }
            if (inputs.email)
                l.email = inputs.email;
            if (inputs.phone && !l.phone)
                l.phone = inputs.phone;
            if (inputs.company || inputs.current_company)
                l.company_name = inputs.company || inputs.current_company;
            if (inputs.email && (inputs.company || inputs.current_company))
                l.score = Math.max(l.score || 0, 80);
        }
        const isCand = Boolean(inputs.is_candidate ||
            state.active_agent === "recruitment" ||
            slots.role ||
            slots.job_title ||
            slots.applied_role ||
            slots.total_experience ||
            slots.experience ||
            slots.employment_status ||
            slots.expected_ctc ||
            slots.resume_url);
        if (isCand) {
            l.is_candidate = true;
            if (!l.candidate_stage || l.candidate_stage === "new") {
                l.candidate_stage = "screening";
            }
            const roleVal = inputs.role || inputs.job_title || inputs.applied_role || slots.role || slots.job_title || slots.applied_role;
            if (roleVal)
                l.job_title = String(roleVal);
            const totExp = (_c = (_b = (_a = inputs.total_experience) !== null && _a !== void 0 ? _a : inputs.experience) !== null && _b !== void 0 ? _b : slots.total_experience) !== null && _c !== void 0 ? _c : slots.experience;
            if (totExp !== undefined) {
                const num = parseFloat(String(totExp).replace(/[^\d.]/g, ""));
                if (!isNaN(num))
                    l.total_experience = num;
            }
            const relExp = (_d = inputs.relevant_experience) !== null && _d !== void 0 ? _d : slots.relevant_experience;
            if (relExp !== undefined) {
                const num = parseFloat(String(relExp).replace(/[^\d.]/g, ""));
                if (!isNaN(num))
                    l.relevant_experience = num;
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
                if (!isNaN(d.getTime()))
                    l.relieving_date = d;
            }
            const parseCtcAmount = (rawVal) => {
                if (rawVal === undefined || rawVal === null)
                    return null;
                const str = String(rawVal).toLowerCase();
                if (str === "not disclosed")
                    return null;
                const num = parseFloat(str.replace(/[^\d.]/g, ""));
                if (isNaN(num))
                    return null;
                if (/crore|cr\b/i.test(str) && num < 100)
                    return num * 10000000;
                if (/lakh|lac|lpa\b/i.test(str) && num < 1000)
                    return num * 100000;
                return num;
            };
            const curCtc = parseCtcAmount((_e = inputs.current_ctc) !== null && _e !== void 0 ? _e : slots.current_ctc);
            if (curCtc !== null)
                l.current_ctc = curCtc;
            const expCtc = parseCtcAmount((_f = inputs.expected_ctc) !== null && _f !== void 0 ? _f : slots.expected_ctc);
            if (expCtc !== null)
                l.expected_ctc = expCtc;
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
            l.custom_fields = Object.assign(Object.assign({}, (l.custom_fields || {})), { recruitment_profile: Object.assign(Object.assign(Object.assign({}, (((_g = l.custom_fields) === null || _g === void 0 ? void 0 : _g.recruitment_profile) || {})), slots), { updated_at: new Date().toISOString() }) });
        }
        l.updated_on = new Date();
        await l.save();
        state.lead_id = l.id;
        await this.logActivity(state, isNewLead ? "🎯 Lead Created in CRM" : "👤 Lead Details Updated", `Name: ${l.name || "-"} | Email: ${l.email || "-"} | Company: ${l.company_name || "-"} | Phone: ${l.phone || "-"}`, "Receptionist");
        if (inputs.email || (state.customer_email && !((_h = state.collected_slots) === null || _h === void 0 ? void 0 : _h.welcome_email_sent))) {
            const confirmedEmail = inputs.email || state.customer_email;
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { welcome_email_sent: true });
            this.events.emit(exports.AGENT_OUTCOME_EVENT, {
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
            });
            this.logger.log(`🎯 [LEAD CAPTURED & SYNCED TO ADMIN] ${l.name} (${confirmedEmail}) | Company: ${l.company_name || "N/A"}`);
            return {
                ok: true,
                note: `Contact captured and synced to CRM: ${l.name} (${confirmedEmail})`,
            };
        }
        if (inputs.phone &&
            ((_k = (_j = state.collected_slots) === null || _j === void 0 ? void 0 : _j.appointment) === null || _k === void 0 ? void 0 : _k.meet_url) &&
            !((_l = state.collected_slots) === null || _l === void 0 ? void 0 : _l.voice_confirmation_dispatched)) {
            const appt = state.collected_slots.appointment;
            const isIntv = appt.type === "interview" || l.is_candidate;
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { voice_confirmation_dispatched: true });
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
    async qualifyLead(inputs, state, agentName) {
        var _a;
        state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { qualification: Object.assign(Object.assign({}, (((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.qualification) || {})), inputs) });
        const l = await this.getLead(state);
        if (l) {
            const level = String(inputs.interest_level || "").toLowerCase();
            if (level === "hot") {
                l.lead_status = lead_1.LeadStatus.QUALIFIED;
                l.score = Math.max(l.score || 0, 85);
            }
            else if (level === "warm") {
                if (l.lead_status === lead_1.LeadStatus.NEW)
                    l.lead_status = lead_1.LeadStatus.CONTACTED;
                l.score = Math.max(l.score || 0, 70);
            }
            else if (level === "cold") {
                l.score = Math.min(l.score || 50, 40);
            }
            l.custom_fields = Object.assign(Object.assign({}, (l.custom_fields || {})), { ai_qualification: state.collected_slots.qualification });
            l.updated_on = new Date();
            await l.save();
        }
        await this.logActivity(state, "AI Lead Qualification", JSON.stringify(inputs), agentName);
        return { ok: true, note: `lead qualified (${inputs.interest_level || "updated"})` };
    }
    async notifySales(inputs, state, agentName) {
        state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { sales_notified: true });
        await this.logActivity(state, `🔥 Sales team alerted (${inputs.priority || "normal"})`, inputs.reason || "Customer requested sales contact", agentName);
        this.events.emit(exports.AGENT_OUTCOME_EVENT, {
            tenantId: state.tenant_id,
            channel: state.channel,
            outcome: "Hot Lead",
            event: "hot_lead",
            phone: state.customer_phone,
            email: state.customer_email,
            leadName: state.customer_name,
            summary: inputs.reason,
            agentName,
        });
        this.logger.log(`🔥 [SALES ALERT] ${state.customer_name || state.customer_phone || state.customer_email}: ${inputs.reason}`);
        return { ok: true, note: "sales team notified" };
    }
    async bookAppointment(inputs, state, agentName) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        const rawSlot = inputs.slot || "Monday 11:00 AM";
        const type = (inputs.type || "demo").toLowerCase();
        const isInterview = type === "interview" || agentName.toLowerCase().includes("recruitment");
        const label = isInterview ? "Interview" : type === "consultation" ? "Consultation" : "Demo";
        const who = state.customer_name || state.customer_phone || state.customer_email || "Candidate";
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
        const meet = await CalendarHelper_1.CalendarHelper.createGoogleMeetRoom(`Sharyx ${label} - ${who}`, slot);
        const meeting = { slot, type: isInterview ? "interview" : type, mode: inputs.mode || "ONLINE", meet_url: meet.meetUrl, booked_at: new Date().toISOString() };
        state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { appointment: meeting });
        if (state.channel === "whatsapp" && state.conversation_ref) {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref, tenant_id: state.tenant_id } });
            if (conv) {
                conv.meeting_info = { slot, meet_url: meet.meetUrl, scheduled_at: meeting.booked_at };
                await conv.save();
            }
        }
        let leadRec = await this.getLead(state);
        let recipientEmail = inputs.email || state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email);
        if (recipientEmail && (recipientEmail.includes("example.com") || !recipientEmail.includes("@"))) {
            recipientEmail = null;
        }
        if (recipientEmail && !state.customer_email) {
            state.customer_email = recipientEmail;
        }
        if (!leadRec) {
            leadRec = new lead_1.lead();
            leadRec.tenant_id = state.tenant_id || "default";
            leadRec.name = state.customer_name || "Candidate";
            leadRec.phone = state.customer_phone || null;
            leadRec.email = recipientEmail || state.customer_email || null;
            leadRec.source = lead_1.LeadSource.WHATSAPP;
            leadRec.lead_status = lead_1.LeadStatus.NEW;
            leadRec.created_by_id = "ai_agent";
            leadRec.created_on = new Date();
            await leadRec.save();
            state.lead_id = leadRec.id;
        }
        if (leadRec) {
            if (isInterview) {
                leadRec.is_candidate = true;
                leadRec.candidate_stage = "scheduled";
                leadRec.interview_link = meet.meetUrl;
                leadRec.preferred_interview_slot = slot;
                const chosenRole = inputs.role ||
                    ((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.role) ||
                    ((_b = state.collected_slots) === null || _b === void 0 ? void 0 : _b.applied_role) ||
                    ((_c = state.collected_slots) === null || _c === void 0 ? void 0 : _c.job_title);
                if (chosenRole) {
                    leadRec.job_title = String(chosenRole);
                }
                if (((_d = state.collected_slots) === null || _d === void 0 ? void 0 : _d.experience) || ((_e = state.collected_slots) === null || _e === void 0 ? void 0 : _e.total_experience)) {
                    const rawExp = String(((_f = state.collected_slots) === null || _f === void 0 ? void 0 : _f.experience) || ((_g = state.collected_slots) === null || _g === void 0 ? void 0 : _g.total_experience)).replace(/[^\d.]/g, "");
                    const numExp = parseFloat(rawExp);
                    if (!isNaN(numExp))
                        leadRec.total_experience = numExp;
                }
                if ((_h = state.collected_slots) === null || _h === void 0 ? void 0 : _h.relevant_experience) {
                    const rawRelExp = String(state.collected_slots.relevant_experience).replace(/[^\d.]/g, "");
                    const numRelExp = parseFloat(rawRelExp);
                    if (!isNaN(numRelExp))
                        leadRec.relevant_experience = numRelExp;
                }
                if ((_j = state.collected_slots) === null || _j === void 0 ? void 0 : _j.employment_status) {
                    const s = String(state.collected_slots.employment_status).toLowerCase();
                    leadRec.employment_status = s.includes("reliev") ? "relieved" : s.includes("notice") || s.includes("serv") ? "notice" : "working";
                }
                if (((_k = state.collected_slots) === null || _k === void 0 ? void 0 : _k.relocation) || ((_l = state.collected_slots) === null || _l === void 0 ? void 0 : _l.preferred_location)) {
                    const r = String(state.collected_slots.relocation || "yes").toLowerCase();
                    leadRec.relocation = r.startsWith("n") ? "no" : r.startsWith("c") ? "conditional" : "yes";
                }
                if ((_m = state.collected_slots) === null || _m === void 0 ? void 0 : _m.resume_url) {
                    leadRec.resume_url = state.collected_slots.resume_url;
                }
                if (validation.dateObj) {
                    leadRec.interview_date = validation.dateObj;
                }
                leadRec.custom_fields = Object.assign(Object.assign({}, (leadRec.custom_fields || {})), { recruitment_profile: Object.assign(Object.assign(Object.assign({}, (((_o = leadRec.custom_fields) === null || _o === void 0 ? void 0 : _o.recruitment_profile) || {})), (state.collected_slots || {})), { role: chosenRole || leadRec.job_title, preferred_location: ((_p = state.collected_slots) === null || _p === void 0 ? void 0 : _p.preferred_location) || ((_q = state.collected_slots) === null || _q === void 0 ? void 0 : _q.location) || undefined, interview_slot: slot, interview_link: meet.meetUrl, updated_at: new Date().toISOString() }) });
            }
            if (recipientEmail && !leadRec.email) {
                leadRec.email = recipientEmail;
            }
            leadRec.updated_on = new Date();
            await leadRec.save();
        }
        await this.logActivity(state, `📅 ${label} booked`, `${slot} | ${meet.meetUrl}${recipientEmail ? ` | Confirmation sent to ${recipientEmail}` : ""}`, agentName);
        const roleLabel = isInterview
            ? inputs.role || ((_r = state.collected_slots) === null || _r === void 0 ? void 0 : _r.role) || ((_s = state.collected_slots) === null || _s === void 0 ? void 0 : _s.applied_role) || ((_t = state.collected_slots) === null || _t === void 0 ? void 0 : _t.job_title) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.job_title) || "Open Role"
            : null;
        const slotWithTz = /IST|GMT/i.test(slot) ? slot : `${slot} IST (GMT+5:30)`;
        const targetPhone = inputs.phone || state.customer_phone || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.phone);
        if (recipientEmail || targetPhone) {
            this.events.emit(exports.AGENT_OUTCOME_EVENT, {
                tenantId: state.tenant_id,
                channel: state.channel,
                outcome: isInterview ? "Interview Scheduled" : `${label} Booked`,
                event: isInterview ? "interview_booked" : "appointment_booked",
                phone: targetPhone,
                email: recipientEmail,
                leadName: state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name),
                meetUrl: meet.meetUrl,
                summary: `${label}${roleLabel ? ` (${roleLabel})` : ""} booked for ${slotWithTz}${recipientEmail ? ` (emailed to ${recipientEmail})` : ""}`,
                agentName,
            });
        }
        if (targetPhone) {
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { voice_confirmation_dispatched: true });
            this.events.emit("voice.call.requested", {
                tenantId: state.tenant_id || "default",
                phone: targetPhone,
                customerName: state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer",
                reason: `${label}${roleLabel ? ` for ${roleLabel}` : ""} scheduled for ${slotWithTz}`,
                leadId: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.id) || state.lead_id,
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
    async emailMeetingLink(inputs, state, agentName) {
        var _a, _b, _c, _d;
        const leadRec = await this.getLead(state);
        const email = inputs.email || state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email);
        const name = state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer";
        const slot = inputs.slot || ((_b = (_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.appointment) === null || _b === void 0 ? void 0 : _b.slot) || "Tomorrow 10:00 AM";
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
        let meetUrl = (_d = (_c = state.collected_slots) === null || _c === void 0 ? void 0 : _c.appointment) === null || _d === void 0 ? void 0 : _d.meet_url;
        if (!meetUrl) {
            const meet = await CalendarHelper_1.CalendarHelper.createGoogleMeetRoom(`Sharyx Session - ${name}`, slot);
            meetUrl = meet.meetUrl;
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { appointment: { slot, type: "demo", mode: "ONLINE", meet_url: meetUrl, booked_at: new Date().toISOString() } });
        }
        await this.logActivity(state, "✉️ Meeting Link Emailed", `Sent Google Meet link (${meetUrl}) to ${email}`, agentName);
        this.events.emit(exports.AGENT_OUTCOME_EVENT, {
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
        });
        this.logger.log(`✉️ [MEETING LINK EMAILED] ${name} (${email}) -> ${meetUrl}`);
        return {
            ok: true,
            note: `Meeting link emailed to ${email}`,
            appendText: `✉️ I've sent the Google Meet invitation directly to your email (*${email}*)!\n\n🗓️ Slot: ${slot}\n🎥 Join: ${meetUrl}`,
        };
    }
    async cancelAppointment(inputs, state, agentName) {
        var _a;
        const prev = (_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.appointment;
        const slots = Object.assign({}, (state.collected_slots || {}));
        delete slots.appointment;
        state.collected_slots = slots;
        if (state.channel === "whatsapp" && state.conversation_ref) {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref, tenant_id: state.tenant_id } });
            if (conv) {
                conv.meeting_info = null;
                await conv.save();
            }
        }
        const leadRec = await this.getLead(state);
        if (leadRec && leadRec.is_candidate) {
            leadRec.candidate_stage = "screening";
            leadRec.custom_fields = Object.assign(Object.assign({}, (leadRec.custom_fields || {})), { interview_cancelled_at: new Date().toISOString(), cancel_reason: inputs.reason || "Candidate requested cancellation" });
            await leadRec.save().catch(() => null);
        }
        await this.logActivity(state, "📅 Appointment cancelled", `${(prev === null || prev === void 0 ? void 0 : prev.slot) || ""} ${inputs.reason || ""}`, agentName);
        return { ok: true, note: "appointment cancelled; HR notified and rescheduling offered" };
    }
    async createTicket(inputs, state, agentName) {
        var _a;
        const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
        const tickets = [...(((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.tickets) || []), Object.assign(Object.assign({ id: ticketId }, inputs), { created_at: new Date().toISOString() })];
        state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { tickets });
        await this.logActivity(state, `🛟 Support ticket ${ticketId} (${inputs.priority || "normal"})`, inputs.issue || "", agentName);
        return { ok: true, note: `ticket ${ticketId} created`, appendText: `🎫 Ticket ID: ${ticketId}` };
    }
    async transferToHuman(inputs, state, agentName) {
        state.human_takeover = true;
        if (state.channel === "whatsapp" && state.conversation_ref) {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref, tenant_id: state.tenant_id } });
            if (conv) {
                conv.conversation_status = "waiting_human";
                await conv.save();
            }
        }
        await this.logActivity(state, "👨‍💼 Transferred to human", inputs.reason || "", agentName);
        return { ok: true, note: "transferred to human" };
    }
    async dispatchVoiceCall(inputs, state, agentName) {
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
        await this.logActivity(state, "📞 AI Sales Call Dispatched", `Dispatched outbound Sales AI phone call to ${targetPhone}. Reason: ${inputs.reason || "Customer requested sales phone call"}`, agentName);
        return {
            ok: true,
            note: `Sales voice call dispatched to ${targetPhone}`,
            appendText: `📞 I've just initiated an outbound telephone call to your number (*${targetPhone}*). Please pick up your phone in a moment — our AI Sales Specialist is dialing!`,
        };
    }
};
exports.AgentToolsService = AgentToolsService;
exports.AgentToolsService = AgentToolsService = AgentToolsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        JobOpenings_service_1.JobOpeningsService])
], AgentToolsService);
//# sourceMappingURL=AgentTools.service.js.map