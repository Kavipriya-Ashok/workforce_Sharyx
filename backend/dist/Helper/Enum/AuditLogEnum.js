"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventNameEnum = exports.LogActionEnum = void 0;
var LogActionEnum;
(function (LogActionEnum) {
    LogActionEnum["Insert"] = "Insert";
    LogActionEnum["Update"] = "Update";
    LogActionEnum["Delete"] = "Delete";
    LogActionEnum["Default"] = "Default";
    LogActionEnum["Active"] = "Active";
    LogActionEnum["Suspend"] = "Suspend";
    LogActionEnum["Void"] = "Void";
    LogActionEnum["Duplicate"] = "Duplicate";
    LogActionEnum["Approve"] = "Approve";
    LogActionEnum["UnApprove"] = "UnApprove";
    LogActionEnum["ResetPassword"] = "ResetPassword";
})(LogActionEnum || (exports.LogActionEnum = LogActionEnum = {}));
var EventNameEnum;
(function (EventNameEnum) {
    EventNameEnum["AuditLog"] = "AuditLog";
})(EventNameEnum || (exports.EventNameEnum = EventNameEnum = {}));
//# sourceMappingURL=AuditLogEnum.js.map