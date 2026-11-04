import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infra/database/database.service';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import type { CreateCustomerDto } from './dtos/customer.dto';
import { CustomerEntity } from './customer.entity';

@Injectable()
export class CustomerRepository {
  constructor(private readonly database: DatabaseService) {}

  async insert(input: CreateCustomerDto): Promise<CustomerEntity> {
    const repository = this.database.dataSource.getRepository(CustomerEntity);
    const customer = repository.create({ id: randomUUID(), name: input.name, cpf: input.cpf, email: input.email });
    const result = await repository.insert(customer);
    return Object.assign(customer, result.generatedMaps[0]);
  }

  findById(id: string): Promise<CustomerEntity | null> {
    return this.database.dataSource.getRepository(CustomerEntity).findOneBy({ id });
  }

  list(query: PaginationDto): Promise<[CustomerEntity[], number]> {
    return this.database.dataSource.getRepository(CustomerEntity).createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC').addOrderBy('customer.id', 'DESC')
      .take(query.limit).skip((query.page - 1) * query.limit).getManyAndCount();
  }
}
