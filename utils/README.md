# Plugin Utilities

Shared utilities for working with Cursor plugin data.

## Plugin Display Names

When displaying plugin names in the UI, there are two scenarios:

### 1. Plugin Tiles/Cards (UI Display)

Use `getPluginDisplayName()` which:
- Returns `displayName` if set in plugin.json
- Otherwise converts kebab-case name to title case

```typescript
import { getPluginDisplayName } from './pluginDisplayName';

// Plugin without displayName
getPluginDisplayName({ name: 'hex-mcp' }); // 'Hex Mcp'
getPluginDisplayName({ name: 'amplitude-analysis' }); // 'Amplitude Analysis'
getPluginDisplayName({ name: 'deploy-on-aws' }); // 'Deploy On Aws'

// Plugin with displayName
getPluginDisplayName({ name: 'hex-mcp', displayName: 'Hex' }); // 'Hex'
```

### 2. Commands (e.g., /add-plugin)

Use `getPluginCommandName()` which always returns the original kebab-case name:

```typescript
import { getPluginCommandName } from './pluginDisplayName';

getPluginCommandName({ name: 'hex-mcp' }); // 'hex-mcp'
getPluginCommandName({ name: 'amplitude-analysis' }); // 'amplitude-analysis'
```

## Low-Level Utilities

### `unkebab(kebabString: string): string`

Converts a kebab-case string to title case:

```typescript
import { unkebab } from './pluginDisplayName';

unkebab('hex-mcp'); // 'Hex Mcp'
unkebab('amplitude-analysis'); // 'Amplitude Analysis'
unkebab('sentry'); // 'Sentry'
```

## Usage Guidelines

- **Plugin tiles/cards**: Always use `getPluginDisplayName()` for user-facing display
- **/add-plugin command**: Always use `getPluginCommandName()` to preserve the exact plugin identifier
- **Search/filtering**: Consider matching against both display name and command name for better UX
