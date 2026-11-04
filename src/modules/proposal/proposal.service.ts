import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infra/database/database.service';
import { proposalOutcomes } from '../../infra/observability/metrics';
import { ApiError, apiErrors } from '../../shared/http/api-error';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import { paginate } from '../../shared/http/pagination';
import { PropertyStatus } from '../property/property-status';
import { PropertyRepository } from '../property/property.repository';
import type { CreateProposalDto, ProposalQueryDto } from './dtos/proposal.dto';
import { ProposalEntity } from './entities/proposal.entity';
import type { CreatedProposal, Proposal } from './interfaces/proposal.interface';
import { ProposalStatus } from './proposal-status';
import { ProposalStatusPublisher } from './proposal-status.publisher';
import { canTransition, propertyStatusFor } from './proposal-transitions';
import { ProposalRepository } from './proposal.repository';

function present(row: ProposalEntity): Proposal {
  return {
    ...row,
    statusEnteredAt: row.statusEnteredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProposalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly proposals: ProposalRepository,
    private readonly properties: PropertyRepository,
    private readonly publisher: ProposalStatusPublisher,
  ) {}

  async create(input: CreateProposalDto, key: string): Promise<{ proposal: CreatedProposal; replayed: boolean }> {
    const result = await this.database.transaction('create', async (manager) => {
      const payload = { customerId: input.customerId, propertyId: input.propertyId };
      const acquired = await this.proposals.claimIdempotency(key, payload, manager);

      if (!acquired) {
        const saved = await this.proposals.findIdempotency(key, payload, manager);
        if (!saved!.matches) throw new ApiError(apiErrors.idempotencyKeyReused);
        if (!saved!.response) throw new ApiError(apiErrors.internalError);
        return { proposal: saved!.response, replayed: true };
      }

      const property = await this.properties.lock(input.propertyId, manager);
      if (!property) throw new ApiError(apiErrors.propertyNotFound);
      if (property.status !== PropertyStatus.DISPONIVEL) throw new ApiError(apiErrors.propertyUnavailable);

      const instant = await this.database.now(manager);
      await this.properties.reserve(input.propertyId, instant, manager);
      const proposal = present(await this.proposals.insert(input, instant, manager));
      const response: CreatedProposal = { ...proposal, location: `/api/v1/proposals/${proposal.id}` };
      await this.proposals.saveResponse(key, response, manager);
      return { proposal: response, replayed: false };
    });

    proposalOutcomes.add(1, { result: result.replayed ? 'replayed' : 'created' });
    if (!result.replayed) await this.publisher.notify(result.proposal);
    return result;
  }

  async get(id: string): Promise<Proposal> {
    const row = await this.proposals.findById(id);
    if (!row) throw new ApiError(apiErrors.proposalNotFound);
    return present(row);
  }

  async transition(id: string, next: ProposalStatus): Promise<Proposal> {
    const proposal = await this.database.transaction('transition', async (manager) => {
      const reference = await this.proposals.findById(id, manager);
      if (!reference) throw new ApiError(apiErrors.proposalNotFound);
      const property = await this.properties.lock(reference.propertyId, manager);
      const current = await this.proposals.lock(id, manager);
      if (!canTransition(current!.status, next)) {
        throw new ApiError(apiErrors.proposalTransitionNotAllowed);
      }
      if (property!.status !== PropertyStatus.EM_NEGOCIACAO) throw new ApiError(apiErrors.internalError);

      const instant = await this.database.now(manager);
      await this.proposals.setStatus(id, next, instant, manager);
      const availability = propertyStatusFor(next);
      if (availability) await this.properties.setStatus(reference.propertyId, availability, instant, manager);
      return present({ ...current!, status: next, statusEnteredAt: instant, updatedAt: instant });
    });

    proposalOutcomes.add(1, { result: 'transitioned', status: next });
    await this.publisher.notify(proposal);
    return proposal;
  }

  async list(query: ProposalQueryDto) {
    const [rows, total] = await this.proposals.list(query);
    return paginate(rows.map(present), total, query);
  }

  async history(id: string, query: PaginationDto) {
    await this.get(id);
    const [rows, total] = await this.proposals.history(id, query);
    const data = rows.map(({ id: historyId, fromStatus, toStatus, changedAt }) => ({
      id: historyId, fromStatus, toStatus, changedAt,
    }));
    return paginate(data, total, query);
  }
}
