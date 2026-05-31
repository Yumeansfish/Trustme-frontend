import type { AwaySessionShortcut } from './awaySessionShortcuts';

const ACTIVE_RING_TARGET_SECONDS = 90 * 60;
const DAILY_RING_TARGET_SECONDS = 8 * 60 * 60;

export function resolveSelectedAwayShortcut(
  shortcuts: AwaySessionShortcut[],
  selectedShortcutKey: string
): AwaySessionShortcut | null {
  return shortcuts.find(shortcut => shortcut.key === selectedShortcutKey) || null;
}

export function resolveAwaySessionLabel(
  selectedShortcut: AwaySessionShortcut | null,
  customLabel: string
): string {
  if (selectedShortcut?.isOther) {
    return customLabel.trim();
  }

  return selectedShortcut?.title || '';
}

export function formatAwaySessionTimerDisplay(
  activeTimerElapsedSeconds: number,
  liveTrackedSeconds: number,
  hasActiveTimer: boolean
): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(hasActiveTimer ? activeTimerElapsedSeconds : liveTrackedSeconds)
  );
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

export function buildAwaySessionFocusRingStyle(
  activeTimerElapsedSeconds: number,
  liveTrackedSeconds: number,
  hasActiveTimer: boolean
) {
  const referenceSeconds = hasActiveTimer ? activeTimerElapsedSeconds : liveTrackedSeconds;
  const targetSeconds = hasActiveTimer ? ACTIVE_RING_TARGET_SECONDS : DAILY_RING_TARGET_SECONDS;
  const progress = Math.min(Math.max(referenceSeconds, 0) / targetSeconds, 0.98);

  return {
    background: `conic-gradient(rgb(var(--summary-vis-normal)) ${
      progress * 360
    }deg, rgb(var(--summary-vis-hover) / 0.18) 0deg)`,
  };
}

export function buildAwaySessionTimerDisplayStyle() {
  return {
    color: 'rgb(var(--summary-vis-normal))',
  };
}
