import { Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { telemetryLifecycle } from './lifecycle';

@Injectable()
class TelemetryShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> { await telemetryLifecycle.shutdown(); }
}

@Module({ providers: [TelemetryShutdown] })
export class ObservabilityModule {}
