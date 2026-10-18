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
exports.UserLoginValidationModel = exports.UserLoginModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class UserLoginModel {
}
exports.UserLoginModel = UserLoginModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Email required' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Invaild email format' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserLoginModel.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Password required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserLoginModel.prototype, "password", void 0);
class UserLoginValidationModel {
}
exports.UserLoginValidationModel = UserLoginValidationModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'User id required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserLoginValidationModel.prototype, "user_id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'OTP required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserLoginValidationModel.prototype, "otp", void 0);
//# sourceMappingURL=UserLogin.model.js.map