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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const Mailer_service_1 = require("./Mailer.service");
const Common_service_1 = require("./Common.service");
let EmailService = class EmailService {
    constructor(_MailerService, _CommonService) {
        this._MailerService = _MailerService;
        this._CommonService = _CommonService;
    }
    async ForgotPassword(EmailId, ResetOTP, EncryptedUserId) {
        const Res = await this._MailerService.SendMail({
            to: EmailId,
            subject: "Forgot password request",
            template: "ForgotPassword",
            html: true,
            attachments: [
                {
                    filename: 'logo.png',
                    content: this._CommonService.GetBase64(`dist/Assets/Logo.png`),
                    cid: 'logo',
                    encoding: 'base64'
                }
            ],
            context: {
                logo: "cid:logo",
                domain_name: process.env.DOMAIN_NAME + "ResetPassword/" + EncryptedUserId,
                otp: ResetOTP
            },
        });
        return Res;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Mailer_service_1.MailerService,
        Common_service_1.CommonService])
], EmailService);
//# sourceMappingURL=Email.service.js.map