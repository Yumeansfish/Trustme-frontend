import _ from 'lodash';

import { split_by_hour_into_data } from '~/shared/lib/transforms';
import { getColorFromCategory, getColorFromString } from '~/features/categorization/lib/color';
import { Category } from '~/features/categorization/lib/classes';
import { IEvent } from '~/shared/lib/interfaces';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { ACTIVITY_PRIMARY_BAR } from '~/features/activity/lib/visualizationTokens';

interface HourlyData {
  cat_events: IEvent[];
}

interface Dataset {
  label: string;
  backgroundColor: string;
  data: number[];
}

export function buildBarchartDataset(data_by_hour: HourlyData[], classes: Category[]): Dataset[] {
  const SEP = '>>>';
  const data = data_by_hour;
  if (data) {
    const category_names: Set<string> = new Set(
      Object.values(data)
        .map(result => {
          return result.cat_events.map(e => e.data['$category'].join(SEP));
        })
        .flat()
    );
    const ds: Dataset[] = [...category_names]
      .map(c_ => {
        const categoryStore = useCategoryStore();
        const rawCategory = c_.split(SEP);
        const knownCategory = categoryStore.classes.find(category => _.isEqual(category.name, rawCategory));
        const values = Object.values(data).map(results => {
          const cat = results.cat_events.find(e => _.isEqual(e.data['$category'], rawCategory));
          if (cat) return Math.round((cat.duration / (60 * 60)) * 1000) / 1000;
          else return null;
        });
        return {
          label: rawCategory.join(' > '),
          backgroundColor: knownCategory
            ? getColorFromCategory(categoryStore.get_category(rawCategory), classes)
            : getColorFromString(rawCategory.join(' > ')),
          data: values,
          borderRadius: 4,
          borderSkipped: false,
        } as any;
      })
      .filter(x => x);
    return ds;
  } else {
    return [];
  }
}

export function buildBarchartDatasetActive(events_active: IEvent[]) {
  const data = split_by_hour_into_data(events_active);
  return [
    {
      label: 'Total time',
      backgroundColor: ACTIVITY_PRIMARY_BAR,
      data,
    },
  ];
}
