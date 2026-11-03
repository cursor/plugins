# tensorViz

Explore local PyTorch model graphs and measured tensor shapes (Apple Silicon preview).

The plugin connects Cursor to a local tensorViz MCP host and supplies the
`model-workflow` skill. Capture a PyTorch `nn.Module`, inspect the measured input
and output shapes, and refresh the graph after a saved source edit. Use the local
browser graph when the client does not support the embedded Model graph panel.

## Requirements

- macOS on Apple Silicon, with CPU capture.
- CPython 3.12 with PyTorch and your model's dependencies, or supported managed
  Python setup after permission is granted.
- Network access for the first runtime download and any approved dependency setup.
- Cursor with plugins enabled. Account, organization, and tool permissions apply.

This compiled preview does not support Windows, Linux, Intel Macs, or other Python
ABIs. CUDA is unverified. VS Code, a separate Node.js installation, a tensorViz
account, and a provider API key are not required by tensorViz.

## Install and use

Once approved and listed, open **Customize**, find **tensorViz**, and select
**Install**. Until then, use the [local evaluation instructions](docs/installation.md).
Start a new Agent chat in your model project and ask:

> Use tensorViz to open my PyTorch model, capture its saved example input, and
> explain the tensor shapes. Show the graph, then refresh it after my saved edit.

Provide the model file, class, constructor arguments, and example inputs when
needed. Review tensorViz's first-use permission prompt: capture executes your
local model code, and approved setup can install Python and dependencies.
Select a compatible project environment when requested. Saved `tensorviz.toml`
recipes can be reused; model-specific packages and assets may still need setup.

A successful capture contains measured shapes for the selected input and
execution. A source preview alone does not establish a successful capture.
Graph display and capture are separate results.

## Runtime and data

The readable launcher downloads the public **0.3.60** compiled runtime from GitHub
Releases, verifies the SHA-256 digest pinned in `runtime-lock.json`, and caches the
archive for later connections. It checks the archive on every connection and
extracts separate session files. A checksum mismatch stops startup. This directory
contains the integration; the runtime is downloaded separately.

Graph evidence, source excerpts, and paths returned through MCP enter Cursor and
may enter its model-provider conversation. Recipes, captures, environments,
runtime caches, and permission records stay on the local machine until removed.
Approved Python setup contacts package providers; imported model code can use its
own services. The tldraw renderer's production trial can send license-usage
information to tldraw, excluding canvas content. See [privacy](PRIVACY.md).

The bundled renderer trial expires **26 December 2026**. Continued renderer use
requires a renewed license and an updated runtime; existing downloads retain
their original embedded key. See [terms](TERMS.md).

See [installation, updates, and removal](docs/installation.md),
[support](SUPPORT.md), [the public integration repository](https://github.com/tensorviz-org/tensorviz-plugins),
and [tensorviz.dev](https://tensorviz.dev). The integration is [MIT licensed](LICENSE);
runtime components retain their applicable terms and notices.
