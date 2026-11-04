import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import { paginationSchema } from '../../shared/http/schemas/pagination.schema';
import {
  ApiErrorResponses, ApiQuerySchema, creationSchema, customerSchema, inputSchema, pageSchema,
} from '../../shared/http/schemas';
import { uuidSchema } from '../../shared/http/schemas/primitives.schema';
import { ZodValidationPipe } from '../../shared/http/validation';
import type { CreateCustomerDto } from './dtos/customer.dto';
import { createCustomerSchema } from './schemas/customer.schema';
import type { CustomerEntity } from './customer.entity';
import { CustomerService } from './customer.service';

@ApiTags('customers')
@ApiErrorResponses()
@Controller('customers')
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Post()
  @ApiBody({ schema: inputSchema(createCustomerSchema) })
  @ApiCreatedResponse({
    schema: creationSchema(customerSchema),
    headers: { 'X-Request-Id': { schema: { type: 'string', format: 'uuid' } } },
  })
  async create(
    @Body(new ZodValidationPipe(createCustomerSchema)) input: CreateCustomerDto,
  ): Promise<CustomerEntity & { location: string }> {
    const customer = await this.customers.create(input);
    return { ...customer, location: `/api/v1/customers/${customer.id}` };
  }

  @Get()
  @ApiQuerySchema(paginationSchema)
  @ApiOkResponse({ schema: pageSchema(customerSchema) })
  list(@Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto) { return this.customers.list(query); }

  @Get(':id')
  @ApiParam({ name: 'id', schema: inputSchema(uuidSchema) })
  @ApiOkResponse({ schema: customerSchema })
  get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) { return this.customers.get(id); }
}
