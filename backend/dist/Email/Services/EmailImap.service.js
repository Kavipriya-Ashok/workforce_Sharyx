"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailImapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailImapService = void 0;
const common_1 = require("@nestjs/common");
const mailparser_1 = require("mailparser");
const imaps = __importStar(require("imap-simple"));
const googleapis_1 = require("googleapis");
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const EmailCampaign_entity_1 = require("../../Database/Table/Email/EmailCampaign.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const Encryption_service_1 = require("../../Service/Encryption.service");
const EmailAI_service_1 = require("./EmailAI.service");
const Email_service_1 = require("./Email.service");
const AgentOrchestrator_service_1 = require("../../AgentOrchestrator/Services/AgentOrchestrator.service");
let EmailImapService = EmailImapService_1 = class EmailImapService {
    constructor(encryptionService, emailService, aiService, orchestrator) {
        this.encryptionService = encryptionService;
        this.emailService = emailService;
        this.aiService = aiService;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(EmailImapService_1.name);
        this.timer = null;
        this.isPolling = false;
    }
    onModuleInit() {
        this.timer = setInterval(() => {
            this.pollInbox().catch((err) => this.logger.debug(`Email sync pass: ${err.message}`));
        }, 60000);
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
    extractPhoneNumber(text) {
        if (!text)
            return null;
        const labeledRegex = /(?:phone|mobile|cell|tel|contact|whatsapp|ph|call|m)[\s:=-]+([+]?[0-9\s().-]{10,20})/i;
        const labeledMatch = text.match(labeledRegex);
        if (labeledMatch && labeledMatch[1]) {
            const digits = labeledMatch[1].replace(/\D/g, "");
            if (digits.length >= 10 && digits.length <= 15) {
                return labeledMatch[1].trim();
            }
        }
        const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/g;
        const matches = text.match(phoneRegex);
        if (matches) {
            for (const match of matches) {
                const digits = match.replace(/\D/g, "");
                if (digits.length >= 10 && digits.length <= 14 && !digits.startsWith("202")) {
                    return match.trim();
                }
            }
        }
        return null;
    }
    extractCompanyName(fromEmail, bodyText) {
        var _a;
        if (!fromEmail && !bodyText)
            return null;
        const compRegex = /(?:company|organization|firm|agency|business|corp)[\s:=-]+([A-Za-z0-9\s&.-]{2,40})/i;
        const match = bodyText.match(compRegex);
        if (match && match[1]) {
            return match[1].trim();
        }
        if (fromEmail && fromEmail.includes("@")) {
            const domain = (_a = fromEmail.split("@")[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            const genericDomains = [
                "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com",
                "outlook.com", "live.com", "icloud.com", "mail.com", "zoho.com", "proton.me", "protonmail.com"
            ];
            if (domain && !genericDomains.includes(domain)) {
                const parts = domain.split(".");
                if (parts.length >= 2) {
                    const compName = parts[0];
                    return compName.charAt(0).toUpperCase() + compName.slice(1);
                }
            }
        }
        return null;
    }
    async findOrCreateLeadFromEmail(fromEmail, fromName, bodyText, subject, tenantId = "default") {
        const extractedPhone = this.extractPhoneNumber(bodyText);
        const extractedCompany = this.extractCompanyName(fromEmail, bodyText);
        let existingLead = null;
        try {
            existingLead = await lead_1.lead.findOne({
                where: { email: fromEmail, status: true },
            });
            if (!existingLead && extractedPhone) {
                existingLead = await lead_1.lead.findOne({
                    where: { phone: extractedPhone, status: true },
                });
            }
            if (!existingLead) {
                existingLead = new lead_1.lead();
                existingLead.name = fromName || fromEmail.split("@")[0];
                existingLead.email = fromEmail;
                existingLead.phone = extractedPhone || null;
                existingLead.company_name = extractedCompany || null;
                existingLead.source = lead_1.LeadSource.EMAIL;
                existingLead.lead_status = lead_1.LeadStatus.NEW;
                existingLead.score = extractedPhone ? 75 : 60;
                existingLead.notes = `Inbound Inquiry via Email: "${subject}"${extractedPhone ? ` | Extracted Phone: ${extractedPhone}` : ""}${extractedCompany ? ` | Company: ${extractedCompany}` : ""}`;
                existingLead.tenant_id = tenantId;
                existingLead.created_by_id = "email_inbound";
                existingLead.created_on = new Date();
                await existingLead.save();
                this.logger.log(`🎯 [NEW LEAD CREATED FROM EMAIL] Name: ${existingLead.name} | Email: ${existingLead.email} | Phone: ${existingLead.phone || "None"} | Company: ${existingLead.company_name || "None"}`);
                const act = new lead_activity_1.lead_activity();
                act.lead_id = existingLead.id;
                act.activity_type = "EMAIL";
                act.title = "Inbound Email Inquiry";
                act.description = `From: ${fromEmail}${extractedPhone ? ` | Phone: ${extractedPhone}` : ""}${extractedCompany ? ` | Company: ${extractedCompany}` : ""}\nSubject: ${subject}`;
                act.performer_name = existingLead.name;
                act.tenant_id = tenantId;
                act.created_by_id = "email_inbound";
                act.created_on = new Date();
                await act.save();
            }
            else {
                let updatedDetails = false;
                if (!existingLead.phone && extractedPhone) {
                    existingLead.phone = extractedPhone;
                    updatedDetails = true;
                    this.logger.log(`📱 [PHONE NUMBER CAPTURED FROM EMAIL REPLY]: ${existingLead.name} -> ${extractedPhone}`);
                }
                if (!existingLead.company_name && extractedCompany) {
                    existingLead.company_name = extractedCompany;
                    updatedDetails = true;
                    this.logger.log(`🏢 [COMPANY NAME CAPTURED FROM EMAIL REPLY]: ${existingLead.name} -> ${extractedCompany}`);
                }
                existingLead.last_contacted_at = new Date();
                await existingLead.save();
                const act = new lead_activity_1.lead_activity();
                act.lead_id = existingLead.id;
                act.activity_type = "EMAIL";
                act.title = `Inbound Email Reply: ${subject}`;
                act.description = `Reply received: ${bodyText.slice(0, 250)}${extractedPhone ? ` | Captured Phone: ${extractedPhone}` : ""}`;
                act.performer_name = existingLead.name || fromEmail;
                act.tenant_id = existingLead.tenant_id || tenantId;
                act.created_by_id = "email_inbound";
                act.created_on = new Date();
                await act.save();
            }
        }
        catch (leadErr) {
            this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
        }
        return { leadRecord: existingLead, extractedPhone, extractedCompany };
    }
    async triggerAutoReply(fromEmail, subject, bodyText, leadRecord, hasPhone, tenantId) {
        const aiConfig = await this.aiService.getConfig(tenantId);
        if (!aiConfig || !aiConfig.auto_reply_enabled)
            return;
        try {
            let recentThread = [];
            try {
                recentThread = await EmailLog_entity_1.EmailLog.find({
                    where: [
                        { to_email: fromEmail, tenant_id: tenantId },
                        { from_email: fromEmail, tenant_id: tenantId },
                    ],
                    order: { created_on: "DESC" },
                    take: 4,
                });
            }
            catch (_a) { }
            const conversationHistory = recentThread
                .reverse()
                .map((m) => ({
                direction: m.direction || "inbound",
                body: m.body_text || m.subject,
            }));
            const activeCampaign = await EmailCampaign_entity_1.EmailCampaign.findOne({
                where: {
                    tenant_id: tenantId,
                    trigger_event: "after_reply",
                    is_active: true,
                },
            });
            let replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject || "Inquiry"}`;
            let replyHtml = "";
            if (activeCampaign && activeCampaign.html_template) {
                let templated = activeCampaign.html_template;
                const recipientName = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || fromEmail.split("@")[0];
                const company = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name) || "your company";
                templated = templated.replace(/{{name}}/g, recipientName);
                templated = templated.replace(/{{company}}/g, company);
                templated = templated.replace(/{{subject}}/g, subject);
                replySubject = activeCampaign.subject.replace(/{{name}}/g, recipientName);
                replyHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${templated}</div>`;
            }
            else {
                let agentReply = null;
                try {
                    const result = await this.orchestrator.handle({
                        channel: "email",
                        tenantId,
                        conversationRef: fromEmail.toLowerCase(),
                        message: bodyText,
                        subject,
                        email: fromEmail,
                        phone: (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone) || undefined,
                        name: (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || undefined,
                        leadId: leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id,
                        llm: { provider: aiConfig.llm_provider, model: aiConfig.llm_model },
                    });
                    if ((result === null || result === void 0 ? void 0 : result.humanTakeover) && !result.reply) {
                        this.logger.log(`👨‍💼 [EMAIL] ${fromEmail} is with a human agent - skipping AI reply`);
                        return;
                    }
                    if (result === null || result === void 0 ? void 0 : result.reply) {
                        agentReply = result.reply;
                        this.logger.log(`🤝 [MULTI-AGENT EMAIL] ${result.agentName} replied to ${fromEmail}`);
                    }
                }
                catch (err) {
                    this.logger.warn(`Multi-agent email failed, using legacy draft: ${err.message}`);
                }
                if (agentReply) {
                    replyHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${agentReply
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
                        .replace(/\n/g, "<br/>")}</div>`;
                }
                else {
                    const draft = await this.aiService.generateDraft({
                        from_email: fromEmail,
                        subject,
                        incoming_body: bodyText,
                        lead_name: (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || fromEmail.split("@")[0],
                        conversation_history: conversationHistory,
                        has_phone: hasPhone,
                        phone_number: (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone) || undefined,
                        company_name: (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name) || undefined,
                    }, tenantId);
                    if (!(draft === null || draft === void 0 ? void 0 : draft.draft))
                        return;
                    replySubject = draft.subject;
                    replyHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${draft.draft.replace(/\n/g, "<br/>")}</div>`;
                }
            }
            await this.emailService.sendEmail({
                to: fromEmail,
                subject: replySubject,
                html: replyHtml,
                lead_id: leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id,
            }, "ai_auto_responder", true, tenantId);
            this.logger.log(`🤖 [AFTER-REPLY AUTOMATION DISPATCHED] To: ${fromEmail} | Subject: "${replySubject}"`);
        }
        catch (err) {
            this.logger.warn(`After-reply automation could not be sent: ${err.message}`);
        }
    }
    async syncNow(tenantId = "default") {
        return await this.pollInbox();
    }
    isSystemOrAutomatedEmail(fromEmail, subject, headers = []) {
        var _a, _b, _c, _d, _e, _f;
        const emailLower = (fromEmail || "").toLowerCase();
        const subjectLower = (subject || "").toLowerCase();
        const systemSenders = [
            "mailer-daemon",
            "postmaster",
            "no-reply",
            "noreply",
            "donotreply",
            "do-not-reply",
            "bounce",
            "notifications@",
            "notification@",
            "alert@",
            "alerts@",
            "automated@",
            "system@",
        ];
        if (systemSenders.some((s) => emailLower.includes(s))) {
            return true;
        }
        const systemSubjects = [
            "delivery status notification",
            "undeliverable",
            "returned mail",
            "failure notice",
            "mail delivery failed",
            "automatic reply",
            "out of office",
            "auto-reply",
            "delivery failure",
        ];
        if (systemSubjects.some((s) => subjectLower.includes(s))) {
            return true;
        }
        const autoSubmitted = (_b = (_a = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "auto-submitted"; })) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        if (autoSubmitted && autoSubmitted !== "no") {
            return true;
        }
        const precedence = (_d = (_c = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "precedence"; })) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.toLowerCase();
        if (precedence && ["bulk", "junk", "auto_reply"].includes(precedence)) {
            return true;
        }
        const xAutoReply = (_f = (_e = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "x-autoreply"; })) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f.toLowerCase();
        if (xAutoReply === "yes") {
            return true;
        }
        return false;
    }
    async pollInbox() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        if (this.isPolling)
            return { synced: 0, status: "already_running" };
        this.isPolling = true;
        let syncedCount = 0;
        try {
            const config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { is_active: true } });
            if (!config) {
                return { synced: 0, status: "no_active_config" };
            }
            if (config.provider === "google-email" && config.refresh_token) {
                let decryptedRefreshToken = config.refresh_token;
                try {
                    decryptedRefreshToken = this.encryptionService.Decrypt(config.refresh_token);
                }
                catch (_t) {
                    decryptedRefreshToken = config.refresh_token;
                }
                const oauth2Client = new googleapis_1.google.auth.OAuth2(config.client_id || process.env.GOOGLE_CLIENT_ID, config.client_secret || process.env.GOOGLE_CLIENT_SECRET);
                oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
                const gmail = googleapis_1.google.gmail({ version: "v1", auth: oauth2Client });
                const listRes = await gmail.users.messages.list({
                    userId: "me",
                    q: "is:unread label:INBOX",
                    maxResults: 15,
                });
                const messages = listRes.data.messages || [];
                for (const item of messages) {
                    if (!item.id)
                        continue;
                    try {
                        const msg = await gmail.users.messages.get({
                            userId: "me",
                            id: item.id,
                            format: "full",
                        });
                        const headers = ((_a = msg.data.payload) === null || _a === void 0 ? void 0 : _a.headers) || [];
                        const fromHeader = ((_b = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "from"; })) === null || _b === void 0 ? void 0 : _b.value) || "";
                        const subjectHeader = ((_c = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "subject"; })) === null || _c === void 0 ? void 0 : _c.value) || "No Subject";
                        const messageIdHeader = ((_d = headers.find((h) => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "message-id"; })) === null || _d === void 0 ? void 0 : _d.value) || `gmail_${item.id}`;
                        let fromEmail = fromHeader;
                        let fromName = fromHeader;
                        const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
                        if (match) {
                            fromName = match[1].replace(/["']/g, "").trim();
                            fromEmail = match[2].trim();
                        }
                        if (fromEmail.toLowerCase() === config.email_address.toLowerCase()) {
                            continue;
                        }
                        if (this.isSystemOrAutomatedEmail(fromEmail, subjectHeader, headers)) {
                            this.logger.log(`🛡️ [EMAIL FILTER] Ignored system/no-reply email from ${fromEmail} | Subject: "${subjectHeader}"`);
                            try {
                                await gmail.users.messages.modify({
                                    userId: "me",
                                    id: item.id,
                                    requestBody: { removeLabelIds: ["UNREAD"] },
                                });
                            }
                            catch (_u) { }
                            continue;
                        }
                        let bodyText = "";
                        let bodyHtml = "";
                        const parts = (_e = msg.data.payload) === null || _e === void 0 ? void 0 : _e.parts;
                        if (parts && parts.length > 0) {
                            for (const p of parts) {
                                if (p.mimeType === "text/plain" && ((_f = p.body) === null || _f === void 0 ? void 0 : _f.data)) {
                                    bodyText = Buffer.from(p.body.data, "base64").toString("utf-8");
                                }
                                if (p.mimeType === "text/html" && ((_g = p.body) === null || _g === void 0 ? void 0 : _g.data)) {
                                    bodyHtml = Buffer.from(p.body.data, "base64").toString("utf-8");
                                }
                            }
                        }
                        else if ((_j = (_h = msg.data.payload) === null || _h === void 0 ? void 0 : _h.body) === null || _j === void 0 ? void 0 : _j.data) {
                            bodyText = Buffer.from(msg.data.payload.body.data, "base64").toString("utf-8");
                        }
                        const exists = await EmailLog_entity_1.EmailLog.findOne({ where: { message_id: messageIdHeader } });
                        if (!exists) {
                            const { leadRecord, extractedPhone } = await this.findOrCreateLeadFromEmail(fromEmail, fromName, bodyText, subjectHeader, config.tenant_id);
                            const log = new EmailLog_entity_1.EmailLog();
                            log.tenant_id = config.tenant_id;
                            log.lead_id = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id) || null;
                            log.from_email = fromEmail;
                            log.to_email = config.email_address;
                            log.subject = subjectHeader;
                            log.body_text = bodyText;
                            log.body_html = bodyHtml || `<p>${bodyText}</p>`;
                            log.direction = "inbound";
                            log.delivery_status = "received";
                            log.message_id = messageIdHeader;
                            log.created_by_id = "gmail_api_sync";
                            log.created_on = new Date();
                            await log.save();
                            syncedCount++;
                            try {
                                await gmail.users.messages.modify({
                                    userId: "me",
                                    id: item.id,
                                    requestBody: { removeLabelIds: ["UNREAD"] },
                                });
                            }
                            catch (modifyErr) {
                                this.logger.debug(`Could not update unread label: ${modifyErr.message}`);
                            }
                            await this.triggerAutoReply(fromEmail, subjectHeader, bodyText, leadRecord, !!(extractedPhone || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone)), config.tenant_id);
                        }
                    }
                    catch (msgErr) {
                        this.logger.warn(`Could not process Gmail message ${item.id}: ${msgErr.message}`);
                    }
                }
                return { synced: syncedCount, provider: "google-email" };
            }
            if (config.imap_host && config.smtp_user) {
                let password = config.smtp_password;
                try {
                    password = this.encryptionService.Decrypt(config.smtp_password);
                }
                catch (_v) {
                }
                const imapConfig = {
                    imap: {
                        user: config.smtp_user,
                        password: password,
                        host: config.imap_host,
                        port: config.imap_port || 993,
                        tls: (_k = config.use_ssl) !== null && _k !== void 0 ? _k : true,
                        authTimeout: 5000,
                    },
                };
                const connection = await imaps.connect(imapConfig);
                await connection.openBox("INBOX");
                const searchCriteria = ["UNSEEN"];
                const fetchOptions = {
                    bodies: ["HEADER", "TEXT", ""],
                    markSeen: true,
                };
                const messages = await connection.search(searchCriteria, fetchOptions);
                for (const item of messages) {
                    const all = item.parts.find((part) => part.which === "");
                    const id = item.attributes.uid;
                    const idHeader = `Imap-UID: ${id}`;
                    if (all) {
                        const parsed = await (0, mailparser_1.simpleParser)(all.body);
                        const fromEmail = ((_o = (_m = (_l = parsed.from) === null || _l === void 0 ? void 0 : _l.value) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.address) || "unknown@client.com";
                        const fromName = ((_r = (_q = (_p = parsed.from) === null || _p === void 0 ? void 0 : _p.value) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.name) || fromEmail.split("@")[0];
                        const subject = parsed.subject || "No Subject";
                        const bodyText = parsed.text || "";
                        const bodyHtml = parsed.html || `<p>${bodyText}</p>`;
                        const messageId = parsed.messageId || `${idHeader}`;
                        if (fromEmail.toLowerCase() === ((_s = config.email_address) === null || _s === void 0 ? void 0 : _s.toLowerCase())) {
                            continue;
                        }
                        if (this.isSystemOrAutomatedEmail(fromEmail, subject)) {
                            this.logger.log(`🛡️ [EMAIL FILTER] Ignored system/no-reply email from ${fromEmail} | Subject: "${subject}"`);
                            continue;
                        }
                        const exists = await EmailLog_entity_1.EmailLog.findOne({ where: { message_id: messageId } });
                        if (!exists) {
                            const { leadRecord, extractedPhone } = await this.findOrCreateLeadFromEmail(fromEmail, fromName, bodyText, subject, config.tenant_id);
                            const log = new EmailLog_entity_1.EmailLog();
                            log.tenant_id = config.tenant_id;
                            log.lead_id = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id) || null;
                            log.from_email = fromEmail;
                            log.to_email = config.email_address;
                            log.subject = subject;
                            log.body_text = bodyText;
                            log.body_html = bodyHtml;
                            log.direction = "inbound";
                            log.delivery_status = "received";
                            log.message_id = messageId;
                            log.created_by_id = "imap_poller";
                            log.created_on = new Date();
                            await log.save();
                            syncedCount++;
                            await this.triggerAutoReply(fromEmail, subject, bodyText, leadRecord, !!(extractedPhone || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone)), config.tenant_id);
                        }
                    }
                }
                await connection.end();
                return { synced: syncedCount, provider: "smtp_imap" };
            }
        }
        catch (err) {
            this.logger.debug(`Inbox polling skipped/failed: ${err.message}`);
        }
        finally {
            this.isPolling = false;
        }
        return { synced: syncedCount, status: "idle" };
    }
};
exports.EmailImapService = EmailImapService;
exports.EmailImapService = EmailImapService = EmailImapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        Email_service_1.EmailService,
        EmailAI_service_1.EmailAIService,
        AgentOrchestrator_service_1.AgentOrchestratorService])
], EmailImapService);
//# sourceMappingURL=EmailImap.service.js.map