import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { CurrentTenant, CurrentUser } from '@Helper/Common.helper';
import { strictPipes } from '@Helper/StrictValidation';
import { IntegrationsService } from '@Service/Integrations/Integrations.service';
import { INTEGRATION_TYPES, IntegrationType } from '@Service/Integrations/IntegrationStatus';
import { JwtAuthGuard } from '@Service/Auth/JwtAuthGuard.service';
import { TenantContextGuard } from '@Service/Auth/TenantContext.guard';
import { ProfileService } from '@Service/Onboarding/Profile.service';
import { UpdateProfileDto } from '@Model/Integrations/Integrations.model';

const parseType = (raw: string): IntegrationType => {
  if (!(INTEGRATION_TYPES as readonly string[]).includes(raw)) {
    throw new BadRequestException(`Unknown integration "${String(raw).slice(0, 40)}". Use one of: ${INTEGRATION_TYPES.join(', ')}.`);
  }
  return raw as IntegrationType;
};

/**
 * Unified integration status. The tenant ALWAYS comes from the verified JWT (TenantContextGuard pins it; a spoofed
 * x-tenant-id / ?tenantId= is ignored). Responses never contain a secret - only status, plain-language reasons and
 * non-secret display values.
 */
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: 'Integrations', version: '1' })
@ApiTags('Integrations')
export class IntegrationsController extends JWTAuthController {
  constructor(private readonly integrations: IntegrationsService) {
    super();
  }

  @Get('Status')
  async status(@CurrentTenant() tenantId: string | null) {
    return this.SendResponseData(await this.integrations.getStatus(tenantId));
  }

  @Post(':type/Test')
  async test(@Param('type') type: string, @CurrentTenant() tenantId: string | null, @CurrentUser() userId: string) {
    return this.SendResponseData(await this.integrations.test(tenantId, parseType(type), userId));
  }

  @Post(':type/Disconnect')
  async disconnect(@Param('type') type: string, @CurrentTenant() tenantId: string | null, @CurrentUser() userId: string) {
    return this.SendResponseData(await this.integrations.disconnect(tenantId, parseType(type), userId));
  }
}

/** Company profile (name, email, website, address, industry, size, logo) for the Profile page. */
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: 'Profile', version: '1' })
@ApiTags('Profile')
export class ProfileController extends JWTAuthController {
  constructor(private readonly profile: ProfileService) {
    super();
  }

  @Get()
  async get(@CurrentTenant() tenantId: string | null) {
    return this.SendResponseData(await this.profile.get(tenantId));
  }

  @Put()
  @UsePipes(...strictPipes())
  async update(@Body() body: UpdateProfileDto, @CurrentTenant() tenantId: string | null, @CurrentUser() userId: string) {
    return this.SendResponseData(await this.profile.update(tenantId, userId as any, body));
  }
}
