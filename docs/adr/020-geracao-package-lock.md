# ADR-020 — Geração e versionamento do package-lock.json para build Docker reproduzível

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-020](../specs/020-geracao-package-lock.md).  
Base: [ADR-009](009-entrega-e-verificacao.md).

## Contexto

O `Dockerfile` executa `COPY package.json package-lock.json ./` e `RUN npm ci --no-audit --no-fund`, falhando no build
do Docker Compose (`"/package-lock.json": not found`) enquanto o `package-lock.json` não estiver gerado e versionado no
repositório.

## Decisão

- Ajustar `engines.node` em `package.json` para `>=24.21.0` (permitindo execução local em Node 24+ além do container
  `node:24.21.0-bookworm-slim`).
- Gerar o `package-lock.json` a partir do `package.json`, validar a compilação TypeScript (`npm run build`) e versionar
  o `package-lock.json` no repositório.

## Alternativas consideradas

- Trocar `npm ci` por `npm install` sem lockfile no `Dockerfile`: perderia determinismo de versões nas builds de
  container e no CI.

## Consequências

- `docker compose up --build` encontra `package-lock.json` imediatamente e executa `npm ci` de forma determinística.
