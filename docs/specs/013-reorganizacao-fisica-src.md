# SPEC-013 — Reorganização física de `src/` sem Ports & Adapters artificiais

ADR: [ADR-013](../adr/013-reorganizacao-fisica-src.md).  
Status: fontes atualizadas; verificação de execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md) e [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md).

## Objetivo e escopo

Reorganizar fisicamente os diretórios de `src/` e de `src/modules/proposal/` para melhorar a navegabilidade e a
separação visual entre infraestrutura técnica, código compartilhado e módulos de negócio, preservando
integralmente os contratos HTTP, schemas Zod, entidades/repositórios TypeORM concretos e fluxos transacionais.

## Requisitos e comportamento esperado

- A raiz de `src/` deve conter apenas `app.module.ts`, `application.ts`, `main.ts` e os diretórios `infra/`,
  `modules/` e `shared/`.
- Os módulos técnicos transversais devem residir em:
  - `src/infra/config/`
  - `src/infra/database/` (incluindo `migrations/`)
  - `src/infra/health/`
  - `src/infra/observability/`
- As três entidades de proposta devem residir em `src/modules/proposal/entities/`:
  - `proposal.entity.ts`
  - `status-history.entity.ts`
  - `idempotency-request.entity.ts`
- `ProposalEventType` deve ser exportado a partir de `src/modules/proposal/proposal-status.ts`, eliminando o
  arquivo `src/modules/proposal/proposal-event-type.ts`.
- Não devem ser introduzidas interfaces de porta (`ports/`), adaptadores abstratos (`adapters/`) ou mappers
  redundantes entre domínio e persistência.
- `package.json`, `Dockerfile`, `docker-compose.yml` e as suítes em `test/integration/` devem apontar para os
  novos caminhos em `src/infra/...`, `dist/infra/...` e `src/modules/proposal/entities/...`.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S13-01 | `src/` contém apenas `infra/`, `modules/`, `shared/`, `app.module.ts`, `application.ts` e `main.ts`. |
| S13-02 | `src/modules/proposal/entities/` agrupa as três entidades do schema `proposal` e `proposal-event-type.ts` não existe mais. |
| S13-03 | Nenhum import residual aponta para `src/config`, `src/database`, `src/health`, `src/observability` ou para os caminhos antigos das entidades de `proposal`. |
| S13-04 | `package.json`, `Dockerfile` e `docker-compose.yml` referenciam `infra/observability/instrumentation` e `infra/database/data-source`. |
| S13-05 | `npm run check` e `npm test` passam sem regressão quando o ambiente com dependências e containers estiver disponível. |

## Resultado e verificação

Estrutura física reorganizada e todos os imports e referências de script/container atualizados nas fontes. A
execução de `npm run check` e das suítes de integração aguarda a resolução do `package-lock.json` e o acesso ao
daemon Docker conforme o [plano de execução](../planos/002-plano-execucao.md#4-pendências-para-aceite).
