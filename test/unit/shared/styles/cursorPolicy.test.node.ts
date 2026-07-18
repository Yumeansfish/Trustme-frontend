import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(css|vue|ts|js)$/.test(path) ? [path] : [];
  });
}

test('uses visual disabled states without forbidden or no-drop cursors anywhere in the app', () => {
  const sources = sourceFiles(resolve(__dirname, '../../../../src'));
  const violations = sources.filter(path => /\b(?:not-allowed|no-drop)\b/.test(readFileSync(path, 'utf8')));
  expect(violations).toEqual([]);
});
