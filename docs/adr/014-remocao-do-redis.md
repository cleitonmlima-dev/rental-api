# ADR-014 — Remoção do Redis e da trava distribuída temporária

Data: 04/11/2026  
Status: aceita; fontes atualizadas; aceite de execução pendente  
Spec: [SPEC-014](../specs/014-remocao-do-redis.md).  
Base: [ADR-002](002-modelo-e-fluxos-da-v1.md), [ADR-007](007-esteira-e-trava-temporaria.md) e [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md).

## Contexto

Até então, a V1 incluía o Redis exclusivamente para aplicar uma trava temporária (`ProposalLock`) por proposta no
`PATCH /api/v1/proposals/{id}/status`, retornando `409 PROPOSAL_BUSY` antes de abrir a transação PostgreSQL e
operando em modo *fail open* quando indisponível. Como todas as garantias reais de exclusividade, ordem de locks
(`imóvel → proposta`), validação da matriz de estados e atomicidade já pertencem à transação PostgreSQL, o
responsável pelo projeto decidiu remover integralmente o Redis neste momento até reavaliar se e como ele será
utilizado no futuro.

## Decisão

- Remover `src/redis/` (`RedisModule`, `RedisService`), `src/modules/proposal/proposal-lock.ts` (`ProposalLock`) e
  o pacote `"redis"` do `package.json`.
- Simplificar `ProposalService.transition` para executar diretamente a transação PostgreSQL (`READ COMMITTED`),
  mantendo o lock pessimista ordenado (`FOR NO KEY UPDATE` no imóvel seguido de `FOR UPDATE` na proposta) e a
  validação da matriz `canTransition` sobre o estado atual bloqueado.
- Remover `REDIS_URL`, `REDIS_COMMAND_TIMEOUT_MS`, `REDIS_LOCK_TTL_MS` e `REDIS_PORT` da configuração validada
  (`AppConfig`, `loadConfig`), de `.env`, `.env.example`, `docker-compose.yml` e `.github/workflows/ci.yml`.
- Remover o container `redis` do `docker-compose.yml` (que passa a declarar nove serviços padrão e `postgres-test`
  no perfil `test`).
- Remover o código de erro `PROPOSAL_BUSY` (`apiErrors.proposalBusy`), a métrica `rental_lock_outcomes`
  (`lockOutcomes`) e o painel `"Trava Redis — resultados"` do dashboard técnico do Grafana.
- Remover as três suítes de teste exclusivas de Redis (`test/integration/redis.spec.ts`,
  `test/integration/lock.spec.ts` e `test/integration/redis-unavailable.spec.ts`) e limpar as referências ao Redis
  nas seis suítes de integração restantes (`business.spec.ts`, `concurrency.spec.ts`, `foundation.spec.ts`,
  `messaging.spec.ts`, `startup.spec.ts` e `views.spec.ts`).

## Alternativas consideradas

- Desabilitar o Redis por variável de ambiente mantendo o código: deixaria código morto, dependência npm,
  configuração e suítes ociosas sem necessidade definida.
- Substituir o Redis por `SELECT ... FOR UPDATE NOWAIT` no PostgreSQL para preservar `PROPOSAL_BUSY`: alteraria a
  semântica de espera configurada (`lock_timeout`) já validada para contenção transacional curta no banco.

## Consequências

- A aplicação, o Docker Compose e a CI deixam de depender do Redis; toda coordenação de concorrência de propostas
  ocorre no PostgreSQL com `READ COMMITTED`, locks pessimistas ordenados e índice único parcial.
- Os critérios AC-17 e AC-18 (específicos da trava Redis) deixam de ser aplicáveis, enquanto AC-19 continua
  verificando disputas concorrentes de transição e reserva diretamente no PostgreSQL.
- As decisões anteriores que definiam o uso de Redis ([ADR-002](002-modelo-e-fluxos-da-v1.md),
  [ADR-003](003-fundacao-nestjs-postgres-redis.md), [ADR-007](007-esteira-e-trava-temporaria.md) e
  [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md)) têm a parcela referente ao Redis substituída por esta
  ADR.
