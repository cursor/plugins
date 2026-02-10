/**
 * Utility functions for formatting plugin display names
 *
 * When displaying plugin names in the UI (tiles/cards), if no displayName is set,
 * the kebab-case plugin name should be converted to title case.
 *
 * For the /add-plugin command, keep the original kebab-case name.
 */

/**
 * Converts a kebab-case string to title case
 * @example
 * unkebab('hex-mcp') // 'Hex Mcp'
 * unkebab('amplitude-analysis') // 'Amplitude Analysis'
 * unkebab('deploy-on-aws') // 'Deploy On Aws'
 * unkebab('context7-plugin') // 'Context7 Plugin'
 * unkebab('sentry') // 'Sentry'
 */
export function unkebab(kebabString: string): string {
  if (!kebabString) {
    return '';
  }

  return kebabString
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gets the display name for a plugin
 * If displayName is set, use it. Otherwise, convert the kebab-case name to title case.
 *
 * @param plugin - Plugin object with name and optional displayName
 * @returns The display name to show in the UI
 *
 * @example
 * getPluginDisplayName({ name: 'hex-mcp' }) // 'Hex Mcp'
 * getPluginDisplayName({ name: 'hex-mcp', displayName: 'Hex' }) // 'Hex'
 * getPluginDisplayName({ name: 'amplitude-analysis' }) // 'Amplitude Analysis'
 */
export function getPluginDisplayName(plugin: {
  name: string;
  displayName?: string;
}): string {
  if (plugin.displayName) {
    return plugin.displayName;
  }

  return unkebab(plugin.name);
}

/**
 * For the /add-plugin command, always use the original kebab-case name
 * This function is provided for clarity and consistency
 *
 * @param plugin - Plugin object with name
 * @returns The kebab-case name for use in commands
 *
 * @example
 * getPluginCommandName({ name: 'hex-mcp' }) // 'hex-mcp'
 * getPluginCommandName({ name: 'amplitude-analysis' }) // 'amplitude-analysis'
 */
export function getPluginCommandName(plugin: { name: string }): string {
  return plugin.name;
}
