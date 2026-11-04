# SPEC-015 — Erro genérico de conflito no cadastro de clientes

ADR: [ADR-015](../adr/015-conflito-generico-cadastro-cliente.md).  
Status: fontes atualizadas; verificação de execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md) e [SPEC-012](012-erros-internos-genericos.md).

## Objetivo e escopo

Impedir a enumeração de CPFs e e-mails no endpoint `POST /api/v1/customers`, substituindo os códigos e mensagens
específicos de duplicidade cadastral por um erro `409 CONFLICT` genérico.

## Requisitos e comportamento esperado

- Colisões nas constraints `uq_customers_cpf` e `uq_customers_email_normalized` devem retornar status HTTP `409`,
  `code: "CONFLICT"` e `message: "Não foi possível concluir a operação."`.
- Os códigos `CUSTOMER_CPF_ALREADY_EXISTS` e `CUSTOMER_EMAIL_ALREADY_EXISTS` e as entradas
  `customerCpfAlreadyExists` e `customerEmailAlreadyExists` não devem mais existir em `src/shared/http/api-error.ts`.
- O envelope de erro preserva `statusCode: 409`, `path`, `requestId` e `traceId` (quando ativo).

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S15-01 | `POST /api/v1/customers` com CPF já existente retorna `409`, `code: "CONFLICT"` e `message: "Não foi possível concluir a operação."`. |
| S15-02 | `POST /api/v1/customers` com e-mail já existente (inclusive com caixa diferente) retorna exatamente o mesmo `409 CONFLICT` genérico. |
| S15-03 | `CUSTOMER_CPF_ALREADY_EXISTS` e `CUSTOMER_EMAIL_ALREADY_EXISTS` não existem mais em `src/` nem em `test/`. |

## Resultado e verificação

Catálogo de erros, filtro de exceções, suíte de integração (`test/integration/business.spec.ts`) e documentação de
contratos atualizados nas fontes. A execução da suíte aguarda o ambiente com dependências e banco de testes ativo.
