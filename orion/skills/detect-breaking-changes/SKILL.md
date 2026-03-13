---
name: detect-breaking-changes
description: Detectar breaking changes em diff de Git/PR. Use em code review ou antes de merge para validar alterações de schema.
---

# Detectar breaking changes

Analisar diffs de Git ou PR para identificar alterações de schema que quebram contratos e consumers downstream.

## Trigger

O usuário está em code review, criando PR ou quer validar mudanças de schema antes do merge.

## Inputs

- Diff de Git: `git diff`, `git diff main...branch` ou saída de PR.
- Contratos existentes (arquivos `*.contract.yml`, `schema.yml`, etc.).
- Opcional: lista de consumers conhecidos ou dependências (dbt lineage).

## Workflow

1. Obter diff relevante:
   - PR diff (GitHub/GitLab) ou `git diff main...HEAD` para arquivos de contrato e código de transformação.

2. Identificar alterações de schema:
   - Colunas removidas.
   - Tipos alterados (ex: string -> int, precision reduzida).
   - Colunas renomeadas sem alias.
   - Constraints removidas (NOT NULL, UNIQUE).
   - Colunas adicionadas em posição que quebre ordem esperada (quando aplicável).

3. Classificar severidade:
   - **Breaking**: remoção de coluna, mudança de tipo incompatível, remoção de constraint.
   - **Potencialmente breaking**: renomeação, mudança de nullable.
   - **Non-breaking**: adição de coluna nullable, extensão de tipo.

4. Sugerir mitigação:
   - Manter coluna antiga com deprecation.
   - Adicionar coluna nova em paralelo antes de remover antiga.
   - Documentar breaking change e notificar consumers.

## Regras de compatibilidade

| Mudança | Breaking? |
|---------|-----------|
| Remover coluna | Sim |
| Alterar tipo (string↔int, reduzir precision) | Sim |
| Remover NOT NULL | Não (relaxa contrato) |
| Adicionar NOT NULL sem default | Sim |
| Adicionar coluna nullable | Não |
| Renomear coluna | Sim |
| Adicionar coluna no final | Geralmente não |

## Guardrails

- Não marcar como breaking alterações em comentários ou descrições.
- Considerar apenas arquivos de contrato e código que afeta schema (SQL, dbt, etc.).
- Se não houver contratos explícitos, inferir do diff de CREATE/ALTER.

## Output

- Lista de breaking changes encontradas com arquivo e linha.
- Classificação de severidade.
- Sugestões de mitigação.
- Resumo para mensagem de PR ou comentário de review.
