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
const nodemailer = __importStar(require("nodemailer"));
const googleapis_1 = require("googleapis");
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const Encryption_service_1 = require("../../Service/Encryption.service");
const EmailValidation_service_1 = require("./EmailValidation.service");
let EmailService = EmailService_1 = class EmailService {
    constructor(encryptionService, validationService) {
        this.encryptionService = encryptionService;
        this.validationService = validationService;
        this.logger = new common_1.Logger(EmailService_1.name);
    }
    async validateEmail(email) {
        return await this.validationService.validateEmail(email);
    }
    getOAuthClient(redirectUri) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/oauth/callback";
        return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, rUri);
    }
    async getConfig(tenantId = "default") {
        return await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
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
        config.client_secret = process.env.GOOGLE_CLIENT_SECRET || null;
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
        return {
            success: true,
            email: userEmail,
            displayName,
            provider: "google-email",
            message: "Gmail connected successfully",
        };
    }
    async disconnectGoogleAccount(tenantId = "default", userId) {
        const config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
        if (!config) {
            return { success: true, message: "No active configuration found." };
        }
        config.provider = "smtp";
        config.refresh_token = null;
        config.access_token = null;
        config.token_expires_at = null;
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        await config.save();
        return { success: true, message: "Google account disconnected successfully." };
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
        let config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
        if (!config) {
            config = new EmailAccountConfig_entity_1.EmailAccountConfig();
            config.tenant_id = data.tenant_id || "default";
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
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
        return await config.save();
    }
    async sendEmail(dto, userId, isAiDrafted = false, tenantId = "default") {
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
                        requestBody: {
                            raw: rawEmail,
                        },
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
            this.logger.error("Failed to dispatch email:", err.message);
            deliveryStatus = "failed";
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
            throw new Error(`Email sending failed: ${err.message}`);
        }
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
    async getInboxLogs(tenantId = "default") {
        return await EmailLog_entity_1.EmailLog.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
            take: 100,
        });
    }
    async getThread(leadIdOrEmail) {
        return await EmailLog_entity_1.EmailLog.find({
            where: [
                { to_email: leadIdOrEmail },
                { from_email: leadIdOrEmail },
                { lead_id: leadIdOrEmail },
            ],
            order: { created_on: "ASC" },
        });
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        EmailValidation_service_1.EmailValidationService])
], EmailService);
//# sourceMappingURL=Email.service.js.map