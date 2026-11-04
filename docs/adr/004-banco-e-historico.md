# ADR-004 — Banco relacional e histórico de propostas

Status: aceita; persistência revisada pela ADR-010; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-004](../specs/004-banco-e-historico.md).  
Base: [ADR-002](002-modelo-e-fluxos-da-v1.md).

## Contexto

A V1 precisa das cinco tabelas definidas na SPEC-002, com histórico transacional e exclusividade por imóvel. O responsável autorizou implementar todos os incrementos, mantendo pendentes os checks que dependem das ferramentas indisponíveis nesta sessão.

## Decisão

Criar migrations SQL versionadas pelo TypeORM, com três schemas, constraints nomeadas e permissões por coluna. A escolha original de SQL nos serviços foi substituída pela [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md): cinco entidades e três repositórios concretos TypeORM, com serviços sem banco direto. `synchronize` permanece desabilitado; migrations controlam estrutura/permissões. Proposta/histórico usam enum e o controle técnico fica em `public.typeorm_migrations`.

O único trigger registra criação/mudança de estado, com ID próprio, timestamp da proposta e correlação local. Não valida o processo nem altera imóveis. CPF/e-mail são únicos; índice parcial inclui `ATIVO` e exclui apenas `CANCELADA`/`REPROVADA`.

## Alternativas

A alternativa original evitava mapeamentos ORM; a revisão 010 passou a preferir entidades/repositórios concretos para legibilidade, sem abstração genérica. Triggers de processo foram rejeitados na ADR-002.

## Consequências

O SQL fica visível e testável com PostgreSQL real. Migrations aplicadas não serão alteradas; reversão estrutural apaga dados e só deve ocorrer em banco de teste ou com recuperação planejada. Implementação sequencial não significa aceite das fases: instalação, migrations e testes continuam pendentes até execução real.
