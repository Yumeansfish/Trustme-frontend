import {
  beginActivityRequest,
  cancelActivityRequest,
  finishActivityRequest,
} from '~/features/activity/store/activityRequestCancellation';

describe('activity request cancellation', () => {
  afterEach(() => cancelActivityRequest());

  test('starting a new activity request only cancels the previous activity request', () => {
    const first = beginActivityRequest();
    const second = beginActivityRequest();

    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);

    finishActivityRequest(second);
    expect(second.aborted).toBe(false);
  });

  test('teardown cancels the active activity request', () => {
    const signal = beginActivityRequest();

    cancelActivityRequest();

    expect(signal.aborted).toBe(true);
  });
});
