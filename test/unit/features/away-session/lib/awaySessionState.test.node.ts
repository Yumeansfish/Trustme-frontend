import { resolveAwaySessionPrimaryActionCopy } from '~/features/away-session/lib/awaySessionState';

describe('resolveAwaySessionPrimaryActionCopy', () => {
  it('describes the action clearly before an away session starts', () => {
    expect(resolveAwaySessionPrimaryActionCopy(false)).toEqual({
      icon: 'stop',
      label: 'Start away session',
      helperText: 'Pick a card, then start the away session.',
      summaryTitle: 'Current away session',
      summaryText: '',
    });
  });

  it('describes the action clearly while an away session is running', () => {
    expect(resolveAwaySessionPrimaryActionCopy(true)).toEqual({
      icon: 'play',
      label: 'Resume tracking',
      helperText: 'Saved to Activity when you resume tracking.',
      summaryTitle: 'Current away session',
      summaryText: 'This interval will be written to Activity when you resume tracking.',
    });
  });
});
