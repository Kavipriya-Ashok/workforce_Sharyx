"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let CommonService = class CommonService {
    async TransactionRunningNumber(ModuleType) {
        let ModuleNumberData = {};
        let LastNumber = "1";
    }
    RoundDecimal(value, scale = 2) {
        return Number(value.toFixed(scale));
    }
    GetBase64(FilePath) {
        var bitmap = fs_1.default.readFileSync(path_1.default.resolve(FilePath), 'base64');
        return bitmap;
    }
    AutoGenerateNumber(value) {
        let last_charater = value.charAt(value.length - 1);
        let parsedvalue = parseInt(last_charater);
        if (parsedvalue == null || parsedvalue == undefined || isNaN(parsedvalue)) {
            value = value + "0";
        }
        return this.InvoiceAutoGenerateNext(value);
    }
    InvoiceAutoGenerateNext(invoiceNumber) {
        const array = invoiceNumber.split(/[_/:\/\W/;\\]+/);
        const lastSegment = array.pop() || '';
        const priorSegment = invoiceNumber.substring(0, invoiceNumber.lastIndexOf(lastSegment));
        const nextNumber = this.alphaNumericIncrementer(lastSegment);
        return priorSegment + nextNumber;
    }
    alphaNumericIncrementer(str) {
        if (str && str.length > 0) {
            let invNum = str.replace(/([^a-z0-9]+)/gi, '');
            invNum = invNum.toUpperCase();
            let index = invNum.length - 1;
            while (index >= 0) {
                if (invNum.substring(index, index + 1) === '9') {
                    if (Number(invNum.substring(0, index)) > 0 || invNum.substring(0, index) == '') {
                        invNum = (invNum.substring(0, index) ? invNum.substring(0, index) : '1') + '0' + invNum.substring(index + 1);
                    }
                    else {
                        invNum = (invNum.substring(0, index) ? invNum.substring(0, index) + (!(Number(invNum.substring(index - 1, index)) >= 0) ? '1' : '') : '1') + '0' + invNum.substring(index + 1);
                    }
                }
                else if (invNum.substring(index, index + 1) === 'Z') {
                    invNum = invNum.substring(0, index) + 'A' + invNum.substring(index + 1);
                }
                else {
                    const char = String.fromCharCode(invNum.charCodeAt(index) + 1);
                    if (Number(char) >= 0) {
                        invNum = invNum.substring(0, index) + char + invNum.substring(index + 1);
                    }
                    index = 0;
                }
                index--;
            }
            return invNum;
        }
        else {
            throw new Error('str cannot be empty');
        }
    }
};
exports.CommonService = CommonService;
exports.CommonService = CommonService = __decorate([
    (0, common_1.Injectable)()
], CommonService);
//# sourceMappingURL=Common.service.js.map