import { Logger, type INestApplication } from '@nestjs/common';
import { createApplication } from './application';
import { APP_CONFIG, ConfigurationError } from './infra/config/configuration';
import type { AppConfig } from './infra/config/interfaces/app-config.interface';

async function bootstrap(): Promise<void> {
  let app: INestApplication | undefined;
  try {
    app = await createApplication();
    const config = app.get<AppConfig>(APP_CONFIG);
    await app.listen(config.port, '0.0.0.0');
  } catch (error) {
    process.exitCode = 1;
    Logger.error(error instanceof ConfigurationError
      ? error.message
      : 'Falha ao iniciar a aplicação; verifique configuração e disponibilidade do PostgreSQL.');
    try {
      await app?.close();
    } catch {
      Logger.error('Falha ao encerrar recursos após erro de inicialização.');
    }
  }
}

void bootstrap();
