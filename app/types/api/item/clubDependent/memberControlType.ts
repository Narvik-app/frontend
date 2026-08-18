import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";

interface _MemberControlType extends UuidItem, ClubLinkedItem {
  name?: string;
  icon?: string;
  activity?: Activity | string | null;
  warningDays?: number | null;
  alertDays?: number | null;
  displayOnPresenceCard?: boolean;
  weight?: number;
}

export interface MemberControlType extends _MemberControlType {
  activity?: Activity;
}

export interface WriteMemberControlType extends _MemberControlType {
  activity?: Activity | string | null;
}

export function memberControlTypeIsAutomatic(type: MemberControlType | undefined): boolean {
  return !!type?.activity;
}

/**
 * A type with no warning/alert delay at all never expires: it's a plain yes/no, done-once
 * check (e.g. a QCM passed once, valid for life) rather than a periodic renewal.
 */
export function memberControlTypeIsLifetime(type: MemberControlType | undefined): boolean {
  return !type?.warningDays && !type?.alertDays;
}
