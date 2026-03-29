import {
  buildSelectableVisualizationRegistry,
  resolveBrowserInstallTarget,
  resolveMissingPrerequisiteMessage,
  resolvePluginInstallAction,
  resolvePluginInstallState,
} from '~/features/activity-visualizations/lib/selectableVisualizationState';

describe('selectableVisualizationState', () => {
  const activityStore = {
    window: { available: true },
    browser: { available: false },
    category: {
      available: true,
      top: [{ data: { $category: ['Work', 'Coding'] }, duration: 42 }],
    },
    query_options: {
      date: '2026-03-21',
      timeperiod: { start: '2026-03-21T00:00:00Z', length: [1, 'day'] },
    },
  };

  test('builds visualization registry and plugin install state', () => {
    const registry = buildSelectableVisualizationRegistry(activityStore);
    expect(registry.top_apps).toEqual({
      title: 'Top Applications',
      available: true,
    });
    expect(registry.top_domains.available).toBe(false);
    expect(registry.editor_plugin_prompt.available).toBe(true);

    expect(resolvePluginInstallState('top_domains', activityStore)).toEqual({
      kind: 'browser',
      icon: 'globe',
      title: 'Unlock Browser Activity',
      points: 'Domains • URLs • Tab Titles',
      copy: 'Install the browser watcher for this browser, then reload the dashboard.',
    });
    expect(resolvePluginInstallState('editor_plugin_prompt', activityStore)).toEqual({
      kind: 'editor',
      icon: 'terminal',
      title: 'Unlock Editor Activity',
      points: 'Files • Projects • Languages',
      copy: 'Install the VS Code watcher plugin from the marketplace, then reload the dashboard.',
    });
    expect(resolvePluginInstallState('top_apps', activityStore)).toBeNull();
  });

  test('resolves plugin install actions for browser prompts', () => {
    expect(
      resolvePluginInstallAction(
        { kind: 'browser', icon: 'globe', title: 'Browser', points: 'Domains' },
        'firefox'
      )
    ).toEqual({
      href: 'https://addons.mozilla.org/firefox/downloads/latest/aw-watcher-web/latest.xpi',
      download: '',
      label: 'Install Firefox Watcher',
    });
    expect(
      resolvePluginInstallAction(
        { kind: 'browser', icon: 'globe', title: 'Browser', points: 'Domains' },
        'chromium'
      )
    ).toEqual({
      href: 'https://chromewebstore.google.com/detail/activitywatch-web-watcher/nglaklhklhcoonedhgnpgddginnjdadi',
      download: '',
      label: 'Install Chromium Watcher',
    });
    expect(
      resolvePluginInstallAction(
        { kind: 'browser', icon: 'globe', title: 'Browser', points: 'Domains' },
        'unsupported'
      )
    ).toEqual({
      href: 'https://github.com/ActivityWatch/aw-watcher-web',
      download: '',
      label: 'View Supported Browsers',
    });
    expect(
      resolvePluginInstallAction(
        {
          kind: 'editor',
          icon: 'terminal',
          title: 'Editor',
          points: 'Files',
          copy: 'Install it.',
        },
        'chromium'
      )
    ).toEqual({
      href: 'https://marketplace.visualstudio.com/items?itemName=activitywatch.aw-watcher-vscode',
      download: '',
      label: 'Install Plugin',
    });
  });

  test('does not mistake Safari for a Chromium browser watcher target', () => {
    expect(resolveBrowserInstallTarget('Mozilla/5.0 Firefox/128.0')).toBe('firefox');
    expect(resolveBrowserInstallTarget('Mozilla/5.0 Chrome/126.0 Safari/537.36')).toBe('chromium');
    expect(resolveBrowserInstallTarget('Mozilla/5.0 Version/17.5 Safari/605.1.15')).toBe(
      'unsupported'
    );
  });

  test('no longer exposes retired sunburst visualization modes', () => {
    const registry = buildSelectableVisualizationRegistry(activityStore);
    expect(registry).not.toHaveProperty('category_sunburst');
    expect(registry).not.toHaveProperty('sunburst_clock');
  });

  test('returns prerequisite messaging that matches the visualization type', () => {
    expect(
      resolveMissingPrerequisiteMessage('top_domains')
    ).toMatch('required browser watcher');

    expect(resolveMissingPrerequisiteMessage('top_apps')).toMatch('AFK and window watchers');
  });
});
