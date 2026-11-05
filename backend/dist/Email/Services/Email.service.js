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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const nodemailer = __importStar(require("nodemailer"));
const imaps = __importStar(require("imap-simple"));
const Redact_1 = require("../../Helper/Redact");
const IntegrationStatus_1 = require("../../Service/Integrations/IntegrationStatus");
const googleapis_1 = require("googleapis");
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const Encryption_service_1 = require("../../Service/Encryption.service");
const EmailValidation_service_1 = require("./EmailValidation.service");
const EmailDeliveryLog_entity_1 = require("../../Database/Table/Email/EmailDeliveryLog.entity");
let EmailService = EmailService_1 = class EmailService {
    constructor(encryptionService, validationService, events) {
        this.encryptionService = encryptionService;
        this.validationService = validationService;
        this.events = events;
        this.logger = new common_1.Logger(EmailService_1.name);
    }
    async validateEmail(email) {
        return await this.validationService.validateEmail(email);
    }
    getOAuthClient(redirectUri) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || "http://localhost:8070/oauth/callback";
        return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, rUri);
    }
    requireTenant(tenantId) {
        if (!tenantId || tenantId === "all" || tenantId === "default") {
            throw new common_1.BadRequestException("Select a specific tenant to manage its email connection.");
        }
        return tenantId;
    }
    async getConfig(tenantId) {
        if (!tenantId || tenantId === "all" || tenantId === "default")
            return null;
        return await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
    }
    async getConfigAny(tenantId) {
        if (!tenantId || tenantId === "all" || tenantId === "default")
            return null;
        return await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
    }
    plainSecret(stored) {
        if (!stored)
            return "";
        try {
            const d = this.encryptionService.Decrypt(stored);
            if (d)
                return d;
        }
        catch (_a) {
        }
        return stored;
    }
    toSafeConfig(config) {
        if (!config)
            return null;
        const pw = this.plainSecret(config.smtp_password);
        return {
            id: config.id,
            tenant_id: config.tenant_id,
            provider: config.provider,
            display_name: config.display_name,
            email_address: config.email_address,
            client_id: config.client_id,
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            smtp_user: config.smtp_user,
            imap_host: config.imap_host,
            imap_port: config.imap_port,
            use_ssl: config.use_ssl,
            is_active: config.is_active,
            token_expires_at: config.token_expires_at,
            has_client_secret: !!config.client_secret,
            has_password: !!config.smtp_password,
            has_refresh_token: !!config.refresh_token,
            has_access_token: !!config.access_token,
            password_hint: pw ? (pw.length >= 12 ? `••••${pw.slice(-2)}` : "••••") : null,
        };
    }
    async getSafeConfig(tenantId) {
        return this.toSafeConfig(await this.getConfig(tenantId));
    }
    getGoogleAuthUrl(customRedirectUri) {
        const oauth2Client = this.getOAuthClient(customRedirectUri);
        const scopes = [
            "https://mail.google.com/",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ];
        const url = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: scopes,
        });
        return { url };
    }
    async connectGoogleAccount(code, redirectUri, userId, tenantId = "default") {
        const oauth2Client = this.getOAuthClient(redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const userEmail = userInfo.data.email;
        const displayName = userInfo.data.name || userInfo.data.given_name || "Gmail User";
        if (!userEmail) {
            throw new Error("Unable to retrieve email address from Google profile.");
        }
        let config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
        if (!config) {
            config = new EmailAccountConfig_entity_1.EmailAccountConfig();
            config.tenant_id = tenantId;
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
        config.provider = "google-email";
        config.email_address = userEmail;
        config.display_name = displayName;
        config.client_id = process.env.GOOGLE_CLIENT_ID || null;
        config.client_secret = null;
        if (tokens.refresh_token) {
            config.refresh_token = this.encryptionService.Encrypt(tokens.refresh_token);
        }
        if (tokens.access_token) {
            config.access_token = tokens.access_token;
        }
        if (tokens.expiry_date) {
            config.token_expires_at = new Date(tokens.expiry_date);
        }
        config.is_active = true;
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        await config.save();
        this.events.emit("integration.recheck", { tenantId, types: ["email_smtp", "email_imap"], force: true });
        return {
            success: true,
            email: userEmail,
            displayName,
            provider: "google-email",
            message: "Gmail connected successfully",
        };
    }
    async disconnect(tenantId, userId) {
        const tenant = this.requireTenant(tenantId);
        const config = await this.getConfigAny(tenant);
        if (config) {
            config.client_secret = null;
            config.refresh_token = null;
            config.access_token = null;
            config.smtp_password = null;
            config.token_expires_at = null;
            config.is_active = false;
            config.updated_by_id = userId || "system";
            config.updated_on = new Date();
            await config.save();
        }
        await (0, IntegrationStatus_1.markNotConfigured)(tenant, "email_smtp");
        await (0, IntegrationStatus_1.markNotConfigured)(tenant, "email_imap");
        return { success: true, message: config ? "Mailbox disconnected. Credentials were erased." : "No mailbox was connected." };
    }
    async disconnectGoogleAccount(tenantId = "default", userId) {
        return this.disconnect(tenantId, userId);
    }
    async getOAuthStatus(tenantId = "default") {
        const config = await this.getConfig(tenantId);
        if (!config) {
            return { isConnected: false, provider: "none" };
        }
        const isGoogle = config.provider === "google-email";
        return {
            isConnected: isGoogle ? !!config.refresh_token : config.is_active,
            provider: config.provider || "smtp",
            email_address: config.email_address,
            display_name: config.display_name,
            token_expires_at: config.token_expires_at,
        };
    }
    async saveConfig(data, userId) {
        var _a, _b;
        const tenant = this.requireTenant(data.tenant_id);
        let config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenant } });
        if (!config) {
            config = new EmailAccountConfig_entity_1.EmailAccountConfig();
            config.tenant_id = tenant;
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
        const credsChanged = !!data.smtp_password ||
            config.email_address !== data.email_address ||
            config.smtp_host !== (data.smtp_host || null) ||
            config.smtp_user !== (data.smtp_user || null) ||
            config.imap_host !== (data.imap_host || null) ||
            !config.is_active;
        config.provider = data.provider || "smtp";
        config.display_name = data.display_name || null;
        config.email_address = data.email_address;
        config.smtp_host = data.smtp_host || null;
        config.smtp_port = data.smtp_port || 587;
        config.smtp_user = data.smtp_user || null;
        if (data.smtp_password) {
            config.smtp_password = this.encryptionService.Encrypt(data.smtp_password);
        }
        config.imap_host = data.imap_host || null;
        config.imap_port = data.imap_port || 993;
        config.use_ssl = (_a = data.use_ssl) !== null && _a !== void 0 ? _a : true;
        config.is_active = (_b = data.is_active) !== null && _b !== void 0 ? _b : true;
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        const saved = await config.save();
        if (credsChanged)
            this.events.emit("integration.recheck", { tenantId: tenant, types: ["email_smtp", "email_imap"], force: true });
        return saved;
    }
    guessImapHost(smtpHost) {
        const h = (smtpHost || "").toLowerCase();
        if (/^smtp\.(gmail\.com|googlemail\.com)$/.test(h))
            return "imap.gmail.com";
        if (/^smtp\.(office365\.com|outlook\.com)$/.test(h) || h === "smtp-mail.outlook.com")
            return "outlook.office365.com";
        if (/^smtp\.mail\.yahoo\.com$/.test(h))
            return "imap.mail.yahoo.com";
        return null;
    }
    googleClient(cfg) {
        let refresh = cfg.refresh_token || "";
        if (refresh) {
            try {
                refresh = this.encryptionService.Decrypt(cfg.refresh_token) || refresh;
            }
            catch (_a) {
            }
        }
        const oauth2 = new googleapis_1.google.auth.OAuth2(cfg.client_id || process.env.GOOGLE_CLIENT_ID, cfg.client_secret || process.env.GOOGLE_CLIENT_SECRET);
        oauth2.setCredentials({ refresh_token: refresh });
        return { oauth2, hasRefresh: !!refresh };
    }
    async checkSmtp(cfg) {
        try {
            if (cfg.provider === "google-email") {
                const { oauth2, hasRefresh } = this.googleClient(cfg);
                if (!hasRefresh) {
                    return { ok: false, status: "failed", code: "GOOGLE_TOKEN_MISSING", message: "Google is not connected for this mailbox. Connect your Google account." };
                }
                await oauth2.getAccessToken();
                return { ok: true, status: "connected", message: `Google sign-in works for ${cfg.email_address}.` };
            }
            const pass = this.plainSecret(cfg.smtp_password);
            if (!cfg.smtp_host)
                return { ok: false, status: "failed", code: "SMTP_HOST_MISSING", message: "Enter the SMTP host (for Gmail: smtp.gmail.com)." };
            if (!pass)
                return { ok: false, status: "failed", code: "SMTP_PASSWORD_MISSING", message: "Enter the mailbox password or App Password." };
            const port = Number(cfg.smtp_port) || 587;
            const transporter = nodemailer.createTransport({
                host: cfg.smtp_host,
                port,
                secure: port === 465,
                auth: { user: cfg.smtp_user || cfg.email_address, pass },
                tls: { rejectUnauthorized: false },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
            });
            await transporter.verify();
            return { ok: true, status: "connected", message: `Outgoing mail works (${cfg.smtp_host}:${port}).` };
        }
        catch (err) {
            const c = (0, IntegrationStatus_1.classifyError)("email_smtp", err);
            this.logger.warn(`SMTP check failed for tenant ${cfg.tenant_id}: ${(0, Redact_1.redactSecrets)(err)}`);
            return c
                ? { ok: false, status: c.status, code: c.code, message: c.message }
                : { ok: false, status: "degraded", code: "SMTP_UNKNOWN", message: "The mail server answered with an unexpected error. Please try again, or check the settings." };
        }
    }
    async checkImap(cfg) {
        var _a;
        try {
            if (cfg.provider === "google-email") {
                const { oauth2, hasRefresh } = this.googleClient(cfg);
                if (!hasRefresh)
                    return { ok: false, status: "failed", code: "GOOGLE_TOKEN_MISSING", message: "Google is not connected for this mailbox. Connect your Google account." };
                const gmail = googleapis_1.google.gmail({ version: "v1", auth: oauth2 });
                await gmail.users.getProfile({ userId: "me" });
                return { ok: true, status: "connected", message: `Inbox access works for ${cfg.email_address}.` };
            }
            const host = cfg.imap_host || this.guessImapHost(cfg.smtp_host);
            if (!host)
                return { ok: false, status: "not_configured", message: "No inbox (IMAP) server is set, so incoming mail is not being read." };
            const pass = this.plainSecret(cfg.smtp_password);
            if (!pass)
                return { ok: false, status: "failed", code: "IMAP_PASSWORD_MISSING", message: "Enter the mailbox password or App Password." };
            const connection = await imaps.connect({
                imap: {
                    user: cfg.smtp_user || cfg.email_address,
                    password: pass,
                    host,
                    port: cfg.imap_port || 993,
                    tls: (_a = cfg.use_ssl) !== null && _a !== void 0 ? _a : true,
                    tlsOptions: { rejectUnauthorized: false },
                    authTimeout: 8000,
                    connTimeout: 10000,
                },
            });
            try {
                await connection.end();
            }
            catch (_b) {
            }
            return { ok: true, status: "connected", message: `Inbox login works (${host}).` };
        }
        catch (err) {
            const c = (0, IntegrationStatus_1.classifyError)("email_imap", err);
            this.logger.warn(`IMAP check failed for tenant ${cfg.tenant_id}: ${(0, Redact_1.redactSecrets)(err)}`);
            return c
                ? { ok: false, status: c.status, code: c.code, message: c.message }
                : { ok: false, status: "degraded", code: "IMAP_UNKNOWN", message: "The inbox server answered with an unexpected error. Please try again, or check the settings." };
        }
    }
    async testConnection(tenantId, userId, data = {}) {
        const tenant = this.requireTenant(tenantId);
        if ((data === null || data === void 0 ? void 0 : data.email_address) && data.provider !== "google-email") {
            const existing = await this.getConfigAny(tenant);
            await this.saveConfig(Object.assign(Object.assign({}, data), { tenant_id: tenant, provider: "smtp", imap_host: data.imap_host || (existing === null || existing === void 0 ? void 0 : existing.imap_host) || this.guessImapHost(data.smtp_host) || undefined, imap_port: data.imap_port || (existing === null || existing === void 0 ? void 0 : existing.imap_port) || 993, smtp_password: data.smtp_password || undefined, is_active: true }), userId);
        }
        const cfg = await this.getConfigAny(tenant);
        if (!cfg || (!cfg.is_active && !(data === null || data === void 0 ? void 0 : data.email_address))) {
            throw new common_1.BadRequestException("No mailbox is connected yet. Enter your email settings or connect Google first.");
        }
        const [smtp, imap] = [await this.checkSmtp(cfg), await this.checkImap(cfg)];
        const name = cfg.email_address;
        await (smtp.ok ? (0, IntegrationStatus_1.markConnected)(tenant, "email_smtp", name) : smtp.status === "degraded" ? (0, IntegrationStatus_1.markDegraded)(tenant, "email_smtp", smtp.code || "SMTP_ERROR", smtp.message, name) : (0, IntegrationStatus_1.markFailed)(tenant, "email_smtp", smtp.code || "SMTP_ERROR", smtp.message, name));
        await (imap.ok
            ? (0, IntegrationStatus_1.markConnected)(tenant, "email_imap", name)
            : imap.status === "not_configured"
                ? (0, IntegrationStatus_1.markNotConfigured)(tenant, "email_imap")
                : imap.status === "degraded"
                    ? (0, IntegrationStatus_1.markDegraded)(tenant, "email_imap", imap.code || "IMAP_ERROR", imap.message, name)
                    : (0, IntegrationStatus_1.markFailed)(tenant, "email_imap", imap.code || "IMAP_ERROR", imap.message, name));
        if (!smtp.ok) {
            throw new common_1.HttpException({ message: smtp.message, status: smtp.status, code: smtp.code }, common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            connected: true,
            provider: cfg.provider,
            email: name,
            smtp,
            imap,
            message: imap.ok ? "Email connected: sending and inbox both work." : `Sending works. Inbox check: ${imap.message}`,
        };
    }
    async recordEmailNotSent(tenantId, to, reason, opts = {}) {
        var _a;
        const status = opts.status || "skipped";
        this.logger.warn(`[EMAIL ${status.toUpperCase()}] tenant=${tenantId} to=${to || "-"} reason=${reason}`);
        try {
            const row = new EmailDeliveryLog_entity_1.EmailDeliveryLog();
            row.tenant_id = tenantId;
            row.to_email = to;
            row.subject = opts.subject || null;
            row.status = status;
            row.reason = String(reason).slice(0, 500);
            row.attempts = (_a = opts.attempts) !== null && _a !== void 0 ? _a : 0;
            row.lead_id = opts.leadId || null;
            await row.save();
        }
        catch (e) {
            this.logger.debug(`could not write email_delivery_log: ${e.message}`);
        }
        if (opts.leadId) {
            try {
                const act = new lead_activity_1.lead_activity();
                act.lead_id = opts.leadId;
                act.activity_type = "EMAIL";
                act.title = `Email ${status}`;
                act.description = `email ${status}: ${reason}`;
                act.performer_name = "system";
                act.tenant_id = tenantId;
                act.created_by_id = "system";
                act.created_on = new Date();
                await act.save();
            }
            catch (_b) { }
        }
    }
    async sendEmailReliable(dto, userId, isAiDrafted, tenantId, opts = {}) {
        const meta = { leadId: opts.leadId, subject: dto === null || dto === void 0 ? void 0 : dto.subject };
        if (!tenantId || tenantId === "default" || tenantId === "all") {
            await this.recordEmailNotSent(tenantId || "unknown", (dto === null || dto === void 0 ? void 0 : dto.to) || null, "no tenant context", meta);
            return { status: "skipped", reason: "no tenant context", attempts: 0 };
        }
        if (!(dto === null || dto === void 0 ? void 0 : dto.to)) {
            await this.recordEmailNotSent(tenantId, null, "contact has no email address", meta);
            return { status: "skipped", reason: "contact has no email address", attempts: 0 };
        }
        const cfg = await this.getConfig(tenantId);
        if (!cfg) {
            await this.recordEmailNotSent(tenantId, dto.to, "tenant has no active mailbox configured", meta);
            return { status: "skipped", reason: "tenant has no active mailbox configured", attempts: 0 };
        }
        const base = Number(process.env.EMAIL_RETRY_BASE_MS || 1000);
        let lastErr = null;
        let attempts = 0;
        for (let attempt = 1; attempt <= 3; attempt++) {
            attempts = attempt;
            try {
                await this.sendEmail(dto, userId, isAiDrafted, tenantId);
                return { status: "sent", attempts };
            }
            catch (e) {
                lastErr = e;
                if (/Email validation failed/i.test((e === null || e === void 0 ? void 0 : e.message) || ""))
                    break;
                if (attempt < 3)
                    await new Promise((r) => setTimeout(r, base * 3 ** (attempt - 1)));
            }
        }
        await this.recordEmailNotSent(tenantId, dto.to, (lastErr === null || lastErr === void 0 ? void 0 : lastErr.message) || "unknown error", Object.assign(Object.assign({}, meta), { status: "failed", attempts }));
        return { status: "failed", reason: (lastErr === null || lastErr === void 0 ? void 0 : lastErr.message) || "unknown error", attempts };
    }
    async sendEmail(dto, userId, isAiDrafted = false, tenantId = "") {
        if (!tenantId || tenantId === "default" || tenantId === "all") {
            throw new Error("Tenant context is required to send email.");
        }
        if (!dto.bypassValidation) {
            const val = await this.validationService.validateEmail(dto.to);
            if (!val.isValid) {
                throw new Error(`Email validation failed: ${val.reason} (Deliverability Score: ${val.score}%). Sending halted to protect your domain reputation. Route via WhatsApp instead.`);
            }
        }
        const config = await this.getConfig(tenantId);
        if (!config) {
            throw new Error("No active email configuration found. Please connect your Gmail or configure SMTP.");
        }
        let messageId = `msg_${Date.now()}`;
        let deliveryStatus = "sent";
        const senderDisplayName = config.display_name || config.email_address;
        try {
            if (config.provider === "google-email") {
                let decryptedRefreshToken = config.refresh_token;
                if (config.refresh_token) {
                    try {
                        decryptedRefreshToken = this.encryptionService.Decrypt(config.refresh_token);
                    }
                    catch (_a) {
                        decryptedRefreshToken = config.refresh_token;
                    }
                }
                if (!decryptedRefreshToken) {
                    throw new Error("Google refresh token is missing. Please reconnect your Google account.");
                }
                const clientId = config.client_id || process.env.GOOGLE_CLIENT_ID;
                const clientSecret = config.client_secret || process.env.GOOGLE_CLIENT_SECRET;
                try {
                    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
                    oauth2Client.setCredentials({
                        refresh_token: decryptedRefreshToken,
                        access_token: config.access_token || undefined,
                    });
                    const gmail = googleapis_1.google.gmail({ version: "v1", auth: oauth2Client });
                    const utf8Subject = `=?utf-8?B?${Buffer.from(dto.subject).toString("base64")}?=`;
                    const emailLines = [
                        `From: "${senderDisplayName}" <${config.email_address}>`,
                        `To: ${dto.to}`,
                        "Content-Type: text/html; charset=utf-8",
                        "MIME-Version: 1.0",
                        "Auto-Submitted: auto-replied",
                        "X-Sharyx-Auto-Reply: true",
                        ...(dto.inReplyTo ? [`In-Reply-To: ${dto.inReplyTo}`, `References: ${dto.inReplyTo}`] : []),
                        `Subject: ${utf8Subject}`,
                        "",
                        dto.html,
                    ];
                    const rawEmail = Buffer.from(emailLines.join("\r\n"))
                        .toString("base64")
                        .replace(/\+/g, "-")
                        .replace(/\//g, "_")
                        .replace(/=+$/, "");
                    const res = await gmail.users.messages.send({
                        userId: "me",
                        requestBody: Object.assign({ raw: rawEmail }, (dto.threadId ? { threadId: dto.threadId } : {})),
                    });
                    messageId = res.data.id || messageId;
                }
                catch (gmailApiErr) {
                    this.logger.warn(`Gmail API dispatch attempt: ${gmailApiErr.message}. Trying Nodemailer service fallback...`);
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            type: "OAuth2",
                            user: config.email_address,
                            clientId: clientId,
                            clientSecret: clientSecret,
                            refreshToken: decryptedRefreshToken,
                        },
                    });
                    const info = await transporter.sendMail({
                        from: `"${senderDisplayName}" <${config.email_address}>`,
                        to: dto.to,
                        subject: dto.subject,
                        html: dto.html,
                        inReplyTo: dto.inReplyTo,
                        references: dto.inReplyTo,
                        headers: {
                            "Auto-Submitted": "auto-replied",
                            "X-Sharyx-Auto-Reply": "true",
                        },
                    });
                    messageId = info.messageId || messageId;
                }
            }
            else {
                let decryptedPassword = config.smtp_password;
                if (config.smtp_password) {
                    try {
                        decryptedPassword = this.encryptionService.Decrypt(config.smtp_password);
                    }
                    catch (_b) {
                        decryptedPassword = config.smtp_password;
                    }
                }
                const transporter = nodemailer.createTransport({
                    host: config.smtp_host || "smtp.gmail.com",
                    port: config.smtp_port || 587,
                    secure: config.smtp_port === 465,
                    auth: {
                        user: config.smtp_user || config.email_address,
                        pass: decryptedPassword,
                    },
                });
                const info = await transporter.sendMail({
                    from: `"${senderDisplayName}" <${config.email_address}>`,
                    to: dto.to,
                    subject: dto.subject,
                    html: dto.html,
                });
                messageId = info.messageId || messageId;
            }
        }
        catch (err) {
            this.logger.error(`Failed to dispatch email: ${(0, Redact_1.redactSecrets)(err.message)}`);
            deliveryStatus = "failed";
            await (0, IntegrationStatus_1.noteFailure)(config.tenant_id, "email_smtp", err, config.email_address);
            const failedLog = new EmailLog_entity_1.EmailLog();
            failedLog.tenant_id = config.tenant_id;
            failedLog.lead_id = dto.lead_id || null;
            failedLog.from_email = config.email_address;
            failedLog.to_email = dto.to;
            failedLog.subject = dto.subject;
            failedLog.body_html = dto.html;
            failedLog.direction = "outbound";
            failedLog.delivery_status = "failed";
            failedLog.is_ai_drafted = isAiDrafted;
            failedLog.message_id = messageId;
            failedLog.created_by_id = userId || "system";
            failedLog.created_on = new Date();
            await failedLog.save();
            throw new common_1.HttpException(`Email sending failed: ${(0, Redact_1.redactSecrets)(err.message)}`, common_1.HttpStatus.BAD_GATEWAY);
        }
        void (0, IntegrationStatus_1.noteSuccess)(config.tenant_id, "email_smtp", config.email_address);
        const log = new EmailLog_entity_1.EmailLog();
        log.tenant_id = config.tenant_id;
        log.lead_id = dto.lead_id || null;
        log.from_email = config.email_address;
        log.to_email = dto.to;
        log.subject = dto.subject;
        log.body_html = dto.html;
        log.direction = "outbound";
        log.delivery_status = deliveryStatus;
        log.is_ai_drafted = isAiDrafted;
        log.message_id = messageId;
        log.created_by_id = userId || "system";
        log.created_on = new Date();
        await log.save();
        if (dto.lead_id) {
            try {
                const activity = new lead_activity_1.lead_activity();
                activity.lead_id = dto.lead_id;
                activity.activity_type = "EMAIL";
                activity.title = `Email Sent: ${dto.subject}`;
                activity.description = `Delivered to ${dto.to}`;
                activity.metadata = {
                    to: dto.to,
                    subject: dto.subject,
                    message_id: messageId,
                    is_ai_drafted: isAiDrafted,
                    provider: config.provider,
                };
                activity.performer_name = senderDisplayName;
                activity.tenant_id = config.tenant_id;
                activity.created_by_id = userId || "system";
                activity.created_on = new Date();
                await activity.save();
            }
            catch (err) {
                this.logger.warn(`Could not log activity for lead ${dto.lead_id}: ${err.message}`);
            }
        }
        return log;
    }
    async getInboxLogs(tenantId) {
        const isAll = tenantId === "all" || !tenantId;
        const qb = EmailLog_entity_1.EmailLog.createQueryBuilder("log")
            .addSelect("log.created_on")
            .where("log.status = true");
        if (!isAll) {
            qb.andWhere("log.tenant_id = :tenantId", { tenantId });
        }
        return await qb.orderBy("log.created_on", "DESC").take(100).getMany();
    }
    async getThread(leadIdOrEmail, tenantId) {
        const qb = EmailLog_entity_1.EmailLog.createQueryBuilder("log")
            .addSelect("log.created_on")
            .where("(log.to_email = :val OR log.from_email = :val OR log.lead_id = :val)", { val: leadIdOrEmail });
        if (tenantId && tenantId !== "all") {
            qb.andWhere("log.tenant_id = :tenantId", { tenantId });
        }
        return await qb.orderBy("log.created_on", "ASC").getMany();
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        EmailValidation_service_1.EmailValidationService,
        event_emitter_1.EventEmitter2])
], EmailService);
//# sourceMappingURL=Email.service.js.map