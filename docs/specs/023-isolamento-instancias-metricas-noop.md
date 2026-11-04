# SPEC-023 — Isolamento das instâncias de métricas em src/infra/observability/metrics.ts

ADR: [ADR-023](../adr/023-isolamento-instancias-metricas-noop.md).  
Status: concluída  
Base: [SPEC-008](008-observabilidade.md), [SPEC-011](011-testes-apenas-integracao.md).

## Objetivo e escopo

Garantir que cada métrica exportada por `src/infra/observability/metrics.ts` possua uma instância própria de método
(`add` ou `record`), evitando compartilhamento do singleton `NOOP_COUNTER_METRIC` / `NOOP_HISTOGRAM_METRIC` do
`@opentelemetry/api` quando `OTEL_SDK_DISABLED=true`.

## Requisitos e comportamento esperado

- `transactionCount`, `proposalOutcomes`, `publicationFailures`, `businessConflicts` e `httpCount` não devem compartilhar
  a mesma referência de objeto.
- `transactionDuration` e `httpDuration` não devem compartilhar a mesma referência de objeto.
- O spy `caseContext.mock.method(publicationFailures, 'add')` em `test/integration/messaging.spec.ts` deve contabilizar
  exclusivamente as falhas de publicação SNS (`2` chamadas no cenário de falha).

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S23-01 | `publicationFailures !== transactionCount` e chamadas a outros contadores não incrementam o spy de `publicationFailures.add`. |
| S23-02 | `npm run check` conclui sem erros. |

## Resultado e verificação

Implementado em `src/infra/observability/metrics.ts` e verificado.
