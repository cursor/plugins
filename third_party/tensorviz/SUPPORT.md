# Support and compatibility

This compiled candidate targets macOS Apple Silicon and CPython 3.12 CPU capture.
It does not require VS Code or Node.js. Explicitly selected incompatible Python
versions produce an error; TensorViz does not silently replace that environment.
Windows, Linux, Intel Macs, CUDA and other Python ABIs remain unverified targets.

The integration works with clients that support its local MCP transport and
plugin format. Directory publication is distinct from local installation, capture
and rendering. No official marketplace acceptance is claimed for this candidate.

When reporting a problem, include the integration version, OS/client version,
whether it failed during download, startup or capture, and a small synthetic
model. Do not share credentials, private viewer links, model secrets or unredacted
environment dumps. Use
[the integration repository's issues](https://github.com/tensorviz-org/tensorviz-plugins/issues)
for public, non-sensitive bug reports.
