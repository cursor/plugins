# UIZZE for Cursor

UIZZE helps Cursor stop generic UI before it ships. The free `anti-ui-slop` skill defines a product-specific design contract, required states, and a hard finish gate; the optional MCP adds live reference search, validation, audits, and rendered critique.

Install the skill directly from UIZZE:

```bash
npx skills add https://uizze.com --skill anti-ui-slop
```

The optional hosted MCP and current setup are documented in the [UIZZE repository](https://github.com/uizze/uizze).

## Try it on your next screen

Open the page you want to improve and ask Cursor:

```text
Use anti-ui-slop on our billing settings page. Make the current plan,
payment method, and invoices easy to scan. Reuse our components and tokens.
Preserve billing behavior. Cover loading, no invoices, failure with retry,
and a successful update. Inspect desktop and mobile output and fix visible
breakage before finishing.
```

[Watch the 30-second UIZZE comparison](https://github.com/uizze/uizze#watch-uizze-before-and-after),
or [try more tasks for tables, permissions, and iOS](https://github.com/uizze/uizze/blob/main/examples/agent-workflows.md).

For focused reference search, follow the
[Cursor MCP connection guide](https://github.com/uizze/uizze/tree/main/integrations/mcp#cursor).

[**Build your next screen with UIZZE →**](https://uizze.com/?utm_source=cursor&utm_medium=plugin_marketplace&utm_campaign=cursor_plugin_v1&utm_content=readme_first_task)
