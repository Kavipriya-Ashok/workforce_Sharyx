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
exports.PaginationModel = exports.BaseModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class BaseModel {
}
exports.BaseModel = BaseModel;
__decorate([
    (0, class_validator_1.Allow)(),
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], BaseModel.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.Allow)(),
    (0, swagger_1.ApiProperty)({ default: true, required: false }),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], BaseModel.prototype, "status", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], BaseModel.prototype, "created_by_id", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], BaseModel.prototype, "updated_by_id", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], BaseModel.prototype, "created_on", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], BaseModel.prototype, "updated_on", void 0);
class PaginationModel {
    constructor() {
        this.take = 10;
        this.skip = 0;
        this.keyword = "";
    }
}
exports.PaginationModel = PaginationModel;
__decorate([
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationModel.prototype, "take", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationModel.prototype, "skip", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], PaginationModel.prototype, "keyword", void 0);
//# sourceMappingURL=Base.model.js.map