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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_js_1 = __importDefault(require("crypto-js"));
let EncryptionService = class EncryptionService {
    constructor(_ConfigService) {
        this._ConfigService = _ConfigService;
    }
    Decrypt(text) {
        const DuplicateKey = crypto_js_1.default.enc.Hex.parse(text);
        const OriginalKey = DuplicateKey.toString(crypto_js_1.default.enc.Base64);
        return crypto_js_1.default.AES.decrypt(OriginalKey, String(this._ConfigService.get("Encryption.SecertKey"))).toString(crypto_js_1.default.enc.Utf8);
    }
    Encrypt(text) {
        const OriginalKey = crypto_js_1.default.AES.encrypt(text, String(this._ConfigService.get("Encryption.SecertKey"))).toString();
        const DuplicateKey = crypto_js_1.default.enc.Base64.parse(OriginalKey);
        return DuplicateKey.toString(crypto_js_1.default.enc.Hex);
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);
//# sourceMappingURL=Encryption.service.js.map