# Pulse Convert

Cursor plugin that connects agents to Pulse Convert by [Office Solution AI Labs](https://innovationalofficesolution.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Assess BI, ETL, data warehouse, and app migrations to Power BI, Fabric, and Databricks.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Pulse Convert**.
3. Click **Install**.

Or run `/add-plugin iofficesolution` in chat.

## MCP

```json
{
  "mcpServers": {
    "iofficesolution": {
      "type": "http",
      "url": "https://mcp.innovationalofficesolution.com/pulse-convert/"
    }
  }
}
```

The server needs no authentication, so there is no API key or sign-in to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Supported migrations | List the 40+ source platforms and their Power BI, Fabric, Databricks, and Power Platform targets |
| Assessments | Estimate complexity, risks, and a roadmap for a migration (for example, 100 Tableau reports to Power BI) |
| Audits | Request a migration audit with Office Solution AI Labs |

Supported sources include:

- **BI:** Tableau, Qlik, SAP BusinessObjects, Cognos, MicroStrategy, SSRS, Crystal Reports, and OAC to Power BI and Fabric.
- **ETL:** SSIS, Alteryx, Informatica, SAS, and SSAS to Fabric and Databricks.
- **Data warehouses:** Snowflake, Teradata, Oracle, Redshift, Hive, Azure Synapse, SQL Server, and SAP BW to Fabric and Databricks.
- **Apps:** UiPath, Excel, and MS Access to Power Platform and Fabric.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Requesting an audit sends the name and email you provide to Office Solution AI Labs.

## Docs

- Office Solution AI Labs: https://innovationalofficesolution.com
- Server URL: https://mcp.innovationalofficesolution.com/pulse-convert/

Logo is the Office Solution mark from the `officesolutionailabs` GitHub account, at 256×256. The submitted logo URL (`https://innovationalofficesolution.com/assets/logo1-iwG62byB.png`) could not be downloaded from the build environment when this plugin was added.

## License

MIT
