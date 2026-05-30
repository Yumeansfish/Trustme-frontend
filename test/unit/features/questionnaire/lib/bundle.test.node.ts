const mockGet = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
    },
  }),
}));

import { fetchPendingQuestionnaireBundle } from '~/features/questionnaire/lib/bundle';

describe('questionnaire bundle API', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('fetches the bundle from the questionnaires endpoint', async () => {
    mockGet.mockResolvedValue({
      data: {
        survey_template: {
          survey_template_id: 'daily',
          title: 'Daily questionnaire',
          description: '',
          global_questions: [],
          video_questions: [],
        },
        survey_instances: [],
      },
    });

    const bundle = await fetchPendingQuestionnaireBundle();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/0/questionnaires');
    expect(bundle.pendingQuestionnaireInstances).toEqual([]);
  });
});
