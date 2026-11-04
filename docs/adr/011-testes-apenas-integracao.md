# ADR-011 — Manter exclusivamente testes de integração com node:test

Data: 04/11/2026  
Status: aceita; fontes atualizadas; aceite de execução pendente  
Spec: [SPEC-011](../specs/011-testes-apenas-integracao.md).  
Base: [SPEC-002](../specs/002-implementacao-rental-pipeline.md) e [SPEC-009](../specs/009-entrega-e-verificacao.md).

## Contexto

Até a [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md), o projeto dividia os testes em cinco suítes unitárias (`test/*.spec.ts`) e nove suítes de integração (`test/integration/*.spec.ts`), ambas executadas pelo runner nativo `node:test`. Inicialmente cogitou-se migrar para o Jest mantendo apenas testes de integração, mas a revisão Ponytail identificou que `node:test` + `node:assert/strict` já atendem integralmente às suítes de integração sem novas dependências (`jest`, `ts-jest`, `@types/jest`), configuração extra ou reescrita de hooks de ciclo de vida.

## Decisão

- Remover as cinco suítes unitárias (`test/configuration.spec.ts`, `test/dto.spec.ts`, `test/http-errors.spec.ts`, `test/proposal-transitions.spec.ts` e `test/redis.spec.ts`) e manter exclusivamente as nove suítes de integração em `test/integration/*.spec.ts`.
- Preservar `node:test` e `node:assert/strict` nativos do Node.js como runner único de testes, sem adicionar dependências de terceiros.
- Garantir na suíte de integração (`test/integration/business.spec.ts`) a verificação dos 49 pares da matriz de transição (AC-12) para que a remoção de `test/proposal-transitions.spec.ts` não reduza a cobertura dos critérios de aceite.
- Unificar o script `npm test` para executar diretamente os testes de integração (`node --env-file-if-exists=.env --require ts-node/register --test --test-concurrency=1 test/integration/*.spec.ts`), mantendo `npm run test:integration` com o mesmo comando para compatibilidade com a CI e instruções existentes, e ajustar `npm run check` para `npm run typecheck && npm run lint && npm run build`.

## Alternativas consideradas

- Migrar para Jest (`jest`, `ts-jest`, `@types/jest`): exigiria três pacotes novos, configuração adicional e reescrita das nove suítes de integração (`TestContext`, `t.after`, `t.test`, `t.mock`) sem ganho sobre o `node:test` nativo.
- Manter as cinco suítes unitárias: permitiria testes offline no `npm run check`, mas foi descartado pelo responsável para simplificar a suíte e concentrar toda a verificação em integração real.

## Consequências

- O repositório mantém zero dependências extras de teste e concentra a verificação nas nove suítes de integração em `test/integration/*.spec.ts`.
- `npm run check` executa análise estática e compilação (`typecheck`, `lint` e `build`) sem exigir containers; `npm test` e `npm run test:integration` executam a suíte de integração contra PostgreSQL, Redis e LocalStack reais.
- As referências às cinco suítes unitárias nas especificações ([especificacao-tecnica.md](../especificacao-tecnica.md), [SPEC-002](../specs/002-implementacao-rental-pipeline.md), [ADR-009](009-entrega-e-verificacao.md), [SPEC-009](../specs/009-entrega-e-verificacao.md), [SPEC-010](../specs/010-legibilidade-orm-contratos-e-mensageria.md), [plano de execução](../planos/002-plano-execucao.md) e [README](../../README.md)) são atualizadas por esta entrega.
