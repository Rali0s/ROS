import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bundleRoot = path.join(root, 'src-tauri', 'target', 'release', 'bundle');
const releaseRoot = path.join(root, 'release');

const artifactExtensions = new Set(['.dmg', '.exe', '.msi', '.AppImage', '.deb', '.rpm']);

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(resolved);
      }
      return resolved;
    }),
  );
  return files.flat();
};

const toChecksumLine = async (filePath) => {
  const content = await fs.readFile(filePath);
  const digest = createHash('sha256').update(content).digest('hex');
  return `${digest}  ${path.relative(root, filePath)}`;
};

const renderReleaseNotes = async () => {
  const { APP_RELEASE } = await import(path.join(root, 'src', 'utils', 'betaRuntime.js'));
  const template = `# ${APP_RELEASE.product} ${APP_RELEASE.version}

Channel: ${APP_RELEASE.channel}
Release date: ${APP_RELEASE.releaseDate}

## Highlights
${APP_RELEASE.releaseNotes.map((item) => `- ${item}`).join('\n')}

## Beta packaging
- macOS: DMG direct download
- Windows: installer package
- Linux: AppImage plus distro package when available

## Trust checklist
- Native vault unlock
- Backup export/import
- Support bundle generation
- Wallet Vault secret reveal / hide
- Nostr Lounge identity, profile publish, and feed refresh
`;

  await fs.writeFile(path.join(releaseRoot, 'BETA_RELEASE_NOTES.generated.md'), template, 'utf8');
};

const main = async () => {
  await fs.mkdir(releaseRoot, { recursive: true });
  const files = (await walk(bundleRoot)).filter((filePath) => artifactExtensions.has(path.extname(filePath)));
  const lines = files.length
    ? await Promise.all(files.sort().map(toChecksumLine))
    : ['# No release bundle artifacts were found under src-tauri/target/release/bundle yet.'];
  await fs.writeFile(path.join(releaseRoot, 'CHECKSUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
  await renderReleaseNotes();
  process.stdout.write(`Generated release metadata for ${files.length} artifact(s).\n`);
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
