import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';
import { ProposalStatusPublisher } from './proposal-status.publisher';
import { ProposalRepository } from './proposal.repository';

@Module({
  imports: [PropertyModule],
  controllers: [ProposalController],
  providers: [ProposalService, ProposalRepository, ProposalStatusPublisher],
})
export class ProposalModule {}
