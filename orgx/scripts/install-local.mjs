import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const localPluginsDir = resolve(homedir(), '.cursor/plugins/local');
const linkPath = resolve(localPluginsDir, 'orgx');

mkdirSync(localPluginsDir, { recursive: true });
rmSync(linkPath, { force: true, recursive: true });
symlinkSync(pluginRoot, linkPath, 'dir');

process.stdout.write(`Linked ${pluginRoot} -> ${linkPath}\n`);
