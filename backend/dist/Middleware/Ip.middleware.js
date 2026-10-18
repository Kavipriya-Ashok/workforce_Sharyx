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
exports.IpMiddleware = void 0;
const common_1 = require("@nestjs/common");
const Request_Context_service_1 = require("../Service/Admin/Request-Context.service");
let IpMiddleware = class IpMiddleware {
    constructor(contextService) {
        this.contextService = contextService;
    }
    use(req, res, next) {
        let userIp = req.headers['x-forwarded-for'];
        if (userIp) {
            userIp = userIp.split(',')[0];
        }
        else {
            userIp = req.socket.remoteAddress || '127.0. 0.1';
        }
        this.contextService.run(() => {
            this.contextService.set('userIp', userIp);
            next();
        });
    }
};
exports.IpMiddleware = IpMiddleware;
exports.IpMiddleware = IpMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Request_Context_service_1.RequestContextService])
], IpMiddleware);
//# sourceMappingURL=Ip.middleware.js.map