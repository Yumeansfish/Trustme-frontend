import { EventEmitter } from 'node:events';

const spawnMock = jest.fn();
jest.mock('node:child_process', () => ({ spawn: (...args: unknown[]) => spawnMock(...args) }));

import { launchPreview } from '../../../scripts/notificationPreviewPlugin';

describe('development popup process', () => {
  let child: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(), stderr: new EventEmitter(), kill: jest.fn(),
    });
    spawnMock.mockReset().mockReturnValue(child);
  });
  afterEach(() => { jest.useRealTimers(); });

  test.each(['\n', '\r\n'])('accepts native readiness with %j line endings', async newline => {
    const result = launchPreview('/workspace', 'feedback', 'http://localhost:27180');
    const [, args, options] = spawnMock.mock.calls[0];
    expect(args).toEqual(['-m', 'notifications.dev_preview', 'feedback', 'http://localhost:27180']);
    expect(options.shell).toBeUndefined();
    child.stdout.emit('data', Buffer.from('notification-preview-'));
    child.stdout.emit('data', Buffer.from(`ready${newline}`));
    await expect(result).resolves.toBeUndefined();
    child.emit('close', 0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('reports missing Python without leaving a timeout running', async () => {
    const result = launchPreview('/workspace', 'feedback', 'http://localhost:27180');
    child.emit('error', new Error('Python unavailable'));
    await expect(result).rejects.toThrow('Python unavailable');
    expect(jest.getTimerCount()).toBe(0);
  });

  test('does not claim success if the helper exits before readiness', async () => {
    const result = launchPreview('/workspace', 'feedback', 'http://localhost:27180');
    child.stderr.emit('data', Buffer.from('No native session'));
    child.emit('close', 1);
    await expect(result).rejects.toThrow('No native session');
  });

  test('stops a helper that never starts', async () => {
    const result = launchPreview('/workspace', 'feedback', 'http://localhost:27180');
    jest.advanceTimersByTime(15000);
    await expect(result).rejects.toThrow('timed out');
    expect(child.kill).toHaveBeenCalledTimes(1);
  });
});
