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
exports.ChangePasswordModel = exports.ResetPasswordModel = exports.ForgotPasswordModel = exports.UserModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../Base.model");
class UserModel extends Base_model_1.BaseModel {
}
exports.UserModel = UserModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'User role required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "user_role_id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'First name required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "last_name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Invaild Email format' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => !(o.id > "0")),
    (0, class_validator_1.IsNotEmpty)({ message: 'Password required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], UserModel.prototype, "mobile", void 0);
class ForgotPasswordModel {
}
exports.ForgotPasswordModel = ForgotPasswordModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Email required' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Invaild Email format' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ForgotPasswordModel.prototype, "email", void 0);
class ResetPasswordModel {
}
exports.ResetPasswordModel = ResetPasswordModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'User id required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ResetPasswordModel.prototype, "user_id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Reset OTP required' }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ResetPasswordModel.prototype, "reset_otp", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Password required' }),
    (0, class_validator_1.MinLength)(6, {
        message: 'Password length mininum 6 characters',
    }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ResetPasswordModel.prototype, "password", void 0);
class ChangePasswordModel {
}
exports.ChangePasswordModel = ChangePasswordModel;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Password required' }),
    (0, class_validator_1.MinLength)(6, {
        message: 'Password length mininum 6 characters',
    }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ChangePasswordModel.prototype, "old_password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Password required' }),
    (0, class_validator_1.MinLength)(6, {
        message: 'Password length mininum 6 characters',
    }),
    (0, swagger_1.ApiProperty)({ required: true }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], ChangePasswordModel.prototype, "password", void 0);
//# sourceMappingURL=User.model.js.map