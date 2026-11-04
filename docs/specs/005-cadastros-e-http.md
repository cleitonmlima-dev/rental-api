# SPEC-005 — Cadastros e HTTP

ADR: [ADR-005](../adr/005-cadastros-e-http.md).  
Status: fontes preparadas; revisada pela SPEC-010; execução pendente  
Base: [contratos da SPEC-002](002-implementacao-rental-pipeline.md#9-contratos-http).

## Objetivo e comportamento

Entregar POST/GET individual/lista para clientes e imóveis, filtros e paginação. IDs/datas/estado inicial são do servidor. Proprietário obrigatório por FK; endereço repetido aceito. Schemas Zod rejeitam campos desconhecidos e CPF vazio após normalização, sem teto/checksum cadastral; DTOs são inferidos. Entidades/repositórios executam ORM e os POSTs retornam `location` no corpo, conforme a [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md).

Erros seguem o envelope statusCode/code/message/path/requestId, trace opcional; X-Request-Id é gerado pelo servidor. Consultas usam page/limit e ordenação definida na base; page fica limitado ao inteiro positivo de 32 bits para manter offset numérico seguro. Não há edição/exclusão.

A [SPEC-012](012-erros-internos-genericos.md) define `500 INTERNAL_ERROR` com
`Não foi possível concluir a operação.` para falhas internas, sem causa/detalhes de infraestrutura.
Constraints conhecidas de unicidade/referência preservam os conflitos e referências inexistentes de negócio.

## Aceite

Testar DTOs, normalização, CPF/e-mail duplicados, proprietário inexistente, filtros, paginação, campos desconhecidos e privacidade de erros. Verificar Swagger e respostas HTTP com PostgreSQL real. Falta de execução deve permanecer registrada, sem promover código a aceite.
