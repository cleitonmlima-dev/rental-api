import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DatabaseService } from '../../infra/database/database.service';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import { IdempotencyRequestEntity } from './entities/idempotency-request.entity';
import type { CreateProposalDto, ProposalQueryDto } from './dtos/proposal.dto';
import { ProposalEntity } from './entities/proposal.entity';
import type { CreatedProposal } from './interfaces/proposal.interface';
import { ProposalStatus } from './proposal-status';
import { StatusHistoryEntity } from './entities/status-history.entity';

@Injectable()
export class ProposalRepository {
  constructor(private readonly database: DatabaseService) {}

  async claimIdempotency(key: string, payload: CreateProposalDto, manager: EntityManager): Promise<boolean> {
    const result = await manager.createQueryBuilder().insert().into(IdempotencyRequestEntity)
      .values({ key, requestPayload: payload }).orIgnore().returning('key').execute();
    return (result.raw as Array<{ key: string }>).length > 0;
  }

  findIdempotency(key: string, payload: CreateProposalDto, manager: EntityManager) {
    return manager.getRepository(IdempotencyRequestEntity).createQueryBuilder('request')
      .select('request.requestPayload = CAST(:payload AS jsonb)', 'matches')
      .addSelect('request.responseBody', 'response')
      .where('request.key = :key', { key, payload: JSON.stringify(payload) })
      .getRawOne<{ matches: boolean; response: CreatedProposal | null }>();
  }

  async saveResponse(key: string, response: CreatedProposal, manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder().update(IdempotencyRequestEntity)
      .set({ responseBody: response }).where('key = :key', { key }).execute();
  }

  async insert(input: CreateProposalDto, instant: Date, manager: EntityManager): Promise<ProposalEntity> {
    const repository = manager.getRepository(ProposalEntity);
    const proposal = repository.create({
      id: randomUUID(), customerId: input.customerId, propertyId: input.propertyId, status: ProposalStatus.NOVA,
      statusEnteredAt: instant, createdAt: instant, updatedAt: instant,
    });
    await repository.insert(proposal);
    return proposal;
  }

  findById(id: string, manager: EntityManager = this.database.dataSource.manager): Promise<ProposalEntity | null> {
    return manager.getRepository(ProposalEntity).findOneBy({ id });
  }

  lock(id: string, manager: EntityManager): Promise<ProposalEntity | null> {
    return manager.getRepository(ProposalEntity).createQueryBuilder('proposal')
      .where('proposal.id = :id', { id }).setLock('pessimistic_write').getOne();
  }

  async setStatus(id: string, status: ProposalStatus, instant: Date, manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder().update(ProposalEntity)
      .set({ status, statusEnteredAt: instant, updatedAt: instant }).where('id = :id', { id }).execute();
  }

  list(query: ProposalQueryDto): Promise<[ProposalEntity[], number]> {
    const builder = this.database.dataSource.getRepository(ProposalEntity).createQueryBuilder('proposal');
    if (query.status) builder.andWhere('proposal.status = :status', { status: query.status });
    if (query.customerId) builder.andWhere('proposal.customerId = :customerId', { customerId: query.customerId });
    if (query.propertyId) builder.andWhere('proposal.propertyId = :propertyId', { propertyId: query.propertyId });
    return builder.orderBy('proposal.createdAt', 'DESC').addOrderBy('proposal.id', 'DESC')
      .take(query.limit).skip((query.page - 1) * query.limit).getManyAndCount();
  }

  history(id: string, query: PaginationDto): Promise<[StatusHistoryEntity[], number]> {
    return this.database.dataSource.getRepository(StatusHistoryEntity).createQueryBuilder('history')
      .select(['history.id', 'history.fromStatus', 'history.toStatus', 'history.changedAt'])
      .where('history.proposalId = :id', { id }).orderBy('history.id', 'ASC')
      .take(query.limit).skip((query.page - 1) * query.limit).getManyAndCount();
  }
}
