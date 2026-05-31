export interface AwaySessionShortcut {
  key: string;
  title: string;
  description: string;
  icon: string;
  isOther?: boolean;
}

export const AWAY_SESSION_SHORTCUTS: AwaySessionShortcut[] = [
  {
    key: 'write-algo',
    title: 'Write Algo',
    description: 'Work through logic before you code it.',
    icon: 'code',
  },
  {
    key: 'design-draft',
    title: 'Design Draft',
    description: 'Shape structure, flow, or layout first.',
    icon: 'palette',
  },
  {
    key: 'plan-roadmap',
    title: 'Plan Roadmap',
    description: 'Line up next steps, tradeoffs, and order.',
    icon: 'calendar',
  },
  {
    key: 'deep-reading',
    title: 'Deep Reading',
    description: 'Read a paper, spec, or doc without noise.',
    icon: 'file',
  },
  {
    key: 'other',
    title: 'Other',
    description: 'Type something custom when none of these fit.',
    icon: 'question-circle',
    isOther: true,
  },
  {
    key: 'whiteboard-session',
    title: 'Whiteboard Session',
    description: 'Think through structure away from the keyboard.',
    icon: 'edit',
  },
  {
    key: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Capture notes, action items, or follow-ups.',
    icon: 'list',
  },
  {
    key: 'research-review',
    title: 'Research Review',
    description: 'Compare sources, ideas, or implementation options.',
    icon: 'search',
  },
  {
    key: 'system-design',
    title: 'System Design',
    description: 'Map architecture, interfaces, or data flow.',
    icon: 'desktop',
  },
];
