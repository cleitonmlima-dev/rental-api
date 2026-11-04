# SPEC-008 — Observabilidade

ADR: [ADR-008](../adr/008-observabilidade.md).  
Status: fontes preparadas; complementada pela SPEC-010; execução pendente  
Base: [indicadores](../especificacao-tecnica.md#12-observabilidade).

## Objetivo e comportamento

Instrumentar antes dos imports HTTP/pg, exportar OTLP para Collector e provisionar métricas, logs, traces e datasources/dashboards. IDs servem apenas a correlação/logs; labels limitam-se a método, rota normalizada, status, operação e resultado. Nunca registrar corpos/CPF/e-mail/endereço.

Views fornecem estoques com zeros, cadastros por dia, encerramentos, duração concluída e idade aberta. Média/p95 usam intervalos originais encerrados em [início,fim); sem amostra não vira zero. Observer consulta apenas views, sem leitura direta de clientes.

A [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md) mede falhas SNS por estado após commit, sem alterar HTTP; duração transacional exclui espera pela publicação. Views, logs, métricas e dashboards estão preparados, sem ingestão/visualização comprovada.

## Aceite

Conferir views com histórico conhecido e rollback/replay, permissões observer, labels, correlação Loki→Tempo e os três dashboards. Desligar telemetria e confirmar continuidade. Shutdown faz flush limitado sem segurar o processo indefinidamente. Arquivos JSON/YAML válidos não comprovam ingestão ou visualização reais.
