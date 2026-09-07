const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({ req: { get: mockGet, post: mockPost } }),
}));

import {
  fetchModelFeedback,
  submitModelFeedback,
} from '~/features/insights/lib/modelFeedbackClient';

const feedback = {
  date: '2026-08-27',
  period_id: '0900-1000-morning',
  target: 'productivity',
  tried_to_follow: true,
  helped: false,
  submitted_at: '2026-08-27T12:20:00+02:00',
};

describe('model feedback client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('loads feedback by suggestion identity', async () => {
    mockGet.mockResolvedValue({ data: { feedback } });

    await expect(
      fetchModelFeedback('2026-08-27', '0900-1000-morning', 'productivity')
    ).resolves.toEqual({ feedback });
    expect(mockGet).toHaveBeenCalledWith('/0/dashboard/model-feedback', {
      params: {
        date: '2026-08-27',
        period_id: '0900-1000-morning',
        target: 'productivity',
      },
    });
  });

  test('submits the conditional two-question response', async () => {
    mockPost.mockResolvedValue({ data: feedback });

    await expect(submitModelFeedback(feedback)).resolves.toEqual(feedback);
    expect(mockPost).toHaveBeenCalledWith('/0/dashboard/model-feedback', feedback);
  });
});

test.each([undefined, null, {}, { feedback: {} }, { feedback: { ...feedback, helped: 'yes' } }])(
  'does not treat malformed feedback %p as unanswered', async data => {
    mockGet.mockResolvedValue({ data });
    await expect(fetchModelFeedback('2026-08-27', '0900-1000-morning', 'productivity'))
      .rejects.toThrow('Invalid model feedback response');
  }
);

test('accepts only an explicit null as no submitted feedback', async () => {
  mockGet.mockResolvedValue({ data: { feedback: null } });
  await expect(fetchModelFeedback('2026-08-27', '0900-1000-morning', 'productivity'))
    .resolves.toEqual({ feedback: null });
});
