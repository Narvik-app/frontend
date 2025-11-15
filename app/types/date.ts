export interface DateRange {
  start: Date
  end: Date
  _trigger?: string
}

interface DateRangeFilterInterface {
  label: string
  value: string
}

export class DateRangeFilter {
  public label: string;
  public value: string;

  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }

  static curent() {
    return new DateRangeFilter('Cette saison', 'current-season')
  }

  static previous() {
    return new DateRangeFilter('Saison précédente', 'previous-season')
  }

  public toObject(): DateRangeFilterInterface {
    return {
      label: this.label,
      value: this.value
    }
  }

}
