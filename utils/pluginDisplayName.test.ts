import { unkebab, getPluginDisplayName, getPluginCommandName } from './pluginDisplayName';

describe('unkebab', () => {
  it('converts kebab-case to title case', () => {
    expect(unkebab('hex-mcp')).toBe('Hex Mcp');
    expect(unkebab('amplitude-analysis')).toBe('Amplitude Analysis');
    expect(unkebab('deploy-on-aws')).toBe('Deploy On Aws');
    expect(unkebab('notion-workspace')).toBe('Notion Workspace');
  });

  it('handles single word without hyphens', () => {
    expect(unkebab('sentry')).toBe('Sentry');
    expect(unkebab('linear')).toBe('Linear');
    expect(unkebab('cloudflare')).toBe('Cloudflare');
    expect(unkebab('stripe')).toBe('Stripe');
  });

  it('handles words with numbers', () => {
    expect(unkebab('context7-plugin')).toBe('Context7 Plugin');
  });

  it('handles empty string', () => {
    expect(unkebab('')).toBe('');
  });

  it('handles multiple hyphens', () => {
    expect(unkebab('nextjs-react-typescript')).toBe('Nextjs React Typescript');
    expect(unkebab('deep-learning-python')).toBe('Deep Learning Python');
  });
});

describe('getPluginDisplayName', () => {
  it('returns displayName when set', () => {
    expect(getPluginDisplayName({ name: 'hex-mcp', displayName: 'Hex' })).toBe('Hex');
    expect(getPluginDisplayName({ name: 'amplitude-analysis', displayName: 'Amplitude' })).toBe('Amplitude');
    expect(getPluginDisplayName({ name: 'prisma', displayName: 'Prisma ORM' })).toBe('Prisma ORM');
  });

  it('converts kebab-case name when displayName is not set', () => {
    expect(getPluginDisplayName({ name: 'hex-mcp' })).toBe('Hex Mcp');
    expect(getPluginDisplayName({ name: 'amplitude-analysis' })).toBe('Amplitude Analysis');
    expect(getPluginDisplayName({ name: 'deploy-on-aws' })).toBe('Deploy On Aws');
  });

  it('handles single word names without hyphens', () => {
    expect(getPluginDisplayName({ name: 'sentry' })).toBe('Sentry');
    expect(getPluginDisplayName({ name: 'linear' })).toBe('Linear');
    expect(getPluginDisplayName({ name: 'prisma' })).toBe('Prisma');
  });

  it('handles empty displayName as not set', () => {
    expect(getPluginDisplayName({ name: 'hex-mcp', displayName: '' })).toBe('Hex Mcp');
  });
});

describe('getPluginCommandName', () => {
  it('always returns the original kebab-case name', () => {
    expect(getPluginCommandName({ name: 'hex-mcp' })).toBe('hex-mcp');
    expect(getPluginCommandName({ name: 'amplitude-analysis' })).toBe('amplitude-analysis');
    expect(getPluginCommandName({ name: 'deploy-on-aws' })).toBe('deploy-on-aws');
    expect(getPluginCommandName({ name: 'sentry' })).toBe('sentry');
  });
});
