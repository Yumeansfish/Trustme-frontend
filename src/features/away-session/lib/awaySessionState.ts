export interface AwaySessionPrimaryActionCopy {
  icon: 'play' | 'stop';
  label: string;
  helperText: string;
  summaryTitle: string;
  summaryText: string;
}

export function resolveAwaySessionPrimaryActionCopy(
  hasActiveSession: boolean
): AwaySessionPrimaryActionCopy {
  if (hasActiveSession) {
    return {
      icon: 'play',
      label: 'Resume tracking',
      helperText: 'Saved to Activity when you resume tracking.',
      summaryTitle: 'Current away session',
      summaryText: 'This interval will be written to Activity when you resume tracking.',
    };
  }

  return {
    icon: 'stop',
    label: 'Start away session',
    helperText: 'Pick a card, then start the away session.',
    summaryTitle: 'Current away session',
    summaryText: '',
  };
}
