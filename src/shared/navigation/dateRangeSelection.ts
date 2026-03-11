import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD';

export interface DateRangeSelectionState {
  start: string;
  end: string;
  pickedStartInSession: boolean;
  pickedEndInSession: boolean;
}

function parseDate(value: string) {
  return moment(value, DATE_FORMAT, true);
}

export function selectDateRangeBoundary(
  state: DateRangeSelectionState,
  value: string
): DateRangeSelectionState {
  const parsedValue = parseDate(value);
  const parsedStart = parseDate(state.start);

  if (!parsedValue.isValid()) {
    return state;
  }

  if (!state.pickedStartInSession || !parsedStart.isValid() || state.pickedEndInSession) {
    return {
      start: value,
      end: value,
      pickedStartInSession: true,
      pickedEndInSession: false,
    };
  }

  if (parsedValue.isBefore(parsedStart, 'day')) {
    return {
      start: value,
      end: state.start,
      pickedStartInSession: true,
      pickedEndInSession: true,
    };
  }

  return {
    start: state.start,
    end: value,
    pickedStartInSession: true,
    pickedEndInSession: true,
  };
}
