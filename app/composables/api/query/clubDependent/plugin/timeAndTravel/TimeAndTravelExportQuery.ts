import type {
  TimeAndTravelExport,
  TimeAndTravelExportAttestation,
  WriteTimeAndTravelExport,
} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useFetchList, usePost} from "~/composables/api/api";
import type {Item} from "~/types/api/item";

export default class TimeAndTravelExportQuery extends AbstractClubDependentQuery<TimeAndTravelExport, WriteTimeAndTravelExport> {
  rootPath = "time-and-travel-exports";

  async regenerate(item: Item) {
    return usePost(`${item["@id"]}/regenerate`, {});
  }

  async lock(item: Item) {
    return usePost(`${item["@id"]}/lock`, {});
  }

  async unlock(item: Item) {
    return usePost(`${item["@id"]}/unlock`, {});
  }

  async getAttestations(exportItem: Item) {
    return useFetchList<TimeAndTravelExportAttestation>(`${exportItem["@id"]}/attestations`);
  }
}
