# ADR-016 — Aplicação pragmática de SOLID (SRP e OCP) em transações, repositórios e casos de uso

Data: 04/11/2026  
Status: aceita; fontes atualizadas; aceite de execução pendente  
Spec: [SPEC-016](../specs/016-solid-transacoes-repositorios-servicos.md).  
Base: [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) e [ADR-013](013-reorganizacao-fisica-src.md).

## Contexto

Mesmo após a reorganização física de diretórios ([ADR-013](013-reorganizacao-fisica-src.md)), algumas classes ainda
acumulavam responsabilidades distintas (violando SRP e OCP):

1. `ProposalService` misturava coordenação de regras de negócio com cronometragem manual (`performance.now()`),
   contadores de transação (`transactionCount`, `transactionDuration`), captura/métrica/log de falha de publicação
   SNS e condicionais de transição de status de imóvel.
2. `ProposalRepository` executava queries e updates diretos em `PropertyEntity` (invadindo a responsabilidade de
   `PropertyRepository`), além de configurar variáveis de sessão PostgreSQL (`app.request_id`, `app.trace_id`,
   `transaction_timeout`) e clonar a própria instância para trocar o `EntityManager`.
3. `ProposalStatusPublisher` expunha apenas o envio bruto ao SNS, obrigando `ProposalService` a conhecer detalhes
   de telemetria e log de erro de publicação.

## Decisão

- **SRP na infraestrutura de banco (`DatabaseService`):** centralizar em `DatabaseService.transaction(operation, work)`
  a abertura da transação `READ COMMITTED`, a configuração parametrizada do contexto local (`app.request_id`,
  `app.trace_id` e `transaction_timeout`), a consulta `now(manager)` e o registro das métricas `transactionCount` e
  `transactionDuration` em bloco `try/finally`.
- **SRP por repositório de módulo (`PropertyRepository` e `ProposalRepository`):**
  - `PropertyRepository` assume todas as operações sobre `PropertyEntity`, incluindo `lock(id, manager)`,
    `reserve(id, instant, manager)` e `setStatus(id, status, instant, manager)`.
  - `ProposalRepository` restringe-se às tabelas do schema `proposal` (`proposals`, `status_history`,
    `idempotency_requests`), recebendo `EntityManager` opcional por parâmetro quando em transação, sem mutar estado
    interno, sem clonar a própria classe e sem importar `PropertyEntity`, `APP_CONFIG`, `requestContext` ou
    `traceContext`.
  - `PropertyModule` exporta `PropertyRepository` para uso coordenado em `ProposalModule`.
- **OCP e SRP nas regras da máquina de estados (`proposal-transitions.ts`):** extrair `propertyStatusFor(status)`
  ao lado de `canTransition(from, to)` em `proposal-transitions.ts`, concentrando toda a semântica de transição e
  reflexo na disponibilidade do imóvel em funções puras.
- **SRP na publicação de eventos (`ProposalStatusPublisher`):** adicionar `notify(proposal)` em
  `ProposalStatusPublisher`, encapsulando o envio pós-commit (`publish`), a captura de falhas, a métrica
  `publicationFailures` e o log `PROPOSAL_STATUS_PUBLICATION_FAILED`, limpando `ProposalService`.

## Alternativas consideradas

- Introduzir interfaces `I*Repository`, `IUnitOfWork` e *UseCases* individuais por método: criaria dezenas de
  arquivos rasos (*pass-through*) sem segundo adapter real, contrariando a busca por código organizado e
  simplificado.
- Manter queries de `PropertyEntity` dentro de `ProposalRepository`: preserva o funcionamento, mas duplica o
  conhecimento da tabela `property.properties` em dois repositórios distintos.

## Consequências

- Cada classe passa a ter uma única razão de mudança: `DatabaseService` gerencia conexões/transações/métricas de
  banco; `PropertyRepository` gerencia `property.properties`; `ProposalRepository` gerencia o schema `proposal`;
  `ProposalStatusPublisher` gerencia o envio e a resiliência SNS; `ProposalService` apenas orquestra os casos de
  uso de proposta.
- O código fica menor, sem mutação de instância em repositório e sem `try/finally` de telemetria espalhado nos
  serviços.
