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
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const Encryption_service_1 = require("../../Service/Encryption.service");
let EmailService = EmailService_1 = class EmailService {
    constructor(encryptionService) {
        this.encryptionService = encryptionService;
        this.logger = new common_1.Logger(EmailService_1.name);
    }
    async getConfig(tenantId = "default") {
        return await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
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
        config.email_address = data.email_address;
        config.smtp_host = data.smtp_host;
        config.smtp_port = data.smtp_port || 587;
        config.smtp_user = data.smtp_user;
        config.smtp_password = this.encryptionService.Encrypt(data.smtp_password);
        config.imap_host = data.imap_host || null;
        config.imap_port = data.imap_port || 993;
        config.use_ssl = (_a = data.use_ssl) !== null && _a !== void 0 ? _a : true;
        config.is_active = (_b = data.is_active) !== null && _b !== void 0 ? _b : true;
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        return await config.save();
    }
    async sendEmail(dto, userId, isAiDrafted = false) {
        const config = await this.getConfig();
        if (!config) {
            throw new Error("No active email configuration found. Please setup SMTP settings.");
        }
        let decryptedPassword = config.smtp_password;
        try {
            decryptedPassword = this.encryptionService.Decrypt(config.smtp_password);
        }
        catch (_a) {
        }
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_port === 465,
            auth: {
                user: config.smtp_user,
                pass: decryptedPassword,
            },
        });
        let messageId = `msg_${Date.now()}`;
        let deliveryStatus = "sent";
        try {
            const info = await transporter.sendMail({
                from: `"${config.email_address}" <${config.smtp_user}>`,
                to: dto.to,
                subject: dto.subject,
                html: dto.html,
            });
            messageId = info.messageId || messageId;
        }
        catch (err) {
            this.logger.error("Failed to send email via SMTP:", err.message);
            deliveryStatus = "failed";
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
            ],
            order: { created_on: "ASC" },
        });
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService])
], EmailService);
//# sourceMappingURL=Email.service.js.map