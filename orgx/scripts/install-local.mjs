import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const pluginRoot = resolve(new URL('..', import.meta.url).pathname);
const localPluginsDir = resolve(homedir(), '.cursor/plugins/local');
const linkPath = resolve(localPluginsDir, 'cursor-plugin');

mkdirSync(localPluginsDir, { recursive: true });
rmSync(linkPath, { force: true, recursive: true });
symlinkSync(pluginRoot, linkPath, 'dir');

process.stdout.write(`Linked ${pluginRoot} -> ${linkPath}\n`);
