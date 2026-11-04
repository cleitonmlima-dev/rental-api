# ADR-023 — Isolamento das instâncias de métricas quando o OpenTelemetry usa NoopMeter

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-023](../specs/023-isolamento-instancias-metricas-noop.md).  
Base: [ADR-008](008-observabilidade.md), [ADR-011](011-testes-apenas-integracao.md).

## Contexto

No CI (`OTEL_SDK_DISABLED=true`), `@opentelemetry/api` utiliza o `NoopMeter`, cujos métodos `createCounter()` e
`createHistogram()` retornam a mesma instância singleton (`NOOP_COUNTER_METRIC` e `NOOP_HISTOGRAM_METRIC`) para todos os
instrumentos criados. Como consequência, ao fazer spy de `publicationFailures.add` em `test/integration/messaging.spec.ts`,
o mock interceptava também as chamadas de `httpCount.add`, `transactionCount.add`, `proposalOutcomes.add` e
`businessConflicts.add`, contabilizando 16 chamadas em vez das 2 falhas reais de publicação SNS.

## Decisão

- Encapsular a criação de counters e histograms em `src/infra/observability/metrics.ts` em objetos dedicados por
  instrumento (`{ add }` / `{ record }`) que delegam ao instrumento do OpenTelemetry.

## Alternativas consideradas

- Habilitar o SDK completo do OpenTelemetry durante os testes de integração: desnecessário e introduziria exportação
  OTLP em ambiente de teste sem Collector.

## Consequências

- Cada métrica exportada em `src/infra/observability/metrics.ts` possui identidade e método próprios mesmo com
  `NoopMeter`, mantendo a telemetria real intacta em produção e garantindo isolamento nos spies de integração.
