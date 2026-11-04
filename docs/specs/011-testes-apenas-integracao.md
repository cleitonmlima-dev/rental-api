# SPEC-011 — Testes exclusivamente de integração com node:test

ADR: [ADR-011](../adr/011-testes-apenas-integracao.md).  
Status: fontes atualizadas; execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md#11-critérios-de-aceite) e [SPEC-009](009-entrega-e-verificacao.md).

## Objetivo e escopo

Remover os testes unitários em `test/*.spec.ts` e manter exclusivamente os testes de integração em `test/integration/*.spec.ts` com o runner nativo `node:test`, preservando a cobertura dos critérios AC-01 a AC-25 sem adicionar dependências externas.

## Requisitos e comportamento esperado

1. **Remoção das suítes unitárias:**
   - Excluir `test/configuration.spec.ts`, `test/dto.spec.ts`, `test/http-errors.spec.ts`, `test/proposal-transitions.spec.ts` e `test/redis.spec.ts`.
   - Manter apenas `test/integration/*.spec.ts` e seus tipos/fixtures auxiliares.

2. **Preservação dos critérios de aceite na integração:**
   - As nove suítes de integração (`business`, `concurrency`, `foundation`, `lock`, `messaging`, `redis`, `redis-unavailable`, `startup` e `views`) continuam utilizando `node:test` e `node:assert/strict` contra PostgreSQL, Redis e LocalStack reais.
   - `test/integration/business.spec.ts` passa a verificar também os 49 pares entre os sete estados de proposta (somente os 12 pares válidos permitidos, AC-12).

3. **Scripts de verificação (`package.json`):**
   - `check`: `npm run typecheck && npm run lint && npm run build`.
   - `test`: `node --env-file-if-exists=.env --require ts-node/register --test --test-concurrency=1 test/integration/*.spec.ts`.
   - `test:integration`: `npm test`.

4. **Sincronização documental:**
   - Atualizar o catálogo de ADRs e as seções de testes/comandos em [especificacao-tecnica.md](../especificacao-tecnica.md), [SPEC-002](002-implementacao-rental-pipeline.md), [ADR-009](../adr/009-entrega-e-verificacao.md), [SPEC-009](009-entrega-e-verificacao.md), [ADR-010](../adr/010-legibilidade-orm-contratos-e-mensageria.md), [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md), [plano de execução](../planos/002-plano-execucao.md) e [README.md](../../README.md).

## Critérios de aceite e resultado

- Não existem arquivos `test/*.spec.ts` na raiz de `test/`; permanecem apenas as nove suítes em `test/integration/*.spec.ts`.
- Nenhuma dependência externa de teste foi adicionada ao `package.json`.
- `test/integration/business.spec.ts` cobre os 49 pares da matriz de estados (AC-12) dentro do limite de 120 colunas por linha.
- ADR-011 e SPEC-011 estão vinculadas entre si e referenciadas no catálogo de [especificacao-tecnica.md](../especificacao-tecnica.md#152-catálogo-de-adrs).
