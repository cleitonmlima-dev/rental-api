import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { APP_CONFIG } from '../../infra/config/configuration';
import type { AppConfig } from '../../infra/config/interfaces/app-config.interface';
import { publicationFailures } from '../../infra/observability/metrics';
import type { Proposal } from './interfaces/proposal.interface';
import type { ProposalStatusChangedEvent } from './interfaces/proposal-status-changed-event.interface';
import { ProposalEventType } from './proposal-status';

@Injectable()
export class ProposalStatusPublisher implements OnApplicationShutdown {
  private readonly logger = new Logger(ProposalStatusPublisher.name);
  readonly client: SNSClient;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.client = new SNSClient({ region: config.awsRegion, endpoint: config.awsEndpoint, maxAttempts: 1 });
  }

  async publish(proposal: Proposal): Promise<void> {
    const event: ProposalStatusChangedEvent = {
      eventId: `${ProposalEventType.STATUS_CHANGED}:${proposal.id}:${proposal.status}`,
      type: ProposalEventType.STATUS_CHANGED,
      schemaVersion: 1,
      occurredAt: proposal.statusEnteredAt,
      proposalId: proposal.id,
      customerId: proposal.customerId,
      propertyId: proposal.propertyId,
      status: proposal.status,
    };
    await this.client.send(new PublishCommand({
      TopicArn: this.config.snsTopicArn,
      Message: JSON.stringify(event),
      MessageAttributes: { status: { DataType: 'String', StringValue: proposal.status } },
    }), { abortSignal: AbortSignal.timeout(this.config.snsPublishTimeoutMs) });
  }

  async notify(proposal: Proposal): Promise<void> {
    // shortcut: queda após commit pode perder o evento; usar outbox quando entrega durável for necessária.
    try {
      await this.publish(proposal);
    } catch {
      publicationFailures.add(1, { status: proposal.status });
      this.logger.error({
        code: 'PROPOSAL_STATUS_PUBLICATION_FAILED', proposalId: proposal.id, status: proposal.status,
      });
    }
  }

  onApplicationShutdown(): void {
    this.client.destroy();
  }
}
