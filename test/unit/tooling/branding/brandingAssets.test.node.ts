import fs from 'fs';
import path from 'path';

const frontendRoot = process.cwd();

describe('branding assets', () => {
  test('keeps only Trustme-owned frontend media assets', () => {
    const requiredLogoAssets = [
      'media/logo/logo.png',
      'media/logo/logo.svg',
      'media/logo/logo.icns',
      'media/logo/logo.ico',
      'media/logo/logo-128.png',
      'media/logo/black-monochrome-logo.png',
    ];

    for (const assetPath of requiredLogoAssets) {
      expect(fs.existsSync(path.join(frontendRoot, assetPath))).toBe(true);
    }

    const upstreamMediaArtifacts = [
      'media/banners',
      'media/fonts/varela-round-latin.woff2',
      'media/png2icns.sh',
    ];

    for (const artifactPath of upstreamMediaArtifacts) {
      expect(fs.existsSync(path.join(frontendRoot, artifactPath))).toBe(false);
    }
  });
});
