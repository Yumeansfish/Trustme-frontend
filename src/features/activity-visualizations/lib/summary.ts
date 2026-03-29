'use strict';

import _ from 'lodash';

import { IEvent } from '~/shared/lib/interfaces';

function resolveDocument(container: HTMLElement): Document {
  return container.ownerDocument || document;
}

function create(container: HTMLElement) {
  container.innerHTML = '';
  const list = resolveDocument(container).createElement('div');
  list.className = 'aw-summary-list';
  container.appendChild(list);
}

function replaceListContent(
  list: HTMLElement,
  child: DocumentFragment | HTMLElement | Text | null
): void {
  if (child) {
    list.replaceChildren(child);
    return;
  }

  list.replaceChildren();
}

function renderEmptyState(list: HTMLElement, message: string): void {
  const empty = resolveDocument(list).createElement('div');
  empty.className = 'aw-summary-empty';
  empty.textContent = message;
  replaceListContent(list, empty);
}

function set_status(container: HTMLElement, msg: string) {
  const list = container.querySelector('.aw-summary-list') as HTMLElement;
  if (!list) return;
  renderEmptyState(list, msg);
}

interface Entry {
  name: string;
  hovertext: string;
  duration: number;
  color?: string;
  colorKey?: string | string[];
  link?: string | null;
  category?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMinutes = mins % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  return `${mins} min`;
}

function updateRowSelectionState(row: Element, selectedName: string | null) {
  const entryName = row.getAttribute('data-entry-name');
  row.classList.toggle('aw-row-active', Boolean(entryName && selectedName === entryName));
}

function updateSelection(container: HTMLElement, selectedName: string | null) {
  const list = container.querySelector('.aw-summary-list');
  if (!list) return container;

  list.querySelectorAll('.aw-row').forEach(row => updateRowSelectionState(row, selectedName));
  return container;
}

function update(
  container: HTMLElement,
  apps: Entry[],
  selectFunc: ((entry: Entry) => void) | null = null,
  selectedName: string | null = null,
  editFunc: ((entry: Entry) => void) | null = null,
  editVisibleFunc: ((entry: Entry) => boolean) | null = null
) {
  const list = container.querySelector('.aw-summary-list') as HTMLElement;
  if (!list) return container;

  if (apps.length <= 0) {
    renderEmptyState(list, 'No data');
    return container;
  }

  apps = apps.filter(app => typeof app.duration === 'number' && app.duration > 0);

  if (apps.length === 0) {
    renderEmptyState(list, 'No data with duration');
    return container;
  }

  const longest_duration = apps[0].duration;
  const total_duration = apps.reduce((sum, app) => sum + app.duration, 0);
  const ownerDocument = resolveDocument(list);
  const fragment = ownerDocument.createDocumentFragment();

  _.each(apps, app => {
    const pct = total_duration > 0 ? Math.round((app.duration / total_duration) * 100) : 0;
    const barWidth = longest_duration > 0 ? (app.duration / longest_duration) * 100 : 0;
    const isSelected = selectedName === app.name;

    // Row wrapper
    const row = app.link && !selectFunc ? ownerDocument.createElement('a') : ownerDocument.createElement('div');
    if (app.link && row instanceof HTMLAnchorElement) {
      row.href = app.link;
    }
    row.className = `aw-row${isSelected ? ' aw-row-active' : ''}${
      selectFunc || app.link ? ' aw-row-interactive' : ''
    }`;
    row.setAttribute('data-entry-name', app.name);
    row.title = app.hovertext;

    // 1. Percentage
    const pctEl = ownerDocument.createElement('span');
    pctEl.className = 'aw-row-pct';
    pctEl.textContent = pct > 0 ? `${pct}%` : '<1%';

    // 2. Mini progress bar
    const barWrap = ownerDocument.createElement('div');
    barWrap.className = 'aw-row-bar-wrap';

    const barFill = ownerDocument.createElement('div');
    barFill.className = 'aw-row-bar-fill';
    barFill.style.width = `${barWidth}%`;
    barWrap.appendChild(barFill);

    if (selectFunc) {
      row.addEventListener('click', event => {
        event.preventDefault();
        selectFunc(app);
      });
    }

    // 3. Name
    const nameEl = ownerDocument.createElement('span');
    nameEl.className = 'aw-row-name';
    nameEl.textContent = app.name;
    nameEl.title = app.name;

    // 4. Duration (min format)
    const durEl = ownerDocument.createElement('span');
    durEl.className = 'aw-row-duration';
    durEl.textContent = formatDuration(app.duration);

    row.appendChild(pctEl);
    row.appendChild(barWrap);
    row.appendChild(nameEl);
    row.appendChild(durEl);

    if (editFunc && (!editVisibleFunc || editVisibleFunc(app))) {
      const editEl = ownerDocument.createElement('button');
      editEl.className = 'aw-row-edit';
      editEl.type = 'button';
      editEl.setAttribute('aria-label', `Edit ${app.name}`);
      editEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editEl.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        editFunc(app);
      });
      row.appendChild(editEl);
    }

    fragment.appendChild(row);
  });

  replaceListContent(list, fragment);

  return container;
}

function updateSummedEvents(
  container: HTMLElement,
  summedEvents: IEvent[],
  titleKeyFunc: (event: IEvent) => string,
  hoverKeyFunc: (event: IEvent) => string,
  colorKeyFunc: (event: IEvent) => string,
  linkKeyFunc: (event: IEvent) => string | null = () => null,
  selectKeyFunc: ((event: IEvent) => void) | null = null,
  selectedName: string | null = null,
  editKeyFunc: ((event: IEvent) => void) | null = null,
  editVisibleKeyFunc: ((event: IEvent) => boolean) | null = null
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
  const eventByName = new Map(summedEvents.map(event => [titleKeyFunc(event), event] as const));
  const wrappedSelectFunc = selectKeyFunc
    ? (entry: Entry) => {
        const matchingEvent = eventByName.get(entry.name);
        if (matchingEvent) {
          selectKeyFunc(matchingEvent);
        }
      }
    : null;
  const wrappedEditFunc = editKeyFunc
    ? (entry: Entry) => {
        const matchingEvent = eventByName.get(entry.name);
        if (matchingEvent) {
          editKeyFunc(matchingEvent);
        }
      }
    : null;
  const wrappedEditVisibleFunc = editVisibleKeyFunc
    ? (entry: Entry) => {
        const matchingEvent = eventByName.get(entry.name);
        return matchingEvent ? editVisibleKeyFunc(matchingEvent) : false;
      }
    : null;
  return update(
    container,
    apps,
    wrappedSelectFunc,
    selectedName,
    wrappedEditFunc,
    wrappedEditVisibleFunc
  );
}

export default {
  create: create,
  update: update,
  updateSelection: updateSelection,
  updateSummedEvents: updateSummedEvents,
  set_status: set_status,
};
