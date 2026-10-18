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
exports.ErrorLogDeleteModel = exports.ErrorLogLazyLoadModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const Common_helper_1 = require("../../Helper/Common.helper");
const Base_model_1 = require("../Base.model");
class ErrorLogLazyLoadModel extends Base_model_1.PaginationModel {
}
exports.ErrorLogLazyLoadModel = ErrorLogLazyLoadModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "User id required" }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ErrorLogLazyLoadModel.prototype, "user_id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Start date required" }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Transform)(({ value }) => (0, Common_helper_1.DBDateTimeStart)(value), { toClassOnly: false }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], ErrorLogLazyLoadModel.prototype, "start_date", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "End date required" }),
    (0, class_transformer_1.Transform)(({ value }) => (0, Common_helper_1.DBDateTimeEnd)(value), { toClassOnly: false }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], ErrorLogLazyLoadModel.prototype, "end_date", void 0);
class ErrorLogDeleteModel {
}
exports.ErrorLogDeleteModel = ErrorLogDeleteModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Password required" }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ErrorLogDeleteModel.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Start date required" }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Transform)(({ value }) => (0, Common_helper_1.DBDateTimeEnd)(value), { toClassOnly: false }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], ErrorLogDeleteModel.prototype, "as_of_date", void 0);
//# sourceMappingURL=ErrorLog.model.js.map