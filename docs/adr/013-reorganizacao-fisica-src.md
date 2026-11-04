# ADR-013 — Reorganização física de `src/` sem Ports & Adapters artificiais

Data: 04/11/2026  
Status: aceita; fontes atualizadas; aceite de execução pendente  
Spec: [SPEC-013](../specs/013-reorganizacao-fisica-src.md).  
Base: [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) e [SPEC-002](../specs/002-implementacao-rental-pipeline.md).

## Contexto

A estrutura de `src/` misturava diretórios de infraestrutura técnica (`config/`, `database/`, `health/`,
`observability/`) no mesmo nível de `modules/` e `shared/`. Além disso, `src/modules/proposal/` acumulava
entidades TypeORM, enums curtos, controller, serviço, repositório e publicador soltos na raiz do módulo, dando
aspecto desorganizado ao projeto e levantando a dúvida sobre adotar Arquitetura Hexagonal (Ports & Adapters).

## Decisão

- Não introduzir Ports & Adapters (`ports/`, `adapters/`, interfaces `I*Repository` 1-para-1 ou mappers entre
  entidades de domínio e entidades ORM), pois cada fronteira possui um único adapter concreto, os testes são
  exclusivamente de integração real ([ADR-011](011-testes-apenas-integracao.md)) e o fluxo de `Proposal` depende
  explicitamente da semântica transacional e da ordem de locks do PostgreSQL.
- Agrupar os pacotes transversais de infraestrutura sob `src/infra/`:
  - `src/infra/config/` (`configuration.module.ts`, `configuration.ts`, `interfaces/app-config.interface.ts`);
  - `src/infra/database/` (`create-data-source.ts`, `data-source.ts`, `database.module.ts`, `database.service.ts`
    e `migrations/`);
  - `src/infra/health/` (`health.controller.ts`);
  - `src/infra/observability/` (`context.ts`, `instrumentation.ts`, `lifecycle.ts`, `logger.ts`, `metrics.ts` e
    `observability.module.ts`).
- Manter na raiz de `src/` apenas os pontos de entrada (`main.ts`, `application.ts`, `app.module.ts`) e os três
  agrupamentos de topo: `src/infra/`, `src/modules/` e `src/shared/`.
- Organizar `src/modules/proposal/` movendo as três entidades TypeORM (`proposal.entity.ts`,
  `status-history.entity.ts` e `idempotency-request.entity.ts`) para `src/modules/proposal/entities/` e
  consolidando `ProposalEventType` em `src/modules/proposal/proposal-status.ts` (simétrico a `property-status.ts`),
  removendo o arquivo isolado `proposal-event-type.ts`.
- Atualizar caminhos de importação em `src/`, `test/`, `package.json`, `Dockerfile` e `docker-compose.yml`.

## Alternativas consideradas

- Aplicar Arquitetura Hexagonal completa (Ports & Adapters): criaria interfaces de porta e mappers *pass-through*
  sem segundo adapter real nem ganho de testabilidade, contrariando a diretriz de módulos profundos e a
  [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md).
- Manter a estrutura plana original em `src/` e `src/modules/proposal/`: preservaria os caminhos atuais, mas não
  resolveria a poluição visual apontada na revisão da árvore de diretórios.

## Consequências

- A raiz de `src/` fica restrita a `infra/`, `modules/`, `shared/` e aos três arquivos de bootstrap da aplicação.
- `src/modules/proposal/` separa suas três entidades persistentes em `entities/` e reduz arquivos soltos na raiz
  sem adicionar camadas ou abstrações intermediárias.
- Scripts de execução, migration e instrumentação passam a referenciar `src/infra/...` e `dist/infra/...`.
