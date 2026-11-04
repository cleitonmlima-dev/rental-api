# ADR-015 — Erro genérico de conflito no cadastro de clientes para evitar enumeração de dados pessoais

Data: 04/11/2026  
Status: aceita; fontes atualizadas; aceite de execução pendente  
Spec: [SPEC-015](../specs/015-conflito-generico-cadastro-cliente.md).  
Base: [ADR-005](005-cadastros-e-http.md) e [ADR-012](012-erros-internos-genericos.md).

## Contexto

O cadastro de clientes (`POST /api/v1/customers`) retornava códigos e mensagens distintos quando ocorria violação de
unicidade de CPF (`409 CUSTOMER_CPF_ALREADY_EXISTS`: `"CPF já cadastrado."`) ou de e-mail
(`409 CUSTOMER_EMAIL_ALREADY_EXISTS`: `"E-mail já cadastrado."`). Expor publicamente qual documento ou endereço de
e-mail já consta na base permite enumeração direta de dados pessoais (PII) por consumidores da API.

## Decisão

- Remover `CUSTOMER_CPF_ALREADY_EXISTS` e `CUSTOMER_EMAIL_ALREADY_EXISTS` de `ApiErrorCode` e `apiErrors` em
  `src/shared/http/api-error.ts`.
- Introduzir o erro genérico de conflito `CONFLICT` (`apiErrors.conflict`, status `409`, mensagem
  `"Não foi possível concluir a operação."`).
- Mapear as constraints `uq_customers_cpf` e `uq_customers_email_normalized` em `src/shared/http/exception.filter.ts`
  para `apiErrors.conflict`, mantendo o status HTTP `409` (para não inflar métricas de erro `5xx`) sem revelar se o
  conflito decorreu de CPF ou de e-mail.
- Atualizar `test/integration/business.spec.ts` e a documentação de contratos HTTP para validar o código `CONFLICT`.

## Alternativas consideradas

- Retornar `500 INTERNAL_ERROR` para colisões de CPF/e-mail: ocultaria o conflito, mas contaminaria a taxa de erros
  internos (`5xx`) do serviço em tentativas duplicadas de cadastro.
- Manter códigos separados por campo (`CUSTOMER_CPF_ALREADY_EXISTS` / `CUSTOMER_EMAIL_ALREADY_EXISTS`): permite
  enumeração explícita de CPFs e e-mails cadastrados.

## Consequências

- Respostas `409` no cadastro de clientes passam a usar `code: "CONFLICT"` e `"Não foi possível concluir a operação."`,
  sem distinguir CPF de e-mail e sem expor qual dado pessoal gerou a colisão.
- As métricas de conflito de negócio (`rental_business_conflicts`) continuam contabilizando o status `409` sob o
  código `CONFLICT`.
