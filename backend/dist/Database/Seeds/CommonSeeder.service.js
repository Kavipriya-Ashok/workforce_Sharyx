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
exports.CommonSeederService = void 0;
const typeorm_1 = require("typeorm");
const user_role_1 = require("../Table/Admin/user_role");
const user_1 = require("../Table/Admin/user");
const currency_1 = require("../Table/Admin/currency");
const country_1 = require("../Table/Admin/country");
const company_1 = require("../Table/Admin/company");
const common_1 = require("@nestjs/common");
const Encryption_service_1 = require("../../Service/Encryption.service");
let CommonSeederService = class CommonSeederService {
    constructor(_EncryptionService, _DataSource) {
        this._EncryptionService = _EncryptionService;
        this._DataSource = _DataSource;
        this.UserRoleSeed = async () => {
            await this._DataSource.manager.createQueryBuilder()
                .insert()
                .into(user_role_1.user_role)
                .values([
                { name: 'Super Admin', code: '', created_by_id: "0", created_on: new Date() }
            ])
                .execute();
        };
        this.UserSeed = async () => {
            const UserRoleData = await user_role_1.user_role.findOne({ where: { name: "Super Admin" } });
            await this._DataSource.manager.createQueryBuilder()
                .insert()
                .into(user_1.user)
                .values([
                {
                    user_role_id: UserRoleData.id,
                    email: 'admin@user.com',
                    password: this._EncryptionService.Encrypt('Login123!!'),
                    created_by_id: "0",
                    created_on: new Date()
                }
            ])
                .execute();
        };
        this.CurrencySeed = async () => {
            await this._DataSource.manager.createQueryBuilder()
                .insert()
                .into(currency_1.currency)
                .values([
                {
                    name: 'Pound sterling',
                    code: 'GBP',
                    symbol: '£',
                    created_by_id: "0",
                    created_on: new Date()
                }
            ])
                .execute();
        };
        this.CountrySeed = async () => {
            const CurrencyData = await currency_1.currency.findOne({ where: { name: "Pound sterling" } });
            await this._DataSource.manager.createQueryBuilder()
                .insert()
                .into(country_1.country)
                .values([
                {
                    name: 'United Kingdom',
                    code: 'UK',
                    currency_id: CurrencyData.id,
                    created_by_id: "0",
                    created_on: new Date()
                }
            ])
                .execute();
        };
        this.CompanySeed = async () => {
            const CurrencyData = await currency_1.currency.findOne({ where: { name: "Pound sterling" } });
            const CountryData = await country_1.country.findOne({ where: { name: "United Kingdom" } });
            await this._DataSource.manager.createQueryBuilder()
                .insert()
                .into(company_1.company)
                .values([
                {
                    name: "BoilerPlate",
                    address: "BoilerPlate",
                    postal_code: "BoilerPlate",
                    country_id: CountryData.id,
                    currency_id: CurrencyData.id,
                    email: "Demo",
                    website: "Demo",
                    invoice_footer: "BoilerPlate",
                    created_by_id: "0",
                    created_on: new Date()
                }
            ])
                .execute();
        };
    }
    async Run() {
        try {
            await this.UserRoleSeed();
        }
        catch (e) {
            console.log(e);
        }
        try {
            await this.UserSeed();
        }
        catch (e) {
            console.log(e);
        }
        try {
            await this.CurrencySeed();
        }
        catch (e) {
            console.log(e);
        }
        try {
            await this.CountrySeed();
        }
        catch (e) {
            console.log(e);
        }
        try {
            await this.CompanySeed();
        }
        catch (e) {
            console.log(e);
        }
    }
};
exports.CommonSeederService = CommonSeederService;
exports.CommonSeederService = CommonSeederService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        typeorm_1.DataSource])
], CommonSeederService);
//# sourceMappingURL=CommonSeeder.service.js.map