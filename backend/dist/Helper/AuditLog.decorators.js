"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogTableRemoveColumns = exports.AuditLogRemoveColumn = exports.AuditLogIdentityName = exports.AuditLogChangeTableReferenceName = exports.AuditLogSameTableReferenceName = exports.AuditLogRemoveColumnsNameByTable = exports.AuditLogRemoveColumnsName = void 0;
exports.AuditLogSameTableReference = AuditLogSameTableReference;
exports.AuditLogIdentity = AuditLogIdentity;
exports.AuditLogChangeTableReference = AuditLogChangeTableReference;
exports.AuditLogRemoveColumnsName = [];
exports.AuditLogRemoveColumnsNameByTable = {};
exports.AuditLogSameTableReferenceName = {};
exports.AuditLogChangeTableReferenceName = {};
exports.AuditLogIdentityName = {};
const AuditLogRemoveColumn = () => {
    return function (target, propertyKey) {
        exports.AuditLogRemoveColumnsName.push(propertyKey);
    };
};
exports.AuditLogRemoveColumn = AuditLogRemoveColumn;
const AuditLogTableRemoveColumns = () => {
    return function (target, propertyKey) {
        if (!exports.AuditLogRemoveColumnsNameByTable[target.constructor.name]) {
            exports.AuditLogRemoveColumnsNameByTable[target.constructor.name] = [];
        }
        exports.AuditLogRemoveColumnsNameByTable[target.constructor.name].push(propertyKey);
    };
};
exports.AuditLogTableRemoveColumns = AuditLogTableRemoveColumns;
function AuditLogSameTableReference(ReferenceTableName) {
    return function (target, propertyKey) {
        if (!exports.AuditLogSameTableReferenceName[target.constructor.name]) {
            exports.AuditLogSameTableReferenceName[target.constructor.name] = [{ table: ReferenceTableName }];
            exports.AuditLogSameTableReferenceName[target.constructor.name][1] = [];
        }
        exports.AuditLogSameTableReferenceName[target.constructor.name][1].push(propertyKey);
    };
}
;
function AuditLogIdentity(ReferenceTableName = "main.", ISPorperty = true) {
    return function (target, propertyKey) {
        if (!exports.AuditLogIdentityName[target.constructor.name]) {
            exports.AuditLogIdentityName[target.constructor.name] = "";
        }
        exports.AuditLogIdentityName[target.constructor.name] = ReferenceTableName + (ISPorperty ? propertyKey : '');
    };
}
;
function AuditLogChangeTableReference(ReferenceTableName) {
    return function (target, propertyKey) {
        if (!exports.AuditLogChangeTableReferenceName[target.constructor.name]) {
            exports.AuditLogChangeTableReferenceName[target.constructor.name] = [{ table: ReferenceTableName }];
            exports.AuditLogChangeTableReferenceName[target.constructor.name][1] = [];
        }
        exports.AuditLogChangeTableReferenceName[target.constructor.name][1].push(propertyKey);
    };
}
;
//# sourceMappingURL=AuditLog.decorators.js.map