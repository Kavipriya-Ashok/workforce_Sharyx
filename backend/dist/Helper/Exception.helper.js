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
const Redact_1 = require("./Redact");
let ExceptionHelper = class ExceptionHelper {
    async catch(exception, host) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let MessageText = "";
        let dbStatus = null;
        let dbSafeMessage = null;
        if ((exception === null || exception === void 0 ? void 0 : exception.name) === "QueryFailedError" || (exception === null || exception === void 0 ? void 0 : exception.driverError)) {
            const code = String((exception === null || exception === void 0 ? void 0 : exception.code) || ((_a = exception === null || exception === void 0 ? void 0 : exception.driverError) === null || _a === void 0 ? void 0 : _a.code) || "");
            if (/^22/.test(code)) {
                dbStatus = 400;
                dbSafeMessage = "Invalid input";
            }
            else if (code === "23505") {
                dbStatus = 409;
                dbSafeMessage = "Duplicate record";
            }
            else if (/^23/.test(code)) {
                dbStatus = 409;
                dbSafeMessage = "The request conflicts with existing data";
            }
            else {
                dbStatus = 500;
                dbSafeMessage = "Internal server error";
            }
        }
        if (exception.code == "ER_DUP_ENTRY") {
            MessageText = "Duplicate record";
        }
        else if ((_b = exception.message) === null || _b === void 0 ? void 0 : _b.includes("ER_DUP_ENTRY")) {
            MessageText = "Duplicate record";
        }
        else if (exception.code == "ER_ROW_IS_REFERENCED") {
            MessageText = "Cannot delete or update used record";
        }
        else if ((_c = exception.message) === null || _c === void 0 ? void 0 : _c.includes("ER_ROW_IS_REFERENCED")) {
            MessageText = "Cannot delete or update used record";
        }
        else if (exception.code == "ER_NO_REFERENCED_ROW_2") {
            var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
            MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
        }
        else if ((_d = exception.message) === null || _d === void 0 ? void 0 : _d.includes("ER_NO_REFERENCED_ROW_2")) {
            var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
            MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
        }
        else {
            if (Array.isArray((_e = exception.response) === null || _e === void 0 ? void 0 : _e.message)) {
                MessageText = exception.response.message.join("\n");
            }
            else if ((_f = exception.response) === null || _f === void 0 ? void 0 : _f.message) {
                MessageText = exception.response.message;
            }
            else if (exception.message) {
                MessageText = exception.message;
            }
            else {
                MessageText = exception.response;
            }
        }
        try {
            await error_log_1.error_log.insert({
                url: (0, Redact_1.redactUrl)(((_g = response.req) === null || _g === void 0 ? void 0 : _g.url) || ""),
                ipaddress: ((_h = response.req) === null || _h === void 0 ? void 0 : _h.ip) || "",
                message: (0, Redact_1.redactSecrets)(String(MessageText || "Error")).slice(0, 1000),
                created_by_id: (_l = (_k = (_j = response.req) === null || _j === void 0 ? void 0 : _j.user) === null || _k === void 0 ? void 0 : _k["user_id"]) !== null && _l !== void 0 ? _l : Common_helper_1.EmptyUuid,
                created_by_name: (_p = (_o = (_m = response.req) === null || _m === void 0 ? void 0 : _m.user) === null || _o === void 0 ? void 0 : _o["email"]) !== null && _p !== void 0 ? _p : "No User",
                created_on: new Date(),
            });
        }
        catch (_q) {
        }
        if (!response.headersSent) {
            const statusCode = dbStatus !== null && dbStatus !== void 0 ? dbStatus : (typeof (exception === null || exception === void 0 ? void 0 : exception.getStatus) === "function" ? exception.getStatus() : ((exception === null || exception === void 0 ? void 0 : exception.status) || 500));
            const clientMessage = dbSafeMessage !== null && dbSafeMessage !== void 0 ? dbSafeMessage : MessageText;
            response
                .status(statusCode)
                .json({ Type: ResponseEnum_1.ResponseEnum.Error, Message: clientMessage, message: clientMessage, ok: false });
        }
    }
};
exports.ExceptionHelper = ExceptionHelper;
exports.ExceptionHelper = ExceptionHelper = __decorate([
    (0, common_1.Catch)()
], ExceptionHelper);
//# sourceMappingURL=Exception.helper.js.map