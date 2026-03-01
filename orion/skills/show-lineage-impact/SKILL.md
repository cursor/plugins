---
name: show-lineage-impact
description: Mostrar impacto de mudanças em lineage (upstream/downstream). Use antes de alterar schemas para entender dependências.
---

# Mostrar impacto de lineage

Mapear dependências upstream e downstream de tabelas/modelos para avaliar impacto de mudanças.

## Trigger

O usuário vai alterar um schema ou modelo e precisa saber quem consome os dados (downstream) e de onde vêm (upstream).

## Inputs

- Tabela ou modelo alterado.
- Fonte de lineage: dbt manifest, SQL parse, catálogo de metadados, ou inferência a partir do código.

## Workflow

1. **Identificar upstream**:
   - dbt: `ref()`, `source()`.
   - SQL: JOINs, CTEs, subqueries, tabelas referenciadas.
   - Pandas/PySpark: arquivos, tabelas em `read_*`, inputs de pipeline.

2. **Identificar downstream**:
   - dbt: modelos que referenciam este via `ref()`.
   - Código: queries, relatórios, APIs que leem a tabela.
   - Inferir a partir de buscas no repositório por nome da tabela.

3. **Construir grafo**:
   - Nós: tabelas/modelos.
   - Arestas: dependências diretas.
   - Anotar com tipo (ref, source, inferred).

4. **Apresentar impacto**:
   - Lista de consumers downstream (ordenada por proximidade).
   - Lista de produtores upstream.
   - Aviso: breaking changes afetarão N downstream diretos e possivelmente transitivos.

## Fontes de lineage

- **dbt**: `target/manifest.json`, `dbt docs generate`.
- **SQL**: parse de `FROM`, `JOIN`, `WITH` para extrair tabelas.
- **Código**: grep/busca por padrões de acesso à tabela.

## Formato de saída

```
Upstream:
  - raw.events (source)
  - staging.orders (ref)

Downstream:
  - mart.orders_daily (ref)
  - mart.revenue_report (ref)
  - [inferred] reports/dashboard_x.sql

Impact: 2 modelos dbt + 1 artefato inferido
Breaking changes aqui afetarão mart.orders_daily e mart.revenue_report.
```

## Guardrails

- Diferenciar lineage explícito (dbt, catalog) de inferido.
- Alertar quando downstream não for determinável com confiança.
- Não assumir que ausência de refs signifique zero consumers.

## Output

- Grafo ou lista de upstream/downstream.
- Contagem de impactados.
- Sugestão de ordem de deploy ou comunicação para consumers.
