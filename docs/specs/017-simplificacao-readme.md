# SPEC-017 — Simplificação do README.md

ADR: [ADR-017](../adr/017-simplificacao-readme.md).  
Status: concluída  
Base: [SPEC-009](009-entrega-e-verificacao.md).

## Objetivo e escopo

Tornar o `README.md` direto e prático, apresentando apenas a descrição do serviço, o passo a passo para subir a
stack/aplicação e como acessar cada serviço e rota, sem referências a ADRs ou formalidades internas.

## Requisitos e comportamento esperado

- Explicar de forma sucinta o objetivo da API (clientes, imóveis e esteira de propostas de locação).
- Mostrar como preparar o `.env`, instalar dependências e subir os containers (`docker compose up --build`) ou rodar
  em modo de desenvolvimento.
- Listar claramente as URLs e portas de acesso de cada serviço no host (`3000` para API/Swagger, `3001` para Grafana,
  `9090` para Prometheus, `5432` para PostgreSQL, `4566` para LocalStack).
- Não mencionar ADRs, specs ou relatórios de sessão no `README.md`.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S17-01 | `README.md` contém apenas a explicação do serviço, instruções de subida, acessos e comandos essenciais. |
| S17-02 | Nenhuma menção a `ADR` consta no `README.md`. |

## Resultado e verificação

`README.md` atualizado e verificado.
