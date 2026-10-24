# Changelog

## Unreleased

- README: remove the Commands table and the `/create-plugin` step. The plugin ships skills, a rule and an agent; it has never had a `commands/` directory, and the manifest declares none (#475).

## 1.0.0

- Initial release of the `create-plugin` meta plugin.
- Added scaffolding and submission-review skills for Cursor plugin authoring.
- Added a plugin architecture agent, quality-gate rule, and `create-plugin` command.
