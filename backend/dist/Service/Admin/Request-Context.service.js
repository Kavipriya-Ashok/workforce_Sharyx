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
exports.RequestContextService = void 0;
const common_1 = require("@nestjs/common");
const cls_hooked_1 = require("cls-hooked");
let RequestContextService = class RequestContextService {
    constructor() {
        this.namespace = (0, cls_hooked_1.createNamespace)('request-context');
    }
    set(key, value) {
        this.namespace.set(key, value);
    }
    get(key) {
        return this.namespace.get(key);
    }
    run(callback) {
        this.namespace.run(callback);
    }
};
exports.RequestContextService = RequestContextService;
exports.RequestContextService = RequestContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RequestContextService);
//# sourceMappingURL=Request-Context.service.js.map