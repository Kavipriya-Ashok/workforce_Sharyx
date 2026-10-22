"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionHelper = void 0;
const common_1 = require("@nestjs/common");
const error_log_1 = require("../Database/Table/Admin/error_log");
const ResponseEnum_1 = require("./Enum/ResponseEnum");
const Common_helper_1 = require("./Common.helper");
let ExceptionHelper = class ExceptionHelper {
    async catch(exception, host) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let MessageText = "";
        if (exception.code == "ER_DUP_ENTRY") {
            MessageText = "Duplicate record";
        }
        else if ((_a = exception.message) === null || _a === void 0 ? void 0 : _a.includes("ER_DUP_ENTRY")) {
            MessageText = "Duplicate record";
        }
        else if (exception.code == "ER_ROW_IS_REFERENCED") {
            MessageText = "Cannot delete or update used record";
        }
        else if ((_b = exception.message) === null || _b === void 0 ? void 0 : _b.includes("ER_ROW_IS_REFERENCED")) {
            MessageText = "Cannot delete or update used record";
        }
        else if (exception.code == "ER_NO_REFERENCED_ROW_2") {
            var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
            MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
        }
        else if ((_c = exception.message) === null || _c === void 0 ? void 0 : _c.includes("ER_NO_REFERENCED_ROW_2")) {
            var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
            MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
        }
        else {
            if (Array.isArray((_d = exception.response) === null || _d === void 0 ? void 0 : _d.message)) {
                MessageText = exception.response.message.join("\n");
            }
            else if ((_e = exception.response) === null || _e === void 0 ? void 0 : _e.message) {
                MessageText = exception.response.message;
            }
            else if (exception.message) {
                MessageText = exception.message;
            }
            else {
                MessageText = exception.response;
            }
        }
        await error_log_1.error_log.insert({
            url: response.req.url,
            ipaddress: response.req.ip,
            message: MessageText,
            created_by_id: (_h = (_g = (_f = response.req) === null || _f === void 0 ? void 0 : _f.user) === null || _g === void 0 ? void 0 : _g["user_id"]) !== null && _h !== void 0 ? _h : Common_helper_1.EmptyUuid,
            created_by_name: (_l = (_k = (_j = response.req) === null || _j === void 0 ? void 0 : _j.user) === null || _k === void 0 ? void 0 : _k["email"]) !== null && _l !== void 0 ? _l : "No User",
            created_on: new Date(),
        });
        response
            .status(500)
            .json({ Type: ResponseEnum_1.ResponseEnum.Error, Message: MessageText, message: MessageText, ok: false });
    }
};
exports.ExceptionHelper = ExceptionHelper;
exports.ExceptionHelper = ExceptionHelper = __decorate([
    (0, common_1.Catch)()
], ExceptionHelper);
//# sourceMappingURL=Exception.helper.js.map