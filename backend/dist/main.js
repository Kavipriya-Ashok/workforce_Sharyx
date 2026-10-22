"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const compression_1 = __importDefault(require("compression"));
const errorhandler_1 = __importDefault(require("errorhandler"));
const express_1 = require("express");
const common_1 = require("@nestjs/common");
const passport_1 = __importDefault(require("passport"));
const Exception_helper_1 = require("./Helper/Exception.helper");
const CommonSeeder_service_1 = require("./Database/Seeds/CommonSeeder.service");
const config_1 = require("@nestjs/config");
const express_2 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: { origin: "*", exposedHeaders: "*" },
    });
    app.enableShutdownHooks();
    app.setGlobalPrefix("api", {
        exclude: ["webhook/whatsapp"],
    });
    app.enableVersioning({
        type: common_1.VersioningType.URI,
    });
    app.use((req, res, next) => {
        if (req.url && (req.url.startsWith("/api/webhook/whatsapp") || req.url.startsWith("/webhook/whatsapp"))) {
            req.url = req.url
                .replace("/api/webhook/whatsapp", "/api/v1/WhatsApp/Webhook")
                .replace("/webhook/whatsapp", "/api/v1/WhatsApp/Webhook");
        }
        if (req.url && (req.url.startsWith("/api/webhook/voice") || req.url.startsWith("/webhook/voice"))) {
            req.url = req.url
                .replace("/api/webhook/voice", "/api/v1/Voice/Webhook")
                .replace("/webhook/voice", "/api/v1/Voice/Webhook");
        }
        if (req.url && req.url.toLowerCase().startsWith("/api/voice") && !req.url.toLowerCase().startsWith("/api/v1/voice")) {
            req.url = req.url.replace(/\/api\/voice/i, "/api/v1/Voice");
        }
        next();
    });
    app.use((0, compression_1.default)());
    app.use((0, errorhandler_1.default)());
    app.use((0, express_1.urlencoded)({ limit: "500mb", extended: true }));
    app.use((0, express_2.json)({ limit: "500mb" }));
    app.use(passport_1.default.initialize());
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
    app.useGlobalFilters(new Exception_helper_1.ExceptionHelper());
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Boiler Plate")
        .addBearerAuth()
        .setDescription("BoilerPlate API Description")
        .setVersion("1.0")
        .setExternalDoc("Postman Collection", "/swagger-json")
        .setContact("BoilerPlate", "https://Demo", "Demo@Demo")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("swagger", app, document, {
        swaggerOptions: { tagsSorter: "alpha", enableSearch: true },
    });
    const _ConfigService = app.get(config_1.ConfigService);
    await app.listen(_ConfigService.get("Port") || 8000);
    if (_ConfigService.get("Database.Seed") == "true") {
        const _CommonSeederService = app.get(CommonSeeder_service_1.CommonSeederService);
        await _CommonSeederService.Run();
    }
}
bootstrap();
//# sourceMappingURL=main.js.map