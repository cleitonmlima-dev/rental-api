import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http/exception.filter';
import { requestIdMiddleware } from './shared/http/request-context';
import { AppLogger } from './infra/observability/logger';
import { httpMetrics } from './infra/observability/metrics';

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { abortOnError: false, logger: new AppLogger() });
  app.use(requestIdMiddleware);
  app.use(httpMetrics);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('Rental Pipeline API')
    .setVersion('1.0')
    .setDescription(
      'Campos desconhecidos são rejeitados. Criações respondem 201 com location no corpo; erros usam code e requestId.',
    )
    .build());
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
  return app;
}
