import { Controller, Post, Body, UseGuards, UsePipes, ValidationPipe, Req, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { SafeBodyPipe } from '@Helper/SafeBody.pipe';
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  ResendSignupOtpDto,
  ResetPasswordDto,
  SendSignupOtpDto,
  VerifySignupOtpDto,
} from '@Model/Auth/Auth.model';
import { UserService } from '@Service/Admin/User.service';
import { AuthService } from '@Service/Auth/Auth.service';
import { GoogleAuthService } from '@Service/Auth/GoogleAuth.service';
import { JwtAuthGuard } from '@Service/Auth/JwtAuthGuard.service';
import { AuthBaseController } from '@Controller/AuthBase.controller';

/** Per-IP request budget for every /Auth/* route; overridable per environment. */
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
export const AUTH_THROTTLE_TTL_MS = num(process.env.AUTH_THROTTLE_TTL_MS, 60_000);
export const AUTH_THROTTLE_LIMIT = num(process.env.AUTH_THROTTLE_LIMIT, 30);
/** Stricter budget for the endpoints that send e-mail or accept one-time codes. */
const SENSITIVE = { default: { limit: num(process.env.AUTH_THROTTLE_SENSITIVE_LIMIT, 10), ttl: AUTH_THROTTLE_TTL_MS } };

/**
 * Public auth endpoints. Hardened with:
 *  - ThrottlerGuard: per-IP rate limit on every route (plus the per-email lockout inside AuthService)
 *  - SafeBodyPipe + a strict ValidationPipe (whitelist + transform): only declared, valid fields get through,
 *    anything else is a 400 — never a 500 from the database.
 * The strict pipe is scoped to this controller on purpose: many other DTOs in the app have undecorated
 * properties, which a global `whitelist: true` would silently strip.
 */
@Controller({ path: "Auth", version: '1' })
@ApiTags("Auth")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS } })
@UsePipes(
  new SafeBodyPipe(),
  new ValidationPipe({
    whitelist: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) =>
      new BadRequestException(errors.map((e) => Object.values(e.constraints || { x: 'Invalid value' })[0]).join('\n')),
  })
)
export class LoginController extends AuthBaseController {
  constructor(
    private _AuthService: AuthService,
    private _UserService: UserService,
    private _GoogleAuthService: GoogleAuthService
  ) {
    super();
  }

  @Post('Login')
  async UserLogin(@Body() UserLogin: LoginDto) {
    const result = await this._AuthService.ValidateUser(UserLogin.email, UserLogin.password);
    return { Type: ResponseEnum.Success, Message: 'Login Successfully', result };
  }

  /** Server-side logout: revokes every token issued to this user so far (see token_version). */
  @Post('Logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async Logout(@Req() req: any) {
    await this._AuthService.logout(req.user?.user_id);
    return { Type: ResponseEnum.Success, Message: 'Logged out' };
  }

  @Post('SendSignupOtp')
  @Throttle(SENSITIVE)
  async SendSignupOtp(@Body() body: SendSignupOtpDto) {
    const result = await this._AuthService.sendSignupOtp(body.email, body.name);
    return { Type: ResponseEnum.Success, Message: result.message, result };
  }

  @Post('ResendSignupOtp')
  @Throttle(SENSITIVE)
  async ResendSignupOtp(@Body() body: ResendSignupOtpDto) {
    const result = await this._AuthService.resendSignupOtp(body.email);
    return { Type: ResponseEnum.Success, Message: result.message, result };
  }

  @Post('VerifySignupOtp')
  @Throttle(SENSITIVE)
  async VerifySignupOtp(@Body() body: VerifySignupOtpDto) {
    const result = await this._AuthService.verifySignupOtp(body);
    return { Type: ResponseEnum.Success, Message: 'Account verified and registered successfully!', result };
  }

  @Post('GoogleAuth')
  async GoogleAuth(@Body() body: GoogleAuthDto) {
    // Only Google-verifiable inputs are accepted; a caller-supplied email/name is ignored.
    const result = await this._GoogleAuthService.authenticate({
      code: body.code,
      redirect_uri: body.redirect_uri,
      credential: body.credential,
    });
    return { Type: ResponseEnum.Success, Message: 'Google authentication successful', result };
  }

  @Post('ForgotPassword')
  @Throttle(SENSITIVE)
  async ForgotPassword(@Body() ForgotPasswordData: ForgotPasswordDto) {
    // Same answer whether or not the address exists (see UserService.ForgotPassword).
    await this._UserService.ForgotPassword(ForgotPasswordData.email);
    return this.SendResponse(ResponseEnum.Success, "Forgot password request accepted, please check mail");
  }

  @Post('ResetPassword')
  @Throttle(SENSITIVE)
  async ResetPassword(@Body() ResetPasswordData: ResetPasswordDto) {
    await this._UserService.ResetPassword(ResetPasswordData);
    return this.SendResponse(ResponseEnum.Success, "Password reseted successfully");
  }

}
