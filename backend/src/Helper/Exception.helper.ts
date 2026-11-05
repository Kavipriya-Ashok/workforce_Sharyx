import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from "express";
import { error_log } from "@Database/Table/Admin/error_log";
import { ResponseEnum } from "./Enum/ResponseEnum";
import { EmptyUuid } from "./Common.helper";
import { redactSecrets, redactUrl } from "./Redact";

@Catch()
export class ExceptionHelper implements ExceptionFilter {
  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let MessageText: string = "";
    // Database errors (Postgres/TypeORM) carry table/column/SQL detail. Log the real text, but the
    // client only ever gets a generic message (and a 4xx when the input, not the server, was at fault).
    let dbStatus: number | null = null;
    let dbSafeMessage: string | null = null;
    if (exception?.name === "QueryFailedError" || exception?.driverError) {
      const code = String(exception?.code || exception?.driverError?.code || "");
      if (/^22/.test(code)) { dbStatus = 400; dbSafeMessage = "Invalid input"; }
      else if (code === "23505") { dbStatus = 409; dbSafeMessage = "Duplicate record"; }
      else if (/^23/.test(code)) { dbStatus = 409; dbSafeMessage = "The request conflicts with existing data"; }
      else { dbStatus = 500; dbSafeMessage = "Internal server error"; }
    }
    if (exception.code == "ER_DUP_ENTRY") {
      MessageText = "Duplicate record";
    } else if (exception.message?.includes("ER_DUP_ENTRY")) {
      MessageText = "Duplicate record";
    } else if (exception.code == "ER_ROW_IS_REFERENCED") {
      MessageText = "Cannot delete or update used record";
    } else if (exception.message?.includes("ER_ROW_IS_REFERENCED")) {
      MessageText = "Cannot delete or update used record";
    } else if (exception.code == "ER_NO_REFERENCED_ROW_2") {
      var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
      MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
    } else if (exception.message?.includes("ER_NO_REFERENCED_ROW_2")) {
      var matches = exception.message.match("FOREIGN KEY (.*?) REFERENCES");
      MessageText = `${matches[1].replace("(`", "").replace("`)", "")} is invalid`;
    } else {
      if (Array.isArray(exception.response?.message)) {
        MessageText = exception.response.message.join("\n");
      } else if (exception.response?.message) {
        MessageText = exception.response.message;
      } else if (exception.message) {
        MessageText = exception.message;
      } else {
        MessageText = exception.response;
      }
    }
    try {
      await error_log.insert({
        url: redactUrl(response.req?.url || ""),
        ipaddress: response.req?.ip || "",
        message: redactSecrets(String(MessageText || "Error")).slice(0, 1000),
        created_by_id: (response.req as any)?.user?.["user_id"] ?? EmptyUuid,
        created_by_name: (response.req as any)?.user?.["email"] ?? "No User",
        created_on: new Date(),
      });
    } catch {
      // Never crash the server if error_log write fails
    }
    if (!response.headersSent) {
      const statusCode = dbStatus ?? (typeof exception?.getStatus === "function" ? exception.getStatus() : (exception?.status || 500));
      const clientMessage = dbSafeMessage ?? MessageText;
      response
        .status(statusCode)
        .json({ Type: ResponseEnum.Error, Message: clientMessage, message: clientMessage, ok: false });
    }
  }
}
