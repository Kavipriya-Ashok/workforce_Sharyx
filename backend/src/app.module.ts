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

@Module({
  imports: [
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
        host: _ConfigService.get("Database.Host"),
        port: _ConfigService.get("Database.Port"),
        username: _ConfigService.get("Database.User"),
        password: _ConfigService.get("Database.Password"),
        database: _ConfigService.get("Database.Name"),
        synchronize: _ConfigService.get("Database.Sync"),
        keepConnectionAlive: true,
        entities: [__dirname + "/Database/**/*.{ts,js}"],
        logger: "advanced-console",
        logging: _ConfigService.get("Database.LOG"),
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
        secret: _ConfigService.get("JWT.SecertToken"),
        signOptions: { expiresIn: _ConfigService.get("JWT.ExpiresIn") },
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
    CacheService,
    {
      provide: "REDIS_CLIENT",
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        });
      },
    },
    CacheService,
  ],
  exports: [AuthService, EncryptionService],
})
export class AppModule {}
