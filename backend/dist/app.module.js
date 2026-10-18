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
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const Configuration_1 = __importDefault(require("./Config/Configuration"));
const platform_express_1 = require("@nestjs/platform-express");
const ioredis_1 = require("ioredis");
const event_emitter_1 = require("@nestjs/event-emitter");
const nestjs_cls_1 = require("nestjs-cls");
const Cache_service_1 = require("./Service/Cache.service");
const AutoNumber_controller_1 = require("./Controller/Admin/AutoNumber.controller");
const Login_controller_1 = require("./Controller/Auth/Login.controller");
const User_controller_1 = require("./Controller/Admin/User.controller");
const UserRole_controller_1 = require("./Controller/Admin/UserRole.controller");
const EmailConfig_controller_1 = require("./Controller/Admin/EmailConfig.controller");
const Country_controller_1 = require("./Controller/Admin/Country.controller");
const Currency_controller_1 = require("./Controller/Admin/Currency.controller");
const Company_controller_1 = require("./Controller/Admin/Company.controller");
const Auth_service_1 = require("./Service/Auth/Auth.service");
const User_service_1 = require("./Service/Admin/User.service");
const UserRole_service_1 = require("./Service/Admin/UserRole.service");
const Email_service_1 = require("./Service/Email.service");
const EmailConfig_service_1 = require("./Service/Admin/EmailConfig.service");
const Country_service_1 = require("./Service/Admin/Country.service");
const Currency_service_1 = require("./Service/Admin/Currency.service");
const Company_service_1 = require("./Service/Admin/Company.service");
const Common_service_1 = require("./Service/Common.service");
const JwtStrategy_service_1 = require("./Service/Auth/JwtStrategy.service");
const ErrorLog_controller_1 = require("./Controller/Admin/ErrorLog.controller");
const AuditLog_controller_1 = require("./Controller/Admin/AuditLog.controller");
const ErrorLog_service_1 = require("./Service/Admin/ErrorLog.service");
const AuditLog_service_1 = require("./Service/Admin/AuditLog.service");
const Exception_helper_1 = require("./Helper/Exception.helper");
const Mailer_service_1 = require("./Service/Mailer.service");
const Encryption_service_1 = require("./Service/Encryption.service");
const CommonSeeder_service_1 = require("./Database/Seeds/CommonSeeder.service");
const whatsapp_module_1 = require("./WhatsApp/whatsapp.module");
const email_module_1 = require("./Email/email.module");
const Lead_module_1 = require("./Module/Lead.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            whatsapp_module_1.WhatsAppModule,
            email_module_1.EmailModule,
            Lead_module_1.LeadModule,
            nestjs_cls_1.ClsModule,
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: __dirname + "/client",
                exclude: ["/api/*", "swagger"],
            }),
            event_emitter_1.EventEmitterModule.forRoot({ maxListeners: 0 }),
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [Configuration_1.default] }),
            platform_express_1.MulterModule.register(),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (_ConfigService) => {
                    var _a, _b;
                    return ({
                        type: "postgres",
                        host: _ConfigService.get("Database.Host") || process.env.DB_HOST || "localhost",
                        port: Number(_ConfigService.get("Database.Port") || process.env.DB_PORT) || 5432,
                        username: _ConfigService.get("Database.User") || process.env.DB_USER || "postgres",
                        password: String(_ConfigService.get("Database.Password") || process.env.DB_PASS || "postgres"),
                        database: _ConfigService.get("Database.Name") || process.env.DB_NAME || "postgres",
                        synchronize: (_a = _ConfigService.get("Database.Sync")) !== null && _a !== void 0 ? _a : true,
                        keepConnectionAlive: true,
                        entities: [__dirname + "/Database/**/*.{ts,js}"],
                        logger: "advanced-console",
                        logging: (_b = _ConfigService.get("Database.LOG")) !== null && _b !== void 0 ? _b : false,
                        bigNumberStrings: false,
                        supportBigNumbers: true,
                        dateStrings: true,
                        timezone: "local",
                    });
                },
                inject: [config_1.ConfigService],
            }),
            passport_1.PassportModule.register({
                defaultStrategy: "jwt",
                session: true,
                property: "user",
            }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (_ConfigService) => ({
                    secret: _ConfigService.get("JWT.SecertToken") || "sharyx_jwt_secret_token_secure_key_2026",
                    signOptions: { expiresIn: _ConfigService.get("JWT.ExpiresIn") || "7d" },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [
            Login_controller_1.LoginController,
            User_controller_1.UserController,
            UserRole_controller_1.UserRoleController,
            EmailConfig_controller_1.EmailConfigController,
            Country_controller_1.CountryController,
            Currency_controller_1.CurrencyController,
            Company_controller_1.CompanyController,
            ErrorLog_controller_1.ErrorLogController,
            AuditLog_controller_1.AuditLogController,
            AutoNumber_controller_1.AutoNumberController,
        ],
        providers: [
            Auth_service_1.AuthService,
            User_service_1.UserService,
            UserRole_service_1.UserRoleService,
            Email_service_1.EmailService,
            EmailConfig_service_1.EmailConfigService,
            Country_service_1.CountryService,
            Currency_service_1.CurrencyService,
            Company_service_1.CompanyService,
            Common_service_1.CommonService,
            JwtStrategy_service_1.JwtStrategy,
            ErrorLog_service_1.ErrorLogService,
            AuditLog_service_1.AuditLogService,
            {
                provide: core_1.APP_FILTER,
                useClass: Exception_helper_1.ExceptionHelper,
            },
            Mailer_service_1.MailerService,
            Encryption_service_1.EncryptionService,
            CommonSeeder_service_1.CommonSeederService,
            Cache_service_1.CacheService,
            {
                provide: "REDIS_CLIENT",
                useFactory: () => {
                    const redisPort = Number(process.env.REDIS_PORT);
                    const validPort = !isNaN(redisPort) && redisPort > 0 ? redisPort : 6379;
                    const redisHost = process.env.REDIS_HOST || "127.0.0.1";
                    if (process.env.REDIS_ENABLE === "false" || !process.env.REDIS_PORT) {
                        return {
                            keys: async () => [],
                            mget: async () => [],
                            set: async () => "OK",
                            del: async () => 1,
                            on: () => { },
                        };
                    }
                    return new ioredis_1.Redis({
                        host: redisHost,
                        port: validPort,
                        lazyConnect: true,
                        retryStrategy: () => null,
                    });
                },
            },
        ],
        exports: [Auth_service_1.AuthService, Encryption_service_1.EncryptionService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map