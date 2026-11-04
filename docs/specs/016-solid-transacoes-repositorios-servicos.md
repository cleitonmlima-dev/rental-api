# SPEC-016 — Aplicação pragmática de SOLID em transações, repositórios e serviços

ADR: [ADR-016](../adr/016-solid-transacoes-repositorios-servicos.md).  
Status: fontes atualizadas; verificação de execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md) e [SPEC-013](013-reorganizacao-fisica-src.md).

## Objetivo e escopo

Separar responsabilidades (SRP) e tornar declarativo o efeito das transições sobre a disponibilidade do imóvel (OCP)
entre `DatabaseService`, `PropertyRepository`, `ProposalRepository`, `ProposalStatusPublisher`,
`proposal-transitions.ts` e `ProposalService`, mantendo os mesmos contratos HTTP, garantias transacionais e ordem de
locks (`imóvel → proposta`).

## Requisitos e comportamento esperado

- `DatabaseService.transaction(operation, work)` deve abrir a transação `READ COMMITTED`, aplicar `set_config`
  parametrizado (`app.request_id`, `app.trace_id`, `transaction_timeout`) e registrar `transactionCount` e
  `transactionDuration` para `operation` (`create` ou `transition`) com `result: 'commit' | 'rollback'`.
- `DatabaseService.now(manager?)` deve obter `clock_timestamp()` no contexto informado ou no `DataSource` padrão.
- `PropertyRepository` deve prover `lock(id, manager)`, `reserve(id, instant, manager)` e
  `setStatus(id, status, instant, manager)` e ser exportado por `PropertyModule`.
- `ProposalRepository` deve operar exclusivamente sobre `ProposalEntity`, `StatusHistoryEntity` e
  `IdempotencyRequestEntity`, aceitando `manager: EntityManager` nos métodos transacionais sem instanciar cópias de
  si mesmo.
- `proposal-transitions.ts` deve exportar `propertyStatusFor(status: ProposalStatus): PropertyStatus | undefined`,
  retornando `ALUGADO` para `ATIVO`, `DISPONIVEL` para `CANCELADA`/`REPROVADA` e `undefined` para os demais estados.
- `ProposalStatusPublisher.notify(proposal)` deve invocar `this.publish(proposal)` tratando erros com incremento de
  `publicationFailures` e log `PROPOSAL_STATUS_PUBLICATION_FAILED`, preservando `publish(proposal)` para envio direto
  e spies de teste.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S16-01 | `ProposalRepository` não importa `PropertyEntity`, `APP_CONFIG`, `requestContext` ou `traceContext`. |
| S16-02 | `ProposalService` não importa `transactionCount`, `transactionDuration`, `publicationFailures` ou `Logger`. |
| S16-03 | A ordem de locks (`claimIdempotency` → `properties.lock` na criação; `properties.lock` → `proposals.lock` na transição) permanece inalterada. |
| S16-04 | `proposal-transitions.ts` concentra `canTransition` e `propertyStatusFor`. |

## Resultado e verificação

Refatoração aplicada nas fontes sem criar abstrações *pass-through*. A verificação em runtime aguarda o ambiente com
dependências e containers ativos.
