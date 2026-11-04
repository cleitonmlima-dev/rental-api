# SPEC-004 — Banco e histórico

Status: fontes preparadas; revisada pela SPEC-010; execução pendente  
ADR: [ADR-004](../adr/004-banco-e-historico.md).  
Contrato: [SPEC-002](002-implementacao-rental-pipeline.md#4-modelo-relacional).

## Objetivo e escopo

Criar os schemas customer/property/proposal e as cinco tabelas da V1. Não criar controle de versão ou matriz de transição no banco. O papel da aplicação não escreve diretamente no histórico nem altera as referências de uma proposta existente.

## Comportamento

- Nome/CPF/e-mail e endereço obrigatórios; CPF apenas dígitos, sem checksum/comprimento cadastral.
- Proprietário e referências de proposta por FK; endereço não é único.
- Uma proposta ocupante por imóvel, incluindo ativa.
- Trigger de histórico na mesma transação; criação com origem null; mudança sem alteração de estado não gera outro registro.
- Chave de idempotência única e resposta preenchida pela aplicação antes do commit.
- Proposta/histórico usam `proposal.proposal_status`; controle em `public.typeorm_migrations`. A migration inicial cria os três schemas e o bootstrap limita DDL ao migrator, conforme a [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md).

## Aceite

Aplicar migrations em banco vazio; verificar constraints/permissões, índice parcial, histórico, rollback e reversão em banco isolado. Os testes de integração da entrega precisam ser executados com os papéis reais. Sem execução, registrar código preparado e checks pendentes no plano.
