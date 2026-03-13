---
name: generate-contracts
description: Gerar e manter arquivos de contrato versionáveis. Use quando precisar criar ou atualizar contratos a partir de descobertas ou mudanças de schema.
---

# Gerar e manter contratos versionáveis

Criar e atualizar arquivos de contrato em formato padronizado, versionáveis com Git.

## Trigger

O usuário precisa gerar ou atualizar contratos de dados após descoberta ou mudança de schema.

## Inputs

- Contrato descoberto (de `discover-contracts`) ou schema existente.
- Convenção do projeto: dbt, standalone YAML/JSON, formato customizado.
- Local de persistência preferido (ex: `contracts/`, junto aos modelos dbt).

## Workflow

1. Definir convenção de nomenclatura e local dos arquivos:
   - dbt: `models/<model>/schema.yml` ou `contracts/<model>.contract.yml`.
   - Standalone: `contracts/<dataset>.<table>.yml`.

2. Gerar arquivo de contrato:
   - Colunas ordenadas de forma consistente.
   - Tipos normalizados (ex: bigint vs integer conforme convenção).
   - Metadados: `version`, `updated_at`, `source`.

3. Se contrato existir:
   - Fazer diff com versão atual.
   - Preservar campos customizados (descrições, tags).
   - Atualizar apenas colunas/tipos alterados.

4. Garantir versionabilidade:
   - Formato legível e diff-friendly (YAML preferido).
   - Sem IDs ou timestamps que quebrem merges.

## Formato de arquivo (YAML)

```yaml
version: 1
table: schema.table_name
updated_at: 2026-02-22
source: models/staging/table.sql
columns:
  - name: id
    type: bigint
    nullable: false
    description: Primary key
  - name: created_at
    type: timestamp
    nullable: false
```

## Guardrails

- Evitar sobrescrever anotações manuais (descrições, ownership).
- Manter ordem alfabética ou lógica consistente entre gerações.
- Documentar quebras de contrato em CHANGELOG ou commit message.

## Output

- Arquivo de contrato criado ou atualizado.
- Diff entre versão anterior e nova (quando aplicável).
- Sugestão de commit message descritiva.
