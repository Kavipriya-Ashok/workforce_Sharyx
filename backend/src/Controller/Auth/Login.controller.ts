import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { ForgotPasswordModel, ResetPasswordModel } from '@Model/Admin/User.model';
import { UserLoginModel } from '@Model/Admin/UserLogin.model';
import { UserService } from '@Service/Admin/User.service';
import { AuthService } from '@Service/Auth/Auth.service';
import { AuthBaseController } from '@Controller/AuthBase.controller';

@Controller({ path: "Auth", version: '1' })
@ApiTags("Auth")
export class LoginController extends AuthBaseController {
  constructor(
    private _AuthService: AuthService,
    private _UserService: UserService
  ) {
    super();
  }

  @Post('Login')
  async UserLogin(@Body() UserLogin: UserLoginModel) {
    const result = await this._AuthService.ValidateUser(UserLogin.email, UserLogin.password);
    return { Type: ResponseEnum.Success, Message: 'Login Successfully', result };
  }

  @Post('SendSignupOtp')
  async SendSignupOtp(@Body() body: { email: string; name?: string }) {
    const result = await this._AuthService.sendSignupOtp(body.email, body.name);
    return { Type: ResponseEnum.Success, Message: result.message, result };
  }

  @Post('VerifySignupOtp')
  async VerifySignupOtp(@Body() body: any) {
    const result = await this._AuthService.verifySignupOtp(body);
    return { Type: ResponseEnum.Success, Message: 'Account verified and registered successfully!', result };
  }

  @Post('GoogleAuth')
  async GoogleAuth(@Body() body: { code?: string; redirect_uri?: string; credential?: string; email?: string; name?: string; picture?: string }) {
    const result = await this._AuthService.googleAuth(body);
    return { Type: ResponseEnum.Success, Message: 'Google authentication successful', result };
  }

  @Post('ForgotPassword')
  async ForgotPassword(@Body() ForgotPasswordData: ForgotPasswordModel) {
    const Result = await this._UserService.ForgotPassword(ForgotPasswordData.email);
    if (Result.status) {
      return this.SendResponse(ResponseEnum.Success, "Forgot password request accepted, please check mail");
    }
    else {
      return this.SendResponse(ResponseEnum.Error, Result.message);
    }
  }

  @Post('ResetPassword')
  async ResetPassword(@Body() ResetPasswordData: ResetPasswordModel) {
    await this._UserService.ResetPassword(ResetPasswordData);
    return this.SendResponse(ResponseEnum.Success, "Password reseted successfully");
  }

}
