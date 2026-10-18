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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const company_1 = require("../../Database/Table/Admin/company");
const user_1 = require("../../Database/Table/Admin/user");
const Encryption_service_1 = require("../Encryption.service");
let AuthService = class AuthService {
    constructor(_JwtService, _EncryptionService) {
        this._JwtService = _JwtService;
        this._EncryptionService = _EncryptionService;
    }
    async ValidateUser(username, password) {
        const UserData = await user_1.user.findOne({ where: { email: username }, relations: ['user_role'] });
        const CompanyData = await company_1.company.find({ relations: ["currency"] });
        if (!UserData) {
            throw new Error('Invalid email id');
        }
        if (UserData.status == false) {
            throw new Error('User suspended, contanct administration');
        }
        if (this._EncryptionService.Decrypt(UserData.password) != password) {
            throw new Error('Invalid password');
        }
        const payload = {
            email: UserData.email,
            user_id: UserData.id,
            user_role_id: UserData.user_role_id,
            user_role_name: UserData.user_role.name,
            company: CompanyData[0]
        };
        const api_token = this._JwtService.sign(payload);
        return { api_token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, Encryption_service_1.EncryptionService])
], AuthService);
//# sourceMappingURL=Auth.service.js.map