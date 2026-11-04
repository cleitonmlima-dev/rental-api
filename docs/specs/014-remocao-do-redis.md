# SPEC-014 — Remoção do Redis e da trava distribuída temporária

ADR: [ADR-014](../adr/014-remocao-do-redis.md).  
Status: fontes atualizadas; verificação de execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md), [SPEC-007](007-esteira-e-trava-temporaria.md) e [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md).

## Objetivo e escopo

Remover por completo o cliente, módulo, trava temporária, configurações, container, métrica, código de erro,
painel e testes relacionados ao Redis, mantendo todas as garantias transacionais, de concorrência, idempotência,
histórico, mensageria SNS/SQS e observabilidade no PostgreSQL e na aplicação NestJS.

## Requisitos e comportamento esperado

- A transição de proposta (`PATCH /api/v1/proposals/{id}/status`) deve iniciar diretamente a transação
  `READ COMMITTED` no PostgreSQL, bloquear o imóvel (`FOR NO KEY UPDATE`) e a proposta (`FOR UPDATE`), validar a
  matriz de transição, atualizar proposta e imóvel, aguardar o commit, registrar as métricas transacionais e
  publicar `ProposalStatusChanged` no SNS.
- Disputas concorrentes de transição na mesma proposta continuam serializadas pelos locks do PostgreSQL: a
  primeira compatível com o estado atual confirma (`200`) e a segunda lê o novo estado sob lock, sendo rejeitada
  com `409 PROPOSAL_TRANSITION_NOT_ALLOWED` caso o destino não seja mais válido.
- `AppConfig` e `loadConfig` não devem exigir nem ler `REDIS_URL`, `REDIS_COMMAND_TIMEOUT_MS` ou
  `REDIS_LOCK_TTL_MS`.
- O pacote `redis`, o diretório `src/redis/` e o arquivo `proposal-lock.ts` devem ser removidos.
- O erro `PROPOSAL_BUSY` e a métrica `rental_lock_outcomes` devem ser removidos do catálogo HTTP, da telemetria e
  do dashboard `infra/observability/grafana/dashboards/rental-technical.json`.
- `docker-compose.yml`, `.env`, `.env.example` e `.github/workflows/ci.yml` não devem conter o serviço `redis` nem
  variáveis `REDIS_*`.
- A suíte de integração em `test/integration/` deve conter seis suítes (`business.spec.ts`, `concurrency.spec.ts`,
  `foundation.spec.ts`, `messaging.spec.ts`, `startup.spec.ts` e `views.spec.ts`), sem referências ao Redis.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S14-01 | Não existem arquivos `src/redis/*`, `proposal-lock.ts`, `test/integration/redis*.spec.ts` ou `test/integration/lock.spec.ts`. |
| S14-02 | `package.json`, `.env`, `.env.example`, `docker-compose.yml` e `.github/workflows/ci.yml` não possuem dependência, serviço ou variável `redis`/`REDIS_*`. |
| S14-03 | `ProposalService.transition` coordena a mudança de estado exclusivamente via transação PostgreSQL e publica no SNS após commit e medição transacional. |
| S14-04 | `PROPOSAL_BUSY` e `rental_lock_outcomes` não constam em `src/` nem no dashboard técnico do Grafana. |
| S14-05 | Documentação técnica, catálogo de ADRs, plano de execução e README refletem a ausência do Redis e as seis suítes de integração. |

## Resultado e verificação

Remoção aplicada em código, configuração, infraestrutura local, dashboards, testes e documentação. A execução de
`npm run check` e das seis suítes de integração aguarda a geração do `package-lock.json` e o acesso ao daemon
Docker conforme o [plano de execução](../planos/002-plano-execucao.md#4-pendências-para-aceite).
