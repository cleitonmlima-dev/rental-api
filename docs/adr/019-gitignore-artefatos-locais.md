# ADR-019 — Ignorar desafio.pdf e skills-lock.json no controle de versão

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-019](../specs/019-gitignore-artefatos-locais.md).  
Base: [ADR-009](009-entrega-e-verificacao.md).

## Contexto

Ao preparar os commits por camadas para publicação no repositório GitHub, os arquivos locais `desafio.pdf` e
`skills-lock.json` não devem ser versionados no repositório remoto.

## Decisão

- Adicionar `desafio.pdf` e `skills-lock.json` ao `.gitignore`.
- Organizar os commits do repositório separando-os por camadas lógicas (configuração/build, infraestrutura e banco,
  camada HTTP compartilhada, módulos de domínio, bootstrap da aplicação, containers/observabilidade/CI, testes e
  documentação).

## Alternativas consideradas

- Manter `desafio.pdf` e `skills-lock.json` fora do `.gitignore`: deixaria arquivos não rastreados permanentes na
  árvore de trabalho.

## Consequências

- `git status` permanece limpo após os commits por camadas, sem publicar `desafio.pdf` e `skills-lock.json`.
