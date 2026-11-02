"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyUuid = exports.SetLastDateOfMonth = exports.DateComparison = exports.DateFormatForReport = exports.DBDateTimeEnd = exports.DBDateTimeStart = exports.DateFormatForDB = exports.RandomValue = exports.CurrentTenant = exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
require("reflect-metadata");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, req) => {
    var _a;
    const request = req.getArgs()[0];
    if ((_a = request === null || request === void 0 ? void 0 : request.user) === null || _a === void 0 ? void 0 : _a.user_id) {
        return request.user.user_id;
    }
    else {
        return 0;
    }
});
exports.CurrentTenant = (0, common_1.createParamDecorator)((data, req) => {
    var _a, _b, _c, _d, _e;
    const request = req.getArgs()[0];
    const user = request === null || request === void 0 ? void 0 : request.user;
    const isSuperAdmin = ((_a = user === null || user === void 0 ? void 0 : user.user_role_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('super')) ||
        ((_b = user === null || user === void 0 ? void 0 : user.role) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('super'));
    if (isSuperAdmin) {
        const requestedTenantId = (_c = request === null || request === void 0 ? void 0 : request.headers) === null || _c === void 0 ? void 0 : _c['x-tenant-id'];
        if (requestedTenantId && requestedTenantId !== 'all') {
            return requestedTenantId;
        }
        return requestedTenantId === 'all' ? null : (((_d = user === null || user === void 0 ? void 0 : user.company) === null || _d === void 0 ? void 0 : _d.id) || null);
    }
    return ((_e = user === null || user === void 0 ? void 0 : user.company) === null || _e === void 0 ? void 0 : _e.id) || (user === null || user === void 0 ? void 0 : user.company_id) || null;
});
const RandomValue = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min);
};
exports.RandomValue = RandomValue;
const DateFormatForDB = (SourceDate) => {
    if (SourceDate) {
        SourceDate = new Date(SourceDate);
        let FormattedDate = "";
        if (SourceDate === null || SourceDate === void 0 ? void 0 : SourceDate.getDate()) {
            FormattedDate = (0, date_fns_1.format)(SourceDate, "yyyy-MM-dd");
        }
        return FormattedDate;
    }
    else {
        return null;
    }
};
exports.DateFormatForDB = DateFormatForDB;
const DBDateTimeStart = (SourceDate) => {
    if (SourceDate) {
        let FormattedDate;
        if (SourceDate === null || SourceDate === void 0 ? void 0 : SourceDate.getDate()) {
            SourceDate.setHours(0);
            SourceDate.setMinutes(0);
            SourceDate.setSeconds(0);
            SourceDate.setMilliseconds(0);
            FormattedDate = (0, date_fns_1.format)(SourceDate, "yyyy-MM-dd HH:mm");
        }
        return FormattedDate;
    }
    else {
        return null;
    }
};
exports.DBDateTimeStart = DBDateTimeStart;
const DBDateTimeEnd = (SourceDate) => {
    if (SourceDate) {
        let FormattedDate;
        if (SourceDate === null || SourceDate === void 0 ? void 0 : SourceDate.getDate()) {
            SourceDate.setHours(23);
            SourceDate.setMinutes(59);
            SourceDate.setSeconds(59);
            SourceDate.setMilliseconds(0);
            FormattedDate = (0, date_fns_1.format)(SourceDate, "yyyy-MM-dd HH:mm");
        }
        return FormattedDate;
    }
    else {
        return null;
    }
};
exports.DBDateTimeEnd = DBDateTimeEnd;
const DateFormatForReport = (SourceDate) => {
    if (SourceDate) {
        let FormattedDate = "";
        if (SourceDate === null || SourceDate === void 0 ? void 0 : SourceDate.getDate()) {
            FormattedDate = (0, date_fns_1.format)(SourceDate, "dd-MMM-yyyy");
        }
        return FormattedDate;
    }
    else {
        return null;
    }
};
exports.DateFormatForReport = DateFormatForReport;
const DateComparison = (StartDate, EndDate) => {
    if (StartDate && EndDate) {
        if ((0, date_fns_1.differenceInDays)(EndDate, StartDate) < 0) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
};
exports.DateComparison = DateComparison;
const SetLastDateOfMonth = (StartDate) => {
    StartDate = new Date(StartDate);
    StartDate.setMonth(StartDate.getMonth() + 1);
    StartDate.setDate(StartDate.getDate() - 1);
    return (0, exports.DateFormatForDB)(StartDate);
};
exports.SetLastDateOfMonth = SetLastDateOfMonth;
exports.EmptyUuid = "00000000-0000-0000-0000-00000000000";
//# sourceMappingURL=Common.helper.js.map