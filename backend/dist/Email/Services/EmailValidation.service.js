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
var EmailValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailValidationService = void 0;
const common_1 = require("@nestjs/common");
const dns = __importStar(require("dns"));
const net = __importStar(require("net"));
const util_1 = require("util");
const resolveMx = (0, util_1.promisify)(dns.resolveMx);
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
    "trashmail.com",
    "yopmail.com",
    "sharklasers.com",
    "dispostable.com",
    "getairmail.com",
    "throwawaymail.com",
    "temp-mail.org",
    "fakeinbox.com",
    "mytemp.email",
]);
const ROLE_BASED_PREFIXES = new Set([
    "admin",
    "support",
    "info",
    "sales",
    "billing",
    "contact",
    "help",
    "office",
    "no-reply",
    "noreply",
    "marketing",
    "hr",
    "jobs",
]);
let EmailValidationService = EmailValidationService_1 = class EmailValidationService {
    constructor() {
        this.logger = new common_1.Logger(EmailValidationService_1.name);
    }
    async validateEmail(email) {
        const cleanEmail = (email || "").trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            return {
                isValid: false,
                score: 0,
                reason: "Invalid email syntax format",
                isDisposable: false,
                isRoleBased: false,
                hasMxRecords: false,
            };
        }
        const [localPart, domain] = cleanEmail.split("@");
        const isDisposable = DISPOSABLE_DOMAINS.has(domain);
        if (isDisposable) {
            return {
                isValid: false,
                score: 10,
                reason: "Disposable / temporary email domain detected (High risk of bounce/spam report)",
                isDisposable: true,
                isRoleBased: false,
                hasMxRecords: false,
            };
        }
        const isRoleBased = ROLE_BASED_PREFIXES.has(localPart);
        let mxHost = "";
        let hasMxRecords = false;
        try {
            const addresses = await resolveMx(domain);
            if (addresses && addresses.length > 0) {
                addresses.sort((a, b) => a.priority - b.priority);
                mxHost = addresses[0].exchange;
                hasMxRecords = true;
            }
        }
        catch (dnsErr) {
            this.logger.warn(`MX DNS check failed for ${domain}: ${dnsErr.message}`);
            return {
                isValid: false,
                score: 20,
                reason: "Domain has no valid MX records (cannot receive emails)",
                isDisposable: false,
                isRoleBased,
                hasMxRecords: false,
            };
        }
        if (!hasMxRecords) {
            return {
                isValid: false,
                score: 20,
                reason: "Domain has no active mail exchange servers",
                isDisposable: false,
                isRoleBased,
                hasMxRecords: false,
            };
        }
        let score = 100;
        if (isRoleBased) {
            score -= 15;
        }
        return {
            isValid: score >= 60,
            score,
            reason: score >= 60 ? "Email is valid and deliverable" : "Low quality email address",
            isDisposable: false,
            isRoleBased,
            hasMxRecords: true,
            mxHost,
        };
    }
    async verifyMailboxSmtp(email, mxHost) {
        return new Promise((resolve) => {
            const socket = net.createConnection(25, mxHost);
            let step = 0;
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(true);
            }, 5000);
            socket.setEncoding("ascii");
            socket.on("data", (data) => {
                const response = data.toString();
                if (step === 0 && response.startsWith("220")) {
                    socket.write("HELO sharyx.com\r\n");
                    step++;
                }
                else if (step === 1 && response.startsWith("250")) {
                    socket.write("MAIL FROM:<verify@sharyx.com>\r\n");
                    step++;
                }
                else if (step === 2 && response.startsWith("250")) {
                    socket.write(`RCPT TO:<${email}>\r\n`);
                    step++;
                }
                else if (step === 3) {
                    clearTimeout(timeout);
                    socket.write("QUIT\r\n");
                    socket.end();
                    resolve(response.startsWith("250"));
                }
            });
            socket.on("error", () => {
                clearTimeout(timeout);
                resolve(true);
            });
        });
    }
};
exports.EmailValidationService = EmailValidationService;
exports.EmailValidationService = EmailValidationService = EmailValidationService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailValidationService);
//# sourceMappingURL=EmailValidation.service.js.map