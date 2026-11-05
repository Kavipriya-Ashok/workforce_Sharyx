import { BadRequestException, PipeTransform, ValidationPipe } from '@nestjs/common';
import { SafeBodyPipe } from './SafeBody.pipe';

/**
 * Pipes for endpoints whose DTOs are fully decorated. The app-wide ValidationPipe is NOT global-whitelist
 * (84 of 212 DTO properties elsewhere have no validator and would be stripped), so every onboarding / integration /
 * profile endpoint opts in explicitly:  @UsePipes(...strictPipes())
 *
 *  - SafeBodyPipe: the body must be a JSON object (empty -> {}), no NUL bytes, bounded nesting
 *  - ValidationPipe: whitelist + transform; unknown fields are dropped, bad values are a 400 (never a 500)
 */
export const strictPipes = (): PipeTransform[] => [
  new SafeBodyPipe(),
  new ValidationPipe({
    whitelist: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) =>
      new BadRequestException(errors.map((e) => Object.values(e.constraints || { x: 'Invalid value' })[0]).join('\n')),
  }),
];
