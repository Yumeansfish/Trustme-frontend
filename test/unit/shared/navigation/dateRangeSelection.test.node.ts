import { selectDateRangeBoundary } from '~/shared/navigation/dateRangeSelection';

describe('dateRangeSelection', () => {
  test('lets the same calendar pick a start and end date', () => {
    const startedSelection = selectDateRangeBoundary(
      {
        start: '2026-03-10',
        end: '2026-03-12',
        pickedStartInSession: false,
        pickedEndInSession: false,
      },
      '2026-03-18'
    );

    expect(startedSelection).toEqual({
      start: '2026-03-18',
      end: '2026-03-18',
      pickedStartInSession: true,
      pickedEndInSession: false,
    });

    expect(selectDateRangeBoundary(startedSelection, '2026-03-21')).toEqual({
      start: '2026-03-18',
      end: '2026-03-21',
      pickedStartInSession: true,
      pickedEndInSession: true,
    });
  });

  test('reorders the range when the second pick is earlier', () => {
    expect(
      selectDateRangeBoundary(
        {
          start: '2026-03-21',
          end: '2026-03-21',
          pickedStartInSession: true,
          pickedEndInSession: false,
        },
        '2026-03-18'
      )
    ).toEqual({
      start: '2026-03-18',
      end: '2026-03-21',
      pickedStartInSession: true,
      pickedEndInSession: true,
    });
  });

  test('starts a fresh range after both boundaries are already picked', () => {
    expect(
      selectDateRangeBoundary(
        {
          start: '2026-03-18',
          end: '2026-03-21',
          pickedStartInSession: true,
          pickedEndInSession: true,
        },
        '2026-03-25'
      )
    ).toEqual({
      start: '2026-03-25',
      end: '2026-03-25',
      pickedStartInSession: true,
      pickedEndInSession: false,
    });
  });
});
