import moment from 'moment';
import { seconds_to_duration } from '~/app/lib/time';
import DOMPurify from 'dompurify';
import _ from 'lodash';

const sanitize = DOMPurify.sanitize;

function createTooltipRow(label, value) {
  return `
    <div class="aw-vis-tooltip-field">
      <div class="aw-vis-tooltip-field-label">${sanitize(label)}</div>
      <div class="aw-vis-tooltip-field-value">${sanitize(value || '-')}</div>
    </div>
  `;
}

function createTooltipWideRow(label, value) {
  return `
    <div class="aw-vis-tooltip-field aw-vis-tooltip-field-wide">
      <div class="aw-vis-tooltip-field-label">${sanitize(label)}</div>
      <div class="aw-vis-tooltip-field-value">${sanitize(value || '-')}</div>
    </div>
  `;
}

export function buildTooltip(bucket, e) {
  // WARNING: XSS risk, make sure to sanitize properly
  // FIXME: Not actually tested against XSS attacks, implementation needs to be verified in tests.
  let detailRows = '';

  // if same day, don't show date
  const startMoment = moment(e.timestamp);
  const stopMoment = moment(e.timestamp).add(e.duration, 'seconds');
  let start = startMoment;
  let stop = stopMoment;
  if (startMoment.isSame(stopMoment, 'day')) {
    start = startMoment.format('HH:mm:ss');
    stop = stopMoment.format('HH:mm:ss');
  } else {
    start = startMoment.format('YYYY-MM-DD HH:mm:ss');
    stop = stopMoment.format('YYYY-MM-DD HH:mm:ss');
  }

  const dateLabel = startMoment.format('ddd, MMM D');
  const durationLabel = seconds_to_duration(e.duration);
  const rangeLabel = `${start} - ${stop}`;
  const metaRows = [
    createTooltipRow('Start', start),
    createTooltipRow('Stop', stop),
  ].join('');

  if (bucket.type == 'currentwindow') {
    detailRows = [
      createTooltipRow('App', e.data.app),
      createTooltipWideRow('Title', e.data.title),
    ].join('');
  } else if (bucket.type == 'web.tab.current') {
    detailRows = [
      createTooltipWideRow('Title', e.data.title),
      createTooltipWideRow('URL', e.data.url),
    ].join('');
  } else if (bucket.type.startsWith('app.editor')) {
    detailRows = [
      createTooltipRow('Filename', _.last(e.data.file.split('/'))),
      createTooltipRow('Language', e.data.language),
      createTooltipWideRow('Path', e.data.file),
    ].join('');
  } else if (bucket.type.startsWith('general.stopwatch')) {
    detailRows = [createTooltipRow('Label', e.data.label)].join('');
  } else {
    detailRows = [createTooltipWideRow('Data', JSON.stringify(e.data))].join('');
  }

  return `
    <div class="aw-vis-tooltip-card">
      <div class="aw-vis-tooltip-top">
        <div class="aw-vis-tooltip-date">${sanitize(dateLabel)}</div>
        <div class="aw-vis-tooltip-pill">${sanitize(durationLabel)}</div>
      </div>
      <div class="aw-vis-tooltip-body">
        <div class="aw-vis-tooltip-range">${sanitize(rangeLabel)}</div>
        <div class="aw-vis-tooltip-grid">
          ${metaRows}
          ${detailRows}
        </div>
      </div>
    </div>
  `;
}
