import type {Metric} from "~/types/api/item/metric";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useFetchItem} from "~/composables/api/api";

export default class MetricQuery<TValues = unknown> extends AbstractClubDependentQuery<Metric<TValues>, Metric<TValues>> {
  rootPath = "metrics";

  async getSuperAdmin(id: string) {
    return useFetchItem<Metric<TValues>>(this.rootPath+ "/" + id);
  }

}
