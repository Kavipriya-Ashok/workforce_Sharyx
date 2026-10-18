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
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const Encryption_service_1 = require("../../Service/Encryption.service");
const EmailAI_service_1 = require("./EmailAI.service");
const Email_service_1 = require("./Email.service");
let EmailImapService = EmailImapService_1 = class EmailImapService {
    constructor(encryptionService, emailService, aiService) {
        this.encryptionService = encryptionService;
        this.emailService = emailService;
        this.aiService = aiService;
        this.logger = new common_1.Logger(EmailImapService_1.name);
        this.timer = null;
        this.isPolling = false;
    }
    onModuleInit() {
        this.timer = setInterval(() => {
            this.pollInbox().catch((err) => this.logger.debug(`IMAP poll pass: ${err.message}`));
        }, 60000);
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
    async pollInbox() {
        var _a, _b, _c, _d;
        if (this.isPolling)
            return;
        this.isPolling = true;
        try {
            const config = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { is_active: true } });
            if (!config || !config.imap_host || !config.smtp_user) {
                this.isPolling = false;
                return;
            }
            let password = config.smtp_password;
            try {
                password = this.encryptionService.Decrypt(config.smtp_password);
            }
            catch (_e) {
            }
            const imapConfig = {
                imap: {
                    user: config.smtp_user,
                    password: password,
                    host: config.imap_host,
                    port: config.imap_port || 993,
                    tls: (_a = config.use_ssl) !== null && _a !== void 0 ? _a : true,
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
                    const from = ((_d = (_c = (_b = parsed.from) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.address) || "unknown@client.com";
                    const subject = parsed.subject || "No Subject";
                    const bodyText = parsed.text || "";
                    const bodyHtml = parsed.html || `<p>${bodyText}</p>`;
                    const messageId = parsed.messageId || `${idHeader}`;
                    const exists = await EmailLog_entity_1.EmailLog.findOne({ where: { message_id: messageId } });
                    if (!exists) {
                        const log = new EmailLog_entity_1.EmailLog();
                        log.tenant_id = config.tenant_id;
                        log.from_email = from;
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
                        const aiConfig = await this.aiService.getConfig(config.tenant_id);
                        if (aiConfig && aiConfig.auto_reply_enabled) {
                            const draft = await this.aiService.generateDraft({ from_email: from, subject, incoming_body: bodyText }, config.tenant_id);
                            if (draft === null || draft === void 0 ? void 0 : draft.draft) {
                                await this.emailService.sendEmail({
                                    to: from,
                                    subject: draft.subject,
                                    html: `<p>${draft.draft.replace(/\n/g, "<br/>")}</p>`,
                                }, "ai_auto_responder", true);
                            }
                        }
                    }
                }
            }
            await connection.end();
        }
        catch (err) {
            this.logger.debug(`IMAP polling skipped/failed: ${err.message}`);
        }
        finally {
            this.isPolling = false;
        }
    }
};
exports.EmailImapService = EmailImapService;
exports.EmailImapService = EmailImapService = EmailImapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        Email_service_1.EmailService,
        EmailAI_service_1.EmailAIService])
], EmailImapService);
//# sourceMappingURL=EmailImap.service.js.map