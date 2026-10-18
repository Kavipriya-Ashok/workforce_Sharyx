"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("typeorm");
const jsonDiff = __importStar(require("json-diff"));
const influxdb_client_1 = require("@influxdata/influxdb-client");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const AuditLog_model_1 = require("../../Model/Admin/AuditLog.model");
const AuditLog_decorators_1 = require("../../Helper/AuditLog.decorators");
const audit_log_1 = require("../../Database/Table/Admin/audit_log");
let AuditLogService = class AuditLogService {
    constructor(_EventEmitter, _DataSource) {
        this._EventEmitter = _EventEmitter;
        this._DataSource = _DataSource;
        this.RemoveColumnsName = AuditLog_decorators_1.AuditLogRemoveColumnsName;
        this.RemoveColumnsNameByTable = AuditLog_decorators_1.AuditLogRemoveColumnsNameByTable;
        this.SameReferenceColumn = AuditLog_decorators_1.AuditLogSameTableReferenceName;
        this.LogTableIdentifierName = AuditLog_decorators_1.AuditLogIdentityName;
        this.ChangeTableReferenceName = AuditLog_decorators_1.AuditLogChangeTableReferenceName;
        this.DB = process.env.INFLUX_URL
            ? new influxdb_client_1.InfluxDB({
                url: process.env.INFLUX_URL,
                token: process.env.INFLUX_TOKEN || "",
            })
            : null;
        this.writeApi = this.DB && process.env.INFLUX_ORG && process.env.INFLUX_BUCKET
            ? this.DB.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET)
            : null;
        this.queryApi = this.DB && process.env.INFLUX_ORG
            ? this.DB.getQueryApi(process.env.INFLUX_ORG)
            : null;
    }
    AuditEmitEvent(AuditLogData) {
        if (process.env.AUDIT_LOG === "true") {
            this._EventEmitter.emit(AuditLogEnum_1.EventNameEnum.AuditLog, AuditLogData);
        }
    }
    async GenerateQuery(table, action_type, ids, req) {
        var _a, _b;
        const databaseName = process.env.DB_NAME;
        let TableColumns = await this._DataSource.manager.query(`
  SELECT column_name AS columns
  FROM information_schema.columns
  WHERE table_catalog = '${databaseName}'
    AND table_name = '${table}'
    AND table_schema = 'public';
`);
        if (!TableColumns || TableColumns.length === 0) {
            throw new Error(`No columns found for table '${table}' in schema '${databaseName}'.`);
        }
        const RemoveColumnsName = Array.isArray(this.RemoveColumnsName)
            ? this.RemoveColumnsName
            : [];
        const RemoveColumnsByTable = Array.isArray((_a = this.RemoveColumnsNameByTable) === null || _a === void 0 ? void 0 : _a[table])
            ? this.RemoveColumnsNameByTable[table]
            : [];
        TableColumns = TableColumns.filter((o) => o.columns !== undefined);
        const JsonObjectFilter = TableColumns.filter((o) => !RemoveColumnsName.includes(o.columns) &&
            !RemoveColumnsByTable.includes(o.columns));
        if (JsonObjectFilter.length === 0) {
            throw new Error(`No valid columns found for JSON object generation for table '${table}'.`);
        }
        const json_object = JsonObjectFilter.map((o) => `'${o.columns}', COALESCE(main.${o.columns}, '')`);
        const json_object_query = `json_object(${json_object.join(", ")})`;
        const tableIdentifier = (_b = this.LogTableIdentifierName) === null || _b === void 0 ? void 0 : _b[table];
        if (!tableIdentifier) {
            throw new Error(`LogTableIdentifierName for table '${table}' is not defined.`);
        }
        const isNestedColumn = tableIdentifier.includes(".");
        const columnName = isNestedColumn
            ? tableIdentifier.split(".")[1]
            : tableIdentifier;
        const DynamicQuery = `
    SELECT
        main.id AS performed_module_id,
        '${table}' AS performed_type,
        '${action_type}' AS performed_action,
        ${tableIdentifier} AS performed_module_name,
        '${columnName}' AS performed_module_header_name,
        ${json_object_query} AS performed_parameter,
        COALESCE(main.updated_by_id, main.created_by_id) AS performed_by_id,
        COALESCE(main.updated_on, main.created_on) AS performed_on,
        COALESCE(
            NULLIF(CONCAT(usr.first_name, ' ', COALESCE(usr.last_name, '')), ' '),
            usr.email
        ) AS performed_by,
        '1' AS performed_ipaddress,
        '11f' AS performed_coordinates
    FROM
        ${table} AS main
    LEFT JOIN
        "user" AS usr
    ON usr.id = COALESCE(main.updated_by_id, main.created_by_id)
    WHERE
        main.id IN (${ids.map((id) => `'${id}'::uuid`).join(",")});
`;
        return DynamicQuery;
    }
    async GetLastAddedLog(PerformedType, PrimaryId) {
        try {
            const GetLastEventLog = new Promise((resolve, reject) => {
                const result = [];
                const observerdata = {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        result.push({
                            performed_action: o.performed_action,
                            performed_by: o.performed_by,
                            performed_by_id: o.performed_by_id,
                            performed_module_name: o.performed_module_name,
                            performed_module_header_name: o.performed_module_header_name,
                            performed_module_id: o.performed_module_id,
                            performed_on: o.performed_on,
                            performed_type: o.performed_type,
                            performed_ipaddress: o.performed_ipaddress,
                            performed_coordinates: o.performed_coordinates,
                            performed_parameter: JSON.parse(o._value),
                        });
                    },
                    error(error) {
                        reject(error);
                    },
                    complete() {
                        resolve(result[0] || null);
                    },
                };
                const startdate = new Date();
                startdate.setFullYear(startdate.getFullYear() - 100);
                const query = `
          from(bucket: "${process.env.INFLUX_BUCKET}")
          |> range(start: ${startdate.toISOString()}, stop: ${new Date().toISOString()})
          |> filter(fn: (r) => r["_measurement"] == "${process.env.INFLUX_DB}")
          |> filter(fn: (r) => r["performed_type"] == "${PerformedType}")
          |> filter(fn: (r) => r["performed_module_id"] == "${PrimaryId}")
          |> group()
          |> sort(columns: ["performed_on"], desc: true)
          |> limit(n: 1)
        `;
                this.queryApi.queryRows(query, observerdata);
            });
            return await GetLastEventLog;
        }
        catch (e) {
            throw new Error(e);
        }
    }
    async Insert(AuditLogData, req) {
        var _a, _b;
        try {
            if (AuditLogData.ActionType === AuditLogEnum_1.LogActionEnum.Delete) {
                for (const DeletedRecordId of AuditLogData.PrimaryId) {
                    const LastUpdatedOrInserted = await this.GetLastAddedLog(AuditLogData.PerformedType, DeletedRecordId);
                    if (LastUpdatedOrInserted) {
                        for (const key of Object.keys(LastUpdatedOrInserted["performed_parameter"])) {
                            if (typeof LastUpdatedOrInserted["performed_parameter"][key] ===
                                "object") {
                                LastUpdatedOrInserted["performed_parameter"][key] =
                                    (_a = LastUpdatedOrInserted["performed_parameter"][key]) === null || _a === void 0 ? void 0 : _a.__new;
                            }
                        }
                        const dataPoint = new influxdb_client_1.Point(process.env.INFLUX_DB)
                            .tag("performed_by", LastUpdatedOrInserted.performed_by)
                            .tag("performed_by_id", LastUpdatedOrInserted.performed_by_id)
                            .tag("performed_on", new Date().toISOString())
                            .tag("performed_module_name", LastUpdatedOrInserted.performed_module_name)
                            .tag("performed_module_header_name", LastUpdatedOrInserted.performed_module_header_name)
                            .tag("performed_module_id", LastUpdatedOrInserted.performed_module_id)
                            .tag("performed_type", LastUpdatedOrInserted.performed_type)
                            .tag("performed_action", AuditLogEnum_1.LogActionEnum.Delete)
                            .tag("performed_ipaddress", LastUpdatedOrInserted.performed_ipaddress)
                            .stringField("performed_parameter", JSON.stringify(LastUpdatedOrInserted.performed_parameter));
                        this.writeApi.writePoint(dataPoint);
                        await this.writeApi.flush();
                        const LogData = {
                            performed_by: LastUpdatedOrInserted.performed_by,
                            performed_by_id: LastUpdatedOrInserted.performed_by_id,
                            performed_on: new Date().toISOString(),
                            performed_module_name: LastUpdatedOrInserted.performed_module_name,
                            performed_module_header_name: LastUpdatedOrInserted.performed_module_header_name,
                            performed_module_id: LastUpdatedOrInserted.performed_module_id,
                            performed_type: LastUpdatedOrInserted.performed_type,
                            performed_action: AuditLogEnum_1.LogActionEnum.Delete,
                            performed_ipaddress: LastUpdatedOrInserted.performed_ipaddress,
                            performed_parameter: JSON.stringify(LastUpdatedOrInserted.performed_parameter),
                            created_by_id: LastUpdatedOrInserted.performed_by_id,
                        };
                        try {
                            await audit_log_1.audit_log.save(LogData);
                            console.log("Audit log saved to MySQL successfully.");
                        }
                        catch (error) {
                            console.error("Error saving audit log to MySQL:", error.message);
                        }
                    }
                    else {
                        console.log("Step break: No log found for Deleted Record ID:", DeletedRecordId);
                        break;
                    }
                }
            }
            else if (AuditLogData.ActionType === AuditLogEnum_1.LogActionEnum.Update) {
                const ResultData = await this._DataSource.manager.query(`${await this.GenerateQuery(AuditLogData.PerformedType, AuditLogData.ActionType, AuditLogData.PrimaryId, req)}`);
                for (const Result of ResultData) {
                    if (typeof Result.performed_parameter === "object") {
                        Result.performed_parameter = JSON.stringify(Result.performed_parameter);
                    }
                    if (typeof Result.performed_parameter !== "string") {
                        console.error("performed_parameter is not a valid JSON string:", Result.performed_parameter);
                        throw new Error("Invalid performed_parameter format");
                    }
                    let parsedParameter;
                    try {
                        parsedParameter = JSON.parse(Result.performed_parameter);
                    }
                    catch (error) {
                        console.error("Error parsing performed_parameter:", error, Result.performed_parameter);
                        throw new SyntaxError("Invalid JSON in performed_parameter");
                    }
                    const LastUpdatedOrInserted = await this.GetLastAddedLog(Result.performed_type, Result.performed_module_id);
                    if (LastUpdatedOrInserted) {
                        for (const key of Object.keys(LastUpdatedOrInserted["performed_parameter"])) {
                            if (typeof LastUpdatedOrInserted["performed_parameter"][key] ===
                                "object") {
                                LastUpdatedOrInserted["performed_parameter"][key] =
                                    (_b = LastUpdatedOrInserted["performed_parameter"][key]) === null || _b === void 0 ? void 0 : _b.__new;
                            }
                        }
                        const diffRecord = jsonDiff.diff(LastUpdatedOrInserted.performed_parameter, parsedParameter, { full: true });
                        if (diffRecord) {
                            for (const key of Object.keys(diffRecord)) {
                                if (typeof diffRecord[key] === "object") {
                                    if (diffRecord[key] === null) {
                                        diffRecord[key] = "";
                                    }
                                    else if (!diffRecord[key]["__old"]) {
                                        diffRecord[key]["__old"] = "";
                                    }
                                }
                            }
                            Result.performed_parameter = JSON.stringify(diffRecord);
                        }
                        else {
                            console.log("No changes detected, skipping update log");
                            break;
                        }
                    }
                    const dataPoint = new influxdb_client_1.Point(process.env.INFLUX_DB)
                        .tag("performed_by", Result.performed_by)
                        .tag("performed_by_id", Result.performed_by_id)
                        .tag("performed_on", new Date(Result.performed_on).toISOString())
                        .tag("performed_module_name", Result.performed_module_name)
                        .tag("performed_module_header_name", Result.performed_module_header_name)
                        .tag("performed_module_id", Result.performed_module_id)
                        .tag("performed_type", Result.performed_type)
                        .tag("performed_action", Result.performed_action)
                        .tag("performed_ipaddress", Result.performed_ipaddress)
                        .stringField("performed_parameter", Result.performed_parameter);
                    this.writeApi.writePoint(dataPoint);
                    await this.writeApi.flush();
                    const LogData = {
                        performed_by: Result.performed_by,
                        performed_by_id: Result.performed_by_id,
                        performed_on: new Date(Result.performed_on).toISOString(),
                        performed_module_name: Result.performed_module_name,
                        performed_module_header_name: Result.performed_module_header_name,
                        performed_module_id: Result.performed_module_id,
                        performed_type: Result.performed_type,
                        performed_action: Result.performed_action,
                        performed_ipaddress: Result.performed_ipaddress,
                        performed_parameter: Result.performed_parameter,
                        created_by_id: Result.performed_by_id,
                        created_on: new Date(Result.performed_on).toISOString(),
                    };
                    try {
                        await audit_log_1.audit_log.save(LogData);
                        console.log("Audit log saved to MySQL successfully.");
                    }
                    catch (error) {
                        console.error("Error saving audit log to MySQL:", error.message);
                    }
                }
            }
            else if (AuditLogData.ActionType === AuditLogEnum_1.LogActionEnum.Insert) {
                const ResultData = await this._DataSource.manager.query(`${await this.GenerateQuery(AuditLogData.PerformedType, AuditLogData.ActionType, AuditLogData.PrimaryId, req)}`);
                for (const Result of ResultData) {
                    const LogData = {
                        performed_by: Result.performed_by,
                        performed_by_id: Result.performed_by_id,
                        performed_on: new Date(Result.performed_on).toISOString(),
                        performed_module_name: Result.performed_module_name,
                        performed_module_header_name: Result.performed_module_header_name,
                        performed_module_id: Result.performed_module_id,
                        performed_type: Result.performed_type,
                        performed_action: Result.performed_action,
                        performed_ipaddress: Result.performed_ipaddress,
                        performed_parameter: Result.performed_parameter,
                        created_by_id: Result.performed_by_id,
                        created_on: new Date(Result.performed_on).toISOString(),
                    };
                    try {
                        await audit_log_1.audit_log.save(LogData);
                        console.log("Audit log saved to MySQL successfully.");
                    }
                    catch (error) {
                        console.error("Error saving audit log to MySQL:", error.message);
                    }
                }
            }
        }
        catch (e) {
            console.error("Error in Insert method:", e);
        }
    }
    async LazyLoadList(AuditLogLazyLoadData) {
        var _a, _b, _c;
        let WhereCondition = [];
        let searchKey = ((_a = AuditLogLazyLoadData.keyword) === null || _a === void 0 ? void 0 : _a.length) || 0 > 0
            ? AuditLogLazyLoadData.keyword
            : "";
        WhereCondition["performed_on"] = {
            $gte: AuditLogLazyLoadData.start_date,
            $lt: AuditLogLazyLoadData.end_date,
        };
        if (AuditLogLazyLoadData.user_id > "0") {
            WhereCondition.push(`|> filter(fn: (r) => r["performed_by_id"] == "${AuditLogLazyLoadData.user_id}")`);
        }
        if (((_b = AuditLogLazyLoadData.action) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            WhereCondition.push(`|> filter(fn: (r) => r["performed_action"] == "${AuditLogLazyLoadData.action}")`);
        }
        if (((_c = AuditLogLazyLoadData.module) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            WhereCondition.push(`|> filter(fn: (r) => r["performed_type"] == "${AuditLogLazyLoadData.module}")`);
        }
        if (searchKey) {
            WhereCondition.push(`|> filter(fn: (r) => strings.containsStr(v : strings.toLower(v : r["performed_module_name_string"]), substr: strings.toLower(v : "${searchKey}")))`);
        }
        const GetEventLogList = await new Promise((resolve, reject) => {
            const result = [];
            const observerdata = {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    result.push({
                        performed_action: o.performed_action,
                        performed_by: o.performed_by,
                        performed_by_id: o.performed_by_id,
                        performed_module_name: o.performed_module_name,
                        performed_module_header_name: o.performed_module_header_name,
                        performed_module_id: o.performed_module_id,
                        performed_on: new Date(o.performed_on).toLocaleString(),
                        performed_type: o.performed_type,
                        performed_ipaddress: o.performed_ipaddress,
                        performed_coordinates: o.performed_coordinates,
                        performed_parameter: JSON.parse(o._value),
                    });
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve(result);
                },
            };
            const query = `
  import "strings"
  from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: ${new Date(AuditLogLazyLoadData.start_date).toISOString()}, stop: ${new Date(AuditLogLazyLoadData.end_date).toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "${process.env.INFLUX_DB}")
      |> filter(fn: (r) => r["_field"] == "performed_parameter")
      |> fill(column: "performed_module_name", value: "")
      |> map(fn: (r) => ({ r with performed_module_name_string: string(v: r.performed_module_name) }))
      ${WhereCondition.join("\n")}
      |> group()
      |> sort(columns: ["performed_on"], desc: true)
      |> limit(n: ${AuditLogLazyLoadData.take}, offset: ${AuditLogLazyLoadData.skip})
`;
            this.queryApi.queryRows(query, observerdata);
        });
        const GetEventLogCount = await new Promise((resolve, reject) => {
            let total_count = 0;
            const observercount = {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    total_count = o._value;
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve(total_count);
                },
            };
            const countquery = `
  import "strings"
  from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: ${new Date(AuditLogLazyLoadData.start_date).toISOString()}, stop: ${new Date(AuditLogLazyLoadData.end_date).toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "${process.env.INFLUX_DB}")
      |> fill(column: "performed_module_name", value: "")
      |> map(fn: (r) => ({ r with performed_module_name_string: string(v: r.performed_module_name) }))
      ${WhereCondition.join("\n")}
      |> group()
      |> count(column: "_value")
`;
            this.queryApi.queryRows(countquery, observercount);
        });
        const Result = {};
        Result["data"] = GetEventLogList;
        Result["total_record"] = GetEventLogCount;
        return Result;
    }
    async DetailList(EventLog) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const BooleanColumns = ["is_", "status"];
        EventLog["audit_log_events"] = [];
        for (const AuditLogEvents of Object.keys(EventLog.performed_parameter).filter((o) => !AuditLog_decorators_1.AuditLogRemoveColumnsName.includes(o))) {
            if (EventLog.performed_action == AuditLogEnum_1.LogActionEnum.Insert ||
                EventLog.performed_action == AuditLogEnum_1.LogActionEnum.Delete) {
                if (typeof EventLog.performed_parameter[AuditLogEvents] == "object") {
                    if (AuditLogEvents == EventLog.performed_module_header_name) {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_a = EventLog.performed_parameter[AuditLogEvents]) === null || _a === void 0 ? void 0 : _a.__old) == 1 ? "Yes" : "No") : (_b = EventLog.performed_parameter[AuditLogEvents]) === null || _b === void 0 ? void 0 : _b.__old} </b>`);
                    }
                    else {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} of <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_c = EventLog.performed_parameter[AuditLogEvents]) === null || _c === void 0 ? void 0 : _c.__old) == 1 ? "Yes" : "No") : (_d = EventLog.performed_parameter[AuditLogEvents]) === null || _d === void 0 ? void 0 : _d.__old} </b>`);
                    }
                }
                else {
                    if (AuditLogEvents == EventLog.performed_module_header_name) {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (EventLog.performed_parameter[AuditLogEvents] == 1 ? "Yes" : "No") : EventLog.performed_parameter[AuditLogEvents]}</b>`);
                    }
                    else {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} of <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (EventLog.performed_parameter[AuditLogEvents] == 1 ? "Yes" : "No") : EventLog.performed_parameter[AuditLogEvents]}</b>`);
                    }
                }
            }
            else {
                if (typeof EventLog.performed_parameter[AuditLogEvents] == "object") {
                    if (AuditLogEvents == EventLog.performed_module_header_name) {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_e = EventLog.performed_parameter[AuditLogEvents]) === null || _e === void 0 ? void 0 : _e.__old) == 1 ? "Yes" : "No") : (_f = EventLog.performed_parameter[AuditLogEvents]) === null || _f === void 0 ? void 0 : _f.__old}</b> to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_g = EventLog.performed_parameter[AuditLogEvents]) === null || _g === void 0 ? void 0 : _g.__new) == 1 ? "Yes" : "No") : (_h = EventLog.performed_parameter[AuditLogEvents]) === null || _h === void 0 ? void 0 : _h.__new}</b>`);
                    }
                    else {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} of <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_j = EventLog.performed_parameter[AuditLogEvents]) === null || _j === void 0 ? void 0 : _j.__old) == 1 ? "Yes" : "No") : (_k = EventLog.performed_parameter[AuditLogEvents]) === null || _k === void 0 ? void 0 : _k.__old}</b> to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (((_l = EventLog.performed_parameter[AuditLogEvents]) === null || _l === void 0 ? void 0 : _l.__new) == 1 ? "Yes" : "No") : (_m = EventLog.performed_parameter[AuditLogEvents]) === null || _m === void 0 ? void 0 : _m.__new}</b>`);
                    }
                }
                else {
                    if (AuditLogEvents == EventLog.performed_module_header_name) {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} to <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (EventLog.performed_parameter[AuditLogEvents] == 1 ? "Yes" : "No") : EventLog.performed_parameter[AuditLogEvents]}</b>`);
                    }
                    else {
                        EventLog["audit_log_events"].push(`User <b>${EventLog.performed_by}</b> ${EventLog.performed_action.toUpperCase()} a  <b>${EventLog.performed_type.split("_").join(" ")}</b> ${AuditLogEvents.split("_").join(" ")} of <b>${BooleanColumns.some((o) => AuditLogEvents.includes(o)) ? (EventLog.performed_parameter[AuditLogEvents] == 1 ? "Yes" : "No") : EventLog.performed_parameter[AuditLogEvents]}</b>`);
                    }
                }
            }
        }
        return EventLog;
    }
    GetColumneName(table, columns) {
        var _a, _b;
        let tablename = "";
        if (!this.ChangeTableReferenceName[table]) {
            tablename = columns.replace("_id", "");
        }
        else if ((_a = this.ChangeTableReferenceName[table][1]) === null || _a === void 0 ? void 0 : _a.find((f) => f.includes(columns))) {
            tablename = this.ChangeTableReferenceName[table][0].table;
        }
        else {
            tablename = columns.replace("_id", "");
        }
        return (_b = this.LogTableIdentifierName[tablename]) === null || _b === void 0 ? void 0 : _b.replace("main.", "");
    }
    GetTableName(table, columns) {
        var _a;
        let tablename = "";
        if (!this.ChangeTableReferenceName[table]) {
            tablename = columns.replace("_id", "");
        }
        else if ((_a = this.ChangeTableReferenceName[table][1]) === null || _a === void 0 ? void 0 : _a.find((f) => f.includes(columns))) {
            tablename = this.ChangeTableReferenceName[table][0].table;
        }
        else {
            tablename = columns.replace("_id", "");
        }
        return tablename;
    }
};
exports.AuditLogService = AuditLogService;
__decorate([
    (0, event_emitter_1.OnEvent)(AuditLogEnum_1.EventNameEnum.AuditLog, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AuditLog_model_1.AuditLogModel, Object]),
    __metadata("design:returntype", Promise)
], AuditLogService.prototype, "Insert", null);
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        typeorm_1.DataSource])
], AuditLogService);
//# sourceMappingURL=AuditLog.service.js.map