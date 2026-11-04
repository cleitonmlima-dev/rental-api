# ADR-003 — Fundação NestJS, PostgreSQL e Redis opcional

Data: 03/11/2026  
Status: aceita; pontos técnicos atualizados pela ADR-010; execução pendente  
Spec: [SPEC-003 — Fundação](../specs/003-fundacao-aplicacao.md).  
Plano: [incremento 1](../planos/002-plano-execucao.md#1-fundação-da-aplicação).  
Base: [ADR-002](002-modelo-e-fluxos-da-v1.md).

A [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) substitui o schema técnico, tooling Docker e testes redundantes deste incremento. O escopo inicial abaixo é histórico; os módulos de negócio foram preenchidos pelos incrementos 004 a 009.

## Contexto

Ao iniciar este incremento, o workspace ainda não possuía aplicação ou infraestrutura executável. A fundação estabelece configuração, conexões, ferramentas e saúde antes das tabelas e endpoints de negócio. As regras aceitas na ADR-002 permanecem: PostgreSQL obrigatório e Redis usado apenas para reduzir contenção, sem bloquear o fluxo quando indisponível.

## Decisão

- Usar Node.js 24.21.0 LTS, TypeScript 5.9.3 e NestJS 11.1.8 em CommonJS, com compilação `tsc`. Não adicionar CLI de geração ou bundler.
- Fixar dependências diretas no `package.json`; gerar e conferir o lockfile com npm antes de concluir o incremento. Não fabricar lockfile sem resolução real.
- Usar TypeORM 0.3.27/pg 8.16.3 e `redis` 5.9.0. Um serviço de banco gerencia o `DataSource`; um serviço Redis conecta em segundo plano com fila offline desabilitada e timeout curto.
- Validar configuração com funções pequenas de TypeScript, sem biblioteca adicional. Valores inválidos identificam a chave, sem imprimir URLs/senhas.
- Inicialização e readiness dependem do PostgreSQL. A conexão Redis não é aguardada para iniciar HTTP e não entra na readiness.
- Criar os módulos Customer, Property e Proposal vazios, sem antecipar controllers, entidades ou regras de fases posteriores.
- Usar o runner `node:test` e `assert` do Node, com `ts-node` para executar testes TypeScript. ESLint verifica o código e `tsc --noEmit` verifica tipos.
- Disponibilizar Dockerfile multi-stage e Compose com PostgreSQL 18.6-bookworm, Redis 8.2.11-bookworm, migration pontual e API. Redis não é dependência obrigatória da API no Compose.
- Bootstrap cria papéis de migration/aplicação/observação. O uso original de `proposal` para controle TypeORM foi substituído pela ADR-010 por `public.typeorm_migrations`; a migration inicial cria os três schemas de negócio. API continua sem DDL.
- Utilizar defaults locais: conexão PostgreSQL 1.000 ms, lock 1.000 ms, instrução 3.000 ms, operação 5.000 ms, comando Redis 150 ms e TTL de trava 10.000 ms. São parâmetros iniciais configuráveis, não SLOs ou medições de capacidade.
- Limitar parâmetros em milissegundos a 2.147.483.647 para não aceitar valores que excedam timers Node ou os limites PostgreSQL. A URL de migration é validada pelo seu próprio nome de variável.
- A fundação usou inicialmente tooling Docker no perfil `tools`; removido pela ADR-010. Comandos npm agora executam no host. `npm run check` continua reunindo tipos, lint, unitários e build limpo, sem integração implícita.
- Preparar testes de ciclo de vida Redis, startup obrigatório com PostgreSQL, separação de papéis e shutdown completo. Sua presença não constitui evidência de aprovação enquanto os checks estiverem adiados.

## Alternativas consideradas

- CLI NestJS, bundler e runner de testes adicional: não necessários para esta fundação; compilador e runner nativo cobrem a etapa.
- Aguardar Redis durante o bootstrap: contraria a continuidade pelo PostgreSQL quando o Redis estiver fora.
- Schema de configuração com biblioteca externa: os poucos parâmetros podem ser validados diretamente sem acrescentar dependência.
- Instalar dependências sem lockfile como entrega final: não reproduz a árvore transitiva; a fase só termina depois de gerar e verificar o lockfile real.

## Consequências e limites

As fontes de banco e negócio foram preparadas nos incrementos seguintes; o aceite de todas as fases depende da execução dos checks. Esta sessão não dispõe de Node/npm, nega acesso ao socket Docker e não resolve DNS para baixar dependências. Por isso, a criação dos arquivos não comprova instalação, build, testes ou inicialização de containers.

O Compose atual não inclui ferramentas npm, conforme a ADR-010; é necessário Node/npm no host. O Dockerfile continua exigindo lockfile real e `npm ci`.

Por orientação do responsável, os checks de execução ficam para outra sessão. A SPEC-003 e o plano preservam as pendências; preparação dos incrementos seguintes não equivale a validação da fundação.

Não criar tabelas de negócio, trava distribuída, endpoints cadastrais ou stack completa de observabilidade nesta etapa. Eles possuem incrementos próprios no plano.

## Referências verificadas

- [Node.js 24 LTS](https://nodejs.org/en/download).
- [NestJS 11.1.8: engines e peer dependencies](https://github.com/nestjs/nest/blob/v11.1.8/packages/core/package.json).
- [TypeORM 0.3.27](https://github.com/typeorm/typeorm/blob/0.3.27/package.json).
- [pg 8.16.3](https://github.com/brianc/node-postgres/blob/pg%408.16.3/packages/pg/package.json).
- [redis 5.9.0](https://github.com/redis/node-redis/blob/redis%405.9.0/packages/redis/package.json).
- [Redis: fila offline e conectividade](https://redis.io/docs/latest/develop/clients/nodejs/produsage/).
- [Tags oficiais PostgreSQL](https://github.com/docker-library/official-images/blob/master/library/postgres).
- [Tags oficiais Redis](https://github.com/docker-library/official-images/blob/master/library/redis).

Compatibilidade declarada pelas dependências não substitui instalação e testes. Confirmar a árvore resolvida antes de marcar o incremento como concluído.
