import type {MemberControlType, WriteMemberControlType} from "~/types/api/item/clubDependent/memberControlType";
import {AbstractSortableQuery} from "~/composables/api/query/AbstractSortableQuery";

export default class MemberControlTypeQuery extends AbstractSortableQuery<MemberControlType, WriteMemberControlType> {
  rootPath = "member-control-types";
}
