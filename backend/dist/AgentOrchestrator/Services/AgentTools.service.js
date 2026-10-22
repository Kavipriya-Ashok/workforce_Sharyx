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
exports.AGENT_OUTCOME_EVENT = "agent.outcome";
let AgentToolsService = AgentToolsService_1 = class AgentToolsService {
    constructor(events) {
        this.events = events;
        this.logger = new common_1.Logger(AgentToolsService_1.name);
    }
    async execute(tool, state, agentKey, agentName) {
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
        }
        catch (err) {
            this.logger.error(`Tool ${tool.name} failed: ${err.message}`);
            return { ok: false, note: `${tool.name} failed` };
        }
    }
    async getLead(state) {
        if (state.lead_id) {
            const l = await lead_1.lead.findOne({ where: { id: state.lead_id } });
            if (l)
                return l;
        }
        if (state.customer_phone) {
            const l = await lead_1.lead.findOne({ where: { phone: state.customer_phone, status: true } });
            if (l)
                return l;
        }
        if (state.customer_email) {
            return await lead_1.lead.findOne({ where: { email: state.customer_email, status: true } });
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
        var _a, _b, _c, _d, _e, _f;
        const slots = Object.assign({}, (state.collected_slots || {}));
        ["name", "email", "phone", "company"].forEach((k) => inputs[k] && (slots[k] = inputs[k]));
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
            l.company_name = inputs.company || null;
            l.source = state.channel === "whatsapp" ? lead_1.LeadSource.WHATSAPP : lead_1.LeadSource.EMAIL;
            l.lead_status = lead_1.LeadStatus.NEW;
            l.score = inputs.email && inputs.company ? 80 : 65;
            l.created_by_id = "ai_agent";
            l.created_on = new Date();
            await l.save();
            state.lead_id = l.id;
        }
        else {
            if (inputs.name && (!l.name || /^\+?\d+$/.test(l.name)))
                l.name = inputs.name;
            if (inputs.email)
                l.email = inputs.email;
            if (inputs.phone && !l.phone)
                l.phone = inputs.phone;
            if (inputs.company)
                l.company_name = inputs.company;
            if (inputs.email && inputs.company)
                l.score = Math.max(l.score || 0, 80);
            l.updated_on = new Date();
            await l.save();
            state.lead_id = l.id;
        }
        await this.logActivity(state, isNewLead ? "🎯 Lead Created in CRM" : "👤 Lead Details Updated", `Name: ${l.name || "-"} | Email: ${l.email || "-"} | Company: ${l.company_name || "-"} | Phone: ${l.phone || "-"}`, "Receptionist");
        if (inputs.email || (state.customer_email && !((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.welcome_email_sent))) {
            const confirmedEmail = inputs.email || state.customer_email;
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { welcome_email_sent: true });
            let appointmentSlot = (_c = (_b = state.collected_slots) === null || _b === void 0 ? void 0 : _b.appointment) === null || _c === void 0 ? void 0 : _c.slot;
            let appointmentMeetUrl = (_e = (_d = state.collected_slots) === null || _d === void 0 ? void 0 : _d.appointment) === null || _e === void 0 ? void 0 : _e.meet_url;
            if (!appointmentMeetUrl && state.channel === "whatsapp" && state.conversation_ref) {
                try {
                    const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
                    if ((_f = conv === null || conv === void 0 ? void 0 : conv.meeting_info) === null || _f === void 0 ? void 0 : _f.meet_url) {
                        appointmentMeetUrl = conv.meeting_info.meet_url;
                        appointmentSlot = conv.meeting_info.slot;
                    }
                }
                catch (_g) { }
            }
            if (appointmentMeetUrl) {
                this.events.emit(exports.AGENT_OUTCOME_EVENT, {
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
                });
                this.logger.log(`🎯 [MEET INVITE SENT TO EMAIL] ${l.name} (${confirmedEmail}) -> ${appointmentMeetUrl}`);
                return {
                    ok: true,
                    note: `Contact captured and Google Meet invitation emailed to ${confirmedEmail}`,
                    appendText: `✉️ I've sent the Google Meet invitation directly to your email (*${confirmedEmail}*)!\n\n🗓️ Slot: ${appointmentSlot || "Scheduled Session"}\n🎥 Join: ${appointmentMeetUrl}`,
                };
            }
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
                appendText: `✉️ A confirmation has been registered for your email (*${confirmedEmail}*)!`,
            };
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
        const slot = inputs.slot || "Tomorrow 10:00 AM";
        const type = (inputs.type || "demo").toLowerCase();
        const label = type === "interview" ? "Interview" : type === "consultation" ? "Consultation" : "Demo";
        const who = state.customer_name || state.customer_phone || state.customer_email || "Customer";
        const meet = await CalendarHelper_1.CalendarHelper.createGoogleMeetRoom(`Sharyx ${label} - ${who}`, slot);
        const meeting = { slot, type, mode: inputs.mode || "ONLINE", meet_url: meet.meetUrl, booked_at: new Date().toISOString() };
        state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { appointment: meeting });
        if (state.channel === "whatsapp" && state.conversation_ref) {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
            if (conv) {
                conv.meeting_info = { slot, meet_url: meet.meetUrl, scheduled_at: meeting.booked_at };
                await conv.save();
            }
        }
        const leadRec = await this.getLead(state);
        const recipientEmail = inputs.email || state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email);
        if (recipientEmail && !state.customer_email) {
            state.customer_email = recipientEmail;
        }
        await this.logActivity(state, `📅 ${label} booked`, `${slot} | ${meet.meetUrl}${recipientEmail ? ` | Confirmation sent to ${recipientEmail}` : ""}`, agentName);
        if (recipientEmail) {
            this.events.emit(exports.AGENT_OUTCOME_EVENT, {
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
            });
        }
        return {
            ok: true,
            note: `${label} booked for ${slot}, meet ${meet.meetUrl}${recipientEmail ? `, confirmation emailed to ${recipientEmail}` : ""}`,
            appendText: recipientEmail
                ? `🗓️ ${slot}\n🎥 Google Meet: ${meet.meetUrl}\n✉️ Invitation sent to your email (*${recipientEmail}*)!`
                : `🗓️ ${slot}\n🎥 Google Meet: ${meet.meetUrl}\n\n✉️ What is your email address so I can send the calendar invitation directly to your inbox?`,
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
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
            if (conv) {
                conv.meeting_info = null;
                await conv.save();
            }
        }
        await this.logActivity(state, "📅 Appointment cancelled", `${(prev === null || prev === void 0 ? void 0 : prev.slot) || ""} ${inputs.reason || ""}`, agentName);
        return { ok: true, note: "appointment cancelled" };
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
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
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
            return { ok: false, note: "Missing customer phone number for voice call" };
        }
        this.events.emit("voice.call.requested", {
            tenantId: state.tenant_id,
            phone: targetPhone,
            customerName: inputs.name || inputs.customer_name || state.customer_phone,
            reason: inputs.reason || inputs.inquiry || "Customer requested live phone support",
            leadId: state.lead_id,
        });
        await this.logActivity(state, "📞 AI Phone Call Requested", `Dispatched outbound AI call to ${targetPhone}. Reason: ${inputs.reason || "Direct conversation"}`, agentName);
        return {
            ok: true,
            note: `Voice call dispatched to ${targetPhone}`,
            appendText: `📞 I've just scheduled an outbound call to ${targetPhone}. Our AI representative will ring your phone shortly!`,
        };
    }
};
exports.AgentToolsService = AgentToolsService;
exports.AgentToolsService = AgentToolsService = AgentToolsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], AgentToolsService);
//# sourceMappingURL=AgentTools.service.js.map