import {
  buildAwaySessionFocusRingStyle,
  buildAwaySessionTimerDisplayStyle,
  formatAwaySessionTimerDisplay,
  resolveAwaySessionLabel,
  resolveSelectedAwayShortcut,
} from '~/features/away-session/lib/awaySessionPresentation';
import { AWAY_SESSION_SHORTCUTS } from '~/features/away-session/lib/awaySessionShortcuts';

describe('awaySessionPresentation', () => {
  test('resolveSelectedAwayShortcut returns the configured shortcut', () => {
    expect(resolveSelectedAwayShortcut(AWAY_SESSION_SHORTCUTS, 'plan-roadmap')?.title).toBe(
      'Plan Roadmap'
    );
    expect(resolveSelectedAwayShortcut(AWAY_SESSION_SHORTCUTS, 'missing')).toBeNull();
  });

  test('resolveAwaySessionLabel uses custom label only for the Other shortcut', () => {
    const otherShortcut = resolveSelectedAwayShortcut(AWAY_SESSION_SHORTCUTS, 'other');
    const designShortcut = resolveSelectedAwayShortcut(AWAY_SESSION_SHORTCUTS, 'design-draft');

    expect(resolveAwaySessionLabel(otherShortcut, '  Deep thinking  ')).toBe('Deep thinking');
    expect(resolveAwaySessionLabel(designShortcut, 'Ignored')).toBe('Design Draft');
    expect(resolveAwaySessionLabel(null, 'Ignored')).toBe('');
  });

  test('formatAwaySessionTimerDisplay formats elapsed seconds as hh:mm:ss', () => {
    expect(formatAwaySessionTimerDisplay(3661, 120, true)).toBe('01:01:01');
    expect(formatAwaySessionTimerDisplay(3661, 120, false)).toBe('00:02:00');
  });

  test('buildAwaySessionFocusRingStyle clamps progress for active and passive modes', () => {
    expect(buildAwaySessionFocusRingStyle(90 * 60, 0, true).background).toContain('352.8deg');
    expect(buildAwaySessionFocusRingStyle(0, 8 * 60 * 60, false).background).toContain('352.8deg');
  });

  test('buildAwaySessionTimerDisplayStyle returns the shared accent color', () => {
    expect(buildAwaySessionTimerDisplayStyle()).toEqual({
      color: 'rgb(var(--summary-vis-normal))',
    });
  });
});
