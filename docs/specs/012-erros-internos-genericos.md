# SPEC-012 — Erros internos genéricos

ADR: [ADR-012](../adr/012-erros-internos-genericos.md).  
Status: requisitos definidos antes da implementação; verificação pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md).

## Objetivo e escopo

Impedir que respostas externas revelem a causa de falhas internas, incluindo banco, rede, contenção e estados
internos de reserva/replay. Aplicar o contrato no filtro HTTP, catálogo de erros, consumidores, Swagger e testes.
Preservar validação Zod, regras de negócio, integridade, transações, locks, Redis, SNS e sondas de saúde.

## Requisitos e comportamento esperado

- Falhas inesperadas, PostgreSQL e rede retornam 500, `INTERNAL_ERROR` e
  `Não foi possível concluir a operação.`, sem SQL, parâmetros, código do driver, causa ou detalhes internos.
- Toda `HttpException` com status 5xx recebe o mesmo código e mensagem, preservando o status HTTP e descartando
  seu corpo original, inclusive `code`, `message`, `details` e outras propriedades.
- Readiness consulta o banco e retorna 200 em sucesso ou 503 com o erro genérico em falha. Liveness permanece 200.
- Constraints conhecidas de unicidade/referência e erros legítimos de domínio mantêm seus códigos e mensagens.
  Imóvel indisponível e proposta em processamento continuam conflitos de negócio.
- Falhas de resultado idempotente/reserva inconsistente usam o erro interno comum, mantendo rollback e locks.
- O envelope mantém `statusCode`, `path`, `requestId` e `traceId` quando existente, além de `X-Request-Id`.
- Remover códigos/definições sem consumidores e respostas 503 dos recursos de negócio no Swagger.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| E-01 | Erros PG/rede, exceção desconhecida e 5xx com corpo próprio produzem o mesmo conteúdo genérico. |
| E-02 | HTTP não vaza SQL, parâmetros, estados internos, mensagem original ou detalhes; preserva correlação. |
| E-03 | Readiness real falha com 503 genérico e liveness permanece 200. |
| E-04 | Regras de domínio e contratos inválidos preservam os erros específicos existentes. |
| E-05 | Swagger e specs refletem 500 genérico nos recursos e 503 genérico apenas na sonda. |
| E-06 | ADR/spec vinculadas, catálogo e plano registram resultado e verificações executadas e pendentes. |

## Resultado e verificação

Implementação e checks pendentes. Dependências/lockfile ausentes e Docker sem acesso ao daemon já impediam
as suítes npm e integração; não substituir essas evidências por verificações estáticas.
