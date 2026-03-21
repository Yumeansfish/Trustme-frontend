import {
  resolveActivePatternSelection,
  type ActiveShortcut,
} from '~/features/settings/lib/activePatternState';

const shortcuts: ActiveShortcut[] = [
  {
    key: 'zoom',
    title: 'Zoom',
    icon: 'camera',
    pattern: 'Zoom Meeting',
  },
  {
    key: 'teams',
    title: 'Teams',
    icon: 'desktop',
    pattern: 'Microsoft Teams',
  },
  {
    key: 'other',
    title: 'Other',
    icon: 'question-circle',
    pattern: '',
    isOther: true,
  },
];

describe('resolveActivePatternSelection', () => {
  it('selects a built-in shortcut when the pattern matches one', () => {
    expect(resolveActivePatternSelection('Zoom Meeting', shortcuts)).toEqual({
      selectedShortcutKey: 'zoom',
      customPattern: '',
    });
  });

  it('clears the selection when the pattern is empty', () => {
    expect(resolveActivePatternSelection('', shortcuts)).toEqual({
      selectedShortcutKey: '',
      customPattern: '',
    });
  });

  it('keeps a custom pattern visible when it does not match a shortcut', () => {
    expect(resolveActivePatternSelection('Slack Huddle|Discord', shortcuts)).toEqual({
      selectedShortcutKey: 'other',
      customPattern: 'Slack Huddle|Discord',
    });
  });
});
