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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
const email_config_1 = require("../Database/Table/Admin/email_config");
const nodemailer_1 = __importDefault(require("nodemailer"));
const Encryption_service_1 = require("./Encryption.service");
const handlebars_1 = __importDefault(require("handlebars"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
let MailerService = MailerService_1 = class MailerService {
    constructor(_EncryptionService) {
        this._EncryptionService = _EncryptionService;
        this.logger = new common_1.Logger(MailerService_1.name);
    }
    async Configuration() {
        const Email = await email_config_1.email_config.find();
        if (Email.length == 0) {
            this.logger.error("Email config don't have data");
            return null;
        }
        var smtpTransport = nodemailer_1.default.createTransport({
            host: Email[0].host,
            auth: {
                user: Email[0].email_id,
                pass: this._EncryptionService.Decrypt(Email[0].password)
            }
        });
        this.logger.error("Email configurated successfully");
        return { smtpTransport, Email };
    }
    async SendMail(_SendMailData) {
        try {
            const SmtpTransport = await this.Configuration();
            if (!SmtpTransport.smtpTransport) {
                this.logger.error("Email not configured yet.");
                return { status: false, message: "Email not configured yet." };
            }
            const mail = {
                from: { name: SmtpTransport.Email[0].mailer_name, address: SmtpTransport.Email[0].email_id },
                to: _SendMailData.to,
                subject: _SendMailData.subject,
                text: _SendMailData.template,
                bcc: _SendMailData.bcc,
                attachments: _SendMailData.attachments
            };
            if (_SendMailData.template && _SendMailData.html) {
                const MailTemplatePath = path_1.default.resolve(`dist/Assets/MailTemplate/${_SendMailData.template}.hbs`);
                const ContentResult = await readFile(MailTemplatePath, 'utf8');
                const Template = handlebars_1.default.compile(ContentResult, { strict: true });
                mail["html"] = Template(_SendMailData.context);
            }
            else {
                mail["text"] = _SendMailData.template;
            }
            let SendMailPromise = new Promise((resolve, _reject) => {
                SmtpTransport.smtpTransport.sendMail(mail, async (error, _response) => {
                    if (error) {
                        this.logger.error(error);
                        SmtpTransport.smtpTransport.close();
                        resolve({ status: false, message: JSON.stringify(error) });
                    }
                    else {
                        SmtpTransport.smtpTransport.close();
                        resolve({ status: true, message: 'Message has been sent' });
                    }
                });
            });
            return await SendMailPromise;
        }
        catch (e) {
            return { status: false, message: e.message };
        }
    }
};
exports.MailerService = MailerService;
exports.MailerService = MailerService = MailerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService])
], MailerService);
//# sourceMappingURL=Mailer.service.js.map