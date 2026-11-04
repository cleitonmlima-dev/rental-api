import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DatabaseService } from '../../infra/database/database.service';
import type { CreatePropertyDto, PropertyQueryDto } from './dtos/property.dto';
import { PropertyEntity } from './property.entity';
import { PropertyStatus } from './property-status';

@Injectable()
export class PropertyRepository {
  constructor(private readonly database: DatabaseService) {}

  async insert(input: CreatePropertyDto): Promise<PropertyEntity> {
    const instant = await this.database.now();
    const repository = this.database.dataSource.getRepository(PropertyEntity);
    const property = repository.create({
      id: randomUUID(), ownerId: input.ownerId, address: input.address, type: input.type,
      description: input.description ?? null, status: PropertyStatus.DISPONIVEL,
      createdAt: instant, updatedAt: instant,
    });
    await repository.insert(property);
    return property;
  }

  findById(id: string): Promise<PropertyEntity | null> {
    return this.database.dataSource.getRepository(PropertyEntity).findOneBy({ id });
  }

  lock(id: string, manager: EntityManager): Promise<PropertyEntity | null> {
    return manager.getRepository(PropertyEntity).createQueryBuilder('property')
      .where('property.id = :id', { id }).setLock('for_no_key_update').getOne();
  }

  async reserve(id: string, instant: Date, manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder().update(PropertyEntity)
      .set({ status: PropertyStatus.EM_NEGOCIACAO, updatedAt: instant })
      .where('id = :id AND status = :available', { id, available: PropertyStatus.DISPONIVEL }).execute();
  }

  async setStatus(id: string, status: PropertyStatus, instant: Date, manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder().update(PropertyEntity)
      .set({ status, updatedAt: instant }).where('id = :id', { id }).execute();
  }

  list(query: PropertyQueryDto): Promise<[PropertyEntity[], number]> {
    const builder = this.database.dataSource.getRepository(PropertyEntity).createQueryBuilder('property');
    if (query.status) builder.andWhere('property.status = :status', { status: query.status });
    if (query.type) builder.andWhere('property.type = :type', { type: query.type });
    if (query.ownerId) builder.andWhere('property.ownerId = :ownerId', { ownerId: query.ownerId });
    return builder.orderBy('property.createdAt', 'DESC').addOrderBy('property.id', 'DESC')
      .take(query.limit).skip((query.page - 1) * query.limit).getManyAndCount();
  }
}
