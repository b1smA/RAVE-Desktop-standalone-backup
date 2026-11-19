import { readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), 'dist');
const generatedDirectories = ['api', 'mcp', 'react', 'test', 'types'];

for (const directory of generatedDirectories) {
  rmSync(resolve(outputDirectory, directory), { recursive: true, force: true });
}

rmSync(resolve(outputDirectory, 'types.d.ts'), { force: true });
rmSync(resolve(outputDirectory, 'tsdoc-metadata.json'), { force: true });

for (const file of readdirSync(outputDirectory)) {
  if (file.endsWith('.d.ts.map')) {
    rmSync(resolve(outputDirectory, file), { force: true });
  }
}
