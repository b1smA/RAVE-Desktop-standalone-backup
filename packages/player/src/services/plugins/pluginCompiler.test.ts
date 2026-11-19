import { build } from 'esbuild-wasm';

import { PluginFsMock } from '../../test/mocks/plugin-fs';
import { resetInMemoryTauriStore } from '../../test/utils/inMemoryTauriStore';

describe('pluginCompiler', () => {
  beforeEach(() => {
    resetInMemoryTauriStore();
    vi.mocked(build).mockClear();
    PluginFsMock.setReadTextFile('export default {};');
  });

  it('reuses a compiled plugin from the persistent cache after a module reload', async () => {
    const firstCompiler = await import('./pluginCompiler');
    await firstCompiler.compilePlugin('C:/plugins/example/index.ts');
    expect(build).toHaveBeenCalledTimes(1);

    vi.resetModules();

    const reloadedCompiler = await import('./pluginCompiler');
    await reloadedCompiler.compilePlugin('C:/plugins/example/index.ts');
    expect(build).toHaveBeenCalledTimes(1);
  });
});
