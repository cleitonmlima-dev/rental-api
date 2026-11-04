# ADR-017 — Simplificação do README.md com foco em visão do serviço, execução e acesso

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-017](../specs/017-simplificacao-readme.md).  
Base: [ADR-009](009-entrega-e-verificacao.md).

## Contexto

O `README.md` continha relatórios históricos de sessão, detalhes internos de revisão e referências a ADRs/specs que
dificultavam a leitura rápida por quem deseja apenas entender o que é o serviço, subir o ambiente e acessar os
endpoints e ferramentas.

## Decisão

- Reescrever o `README.md` de forma direta e enxuta, contendo apenas:
  1. O que é o serviço e seus fluxos principais;
  2. Pré-requisitos e configuração inicial (`.env`);
  3. Como subir os serviços via Docker Compose ou localmente;
  4. Tabela de endereços e portas para acessar cada serviço (API, Swagger, Grafana, Prometheus, PostgreSQL,
     LocalStack);
  5. Comandos principais e exemplos rápidos de uso das rotas.
- Remover do `README.md` menções a ADRs, specs, histórico de sessão e formalidades documentais (que permanecem em
  `docs/`).

## Alternativas consideradas

- Manter o `README.md` extenso com histórico de ADRs e pendências de sessão: polui a página inicial do repositório.

## Consequências

- O `README.md` fica curto, objetivo e focado exclusivamente em explicar o serviço, como subir e como acessar.
- Toda a rastreabilidade arquitetural (ADRs e specs) permanece mantida em `docs/`.
