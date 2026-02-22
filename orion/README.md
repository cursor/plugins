# Orion

Plugin focado em arquitetura de dados e ciência de dados: contratos versionáveis, detecção de breaking changes, testes de qualidade e lineage.

## Instalação

```bash
/add-plugin orion
```

## Componentes

### Skills

| Skill | Descrição |
|:------|:----------|
| `discover-contracts` | Descobrir contratos de dados a partir de código (SQL, dbt, pandas, PySpark) |
| `generate-contracts` | Gerar e manter arquivos de contrato versionáveis |
| `detect-breaking-changes` | Detectar breaking changes em diff de Git/PR |
| `suggest-data-quality-tests` | Sugerir testes de qualidade de dados automaticamente |
| `show-lineage-impact` | Mostrar impacto de mudanças em lineage (upstream/downstream) |

### Rules

| Rule | Descrição |
|:-----|:----------|
| `data-contract-standards` | Manter contratos de dados consistentes e versionáveis |

### Agents

| Agent | Descrição |
|:------|:----------|
| `orion-architect` | Planejar e implementar contratos, lineage e testes de qualidade de dados |

## Fluxo típico

1. Use `discover-contracts` para extrair esquemas e contratos de SQL, dbt, pandas ou PySpark.
2. Use `generate-contracts` para criar/atualizar arquivos de contrato versionáveis.
3. Use `detect-breaking-changes` em PRs para validar alterações de schema.
4. Use `suggest-data-quality-tests` para propor testes baseados no contrato.
5. Use `show-lineage-impact` para mapear impacto upstream/downstream antes de merge.

## Licença

MIT
