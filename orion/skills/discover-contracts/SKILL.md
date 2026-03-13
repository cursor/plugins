---
name: discover-contracts
description: Descobrir contratos de dados a partir de código (SQL, dbt, pandas, PySpark). Use quando precisar extrair esquemas e constraints de transformações de dados.
---

# Descobrir contratos de dados

Extrair esquemas, tipos e constraints implícitos de código para gerar contratos versionáveis.

## Trigger

O usuário precisa inferir o contrato de dados (schema, tipos, constraints) a partir de transformações em SQL, dbt, pandas ou PySpark.

## Inputs

- Caminhos ou snippets de código: `.sql`, `.yml` (dbt), `.py` (pandas/PySpark)
- Contexto do workspace: modelos dbt, pipelines, definições de tabelas

## Workflow

1. **SQL**:
   - Parsear CREATE TABLE, CREATE VIEW, SELECT com alias.
   - Inferir tipos a partir de funções (CAST, ::, colunas de JOIN).
   - Identificar colunas NOT NULL, PRIMARY KEY, UNIQUE quando explícitos.

2. **dbt**:
   - Ler `schema.yml`, `sources.yml`, `models/**/*.yml`.
   - Extrair colunas e testes do contrato (dbt contracts).
   - Inferir tipos de `ref()` e `source()` quando disponíveis.

3. **pandas**:
   - Inferir schema de `read_*`, `assign()`, `astype()`, `rename()`.
   - Detectar renomeação e criação de colunas em cadeias de transformação.

4. **PySpark**:
   - Inferir schema de `withColumn`, `select`, `withColumnRenamed`.
   - Respeitar tipos do schema explícito quando definido.

5. Consolidar descobertas em estrutura de contrato padronizada (JSON/YAML).

## Formato de contrato sugerido

```yaml
table: nome_tabela
columns:
  - name: coluna_a
    type: string
    nullable: false
  - name: coluna_b
    type: integer
    nullable: true
source: path/to/code.sql
```

## Guardrails

- Marcar colunas/tipos como inferidos quando não explícitos no código.
- Priorizar definições explícitas sobre inferência.
- Não inventar constraints que não existam no código.

## Output

- Estrutura de contrato proposta (colunas, tipos, nullable, source).
- Lista de incertezas ou suposições feitas.
- Sugestão de onde persistir o contrato (ex: ao lado do modelo dbt).
