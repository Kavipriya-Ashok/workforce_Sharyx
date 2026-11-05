"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const QUERY_TOKEN_PATHS = [/\/voice\/calls\/audio$/i, /\/omnichannel\/stream$/i];
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    canActivate(context) {
        var _a, _b;
        const req = context.switchToHttp().getRequest();
        const token = (_a = req.query) === null || _a === void 0 ? void 0 : _a.access_token;
        if (!((_b = req.headers) === null || _b === void 0 ? void 0 : _b.authorization) &&
            req.method === 'GET' &&
            typeof token === 'string' &&
            token &&
            QUERY_TOKEN_PATHS.some((re) => re.test((req.path || req.url || '').split('?')[0]))) {
            req.headers.authorization = `Bearer ${token}`;
        }
        return super.canActivate(context);
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
//# sourceMappingURL=JwtAuthGuard.service.js.map