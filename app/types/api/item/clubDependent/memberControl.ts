import type {UuidItem} from "~/types/api/uuidItem";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberControlType} from "~/types/api/item/clubDependent/memberControlType";

export type MemberControlStatus = 'valid' | 'warning' | 'expired';

interface _MemberControl extends UuidItem {
  member?: Member | string;
  type?: MemberControlType | string;
  date?: string | null;
  alertDisabled?: boolean;
  comment?: string | null;
}

export interface MemberControl extends _MemberControl {
  member?: Member;
  type?: MemberControlType;
  status?: MemberControlStatus | null;
}

export interface WriteMemberControl extends _MemberControl {
  member?: string;
  type?: string;
}
