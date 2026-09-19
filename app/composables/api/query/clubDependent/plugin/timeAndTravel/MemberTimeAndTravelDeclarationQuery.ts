import type {Member} from "~/types/api/item/clubDependent/member";
import type {TimeAndTravelDeclaration, WriteTimeAndTravelDeclaration} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration";
import type {TimeAndTravelSummaryRow} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelSummary";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useCreateItem, useFetchList} from "~/composables/api/api";
import type {Item} from "~/types/api/item";

/**
 * Self-scoped declarations for one member (personal board, admin per-member
 * drill-down). GET goes through the nested, self-readable
 * /members/{uuid}/time-and-travel-declarations route (read-only on the
 * backend), so post() always targets the canonical
 * /time-and-travel-declarations collection instead. patch()/delete()
 * (inherited from AbstractQuery) use the item's own @id, so they work
 * unchanged regardless of which collection listed it.
 */
export default class MemberTimeAndTravelDeclarationQuery extends AbstractClubDependentQuery<TimeAndTravelDeclaration, WriteTimeAndTravelDeclaration> {
  rootPath = "time-and-travel-declarations";

  constructor(private activeMember: Member) {
    super();
  }

  public override getRootUrl(): string {
    if (!this.activeMember["@id"]) {
      throw new Error("Missing @id for defined member");
    }
    return `${this.activeMember["@id"]}/${this.rootPath}`;
  }

  override async post(payload: Item) {
    return useCreateItem<TimeAndTravelDeclaration>(super.getRootUrl(), payload);
  }

  /** Always returns a collection with at most one row (the member's own totals). */
  async summary(urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/-/summary`;
    if (urlParams) {
      url += '?' + urlParams.toString();
    }
    return useFetchList<TimeAndTravelSummaryRow>(url);
  }
}
