'use strict';

import _ from 'lodash';

import { IEvent } from '~/shared/lib/interfaces';
import {
  SUMMARY_BAR_BG_COLOR,
  SUMMARY_BAR_BG_HOVER,
  SUMMARY_BAR_BG_SELECTED,
  SUMMARY_BAR_COLOR,
  SUMMARY_BAR_HOVER,
  SUMMARY_BAR_SELECTED,
} from '~/features/insights/lib/visualizationTokens';

function create(container: HTMLElement) {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'aw-summary-list';
  container.appendChild(list);
}

function set_status(container: HTMLElement, msg: string) {
  const list = container.querySelector('.aw-summary-list') as HTMLElement;
  if (!list) return;
  list.innerHTML = `<div class="aw-summary-empty">${msg}</div>`;
}

interface Entry {
  name: string;
  hovertext: string;
  duration: number;
  color?: string;
  colorKey?: string | string[];
  link?: string;
  category?: string;
}

const SUMMARY_BAR_NORMAL_CSS = 'rgb(var(--summary-vis-normal))';
const SUMMARY_BAR_NORMAL_BG_CSS = 'rgb(var(--summary-vis-normal) / 0.18)';
const SUMMARY_BAR_ACTIVE_CSS = 'rgb(var(--summary-vis-active))';
const SUMMARY_BAR_ACTIVE_BG_CSS = 'rgb(var(--summary-vis-active) / 0.18)';
const SUMMARY_BAR_HOVER_CSS = 'rgb(var(--summary-vis-hover))';
const SUMMARY_BAR_HOVER_BG_CSS = 'rgb(var(--summary-vis-hover) / 0.18)';

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

function update(
  container: HTMLElement,
  apps: Entry[],
  selectFunc: ((entry: Entry) => void) | null = null,
  selectedName: string | null = null
) {
  const list = container.querySelector('.aw-summary-list') as HTMLElement;
  if (!list) return container;

  if (apps.length <= 0) {
    list.innerHTML = `<div class="aw-summary-empty">No data</div>`;
    return container;
  }

  apps = apps.filter(app => typeof app.duration === 'number' && app.duration > 0);

  if (apps.length === 0) {
    list.innerHTML = `<div class="aw-summary-empty">No data with duration</div>`;
    return container;
  }

  const longest_duration = apps[0].duration;
  const total_duration = apps.reduce((sum, app) => sum + app.duration, 0);

  list.innerHTML = '';

  _.each(apps, app => {
    const pct = total_duration > 0 ? Math.round((app.duration / total_duration) * 100) : 0;
    const barWidth = longest_duration > 0 ? (app.duration / longest_duration) * 100 : 0;
    const isSelected = selectedName === app.name;

    const barColor = isSelected
      ? SUMMARY_BAR_ACTIVE_CSS || SUMMARY_BAR_SELECTED
      : SUMMARY_BAR_NORMAL_CSS || SUMMARY_BAR_COLOR;
    const barBgColor = isSelected
      ? SUMMARY_BAR_ACTIVE_BG_CSS || SUMMARY_BAR_BG_SELECTED
      : SUMMARY_BAR_NORMAL_BG_CSS || SUMMARY_BAR_BG_COLOR;
    const hoverBarColor = isSelected
      ? SUMMARY_BAR_ACTIVE_CSS || SUMMARY_BAR_SELECTED
      : SUMMARY_BAR_HOVER_CSS || SUMMARY_BAR_HOVER;
    const hoverBarBgColor = isSelected
      ? SUMMARY_BAR_ACTIVE_BG_CSS || SUMMARY_BAR_BG_SELECTED
      : SUMMARY_BAR_HOVER_BG_CSS || SUMMARY_BAR_BG_HOVER;

    // Row wrapper
    const row =
      app.link && !selectFunc ? document.createElement('a') : document.createElement('div');
    if (app.link && row instanceof HTMLAnchorElement) {
      row.href = app.link;
    }
    row.className = `aw-row${isSelected ? ' aw-row-active' : ''}${
      selectFunc || app.link ? ' aw-row-interactive' : ''
    }`;
    row.title = app.hovertext;

    // 1. Percentage
    const pctEl = document.createElement('span');
    pctEl.className = 'aw-row-pct';
    pctEl.textContent = pct > 0 ? `${pct}%` : '<1%';

    // 2. Mini progress bar
    const barWrap = document.createElement('div');
    barWrap.className = 'aw-row-bar-wrap';
    barWrap.style.backgroundColor = barBgColor;

    const barFill = document.createElement('div');
    barFill.className = 'aw-row-bar-fill';
    barFill.style.width = `${barWidth}%`;
    barFill.style.backgroundColor = barColor;
    barWrap.appendChild(barFill);

    row.addEventListener('mouseenter', () => {
      barWrap.style.backgroundColor = hoverBarBgColor;
      barFill.style.backgroundColor = hoverBarColor;
    });

    row.addEventListener('mouseleave', () => {
      barWrap.style.backgroundColor = barBgColor;
      barFill.style.backgroundColor = barColor;
    });

    if (selectFunc) {
      row.addEventListener('click', event => {
        event.preventDefault();
        selectFunc(app);
      });
    }

    // 3. Name
    const nameEl = document.createElement('span');
    nameEl.className = 'aw-row-name';
    nameEl.textContent = app.name;
    nameEl.title = app.name;

    // 4. Duration (min format)
    const durEl = document.createElement('span');
    durEl.className = 'aw-row-duration';
    durEl.textContent = formatMinutes(app.duration);

    // 5. Edit icon (SVG pencil)
    const editEl = document.createElement('span');
    editEl.className = 'aw-row-edit';
    editEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

    row.appendChild(pctEl);
    row.appendChild(barWrap);
    row.appendChild(nameEl);
    row.appendChild(durEl);
    row.appendChild(editEl);

    list.appendChild(row);
  });

  return container;
}

function updateSummedEvents(
  container: HTMLElement,
  summedEvents: IEvent[],
  titleKeyFunc: (event: IEvent) => string,
  hoverKeyFunc: (event: IEvent) => string,
  colorKeyFunc: (event: IEvent) => string,
  linkKeyFunc: (event: IEvent) => string = () => null,
  selectKeyFunc: ((event: IEvent) => void) | null = null,
  selectedName: string | null = null
) {
  if (hoverKeyFunc == null) {
    hoverKeyFunc = titleKeyFunc;
  }
  const apps = _.map(summedEvents, e => {
    return {
      name: titleKeyFunc(e),
      hovertext: hoverKeyFunc(e),
      duration: e.duration,
      color: e.data['$color'],
      colorKey: colorKeyFunc(e),
      link: linkKeyFunc(e),
      category: e.data['$category'],
    } as Entry;
  });
  const wrappedSelectFunc = selectKeyFunc
    ? (entry: Entry) => {
        const matchingEvent = summedEvents.find(event => titleKeyFunc(event) === entry.name);
        if (matchingEvent) {
          selectKeyFunc(matchingEvent);
        }
      }
    : null;
  update(container, apps, wrappedSelectFunc, selectedName);
}

export default {
  create: create,
  update: update,
  updateSummedEvents: updateSummedEvents,
  set_status: set_status,
};
