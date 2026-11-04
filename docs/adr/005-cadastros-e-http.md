# ADR-005 — Cadastros e contrato HTTP

Status: aceita; persistência/contratos revisados pela ADR-010; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-005](../specs/005-cadastros-e-http.md).

## Contexto e decisão

A decisão original usou SQL explícito nos serviços e DTOs class-validator/class-transformer. Esses pontos foram substituídos pela [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md): entidades/repositórios TypeORM, schemas Zod com DTOs inferidos e OpenAPI nativo, catálogo de erros/enums compartilhados e `location` no corpo dos POSTs. Não criar repositórios ou mapeadores genéricos.

Normalizar CPF para dígitos sem validador cadastral, e-mail para minúsculas/trim e IDs para UUID canônico. FKs e índices traduzem referências ausentes/duplicidades; não repetir consultas de existência antes de todo insert.

Usar paginação comum e um filtro de erros com códigos estáveis, request ID gerado por tentativa e detalhes de validação sem valores pessoais. Constraints conhecidas de negócio são reconhecidas por SQLSTATE/nome, sem comparar texto de erro. A [ADR-012](012-erros-internos-genericos.md) unifica as demais falhas internas em um erro genérico, sem classificar sua causa no contrato externo.

## Alternativas e consequências

Validação manual por controller duplicaria o contrato. A objeção original a repositórios foi revista: a ADR-010 usa três repositórios concretos, sem interfaces genéricas ou mappers adicionais. Respostas não têm relacionamentos completos embutidos; consultas não prometem snapshot entre páginas. CPF não ganha checksum/comprimento obrigatório nesta decisão.
