import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { apiErrors } from '../../shared/http/api-error';
import { inputSchema } from '../../shared/http/schemas';
import { apiErrorResponseSchema } from '../../shared/http/schemas/api-error.schema';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiResponse({
    status: 503, description: apiErrors.internalError.message, schema: inputSchema(apiErrorResponseSchema),
  })
  async ready(): Promise<{ status: string }> {
    try {
      await this.database.ping();
      return { status: 'ok' };
    } catch (cause) {
      throw new ServiceUnavailableException(apiErrors.internalError.message, { cause });
    }
  }
}
