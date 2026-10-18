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
exports.CountryModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../Base.model");
class CountryModel extends Base_model_1.BaseModel {
}
exports.CountryModel = CountryModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Country name required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], CountryModel.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Country code required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], CountryModel.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Currency id required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], CountryModel.prototype, "currency_id", void 0);
//# sourceMappingURL=Country.model.js.map