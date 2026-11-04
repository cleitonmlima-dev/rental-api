# SPEC-020 — Geração e versionamento do package-lock.json

ADR: [ADR-020](../adr/020-geracao-package-lock.md).  
Status: concluída  
Base: [SPEC-009](009-entrega-e-verificacao.md).

## Objetivo e escopo

Gerar e versionar o `package-lock.json` para destravar o estágio `build` do `Dockerfile` (`COPY package.json
package-lock.json ./` e `RUN npm ci`).

## Requisitos e comportamento esperado

- `engines.node` em `package.json` configurado como `>=24.21.0`.
- `package-lock.json` presente na raiz do repositório e sincronizado com `package.json`.
- Build TypeScript (`npm run build`) validada sem erros.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S20-01 | `package-lock.json` gerado e versionado na raiz do projeto. |
| S20-02 | `npm run build` conclui com código `0`. |

## Resultado e verificação

`package-lock.json` gerado, build verificada e arquivo enviado ao repositório remoto.
