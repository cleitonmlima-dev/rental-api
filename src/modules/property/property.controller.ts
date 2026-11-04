import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponses, ApiQuerySchema, creationSchema, inputSchema, pageSchema, propertySchema,
} from '../../shared/http/schemas';
import { uuidSchema } from '../../shared/http/schemas/primitives.schema';
import { ZodValidationPipe } from '../../shared/http/validation';
import type { CreatePropertyDto, PropertyQueryDto } from './dtos/property.dto';
import { createPropertySchema, propertyQuerySchema } from './schemas/property.schema';
import type { PropertyEntity } from './property.entity';
import { PropertyService } from './property.service';

@ApiTags('properties')
@ApiErrorResponses()
@Controller('properties')
export class PropertyController {
  constructor(private readonly properties: PropertyService) {}

  @Post()
  @ApiBody({ schema: inputSchema(createPropertySchema) })
  @ApiCreatedResponse({
    schema: creationSchema(propertySchema),
    headers: { 'X-Request-Id': { schema: { type: 'string', format: 'uuid' } } },
  })
  async create(
    @Body(new ZodValidationPipe(createPropertySchema)) input: CreatePropertyDto,
  ): Promise<PropertyEntity & { location: string }> {
    const property = await this.properties.create(input);
    return { ...property, location: `/api/v1/properties/${property.id}` };
  }

  @Get()
  @ApiQuerySchema(propertyQuerySchema)
  @ApiOkResponse({ schema: pageSchema(propertySchema) })
  list(@Query(new ZodValidationPipe(propertyQuerySchema)) query: PropertyQueryDto) {
    return this.properties.list(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', schema: inputSchema(uuidSchema) })
  @ApiOkResponse({ schema: propertySchema })
  get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) { return this.properties.get(id); }
}
