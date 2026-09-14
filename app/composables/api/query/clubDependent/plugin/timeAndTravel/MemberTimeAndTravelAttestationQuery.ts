import type {Member} from "~/types/api/item/clubDependent/member";
import type {TimeAndTravelExportAttestation} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

/** A member's own attestation history, across every locked export they appear in. */
export default class MemberTimeAndTravelAttestationQuery extends AbstractClubDependentQuery<TimeAndTravelExportAttestation, never> {
  rootPath = "time-and-travel-attestations";

  constructor(private activeMember: Member) {
    super();
  }

  public override getRootUrl(): string {
    if (!this.activeMember["@id"]) {
      throw new Error("Missing @id for defined member");
    }
    return `${this.activeMember["@id"]}/${this.rootPath}`;
  }
}
