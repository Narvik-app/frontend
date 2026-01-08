import type {Metric} from "~/types/api/item/metric";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useFetchItem} from "~/composables/api/api";

export default class MetricQuery extends AbstractClubDependentQuery<Metric, Metric> {
  rootPath = "metrics";

  async getSuperAdmin(id: string) {
    return useFetchItem<Metric>(this.rootPath+ "/" + id);
  }

}
