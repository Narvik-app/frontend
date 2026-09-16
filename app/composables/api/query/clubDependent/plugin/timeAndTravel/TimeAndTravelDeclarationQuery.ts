import type {TimeAndTravelDeclaration, WriteTimeAndTravelDeclaration} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration";
import type {TimeAndTravelSummaryRow} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelSummary";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useFetchList} from "~/composables/api/api";

export default class TimeAndTravelDeclarationQuery extends AbstractClubDependentQuery<TimeAndTravelDeclaration, WriteTimeAndTravelDeclaration> {
  rootPath = "time-and-travel-declarations";

  async summaryPerMember(urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/-/summary-per-member`;
    if (urlParams) {
      url += '?' + urlParams.toString();
    }
    return useFetchList<TimeAndTravelSummaryRow>(url);
  }
}
