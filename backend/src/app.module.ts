import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import Configuration from "./Config/Configuration";
import { MulterModule } from "@nestjs/platform-express";
import { Redis } from "ioredis";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ClsModule } from "nestjs-cls";
import { CacheService } from "./Service/Cache.service";
import { AutoNumberController } from "./Controller/Admin/AutoNumber.controller";
import { LoginController } from "./Controller/Auth/Login.controller";
import { UserController } from "./Controller/Admin/User.controller";
import { UserRoleController } from "./Controller/Admin/UserRole.controller";
import { EmailConfigController } from "./Controller/Admin/EmailConfig.controller";
import { CountryController } from "./Controller/Admin/Country.controller";
import { CurrencyController } from "./Controller/Admin/Currency.controller";
import { CompanyController } from "./Controller/Admin/Company.controller";
import { AuthService } from "./Service/Auth/Auth.service";
import { UserService } from "./Service/Admin/User.service";
import { UserRoleService } from "./Service/Admin/UserRole.service";
import { EmailService } from "./Service/Email.service";
import { EmailConfigService } from "./Service/Admin/EmailConfig.service";
import { CountryService } from "./Service/Admin/Country.service";
import { CurrencyService } from "./Service/Admin/Currency.service";
import { CompanyService } from "./Service/Admin/Company.service";
import { CommonService } from "./Service/Common.service";
import { JwtStrategy } from "./Service/Auth/JwtStrategy.service";
import { ErrorLogController } from "./Controller/Admin/ErrorLog.controller";
import { AuditLogController } from "./Controller/Admin/AuditLog.controller";
import { ErrorLogService } from "./Service/Admin/ErrorLog.service";
import { AuditLogService } from "./Service/Admin/AuditLog.service";
import { ExceptionHelper } from "./Helper/Exception.helper";
import { MailerService } from "./Service/Mailer.service";
import { EncryptionService } from "./Service/Encryption.service";
import { CommonSeederService } from "./Database/Seeds/CommonSeeder.service";
import { PdfGeneratorService } from "./Service/PdfGenerator.service";
import { WhatsAppModule } from "./WhatsApp/whatsapp.module";
import { EmailModule } from "./Email/email.module";
import { LeadModule } from "./Module/Lead.module";
import { AgentOrchestratorModule } from "./AgentOrchestrator/agent-orchestrator.module";
import { VoiceModule } from "./Voice/voice.module";

@Module({
  imports: [
    VoiceModule,
    AgentOrchestratorModule,
    WhatsAppModule,
    EmailModule,
    LeadModule,
    ClsModule,
    ServeStaticModule.forRoot({
      rootPath: __dirname + "/client",
      exclude: ["/api/*", "swagger"],
    }),
    EventEmitterModule.forRoot({ maxListeners: 0 }),
    ConfigModule.forRoot({ isGlobal: true, load: [Configuration] }),
    MulterModule.register(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (_ConfigService: ConfigService) => ({
        type: "postgres",
        host: _ConfigService.get("Database.Host") || process.env.DB_HOST || "localhost",
        port: Number(_ConfigService.get("Database.Port") || process.env.DB_PORT) || 5432,
        username: _ConfigService.get("Database.User") || process.env.DB_USER || "postgres",
        password: String(_ConfigService.get("Database.Password") || process.env.DB_PASS || "postgres"),
        database: _ConfigService.get("Database.Name") || process.env.DB_NAME || "postgres",
        synchronize: _ConfigService.get("Database.Sync") ?? true,
        keepConnectionAlive: true,
        entities: [__dirname + "/Database/**/*.{ts,js}"],
        logger: "advanced-console",
        logging: _ConfigService.get("Database.LOG") ?? false,
        bigNumberStrings: false,
        supportBigNumbers: true,
        dateStrings: true,
        timezone: "local",
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({
      defaultStrategy: "jwt",
      session: true,
      property: "user",
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (_ConfigService: ConfigService) => ({
        secret: _ConfigService.get("JWT.SecertToken") || "sharyx_jwt_secret_token_secure_key_2026",
        signOptions: { expiresIn: _ConfigService.get("JWT.ExpiresIn") || "7d" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    LoginController,
    UserController,
    UserRoleController,
    EmailConfigController,
    CountryController,
    CurrencyController,
    CompanyController,
    ErrorLogController,
    AuditLogController,
    AutoNumberController,
  ],
  providers: [
    AuthService,
    UserService,
    UserRoleService,
    EmailService,
    EmailConfigService,
    CountryService,
    CurrencyService,
    CompanyService,
    CommonService,
    JwtStrategy,
    ErrorLogService,
    AuditLogService,
    {
      provide: APP_FILTER,
      useClass: ExceptionHelper,
    },
    MailerService,
    EncryptionService,
    CommonSeederService,
    PdfGeneratorService,
    CacheService,
    {
      provide: "REDIS_CLIENT",
      useFactory: () => {
        const redisPort = Number(process.env.REDIS_PORT);
        const validPort = !isNaN(redisPort) && redisPort > 0 ? redisPort : 6379;
        const redisHost = process.env.REDIS_HOST || "127.0.0.1";

        if (process.env.REDIS_ENABLE === "false" || !process.env.REDIS_PORT) {
          // Return non-throwing mock client when Redis is disabled
          return {
            keys: async () => [],
            mget: async () => [],
            set: async () => "OK",
            del: async () => 1,
            on: () => {},
          } as any;
        }

        return new Redis({
          host: redisHost,
          port: validPort,
          lazyConnect: true,
          retryStrategy: () => null,
        });
      },
    },
  ],
  exports: [AuthService, EncryptionService, PdfGeneratorService],
})
export class AppModule {}
