import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { company } from '@Database/Table/Admin/company';
import { UpdateProfileDto } from '@Model/Integrations/Integrations.model';

/** Company profile shown/edited on /admin/profile. Strictly the caller's own tenant (from the JWT). */
@Injectable()
export class ProfileService {
  private async load(tenantId: string | null): Promise<company> {
    if (!tenantId || tenantId === 'all' || tenantId === 'default') {
      throw new BadRequestException('Select a specific tenant to view its profile.');
    }
    const c = await company.findOne({ where: { id: tenantId } });
    if (!c) throw new NotFoundException('Tenant not found');
    return c;
  }

  private toResponse(c: company) {
    const od: Record<string, any> = c.onboarding_data || {};
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      website: c.website || '',
      address: c.address || '',
      postal_code: c.postal_code || '',
      industry: c.industry || '',
      company_size: c.company_size || '',
      logo_url: typeof od.logo_url === 'string' ? od.logo_url : '',
      onboarding_completed: !!c.onboarding_completed,
      updated_on: c.updated_on || null,
    };
  }

  async get(tenantId: string | null) {
    return this.toResponse(await this.load(tenantId));
  }

  async update(tenantId: string | null, userId: string, dto: UpdateProfileDto) {
    const c = await this.load(tenantId);
    if (dto.name !== undefined) c.name = dto.name;
    if (dto.email !== undefined) c.email = dto.email;
    if (dto.website !== undefined) c.website = dto.website || (null as any);
    if (dto.address !== undefined) c.address = dto.address;
    if (dto.postal_code !== undefined) c.postal_code = dto.postal_code;
    if (dto.industry !== undefined) c.industry = dto.industry || (null as any);
    if (dto.company_size !== undefined) c.company_size = dto.company_size || (null as any);
    // keep the wizard answers in sync so the profile and the AI "Brain" see the same values
    const od: Record<string, any> = { ...(c.onboarding_data || {}) };
    if (dto.name !== undefined) od.company_name = dto.name;
    if (dto.email !== undefined) od.business_email = dto.email;
    if (dto.website !== undefined) od.website = dto.website;
    if (dto.industry !== undefined) od.industry = dto.industry;
    if (dto.company_size !== undefined) od.company_size = dto.company_size;
    if (dto.logo_url !== undefined) od.logo_url = dto.logo_url;
    c.onboarding_data = od;
    c.updated_by_id = userId && userId !== '0' ? userId : (undefined as any);
    c.updated_on = new Date();
    await c.save();
    return this.toResponse(c);
  }
}
