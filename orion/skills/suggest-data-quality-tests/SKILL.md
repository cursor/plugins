---
name: suggest-data-quality-tests
description: Sugerir testes de qualidade de dados automaticamente a partir de contratos e contexto. Use para dbt, Great Expectations, ou frameworks customizados.
---

# Sugerir testes de qualidade de dados

Gerar sugestões de testes de qualidade baseadas em contrato de dados, tipos e heurísticas de domínio.

## Trigger

O usuário precisa de testes de qualidade para uma tabela, modelo dbt ou dataset recém-criado/alterado.

## Inputs

- Contrato ou schema da tabela.
- Contexto: dbt, Great Expectations, pytest + custom assertions.
- Domínio quando conhecido (ex: financeiro, eventos, dimensões).

## Workflow

1. **Por tipo de coluna**:
   - `string`: not_null, unique (se indicar PK), não-vazio.
   - `numeric`: not_null, between, accepted_range.
   - `timestamp`: not_null, freshness (para tabelas incrementais).
   - `boolean`: accepted_values [true, false].
   - `enum-like`: accepted_values baseado em amostra ou convenção.

2. **Por convenção de nome**:
   - `*_id`, `id`: not_null, unique.
   - `*_at`, `created_at`, `updated_at`: not_null, freshness.
   - `*_count`, `*_total`: not_null, >= 0.
   - `*_email`: formato email.
   - `*_url`: formato URL quando aplicável.

3. **Por domínio**:
   - Dimensões: integridade referencial (FK), completeness.
   - Fatos: consistência de métricas, ranges esperados.
   - Staging: duplicatas, nulls em colunas críticas.

4. **Formato de saída**:
   - dbt: blocos `schema.yml` com `tests:`.
   - Great Expectations: expectation snippets.
   - SQL genérico: queries de validação.

## Exemplo dbt

```yaml
columns:
  - name: order_id
    description: Unique order identifier
    tests:
      - unique
      - not_null
  - name: customer_id
    tests:
      - not_null
      - relationships:
          to: ref('customers')
          field: id
  - name: order_amount
    tests:
      - not_null
      - dbt_utils.accepted_range:
          min_value: 0
          max_value: 1000000
```

## Guardrails

- Não sugerir testes impossíveis (ex: unique em coluna que admite duplicatas).
- Priorizar testes críticos (PK, FKs, not_null em colunas de negócio).
- Evitar redundância (não repetir testes óbvios por tipo).

## Output

- Blocos de teste prontos para copiar (dbt/GE/SQL).
- Priorização: crítico, recomendado, opcional.
- Breve justificativa por teste sugerido.
