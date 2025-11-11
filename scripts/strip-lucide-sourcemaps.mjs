import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const LUCIDE_ICON_DIR = join(process.cwd(), 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');

const stripSourceMapComment = async (filePath) => {
  const contents = await readFile(filePath, 'utf8');
  if (!contents.includes('sourceMappingURL')) {
    return;
  }
  const updated = contents.replace(/\n?\/\/\# sourceMappingURL=.*$/gm, '');
  if (updated !== contents) {
    await writeFile(filePath, updated, 'utf8');
  }
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.js')) {
        await stripSourceMapComment(fullPath);
      }
    }),
  );
};

(async () => {
  try {
    await walk(LUCIDE_ICON_DIR);
    console.log('lucide-react sourcemap comments stripped.');
  } catch (error) {
    console.warn('Skipping lucide-react sourcemap patch:', error?.message ?? error);
  }
})();
