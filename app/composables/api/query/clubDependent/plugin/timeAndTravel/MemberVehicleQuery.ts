import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberVehicle, WriteMemberVehicle} from "~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useCreateItem} from "~/composables/api/api";
import type {Item} from "~/types/api/item";

/**
 * Club-wide by default (admin board). Pass a member to list only that
 * member's vehicles through the nested, self-readable /members/{uuid}/vehicles
 * route (used by the self board and the admin per-member drill-down) — that
 * nested route is read-only, so post() always targets the canonical
 * /member-vehicles collection regardless of which mode this instance is in.
 */
export default class MemberVehicleQuery extends AbstractClubDependentQuery<MemberVehicle, WriteMemberVehicle> {
  rootPath = "member-vehicles";

  constructor(private activeMember?: Member) {
    super();
  }

  public override getRootUrl(): string {
    if (this.activeMember?.["@id"]) {
      return `${this.activeMember["@id"]}/vehicles`;
    }
    return super.getRootUrl();
  }

  override async post(payload: Item) {
    return useCreateItem<MemberVehicle>(super.getRootUrl(), payload);
  }
}
