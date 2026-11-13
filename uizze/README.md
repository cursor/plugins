# Uizze

**UI design that stands out**

![Uizze](https://raw.githubusercontent.com/uizze/uizze/main/plugins/openai-directory/uizze/assets/uizze-logo.png)

Uizze gives coding agents a free anti-ui-slop Skill and optional full MCP access to live UI references and license-clear materials. Use the skill to inspect the product and design system, write a design contract, cover required states, and run a bounded finish gate. The MCP answers one concrete unresolved UI question with strong full-screen references and finds license-clear materials for a concrete role.

## Get started

Install this package from Cursor’s plugin marketplace when available. The bundled `mcp.json` connects to Uizze through Cursor’s native MCP authentication. If you already configured Uizze manually, keep one active connection.

## Try it

> Help me ground a new interface in Uizze real screens.

> Find strong full-screen UI references for this unresolved interface question.

> Run the bounded UI finish gate on my rendered interface.

## Skill and MCP

The free skill includes its playbooks and licensing notices. It works without an account or MCP connection. The optional paid MCP uses the same Uizze account and service as the ChatGPT plugin. Complete the host’s native OAuth connection when prompted.

The MCP exposes `find_ui_references` and `find_ui_materials`. The skill’s finish gate uses the agent’s local inspection and rendering capabilities. No hosted review tool is included.

[Uizze](https://uizze.com/ai-ui-slop) · [Setup](https://uizze.com/docs) · [Support](https://uizze.com/contact) · [Privacy](https://uizze.com/privacy) · [Terms](https://uizze.com/terms)

## License

Uizze’s entry point is MIT licensed. The bundled skill declares Apache-2.0 and retains third-party notices, including the MIT notice for identified iOS material. Keep LICENSE, NOTICE, and MODIFICATIONS.md with the skill.

[Watch the Uizze before/after demonstration](https://github.com/uizze/uizze#watch-uizze-before-and-after).

The complete skill package is copied from [Uizze’s 1.3.1 source release](https://github.com/uizze/uizze/releases/tag/v1.3.1), pinned to commit `4a0224f578f65a87f328e9c533b3d8bf1023c1f7`. Its 16 files include eight playbooks, legal notices, checksum records, and per-playbook provenance. The manifest explicitly records the still-unknown original iOS source revision; this package update does not resolve that upstream provenance question or imply marketplace approval.
