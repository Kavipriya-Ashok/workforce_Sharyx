import { Body, Controller, Get, Post, Put, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { CurrentTenant, CurrentUser } from '@Helper/Common.helper';
import { strictPipes } from '@Helper/StrictValidation';
import { SaveStepDto } from '@Model/Onboarding/Onboarding.model';
import { JwtAuthGuard } from '@Service/Auth/JwtAuthGuard.service';
import { TenantContextGuard } from '@Service/Auth/TenantContext.guard';
import { OnboardingService } from '@Service/Onboarding/Onboarding.service';

/**
 * Per-tenant onboarding state. The tenant is ALWAYS taken from the verified JWT (TenantContextGuard pins it, so a
 * spoofed x-tenant-id / ?tenantId= / body tenant is ignored). Bodies go through the strict validation pipes: bad
 * input is a 400 with a readable message, never a 500.
 */
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: 'Onboarding', version: '1' })
@ApiTags('Onboarding')
export class OnboardingController extends JWTAuthController {
  constructor(private readonly onboardingService: OnboardingService) {
    super();
  }

  @Get('State')
  async state(@CurrentTenant() tenantId: string | null) {
    return this.SendResponseData(await this.onboardingService.getState(tenantId));
  }

  @Put('Step')
  @UsePipes(...strictPipes())
  async saveStep(@Body() body: SaveStepDto, @CurrentTenant() tenantId: string | null, @CurrentUser() userId: string) {
    return this.SendResponseData(await this.onboardingService.saveStep(tenantId, userId as any, body.step, body.data));
  }

  /** Idempotent: calling it again (double click, second tab) just returns the finished state. */
  @Post('Complete')
  async complete(@CurrentTenant() tenantId: string | null, @CurrentUser() userId: string) {
    return this.SendResponseData(await this.onboardingService.complete(tenantId, userId as any));
  }
}
