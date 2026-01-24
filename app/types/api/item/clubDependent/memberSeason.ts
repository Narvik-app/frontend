import type {AgeCategory} from "~/types/api/item/ageCategory";
import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {Season} from "~/types/api/item/season";
import type {Member} from "~/types/api/item/clubDependent/member";

export interface _MemberSeason extends UuidItem, ClubLinkedItem {
  member?: Member | string;
  season?: Season | string;
  ageCategory?: AgeCategory | string;
  isSecondaryClub?: boolean;
}

export interface MemberSeason extends _MemberSeason {
  member?: Member;
  season?: Season;
  ageCategory?: AgeCategory;
  isSecondaryClub?: boolean;
}

export interface MemberSeasonWrite extends _MemberSeason {
  member?: Member|string;
  season?: Season|string;
  ageCategory?: AgeCategory|string;
  isSecondaryClub?: boolean;
}
