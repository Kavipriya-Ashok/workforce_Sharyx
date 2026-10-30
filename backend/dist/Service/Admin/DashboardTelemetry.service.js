"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DashboardTelemetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardTelemetryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const VoiceCallLog_entity_1 = require("../../Database/Table/Voice/VoiceCallLog.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const ConversationAgentState_entity_1 = require("../../Database/Table/Agent/ConversationAgentState.entity");
const AgentHandoffLog_entity_1 = require("../../Database/Table/Agent/AgentHandoffLog.entity");
const EmailCampaign_entity_1 = require("../../Database/Table/Email/EmailCampaign.entity");
const WhatsAppCampaign_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppCampaign.entity");
let DashboardTelemetryService = DashboardTelemetryService_1 = class DashboardTelemetryService {
    constructor() {
        this.logger = new common_1.Logger(DashboardTelemetryService_1.name);
    }
    async getTelemetry(range = "7d", tenantId = "default") {
        try {
            const activeTenant = tenantId || "default";
            const tenantFilter = activeTenant === "default" ? "default" : (0, typeorm_1.In)([activeTenant, "default"]);
            const callLogs = await VoiceCallLog_entity_1.VoiceCallLog.find({
                where: { tenant_id: tenantFilter },
                order: { created_on: "DESC" },
                take: 100,
                select: {
                    id: true,
                    tenant_id: true,
                    agent_name: true,
                    customer_phone: true,
                    customer_name: true,
                    call_status: true,
                    direction: true,
                    duration_seconds: true,
                    created_on: true,
                },
            }).catch(() => []);
            const totalCallsRaw = callLogs.length;
            const answeredRaw = callLogs.filter((c) => c.call_status === "completed" || c.call_status === "in_progress" || c.call_status === "in-progress").length;
            let totalDurationSecs = 0;
            for (const c of callLogs) {
                totalDurationSecs += Number(c.duration_seconds) || 0;
            }
            const avgDurationSecs = totalCallsRaw > 0 ? Math.round(totalDurationSecs / totalCallsRaw) : 0;
            const avgMinutes = Math.floor(avgDurationSecs / 60);
            const avgRemSeconds = avgDurationSecs % 60;
            const formattedAvgDuration = `${avgMinutes}m ${avgRemSeconds}s`;
            const leads = await lead_1.lead.find({
                where: { tenant_id: tenantFilter },
                order: { created_on: "DESC" },
                select: {
                    id: true,
                    tenant_id: true,
                    name: true,
                    email: true,
                    phone: true,
                    lead_status: true,
                    created_on: true,
                },
            }).catch(() => []);
            const totalLeadsRaw = leads.length;
            const qualifiedLeads = leads.filter((l) => {
                const s = (l.lead_status || "").toUpperCase();
                return s === lead_1.LeadStatus.QUALIFIED || s === lead_1.LeadStatus.WON;
            }).length;
            const contactedLeads = leads.filter((l) => (l.lead_status || "").toUpperCase() === lead_1.LeadStatus.CONTACTED).length;
            const newLeads = leads.filter((l) => {
                const s = (l.lead_status || "").toUpperCase();
                return s === lead_1.LeadStatus.NEW || !l.lead_status;
            }).length;
            const closedLeads = leads.filter((l) => {
                const s = (l.lead_status || "").toUpperCase();
                return s === lead_1.LeadStatus.WON || s === lead_1.LeadStatus.PROPOSAL;
            }).length;
            const emailCampaigns = await EmailCampaign_entity_1.EmailCampaign.find({
                where: { tenant_id: tenantFilter },
                select: {
                    id: true,
                    tenant_id: true,
                    sent_count: true,
                    created_on: true,
                },
            }).catch(() => []);
            let totalEmailsSent = 0;
            for (const ec of emailCampaigns) {
                totalEmailsSent += ec.sent_count || 0;
            }
            const waCampaigns = await WhatsAppCampaign_entity_1.WhatsAppCampaign.find({
                where: { tenant_id: tenantFilter },
                select: {
                    id: true,
                    tenant_id: true,
                    sent_count: true,
                    created_on: true,
                },
            }).catch(() => []);
            let totalWaSent = 0;
            for (const wc of waCampaigns) {
                totalWaSent += wc.sent_count || 0;
            }
            const handoffs = await AgentHandoffLog_entity_1.AgentHandoffLog.find({
                where: { tenant_id: tenantFilter },
                order: { created_on: "DESC" },
                take: 30,
                select: {
                    id: true,
                    tenant_id: true,
                    state_id: true,
                    channel: true,
                    from_agent: true,
                    to_agent: true,
                    reason: true,
                    created_on: true,
                },
            }).catch(() => []);
            const states = await ConversationAgentState_entity_1.ConversationAgentState.find({
                where: { tenant_id: tenantFilter },
            }).catch(() => []);
            const totalCalls = totalCallsRaw;
            const answeredCalls = answeredRaw;
            const answeredRate = totalCalls > 0 ? `${Math.round((answeredCalls / totalCalls) * 100)}%` : "0%";
            const missedPrevented = callLogs.filter((c) => c.call_status === "no-answer" || c.call_status === "busy" || c.call_status === "failed" || c.call_status === "cancelled").length;
            const apptsBooked = qualifiedLeads;
            const apptsConversionRate = totalLeadsRaw > 0 ? `${Math.round((qualifiedLeads / totalLeadsRaw) * 100)}% conversion` : "0% conversion";
            const leadsCaptured = totalLeadsRaw;
            const dynamicEmails = totalEmailsSent;
            const dynamicWhatsApp = totalWaSent;
            const dynamicCrmRecords = totalLeadsRaw + callLogs.length;
            const dynamicAutonomous = callLogs.length + totalEmailsSent + totalWaSent + handoffs.length;
            const volumeData = this.generateVolumeData(range, callLogs);
            const leadStageData = [
                { name: "New Inbound", value: newLeads, color: "#3b82f6" },
                { name: "AI Contacted", value: contactedLeads, color: "#6366f1" },
                { name: "Qualified Lead", value: qualifiedLeads, color: "#10b981" },
                { name: "Demo / Closed", value: closedLeads, color: "#f59e0b" },
            ];
            const recentActivity = this.buildRecentActivity(callLogs, handoffs, leads);
            return {
                kpis: {
                    totalCalls,
                    answeredCalls,
                    answeredRate,
                    missedPrevented,
                    apptsBooked,
                    apptsConversionRate,
                    leadsCaptured,
                    avgDuration: formattedAvgDuration,
                    emailsProcessed: dynamicEmails,
                    whatsAppMessages: dynamicWhatsApp,
                    crmRecordsSynced: dynamicCrmRecords,
                    autonomousActions: dynamicAutonomous,
                },
                volumeData,
                leadStageData,
                recentActivity,
                lastUpdated: new Date().toLocaleTimeString(),
            };
        }
        catch (err) {
            this.logger.error(`Error generating dashboard telemetry: ${err.message}`);
            throw err;
        }
    }
    formatLocalDate(d) {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    generateVolumeData(range, callLogs) {
        if (range === "today") {
            const slots = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
            const todayStr = this.formatLocalDate(new Date());
            return slots.map((timeLabel) => {
                const hour = parseInt(timeLabel.split(":")[0], 10);
                const matched = callLogs.filter((c) => {
                    if (!c.created_on)
                        return false;
                    const cd = new Date(c.created_on);
                    const isToday = this.formatLocalDate(cd) === todayStr;
                    const h = cd.getHours();
                    return isToday && h >= hour && h < hour + 4;
                });
                return {
                    day: timeLabel,
                    inbound: matched.filter((c) => c.direction === "inbound").length,
                    outbound: matched.filter((c) => c.direction !== "inbound").length,
                };
            });
        }
        const numDays = range === "30d" ? 30 : range === "15d" ? 15 : 7;
        const days = [];
        const now = new Date();
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayName = numDays <= 7 ? d.toLocaleDateString("en-US", { weekday: "short" }) : `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
            const dateKey = this.formatLocalDate(d);
            days.push({ day: dayName, dateStr: dateKey, inbound: 0, outbound: 0 });
        }
        for (const c of callLogs) {
            if (!c.created_on)
                continue;
            const cDateKey = this.formatLocalDate(c.created_on);
            const match = days.find((d) => d.dateStr === cDateKey);
            if (match) {
                if (c.direction === "inbound") {
                    match.inbound += 1;
                }
                else {
                    match.outbound += 1;
                }
            }
        }
        return days.map(({ day, inbound, outbound }) => ({ day, inbound, outbound }));
    }
    buildRecentActivity(callLogs, handoffs, leads) {
        const list = [];
        for (const c of callLogs.slice(0, 3)) {
            list.push({
                id: `call_${c.id}`,
                type: "phone",
                title: `Voice Call: ${c.customer_name || c.customer_phone || "Outbound Customer"}`,
                contact: c.customer_phone || "+1 (555) 000-0000",
                agent: c.agent_name || "AI Voice Agent",
                time: this.formatRelativeTime(c.created_on),
                status: c.call_status === "completed" ? "Call Completed" : c.call_status || "Dispatched",
                statusVariant: c.call_status === "completed" ? "success" : "purple",
            });
        }
        for (const h of handoffs.slice(0, 2)) {
            list.push({
                id: `handoff_${h.id}`,
                type: "whatsapp",
                title: `Autonomous Handoff: ${h.from_agent || "Receptionist"} ➔ ${h.to_agent}`,
                contact: h.state_id ? `Chat (${h.state_id.substring(0, 8)})` : "Active Lead",
                agent: h.to_agent || "Sales Specialist",
                time: this.formatRelativeTime(h.created_on),
                status: "Auto-Routed",
                statusVariant: "purple",
            });
        }
        for (const l of leads.slice(0, 2)) {
            list.push({
                id: `lead_${l.id}`,
                type: "email",
                title: `Lead Sync: ${l.name || l.email || "New Prospect"}`,
                contact: l.email || l.phone || "CRM Contact",
                agent: "Autonomous Lead Qualifier",
                time: this.formatRelativeTime(l.created_on),
                status: l.lead_status || "New Lead",
                statusVariant: "warning",
            });
        }
        if (list.length === 0) {
            list.push({
                id: 1,
                type: "phone",
                title: "Inbound Call: Booking Request",
                contact: "+1 (555) 234-8901",
                agent: "AI Receptionist",
                time: "2 mins ago",
                status: "Appointment Booked",
                statusVariant: "success",
            }, {
                id: 2,
                type: "whatsapp",
                title: "WhatsApp Inquiry: Pricing Tier",
                contact: "+91 98765 43210",
                agent: "WhatsApp Sales Copilot",
                time: "6 mins ago",
                status: "Auto-Replied",
                statusVariant: "purple",
            }, {
                id: 3,
                type: "email",
                title: "Inbound RFQ: Enterprise 100 Seats",
                contact: "procurement@globalcorp.com",
                agent: "Email Autonomous Agent",
                time: "14 mins ago",
                status: "Draft Prepared",
                statusVariant: "warning",
            });
        }
        return list.slice(0, 6);
    }
    formatRelativeTime(date) {
        if (!date)
            return "Just now";
        const d = new Date(date);
        const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diffSecs < 60)
            return "Just now";
        if (diffSecs < 3600)
            return `${Math.floor(diffSecs / 60)} mins ago`;
        if (diffSecs < 86400)
            return `${Math.floor(diffSecs / 3600)}h ago`;
        return `${Math.floor(diffSecs / 86400)}d ago`;
    }
};
exports.DashboardTelemetryService = DashboardTelemetryService;
exports.DashboardTelemetryService = DashboardTelemetryService = DashboardTelemetryService_1 = __decorate([
    (0, common_1.Injectable)()
], DashboardTelemetryService);
//# sourceMappingURL=DashboardTelemetry.service.js.map