import { Injectable } from '@nestjs/common';
import { ApiError, apiErrors } from '../../shared/http/api-error';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import { paginate } from '../../shared/http/pagination';
import type { CreateCustomerDto } from './dtos/customer.dto';
import { CustomerEntity } from './customer.entity';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerService {
  constructor(private readonly customers: CustomerRepository) {}

  create(input: CreateCustomerDto): Promise<CustomerEntity> {
    return this.customers.insert(input);
  }

  async get(id: string): Promise<CustomerEntity> {
    const customer = await this.customers.findById(id);
    if (!customer) throw new ApiError(apiErrors.customerNotFound);
    return customer;
  }

  async list(query: PaginationDto) {
    const [data, total] = await this.customers.list(query);
    return paginate(data, total, query);
  }
}
