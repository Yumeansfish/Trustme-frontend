'use strict';

import { seconds_to_duration } from '~/app/lib/time';

export function friendlyduration(seconds: number): string {
  return seconds_to_duration(seconds);
}
