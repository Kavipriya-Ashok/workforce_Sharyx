import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Runs BEFORE the ValidationPipe on public endpoints. Guarantees the body is a JSON object, and
 * rejects NUL bytes anywhere inside it (PostgreSQL cannot store \u0000 in text, which would
 * otherwise surface as a 500). An empty/absent body becomes {} so the DTO reports the missing
 * fields as a normal 400.
 */
@Injectable()
export class SafeBodyPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    if (value === null || value === undefined || value === '') return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Request body must be a JSON object');
    }
    if (hasNul(value, 0)) throw new BadRequestException('Request contains invalid characters');
    return value;
  }
}

function hasNul(v: any, depth: number): boolean {
  if (depth > 8) return true; // absurdly nested -> treat as invalid
  if (typeof v === 'string') return v.includes('\u0000');
  if (Array.isArray(v)) return v.some((x) => hasNul(x, depth + 1));
  if (v && typeof v === 'object') {
    return Object.entries(v).some(([k, x]) => k.includes('\u0000') || hasNul(x, depth + 1));
  }
  return false;
}
