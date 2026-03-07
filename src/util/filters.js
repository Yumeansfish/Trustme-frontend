'use strict';

import _ from 'lodash';
import { seconds_to_duration, friendlydate } from './time';
import { periodReadable } from './timeperiod';

import moment from 'moment';

// In Vue 3, filters are removed. These are now plain functions
// that can be imported and used directly in templates or methods.

export function iso8601(timestamp) {
  return moment.parseZone(timestamp).format();
}

export function shortdate(timestamp) {
  return moment(timestamp).format('YYYY-MM-DD');
}

export function shorttime(timestamp) {
  return moment(timestamp).format('HH:mm');
}

export function friendlytime(timestamp) {
  return friendlydate(timestamp);
}

export function friendlyduration(seconds) {
  return seconds_to_duration(seconds);
}

export function friendlyperiod(timeperiod) {
  return periodReadable(timeperiod);
}

// Legacy compatibility
export const filters = {
  orderBy: _.orderBy,
};
