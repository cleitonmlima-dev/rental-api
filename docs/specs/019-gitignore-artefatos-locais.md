# SPEC-019 — Exclusão de desafio.pdf e skills-lock.json no .gitignore

ADR: [ADR-019](../adr/019-gitignore-artefatos-locais.md).  
Status: concluída  
Base: [SPEC-009](009-entrega-e-verificacao.md).

## Objetivo e escopo

Atualizar o `.gitignore` para ignorar `desafio.pdf` e `skills-lock.json` e estruturar o versionamento inicial em
commits separados por camadas.

## Requisitos e comportamento esperado

- `.gitignore` deve listar `desafio.pdf` e `skills-lock.json`.
- Os demais arquivos do projeto devem ser versionados em commits separados por camadas e enviados ao repositório remoto.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S19-01 | `.gitignore` ignora `desafio.pdf` e `skills-lock.json`. |
| S19-02 | Commits separados por camadas criados e enviados para `origin/master`. |

## Resultado e verificação

`.gitignore` atualizado e commits organizados por camadas.
