import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ApiError, apiErrors } from './api-error';

export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ApiError({
        ...apiErrors.validation,
        details: result.error.issues.map((issue) => ({
          field: [metadata.data ?? '', ...issue.path].filter((part) => part !== '').join('.'),
          reasons: [issue.code],
        })),
      });
    }
    return result.data;
  }
}
