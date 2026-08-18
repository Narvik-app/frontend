import type {MemberControl, WriteMemberControl} from "~/types/api/item/clubDependent/memberControl";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class MemberControlQuery extends AbstractClubDependentQuery<MemberControl, WriteMemberControl> {
  rootPath = "member-controls";
}
