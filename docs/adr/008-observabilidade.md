# ADR-008 — Observabilidade com OTel e indicadores SQL

Status: aceita; publicação complementada pela ADR-010; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-008](../specs/008-observabilidade.md).

## Contexto e decisão

Usar OpenTelemetry para HTTP/PostgreSQL, métricas técnicas e logs, carregado antes da aplicação. Logs também saem como JSON em stdout. Exportadores possuem timeout e filas limitadas; falha de telemetria não entra no resultado do negócio/readiness.

Grafana consulta views SQL com papel observer para os indicadores de negócio. A duração de etapa usa pares de histórico calculados antes do filtro temporal, somente intervalos concluídos; idade aberta é separada. Fuso de negócio America/Sao_Paulo, instantes UTC.

O Compose contém Collector/Prometheus/Loki/Tempo/Grafana e três dashboards provisionados. Não criar serviço de métricas de negócio ou labels com dados pessoais/IDs. O limite de consulta do cliente PG usa o prazo da operação, maior que o limite de instrução no servidor, evitando disputar o mesmo instante do cancelamento SQL.

A [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) mantém essa arquitetura e passa a medir falhas SNS por status em `rental_publication_failures`. Duração transacional termina antes de aguardar SNS. Ingestão e dashboards ainda não foram executados.

## Alternativas e consequências

Contadores em memória não são fonte adequada de estoque/histórico. Consultas agregadas no PostgreSQL são suficientes ao volume não especificado da V1. Não alegar SLO, capacidade ou entrega durável por causa desses painéis. O estado de execução deve ser verificado em ambiente real.
