import { Module } from '@nestjs/common';
import { ConfigurationModule } from './infra/config/configuration.module';
import { DatabaseModule } from './infra/database/database.module';
import { HealthController } from './infra/health/health.controller';
import { CustomerModule } from './modules/customer/customer.module';
import { PropertyModule } from './modules/property/property.module';
import { ProposalModule } from './modules/proposal/proposal.module';
import { ObservabilityModule } from './infra/observability/observability.module';

@Module({
  imports: [
    ConfigurationModule,
    ObservabilityModule,
    DatabaseModule,
    CustomerModule,
    PropertyModule,
    ProposalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
