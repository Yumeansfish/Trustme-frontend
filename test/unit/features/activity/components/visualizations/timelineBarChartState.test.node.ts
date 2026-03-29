import {
  buildTimelineBarBuckets,
  buildTimelineBarAxisLabels,
  buildTimelineBarChartData,
  buildTimelineBarLabels,
  buildTimelineBarSelectionOverlay,
  buildTimelineBarTooltipPreview,
  buildTimelineBarTooltipSummary,
  buildTimelineBarVisibleBuckets,
  buildTimelineBarVisibleDataset,
  formatTimelineBarHourTick,
  isTimelineBarSingleDay,
  resolveTimelineBarVisibleHourWindow,
} from '~/features/activity-visualizations/lib/timelineBarChartState';

describe('timelineBarChartState', () => {
  test('formatTimelineBarHourTick formats hours and minutes compactly', () => {
    expect(formatTimelineBarHourTick(0)).toBe('0');
    expect(formatTimelineBarHourTick(0.5)).toBe('30m');
    expect(formatTimelineBarHourTick(1)).toBe('1h');
    expect(formatTimelineBarHourTick(1.5)).toBe('1h 30m');
  });

  test('buildTimelineBarLabels handles single-day, weekly, and yearly ranges', () => {
    expect(
      buildTimelineBarLabels({
        start: '2026-03-21T00:00:00.000Z',
        timeperiodLength: [1, 'day'],
        isSingleDay: true,
        hourOffset: 2,
      }).slice(0, 4)
    ).toEqual(['2', '3', '4', '5']);

    expect(
      buildTimelineBarLabels({
        start: '2026-03-21T00:00:00.000Z',
        timeperiodLength: [1, 'week'],
        isSingleDay: false,
        hourOffset: 0,
      })
    ).toEqual([
      'Sat March 21',
      'Sun March 22',
      'Mon March 23',
      'Tue March 24',
      'Wed March 25',
      'Thu March 26',
      'Fri March 27',
    ]);

    expect(
      buildTimelineBarLabels({
        start: '2026-01-01T00:00:00.000Z',
        timeperiodLength: [1, 'year'],
        isSingleDay: false,
        hourOffset: 0,
      })
    ).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  });

  test('buildTimelineBarLabels formats custom ranges as dates or hours', () => {
    expect(
      buildTimelineBarLabels({
        start: '2026-05-30T00:00:00.000Z',
        timeperiodLength: [2, 'days'],
        isSingleDay: false,
        hourOffset: 0,
        periodMode: 'custom',
      })
    ).toEqual(['May 30', 'May 31']);

    expect(
      buildTimelineBarLabels({
        start: '2025-12-31T00:00:00.000Z',
        timeperiodLength: [2, 'days'],
        isSingleDay: false,
        hourOffset: 0,
        periodMode: 'custom',
      })
    ).toEqual(['Dec 31, 2025', 'Jan 1, 2026']);

    expect(
      buildTimelineBarLabels({
        start: '2026-05-30T00:00:00.000Z',
        timeperiodLength: [1, 'day'],
        isSingleDay: true,
        hourOffset: 0,
        periodMode: 'custom',
      }).slice(0, 4)
    ).toEqual(['00:00', '01:00', '02:00', '03:00']);
  });

  test('buildTimelineBarAxisLabels thins only longer custom date ranges', () => {
    const tenDayLabels = buildTimelineBarLabels({
      start: '2026-03-01T00:00:00.000Z',
      timeperiodLength: [10, 'days'],
      isSingleDay: false,
      hourOffset: 0,
      periodMode: 'custom',
    });
    expect(
      buildTimelineBarAxisLabels({
        labels: tenDayLabels,
        start: '2026-03-01T00:00:00.000Z',
        timeperiodLength: [10, 'days'],
        periodMode: 'custom',
        isSingleDay: false,
      })
    ).toEqual(tenDayLabels);

    const twentyDayLabels = buildTimelineBarLabels({
      start: '2026-03-01T00:00:00.000Z',
      timeperiodLength: [20, 'days'],
      isSingleDay: false,
      hourOffset: 0,
      periodMode: 'custom',
    });
    expect(
      buildTimelineBarAxisLabels({
        labels: twentyDayLabels,
        start: '2026-03-01T00:00:00.000Z',
        timeperiodLength: [20, 'days'],
        periodMode: 'custom',
        isSingleDay: false,
      }).filter(Boolean)
    ).toEqual(['Mar 1', 'Mar 4', 'Mar 7', 'Mar 10', 'Mar 13', 'Mar 16', 'Mar 19', 'Mar 20']);

    const fiftyNineDayLabels = buildTimelineBarLabels({
      start: '2026-03-01T00:00:00.000Z',
      timeperiodLength: [59, 'days'],
      isSingleDay: false,
      hourOffset: 0,
      periodMode: 'custom',
    });
    expect(
      buildTimelineBarAxisLabels({
        labels: fiftyNineDayLabels,
        start: '2026-03-01T00:00:00.000Z',
        timeperiodLength: [59, 'days'],
        periodMode: 'custom',
        isSingleDay: false,
      }).filter(Boolean)
    ).toEqual(['Mar 1', 'Mar 8', 'Mar 15', 'Mar 22', 'Mar 29', 'Apr 5', 'Apr 12', 'Apr 19', 'Apr 26', 'Apr 28']);

    const hundredDayLabels = buildTimelineBarLabels({
      start: '2026-03-15T00:00:00.000Z',
      timeperiodLength: [100, 'days'],
      isSingleDay: false,
      hourOffset: 0,
      periodMode: 'custom',
    });
    expect(
      buildTimelineBarAxisLabels({
        labels: hundredDayLabels,
        start: '2026-03-15T00:00:00.000Z',
        timeperiodLength: [100, 'days'],
        periodMode: 'custom',
        isSingleDay: false,
      }).filter(Boolean)
    ).toEqual(['Mar 15', 'Apr 1', 'May 1', 'Jun 1', 'Jun 22']);
  });

  test('buildTimelineBarBuckets aggregates total hours and category labels per period', () => {
    const buckets = buildTimelineBarBuckets({
      '2026-03-01T00:00:00.000Z/2026-03-02T00:00:00.000Z': {
        cat_events: [
          { timestamp: '2026-03-01T00:00:00.000Z', duration: 3600, data: { '$category': ['Code'] } },
          { timestamp: '2026-03-01T00:00:00.000Z', duration: 1800, data: { '$category': ['Browsing'] } },
        ],
      },
    });

    expect(buckets).toEqual([
      {
        periodKey: '2026-03-01T00:00:00.000Z/2026-03-02T00:00:00.000Z',
        catEvents: [
          { timestamp: '2026-03-01T00:00:00.000Z', duration: 3600, data: { '$category': ['Code'] } },
          { timestamp: '2026-03-01T00:00:00.000Z', duration: 1800, data: { '$category': ['Browsing'] } },
        ],
        totalHours: 1.5,
        categoryLabels: ['Code', 'Browsing'],
      },
    ]);
  });

  test('resolveTimelineBarVisibleHourWindow trims single-day charts to active bucket totals', () => {
    expect(
      resolveTimelineBarVisibleHourWindow({
        buckets: [
          { periodKey: '0', catEvents: [], totalHours: 0, categoryLabels: [] },
          { periodKey: '1', catEvents: [], totalHours: 0, categoryLabels: [] },
          { periodKey: '2', catEvents: [], totalHours: 1, categoryLabels: ['Code'] },
          { periodKey: '3', catEvents: [], totalHours: 0, categoryLabels: [] },
        ],
        labelsLength: 4,
        isSingleDay: true,
      })
    ).toEqual({
      start: 0,
      end: 3,
    });
  });

  test('buildTimelineBarVisibleDataset colors only matching buckets when a category is selected', () => {
    const dataset = buildTimelineBarVisibleDataset({
      buckets: [
        { periodKey: '0', catEvents: [], totalHours: 1, categoryLabels: ['Code'] },
        { periodKey: '1', catEvents: [], totalHours: 2, categoryLabels: ['Browsing'] },
      ],
      normalColor: '#112233',
      hoverColor: '#778899',
    });

    expect(dataset).toHaveLength(1);
    expect(dataset[0]).toMatchObject({
      data: [1, 2],
      backgroundColor: ['#112233', '#112233'],
      hoverBackgroundColor: ['#778899', '#778899'],
      borderWidth: 0,
    });
  });

  test('buildTimelineBarSelectionOverlay computes proportional highlight hours and ratios', () => {
    const overlay = buildTimelineBarSelectionOverlay({
      buckets: buildTimelineBarBuckets({
        '2026-03-01T00:00:00.000Z/2026-03-02T00:00:00.000Z': {
          cat_events: [
            { timestamp: '2026-03-01T00:00:00.000Z', duration: 3600, data: { '$category': ['Code'] } },
            { timestamp: '2026-03-01T00:00:00.000Z', duration: 1800, data: { '$category': ['Browsing'] } },
          ],
        },
        '2026-03-02T00:00:00.000Z/2026-03-03T00:00:00.000Z': {
          cat_events: [
            { timestamp: '2026-03-02T00:00:00.000Z', duration: 7200, data: { '$category': ['Code'] } },
          ],
        },
      }),
      selectedCategoryLabel: 'Code',
    });

    expect(overlay.hours).toEqual([1, 2]);
    expect(overlay.ratios).toEqual([2 / 3, 1]);
  });

  test('buildTimelineBarVisibleBuckets, preview, and summary derive tooltip content lazily', () => {
    const buckets = buildTimelineBarVisibleBuckets({
      buckets: buildTimelineBarBuckets({
        '2026-03-01T00:00:00.000Z/2026-03-02T00:00:00.000Z': {
          cat_events: [
            { timestamp: '2026-03-01T00:00:00.000Z', duration: 3600, data: { '$category': ['Code'] } },
            { timestamp: '2026-03-01T00:00:00.000Z', duration: 1800, data: { '$category': ['Browsing'] } },
          ],
        },
      }),
      visibleHourWindow: { start: 0, end: 0 },
    });

    expect(
      buildTimelineBarTooltipPreview({
        buckets,
        start: '2026-03-01T00:00:00.000Z',
        timeperiodLength: [1, 'month'],
        periodMode: 'month',
        visibleHourWindow: { start: 0, end: 0 },
        dataIndex: 0,
      })
    ).toEqual({
      dateLabel: 'Sunday, 3/1',
      totalDurationLabel: '1h 30m 0s',
    });

    expect(
      buildTimelineBarTooltipSummary({
        buckets,
        start: '2026-03-01T00:00:00.000Z',
        timeperiodLength: [1, 'month'],
        periodMode: 'month',
        visibleHourWindow: { start: 0, end: 0 },
        dataIndex: 0,
      })
    ).toMatchObject({
      dateLabel: 'Sunday, 3/1',
      totalDurationLabel: '1h 30m 0s',
      rows: [
        {
          label: 'Code',
          percent: 67,
          durationLabel: '1h 0m 0s',
        },
        {
          label: 'Browsing',
          percent: 33,
          durationLabel: '30m 0s',
        },
      ],
    });
  });

  test('buildTimelineBarChartData and isTimelineBarSingleDay expose chart-ready values', () => {
    expect(isTimelineBarSingleDay([1, 'day'])).toBe(true);
    expect(isTimelineBarSingleDay([7, 'day'])).toBe(false);
    expect(isTimelineBarSingleDay([1, 'day'], 'custom')).toBe(true);
    expect(
      buildTimelineBarChartData({
        labels: ['1', '2'],
        datasets: [{ label: 'Timeline', data: [1, 2] }],
      })
    ).toMatchObject({
      labels: ['1', '2'],
      datasets: [{ label: 'Timeline', data: [1, 2] }],
      title: { display: true, text: 'Timeline' },
    });
  });
});
