# SPEC-009 — Entrega e verificação

ADR: [ADR-009](../adr/009-entrega-e-verificacao.md).  
Status: fontes preparadas; ferramental revisado pelas SPECs 010 e 011; execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md#11-critérios-de-aceite).

## Objetivo e comportamento

Entregar código da V1, testes, Compose completo, dashboards, Swagger, CI e instruções reproduzíveis. O banco de teste é separado, temporário no perfil `test` e não é dependência da API. A [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md) remove anchors/tooling/cache do Compose, usa npm nativo no README/CI e acrescenta LocalStack SNS/SQS. A [SPEC-011](011-testes-apenas-integracao.md) mantém exclusivamente os testes de integração com `node:test`. São dez serviços padrão mais o banco de testes. Nenhum teste trunca o banco de desenvolvimento.

Há nove suítes de integração preparadas, ainda não executadas. Cobrir os AC-01 a AC-25: contratos, regras, matriz, idempotência, concorrência, rollback, permissões, evento e indicadores. Expor erros sem dados pessoais. Testes de negócio exigem URLs de banco terminado em _test, migram esse banco e criam fixtures únicas.

## Aceite e pendências

Gerar lockfile real, executar instalação/checks, bootstrap/migrations, testes de integração e jornada em ambiente limpo; conferir ingestão/dashboards e permissões. Registrar resultado de cada grupo no plano. Enquanto Docker/Node/rede não estiverem disponíveis, manter esses itens pendentes, mesmo com todos os arquivos implementados.

Limpeza limita-se a arquivos gerados/metadata sem função, sem remover requisito, regra ou teste necessário. Publicação e envio do link não são automatizados.
