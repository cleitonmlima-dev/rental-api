import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { PaginationDto } from '../../shared/http/dtos/pagination.dto';
import { paginationSchema } from '../../shared/http/schemas/pagination.schema';
import {
  ApiErrorResponses, ApiQuerySchema, creationSchema, historySchema, inputSchema, pageSchema, proposalSchema,
} from '../../shared/http/schemas';
import { uuidSchema } from '../../shared/http/schemas/primitives.schema';
import { ZodValidationPipe } from '../../shared/http/validation';
import {
  type CreateProposalDto, type ProposalQueryDto, type TransitionProposalDto,
} from './dtos/proposal.dto';
import {
  createProposalSchema, idempotencyKeySchema, proposalQuerySchema, transitionProposalSchema,
} from './schemas/proposal.schema';
import type { CreatedProposal } from './interfaces/proposal.interface';
import { ProposalService } from './proposal.service';

@ApiTags('proposals')
@ApiErrorResponses()
@Controller('proposals')
export class ProposalController {
  constructor(private readonly proposals: ProposalService) {}

  @Post()
  @ApiBody({ schema: inputSchema(createProposalSchema) })
  @ApiHeader({
    name: 'Idempotency-Key', required: true, schema: inputSchema(idempotencyKeySchema),
    description: 'Informe uma única chave não vazia; reutilize a mesma chave/payload para recuperar o 201 original.',
  })
  @ApiCreatedResponse({
    schema: creationSchema(proposalSchema),
    headers: { 'X-Request-Id': { schema: { type: 'string', format: 'uuid' } } },
  })
  async create(
    @Body(new ZodValidationPipe(createProposalSchema)) input: CreateProposalDto,
    @Headers('idempotency-key', new ZodValidationPipe(idempotencyKeySchema)) key: string,
  ): Promise<CreatedProposal> {
    const result = await this.proposals.create(input, key);
    return result.proposal;
  }

  @Get()
  @ApiQuerySchema(proposalQuerySchema)
  @ApiOkResponse({ schema: pageSchema(proposalSchema) })
  list(@Query(new ZodValidationPipe(proposalQuerySchema)) query: ProposalQueryDto) {
    return this.proposals.list(query);
  }

  @Get(':id/history')
  @ApiParam({ name: 'id', schema: inputSchema(uuidSchema) })
  @ApiQuerySchema(paginationSchema)
  @ApiOkResponse({ schema: pageSchema(historySchema) })
  history(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) { return this.proposals.history(id, query); }

  @Get(':id')
  @ApiParam({ name: 'id', schema: inputSchema(uuidSchema) })
  @ApiOkResponse({ schema: proposalSchema })
  get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) { return this.proposals.get(id); }

  @Patch(':id/status')
  @ApiParam({ name: 'id', schema: inputSchema(uuidSchema) })
  @ApiBody({ schema: inputSchema(transitionProposalSchema) })
  @ApiOkResponse({ schema: proposalSchema })
  transition(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(transitionProposalSchema)) input: TransitionProposalDto,
  ) {
    return this.proposals.transition(id, input.status);
  }
}
