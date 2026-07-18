import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';

type Kind = 'feedback' | 'suggestions';
type Launch = (kind: Kind, dashboardUrl: string) => Promise<void>;

export function launchPreview(repoRoot: string, kind: Kind, dashboardUrl: string): Promise<void> {
  const venvPython = path.join(repoRoot, 'build', '.build-venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const python = process.env.PYTHON_BIN || (existsSync(venvPython)
    ? venvPython : process.platform === 'win32' ? 'python' : 'python3');
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-m', 'notifications.dev_preview', kind, dashboardUrl], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: [path.join(repoRoot, 'backend', 'src'), process.env.PYTHONPATH]
          .filter(Boolean).join(path.delimiter),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    let errorOutput = '';
    let ready = false;
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Notification preview startup timed out'));
    }, 15000);
    child.stdout.on('data', chunk => {
      output = (output + String(chunk)).slice(-1024);
      if (!ready && output.replace(/\r\n/g, '\n').includes('notification-preview-ready\n')) {
        ready = true;
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', chunk => { errorOutput = (errorOutput + String(chunk)).slice(-2048); });
    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      if (!ready) reject(new Error(errorOutput || `Notification preview exited (${code})`));
      else if (code !== 0) console.warn('Notification preview failed:', errorOutput);
    });
  });
}

export function notificationPreviewMiddleware(launch: Launch) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    if (request.url?.split('?')[0] !== '/api/0/notifications/test') return next();
    const send = (status: number, payload: object) => {
      if (response.writableEnded) return;
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    // Never expose native process launching to LAN clients or other web origins.
    let dashboardUrl: URL;
    try {
      dashboardUrl = new URL(`http://${request.headers.host}`);
      if (
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress || '') ||
        !['localhost', '127.0.0.1', '[::1]'].includes(dashboardUrl.hostname) ||
        (request.headers.origin && request.headers.origin !== dashboardUrl.origin)
      ) throw new Error('Non-local preview request');
    } catch {
      send(403, { error: 'Notification previews are local development only' });
      return;
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      send(405, { error: 'Use POST' });
      return;
    }
    if (!request.headers['content-type']?.startsWith('application/json')) {
      send(415, { error: 'Use application/json' });
      return;
    }
    let body = '';
    request.on('data', chunk => {
      if (response.writableEnded) return;
      body += String(chunk);
      if (body.length > 1024) send(413, { error: 'Preview request is too large' });
    });
    request.once('error', () => send(400, { error: 'Unable to read preview request' }));
    request.once('end', () => {
      if (response.writableEnded) return;
      let kind: Kind;
      try {
        const payload: unknown = JSON.parse(body);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
        const value = 'kind' in payload ? payload.kind : 'feedback';
        if (value !== 'feedback' && value !== 'suggestions') throw new Error();
        kind = value;
      } catch {
        send(400, { error: 'kind must be feedback or suggestions' });
        return;
      }
      void launch(kind, dashboardUrl.origin).then(
        () => send(202, { requested: true, kind }),
        error => {
          console.error('Unable to launch notification preview:', error);
          send(503, { error: 'Unable to launch notification preview' });
        }
      );
    });
  };
}

export function notificationPreviewPlugin(repoRoot: string): Plugin {
  return {
    name: 'trustme-dev-notification-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(notificationPreviewMiddleware(
        (kind, dashboardUrl) => launchPreview(repoRoot, kind, dashboardUrl)
      ));
    },
  };
}
